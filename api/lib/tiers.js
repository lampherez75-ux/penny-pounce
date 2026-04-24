export const TIER_LIMITS = {
  lite: { monthlyPrice: 0, dailySearches: 3, resultCap: 10, serpLive: false, history: false, ai: false, alerts: false },
  pro: { monthlyPrice: 9, dailySearches: 33, resultCap: 10, serpLive: true, history: true, ai: true, alerts: true },
  max: { monthlyPrice: 18, dailySearches: 83, resultCap: 50, serpLive: true, history: true, ai: true, alerts: true },
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
