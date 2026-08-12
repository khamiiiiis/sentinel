// Sentinel - all canvas-drawn charts on the Charts page. No external
// charting library - drawn directly so the app has zero network
// dependency for rendering (beyond the app's own API).
//
// Every chart is fed from GET /chart-data, which aggregates the
// packets/alerts tables in the database. That means charts reflect
// full history - including traffic captured before this tab
// connected, or by a different browser session entirely - instead
// of resetting to empty on every page load and only growing from
// events seen live.

let chartData = null; // last successful /chart-data response

async function fetchChartData() {
  try {
    chartData = await api('/chart-data');
  } catch (e) {
    // Leave chartData as whatever we last had (or null) - draw
    // functions already treat missing/empty data as "nothing yet".
  }
}

setInterval(() => {
  if (chartsPanel.style.display !== 'none') updateCharts();
}, 2000);

function initChartsIfNeeded() {
  // No setup needed ahead of time - updateCharts() fetches fresh data
  // and draws from scratch every time the Charts page is shown.
}

// Sizes a canvas to its container at the browser's actual pixel density,
// so lines/text stay sharp on high-DPI screens, and returns a 2D context
// already scaled to CSS pixel coordinates.
function prepareCanvas(canvas, cssHeight) {
  const parent = canvas.parentElement;
  // clientWidth includes the parent's own padding - sizing the canvas
  // to that directly makes it wider than the actual space inside the
  // padded box, pushing bars/labels/numbers past the right edge.
  // Subtract the padding out so the canvas fits the true content area.
  const parentStyle = getComputedStyle(parent);
  const paddingX = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
  const cssWidth = parent.clientWidth - paddingX;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return { ctx, width: cssWidth, height: cssHeight };
}

