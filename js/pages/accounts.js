// Sentinel - Accounts management page (admin only).

function renderAccounts(accounts) {
  if (!accounts.length) {
    accountsBody.innerHTML = '<tr><td colspan="5" style="color:var(--text-dim)">No accounts.</td></tr>';
    return;
  }
  accountsBody.innerHTML = accounts.map(a => `
    <tr data-username="${escapeHtml(a.username)}">
      <td><input type="text" class="username-input" value="${escapeHtml(a.username)}" /></td>
      <td>
        <select class="role-select">
          <option value="viewer" ${a.role === 'viewer' ? 'selected' : ''}>viewer</option>
          <option value="operator" ${a.role === 'operator' ? 'selected' : ''}>operator</option>
          <option value="admin" ${a.role === 'admin' ? 'selected' : ''}>admin</option>
        </select>
      </td>
      <td><input type="checkbox" class="enabled-check" ${a.enabled ? 'checked' : ''} /></td>
      <td><input type="password" class="password-input" placeholder="leave blank to keep" /></td>
      <td>
        <button class="icon-btn save-btn" title="Save changes">💾</button>
        <button class="icon-btn delete-btn" title="Delete account">✕</button>
      </td>
    </tr>
  `).join('');

  accountsBody.querySelectorAll('tr').forEach(row => {
    const username = row.dataset.username;

    row.querySelector('.save-btn').addEventListener('click', async () => {
      const newUsername = row.querySelector('.username-input').value.trim();
      const role = row.querySelector('.role-select').value;
      const enabled = row.querySelector('.enabled-check').checked;
      const password = row.querySelector('.password-input').value;
      const body = { role, enabled };
      if (password) body.password = password;
      if (newUsername && newUsername !== username) body.new_username = newUsername;
      try {
        await api(`/accounts/${encodeURIComponent(username)}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        document.getElementById('accountsError').textContent = '';
        loadAccounts();
      } catch (e) {
        document.getElementById('accountsError').textContent = 'Update failed - ' + e.message;
      }
    });

    row.querySelector('.delete-btn').addEventListener('click', async () => {
      try {
        await api(`/accounts/${encodeURIComponent(username)}`, { method: 'DELETE' });
        loadAccounts();
      } catch (e) {
        document.getElementById('accountsError').textContent = 'Delete failed - ' + e.message;
      }
    });
  });
}

async function loadAccounts() {
  try {
    renderAccounts(await api('/accounts'));
  } catch (e) {
    document.getElementById('accountsError').textContent = 'Could not load accounts.';
  }
}

document.getElementById('accountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = {
    username: fd.get('username'),
    password: fd.get('password'),
    role: fd.get('role'),
  };
  try {
    await api('/accounts', { method: 'POST', body: JSON.stringify(body) });
    document.getElementById('accountsError').textContent = '';
    e.target.reset();
    loadAccounts();
  } catch (e2) {
    document.getElementById('accountsError').textContent = 'Could not create account - ' + e2.message;
  }
});
