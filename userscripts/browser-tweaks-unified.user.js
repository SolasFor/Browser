// ==UserScript==
// @name         Browser Tweaks — Ubuntu Light + YouTube
// @namespace    https://github.com/SolasFor/Browser
// @version      1.3.0
// @description  Глобальный шрифт Ubuntu Light, универсальные инструменты браузера и модули YouTube в единой панели
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

    const SCRIPT_VERSION = '1.3.0';
    const FONT_URL = 'https://raw.githubusercontent.com/SolasFor/Browser/main/fonts/Ubuntu%20Light.woff2';
    const FONT_ENABLED_KEY = 'unifiedUbuntuLightEnabled';
    const FONT_EXCLUDED_KEY = 'unifiedUbuntuLightExcludedHosts';
    const FONT_INTENSITY_KEY = 'unifiedUbuntuLightIntensity';
    const FONT_SITE_INTENSITY_KEY = 'unifiedUbuntuLightSiteIntensity';

    const GLOBAL_SETTINGS_KEY = 'bt_global_settings';
    const PANEL_HOTKEY_KEY = 'bt_panel_hotkey';

    const YT_SETTINGS_KEY = 'bt_youtube_settings';
    const YT_QUALITY_KEY = 'bt_youtube_quality';
    const YT_SPEED_STEP_KEY = 'bt_youtube_speed_step';
    const YT_CHANNEL_SPEEDS_KEY = 'bt_youtube_channel_speeds';
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

    function getSiteIntensityMap() {
        const raw = gmGet(FONT_SITE_INTENSITY_KEY, null);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
        const clean = {};
        Object.entries(raw).forEach(([k, v]) => {
            const norm = normalizeHostInput(k);
            if (norm && (v === 'soft' || v === 'strong')) clean[norm] = v;
        });
        return clean;
    }

    function getMatchedSiteIntensityEntry() {
        if (!host) return null;
        const map = getSiteIntensityMap();
        if (map[host]) return { domain: host, intensity: map[host] };
        let bestDomain = '';
        let bestVal = null;
        Object.entries(map).forEach(([domain, val]) => {
            if (matchesHost(domain) && domain.length > bestDomain.length) {
                bestDomain = domain;
                bestVal = val;
            }
        });
        return bestVal ? { domain: bestDomain, intensity: bestVal } : null;
    }

    function getEffectiveFontIntensity() {
        const matched = getMatchedSiteIntensityEntry();
        return matched ? matched.intensity : fontIntensity;
    }

    const PROTECTED_FONT_SELECTOR = [
        'svg', 'svg *',
        'math', 'math *', 'mjx-container', 'mjx-container *',
        '.katex', '.katex *', '.MathJax', '.MathJax *', '.MathJax_Display', '.MathJax_Display *',
        '[class*="mathjax" i]',
        'code', 'code *', 'pre', 'pre *', 'kbd', 'kbd *', 'samp', 'samp *', 'var', 'tt',
        '.monaco-editor', '.monaco-editor *', '.cm-editor', '.cm-editor *',
        '.ace_editor', '.ace_editor *', '.CodeMirror', '.CodeMirror *',
        '.xterm', '.xterm *', '.terminal', '.terminal *',
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
        const effectiveIntensity = getEffectiveFontIntensity();
        const textWeight = effectiveIntensity === 'strong' ? '300' : '350';
        const boldWeight = effectiveIntensity === 'strong' ? '400' : '500';
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
    // не создавая дубликатов панелей, хоткеев и наблюдателей YouTube.
    if (!isTopWindow) {
        if (typeof GM_addValueChangeListener === 'function') {
            try {
                GM_addValueChangeListener(FONT_ENABLED_KEY, (_k, _oldV, newV) => {
                    fontEnabled = Boolean(newV);
                    applyGlobalFont();
                });
                GM_addValueChangeListener(FONT_EXCLUDED_KEY, () => applyGlobalFont());
                GM_addValueChangeListener(FONT_SITE_INTENSITY_KEY, () => applyGlobalFont());
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

    function getCurrentSiteFontMode() {
        if (!host) return 'default';
        if (isFontExcluded()) return 'excluded';
        const matched = getMatchedSiteIntensityEntry();
        return matched ? matched.intensity : 'default';
    }

    function setCurrentSiteFontMode(mode, showFeedback = true) {
        if (!host) return;
        const hosts = getExcludedHosts();
        const siteMap = getSiteIntensityMap();

        if (mode === 'excluded') {
            Object.keys(siteMap).forEach(d => { if (matchesHost(d)) delete siteMap[d]; });
            gmSet(FONT_SITE_INTENSITY_KEY, siteMap);
            if (!hosts.some(matchesHost)) {
                gmSet(FONT_EXCLUDED_KEY, [...new Set([...hosts, host])]);
            }
            applyGlobalFont();
            syncFontUI();
            if (showFeedback) showOSD(`Ubuntu Light: выключен для ${host}`, 'off');
            return;
        }

        const nextHosts = hosts.filter(x => !matchesHost(x));
        if (nextHosts.length !== hosts.length) {
            gmSet(FONT_EXCLUDED_KEY, nextHosts);
        }

        Object.keys(siteMap).forEach(d => { if (matchesHost(d)) delete siteMap[d]; });
        if (mode === 'soft' || mode === 'strong') {
            siteMap[host] = mode;
            gmSet(FONT_SITE_INTENSITY_KEY, siteMap);
            applyGlobalFont();
            syncFontUI();
            if (showFeedback) {
                const label = mode === 'soft' ? 'мягкая' : 'выраженная';
                showOSD(`Ubuntu Light (${label}) для ${host}`, 'on');
            }
            return;
        }

        gmSet(FONT_SITE_INTENSITY_KEY, siteMap);
        applyGlobalFont();
        syncFontUI();
        if (showFeedback) showOSD(`Ubuntu Light: по умолчанию для ${host}`, 'on');
    }

    const PANEL_HOTKEYS = {
        F2: {
            label: 'F2',
            match: e => e.key === 'F2' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey
        },
        AltShiftB: {
            label: 'Alt + Shift + B',
            match: e => e.altKey && e.shiftKey && e.code === 'KeyB' && !e.ctrlKey && !e.metaKey
        },
        AltShiftM: {
            label: 'Alt + Shift + M',
            match: e => e.altKey && e.shiftKey && e.code === 'KeyM' && !e.ctrlKey && !e.metaKey
        },
        CtrlShiftF2: {
            label: 'Ctrl + Shift + F2',
            match: e => e.key === 'F2' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey
        }
    };

    let panelHotkey = 'F2';
    {
        const savedHotkey = gmGet(PANEL_HOTKEY_KEY, 'F2');
        if (PANEL_HOTKEYS[savedHotkey]) panelHotkey = savedHotkey;
    }

    function getPanelHotkeyLabel() {
        return (PANEL_HOTKEYS[panelHotkey] || PANEL_HOTKEYS.F2).label;
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
        if (uiRefs.siteModeSelect) {
            uiRefs.siteModeSelect.disabled = !fontEnabled || !host;
            uiRefs.siteModeSelect.value = getCurrentSiteFontMode();
        }
        if (uiRefs.fontNote) {
            uiRefs.fontNote.textContent = fontEnabled
                ? 'Защищены формулы KaTeX/MathJax, код и терминалы. Alt + Shift + F — выкл. везде; Alt + Shift + U — исключить сайт.'
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
    // 3. СОСТОЯНИЕ ГЛОБАЛЬНЫХ ИНСТРУМЕНТОВ И YOUTUBE
    // ==========================================

    const DEFAULT_GLOBAL_SETTINGS = {
        globalVideoSpeed: false,
        globalPiPHotkey: false,
        cleanTrackingUrl: false
    };

    const GLOBAL_TOOLTIPS = {
        globalVideoSpeed: 'Включает управление скоростью любого HTML5-видео на всех сайтах:\n• Shift + колесо мыши над плеером\n• Ctrl + ↑ / ↓ / 0 с клавиатуры',
        globalPiPHotkey: 'Переключает режим «Картинка в картинке» (Picture-in-Picture) для активного видео клавишами Alt + P.',
        cleanTrackingUrl: 'Тихо удаляет трекинговые параметры (utm_*, fbclid, yclid, gclid, igshid, si на YouTube) из адресной строки и копируемых ссылок без перезагрузки.'
    };

    let globalSettings = Object.assign({}, DEFAULT_GLOBAL_SETTINGS);
    {
        const storedGlobal = gmGet(GLOBAL_SETTINGS_KEY, null);
        if (storedGlobal && typeof storedGlobal === 'object' && !Array.isArray(storedGlobal)) {
            Object.keys(DEFAULT_GLOBAL_SETTINGS).forEach(k => {
                if (typeof storedGlobal[k] === 'boolean') globalSettings[k] = storedGlobal[k];
            });
        }
    }

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
        speedHotkeys: false,
        videoScreenshot: false,
        autoTheater: false,
        focusMode: false,
        rememberChannelSpeed: false
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
        speedHotkeys: 'Горячие клавиши во время просмотра ролика:\n• Ctrl + ↑ — ускорить\n• Ctrl + ↓ — замедлить\n• Ctrl + 0 — вернуть 1.00×',
        videoScreenshot: 'Добавляет кнопку камеры в плеер YouTube и сочетание Alt + Shift + S для сохранения чистого кадра видео в нативном разрешении (PNG + буфер обмена).',
        autoTheater: 'Автоматически раскрывает широкий плеер (режим кинотеатра) при открытии видео на YouTube.',
        focusMode: 'Скрывает правую колонку рекомендаций (#related) и конечные заставки во время просмотра, чтобы ничего не отвлекало.',
        rememberChannelSpeed: 'Запоминает выбранную скорость отдельно для каждого канала YouTube и автоматически восстанавливает её на новых роликах автора.'
    };

    let ytSettings = Object.assign({}, DEFAULT_YT_SETTINGS);
    let selectedQuality = 'hd1080';
    let speedStep = 0.25;
    {
        const initialStep = Number(gmGet(YT_SPEED_STEP_KEY, 0.25));
        if ([0.05, 0.1, 0.25, 0.5].includes(initialStep)) speedStep = initialStep;
    }

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

    // --- 4.2. Скорость воспроизведения (YouTube и универсальный HTML5), память по каналам и PiP ---

    let speedHotkeyHandler = null;
    let wheelSpeedHandler = null;
    let pipHotkeyHandler = null;
    let channelSpeedTimers = [];
    let lastAppliedChannelSpeedToken = '';
    let channelSpeedActive = false;

    function getChannelSpeedsMap() {
        const raw = gmGet(YT_CHANNEL_SPEEDS_KEY, null);
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
        const clean = {};
        Object.entries(raw).forEach(([k, v]) => {
            const num = Number(v);
            if (typeof k === 'string' && k && Number.isFinite(num) && num >= 0.25 && num <= 4) {
                clean[k] = Math.round(num * 100) / 100;
            }
        });
        return clean;
    }

    function saveChannelSpeedsMap(map) {
        const entries = Object.entries(map).slice(-200);
        gmSet(YT_CHANNEL_SPEEDS_KEY, Object.fromEntries(entries));
    }

    function getCurrentYouTubeChannelKey() {
        if (!isYouTube) return '';
        const link = document.querySelector(
            'ytd-watch-metadata ytd-video-owner-renderer a.yt-simple-endpoint[href], #owner ytd-video-owner-renderer a.yt-simple-endpoint[href], #upload-info #channel-name a[href]'
        );
        if (!link) return '';
        try {
            const parsed = new URL(link.getAttribute('href') || link.href, location.origin);
            const path = decodeURIComponent(parsed.pathname || '').trim().toLowerCase().replace(/\/+$/, '');
            if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/') || path.startsWith('/user/')) {
                return path;
            }
        } catch (_) {}
        return '';
    }

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

    function getActiveGenericVideo() {
        if (isYouTube) return getActiveWatchVideo();
        const videos = Array.from(document.querySelectorAll('video')).filter(v => {
            const rect = v.getBoundingClientRect();
            return rect.width >= 120 && rect.height >= 80;
        });
        if (!videos.length) return null;
        const playing = videos.find(v => !v.paused && !v.ended);
        if (playing) return playing;
        const ready = videos.find(v => v.readyState > 0);
        if (ready) return ready;
        videos.sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight));
        return videos[0];
    }

    function findVideoAtPoint(clientX, clientY, eventTarget) {
        if (isYouTube) {
            const player = document.querySelector('#movie_player, .html5-video-player');
            if (player && player.contains(eventTarget)) {
                return player.querySelector('video') || document.querySelector('video');
            }
            if (!globalSettings.globalVideoSpeed) return null;
        }
        const videos = Array.from(document.querySelectorAll('video'));
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            if (isYouTube && v.closest('ytd-moving-thumbnail-renderer, #inline-preview-player')) continue;
            const rect = v.getBoundingClientRect();
            if (rect.width < 120 || rect.height < 80) continue;
            if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                return v;
            }
        }
        return null;
    }

    function isEditableEventTarget(e) {
        const composed = typeof e.composedPath === 'function' ? e.composedPath() : null;
        const target = (composed && composed[0]) || e.target;
        return Boolean(target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)));
    }

    function applyPlaybackRate(video, rate, fromUser = true) {
        const clamped = Math.round(Math.max(0.25, Math.min(4, rate)) * 100) / 100;
        video.playbackRate = clamped;

        if (fromUser && isYouTube && ytSettings.rememberChannelSpeed) {
            const chKey = getCurrentYouTubeChannelKey();
            if (chKey) {
                const map = getChannelSpeedsMap();
                const hadSaved = Object.prototype.hasOwnProperty.call(map, chKey);
                if (Math.abs(clamped - 1) < 0.001) {
                    if (hadSaved) {
                        delete map[chKey];
                        saveChannelSpeedsMap(map);
                        showOSD('Скорость: 1.00× (сброшено для канала)');
                        return;
                    }
                } else {
                    map[chKey] = clamped;
                    saveChannelSpeedsMap(map);
                    showOSD('Скорость: ' + clamped.toFixed(2) + '× (канал запомнен)');
                    return;
                }
            }
        }
        showOSD('Скорость: ' + clamped.toFixed(2) + '×');
    }

    function restoreSavedChannelSpeed() {
        if (!channelSpeedActive || !isYouTube || !ytSettings.rememberChannelSpeed) return;
        if (!/^\/(watch|live)\b/.test(location.pathname || '')) return;
        const video = getActiveWatchVideo();
        const chKey = getCurrentYouTubeChannelKey();
        if (!video || !chKey) return;

        const vidParam = new URLSearchParams(location.search).get('v') || location.pathname;
        const token = vidParam + '|' + chKey;
        if (lastAppliedChannelSpeedToken === token) return;
        lastAppliedChannelSpeedToken = token;

        const map = getChannelSpeedsMap();
        const targetRate = Object.prototype.hasOwnProperty.call(map, chKey) ? map[chKey] : 1;
        if (Math.abs((video.playbackRate || 1) - targetRate) > 0.005) {
            video.playbackRate = targetRate;
            if (Math.abs(targetRate - 1) >= 0.005) {
                showOSD('Скорость канала: ' + targetRate.toFixed(2) + '×');
            }
        }
    }

    function scheduleChannelSpeedRestore() {
        if (!channelSpeedActive) return;
        channelSpeedTimers.forEach(t => clearTimeout(t));
        channelSpeedTimers = [
            setTimeout(restoreSavedChannelSpeed, 220),
            setTimeout(restoreSavedChannelSpeed, 850),
            setTimeout(restoreSavedChannelSpeed, 1800)
        ];
    }

    function onChannelSpeedNavigate() {
        lastAppliedChannelSpeedToken = '';
        scheduleChannelSpeedRestore();
    }

    function applyChannelSpeedMemory() {
        if (channelSpeedActive) return;
        channelSpeedActive = true;
        window.addEventListener('yt-navigate-finish', onChannelSpeedNavigate);
        window.addEventListener('yt-page-data-updated', scheduleChannelSpeedRestore);
        scheduleChannelSpeedRestore();
    }

    function removeChannelSpeedMemory() {
        channelSpeedActive = false;
        channelSpeedTimers.forEach(t => clearTimeout(t));
        channelSpeedTimers = [];
        window.removeEventListener('yt-navigate-finish', onChannelSpeedNavigate);
        window.removeEventListener('yt-page-data-updated', scheduleChannelSpeedRestore);
    }

    function applySpeedHotkeys() {
        if (speedHotkeyHandler) return;
        speedHotkeyHandler = function (e) {
            if (!e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
            if (isEditableEventTarget(e)) return;
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== '0') return;

            const video = (isYouTube && ytSettings.speedHotkeys) ? getActiveWatchVideo() : getActiveGenericVideo();
            if (!video) return;

            e.preventDefault();
            const current = video.playbackRate || 1;
            if (e.key === 'ArrowUp') applyPlaybackRate(video, current + speedStep, true);
            else if (e.key === 'ArrowDown') applyPlaybackRate(video, current - speedStep, true);
            else applyPlaybackRate(video, 1, true);
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
            const composed = typeof e.composedPath === 'function' ? e.composedPath() : null;
            if (uiHost && composed && composed.includes(uiHost)) return;
            const video = findVideoAtPoint(e.clientX, e.clientY, e.target);
            if (!video) return;
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? -speedStep : speedStep;
            applyPlaybackRate(video, (video.playbackRate || 1) + delta, true);
        };
        window.addEventListener('wheel', wheelSpeedHandler, { passive: false, capture: true });
    }

    function removeWheelSpeed() {
        if (!wheelSpeedHandler) return;
        window.removeEventListener('wheel', wheelSpeedHandler, { capture: true });
        wheelSpeedHandler = null;
    }

    function togglePictureInPicture() {
        if (document.pictureInPictureElement && typeof document.exitPictureInPicture === 'function') {
            document.exitPictureInPicture().then(
                () => showOSD('Картинка в картинке: выключена'),
                () => showOSD('Не удалось закрыть PiP', 'off')
            );
            return true;
        }
        const video = getActiveGenericVideo();
        if (!video) return false;
        if (typeof video.requestPictureInPicture === 'function') {
            try {
                video.disablePictureInPicture = false;
                video.removeAttribute('disablepictureinpicture');
            } catch (_) {}
            video.requestPictureInPicture().then(
                () => showOSD('Картинка в картинке: включена', 'on'),
                () => showOSD('Браузер заблокировал запуск PiP', 'off')
            );
            return true;
        }
        if (typeof video.webkitSetPresentationMode === 'function') {
            const nextMode = video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture';
            video.webkitSetPresentationMode(nextMode);
            showOSD('Картинка в картинке: переключена', 'on');
            return true;
        }
        showOSD('В Firefox для PiP используйте Ctrl + Shift + ]', 'off');
        return true;
    }

    function applyPiPHotkey() {
        if (pipHotkeyHandler) return;
        pipHotkeyHandler = function (e) {
            if (!e.altKey || e.shiftKey || e.ctrlKey || e.metaKey || e.repeat || e.code !== 'KeyP') return;
            if (isEditableEventTarget(e)) return;
            const video = document.pictureInPictureElement || getActiveGenericVideo();
            if (!video) return;
            e.preventDefault();
            togglePictureInPicture();
        };
        window.addEventListener('keydown', pipHotkeyHandler, true);
    }

    function removePiPHotkey() {
        if (!pipHotkeyHandler) return;
        window.removeEventListener('keydown', pipHotkeyHandler, true);
        pipHotkeyHandler = null;
    }

    // --- 4.2b. Скриншот чистого кадра YouTube, авто-широкий плеер и режим фокуса ---

    let screenshotHotkeyHandler = null;
    let screenshotBtnTimer = null;
    let screenshotNavBound = false;
    let autoTheaterActive = false;
    let autoTheaterTimers = [];
    let lastAutoTheaterVideoKey = '';

    function formatVideoTimeSlug(sec) {
        const total = Math.max(0, Math.floor(Number(sec) || 0));
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        const pad = n => String(n).padStart(2, '0');
        return h > 0 ? `${pad(h)}h${pad(m)}m${pad(s)}s` : `${pad(m)}m${pad(s)}s`;
    }

    function captureYouTubeVideoFrame() {
        const video = getActiveWatchVideo();
        if (!video || !video.videoWidth || !video.videoHeight) {
            showOSD('Видео ещё не готово для снимка кадра', 'off');
            return false;
        }
        try {
            const w = video.videoWidth;
            const h = video.videoHeight;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);

            const vidId = (new URLSearchParams(location.search).get('v') || 'video').replace(/[^a-zA-Z0-9_-]/g, '');
            const filename = `youtube-frame-${vidId || 'video'}-${formatVideoTimeSlug(video.currentTime)}.png`;

            canvas.toBlob(blob => {
                if (!blob) {
                    showOSD('Не удалось сформировать PNG кадра', 'off');
                    return;
                }
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                (document.body || document.documentElement).appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 1800);

                if (navigator.clipboard && typeof navigator.clipboard.write === 'function' && typeof ClipboardItem !== 'undefined') {
                    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(
                        () => showOSD(`Кадр сохранён и скопирован (${w}×${h})`, 'on'),
                        () => showOSD(`Кадр сохранён в PNG (${w}×${h})`, 'on')
                    );
                } else {
                    showOSD(`Кадр сохранён в PNG (${w}×${h})`, 'on');
                }
            }, 'image/png');
            return true;
        } catch (_) {
            showOSD('Не удалось захватить кадр видео', 'off');
            return false;
        }
    }

    function ensureYouTubeScreenshotButton() {
        if (!isYouTube || !ytSettings.videoScreenshot) return;
        const rightControls = document.querySelector('#movie_player .ytp-right-controls');
        if (!rightControls || rightControls.querySelector('.bt-ytp-screenshot-btn')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ytp-button bt-ytp-screenshot-btn';
        btn.title = 'Скриншот кадра (Alt + Shift + S)';
        btn.setAttribute('aria-label', 'Скриншот кадра');
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '22');
        svg.setAttribute('height', '22');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '1.9');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');
        const path = document.createElementNS(svgNS, 'path');
        path.setAttribute('d', 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z');
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '13');
        circle.setAttribute('r', '4');
        svg.append(path, circle);
        btn.appendChild(svg);

        btn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            captureYouTubeVideoFrame();
        });
        rightControls.insertBefore(btn, rightControls.firstChild);
    }

    function scheduleScreenshotButtonMount() {
        if (!ytSettings.videoScreenshot) return;
        ensureYouTubeScreenshotButton();
        clearTimeout(screenshotBtnTimer);
        screenshotBtnTimer = setTimeout(ensureYouTubeScreenshotButton, 700);
    }

    function applyVideoScreenshotFeature() {
        setManagedStyle('yt-screenshot-btn', `
            .bt-ytp-screenshot-btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                vertical-align: top !important;
                color: #fff !important;
                opacity: 0.9;
                transition: opacity 0.15s ease;
            }
            .bt-ytp-screenshot-btn:hover {
                opacity: 1;
            }
        `);
        if (!screenshotHotkeyHandler) {
            screenshotHotkeyHandler = function (e) {
                if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || e.repeat || e.code !== 'KeyS') return;
                if (isEditableEventTarget(e)) return;
                const video = getActiveWatchVideo();
                if (!video) return;
                e.preventDefault();
                captureYouTubeVideoFrame();
            };
            window.addEventListener('keydown', screenshotHotkeyHandler, true);
        }
        if (!screenshotNavBound) {
            screenshotNavBound = true;
            window.addEventListener('yt-navigate-finish', scheduleScreenshotButtonMount);
            window.addEventListener('loadedmetadata', scheduleScreenshotButtonMount, true);
        }
        scheduleScreenshotButtonMount();
    }

    function removeVideoScreenshotFeature() {
        clearTimeout(screenshotBtnTimer);
        removeManagedStyle('yt-screenshot-btn');
        if (screenshotHotkeyHandler) {
            window.removeEventListener('keydown', screenshotHotkeyHandler, true);
            screenshotHotkeyHandler = null;
        }
        if (screenshotNavBound) {
            screenshotNavBound = false;
            window.removeEventListener('yt-navigate-finish', scheduleScreenshotButtonMount);
            window.removeEventListener('loadedmetadata', scheduleScreenshotButtonMount, true);
        }
        document.querySelectorAll('.bt-ytp-screenshot-btn').forEach(el => el.remove());
    }

    function tryEnableYouTubeTheater() {
        if (!autoTheaterActive || !isYouTube || !ytSettings.autoTheater) return;
        if (!/^\/watch\b/.test(location.pathname || '')) return;
        const vidKey = new URLSearchParams(location.search).get('v') || location.href;
        if (lastAutoTheaterVideoKey === vidKey) return;

        const flexy = document.querySelector('ytd-watch-flexy');
        if (!flexy) return;
        if (flexy.hasAttribute('theater') || flexy.hasAttribute('fullscreen') || document.fullscreenElement) {
            lastAutoTheaterVideoKey = vidKey;
            return;
        }
        const sizeBtn = document.querySelector('#movie_player .ytp-size-button');
        if (sizeBtn) {
            lastAutoTheaterVideoKey = vidKey;
            sizeBtn.click();
        }
    }

    function scheduleAutoTheater() {
        if (!autoTheaterActive) return;
        autoTheaterTimers.forEach(t => clearTimeout(t));
        autoTheaterTimers = [
            setTimeout(tryEnableYouTubeTheater, 180),
            setTimeout(tryEnableYouTubeTheater, 900)
        ];
    }

    function onAutoTheaterNavigate() {
        lastAutoTheaterVideoKey = '';
        scheduleAutoTheater();
    }

    function applyAutoTheater() {
        if (autoTheaterActive) return;
        autoTheaterActive = true;
        lastAutoTheaterVideoKey = '';
        window.addEventListener('yt-navigate-finish', onAutoTheaterNavigate);
        scheduleAutoTheater();
    }

    function removeAutoTheater() {
        autoTheaterActive = false;
        autoTheaterTimers.forEach(t => clearTimeout(t));
        autoTheaterTimers = [];
        window.removeEventListener('yt-navigate-finish', onAutoTheaterNavigate);
    }

    function applyFocusMode() {
        setManagedStyle('yt-focus', `
            ytd-watch-flexy #secondary,
            ytd-watch-flexy #related,
            .html5-endscreen.ytp-player-content,
            .ytp-ce-element {
                display: none !important;
            }
            ytd-watch-flexy[flexy]:not([theater]):not([fullscreen]) #primary.ytd-watch-flexy {
                max-width: min(1160px, calc(100vw - 48px)) !important;
                margin-inline: auto !important;
            }
        `);
    }

    // --- 4.2c. Тихая очистка трекинговых параметров URL ---

    const TRACKING_PARAM_NAMES = new Set([
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'utm_id', 'utm_name', 'utm_reader', 'utm_viz_id', 'utm_pubreferrer', 'utm_swu',
        'fbclid', 'gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid',
        'yclid', 'ymclid', 'ysclid', 'igshid', 'igs',
        'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'mkt_tok', 'vero_id',
        'oly_enc_id', 'oly_anon_id', 'rb_clickid', '_openstat', 'wickedid',
        'twclid', 'ttclid', 'li_fat_id', 's_kwcid'
    ]);

    let cleanUrlActive = false;
    let cleanUrlCopyHandler = null;

    function stripTrackingFromUrlString(rawUrl) {
        if (typeof rawUrl !== 'string' || !rawUrl) return rawUrl;
        try {
            const parsed = new URL(rawUrl, location.href);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return rawUrl;
            const h = parsed.hostname.toLowerCase();
            const isYtHost = /(^|\.)youtube\.com$/.test(h) || h === 'youtu.be';
            let changed = false;

            Array.from(parsed.searchParams.keys()).forEach(key => {
                const lower = key.toLowerCase();
                if (TRACKING_PARAM_NAMES.has(lower)) {
                    parsed.searchParams.delete(key);
                    changed = true;
                } else if (isYtHost && (lower === 'si' || lower === 'embeds_referring_euri' || (lower === 'feature' && parsed.searchParams.get(key) === 'shared'))) {
                    parsed.searchParams.delete(key);
                    changed = true;
                }
            });

            return changed ? parsed.toString() : rawUrl;
        } catch (_) {
            return rawUrl;
        }
    }

    function cleanCurrentLocationUrl() {
        if (!globalSettings.cleanTrackingUrl) return false;
        try {
            const current = location.href;
            const cleaned = stripTrackingFromUrlString(current);
            if (cleaned && cleaned !== current) {
                const parsed = new URL(cleaned);
                const nextRel = parsed.pathname + parsed.search + parsed.hash;
                history.replaceState(history.state, '', nextRel);
                return true;
            }
        } catch (_) {}
        return false;
    }

    function applyCleanTrackingUrl() {
        cleanCurrentLocationUrl();
        if (cleanUrlActive) return;
        cleanUrlActive = true;
        window.addEventListener('popstate', cleanCurrentLocationUrl);
        window.addEventListener('hashchange', cleanCurrentLocationUrl);
        window.addEventListener('yt-navigate-finish', cleanCurrentLocationUrl);
        cleanUrlCopyHandler = function (e) {
            if (!e.clipboardData) return;
            const sel = String(window.getSelection ? window.getSelection() : '').trim();
            if (!/^https?:\/\/\S+$/i.test(sel)) return;
            const cleaned = stripTrackingFromUrlString(sel);
            if (cleaned !== sel) {
                e.preventDefault();
                e.clipboardData.setData('text/plain', cleaned);
            }
        };
        document.addEventListener('copy', cleanUrlCopyHandler, true);
    }

    function removeCleanTrackingUrl() {
        if (!cleanUrlActive) return;
        cleanUrlActive = false;
        window.removeEventListener('popstate', cleanCurrentLocationUrl);
        window.removeEventListener('hashchange', cleanCurrentLocationUrl);
        window.removeEventListener('yt-navigate-finish', cleanCurrentLocationUrl);
        if (cleanUrlCopyHandler) {
            document.removeEventListener('copy', cleanUrlCopyHandler, true);
            cleanUrlCopyHandler = null;
        }
    }

    function syncVideoControlListeners() {
        const wantWheel = (isYouTube && ytSettings.wheelSpeed) || globalSettings.globalVideoSpeed;
        const wantHotkeys = (isYouTube && ytSettings.speedHotkeys) || globalSettings.globalVideoSpeed;
        if (wantWheel) applyWheelSpeed(); else removeWheelSpeed();
        if (wantHotkeys) applySpeedHotkeys(); else removeSpeedHotkeys();
        if (globalSettings.globalPiPHotkey) applyPiPHotkey(); else removePiPHotkey();
    }

    function syncGlobalFeatures() {
        syncVideoControlListeners();
        if (globalSettings.cleanTrackingUrl) applyCleanTrackingUrl(); else removeCleanTrackingUrl();
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
        if (ytSettings.focusMode) applyFocusMode(); else removeManagedStyle('yt-focus');
        if (ytSettings.autoQuality) applyAutoQuality(); else removeAutoQuality();
        if (ytSettings.autoTheater) applyAutoTheater(); else removeAutoTheater();
        if (ytSettings.videoScreenshot) applyVideoScreenshotFeature(); else removeVideoScreenshotFeature();
        if (ytSettings.rememberChannelSpeed) applyChannelSpeedMemory(); else removeChannelSpeedMemory();
        syncVideoControlListeners();
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

        const exportedGlobalSettings = {};
        Object.keys(DEFAULT_GLOBAL_SETTINGS).forEach(key => {
            exportedGlobalSettings[key] = Boolean(globalSettings[key]);
        });

        const rawQuality = isYouTube ? selectedQuality : gmGet(YT_QUALITY_KEY, 'hd1080');
        const exportedQuality = QUALITY_MAP[rawQuality] ? rawQuality : 'hd1080';

        const exportedSpeedStep = [0.05, 0.1, 0.25, 0.5].includes(speedStep) ? speedStep : 0.25;

        const savedPos = gmGet(PANEL_POS_KEY, null);
        const exportedPos = savedPos && Number.isFinite(Number(savedPos.left)) && Number.isFinite(Number(savedPos.top))
            ? { left: Math.round(Number(savedPos.left)), top: Math.round(Number(savedPos.top)) }
            : null;

        return {
            app: 'Browser Tweaks',
            schemaVersion: 2,
            scriptVersion: SCRIPT_VERSION,
            exportedAt: new Date().toISOString(),
            font: {
                enabled: fontEnabled,
                intensity: fontIntensity,
                excludedHosts: getExcludedHosts(),
                siteIntensity: getSiteIntensityMap()
            },
            global: {
                settings: exportedGlobalSettings
            },
            youtube: {
                settings: exportedYtSettings,
                quality: exportedQuality,
                speedStep: exportedSpeedStep,
                channelSpeeds: getChannelSpeedsMap()
            },
            ui: {
                panelPosition: exportedPos,
                panelHotkey
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
            if (data.font.siteIntensity && typeof data.font.siteIntensity === 'object' && !Array.isArray(data.font.siteIntensity)) {
                const cleanedSiteMap = {};
                Object.entries(data.font.siteIntensity).forEach(([k, v]) => {
                    const norm = normalizeHostInput(k);
                    if (norm && (v === 'soft' || v === 'strong')) cleanedSiteMap[norm] = v;
                });
                gmSet(FONT_SITE_INTENSITY_KEY, cleanedSiteMap);
                recognizedCount++;
            }
        }

        if (data.global && typeof data.global === 'object' && !Array.isArray(data.global)) {
            if (data.global.settings && typeof data.global.settings === 'object' && !Array.isArray(data.global.settings)) {
                const nextGlobal = Object.assign({}, DEFAULT_GLOBAL_SETTINGS, globalSettings);
                let globalMatched = false;
                Object.keys(DEFAULT_GLOBAL_SETTINGS).forEach(key => {
                    if (typeof data.global.settings[key] === 'boolean') {
                        nextGlobal[key] = data.global.settings[key];
                        globalMatched = true;
                    }
                });
                if (globalMatched) {
                    globalSettings = nextGlobal;
                    gmSet(GLOBAL_SETTINGS_KEY, nextGlobal);
                    recognizedCount++;
                }
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
            if (data.youtube.channelSpeeds && typeof data.youtube.channelSpeeds === 'object' && !Array.isArray(data.youtube.channelSpeeds)) {
                const cleanMap = {};
                Object.entries(data.youtube.channelSpeeds).slice(-200).forEach(([k, v]) => {
                    const num = Number(v);
                    if (typeof k === 'string' && k && Number.isFinite(num) && num >= 0.25 && num <= 4) {
                        cleanMap[k] = Math.round(num * 100) / 100;
                    }
                });
                gmSet(YT_CHANNEL_SPEEDS_KEY, cleanMap);
                lastAppliedChannelSpeedToken = '';
                recognizedCount++;
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
            if (typeof data.ui.panelHotkey === 'string' && PANEL_HOTKEYS[data.ui.panelHotkey]) {
                panelHotkey = data.ui.panelHotkey;
                gmSet(PANEL_HOTKEY_KEY, panelHotkey);
                recognizedCount++;
            }
        }

        if (recognizedCount === 0) {
            throw new Error('Файл не содержит настроек Browser Tweaks');
        }

        applyGlobalFont();
        syncFontUI();
        syncGlobalFeatures();
        syncGlobalToolsUI();
        if (isYouTube) {
            syncYouTubeFeatures();
            syncYouTubeUI();
            if (ytSettings.translateComments) applyTranslateUIStyle();
            if (ytSettings.autoQuality) setPreferredQuality();
            if (ytSettings.rememberChannelSpeed) scheduleChannelSpeedRestore();
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

    function syncGlobalToolsUI() {
        if (!uiRefs) return;
        if (uiRefs.globalCheckboxes) {
            uiRefs.globalCheckboxes.forEach((cb, key) => { cb.checked = Boolean(globalSettings[key]); });
        }
        if (uiRefs.globalSpeedSelect) uiRefs.globalSpeedSelect.value = String(speedStep);
        if (uiRefs.panelHotkeySelect) uiRefs.panelHotkeySelect.value = panelHotkey;
    }

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

        uiRefs = { checkboxes: new Map(), globalCheckboxes: new Map() };

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
            body.appendChild(createCheckRow('speedHotkeys', 'Горячие клавиши скорости', TOOLTIPS.speedHotkeys));
            body.appendChild(createCheckRow('rememberChannelSpeed', 'Память скорости по каналам', TOOLTIPS.rememberChannelSpeed));
            body.appendChild(createCheckRow('autoQuality', 'Авто-качество видео', TOOLTIPS.autoQuality));
            body.appendChild(createCheckRow('autoTheater', 'Авто-широкий плеер (Theater)', TOOLTIPS.autoTheater));
            body.appendChild(createCheckRow('focusMode', 'Режим фокуса (без рекомендаций)', TOOLTIPS.focusMode));
            body.appendChild(createCheckRow('videoScreenshot', 'Скриншот кадра видео (Alt+Shift+S)', TOOLTIPS.videoScreenshot));
            body.appendChild(createCheckRow('translateComments', 'Перевод комментариев', TOOLTIPS.translateComments));
            body.appendChild(createCheckRow('compactMode', 'Компактный режим', TOOLTIPS.compactMode));

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
            syncFontUI();
        });
        uiRefs.intensitySelect = intensitySelect;
        intensityRow.append(intensityLabel, intensitySelect);
        fontControlsWrap.appendChild(intensityRow);

        const siteModeRow = document.createElement('div');
        siteModeRow.className = 'bt-select-row';
        siteModeRow.style.padding = '0';
        const siteModeLabel = document.createElement('span');
        siteModeLabel.className = 'bt-select-label';
        siteModeLabel.textContent = 'На этом сайте:';
        const siteModeSelect = document.createElement('select');
        siteModeSelect.className = 'bt-select';
        [
            ['default', 'Как глобально'],
            ['soft', 'Мягкая (только здесь)'],
            ['strong', 'Выраженная (только здесь)'],
            ['excluded', 'Исключён (системный)']
        ].forEach(([val, text]) => {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = text;
            siteModeSelect.appendChild(opt);
        });
        siteModeSelect.addEventListener('change', () => {
            setCurrentSiteFontMode(siteModeSelect.value, true);
        });
        uiRefs.siteModeSelect = siteModeSelect;
        siteModeRow.append(siteModeLabel, siteModeSelect);
        fontControlsWrap.appendChild(siteModeRow);

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
            const matcher = (PANEL_HOTKEYS[panelHotkey] || PANEL_HOTKEYS.F2).match;
            if (e.key === 'Escape' || matcher(e)) return;
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

        // Карточка универсальных браузерных инструментов (для всех сайтов)
        const globalCard = document.createElement('div');
        globalCard.className = 'bt-card';

        const globalTitle = document.createElement('div');
        globalTitle.className = 'bt-card-title';
        globalTitle.textContent = 'Универсальные функции браузера';
        globalCard.appendChild(globalTitle);

        const createGlobalCheckRow = (key, labelText, tooltipText) => {
            const label = document.createElement('label');
            label.className = 'bt-row-check';
            label.style.padding = '4px 6px';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = Boolean(globalSettings[key]);
            const text = document.createElement('span');
            text.textContent = labelText;
            label.append(cb, text);

            cb.addEventListener('change', () => {
                globalSettings[key] = cb.checked;
                gmSet(GLOBAL_SETTINGS_KEY, globalSettings);
                syncGlobalFeatures();
                syncGlobalToolsUI();
            });

            attachTooltipBehavior(label, tooltipText);
            uiRefs.globalCheckboxes.set(key, cb);
            return label;
        };

        globalCard.appendChild(createGlobalCheckRow('globalVideoSpeed', 'Скорость HTML5-видео на всех сайтах', GLOBAL_TOOLTIPS.globalVideoSpeed));
        globalCard.appendChild(createGlobalCheckRow('globalPiPHotkey', 'Картинка в картинке (Alt + P)', GLOBAL_TOOLTIPS.globalPiPHotkey));
        globalCard.appendChild(createGlobalCheckRow('cleanTrackingUrl', 'Очистка трекинга в URL (utm, fbclid…)', GLOBAL_TOOLTIPS.cleanTrackingUrl));

        if (!isYouTube) {
            const globalSpeedRow = document.createElement('div');
            globalSpeedRow.className = 'bt-select-row';
            globalSpeedRow.style.padding = '0';
            const globalSpeedLabel = document.createElement('span');
            globalSpeedLabel.className = 'bt-select-label';
            globalSpeedLabel.textContent = 'Шаг скорости:';
            const globalSpeedSelect = document.createElement('select');
            globalSpeedSelect.className = 'bt-select';
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
                globalSpeedSelect.appendChild(opt);
            });
            globalSpeedSelect.addEventListener('change', () => {
                speedStep = Number(globalSpeedSelect.value);
                gmSet(YT_SPEED_STEP_KEY, speedStep);
            });
            uiRefs.globalSpeedSelect = globalSpeedSelect;
            globalSpeedRow.append(globalSpeedLabel, globalSpeedSelect);
            globalCard.appendChild(globalSpeedRow);
        }

        const hotkeyRow = document.createElement('div');
        hotkeyRow.className = 'bt-select-row';
        hotkeyRow.style.padding = '0';
        const hotkeyLabel = document.createElement('span');
        hotkeyLabel.className = 'bt-select-label';
        hotkeyLabel.textContent = 'Клавиша панели:';
        const panelHotkeySelect = document.createElement('select');
        panelHotkeySelect.className = 'bt-select';
        Object.entries(PANEL_HOTKEYS).forEach(([key, def]) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = def.label;
            opt.selected = key === panelHotkey;
            panelHotkeySelect.appendChild(opt);
        });
        panelHotkeySelect.addEventListener('change', () => {
            if (PANEL_HOTKEYS[panelHotkeySelect.value]) {
                panelHotkey = panelHotkeySelect.value;
                gmSet(PANEL_HOTKEY_KEY, panelHotkey);
                showOSD('Клавиша панели: ' + getPanelHotkeyLabel(), 'on');
            }
        });
        uiRefs.panelHotkeySelect = panelHotkeySelect;
        hotkeyRow.append(hotkeyLabel, panelHotkeySelect);
        globalCard.appendChild(hotkeyRow);

        body.appendChild(globalCard);

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
        backupNote.textContent = 'Сохраняет и восстанавливает все параметры шрифта, исключения, универсальные твики и настройки YouTube.';
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
        syncGlobalToolsUI();
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
            syncGlobalToolsUI();
            syncYouTubeUI();
            panel.classList.add('open');
            clampPanelPosition();
        } else {
            closePanel();
        }
    }

    function closePanel() {
        if (shadow && shadow.activeElement && typeof shadow.activeElement.blur === 'function') {
            shadow.activeElement.blur();
        }
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
        const hotkeyMatcher = (PANEL_HOTKEYS[panelHotkey] || PANEL_HOTKEYS.F2).match;
        if (!e.repeat && hotkeyMatcher(e)) {
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
            GM_registerMenuCommand('Открыть / закрыть панель настроек', () => togglePanel());
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
            GM_addValueChangeListener(FONT_SITE_INTENSITY_KEY, (_k, _oldV, _newV, remote) => {
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
            GM_addValueChangeListener(GLOBAL_SETTINGS_KEY, (_k, _oldV, newV, remote) => {
                if (!remote || !newV || typeof newV !== 'object') return;
                globalSettings = Object.assign({}, DEFAULT_GLOBAL_SETTINGS, newV);
                syncGlobalFeatures();
                syncGlobalToolsUI();
            });
            GM_addValueChangeListener(PANEL_HOTKEY_KEY, (_k, _oldV, newV, remote) => {
                if (!remote || typeof newV !== 'string' || !PANEL_HOTKEYS[newV]) return;
                panelHotkey = newV;
                syncGlobalToolsUI();
            });
            GM_addValueChangeListener(PANEL_POS_KEY, (_k, _oldV, newV, remote) => {
                if (!remote) return;
                applyPanelSavedPosition(newV);
            });
            GM_addValueChangeListener(YT_SPEED_STEP_KEY, (_k, _oldV, newV, remote) => {
                const num = Number(newV);
                if (!remote || ![0.05, 0.1, 0.25, 0.5].includes(num)) return;
                speedStep = num;
                syncGlobalToolsUI();
                syncYouTubeUI();
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
                GM_addValueChangeListener(YT_CHANNEL_SPEEDS_KEY, (_k, _oldV, _newV, remote) => {
                    if (!remote) return;
                    lastAppliedChannelSpeedToken = '';
                    if (ytSettings.rememberChannelSpeed) scheduleChannelSpeedRestore();
                });
            }
        } catch (_) {}
    }

    syncGlobalFeatures();

    if (isYouTube) {
        const initYouTube = () => syncYouTubeFeatures();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initYouTube, { once: true });
        } else {
            initYouTube();
        }
    }
})();
