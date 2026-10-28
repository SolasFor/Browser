// ==UserScript==
// @name         Ubuntu Light Font
// @namespace    https://github.com/SolasFor/Browser
// @version      1.0.0
// @description  Apply Ubuntu Light to readable page text.
// @author       SolasFor
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/SolasFor/Browser/main/userscripts/ubuntu-light-font.user.js
// @downloadURL  https://raw.githubusercontent.com/SolasFor/Browser/main/userscripts/ubuntu-light-font.user.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const css = `
        @font-face {
            font-family: "Ubuntu Light Custom";
            /* Ссылка на GitHub Pages, который отдаёт правильные CORS-заголовки */
            src: url("https://raw.githubusercontent.com/SolasFor/Browser/main/assets/fonts/Ubuntu%20Light.woff2") format("woff2");
            font-weight: 300;
            font-style: normal;
            font-display: swap;
        }

        /* Применяем шрифт ко всему, кроме иконок и кода */
        *:not([class*="icon"]):not([class*="fa-"]):not(i):not(svg):not(code):not(pre) {
            font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif !important;
            font-weight: 300 !important;
        }
    `;

    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(css);
    } else {
        const style = document.createElement('style');
        style.textContent = css;
        document.documentElement.appendChild(style);
    }
})();
