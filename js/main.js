/* =========================================================
   main.js — Cybersecurity Thesis
   Handles: data loading, rendering, filtering, search,
            statistics, trend chart, dark-mode toggle
   ========================================================= */

(function () {
  'use strict';

  /* -------------------------------------------------------
     State
  ------------------------------------------------------- */
  let allIncidents = [];
  let filtered     = [];

  /* -------------------------------------------------------
     Helpers
  ------------------------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /** Format date string "2026-03-15" → "15 Mar 2026" */
  function fmtDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    return `${d} ${months[m - 1]} ${y}`;
  }

  /** Format large numbers: 1234567 → "1,2M", etc. */
  function fmtNum(n) {
    if (!n) return '—';
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace('.0','') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0','') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return n.toLocaleString('it-IT');
  }

  /** Highlight search term inside text */
  function highlight(text, term) {
    if (!term) return escHtml(text);
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escHtml(text).replace(re, '<mark>$1</mark>');
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* -------------------------------------------------------
     Data Loading
  ------------------------------------------------------- */
  async function loadData() {
    const base = document.querySelector('base')?.href || location.href.replace(/[^/]*$/, '');
    const url  = new URL('data/incidents.json', base).href;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      allIncidents = await res.json();
      // Sort newest first
      allIncidents.sort((a, b) => b.date.localeCompare(a.date));
      filtered = [...allIncidents];
      init();
    } catch (e) {
      console.error('Failed to load incidents.json:', e);
      const grid = $('#incidents-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="no-results">
            <div class="no-results__icon">⚠️</div>
            <div class="no-results__text">Errore nel caricamento dei dati</div>
            <div class="no-results__sub">${escHtml(e.message)}</div>
          </div>`;
      }
    }
  }

  /* -------------------------------------------------------
     Initialise page
  ------------------------------------------------------- */
  function init() {
    renderStats();
    renderTrend();
    renderFeed(filtered);
    initFilters();
    initSearch();
  }

  /* -------------------------------------------------------
     Statistics
  ------------------------------------------------------- */
  function renderStats() {
    const total     = allIncidents.length;
    const now       = new Date();
    const monthAgo  = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const thisMonth = allIncidents.filter(i => new Date(i.date) >= monthAgo).length;
    const industries= new Set(allIncidents.map(i => i.industry)).size;
    const sevMap    = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const avgSev    = allIncidents.reduce((s, i) => s + (sevMap[i.severity] || 0), 0) / total;
    const sevLabels = ['', 'Low', 'Medium', 'High', 'Critical'];
    const sevLabel  = sevLabels[Math.round(avgSev)] || 'High';

    setEl('stat-total',    total);
    setEl('stat-month',    thisMonth);
    setEl('stat-industries', industries);
    setEl('stat-severity', sevLabel);
  }

  function setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* -------------------------------------------------------
     Trend Chart (last 7 days)
  ------------------------------------------------------- */
  function renderTrend() {
    const chart = $('#trend-chart');
    if (!chart) return;

    const days = 7;
    const counts = [];
    const labels = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const count = allIncidents.filter(inc => inc.date === iso).length;
      counts.push(count);
      labels.push(['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][d.getDay()]);
    }

    const max = Math.max(...counts, 1);
    chart.innerHTML = counts.map((c, idx) => `
      <div class="trend-bar-wrap" title="${labels[idx]}: ${c} incidenti">
        <div class="trend-bar" style="height:${Math.round((c / max) * 88)}px"></div>
        <div class="trend-bar-label">${labels[idx]}</div>
      </div>`).join('');
  }

  /* -------------------------------------------------------
     Feed Rendering
  ------------------------------------------------------- */
  function renderFeed(list) {
    const grid  = $('#incidents-grid');
    const count = $('#feed-count');
    if (!grid) return;

    if (count) count.textContent = `${list.length} incidenti`;

    if (!list.length) {
      grid.innerHTML = `
        <div class="no-results">
          <div class="no-results__icon">🔍</div>
          <div class="no-results__text">Nessun incidente trovato</div>
          <div class="no-results__sub">Prova a modificare i filtri o la ricerca</div>
        </div>`;
      return;
    }

    const term = ($('#search-input')?.value || '').trim();
    grid.innerHTML = list.map(inc => renderCard(inc, term)).join('');
  }

  function renderCard(inc, term = '') {
    const sevClass = inc.severity.toLowerCase();
    const company  = term
      ? highlight(inc.company, term)
      : escHtml(inc.company);

    return `
      <article class="incident-card" data-id="${escHtml(inc.id)}">
        <div class="incident-card__header">
          <div class="incident-card__company">${company}</div>
          <span class="badge badge--${sevClass}">${escHtml(inc.severity)}</span>
        </div>
        <div class="incident-card__meta">
          <span class="tag">📅 ${fmtDate(inc.date)}</span>
          <span class="tag">🏭 ${escHtml(inc.industry)}</span>
          <span class="tag">⚡ ${escHtml(inc.attack_type)}</span>
        </div>
        <p class="incident-card__desc">${escHtml(inc.description)}</p>
        <div class="incident-card__footer">
          <span class="affected-count">
            ${inc.affected_users ? '👥 ' + fmtNum(inc.affected_users) + ' utenti' : '👥 N/D'}
          </span>
          <span>📰 ${escHtml(inc.source)}</span>
        </div>
      </article>`;
  }

  /* -------------------------------------------------------
     Filters
  ------------------------------------------------------- */
  function initFilters() {
    // Populate dynamic filter options
    populateCheckboxes('filter-attack',   [...new Set(allIncidents.map(i => i.attack_type))].sort());
    populateCheckboxes('filter-severity', ['Critical','High','Medium','Low']);
    populateCheckboxes('filter-industry', [...new Set(allIncidents.map(i => i.industry))].sort());

    // Attach listeners
    $$('.filter-check input').forEach(cb => cb.addEventListener('change', applyFilters));
    const dateSelect = $('#filter-date');
    if (dateSelect) dateSelect.addEventListener('change', applyFilters);

    const resetBtn = $('#reset-filters');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
  }

  function populateCheckboxes(containerId, values) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = values.map(v => `
      <label class="filter-check">
        <input type="checkbox" name="${containerId}" value="${escHtml(v)}">
        ${escHtml(v)}
      </label>`).join('');
    // Re-attach listeners for newly created checkboxes
    $$('input', container).forEach(cb => cb.addEventListener('change', applyFilters));
  }

  function getChecked(name) {
    return $$(`input[name="${name}"]:checked`).map(el => el.value);
  }

  function applyFilters() {
    const attacks    = getChecked('filter-attack');
    const severities = getChecked('filter-severity');
    const industries = getChecked('filter-industry');
    const dateRange  = $('#filter-date')?.value || '';
    const search     = ($('#search-input')?.value || '').trim().toLowerCase();

    const now = new Date();
    const cutoff = (() => {
      if (!dateRange) return null;
      const d = new Date(now);
      if (dateRange === '7d')  { d.setDate(d.getDate() - 7);   return d; }
      if (dateRange === '30d') { d.setDate(d.getDate() - 30);  return d; }
      if (dateRange === '90d') { d.setDate(d.getDate() - 90);  return d; }
      if (dateRange === '1y')  { d.setFullYear(d.getFullYear() - 1); return d; }
      return null;
    })();

    filtered = allIncidents.filter(inc => {
      if (attacks.length    && !attacks.includes(inc.attack_type)) return false;
      if (severities.length && !severities.includes(inc.severity)) return false;
      if (industries.length && !industries.includes(inc.industry)) return false;
      if (cutoff && new Date(inc.date) < cutoff) return false;
      if (search && !inc.company.toLowerCase().includes(search) &&
          !inc.description.toLowerCase().includes(search)) return false;
      return true;
    });

    renderFeed(filtered);
  }

  function resetFilters() {
    $$('.filter-check input').forEach(cb => { cb.checked = false; });
    const dateSelect = $('#filter-date');
    if (dateSelect) dateSelect.value = '';
    const searchInput = $('#search-input');
    if (searchInput) { searchInput.value = ''; }
    const clearBtn = $('#search-clear');
    if (clearBtn) clearBtn.classList.remove('visible');
    filtered = [...allIncidents];
    renderFeed(filtered);
  }

  /* -------------------------------------------------------
     Search
  ------------------------------------------------------- */
  function initSearch() {
    const input = $('#search-input');
    const clear = $('#search-clear');
    if (!input) return;

    input.addEventListener('input', () => {
      if (clear) clear.classList.toggle('visible', input.value.length > 0);
      applyFilters();
    });

    if (clear) {
      clear.addEventListener('click', () => {
        input.value = '';
        clear.classList.remove('visible');
        applyFilters();
        input.focus();
      });
    }
  }

  /* -------------------------------------------------------
     Dark / Light Mode
  ------------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);

    $$('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next    = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateThemeIcon(next);
      });
    });
  }

  function updateThemeIcon(theme) {
    $$('.theme-toggle').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Modalità chiara' : 'Modalità scura');
    });
  }

  /* -------------------------------------------------------
     Mobile Nav
  ------------------------------------------------------- */
  function initMobileNav() {
    const hamburger = $('.nav__hamburger');
    const links     = $('.nav__links');
    if (!hamburger || !links) return;

    hamburger.addEventListener('click', () => {
      links.classList.toggle('open');
    });

    // Close on link click
    $$('.nav__links a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  /* -------------------------------------------------------
     Active nav link
  ------------------------------------------------------- */
  function setActiveNav() {
    const path = location.pathname;
    $$('.nav__links a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const active = href !== '#' && (
        path.endsWith(href) ||
        (href === 'index.html' && (path.endsWith('/') || path.endsWith('index.html')))
      );
      a.classList.toggle('active', active);
    });
  }

  /* -------------------------------------------------------
     Boot
  ------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileNav();
    setActiveNav();

    // Only load feed data on index page
    if (document.getElementById('incidents-grid') !== null) {
      loadData();
    }
  });

  /* -------------------------------------------------------
     Export for analytics / timeline pages
  ------------------------------------------------------- */
  window.CyberThesis = {
    loadData() {
      return fetch(new URL('data/incidents.json',
        document.querySelector('base')?.href || location.href.replace(/[^/]*$/,'')).href)
        .then(r => r.json())
        .then(data => {
          data.sort((a, b) => b.date.localeCompare(a.date));
          return data;
        });
    },
    fmtDate,
    fmtNum,
    escHtml,
    highlight,
  };

}());
