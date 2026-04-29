const REVIEWS_CAP = 5000;

export function isGoogleHostUrl(url) {
  if (!url || url === '#') return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'google.com' || host.endsWith('.google.com');
  } catch {
    return false;
  }
}

/**
 * Ordered candidate URLs, highest confidence first.
 * direct_link is SerpAPI's explicit direct-to-retailer field and always wins.
 * merchant.link / merchants[].link are the next best bet for non-GTIN shopping_results.
 * item.link / product_link fall back (may be google.com product pages).
 */
export function collectUrlCandidates(item) {
  const out = [];
  const push = (u) => {
    if (u && typeof u === 'string' && u !== '#' && !out.includes(u)) out.push(u);
  };

  // Phase 1: confirmed non-Google direct links
  if (item.direct_link && !isGoogleHostUrl(item.direct_link)) push(item.direct_link);
  if (item.link && !isGoogleHostUrl(item.link)) push(item.link);
  if (item.product_link && !isGoogleHostUrl(item.product_link)) push(item.product_link);
  if (item.merchant?.link && !isGoogleHostUrl(item.merchant.link)) push(item.merchant.link);
  // SerpAPI sometimes returns a merchants[] array with per-seller direct links
  if (Array.isArray(item.merchants)) {
    for (const m of item.merchants) {
      if (m.link && !isGoogleHostUrl(m.link)) push(m.link);
    }
  }

  // Phase 2: Google-hosted fallbacks (last resort — beats showing nothing)
  if (item.direct_link) push(item.direct_link); // include even if Google-hosted
  if (item.merchant?.link) push(item.merchant.link);
  if (item.link) push(item.link);
  if (item.product_link) push(item.product_link);
  if (Array.isArray(item.merchants)) {
    for (const m of item.merchants) {
      if (m.link) push(m.link);
    }
  }
  return out;
}

export function buildAffiliateLink(item, destinationUrl, affiliatesEnabled) {
  if (!affiliatesEnabled || !destinationUrl || destinationUrl === '#') {
    return null;
  }

  const source = (item.source || '').toLowerCase();
  const sovrn = wrapSovrnIfConfigured(destinationUrl);
  if (sovrn) return sovrn;

  if (source.includes('amazon')) {
    const tag = process.env.AMAZON_ASSOCIATE_TAG || 'pennypounce-20';
    if (
      destinationUrl.includes('amazon.com') ||
      destinationUrl.includes('amazon.co')
    ) {
      const sep = destinationUrl.includes('?') ? '&' : '?';
      return `${destinationUrl}${sep}tag=${tag}`;
    }
  }

  if (source.includes('ebay')) {
    const ebayCampaign = process.env.EBAY_CAMPAIGN_ID;
    if (ebayCampaign && destinationUrl.includes('ebay.com')) {
      const sep = destinationUrl.includes('?') ? '&' : '?';
      return `${destinationUrl}${sep}campid=${ebayCampaign}`;
    }
  }

  return null;
}

function wrapSovrnIfConfigured(url) {
  const base = process.env.SOVRN_REDIRECT_BASE;
  if (!base) return null;
  try {
    const u = new URL(base);
    u.searchParams.set('url', url);
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Affiliate-first href; else first usable candidate (may be Google).
 */
export function resolveDealHref(item, affiliatesEnabled) {
  const candidates = collectUrlCandidates(item);
  const primaryForAffiliate =
    candidates.find((u) => !isGoogleHostUrl(u)) || candidates[0] || null;

  if (affiliatesEnabled && primaryForAffiliate) {
    for (const url of candidates) {
      const aff = buildAffiliateLink(item, url, true);
      if (aff && aff !== url) {
        return { href: aff, link_kind: 'affiliate' };
      }
    }
    const aff = buildAffiliateLink(item, primaryForAffiliate, true);
    if (aff) return { href: aff, link_kind: 'affiliate' };
  }

  const fallback = candidates[0] || item.link || item.product_link || '#';
  if (fallback === '#') return { href: '#', link_kind: 'direct' };
  const kind = isGoogleHostUrl(fallback) ? 'google' : 'direct';
  return { href: fallback, link_kind: kind };
}

export function parsePrice(priceStr) {
  if (priceStr == null) return null;
  const s = String(priceStr);
  const m = s.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1]);
}

function stringifyField(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(' ');
  return String(v);
}

export function availabilityScore(item) {
  const text = `${item.delivery || ''} ${item.snippet || ''} ${stringifyField(item.extensions)}`.toLowerCase();
  if (item.in_stock === false) return 0.2;
  if (item.in_stock === true) return 0.95;
  if (/out of stock|unavailable|sold out/.test(text)) return 0.15;
  if (/in stock|available|free delivery|free shipping/.test(text)) return 0.85;
  return 0.5;
}

export function reviewScore(item) {
  const rating = typeof item.rating === 'number' ? item.rating : parseFloat(item.rating);
  const reviews = typeof item.reviews === 'number' ? item.reviews : parseInt(item.reviews, 10);
  if (!Number.isFinite(rating) || rating <= 0) return 0.5;
  const r = Math.min(5, Math.max(0, rating)) / 5;
  const c = Number.isFinite(reviews) && reviews > 0 ? reviews : 0;
  const countPart = Math.log1p(c) / Math.log1p(REVIEWS_CAP);
  return Math.min(1, r * (0.65 + 0.35 * Math.min(1, countPart)));
}

export function rankDeals(deals) {
  const prices = deals
    .map((d) => d.price_numeric)
    .filter((p) => p != null && Number.isFinite(p));
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;

  const scored = deals.map((d) => {
    let priceScore = 0.5;
    if (min != null && max != null && d.price_numeric != null) {
      if (max === min) priceScore = 1;
      else {
        priceScore = (max - d.price_numeric) / (max - min);
      }
    }
    const rScore = reviewScore(d.raw || d);
    const aScore = availabilityScore(d.raw || d);
    const total = 0.7 * priceScore + 0.2 * rScore + 0.1 * aScore;
    return {
      ...d,
      score: total,
      score_breakdown: { price: priceScore, reviews: rScore, availability: aScore },
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function dedupeDeals(deals) {
  const seen = new Set();
  const out = [];
  for (const d of deals) {
    const store = (d.source || '').toLowerCase().trim();
    const priceKey = d.price_numeric != null ? String(d.price_numeric) : (d.price || '');
    const key = `${store}|${priceKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

export function normalizeSerpItem(item, affiliatesEnabled) {
  const { href, link_kind } = resolveDealHref(item, affiliatesEnabled);
  const price_numeric = parsePrice(item.price || item.extracted_price);
  return {
    title: item.title,
    source: item.source,
    price: item.price || (price_numeric != null ? `$${price_numeric}` : null),
    price_numeric,
    rating: item.rating,
    reviews: item.reviews,
    thumbnail: item.thumbnail,
    href,
    link_kind,
    raw: item,
  };
}
