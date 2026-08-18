// Sentinel - login/logout, the api() fetch wrapper, and self-service
// password change.

async function api(path, opts = {}) {
  const res = await fetch(apiBase + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...opts,
  });
  if (res.status === 401) {
    showLogin('Session expired - please sign in again.');
    throw new Error('unauthorized');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? null : res.json();
}

function showLogin(message = '') {
  authToken = null;
  currentRole = null;
  clearSession();
  document.getElementById('accountsBtn').style.display = 'none';
  document.getElementById('clearAlertsBtn').style.display = 'none';
  document.getElementById('clearPacketsBtn').style.display = 'none';
  if (ws) { ws.close(); ws = null; }
  document.getElementById('appRoot').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginError').textContent = message;
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appRoot').style.display = 'block';
  showDashboardView();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  apiBase = document.getElementById('apiBaseLogin').value.replace(/\/$/, '');
  document.getElementById('apiBase').value = apiBase;

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(apiBase + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      errorEl.textContent = 'Invalid username or password.';
      return;
    }
    const data = await res.json();
    authToken = data.access_token;
    currentRole = data.role;
    persistSession();
    document.getElementById('accountsBtn').style.display = currentRole === 'admin' ? 'inline-block' : 'none';
    document.getElementById('clearAlertsBtn').style.display = currentRole === 'admin' ? 'inline-block' : 'none';
    document.getElementById('clearPacketsBtn').style.display = currentRole === 'admin' ? 'inline-block' : 'none';
    showApp();
    loadRules();
    loadExclusions();
    refreshStatus();
    seedPacketStats();
    connectWebSocket();
  } catch (err) {
    errorEl.textContent = 'Could not reach the API - check the API base URL.';
  }
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch (e) {
    // Log out client-side regardless of whether the audit call
    // succeeded - losing connectivity shouldn't trap the user in
    // a session they clicked "Log out" on.
  }
  document.getElementById('password').value = '';
  showLogin();
});
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('changePasswordError');
  const successEl = document.getElementById('changePasswordSuccess');
  errorEl.textContent = '';
  successEl.style.display = 'none';

  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'New password and confirmation do not match.';
    return;
  }
  if (!newPassword) {
    errorEl.textContent = 'New password cannot be empty.';
    return;
  }

  try {
    await api('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    document.getElementById('changePasswordForm').reset();
    successEl.style.display = 'block';
  } catch (err) {
    errorEl.textContent = 'Current password is incorrect.';
  }
});
