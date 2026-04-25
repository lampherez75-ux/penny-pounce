import { buffer } from 'node:stream/consumers';
import { GoogleGenAI } from '@google/genai';
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

  const modelId = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const ai = new GoogleGenAI({ apiKey });

  const summary = deals.slice(0, 15).map((d, i) => ({
    i: i + 1,
    store: d.source,
    price: d.price,
    title: d.title?.slice?.(0, 120) ?? d.title,
  }));

  const promptPro =
    'You are a price analyst. Given a product and store offers, return ONLY valid JSON — no markdown, no code fences, no extra text. Use this exact structure:\n{"overview":"1-2 sentences describing the product and its typical retail price range.","bullets":[{"label":"Best Value","text":"which offer is the best deal and why"},{"label":"Outliers","text":"any suspiciously priced or off-brand offers"},{"label":"Caveats","text":"important purchase caveats"},{"label":"Shipping & Returns","text":"what to know about shipping and return policies"}]}\nNo affiliate or legal advice.';
  const promptMax =
    'You are a deal advisor. Given a product and store offers, return ONLY valid JSON — no markdown, no code fences, no extra text. Use this exact structure:\n{"winners":[{"store":"store name","price":"$X.XX","reason":"one sentence why this is the top pick"},{"store":"store name","price":"$X.XX","reason":"one sentence why this is the runner-up"}],"overview":"1-2 sentences describing the product and its typical retail price range.","bullets":[{"label":"Best Value","text":"..."},{"label":"Outliers","text":"..."},{"label":"Caveats","text":"..."},{"label":"Risks","text":"..."},{"label":"Verify","text":"what to double-check before buying"}]}\nNo affiliate or legal advice.';

  const systemPrompt = tier === 'max' ? promptMax : promptPro;
  const userContent = `Product: ${product}\nOffers JSON: ${JSON.stringify(summary)}`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }, { text: userContent }],
        },
      ],
    });

    const out = response.text || '';

    // Strip markdown code fences if the model wraps the JSON anyway
    const jsonText = out.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    let analysis;
    try {
      analysis = JSON.parse(jsonText);
    } catch {
      analysis = out; // fallback to raw text
    }

    return res.status(200).json({
      tier,
      analysis,
      ai_usage: { used: reserved.used, cap: reserved.cap },
    });
  } catch (e) {
    await refundAi(redis, reserved.key);
    console.error('Gemini error:', e);

    // Detect quota/billing errors from Gemini and return a friendly message
    const msg = e.message || '';
    const isQuota =
      e.status === 429 ||
      (typeof e.code === 'number' && e.code === 429) ||
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('quota');

    if (isQuota) {
      return res.status(429).json({
        error: 'AI quota exceeded',
        message:
          'The Gemini API free-tier quota has been exhausted. Please enable billing at https://ai.dev/rate-limit or try again later.',
        quota_exceeded: true,
      });
    }

    return res.status(502).json({ error: 'AI request failed', message: msg });
  }
}
