import rawFindings from './scores.js';
import { scoreFindings } from './scorer.js';

const severityColors = {
  CRITICAL: '#ff5f6d',
  HIGH: '#f59e0b',
  MEDIUM: '#38bdf8',
  LOW: '#34d399',
  DEFAULT: '#94a3b8'
};

const scoredFindings = scoreFindings(rawFindings);

function getCounts(items) {
  return items.reduce((acc, item) => {
    acc.total += 1;
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    acc.risk += item.risk_score;
    acc.confidence += item.confidence;
    return acc;
  }, { total: 0, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, risk: 0, confidence: 0 });
}

function renderSummary(items) {
  const counts = getCounts(items);
  document.getElementById('summary-total').textContent = counts.total;
  document.getElementById('summary-critical').textContent = counts.CRITICAL;
  document.getElementById('summary-high').textContent = counts.HIGH;
  const averageRisk = counts.total ? Math.round(counts.risk / counts.total) : 0;
  document.getElementById('summary-average-risk').textContent = `${averageRisk}%`;
}

function renderSeverityChart(items) {
  const counts = getCounts(items);
  const chart = document.getElementById('severity-chart');
  chart.innerHTML = '';
  ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(level => {
    const count = counts[level];
    const percent = counts.total ? Math.round((count / counts.total) * 100) : 0;
    const card = document.createElement('article');
    card.className = 'severity-card';
    card.innerHTML = `
      <div class="severity-card-title">
        <span>${level}</span>
        <strong>${count}</strong>
      </div>
      <div class="severity-bar">
        <div class="severity-fill" style="width:${percent}%; background:${severityColors[level]};"></div>
      </div>
      <p class="severity-caption">${percent}% of findings</p>
    `;
    chart.appendChild(card);
  });
}

function renderTopFiles(items) {
  const counts = items.reduce((acc, item) => {
    acc[item.File] = (acc[item.File] || 0) + 1;
    return acc;
  }, {});
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const list = document.getElementById('top-files');
  list.innerHTML = '';
  top.forEach(([file, total]) => {
    const li = document.createElement('li');
    li.textContent = `${file} — ${total} finding${total > 1 ? 's' : ''}`;
    list.appendChild(li);
  });
}

function renderSecretTypes(items) {
  const counts = items.reduce((acc, item) => {
    acc[item.secret_type] = (acc[item.secret_type] || 0) + 1;
    return acc;
  }, {});
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const list = document.getElementById('secret-types');
  list.innerHTML = '';
  sorted.forEach(([type, total]) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${type}</strong> <span>${total}</span>`;
    list.appendChild(li);
  });
}

function buildRiskBadge(level) {
  const color = severityColors[level] || severityColors.DEFAULT;
  return `<span class="badge badge-severity" style="background:${color};">${level}</span>`;
}

function renderFindings(items) {
  const grid = document.getElementById('findings-grid');
  grid.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('article');
    card.className = 'finding-card';
    card.innerHTML = `
      <div class="finding-top">
        <div>
          <h3>${item.File}</h3>
          <p>${item.Description}</p>
        </div>
        <div class="finding-pill">${buildRiskBadge(item.risk_level)}</div>
      </div>
      <div class="finding-details">
        <div><strong>Rule</strong><span>${item.RuleID}</span></div>
        <div><strong>Secret type</strong><span>${item.secret_type}</span></div>
        <div><strong>Line</strong><span>${item.StartLine}</span></div>
        <div><strong>Rule score</strong><span>${item.rule_score}</span></div>
        <div><strong>AI score</strong><span>${item.ai_score}</span></div>
        <div><strong>Risk score</strong><span>${item.risk_score}</span></div>
      </div>
      <div class="finding-meta">
        <span>${item.Author}</span>
        <span>${new Date(item.Date).toLocaleDateString()}</span>
      </div>
      <div class="finding-footer">
        <a href="${item.Link}" target="_blank" rel="noreferrer">View source</a>
        <span class="line-pill">${item.exposure_days}d exposure</span>
      </div>
      <p class="justification">${item.ai_justification}</p>
    `;
    grid.appendChild(card);
  });
}

function filterItems(items, severity, query) {
  let filtered = items;
  if (severity !== 'ALL') {
    filtered = filtered.filter(item => item.severity === severity);
  }
  if (query) {
    const lower = query.toLowerCase();
    filtered = filtered.filter(item =>
      item.File.toLowerCase().includes(lower) ||
      item.secret_type.toLowerCase().includes(lower) ||
      item.Author.toLowerCase().includes(lower) ||
      item.Description.toLowerCase().includes(lower) ||
      item.RuleID.toLowerCase().includes(lower)
    );
  }
  return filtered;
}

function initializeDashboard() {
  const buttons = Array.from(document.querySelectorAll('.filter-button'));
  const searchInput = document.getElementById('search-input');
  let activeSeverity = 'ALL';
  let searchQuery = '';

  function refresh() {
    const visibleItems = filterItems(scoredFindings, activeSeverity, searchQuery);
    renderSummary(visibleItems);
    renderSeverityChart(visibleItems);
    renderTopFiles(visibleItems);
    renderSecretTypes(visibleItems);
    renderFindings(visibleItems);
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      activeSeverity = button.dataset.filter;
      refresh();
    });
  });

  searchInput.addEventListener('input', event => {
    searchQuery = event.target.value.trim();
    refresh();
  });

  refresh();
}

document.addEventListener('DOMContentLoaded', initializeDashboard);