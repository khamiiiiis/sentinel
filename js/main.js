// Sentinel - final bootstrap, loaded last.

// The app starts on the login screen (see #loginScreen / #appRoot above)
// UNLESS a session was restored from sessionStorage below - a refresh
// no longer requires signing in again, as long as the token is still
// valid (an expired/invalid one is caught by api()'s 401 handling and
// falls back to the login screen anyway).
if (authToken) {
  document.getElementById('apiBase').value = apiBase;
  document.getElementById('accountsBtn').style.display = currentRole === 'admin' ? 'inline-block' : 'none';
  document.getElementById('clearAlertsBtn').style.display = currentRole === 'admin' ? 'inline-block' : 'none';
  document.getElementById('clearPacketsBtn').style.display = currentRole === 'admin' ? 'inline-block' : 'none';
  showApp();
  loadRules();
  loadExclusions();
  refreshStatus();
  seedPacketStats();
  connectWebSocket();
}

setInterval(() => { if (authToken) refreshStatus(); }, 5000);
