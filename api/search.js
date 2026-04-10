// api/search.js
// Vercel Serverless Function for Penny Pounce

export default async function handler(req, res) {
  // Enable CORS for Chrome extension
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { product } = req.query;

  if (!product) {
    return res.status(400).json({ error: 'Product name required' });
  }

  try {
    // Get SerpAPI key from environment
    const SERPAPI_KEY = process.env.SERPAPI_KEY;

    if (!SERPAPI_KEY) {
      console.error('SERPAPI_KEY not configured');
      return res.status(500).json({ error: 'API not configured' });
    }

    // Build SerpAPI URL for Google Shopping
    const serpApiUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(product)}&api_key=${SERPAPI_KEY}`;

    console.log('Fetching results for:', product);

    // Fetch from SerpAPI
    const response = await fetch(serpApiUrl);

    if (!response.ok) {
      throw new Error(`SerpAPI returned ${response.status}`);
    }

    const data = await response.json();

    // Transform results to include direct links and affiliate tracking
    if (data.shopping_results && Array.isArray(data.shopping_results)) {
      data.shopping_results = data.shopping_results.map(item => {
        const directLink = extractDirectLink(item);
        const affiliateLink = generateAffiliateLink(item, directLink);

        return {
          ...item,
          link: directLink,
          affiliate_link: affiliateLink
        };
      });
    }

    console.log(`Returning ${data.shopping_results?.length || 0} results`);

    return res.status(200).json(data);

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  }
}

/**
 * Extract direct product link from SerpAPI result
 */
function extractDirectLink(item) {
  // Priority order for finding the best link
  if (item.link && !item.link.includes('google.com')) {
    return item.link;
  }

  if (item.product_link && !item.product_link.includes('google.com')) {
    return item.product_link;
  }

  // Check merchant link
  if (item.merchant && item.merchant.link) {
    return item.merchant.link;
  }

  // Fallback
  return item.link || item.product_link || '#';
}

/**
 * Generate affiliate link based on retailer
 */
function generateAffiliateLink(item, productLink) {
  const source = (item.source || '').toLowerCase();

  // Amazon Associates
  if (source.includes('amazon')) {
    const amazonTag = process.env.AMAZON_ASSOCIATE_TAG || 'pennypounce-20';

    if (productLink.includes('amazon.com') || productLink.includes('amazon.co')) {
      const separator = productLink.includes('?') ? '&' : '?';
      return `${productLink}${separator}tag=${amazonTag}`;
    }
  }

  // eBay Partner Network
  if (source.includes('ebay')) {
    // Add your eBay campaign ID when you sign up
    const ebayAffiliateId = process.env.EBAY_CAMPAIGN_ID;
    if (ebayAffiliateId && productLink.includes('ebay.com')) {
      const separator = productLink.includes('?') ? '&' : '?';
      return `${productLink}${separator}campid=${ebayAffiliateId}`;
    }
  }

  // Walmart Affiliates
  if (source.includes('walmart')) {
    // Add your Walmart affiliate link when approved
    // For now, return direct link
  }

  // Target Affiliates (via Impact/CJ)
  if (source.includes('target')) {
    // Add your Target affiliate tracking when approved
  }

  // Default: return original link
  return productLink;
}