function drawRateChart() {
  const { ctx, width, height } = prepareCanvas(document.getElementById('rateChart'), 340);
  const padL = 28, padR = 8, padT = 10, padB = 18;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const rateHistory = (chartData && chartData.rate_history) || [];
  if (!rateHistory.length) {
    ctx.fillStyle = '#8891A3';
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText('No traffic sampled yet', padL, padT + plotH / 2);
    return;
  }

  const maxVal = Math.max(1, ...rateHistory.map(p => Math.max(p.allow, p.block)));
  const stepX = rateHistory.length > 1 ? plotW / (rateHistory.length - 1) : 0;

  // gridlines + y-axis labels
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.fillStyle = '#8891A3';
  ctx.font = '10px IBM Plex Mono, monospace';
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const y = padT + plotH - (plotH * i) / ySteps;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    const val = Math.round((maxVal * i) / ySteps);
    ctx.fillText(String(val), 2, y + 3);
  }

  const plot = (key, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    rateHistory.forEach((p, i) => {
      const x = padL + i * stepX;
      const y = padT + plotH - (p[key] / maxVal) * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = color;
    rateHistory.forEach((p, i) => {
      const x = padL + i * stepX;
      const y = padT + plotH - (p[key] / maxVal) * plotH;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  plot('allow', '#3FB68C');
  plot('block', '#E5677A');

  // legend
  ctx.font = '11px IBM Plex Mono, monospace';
  ctx.fillStyle = '#3FB68C';
  ctx.fillText('● Allowed', padL, 10);
  ctx.fillStyle = '#E5677A';
  ctx.fillText('● Blocked', padL + 70, 10);
}

function drawProtocolChart() {
  const { ctx, width, height } = prepareCanvas(document.getElementById('protocolChart'), 340);
  const cx = width / 2, cy = height / 2 - 6, r = Math.min(width, height) / 2 - 30;
  const protocolCounts = (chartData && chartData.protocol) || { tcp: 0, udp: 0 };
  const total = protocolCounts.tcp + protocolCounts.udp;

  if (total === 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#8891A3';
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No traffic yet', cx, cy + r + 24);
    ctx.textAlign = 'left';
    return;
  }

  const segments = [
    { value: protocolCounts.tcp, color: '#3FB68C', label: 'TCP' },
    { value: protocolCounts.udp, color: '#E8A33D', label: 'UDP' },
  ];
  let start = -Math.PI / 2;
  ctx.lineWidth = 18;
  segments.forEach(seg => {
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.strokeStyle = seg.color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.stroke();
    start += angle;
  });

  ctx.fillStyle = '#E4E7EC';
  ctx.font = '600 15px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(total), cx, cy + 5);
  ctx.font = '15px Inter, sans-serif';
  ctx.textAlign = 'left';

  let legendY = cy + r + 22;
  segments.forEach((seg, i) => {
    const x = cx - r + i * 200;
    ctx.fillStyle = seg.color;
    ctx.fillText('●', x, legendY);
    ctx.fillStyle = '#8891A3';
    ctx.fillText(`${seg.label} (${seg.value})`, x + 14, legendY);
  });
}

function drawSeverityChart() {
  const { ctx, width, height } = prepareCanvas(document.getElementById('severityChart'), 340);
  const padL = 30, padR = 10, padT = 10, padB = 24;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const severityCounts = (chartData && chartData.severity) || { high: 0, medium: 0, low: 0 };
  const bars = [
    { label: 'High', value: severityCounts.high, color: '#E5677A' },
    { label: 'Medium', value: severityCounts.medium, color: '#E8A33D' },
    { label: 'Low', value: severityCounts.low, color: '#8891A3' },
  ];
  const maxVal = Math.max(1, ...bars.map(b => b.value));
  const barWidth = plotW / bars.length;

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.fillStyle = '#8891A3';
  ctx.font = '10px IBM Plex Mono, monospace';
  const ySteps = 4;
  for (let i = 0; i <= ySteps; i++) {
    const y = padT + plotH - (plotH * i) / ySteps;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillText(String(Math.round((maxVal * i) / ySteps)), 2, y + 3);
  }

  bars.forEach((b, i) => {
    const barH = (b.value / maxVal) * plotH;
    const x = padL + i * barWidth + barWidth * 0.2;
    const w = barWidth * 0.6;
    const y = padT + plotH - barH;
    ctx.fillStyle = b.color;
    ctx.fillRect(x, y, w, barH);
    ctx.fillStyle = '#8891A3';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, x + w / 2, padT + plotH + 16);
    ctx.fillStyle = '#E4E7EC';
    ctx.fillText(String(b.value), x + w / 2, y - 4);
    ctx.textAlign = 'left';
  });
}

function drawFirewallActionsChart() {
  const { ctx, width, height } = prepareCanvas(document.getElementById('actionsChart'), 340);
  const cx = width / 2, cy = height / 2 - 6, r = Math.min(width, height) / 2 - 30;
  const actions = (chartData && chartData.actions) || { allow: 0, block: 0 };
  const total = actions.allow + actions.block;

  if (total === 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#8891A3';
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('No traffic yet', cx, cy + r + 30);
    ctx.textAlign = 'left';
    return;
  }

  const segments = [
    { value: actions.allow, color: '#3FB68C', label: 'Allowed' },
    { value: actions.block, color: '#E5677A', label: 'Blocked' },
  ];
  let start = -Math.PI / 2;
  ctx.lineWidth = 18;
  segments.forEach(seg => {
    const angle = (seg.value / total) * Math.PI * 2;
    ctx.strokeStyle = seg.color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.stroke();
    start += angle;
  });

  ctx.fillStyle = '#E4E7EC';
  ctx.font = '600 15px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(total), cx, cy + 15);
  ctx.font = '15px Inter, sans-serif';

  let legendY = cy + r + 22;
  segments.forEach((seg, i) => {
    const x = cx - r + i * 200;
    ctx.fillStyle = seg.color;
    ctx.fillText('●', x, legendY);
    ctx.fillStyle = '#8891A3';
    ctx.fillText(`${seg.label} (${seg.value})`, x + 55, legendY);
  });
  ctx.textAlign = 'left';
}

// Shared horizontal bar chart for top-N style breakdowns (top IPs, rule
// hits, alert types) - labels can be long/variable, so horizontal bars
// with left-aligned labels read better here than vertical ones.
function drawHorizontalBarChart(canvasId, items, colorForIndex, emptyMessage) {
  const { ctx, width, height } = prepareCanvas(document.getElementById(canvasId), 340);
  const padL = 100, padR = 40, padT = 6, padB = 6;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  if (!items.length) {
    ctx.fillStyle = '#8891A3';
    ctx.font = '12px IBM Plex Mono, monospace';
    ctx.fillText(emptyMessage || 'No data yet', padL, padT + plotH / 2);
    return;
  }

  const maxVal = Math.max(1, ...items.map(i => i.value));
  const barHeight = plotH / items.length;

  items.forEach((item, i) => {
    const y = padT + i * barHeight + barHeight * 0.22;
    const h = barHeight * 0.56;
    const w = Math.max(2, (item.value / maxVal) * plotW);

    ctx.fillStyle = colorForIndex(item, i);
    ctx.fillRect(padL, y, w, h);

    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillStyle = '#8891A3';
    ctx.textAlign = 'right';
    const label = item.label.length > 15 ? item.label.slice(0, 14) + '…' : item.label;
    ctx.fillText(label, padL - 8, y + h / 2 + 4);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#E4E7EC';
    ctx.fillText(String(item.value), padL + w + 6, y + h / 2 + 4);
  });
}

function drawTopSrcChart() {
  const items = (chartData && chartData.top_src) || [];
  drawHorizontalBarChart('topSrcChart', items, () => '#3FB68C', 'No traffic yet');
}

function drawTopDstChart() {
  const items = (chartData && chartData.top_dst) || [];
  drawHorizontalBarChart('topDstChart', items, () => '#E8A33D', 'No traffic yet');
}

function ruleLabel(ruleKey) {
  if (ruleKey === 'none') return 'No rule (default allow)';
  const rule = (typeof lastLoadedRules !== 'undefined' ? lastLoadedRules : []).find(r => String(r.id) === ruleKey);
  if (!rule) return `Rule #${ruleKey}`;
  return `#${ruleKey} ${rule.action} ${rule.protocol || 'any'} ${rule.dst_ip || '*'}:${rule.dst_port ?? '*'}`;
}

function ruleActionFor(ruleKey) {
  if (ruleKey === 'none') return 'allow'; // default policy when no rule matches
  const rule = (typeof lastLoadedRules !== 'undefined' ? lastLoadedRules : []).find(r => String(r.id) === ruleKey);
  return rule ? rule.action : null;
}

function drawRuleHitsChart() {
  const raw = (chartData && chartData.rule_hits) || [];
  const items = raw.map(item => ({
    label: ruleLabel(item.label),
    value: item.value,
    action: ruleActionFor(item.label),
  }));
  drawHorizontalBarChart('ruleHitsChart', items,
    (item) => item.action === 'block' ? '#E5677A' : '#3FB68C',
    'No rule hits yet');
}

function drawAlertTypesChart() {
  const items = (chartData && chartData.alert_types) || [];
  const palette = ['#E5677A', '#E8A33D', '#3FB68C', '#8891A3', '#5B8DEF'];
  drawHorizontalBarChart('alertTypesChart', items, (item, i) => palette[i % palette.length], 'No alerts yet');
}

function drawTopAppsChart() {
  const items = (chartData && chartData.top_apps) || [];
  drawHorizontalBarChart('topAppsChart', items, () => '#5B8DEF', 'No traffic yet');
}

async function updateCharts() {
  await fetchChartData();
  drawRateChart();
  drawProtocolChart();
  drawSeverityChart();
  drawFirewallActionsChart();
  drawTopSrcChart();
  drawTopDstChart();
  drawRuleHitsChart();
  drawAlertTypesChart();
  drawTopAppsChart();
}
