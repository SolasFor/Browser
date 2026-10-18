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

(function () {
  'use strict';

  GM_addStyle(`
    @font-face {
      font-family: "Ubuntu Light Custom";
      src: url("https://solasfor.github.io/Browser/fonts/Ubuntu%20Light.woff2") format("woff2");
      font-weight: 300;
      font-style: normal;
      font-display: swap;
    }

    body,
    button,
    input,
    textarea,
    select {
      font-family: "Ubuntu Light Custom", system-ui, sans-serif !important;
      font-weight: 300 !important;
    }
  `);
})();
