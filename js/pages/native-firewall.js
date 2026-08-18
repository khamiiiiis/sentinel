// Sentinel - Native (Windows Firewall) rules page: process picker,
// port/app rule forms, and the rules table.


async function loadProcesses() {
  const picker = document.getElementById('processPicker');
  try {
    const processes = await api('/processes');
    picker.innerHTML = '<option value="">Pick a running process…</option>' +
      processes.map(p => `<option value="${escapeHtml(p.path)}" data-name="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${escapeHtml(p.path)})</option>`).join('');
  } catch (e) {
    document.getElementById('nativeFwError').textContent = 'Could not load process list - ' + e.message;
  }
}

document.getElementById('refreshProcessesBtn').addEventListener('click', loadProcesses);

document.getElementById('processPicker').addEventListener('change', (e) => {
  document.getElementById('programPathInput').value = e.target.value;
});

function renderNativeRules(rules) {
  if (!rules.length) {
    nativeRulesBody.innerHTML = '<tr><td colspan="9" style="color:var(--text-dim)">No native firewall rules yet.</td></tr>';
    return;
  }
  nativeRulesBody.innerHTML = rules.map(r => `
    <tr>
      <td>${escapeHtml(r.rule_type)}</td>
      <td>${escapeHtml(r.direction)}</td>
      <td><span class="badge ${r.action === 'block' ? 'block' : 'allow'}">${escapeHtml(r.action)}</span></td>
      <td>${escapeHtml(r.protocol || 'any')}</td>
      <td>${r.local_port ?? '*'}</td>
      <td>${escapeHtml(r.remote_ip || '*')}</td>
      <td>${escapeHtml(r.program_name || r.program_path || '')}</td>
      <td><input type="checkbox" class="native-enabled-toggle" data-id="${r.id}" ${r.enabled ? 'checked' : ''} /></td>
      <td><button class="icon-btn delete-native-btn" title="Delete rule" data-id="${r.id}">✕</button></td>
    </tr>
  `).join('');

  nativeRulesBody.querySelectorAll('.native-enabled-toggle').forEach(chk => {
    chk.addEventListener('change', async () => {
      try {
        await api(`/native-rules/${chk.dataset.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ enabled: chk.checked }),
        });
      } catch (e) {
        document.getElementById('nativeFwError').textContent = 'Could not update rule - ' + e.message;
        chk.checked = !chk.checked;
      }
    });
  });

  nativeRulesBody.querySelectorAll('.delete-native-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/native-rules/${btn.dataset.id}`, { method: 'DELETE' });
        loadNativeRules();
      } catch (e) {
        document.getElementById('nativeFwError').textContent = 'Could not delete rule - ' + e.message;
      }
    });
  });
}

async function loadNativeRules() {
  try {
    renderNativeRules(await api('/native-rules'));
    document.getElementById('nativeFwError').textContent = '';
  } catch (e) {
    document.getElementById('nativeFwError').textContent = 'Could not load native firewall rules - ' + e.message;
  }
}

document.getElementById('nativePortForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm(e.target)) return;
  const fd = new FormData(e.target);
  const body = {
    rule_type: 'port',
    direction: fd.get('direction'),
    action: fd.get('action'),
    protocol: fd.get('protocol') || null,
    local_port: fd.get('local_port') ? Number(fd.get('local_port')) : null,
    remote_ip: fd.get('remote_ip') || null,
    enabled: true,
  };
  try {
    await api('/native-rules', { method: 'POST', body: JSON.stringify(body) });
    e.target.reset();
    loadNativeRules();
  } catch (err) {
    document.getElementById('nativeFwError').textContent = 'Could not create rule - ' + err.message;
  }
});

document.getElementById('nativeAppForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm(e.target)) return;
  const fd = new FormData(e.target);
  const programPath = document.getElementById('programPathInput').value.trim();
  if (!programPath) {
    document.getElementById('nativeFwError').textContent = 'Pick a process or enter a program path.';
    return;
  }
  const picker = document.getElementById('processPicker');
  const selectedOption = picker.options[picker.selectedIndex];
  const programName = (selectedOption && selectedOption.dataset.name) || programPath.split('\\').pop();

  const body = {
    rule_type: 'app',
    direction: fd.get('direction'),
    action: fd.get('action'),
    program_path: programPath,
    program_name: programName,
    enabled: true,
  };
  try {
    await api('/native-rules', { method: 'POST', body: JSON.stringify(body) });
    e.target.reset();
    document.getElementById('programPathInput').value = '';
    loadNativeRules();
  } catch (err) {
    document.getElementById('nativeFwError').textContent = 'Could not create app rule - ' + err.message;
  }
});
