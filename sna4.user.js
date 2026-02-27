// ==UserScript==
// @name         SNA4 Data Analytics & Automation
// @namespace    https://github.com/YOUR_USERNAME/sna4-data-analytics
// @version      1.0.0
// @description  Custom UI replacing SharePoint Tack Analysis
// @author       SNA4 Team
// @match        https://amazon.sharepoint.com/sites/TackAnalysis/SitePages/CollabHome.aspx*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @resource     mainCSS https://raw.githubusercontent.com/YOUR_USERNAME/sna4-data-analytics/main/src/css/main.css
// @resource     appHTML https://raw.githubusercontent.com/YOUR_USERNAME/sna4-data-analytics/main/src/index.html
// @connect      raw.githubusercontent.com
// @connect      amazon.sharepoint.com
// @updateURL    https://raw.githubusercontent.com/YOUR_USERNAME/sna4-data-analytics/main/sna4.user.js
// @downloadURL  https://raw.githubusercontent.com/YOUR_USERNAME/sna4-data-analytics/main/sna4.user.js
// ==/UserScript==

(function () {
    'use strict';

    const GITHUB_BASE = 'https://raw.githubusercontent.com/YOUR_USERNAME/sna4-data-analytics/main/src';
    const CACHE_BUST = `?v=${Date.now()}`;

    // Stop SharePoint from rendering
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

    // Replace UI when ready
    function boot() {
        observer.disconnect();

        // Wipe SharePoint
        document.head.innerHTML = '';
        document.body.innerHTML = '<div id="sna4-loading" style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;font-size:18px;color:#555;">Loading SNA4...</div>';
        document.title = 'SNA4 Data Analytics & Automation';

        // Meta
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(meta);

        // Load CSS
        try {
            GM_addStyle(GM_getResourceText('mainCSS'));
        } catch (e) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `${GITHUB_BASE}/css/main.css${CACHE_BUST}`;
            document.head.appendChild(link);
        }

        // Load HTML
        try {
            document.body.innerHTML = GM_getResourceText('appHTML');
            loadScript();
        } catch (e) {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${GITHUB_BASE}/index.html${CACHE_BUST}`,
                onload: (res) => {
                    document.body.innerHTML = res.responseText;
                    loadScript();
                },
                onerror: () => {
                    document.body.innerHTML = '<h1 style="padding:40px;color:red;">Failed to load SNA4 UI</h1>';
                }
            });
        }
    }

    // Load app.js
    function loadScript() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${GITHUB_BASE}/js/app.js${CACHE_BUST}`,
            onload: (res) => {
                const s = document.createElement('script');
                s.textContent = res.responseText;
                document.body.appendChild(s);
            }
        });
    }

    // SharePoint API helper
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
