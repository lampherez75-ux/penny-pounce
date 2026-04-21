/* global instant */

let db = null;
let sentEmail = '';

function showStatus(el, message, ok) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden', 'ok', 'err');
  el.classList.add(ok ? 'ok' : 'err');
}

function syncAuthToChromeStorage(user) {
  if (user && user.refresh_token) {
    chrome.storage.local.set({ instantRefreshToken: user.refresh_token });
  } else {
    chrome.storage.local.remove('instantRefreshToken');
  }
}

function renderAuth(user) {
  const needId = document.getElementById('authNeedId');
  const forms = document.getElementById('authForms');
  const out = document.getElementById('signedOutBlock');
  const inn = document.getElementById('signedInBlock');
  const emailEl = document.getElementById('signedInEmail');
  if (!db) {
    needId.classList.remove('hidden');
    forms.classList.add('hidden');
    return;
  }
  needId.classList.add('hidden');
  forms.classList.remove('hidden');
  if (user && user.email) {
    out.classList.add('hidden');
    inn.classList.remove('hidden');
    emailEl.textContent = 'Signed in as ' + user.email;
  } else {
    inn.classList.add('hidden');
    out.classList.remove('hidden');
  }
}

function initInstant(appId) {
  if (!appId || typeof instant === 'undefined') {
    db = null;
    return null;
  }
  db = instant.init({ appId, devtool: false });
  db.subscribeAuth((auth) => {
    syncAuthToChromeStorage(auth.user);
    renderAuth(auth.user);
  });
  return db;
}

async function load() {
  const apiInput = document.getElementById('apiOrigin');
  const appIdInput = document.getElementById('instantAppId');
  const st = await chrome.storage.local.get(['apiOrigin', 'instantAppId']);
  if (apiInput && st.apiOrigin) apiInput.value = st.apiOrigin;
  if (appIdInput && st.instantAppId) appIdInput.value = st.instantAppId;

  const appId = (st.instantAppId || '').trim();
  if (appId) initInstant(appId);
  let user = null;
  if (db) {
    try {
      user = await db.getAuth();
    } catch {
      user = null;
    }
  }
  renderAuth(user);
}

document.getElementById('saveBackend')?.addEventListener('click', async () => {
  const raw = document.getElementById('apiOrigin')?.value?.trim() || '';
  const origin = raw.replace(/\/$/, '');
  const status = document.getElementById('authStatus');
  if (!origin || !/^https?:\/\//i.test(origin)) {
    showStatus(status, 'Enter a valid http(s) URL', false);
    return;
  }
  await chrome.storage.local.set({ apiOrigin: origin });
  showStatus(status, 'Saved API URL', true);
});

document.getElementById('saveInstantId')?.addEventListener('click', async () => {
  const appId = document.getElementById('instantAppId')?.value?.trim() || '';
  const status = document.getElementById('authStatus');
  if (!appId) {
    showStatus(status, 'App ID required', false);
    return;
  }
  await chrome.storage.local.set({ instantAppId: appId });
  showStatus(status, 'Saved. Reloading…', true);
  location.reload();
});

document.getElementById('sendCode')?.addEventListener('click', async () => {
  const email = document.getElementById('email')?.value?.trim() || '';
  const status = document.getElementById('authStatus');
  const codeWrap = document.getElementById('codeWrap');
  if (!db || !email) {
    showStatus(status, 'Enter email', false);
    return;
  }
  try {
    await db.auth.sendMagicCode({ email });
    sentEmail = email;
    codeWrap?.classList.remove('hidden');
    showStatus(status, 'Check your email for the code', true);
  } catch (e) {
    const msg = e?.body?.message || e?.message || 'Send failed';
    showStatus(status, msg, false);
  }
});

document.getElementById('verifyCode')?.addEventListener('click', async () => {
  const code = document.getElementById('code')?.value?.trim() || '';
  const status = document.getElementById('authStatus');
  if (!db || !sentEmail || !code) {
    showStatus(status, 'Enter the code from email', false);
    return;
  }
  try {
    await db.auth.signInWithMagicCode({ email: sentEmail, code });
    showStatus(status, 'Signed in', true);
  } catch (e) {
    const msg = e?.body?.message || e?.message || 'Verification failed';
    showStatus(status, msg, false);
  }
});

document.getElementById('signOut')?.addEventListener('click', async () => {
  if (!db) return;
  const status = document.getElementById('authStatus');
  try {
    await db.auth.signOut();
    syncAuthToChromeStorage(null);
    sentEmail = '';
    document.getElementById('codeWrap')?.classList.add('hidden');
    showStatus(status, 'Signed out', true);
  } catch (e) {
    showStatus(status, e?.message || 'Sign out failed', false);
  }
});

load();
