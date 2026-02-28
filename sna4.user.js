// ==UserScript==
// @name         SNA4 Takt Time Study Timer
// @namespace    http://tampermonkey.net/
// @version      12.0
// @description  Floating time study timer — loaded from SharePoint
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/CollabHome.aspx*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      amazon.sharepoint.com
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// @downloadURL  https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ═══════════════════════════════════════════════
    //  HARDCODED URLS — only SharePoint base needed
    // ═══════════════════════════════════════════════
    var SP_BASE = 'https://amazon.sharepoint.com/sites/TackAnalysis/SNA4_UI/takt';

    var FILES = {
        html: SP_BASE + '/index.html',
        css:  SP_BASE + '/css/main.css',
        js:   SP_BASE + '/js/app.js'
    };

    // ═══════════════════════════════════════════════
    //  EXPOSE GM_ FUNCTIONS FOR EVAL'D CODE
    // ═══════════════════════════════════════════════
    window.GM_xmlhttpRequest_proxy = GM_xmlhttpRequest;

    // ═══════════════════════════════════════════════
    //  FILE FETCHER
    // ═══════════════════════════════════════════════
    function fetchFile(url) {
        return new Promise(function (resolve, reject) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url + '?_=' + Date.now(),
                headers: {
                    'Accept': 'text/html,text/css,application/javascript,*/*',
                    'Cache-Control': 'no-cache'
                },
                onload: function (res) {
                    if (res.status === 200) resolve(res.responseText);
                    else reject('HTTP ' + res.status + ' for ' + url);
                },
                onerror: function () { reject('Network error: ' + url); }
            });
        });
    }

    // ═══════════════════════════════════════════════
    //  BOOT
    // ═══════════════════════════════════════════════
    async function boot() {
        try {
            console.log('[TAKT] Fetching files from SharePoint...');

            var results = await Promise.all([
                fetchFile(FILES.html),
                fetchFile(FILES.css),
                fetchFile(FILES.js)
            ]);

            var html = results[0];
            var css  = results[1];
            var js   = results[2];

            // Inject CSS
            GM_addStyle(css);
            console.log('[TAKT] ✅ CSS injected');

            // Inject HTML — append overlay elements to body
            var container = document.createElement('div');
            container.innerHTML = html;
            while (container.firstChild) {
                document.body.appendChild(container.firstChild);
            }
            console.log('[TAKT] ✅ HTML injected');

            // Execute JS
            try {
                eval(js);
                console.log('[TAKT] ✅ JS executed');
            } catch (jsErr) {
                console.error('[TAKT] ❌ JS error:', jsErr);
                console.error(jsErr.stack);
            }

            console.log('[TAKT] 🚀 Boot complete');

        } catch (err) {
            console.error('[TAKT] Boot failed:', err);
        }
    }

    // ═══════════════════════════════════════════════
    //  TRIGGER
    // ═══════════════════════════════════════════════
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
