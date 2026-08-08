// Sentinel - Logs page: packet history and audit log tables and filters.

function packetPassesFilters(p) {
  const action = document.getElementById('pktFilterAction').value;
  const protocol = document.getElementById('pktFilterProtocol').value;
  const direction = document.getElementById('pktFilterDirection').value;
  const port = document.getElementById('pktFilterPort').value.trim();
  const search = document.getElementById('pktFilterSearch').value.trim().toLowerCase();
  if (action !== 'all' && p.action !== action) return false;
  if (protocol !== 'all' && p.protocol !== protocol) return false;
  if (direction !== 'all' && p.direction !== direction) return false;
  if (port && extractPort(p.src) !== port && extractPort(p.dst) !== port) return false;
  if (search && !`${p.src} ${p.dst} ${p.app_name || ''}`.toLowerCase().includes(search)) return false;
  return true;
}

function renderPackets(packets) {
  const matching = packets.filter(packetPassesFilters);
  document.getElementById('pktFilterCount').textContent = `${matching.length} / ${packets.length} matching`;
  if (!matching.length) {
    packetsBody.innerHTML = '<tr><td colspan="7" style="color:var(--text-dim)">No packets match the current filters.</td></tr>';
    return;
  }
  packetsBody.innerHTML = matching.map(p => `
    <tr>
      <td>${p.date_str || new Date(p.timestamp * 1000).toLocaleString()}</td>
      <td><span class="badge ${escapeHtml(p.action)}">${escapeHtml(p.action || '')}</span></td>
      <td>${escapeHtml(p.protocol || '')}</td>
      <td>${escapeHtml(p.src || '')}</td>
      <td>${escapeHtml(p.dst || '')}</td>
      <td>${escapeHtml(p.direction || '')}</td>
      <td>${escapeHtml(p.app_name || '')}</td>
    </tr>
  `).join('');
}

async function loadPackets() {
  try {
    allPackets = await api('/packets');
    renderPackets(allPackets);
    document.getElementById('packetsError').textContent = '';
  } catch (e) {
    document.getElementById('packetsError').textContent = 'Could not load packet history.';
  }
}

['pktFilterAction', 'pktFilterProtocol', 'pktFilterDirection'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => renderPackets(allPackets));
});
document.getElementById('pktFilterPort').addEventListener('input', () => renderPackets(allPackets));
document.getElementById('pktFilterSearch').addEventListener('input', () => renderPackets(allPackets));

document.getElementById('refreshPacketsBtn').addEventListener('click', loadPackets);
document.getElementById('clearPacketsBtn').addEventListener('click', async () => {
  try {
    await api('/packets', { method: 'DELETE' });
    loadPackets();
  } catch (e) {
    document.getElementById('packetsError').textContent = 'Could not clear packet history - ' + e.message;
  }
});
function auditPassesFilters(a) {
  const type = document.getElementById('auditFilterType').value;
  const search = document.getElementById('auditFilterSearch').value.trim().toLowerCase();
  if (type !== 'all' && a.event_type !== type) return false;
  if (search && !`${a.actor} ${a.target}`.toLowerCase().includes(search)) return false;
  return true;
}

function renderAudit(events) {
  const matching = events.filter(auditPassesFilters);
  document.getElementById('auditFilterCount').textContent = `${matching.length} / ${events.length} matching`;
  if (!matching.length) {
    auditBody.innerHTML = '<tr><td colspan="5" style="color:var(--text-dim)">No audit events match the current filters.</td></tr>';
    return;
  }
  auditBody.innerHTML = matching.map(a => `
    <tr>
      <td>${a.date_str || new Date(a.timestamp * 1000).toLocaleString()}</td>
      <td>${escapeHtml(a.event_type)}</td>
      <td>${escapeHtml(a.actor || '')}</td>
      <td>${escapeHtml(a.target || '')}</td>
      <td>${escapeHtml(a.detail || '')}</td>
    </tr>
  `).join('');
}

async function loadAudit() {
  try {
    allAuditEvents = await api('/audit');
    renderAudit(allAuditEvents);
    document.getElementById('auditError').textContent = '';
  } catch (e) {
    document.getElementById('auditError').textContent = 'Could not load audit log.';
  }
}

document.getElementById('auditFilterType').addEventListener('change', () => renderAudit(allAuditEvents));
document.getElementById('auditFilterSearch').addEventListener('input', () => renderAudit(allAuditEvents));

document.getElementById('refreshAuditBtn').addEventListener('click', loadAudit);
document.getElementById('clearAuditBtn').addEventListener('click', async () => {
  try {
    await api('/audit', { method: 'DELETE' });
    loadAudit();
  } catch (e) {
    document.getElementById('auditError').textContent = 'Could not clear audit log - ' + e.message;
  }
});
