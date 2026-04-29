/**
 * SerpAPI Google Shopping fetch.
 * When a GTIN is provided it is passed as `product_id` for an exact-product lookup.
 * Otherwise the product name is used as a quoted phrase query to reduce fuzzy matches.
 */
export async function serpGoogleShopping(query, gtin = '') {
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    throw new Error('SERPAPI_KEY not configured');
  }

  const params = new URLSearchParams({
    engine: 'google_shopping',
    // new:1 = New condition only; exclude used/refurbished at the Google level
    tbs: 'new:1',
    api_key: key,
  });

  if (gtin) {
    // Exact product lookup by barcode — most precise
    params.set('q', query);
    params.set('product_id', gtin);
  } else {
    // Wrap in quotes so Google treats it as a phrase, not loose keywords
    params.set('q', `"${query}"`);
  }

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`SerpAPI returned ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch all sellers for a specific Google product ID.
 * Returns sellers_results.online_sellers — each entry has a direct retailer link.
 * Used as a second-pass enrichment for text-query searches that lack direct_link.
 */
export async function serpProductSellers(productId, query) {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error('SERPAPI_KEY not configured');

  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    product_id: productId,
    tbs: 'new:1',
    api_key: key,
  });

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpAPI product sellers returned ${res.status}`);
  return res.json();
}

/**
 * Lite tier: use cache-first; on miss call SerpAPI unless PA-API is implemented.
 * Amazon PA-API requires AWS SigV4 — set LITE_USE_SERPI=0 and implement paapi separately if needed.
 */
export async function fetchShoppingRawForLite(product, gtin = '') {
  const useSerp =
    process.env.LITE_USE_SERPI !== '0' || !process.env.AMAZON_ACCESS_KEY;
  if (useSerp) {
    return { source: 'serpapi', data: await serpGoogleShopping(product, gtin) };
  }
  throw new Error('Lite data source not configured (set LITE_USE_SERPI=1 or add PA-API)');
}

export function shoppingResultsFromSerpJson(data) {
  // When a product_id (GTIN) is used, SerpAPI returns sellers_results whose
  // online_sellers each have a direct merchant link rather than a Google URL.
  // Prefer these when available; fall back to shopping_results for text queries.
  const sellers = data?.sellers_results?.online_sellers;
  if (Array.isArray(sellers) && sellers.length > 0) {
    const productTitle = data?.product_results?.title || '';
    const thumbnail = data?.product_results?.media?.[0]?.link || '';
    return sellers.map((s) => ({
      title: s.name && productTitle ? `${productTitle} — ${s.name}` : productTitle || s.name || '',
      source: s.name,
      price: s.base_price,
      link: s.link,        // direct retailer URL, never a google.com host
      rating: s.rating,
      reviews: s.reviews,
      delivery: s.delivery,
      thumbnail,
    }));
  }

  const list = data?.shopping_results;
  return Array.isArray(list) ? list : [];
}
