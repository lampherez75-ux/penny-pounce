import { Redis } from '@upstash/redis';

let client;

export function getRedis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}

export function cacheKeyForSearch(product, gtin) {
  const norm = (product || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const base = gtin ? `gtin:${gtin}` : `q:${norm}`;
  return `pricecache:${base}`;
}

export function usageKey(userId, dateStr) {
  return `usage:${userId}:${dateStr}`;
}

export function tierKey(userId) {
  return `tier:${userId}`;
}

export function utcDateString(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
