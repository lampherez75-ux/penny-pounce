import { setCors, handleOptions } from './lib/cors.js';
import { getAuthContext } from './lib/auth.js';
import { getRedis } from './lib/redis.js';
import { normalizeTier, tierPolicy } from './lib/tiers.js';

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getAuthContext(req);
  const tier = normalizeTier(ctx.tier);
  const policy = tierPolicy(tier);

  if (!policy.history) {
    return res.status(403).json({ error: 'Search history not available on your plan' });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(503).json({ error: 'History temporarily unavailable' });
  }

  const limit = tier === 'max' ? 200 : 50;
  const raw = await redis.lrange(`history:${ctx.userId}`, 0, limit - 1);
  const items = [];
  for (const row of raw) {
    try {
      items.push(JSON.parse(row));
    } catch {
      /* skip */
    }
  }

  return res.status(200).json({ tier, items });
}
