// Sentinel - shared mutable state and DOM element references used across
// every page module. Loaded early so everything below can rely on it.

let apiBase = sessionStorage.getItem('sentinel_apiBase') || document.getElementById('apiBase').value.replace(/\/$/, '');
let ws = null;
let allowCount = 0, blockCount = 0, alertCount = 0;

// Kept in sessionStorage (not localStorage) so a page refresh doesn't
// force signing in again, but the session still ends when the tab/
// browser is closed - a reasonable middle ground for a dashboard that
// controls the firewall.
let authToken = sessionStorage.getItem('sentinel_authToken') || null;
let currentRole = sessionStorage.getItem('sentinel_role') || null;

function persistSession() {
  sessionStorage.setItem('sentinel_authToken', authToken || '');
  sessionStorage.setItem('sentinel_role', currentRole || '');
  sessionStorage.setItem('sentinel_apiBase', apiBase || '');
}
function clearSession() {
  sessionStorage.removeItem('sentinel_authToken');
  sessionStorage.removeItem('sentinel_role');
  sessionStorage.removeItem('sentinel_apiBase');
}

// Seeds the dashboard's running counters from the server's all-time
// totals, instead of starting at zero every time a tab connects. Called
// on login and on restoring a session from sessionStorage.
async function seedPacketStats() {
  try {
    const stats = await api('/packet-stats');
    allowCount = stats.allow;
    blockCount = stats.block;
    alertCount = stats.alerts;
    lastAllowSnapshot = allowCount;
    lastBlockSnapshot = blockCount;
    bumpStat('allowCount', allowCount);
    bumpStat('blockCount', blockCount);
    bumpStat('alertCount', alertCount);
  } catch (e) {
    // Non-fatal - counters just start at 0 and grow from live events,
    // same as before this existed.
  }
}
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const feed = document.getElementById('feed');
const rulesBody = document.getElementById('rulesBody');
const accountsBody = document.getElementById('accountsBody');
let editingRuleId = null; // id of the rule currently shown in edit mode, if any
let lastLoadedRules = [];
let wsConnectionGeneration = 0;
// --- chart data ---
const protocolCounts = { tcp: 0, udp: 0 };
const severityCounts = { high: 0, medium: 0, low: 0 };
const srcIpCounts = {};
const dstIpCounts = {};
const ruleHitCounts = {};   // rule_id (string) or 'none' -> count
const alertNameCounts = {}; // signature/anomaly name -> count
const appPacketCounts = {}; // app/process name -> packet count, both directions combined
const rateHistory = []; // [{label, allow, block}] - one point per sample interval
const RATE_HISTORY_MAX_POINTS = 30;
let lastAllowSnapshot = 0, lastBlockSnapshot = 0;
let chartsInitialized = false;
// Live traffic keeps growing forever otherwise, which makes the DOM
// heavier over time and shows up as layout lag (e.g. on window resize).
// Trim to the most recent N lines.
const MAX_FEED_LINES = 300;

// Full log of received traffic events (not system messages), capped,
// so filters can be applied/changed without losing history.
const eventLog = [];
const EVENT_LOG_MAX = 500;
const mainEl = document.querySelector('main');
const statsEl = document.querySelector('.stats');
const accountsPanel = document.getElementById('accountsPanel');
const accountsBtn = document.getElementById('accountsBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const idsPanel = document.getElementById('idsPanel');
const idsBtn = document.getElementById('idsBtn');
const alertsBody = document.getElementById('alertsBody');
const chartsPanel = document.getElementById('chartsPanel');
const chartsBtn = document.getElementById('chartsBtn');
const logsPanel = document.getElementById('logsPanel');
const logsBtn = document.getElementById('logsBtn');
const packetsBody = document.getElementById('packetsBody');
const auditBody = document.getElementById('auditBody');
const myAccountPanel = document.getElementById('myAccountPanel');
const myAccountBtn = document.getElementById('myAccountBtn');
const nativeFwPanel = document.getElementById('nativeFwPanel');
const nativeFwBtn = document.getElementById('nativeFwBtn');
const nativeRulesBody = document.getElementById('nativeRulesBody');
const statusPanel = document.getElementById('statusPanel');
const statusBtn = document.getElementById('statusBtn');
let allPackets = []; // raw fetched packet history, filtered client-side
let allAuditEvents = []; // raw fetched audit log, filtered client-side
let allAlerts = []; // raw fetched alert history, filtered client-side
