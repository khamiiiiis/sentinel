// Sentinel - Device Status page (CPU/memory/disk).

function setStatusCard(prefix, percent, subText) {
  document.getElementById(`${prefix}Percent`).textContent = `${percent.toFixed(0)}%`;
  const fill = document.getElementById(`${prefix}BarFill`);
  fill.style.width = `${Math.min(100, percent)}%`;
  fill.style.background = barColorFor(percent);
  document.getElementById(`${prefix}Sub`).textContent = subText;
}

async function loadSystemStatus() {
  try {
    const s = await api('/system-status');
    setStatusCard('cpu', s.cpu_percent, `${s.cpu_count} logical cores`);
    setStatusCard('mem', s.memory.percent, `${formatBytes(s.memory.used)} / ${formatBytes(s.memory.total)}`);
    setStatusCard('disk', s.disk.percent, `${formatBytes(s.disk.used)} / ${formatBytes(s.disk.total)}`);
    document.getElementById('statusError').textContent = '';
  } catch (e) {
    document.getElementById('statusError').textContent = 'Could not load device status - ' + e.message;
  }
}

setInterval(() => {
  if (statusPanel.style.display !== 'none') loadSystemStatus();
}, 3000);
