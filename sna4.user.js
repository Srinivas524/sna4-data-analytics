// ==UserScript==
// @name         SNA4 Data Analytics & Automation
// @namespace    https://github.com/Srinivas524/sna4-data-analytics
// @version      1.0.0
// @description  Custom UI replacing SharePoint Tack Analysis
// @author       Srinivas - SNA4 Team
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/CollabHome.aspx*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @resource     mainCSS https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/src/css/main.css
// @resource     appHTML https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/src/index.html
// @connect      raw.githubusercontent.com
// @connect      amazon.sharepoint.com
// @updateURL    https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// @downloadURL  https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/sna4.user.js
// ==/UserScript==

(function () {
    'use strict';

    const GITHUB_BASE = 'https://raw.githubusercontent.com/Srinivas524/sna4-data-analytics/main/src';
    const CACHE_BUST = `?v=${Date.now()}`;

    // ─── BLOCK SHAREPOINT FROM RENDERING ─────────────────
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
            m.addedNodes.forEach((node) => {
                if (node.tagName === 'LINK' || node.tagName === 'STYLE') {
                    node.remove();
                }
            });
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // ─── BOOT CUSTOM UI ─────────────────────────────────
    function boot() {
        observer.disconnect();

        // Wipe SharePoint completely
        document.head.innerHTML = '';
        document.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;
                        height:100vh;font-family:sans-serif;color:#555;">
                ⏳ Loading SNA4...
            </div>`;
        document.title = 'SNA4 Data Analytics & Automation';

        // Viewport meta
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(meta);

        // ── Load CSS ──
        try {
            GM_addStyle(GM_getResourceText('mainCSS'));
            console.log('[SNA4] CSS loaded from @resource');
        } catch (e) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${GITHUB_BASE}/css/main.css${CACHE_BUST}`;
            document.head.appendChild(link);
            console.log('[SNA4] CSS loaded via fallback');
        }

        // ── Load HTML ──
        try {
            document.body.innerHTML = GM_getResourceText('appHTML');
            console.log('[SNA4] HTML loaded from @resource');
            loadAppJS();
        } catch (e) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${GITHUB_BASE}/index.html${CACHE_BUST}`,
                onload: (res) => {
                    document.body.innerHTML = res.responseText;
                    console.log('[SNA4] HTML loaded via fetch');
                    loadAppJS();
                },
                onerror: () => {
                    document.body.innerHTML = `
                        <div style="padding:40px;font-family:sans-serif;">
                            <h1 style="color:red;">❌ Failed to load SNA4</h1>
                            <p>Check console for errors</p>
                        </div>`;
                }
            });
        }
    }

    // ─── LOAD APP.JS ─────────────────────────────────────
    function loadAppJS() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${GITHUB_BASE}/js/app.js${CACHE_BUST}`,
            onload: (res) => {
                const script = document.createElement('script');
                script.textContent = res.responseText;
                document.body.appendChild(script);
                console.log('[SNA4] app.js loaded ✅');
            },
            onerror: (err) => {
                console.error('[SNA4] Failed to load app.js', err);
            }
        });
    }

    // ─── SHAREPOINT API HELPER ───────────────────────────
    window.SPFetch = function (endpoint) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://amazon.sharepoint.com${endpoint}`,
                headers: { 'Accept': 'application/json;odata=verbose' },
                onload: (r) => resolve(JSON.parse(r.responseText)),
                onerror: reject
            });
        });
    };

    // ─── TRIGGER ─────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
