// Sentinel - Display Exclusions page/panel logic (shared between the
// Dashboard tab and the Logs page).

function renderExclusions(exclusions) {
  const rowsHtml = exclusions.length
    ? exclusions.map(x => `
        <tr>
          <td>${escapeHtml(x.protocol || 'any')}</td>
          <td>${escapeHtml(x.direction || 'any')}</td>
          <td>${escapeHtml(x.dst_ip || '*')}</td>
          <td>${x.dst_port ?? '*'}</td>
          <td>${x.src_port ?? '*'}</td>
          <td>${x.enabled ? 'yes' : 'no'}</td>
          <td><button class="icon-btn" title="Delete exclusion" data-id="${x.id}">✕</button></td>
        </tr>
      `).join('')
    : '<tr><td colspan="7" style="color:var(--text-dim)">No exclusions yet.</td></tr>';

  // Same data is shown/editable from both the Dashboard tab and the Logs
  // page - render into whichever of these tbodies exist in the DOM.
  ['exclusionsBody', 'exclusionsBodyLogs'].forEach(id => {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    tbody.innerHTML = rowsHtml;
    tbody.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await api(`/exclusions/${btn.dataset.id}`, { method: 'DELETE' });
        loadExclusions();
      });
    });
  });
}

async function loadExclusions() {
  try {
    renderExclusions(await api('/exclusions'));
  } catch (e) {
    console.error('Failed to load exclusions', e);
  }
}
async function handleExclusionFormSubmit(e) {
  e.preventDefault();
  if (!validateForm(e.target)) return;
  const fd = new FormData(e.target);
  const body = {
    protocol: fd.get('protocol') || null,
    direction: fd.get('direction') || null,
    dst_ip: fd.get('dst_ip') || null,
    dst_port: fd.get('dst_port') ? Number(fd.get('dst_port')) : null,
    src_port: fd.get('src_port') ? Number(fd.get('src_port')) : null,
    enabled: true,
  };
  await api('/exclusions', { method: 'POST', body: JSON.stringify(body) });
  e.target.reset();
  loadExclusions();
}
document.getElementById('exclusionForm').addEventListener('submit', handleExclusionFormSubmit);
document.getElementById('exclusionFormLogs').addEventListener('submit', handleExclusionFormSubmit);
