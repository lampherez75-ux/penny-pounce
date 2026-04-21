import { init } from '@instantdb/admin';
import { getRedis, tierKey } from './redis.js';
import { normalizeTier } from './tiers.js';

let adminDb;

export function getAdminDb() {
  if (adminDb) return adminDb;
  const appId = process.env.INSTANT_APP_ID;
  const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;
  if (!appId || !adminToken) return null;
  adminDb = init({ appId, adminToken });
  return adminDb;
}

/**
 * Resolve user id and subscription tier for the request.
 */
export async function getAuthContext(req) {
  const db = getAdminDb();
  const redis = getRedis();

  let userId = null;
  let email = null;

  const bearer = req.headers.authorization;
  if (bearer?.startsWith('Bearer ') && db) {
    const token = bearer.slice(7).trim();
    if (token) {
      try {
        const user = await db.auth.verifyToken(token);
        if (user?.id) {
          userId = user.id;
          email = user.email ?? null;
        }
      } catch (e) {
        console.warn('Instant verifyToken:', e.message);
      }
    }
  }

  if (!userId && process.env.AUTH_DEV_MODE === '1') {
    userId = req.headers['x-dev-user-id'] || 'dev-user';
  }

  if (!userId) {
    const device = req.headers['x-device-id'];
    if (device) userId = `device:${device}`;
  }

  if (!userId) {
    const fwd = req.headers['x-forwarded-for'];
    const ip = typeof fwd === 'string' ? fwd.split(',')[0].trim() : '';
    userId = ip ? `ip:${ip}` : 'ip:unknown';
  }

  let tier = 'lite';
  if (redis) {
    const stored = await redis.get(tierKey(userId));
    if (stored === 'pro' || stored === 'max' || stored === 'lite') {
      tier = stored;
    }
  }

  if (process.env.AUTH_DEV_MODE === '1') {
    const h = req.headers['x-dev-tier'];
    if (h === 'pro' || h === 'max' || h === 'lite') tier = h;
  }

  tier = normalizeTier(tier);

  return { userId, email, tier };
}
