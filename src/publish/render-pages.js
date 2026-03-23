import { AXE_TO_FPC, FPC_LABELS, FPC_SVGS, FPC_DESCRIPTIONS } from '../data/axe-fpc-mapping.js';
import { getFpcPrevalenceRates, CENSUS_DISABILITY_STATS } from '../data/census-disability-stats.js';
import { getPolicyNarrative, getHeuristicsForAxeRule } from '../data/axe-impact-loader.js';
import { NNG_HEURISTICS } from '../data/nng-heuristics.js';

const GITHUB_URL = 'https://github.com/mgifford/daily-dap';
const DASHBOARD_URL = 'https://mgifford.github.io/daily-dap/docs/reports/index.html';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCompact(n) {
  if (n >= 1_000_000) return `${(Math.floor(n / 100_000) / 10).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K`;
  return String(n);
}

// Round estimated people counts down conservatively to avoid false precision.
// Numbers >= 10M round to nearest 100K; numbers >= 100K round to nearest 10K;
// smaller numbers are returned as-is (already low-precision).
function roundDownConservatively(n) {
  if (n >= 10_000_000) return Math.floor(n / 100_000) * 100_000;
  if (n >= 100_000) return Math.floor(n / 10_000) * 10_000;
  return Math.round(n);
}

let _fpcTooltipSeq = 0;
let _urlCountTooltipSeq = 0;
let _perfTimeTooltipSeq = 0;

function makeDecorativeSvg(svgStr) {
  return svgStr
    .replace(/ role="img"| aria-label="[^"]*"/g, '')
    .replace('<svg ', '<svg aria-hidden="true" ');
}

function renderAnchorLink(id, label) {
  return `<a href="#${escapeHtml(id)}" class="heading-anchor" aria-label="${escapeHtml(`Link to ${label}`)}"><span aria-hidden="true">#</span></a>`;
}

function renderColorSchemeSetup() {
  return `
  <meta name="color-scheme" content="light dark" />
  <script>
    (function () {
      var s = localStorage.getItem('color-scheme');
      if (s === 'dark' || s === 'light') {
        document.documentElement.setAttribute('data-color-scheme', s);
      }
    }());
  </script>`;
}

function renderThemeScript() {
  return `
  <div id="theme-announcement" role="status" aria-live="polite" aria-atomic="true" class="sr-only"></div>
  <script>
    (function () {
      var html = document.documentElement;
      var btn = document.getElementById('theme-toggle');
      if (!btn) { return; }
      function isDark() {
        var scheme = html.getAttribute('data-color-scheme');
        if (scheme === 'dark') { return true; }
        if (scheme === 'light') { return false; }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      function updateButton() {
        var dark = isDark();
        btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
        btn.setAttribute('aria-label', dark ? 'Disable dark mode' : 'Enable dark mode');
      }
      updateButton();
      btn.addEventListener('click', function () {
        var next = isDark() ? 'light' : 'dark';
        html.setAttribute('data-color-scheme', next);
        localStorage.setItem('color-scheme', next);
        updateButton();
        var announcement = document.getElementById('theme-announcement');
        if (announcement) {
          announcement.textContent = next === 'dark' ? 'Dark mode enabled.' : 'Light mode enabled.';
        }
      });
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
          if (!html.hasAttribute('data-color-scheme')) { updateButton(); }
        });
      }
    }());
  </script>
  <script>
    (function () {
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          var el = document.activeElement;
          if (el && (el.classList.contains('disability-badge') || el.classList.contains('url-count-trigger') || el.classList.contains('perf-time-trigger'))) {
            el.dataset.tooltipDismissed = 'true';
          }
        }
      });
      document.addEventListener('focusout', function (e) {
        var el = e.target;
        if (el && (el.classList.contains('disability-badge') || el.classList.contains('url-count-trigger') || el.classList.contains('perf-time-trigger'))) {
          delete el.dataset.tooltipDismissed;
        }
      });
    }());
  </script>`;
}

