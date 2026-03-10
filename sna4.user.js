// ==UserScript==
// @name         SNA4 Data Analytics — Bootloader
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Multi-page bootloader — hijacks SharePoint pages and loads SNA4 Data Analytics suite
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/Home.aspx
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/TaktTimeStudy.aspx
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/InferredAnalysis.aspx
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/CollabHome.aspx
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/OB-Planner.aspx
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
// @connect      api.ramdos.org
// @updateURL    https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// @downloadURL  https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// ==/UserScript==

(function () {
  'use strict';

  var BOOT_VERSION = '2.6';
  var APP_NAME = 'SNA4 Data Analytics';

  var SP_BASE = 'https://amazon.sharepoint.com/sites/TackAnalysis';
  var FILE_BASE = SP_BASE + '/SNA4_UI';

  // ══════════════════════════════════════════════════════════
  //  PAGE MAP
  //
  //  files.html  — single string (one HTML shell per page)
  //  files.css   — string OR array (loaded in order)
  //  files.js    — string OR array (executed in order)
  // ══════════════════════════════════════════════════════════

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
    },
    'obplanner': {
      patterns: ['/sitepages/ob-planner.aspx'],
      title: 'OB Planner \u2014 SNA4',
      files: {
        html: FILE_BASE + '/obplanner/obplanner.html',
        css: [
          FILE_BASE + '/obplanner/obplanner.css',
          FILE_BASE + '/obplanner/obplanner-overall.css',
          FILE_BASE + '/obplanner/obplanner-pick.css',
          FILE_BASE + '/obplanner/obplanner-pack.css',
          FILE_BASE + '/obplanner/obplanner-dock.css'
        ],
        js: [
          FILE_BASE + '/obplanner/obplanner.js',
          FILE_BASE + '/obplanner/obplanner-overall.js',
          FILE_BASE + '/obplanner/obplanner-pick.js',
          FILE_BASE + '/obplanner/obplanner-pack.js',
          FILE_BASE + '/obplanner/obplanner-dock.js'
        ]
      }
    }
  };

  // 🤖 AI CHATBOT — chatbot files loaded on every page
  var SHARED_FILES = {
    css: FILE_BASE + '/shared/common.css',
    js:  FILE_BASE + '/shared/common.js',
    chatbotCSS: FILE_BASE + '/AI%20chatbot/chatbot.css',
    chatbotJS:  FILE_BASE + '/AI%20chatbot/chatbot.js'
  };

  var ROOT_ID = 'sna4-root';


  // ══════════════════════════════════════════════════════════
  //  PAGE DETECTION
  // ══════════════════════════════════════════════════════════

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

  if (!CURRENT_PAGE) {
    console.warn('[SNA4 BOOT] Unknown page \u2014 bootloader inactive');
    return;
  }

  var PAGE_CONFIG = PAGE_MAP[CURRENT_PAGE];

  console.log('[SNA4 BOOT] Detected page: ' + CURRENT_PAGE + ' (' + PAGE_CONFIG.title + ')');


  // ══════════════════════════════════════════════════════════
  //  GLOBAL EXPORTS
  // ══════════════════════════════════════════════════════════

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

  window.SNA4_CURRENT_PAGE = CURRENT_PAGE;


  // ══════════════════════════════════════════════════════════
  //  SHAREPOINT DOM BLOCKER
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
  //  FILE FETCHER
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
  //  HELPERS — Normalize string|array, fetch multiple files
  // ══════════════════════════════════════════════════════════

  function toArray(val) {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  }

  function fetchMultiple(urls) {
    // Fetches all URLs in parallel, returns results in order
    return Promise.all(urls.map(function (url) {
      return fetchFile(url);
    }));
  }


  // ══════════════════════════════════════════════════════════
  //  LEAK CLEANER
  // ══════════════════════════════════════════════════════════

  function cleanLeaks() {
    if (!document.body) return;
    var children = document.body.children;
    for (var i = children.length - 1; i >= 0; i--) {
      var child = children[i];
      if (child.id !== ROOT_ID &&
          child.id !== 'ai-chat-fab' &&
          child.id !== 'ai-chat-panel' &&
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
              node.id !== 'ai-chat-fab' &&
              node.id !== 'ai-chat-panel' &&
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
  //  LOADING SCREEN
  // ══════════════════════════════════════════════════════════

  function showLoadingScreen(pageName) {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.background = '#0f172a';
    document.body.style.fontFamily = "'Inter', system-ui, sans-serif";

    var pageLabel = pageName || APP_NAME;

    // Count total files for progress dots
    var cssUrls = toArray(PAGE_CONFIG.files.css);
    var jsUrls  = toArray(PAGE_CONFIG.files.js);
    var totalPageFiles = 1 + cssUrls.length + jsUrls.length; // html + css[] + js[]

    var dotsHTML = '';
    // Shared: css, js, chatbot (3 dots)
    dotsHTML += '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-shared-css"></div>';
    dotsHTML += '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-shared-js"></div>';
    dotsHTML += '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-chatbot"></div>';
    // Page HTML (1 dot)
    dotsHTML += '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-page-html"></div>';
    // Page CSS files
    for (var ci = 0; ci < cssUrls.length; ci++) {
      dotsHTML += '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-page-css-' + ci + '"></div>';
    }
    // Page JS files
    for (var ji = 0; ji < jsUrls.length; ji++) {
      dotsHTML += '<div class="bp" style="width:8px;height:8px;border-radius:50%;background:rgba(99,102,241,0.2);" id="bp-page-js-' + ji + '"></div>';
    }

    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:20px;">' +
        '<div style="width:48px;height:48px;border:4px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:spin 1s linear infinite;"></div>' +
        '<div style="color:#e2e8f0;font-size:18px;font-weight:700;letter-spacing:-0.3px;">' + APP_NAME + '</div>' +
        '<div style="color:#64748b;font-size:13px;">Loading ' + pageLabel + '...</div>' +
        '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;justify-content:center;max-width:300px;" id="sna4-boot-progress">' +
          dotsHTML +
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
  //  ERROR SCREEN
  // ══════════════════════════════════════════════════════════

  function showBootError(title, message) {
    var cssUrls = toArray(PAGE_CONFIG.files.css);
    var jsUrls  = toArray(PAGE_CONFIG.files.js);

    var filesAttempted = '';
    filesAttempted += '<div>Shared CSS: ' + SHARED_FILES.css + '</div>';
    filesAttempted += '<div>Shared JS: ' + SHARED_FILES.js + '</div>';
    filesAttempted += '<div>Page HTML: ' + PAGE_CONFIG.files.html + '</div>';
    for (var ci = 0; ci < cssUrls.length; ci++) {
      filesAttempted += '<div>Page CSS[' + ci + ']: ' + cssUrls[ci] + '</div>';
    }
    for (var ji = 0; ji < jsUrls.length; ji++) {
      filesAttempted += '<div>Page JS[' + ji + ']: ' + jsUrls[ji] + '</div>';
    }

    document.body.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;font-family:Inter,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;">' +
        '<div style="font-size:48px;">\u26A0\uFE0F</div>' +
        '<div style="font-size:22px;font-weight:800;">' + title + '</div>' +
        '<div style="font-size:14px;color:#f87171;max-width:600px;text-align:center;word-break:break-all;">' + message + '</div>' +
        '<div style="margin-top:20px;padding:16px;background:#1e293b;border-radius:12px;font-size:12px;color:#94a3b8;max-width:600px;width:100%;">' +
          '<div style="font-weight:700;margin-bottom:8px;color:#cbd5e1;">Page: ' + CURRENT_PAGE + '</div>' +
          '<div style="font-weight:700;margin-bottom:8px;color:#cbd5e1;">Files attempted:</div>' +
          filesAttempted +
        '</div>' +
        '<div style="display:flex;gap:10px;margin-top:16px;">' +
          '<button onclick="location.reload()" style="padding:10px 24px;border-radius:10px;border:none;background:#6366f1;color:white;font-size:14px;font-weight:700;cursor:pointer;">Reload Page</button>' +
          '<button onclick="location.href=\'' + SP_BASE + '/SitePages/Home.aspx\'" style="padding:10px 24px;border-radius:10px;border:2px solid #334155;background:transparent;color:#94a3b8;font-size:14px;font-weight:700;cursor:pointer;">\u2190 Home</button>' +
        '</div>' +
      '</div>';
  }


  // ══════════════════════════════════════════════════════════
  //  BOOT
  // ══════════════════════════════════════════════════════════

  function boot() {
    spBlocker.disconnect();

    while (document.head.firstChild) document.head.firstChild.remove();
    while (document.body && document.body.firstChild) document.body.firstChild.remove();

    document.title = PAGE_CONFIG.title;
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(meta);

    showLoadingScreen(PAGE_CONFIG.title);

    console.log('[SNA4 BOOT] Loading files for: ' + CURRENT_PAGE);

    // ── Normalize file lists ──────────────────────────────
    var cssUrls = toArray(PAGE_CONFIG.files.css);
    var jsUrls  = toArray(PAGE_CONFIG.files.js);

    // ── Build fetch map ───────────────────────────────────
    // Shared files
    var sharedCSSPromise = fetchFile(SHARED_FILES.css).then(function (r) { markProgress('bp-shared-css'); return r; });
    var sharedJSPromise  = fetchFile(SHARED_FILES.js).then(function (r) { markProgress('bp-shared-js'); return r; });
    var chatbotCSSPromise = fetchFile(SHARED_FILES.chatbotCSS).then(function (r) { markProgress('bp-chatbot'); return r; });
    var chatbotJSPromise  = fetchFile(SHARED_FILES.chatbotJS).then(function (r) { markProgress('bp-chatbot'); return r; });

    // Page HTML (single file)
    var pageHTMLPromise = fetchFile(PAGE_CONFIG.files.html).then(function (r) { markProgress('bp-page-html'); return r; });

    // Page CSS (array — fetch in parallel, mark individually)
    var pageCSSPromises = cssUrls.map(function (url, idx) {
      return fetchFile(url).then(function (r) { markProgress('bp-page-css-' + idx); return r; });
    });

    // Page JS (array — fetch in parallel, mark individually)
    var pageJSPromises = jsUrls.map(function (url, idx) {
      return fetchFile(url).then(function (r) { markProgress('bp-page-js-' + idx); return r; });
    });

    // ── Wait for everything ───────────────────────────────
    Promise.all([
      sharedCSSPromise,     // [0]
      sharedJSPromise,      // [1]
      chatbotCSSPromise,    // [2]
      chatbotJSPromise,     // [3]
      pageHTMLPromise,      // [4]
      Promise.all(pageCSSPromises),  // [5] — array of CSS strings
      Promise.all(pageJSPromises)    // [6] — array of JS strings
    ]).then(function (results) {

      var sharedCSS  = results[0];
      var sharedJS   = results[1];
      var chatbotCSS = results[2];
      var chatbotJS  = results[3];
      var pageHTML   = results[4];
      var pageCSSArr = results[5];  // string[]
      var pageJSArr  = results[6];  // string[]

      console.log('[SNA4 BOOT] All files loaded (' +
        '1 HTML, ' + pageCSSArr.length + ' CSS, ' + pageJSArr.length + ' JS' +
        '), injecting...');

      // ── 1. CSS — shared + page (in order) + chatbot ────
      GM_addStyle(sharedCSS);
      for (var ci = 0; ci < pageCSSArr.length; ci++) {
        GM_addStyle(pageCSSArr[ci]);
      }
      GM_addStyle(chatbotCSS);
      console.log('[SNA4 BOOT] \u2705 CSS injected (shared + ' + pageCSSArr.length + ' page + chatbot)');

      // ── 2. Shared JS (common module) ───────────────────
      // Only inject for pages that use it (non-obplanner)
      // OB Planner is self-contained — doesn't need common.js
      var needsCommonJS = (CURRENT_PAGE !== 'obplanner');

      if (needsCommonJS) {
        try {
          eval(sharedJS);
          console.log('[SNA4 BOOT] \u2705 Common module loaded');
        } catch (err) {
          console.error('[SNA4 BOOT] Common JS error:', err);
          showBootError('Common Module Error', err.message);
          return;
        }

        if (!window.SNA4) {
          showBootError('Module Load Failed', 'window.SNA4 not found after executing common.js');
          return;
        }
      } else {
        console.log('[SNA4 BOOT] \u2139\uFE0F Skipping common.js (page is self-contained)');
      }

      // ── 3. Page HTML ───────────────────────────────────
      document.body.innerHTML = pageHTML;
      console.log('[SNA4 BOOT] \u2705 Page HTML injected');

      // ── 4. Page JS — execute IN ORDER (core first) ─────
      for (var ji = 0; ji < pageJSArr.length; ji++) {
        try {
          eval(pageJSArr[ji]);
          var jsFileName = jsUrls[ji].split('/').pop();
          console.log('[SNA4 BOOT] \u2705 JS[' + ji + '] executed: ' + jsFileName);
        } catch (err) {
          var failedFile = jsUrls[ji].split('/').pop();
          console.error('[SNA4 BOOT] JS[' + ji + '] error (' + failedFile + '):', err);
          showBootError('JavaScript Error', failedFile + ': ' + err.message);
          return;
        }
      }

      console.log('[SNA4 BOOT] \u2705 All ' + pageJSArr.length + ' JS files executed');

      // ── 5. Chatbot overlay (non-blocking) ──────────────
      try {
        eval(chatbotJS);
        console.log('[SNA4 BOOT] \u2705 AI Chatbot loaded');
      } catch (err) {
        console.warn('[SNA4 BOOT] \u26A0\uFE0F AI Chatbot failed:', err.message);
      }

      // ── 6. Leak cleaner ────────────────────────────────
      startLeakCleaner();

      console.log('[SNA4 BOOT] \u2705 Boot complete \u2014 ' + PAGE_CONFIG.title +
        ' (' + pageCSSArr.length + ' CSS, ' + pageJSArr.length + ' JS)');

    }).catch(function (err) {
      console.error('[SNA4 BOOT] File fetch failed:', err);
      showBootError('File Load Failed', err.message);
    });
  }


  // ══════════════════════════════════════════════════════════
  //  START
  // ══════════════════════════════════════════════════════════

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
