// Sentinel - the live traffic WebSocket connection, feed rendering, and
// its filter bar.

async function connectWebSocket() {
  const myGeneration = ++wsConnectionGeneration;
  if (ws) { ws.close(); ws = null; }
  let ticket;
  try {
    const res = await api('/auth/ws-ticket', { method: 'POST' });
    ticket = res.ticket;
  } catch (e) {
    appendFeedLine({ system: 'could not get a connection ticket - ' + e.message });
    return;
  }
  if (myGeneration !== wsConnectionGeneration) {
    // Another connectWebSocket() call started after this one and is
    // further along - let it win rather than opening a second socket
    // that would double up every event's rendering/processing cost.
    return;
  }
  const wsUrl = apiBase.replace(/^http/, 'ws') + '/ws/events?ticket=' + encodeURIComponent(ticket);
  ws = new WebSocket(wsUrl);
  ws.onopen = () => appendFeedLine({ system: 'connected to event stream' });
  ws.onerror = () => appendFeedLine({ system: 'event stream error - see browser console/network tab' });
  ws.onclose = (ev) => {
    const reason = ev.code === 4401
      ? 'auth rejected - your session may be invalid, try logging out and back in'
      : `code ${ev.code}${ev.reason ? ' - ' + ev.reason : ''}`;
    appendFeedLine({ system: `event stream disconnected (${reason})` });
  };
  ws.onmessage = (msg) => {
    const batch = JSON.parse(msg.data); // now an array of events per flush, not one event
    const filters = currentFilters(); // read the filter controls ONCE per batch, not once per packet
    batch.forEach(event => {
      if (event.action === 'block') blockCount++; else if (event.action === 'allow') allowCount++;
      if (event.alerts && event.alerts.length) alertCount += event.alerts.length;
      appendFeedLine(event, filters);
    });
    bumpStat('allowCount', allowCount);
    bumpStat('blockCount', blockCount);
    bumpStat('alertCount', alertCount);
    // The "X / Y matching" counter used to be recalculated by scanning
    // the entire event log on EVERY single packet - with a full log and
    // a burst of events in one batch, that was up to (batch size) x
    // (log size) filter comparisons in a single tick, which is exactly
    // the kind of work that freezes the main thread and corrupts
    // in-progress paints (e.g. an open <select> dropdown rendering as a
    // blank box). Doing it once per batch instead is the actual fix.
    updateFilterMatchCount();
  };
}
function currentFilters() {
  return {
    action: document.getElementById('filterAction').value,
    protocol: document.getElementById('filterProtocol').value,
    direction: document.getElementById('filterDirection').value,
    alertsOnly: document.getElementById('filterAlertsOnly').checked,
    port: document.getElementById('filterPort').value.trim(),
    search: document.getElementById('filterSearch').value.trim().toLowerCase(),
  };
}

function passesFilters(event, filters) {
  if (filters.action !== 'all' && event.action !== filters.action) return false;
  if (filters.protocol !== 'all' && event.protocol !== filters.protocol) return false;
  if (filters.direction !== 'all' && event.direction !== filters.direction) return false;
  if (filters.alertsOnly && !(event.alerts && event.alerts.length)) return false;
  if (filters.port && extractPort(event.src) !== filters.port && extractPort(event.dst) !== filters.port) return false;
  if (filters.search) {
    const haystack = `${event.src} ${event.dst} ${event.app_name || ''}`.toLowerCase();
    if (!haystack.includes(filters.search)) return false;
  }
  return true;
}

function renderFeedLine(event) {
  const div = document.createElement('div');
  const hasAlerts = event.alerts && event.alerts.length > 0;
  div.className = 'line' + (hasAlerts ? ' has-alert' : '');
  const time = escapeHtml(event._time || new Date().toLocaleTimeString());
  if (event.system) {
    div.innerHTML = `<span>${time}</span><span>${escapeHtml(event.system)}</span>`;
  } else {
    const alertTags = hasAlerts
      ? event.alerts.map(a => `<span class="alert-tag" title="${escapeHtml(a.detail || '')}">⚠ ${escapeHtml(a.name)}</span>`).join(' ')
      : '';
    const appTag = event.app_name ? `<span class="app-tag">${escapeHtml(event.app_name)}</span>` : '';
    div.innerHTML = `
      <span>${time}</span>
      <span class="verdict ${escapeHtml(event.action)}">${escapeHtml(event.action.toUpperCase())}</span>
      <span>${escapeHtml(event.protocol)}</span>
      <span>${escapeHtml(event.src)} → ${escapeHtml(event.dst)}</span>
      <span>${escapeHtml(event.direction)}</span>
      ${appTag}
      ${alertTags}
    `;
  }
  return div;
}

function appendFeedLine(event, filters) {
  event._time = new Date().toLocaleTimeString();

  // System messages (connect/disconnect) always show, aren't filtered,
  // and aren't kept in the filterable log.
  if (!event.system) {
    eventLog.push(event);
    while (eventLog.length > EVENT_LOG_MAX) eventLog.shift();
    const f = filters || currentFilters(); // fall back for standalone callers (e.g. connect/disconnect messages call this without a batch)
    if (!passesFilters(event, f)) return;
  }

  const empty = feed.querySelector('.empty');
  if (empty) empty.remove();

  // Only auto-scroll if the user is already near the bottom - otherwise
  // they're deliberately looking at older entries, so leave them there.
  const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 40;

  feed.appendChild(renderFeedLine(event));

  while (feed.children.length > MAX_FEED_LINES) {
    feed.removeChild(feed.firstChild);
  }

  if (nearBottom) feed.scrollTop = feed.scrollHeight;
}

function updateFilterMatchCount() {
  const filters = currentFilters();
  const matchCount = eventLog.filter(e => passesFilters(e, filters)).length;
  document.getElementById('filterCount').textContent = `${matchCount} / ${eventLog.length} matching`;
}

function rerenderFeedFromLog() {
  const filters = currentFilters();
  const allMatching = eventLog.filter(e => passesFilters(e, filters));
  const matching = allMatching.slice(-MAX_FEED_LINES);
  document.getElementById('filterCount').textContent =
    `${allMatching.length} / ${eventLog.length} matching`;
  feed.innerHTML = '';
  if (!matching.length) {
    feed.innerHTML = '<div class="empty">No events match the current filters.</div>';
  } else {
    matching.forEach(e => feed.appendChild(renderFeedLine(e)));
  }
  feed.scrollTop = feed.scrollHeight;
}

['filterAction', 'filterProtocol', 'filterDirection', 'filterAlertsOnly'].forEach(id => {
  document.getElementById(id).addEventListener('change', rerenderFeedFromLog);
});
document.getElementById('filterPort').addEventListener('input', rerenderFeedFromLog);
document.getElementById('filterSearch').addEventListener('input', rerenderFeedFromLog);