function renderSharedStyles() {
  return `
  <style>
    /* ---------- Color tokens ---------- */
    :root {
      color-scheme: light dark;
      --color-bg: #f5f7fa;
      --color-surface: #ffffff;
      --color-text: #1b1b1b;
      --color-text-muted: #555555;
      --color-primary: #0050b3;
      --color-primary-hover: #003d8a;
      --color-link: #0050b3;
      --color-link-hover: #003d8a;
      --color-focus-ring: #ffbe2e;
      --color-shadow: rgba(0, 0, 0, 0.06);
      --color-header-bg: #0050b3;
      --color-header-text: #ffffff;
      --color-header-nav: #d4e4ff;
      --color-footer-bg: #1b1b2f;
      --color-footer-text: #cccccc;
      --color-footer-link: #a8c8ff;
      --color-table-header-bg: #f0f3f8;
      --color-table-border: #d0d7de;
      --color-table-row-alt: #fafbfc;
      --color-table-row-hover: #f0f5ff;
      --color-table-row-monthly: #eef3fa;
      --color-table-row-monthly-hover: #dde8f7;
      --color-table-row-sep: #eef0f3;
      --color-score-bg: #f0f5ff;
      --color-score-border: #c6d9ff;
      --color-score-value: #0050b3;
      --color-score-label: #555555;
      --color-code-bg: #eef0f3;
      --color-modal-border: #cccccc;
      --color-axe-item-bg: #fef9f9;
      --color-axe-item-border: #d9534f;
      --color-axe-pre-bg: #f5f5f5;
      --color-finding-border: #e0e0e0;
      --color-wcag-text: #444444;
      --color-badge-bg: #f0f3f8;
      --color-badge-border: #c6d9ff;
      --color-badge-text: #003d8a;
      --color-badge-hover: #dde8f7;
      --color-tooltip-bg: #1b1b2f;
      --color-tooltip-text: #f0f3f8;
      --color-tooltip-border: #555555;
      --color-copy-btn-bg: #f0f3f8;
      --color-copy-btn-border: #c6d9ff;
      --color-copy-btn-text: #0050b3;
      --color-copy-btn-hover: #dde8f7;
      --color-copied-bg: #d4edda;
      --color-copied-border: #28a745;
      --color-copied-text: #155724;
    }

    /* ---------- Dark mode (system preference) ---------- */
    @media (prefers-color-scheme: dark) {
      :root:not([data-color-scheme="light"]) {
        color-scheme: dark;
        --color-bg: #0d1117;
        --color-surface: #161b22;
        --color-text: #e6edf3;
        --color-text-muted: #8b949e;
        --color-primary: #58a6ff;
        --color-primary-hover: #79b8ff;
        --color-link: #58a6ff;
        --color-link-hover: #79b8ff;
        --color-shadow: rgba(0, 0, 0, 0.3);
        --color-header-bg: #161b22;
        --color-header-text: #e6edf3;
        --color-header-nav: #8b949e;
        --color-footer-bg: #0d1117;
        --color-footer-text: #8b949e;
        --color-footer-link: #58a6ff;
        --color-table-header-bg: #21262d;
        --color-table-border: #30363d;
        --color-table-row-alt: #161b22;
        --color-table-row-hover: #1c2128;
        --color-table-row-monthly: #1c2128;
        --color-table-row-monthly-hover: #21262d;
        --color-table-row-sep: #21262d;
        --color-score-bg: #1c2128;
        --color-score-border: #30363d;
        --color-score-value: #58a6ff;
        --color-score-label: #8b949e;
        --color-code-bg: #21262d;
        --color-modal-border: #30363d;
        --color-axe-item-bg: #1a0d0d;
        --color-axe-item-border: #f85149;
        --color-axe-pre-bg: #161b22;
        --color-finding-border: #30363d;
        --color-wcag-text: #8b949e;
        --color-badge-bg: #1c2128;
        --color-badge-border: #30363d;
        --color-badge-text: #58a6ff;
        --color-badge-hover: #21262d;
        --color-tooltip-bg: #f0f3f8;
        --color-tooltip-text: #1b1b1b;
        --color-tooltip-border: #8b949e;
        --color-copy-btn-bg: #1c2128;
        --color-copy-btn-border: #30363d;
        --color-copy-btn-text: #58a6ff;
        --color-copy-btn-hover: #21262d;
        --color-copied-bg: #1a3728;
        --color-copied-border: #2ea043;
        --color-copied-text: #56d364;
      }
    }

    /* ---------- Dark mode (explicit user preference) ---------- */
    html[data-color-scheme="dark"] {
      color-scheme: dark;
      --color-bg: #0d1117;
      --color-surface: #161b22;
      --color-text: #e6edf3;
      --color-text-muted: #8b949e;
      --color-primary: #58a6ff;
      --color-primary-hover: #79b8ff;
      --color-link: #58a6ff;
      --color-link-hover: #79b8ff;
      --color-shadow: rgba(0, 0, 0, 0.3);
      --color-header-bg: #161b22;
      --color-header-text: #e6edf3;
      --color-header-nav: #8b949e;
      --color-footer-bg: #0d1117;
      --color-footer-text: #8b949e;
      --color-footer-link: #58a6ff;
      --color-table-header-bg: #21262d;
      --color-table-border: #30363d;
      --color-table-row-alt: #161b22;
      --color-table-row-hover: #1c2128;
      --color-table-row-monthly: #1c2128;
      --color-table-row-monthly-hover: #21262d;
      --color-table-row-sep: #21262d;
      --color-score-bg: #1c2128;
      --color-score-border: #30363d;
      --color-score-value: #58a6ff;
      --color-score-label: #8b949e;
      --color-code-bg: #21262d;
      --color-modal-border: #30363d;
      --color-axe-item-bg: #1a0d0d;
      --color-axe-item-border: #f85149;
      --color-axe-pre-bg: #161b22;
      --color-finding-border: #30363d;
      --color-wcag-text: #8b949e;
      --color-badge-bg: #1c2128;
      --color-badge-border: #30363d;
      --color-badge-text: #58a6ff;
      --color-badge-hover: #21262d;
      --color-tooltip-bg: #f0f3f8;
      --color-tooltip-text: #1b1b1b;
      --color-tooltip-border: #8b949e;
      --color-copy-btn-bg: #1c2128;
      --color-copy-btn-border: #30363d;
      --color-copy-btn-text: #58a6ff;
      --color-copy-btn-hover: #21262d;
      --color-copied-bg: #1a3728;
      --color-copied-border: #2ea043;
      --color-copied-text: #56d364;
    }

    /* ---------- Dark mode score color gradient overrides (system preference) ---------- */
    @media (prefers-color-scheme: dark) {
      :root:not([data-color-scheme="light"]) .score-performance {
        background-color: hsl(270 50% calc((8 + var(--score, 0) * 0.22) * 1%));
      }
      :root:not([data-color-scheme="light"]) .score-accessibility {
        background-color: hsl(140 45% calc((8 + var(--score, 0) * 0.22) * 1%));
      }
      :root:not([data-color-scheme="light"]) .score-best-practices {
        background-color: hsl(210 55% calc((8 + var(--score, 0) * 0.22) * 1%));
      }
      :root:not([data-color-scheme="light"]) .score-seo {
        background-color: hsl(28 70% calc((8 + var(--score, 0) * 0.22) * 1%));
      }
      :root:not([data-color-scheme="light"]) .score-cwv-good         { background-color: hsl(50 60% 22%); }
      :root:not([data-color-scheme="light"]) .score-cwv-needs-improvement { background-color: hsl(50 50% 15%); }
      :root:not([data-color-scheme="light"]) .score-cwv-poor         { background-color: hsl(50 35% 10%); }
    }

    /* ---------- Dark mode score color gradient overrides (explicit user preference) ---------- */
    html[data-color-scheme="dark"] .score-performance {
      background-color: hsl(270 50% calc((8 + var(--score, 0) * 0.22) * 1%));
    }
    html[data-color-scheme="dark"] .score-accessibility {
      background-color: hsl(140 45% calc((8 + var(--score, 0) * 0.22) * 1%));
    }
    html[data-color-scheme="dark"] .score-best-practices {
      background-color: hsl(210 55% calc((8 + var(--score, 0) * 0.22) * 1%));
    }
    html[data-color-scheme="dark"] .score-seo {
      background-color: hsl(28 70% calc((8 + var(--score, 0) * 0.22) * 1%));
    }
    html[data-color-scheme="dark"] .score-cwv-good         { background-color: hsl(50 60% 22%); }
    html[data-color-scheme="dark"] .score-cwv-needs-improvement { background-color: hsl(50 50% 15%); }
    html[data-color-scheme="dark"] .score-cwv-poor         { background-color: hsl(50 35% 10%); }

    /* ---------- Light mode (explicit user preference, overrides dark OS) ---------- */
    html[data-color-scheme="light"] { color-scheme: light; }

    /* ---------- Reset / base ---------- */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, sans-serif;
      font-size: 1rem;
      line-height: 1.6;
      color: var(--color-text);
      background: var(--color-bg);
    }
    a { color: var(--color-link); text-decoration: underline; }
    a:hover { color: var(--color-link-hover); }
    /* Explicit inherit prevents any injected theme CSS (e.g. legacy GitHub Pages Jekyll Minima
       color: #797979) from producing insufficient contrast on bold/strong text. */
    strong, b { color: inherit; }
    h1, h2, h3 { line-height: 1.25; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    h1 { font-size: 1.6rem; }
    h2 { font-size: 1.25rem; }

    /* ---------- Heading anchor links ---------- */
    .heading-anchor {
      opacity: 0;
      font-size: 0.75em;
      text-decoration: none;
      margin-left: 0.4em;
      vertical-align: middle;
      color: inherit;
    }
    h1:hover .heading-anchor,
    h2:hover .heading-anchor,
    h3:hover .heading-anchor,
    h1:focus-within .heading-anchor,
    h2:focus-within .heading-anchor,
    h3:focus-within .heading-anchor,
    .heading-anchor:focus { opacity: 1; }

    ul { padding-left: 1.5rem; }
    code { font-size: 0.875em; background: var(--color-code-bg); padding: 0.1em 0.35em; border-radius: 3px; }
    pre code { background: none; padding: 0; }

    /* ---------- Screen-reader only utility ---------- */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* ---------- Skip link ---------- */
    .skip-link {
      position: absolute;
      top: -100%;
      left: 0;
      background: var(--color-primary);
      color: var(--color-header-text);
      padding: 0.5rem 1rem;
      z-index: 9999;
      font-weight: bold;
    }
    .skip-link:focus { top: 0; }

    /* ---------- Site header ---------- */
    .site-header {
      background: var(--color-header-bg);
      color: var(--color-header-text);
      padding: 0.75rem 1rem;
    }
    .site-header-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .site-header .site-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-header-text);
      text-decoration: none;
      letter-spacing: 0.01em;
    }
    .site-header .site-title:hover { text-decoration: underline; }
    .site-header nav { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
    .site-header nav a { color: var(--color-header-nav); text-decoration: none; font-size: 0.9rem; }
    .site-header nav a:hover { color: var(--color-header-text); text-decoration: underline; }
    .github-link::before { content: ""; }

    /* ---------- Theme toggle ---------- */
    .theme-toggle,
    .print-btn {
      background: transparent;
      border: 1px solid var(--color-header-nav);
      border-radius: 4px;
      color: var(--color-header-nav);
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.25rem 0.6rem;
      min-height: 2rem;
      display: inline-flex;
      align-items: center;
      gap: 0.3em;
      white-space: nowrap;
    }
    .theme-toggle:hover,
    .theme-toggle[aria-pressed="true"],
    .print-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      color: var(--color-header-text);
      border-color: var(--color-header-text);
    }
    .theme-toggle:focus-visible,
    .print-btn:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }

    /* ---------- Main wrapper ---------- */
    .site-main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
    }
    .page-intro {
      background: var(--color-surface);
      border-radius: 6px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      border-left: 4px solid var(--color-primary);
      box-shadow: 0 1px 3px var(--color-shadow);
    }
    .page-intro h1 { margin-top: 0; }

    /* ---------- Content cards ---------- */
    section {
      background: var(--color-surface);
      border-radius: 6px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 1px 3px var(--color-shadow);
    }
    section > h2:first-of-type { margin-top: 0; }

    /* ---------- Score badges ---------- */
    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.75rem;
      margin: 1rem 0;
    }
    .score-card {
      background: var(--color-score-bg);
      border: 1px solid var(--color-score-border);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      text-align: center;
    }
    .score-card .score-label { font-size: 0.78rem; color: var(--color-score-label); text-transform: uppercase; letter-spacing: 0.05em; }
    .score-card .score-value { font-size: 2rem; font-weight: 700; color: var(--color-score-value); line-height: 1.1; }

    /* ---------- Tables ---------- */
    .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table {
      border-collapse: collapse;
      width: 100%;
      font-size: 0.875rem;
    }
    th, td {
      text-align: left;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--color-table-border);
      vertical-align: top;
    }
    th {
      background: var(--color-table-header-bg);
      font-weight: 600;
      white-space: nowrap;
    }
    th.wrap-header { white-space: normal; min-width: 5rem; overflow-wrap: anywhere; }
    tbody tr:nth-child(even) { background: var(--color-table-row-alt); }
    tbody tr:hover { background: var(--color-table-row-hover); }
    tr.monthly-avg { background: var(--color-table-row-monthly); font-weight: 600; }
    tr.monthly-avg:hover { background: var(--color-table-row-monthly-hover); }

    /* ---------- Sortable column headers ---------- */
    .sort-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-weight: 600;
      font-size: inherit;
      color: inherit;
      padding: 0;
      display: inline-flex;
      align-items: flex-start;
      gap: 0.3em;
      white-space: inherit;
    }
    .sort-btn::after { content: '\u21C5'; font-size: 0.75em; opacity: 0.45; }
    th[aria-sort="ascending"] .sort-btn::after { content: '\u2191'; opacity: 1; }
    th[aria-sort="descending"] .sort-btn::after { content: '\u2193'; opacity: 1; }
    .sort-btn:hover { text-decoration: underline; }
    .sort-btn:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; border-radius: 2px; }

    /* ---------- Buttons ---------- */
    .details-btn {
      background: var(--color-primary);
      border: none;
      border-radius: 4px;
      color: var(--color-header-text);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      min-height: 2.75rem;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
    }
    .details-btn:hover { background: var(--color-primary-hover); }
    .details-btn:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }

    /* ---------- Modals ---------- */
    .axe-modal {
      border: 1px solid var(--color-modal-border);
      border-radius: 6px;
      padding: 1.5rem;
      max-width: 800px;
      width: 90vw;
      max-height: 85vh;
      overflow-y: auto;
      background: var(--color-surface);
      color: var(--color-text);
    }
    .axe-modal::backdrop { background: rgba(0, 0, 0, 0.5); }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .modal-header h2 { margin: 0; }
    .modal-close {
      background: none;
      border: 1px solid var(--color-modal-border);
      border-radius: 4px;
      cursor: pointer;
      font-size: 1.2rem;
      min-height: 2.75rem;
      min-width: 2.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--color-text);
    }
    .modal-close:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }
    .modal-footer { margin-top: 1rem; text-align: right; }
    .axe-item {
      border-left: 3px solid var(--color-axe-item-border);
      margin: 0.5rem 0;
      padding: 0.5rem 0.75rem;
      background: var(--color-axe-item-bg);
    }
    .axe-item pre {
      background: var(--color-axe-pre-bg);
      padding: 0.5rem;
      overflow-x: auto;
      font-size: 0.85em;
    }
    .finding-detail {
      padding: 0.5rem 1rem;
      border: 1px solid var(--color-finding-border);
      margin-top: 0.25rem;
    }
    .fix-list { margin: 0.25rem 0 0.5rem 1.5rem; padding: 0; }
    .fix-list li { margin: 0.2rem 0; }
    .wcag-tags { margin: 0.25rem 0; font-size: 0.9em; color: var(--color-wcag-text); }
    /* Disability icon badges (replacing FPC abbreviation codes) */
    .disability-badges { display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }
    .disability-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.15rem;
      padding: 0.15rem 0.3rem;
      border-radius: 4px;
      background: var(--color-badge-bg);
      border: 1px solid var(--color-badge-border);
      color: var(--color-badge-text);
      line-height: 1;
      cursor: help;
      text-decoration: none;
      position: relative;
    }
    .disability-badge:hover { background: var(--color-badge-hover); }
    .disability-badge:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }
    .disability-icon { display: block; vertical-align: middle; }
    .disability-estimate {
      font-size: 0.65rem;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
    }
    /* ARIA tooltip for disability badges */
    .disability-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-tooltip-bg);
      color: var(--color-tooltip-text);
      border: 1px solid var(--color-tooltip-border);
      border-radius: 4px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      font-weight: normal;
      white-space: normal;
      max-width: 280px;
      min-width: 160px;
      z-index: 100;
      text-align: left;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    }
    .disability-badge:hover .disability-tooltip,
    .disability-badge:focus-within .disability-tooltip {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
    }
    .disability-badge[data-tooltip-dismissed] .disability-tooltip {
      visibility: hidden !important;
      opacity: 0 !important;
    }
    @media (prefers-reduced-motion: no-preference) {
      .disability-tooltip { transition: opacity 0.15s ease; }
    }
    /* URL count tooltip (URLs affected column in axe patterns table) */
    .url-count-trigger {
      display: inline-flex;
      align-items: center;
      cursor: help;
      text-decoration: underline dotted;
      position: relative;
    }
    .url-count-trigger:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }
    .url-count-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-tooltip-bg);
      color: var(--color-tooltip-text);
      border: 1px solid var(--color-tooltip-border);
      border-radius: 4px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      font-weight: normal;
      white-space: normal;
      max-width: 320px;
      min-width: 200px;
      z-index: 100;
      text-align: left;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      word-break: break-word;
    }
    .url-count-trigger:hover .url-count-tooltip,
    .url-count-trigger:focus-within .url-count-tooltip {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
    }
    .url-count-trigger[data-tooltip-dismissed] .url-count-tooltip {
      visibility: hidden !important;
      opacity: 0 !important;
    }
    @media (prefers-reduced-motion: no-preference) {
      .url-count-tooltip { transition: opacity 0.15s ease; }
    }
    /* Performance load-time tooltip (Performance column in top-URLs table) */
    .perf-time-trigger {
      display: inline-flex;
      align-items: center;
      cursor: help;
      text-decoration: underline dotted;
      position: relative;
    }
    .perf-time-trigger:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }
    .perf-time-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-tooltip-bg);
      color: var(--color-tooltip-text);
      border: 1px solid var(--color-tooltip-border);
      border-radius: 4px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      font-weight: normal;
      white-space: normal;
      max-width: 320px;
      min-width: 200px;
      z-index: 100;
      text-align: left;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
      word-break: break-word;
    }
    .perf-time-trigger:hover .perf-time-tooltip,
    .perf-time-trigger:focus-within .perf-time-tooltip {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
    }
    .perf-time-trigger[data-tooltip-dismissed] .perf-time-tooltip {
      visibility: hidden !important;
      opacity: 0 !important;
    }
    @media (prefers-reduced-motion: no-preference) {
      .perf-time-tooltip { transition: opacity 0.15s ease; }
    }
    .disability-legend {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.4rem 0.75rem;
      align-items: center;
      margin: 0.5rem 0;
    }
    .disability-legend dt { display: flex; align-items: center; justify-content: center; }
    .disability-legend dd { margin: 0; }
    .fpc-prevalence { font-size: 0.85em; color: var(--color-text-muted); white-space: nowrap; }
    details summary { cursor: pointer; padding: 0.4rem 0; }

    /* ---------- History chart ---------- */
    .history-chart-figure { margin: 0.5rem 0 1rem; overflow-x: auto; }
    .history-chart-figure svg { min-width: 320px; }

    /* ---------- Axe policy narratives ---------- */
    .axe-narratives-details { margin: 1rem 0; }
    .axe-narratives-details > summary { font-weight: 600; }
    .axe-narrative {
      border-left: 4px solid var(--color-focus-ring);
      margin: 1rem 0;
      padding: 0.5rem 0 0.5rem 1rem;
    }
    .axe-narrative-title { margin: 0 0 0.4rem; font-size: 1rem; }
    .axe-narrative-body { margin: 0 0 0.5rem; }
    .axe-demographics { margin: 0.25rem 0 0; padding-left: 1.25rem; }
    .axe-demographics li { margin-bottom: 0.15rem; }

    /* ---------- Compliance context section ---------- */
    .compliance-context-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    .compliance-card {
      border: 1px solid var(--color-table-border);
      border-radius: 6px;
      padding: 1rem 1.25rem;
      background: var(--color-score-bg);
    }
    .compliance-card h3 { margin: 0 0 0.5rem; font-size: 1rem; }
    .compliance-card--legal { border-top: 4px solid #d4380d; }
    .compliance-card--best-practices { border-top: 4px solid #389e0d; }
    .compliance-card ul { margin: 0.5rem 0; padding-left: 1.25rem; }
    .compliance-card li { margin-bottom: 0.25rem; }
    .compliance-card p { margin: 0.4rem 0; }

    /* ---------- Copy finding button ---------- */
    .copy-finding-btn {
      background: var(--color-copy-btn-bg);
      border: 1px solid var(--color-copy-btn-border);
      border-radius: 4px;
      color: var(--color-copy-btn-text);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      min-height: 2.75rem;
      margin-top: 0.5rem;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
    }
    .copy-finding-btn:hover { background: var(--color-copy-btn-hover); border-color: var(--color-primary); }
    .copy-finding-btn:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; }
    .copy-finding-btn.copied { background: var(--color-copied-bg); border-color: var(--color-copied-border); color: var(--color-copied-text); }

    /* ---------- Score color gradient cells ---------- */
    /* Numeric score columns: background lightness driven by --score (0–100) */
    /* Light mode: near-white at 0, vivid tint at 100 */
    .score-performance {
      background-color: hsl(270 60% calc((93 - var(--score, 0) * 0.18) * 1%));
    }
    .score-accessibility {
      background-color: hsl(140 50% calc((93 - var(--score, 0) * 0.18) * 1%));
    }
    .score-best-practices {
      background-color: hsl(210 60% calc((93 - var(--score, 0) * 0.18) * 1%));
    }
    .score-seo {
      background-color: hsl(28 80% calc((93 - var(--score, 0) * 0.15) * 1%));
    }

    /* CWV column: three fixed yellow tints (good → needs improvement → poor) */
    .score-cwv-good         { background-color: hsl(50 75% 78%); }
    .score-cwv-needs-improvement { background-color: hsl(50 65% 86%); }
    .score-cwv-poor         { background-color: hsl(50 50% 92%); }

    /* ---------- Technology badges ---------- */
    .tech-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.1em 0.4em;
      border-radius: 0.25em;
      white-space: nowrap;
    }
    .tech-badge-cms   { background-color: hsl(200 60% 88%); color: hsl(200 60% 25%); }
    .tech-badge-uswds { background-color: hsl(225 70% 88%); color: hsl(225 70% 25%); }
    :root:not([data-color-scheme="light"]) .tech-badge-cms   { background-color: hsl(200 40% 25%); color: hsl(200 40% 85%); }
    :root:not([data-color-scheme="light"]) .tech-badge-uswds { background-color: hsl(225 40% 25%); color: hsl(225 40% 85%); }
    html[data-color-scheme="dark"] .tech-badge-cms   { background-color: hsl(200 40% 25%); color: hsl(200 40% 85%); }
    html[data-color-scheme="dark"] .tech-badge-uswds { background-color: hsl(225 40% 25%); color: hsl(225 40% 85%); }
    html[data-color-scheme="light"] .tech-badge-cms   { background-color: hsl(200 60% 88%); color: hsl(200 60% 25%); }
    html[data-color-scheme="light"] .tech-badge-uswds { background-color: hsl(225 70% 88%); color: hsl(225 70% 25%); }

    /* ---------- URL cells ---------- */
    .url-cell {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
      position: relative;
    }
    .url-cell:hover,
    .url-cell:focus-within {
      overflow: visible;
      position: relative;
      z-index: 2;
    }
    .url-cell:hover a,
    .url-cell:focus-within a {
      background: var(--color-table-row-hover);
      padding-right: 0.25rem;
      box-shadow: 2px 0 4px var(--color-shadow);
    }
    .url-org {
      display: block;
      font-size: 0.78em;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 0.15em;
    }

    /* ---------- Column header info tooltips ---------- */
    .col-has-info { position: relative; }
    .col-info-anchor {
      display: inline-block;
      position: relative;
      margin-left: 0.25rem;
      color: var(--color-text-muted);
      font-size: 0.85em;
      cursor: help;
      vertical-align: middle;
    }
    .col-info-anchor:focus-visible { outline: 3px solid var(--color-focus-ring); outline-offset: 2px; border-radius: 50%; }
    .col-info-icon { font-style: normal; }
    .col-subhead { font-size: 0.85em; font-weight: normal; white-space: nowrap; }
    .col-tooltip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-tooltip-bg);
      color: var(--color-tooltip-text);
      border: 1px solid var(--color-tooltip-border);
      border-radius: 4px;
      padding: 0.4rem 0.6rem;
      font-size: 0.8rem;
      font-weight: normal;
      white-space: normal;
      max-width: 260px;
      min-width: 160px;
      z-index: 200;
      text-align: left;
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    }
    .col-info-anchor:hover .col-tooltip,
    .col-info-anchor:focus-within .col-tooltip {
      visibility: visible;
      opacity: 1;
      pointer-events: auto;
    }
    @media (prefers-reduced-motion: no-preference) {
      .col-tooltip { transition: opacity 0.15s ease; }
    }
    /* Severe count styling inside accessibility cell */
    .severe-count { color: var(--color-text-muted); font-size: 0.9em; }

    /* ---------- Site footer ---------- */
    .site-footer {
      background: var(--color-footer-bg);
      color: var(--color-footer-text);
      padding: 1.5rem 1rem;
      font-size: 0.875rem;
    }
    .site-footer-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: space-between;
      align-items: center;
    }
    .site-footer a { color: var(--color-footer-link); text-decoration: underline; }
    .site-footer a:hover { color: var(--color-header-text); }

    /* ---------- Responsive ---------- */
    @media (max-width: 640px) {
      h1 { font-size: 1.3rem; }
      h2 { font-size: 1.1rem; }
      .site-header-inner { flex-direction: column; align-items: flex-start; }
      .score-card .score-value { font-size: 1.5rem; }
      th, td { padding: 0.4rem 0.5rem; }
      .axe-modal {
        position: fixed;
        inset: 0;
        max-width: 100%;
        width: 100%;
        max-height: 100%;
        border-radius: 0;
        margin: 0;
      }
      .site-main { padding: 1rem 0.75rem 2rem; }
      section { padding: 1rem; }

      /* Stacked card layout for all scrollable tables */
      .table-scroll table thead { display: none; }
      .table-scroll table tbody tr {
        display: block;
        border: 1px solid var(--color-table-border);
        border-radius: 6px;
        margin-bottom: 1rem;
        padding: 0.25rem 0;
        background: var(--color-surface);
      }
      .table-scroll table tbody tr:nth-child(even) { background: var(--color-table-row-alt); }
      .table-scroll table td {
        display: flex;
        border: none;
        border-bottom: 1px solid var(--color-table-row-sep);
        padding: 0.4rem 0.75rem;
        align-items: baseline;
        gap: 0.5rem;
      }
      .table-scroll table td:last-child { border-bottom: none; }
      .table-scroll table td::before {
        content: attr(data-label);
        font-weight: 600;
        color: var(--color-text-muted);
        min-width: 8.5rem;
        flex-shrink: 0;
        font-size: 0.8rem;
      }
      .table-scroll .url-cell {
        max-width: 100%;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    }

    /* ---------- Print / Save as PDF ---------- */
    .print-only { display: none; }
    .print-dashboard-notice {
      background: #f0f4ff;
      border: 1px solid #c0ccee;
      border-radius: 4px;
      font-size: 0.9rem;
      padding: 0.6rem 1rem;
    }

    @media print {
      /* Hide interactive / navigational chrome */
      .skip-link,
      .site-header nav,
      .theme-toggle,
      .print-btn,
      .details-btn,
      .sort-btn,
      .copy-finding-btn,
      dialog,
      .axe-modal,
      .anchor-link { display: none !important; }

      /* Show print-only elements (e.g., dashboard URL notice) */
      .print-only { display: block !important; }

      /* Page setup with generous margins for binding and annotation */
      @page { margin: 2cm; }
      @page :first { margin-top: 3cm; }

      /* Typography optimised for print readability */
      body {
        font-family: Georgia, "Times New Roman", Times, serif;
        font-size: 12pt;
        line-height: 1.5;
        background: #fff;
        color: #000;
      }

      h1 { font-size: 22pt; }
      h2 { font-size: 18pt; }
      h3 { font-size: 14pt; }

      /* Prevent orphaned lines at page boundaries */
      p, li { orphans: 3; widows: 3; }

      /* Page break control: keep headings with following content */
      h1, h2, h3 {
        page-break-after: avoid;
        break-after: avoid;
      }

      figure, img, table {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      /* Avoid page breaks inside key content blocks */
      section, .score-grid, .page-intro { break-inside: avoid; }

      /* Images: scale to fit the page without overflowing */
      img { max-width: 100% !important; height: auto; }

      /* Make the header readable in black-and-white */
      .site-header {
        background: #000 !important;
        color: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Keep score cards readable; force text to black for grayscale legibility */
      .score-card {
        border: 1px solid #ccc;
        background: #fff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .score-label,
      .score-value { color: #000 !important; }

      /* Tables: repeat header row on every page; use explicit borders for print */
      thead { display: table-header-group; }
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      th, td { border: 1pt solid #333 !important; }
      th {
        background: #f0f0f0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      tbody tr:nth-child(even) {
        background: #f9f9f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Remove table hover styles that rely on color */
      tr:hover { background: inherit !important; }

      /* Expand truncated URL cells for print */
      .url-cell {
        max-width: none !important;
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
      }

      /* Reveal external link destinations after link text */
      a[href]::after {
        content: " (" attr(href) ")";
        font-size: 0.875em;
        color: #333;
        word-break: break-all;
      }

      /* Suppress URL display for fragment links, JS pseudo-links, and in-table/header links */
      a[href^="#"]::after,
      a[href^="javascript:"]::after,
      table a[href]::after,
      .site-header a[href]::after { content: ""; }

      /* Print dashboard notice: plain border, no color background */
      .print-dashboard-notice {
        background: #fff !important;
        border: 1pt solid #333 !important;
      }
    }
  </style>`;
}

