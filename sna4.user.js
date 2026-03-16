// ==UserScript==
// @name         SNA4 Data Analytics — Bootloader
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Thin bootloader stub — loads private config from SharePoint
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/*
// @match        https://iad.alps-basecamp.lamps.amazon.dev/SNA4/*
// @match        http://connrand-dev.aka.corp.amazon.com:3000/SNA4/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @connect      amazon.sharepoint.com
// @connect      raw.githubusercontent.com
// @connect      fclm-portal.amazon.com
// @connect      hooks.slack.com
// @connect      badgephotos.corp.amazon.com
// @connect      localhost
// @connect      rodeo-iad.amazon.com
// @connect      alps-iad.iad.proxy.amazon.com
// @connect      api.ramdos.org
// @connect      sspot.iad.corp.amazon.com
// @updateURL    https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// @downloadURL  https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// ==/UserScript==

(function () {
  'use strict';

  var CONFIG_URL = 'https://amazon.sharepoint.com/sites/TackAnalysis/SNA4_UI/boot-config.js';

  // ══════════════════════════════════════════════════════════
  //  ALPS / KIOSK DOMAIN DETECTION — BEFORE ANY DOM CHANGES
  //
  //  ⚠️ CRITICAL: On ALPS pages we must NOT touch the DOM.
  //  The ALPS React app must remain intact so the scraper
  //  can read the rendered table. Any innerHTML replacement
  //  or style changes will destroy the SPA.
  // ══════════════════════════════════════════════════════════

  var isAlpsDomain  = window.location.hostname.indexOf('alps-basecamp') !== -1;
  var isKioskDomain = window.location.hostname.indexOf('connrand-dev') !== -1;
  var isDashboard   = !isAlpsDomain && !isKioskDomain;

  // ── Expose GM APIs for the private config to use ───────
  window.__SNA4_GM = {
    xmlhttp:   GM_xmlhttpRequest,
    addStyle:  GM_addStyle,
    getValue:  GM_getValue,
    setValue:  GM_setValue,
    openInTab: GM_openInTab
  };

  // ── Loading indicator — ONLY on SharePoint dashboard pages ──
  if (isDashboard && document.body) {
    document.body.style.cssText = 'margin:0;padding:0;background:#0f172a;';
    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;">' +
        '<div style="width:40px;height:40px;border:3px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:s 1s linear infinite;"></div>' +
        '<div style="color:#64748b;font-family:system-ui;font-size:13px;">Initializing SNA4...</div>' +
      '</div>' +
      '<style>@keyframes s{to{transform:rotate(360deg)}}</style>';
  }

  if (isAlpsDomain) {
    console.log('[SNA4 STUB] ALPS domain detected — fetching config without touching DOM');
  }

  if (isKioskDomain) {
    console.log('[SNA4 STUB] Kiosk domain detected — fetching config without touching DOM');
  }

  // ── Fetch private boot config from SharePoint ──────────
  GM_xmlhttpRequest({
    method:  'GET',
    url:     CONFIG_URL + '?_nc=' + Date.now(),
    headers: { 'Cache-Control': 'no-cache' },
    timeout: 20000,
    onload: function (res) {
      if (res.status >= 200 && res.status < 400) {

        // ── Origin validation ────────────────────────────
        if (res.finalUrl &&
            res.finalUrl.indexOf('amazon.sharepoint.com') === -1) {
          if (isDashboard) showError('Security Error', 'Config origin mismatch — possible redirect');
          return;
        }

        // ── Signature check ─────────────────────────────
        if (res.responseText.indexOf('// SNA4-CONFIG-V') !== 0) {
          if (isDashboard) showError('Integrity Error', 'Config file signature missing or invalid');
          return;
        }

        try {
          eval(res.responseText);
        } catch (err) {
          console.error('[SNA4 STUB] Config eval error:', err);
          if (isDashboard) showError('Config Execution Failed', err.message);
        }
      } else {
        console.error('[SNA4 STUB] Config fetch HTTP ' + res.status);
        if (isDashboard) showError('Config Load Failed', 'HTTP ' + res.status);
      }
    },
    onerror: function () {
      console.error('[SNA4 STUB] Network error fetching config');
      if (isDashboard) showError('Network Error', 'Cannot reach SharePoint — are you on VPN?');
    },
    ontimeout: function () {
      console.error('[SNA4 STUB] Config fetch timeout');
      if (isDashboard) showError('Timeout', 'SharePoint did not respond within 20 seconds');
    }
  });

  function showError(title, msg) {
    if (!document.body) return;
    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'height:100vh;font-family:system-ui;background:#0f172a;color:#e2e8f0;gap:14px;">' +
        '<div style="font-size:40px;">\u26A0\uFE0F</div>' +
        '<div style="font-size:20px;font-weight:800;">' + title + '</div>' +
        '<div style="color:#f87171;font-size:13px;max-width:500px;text-align:center;word-break:break-all;">' + msg + '</div>' +
        '<div style="display:flex;gap:10px;margin-top:12px;">' +
          '<button onclick="location.reload()" style="padding:9px 22px;border-radius:9px;border:none;' +
          'background:#6366f1;color:white;font-weight:700;cursor:pointer;font-size:13px;">Retry</button>' +
        '</div>' +
        '<div style="color:#475569;font-size:10px;margin-top:8px;">Stub v3.1</div>' +
      '</div>';
  }

})();
