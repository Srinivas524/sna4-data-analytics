// ==UserScript==
// @name         SNA4 Data Analytics — Bootloader
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Multi-page bootloader — hijacks SharePoint pages and loads SNA4 Data Analytics suite
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/Home.aspx
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/TaktTimeStudy.aspx
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/InferredAnalysis.aspx
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/CollabHome.aspx
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      amazon.sharepoint.com
// @connect      raw.githubusercontent.com
// @connect      fclm-portal.amazon.com
// @updateURL    https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// @downloadURL  https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ══════════════════════════════════════════════════════════

  var BOOT_VERSION = '2.1';
  var APP_NAME = 'SNA4 Data Analytics';

  var SP_BASE = 'https://amazon.sharepoint.com/sites/TackAnalysis';
  var FILE_BASE = SP_BASE + '/SNA4_UI';

  // ── PAGE DETECTION ─────────────────────────────────────
  var PAGE_MAP = {
    'home': {
      patterns: ['/sitepages/home.aspx'],
      title: 'SNA4 Data Analytics',
      files: {
        html: FILE_BASE + '/home/home.html',
        css:  FILE_BASE + '/home/home.css',
        js:   FILE_BASE + '/home/home.js'
      }
    },
    'takt': {
      patterns: ['/sitepages/takttimestudy.aspx', '/sitepages/collabhome.aspx'],
      title: 'Takt Time Study \u2014 SNA4',
      files: {
        html: FILE_BASE + '/takt/index.html',
        css:  FILE_BASE + '/takt/main.css',
        js:   FILE_BASE + '/takt/app.js'
      }
    },
    'inferred': {
      patterns: ['/sitepages/inferredanalysis.aspx'],
      title: 'Inferred Time Analysis \u2014 SNA4',
      files: {
        html: FILE_BASE + '/inferred/inferred.html',
        css:  FILE_BASE + '/inferred/inferred.css',
        js:   FILE_BASE + '/inferred/inferred.js'
      }
    }
  };

  // ── SHARED FILES (loaded on every page) ────────────────
  var SHARED_FILES = {
    css: FILE_BASE + '/shared/common.css',
    js:  FILE_BASE + '/shared/common.js'
  };

  var ROOT_ID = 'sna4-root';

  // ── DETECT CURRENT PAGE ────────────────────────────────
  function detectPage() {
    var path = window.location.pathname.toLowerCase();
    var pageKeys = Object.keys(PAGE_MAP);
    for (var i = 0; i < pageKeys.length; i++) {
      var key = pageKeys[i];
      var patterns = PAGE_MAP[key].patterns;
      for (var j = 0; j < patterns.length; j++) {
        if (path.indexOf(patterns[j]) > -1) {
          return key;
        }
      }
    }
    return null;
  }

  var CURRENT_PAGE = detectPage();

  // If we can't detect the page, bail out
  if (!CURRENT_PAGE) {
    console.warn('[SNA4 BOOT] Unknown page \u2014 bootloader inactive');
    return;
  }

  var PAGE_CONFIG = PAGE_MAP[CURRENT_PAGE];

  console.log('[SNA4 BOOT] Detected page: ' + CURRENT_PAGE + ' (' + PAGE_CONFIG.title + ')');

  // ── EXPOSE GLOBALS FOR COMMON.JS AND PAGE JS ───────────
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

  // Expose current page info for common.js
  window.SNA4_CURRENT_PAGE = CURRENT_PAGE;


  // ══════════════════════════════════════════════════════════
  // SHAREPOINT BLOCKER
  // ══════════════════════════════════════════════════════════

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


  // ══════════════════════════════════════════════════════════
  // FILE FETCHER
  // ══════════════════════════════════════════════════════════

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


  // ══════════════════════════════════════════════════════════
  // LEAK CLEANER
  // ══════════════════════════════════════════════════════════

  function cleanLeaks() {
    if (!document.body) return;
    var children = document.body.children;
    for (var i = children.length - 1; i >= 0; i--) {
      var child = children[i];
      if (child.id !== ROOT_ID &&
          child.tagName !== 'SCRIPT' &&
          !child.classList.contains('sna4-toast')) {
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
          if (node.nodeType === 1 &&
              node.id !== ROOT_ID &&
              node.tagName !== 'SCRIPT' &&
              !node.classList.contains('sna4-toast')) {
            node.remove();
          }
        }
      }
    });

    if (document.body) {
      bodyObserver.observe(document.body, { childList: true });
    }
  }


  // ══════════════════════════════════════════════════════════
  // LOADING SPINNER
  // ══════════════════════════════════════════════════════════

  function showLoadingScreen(pageName) {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = '#0f172a';
    document.body.style.fontFamily = "'Inter', system-ui, sans-serif";

    var pageLabel = pageName || APP_NAME;

    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:20px;">' +
        '<div style="width:48px;height:48px;border:4px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;"></div>' +
        '<div style="color:#e2e8f0;font-size:18px;font-weight:700;letter-spacing:-0.3px;">' + APP_NAME + '</div>' +
        '<div style="color:#64748b;font-size:13px;">Loading ' + pageLabel + '...</div>' +
        '<div style="display:flex;gap:6px;margin-top:8px;" id="sna4-boot-progress">' +
          '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-shared-css"></div>' +
          '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-shared-js"></div>' +
          '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-page-html"></div>' +
          '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-page-css"></div>' +
          '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-page-js"></div>' +
        '</div>' +
        '<div style="color:#475569;font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-top:4px;">v' + BOOT_VERSION + '</div>' +
      '</div>' +
      '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
  }

  function markProgress(dotId) {
    var dot = document.getElementById(dotId);
    if (dot) dot.style.background = '#6366f1';
  }


  // ══════════════════════════════════════════════════════════
  // ERROR SCREEN
  // ══════════════════════════════════════════════════════════

  function showBootError(title, message) {
    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;">' +
        '<div style="font-size:48px;">\u26A0\uFE0F</div>' +
        '<div style="font-size:22px;font-weight:800;">' + title + '</div>' +
        '<div style="font-size:14px;color:#f87171;max-width:600px;text-align:center;word-break:break-all;">' + message + '</div>' +
        '<div style="margin-top:20px;padding:16px;background:#1e293b;border-radius:12px;font-size:12px;color:#94a3b8;max-width:600px;width:100%;">' +
          '<div style="font-weight:700;margin-bottom:8px;color:#cbd5e1;">Page: ' + CURRENT_PAGE + '</div>' +
          '<div style="font-weight:700;margin-bottom:8px;color:#cbd5e1;">Files attempted:</div>' +
          '<div>Shared CSS: ' + SHARED_FILES.css + '</div>' +
          '<div>Shared JS: ' + SHARED_FILES.js + '</div>' +
          '<div>Page HTML: ' + PAGE_CONFIG.files.html + '</div>' +
          '<div>Page CSS: ' + PAGE_CONFIG.files.css + '</div>' +
          '<div>Page JS: ' + PAGE_CONFIG.files.js + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:16px;">' +
          '<button onclick="location.reload()" style="padding:10px 24px;border-radius:10px;border:none;background:#6366f1;color:white;font-size:14px;font-weight:700;cursor:pointer;">Reload Page</button>' +
          '<button onclick="location.href=\'' + SP_BASE + '/SitePages/Home.aspx\'" style="padding:10px 24px;border-radius:10px;border:2px solid #334155;background:transparent;color:#94a3b8;font-size:14px;font-weight:700;cursor:pointer;">\u2190 Home</button>' +
        '</div>' +
      '</div>';
  }


  // ══════════════════════════════════════════════════════════
  // BOOT SEQUENCE
  // ══════════════════════════════════════════════════════════

  function boot() {
    spBlocker.disconnect();

    // Wipe page completely
    while (document.head.firstChild) document.head.firstChild.remove();
    while (document.body && document.body.firstChild) document.body.firstChild.remove();

    // Set document basics
    document.title = PAGE_CONFIG.title;
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(meta);

    // Show loading screen
    showLoadingScreen(PAGE_CONFIG.title);

    console.log('[SNA4 BOOT] Loading files for: ' + CURRENT_PAGE);
    console.log('[SNA4 BOOT] Shared: common.css + common.js');
    console.log('[SNA4 BOOT] Page: ' + PAGE_CONFIG.files.html);

    // ── PHASE 1: Fetch ALL files in parallel ─────────────
    var fetchPromises = {
      sharedCSS: fetchFile(SHARED_FILES.css).then(function (r) { markProgress('bp-shared-css'); return r; }),
      sharedJS:  fetchFile(SHARED_FILES.js).then(function (r) { markProgress('bp-shared-js'); return r; }),
      pageHTML:  fetchFile(PAGE_CONFIG.files.html).then(function (r) { markProgress('bp-page-html'); return r; }),
      pageCSS:   fetchFile(PAGE_CONFIG.files.css).then(function (r) { markProgress('bp-page-css'); return r; }),
      pageJS:    fetchFile(PAGE_CONFIG.files.js).then(function (r) { markProgress('bp-page-js'); return r; })
    };

    // Convert to array for Promise.all but keep keys
    var keys = Object.keys(fetchPromises);
    var promiseArray = keys.map(function (k) { return fetchPromises[k]; });

    Promise.all(promiseArray).then(function (results) {
      var files = {};
      for (var i = 0; i < keys.length; i++) {
        files[keys[i]] = results[i];
      }

      console.log('[SNA4 BOOT] All files loaded, injecting...');

      // ── PHASE 2: Inject CSS (shared first, then page-specific) ──
      GM_addStyle(files.sharedCSS);
      GM_addStyle(files.pageCSS);
      console.log('[SNA4 BOOT] \u2705 CSS injected (shared + page)');

      // ── PHASE 3: Execute shared common.js ──────────────
      try {
        eval(files.sharedJS);
        console.log('[SNA4 BOOT] \u2705 Common module loaded');
      } catch (err) {
        console.error('[SNA4 BOOT] Common JS error:', err);
        showBootError('Common Module Error', err.message);
        return;
      }

      // Verify common module loaded
      if (!window.SNA4) {
        showBootError('Module Load Failed', 'window.SNA4 not found after executing common.js');
        return;
      }

      // ── PHASE 4: Inject page HTML ─────────────────────
      document.body.innerHTML = files.pageHTML;
      console.log('[SNA4 BOOT] \u2705 Page HTML injected');

      // ── PHASE 5: Execute page-specific JS ─────────────
      try {
        eval(files.pageJS);
        console.log('[SNA4 BOOT] \u2705 Page JS executed \u2014 ' + CURRENT_PAGE + ' initialized');
      } catch (err) {
        console.error('[SNA4 BOOT] Page JS error:', err);
        showBootError('Page JavaScript Error', CURRENT_PAGE + ': ' + err.message);
        return;
      }

      // ── PHASE 6: Clean up SharePoint leaks ────────────
      startLeakCleaner();

      console.log('[SNA4 BOOT] \u2705 Boot complete \u2014 ' + PAGE_CONFIG.title);

    }).catch(function (err) {
      console.error('[SNA4 BOOT] File fetch failed:', err);
      showBootError('File Load Failed', err.message);
    });
  }


  // ══════════════════════════════════════════════════════════
  // TRIGGER BOOT
  // ══════════════════════════════════════════════════════════

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