function renderSiteHeader() {
  return `
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header" role="banner">
  <div class="site-header-inner">
    <a class="site-title" href="../../index.html">Daily DAP</a>
    <nav aria-label="Site navigation">
      <a href="../../index.html">Dashboard</a>
      <a class="github-link" href="${GITHUB_URL}" target="_blank" rel="noreferrer">GitHub</a>
      <button class="print-btn" type="button" onclick="window.print()" aria-label="Print or save as PDF">
        <span aria-hidden="true">&#128424;</span> Print / Save as PDF
      </button>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="false" aria-label="Enable dark mode">
        <span aria-hidden="true">&#127769;</span> Dark mode
      </button>
    </nav>
  </div>
</header>`;
}

function renderDashboardHeader() {
  return `
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header" role="banner">
  <div class="site-header-inner">
    <span class="site-title">Daily DAP</span>
    <nav aria-label="Site navigation">
      <a class="github-link" href="${GITHUB_URL}" target="_blank" rel="noreferrer">GitHub</a>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-pressed="false" aria-label="Enable dark mode">
        <span aria-hidden="true">&#127769;</span> Dark mode
      </button>
    </nav>
  </div>
</header>`;
}

function renderSiteFooter() {
  return `
<footer class="site-footer" role="contentinfo">
  <div class="site-footer-inner">
    <p>Daily DAP &mdash; U.S. government website quality benchmarks powered by <a href="https://developer.chrome.com/docs/lighthouse/" target="_blank" rel="noreferrer">Lighthouse</a> and <a href="https://www.deque.com/axe/" target="_blank" rel="noreferrer">axe-core</a>.</p>
    <p><a href="${GITHUB_URL}" target="_blank" rel="noreferrer">View source on GitHub</a> &middot; <a href="${GITHUB_URL}/issues" target="_blank" rel="noreferrer">Report an issue</a></p>
  </div>
</footer>`;
}

function wrapTable(tableHtml) {
  return `<div class="table-scroll">${tableHtml}</div>`;
}


function renderFpcExclusionSection(report) {
  const exclusion = report.fpc_exclusion;
  if (!exclusion || !exclusion.categories) {
    return '';
  }

  const totalPageLoads = exclusion.total_page_loads ?? 0;
  const vintageYear = exclusion.census_vintage_year ?? 'unknown';
  const sourceUrl = exclusion.census_source_url ?? 'https://www.census.gov/topics/health/disability.html';
  const source = exclusion.census_source ?? 'U.S. Census Bureau';

  const categories = Object.entries(exclusion.categories)
    .filter(([, data]) => data.affected_page_loads > 0)
    .sort((a, b) => b[1].estimated_excluded_users - a[1].estimated_excluded_users);

  if (categories.length === 0) {
    return `
  <section aria-labelledby="fpc-exclusion-heading">
    <h2 id="fpc-exclusion-heading">Americans Excluded by Disability${renderAnchorLink('fpc-exclusion-heading', 'Americans Excluded by Disability')}</h2>
    <p><em>No accessibility findings data is available to estimate excluded users by disability category for this scan.</em></p>
  </section>`;
  }

  const totalExcluded = categories.reduce((sum, [, data]) => sum + data.estimated_excluded_users, 0);

  const rows = categories
    .map(([code, data]) => {
      const svg = FPC_SVGS[code];
      const label = escapeHtml(data.label ?? code);
      const icon = svg
        ? `<span class="disability-badge" aria-hidden="true">${makeDecorativeSvg(svg)}</span>`
        : `<abbr title="${label}">${escapeHtml(code)}</abbr>`;
      const pop = data.estimated_population
        ? `~${Number(data.estimated_population).toLocaleString('en-US')}`
        : 'N/A';
      const rate = `${(data.prevalence_rate * 100).toFixed(1)}%`;
      const affectedLoads = roundDownConservatively(data.affected_page_loads).toLocaleString('en-US');
      const excluded = roundDownConservatively(data.estimated_excluded_users).toLocaleString('en-US');
      return `<tr>
      <td data-label="Icon">${icon}</td>
      <td data-label="Disability Group">${label}</td>
      <td data-label="U.S. Prevalence">${rate}</td>
      <td data-label="U.S. Population">${pop}</td>
      <td data-label="Page Loads with Barriers">${affectedLoads}</td>
      <td data-label="Est. Excluded Today"><strong>${excluded}</strong></td>
    </tr>`;
    })
    .join('\n');

  return `
  <section aria-labelledby="fpc-exclusion-heading">
    <h2 id="fpc-exclusion-heading">Americans Excluded by Disability Today${renderAnchorLink('fpc-exclusion-heading', 'Americans Excluded by Disability Today')}</h2>
    <p>Based on <strong>${Number(totalPageLoads).toLocaleString('en-US')}</strong> page loads across successfully scanned government URLs and U.S. disability prevalence rates from the <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a> (${escapeHtml(String(vintageYear))}), an estimated <strong>${roundDownConservatively(totalExcluded).toLocaleString('en-US')} Americans</strong> encountered an accessibility barrier on a government website today.</p>
    <p>Each row shows the number of people in a disability group who visited a page with at least one accessibility issue that affects their group. Prevalence rates and U.S. population estimates are derived from the American Community Survey (ACS) and supplemental sources. These figures are rough estimates intended to illustrate the scale of accessibility barriers.</p>
    ${wrapTable(`<table>
      <caption>Estimated Americans excluded today by disability category (${escapeHtml(String(vintageYear))} Census data)</caption>
      <thead>
        <tr>
          <th scope="col">Icon</th>
          <th scope="col">Disability Group (Section 508 FPC)</th>
          <th scope="col">U.S. Prevalence</th>
          <th scope="col">U.S. Population Affected</th>
          <th scope="col">Page Loads with Barriers</th>
          <th scope="col">Est. Americans Excluded Today</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`)}
    <p><small>Sources: <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a>; disability prevalence from ACS ${escapeHtml(String(vintageYear))} and supplemental CDC/NIDCD/NIH data. Reviewed annually.</small></p>
  </section>`;
}

// Wikipedia's English-language database download size (articles + talk pages, compressed XML).
// Source: https://en.wikipedia.org/wiki/Wikipedia:Size_of_Wikipedia
const WIKIPEDIA_SIZE_GB = 24.05;

