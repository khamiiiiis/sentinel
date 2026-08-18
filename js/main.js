// Sentinel - final bootstrap, loaded last.

// The app starts on the login screen (see #loginScreen / #appRoot above).
// loadRules/refreshStatus/connectWebSocket only run after a successful
// /auth/login, from inside the loginForm submit handler.
setInterval(() => { if (authToken) refreshStatus(); }, 5000);
