/**
 * SerpAPI Google Shopping fetch.
 */
export async function serpGoogleShopping(query) {
  const key = process.env.SERPAPI_KEY;
  if (!key) {
    throw new Error('SERPAPI_KEY not configured');
  }
  const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
    query
  )}&api_key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`SerpAPI returned ${res.status}`);
  }
  return res.json();
}

/**
 * Lite tier: use cache-first; on miss call SerpAPI unless PA-API is implemented.
 * Amazon PA-API requires AWS SigV4 — set LITE_USE_SERPI=0 and implement paapi separately if needed.
 */
export async function fetchShoppingRawForLite(product) {
  const useSerp =
    process.env.LITE_USE_SERPI !== '0' || !process.env.AMAZON_ACCESS_KEY;
  if (useSerp) {
    return { source: 'serpapi', data: await serpGoogleShopping(product) };
  }
  throw new Error('Lite data source not configured (set LITE_USE_SERPI=1 or add PA-API)');
}

export function shoppingResultsFromSerpJson(data) {
  const list = data?.shopping_results;
  return Array.isArray(list) ? list : [];
}