function formatDuration(hours) {
  const DAYS_PER_YEAR = 365.25;
  const DAYS_PER_MONTH = DAYS_PER_YEAR / 12; // ~30.4375

  const totalDays = hours / 24;
  if (totalDays < 1) {
    // Round down to be conservative
    return `${Math.floor(hours).toLocaleString('en-US')} hours`;
  }

  const years = Math.floor(totalDays / DAYS_PER_YEAR);
  const remainingDays = totalDays - years * DAYS_PER_YEAR;
  const months = Math.floor(remainingDays / DAYS_PER_MONTH);
  const days = Math.floor(remainingDays - months * DAYS_PER_MONTH);

  const parts = [];
  if (years > 0) parts.push(`${years.toLocaleString('en-US')} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);

  return parts.length > 0 ? parts.join(', ') : '< 1 day';
}

function formatDataSize(gigabytes) {
  const wikipediaCopies = Math.floor(gigabytes / WIKIPEDIA_SIZE_GB);
  let sizeStr;
  if (gigabytes >= 1000) {
    // Use SI (decimal) units: 1 TB = 1000 GB, matching the GB values already reported
    const tb = Math.floor((gigabytes / 1000) * 10) / 10;
    sizeStr = `~${tb.toLocaleString('en-US')} TB`;
  } else {
    const gb = Math.floor(gigabytes * 100) / 100;
    sizeStr = `${gb.toLocaleString('en-US')} GB`;
  }

  if (wikipediaCopies > 0) {
    return `${sizeStr} (${wikipediaCopies.toLocaleString('en-US')} copies of Wikipedia)`;
  }
  return sizeStr;
}

function formatScanDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr ?? '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [year, month, day] = parts;
  // Use Date.UTC to construct midnight UTC, then format in UTC timezone,
  // so the displayed date is always the calendar date in the run_date string
  // regardless of the server's local timezone.
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function renderPerformanceImpactSection(report) {
  const impact = report.performance_impact;
  if (!impact || impact.url_count_with_timing === 0) {
    return '';
  }

  const benchmarkLcpSec = (impact.benchmark_lcp_ms / 1000).toFixed(1);
  const benchmarkWeightMb = (impact.benchmark_page_weight_bytes / 1_000_000).toFixed(1);
  const extraHours = impact.total_extra_load_time_hours;
  const extraGb = impact.total_extra_gigabytes;
  const urlCount = impact.url_count_with_timing;
  const scanDate = escapeHtml(formatScanDate(report.run_date));

  const timeRow = `<tr>
      <td data-label="Metric">Extra time waiting (vs ${benchmarkLcpSec}s LCP benchmark)</td>
      <td data-label="Estimated total">${formatDuration(extraHours)}</td>
      <td data-label="Notes">${Number(impact.total_extra_load_time_seconds).toLocaleString('en-US')} seconds</td>
    </tr>`;

  const weightRow =
    impact.url_count_with_weight > 0
      ? `<tr>
      <td data-label="Metric">Extra data transferred (vs ${benchmarkWeightMb} MB page weight benchmark)</td>
      <td data-label="Estimated total">${formatDataSize(extraGb)}</td>
      <td data-label="Notes">Across ${Number(impact.url_count_with_weight).toLocaleString('en-US')} URLs with weight data</td>
    </tr>`
      : '';

  return `
  <section aria-labelledby="performance-impact-heading">
    <h2 id="performance-impact-heading">Performance Impact on Americans${renderAnchorLink('performance-impact-heading', 'Performance Impact on Americans')}</h2>
    <p>Google defines a <strong>good</strong> Largest Contentful Paint (LCP) as under ${benchmarkLcpSec} seconds and recommends pages under ${benchmarkWeightMb} MB. The figures below estimate how much extra time Americans spend waiting, and how much extra data is transferred, because government websites fall short of these benchmarks. Calculations are based on ${Number(urlCount).toLocaleString('en-US')} successfully scanned URLs with Lighthouse timing data.</p>
    ${wrapTable(`<table>
      <caption>Estimated performance impact vs. Google benchmarks for government URLs scanned on ${scanDate}</caption>
      <thead>
        <tr>
          <th scope="col">Metric</th>
          <th scope="col">Estimated total (${scanDate})</th>
          <th scope="col">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${timeRow}
        ${weightRow}
      </tbody>
    </table>`)}
    <p><small>Extra time is calculated as: for each scanned URL, <em>max(0, actual LCP &minus; ${benchmarkLcpSec}s) &times; page loads</em>. Extra data is calculated as: <em>max(0, actual page weight &minus; ${benchmarkWeightMb} MB) &times; page loads</em>. LCP and page weight are measured by Lighthouse. Wikipedia copy count uses a size of 24.05 GB per <a href="https://en.wikipedia.org/wiki/Wikipedia:Size_of_Wikipedia" target="_blank" rel="noreferrer">Wikipedia:Size of Wikipedia</a>. These are rough estimates based on a sample of the top government URLs by traffic.</small></p>
  </section>`;
}

function hasNonZeroScores(entry) {
  const scores = entry.aggregate_scores;
  return scores.performance !== 0 || 
         scores.accessibility !== 0 || 
         scores.best_practices !== 0 || 
         scores.seo !== 0;
}

function roundScore(value) {
  return Math.round(value * 100) / 100;
}

const HISTORY_CHART_COLORS = {
  performance: '#e07800',
  accessibility: '#0057b8',
  best_practices: '#1a7f37',
  seo: '#7b3fbe'
};

function renderHistoryChart(historySeries = []) {
  const data = historySeries.filter(hasNonZeroScores);
  if (data.length === 0) return '';

  const n = data.length;
  // SVG layout constants
  const svgW = 700;
  const svgH = 270;
  const pLeft = 45;
  const pTop = 15;
  const pRight = 590;
  const pBottom = 220;
  const pW = pRight - pLeft;
  const pH = pBottom - pTop;
  // Chart style constants
  const MAX_X_LABELS = 6;
  const X_LABEL_OFFSET = 16;
  const X_LABEL_FONT_SIZE = 9;
  const POINT_RADIUS = 4;
  const LEGEND_X = 600;
  const LEGEND_SWATCH_END_X = 620;
  const LEGEND_LABEL_X = 625;
  const LEGEND_LINE_HEIGHT = 24;

  const xFor = (i) => (n === 1 ? pLeft + pW / 2 : pLeft + (i / (n - 1)) * pW);
  const yFor = (score) => pBottom - (Math.max(0, Math.min(100, score)) / 100) * pH;

  const categories = [
    { key: 'performance', label: 'Performance' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'best_practices', label: 'Best Practices' },
    { key: 'seo', label: 'SEO' }
  ];

  const gridLines = [0, 20, 40, 60, 80, 100].map((score) => {
    const y = yFor(score).toFixed(1);
    return `<line x1="${pLeft}" y1="${y}" x2="${pRight}" y2="${y}" style="stroke:var(--color-table-border);stroke-width:1"/><text x="${pLeft - 4}" y="${(yFor(score) + 4).toFixed(1)}" text-anchor="end" font-size="10" style="fill:var(--color-text-muted)">${score}</text>`;
  }).join('\n');

  const labelStep = Math.max(1, Math.ceil(n / MAX_X_LABELS));
  const xLabels = data.map((entry, i) => {
    if (i % labelStep !== 0 && i !== n - 1) return '';
    return `<text x="${xFor(i).toFixed(1)}" y="${(pBottom + X_LABEL_OFFSET).toFixed(1)}" text-anchor="middle" font-size="${X_LABEL_FONT_SIZE}" style="fill:var(--color-text-muted)">${escapeHtml(entry.date.slice(5))}</text>`;
  }).join('');

  const lines = categories.map((cat) => {
    const color = HISTORY_CHART_COLORS[cat.key];
    if (n === 1) {
      const x = xFor(0).toFixed(1);
      const y = yFor(data[0].aggregate_scores[cat.key]).toFixed(1);
      return `<circle cx="${x}" cy="${y}" r="${POINT_RADIUS}" style="fill:${color}"/>`;
    }
    const points = data.map((entry, i) => `${xFor(i).toFixed(1)},${yFor(entry.aggregate_scores[cat.key]).toFixed(1)}`).join(' ');
    return `<polyline points="${points}" style="fill:none;stroke:${color};stroke-width:2;stroke-linejoin:round"/>`;
  }).join('\n');

  const legend = categories.map((cat, i) => {
    const color = HISTORY_CHART_COLORS[cat.key];
    const ly = pTop + i * LEGEND_LINE_HEIGHT;
    return `<line x1="${LEGEND_X}" y1="${ly + 5}" x2="${LEGEND_SWATCH_END_X}" y2="${ly + 5}" style="stroke:${color};stroke-width:2"/><text x="${LEGEND_LABEL_X}" y="${ly + 9}" font-size="11" style="fill:var(--color-text)">${escapeHtml(cat.label)}</text>`;
  }).join('\n');

  const firstDate = data[0].date;
  const lastDate = data[n - 1].date;
  const title = `Daily aggregate Lighthouse scores from ${firstDate} to ${lastDate}`;

  return `<figure class="history-chart-figure">
  <svg role="img" aria-label="${escapeHtml(title)}" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${svgW}px;height:auto;display:block;overflow:visible">
    <title>${escapeHtml(title)}</title>
    ${gridLines}
    ${xLabels}
    <line x1="${pLeft}" y1="${pTop}" x2="${pLeft}" y2="${pBottom}" style="stroke:var(--color-table-border);stroke-width:1"/>
    <line x1="${pLeft}" y1="${pBottom}" x2="${pRight}" y2="${pBottom}" style="stroke:var(--color-table-border);stroke-width:1"/>
    ${lines}
    ${legend}
  </svg>
</figure>`;
}

function calculateMonthlyAverages(historySeries = []) {
  const monthlyData = {};
  
  historySeries
    .filter(hasNonZeroScores)
    .forEach((entry) => {
      const monthKey = entry.date.slice(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          count: 0,
          totals: { performance: 0, accessibility: 0, best_practices: 0, seo: 0 }
        };
      }
      
      const data = monthlyData[monthKey];
      data.count += 1;
      data.totals.performance += entry.aggregate_scores.performance;
      data.totals.accessibility += entry.aggregate_scores.accessibility;
      data.totals.best_practices += entry.aggregate_scores.best_practices;
      data.totals.seo += entry.aggregate_scores.seo;
    });
  
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      date: month,
      isAverage: true,
      aggregate_scores: {
        performance: roundScore(data.totals.performance / data.count),
        accessibility: roundScore(data.totals.accessibility / data.count),
        best_practices: roundScore(data.totals.best_practices / data.count),
        seo: roundScore(data.totals.seo / data.count)
      }
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderHistoryRows(historySeries = []) {
  const HISTORY_TABLE_DAYS = 14;
  const filteredSeries = historySeries.filter(hasNonZeroScores);
  // Show the most-recent HISTORY_TABLE_DAYS entries, newest first
  const truncated = filteredSeries.slice(-HISTORY_TABLE_DAYS);
  return [...truncated].reverse().map(
    (entry) =>
      `<tr><td data-label="Date">${escapeHtml(entry.date)}</td><td data-label="Performance">${entry.aggregate_scores.performance}</td><td data-label="Accessibility">${entry.aggregate_scores.accessibility}</td><td data-label="Best Practices">${entry.aggregate_scores.best_practices}</td><td data-label="SEO">${entry.aggregate_scores.seo}</td></tr>`
  ).join('\n');
}

function renderLighthouseScoreCell(scores, key, label = '') {
  const labelAttr = label ? ` data-label="${escapeHtml(label)}"` : '';
  if (!scores) {
    return `<td${labelAttr}>—</td>`;
  }
  const value = scores[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `<td${labelAttr}>—</td>`;
  }
  const cssKey = key.replace(/_/g, '-');
  return `<td${labelAttr} class="score-${cssKey}" style="--score:${value}">${value}</td>`;
}

function formatTotalLoadTime(lcpValueMs, pageLoadCount) {
  if (
    typeof lcpValueMs !== 'number' || !Number.isFinite(lcpValueMs) || lcpValueMs <= 0 ||
    typeof pageLoadCount !== 'number' || !Number.isFinite(pageLoadCount) || pageLoadCount <= 0
  ) {
    return null;
  }
  const totalSeconds = (lcpValueMs / 1000) * pageLoadCount;
  const totalHours = totalSeconds / 3600;
  const totalDays = totalHours / 24;
  if (totalDays >= 2) {
    return { value: Math.round(totalDays), unit: 'days' };
  }
  if (totalHours >= 1) {
    return { value: Math.round(totalHours), unit: 'hours' };
  }
  return { value: Math.max(1, Math.round(totalSeconds / 60)), unit: 'minutes' };
}

function renderPerformanceCell(entry) {
  const label = 'Performance';
  const labelAttr = ` data-label="${escapeHtml(label)}"`;
  const scores = entry.lighthouse_scores;
  if (!scores) {
    return `<td${labelAttr}>—</td>`;
  }
  const value = scores.performance;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `<td${labelAttr}>—</td>`;
  }
  const loadTime = formatTotalLoadTime(entry.lcp_value_ms, entry.page_load_count);
  if (!loadTime) {
    return `<td${labelAttr} class="score-performance" style="--score:${value}" data-sort-value="${value}">${value}</td>`;
  }
  const timeLabel = `${loadTime.value} ${loadTime.unit}`;
  const tooltipId = `perf-tip-${_perfTimeTooltipSeq++}`;
  const lcpSeconds = (entry.lcp_value_ms / 1000).toFixed(1);
  const tooltipText = `Total time users spent waiting for this page to load: ${lcpSeconds}s LCP \u00d7 ${entry.page_load_count.toLocaleString()} page loads.`;
  const timeSpan = `<span class="perf-time-trigger" tabindex="0" aria-label="${escapeHtml(timeLabel)} of total page-load time" aria-describedby="${tooltipId}">${escapeHtml(timeLabel)}<span id="${tooltipId}" role="tooltip" class="perf-time-tooltip">${escapeHtml(tooltipText)}</span></span>`;
  return `<td${labelAttr} class="score-performance" style="--score:${value}" data-sort-value="${value}">${value}&thinsp;/&thinsp;${timeSpan}</td>`;
}

function renderAccessibilityImportantCell(entry) {
  const label = 'Accessibility / Important';
  const labelAttr = ` data-label="${escapeHtml(label)}"`;
  const scores = entry.lighthouse_scores;
  if (!scores) {
    return `<td${labelAttr}>—</td>`;
  }
  const value = scores.accessibility;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `<td${labelAttr}>—</td>`;
  }
  const severeCount = entry.severe_findings_count ?? 0;
  const findingWord = severeCount === 1 ? 'finding' : 'findings';
  const display = severeCount > 0
    ? `${value}&thinsp;/&thinsp;<span class="severe-count" aria-label="${severeCount} critical or serious ${findingWord}">${severeCount}</span>`
    : `${value}`;
  return `<td${labelAttr} class="score-accessibility" style="--score:${value}" data-sort-value="${value}">${display}</td>`;
}

function renderCwvCell(cwvStatus) {
  const status = cwvStatus ?? 'unknown';
  const classAttr = status !== 'unknown' ? ` class="score-cwv-${status.replace(/_/g, '-')}"` : '';
  return `<td data-label="CWV"${classAttr}>${escapeHtml(status.replace(/_/g, ' '))}</td>`;
}

function renderDescriptionHtml(description) {
  // Convert [text](url) markdown links to HTML anchors; escape everything else.
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(description)) !== null) {
    result += escapeHtml(description.slice(lastIndex, match.index));
    result += `<a href="${escapeHtml(match[2])}" target="_blank" rel="noreferrer">${escapeHtml(match[1])}</a>`;
    lastIndex = match.index + match[0].length;
  }
  result += escapeHtml(description.slice(lastIndex));
  return result;
}

function renderExplanationHtml(explanation) {
  if (!explanation) {
    return '';
  }

  const lines = explanation.split('\n');
  const firstLine = escapeHtml(lines[0].trim());
  const bulletLines = lines.slice(1).map((l) => l.trim()).filter(Boolean);

  if (bulletLines.length === 0) {
    return `<p><strong>How to fix:</strong> ${firstLine}</p>`;
  }

  const listItems = bulletLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('\n        ');
  return `<p><strong>How to fix:</strong> ${firstLine}</p>
      <ul class="fix-list">
        ${listItems}
      </ul>`;
}

function formatWcagTag(tag) {
  // Match purely numeric criterion tags like wcag412 (WCAG 4.1.2) or wcag2411 (WCAG 2.4.11).
  // Level tags like wcag2a or wcag2aa are intentionally excluded (they contain letters).
  // The regex guarantees 3–4 digits, so digits[0], digits[1], and digits.slice(2) are always valid.
  const match = tag.match(/^wcag(\d{3,4})$/);
  if (!match) {
    return null;
  }
  // principle = first digit, guideline = second digit, criterion = remaining 1–2 digits
  const digits = match[1];
  return `WCAG ${digits[0]}.${digits[1]}.${digits.slice(2)}`;
}

function renderWcagTags(tags = []) {
  const wcagLabels = tags.map(formatWcagTag).filter(Boolean);
  if (wcagLabels.length === 0) {
    return '';
  }
  return `<p class="wcag-tags"><strong>WCAG criteria:</strong> ${wcagLabels.map((l) => escapeHtml(l)).join(', ')}</p>`;
}

function renderAxeFindingItems(items = []) {
  if (items.length === 0) {
    return '<p><em>No specific element details available.</em></p>';
  }

  return items
    .map(
      (item, index) => `
      <div class="axe-item">
        <p><strong>Element ${index + 1}</strong></p>
        ${item.selector ? `<p><strong>Element path:</strong> <code>${escapeHtml(item.selector)}</code></p>` : ''}
        ${item.snippet ? `<p><strong>Snippet:</strong></p><pre><code>${escapeHtml(item.snippet)}</code></pre>` : ''}
        ${item.node_label && item.node_label !== item.selector ? `<p><strong>Label:</strong> ${escapeHtml(item.node_label)}</p>` : ''}
        ${renderExplanationHtml(item.explanation)}
      </div>`
    )
    .join('\n');
}

export function plainTextDescription(description) {
  // Convert [text](url) markdown links to plain "text (url)" format for clipboard output.
  return description.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)');
}

/**
 * Converts an FPC code label to a natural-language impact phrase for plain text output.
 * e.g. WV → "people without vision", LM → "people with limited manipulation"
 * @param {string} code
 * @returns {string}
 */
function fpcLabelToImpactPhrase(code) {
  const label = FPC_LABELS[code] ?? code;
  const lower = label.toLowerCase();
  if (lower.startsWith('without ')) {
    return 'people without ' + lower.slice('without '.length);
  }
  if (lower.startsWith('limited ')) {
    return 'people with limited ' + lower.slice('limited '.length);
  }
  return 'people with ' + lower;
}

/**
 * Formats an array of impact phrases as a natural English list.
 * e.g. ["~60K people without vision", "~20K people without hearing"]
 *      → "~60K people without vision and ~20K people without hearing"
 * @param {string[]} items
 * @returns {string}
 */
function formatImpactList(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}

export function buildFindingCopyText(pageUrl, finding, pageLoadCount = 0, scanDate = '') {
  const wcagLabels = (finding.tags ?? []).map(formatWcagTag).filter(Boolean);
  const fpcCodes = AXE_TO_FPC.get(finding.id) ?? [];
  const lines = [
    `**URL:** ${pageUrl}`,
    '',
    `**${finding.title}** (rule: \`${finding.id}\`)`,
    '',
    plainTextDescription(finding.description ?? ''),
  ];

  if (wcagLabels.length > 0) {
    lines.push('', `**WCAG criteria:** ${wcagLabels.join(', ')}`);
  }

  if (fpcCodes.length > 0) {
    const fpcLabels = fpcCodes.map((code) => `${code} (${FPC_LABELS[code] ?? code})`);
    lines.push('', `**Section 508 FPC:** ${fpcLabels.join(', ')}`);
  }

  if (pageLoadCount > 0 && fpcCodes.length > 0) {
    const prevalenceRates = getFpcPrevalenceRates();
    const impacts = fpcCodes
      .filter((code) => (prevalenceRates[code] ?? 0) > 0)
      .map((code) => {
        const estimated = Math.round(pageLoadCount * prevalenceRates[code]);
        return `~${estimated.toLocaleString('en-US')} ${fpcLabelToImpactPhrase(code)}`;
      });
    if (impacts.length > 0) {
      const visitorClause = `${pageLoadCount.toLocaleString('en-US')} daily visitors${scanDate ? ` (${scanDate})` : ''}`;
      lines.push(
        '',
        `With ${visitorClause} these errors could impact: ${formatImpactList(impacts)} according to Census.gov (${CENSUS_DISABILITY_STATS.source_url}).`
      );
    }
  }

  const items = finding.items ?? [];
  lines.push('', `**Affected elements (${items.length}):**`);

  items.forEach((item, index) => {
    lines.push('', `**Element ${index + 1}**`);
    if (item.selector) {
      lines.push(`Element path: \`${item.selector}\``);
    }
    if (item.snippet) {
      lines.push('Snippet:', '```', item.snippet, '```');
    }
    if (item.node_label && item.node_label !== item.selector) {
      lines.push(`Label: ${item.node_label}`);
    }
    if (item.explanation) {
      lines.push(`How to fix: ${item.explanation}`);
    }
  });

  return lines.join('\n');
}

function renderAxeFindingsList(axeFindings = [], pageUrl = '', pageLoadCount = 0, scanDate = '') {
  if (axeFindings.length === 0) {
    return '<p>No accessibility findings from this scan.</p>';
  }

  const prevalenceRates = getFpcPrevalenceRates();
  return axeFindings
    .map((finding) => {
      const fpcCodes = AXE_TO_FPC.get(finding.id);
      const fpcHtml =
        fpcCodes && fpcCodes.length > 0
          ? `<p><strong>Disabilities affected:</strong> ${renderFpcCodes(finding.id, pageLoadCount, prevalenceRates)}</p>`
          : '';
      return `
      <details>
        <summary><strong>${escapeHtml(finding.title)}</strong> (rule: <code>${escapeHtml(finding.id)}</code>)</summary>
        <div class="finding-detail">
          <p>${renderDescriptionHtml(finding.description)}</p>
          ${renderWcagTags(finding.tags)}
          ${fpcHtml}
          <p><strong>Affected elements (${finding.items.length}):</strong></p>
          ${renderAxeFindingItems(finding.items)}
          <button class="copy-finding-btn" data-copy-text="${escapeHtml(buildFindingCopyText(pageUrl, finding, pageLoadCount, scanDate))}" aria-label="Copy finding to clipboard">Copy finding</button>
        </div>
      </details>`;
    })
    .join('\n');
}

function renderUrlModal(entry, modalId, scanDate = '') {
  const axeFindings = Array.isArray(entry.axe_findings) ? entry.axe_findings : [];
  return `
<dialog id="${escapeHtml(modalId)}" aria-labelledby="${escapeHtml(modalId)}-title" aria-modal="true" class="axe-modal">
  <div class="modal-header">
    <h2 id="${escapeHtml(modalId)}-title">Accessibility Findings</h2>
    <button class="modal-close" aria-label="Close dialog" data-close-modal="${escapeHtml(modalId)}">&#x2715;</button>
  </div>
  <p><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.url)}</a></p>
  <p>Lighthouse Accessibility Score: ${entry.lighthouse_scores ? entry.lighthouse_scores.accessibility : '—'}</p>
  <p>Axe findings: ${axeFindings.length}</p>
  ${renderAxeFindingsList(axeFindings, entry.url, entry.page_load_count ?? 0, scanDate)}
  <p><a href="axe-findings.json">Download full axe findings JSON</a> | <a href="axe-findings.csv">Download full axe findings CSV</a></p>
  <div class="modal-footer">
    <button aria-label="Close dialog" data-close-modal="${escapeHtml(modalId)}">Close</button>
  </div>
</dialog>`;
}

function renderTopUrlModals(topUrls = [], scanDate = '') {
  return topUrls
    .slice(0, 100)
    .map((entry, index) =>
      (entry.findings_count ?? 0) > 0 ? renderUrlModal(entry, `modal-url-${index}`, scanDate) : ''
    )
    .join('\n');
}

/**
 * Render small inline technology badges for a single URL row.
 * Shows CMS name and/or USWDS version if detected.
 *
 * @param {object|null} tech - detected_technologies object
 * @returns {string} HTML string
 */
function renderTechBadges(tech) {
  if (!tech) {
    return '';
  }

  const parts = [];

  if (tech.cms) {
    parts.push(`<span class="tech-badge tech-badge-cms" title="CMS: ${escapeHtml(tech.cms)}">${escapeHtml(tech.cms)}</span>`);
  }

  if (tech.uswds?.detected) {
    const label = tech.uswds.version ? `USWDS ${escapeHtml(tech.uswds.version)}` : 'USWDS';
    parts.push(`<span class="tech-badge tech-badge-uswds" title="U.S. Web Design System${tech.uswds.version ? ` v${escapeHtml(tech.uswds.version)}` : ''}">${label}</span>`);
  }

  return parts.join(' ');
}

/**
 * Render a summary section listing detected technologies across all scanned URLs.
 *
 * @param {object} report
 * @returns {string} HTML section or empty string when no data
 */
function renderTechSummarySection(report) {
  const summary = report.tech_summary;
  if (!summary) {
    return '';
  }

  const { cms_counts = {}, uswds_count = 0, uswds_versions = [], total_scanned = 0 } = summary;
  const cmsEntries = Object.entries(cms_counts).sort((a, b) => b[1] - a[1]);

  if (cmsEntries.length === 0 && uswds_count === 0) {
    return '';
  }

  const cmsRows = cmsEntries
    .map(
      ([name, count]) =>
        `<tr><td data-label="CMS">${escapeHtml(name)}</td><td data-label="URLs">${count}</td><td data-label="Share">${total_scanned > 0 ? Math.round((count / total_scanned) * 100) : 0}%</td></tr>`
    )
    .join('\n');

  const uswdsVersionList =
    uswds_versions.length > 0
      ? `<p>Observed USWDS versions: ${uswds_versions.map((v) => `<strong>${escapeHtml(v)}</strong>`).join(', ')}. The latest release is available at <a href="https://github.com/uswds/uswds/releases" target="_blank" rel="noreferrer">github.com/uswds/uswds/releases</a>.</p>`
      : '';

  return `
  <section aria-labelledby="tech-summary-heading">
    <h2 id="tech-summary-heading">Detected Technologies${renderAnchorLink('tech-summary-heading', 'Detected Technologies')}</h2>
    <p>Technology signals detected from the network requests loaded by each scanned URL. CMS detection identifies WordPress, Drupal, and Joomla from characteristic asset paths. USWDS detection identifies use of the <a href="https://designsystem.digital.gov/" target="_blank" rel="noreferrer">U.S. Web Design System</a>.</p>
    ${cmsEntries.length > 0 ? wrapTable(`<table>
      <caption>CMS platform counts across ${total_scanned} successfully scanned URLs</caption>
      <thead><tr><th scope="col">CMS</th><th scope="col">URLs</th><th scope="col">Share</th></tr></thead>
      <tbody>${cmsRows}</tbody>
    </table>`) : ''}
    <p>USWDS detected on <strong>${uswds_count}</strong> of <strong>${total_scanned}</strong> scanned URL${total_scanned !== 1 ? 's' : ''}${total_scanned > 0 ? ` (${Math.round((uswds_count / total_scanned) * 100)}%)` : ''}.</p>
    ${uswdsVersionList}
  </section>`;
}

function renderTopUrlRows(topUrls = []) {
  return topUrls
    .slice(0, 100)
    .map(
      (entry, index) => {
        const findingsCount = entry.findings_count ?? 0;
        const techBadges = renderTechBadges(entry.detected_technologies);
        const orgLine = entry.organization_name
          ? `<span class="url-org">${escapeHtml(entry.organization_name)}</span>`
          : '';
        return `<tr>
  <td class="url-cell" data-label="URL"><a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(entry.url)}</a>${orgLine}</td>
  <td data-label="Traffic">${entry.page_load_count}</td>
  ${renderCwvCell(entry.core_web_vitals_status)}
  ${renderPerformanceCell(entry)}
  ${renderAccessibilityImportantCell(entry)}
  <td data-label="Axe details">${findingsCount > 0 ? `<button class="details-btn" aria-haspopup="dialog" data-open-modal="modal-url-${index}">Details (${findingsCount})</button>` : ''}</td>
  ${renderLighthouseScoreCell(entry.lighthouse_scores, 'best_practices', 'Best Practices')}
  ${renderLighthouseScoreCell(entry.lighthouse_scores, 'seo', 'SEO')}
  <td data-label="Technologies">${techBadges}</td>
</tr>`;
      }
    )
    .join('\n');
}

function renderDapContextSection() {
  return `
  <section aria-labelledby="dap-context-heading">
    <h2 id="dap-context-heading">About These Reports${renderAnchorLink('dap-context-heading', 'About These Reports')}</h2>
    <p>The <strong>Digital Analytics Program (DAP)</strong> is a U.S. government analytics service that collects website traffic data across participating federal agencies. DAP tracks page views, visitor counts, and usage patterns for hundreds of government websites, providing transparency into how the public engages with federal digital services.</p>
    <p>This report measures the <strong>quality and accessibility</strong> of the top 100 most-visited U.S. government URLs as reported by DAP. Each day, Lighthouse scans are run against these URLs to measure:</p>
    <ul>
      <li><strong>Performance</strong> - How fast pages load for users (scores 0-100, higher is better)</li>
      <li><strong>Accessibility</strong> - How well pages work for users with disabilities, following WCAG guidelines (scores 0-100, higher is better)</li>
      <li><strong>Best Practices</strong> - Whether pages follow modern web development standards (scores 0-100, higher is better)</li>
      <li><strong>SEO</strong> - How well pages are optimized for search engines (scores 0-100, higher is better)</li>
    </ul>
    <p>Accessibility findings come from <a href="https://www.deque.com/axe/" target="_blank" rel="noreferrer">axe-core</a>, the industry-standard accessibility testing engine embedded in Lighthouse. The <strong>axe findings</strong> surface specific WCAG violations such as missing alternative text, insufficient color contrast, and missing form labels that make government websites harder to use for people with disabilities.</p>
    <p>Traffic data reflects daily visitor counts from DAP. URLs are ranked by page load count, ensuring the most-used government pages are prioritized for quality measurement.</p>
  </section>`;
}

function renderDayComparisonSection(report) {
  const currentDate = report.run_date;
  const historySeries = report.history_series ?? [];

  // Collect all history entries with non-zero scores, excluding the current run date
  const historyEntries = historySeries.filter((entry) => {
    if (entry.date >= currentDate) return false;
    const s = entry.aggregate_scores;
    return s && (s.performance !== 0 || s.accessibility !== 0 || s.best_practices !== 0 || s.seo !== 0);
  });

  if (historyEntries.length === 0) {
    return '';
  }

  const dayCount = historyEntries.length;

  // Calculate historical averages across all available history days
  const totals = { performance: 0, accessibility: 0, best_practices: 0, seo: 0 };
  for (const entry of historyEntries) {
    totals.performance += entry.aggregate_scores.performance;
    totals.accessibility += entry.aggregate_scores.accessibility;
    totals.best_practices += entry.aggregate_scores.best_practices;
    totals.seo += entry.aggregate_scores.seo;
  }
  const avg = {
    performance: roundScore(totals.performance / dayCount),
    accessibility: roundScore(totals.accessibility / dayCount),
    best_practices: roundScore(totals.best_practices / dayCount),
    seo: roundScore(totals.seo / dayCount)
  };

  const curr = report.aggregate_scores;
  const heading = `Comparison with ${dayCount}-Day Average`;

  function scoreDelta(current, average) {
    const delta = Math.round((current - average) * 100) / 100;
    if (delta > 0) return `<span style="color:#2e7d32" aria-label="increased by ${delta}">+${delta}</span>`;
    if (delta < 0) return `<span style="color:#c62828" aria-label="decreased by ${Math.abs(delta)}">${delta}</span>`;
    return `<span style="color:#555" aria-label="no change">0</span>`;
  }

  return `
  <section aria-labelledby="day-comparison-heading">
    <h2 id="day-comparison-heading">${escapeHtml(heading)}${renderAnchorLink('day-comparison-heading', heading)}</h2>
    ${wrapTable(`<table>
      <caption>Score comparison between ${escapeHtml(currentDate)} and the ${dayCount}-day average</caption>
      <thead>
        <tr>
          <th scope="col">Metric</th>
          <th scope="col">${escapeHtml(currentDate)}</th>
          <th scope="col">${dayCount}-day avg</th>
          <th scope="col">Change</th>
        </tr>
      </thead>
      <tbody>
        <tr><td data-label="Metric">Performance</td><td data-label="Today">${curr.performance}</td><td data-label="${dayCount}-day avg">${avg.performance}</td><td data-label="Change">${scoreDelta(curr.performance, avg.performance)}</td></tr>
        <tr><td data-label="Metric">Accessibility</td><td data-label="Today">${curr.accessibility}</td><td data-label="${dayCount}-day avg">${avg.accessibility}</td><td data-label="Change">${scoreDelta(curr.accessibility, avg.accessibility)}</td></tr>
        <tr><td data-label="Metric">Best Practices</td><td data-label="Today">${curr.best_practices}</td><td data-label="${dayCount}-day avg">${avg.best_practices}</td><td data-label="Change">${scoreDelta(curr.best_practices, avg.best_practices)}</td></tr>
        <tr><td data-label="Metric">SEO</td><td data-label="Today">${curr.seo}</td><td data-label="${dayCount}-day avg">${avg.seo}</td><td data-label="Change">${scoreDelta(curr.seo, avg.seo)}</td></tr>
      </tbody>
    </table>`)}
    <p>See the full score trend in the <a href="#history-heading">History</a> section below.</p>
  </section>`;
}

function buildAxePatternCounts(topUrls = []) {
  const counts = new Map();
  for (const entry of topUrls) {
    const pageLoads = entry.page_load_count ?? 0;
    const url = entry.url ?? '';
    for (const finding of entry.axe_findings ?? []) {
      const existing = counts.get(finding.id);
      if (existing) {
        existing.count += 1;
        existing.total_page_loads += pageLoads;
        existing.title = finding.title;
        if (url) existing.affected_urls.push(url);
      } else {
        counts.set(finding.id, { id: finding.id, title: finding.title, count: 1, total_page_loads: pageLoads, affected_urls: url ? [url] : [] });
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count);
}

function renderUrlCountCell(p) {
  const count = p.count;
  if (!p.affected_urls || p.affected_urls.length === 0) {
    return String(count);
  }
  const tooltipId = `url-tip-${_urlCountTooltipSeq++}`;
  const domains = p.affected_urls.map((u) => {
    try { return new URL(u).hostname; } catch { return ''; }
  }).filter(Boolean);
  const tooltipText = `Affected sites: ${domains.join(', ')}`;
  return `<span class="url-count-trigger" tabindex="0" aria-label="${escapeHtml(String(count))} URLs affected" aria-describedby="${tooltipId}">${escapeHtml(String(count))}<span id="${tooltipId}" role="tooltip" class="url-count-tooltip">${escapeHtml(tooltipText)}</span></span>`;
}

function renderFpcCodes(ruleId, totalPageLoads = 0, prevalenceRates = {}) {
  const codes = AXE_TO_FPC.get(ruleId);
  if (!codes || codes.length === 0) {
    return '<em>unknown</em>';
  }
  const badges = codes
    .map((code) => {
      const label = FPC_LABELS[code] ?? code;
      const description = FPC_DESCRIPTIONS[code] ?? '';
      const svg = FPC_SVGS[code];
      const rate = prevalenceRates[code] ?? 0;
      const estimated = totalPageLoads > 0 && rate > 0 ? Math.round(totalPageLoads * rate) : null;
      const tooltipParts = [];
      if (description) tooltipParts.push(description);
      if (estimated !== null) {
        tooltipParts.push(
          `Estimated ~${estimated.toLocaleString('en-US')} people potentially excluded ` +
          `(${(rate * 100).toFixed(1)}% prevalence \u00d7 ${totalPageLoads.toLocaleString('en-US')} affected page loads)`
        );
      }
      const tooltipContent = tooltipParts.join('. ');
      const estimateHtml = estimated !== null
        ? `<span class="disability-estimate" aria-hidden="true">~${formatCompact(estimated)}</span>`
        : '';
      if (svg) {
        const tooltipId = `fpc-tip-${code}-${_fpcTooltipSeq++}`;
        const decorativeSvg = makeDecorativeSvg(svg);
        const tooltipSpan = tooltipContent
          ? `<span id="${tooltipId}" role="tooltip" class="disability-tooltip">${escapeHtml(tooltipContent)}</span>`
          : '';
        const describedBy = tooltipContent ? ` aria-describedby="${tooltipId}"` : '';
        return `<span class="disability-badge" tabindex="0" aria-label="${escapeHtml(label)}"${describedBy}>${decorativeSvg}${estimateHtml}${tooltipSpan}</span>`;
      }
      const abbr_tooltip = [label, description].filter(Boolean).join('. ');
      return `<abbr title="${escapeHtml(abbr_tooltip)}">${escapeHtml(code)}${estimateHtml}</abbr>`;
    })
    .join(' ');
  return `<span class="disability-badges">${badges}</span>`;
}

function renderAxePolicyNarratives(topPatterns) {
  const entries = topPatterns
    .map((p) => {
      const narrative = getPolicyNarrative(p.id);
      if (!narrative) return '';
      const demographics = Array.isArray(narrative.affected_demographics)
        ? `<ul class="axe-demographics">${narrative.affected_demographics.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`
        : '';
      return `<div class="axe-narrative">
      <h3 class="axe-narrative-title"><code>${escapeHtml(p.id)}</code>: ${escapeHtml(narrative.title)}</h3>
      <p class="axe-narrative-body">${escapeHtml(narrative.why_it_matters.trim())}</p>
      ${demographics ? `<p><strong>Affected groups:</strong></p>${demographics}` : ''}
    </div>`;
    })
    .filter(Boolean)
    .join('\n');

  if (!entries) return '';

  return `
    <details class="axe-narratives-details">
      <summary>Human impact narratives for top issues</summary>
      <p>The following narratives describe the real-world impact of each accessibility barrier on people with disabilities. These barriers are not abstract technical failures; they prevent citizens from independently accessing government services.</p>
      ${entries}
    </details>`;
}

function renderAxePatternsSection(topUrls = []) {
  const patterns = buildAxePatternCounts(topUrls);

  if (patterns.length === 0) {
    return '';
  }

  const topPatterns = patterns.slice(0, 10);
  const prevalenceRates = getFpcPrevalenceRates();

  const rows = topPatterns
    .map(
      (p) =>
        `<tr><td data-label="Rule ID"><code>${escapeHtml(p.id)}</code></td><td data-label="Description">${escapeHtml(p.title)}</td><td data-label="URLs affected">${renderUrlCountCell(p)}</td><td data-label="Disabilities Affected">${renderFpcCodes(p.id, p.total_page_loads, prevalenceRates)}</td></tr>`
    )
    .join('\n');

  return `
  <section aria-labelledby="axe-patterns-heading">
    <h2 id="axe-patterns-heading">Common Accessibility Issues (Top ${topPatterns.length})${renderAnchorLink('axe-patterns-heading', `Common Accessibility Issues (Top ${topPatterns.length})`)}</h2>
    <p>The following axe-core rules were most frequently violated across scanned URLs today. These patterns indicate systemic accessibility barriers present across multiple government websites.</p>
    ${wrapTable(`<table>
      <caption>Top axe-core accessibility rule violations across scanned URLs</caption>
      <thead>
        <tr>
          <th scope="col">Rule ID</th>
          <th scope="col">Description</th>
          <th scope="col">URLs affected</th>
          <th scope="col" class="wrap-header">Disabilities Affected <span style="font-weight:normal;font-size:0.8em">(hover/focus icons for estimated impact)</span></th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`)}
    ${renderAxePolicyNarratives(topPatterns)}
    <details>
      <summary>Disability icon key</summary>
      <dl class="disability-legend">
        ${Object.entries(FPC_LABELS)
          .map(([code, label]) => {
            const svg = FPC_SVGS[code] ?? '';
            const description = FPC_DESCRIPTIONS[code] ?? '';
            const fpcData = CENSUS_DISABILITY_STATS.fpc_rates[code];
            const prevalenceText = fpcData
              ? ` <span class="fpc-prevalence">(${(fpcData.rate * 100).toFixed(1)}% of U.S. population &mdash; ~${Number(fpcData.estimated_population).toLocaleString('en-US')} Americans)</span>`
              : '';
            return `<dt>${svg}</dt><dd><strong>${escapeHtml(label)}</strong>${description ? ` &mdash; ${escapeHtml(description)}` : ''}${prevalenceText}</dd>`;
          })
          .join('\n        ')}
      </dl>
      <p>These icons show which groups of people with disabilities are excluded by each accessibility barrier.
         Where page view data is available, each icon shows an estimated number of people potentially excluded
         (page loads for affected URLs &times; disability prevalence rate from U.S. Census ACS ${CENSUS_DISABILITY_STATS.vintage_year}).
         Hover over or focus an icon to see the full estimate and methodology.
         Icons follow the Section 508 Functional Performance Criteria and the equivalent EU EN 301 549 v3.2.1 Table B.2 categories.</p>
      <p>Prevalence data: <a href="${escapeHtml(CENSUS_DISABILITY_STATS.source_url)}" target="_blank" rel="noreferrer">${escapeHtml(CENSUS_DISABILITY_STATS.source)}</a>;
         supplemental data from <abbr title="Centers for Disease Control and Prevention">CDC</abbr>,
         <abbr title="National Institute on Deafness and Other Communication Disorders">NIDCD</abbr>,
         <abbr title="American Foundation for the Blind">AFB</abbr>, and
         <abbr title="National Eye Institute / National Institutes of Health">NIH/NEI</abbr>.
         U.S. population base: ~${Number(CENSUS_DISABILITY_STATS.us_population).toLocaleString('en-US')} (${CENSUS_DISABILITY_STATS.vintage_year} estimate). Reviewed annually.</p>
      <p>See the <a href="https://www.section508.gov/develop/mapping-wcag-to-fpc/" target="_blank" rel="noreferrer">Section 508 WCAG to FPC mapping</a>
         for additional detail on how accessibility requirements map to functional needs.</p>
    </details>
    <p><a href="axe-findings.json">Download full axe findings JSON for this day</a> | <a href="axe-findings.csv">Download full axe findings CSV for this day</a></p>
  </section>`;
}

/**
 * Builds a frequency map of NN/g usability heuristics across the top axe patterns.
 * Each pattern is mapped to its relevant heuristics via WCAG SC, and the total
 * URL count for each pattern is accumulated per heuristic.
 *
 * @param {Array} topUrls - array of top URL scan result objects
 * @returns {Array<{heuristic: object, pattern_count: number, url_count: number, rule_ids: string[]}>}
 */
export function buildUsabilityHeuristicsCounts(topUrls = []) {
  const patterns = buildAxePatternCounts(topUrls);
  const topPatterns = patterns.slice(0, 10);

  // Map heuristic id -> accumulated data
  const heuristicMap = new Map();
  for (const p of topPatterns) {
    const heuristics = getHeuristicsForAxeRule(p.id);
    for (const h of heuristics) {
      const existing = heuristicMap.get(h.id);
      if (existing) {
        existing.pattern_count += 1;
        existing.url_count += p.count;
        if (!existing.rule_ids.includes(p.id)) existing.rule_ids.push(p.id);
      } else {
        heuristicMap.set(h.id, {
          heuristic: h,
          pattern_count: 1,
          url_count: p.count,
          rule_ids: [p.id],
        });
      }
    }
  }

  return [...heuristicMap.values()].sort((a, b) => b.url_count - a.url_count || b.pattern_count - a.pattern_count);
}

function renderUsabilityHeuristicsSection(topUrls = []) {
  const counts = buildUsabilityHeuristicsCounts(topUrls);

  if (counts.length === 0) {
    return '';
  }

  const rows = counts
    .map((entry) => {
      const h = entry.heuristic;
      const ruleList = entry.rule_ids.map((id) => `<code>${escapeHtml(id)}</code>`).join(', ');
      return `<tr>
        <td data-label="#">${escapeHtml(String(h.id))}</td>
        <td data-label="Heuristic"><a href="${escapeHtml(h.url)}" target="_blank" rel="noreferrer">${escapeHtml(h.name)}</a></td>
        <td data-label="Issue patterns">${escapeHtml(String(entry.pattern_count))}</td>
        <td data-label="URL violations">${escapeHtml(String(entry.url_count))}</td>
        <td data-label="Related axe rules">${ruleList}</td>
      </tr>`;
    })
    .join('\n');

  const allHeuristicRows = NNG_HEURISTICS.map((h) => {
    const found = counts.find((c) => c.heuristic.id === h.id);
    if (found) return null;
    return `<tr>
      <td data-label="#">${escapeHtml(String(h.id))}</td>
      <td data-label="Heuristic"><a href="${escapeHtml(h.url)}" target="_blank" rel="noreferrer">${escapeHtml(h.name)}</a></td>
      <td data-label="Issue patterns">0</td>
      <td data-label="URL violations">0</td>
      <td data-label="Related axe rules">&#x2014;</td>
    </tr>`;
  }).filter(Boolean).join('\n');

  return `
  <section aria-labelledby="usability-heuristics-heading">
    <h2 id="usability-heuristics-heading">Usability Heuristics Summary${renderAnchorLink('usability-heuristics-heading', 'Usability Heuristics Summary')}</h2>
    <p>The most common accessibility violations map to <a href="https://www.nngroup.com/articles/ten-usability-heuristics/" target="_blank" rel="noreferrer">Nielsen Norman Group's 10 usability heuristics</a>. This table shows which heuristics are most affected by today's top axe-core violations, helping to identify where systemic usability barriers exist.</p>
    ${wrapTable(`<table>
      <caption>NN/g usability heuristics affected by today's top accessibility violations</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Heuristic</th>
          <th scope="col">Issue patterns</th>
          <th scope="col">URL violations</th>
          <th scope="col">Related axe rules</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`)}
    ${allHeuristicRows ? `<details>
      <summary>Heuristics with no violations today</summary>
      ${wrapTable(`<table>
        <caption>NN/g usability heuristics with no violations in today's top 10 axe patterns</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Heuristic</th>
            <th scope="col">Issue patterns</th>
            <th scope="col">URL violations</th>
            <th scope="col">Related axe rules</th>
          </tr>
        </thead>
        <tbody>
          ${allHeuristicRows}
        </tbody>
      </table>`)}
    </details>` : ''}
  </section>`;
}

function renderNarrativeSection(report) {
  const historySeries = report.history_series ?? [];
  const nonZero = historySeries.filter(hasNonZeroScores);

  if (nonZero.length < 2) {
    return '';
  }

  const oldest = nonZero[0];
  const newest = nonZero[nonZero.length - 1];
  const dayCount = nonZero.length;

  const accessDelta = Math.round((newest.aggregate_scores.accessibility - oldest.aggregate_scores.accessibility) * 100) / 100;
  const perfDelta = Math.round((newest.aggregate_scores.performance - oldest.aggregate_scores.performance) * 100) / 100;

  function trend(delta) {
    if (delta > 0.5) return 'improved';
    if (delta < -0.5) return 'declined';
    return 'remained stable';
  }

  const accessTrend = trend(accessDelta);
  const perfTrend = trend(perfDelta);

  const accessDeltaText = accessDelta >= 0 ? `+${accessDelta}` : `${accessDelta}`;
  const perfDeltaText = perfDelta >= 0 ? `+${perfDelta}` : `${perfDelta}`;

  return `
  <section aria-labelledby="narrative-heading">
    <h2 id="narrative-heading">Accessibility Trend Narrative${renderAnchorLink('narrative-heading', 'Accessibility Trend Narrative')}</h2>
    <p>Over the past <strong>${dayCount} days</strong> of data (${escapeHtml(oldest.date)} to ${escapeHtml(newest.date)}), government website accessibility scores have <strong>${accessTrend}</strong> (${accessDeltaText} points, from ${oldest.aggregate_scores.accessibility} to ${newest.aggregate_scores.accessibility}). Performance scores have ${perfTrend} (${perfDeltaText} points, from ${oldest.aggregate_scores.performance} to ${newest.aggregate_scores.performance}).</p>
    <p>Today's aggregate accessibility score of <strong>${report.aggregate_scores.accessibility}</strong> reflects the mean Lighthouse accessibility score across ${report.url_counts.succeeded} successfully scanned government URLs. A score above 90 indicates generally strong compliance with WCAG automated checks, though manual testing is always recommended to fully assess accessibility.</p>
  </section>`;
}

function renderExecutionErrorNotice(report) {
  const diagnostics = report?.scan_diagnostics;
  if (!diagnostics) {
    return '';
  }

  const failedCount = diagnostics.failed_count ?? 0;
  const executionErrorCount = diagnostics.failure_reasons?.execution_error ?? 0;
  const successCount = diagnostics.success_count ?? 0;

  if (failedCount < 1 || successCount > 0 || executionErrorCount !== failedCount) {
    return '';
  }

  return `<p><strong>Scanner notice:</strong> All scans failed with execution errors, so Lighthouse scores are unavailable for this run. This usually indicates the runtime browser dependency for Lighthouse was unavailable during execution.</p>`;
}

function formatTimestamp(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return escapeHtml(date.toISOString());
}

function renderComplianceContextSection() {
  return `
  <section aria-labelledby="compliance-context-heading">
    <h2 id="compliance-context-heading">Section 508: Legal Requirements vs. Best Practices${renderAnchorLink('compliance-context-heading', 'Section 508: Legal Requirements vs. Best Practices')}</h2>
    <p>
      <a href="https://www.section508.gov/" target="_blank" rel="noreferrer">Section 508 of the Rehabilitation Act</a>
      was enacted in <strong>1998</strong> and requires U.S. federal agencies to make their electronic and information
      technology accessible to people with disabilities. The technical standards were significantly updated through the
      <a href="https://www.access-board.gov/ict/" target="_blank" rel="noreferrer">ICT Accessibility Standards refresh</a>,
      which became effective in <strong>January 2018</strong> &mdash; the same year Apple celebrated the 10th anniversary
      of the iPhone. That refresh incorporated
      <a href="https://www.w3.org/TR/WCAG20/" target="_blank" rel="noreferrer">WCAG 2.0 Level AA</a>
      (published in 2008) as the baseline for web content.
    </p>
    <p>
      The web has changed dramatically since then. What agencies are <strong>legally required</strong> to meet today
      is built on a standard from 2008 &mdash; the same era as the original iPhone. Agencies should treat WCAG 2.0 AA
      as the <em>floor</em>, not the ceiling.
    </p>
    <div class="compliance-context-grid">
      <div class="compliance-card compliance-card--legal">
        <h3>Legal Requirement</h3>
        <p><strong>WCAG 2.0 Level AA</strong> (published 2008)</p>
        <p>Referenced by the Section 508 ICT Standards refresh (effective 2018). Agencies must meet these 38 success
        criteria to satisfy their Section 508 obligations for web content.</p>
        <ul>
          <li>Text alternatives for non-text content</li>
          <li>Captions and audio descriptions for multimedia</li>
          <li>Keyboard accessibility and focus management</li>
          <li>Minimum color contrast (4.5:1 for normal text)</li>
          <li>No seizure-inducing content</li>
          <li>Consistent navigation and labeling</li>
          <li>Error identification and correction</li>
        </ul>
        <p><a href="https://www.access-board.gov/ict/#E205-content" target="_blank" rel="noreferrer">Section 508 web content requirements (E205)</a></p>
      </div>
      <div class="compliance-card compliance-card--best-practices">
        <h3>Best Practices</h3>
        <p><strong>WCAG 2.1 and 2.2 Level AA</strong> (published 2018 and 2023)</p>
        <p>These later versions add criteria that reflect how the web actually works today &mdash; mobile devices,
        cognitive accessibility, and modern authentication patterns &mdash; and are strongly recommended for any agency
        aiming to serve all Americans.</p>
        <ul>
          <li><strong>WCAG 2.1 (2018):</strong> 17 new criteria for mobile, low vision, and cognitive accessibility</li>
          <li><strong>WCAG 2.2 (2023):</strong> 9 more criteria for authentication and cognitive tasks, removing the
          outdated "Parsing" criterion</li>
          <li>W3C now recommends WCAG 2.2 as the current normative standard for new and updated content</li>
        </ul>
        <p><a href="https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/" target="_blank" rel="noreferrer">What is new in WCAG 2.2</a> &middot;
        <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noreferrer">WCAG 2.2 specification</a></p>
      </div>
    </div>
    <p>
      The scores and findings in this report are based on automated checks aligned with WCAG 2.x rules surfaced by
      axe-core. Passing automated checks is necessary but not sufficient: manual testing with assistive technologies
      is required to verify true conformance and to catch barriers that automation cannot detect.
    </p>
  </section>`;
}

function renderCallToActionSection(report) {
  const exclusion = report.fpc_exclusion;
  const totalExcluded = exclusion?.categories
    ? roundDownConservatively(Object.values(exclusion.categories).reduce((sum, d) => sum + (d.estimated_excluded_users ?? 0), 0))
    : null;

  const totalFindings = (report.top_urls ?? []).reduce((sum, u) => sum + (u.axe_findings?.length ?? 0), 0);

  const statsIntro =
    totalExcluded !== null && totalExcluded > 0
      ? `<p>Today's scan identified <strong>${totalFindings.toLocaleString('en-US')} accessibility barrier${totalFindings !== 1 ? 's' : ''}</strong> across the most-visited U.S. government websites, affecting an estimated <strong>${totalExcluded.toLocaleString('en-US')} Americans with disabilities</strong>. Here is how you can help.</p>`
      : `<p>Here is how you can help improve accessibility on U.S. government websites.</p>`;

  return `
  <section aria-labelledby="cta-heading">
    <h2 id="cta-heading">Take Action${renderAnchorLink('cta-heading', 'Take Action')}</h2>
    ${statsIntro}
    <ul>
      <li><strong>Read the federal accessibility report.</strong> The <a href="https://www.section508.gov/manage/section-508-assessment/2025/message-from-gsa-administrator/" target="_blank" rel="noreferrer">2025 Governmentwide Section 508 Assessment</a> from the GSA Administrator details the state of federal accessibility compliance and the steps agencies are taking to improve.</li>
      <li><strong>Submit URLs you care about.</strong> Want specific government pages included in future scans? <a href="https://mgifford.github.io/open-scans/" target="_blank" rel="noreferrer">Submit them to the Open Scans project</a> to help broaden coverage.</li>
      <li><strong>Test with free tools.</strong> Do your own automated and manual accessibility testing with <a href="https://accessibilityinsights.io/" target="_blank" rel="noreferrer">Accessibility Insights</a> and <a href="https://chromewebstore.google.com/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk?pli=1" target="_blank" rel="noreferrer">Google Lighthouse</a>. Automated tools catch a significant portion of WCAG failures quickly; manual review with assistive technologies catches the rest.</li>
      <li><strong>Adopt and update the U.S. Web Design System (USWDS).</strong> The <a href="https://designsystem.digital.gov/" target="_blank" rel="noreferrer">USWDS</a> is already a strong foundation for accessible, consistent federal websites, but many agencies have not adopted it or are running outdated versions. Encourage your agency to adopt or upgrade so every American benefits from its accessibility work.</li>
      <li><strong>Hire people with disabilities.</strong> People with disabilities are the ultimate experts on digital barriers. Bringing them into design, engineering, and testing teams &mdash; not just as consultants but as full-time employees &mdash; leads to more accessible products and services for everyone.</li>
    </ul>
  </section>`;
}

export function renderDailyReportPage(report) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily DAP Report - ${escapeHtml(report.run_date)}</title>
  <meta name="description" content="Daily accessibility and performance scan results for the top U.S. government URLs on ${escapeHtml(report.run_date)}, powered by Lighthouse and axe-core." />
  ${renderColorSchemeSetup()}
  ${renderSharedStyles()}
</head>
<body>
  ${renderSiteHeader()}
  <div class="print-only print-dashboard-notice">
    <p>This report was generated by Daily DAP. For the latest report and interactive dashboard, visit: <a href="${DASHBOARD_URL}">${DASHBOARD_URL}</a></p>
  </div>
  <main id="main-content" class="site-main">
    <div class="page-intro">
      <h1 id="page-title">Daily DAP Accessibility Report &mdash; ${escapeHtml(report.run_date)}${renderAnchorLink('page-title', `Daily DAP Accessibility Report \u2014 ${report.run_date}`)}</h1>
      <p>Run ID: ${escapeHtml(report.run_id)} &middot; Status: ${escapeHtml(report.report_status)} &middot; Source data: ${escapeHtml(report.source_data_date ?? report.run_date)} &middot; Generated: ${formatTimestamp(report.generated_at)}</p>
    </div>

    ${renderDapContextSection()}

    ${renderNarrativeSection(report)}

    ${renderDayComparisonSection(report)}

    ${renderAxePatternsSection(report.top_urls)}

    ${renderUsabilityHeuristicsSection(report.top_urls)}

    <section aria-labelledby="scores-heading">
      <h2 id="scores-heading">Aggregate Scores${renderAnchorLink('scores-heading', 'Aggregate Scores')}</h2>
      ${renderExecutionErrorNotice(report)}
      <div class="score-grid">
        <div class="score-card">
          <div class="score-label">Performance</div>
          <div class="score-value">${report.aggregate_scores.performance}</div>
        </div>
        <div class="score-card">
          <div class="score-label">Accessibility</div>
          <div class="score-value">${report.aggregate_scores.accessibility}</div>
        </div>
        <div class="score-card">
          <div class="score-label">Best Practices</div>
          <div class="score-value">${report.aggregate_scores.best_practices}</div>
        </div>
        <div class="score-card">
          <div class="score-label">SEO</div>
          <div class="score-value">${report.aggregate_scores.seo}</div>
        </div>
      </div>
      <ul>
        <li>Processed: ${report.url_counts.processed}</li>
        <li>Succeeded: ${report.url_counts.succeeded}</li>
        <li>Failed: ${report.url_counts.failed}</li>
        <li>Excluded: ${report.url_counts.excluded}</li>
      </ul>
    </section>

    ${renderFpcExclusionSection(report)}

    ${renderPerformanceImpactSection(report)}

    <section aria-labelledby="history-heading">
      <h2 id="history-heading">History${renderAnchorLink('history-heading', 'History')}</h2>
      ${renderHistoryChart(report.history_series)}
      <p><a href="lighthouse-history.csv">Download full Lighthouse history CSV</a> &middot; For the average comparison, see the <a href="#day-comparison-heading">Comparison with Average</a> section above.</p>
      ${wrapTable(`<table>
        <caption>Daily aggregate Lighthouse scores (14 most-recent days)</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Performance</th><th scope="col">Accessibility</th><th scope="col">Best Practices</th><th scope="col">SEO</th></tr></thead>
        <tbody>
          ${renderHistoryRows(report.history_series)}
        </tbody>
      </table>`)}
    </section>

    <section aria-labelledby="top-urls-heading">
      <h2 id="top-urls-heading">Top URLs by Traffic (Scanned)${renderAnchorLink('top-urls-heading', 'Top URLs by Traffic (Scanned)')}</h2>
      <p>Showing up to ${Math.min((report.top_urls ?? []).length, 100)} highest-traffic URLs from the latest available DAP day in this run.</p>
      <p><strong>Note:</strong> CWV = Core Web Vitals (measures page loading performance including Largest Contentful Paint, Cumulative Layout Shift, and Interaction to Next Paint). Lighthouse scores are 0&ndash;100 (higher is better). The <strong>Accessibility / Important</strong> column shows the Lighthouse accessibility score; if Critical or Serious axe findings exist the count appears after the slash (e.g.&nbsp;94&thinsp;/&thinsp;2). Click <strong>Details&nbsp;(N)</strong> to view WCAG accessibility findings for each URL.</p>
      <p><a href="axe-findings.json">Download axe findings JSON for this day</a> | <a href="axe-findings.csv">Download axe findings CSV for this day</a></p>
      ${wrapTable(`<table id="top-urls-table">
        <caption>Top government URLs by daily traffic with Lighthouse scan results</caption>
        <thead>
          <tr>
            <th scope="col" data-sort-col="0" aria-sort="none"><button class="sort-btn">URL</button></th>
            <th scope="col" data-sort-col="1" aria-sort="none"><button class="sort-btn">Traffic</button></th>
            <th scope="col" data-sort-col="2" aria-sort="none"><button class="sort-btn">CWV</button></th>
            <th scope="col" data-sort-col="3" aria-sort="none"><button class="sort-btn">Performance</button></th>
            <th scope="col" data-sort-col="4" aria-sort="none" class="col-has-info"><button class="sort-btn">Accessibility /<br><span class="col-subhead">Important</span></button><span class="col-info-anchor" tabindex="0" aria-describedby="tip-acc-important" aria-label="More information about this column"><span aria-hidden="true" class="col-info-icon">&#9432;</span><span role="tooltip" id="tip-acc-important" class="col-tooltip">Lighthouse accessibility score (0&ndash;100). If any Critical or Serious axe findings exist, the count is shown after the slash&nbsp;(e.g.&nbsp;94&thinsp;/&thinsp;2).</span></span></th>
            <th scope="col">Axe details</th>
            <th scope="col" data-sort-col="6" aria-sort="none"><button class="sort-btn">Best Practices</button></th>
            <th scope="col" data-sort-col="7" aria-sort="none"><button class="sort-btn">SEO</button></th>
            <th scope="col">Technologies</th>
          </tr>
        </thead>
        <tbody>
          ${renderTopUrlRows(report.top_urls)}
        </tbody>
      </table>`)}
    </section>

    ${renderTechSummarySection(report)}

    ${renderComplianceContextSection()}

    ${renderCallToActionSection(report)}
  </main>

  ${renderTopUrlModals(report.top_urls, report.run_date)}

  ${renderSiteFooter()}

  <script>
    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('[data-open-modal]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var dialog = document.getElementById(btn.dataset.openModal);
          if (dialog) { dialog.showModal(); }
        });
      });
      document.querySelectorAll('[data-close-modal]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var modalId = btn.dataset.closeModal;
          var dialog = document.getElementById(modalId);
          if (dialog) {
            dialog.close();
            var opener = document.querySelector('[data-open-modal="' + modalId + '"]');
            if (opener) { opener.focus(); }
          }
        });
      });
      // Close modal when clicking the backdrop (outside the dialog content)
      document.querySelectorAll('.axe-modal').forEach(function (dialog) {
        dialog.addEventListener('click', function (e) {
          if (e.target === dialog) {
            var modalId = dialog.id;
            dialog.close();
            var opener = document.querySelector('[data-open-modal="' + modalId + '"]');
            if (opener) { opener.focus(); }
          }
        });
      });
      document.querySelectorAll('[data-copy-text]').forEach(function (btn) {
        // The 'click' event fires for both mouse clicks and keyboard activation (Enter/Space)
        // on <button> elements, so keyboard users receive the same visual feedback.
        btn.addEventListener('click', function () {
          var text = btn.dataset.copyText;
          if (!navigator.clipboard) { return; }
          navigator.clipboard.writeText(text).then(function () {
            var original = btn.textContent;
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(function () {
              btn.textContent = original;
              btn.classList.remove('copied');
            }, 2000);
          });
        });
      });

      // Sortable top-URLs table
      (function () {
        var table = document.getElementById('top-urls-table');
        if (!table) { return; }
        var tbody = table.querySelector('tbody');
        var currentCol = -1;
        var currentDir = 'none';
        // Columns whose values are numeric (Traffic, Performance, Accessibility/Important, Best Practices, SEO)
        var numericCols = [1, 3, 4, 6, 7];

        function getCellText(row, col) {
          var cells = row.querySelectorAll('td');
          if (!cells[col]) { return ''; }
          // Prefer explicit sort value when present (e.g. combined accessibility/important cell)
          var sortVal = cells[col].dataset.sortValue;
          if (sortVal !== undefined) { return sortVal; }
          return cells[col].textContent.trim();
        }

        function sortTable(col, dir) {
          table.querySelectorAll('th[data-sort-col]').forEach(function (th) {
            th.setAttribute('aria-sort', 'none');
          });
          var th = table.querySelector('th[data-sort-col="' + col + '"]');
          if (th) { th.setAttribute('aria-sort', dir); }
          currentCol = col;
          currentDir = dir;

          var isNumeric = numericCols.indexOf(col) !== -1;
          var rows = Array.from(tbody.querySelectorAll('tr'));
          rows.sort(function (a, b) {
            var aVal = getCellText(a, col);
            var bVal = getCellText(b, col);
            var cmp;
            if (isNumeric) {
              var aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
              var bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
              aNum = isNaN(aNum) ? -Infinity : aNum;
              bNum = isNaN(bNum) ? -Infinity : bNum;
              cmp = aNum - bNum;
            } else {
              cmp = aVal.localeCompare(bVal);
            }
            return dir === 'ascending' ? cmp : -cmp;
          });
          rows.forEach(function (row) { tbody.appendChild(row); });
        }

        table.querySelectorAll('th[data-sort-col]').forEach(function (th) {
          var btn = th.querySelector('.sort-btn');
          if (!btn) { return; }
          btn.addEventListener('click', function () {
            var col = parseInt(th.dataset.sortCol, 10);
            var dir = (currentCol === col && currentDir === 'ascending') ? 'descending' : 'ascending';
            sortTable(col, dir);
          });
        });
      }());
    });
  </script>
  ${renderThemeScript()}
