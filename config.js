/** Default API host; override via chrome.storage.local 'apiOrigin'. */
const PENNY_API_ORIGIN_DEFAULT = 'https://penny-pounce.vercel.app';

function apiOriginFromStorageSync() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['apiOrigin'], (s) => {
        resolve(s.apiOrigin || PENNY_API_ORIGIN_DEFAULT);
      });
    } catch {
      resolve(PENNY_API_ORIGIN_DEFAULT);
    }
  });
}

function deviceIdSync() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['deviceId'], async (s) => {
      if (s.deviceId) {
        resolve(s.deviceId);
        return;
      }
      const id = crypto.randomUUID();
      chrome.storage.local.set({ deviceId: id }, () => resolve(id));
    });
  });
}

function getInstantToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['instantRefreshToken'], (s) => {
      resolve(s.instantRefreshToken || null);
    });
  });
}

async function apiHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  const token = await getInstantToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  headers['X-Device-Id'] = await deviceIdSync();
  const dev = await new Promise((resolve) => {
    chrome.storage.local.get(['devTier', 'devUserId'], resolve);
  });
  if (dev.devTier === 'pro' || dev.devTier === 'max' || dev.devTier === 'lite') {
    headers['X-Dev-Tier'] = dev.devTier;
    headers['X-Dev-User-Id'] = dev.devUserId || 'dev-user';
  }
  return headers;
}

async function apiUrl(path) {
  const origin = await apiOriginFromStorageSync();
  return origin.replace(/\/$/, '') + path;
}
