export const TIER_LIMITS = {
  lite: { dailySearches: 3, resultCap: 10, serpLive: false, history: false, ai: false, alerts: false },
  pro: { dailySearches: 50, resultCap: 10, serpLive: true, history: true, ai: true, alerts: true },
  max: { dailySearches: 200, resultCap: 50, serpLive: true, history: true, ai: true, alerts: true },
};

export function normalizeTier(t) {
  if (t === 'pro' || t === 'max' || t === 'lite') return t;
  return 'lite';
}

export function tierPolicy(tier) {
  return TIER_LIMITS[normalizeTier(tier)] || TIER_LIMITS.lite;
}

export function affiliatesEnabledForTier(tier) {
  if (process.env.AFFILIATE_LITE === '0' && normalizeTier(tier) === 'lite') return false;
  return true;
}