</body>
</html>`;
}

export function renderDashboardPage({ latestReport, historyIndex = [], archiveUrl = null, archiveWindowDays = 14 }) {
  const historyLinks = historyIndex
    .map((entry) => `<li><a href="./daily/${entry.run_date}/index.html">${escapeHtml(entry.run_date)}</a> (${escapeHtml(entry.run_id)})</li>`)
    .join('\n');

  const latestScores = latestReport?.aggregate_scores;

  const scoresSummary = latestScores
    ? `
  <section aria-labelledby="latest-scores-heading">
    <h2 id="latest-scores-heading">Latest Scores (${escapeHtml(latestReport.run_date)})${renderAnchorLink('latest-scores-heading', `Latest Scores (${latestReport.run_date})`)}</h2>
    <div class="score-grid">
      <div class="score-card">
        <div class="score-label">Performance</div>
        <div class="score-value">${latestScores.performance}</div>
      </div>
      <div class="score-card">
        <div class="score-label">Accessibility</div>
        <div class="score-value">${latestScores.accessibility}</div>
      </div>
      <div class="score-card">
        <div class="score-label">Best Practices</div>
        <div class="score-value">${latestScores.best_practices}</div>
      </div>
      <div class="score-card">
        <div class="score-label">SEO</div>
        <div class="score-value">${latestScores.seo}</div>
      </div>
    </div>
    <p><a href="./daily/${escapeHtml(latestReport.run_date)}/index.html">Open latest report &rarr;</a></p>
  </section>`
    : '';

  const archiveSection = archiveUrl
    ? `
    <section aria-labelledby="archive-heading">
      <h2 id="archive-heading">Report Archive${renderAnchorLink('archive-heading', 'Report Archive')}</h2>
      <p>Reports older than ${archiveWindowDays} days are available as downloadable zip archives containing the full HTML report, JSON data, and CSV findings.</p>
      <p><a href="${escapeHtml(archiveUrl)}">Browse report archives &rarr;</a></p>
    </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily DAP - U.S. Government Website Quality Dashboard</title>
  <meta name="description" content="Daily automated accessibility and performance benchmarks for the top 100 most-visited U.S. government websites, powered by Lighthouse and axe-core." />
  ${renderColorSchemeSetup()}
  ${renderSharedStyles()}
