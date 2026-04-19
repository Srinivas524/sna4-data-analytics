// ==UserScript==
// @name         SNA4 Live Laborboard
// @version      5.1
// @description  SNA4 Live Laborboard + Department Routing
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/OBPlanner.aspx*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ─── FONTS ─────────────────────────────────────────────────────────────────
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
  document.head.appendChild(fontLink);

  // ─── CSS ───────────────────────────────────────────────────────────────────
  const CSS = `
    :root {
      --lb-bg:#f6f7f9; --lb-surface:#ffffff; --lb-surface-alt:#f0f1f4;
      --lb-border:#e2e4ea; --lb-border-hi:#cdd0d9;
      --lb-text-0:#1a1d27; --lb-text-1:#4a4f63; --lb-text-2:#8b90a3; --lb-text-3:#b4b8c9;
      --lb-blue:#2563eb; --lb-blue-light:#eff4ff;
      --lb-green:#059669; --lb-green-light:#ecfdf5;
      --lb-red:#dc2626; --lb-red-light:#fef2f2;
      --lb-amber:#d97706; --lb-amber-light:#fffbeb;
      --lb-purple:#7c3aed; --lb-purple-light:#f5f3ff;
      --lb-radius:10px;
      --lb-mono:'JetBrains Mono',ui-monospace,monospace;
      --lb-sans:'Outfit',-apple-system,system-ui,sans-serif;
      --lb-shadow-sm:0 1px 3px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.03);
      --lb-shadow-md:0 4px 12px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.04);
      --lb-transition:.18s cubic-bezier(.4,0,.2,1);
    }

    /* ── FAB ── */
    #lb-fab {
      position:fixed; bottom:28px; right:28px; z-index:2147483646;
      width:52px; height:52px; border-radius:15px; background:var(--lb-blue);
      box-shadow:0 4px 20px rgba(37,99,235,.35),inset 0 1px 0 rgba(255,255,255,.2);
      border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;
      transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s;
    }
    #lb-fab:hover { transform:translateY(-3px) scale(1.08); }
    #lb-fab svg { pointer-events:none; }

    /* ── OVERLAY ── */
    #lb-overlay {
      position:fixed; inset:0; z-index:2147483647; display:none;
      background:var(--lb-bg); font-family:var(--lb-sans); font-size:13px; color:var(--lb-text-0);
    }
    #lb-overlay.open { display:flex; flex-direction:column; }

    /* ── HEADER ── */
    #lb-header {
      background:var(--lb-surface); border-bottom:1px solid var(--lb-border);
      padding:0 32px; height:58px; display:flex; align-items:center; flex-shrink:0;
      box-shadow:var(--lb-shadow-sm); position:relative; z-index:2;
    }
    #lb-brand { display:flex; align-items:center; gap:12px; margin-right:40px; flex-shrink:0; }
    #lb-brand-icon {
      width:32px; height:32px; border-radius:9px; background:var(--lb-blue);
      box-shadow:0 2px 8px rgba(37,99,235,.25); display:flex; align-items:center; justify-content:center;
    }
    #lb-brand-text { display:flex; flex-direction:column; }
    #lb-brand-name { font-size:16px; font-weight:800; color:var(--lb-text-0); letter-spacing:-.4px; line-height:1.1; }
    #lb-brand-sub  { font-size:10px; color:var(--lb-text-2); font-weight:500; letter-spacing:.4px; }
    #lb-tabs { display:flex; align-items:stretch; gap:4px; height:100%; }
    .lb-tab {
      display:flex; align-items:center; gap:8px; padding:0 18px; height:100%;
      background:none; border:none; cursor:pointer; font-family:var(--lb-sans);
      font-size:13px; font-weight:500; color:var(--lb-text-2); position:relative;
      transition:color var(--lb-transition);
    }
    .lb-tab:hover { color:var(--lb-text-1); }
    .lb-tab.active { color:var(--lb-blue); font-weight:600; }
    .lb-tab.active::after {
      content:""; position:absolute; bottom:0; left:14px; right:14px;
      height:2.5px; background:var(--lb-blue); border-radius:2px 2px 0 0;
    }
    .lb-tab-icon { width:16px; height:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .lb-tab-badge {
      font-family:var(--lb-mono); font-size:10px; font-weight:700; padding:2px 7px;
      border-radius:10px; line-height:1; min-width:18px; text-align:center;
    }
    .lb-tab-badge[data-dept="inbound"]  { background:var(--lb-purple-light); color:var(--lb-purple); }
    .lb-tab-badge[data-dept="outbound"] { background:var(--lb-blue-light); color:var(--lb-blue); }
    .lb-tab-badge[data-dept="icqa"]     { background:var(--lb-amber-light); color:var(--lb-amber); }
    #lb-header-right { margin-left:auto; display:flex; align-items:center; gap:12px; }
    #lb-live-pill {
      display:flex; align-items:center; gap:7px; background:var(--lb-green-light);
      border:1px solid rgba(5,150,105,.15); border-radius:20px; padding:5px 14px 5px 10px;
    }
    #lb-live-dot { width:7px; height:7px; border-radius:50%; background:var(--lb-green); animation:lb-pulse-green 2s infinite; }
    #lb-live-label { font-size:11px; font-weight:700; color:var(--lb-green); letter-spacing:.3px; }
    #lb-live-time  { font-family:var(--lb-mono); font-size:11px; color:var(--lb-text-2); }
    #lb-close-btn {
      width:34px; height:34px; border-radius:8px; background:none;
      border:1px solid var(--lb-border); color:var(--lb-text-2); cursor:pointer;
      display:flex; align-items:center; justify-content:center; transition:all var(--lb-transition);
    }
    #lb-close-btn:hover { border-color:var(--lb-red); color:var(--lb-red); background:var(--lb-red-light); }

    /* ── BODY / PANELS ── */
    #lb-body { flex:1; overflow:hidden; position:relative; }
    .lb-panel {
      position:absolute; inset:0; overflow-y:auto; display:none; flex-direction:column; padding:28px 32px;
      scrollbar-width:thin; scrollbar-color:var(--lb-border) transparent;
    }
    .lb-panel.active { display:flex; }

    /* ── NEXUS CARD ── */
    #lb-nexus-card {
      background:var(--lb-surface); border:1px solid var(--lb-border);
      border-radius:var(--lb-radius); margin-bottom:24px; box-shadow:var(--lb-shadow-sm); overflow:hidden;
    }
    #lb-nexus-hdr {
      display:flex; align-items:center; gap:10px; padding:11px 20px;
      border-bottom:1px solid var(--lb-border); background:var(--lb-surface-alt);
    }
    #lb-nexus-hdr-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; background:var(--lb-border-hi); transition:background .3s; }
    #lb-nexus-hdr-dot.scanning { background:var(--lb-blue); animation:lb-pulse-blue 1s infinite; }
    #lb-nexus-hdr-dot.done     { background:var(--lb-green); animation:lb-pulse-green 2s infinite; }
    #lb-nexus-hdr-dot.error    { background:var(--lb-red); }
    #lb-nexus-name  { font-size:13px; font-weight:800; color:var(--lb-text-0); letter-spacing:-.2px; }
    #lb-nexus-tag   { font-size:10px; color:var(--lb-text-3); font-weight:500; letter-spacing:.3px; }
    #lb-nexus-meta  { margin-left:auto; font-family:var(--lb-mono); font-size:10px; color:var(--lb-text-3); }
    #lb-stop-btn {
      background:none; border:1px solid var(--lb-border); color:var(--lb-text-2);
      font-family:var(--lb-sans); font-size:11px; font-weight:600; padding:4px 12px;
      border-radius:6px; cursor:pointer; transition:all var(--lb-transition);
    }
    #lb-stop-btn:hover { border-color:var(--lb-red); color:var(--lb-red); background:var(--lb-red-light); }
    #lb-nexus-body { display:flex; align-items:center; padding:20px 28px; gap:32px; }
    #lb-ring-wrap { flex-shrink:0; }
    #lb-ring-group { transform-box:fill-box; transform-origin:center; transform:rotate(-90deg); }
    #lb-ring-group.scanning { animation:lb-ring-spin .85s linear infinite; }
    @keyframes lb-ring-spin { from { transform:rotate(-90deg); } to { transform:rotate(270deg); } }
    #lb-ring-fill { transition:stroke-dashoffset .05s linear, stroke .3s; }
    #lb-nexus-status { flex:1; display:flex; flex-direction:column; gap:14px; }
    .lb-prog-row { display:grid; grid-template-columns:52px 1fr 160px; align-items:center; gap:14px; }
    .lb-prog-label { font-size:10px; font-weight:700; color:var(--lb-text-2); text-transform:uppercase; letter-spacing:.8px; }
    .lb-prog-track { height:9px; border-radius:5px; background:var(--lb-surface-alt); overflow:hidden; }
    .lb-prog-fill { height:100%; border-radius:5px; width:0%; transition:width .5s cubic-bezier(.4,0,.2,1),background .3s; }
    .lb-prog-fill.loading { width:100%; background:linear-gradient(90deg,var(--lb-blue) 0%,#60a5fa 50%,var(--lb-blue) 100%); background-size:200% 100%; animation:lb-sweep 1.1s linear infinite; }
    .lb-prog-fill.done  { width:100%; background:var(--lb-green); }
    .lb-prog-fill.error { width:100%; background:var(--lb-red); }
    @keyframes lb-sweep { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
    .lb-split-track { display:flex; height:9px; border-radius:5px; overflow:hidden; }
    .lb-split-in  { background:var(--lb-green); height:100%; transition:width .5s cubic-bezier(.4,0,.2,1); }
    .lb-split-out { background:var(--lb-red); height:100%; flex:1; opacity:.7; }
    .lb-split-empty { background:var(--lb-border); width:100%; height:100%; }

    /* ── FILTER PROGRESS BAR ── */
    .lb-filter-track { height:9px; border-radius:5px; background:var(--lb-surface-alt); overflow:hidden; }
    .lb-filter-fill { height:100%; border-radius:5px; width:0%; background:var(--lb-purple); transition:width .3s cubic-bezier(.4,0,.2,1); }
    .lb-filter-fill.done { background:var(--lb-green); width:100%; }

    .lb-prog-meta { font-family:var(--lb-mono); font-size:10px; color:var(--lb-text-2); text-align:right; white-space:nowrap; }

    /* ── KPI GRID ── */
    .lb-kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; margin-bottom:24px; }
    .lb-kpi { background:var(--lb-surface); border:1px solid var(--lb-border); border-radius:var(--lb-radius); padding:20px 22px; position:relative; overflow:hidden; box-shadow:var(--lb-shadow-sm); transition:box-shadow var(--lb-transition),border-color var(--lb-transition); }
    .lb-kpi:hover { box-shadow:var(--lb-shadow-md); border-color:var(--lb-border-hi); }
    .lb-kpi::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; }
    .lb-kpi[data-accent="blue"]::before   { background:var(--lb-blue); }
    .lb-kpi[data-accent="green"]::before  { background:var(--lb-green); }
    .lb-kpi[data-accent="red"]::before    { background:var(--lb-red); }
    .lb-kpi[data-accent="purple"]::before { background:var(--lb-purple); }
    .lb-kpi[data-accent="amber"]::before  { background:var(--lb-amber); }
    .lb-kpi-label { font-size:11px; font-weight:600; color:var(--lb-text-2); text-transform:uppercase; letter-spacing:.6px; margin-bottom:8px; }
    .lb-kpi-value { font-family:var(--lb-mono); font-size:32px; font-weight:700; color:var(--lb-text-0); letter-spacing:-1px; line-height:1; }
    .lb-kpi-sub   { font-size:11px; color:var(--lb-text-2); margin-top:8px; }

    /* ── DEPT TAB CONTENT ── */

    /* Path group section */
    .path-group { margin-bottom:28px; }
    .path-group-hdr {
      display:flex; align-items:center; gap:12px;
      padding:9px 16px; margin-bottom:12px;
      background:var(--lb-surface); border:1px solid var(--lb-border);
      border-radius:8px; box-shadow:var(--lb-shadow-sm);
    }
    .path-group-name {
      font-size:13px; font-weight:700; color:var(--lb-text-0); letter-spacing:-.1px;
    }
    .path-group-count {
      font-family:var(--lb-mono); font-size:10px; font-weight:600;
      color:var(--lb-text-2); background:var(--lb-surface-alt);
      border:1px solid var(--lb-border); border-radius:6px; padding:2px 8px;
    }
    .path-group-type {
      font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px;
      padding:2px 8px; border-radius:6px;
    }
    .path-group-type.direct   { background:var(--lb-green-light); color:var(--lb-green); }
    .path-group-type.indirect { background:var(--lb-red-light); color:var(--lb-red); }
    .path-group-type.edited   { background:var(--lb-amber-light); color:var(--lb-amber); }
    .path-group-type.mixed    { background:var(--lb-blue-light); color:var(--lb-blue); }

    /* Card grid inside a path group */
    .path-card-grid {
      display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:10px;
    }

    .emp-card {
      background:var(--lb-surface); border:1px solid var(--lb-border); border-radius:var(--lb-radius);
      padding:14px 18px; box-shadow:var(--lb-shadow-sm); transition:box-shadow var(--lb-transition),border-color var(--lb-transition);
      animation:emp-card-in .3s cubic-bezier(.4,0,.2,1);
    }
    .emp-card:hover { box-shadow:var(--lb-shadow-md); border-color:var(--lb-border-hi); }
    @keyframes emp-card-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    .emp-card-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .emp-card-name { font-size:13px; font-weight:700; color:var(--lb-text-0); }
    .emp-card-badge {
      font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.5px;
      padding:2px 7px; border-radius:8px;
    }
    .emp-card-badge.direct   { background:var(--lb-green-light); color:var(--lb-green); }
    .emp-card-badge.indirect { background:var(--lb-red-light); color:var(--lb-red); }
    .emp-card-badge.edited   { background:var(--lb-amber-light); color:var(--lb-amber); }
    .emp-card-meta { display:flex; flex-wrap:wrap; gap:5px 14px; }
    .emp-card-field { display:flex; flex-direction:column; gap:1px; }
    .emp-card-field-label { font-size:9px; font-weight:700; color:var(--lb-text-3); text-transform:uppercase; letter-spacing:.6px; }
    .emp-card-field-value { font-family:var(--lb-mono); font-size:11px; color:var(--lb-text-1); font-weight:500; }

    /* ── DEPT TAB TOOLBAR ── */
    .dept-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
    .dept-toolbar-title { font-size:16px; font-weight:800; color:var(--lb-text-0); letter-spacing:-.3px; }
    .dept-toolbar-count { font-family:var(--lb-mono); font-size:12px; color:var(--lb-text-2); }
    .dept-toolbar-search {
      margin-left:auto; padding:7px 14px; background:var(--lb-surface); border:1px solid var(--lb-border);
      border-radius:8px; font-family:var(--lb-sans); font-size:12px; color:var(--lb-text-0); width:220px;
      transition:border-color var(--lb-transition);
    }
    .dept-toolbar-search:focus { outline:none; border-color:var(--lb-blue); }

    /* ── EMPTY STATE ── */
    .lb-empty { margin:auto; display:flex; flex-direction:column; align-items:center; gap:16px; text-align:center; padding:80px 20px; }
    .lb-empty-ring { width:72px; height:72px; border-radius:50%; border:2px dashed var(--lb-border); display:flex; align-items:center; justify-content:center; }
    .lb-empty-title { font-size:15px; font-weight:700; color:var(--lb-text-2); }
    .lb-empty-sub   { font-size:13px; color:var(--lb-text-3); max-width:300px; line-height:1.6; }

    /* ── IDLE / LOADING / START ── */
    #lb-start-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; gap:20px; padding:80px 20px; }
    #lb-start-icon { width:68px; height:68px; border-radius:20px; background:var(--lb-blue-light); display:flex; align-items:center; justify-content:center; }
    #lb-start-title { font-size:18px; font-weight:800; color:var(--lb-text-0); letter-spacing:-.4px; }
    #lb-start-sub   { font-size:13px; color:var(--lb-text-2); max-width:340px; text-align:center; line-height:1.6; }
    #lb-start-btn { margin-top:4px; background:var(--lb-blue); color:#fff; border:none; border-radius:10px; padding:13px 32px; font-family:var(--lb-sans); font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:10px; box-shadow:0 4px 18px rgba(37,99,235,.35); transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s; }
    #lb-start-btn:hover { transform:translateY(-2px) scale(1.03); }
    #lb-start-meta { font-size:11px; color:var(--lb-text-3); display:flex; align-items:center; gap:8px; }
    #lb-start-meta span { display:flex; align-items:center; gap:4px; }
    #lb-loading-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; gap:16px; }
    .lb-spinner { width:36px; height:36px; border:3px solid var(--lb-border); border-top-color:var(--lb-blue); border-radius:50%; animation:lb-spin .7s linear infinite; }
    @keyframes lb-spin { to { transform:rotate(360deg); } }
    .lb-loading-text { font-size:13px; font-weight:600; color:var(--lb-text-2); }

    /* ── SITE TAG ── */
    #lb-site-tag { position:fixed; bottom:16px; left:16px; z-index:2147483647; font-family:var(--lb-mono); font-size:10px; font-weight:600; color:var(--lb-text-3); letter-spacing:.5px; display:none; }
    #lb-overlay.open ~ #lb-site-tag { display:block; }

    /* ── ANIMATIONS ── */
    @keyframes lb-pulse-green { 0%{box-shadow:0 0 0 0 rgba(5,150,105,.4);}70%{box-shadow:0 0 0 6px rgba(5,150,105,0);}100%{box-shadow:0 0 0 0 rgba(5,150,105,0);} }
    @keyframes lb-pulse-blue  { 0%{box-shadow:0 0 0 0 rgba(37,99,235,.5);}70%{box-shadow:0 0 0 7px rgba(37,99,235,0);}100%{box-shadow:0 0 0 0 rgba(37,99,235,0);} }
  `;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ─── CONSTANTS ─────────────────────────────────────────────────────────────
  const WINDOW_MS    = 6 * 60 * 60 * 1000;
  const RECENT_MS    = 2 * 60 * 60 * 1000;
  const RING_C       = 251.3;
  const REFRESH_MS   = 5 * 60 * 1000;       // 5-min auto-cycle
  const FILTER_DELAY = 100;                  // 100ms between path fetches

  let isLive = false, refreshTimer = null, fetchCount = 0, lastFetchTime = null;
  let rosterIN = [], rosterOUT = [];

  // ─── DEPARTMENT FILTER STATE ───────────────────────────────────────────────
  let filterQueue   = [];
  let filterRunning = false;
  let filterTotal   = 0;
  let filterDone    = 0;
  let empData       = {};   // empId -> { name, login, empId, manager, dept, currentPath, currentType, isLastKnown }

  const deptCounts = { INBOUND:0, OUTBOUND:0, ICQA:0, OTHERS:0 };

  // ─── DEPT MAP (from Current Path Viewer) ───────────────────────────────────
  const DEPT_MAP = (function() {
    const INBOUND = new Set([
      'Cubiscan','Decant','IB Problem Solve','Inbound Lead/PA Master Sessions',
      'Inbound Problem Solve Master Sessions','LP-Receive','Prep','Receive',
      'Receive Dock Master Sessions','Receive Support','Receive Support Master Sessions',
      'RSR Support','Stow','Stow Master Sessions','Trans In Dock Support',
      'Trans In Master Sessions','Transfer-In/Stow','Transfer Out',
      'Transfer Out Master Sessions','Transship Fluid Load','Transship Palletize',
      'Undefined Direct Process','Consolidation','IDRT',
      'C-Returns Support Master Sessions','Grading'
    ]);
    const OUTBOUND = new Set([
      'GiftWrap Pack','GiftWrap Ship','OB Problem Solve Master Sessions','Pack',
      'Pack Support','Pack Support Master Sessions','Pick','Pick Support',
      'Pick Support Master Sessions','POPS','Ship','Ship Dock',
      'Ship Dock Master Sessions','Ship Dock Support','ShipApp Processing','Sort Rebin',
      'Transfer-Out Pick','V-Returns Pack','Donations Processing'
    ]);
    const ICQA = new Set([
      'Amnesty','Cycle Count','IC-QA Master Sessions','Simple Bin Count',
      'Simple Record Count'
    ]);
    return function(process) {
      if (!process) return 'OTHERS';
      if (INBOUND.has(process))  return 'INBOUND';
      if (OUTBOUND.has(process)) return 'OUTBOUND';
      if (ICQA.has(process))     return 'ICQA';
      return 'OTHERS';
    };
  })();

  // ─── UTILS ─────────────────────────────────────────────────────────────────
  function pad(n)    { return String(n).padStart(2,'0'); }
  function fmtISO(d) { return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function esc(t) {
    if (t == null) return '';
    return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getRange() {
    const end = new Date(), start = new Date(end.getTime() - WINDOW_MS);
    return { startDate:fmtISO(start), startHour:start.getHours(), startMinute:start.getMinutes(),
             endDate:fmtISO(end), endHour:end.getHours(), endMinute:end.getMinutes() };
  }

  function buildAttendanceURL() {
    const r = getRange(), fd = d => d.replace(/-/g,'%2F');
    return 'https://fclm-portal.amazon.com/reports/ppaAttendance?reportFormat=CSV'
      +'&warehouseId=SNA4&maxIntradayDays=1&spanType=Intraday'
      +'&startDateIntraday='+fd(r.startDate)+'&startHourIntraday='+r.startHour+'&startMinuteIntraday='+r.startMinute
      +'&endDateIntraday='+fd(r.endDate)+'&endHourIntraday='+r.endHour+'&endMinuteIntraday='+r.endMinute
      +'&startDateDay='+fd(r.startDate)+'&maxIntradayDays=30';
  }

  function buildPathURL(empId) {
    const end   = new Date();
    const start = new Date(end.getTime() - 10 * 60 * 60 * 1000);
    const tzOff  = -end.getTimezoneOffset();
    const tzSign = tzOff >= 0 ? '+' : '-';
    const tzStr  = tzSign + pad(Math.floor(Math.abs(tzOff)/60)) + ':' + pad(Math.abs(tzOff)%60);
    const fmt = d =>
      d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + tzStr;
    return 'https://fclm-portal.amazon.com/employee/ppaTimeDetails?' +
      'employeeId=' + encodeURIComponent(empId) + '&warehouseId=SNA4' +
      '&startTime=' + encodeURIComponent(fmt(start)) + '&endTime=' + encodeURIComponent(fmt(end));
  }

  function parseDate(str) {
    if (!str) return 0;
    try { const d = new Date(str); if (!isNaN(d)) return d.getTime(); } catch(e){}
    return 0;
  }

  function parseCSV(line) {
    const res = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQ = !inQ;
      else if (c === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    res.push(cur.trim()); return res;
  }

  // ─── PATH HTML PARSER (from Current Path Viewer, improved) ─────────────────
  function parseTimeDetails(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    let name = '', login = '', empId = '', manager = '';
    const fc = doc.querySelector('.empDetailCard .title .fold-control');
    if (fc) {
      const m = fc.textContent.trim().match(/^(.+?)\s*\((\w+)\)\s*$/);
      if (m) { name = m[1].trim(); login = m[2].trim(); }
    }
    doc.querySelectorAll('.empDetailCard dt').forEach(dt => {
      const label = dt.textContent.trim();
      const dd = dt.nextElementSibling;
      if (!dd) return;
      if (label === 'Empl ID') empId = dd.textContent.trim();
      if (label === 'Manager') {
        const a = dd.querySelector('a');
        manager = a ? a.textContent.trim() : dd.textContent.trim();
      }
    });

    let current = null;
    const ganttTable = doc.querySelector('table.ganttChart');
    if (ganttTable) {
      const rows = [...ganttTable.querySelectorAll('tbody tr')];
      for (let i = rows.length - 1; i >= 0; i--) {
        const tr  = rows[i];
        const cls = tr.className;
        if (!cls.includes('function-seg')) continue;
        const tds = tr.querySelectorAll('td');
        if (!tds.length) continue;
        const end = tds[2] ? tds[2].textContent.trim() : '';
        if (end) continue;
        const title = tds[0].textContent.trim().replace(/\s+/g, ' ');
        const process = title.split(/[\u25c6\u2666&]/).shift().trim().replace(/&diams;/g, '').trim();
        const type = cls.includes('indirect') ? 'indirect' : cls.includes('edited') ? 'edited' : 'direct';
        current = { process, type };
        break;
      }
      if (!current) {
        for (let i = rows.length - 1; i >= 0; i--) {
          const tr  = rows[i];
          const cls = tr.className;
          if (!cls.includes('function-seg')) continue;
          const tds = tr.querySelectorAll('td');
          if (!tds.length) continue;
          const title = tds[0].textContent.trim().replace(/\s+/g, ' ');
          const process = title.split(/[\u25c6\u2666&]/).shift().trim().replace(/&diams;/g, '').trim();
          const type = cls.includes('indirect') ? 'indirect' : cls.includes('edited') ? 'edited' : 'direct';
          current = { process, type, isLastKnown: true };
          break;
        }
      }
    }

    return { name, login, empId, manager, current };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  RING ANIMATION
  // ═══════════════════════════════════════════════════════════════════════════

  function setRingScanning() {
    const group = document.getElementById('lb-ring-group');
    const fill  = document.getElementById('lb-ring-fill');
    const cEl   = document.getElementById('lb-ring-count');
    const dEl   = document.getElementById('lb-ring-denom');
    const dot   = document.getElementById('lb-nexus-hdr-dot');
    if (!group || !fill) return;
    fill.style.stroke = 'var(--lb-blue)';
    fill.style.strokeDasharray = '70 181.3';
    fill.style.strokeDashoffset = '0';
    group.classList.add('scanning');
    if (cEl) cEl.textContent = '\u2014';
    if (dEl) dEl.textContent = 'SCANNING';
    if (dot) { dot.className = ''; dot.classList.add('scanning'); }
  }

  function animateRing(onFloor) {
    const group = document.getElementById('lb-ring-group');
    const fill  = document.getElementById('lb-ring-fill');
    const cEl   = document.getElementById('lb-ring-count');
    const dEl   = document.getElementById('lb-ring-denom');
    const dot   = document.getElementById('lb-nexus-hdr-dot');
    if (!group || !fill) return;
    group.classList.remove('scanning');
    fill.style.stroke = 'var(--lb-green)';
    fill.style.strokeDasharray = String(RING_C);
    if (dEl) dEl.textContent = '\u2215\u00a0' + onFloor;
    if (onFloor === 0) {
      fill.style.strokeDashoffset = String(RING_C);
      if (cEl) cEl.textContent = '0';
      if (dot) { dot.className = ''; dot.classList.add('done'); }
      return;
    }
    let current = 0;
    const steps  = Math.min(onFloor, 60);
    const stepMs = Math.max(Math.round(900 / steps), 12);
    const inc    = onFloor / steps;
    const timer = setInterval(() => {
      current = Math.min(Math.round(current + inc), onFloor);
      fill.style.strokeDashoffset = (RING_C * (1 - current / onFloor)).toFixed(2);
      if (cEl) cEl.textContent = current;
      if (current >= onFloor) {
        clearInterval(timer);
        if (dot) { dot.className = ''; dot.classList.add('done'); }
      }
    }, stepMs);
  }

  function setRingError() {
    const group = document.getElementById('lb-ring-group');
    const fill  = document.getElementById('lb-ring-fill');
    const cEl   = document.getElementById('lb-ring-count');
    const dEl   = document.getElementById('lb-ring-denom');
    const dot   = document.getElementById('lb-nexus-hdr-dot');
    if (!group || !fill) return;
    group.classList.remove('scanning');
    fill.style.stroke = 'var(--lb-red)';
    fill.style.strokeDasharray = String(RING_C);
    fill.style.strokeDashoffset = '0';
    if (cEl) cEl.textContent = '!';
    if (dEl) dEl.textContent = 'ERROR';
    if (dot) { dot.className = ''; dot.classList.add('error'); }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  IN-PLACE UPDATERS (Home tab)
  // ═══════════════════════════════════════════════════════════════════════════

  function setFetchBar(state, meta) {
    const fill   = document.getElementById('lb-fetch-fill');
    const metaEl = document.getElementById('lb-fetch-meta');
    if (fill)   fill.className = 'lb-prog-fill ' + state;
    if (metaEl && meta != null) metaEl.textContent = meta;
  }

  function setSplitBar() {
    const track  = document.getElementById('lb-split-track');
    const metaEl = document.getElementById('lb-split-meta');
    if (!track) return;
    const total = rosterIN.length + rosterOUT.length;
    if (total === 0) {
      track.innerHTML = '<div class="lb-split-empty"></div>';
      if (metaEl) metaEl.textContent = '\u2014';
      return;
    }
    const inPct = (rosterIN.length / total * 100).toFixed(1);
    track.innerHTML = '<div class="lb-split-in" style="width:'+inPct+'%"></div><div class="lb-split-out"></div>';
    if (metaEl) metaEl.textContent = rosterIN.length+'\u00a0IN\u00b7'+rosterOUT.length+'\u00a0OUT';
  }

  function updateFilterBar() {
    const fill   = document.getElementById('lb-filter-fill');
    const metaEl = document.getElementById('lb-filter-meta');
    if (!fill) return;
    if (filterTotal === 0) {
      fill.style.width = '0%';
      fill.classList.remove('done');
      if (metaEl) metaEl.textContent = '\u2014';
      return;
    }
    const pct = (filterDone / filterTotal * 100).toFixed(1);
    fill.style.width = pct + '%';
    if (filterDone >= filterTotal) {
      fill.classList.add('done');
      if (metaEl) metaEl.textContent = filterDone + '/' + filterTotal + ' \u2714';
    } else {
      fill.classList.remove('done');
      const remaining  = filterTotal - filterDone;
      const etaSec     = Math.ceil(remaining * FILTER_DELAY / 1000);
      const etaMin     = Math.floor(etaSec / 60);
      const etaSecR    = etaSec % 60;
      const etaStr     = etaMin > 0 ? etaMin + 'm ' + etaSecR + 's' : etaSecR + 's';
      if (metaEl) metaEl.textContent = filterDone + '/' + filterTotal + ' \u00b7 ~' + etaStr + ' left';
    }
  }

  function updateNexusMeta() {
    const el = document.getElementById('lb-nexus-meta');
    if (!el) return;
    const t = lastFetchTime
      ? lastFetchTime.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})
      : '--';
    el.textContent = 'fetch #' + fetchCount + ' \u00b7 ' + t;
  }

  function updateKPIs() {
    const total = rosterIN.length + rosterOUT.length;
    const updates = [
      ['lb-kpi-in',       rosterIN.length],
      ['lb-kpi-out',      rosterOUT.length],
      ['lb-kpi-total',    total],
      ['lb-kpi-inbound',  deptCounts.INBOUND],
      ['lb-kpi-outbound', deptCounts.OUTBOUND],
      ['lb-kpi-icqa',     deptCounts.ICQA],
      ['lb-kpi-others',   deptCounts.OTHERS],
    ];
    updates.forEach(([id,v]) => { const el = document.getElementById(id); if (el) el.textContent = v; });
  }

  function updateTabBadges() {
    const badges = {
      'badge-inbound':  deptCounts.INBOUND,
      'badge-outbound': deptCounts.OUTBOUND,
      'badge-icqa':     deptCounts.ICQA,
    };
    Object.entries(badges).forEach(([id,v]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DEPARTMENT FILTER ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  function resetDeptState() {
    filterQueue   = [];
    filterRunning = false;
    filterTotal   = 0;
    filterDone    = 0;
    empData       = {};
    deptCounts.INBOUND = 0;
    deptCounts.OUTBOUND = 0;
    deptCounts.ICQA = 0;
    deptCounts.OTHERS = 0;
    // Clear dept tab bodies -- path groups live inside dept-body-*
    ['inbound','outbound','icqa'].forEach(dept => {
      const body = document.getElementById('dept-body-' + dept);
      if (body) body.innerHTML = '';
      const count = document.getElementById('dept-count-' + dept);
      if (count) count.textContent = '0 associates';
      const empty = document.getElementById('dept-empty-' + dept);
      if (empty) empty.style.display = '';
    });
    updateTabBadges();
  }

  function enqueueFilter(roster) {
    // Reset for fresh cycle
    resetDeptState();
    filterTotal = roster.length;
    filterDone  = 0;
    filterQueue = roster.map(e => e.id);
    updateFilterBar();
    if (!filterRunning) filterRunLoop();
  }

  function filterRunLoop() {
    if (filterQueue.length === 0) {
      filterRunning = false;
      updateFilterBar();
      return;
    }
    filterRunning = true;
    const id = filterQueue.shift();

    GM_xmlhttpRequest({
      method: 'GET', url: buildPathURL(id), timeout: 30000,
      onload(resp) {
        if (resp.status >= 200 && resp.status < 300) {
          const data = parseTimeDetails(resp.responseText || '');
          const dept = data.current ? DEPT_MAP(data.current.process) : 'OTHERS';

          // Find the roster entry for name fallback
          const rEntry = rosterIN.find(e => e.id === id);

          empData[id] = {
            empId:       data.empId || id,
            name:        data.name || (rEntry ? rEntry.name : id),
            login:       data.login || '',
            manager:     data.manager || '',
            dept:        dept,
            currentPath: data.current ? data.current.process : null,
            currentType: data.current ? data.current.type : null,
            isLastKnown: data.current ? !!data.current.isLastKnown : false,
          };

          deptCounts[dept]++;
          filterDone++;
          updateFilterBar();
          updateKPIs();
          updateTabBadges();
          pushToTab(empData[id]);
        } else {
          // On error, count as OTHERS
          const rEntry = rosterIN.find(e => e.id === id);
          empData[id] = {
            empId: id, name: rEntry ? rEntry.name : id, login:'', manager:'',
            dept:'OTHERS', currentPath:null, currentType:null, isLastKnown:false,
          };
          deptCounts.OTHERS++;
          filterDone++;
          updateFilterBar();
          updateKPIs();
          updateTabBadges();
        }
        setTimeout(filterRunLoop, FILTER_DELAY);
      },
      onerror() {
        const rEntry = rosterIN.find(e => e.id === id);
        empData[id] = {
          empId:id, name:rEntry?rEntry.name:id, login:'', manager:'',
          dept:'OTHERS', currentPath:null, currentType:null, isLastKnown:false,
        };
        deptCounts.OTHERS++;
        filterDone++;
        updateFilterBar(); updateKPIs(); updateTabBadges();
        setTimeout(filterRunLoop, FILTER_DELAY);
      },
      ontimeout() {
        const rEntry = rosterIN.find(e => e.id === id);
        empData[id] = {
          empId:id, name:rEntry?rEntry.name:id, login:'', manager:'',
          dept:'OTHERS', currentPath:null, currentType:null, isLastKnown:false,
        };
        deptCounts.OTHERS++;
        filterDone++;
        updateFilterBar(); updateKPIs(); updateTabBadges();
        setTimeout(filterRunLoop, FILTER_DELAY);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUSH EMPLOYEE CARD TO DEPARTMENT TAB
  // ═══════════════════════════════════════════════════════════════════════════

  function pushToTab(emp) {
    const deptKey = emp.dept.toLowerCase();
    if (deptKey === 'others') return;

    const body  = document.getElementById('dept-body-' + deptKey);
    const empty = document.getElementById('dept-empty-' + deptKey);
    const count = document.getElementById('dept-count-' + deptKey);
    if (!body) return;
    if (empty) empty.style.display = 'none';

    // Update associate count label
    const n = deptCounts[emp.dept] || 0;
    if (count) count.textContent = n + ' associate' + (n !== 1 ? 's' : '');

    // Employees with no path land in an Unknown group
    const pathKey   = emp.currentPath || '__unknown__';
    const pathLabel = emp.currentPath || 'Unknown';
    const groupId   = 'pg-' + deptKey + '-' + pathKey.replace(/[^a-zA-Z0-9]/g, '_');

    // Find or create the path group section
    let group = document.getElementById(groupId);
    if (!group) {
      const typeClass = emp.currentType || 'direct';
      group = document.createElement('div');
      group.className = 'path-group';
      group.id = groupId;
      group.dataset.path = pathLabel.toLowerCase();
      group.innerHTML =
        '<div class="path-group-hdr">' +
          '<span class="path-group-name">' + esc(pathLabel) + '</span>' +
          '<span class="path-group-count" id="' + groupId + '-count">1</span>' +
          (emp.currentType ? '<span class="path-group-type ' + typeClass + '">' + typeClass.toUpperCase() + '</span>' : '') +
        '</div>' +
        '<div class="path-card-grid" id="' + groupId + '-grid"></div>';
      body.appendChild(group);
    } else {
      // Increment the group employee count
      const cEl = document.getElementById(groupId + '-count');
      if (cEl) cEl.textContent = parseInt(cEl.textContent || '0') + 1;
    }

    // Build employee card -- path shown in section header, not repeated on card
    const typeLabel = emp.currentType || '';
    const badgeCls  = typeLabel === 'indirect' ? 'indirect' : typeLabel === 'edited' ? 'edited' : 'direct';

    const card = document.createElement('div');
    card.className = 'emp-card';
    card.dataset.empid = emp.empId;
    card.dataset.name  = (emp.name || '').toLowerCase();
    card.innerHTML =
      '<div class="emp-card-hdr">' +
        '<span class="emp-card-name">' + esc(emp.name) + '</span>' +
        (typeLabel ? '<span class="emp-card-badge ' + badgeCls + '">' + typeLabel.toUpperCase() + '</span>' : '') +
      '</div>' +
      '<div class="emp-card-meta">' +
        (emp.login ? '<div class="emp-card-field"><span class="emp-card-field-label">Login</span><span class="emp-card-field-value">' + esc(emp.login) + '</span></div>' : '') +
        '<div class="emp-card-field"><span class="emp-card-field-label">ID</span><span class="emp-card-field-value">' + esc(emp.empId) + '</span></div>' +
        (emp.manager ? '<div class="emp-card-field"><span class="emp-card-field-label">Manager</span><span class="emp-card-field-value">' + esc(emp.manager) + '</span></div>' : '') +
      '</div>' +
      (emp.isLastKnown ? '<div style="margin-top:8px;font-size:10px;color:var(--lb-text-3);">last known</div>' : '');

    document.getElementById(groupId + '-grid').appendChild(card);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CSV PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  function processCSV(raw) {
    const lines = raw.trim().split('\n');
    if (lines.length < 2) { setFetchBar('error','No data'); setRingError(); return; }
    const h = parseCSV(lines[0]);
    const iID=h.indexOf('Employee ID'), iName=h.indexOf('Employee Name'),
          iMgr=h.indexOf('Manager'),    iShift=h.indexOf('Shift'),
          iPunch=h.indexOf('Punch Type'),iTime=h.indexOf('Punch Time');
    if (iID < 0 || iPunch < 0 || iTime < 0) { setFetchBar('error','Bad columns'); setRingError(); return; }
    const cutoff = Date.now() - RECENT_MS, latest = {};
    lines.slice(1).forEach(l => {
      const r = parseCSV(l); const id = r[iID]; if (!id) return;
      const ts = parseDate(r[iTime]);
      if (!latest[id] || ts > latest[id]._ts)
        latest[id] = { id, name:r[iName]||'', manager:r[iMgr]||'', shift:r[iShift]||'',
                       punch:r[iPunch]||'', punchTime:r[iTime]||'', _ts:ts };
    });
    rosterIN  = Object.values(latest).filter(e => e.punch==='In').sort((a,b)=>b._ts-a._ts);
    rosterOUT = Object.values(latest).filter(e => e.punch==='Out' && e._ts>=cutoff).sort((a,b)=>b._ts-a._ts);

    const fetchStr = lastFetchTime
      ? lastFetchTime.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})
      : '--';

    if (!document.getElementById('lb-nexus-card')) {
      renderLiveState();
    } else {
      setFetchBar('done','Last: '+fetchStr);
      updateNexusMeta(); setSplitBar(); updateKPIs();
      animateRing(rosterIN.length);
    }

    // Kick off department filter
    enqueueFilter(rosterIN);
  }

  function fetchData() {
    setRingScanning(); setFetchBar('loading','Fetching...');
    GM_xmlhttpRequest({
      method:'GET', url:buildAttendanceURL(),
      headers:{'Accept':'text/csv,application/csv,*/*'}, timeout:60000,
      onload(resp) {
        if (resp.status >= 200 && resp.status < 300) {
          const raw = resp.responseText || '';
          if (raw.trim().startsWith('<') && raw.toLowerCase().includes('<html')) {
            setFetchBar('error','HTML \u2014 check FCLM auth'); setRingError(); return;
          }
          fetchCount++; lastFetchTime = new Date();
          processCSV(raw);
        } else { setFetchBar('error','HTTP '+resp.status); setRingError(); }
      },
      onerror()   { setFetchBar('error','Network error'); setRingError(); },
      ontimeout() { setFetchBar('error','Timed out'); setRingError(); }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  function startLive() {
    isLive = true; showLoadingState();
    fetchData();
    refreshTimer = setInterval(fetchData, REFRESH_MS);
  }

  function stopLive() {
    isLive = false; clearInterval(refreshTimer); refreshTimer = null;
    rosterIN = []; rosterOUT = []; fetchCount = 0; lastFetchTime = null;
    resetDeptState();
    showIdleState();
  }

  function getHome() { return document.getElementById('panel-home'); }

  function showIdleState() {
    const p = getHome(); if (!p) return;
    p.innerHTML =
      '<div id="lb-start-wrap">' +
        '<div id="lb-start-icon">' +
          '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--lb-blue)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' +
        '</div>' +
        '<div id="lb-start-title">SNA4 Live Laborboard</div>' +
        '<div id="lb-start-sub">Pulls live attendance from FCLM, then filters each employee through PPA Time Details for department classification and path routing.</div>' +
        '<button id="lb-start-btn">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
          'Start Live Laborboard' +
        '</button>' +
        '<div id="lb-start-meta">' +
          '<span>Auto-cycle every 5m</span>' +
          '<span style="color:var(--lb-border-hi)">|</span>' +
          '<span>6h fetch \u00b7 2h recent window</span>' +
          '<span style="color:var(--lb-border-hi)">|</span>' +
          '<span>Dept filter @ 100ms/emp</span>' +
        '</div>' +
      '</div>';
    document.getElementById('lb-start-btn').addEventListener('click', startLive);
  }

  function showLoadingState() {
    const p = getHome(); if (!p) return;
    p.innerHTML =
      '<div id="lb-loading-wrap">' +
        '<div class="lb-spinner"></div>' +
        '<div class="lb-loading-text">Fetching attendance data from FCLM...</div>' +
      '</div>';
  }

  function renderLiveState() {
    const p = getHome(); if (!p) return;
    const total = rosterIN.length + rosterOUT.length;
    const fetchStr = lastFetchTime
      ? lastFetchTime.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})
      : '--';
    p.innerHTML =
      '<div id="lb-nexus-card">' +
        '<div id="lb-nexus-hdr">' +
          '<div id="lb-nexus-hdr-dot" class="scanning"></div>' +
          '<span id="lb-nexus-name">Nexus</span>' +
          '<span id="lb-nexus-tag">Attendance + Department Filter</span>' +
          '<span id="lb-nexus-meta">fetch #' + fetchCount + ' &middot; ' + fetchStr + '</span>' +
          '<button id="lb-stop-btn">Stop</button>' +
        '</div>' +
        '<div id="lb-nexus-body">' +
          '<div id="lb-ring-wrap">' +
            '<svg id="lb-ring-svg" viewBox="0 0 100 100" width="120" height="120">' +
              '<circle cx="50" cy="50" r="40" fill="none" stroke="var(--lb-surface-alt)" stroke-width="7"/>' +
              '<g id="lb-ring-group">' +
                '<circle id="lb-ring-fill" cx="50" cy="50" r="40" fill="none" stroke="var(--lb-blue)" stroke-width="7" stroke-linecap="round" stroke-dasharray="70 181.3" stroke-dashoffset="0"/>' +
              '</g>' +
              '<text id="lb-ring-count" x="50" y="47" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="17" font-weight="700" fill="#1a1d27">\u2014</text>' +
              '<text id="lb-ring-denom" x="50" y="62" text-anchor="middle" font-family="Outfit,sans-serif" font-size="9" font-weight="600" fill="#8b90a3" letter-spacing="0.5">SCANNING</text>' +
            '</svg>' +
          '</div>' +
          '<div id="lb-nexus-status">' +
            '<div class="lb-prog-row">' +
              '<span class="lb-prog-label">Fetch</span>' +
              '<div class="lb-prog-track"><div class="lb-prog-fill done" id="lb-fetch-fill"></div></div>' +
              '<span class="lb-prog-meta" id="lb-fetch-meta">Last: ' + fetchStr + '</span>' +
            '</div>' +
            '<div class="lb-prog-row">' +
              '<span class="lb-prog-label">Floor</span>' +
              '<div class="lb-prog-track lb-split-track" id="lb-split-track"></div>' +
              '<span class="lb-prog-meta" id="lb-split-meta">\u2014</span>' +
            '</div>' +
            '<div class="lb-prog-row">' +
              '<span class="lb-prog-label">Filter</span>' +
              '<div class="lb-prog-track lb-filter-track"><div class="lb-filter-fill" id="lb-filter-fill"></div></div>' +
              '<span class="lb-prog-meta" id="lb-filter-meta">\u2014</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // KPI GRID — 3 main + 4 department
      '<div class="lb-kpi-grid">' +
        '<div class="lb-kpi" data-accent="green">' +
          '<div class="lb-kpi-label">On Floor</div>' +
          '<div class="lb-kpi-value" id="lb-kpi-in">' + rosterIN.length + '</div>' +
          '<div class="lb-kpi-sub">Currently punched IN</div>' +
        '</div>' +
        '<div class="lb-kpi" data-accent="red">' +
          '<div class="lb-kpi-label">Clocked Out</div>' +
          '<div class="lb-kpi-value" id="lb-kpi-out">' + rosterOUT.length + '</div>' +
          '<div class="lb-kpi-sub">Punched OUT in last 2h</div>' +
        '</div>' +
        '<div class="lb-kpi" data-accent="blue">' +
          '<div class="lb-kpi-label">Total</div>' +
          '<div class="lb-kpi-value" id="lb-kpi-total">' + total + '</div>' +
          '<div class="lb-kpi-sub">IN + OUT this window</div>' +
        '</div>' +
        '<div class="lb-kpi" data-accent="purple">' +
          '<div class="lb-kpi-label">Inbound</div>' +
          '<div class="lb-kpi-value" id="lb-kpi-inbound">0</div>' +
          '<div class="lb-kpi-sub">Dept filter result</div>' +
        '</div>' +
        '<div class="lb-kpi" data-accent="blue">' +
          '<div class="lb-kpi-label">Outbound</div>' +
          '<div class="lb-kpi-value" id="lb-kpi-outbound">0</div>' +
          '<div class="lb-kpi-sub">Dept filter result</div>' +
        '</div>' +
        '<div class="lb-kpi" data-accent="amber">' +
          '<div class="lb-kpi-label">ICQA</div>' +
          '<div class="lb-kpi-value" id="lb-kpi-icqa">0</div>' +
          '<div class="lb-kpi-sub">Dept filter result</div>' +
        '</div>' +
        '<div class="lb-kpi" data-accent="red">' +
          '<div class="lb-kpi-label">Others</div>' +
          '<div class="lb-kpi-value" id="lb-kpi-others">0</div>' +
          '<div class="lb-kpi-sub">Unmapped / errors</div>' +
        '</div>' +
      '</div>';
    setSplitBar();
    document.getElementById('lb-stop-btn').addEventListener('click', stopLive);
    setTimeout(() => animateRing(rosterIN.length), 50);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DEPARTMENT TAB RENDERER
  // ═══════════════════════════════════════════════════════════════════════════

  function renderDeptPanel(panelId, deptKey, label) {
    const panel = document.getElementById(panelId); if (!panel) return;
    const n = deptCounts[deptKey.toUpperCase()] || 0;

    panel.innerHTML =
      '<div class="dept-toolbar">' +
        '<span class="dept-toolbar-title">' + esc(label) + '</span>' +
        '<span class="dept-toolbar-count" id="dept-count-' + deptKey + '">' + n + ' associate' + (n !== 1 ? 's' : '') + '</span>' +
        '<input class="dept-toolbar-search" id="dept-search-' + deptKey + '" type="text" placeholder="Search by name or path...">' +
      '</div>' +
      '<div id="dept-empty-' + deptKey + '"' + (n > 0 ? ' style="display:none"' : '') + ' class="lb-empty">' +
        '<div class="lb-empty-ring"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--lb-text-3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div>' +
        '<div class="lb-empty-title">No ' + label + ' associates yet</div>' +
        '<div class="lb-empty-sub">Start the laborboard. Groups appear here as each employee is filtered through PPA.</div>' +
      '</div>' +
      '<div id="dept-body-' + deptKey + '"></div>';

    // Re-populate path groups from already-resolved employees
    Object.values(empData).forEach(emp => {
      if (emp.dept === deptKey.toUpperCase()) pushToTab(emp);
    });

    // Search: filter cards by name; hide entire path group if no cards match
    document.getElementById('dept-search-' + deptKey).addEventListener('input', function() {
      const q = this.value.toLowerCase();
      const body = document.getElementById('dept-body-' + deptKey);
      if (!body) return;
      body.querySelectorAll('.path-group').forEach(group => {
        let anyVisible = false;
        group.querySelectorAll('.emp-card').forEach(card => {
          const nameMatch = (card.dataset.name || '').includes(q);
          const pathMatch = (group.dataset.path || '').includes(q);
          const show = !q || nameMatch || pathMatch;
          card.style.display = show ? '' : 'none';
          if (show) anyVisible = true;
        });
        group.style.display = anyVisible ? '' : 'none';
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  BUILD OVERLAY
  // ═══════════════════════════════════════════════════════════════════════════

  const fab = document.createElement('button');
  fab.id = 'lb-fab'; fab.title = 'SNA4 Live Laborboard';
  fab.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
  document.body.appendChild(fab);

  const TABS = [
    { id:'home', label:'Home',
      icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
    { id:'inbound', label:'Inbound', badge:'badge-inbound', badgeDept:'inbound',
      icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>' },
    { id:'outbound', label:'Outbound', badge:'badge-outbound', badgeDept:'outbound',
      icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>' },
    { id:'icqa', label:'ICQA', badge:'badge-icqa', badgeDept:'icqa',
      icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>' },
    { id:'settings', label:'Settings',
      icon:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' },
  ];

  const overlay = document.createElement('div');
  overlay.id = 'lb-overlay';

  const tabsHTML = TABS.map((t,i) => {
    let badgeHTML = '';
    if (t.badge) badgeHTML = '<span class="lb-tab-badge" id="' + t.badge + '" data-dept="' + t.badgeDept + '">0</span>';
    return '<button class="lb-tab' + (i===0 ? ' active' : '') + '" data-panel="' + t.id + '"><span class="lb-tab-icon">' + t.icon + '</span>' + t.label + badgeHTML + '</button>';
  }).join('');

  function emptyPanel(label) {
    return '<div class="lb-empty"><div class="lb-empty-ring"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--lb-text-3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></div><div class="lb-empty-title">' + label + '</div><div class="lb-empty-sub">Content coming soon.</div></div>';
  }

  const panelsHTML = TABS.map((t,i) => {
    let inner = '';
    if (t.id === 'settings') inner = emptyPanel('Settings');
    return '<div class="lb-panel' + (i===0 ? ' active' : '') + '" id="panel-' + t.id + '">' + inner + '</div>';
  }).join('');

  overlay.innerHTML =
    '<header id="lb-header">' +
      '<div id="lb-brand">' +
        '<div id="lb-brand-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>' +
        '<div id="lb-brand-text"><span id="lb-brand-name">SNA4</span><span id="lb-brand-sub">Live Laborboard</span></div>' +
      '</div>' +
      '<nav id="lb-tabs">' + tabsHTML + '</nav>' +
      '<div id="lb-header-right">' +
        '<div id="lb-live-pill"><div id="lb-live-dot"></div><span id="lb-live-label">Live</span><span id="lb-live-time">--:--:--</span></div>' +
        '<button id="lb-close-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '</div>' +
    '</header>' +
    '<div id="lb-body">' + panelsHTML + '</div>';

  document.body.appendChild(overlay);
  const siteTag = document.createElement('div');
  siteTag.id = 'lb-site-tag'; siteTag.textContent = 'SNA4 FC';
  document.body.appendChild(siteTag);

  // Init
  showIdleState();

  function tick() {
    const el = document.getElementById('lb-live-time');
    if (el) el.textContent = new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});
  }
  tick(); setInterval(tick, 1000);

  // ═══════════════════════════════════════════════════════════════════════════
  //  EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════

  fab.addEventListener('click', () => overlay.classList.add('open'));
  document.getElementById('lb-close-btn').addEventListener('click', () => overlay.classList.remove('open'));

  document.getElementById('lb-tabs').addEventListener('click', e => {
    const btn = e.target.closest('.lb-tab'); if (!btn) return;
    const id = btn.dataset.panel;
    document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.lb-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-'+id);
    panel.classList.add('active');
    // Render dept tabs on switch
    if (id === 'inbound')  renderDeptPanel('panel-inbound',  'inbound',  'Inbound');
    if (id === 'outbound') renderDeptPanel('panel-outbound', 'outbound', 'Outbound');
    if (id === 'icqa')     renderDeptPanel('panel-icqa',     'icqa',     'ICQA');
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.classList.remove('open'); });

})();

