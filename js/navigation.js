// Sentinel - sidebar navigation, panel show/hide, and top-bar controls
// (Start/Stop/Connect).

async function refreshStatus() {
  try {
    const s = await api('/capture/status');
    statusDot.classList.toggle('live', s.running);
    statusText.textContent = s.running ? 'capturing' : 'idle';
  } catch (e) {
    statusDot.classList.remove('live');
    statusText.textContent = 'unreachable';
  }
}
document.getElementById('connectBtn').addEventListener('click', () => {
  apiBase = document.getElementById('apiBase').value.replace(/\/$/, '');
  loadRules();
  loadExclusions();
  refreshStatus();
  connectWebSocket();
});

document.getElementById('startBtn').addEventListener('click', async () => {
  await api('/capture/start', { method: 'POST' });
  refreshStatus();
});
document.getElementById('stopBtn').addEventListener('click', async () => {
  await api('/capture/stop', { method: 'POST' });
  refreshStatus();
});
function setActiveNav(activeBtn) {
  [dashboardBtn, chartsBtn, idsBtn, logsBtn, accountsBtn, myAccountBtn, nativeFwBtn, statusBtn].forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
}

function hideAllPanels() {
  accountsPanel.style.display = 'none';
  idsPanel.style.display = 'none';
  chartsPanel.style.display = 'none';
  logsPanel.style.display = 'none';
  myAccountPanel.style.display = 'none';
  nativeFwPanel.style.display = 'none';
  statusPanel.style.display = 'none';
  mainEl.style.display = 'none';
  statsEl.style.display = 'none';
}

function showDashboardView() {
  hideAllPanels();
  mainEl.style.display = 'grid';
  statsEl.style.display = 'flex';
  setActiveNav(dashboardBtn);
}

function showAccountsView() {
  hideAllPanels();
  accountsPanel.style.display = 'block';
  setActiveNav(accountsBtn);
  loadAccounts();
}

function showIdsView() {
  hideAllPanels();
  idsPanel.style.display = 'block';
  setActiveNav(idsBtn);
  loadRules();
  loadAlerts();
}

function showChartsView() {
  hideAllPanels();
  chartsPanel.style.display = 'block';
  setActiveNav(chartsBtn);
  initChartsIfNeeded();
  updateCharts();
}

function showLogsView() {
  hideAllPanels();
  logsPanel.style.display = 'block';
  setActiveNav(logsBtn);
  document.getElementById('auditAdminOnly').style.display = currentRole === 'admin' ? 'block' : 'none';
  document.getElementById('auditNotAdmin').style.display = currentRole === 'admin' ? 'none' : 'block';
  loadExclusions();
  loadPackets();
  if (currentRole === 'admin') loadAudit();
}

function showMyAccountView() {
  hideAllPanels();
  myAccountPanel.style.display = 'block';
  setActiveNav(myAccountBtn);
  document.getElementById('changePasswordForm').reset();
  document.getElementById('changePasswordError').textContent = '';
  document.getElementById('changePasswordSuccess').style.display = 'none';
}

function showNativeFwView() {
  hideAllPanels();
  nativeFwPanel.style.display = 'block';
  setActiveNav(nativeFwBtn);
  loadNativeRules();
  loadProcesses();
}

function showStatusView() {
  hideAllPanels();
  statusPanel.style.display = 'block';
  setActiveNav(statusBtn);
  loadSystemStatus();
}

dashboardBtn.addEventListener('click', showDashboardView);
accountsBtn.addEventListener('click', showAccountsView);
idsBtn.addEventListener('click', showIdsView);
chartsBtn.addEventListener('click', showChartsView);
logsBtn.addEventListener('click', showLogsView);
myAccountBtn.addEventListener('click', showMyAccountView);
nativeFwBtn.addEventListener('click', showNativeFwView);
statusBtn.addEventListener('click', showStatusView);
