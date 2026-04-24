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
    chrome.storage.local.set({
      instantRefreshToken: user.refresh_token,
      userEmail: user.email || '',
    });
  } else {
    chrome.storage.local.remove(['instantRefreshToken', 'userEmail', 'username']);
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
    loadProfile(user);
  } else {
    inn.classList.add('hidden');
    out.classList.remove('hidden');
  }
}

let profileUnsub = null;
let currentProfileId = null;
let currentUserId = null;

function loadProfile(user) {
  if (profileUnsub) {
    profileUnsub();
    profileUnsub = null;
  }

  currentProfileId = null;
  currentUserId = user.id;

  const displayEl = document.getElementById('usernameDisplay');
  const setWrap = document.getElementById('usernameSetWrap');
  const usernameInput = document.getElementById('usernameInput');

  if (!db || !user) return;

  profileUnsub = db.subscribeQuery(
    { profiles: { $: { where: { 'user.id': user.id } } } },
    ({ data, error }) => {
      if (error) return;
      const profile = data?.profiles?.[0];
      const username = profile?.username || '';
      currentProfileId = profile?.id || null;
      if (username) {
        if (displayEl) displayEl.textContent = 'Username: ' + username;
        if (setWrap) setWrap.classList.add('hidden');
        if (usernameInput) usernameInput.value = username;
        chrome.storage.local.set({ username });
      } else {
        if (displayEl) displayEl.textContent = '';
        if (setWrap) setWrap.classList.remove('hidden');
        chrome.storage.local.remove('username');
      }
    }
  );
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

document.getElementById('saveUsername')?.addEventListener('click', async () => {
  const input = document.getElementById('usernameInput');
  const status = document.getElementById('authStatus');
  const username = input?.value?.trim() || '';
  if (!db || !currentUserId) {
    showStatus(status, 'Not signed in', false);
    return;
  }
  if (!username) {
    showStatus(status, 'Enter a username', false);
    return;
  }
  try {
    const profileId = currentProfileId || crypto.randomUUID();
    await db.transact(
      db.tx.profiles[profileId].update({ username }).link({ user: currentUserId })
    );
    showStatus(status, 'Username saved', true);
  } catch (e) {
    showStatus(status, e?.message || 'Failed to save username', false);
  }
});

document.getElementById('signOut')?.addEventListener('click', async () => {
  if (!db) return;
  const status = document.getElementById('authStatus');
  try {
    if (profileUnsub) {
      profileUnsub();
      profileUnsub = null;
    }
    currentProfileId = null;
    currentUserId = null;
    await db.auth.signOut();
    syncAuthToChromeStorage(null);
    sentEmail = '';
    document.getElementById('codeWrap')?.classList.add('hidden');
    showStatus(status, 'Signed out', true);
  } catch (e) {
    showStatus(status, e?.message || 'Sign out failed', false);
  }
});

async function loadDevTier() {
  const st = await chrome.storage.local.get(['devTier']);
  const sel = document.getElementById('devTierSelect');
  if (sel) sel.value = st.devTier || '';
}

document.getElementById('saveDevTier')?.addEventListener('click', async () => {
  const sel = document.getElementById('devTierSelect');
  const status = document.getElementById('devTierStatus');
  const value = sel?.value || '';
  if (value) {
    await chrome.storage.local.set({ devTier: value, devUserId: 'dev-user' });
    showStatus(status, `Tier override set to "${value}". Reopen the popup to see changes.`, true);
  } else {
    await chrome.storage.local.remove(['devTier', 'devUserId']);
    showStatus(status, 'Tier override cleared — using real subscription tier.', true);
  }
});

load();
loadDevTier();
