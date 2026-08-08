// Sentinel - pure helper functions (no shared state, no DOM side effects
// beyond what's passed in). Safe to load first.

// Everything rendered below comes from either the network (IPs, process
// names via psutil, alert details) or from other users (usernames set by
// an admin). None of that is trusted input - it goes through here before
// ever being interpolated into innerHTML, so a maliciously-named process
// or a crafted username can't inject markup/script into the dashboard.
const ESCAPE_HTML_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  // One regex pass covering all five characters, rather than five
  // sequential .replace() calls each re-scanning the whole string -
  // this runs on every field of every packet, so at high capture
  // volume the difference is real, not just tidiness.
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPE_HTML_MAP[ch]);
}
function bumpStat(id, value) {
  const el = document.getElementById(id);
  if (el.textContent === String(value)) return; // no-op change, skip the animation
  el.textContent = value;
  el.classList.remove('bump');
  // Force reflow so the animation restarts even on rapid consecutive updates.
  void el.offsetWidth;
  el.classList.add('bump');
}
function extractIp(ipPort) {
  if (!ipPort) return null;
  const idx = ipPort.lastIndexOf(':');
  return idx === -1 ? ipPort : ipPort.slice(0, idx);
}
function extractPort(ipPort) {
  if (!ipPort) return null;
  const idx = ipPort.lastIndexOf(':');
  return idx === -1 ? null : ipPort.slice(idx + 1);
}
function topNFromCounts(counts, n = 8) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }));
}
function formatBytes(bytes) {
  if (bytes == null) return '';
  const gb = bytes / (1024 ** 3);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
}
function barColorFor(percent) {
  if (percent >= 85) return '#E5677A'; // block/red
  if (percent >= 60) return '#E8A33D'; // accent/amber
  return '#3FB68C'; // allow/green
}
