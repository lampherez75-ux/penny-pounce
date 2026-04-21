// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getProductInfo') {
    const name = getProductName();
    const gtin = getGtin();
    sendResponse({ name, gtin: gtin || null });

    // Important: return true for async sendResponse
    return true;
  }
});

function getGtin() {
  const og = document.querySelector('meta[property="product:retailer_item_id"]');
  if (og?.content) return og.content.trim();

  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const el of jsonLdScripts) {
    try {
      const data = JSON.parse(el.textContent);
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        const g = extractGtinFromJsonLd(node);
        if (g) return g;
      }
    } catch {
      /* ignore */
    }
  }

  const amz = document.querySelector('#detailBullets_feature_div, #productDetails_detailBullets_sections1');
  if (amz) {
    const text = amz.innerText || '';
    const m = text.match(/\b(UPC|EAN|GTIN)\s*[:\s]+(\d{8,14})\b/i);
    if (m) return m[2];
  }

  return null;
}

function extractGtinFromJsonLd(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.gtin13) return String(node.gtin13);
  if (node.gtin12) return String(node.gtin12);
  if (node.gtin8) return String(node.gtin8);
  if (node.gtin) return String(node.gtin);
  if (node.productID && /^\d{8,14}$/.test(String(node.productID))) {
    return String(node.productID);
  }
  return null;
}

function getProductName() {
  // Amazon
  let name = document.querySelector('#productTitle')?.textContent?.trim();
  if (name) return name;

  // Walmart
  name = document.querySelector('[data-testid="product-title"]')?.textContent?.trim();
  if (name) return name;

  // eBay
  name = document.querySelector('.x-item-title__mainTitle')?.textContent?.trim();
  if (name) return name;

  // Generic selectors
  const selectors = [
    'h1[itemprop="name"]',
    '.product-title',
    '.product-name',
    'h1.product-name',
    '[class*="product"][class*="title"]',
    'h1'
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent?.trim().length > 5) {
      return el.textContent.trim();
    }
  }

  return null;
}
