// ==UserScript==
// @name         SNA4 Data Analytics — Bootloader
// @namespace    http://tampermonkey.net/
// @version      4.5
// @description  Thin bootloader stub — loads private config from SharePoint
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/Home.aspx*
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/TaktTimeStudy.aspx*
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/InferredAnalysis.aspx*
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/CollabHome.aspx*
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/OB-Planner.aspx*
// @match        https://iad.alps-basecamp.lamps.amazon.dev/SNA4/*
// @match        http://connrand-dev.aka.corp.amazon.com:3000/SNA4/kiosk/facilities/pit_red_tags*
// @run-at       document-start
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
// @connect      prod-pdx.yinliy.people.amazon.dev
// @connect      sspot.iad.corp.amazon.com
// @connect      sort.aka.amazon.com
// @connect      process-path.na.picking.aft.a2z.com
// @updateURL    https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// @downloadURL  https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════
  //  SHAREPOINT FRAMEWORK SUPPRESSOR (Firefox-safe)
  //
  //  window.stop() kills Tampermonkey's execution context in
  //  Firefox, so instead we inject an early <style> that:
  //    • Sets background to dark immediately (no SP flash)
  //    • Hides all body children (SP UI never visible)
  //
  //  Boot-config handles the real cleanup:
  //    • SP DOM blocker (MutationObserver strips link/style/script)
  //    • boot() wipes <head> and <body> completely
  //    • Leak cleaner catches any stragglers
  //
  //  SP framework still downloads (~800KB) but never renders.
  //  No visual difference to the user.
  // ══════════════════════════════════════════════════════════
  if (window.location.hostname.indexOf('amazon.sharepoint.com') !== -1 &&
      window.location.pathname.toLowerCase().indexOf('/sitepages/') !== -1) {

    var earlyStyle = document.createElement('style');
    earlyStyle.textContent = 'html, body { background: #0f172a !important; } ' +
                             'body > * { display: none !important; }';
    (document.head || document.documentElement).appendChild(earlyStyle);
  }
  // ══════════════════════════════════════════════════════════

  var CONFIG_URL = 'https://amazon.sharepoint.com/sites/TackAnalysis/SNA4_UI/boot-config.js';

  // ══════════════════════════════════════════════════════════
  //  DOMAIN DETECTION
  //
  //  ⚠️ CRITICAL: On ALPS pages we must NOT touch the DOM.
  //  The ALPS React SPA must remain intact so the scraper
  //  can read the rendered table. Any innerHTML replacement
  //  or style changes will destroy the SPA and cause scrape
  //  timeouts.
  //
  //  On kiosk pages we also leave the DOM alone.
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

  // ── Dashboard — version watermark ─────────────────────
  //  Early style hides SP content. We add a subtle version
  //  tag that boot-config.js will replace with the real UI.
  if (isDashboard && document.body) {
    var versionTag = document.createElement('div');
    versionTag.style.cssText = 'position:fixed;bottom:20px;right:20px;' +
      'color:#334155;font-family:system-ui;font-size:11px;z-index:999999;';
    versionTag.textContent = 'SNA4 v4.5';
    document.body.appendChild(versionTag);
  }

  if (isAlpsDomain) {
    console.log('[SNA4 STUB] ALPS domain — fetching config without touching DOM');
  }
  if (isKioskDomain) {
    console.log('[SNA4 STUB] Kiosk domain — fetching config without touching DOM');
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
          console.error('[SNA4 STUB] Config origin mismatch');
          if (isDashboard) showError('Security Error', 'Config origin mismatch — possible redirect');
          return;
        }

        // ── Signature check ─────────────────────────────
        if (res.responseText.indexOf('// SNA4-CONFIG-V') !== 0) {
          console.error('[SNA4 STUB] Config signature invalid');
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
        '<div style="color:#475569;font-size:10px;margin-top:8px;">Stub v4.5</div>' +
      '</div>';
  }

})();