</head>
<body>
  ${renderDashboardHeader()}
  <main id="main-content" class="site-main">
    <div class="page-intro">
      <h1 id="page-title">U.S. Government Website Quality Dashboard${renderAnchorLink('page-title', 'U.S. Government Website Quality Dashboard')}</h1>
      <p>Daily automated accessibility and performance scans of the top 100 most-visited U.S. government URLs, powered by <a href="https://developer.chrome.com/docs/lighthouse/" target="_blank" rel="noreferrer">Google Lighthouse</a> and <a href="https://www.deque.com/axe/" target="_blank" rel="noreferrer">axe-core</a>.</p>
    </div>

    <section aria-labelledby="about-heading">
      <h2 id="about-heading">What is DAP?${renderAnchorLink('about-heading', 'What is DAP?')}</h2>
      <p>The <strong>Digital Analytics Program (DAP)</strong> is a U.S. government analytics service that tracks website traffic across hundreds of participating federal agencies. It measures page views, visitor counts, and usage patterns for government websites, providing transparency into how the public engages with federal digital services.</p>
      <p>This dashboard uses DAP traffic data to identify the <strong>most-visited government URLs</strong> and measures their quality daily. Each scan covers:</p>
      <ul>
        <li><strong>Accessibility</strong> &mdash; WCAG compliance measured by Lighthouse and axe-core (0&ndash;100, higher is better)</li>
        <li><strong>Performance</strong> &mdash; Page load speed including Core Web Vitals (0&ndash;100, higher is better)</li>
        <li><strong>Best Practices</strong> &mdash; Modern web development standards (0&ndash;100, higher is better)</li>
        <li><strong>SEO</strong> &mdash; Search engine optimisation fundamentals (0&ndash;100, higher is better)</li>
      </ul>
      <p>Scans run daily. Click any report date below to see detailed per-URL findings, accessibility patterns, and trend analysis. <a href="${GITHUB_URL}" target="_blank" rel="noreferrer">View the source code on GitHub</a>.</p>
    </section>

    ${scoresSummary}

    <section aria-labelledby="recent-reports-heading">
      <h2 id="recent-reports-heading">Recent Reports${renderAnchorLink('recent-reports-heading', 'Recent Reports')}</h2>
      <ul>
        ${historyLinks}
      </ul>
    </section>
    ${archiveSection}
  </main>

  ${renderSiteFooter()}
  ${renderThemeScript()}
