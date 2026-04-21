import { setCors, handleOptions } from './lib/cors.js';
import { getAuthContext } from './lib/auth.js';
import {
  getRedis,
  cacheKeyForSearch,
  usageKey,
  utcDateString,
} from './lib/redis.js';
import {
  tierPolicy,
  affiliatesEnabledForTier,
  normalizeTier,
} from './lib/tiers.js';
import {
  dedupeDeals,
  normalizeSerpItem,
  rankDeals,
} from './lib/deals.js';
import {
  fetchShoppingRawForLite,
  serpGoogleShopping,
  shoppingResultsFromSerpJson,
} from './lib/providers.js';

const CACHE_TTL_SEC = 86400;

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

async function checkUsage(redis, userId, limit) {
  if (!redis) {
    return { used: 0, limit, exceeded: false };
  }
  const date = utcDateString();
  const key = usageKey(userId, date);
  const curRaw = await redis.get(key);
  const current = curRaw != null ? parseInt(String(curRaw), 10) : 0;
  if (!Number.isFinite(current)) {
    await redis.del(key);
  } else if (current >= limit) {
    return { used: current, limit, exceeded: true };
  }
  const used = await redis.incr(key);
  if (used === 1) {
    await redis.expire(key, ttlSecondsToUtcMidnight());
  }
  return { used, limit, exceeded: false };
}

function serializeDealsForCache(deals) {
  return JSON.stringify(
    deals.map(({ raw, score_breakdown, score, ...rest }) => {
      void raw;
      void score_breakdown;
      void score;
      return rest;
    })
  );
}

function parseCachedDeals(json) {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

function publicDeals(deals) {
  const debug = process.env.DEBUG_SCORES === '1';
  return deals.map((d) => {
    const { raw, score_breakdown, score, ...rest } = d;
    void raw;
    if (debug) return { ...rest, score, score_breakdown };
    void score;
    void score_breakdown;
    return rest;
  });
}

async function maybeRecordHistory(redis, userId, tier, product, deals) {
  if (normalizeTier(tier) === 'lite') return;
  if (!redis) return;
  const t = normalizeTier(tier);
  const maxLen = t === 'max' ? 500 : 50;
  const entry = JSON.stringify({
    at: Date.now(),
    product,
    dealCount: deals.length,
  });
  const key = `history:${userId}`;
  await redis.lpush(key, entry);
  await redis.ltrim(key, 0, maxLen - 1);
  const ttl = t === 'max' ? 60 * 60 * 24 * 400 : 60 * 60 * 24 * 35;
  await redis.expire(key, ttl);
}

function buildDealsFromShoppingResults(items, tier) {
  const aff = affiliatesEnabledForTier(tier);
  const normalized = items.map((item) => normalizeSerpItem(item, aff));
  const deduped = dedupeDeals(normalized);
  return rankDeals(deduped);
}

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const product = req.query.product;
  const gtin = req.query.gtin || req.query.upc || '';

  if (!product || typeof product !== 'string') {
    return res.status(400).json({ error: 'Product name required' });
  }

  try {
    const ctx = await getAuthContext(req);
    const tier = ctx.tier;
    const policy = tierPolicy(tier);
    const redis = getRedis();

    const usage = await checkUsage(redis, ctx.userId, policy.dailySearches);
    if (usage.exceeded) {
      return res.status(429).json({
        error: 'Daily search limit reached',
        tier,
        usage: { used: usage.used, limit: usage.limit },
      });
    }

    const cacheKey = cacheKeyForSearch(product, gtin);
    let meta = { cache: 'miss', source: 'unknown' };
    let deals = null;

    if (redis && !policy.serpLive) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = parseCachedDeals(cached);
        if (parsed?.length) {
          deals = parsed;
          meta = { cache: 'hit', source: 'redis' };
        }
      }
    }

    if (!deals) {
      let rawJson;
      if (!policy.serpLive) {
        const pack = await fetchShoppingRawForLite(product);
        rawJson = pack.data;
        meta.source = pack.source;
      } else {
        rawJson = await serpGoogleShopping(product);
        meta.source = 'serpapi';
      }

      const items = shoppingResultsFromSerpJson(rawJson);
      deals = buildDealsFromShoppingResults(items, tier);

      if (redis) {
        await redis.set(cacheKey, serializeDealsForCache(deals), {
          ex: CACHE_TTL_SEC,
        });
      }
    } else if (!policy.serpLive) {
      meta.source = 'redis';
    }

    const cap = policy.resultCap;
    const sliced = deals.slice(0, cap);

    await maybeRecordHistory(redis, ctx.userId, tier, product, sliced);

    return res.status(200).json({
      deals: publicDeals(sliced),
      tier,
      usage: { day: utcDateString(), used: usage.used, limit: usage.limit },
      meta,
    });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      error: 'Search failed',
      message: error.message,
    });
  }
}
