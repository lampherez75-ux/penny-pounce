var productNameEl = document.getElementById('productName');
var searchBtn = document.getElementById('searchBtn');
var resultsEl = document.getElementById('results');
var tierBarEl = document.getElementById('tierBar');
var aiBtn = document.getElementById('aiBtn');
var aiPanel = document.getElementById('aiPanel');

var currentProduct = null;
var currentGtin = null;
var lastDeals = [];
var lastTier = 'lite';

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeHref(u) {
  if (!u || u === '#') return '#';
  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch {
    /* ignore */
  }
  return '#';
}

function init() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs || !tabs[0] || !tabs[0].id) {
      if (productNameEl) productNameEl.textContent = 'No active tab';
      return;
    }

    var tab = tabs[0];

    try {
      chrome.tabs.sendMessage(tab.id, { type: 'getProductInfo' }, function (response) {
        if (chrome.runtime.lastError) {
          if (productNameEl) productNameEl.textContent = 'Unable to detect';
          currentProduct = null;
          currentGtin = null;
          return;
        }
        if (response && response.name) {
          currentProduct = response.name;
          currentGtin = response.gtin || null;
          if (productNameEl) productNameEl.textContent = response.name;
        } else {
          if (productNameEl) productNameEl.textContent = 'No product detected';
          currentProduct = null;
          currentGtin = null;
        }
      });
    } catch (err) {
      if (productNameEl) productNameEl.textContent = 'Error: ' + err.message;
      currentProduct = null;
      currentGtin = null;
    }
  });
}

function setTierBar(usage, tier) {
  if (!tierBarEl) return;
  if (!usage || !tier) {
    tierBarEl.textContent = '';
    return;
  }
  tierBarEl.textContent =
    'Plan: ' + String(tier).toUpperCase() + ' — ' + usage.used + '/' + usage.limit + ' searches today';
}

function showAiForTier(tier) {
  if (!aiBtn) return;
  if (tier === 'pro' || tier === 'max') {
    aiBtn.style.display = 'block';
  } else {
    aiBtn.style.display = 'none';
  }
}

async function runSearch() {
  if (!currentProduct) {
    if (resultsEl) resultsEl.innerHTML = '<div class="error">No product detected</div>';
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching...';
  if (resultsEl) resultsEl.innerHTML = '<div class="loading">Comparing prices...</div>';
  if (aiPanel) {
    aiPanel.classList.remove('visible');
    aiPanel.textContent = '';
  }

  try {
    const base = await apiUrl('/api/search');
    const q = new URLSearchParams({ product: currentProduct });
    if (currentGtin) q.set('gtin', currentGtin);
    const headers = await apiHeaders();
    const res = await fetch(base + '?' + q.toString(), { headers });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('API did not return JSON. First 100 chars: ' + text.slice(0, 100));
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || 'Request failed ' + res.status);
    }

    lastDeals = data.deals || [];
    lastTier = data.tier || 'lite';
    chrome.storage.local.set({ tier: lastTier });

    setTierBar(data.usage, data.tier);
    showAiForTier(data.tier);

    if (!resultsEl) return;
    resultsEl.innerHTML = '';

    if (lastDeals.length > 0) {
      lastDeals.forEach(function (item) {
        var div = document.createElement('div');
        div.className = 'result-item';

        var price = item.price || 'N/A';
        var rating = item.rating
          ? '⭐ ' + item.rating + ' (' + (item.reviews || 0) + ' reviews)'
          : '';
        var title = item.title ? item.title.substring(0, 40) + (item.title.length > 40 ? '…' : '') : 'N/A';
        var source = item.source || 'Unknown';
        var link = safeHref(item.href || '#');

        div.innerHTML =
          '<div class="result-info">' +
          '<div class="store">' +
          esc(source) +
          '</div>' +
          '<div class="title">' +
          esc(title) +
          '</div>' +
          (rating ? '<div class="rating">' + esc(rating) + '</div>' : '') +
          '</div>' +
          '<div class="result-right">' +
          '<div class="price">' +
          esc(price) +
          '</div>' +
          '<a href="' +
          link.replace(/"/g, '&quot;') +
          '" target="_blank" rel="noopener noreferrer">View Deal</a>' +
          '</div>';

        resultsEl.appendChild(div);
      });
    } else {
      resultsEl.innerHTML = '<div class="error">No results found</div>';
    }
  } catch (err) {
    if (resultsEl) {
      resultsEl.innerHTML = '<div class="error">Error: ' + esc(err.message) + '</div>';
    }
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Compare Prices';
  }
}

if (searchBtn) {
  searchBtn.addEventListener('click', function () {
    runSearch();
  });
}

if (aiBtn) {
  aiBtn.addEventListener('click', async function () {
    if (!currentProduct || !lastDeals.length) return;
    aiBtn.disabled = true;
    aiPanel.textContent = 'Analyzing…';
    aiPanel.classList.add('visible');
    try {
      const url = await apiUrl('/api/ai/analyze');
      const headers = await apiHeaders();
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ product: currentProduct, deals: lastDeals }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      aiPanel.textContent = data.analysis || '';
    } catch (e) {
      aiPanel.textContent = 'Error: ' + e.message;
    } finally {
      aiBtn.disabled = false;
    }
  });
}

document.getElementById('openSettings')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

async function refreshUsageBar() {
  try {
    const url = await apiUrl('/api/usage');
    const headers = await apiHeaders();
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) return;
    setTierBar(data.usage, data.tier);
    showAiForTier(data.tier);
    chrome.storage.local.set({ tier: data.tier });
  } catch {
    /* offline or API down */
  }
}

init();
void refreshUsageBar();
