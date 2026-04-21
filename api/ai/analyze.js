import { buffer } from 'node:stream/consumers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { setCors, handleOptions } from '../lib/cors.js';
import { getAuthContext } from '../lib/auth.js';
import { getRedis, usageKey, utcDateString } from '../lib/redis.js';
import { normalizeTier, tierPolicy } from '../lib/tiers.js';

const AI_DAILY_CAP = { pro: 40, max: 120 };

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const buf = await buffer(req);
  const s = buf.toString('utf8');
  return s ? JSON.parse(s) : {};
}

function aiQuotaKey(userId, day) {
  return `ai:${usageKey(userId, day)}`;
}

function ttlSecondsToUtcMidnight() {
  const now = new Date();
  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(60, Math.floor((end - now.getTime()) / 1000));
}

async function reserveAi(redis, userId, tier) {
  const cap = AI_DAILY_CAP[normalizeTier(tier)] ?? 0;
  if (!cap) return { ok: false, reason: 'tier', key: null, cap: 0 };
  if (!redis) return { ok: true, key: null, cap, used: 0 };

  const key = aiQuotaKey(userId, utcDateString());
  const curRaw = await redis.get(key);
  const cur = curRaw != null ? parseInt(String(curRaw), 10) : 0;
  if (cur >= cap) return { ok: false, reason: 'limit', key, used: cur, cap };

  const used = await redis.incr(key);
  if (used === 1) {
    await redis.expire(key, ttlSecondsToUtcMidnight());
  }
  return { ok: true, key, used, cap };
}

async function refundAi(redis, key) {
  if (redis && key) {
    await redis.decr(key);
  }
}

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getAuthContext(req);
  const tier = normalizeTier(ctx.tier);
  const policy = tierPolicy(tier);

  if (!policy.ai) {
    return res.status(403).json({ error: 'AI assistant not available on your plan' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI not configured' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const product = body.product;
  const deals = body.deals;
  if (!product || !Array.isArray(deals) || deals.length === 0) {
    return res.status(400).json({ error: 'product and deals[] required' });
  }

  const redis = getRedis();
  const reserved = await reserveAi(redis, ctx.userId, tier);
  if (!reserved.ok) {
    const status = reserved.reason === 'tier' ? 403 : 429;
    return res.status(status).json({
      error:
        reserved.reason === 'tier'
          ? 'AI not available'
          : 'Daily AI analysis limit reached',
    });
  }

  const modelId = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });

  const summary = deals.slice(0, 15).map((d, i) => ({
    i: i + 1,
    store: d.source,
    price: d.price,
    title: d.title?.slice?.(0, 120) ?? d.title,
  }));

  const promptPro =
    'You are a concise price analyst. Given a product name and a list of store offers (title, store, price), identify the best value, call out outliers, and note caveats (unknown shipping, missing reviews). 2-4 short paragraphs. No affiliate or legal advice.';
  const promptMax =
    'You are a deal advisor. Given a product name and offers, rank top picks with reasoning, flag risks (too-good-to-be-true pricing, sparse data), and suggest what to verify before buying. 3-5 short paragraphs. No affiliate or legal advice.';

  const prompt = tier === 'max' ? promptMax : promptPro;

  try {
    const text = await model.generateContent([
      { text: prompt },
      { text: `Product: ${product}\nOffers JSON: ${JSON.stringify(summary)}` },
    ]);

    const out =
      text.response?.text?.() ||
      text.response?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
      '';

    return res.status(200).json({
      tier,
      analysis: out,
      ai_usage: { used: reserved.used, cap: reserved.cap },
    });
  } catch (e) {
    await refundAi(redis, reserved.key);
    console.error('Gemini error:', e);
    return res.status(502).json({ error: 'AI request failed', message: e.message });
  }
}
