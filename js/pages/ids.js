// Sentinel - IDS alerts table, its filters, and the instant-block
// actions.

function alertPassesFilters(a) {
  const severity = document.getElementById('idsFilterSeverity').value;
  const type = document.getElementById('idsFilterType').value;
  const port = document.getElementById('idsFilterPort').value.trim();
  const search = document.getElementById('idsFilterSearch').value.trim().toLowerCase();
  if (severity !== 'all' && a.severity !== severity) return false;
  if (type !== 'all' && a.type !== type) return false;
  if (port && extractPort(a.src) !== port && extractPort(a.dst) !== port) return false;
  if (search && !`${a.name} ${a.src} ${a.dst} ${a.detail || ''} ${a.app_name || ''}`.toLowerCase().includes(search)) return false;
  return true;
}

function renderAlerts(alerts) {
  const matching = alerts.filter(alertPassesFilters);
  document.getElementById('idsFilterCount').textContent = `${matching.length} / ${alerts.length} matching`;
  if (!matching.length) {
    alertsBody.innerHTML = '<tr><td colspan="10" style="color:var(--text-dim)">No alerts match the current filters.</td></tr>';
    return;
  }
  const canBlock = currentRole === 'operator' || currentRole === 'admin';
  alertsBody.innerHTML = matching.map((a, i) => `
    <tr>
      <td>${a.date_str || new Date(a.timestamp * 1000).toLocaleString()}</td>
      <td><span class="badge ${escapeHtml(a.severity)}">${escapeHtml(a.severity)}</span></td>
      <td>${escapeHtml(a.name)}</td>
      <td>${escapeHtml(a.type)}</td>
      <td>${escapeHtml(a.src || '')}</td>
      <td>${escapeHtml(a.dst || '')}</td>
      <td>${escapeHtml(a.protocol || '')}</td>
      <td>${escapeHtml(a.app_name || '')}</td>
      <td>${escapeHtml(a.detail || '')}</td>
      <td>${canBlock ? `
        <button class="icon-btn block-alert-btn" data-idx="${i}" data-side="src" title="Block this source IP:port">🚫 Src</button>
        <button class="icon-btn block-alert-btn" data-idx="${i}" data-side="dst" title="Block this destination IP:port">🚫 Dst</button>
      ` : ''}</td>
    </tr>
  `).join('');

  if (canBlock) {
    alertsBody.querySelectorAll('.block-alert-btn').forEach(btn => {
      btn.addEventListener('click', () => blockAlertEndpoint(matching[Number(btn.dataset.idx)], btn.dataset.side));
    });
  }
}

async function blockAlertEndpoint(alert, side) {
  const endpoint = side === 'src' ? alert.src : alert.dst;
  const ip = extractIp(endpoint);
  const portStr = extractPort(endpoint);
  if (!ip) {
    document.getElementById('idsError').textContent = 'No IP available to block for this alert.';
    return;
  }
  const body = {
    action: 'block',
    protocol: alert.protocol || null,
    direction: null,
    src_ip: side === 'src' ? ip : null,
    src_port: side === 'src' && portStr ? Number(portStr) : null,
    dst_ip: side === 'dst' ? ip : null,
    dst_port: side === 'dst' && portStr ? Number(portStr) : null,
    enabled: true,
  };
  try {
    await api('/rules', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('idsError').textContent = '';
    loadRules(); // so it shows up immediately if the Dashboard tab is opened next
  } catch (e) {
    document.getElementById('idsError').textContent = 'Could not create block rule - ' + e.message;
  }
}

async function loadAlerts() {
  try {
    allAlerts = await api('/alerts');
    renderAlerts(allAlerts);
    document.getElementById('idsError').textContent = '';
  } catch (e) {
    document.getElementById('idsError').textContent = 'Could not load alerts.';
  }
}

['idsFilterSeverity', 'idsFilterType'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => renderAlerts(allAlerts));
});
document.getElementById('idsFilterPort').addEventListener('input', () => renderAlerts(allAlerts));
document.getElementById('idsFilterSearch').addEventListener('input', () => renderAlerts(allAlerts));

document.getElementById('refreshAlertsBtn').addEventListener('click', loadAlerts);

document.getElementById('clearAlertsBtn').addEventListener('click', async () => {
  try {
    await api('/alerts', { method: 'DELETE' });
    loadAlerts();
  } catch (e) {
    document.getElementById('idsError').textContent = 'Could not clear alerts - ' + e.message;
  }
});
