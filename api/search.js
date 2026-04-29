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
  serpProductSellers,
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

const USED_CONDITION_RE = /\b(used|refurbished|pre-owned|preowned|open.?box|reconditioned|renewed|second.?hand|pre.?loved|vintage|salvage|surplus|as.?is|parts.?only|for.?parts)\b/i;

/**
 * Narrow results to those matching extracted page attributes (color, pack count).
 * Falls back to the full list if attribute filtering removes everything.
 */
function filterByAttributes(deals, attrs) {
  if (!attrs || typeof attrs !== 'object') return deals;
  const { packCount, color, size } = attrs;
  if (!packCount && !color && !size) return deals;

  const filtered = deals.filter((deal) => {
    const title = deal.title || '';

    if (packCount) {
      const packRe = new RegExp(
        `\\b${packCount}[\\s\\-]?(?:pack|count|ct|piece|pk|pcs|pairs?)\\b`,
        'i'
      );
      if (!packRe.test(title)) return false;
    }

    if (color) {
      const escaped = color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const colorRe = new RegExp(`\\b${escaped}\\b`, 'i');
      if (!colorRe.test(title)) return false;
    }

    if (size) {
      const escaped = size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // For numeric sizes, allow common prefixes/suffixes: "US 13", "Size 13", "13M", "13 D(M)"
      const isNumeric = /^\d/.test(size);
      const sizeRe = isNumeric
        ? new RegExp(
            `(?:^|[\\s/,|])(?:US\\s*|Size\\s*|UK\\s*|EU\\s*)?${escaped}(?:\\s*[MWDEE]+)?(?:[\\s/,|]|$)`,
            'i'
          )
        : new RegExp(`\\b${escaped}\\b`, 'i');
      if (!sizeRe.test(title)) return false;
    }

    return true;
  });

  return filtered.length > 0 ? filtered : deals;
}

function isUsedItem(item) {
  // Any populated second_hand_condition field means the item is not new
  if (item.second_hand_condition) return true;
  // Explicit condition field (e.g. "Used", "Refurbished") from SerpAPI
  if (USED_CONDITION_RE.test(item.condition || '')) return true;
  const ext = Array.isArray(item.extensions) ? item.extensions.join(' ') : '';
  return (
    USED_CONDITION_RE.test(item.title || '') ||
    USED_CONDITION_RE.test(ext) ||
    USED_CONDITION_RE.test(item.snippet || '')
  );
}

/**
 * Tokenize a string into lowercase significant words (3+ chars, no stopwords).
 */
const STOPWORDS = new Set(['the', 'and', 'for', 'with', 'gen', 'new', 'ver']);
function tokenize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Returns the fraction of query tokens that appear in the result title.
 * A score >= TITLE_MATCH_THRESHOLD means "close enough".
 */
const TITLE_MATCH_THRESHOLD = 0.5;
function titleMatchScore(queryTokens, resultTitle) {
  if (!queryTokens.length) return 1;
  const resultTokens = new Set(tokenize(resultTitle));
  const hits = queryTokens.filter((t) => resultTokens.has(t)).length;
  return hits / queryTokens.length;
}

function buildDealsFromShoppingResults(items, tier, product) {
  const aff = affiliatesEnabledForTier(tier);
  const queryTokens = tokenize(product);
  const newOnly = items.filter((item) => !isUsedItem(item));
  const matched = newOnly.filter(
    (item) => titleMatchScore(queryTokens, item.title) >= TITLE_MATCH_THRESHOLD
  );
  // Fall back to unfiltered new-only list if the similarity filter removes everything
  const candidates = matched.length > 0 ? matched : newOnly;
  const normalized = candidates.map((item) => normalizeSerpItem(item, aff));
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
  let attrs = null;
  if (req.query.attrs) {
    try { attrs = JSON.parse(req.query.attrs); } catch { /* ignore malformed */ }
  }

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
        const pack = await fetchShoppingRawForLite(product, gtin);
        rawJson = pack.data;
        meta.source = pack.source;
      } else {
        rawJson = await serpGoogleShopping(product, gtin);
        meta.source = 'serpapi';
      }

      const items = shoppingResultsFromSerpJson(rawJson);

      // For text queries without a GTIN, do a second-pass product_id lookup.
      // shopping_results items carry a product_id; querying that ID returns
      // sellers_results.online_sellers where every entry has a direct retailer link.
      // The initial search result is used as fallback if this lookup fails.
      let sourceItems = items;
      if (!gtin && items.length > 0) {
        const topId = items.find((i) => i.product_id)?.product_id;
        if (topId) {
          try {
            const sellerJson = await serpProductSellers(topId, product);
            const sellers = shoppingResultsFromSerpJson(sellerJson);
            if (sellers.length > 0) {
              sourceItems = sellers;
              meta.source += '+product_detail';
            }
          } catch (e) {
            console.warn('Product seller lookup failed, falling back to shopping_results:', e.message);
          }
        }
      }

      deals = buildDealsFromShoppingResults(sourceItems, tier, product);

      if (redis) {
        await redis.set(cacheKey, serializeDealsForCache(deals), {
          ex: CACHE_TTL_SEC,
        });
      }
    } else if (!policy.serpLive) {
      meta.source = 'redis';
    }

    const cap = policy.resultCap;
    const sliced = filterByAttributes(deals, attrs).slice(0, cap);

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
