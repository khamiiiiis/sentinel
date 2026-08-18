// Sentinel - Rules page/panel logic (shared between the Dashboard tab
// and the IDS page, which both embed the same rules table).

function renderRules(rules) {
  lastLoadedRules = rules;
  const rowsHtml = rules.length
    ? rules.map(r => {
        if (r.id === editingRuleId) {
          return `
            <tr data-id="${r.id}">
              <td>
                <select class="edit-action">
                  <option value="block" ${r.action === 'block' ? 'selected' : ''}>block</option>
                  <option value="allow" ${r.action === 'allow' ? 'selected' : ''}>allow</option>
                </select>
              </td>
              <td>
                <select class="edit-protocol">
                  <option value="" ${!r.protocol ? 'selected' : ''}>any</option>
                  <option value="tcp" ${r.protocol === 'tcp' ? 'selected' : ''}>tcp</option>
                  <option value="udp" ${r.protocol === 'udp' ? 'selected' : ''}>udp</option>
                </select>
              </td>
              <td>
                <select class="edit-direction">
                  <option value="" ${!r.direction ? 'selected' : ''}>any</option>
                  <option value="outbound" ${r.direction === 'outbound' ? 'selected' : ''}>outbound</option>
                  <option value="inbound" ${r.direction === 'inbound' ? 'selected' : ''}>inbound</option>
                </select>
              </td>
              <td><input class="edit-src-ip" value="${escapeHtml(r.src_ip || '')}" placeholder="src ip" data-validate="ip" /></td>
              <td><input class="edit-src-port" type="number" min="1" max="65535" value="${r.src_port ?? ''}" placeholder="src port" data-validate="port" /></td>
              <td><input class="edit-dst-ip" value="${escapeHtml(r.dst_ip || '')}" placeholder="dst ip" data-validate="ip" /></td>
              <td><input class="edit-dst-port" type="number" min="1" max="65535" value="${r.dst_port ?? ''}" placeholder="dst port" data-validate="port" /></td>
              <td><input type="checkbox" class="edit-enabled" ${r.enabled ? 'checked' : ''} /></td>
              <td>
                <button class="icon-btn save-rule-btn" title="Save changes">💾</button>
                <button class="icon-btn cancel-rule-btn" title="Cancel edit">✕</button>
              </td>
            </tr>
          `;
        }
        return `
          <tr>
            <td><span class="badge ${escapeHtml(r.action)}">${escapeHtml(r.action)}</span></td>
            <td>${escapeHtml(r.protocol || 'any')}</td>
            <td>${escapeHtml(r.direction || 'any')}</td>
            <td>${escapeHtml(r.src_ip || '*')}</td>
            <td>${r.src_port ?? '*'}</td>
            <td>${escapeHtml(r.dst_ip || '*')}</td>
            <td>${r.dst_port ?? '*'}</td>
            <td>${r.enabled ? 'yes' : 'no'}</td>
            <td>
              <button class="icon-btn edit-rule-btn" title="Edit rule" data-id="${r.id}">✎</button>
              <button class="icon-btn delete-rule-btn" title="Delete rule" data-id="${r.id}">✕</button>
            </td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="9" style="color:var(--text-dim)">No rules yet — add one above.</td></tr>';

  // Same rule list, editable from both the Dashboard tab and the IDS
  // page - render into whichever of these tbodies exist in the DOM.
  ['rulesBody', 'rulesBodyIds'].forEach(id => {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    tbody.innerHTML = rowsHtml;

    tbody.querySelectorAll('.edit-rule-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        editingRuleId = Number(btn.dataset.id);
        renderRules(lastLoadedRules);
      });
    });

    tbody.querySelectorAll('.cancel-rule-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        editingRuleId = null;
        renderRules(lastLoadedRules);
      });
    });

    tbody.querySelectorAll('.save-rule-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        if (!validateForm(row)) return;
        const id2 = row.dataset.id;
        const body = {
          action: row.querySelector('.edit-action').value,
          protocol: row.querySelector('.edit-protocol').value || null,
          direction: row.querySelector('.edit-direction').value || null,
          src_ip: row.querySelector('.edit-src-ip').value || null,
          src_port: row.querySelector('.edit-src-port').value ? Number(row.querySelector('.edit-src-port').value) : null,
          dst_ip: row.querySelector('.edit-dst-ip').value || null,
          dst_port: row.querySelector('.edit-dst-port').value ? Number(row.querySelector('.edit-dst-port').value) : null,
          enabled: row.querySelector('.edit-enabled').checked,
        };
        await api(`/rules/${id2}`, { method: 'PATCH', body: JSON.stringify(body) });
        editingRuleId = null;
        loadRules();
      });
    });

    tbody.querySelectorAll('.delete-rule-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await api(`/rules/${btn.dataset.id}`, { method: 'DELETE' });
        loadRules();
      });
    });
  });
}

async function loadRules() {
  try {
    renderRules(await api('/rules'));
  } catch (e) {
    console.error('Failed to load rules', e);
  }
}
async function handleRuleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm(e.target)) return;
  const fd = new FormData(e.target);
  const body = {
    action: fd.get('action'),
    protocol: fd.get('protocol') || null,
    direction: fd.get('direction') || null,
    src_ip: fd.get('src_ip') || null,
    src_port: fd.get('src_port') ? Number(fd.get('src_port')) : null,
    dst_ip: fd.get('dst_ip') || null,
    dst_port: fd.get('dst_port') ? Number(fd.get('dst_port')) : null,
    enabled: true,
  };
  await api('/rules', { method: 'POST', body: JSON.stringify(body) });
  e.target.reset();
  loadRules();
}
document.getElementById('ruleForm').addEventListener('submit', handleRuleFormSubmit);
document.getElementById('ruleFormIds').addEventListener('submit', handleRuleFormSubmit);
