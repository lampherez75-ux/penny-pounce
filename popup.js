var productNameEl = document.getElementById('productName');
var searchBtn = document.getElementById('searchBtn');
var resultsEl = document.getElementById('results');
var tierLabelEl = document.getElementById('tierLabel');
var dailySearchesEl = document.getElementById('dailySearches');
var aiBtn = document.getElementById('aiBtn');
var aiBtnWrapper = document.getElementById('aiBtnWrapper');
var aiBtnLabel = document.getElementById('aiBtnLabel');
var aiPanel = document.getElementById('aiPanel');

var currentProduct = null;
var currentGtin = null;
var currentAttributes = null;
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

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderBullets(bullets) {
  if (!Array.isArray(bullets) || !bullets.length) return '';
  return '<ul class="ai-bullets">' +
    bullets.map(function (b) {
      return '<li><span class="bullet-label">' + escHtml(b.label) + ':</span>' +
             '<span class="bullet-text">' + escHtml(b.text) + '</span></li>';
    }).join('') +
    '</ul>';
}

function renderProAnalysis(data) {
  if (!data || typeof data !== 'object') return '<p class="ai-overview">' + escHtml(String(data || '')) + '</p>';
  let html = '';
  if (data.overview) {
    html += '<p class="ai-overview">' + escHtml(data.overview) + '</p>';
  }
  html += renderBullets(data.bullets);
  return html;
}

function renderMaxAnalysis(data) {
  if (!data || typeof data !== 'object') return '<p class="ai-overview">' + escHtml(String(data || '')) + '</p>';
  let html = '';
  if (Array.isArray(data.winners) && data.winners.length) {
    data.winners.forEach(function (w, i) {
      html +=
        '<div class="winner-card-wrapper">' +
          '<div class="winner-card">' +
            '<div class="winner-label">Winner #' + (i + 1) + '</div>' +
            '<div class="winner-store-price">' + escHtml(w.store) + ' &mdash; ' + escHtml(w.price) + '</div>' +
            '<div class="winner-reason">' + escHtml(w.reason) + '</div>' +
          '</div>' +
        '</div>';
    });
  }
  if (data.overview) {
    html += '<p class="ai-overview">' + escHtml(data.overview) + '</p>';
  }
  html += renderBullets(data.bullets);
  return html;
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
          currentAttributes = response.attributes || null;
          if (productNameEl) productNameEl.textContent = response.name;
        } else {
          if (productNameEl) productNameEl.textContent = 'No product detected';
          currentProduct = null;
          currentGtin = null;
          currentAttributes = null;
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
  if (tierLabelEl) {
    tierLabelEl.textContent = tier
      ? tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
      : '';
  }
  if (dailySearchesEl) {
    if (tier === 'lite' && usage) {
      dailySearchesEl.textContent = usage.used + '/' + usage.limit + ' Daily Searches';
      dailySearchesEl.style.display = 'block';
    } else {
      dailySearchesEl.style.display = 'none';
    }
  }
}

function parsePrice(str) {
  var n = parseFloat(String(str || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

function showAiForTier(tier, afterSearch) {
  if (!aiBtnWrapper || !aiBtnLabel) return;
  if (afterSearch && (tier === 'pro' || tier === 'max')) {
    aiBtnLabel.textContent = tier === 'pro' ? "Penn's Price Analysis" : "Penn's Pick";
    if (searchBtn) searchBtn.style.display = 'none';
    aiBtnWrapper.style.display = 'block';
  } else {
    aiBtnWrapper.style.display = 'none';
    if (searchBtn) {
      searchBtn.style.display = '';
      if (afterSearch) {
        searchBtn.disabled = false;
        searchBtn.textContent = 'Compare Prices';
      }
    }
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
    if (currentAttributes) q.set('attrs', JSON.stringify(currentAttributes));
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
    showAiForTier(data.tier, true);

    if (!resultsEl) return;
    resultsEl.innerHTML = '';

    if (lastDeals.length > 0) {
      lastDeals.forEach(function (item, index) {
        var div = document.createElement('div');
        div.className = 'result-item';

        var price = item.price || 'N/A';
        var rating = item.rating
          ? '⭐ ' + item.rating + ' (' + (item.reviews || 0) + ' reviews)'
          : '';
        var title = item.title ? item.title.substring(0, 40) + (item.title.length > 40 ? '…' : '') : 'N/A';
        var source = item.source || 'Unknown';
        var link = safeHref(item.href || '#');

        var rankBadge = '';
        if (index < 3) {
          rankBadge = '<div class="rank-badge rank-' + (index + 1) + '">' + (index + 1) + '</div>';
        }

        div.innerHTML =
          rankBadge +
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
    showAiForTier(lastTier, false);
    searchBtn.disabled = false;
    searchBtn.textContent = 'Compare Prices';
  }
}

// Open deal links in a background tab so the popup stays visible for comparison.
if (resultsEl) {
  resultsEl.addEventListener('click', function (e) {
    var anchor = e.target.closest('a');
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href || href === '#') return;
    e.preventDefault();
    chrome.tabs.create({ url: href, active: false });
  });
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
      if (!res.ok) {
        if (data.quota_exceeded) {
          aiPanel.innerHTML =
            'Gemini API quota exceeded. <a href="https://ai.dev/rate-limit" target="_blank" rel="noopener noreferrer">Enable billing</a> to continue using AI features, or try again tomorrow.';
        } else {
          throw new Error(data.message || data.error || 'AI request failed');
        }
        return;
      }
      const analysis = data.analysis;
      if (analysis && typeof analysis === 'object') {
        aiPanel.innerHTML = (data.tier || lastTier) === 'max'
          ? renderMaxAnalysis(analysis)
          : renderProAnalysis(analysis);
      } else {
        aiPanel.innerHTML = renderProAnalysis(analysis);
      }
    } catch (e) {
      aiPanel.textContent = 'Error: ' + e.message;
    } finally {
      aiBtn.disabled = false;
      if (aiBtnLabel) {
        aiBtnLabel.textContent = lastTier === 'pro' ? "Penn's Price Analysis" : "Penn's Pick";
      }
    }
  });
}

document.getElementById('openSettings')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

function refreshAccountBtn() {
  chrome.storage.local.get(['username', 'userEmail'], (s) => {
    const btn = document.getElementById('openSettings');
    if (btn) btn.textContent = s.username || s.userEmail || 'Account';
  });
}

async function refreshUsageBar() {
  try {
    const url = await apiUrl('/api/usage');
    const headers = await apiHeaders();
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) return;
    setTierBar(data.usage, data.tier);
    chrome.storage.local.set({ tier: data.tier });
  } catch {
    /* offline or API down */
  }
}

init();
void refreshUsageBar();
refreshAccountBtn();