</body>
</html>`;
}

export function renderArchiveIndexPage({ entries = [], generatedAt = null, displayDays = 14 } = {}) {
  const sortedEntries = [...entries].sort((a, b) => b.run_date.localeCompare(a.run_date));

  const listItems = sortedEntries
    .map(
      (entry) =>
        `<li><a href="${escapeHtml(entry.zip_filename)}" download>${escapeHtml(entry.run_date)}.zip</a>${entry.archived_at ? ` <span class="archive-date">(archived ${escapeHtml(entry.archived_at.slice(0, 10))})</span>` : ''}</li>`
    )
    .join('\n        ');

  const generatedNote = generatedAt
    ? `<p class="generated-note">Archive index generated: ${escapeHtml(generatedAt)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Daily DAP - Report Archives</title>
  <meta name="description" content="Downloadable zip archives of Daily DAP reports older than ${displayDays} days." />
  ${renderColorSchemeSetup()}
  ${renderSharedStyles()}
</head>
<body>
  ${renderDashboardHeader()}
  <main id="main-content" class="site-main">
    <div class="page-intro">
      <h1 id="page-title">Report Archives${renderAnchorLink('page-title', 'Report Archives')}</h1>
      <p>Daily DAP reports older than ${displayDays} days are stored here as downloadable zip archives. Each archive contains the full HTML report, JSON data files, and CSV accessibility findings for that day's scan.</p>
      <p><a href="../index.html">&larr; Back to dashboard</a></p>
    </div>

    <section aria-labelledby="archives-heading">
      <h2 id="archives-heading">Available Archives${renderAnchorLink('archives-heading', 'Available Archives')}</h2>
      ${sortedEntries.length > 0 ? `<ul>\n        ${listItems}\n      </ul>` : '<p>No archived reports yet.</p>'}
      ${generatedNote}
    </section>
  </main>

  ${renderSiteFooter()}
  ${renderThemeScript()}
</body>
</html>`;
}

export function render404Page() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Page Not Found - Daily DAP</title>
  <meta name="description" content="The requested page could not be found. Return to the Daily DAP dashboard." />
  ${renderColorSchemeSetup()}
  ${renderSharedStyles()}
</head>
<body>
  ${renderDashboardHeader()}
  <main id="main-content" class="site-main">
    <div class="page-intro">
      <h1 id="page-title">404 &mdash; Page Not Found</h1>
      <p>Sorry, the page you requested could not be found.</p>
      <p><a href="./reports/">&larr; Back to dashboard</a></p>
    </div>
  </main>

  ${renderSiteFooter()}
  ${renderThemeScript()}
</body>
</html>`;
}

export function renderArchiveRedirectStub(runDate) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0; url=../../archive/index.html" />
  <title>Report Archived - ${escapeHtml(runDate)}</title>
  <meta name="description" content="The Daily DAP report for ${escapeHtml(runDate)} has been archived." />
  ${renderColorSchemeSetup()}
  ${renderSharedStyles()}
</head>
<body>
  ${renderDashboardHeader()}
  <main id="main-content" class="site-main" data-archived="true">
    <div class="page-intro">
      <h1 id="page-title">Report Archived</h1>
      <p>The Daily DAP report for <strong>${escapeHtml(runDate)}</strong> has been archived and is available as a downloadable zip file.</p>
      <p><a href="../../archive/index.html">View report archives &rarr;</a></p>
      <p><a href="../../index.html">&larr; Back to dashboard</a></p>
    </div>
  </main>

  ${renderSiteFooter()}
  ${renderThemeScript()}
</body>
</html>`;
}
