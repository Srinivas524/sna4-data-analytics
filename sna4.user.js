// ==UserScript==
// @name         SNA4 Data Analytics & Automation
// @namespace    https://amazon.sharepoint.com/sites/TackAnalysis
// @version      1.0.1
// @description  Custom UI — loaded from SharePoint Document Library
// @author       Srinivas - SNA4 Team
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/CollabHome.aspx*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      amazon.sharepoint.com
// @connect      fclm-portal.amazon.com
// @connect      hooks.slack.com
// ==/UserScript==

(function () {
    'use strict';

    // ═══════════════════════════════════════════════
    //  HARDCODED URLS — NO CONCATENATION
    // ═══════════════════════════════════════════════
    const FILES = {
        html: 'https://amazon.sharepoint.com/sites/TackAnalysis/SNA4_UI/index.html',
        css:  'https://amazon.sharepoint.com/sites/TackAnalysis/SNA4_UI/css/main.css',
        js:   'https://amazon.sharepoint.com/sites/TackAnalysis/SNA4_UI/js/app.js'
    };

    const SP_SITE = 'https://amazon.sharepoint.com/sites/TackAnalysis';

    // ═══════════════════════════════════════════════
    //  BLOCK SHAREPOINT
    // ═══════════════════════════════════════════════
    const spBlocker = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            m.addedNodes.forEach((node) => {
                if (node.tagName === 'LINK' || node.tagName === 'STYLE') {
                    node.remove();
                }
            });
        });
    });
    spBlocker.observe(document.documentElement, { childList: true, subtree: true });

    // ═══════════════════════════════════════════════
    //  FILE FETCHER
    // ═══════════════════════════════════════════════
    function fetchFile(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'Accept': 'text/html,text/css,application/javascript,*/*'
                },
                onload: (res) => {
                    if (res.status === 200) {
                        resolve(res.responseText);
                    } else {
                        reject('HTTP ' + res.status + ' for ' + url);
                    }
                },
                onerror: (err) => reject('Network error: ' + url)
            });
        });
    }

    // ═══════════════════════════════════════════════
    //  SP API HELPERS
    // ═══════════════════════════════════════════════
    window.spGet = function (endpoint) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: SP_SITE + endpoint,
                headers: { 'Accept': 'application/json;odata=verbose' },
                onload: (r) => {
                    try { resolve(JSON.parse(r.responseText)); }
                    catch (e) { reject(e); }
                },
                onerror: reject
            });
        });
    };

    window.spGetDigest = function () {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: SP_SITE + '/_api/contextinfo',
                headers: {
                    'Accept': 'application/json;odata=verbose',
                    'Content-Type': 'application/json;odata=verbose'
                },
                onload: (r) => {
                    try {
                        const data = JSON.parse(r.responseText);
                        resolve(data.d.GetContextWebInformation.FormDigestValue);
                    } catch (e) { reject(e); }
                },
                onerror: reject
            });
        });
    };

    window.spPost = function (endpoint, body) {
        return new Promise(async (resolve, reject) => {
            try {
                const digest = await window.spGetDigest();
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: SP_SITE + endpoint,
                    headers: {
                        'Accept': 'application/json;odata=verbose',
                        'Content-Type': 'application/json;odata=verbose',
                        'X-RequestDigest': digest
                    },
                    data: JSON.stringify(body),
                    onload: (r) => {
                        try { resolve(JSON.parse(r.responseText)); }
                        catch (e) { resolve(r.responseText); }
                    },
                    onerror: reject
                });
            } catch (e) { reject(e); }
        });
    };

    window.spUpdate = function (endpoint, body, etag) {
        return new Promise(async (resolve, reject) => {
            try {
                const digest = await window.spGetDigest();
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: SP_SITE + endpoint,
                    headers: {
                        'Accept': 'application/json;odata=verbose',
                        'Content-Type': 'application/json;odata=verbose',
                        'X-RequestDigest': digest,
                        'X-HTTP-Method': 'MERGE',
                        'If-Match': etag || '*'
                    },
                    data: JSON.stringify(body),
                    onload: (r) => resolve(r),
                    onerror: reject
                });
            } catch (e) { reject(e); }
        });
    };

    window.spDelete = function (endpoint) {
        return new Promise(async (resolve, reject) => {
            try {
                const digest = await window.spGetDigest();
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: SP_SITE + endpoint,
                    headers: {
                        'Accept': 'application/json;odata=verbose',
                        'X-RequestDigest': digest,
                        'X-HTTP-Method': 'DELETE',
                        'If-Match': '*'
                    },
                    onload: (r) => resolve(r),
                    onerror: reject
                });
            } catch (e) { reject(e); }
        });
    };

    window.SP_CONFIG = {
        site: SP_SITE,
        lists: {
            TaktAssociates:     '9641b5b6-860a-40ad-898a-52224e6a68a3',
            TaktObservations:   'fc8a85eb-97e7-48e0-b02a-be81e072a1d1',
            TaktDailySummaries: '3ccf4961-ff7f-4cad-b677-f68be5d8fbbe',
            TaktProcessAvgs:    '5768158e-ac61-49fe-823f-3306a3767d67'
        },
        listUrl: function (listName) {
            return "/_api/web/lists(guid'" + this.lists[listName] + "')";
        }
    };

    window.GM_setValue_proxy = GM_setValue;
    window.GM_getValue_proxy = GM_getValue;
    window.GM_xmlhttpRequest_proxy = GM_xmlhttpRequest;

    // ═══════════════════════════════════════════════
    //  BOOT
    // ═══════════════════════════════════════════════
    async function boot() {
        spBlocker.disconnect();

        document.head.innerHTML = '';
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#555;flex-direction:column;gap:12px;"><div style="width:40px;height:40px;border:4px solid #e0e0e0;border-top:4px solid #0b66c3;border-radius:50%;animation:spin 0.8s linear infinite;"></div><div>Loading SNA4...</div><style>@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style></div>';
        document.title = 'SNA4 Data Analytics & Automation';

        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(meta);

        try {
            console.log('[SNA4] Fetching files...');

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
            console.log('[SNA4] ✅ CSS injected');

            // Inject HTML
            document.body.innerHTML = html;
            console.log('[SNA4] ✅ HTML injected');

            // Execute JS inside Tampermonkey sandbox
            try {
                eval(js);
                console.log('[SNA4] ✅ JS executed');
            } catch (jsErr) {
                console.error('[SNA4] ❌ JS error:', jsErr);
                console.error(jsErr.stack);
            }

            console.log('[SNA4] 🚀 Boot complete');

        } catch (err) {
            console.error('[SNA4] Boot failed:', err);
            document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;max-width:600px;margin:auto;"><h1 style="color:red;">Failed to Load SNA4</h1><pre style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">' + err + '</pre></div>';
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
