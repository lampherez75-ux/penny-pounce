import { setCors, handleOptions } from './lib/cors.js';
import { getAuthContext } from './lib/auth.js';
import { getRedis, usageKey, utcDateString } from './lib/redis.js';
import { tierPolicy } from './lib/tiers.js';

export default async function handler(req, res) {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ctx = await getAuthContext(req);
  const policy = tierPolicy(ctx.tier);
  const redis = getRedis();
  const day = utcDateString();
  let used = 0;

  if (redis) {
    const key = usageKey(ctx.userId, day);
    const cur = await redis.get(key);
    used = cur != null ? parseInt(String(cur), 10) : 0;
  }

  return res.status(200).json({
    tier: ctx.tier,
    usage: { day, used, limit: policy.dailySearches },
  });
}
