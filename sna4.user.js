// ==UserScript==
// @name         SNA4 Takt Time Study — Bootloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Bootloader — hijacks SharePoint page and loads Takt Time Study app
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/CollabHome.aspx
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      amazon.sharepoint.com
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// @downloadURL  https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ── CONFIGURATION ──────────────────────────────────────
  var BOOT_VERSION = '1.0';
  var APP_NAME = 'SNA4 Takt Time Study';

  var SP_BASE = 'https://amazon.sharepoint.com/sites/TackAnalysis';
  var FILE_BASE = SP_BASE + '/SNA4_UI';

  var FILES = {
    html: FILE_BASE + '/index.html',
    css:  FILE_BASE + '/css/main.css',
    js:   FILE_BASE + '/js/app.js'
  };

  var ROOT_ID = 'takt-root';

  // ── EXPOSE GLOBALS FOR APP.JS ──────────────────────────
  window.TAKT_BOOT_VERSION = BOOT_VERSION;
  window.TAKT_GITHUB_RAW = 'https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js';

  window.GM_xmlhttpRequest_proxy = GM_xmlhttpRequest;

  window.SP_CONFIG = {
    site: SP_BASE,
    lists: {
      associates:     '9641b5b6-860a-40ad-898a-52224e6a68a3',
      observations:   'fc8a85eb-97e7-48e0-b02a-be81e072a1d1',
      dailySummaries: '3ccf4961-ff7f-4cad-b677-f68be5d8fbbe',
      processAvgs:    '5768158e-ac61-49fe-823f-3306a3767d67'
    },
    listUrl: function (listName) {
      return this.site + "/_api/web/lists(guid'" + this.lists[listName] + "')";
    }
  };

  // ── SHAREPOINT BLOCKER ─────────────────────────────────
  var spBlocker = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var nodes = mutations[i].addedNodes;
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];
        if (node.nodeType !== 1) continue;
        var tag = node.tagName;
        if (tag === 'LINK' || tag === 'STYLE' || tag === 'SCRIPT') {
          node.remove();
        }
      }
    }
  });
  if (document.documentElement) {
    spBlocker.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ── FILE FETCHER ───────────────────────────────────────
  function fetchFile(url) {
    return new Promise(function (resolve, reject) {
      GM_xmlhttpRequest({
        method: 'GET',
        url: url + '?_nocache=' + Date.now(),
        headers: { 'Cache-Control': 'no-cache' },
        timeout: 15000,
        onload: function (res) {
          if (res.status >= 200 && res.status < 400) {
            resolve(res.responseText);
          } else {
            reject(new Error('HTTP ' + res.status + ' for ' + url));
          }
        },
        onerror: function (err) { reject(new Error('Network error: ' + url)); },
        ontimeout: function () { reject(new Error('Timeout: ' + url)); }
      });
    });
  }

  // ── LEAK CLEANER ───────────────────────────────────────
  function cleanLeaks() {
    if (!document.body) return;
    var children = document.body.children;
    for (var i = children.length - 1; i >= 0; i--) {
      var child = children[i];
      if (child.id !== ROOT_ID && child.tagName !== 'SCRIPT' && !child.classList.contains('takt-toast')) {
        child.remove();
      }
    }
  }

  function startLeakCleaner() {
    cleanLeaks();
    setTimeout(cleanLeaks, 500);
    setTimeout(cleanLeaks, 1000);
    setTimeout(cleanLeaks, 2000);
    setTimeout(cleanLeaks, 5000);

    var bodyObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          if (node.nodeType === 1 && node.id !== ROOT_ID && node.tagName !== 'SCRIPT' && !node.classList.contains('takt-toast')) {
            node.remove();
          }
        }
      }
    });
    if (document.body) {
      bodyObserver.observe(document.body, { childList: true });
    }
  }

  // ── BOOT ───────────────────────────────────────────────
  function boot() {
    spBlocker.disconnect();

    // Wipe page
    while (document.head.firstChild) document.head.firstChild.remove();
    while (document.body && document.body.firstChild) document.body.firstChild.remove();

    // Set document basics
    document.title = APP_NAME;
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(meta);

    // Loading spinner
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = '#0f172a';
    document.body.style.fontFamily = "'Inter', system-ui, sans-serif";
    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:20px;">' +
        '<div style="width:48px;height:48px;border:4px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;"></div>' +
        '<div style="color:#e2e8f0;font-size:18px;font-weight:700;letter-spacing:-0.3px;">' + APP_NAME + '</div>' +
        '<div style="color:#64748b;font-size:13px;">Loading application files...</div>' +
      '</div>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';

    console.log('[TAKT BOOT] Fetching app files...');

    // Fetch all files
    Promise.all([
      fetchFile(FILES.html),
      fetchFile(FILES.css),
      fetchFile(FILES.js)
    ]).then(function (results) {
      var htmlContent = results[0];
      var cssContent = results[1];
      var jsContent = results[2];

      console.log('[TAKT BOOT] All files loaded, injecting...');

      // Inject CSS
      GM_addStyle(cssContent);

      // Inject HTML
      document.body.innerHTML = htmlContent;

      // Execute JS
      try {
        eval(jsContent);
        console.log('[TAKT BOOT] App initialized successfully');
      } catch (err) {
        console.error('[TAKT BOOT] JS execution error:', err);
        showBootError('JavaScript Error', err.message);
      }

      // Clean up SP leaks
      startLeakCleaner();

    }).catch(function (err) {
      console.error('[TAKT BOOT] File fetch failed:', err);
      showBootError('File Load Failed', err.message);
    });
  }

  function showBootError(title, message) {
    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;">' +
        '<div style="font-size:48px;">⚠️</div>' +
        '<div style="font-size:22px;font-weight:800;">' + title + '</div>' +
        '<div style="font-size:14px;color:#f87171;max-width:600px;text-align:center;word-break:break-all;">' + message + '</div>' +
        '<div style="margin-top:20px;padding:16px;background:#1e293b;border-radius:12px;font-size:12px;color:#94a3b8;max-width:600px;width:100%;">' +
          '<div style="font-weight:700;margin-bottom:8px;color:#cbd5e1;">Expected file URLs:</div>' +
          '<div>HTML: ' + FILES.html + '</div>' +
          '<div>CSS: ' + FILES.css + '</div>' +
          '<div>JS: ' + FILES.js + '</div>' +
        '</div>' +
        '<button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;border-radius:10px;border:none;background:#6366f1;color:white;font-size:14px;font-weight:700;cursor:pointer;">Reload Page</button>' +
      '</div>';
  }

  // ── TRIGGER ────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
