// ==UserScript==
// @name         Browser Tweaks — Ubuntu Light + YouTube
// @namespace    https://github.com/SolasFor/Browser
// @version      1.2.0
// @description  Глобальный шрифт Ubuntu Light и модульные инструменты YouTube в единой изолированной панели
// @author       SolasFor
// @homepageURL  https://github.com/SolasFor/Browser
// @supportURL   https://github.com/SolasFor/Browser/issues
// @updateURL    https://raw.githubusercontent.com/SolasFor/Browser/main/userscripts/browser-tweaks-unified.user.js
// @downloadURL  https://raw.githubusercontent.com/SolasFor/Browser/main/userscripts/browser-tweaks-unified.user.js
// @resource     ubuntuFont https://raw.githubusercontent.com/SolasFor/Browser/main/fonts/Ubuntu%20Light.woff2
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        GM_getResourceURL
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      translate.googleapis.com
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ==========================================
    // 0. КОНСТАНТЫ, СРЕДА И МЕНЕДЖЕР СТИЛЕЙ
    // ==========================================

    const SCRIPT_VERSION = '1.2.0';
    const FONT_URL = 'https://raw.githubusercontent.com/SolasFor/Browser/main/fonts/Ubuntu%20Light.woff2';
    const FONT_ENABLED_KEY = 'unifiedUbuntuLightEnabled';
    const FONT_EXCLUDED_KEY = 'unifiedUbuntuLightExcludedHosts';
    const FONT_INTENSITY_KEY = 'unifiedUbuntuLightIntensity';

    const YT_SETTINGS_KEY = 'bt_youtube_settings';
    const YT_QUALITY_KEY = 'bt_youtube_quality';
    const YT_SPEED_STEP_KEY = 'bt_youtube_speed_step';
    const PANEL_POS_KEY = 'bt_panel_position';
    const TRANSLATION_CACHE_KEY = 'bt_translation_cache';
    const MIGRATION_KEY = 'bt_migrated_v110';

    // Ключи прошлых версий (localStorage) для автоматической миграции
    const LEGACY_KEYS = {
        settings: 'retube_clone_settings',
        pos: 'retube_clone_position',
        quality: 'retube_clone_quality',
        speedStep: 'retube_clone_speed_step',
        cache: 'retube_clone_translation_cache'
    };

    const host = (location.hostname || '').toLowerCase();
    const isTopWindow = (() => {
        try { return window.top === window.self; } catch (_) { return false; }
    })();
    const isYouTube = /(^|\.)youtube\.com$/i.test(host) && !/^\/embed\b/i.test(location.pathname || '');

    const managedStyles = new Map();

    function setManagedStyle(id, cssText) {
        removeManagedStyle(id);
        if (!cssText) return;
        let handle = null;
        try {
            if (typeof GM_addStyle === 'function') handle = GM_addStyle(cssText);
        } catch (_) {}
        if (!handle) {
            const styleEl = document.createElement('style');
            styleEl.textContent = cssText;
            (document.head || document.documentElement).appendChild(styleEl);
            handle = styleEl;
        }
        if (handle && handle.dataset) handle.dataset.btStyle = id;
        managedStyles.set(id, handle);
    }

    function removeManagedStyle(id) {
        const handle = managedStyles.get(id);
        if (handle) {
            if (typeof handle.remove === 'function') handle.remove();
            else if (handle.parentNode) handle.parentNode.removeChild(handle);
            managedStyles.delete(id);
        }
        document.querySelectorAll(`style[data-bt-style="${id}"]`).forEach(el => el.remove());
    }

    function gmGet(key, fallback) {
        try {
            if (typeof GM_getValue === 'function') {
                const val = GM_getValue(key, fallback);
                return val === undefined ? fallback : val;
            }
        } catch (_) {}
        return fallback;
    }

    function gmSet(key, value) {
        try {
            if (typeof GM_setValue === 'function') GM_setValue(key, value);
        } catch (_) {}
    }

    // ==========================================
    // 1. ГЛОБАЛЬНЫЙ МОДУЛЬ ШРИФТА UBUNTU LIGHT
    // ==========================================

    function resolveFontSource() {
        try {
            if (typeof GM_getResourceURL === 'function') {
                const cachedUrl = GM_getResourceURL('ubuntuFont', false);
                if (cachedUrl && typeof cachedUrl === 'string') {
                    return `url("${cachedUrl}") format("woff2"), url("${FONT_URL}") format("woff2")`;
                }
            }
        } catch (_) {}
        return `url("${FONT_URL}") format("woff2")`;
    }

    let fontEnabled = Boolean(gmGet(FONT_ENABLED_KEY, true));

    function normalizeHostInput(raw) {
        if (typeof raw !== 'string') return '';
        let val = raw.trim().toLowerCase();
        if (!val) return '';
        val = val.replace(/^\*\./, '').replace(/^\.+/, '');
        try {
            const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(val) ? val : 'https://' + val;
            const parsed = new URL(candidate).hostname.replace(/\.+$/, '').replace(/^\.+/, '');
            if (!parsed || /\s/.test(parsed) || parsed.includes('..')) return '';
            if (parsed !== 'localhost' && !parsed.includes('.') && !parsed.startsWith('[')) return '';
            return parsed;
        } catch (_) {
            return '';
        }
    }

    const getExcludedHosts = () => {
        const list = gmGet(FONT_EXCLUDED_KEY, []);
        if (!Array.isArray(list)) return [];
        const seen = new Set();
        const result = [];
        for (let i = 0; i < list.length; i++) {
            const item = typeof list[i] === 'string' ? list[i].trim().toLowerCase() : '';
            if (item && !seen.has(item)) {
                seen.add(item);
                result.push(item);
            }
        }
        return result;
    };
    const matchesHost = excludedHost => Boolean(excludedHost) && (host === excludedHost || host.endsWith('.' + excludedHost));
    const isFontExcluded = () => !host || getExcludedHosts().some(matchesHost);

    let fontIntensity = 'strong';
    {
        const savedIntensity = gmGet(FONT_INTENSITY_KEY, 'strong');
        if (savedIntensity === 'soft' || savedIntensity === 'strong') fontIntensity = savedIntensity;
    }

    const PROTECTED_FONT_SELECTOR = [
        'svg', 'svg *',
        'code', 'code *', 'pre', 'pre *', 'kbd', 'kbd *', 'samp', 'samp *', 'var', 'tt',
        '.monaco-editor', '.monaco-editor *', '.cm-editor', '.cm-editor *',
        '.ace_editor', '.ace_editor *', '.CodeMirror', '.CodeMirror *',
        '[role="img"]', '[data-icon]',
        '[class*="icon" i]', '[class*="material" i]', '[class*="glyph" i]',
        '[class*="fa-" i]', '[class*="bi-" i]', '[class*="ri-" i]',
        '[class*="bx-" i]', '[class*="lucide" i]', '[class*="codicon" i]', '[class*="octicon" i]'
    ].join(', ');

    function applyGlobalFont() {
        if (!fontEnabled) {
            removeManagedStyle('global-font');
            removeManagedStyle('font-face');
            return;
        }
        if (!managedStyles.has('font-face')) {
            setManagedStyle('font-face', `
                @font-face {
                    font-family: "Ubuntu Light Custom";
                    src: ${resolveFontSource()};
                    font-weight: 100 500;
                    font-style: normal;
                    font-display: swap;
                }
            `);
        }
        if (isFontExcluded()) {
            removeManagedStyle('global-font');
            return;
        }
        const textWeight = fontIntensity === 'strong' ? '300' : '350';
        const boldWeight = fontIntensity === 'strong' ? '400' : '500';
        setManagedStyle('global-font', `
            body,
            body :is(p, span, div, a, li, td, th, label, button, input, textarea, select, h1, h2, h3, h4, h5, h6, blockquote, figcaption, summary, legend, small, strong, em, b, i):not(${PROTECTED_FONT_SELECTOR}) {
                font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif !important;
                font-weight: ${textWeight} !important;
            }
            body :is(b, strong, h1, h2, h3, h4, h5, h6):not(${PROTECTED_FONT_SELECTOR}) {
                font-weight: ${boldWeight} !important;
            }
        `);
    }

    applyGlobalFont();

    // Во вложенных фреймах применяем только шрифт и слушаем его синхронизацию между вкладками,
    // не создавая дубликатов панелей F2, хоткеев и наблюдателей YouTube.
    if (!isTopWindow) {
        if (typeof GM_addValueChangeListener === 'function') {
            try {
                GM_addValueChangeListener(FONT_ENABLED_KEY, (_k, _oldV, newV) => {
                    fontEnabled = Boolean(newV);
                    applyGlobalFont();
                });
                GM_addValueChangeListener(FONT_EXCLUDED_KEY, () => applyGlobalFont());
                GM_addValueChangeListener(FONT_INTENSITY_KEY, (_k, _oldV, newV) => {
                    if (newV === 'soft' || newV === 'strong') fontIntensity = newV;
                    applyGlobalFont();
                });
            } catch (_) {}
        }
        return;
    }

    // ==========================================
    // 2. ОБЩИЙ SHADOW DOM ХОСТ (OSD + ПАНЕЛЬ F2)
    // ==========================================

    let uiHost = null;
    let shadow = null;
    let osdEl = null;
    let osdTimer = null;
    let tooltipEl = null;
    let tooltipTimer = null;
    let panelEl = null;
    let uiRefs = null;

    const SHADOW_CSS = `
        :host {
            all: initial;
            --bt-font: "Ubuntu Light Custom", "Ubuntu", system-ui, -apple-system, "Segoe UI", sans-serif;
            --bt-weight: 300;
        }
        :host([data-custom-font="off"]) {
            --bt-font: system-ui, -apple-system, "Segoe UI", sans-serif;
            --bt-weight: 400;
        }
        *, *::before, *::after {
            box-sizing: border-box;
        }
        .bt-osd {
            position: fixed;
            top: 76px;
            left: 50%;
            transform: translateX(-50%) translateY(-6px);
            z-index: 2147483647;
            background: rgba(24, 27, 38, 0.9);
            color: #eef2f9;
            padding: 9px 18px;
            border-radius: 9px;
            border: 1px solid rgba(155, 172, 205, 0.25);
            font-family: var(--bt-font);
            font-weight: var(--bt-weight);
            font-size: 14px;
            line-height: 1.35;
            letter-spacing: 0.01em;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease, transform 0.2s ease;
            white-space: nowrap;
        }
        .bt-osd.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        .bt-osd[data-tone="on"] {
            border-color: rgba(92, 196, 138, 0.45);
        }
        .bt-osd[data-tone="off"] {
            border-color: rgba(220, 110, 110, 0.45);
        }
        .bt-tooltip {
            position: fixed;
            z-index: 2147483647;
            max-width: 340px;
            padding: 10px 13px;
            background: rgba(40, 46, 58, 0.92);
            color: #f0f4fa;
            border: 1px solid rgba(160, 175, 205, 0.24);
            border-radius: 10px;
            font-family: var(--bt-font);
            font-weight: var(--bt-weight);
            font-size: 13px;
            line-height: 1.45;
            white-space: pre-line;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.42);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            pointer-events: none;
            opacity: 0;
            transform: translateY(-4px);
            transition: opacity 0.18s ease, transform 0.18s ease;
            visibility: hidden;
        }
        .bt-tooltip.visible {
            opacity: 1;
            transform: translateY(0);
            visibility: visible;
        }
        .bt-panel {
            position: fixed;
            z-index: 2147483646;
            width: 334px;
            max-width: calc(100vw - 16px);
            max-height: calc(100vh - 16px);
            display: none;
            flex-direction: column;
            background: rgba(26, 29, 38, 0.86);
            color: #e6ebf4;
            border: 1px solid rgba(160, 175, 205, 0.26);
            border-radius: 14px;
            font-family: var(--bt-font);
            font-weight: var(--bt-weight);
            font-size: 13.5px;
            line-height: 1.4;
            box-shadow: 0 14px 40px rgba(0, 0, 0, 0.42);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            overflow: hidden;
            pointer-events: auto;
        }
        .bt-panel.open {
            display: flex;
            animation: btFadeIn 0.18s ease;
        }
        @keyframes btFadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .bt-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
            padding: 10px 14px;
            background: rgba(67, 77, 105, 0.3);
            border-bottom: 1px solid rgba(160, 175, 205, 0.14);
            cursor: grab;
            user-select: none;
        }
        .bt-header:active {
            cursor: grabbing;
        }
        .bt-title {
            font-size: 16px;
            font-weight: 500;
            color: #eef2f9;
        }
        .bt-grip {
            font-size: 14px;
            letter-spacing: -1px;
            color: rgba(205, 214, 228, 0.5);
        }
        .bt-body {
            padding: 10px 10px 12px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .bt-body > * {
            flex-shrink: 0;
        }
        .bt-row-check {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 8px;
            border-radius: 7px;
            cursor: pointer;
            color: #d4dce7;
            user-select: none;
            transition: background 0.15s ease;
        }
        .bt-row-check:hover {
            background: rgba(130, 142, 168, 0.15);
        }
        .bt-row-check input[type="checkbox"] {
            width: 15px;
            height: 15px;
            margin: 0;
            accent-color: #8da2cb;
            cursor: pointer;
            flex-shrink: 0;
        }
        .bt-row-with-expand {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
        }
        .bt-row-with-expand .bt-row-check {
            flex: 1;
            min-width: 0;
        }
        .bt-expand-btn {
            width: 26px;
            height: 26px;
            padding: 0;
            border: 1px solid rgba(150, 165, 195, 0.2);
            border-radius: 6px;
            background: rgba(96, 104, 122, 0.25);
            color: #cdd6e4;
            font-size: 12px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: background 0.15s ease, transform 0.15s ease;
        }
        .bt-expand-btn:hover {
            background: rgba(120, 132, 156, 0.4);
        }
        .bt-expand-btn[aria-expanded="true"] {
            transform: rotate(180deg);
        }
        .bt-sublist {
            display: none;
            flex-direction: column;
            gap: 2px;
            margin: 2px 4px 4px 16px;
            padding: 5px 6px;
            border-left: 2px solid rgba(140, 160, 200, 0.28);
            background: rgba(70, 78, 98, 0.14);
            border-radius: 0 7px 7px 0;
        }
        .bt-sublist.open {
            display: flex;
        }
        .bt-sublist.muted {
            opacity: 0.52;
        }
        .bt-sublist .bt-row-check {
            font-size: 12.5px;
            padding: 4px 6px;
        }
        .bt-select-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 4px 8px;
        }
        .bt-select-label {
            font-size: 13px;
            color: #c9d2df;
            white-space: nowrap;
        }
        .bt-select {
            flex: 1;
            min-width: 0;
            padding: 5px 8px;
            background: rgba(62, 67, 82, 0.72);
            color: #e6ebf4;
            border: 1px solid rgba(135, 148, 175, 0.35);
            border-radius: 6px;
            font: inherit;
            font-size: 12.5px;
            cursor: pointer;
            outline: none;
        }
        .bt-select option {
            background: #232631;
            color: #e6ebf4;
        }
        .bt-card {
            margin-top: 6px;
            padding: 9px 10px;
            border: 1px solid rgba(150, 165, 195, 0.2);
            border-radius: 9px;
            background: rgba(90, 100, 125, 0.12);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .bt-card-title {
            font-size: 13.5px;
            font-weight: 500;
            color: #e6ebf4;
        }
        .bt-note {
            font-size: 11.5px;
            line-height: 1.4;
            color: #9ba5b7;
        }
        .bt-btn {
            padding: 7px 10px;
            background: rgba(92, 98, 114, 0.42);
            color: #e4eaf3;
            border: 1px solid rgba(135, 148, 175, 0.32);
            border-radius: 6px;
            font: inherit;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        .bt-btn:hover {
            background: rgba(112, 120, 140, 0.62);
        }
        .bt-btn-danger {
            background: rgba(135, 75, 75, 0.34);
            border-color: rgba(175, 105, 105, 0.45);
            color: #f0dede;
        }
        .bt-btn-danger:hover {
            background: rgba(160, 88, 88, 0.52);
        }
        .bt-actions {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        .bt-actions .bt-btn {
            flex: 1;
        }
        .bt-font-controls {
            display: flex;
            flex-direction: column;
            gap: 8px;
            transition: opacity 0.15s ease;
        }
        .bt-font-controls.disabled {
            opacity: 0.48;
        }
        .bt-btn:disabled, .bt-select:disabled {
            cursor: not-allowed;
        }
        .bt-btn-sm {
            padding: 5px 9px;
            font-size: 12px;
        }
        .bt-excl-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            width: 100%;
            padding: 6px 9px;
            background: rgba(78, 86, 106, 0.28);
            color: #d7e0ed;
            border: 1px solid rgba(145, 160, 190, 0.24);
            border-radius: 6px;
            font: inherit;
            font-size: 12.5px;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s ease;
        }
        .bt-excl-toggle:hover {
            background: rgba(98, 108, 132, 0.44);
        }
        .bt-excl-chevron {
            font-size: 11px;
            color: #9fb0cb;
            transition: transform 0.15s ease;
        }
        .bt-excl-toggle[aria-expanded="true"] .bt-excl-chevron {
            transform: rotate(180deg);
        }
        .bt-excl-panel {
            display: none;
            flex-direction: column;
            gap: 6px;
            padding: 7px;
            border-radius: 7px;
            background: rgba(42, 47, 60, 0.48);
            border: 1px solid rgba(140, 155, 185, 0.18);
        }
        .bt-excl-panel.open {
            display: flex;
        }
        .bt-excl-form {
            display: flex;
            gap: 5px;
        }
        .bt-input {
            flex: 1;
            min-width: 0;
            padding: 5px 8px;
            background: rgba(28, 32, 42, 0.78);
            color: #e6ebf4;
            border: 1px solid rgba(135, 148, 175, 0.35);
            border-radius: 6px;
            font: inherit;
            font-size: 12px;
            outline: none;
        }
        .bt-input::placeholder {
            color: #8590a4;
        }
        .bt-input:focus {
            border-color: rgba(150, 176, 224, 0.68);
        }
        .bt-excl-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            max-height: 142px;
            overflow-y: auto;
        }
        .bt-excl-empty {
            padding: 6px 4px;
            font-size: 12px;
            color: #8f9ab0;
            text-align: center;
        }
        .bt-excl-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            padding: 4px 7px;
            border-radius: 5px;
            background: rgba(74, 82, 102, 0.26);
            border: 1px solid rgba(140, 155, 185, 0.15);
        }
        .bt-excl-item-info {
            display: flex;
            align-items: center;
            gap: 6px;
            min-width: 0;
            flex: 1;
        }
        .bt-excl-domain {
            font-size: 12px;
            color: #dce4f0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .bt-excl-badge {
            flex-shrink: 0;
            padding: 1px 5px;
            border-radius: 4px;
            font-size: 10.5px;
            background: rgba(112, 152, 224, 0.22);
            color: #a9c7ff;
            border: 1px solid rgba(128, 166, 232, 0.3);
        }
        .bt-excl-remove {
            width: 20px;
            height: 20px;
            padding: 0;
            flex-shrink: 0;
            border: 1px solid rgba(175, 115, 115, 0.3);
            border-radius: 4px;
            background: rgba(135, 75, 75, 0.25);
            color: #f0d6d6;
            font: inherit;
            font-size: 13px;
            line-height: 1;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s ease;
        }
        .bt-excl-remove:hover {
            background: rgba(170, 90, 90, 0.55);
        }
        .bt-backup-row {
            display: flex;
            gap: 6px;
        }
        .bt-backup-row .bt-btn {
            flex: 1;
        }
    `;

    function syncHostFontState() {
        if (uiHost) uiHost.setAttribute('data-custom-font', fontEnabled ? 'on' : 'off');
    }

    function ensureShadowHost() {
        if (shadow && uiHost && uiHost.isConnected) return shadow;
        const mountTarget = document.body || document.documentElement;
        if (!mountTarget) return null;

        if (!uiHost) {
            uiHost = document.createElement('div');
            uiHost.id = 'browser-tweaks-root';
            uiHost.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;pointer-events:none;';
            syncHostFontState();
            shadow = uiHost.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = SHADOW_CSS;
            shadow.appendChild(style);
        }
        if (!uiHost.isConnected) mountTarget.appendChild(uiHost);
        return shadow;
    }

    function showOSD(message, tone) {
        const root = ensureShadowHost();
        if (!root) return;
        if (!osdEl) {
            osdEl = document.createElement('div');
            osdEl.className = 'bt-osd';
            osdEl.setAttribute('role', 'status');
            root.appendChild(osdEl);
        }
        osdEl.textContent = message;
        if (tone) osdEl.dataset.tone = tone;
        else delete osdEl.dataset.tone;
        osdEl.classList.add('visible');
        clearTimeout(osdTimer);
        osdTimer = setTimeout(() => {
            if (osdEl) osdEl.classList.remove('visible');
        }, 1600);
    }

    function showTooltip(text, cursorX, cursorY) {
        const root = ensureShadowHost();
        if (!root || !text) return;
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'bt-tooltip';
            root.appendChild(tooltipEl);
        }
        tooltipEl.textContent = text;
        tooltipEl.classList.remove('visible');
        tooltipEl.style.left = '0px';
        tooltipEl.style.top = '0px';

        const rect = tooltipEl.getBoundingClientRect();
        const margin = 14;
        let left = cursorX - rect.width / 2;
        let top = cursorY + margin;
        if (left < 8) left = 8;
        if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
        if (top + rect.height > window.innerHeight - 8) top = Math.max(8, cursorY - rect.height - margin);

        tooltipEl.style.left = Math.round(left) + 'px';
        tooltipEl.style.top = Math.round(top) + 'px';
        requestAnimationFrame(() => {
            if (tooltipEl) tooltipEl.classList.add('visible');
        });
    }

    function hideTooltip() {
        if (tooltipTimer) {
            clearTimeout(tooltipTimer);
            tooltipTimer = null;
        }
        if (tooltipEl) tooltipEl.classList.remove('visible');
    }

    function renderExcludedHostsList() {
        if (!uiRefs || !uiRefs.exclList) return;
        const hosts = getExcludedHosts();
        if (uiRefs.exclToggleText) {
            uiRefs.exclToggleText.textContent = `Исключённые сайты (${hosts.length})`;
        }
        if (uiRefs.exclClearBtn) {
            uiRefs.exclClearBtn.style.display = hosts.length ? '' : 'none';
        }
        uiRefs.exclList.textContent = '';
        if (!hosts.length) {
            const empty = document.createElement('div');
            empty.className = 'bt-excl-empty';
            empty.textContent = 'Список исключений пуст';
            uiRefs.exclList.appendChild(empty);
            return;
        }
        hosts.forEach(domain => {
            const item = document.createElement('div');
            item.className = 'bt-excl-item';

            const info = document.createElement('div');
            info.className = 'bt-excl-item-info';

            const domainSpan = document.createElement('span');
            domainSpan.className = 'bt-excl-domain';
            domainSpan.title = domain;
            domainSpan.textContent = domain;
            info.appendChild(domainSpan);

            if (host && matchesHost(domain)) {
                const badge = document.createElement('span');
                badge.className = 'bt-excl-badge';
                badge.textContent = 'этот сайт';
                info.appendChild(badge);
            }

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'bt-excl-remove';
            removeBtn.title = 'Удалить из исключений';
            removeBtn.setAttribute('aria-label', 'Удалить ' + domain);
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => removeExcludedHost(domain, true));

            item.append(info, removeBtn);
            uiRefs.exclList.appendChild(item);
        });
    }

    function syncFontUI() {
        syncHostFontState();
        if (!uiRefs) return;
        const excluded = isFontExcluded();
        if (uiRefs.fontEnabledCb) {
            uiRefs.fontEnabledCb.checked = fontEnabled;
        }
        if (uiRefs.fontControlsWrap) {
            uiRefs.fontControlsWrap.classList.toggle('disabled', !fontEnabled);
        }
        if (uiRefs.excludeBtn) {
            uiRefs.excludeBtn.disabled = !fontEnabled;
            uiRefs.excludeBtn.textContent = excluded ? 'Включить на этом сайте' : 'Исключить этот сайт';
        }
        if (uiRefs.intensitySelect) {
            uiRefs.intensitySelect.disabled = !fontEnabled;
            uiRefs.intensitySelect.value = fontIntensity;
        }
        if (uiRefs.fontNote) {
            uiRefs.fontNote.textContent = fontEnabled
                ? 'Действует на всех сайтах. Alt + Shift + F — выключить полностью; Alt + Shift + U — исключить этот сайт.'
                : 'Кастомный шрифт полностью выключен на всех сайтах и в панели. Alt + Shift + F — включить обратно.';
        }
        renderExcludedHostsList();
    }

    function addExcludedHost(rawInput, showFeedback = true) {
        const normalized = normalizeHostInput(rawInput);
        if (!normalized) {
            if (showFeedback) showOSD('Введите корректный домен (например, example.com)', 'off');
            return { ok: false, reason: 'invalid' };
        }
        const hosts = getExcludedHosts();
        if (hosts.includes(normalized)) {
            if (showFeedback) showOSD('Сайт уже в списке: ' + normalized, 'off');
            return { ok: false, reason: 'duplicate', host: normalized };
        }
        gmSet(FONT_EXCLUDED_KEY, [...hosts, normalized]);
        applyGlobalFont();
        syncFontUI();
        if (showFeedback) showOSD('Добавлено в исключения: ' + normalized, 'off');
        return { ok: true, host: normalized };
    }

    function removeExcludedHost(targetHost, showFeedback = true) {
        const normalized = normalizeHostInput(targetHost) || String(targetHost || '').trim().toLowerCase();
        const hosts = getExcludedHosts();
        const next = hosts.filter(h => h !== normalized);
        if (next.length === hosts.length) return false;
        gmSet(FONT_EXCLUDED_KEY, next);
        applyGlobalFont();
        syncFontUI();
        if (showFeedback) showOSD('Удалено из исключений: ' + normalized, 'on');
        return true;
    }

    function clearExcludedHosts(showFeedback = true) {
        const hosts = getExcludedHosts();
        if (!hosts.length) return false;
        gmSet(FONT_EXCLUDED_KEY, []);
        applyGlobalFont();
        syncFontUI();
        if (showFeedback) showOSD('Список исключений очищен', 'on');
        return true;
    }

    function setGlobalFontEnabled(nextEnabled, showFeedback = true) {
        fontEnabled = Boolean(nextEnabled);
        gmSet(FONT_ENABLED_KEY, fontEnabled);
        applyGlobalFont();
        syncFontUI();
        if (isYouTube && ytSettings.translateComments) applyTranslateUIStyle();
        if (showFeedback) {
            showOSD(
                fontEnabled ? 'Кастомный шрифт: ВКЛЮЧЁН глобально' : 'Кастомный шрифт: полностью ВЫКЛЮЧЕН',
                fontEnabled ? 'on' : 'off'
            );
        }
        return fontEnabled;
    }

    function toggleGlobalFontEnabled(showFeedback = true) {
        return setGlobalFontEnabled(!fontEnabled, showFeedback);
    }

    function toggleFontExclusion(showFeedback = true) {
        if (!fontEnabled) {
            if (showFeedback) {
                showOSD('Кастомный шрифт выключен глобально (Alt + Shift + F — включить)', 'off');
            }
            return true;
        }
        if (!host) return true;
        const excluded = isFontExcluded();
        const hosts = getExcludedHosts();
        const next = excluded ? hosts.filter(x => !matchesHost(x)) : [...hosts, host];
        gmSet(FONT_EXCLUDED_KEY, [...new Set(next)]);
        const nowExcluded = isFontExcluded();
        applyGlobalFont();
        syncFontUI();
        if (showFeedback) {
            showOSD(
                nowExcluded ? `Ubuntu Light: выключен для ${host}` : `Ubuntu Light: включён для ${host}`,
                nowExcluded ? 'off' : 'on'
            );
        }
        return nowExcluded;
    }

    function clampPanelPosition() {
        if (!panelEl || !panelEl.classList.contains('open')) return;
        const rect = panelEl.getBoundingClientRect();
        const width = rect.width || 334;
        const height = rect.height || 260;
        const maxLeft = Math.max(8, window.innerWidth - width - 8);
        const maxTop = Math.max(8, window.innerHeight - height - 8);
        const currentLeft = Number.parseFloat(panelEl.style.left);
        const currentTop = Number.parseFloat(panelEl.style.top);
        const clampedLeft = Math.min(maxLeft, Math.max(8, Number.isFinite(currentLeft) ? currentLeft : maxLeft - 14));
        const clampedTop = Math.min(maxTop, Math.max(8, Number.isFinite(currentTop) ? currentTop : 72));
        panelEl.style.left = Math.round(clampedLeft) + 'px';
        panelEl.style.top = Math.round(clampedTop) + 'px';
        panelEl.style.right = 'auto';
    }

    function makeDraggable(panel, handle) {
        let dragState = null;

        function onMove(e) {
            if (!dragState) return;
            const maxLeft = Math.max(8, window.innerWidth - panel.offsetWidth - 8);
            const maxTop = Math.max(8, window.innerHeight - panel.offsetHeight - 8);
            const left = Math.min(maxLeft, Math.max(8, e.clientX - dragState.offsetX));
            const top = Math.min(maxTop, Math.max(8, e.clientY - dragState.offsetY));
            panel.style.left = Math.round(left) + 'px';
            panel.style.top = Math.round(top) + 'px';
            panel.style.right = 'auto';
        }

        function onUp() {
            if (dragState) {
                gmSet(PANEL_POS_KEY, {
                    left: Number.parseFloat(panel.style.left) || 24,
                    top: Number.parseFloat(panel.style.top) || 72
                });
            }
            dragState = null;
            window.removeEventListener('mousemove', onMove, true);
            window.removeEventListener('mouseup', onUp, true);
        }

        handle.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            e.preventDefault();
            const rect = panel.getBoundingClientRect();
            dragState = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
            window.addEventListener('mousemove', onMove, true);
            window.addEventListener('mouseup', onUp, true);
        });
    }

    // ==========================================
    // 3. СОСТОЯНИЕ И МИГРАЦИЯ НАСТРОЕК YOUTUBE
    // ==========================================

    const HIDE_SUBKEYS = [
        ['hidePlayerClutter', 'Элементы и оверлеи плеера'],
        ['hideActionButtons', 'Кнопки под видео (Поделиться, Клип…)'],
        ['hideSidebarExtras', 'Лишние разделы бокового меню'],
        ['hideHeaderExtras', 'Голосовой поиск и код страны'],
        ['hidePromosAndShorts', 'Промо Premium, опросы и полки Shorts']
    ];

    const DEFAULT_YT_SETTINGS = {
        smoothAnim: false,
        hideElements: false,
        hidePlayerClutter: true,
        hideActionButtons: true,
        hideSidebarExtras: true,
        hideHeaderExtras: true,
        hidePromosAndShorts: true,
        wheelSpeed: false,
        translateComments: false,
        compactMode: false,
        autoQuality: false,
        speedHotkeys: false
    };

    const QUALITY_MAP = {
        hd720: 'HD (720p)',
        hd1080: 'FHD (1080p)',
        hd1440: '2K (1440p)',
        hd2160: '4K (2160p)'
    };

    const TOOLTIPS = {
        smoothAnim: 'Добавляет плавные переходы прозрачности и цвета для контейнеров YouTube без рывков геометрии.',
        hideElements: 'Скрывает выбранные группы лишних элементов интерфейса и плеера.\nНажмите кнопку «▾» справа, чтобы настроить отдельные категории.',
        wheelSpeed: 'Позволяет менять скорость воспроизведения видео прокруткой колеса мыши над плеером при зажатом Shift.',
        translateComments: 'Добавляет кнопку «Перевести» под комментариями на иностранных языках (Google Translate с кэшем).',
        compactMode: 'Уменьшает отступы сетки видео, комментариев и высоту верхней шапки YouTube.',
        autoQuality: 'Автоматически выбирает заданное качество (или ближайшее доступное) при открытии каждого ролика.',
        speedHotkeys: 'Горячие клавиши во время просмотра ролика:\n• Ctrl + ↑ — ускорить\n• Ctrl + ↓ — замедлить\n• Ctrl + 0 — вернуть 1.00×'
    };

    let ytSettings = Object.assign({}, DEFAULT_YT_SETTINGS);
    let selectedQuality = 'hd1080';
    let speedStep = 0.25;

    function migrateLegacyYouTubeStorage() {
        if (!isYouTube || gmGet(MIGRATION_KEY, false)) return;
        try {
            const rawSettings = localStorage.getItem(LEGACY_KEYS.settings);
            if (rawSettings && gmGet(YT_SETTINGS_KEY, null) === null) {
                gmSet(YT_SETTINGS_KEY, Object.assign({}, DEFAULT_YT_SETTINGS, JSON.parse(rawSettings)));
            }
            const rawQuality = localStorage.getItem(LEGACY_KEYS.quality);
            if (rawQuality && QUALITY_MAP[rawQuality] && gmGet(YT_QUALITY_KEY, null) === null) {
                gmSet(YT_QUALITY_KEY, rawQuality);
            }
            const rawStep = Number(localStorage.getItem(LEGACY_KEYS.speedStep));
            if ([0.05, 0.1, 0.25, 0.5].includes(rawStep) && gmGet(YT_SPEED_STEP_KEY, null) === null) {
                gmSet(YT_SPEED_STEP_KEY, rawStep);
            }
            const rawPos = localStorage.getItem(LEGACY_KEYS.pos);
            if (rawPos && gmGet(PANEL_POS_KEY, null) === null) {
                const parsedPos = JSON.parse(rawPos);
                const left = Number.parseFloat(parsedPos && parsedPos.left);
                const top = Number.parseFloat(parsedPos && parsedPos.top);
                if (Number.isFinite(left) && Number.isFinite(top)) gmSet(PANEL_POS_KEY, { left, top });
            }
            const rawCache = localStorage.getItem(LEGACY_KEYS.cache);
            if (rawCache && gmGet(TRANSLATION_CACHE_KEY, null) === null) {
                const parsedCache = JSON.parse(rawCache);
                if (parsedCache && typeof parsedCache === 'object') gmSet(TRANSLATION_CACHE_KEY, parsedCache);
            }
            gmSet(MIGRATION_KEY, true);
        } catch (_) {}
    }

    if (isYouTube) {
        migrateLegacyYouTubeStorage();
        const storedSettings = gmGet(YT_SETTINGS_KEY, null);
        if (storedSettings && typeof storedSettings === 'object') {
            ytSettings = Object.assign({}, DEFAULT_YT_SETTINGS, storedSettings);
        }
        const storedQuality = gmGet(YT_QUALITY_KEY, 'hd1080');
        if (QUALITY_MAP[storedQuality]) selectedQuality = storedQuality;
        const storedStep = Number(gmGet(YT_SPEED_STEP_KEY, 0.25));
        if ([0.05, 0.1, 0.25, 0.5].includes(storedStep)) speedStep = storedStep;
    }

    // ==========================================
    // 4. ФУНКЦИОНАЛЬНЫЕ МОДУЛИ YOUTUBE
    // ==========================================

    function applySmoothAnimations() {
        setManagedStyle('yt-smooth', `
            #columns, #primary, #secondary, ytd-comments, ytd-rich-item-renderer, ytd-compact-video-renderer {
                transition: opacity 0.22s ease, background-color 0.22s ease !important;
            }
        `);
    }

    function buildHideElementsCSS() {
        if (!ytSettings.hideElements) return '';
        const rules = [];

        if (ytSettings.hideHeaderExtras) {
            rules.push(`
                #voice-search-button,
                #country-code,
                .sbfl_a, .YtSearchboxComponentReportButton, .ytSearchboxComponentReportButton,
                .gsst_a, .YtSearchboxComponentYtdTextInputAssistantWrapper, .ytSearchboxComponentYtdTextInputAssistantWrapper {
                    display: none !important;
                }
            `);
        }

        if (ytSettings.hidePlayerClutter) {
            rules.push(`
                a.ytp-next-button.ytp-button,
                a.ytp-prev-button.ytp-button,
                .ytp-jump-button,
                .ytp-button.ytp-remote-button,
                .ytp-button.ytp-miniplayer-button,
                .ytp-button:has(.ytp-autonav-toggle-button[aria-checked="false"]),
                button[title="Автовоспроизведение выключено"],
                button[title="Автоматичне відтворення вимкнено"],
                button[title="Autoplay is off"],
                button[title="Субтитры недоступны"],
                button[title="Субтитри недоступні"],
                button[title="Subtitles/closed captions unavailable"],
                .ytp-paid-content-overlay,
                ytm-paid-content-overlay-renderer,
                .iv-branding,
                .annotation.annotation-type-custom.iv-branding,
                #movie_player > [class^="ytp-ce-"],
                .ytp-cards-teaser,
                .ytp-cards-button,
                .ytp-cards-teaser-text,
                .ytp-fullerscreen-edu-button-subtle,
                .ytp-pause-overlay-container,
                #reaction-control-panel {
                    display: none !important;
                }
            `);
        }

        if (ytSettings.hideActionButtons) {
            rules.push(`
                ytd-download-button-renderer,
                #sponsor-button,
                [role="button"][aria-label="Добавить в очередь"],
                [role="button"][aria-label="Додати в чергу"],
                [role="button"][aria-label="Add to queue"],
                yt-button-view-model:has(button[aria-label="Поделиться"]),
                yt-button-view-model:has(button[aria-label="Создать клип"]),
                yt-button-view-model:has(button[aria-label="Спасибо"]),
                yt-button-view-model:has(button[aria-label="Показать текст видео"]),
                yt-button-view-model:has(button[aria-label="Share"]),
                yt-button-view-model:has(button[aria-label="Clip"]),
                yt-button-view-model:has(button[aria-label="Thanks"]),
                yt-button-view-model:has(button[aria-label="Thank You"]),
                yt-button-view-model:has(button[aria-label="Show transcript"]),
                yt-button-view-model:has(button[aria-label="Show text version"]),
                yt-button-view-model:has(button[aria-label="Поділитися"]),
                yt-button-view-model:has(button[aria-label="Створити кліп"]),
                yt-button-view-model:has(button[aria-label="Дякую"]),
                yt-button-view-model:has(button[aria-label="Показати текстову версію"]) {
                    display: none !important;
                }
            `);
        }

        if (ytSettings.hideSidebarExtras) {
            rules.push(`
                #footer.ytd-guide-renderer,
                ytd-guide-entry-renderer:has(> a[href^="/gaming"]),
                ytd-guide-entry-renderer:has(> a[href^="/channel/UCEgdi0XIXXZ-qJOFPf4JSKw"]),
                ytd-guide-entry-renderer:has(> a[href^="/feed/courses"]),
                ytd-guide-entry-renderer:has(> a[href^="/podcasts"]),
                ytd-guide-entry-renderer:has(> a[href^="/playables"]),
                ytd-guide-entry-renderer:has(> a[href*="youtube.com/premium"]),
                ytd-guide-entry-renderer:has(> a[href*="music.youtube.com"]),
                ytd-guide-entry-renderer:has(> a[href*="youtubekids.com"]),
                ytd-guide-section-renderer:nth-child(3) > #items > ytd-guide-entry-renderer:nth-child(n+2),
                ytd-guide-section-renderer:nth-child(4) {
                    display: none !important;
                }
            `);
        }

        if (ytSettings.hidePromosAndShorts) {
            rules.push(`
                ytd-search-pyv-renderer,
                [class^="ytd-promoted-"],
                ytd-video-renderer + ytd-shelf-renderer,
                ytd-video-renderer + ytd-reel-shelf-renderer,
                ytd-reel-shelf-renderer,
                ytd-rich-section-renderer:has(a[href^="/premium"]),
                #premium-upsell-link,
                #clarify-box,
                .ytd-watch-flexy.attached-message,
                ytd-popup-container tp-yt-paper-dialog ytd-single-option-survey-renderer,
                #donation-shelf,
                .sparkles-light-cta,
                ytd-feed-nudge-renderer,
                #teaser-carousel:has(> .ytVideoMetadataCarouselViewModelHost),
                #newness-dot {
                    display: none !important;
                }
            `);
        }

        return rules.join('\n');
    }

    function applyHideElementsCSS() {
        const css = buildHideElementsCSS();
        if (css) setManagedStyle('yt-hide', css);
        else removeManagedStyle('yt-hide');
    }

    function applyCompactMode() {
        setManagedStyle('yt-compact', `
            ytd-rich-grid-renderer { --ytd-rich-grid-item-margin: 8px !important; --ytd-rich-grid-gutter-margin: 8px !important; }
            ytd-rich-item-renderer { margin-bottom: 8px !important; }
            ytd-video-renderer, ytd-compact-video-renderer { margin-bottom: 6px !important; padding: 4px 0 !important; }
            #masthead-container { --ytd-masthead-height: 48px !important; }
            #container.ytd-masthead { height: 48px !important; }
            ytd-comment-thread-renderer { margin-bottom: 12px !important; }
            #secondary { padding-left: 8px !important; }
        `);
    }

    // --- 4.1. Авто-качество с мостом через границу песочницы ---

    const QUALITY_ORDER = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
    let qualityBridgeInjected = false;
    let autoQualityActive = false;
    let qualityTimers = [];

    function pickTargetQuality(available, preferred) {
        if (!available || !available.length) return null;
        if (available.includes(preferred)) return preferred;
        const idx = QUALITY_ORDER.indexOf(preferred);
        const lower = QUALITY_ORDER.slice(Math.max(0, idx + 1)).find(q => available.includes(q));
        return lower || QUALITY_ORDER.find(q => available.includes(q)) || available[0];
    }

    function ensurePageQualityBridge() {
        if (qualityBridgeInjected) return;
        qualityBridgeInjected = true;
        try {
            const script = document.createElement('script');
            script.textContent = `(function(){
                const order = ['highres','hd2160','hd1440','hd1080','hd720','large','medium','small','tiny'];
                document.addEventListener('bt:set-yt-quality', function(ev) {
                    const preferred = ev && ev.detail;
                    const p = document.getElementById('movie_player');
                    if (!preferred || !p || typeof p.getAvailableQualityLevels !== 'function') return;
                    const avail = p.getAvailableQualityLevels() || [];
                    if (!avail.length) return;
                    let target = avail.includes(preferred) ? preferred : null;
                    if (!target) {
                        const idx = order.indexOf(preferred);
                        target = order.slice(Math.max(0, idx + 1)).find(q => avail.includes(q)) || order.find(q => avail.includes(q)) || avail[0];
                    }
                    if (!target || (typeof p.getPlaybackQuality === 'function' && p.getPlaybackQuality() === target)) return;
                    if (typeof p.setPlaybackQualityRange === 'function') p.setPlaybackQualityRange(target, target);
                    if (typeof p.setPlaybackQuality === 'function') p.setPlaybackQuality(target);
                });
            })();`;
            (document.head || document.documentElement).appendChild(script);
            script.remove();
        } catch (_) {}
    }

    function setPreferredQuality() {
        const domPlayer = document.getElementById('movie_player');
        if (!domPlayer) return;

        // 1. Прямой доступ через Xray (Firefox wrappedJSObject) или unsafeWindow
        let rawPlayer = null;
        try {
            rawPlayer = domPlayer.wrappedJSObject
                || (typeof unsafeWindow !== 'undefined' && unsafeWindow && unsafeWindow.document && unsafeWindow.document.getElementById('movie_player'))
                || domPlayer;
        } catch (_) {
            rawPlayer = domPlayer;
        }

        try {
            if (rawPlayer && typeof rawPlayer.getAvailableQualityLevels === 'function') {
                const rawLevels = rawPlayer.getAvailableQualityLevels();
                const available = Array.isArray(rawLevels) ? rawLevels : Array.from(rawLevels || []);
                if (!available.length) return;
                const target = pickTargetQuality(available, selectedQuality);
                const current = typeof rawPlayer.getPlaybackQuality === 'function' ? rawPlayer.getPlaybackQuality() : '';
                if (!target || current === target) return;
                if (typeof rawPlayer.setPlaybackQualityRange === 'function') rawPlayer.setPlaybackQualityRange(target, target);
                if (typeof rawPlayer.setPlaybackQuality === 'function') rawPlayer.setPlaybackQuality(target);
                return;
            }
        } catch (_) {}

        // 2. Резервный мост в page-контекст для изолированных песочниц Chromium
        ensurePageQualityBridge();
        document.dispatchEvent(new CustomEvent('bt:set-yt-quality', { detail: selectedQuality }));
    }

    function scheduleQualityPass() {
        if (!autoQualityActive) return;
        qualityTimers.forEach(t => clearTimeout(t));
        qualityTimers = [
            setTimeout(setPreferredQuality, 80),
            setTimeout(setPreferredQuality, 650),
            setTimeout(setPreferredQuality, 1800)
        ];
    }

    function onVideoQualityEvent(e) {
        if (!autoQualityActive) return;
        if (e.target && e.target.tagName === 'VIDEO') scheduleQualityPass();
    }

    function applyAutoQuality() {
        if (autoQualityActive) return;
        autoQualityActive = true;
        window.addEventListener('yt-navigate-finish', scheduleQualityPass);
        window.addEventListener('yt-page-data-updated', scheduleQualityPass);
        window.addEventListener('loadedmetadata', onVideoQualityEvent, true);
        window.addEventListener('playing', onVideoQualityEvent, true);
        scheduleQualityPass();
    }

    function removeAutoQuality() {
        autoQualityActive = false;
        qualityTimers.forEach(t => clearTimeout(t));
        qualityTimers = [];
        window.removeEventListener('yt-navigate-finish', scheduleQualityPass);
        window.removeEventListener('yt-page-data-updated', scheduleQualityPass);
        window.removeEventListener('loadedmetadata', onVideoQualityEvent, true);
        window.removeEventListener('playing', onVideoQualityEvent, true);
    }

    // --- 4.2. Скорость воспроизведения (колесо и клавиатура) ---

    let speedHotkeyHandler = null;
    let wheelSpeedHandler = null;

    function getActiveWatchVideo() {
        const path = location.pathname || '';
        const isWatchRoute = /^\/(watch|shorts|live)\b/.test(path);
        const candidates = Array.from(document.querySelectorAll('video')).filter(v => {
            if (v.closest('ytd-moving-thumbnail-renderer, #inline-preview-player')) return false;
            return v.readyState > 0 && v.offsetWidth > 120 && v.offsetHeight > 80;
        });
        if (isWatchRoute) return candidates[0] || document.querySelector('#movie_player video, ytd-shorts video');
        return candidates.find(v => !v.paused) || null;
    }

    function applyPlaybackRate(video, rate) {
        const clamped = Math.round(Math.max(0.25, Math.min(4, rate)) * 100) / 100;
        video.playbackRate = clamped;
        showOSD('Скорость: ' + clamped.toFixed(2) + '×');
    }

    function applySpeedHotkeys() {
        if (speedHotkeyHandler) return;
        speedHotkeyHandler = function (e) {
            if (!e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
            const composed = typeof e.composedPath === 'function' ? e.composedPath() : null;
            const target = (composed && composed[0]) || e.target;
            if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== '0') return;

            const video = getActiveWatchVideo();
            if (!video) return;

            e.preventDefault();
            const current = video.playbackRate || 1;
            if (e.key === 'ArrowUp') applyPlaybackRate(video, current + speedStep);
            else if (e.key === 'ArrowDown') applyPlaybackRate(video, current - speedStep);
            else applyPlaybackRate(video, 1);
        };
        window.addEventListener('keydown', speedHotkeyHandler, true);
    }

    function removeSpeedHotkeys() {
        if (!speedHotkeyHandler) return;
        window.removeEventListener('keydown', speedHotkeyHandler, true);
        speedHotkeyHandler = null;
    }

    function applyWheelSpeed() {
        if (wheelSpeedHandler) return;
        wheelSpeedHandler = function (e) {
            if (!e.shiftKey) return;
            const player = document.querySelector('#movie_player, .html5-video-player');
            if (!player || !player.contains(e.target)) return;
            const video = player.querySelector('video') || document.querySelector('video');
            if (!video) return;
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -speedStep : speedStep;
            applyPlaybackRate(video, (video.playbackRate || 1) + delta);
        };
        window.addEventListener('wheel', wheelSpeedHandler, { passive: false, capture: true });
    }

    function removeWheelSpeed() {
        if (!wheelSpeedHandler) return;
        window.removeEventListener('wheel', wheelSpeedHandler, { capture: true });
        wheelSpeedHandler = null;
    }

    // --- 4.3. Перевод комментариев (debounce + учёт переиспользования узлов YouTube) ---

    let translateObserver = null;
    let translateScanTimer = null;

    function isRussian(text) {
        const value = (text || '').toLowerCase();
        if (/[іїєґўђјљњћќџѝ]/i.test(value)) return false;
        const cyr = (value.match(/[а-яё]/g) || []).length;
        if (cyr === 0) return false;
        const lat = (value.match(/[a-z]/g) || []).length;
        return cyr >= lat;
    }

    function getTranslationCache() {
        const cache = gmGet(TRANSLATION_CACHE_KEY, {});
        return cache && typeof cache === 'object' && !Array.isArray(cache) ? cache : {};
    }

    function saveTranslationCache(cache) {
        const trimmed = Object.fromEntries(Object.entries(cache).slice(-300));
        gmSet(TRANSLATION_CACHE_KEY, trimmed);
    }

    function translateText(text, targetLang, callback) {
        // Безопасная обрезка по кодовым точкам Unicode без разрезания эмодзи (суррогатных пар)
        const input = Array.from(text || '').slice(0, 1500).join('');
        if (!input) { callback(null); return; }
        const cache = getTranslationCache();
        const cacheKey = targetLang + ':' + input;
        if (cache[cacheKey]) {
            callback(cache[cacheKey]);
            return;
        }
        const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl='
            + encodeURIComponent(targetLang) + '&dt=t&q=' + encodeURIComponent(input);
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            onload(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    let translated = '';
                    if (data && Array.isArray(data[0])) {
                        for (let i = 0; i < data[0].length; i++) {
                            if (data[0][i] && data[0][i][0]) translated += data[0][i][0];
                        }
                    }
                    if (translated) {
                        cache[cacheKey] = translated;
                        saveTranslationCache(cache);
                    }
                    callback(translated || null);
                } catch (_) {
                    callback(null);
                }
            },
            onerror() {
                callback(null);
            }
        });
    }

    function applyTranslateUIStyle() {
        const uiFont = fontEnabled
            ? 'font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif; font-weight: 300;'
            : 'font-family: Roboto, Arial, system-ui, sans-serif; font-weight: 400;';
        setManagedStyle('yt-translate-ui', `
            .retube-translate-wrapper { margin-top: 6px; }
            .retube-translate-btn {
                display: inline-block; padding: 3px 10px; font-size: 12px;
                ${uiFont}
                background: rgba(96, 100, 110, 0.37); color: rgb(201, 208, 211);
                border: 1px solid rgb(72, 75, 91); border-radius: 10px; cursor: pointer;
                transition: background 0.2s ease, color 0.2s ease;
            }
            .retube-translate-btn:hover { background: rgba(96, 100, 110, 0.62); color: #fff; }
            .retube-translation-box {
                display: none; margin-top: 8px; padding: 10px 12px;
                background: rgba(87, 133, 186, 0.12); border-left: 3px solid rgba(122, 163, 212, 0.7);
                border-radius: 6px; font-size: 14px; line-height: 1.5; color: #ddd;
                white-space: pre-wrap; ${uiFont}
            }
        `);
    }

    function scanCommentsForTranslation() {
        applyTranslateUIStyle();

        const comments = document.querySelectorAll('ytd-comment-view-model #content-text, ytd-comment-renderer #content-text');
        comments.forEach(textEl => {
            const currentText = (textEl.textContent || '').trim();
            if (textEl.dataset.btSourceText === currentText) return;

            // Если YouTube переиспользовал DOM-узел комментария для нового видео — очищаем старую кнопку/перевод
            const nextSibling = textEl.nextElementSibling;
            if (nextSibling && nextSibling.classList.contains('retube-translate-wrapper')) {
                nextSibling.remove();
            }
            textEl.dataset.btSourceText = currentText;

            if (!currentText || isRussian(currentText)) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'retube-translate-wrapper';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'retube-translate-btn';
            btn.textContent = 'Перевести';

            const box = document.createElement('div');
            box.className = 'retube-translation-box';

            let translatedForText = '';
            let loading = false;

            btn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                if (loading) return;

                const liveText = (textEl.textContent || '').trim();
                if (translatedForText && translatedForText === liveText) {
                    const visible = box.style.display !== 'none';
                    box.style.display = visible ? 'none' : 'block';
                    btn.textContent = visible ? 'Показать перевод' : 'Скрыть перевод';
                    return;
                }

                loading = true;
                btn.disabled = true;
                btn.textContent = 'Перевод…';
                box.style.display = 'block';
                box.textContent = 'Перевод…';

                translateText(liveText, 'ru', result => {
                    loading = false;
                    btn.disabled = false;
                    if (result) {
                        translatedForText = liveText;
                        box.textContent = result;
                        btn.textContent = 'Скрыть перевод';
                    } else {
                        box.textContent = 'Не удалось перевести. Попробуйте позже.';
                        btn.textContent = 'Повторить';
                    }
                });
            });

            wrapper.append(btn, box);
            if (textEl.parentNode) textEl.parentNode.insertBefore(wrapper, textEl.nextSibling);
        });
    }

    function scheduleCommentScan() {
        clearTimeout(translateScanTimer);
        translateScanTimer = setTimeout(scanCommentsForTranslation, 180);
    }

    function resetRecycledComments() {
        document.querySelectorAll('.retube-translate-wrapper').forEach(el => el.remove());
        document.querySelectorAll('[data-bt-source-text]').forEach(el => { delete el.dataset.btSourceText; });
        scheduleCommentScan();
    }

    function applyTranslateComments() {
        if (translateObserver || !document.body) return;
        scanCommentsForTranslation();
        translateObserver = new MutationObserver(mutations => {
            const relevant = mutations.some(m => {
                const t = m.target;
                if (!t || t.nodeType !== 1) return false;
                if (t.closest && t.closest('#movie_player, .retube-translate-wrapper')) return false;
                return true;
            });
            if (relevant) scheduleCommentScan();
        });
        translateObserver.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('yt-navigate-finish', resetRecycledComments);
    }

    function removeTranslateComments() {
        clearTimeout(translateScanTimer);
        if (translateObserver) {
            translateObserver.disconnect();
            translateObserver = null;
        }
        window.removeEventListener('yt-navigate-finish', resetRecycledComments);
        removeManagedStyle('yt-translate-ui');
        document.querySelectorAll('.retube-translate-wrapper').forEach(el => el.remove());
        document.querySelectorAll('[data-bt-source-text]').forEach(el => { delete el.dataset.btSourceText; });
    }

    function syncYouTubeFeatures() {
        if (!isYouTube) return;
        if (ytSettings.smoothAnim) applySmoothAnimations(); else removeManagedStyle('yt-smooth');
        applyHideElementsCSS();
        if (ytSettings.compactMode) applyCompactMode(); else removeManagedStyle('yt-compact');
        if (ytSettings.autoQuality) applyAutoQuality(); else removeAutoQuality();
        if (ytSettings.wheelSpeed) applyWheelSpeed(); else removeWheelSpeed();
        if (ytSettings.speedHotkeys) applySpeedHotkeys(); else removeSpeedHotkeys();
        if (ytSettings.translateComments) applyTranslateComments(); else removeTranslateComments();
    }

    // --- 4.4. Экспорт и импорт настроек в JSON ---

    let standaloneImportInput = null;

    function buildSettingsExportObject() {
        const storedYt = isYouTube ? ytSettings : gmGet(YT_SETTINGS_KEY, null);
        const exportedYtSettings = {};
        Object.keys(DEFAULT_YT_SETTINGS).forEach(key => {
            const val = storedYt && typeof storedYt === 'object' && storedYt[key] !== undefined
                ? storedYt[key]
                : DEFAULT_YT_SETTINGS[key];
            exportedYtSettings[key] = Boolean(val);
        });

        const rawQuality = isYouTube ? selectedQuality : gmGet(YT_QUALITY_KEY, 'hd1080');
        const exportedQuality = QUALITY_MAP[rawQuality] ? rawQuality : 'hd1080';

        const rawStep = isYouTube ? speedStep : Number(gmGet(YT_SPEED_STEP_KEY, 0.25));
        const exportedSpeedStep = [0.05, 0.1, 0.25, 0.5].includes(rawStep) ? rawStep : 0.25;

        const savedPos = gmGet(PANEL_POS_KEY, null);
        const exportedPos = savedPos && Number.isFinite(Number(savedPos.left)) && Number.isFinite(Number(savedPos.top))
            ? { left: Math.round(Number(savedPos.left)), top: Math.round(Number(savedPos.top)) }
            : null;

        return {
            app: 'Browser Tweaks',
            schemaVersion: 1,
            scriptVersion: SCRIPT_VERSION,
            exportedAt: new Date().toISOString(),
            font: {
                enabled: fontEnabled,
                intensity: fontIntensity,
                excludedHosts: getExcludedHosts()
            },
            youtube: {
                settings: exportedYtSettings,
                quality: exportedQuality,
                speedStep: exportedSpeedStep
            },
            ui: {
                panelPosition: exportedPos
            }
        };
    }

    function exportSettingsToJsonFile(showFeedback = true) {
        const jsonText = JSON.stringify(buildSettingsExportObject(), null, 2);
        const dateStamp = new Date().toISOString().slice(0, 10);
        const filename = `browser-tweaks-settings-${dateStamp}.json`;
        try {
            const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            (document.body || document.documentElement).appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => {
                try { URL.revokeObjectURL(url); } catch (_) {}
            }, 1500);
            if (showFeedback) showOSD('Настройки экспортированы в JSON', 'on');
            return { ok: true, filename, jsonText };
        } catch (_) {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(jsonText).then(
                    () => { if (showFeedback) showOSD('JSON настроек скопирован в буфер обмена', 'on'); },
                    () => { if (showFeedback) showOSD('Не удалось экспортировать настройки', 'off'); }
                );
                return { ok: true, clipboard: true, jsonText };
            }
            if (showFeedback) showOSD('Не удалось экспортировать настройки', 'off');
            return { ok: false };
        }
    }

    function applyPanelSavedPosition(pos) {
        if (!panelEl) return;
        if (pos && Number.isFinite(Number(pos.left)) && Number.isFinite(Number(pos.top))) {
            panelEl.style.left = Math.round(Number(pos.left)) + 'px';
            panelEl.style.top = Math.round(Number(pos.top)) + 'px';
            panelEl.style.right = 'auto';
        } else {
            panelEl.style.left = Math.max(16, window.innerWidth - 356) + 'px';
            panelEl.style.top = '72px';
            panelEl.style.right = 'auto';
        }
        clampPanelPosition();
    }

    function applyImportedSettingsObject(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Некорректный JSON-объект');
        }
        let recognizedCount = 0;

        if (data.font && typeof data.font === 'object' && !Array.isArray(data.font)) {
            if (typeof data.font.enabled === 'boolean') {
                fontEnabled = data.font.enabled;
                gmSet(FONT_ENABLED_KEY, fontEnabled);
                recognizedCount++;
            }
            if (data.font.intensity === 'soft' || data.font.intensity === 'strong') {
                fontIntensity = data.font.intensity;
                gmSet(FONT_INTENSITY_KEY, fontIntensity);
                recognizedCount++;
            }
            if (Array.isArray(data.font.excludedHosts)) {
                const cleanedHosts = [...new Set(data.font.excludedHosts.map(normalizeHostInput).filter(Boolean))];
                gmSet(FONT_EXCLUDED_KEY, cleanedHosts);
                recognizedCount++;
            }
        }

        if (data.youtube && typeof data.youtube === 'object' && !Array.isArray(data.youtube)) {
            const currentStoredYt = isYouTube ? ytSettings : gmGet(YT_SETTINGS_KEY, null);
            const nextYt = Object.assign(
                {},
                DEFAULT_YT_SETTINGS,
                currentStoredYt && typeof currentStoredYt === 'object' ? currentStoredYt : {}
            );
            if (data.youtube.settings && typeof data.youtube.settings === 'object' && !Array.isArray(data.youtube.settings)) {
                let ytKeyMatched = false;
                Object.keys(DEFAULT_YT_SETTINGS).forEach(key => {
                    if (typeof data.youtube.settings[key] === 'boolean') {
                        nextYt[key] = data.youtube.settings[key];
                        ytKeyMatched = true;
                    }
                });
                if (ytKeyMatched) {
                    ytSettings = nextYt;
                    gmSet(YT_SETTINGS_KEY, nextYt);
                    recognizedCount++;
                }
            }
            if (QUALITY_MAP[data.youtube.quality]) {
                selectedQuality = data.youtube.quality;
                gmSet(YT_QUALITY_KEY, selectedQuality);
                recognizedCount++;
            }
            if (data.youtube.speedStep !== undefined) {
                const stepNum = Number(data.youtube.speedStep);
                if ([0.05, 0.1, 0.25, 0.5].includes(stepNum)) {
                    speedStep = stepNum;
                    gmSet(YT_SPEED_STEP_KEY, stepNum);
                    recognizedCount++;
                }
            }
        }

        if (data.ui && typeof data.ui === 'object' && !Array.isArray(data.ui)) {
            if (data.ui.panelPosition === null) {
                gmSet(PANEL_POS_KEY, null);
                applyPanelSavedPosition(null);
                recognizedCount++;
            } else if (data.ui.panelPosition && typeof data.ui.panelPosition === 'object') {
                const left = Number(data.ui.panelPosition.left);
                const top = Number(data.ui.panelPosition.top);
                if (Number.isFinite(left) && Number.isFinite(top)) {
                    const saved = { left: Math.round(left), top: Math.round(top) };
                    gmSet(PANEL_POS_KEY, saved);
                    applyPanelSavedPosition(saved);
                    recognizedCount++;
                }
            }
        }

        if (recognizedCount === 0) {
            throw new Error('Файл не содержит настроек Browser Tweaks');
        }

        applyGlobalFont();
        syncFontUI();
        if (isYouTube) {
            syncYouTubeFeatures();
            syncYouTubeUI();
            if (ytSettings.translateComments) applyTranslateUIStyle();
            if (ytSettings.autoQuality) setPreferredQuality();
        }
    }

    function importSettingsFromJsonText(jsonText, showFeedback = true) {
        try {
            const parsed = JSON.parse(String(jsonText || ''));
            applyImportedSettingsObject(parsed);
            if (showFeedback) showOSD('Настройки успешно импортированы', 'on');
            return { ok: true };
        } catch (err) {
            const msg = err && err.message && err.message.includes('Browser Tweaks')
                ? err.message
                : 'Ошибка импорта: неверный JSON-файл';
            if (showFeedback) showOSD(msg, 'off');
            return { ok: false, error: msg };
        }
    }

    function createImportFileInput() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            input.value = '';
            if (!file) return;
            if (typeof file.text === 'function') {
                file.text().then(
                    text => importSettingsFromJsonText(text, true),
                    () => showOSD('Не удалось прочитать файл', 'off')
                );
            } else if (typeof FileReader !== 'undefined') {
                const reader = new FileReader();
                reader.onload = () => importSettingsFromJsonText(String(reader.result || ''), true);
                reader.onerror = () => showOSD('Не удалось прочитать файл', 'off');
                reader.readAsText(file);
            }
        });
        return input;
    }

    function openSettingsImportPicker() {
        if (uiRefs && uiRefs.importFileInput) {
            uiRefs.importFileInput.click();
            return;
        }
        const root = ensureShadowHost();
        if (!root) return;
        if (!standaloneImportInput) {
            standaloneImportInput = createImportFileInput();
            root.appendChild(standaloneImportInput);
        }
        standaloneImportInput.click();
    }

    // ==========================================
    // 5. ЛЕНИВЫЙ РЕНДЕР ПАНЕЛИ НАСТРОЕК (SHADOW DOM)
    // ==========================================

    function syncYouTubeUI() {
        if (!uiRefs || !isYouTube) return;
        if (uiRefs.checkboxes) {
            uiRefs.checkboxes.forEach((cb, key) => { cb.checked = Boolean(ytSettings[key]); });
        }
        if (uiRefs.subList) {
            uiRefs.subList.classList.toggle('muted', !ytSettings.hideElements);
        }
        if (uiRefs.qualitySelect) uiRefs.qualitySelect.value = selectedQuality;
        if (uiRefs.speedSelect) uiRefs.speedSelect.value = String(speedStep);
    }

    function attachTooltipBehavior(el, text) {
        if (!text) return;
        el.addEventListener('mouseenter', e => {
            clearTimeout(tooltipTimer);
            const x = e.clientX;
            const y = e.clientY;
            tooltipTimer = setTimeout(() => showTooltip(text, x, y), 380);
        });
        el.addEventListener('mousemove', e => {
            if (tooltipEl && tooltipEl.classList.contains('visible')) {
                showTooltip(text, e.clientX, e.clientY);
            }
        });
        el.addEventListener('mouseleave', hideTooltip);
    }

    function ensureSettingsPanel() {
        if (panelEl) return panelEl;
        const root = ensureShadowHost();
        if (!root) return null;

        uiRefs = { checkboxes: new Map() };

        panelEl = document.createElement('div');
        panelEl.className = 'bt-panel';
        panelEl.setAttribute('role', 'dialog');
        panelEl.setAttribute('aria-label', 'Настройки Browser Tweaks');

        const savedPos = gmGet(PANEL_POS_KEY, null);
        if (savedPos && Number.isFinite(Number(savedPos.left)) && Number.isFinite(Number(savedPos.top))) {
            panelEl.style.left = Math.round(Number(savedPos.left)) + 'px';
            panelEl.style.top = Math.round(Number(savedPos.top)) + 'px';
        } else {
            panelEl.style.left = Math.max(16, window.innerWidth - 356) + 'px';
            panelEl.style.top = '72px';
        }

        const header = document.createElement('div');
        header.className = 'bt-header';
        const title = document.createElement('span');
        title.className = 'bt-title';
        title.textContent = isYouTube ? 'Browser Tweaks · YouTube' : 'Browser Tweaks';
        const grip = document.createElement('span');
        grip.className = 'bt-grip';
        grip.textContent = '⋮⋮';
        header.append(title, grip);
        panelEl.appendChild(header);

        const body = document.createElement('div');
        body.className = 'bt-body';

        if (isYouTube) {
            const createCheckRow = (key, labelText, tooltipText) => {
                const label = document.createElement('label');
                label.className = 'bt-row-check';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = Boolean(ytSettings[key]);
                const text = document.createElement('span');
                text.textContent = labelText;
                label.append(cb, text);

                cb.addEventListener('change', () => {
                    ytSettings[key] = cb.checked;
                    gmSet(YT_SETTINGS_KEY, ytSettings);
                    syncYouTubeFeatures();
                    syncYouTubeUI();
                });

                attachTooltipBehavior(label, tooltipText);
                uiRefs.checkboxes.set(key, cb);
                return label;
            };

            body.appendChild(createCheckRow('smoothAnim', 'Плавные анимации страницы', TOOLTIPS.smoothAnim));

            // Строка «Скрыть лишние элементы» + раскрывающееся подменю категорий
            const hideRowWrap = document.createElement('div');
            hideRowWrap.className = 'bt-row-with-expand';
            const hideMainRow = createCheckRow('hideElements', 'Скрыть лишние элементы', TOOLTIPS.hideElements);
            const expandBtn = document.createElement('button');
            expandBtn.type = 'button';
            expandBtn.className = 'bt-expand-btn';
            expandBtn.setAttribute('aria-expanded', 'false');
            expandBtn.title = 'Настроить категории скрываемых элементов';
            expandBtn.textContent = '▾';
            hideRowWrap.append(hideMainRow, expandBtn);
            body.appendChild(hideRowWrap);

            const subList = document.createElement('div');
            subList.className = 'bt-sublist' + (ytSettings.hideElements ? '' : ' muted');
            uiRefs.subList = subList;

            HIDE_SUBKEYS.forEach(([subKey, subLabel]) => {
                subList.appendChild(createCheckRow(subKey, subLabel));
            });
            body.appendChild(subList);

            expandBtn.addEventListener('click', () => {
                const isOpen = subList.classList.toggle('open');
                expandBtn.setAttribute('aria-expanded', String(isOpen));
                clampPanelPosition();
            });

            body.appendChild(createCheckRow('wheelSpeed', 'Скорость колесом мыши (Shift)', TOOLTIPS.wheelSpeed));
            body.appendChild(createCheckRow('translateComments', 'Перевод комментариев', TOOLTIPS.translateComments));
            body.appendChild(createCheckRow('compactMode', 'Компактный режим', TOOLTIPS.compactMode));
            body.appendChild(createCheckRow('autoQuality', 'Авто-качество видео', TOOLTIPS.autoQuality));
            body.appendChild(createCheckRow('speedHotkeys', 'Горячие клавиши скорости', TOOLTIPS.speedHotkeys));

            // Выбор качества
            const qualityRow = document.createElement('div');
            qualityRow.className = 'bt-select-row';
            const qualityLabel = document.createElement('span');
            qualityLabel.className = 'bt-select-label';
            qualityLabel.textContent = 'Качество:';
            const qualitySelect = document.createElement('select');
            qualitySelect.className = 'bt-select';
            Object.entries(QUALITY_MAP).forEach(([val, text]) => {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = text;
                opt.selected = val === selectedQuality;
                qualitySelect.appendChild(opt);
            });
            qualitySelect.addEventListener('change', () => {
                selectedQuality = qualitySelect.value;
                gmSet(YT_QUALITY_KEY, selectedQuality);
                if (ytSettings.autoQuality) setPreferredQuality();
            });
            uiRefs.qualitySelect = qualitySelect;
            qualityRow.append(qualityLabel, qualitySelect);
            body.appendChild(qualityRow);

            // Выбор шага скорости
            const speedRow = document.createElement('div');
            speedRow.className = 'bt-select-row';
            const speedLabel = document.createElement('span');
            speedLabel.className = 'bt-select-label';
            speedLabel.textContent = 'Шаг скорости:';
            const speedSelect = document.createElement('select');
            speedSelect.className = 'bt-select';
            [
                [0.05, '0,05×'],
                [0.1, '0,1×'],
                [0.25, '0,25×'],
                [0.5, '0,5×']
            ].forEach(([val, text]) => {
                const opt = document.createElement('option');
                opt.value = String(val);
                opt.textContent = text;
                opt.selected = val === speedStep;
                speedSelect.appendChild(opt);
            });
            speedSelect.addEventListener('change', () => {
                speedStep = Number(speedSelect.value);
                gmSet(YT_SPEED_STEP_KEY, speedStep);
            });
            uiRefs.speedSelect = speedSelect;
            speedRow.append(speedLabel, speedSelect);
            body.appendChild(speedRow);
        }

        // Карточка глобального шрифта Ubuntu Light (общая для всех сайтов)
        const fontCard = document.createElement('div');
        fontCard.className = 'bt-card';

        const fontTitle = document.createElement('div');
        fontTitle.className = 'bt-card-title';
        fontTitle.textContent = 'Глобальный шрифт Ubuntu Light';
        fontCard.appendChild(fontTitle);

        const fontToggleRow = document.createElement('label');
        fontToggleRow.className = 'bt-row-check';
        fontToggleRow.style.padding = '4px 6px';
        const fontEnabledCb = document.createElement('input');
        fontEnabledCb.type = 'checkbox';
        fontEnabledCb.checked = fontEnabled;
        const fontEnabledLabel = document.createElement('span');
        fontEnabledLabel.textContent = 'Включить кастомный шрифт';
        fontToggleRow.append(fontEnabledCb, fontEnabledLabel);
        fontEnabledCb.addEventListener('change', () => {
            setGlobalFontEnabled(fontEnabledCb.checked, true);
        });
        uiRefs.fontEnabledCb = fontEnabledCb;
        fontCard.appendChild(fontToggleRow);

        const fontControlsWrap = document.createElement('div');
        fontControlsWrap.className = 'bt-font-controls';
        uiRefs.fontControlsWrap = fontControlsWrap;

        const intensityRow = document.createElement('div');
        intensityRow.className = 'bt-select-row';
        intensityRow.style.padding = '0';
        const intensityLabel = document.createElement('span');
        intensityLabel.className = 'bt-select-label';
        intensityLabel.textContent = 'Интенсивность:';
        const intensitySelect = document.createElement('select');
        intensitySelect.className = 'bt-select';
        [
            ['soft', 'Мягкая'],
            ['strong', 'Выраженная']
        ].forEach(([val, text]) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = text;
            opt.selected = fontIntensity === val;
            intensitySelect.appendChild(opt);
        });
        intensitySelect.addEventListener('change', () => {
            fontIntensity = intensitySelect.value;
            gmSet(FONT_INTENSITY_KEY, fontIntensity);
            applyGlobalFont();
        });
        uiRefs.intensitySelect = intensitySelect;
        intensityRow.append(intensityLabel, intensitySelect);
        fontControlsWrap.appendChild(intensityRow);

        const excludeBtn = document.createElement('button');
        excludeBtn.type = 'button';
        excludeBtn.className = 'bt-btn';
        excludeBtn.addEventListener('click', () => toggleFontExclusion(true));
        uiRefs.excludeBtn = excludeBtn;
        fontControlsWrap.appendChild(excludeBtn);
        fontCard.appendChild(fontControlsWrap);

        // Управление списком исключённых сайтов
        const exclToggleBtn = document.createElement('button');
        exclToggleBtn.type = 'button';
        exclToggleBtn.className = 'bt-excl-toggle';
        exclToggleBtn.setAttribute('aria-expanded', 'false');
        const exclToggleText = document.createElement('span');
        exclToggleText.textContent = 'Исключённые сайты (0)';
        const exclChevron = document.createElement('span');
        exclChevron.className = 'bt-excl-chevron';
        exclChevron.textContent = '▾';
        exclToggleBtn.append(exclToggleText, exclChevron);
        uiRefs.exclToggleText = exclToggleText;
        fontCard.appendChild(exclToggleBtn);

        const exclPanel = document.createElement('div');
        exclPanel.className = 'bt-excl-panel';
        uiRefs.exclPanel = exclPanel;

        const exclForm = document.createElement('div');
        exclForm.className = 'bt-excl-form';
        const exclInput = document.createElement('input');
        exclInput.type = 'text';
        exclInput.className = 'bt-input';
        exclInput.placeholder = 'example.com или URL';
        exclInput.spellcheck = false;
        exclInput.autocomplete = 'off';
        const exclAddBtn = document.createElement('button');
        exclAddBtn.type = 'button';
        exclAddBtn.className = 'bt-btn bt-btn-sm';
        exclAddBtn.textContent = 'Добавить';

        const submitExclInput = () => {
            const res = addExcludedHost(exclInput.value, true);
            if (res.ok) exclInput.value = '';
        };
        exclAddBtn.addEventListener('click', submitExclInput);
        exclInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                submitExclInput();
                return;
            }
            if (e.key === 'Escape' || e.key === 'F2') return;
            e.stopPropagation();
        });
        exclInput.addEventListener('keypress', e => e.stopPropagation());
        exclInput.addEventListener('keyup', e => e.stopPropagation());

        exclForm.append(exclInput, exclAddBtn);
        exclPanel.appendChild(exclForm);
        uiRefs.exclInput = exclInput;

        const exclList = document.createElement('div');
        exclList.className = 'bt-excl-list';
        uiRefs.exclList = exclList;
        exclPanel.appendChild(exclList);

        const exclClearBtn = document.createElement('button');
        exclClearBtn.type = 'button';
        exclClearBtn.className = 'bt-btn bt-btn-sm bt-btn-danger';
        exclClearBtn.textContent = 'Очистить весь список';
        exclClearBtn.addEventListener('click', () => clearExcludedHosts(true));
        uiRefs.exclClearBtn = exclClearBtn;
        exclPanel.appendChild(exclClearBtn);

        exclToggleBtn.addEventListener('click', () => {
            const isOpen = exclPanel.classList.toggle('open');
            exclToggleBtn.setAttribute('aria-expanded', String(isOpen));
            clampPanelPosition();
        });
        fontCard.appendChild(exclPanel);

        const fontNote = document.createElement('div');
        fontNote.className = 'bt-note';
        uiRefs.fontNote = fontNote;
        fontCard.appendChild(fontNote);
        body.appendChild(fontCard);

        // Карточка резервного копирования настроек (JSON)
        const backupCard = document.createElement('div');
        backupCard.className = 'bt-card';

        const backupTitle = document.createElement('div');
        backupTitle.className = 'bt-card-title';
        backupTitle.textContent = 'Резервная копия настроек';
        backupCard.appendChild(backupTitle);

        const backupRow = document.createElement('div');
        backupRow.className = 'bt-backup-row';

        const exportJsonBtn = document.createElement('button');
        exportJsonBtn.type = 'button';
        exportJsonBtn.className = 'bt-btn bt-btn-sm';
        exportJsonBtn.dataset.action = 'export-json';
        exportJsonBtn.textContent = 'Экспорт JSON';
        exportJsonBtn.addEventListener('click', () => exportSettingsToJsonFile(true));

        const importFileInput = createImportFileInput();

        const importJsonBtn = document.createElement('button');
        importJsonBtn.type = 'button';
        importJsonBtn.className = 'bt-btn bt-btn-sm';
        importJsonBtn.dataset.action = 'import-json';
        importJsonBtn.textContent = 'Импорт JSON';
        importJsonBtn.addEventListener('click', () => importFileInput.click());

        uiRefs.exportJsonBtn = exportJsonBtn;
        uiRefs.importJsonBtn = importJsonBtn;
        uiRefs.importFileInput = importFileInput;

        backupRow.append(exportJsonBtn, importJsonBtn);
        backupCard.append(backupRow, importFileInput);

        const backupNote = document.createElement('div');
        backupNote.className = 'bt-note';
        backupNote.textContent = 'Сохраняет и восстанавливает все параметры шрифта, исключения сайтов и настройки YouTube.';
        backupCard.appendChild(backupNote);
        body.appendChild(backupCard);

        // Кнопки управления панелью
        const actions = document.createElement('div');
        actions.className = 'bt-actions';

        if (isYouTube) {
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.className = 'bt-btn bt-btn-danger';
            resetBtn.textContent = 'Сбросить';
            resetBtn.addEventListener('click', () => {
                ytSettings = Object.assign({}, DEFAULT_YT_SETTINGS);
                selectedQuality = 'hd1080';
                speedStep = 0.25;
                gmSet(YT_SETTINGS_KEY, ytSettings);
                gmSet(YT_QUALITY_KEY, selectedQuality);
                gmSet(YT_SPEED_STEP_KEY, speedStep);
                syncYouTubeFeatures();
                syncYouTubeUI();
                resetBtn.textContent = 'Сброшено ✓';
                setTimeout(() => { resetBtn.textContent = 'Сбросить'; }, 1200);
            });
            actions.appendChild(resetBtn);
        }

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'bt-btn';
        closeBtn.textContent = 'Закрыть (Esc)';
        closeBtn.addEventListener('click', () => closePanel());
        actions.appendChild(closeBtn);

        body.appendChild(actions);
        panelEl.appendChild(body);
        root.appendChild(panelEl);

        syncFontUI();
        syncYouTubeUI();
        makeDraggable(panelEl, header);
        return panelEl;
    }

    function togglePanel() {
        const panel = ensureSettingsPanel();
        if (!panel) return;
        const willOpen = !panel.classList.contains('open');
        if (willOpen) {
            syncFontUI();
            syncYouTubeUI();
            panel.classList.add('open');
            clampPanelPosition();
        } else {
            closePanel();
        }
    }

    function closePanel() {
        if (panelEl) panelEl.classList.remove('open');
        hideTooltip();
    }

    // ==========================================
    // 6. ГЛОБАЛЬНЫЕ ХОТКЕИ, МЕНЮ И СИНХРОНИЗАЦИЯ
    // ==========================================

    window.addEventListener('keydown', e => {
        if (e.altKey && e.shiftKey && e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleGlobalFontEnabled(true);
            return;
        }
        if (e.altKey && e.shiftKey && e.code === 'KeyU' && !e.repeat && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleFontExclusion(true);
            return;
        }
        if (e.key === 'F2' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            togglePanel();
            return;
        }
        if (e.key === 'Escape' && panelEl && panelEl.classList.contains('open')) {
            e.preventDefault();
            e.stopPropagation();
            closePanel();
        }
    }, true);

    window.addEventListener('resize', () => {
        if (panelEl && panelEl.classList.contains('open')) clampPanelPosition();
    });

    if (typeof GM_registerMenuCommand === 'function') {
        try {
            GM_registerMenuCommand('Открыть / закрыть панель настроек (F2)', () => togglePanel());
            GM_registerMenuCommand('Вкл / выкл кастомный шрифт полностью (Alt+Shift+F)', () => toggleGlobalFontEnabled(true));
            GM_registerMenuCommand('Исключить / вернуть текущий сайт (Alt+Shift+U)', () => toggleFontExclusion(true));
            GM_registerMenuCommand('Экспорт настроек в JSON', () => exportSettingsToJsonFile(true));
            GM_registerMenuCommand('Импорт настроек из JSON', () => openSettingsImportPicker());
        } catch (_) {}
    }

    if (typeof GM_addValueChangeListener === 'function') {
        try {
            GM_addValueChangeListener(FONT_ENABLED_KEY, (_k, _oldV, newV, remote) => {
                if (!remote) return;
                fontEnabled = Boolean(newV);
                applyGlobalFont();
                syncFontUI();
                if (isYouTube && ytSettings.translateComments) applyTranslateUIStyle();
            });
            GM_addValueChangeListener(FONT_EXCLUDED_KEY, (_k, _oldV, _newV, remote) => {
                if (!remote) return;
                applyGlobalFont();
                syncFontUI();
            });
            GM_addValueChangeListener(FONT_INTENSITY_KEY, (_k, _oldV, newV, remote) => {
                if (!remote) return;
                if (newV === 'soft' || newV === 'strong') fontIntensity = newV;
                applyGlobalFont();
                syncFontUI();
            });
            GM_addValueChangeListener(PANEL_POS_KEY, (_k, _oldV, newV, remote) => {
                if (!remote) return;
                applyPanelSavedPosition(newV);
            });
            if (isYouTube) {
                GM_addValueChangeListener(YT_SETTINGS_KEY, (_k, _oldV, newV, remote) => {
                    if (!remote || !newV || typeof newV !== 'object') return;
                    ytSettings = Object.assign({}, DEFAULT_YT_SETTINGS, newV);
                    syncYouTubeFeatures();
                    syncYouTubeUI();
                });
                GM_addValueChangeListener(YT_QUALITY_KEY, (_k, _oldV, newV, remote) => {
                    if (!remote || !QUALITY_MAP[newV]) return;
                    selectedQuality = newV;
                    syncYouTubeUI();
                    if (ytSettings.autoQuality) setPreferredQuality();
                });
                GM_addValueChangeListener(YT_SPEED_STEP_KEY, (_k, _oldV, newV, remote) => {
                    const num = Number(newV);
                    if (!remote || ![0.05, 0.1, 0.25, 0.5].includes(num)) return;
                    speedStep = num;
                    syncYouTubeUI();
                });
            }
        } catch (_) {}
    }

    if (isYouTube) {
        const initYouTube = () => syncYouTubeFeatures();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initYouTube, { once: true });
        } else {
            initYouTube();
        }
    }
})();
