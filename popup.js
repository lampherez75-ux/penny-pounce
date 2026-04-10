var API_URL = 'https://deal-scout-bzpjxyi0p-lampherez75-5227s-projects.vercel.app/api/search';

var productNameEl = document.getElementById('productName');
var searchBtn = document.getElementById('searchBtn');
var resultsEl = document.getElementById('results');
var currentProduct = null;

function init() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs || !tabs[0] || !tabs[0].id) {
      if (productNameEl) productNameEl.textContent = 'No active tab';
      return;
    }
    
    var tab = tabs[0];
    
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'getProductInfo' }, function(response) {
        if (chrome.runtime.lastError) {
          if (productNameEl) productNameEl.textContent = 'Unable to detect';
          currentProduct = null;
          return;
        }
        if (response && response.name) {
          currentProduct = response.name;
          if (productNameEl) productNameEl.textContent = response.name;
        } else {
          if (productNameEl) productNameEl.textContent = 'No product detected';
          currentProduct = null;
        }
      });
    } catch (err) {
      if (productNameEl) productNameEl.textContent = 'Error: ' + err.message;
      currentProduct = null;
    }
  });
}

if (searchBtn) {
  searchBtn.addEventListener('click', function() {
    if (!currentProduct) {
      if (resultsEl) resultsEl.innerHTML = '<div class="error">No product detected</div>';
      return;
    }
    
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';
    if (resultsEl) resultsEl.innerHTML = '<div class="loading">Comparing prices...</div>';

    fetch(API_URL + '?product=' + encodeURIComponent(currentProduct))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (!resultsEl) return;
        resultsEl.innerHTML = '';
        
        if (data.shopping_results && data.shopping_results.length > 0) {
          data.shopping_results.slice(0, 10).forEach(function(item) {
            var div = document.createElement('div');
            div.className = 'result-item';
            var price = item.price || 'N/A';
            var rating = item.rating ? '⭐ ' + item.rating + ' (' + item.reviews + ' reviews)' : '';
            var title = item.title ? item.title.substring(0, 35) + '...' : 'N/A';
            var source = item.source || 'Unknown';
            var link = item.product_link || '#';
            
            div.innerHTML = '<div class="result-info"><div class="store">' + source + '</div><div class="title">' + title + '</div>' + (rating ? '<div class="rating">' + rating + '</div>' : '') + '</div><div class="result-right"><div class="price">' + price + '</div><a href="' + link + '" target="_blank">View Deal</a></div>';
            resultsEl.appendChild(div);
          });
        } else {
          resultsEl.innerHTML = '<div class="error">No results found</div>';
        }
      })
      .catch(function(err) {
        if (resultsEl) resultsEl.innerHTML = '<div class="error">Error: ' + err.message + '</div>';
      })
      .finally(function() {
        if (searchBtn) {
          searchBtn.disabled = false;
          searchBtn.textContent = 'Compare Prices';
        }
      });
  });
}

init();
