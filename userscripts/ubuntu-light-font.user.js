// ==UserScript==
// @name         Ubuntu Light Font
// @namespace    https://github.com/SolasFor/Browser
// @version      1.1.0
// @description  Apply Ubuntu Light to readable page text while preserving emphasis and UI icons.
// @author       SolasFor
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/SolasFor/Browser/main/userscripts/ubuntu-light-font.user.js
// @downloadURL  https://raw.githubusercontent.com/SolasFor/Browser/main/userscripts/ubuntu-light-font.user.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
    'use strict';
    const FONT_URL = 'https://raw.githubusercontent.com/SolasFor/Browser/main/fonts/Ubuntu%20Light.woff2';
    const EXCLUDED_KEY = 'ubuntuLightExcludedHosts';
    let styleHandle = null;
    function getExcludedHosts() {
        try { const value = typeof GM_getValue === 'function' ? GM_getValue(EXCLUDED_KEY, []) : []; return Array.isArray(value) ? value : []; }
        catch (error) { console.warn('Ubuntu Light Font: could not read exclusions.', error); return []; }
    }
    function isExcluded(host) { return getExcludedHosts().some(item => host === item || host.endsWith('.' + item)); }
    const css = `
        @font-face {
            font-family: "Ubuntu Light Custom";
            src: url("${FONT_URL}") format("woff2");
            font-weight: 300;
            font-style: normal;
            font-display: swap;
        }
        body,
        body :is(p, span, div, a, li, td, th, label, button, input, textarea, select,
                 h1, h2, h3, h4, h5, h6, blockquote, figcaption, summary, legend):not([class*="icon" i]):not([class*="material" i]):not([class*="fa-" i]):not([class*="glyph" i]):not([role="img"]):not(svg):not(code):not(pre) {
            font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif !important;
        }
    `;
    function removeFontStyle() {
        if (styleHandle && typeof styleHandle.remove === 'function') styleHandle.remove();
        styleHandle = null;
        document.querySelectorAll('style[data-ubuntu-light-font]').forEach(node => node.remove());
    }
    function applyFontStyle() {
        removeFontStyle();
        if (isExcluded(location.hostname.toLowerCase())) return;
        if (typeof GM_addStyle === 'function') styleHandle = GM_addStyle(css);
        else {
            const style = document.createElement('style');
            style.dataset.ubuntuLightFont = 'true'; style.textContent = css;
            (document.head || document.documentElement).appendChild(style); styleHandle = style;
        }
        if (styleHandle && styleHandle.nodeType === 1) styleHandle.dataset.ubuntuLightFont = 'true';
    }
    // Alt+Shift+U toggles Ubuntu Light for the current host; exclusions persist across sites.
    window.addEventListener('keydown', function (event) {
        if (!(event.altKey && event.shiftKey && event.code === 'KeyU') || event.repeat || event.ctrlKey || event.metaKey) return;
        const host = location.hostname.toLowerCase(), excluded = getExcludedHosts();
        const next = excluded.includes(host) ? excluded.filter(item => item !== host) : [...excluded, host];
        try {
            if (typeof GM_setValue !== 'function') { console.warn('Ubuntu Light Font: persistent exclusions require GM_setValue support.'); return; }
            GM_setValue(EXCLUDED_KEY, next);
            if (next.includes(host)) removeFontStyle(); else applyFontStyle();
            console.info('Ubuntu Light Font: ' + (next.includes(host) ? 'disabled on ' : 'enabled on ') + host);
        } catch (error) { console.warn('Ubuntu Light Font: could not save exclusions.', error); }
    }, true);
    applyFontStyle();
})();
