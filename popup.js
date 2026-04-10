const API_URL = 'https://penny-pounce.vercel.app/api/search';

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
  .then(function(res) {
    return res.text().then(function(text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error('API did not return JSON. First 100 chars: ' + text.slice(0, 100));
      }
    });
  })
  .then(function(data) {
    // same as before
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


init();
