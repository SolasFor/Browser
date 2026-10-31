// ==UserScript==
// @name         Browser Tweaks — Ubuntu Light + YouTube
// @namespace    https://github.com/SolasFor/Browser
// @version      1.0.1
// @description  Глобальный Ubuntu Light и набор настроек YouTube в одной панели
// @author       SolasFor
// @homepageURL  https://github.com/SolasFor/Browser
// @supportURL   https://github.com/SolasFor/Browser/issues
// @updateURL    https://raw.githubusercontent.com/SolasFor/Browser/main/userscripts/browser-tweaks-unified.user.js
// @downloadURL  https://raw.githubusercontent.com/SolasFor/Browser/main/userscripts/browser-tweaks-unified.user.js
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      translate.googleapis.com
// @run-at       document-start
// ==/UserScript==

(function() {

    'use strict';

    // Глобальный модуль Ubuntu Light — работает на всех сайтах.
    const FONT_URL = 'https://raw.githubusercontent.com/SolasFor/Browser/main/fonts/Ubuntu%20Light.woff2';
    const FONT_EXCLUDED_KEY = 'unifiedUbuntuLightExcludedHosts';
    const FONT_INTENSITY_KEY = 'unifiedUbuntuLightIntensity';
    const host = location.hostname.toLowerCase();
    const isYouTube = /(^|\.)youtube\.com$/i.test(host);
    const getExcludedHosts = () => {
        try { const v = GM_getValue(FONT_EXCLUDED_KEY, []); return Array.isArray(v) ? v : []; }
        catch (_) { return []; }
    };
    const isFontExcluded = () => getExcludedHosts().some(x => host === x || host.endsWith('.' + x));
    let fontIntensity = 'strong';
    try { const v = GM_getValue(FONT_INTENSITY_KEY, 'strong'); if (['soft','strong'].includes(v)) fontIntensity = v; } catch (_) {}
    let fontStyleHandle = null;
    function applyGlobalFont() {
        if (fontStyleHandle && typeof fontStyleHandle.remove === 'function') fontStyleHandle.remove();
        fontStyleHandle = null;
        if (isFontExcluded()) return;
        const weight = fontIntensity === 'strong' ? '300' : '350';
        const css = `
            @font-face { font-family:"Ubuntu Light Custom"; src:url("${FONT_URL}") format("woff2"); font-weight:100 500; font-style:normal; font-display:swap; }
            body, body :is(p,span,div,a,li,td,th,label,button,input,textarea,select,h1,h2,h3,h4,h5,h6,blockquote,figcaption,summary,legend,small,strong,em) {
                font-family:"Ubuntu Light Custom","Ubuntu",sans-serif !important;
                font-weight:${weight} !important;
            }
            body :is(b,strong, h1,h2,h3,h4,h5,h6) { font-weight:${fontIntensity === 'strong' ? '400' : '500'} !important; }
            body :is(svg,svg *,code,pre,kbd,samp,[role="img"],[class*="icon" i],[class*="material" i],[class*="glyph" i],[class*="fa-" i]) {
                font-family:initial !important;
            }`;
        fontStyleHandle = GM_addStyle(css);
    }
    applyGlobalFont();

    function addFontControls(panel, labelStyle, selectStyle, buttonStyle) {
        const section = document.createElement('div');
        section.style.cssText = 'margin:10px 8px 8px;padding:9px 8px;border:1px solid rgba(150,165,195,.2);border-radius:9px;background:rgba(100,110,135,.10)';
        const heading = document.createElement('div');
        heading.textContent = 'Глобальный шрифт Ubuntu Light';
        heading.style.cssText = 'font-size:14px;font-weight:600;color:#e0e5ef;margin:0 0 8px 0';
        section.appendChild(heading);

        const intensityRow = document.createElement('div');
        intensityRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
        const intensityLabel = document.createElement('span');
        intensityLabel.textContent = 'Интенсивность:';
        intensityLabel.style.cssText = 'font-size:13px;color:#c9d0d3';
        const select = document.createElement('select');
        select.style.cssText = selectStyle || 'flex:1;padding:5px;background:#30333d;color:#e0e5ef;border:1px solid #555b6b;border-radius:5px';
        [['soft','Мягкая'],['strong','Выраженная']].forEach(([v,t]) => {
            const option = document.createElement('option'); option.value=v; option.textContent=t; option.selected=fontIntensity===v; select.appendChild(option);
        });
        select.addEventListener('change', () => {
            fontIntensity = select.value;
            try { GM_setValue(FONT_INTENSITY_KEY, fontIntensity); } catch (_) {}
            applyGlobalFont();
        });
        intensityRow.append(intensityLabel, select); section.appendChild(intensityRow);

        const exclude = document.createElement('button');
        exclude.type = 'button';
        exclude.textContent = isFontExcluded() ? 'Включить на этом сайте' : 'Исключить этот сайт';
        exclude.style.cssText = buttonStyle || 'width:100%;padding:7px;background:rgba(96,100,110,.37);color:#dce1e8;border:1px solid #555b6b;border-radius:5px;cursor:pointer';
        exclude.addEventListener('click', () => {
            const list = getExcludedHosts();
            const next = isFontExcluded() ? list.filter(x => !(host === x || host.endsWith('.' + x))) : [...list, host];
            try { GM_setValue(FONT_EXCLUDED_KEY, [...new Set(next)]); } catch (_) {}
            if (isFontExcluded()) { if (fontStyleHandle && fontStyleHandle.remove) fontStyleHandle.remove(); fontStyleHandle=null; }
            else applyGlobalFont();
            exclude.textContent = isFontExcluded() ? 'Включить на этом сайте' : 'Исключить этот сайт';
        });
        section.appendChild(exclude);
        const note = document.createElement('div');
        note.textContent = 'Настройки применяются ко всем сайтам. Для быстрого переключения: Alt + Shift + U.';
        note.style.cssText = 'font-size:11px;line-height:1.4;color:#9da6b5;margin-top:7px';
        section.appendChild(note);
        panel.appendChild(section);
    }

    function createGlobalFontPanel() {
        if (document.getElementById('retube-settings-panel')) return;
        const panel = document.createElement('div');
        panel.id = 'retube-settings-panel';
        panel.style.cssText = 'position:fixed;z-index:2147483646;right:22px;top:80px;width:320px;padding:12px;background:rgba(30,32,40,.94);color:#fff;border:1px solid rgba(160,175,205,.3);border-radius:12px;font:300 14px/1.4 system-ui,sans-serif;box-shadow:0 12px 36px rgba(0,0,0,.35);backdrop-filter:blur(14px);display:none';
        const title = document.createElement('div'); title.textContent='Browser Tweaks'; title.style.cssText='font-size:18px;font-weight:600;margin:0 0 8px';
        panel.appendChild(title);
        addFontControls(panel);
        const close = document.createElement('button'); close.textContent='Закрыть'; close.style.cssText='width:100%;margin-top:8px;padding:7px;background:#454b59;color:#fff;border:0;border-radius:5px;cursor:pointer';
        close.addEventListener('click',()=>panel.style.display='none'); panel.appendChild(close);
        document.body.appendChild(panel);
        window.addEventListener('keydown', e => {
            if (e.key === 'F2') { e.preventDefault(); panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; }
            if (e.key === 'Escape') panel.style.display='none';
        });
    }
    window.addEventListener('keydown', e => {
        if (!(e.altKey && e.shiftKey && e.code === 'KeyU') || e.repeat || e.ctrlKey || e.metaKey) return;
        const list=getExcludedHosts();
        const next=isFontExcluded() ? list.filter(x => !(host===x || host.endsWith('.'+x))) : [...list,host];
        try { GM_setValue(FONT_EXCLUDED_KEY,[...new Set(next)]); } catch (_) {}
        if (isFontExcluded()) { if(fontStyleHandle && fontStyleHandle.remove) fontStyleHandle.remove(); fontStyleHandle=null; }
        else applyGlobalFont();
    }, true);

    if (!isYouTube) {
        const mount = () => createGlobalFontPanel();
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
        else mount();
        return;
    }

    // ==========================================
    // 0. ХРАНИЛИЩЕ СТИЛЕЙ И СОСТОЯНИЯ
    // ==========================================

    const activeStyles = {
        smoothAnim: [],
        hideElements: [],
        wheelSpeed: [],
        translateComments: [],
        compactMode: [],
        autoQuality: [],
        speedHotkeys: []
    };

    const STORAGE_KEY = 'retube_clone_settings';
    const POS_KEY = 'retube_clone_position';
    const QUALITY_KEY = 'retube_clone_quality';
    const SPEED_STEP_KEY = 'retube_clone_speed_step';
    const TRANSLATION_CACHE_KEY = 'retube_clone_translation_cache';

    let settings = {
        smoothAnim: false,
        hideElements: false,
        wheelSpeed: false,
        translateComments: false,
        compactMode: false,
        autoQuality: false,
        speedHotkeys: false
    };

    let selectedQuality = 'hd1080';
    let speedStep = 0.25;
    try { const savedStep = Number(localStorage.getItem(SPEED_STEP_KEY)); if ([0.05, 0.1, 0.25, 0.5].includes(savedStep)) speedStep = savedStep; } catch (e) {}
    try {
        const savedQuality = localStorage.getItem(QUALITY_KEY);
        if (savedQuality) selectedQuality = savedQuality;
    } catch (e) {}

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) settings = Object.assign(settings, JSON.parse(saved));
    } catch (e) {
        console.warn('YouTube Tweaks: не удалось загрузить настройки', e);
    }

    // ==========================================
    // 0.1. ОПИСАНИЯ ДЛЯ ПОДСКАЗОК
    // ==========================================

    const TOOLTIPS = {
        smoothAnim: 'Добавляет плавные CSS-переходы для основных контейнеров YouTube.',
        hideElements: 'Будут скрыты:\n• Кнопка голосового поиска\n• Страна возле иконки\n• Элементы с левой панели\n• Кнопки в плеере\n• Аннотация канала\n• Панель реакций\n• И другие лишние элементы',
        wheelSpeed: 'Позволяет точно настраивать скорость воспроизведения видео с помощью колеса мыши:\n• Shift + колесо — изменение скорости\n• Обычное колесо — прокрутка страницы',
        translateComments: 'Добавляет кнопку «Перевести» под каждым комментарием на иностранном языке.\nПеревод выполняется прямо на месте через Google Translate.',
        compactMode: 'Уменьшает отступы и делает интерфейс более компактным.',
        autoQuality: 'Автоматически устанавливает выбранное качество видео для всех роликов.',
        speedHotkeys: 'Горячие клавиши для изменения скорости воспроизведения:\n• Ctrl + ↑ — увеличить\n• Ctrl + ↓ — уменьшить\n• Ctrl + 0 — сбросить'
    };

    // ==========================================
    // 0.2. БАЗОВЫЕ СТИЛИ И ШРИФТ (ИСПРАВЛЕНО)
    // ==========================================

    GM_addStyle(`
        @font-face {
            font-family: "Ubuntu Light Custom";
            /* Ссылка на GitHub Pages для корректной загрузки шрифта */
            src: url("https://raw.githubusercontent.com/SolasFor/Browser/main/fonts/Ubuntu%20Light.woff2") format("woff2");
            font-weight: 300;
            font-style: normal;
            font-display: swap;
        }
        @keyframes retubeShow {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `);

    // ==========================================
    // 1. CSS-МОДИФИКАТОРЫ
    // ==========================================

    function applySmoothAnimations() {
        removeStyles('smoothAnim');
        const style = GM_addStyle(`
            #columns, #primary, #secondary, #player, ytd-comments {
                transition: all 0.3s ease-in-out !important;
            }
        `);
        activeStyles.smoothAnim.push(style);
    }

    function applyHideElementsCSS() {
        removeStyles('hideElements');
        const style = GM_addStyle(`
            #voice-search-button { display: none; }
            #country-code { display: none; }
            #footer,
            ytd-guide-section-renderer:nth-child(5) > div > ytd-guide-entry-renderer:nth-child(2),
            ytd-guide-section-renderer:nth-child(5) > div > ytd-guide-entry-renderer:nth-child(3),
            ytd-guide-section-renderer:nth-child(5) > div > ytd-guide-entry-renderer:nth-child(4),
            ytd-guide-section-renderer:nth-child(3) > div > ytd-guide-entry-renderer:nth-child(2),
            ytd-guide-section-renderer:nth-child(3) > div > ytd-guide-entry-renderer:nth-child(3),
            ytd-guide-section-renderer:nth-child(3) > div > ytd-guide-entry-renderer:nth-child(4),
            ytd-guide-section-renderer:nth-child(3) > div > ytd-guide-entry-renderer:nth-child(5),
            ytd-guide-section-renderer:nth-child(3) > div > ytd-guide-entry-renderer:nth-child(6),
            ytd-guide-section-renderer:nth-child(3) > div > ytd-guide-entry-renderer:nth-child(7) { display: none !important; }
            a.ytp-next-button.ytp-button, a.ytp-prev-button.ytp-button, .ytp-jump-button,
            .ytp-button.ytp-remote-button, .ytp-button.ytp-miniplayer-button,
            button[title="Автовоспроизведение выключено"], button[title="Автоматичне відтворення вимкнено"],
            .ytp-button:has(.ytp-autonav-toggle-button[aria-checked="false"]),
            button[title="Субтитры недоступны"], button[title="Субтитри недоступні"] { display: none !important; }
            .ytp-paid-content-overlay, .iv-branding, #movie_player > [class^="ytp-ce-"],
            .ytp-cards-teaser-text, ytm-paid-content-overlay-renderer,
            .annotation.annotation-type-custom.iv-branding, .ytp-fullerscreen-edu-button-subtle { display: none !important; }
            #reaction-control-panel { display: none; }
            .sbfl_a, .YtSearchboxComponentReportButton, .ytSearchboxComponentReportButton { display: none !important; }
            .gsst_a, .YtSearchboxComponentYtdTextInputAssistantWrapper, .ytSearchboxComponentYtdTextInputAssistantWrapper { display: none !important; }
            [role="button"][aria-label="Добавить в очередь"], [role="button"][aria-label="Додати в чергу"] { display: none; }
            yt-multi-page-menu-section-renderer:nth-child(5) { display: none; }
            ytd-download-button-renderer,
            yt-button-view-model:has(button[aria-label="Поделиться"]), yt-button-view-model:has(button[aria-label="Создать клип"]),
            yt-button-view-model:has(button[aria-label="Спасибо"]), yt-button-view-model:has(button[aria-label="Показать текст видео"]),
            yt-button-view-model:has(button[aria-label="Share"]), yt-button-view-model:has(button[aria-label="Clip"]),
            yt-button-view-model:has(button[aria-label="Thank You"]), yt-button-view-model:has(button[aria-label="Show text version"]),
            yt-button-view-model:has(button[aria-label="Поділитися"]), yt-button-view-model:has(button[aria-label="Створити кліп"]),
            yt-button-view-model:has(button[aria-label="Дякую"]), yt-button-view-model:has(button[aria-label="Показати текстову версію"]) { display: none !important; }
            ytd-search-pyv-renderer, [class^="ytd-promoted-"], ytd-video-renderer + ytd-shelf-renderer,
            ytd-video-renderer + ytd-reel-shelf-renderer, ytd-rich-section-renderer:has(a[href^="/premium/"]),
            #clarify-box, .ytd-watch-flexy.attached-message, ytd-popup-container tp-yt-paper-dialog ytd-single-option-survey-renderer,
            #donation-shelf ytd-donation-unavailable-renderer, .sparkles-light-cta, ytd-feed-nudge-renderer,
            .ytp-pause-overlay-container, #teaser-carousel:has(> .ytVideoMetadataCarouselViewModelHost),
            #premium-upsell-link, .ytd-guide-renderer.style-scope:nth-of-type(4), #sponsor-button, #newness-dot { display: none !important; }
        `);
        activeStyles.hideElements.push(style);
    }

    function applyCompactMode() {
        removeStyles('compactMode');
        const style = GM_addStyle(`
            ytd-rich-grid-renderer { --ytd-rich-grid-item-margin: 8px !important; --ytd-rich-grid-gutter-margin: 8px !important; }
            ytd-rich-item-renderer { margin-bottom: 8px !important; }
            ytd-video-renderer, ytd-compact-video-renderer { margin-bottom: 6px !important; padding: 4px 0 !important; }
            #masthead-container { --ytd-masthead-height: 48px !important; }
            #container.ytd-masthead { height: 48px !important; }
            ytd-comment-thread-renderer { margin-bottom: 12px !important; }
            #secondary { padding-left: 8px !important; }
        `);
        activeStyles.compactMode.push(style);
    }

    // ==========================================
    // 1.2. АВТО-КАЧЕСТВО
    // ==========================================

    let qualityObserver = null;
    let qualityTimeout = null;
    let qualityInterval = null;

    const QUALITY_MAP = { 'hd720': 'HD (720p)', 'hd1080': 'FHD (1080p)', 'hd1440': '2K (1440p)', 'hd2160': '4K (2160p)' };

    function applyAutoQuality() {
        if (qualityObserver) return;
        const setQuality = () => {
            const player = document.querySelector('#movie_player');
            if (!player || !player.getAvailableQualityLevels) return;
            const available = player.getAvailableQualityLevels();
            if (!available || available.length === 0) return;
            const current = player.getPlaybackQuality ? player.getPlaybackQuality() : '';
            if (current === selectedQuality) return;
            let target = selectedQuality;
            if (!available.includes(selectedQuality)) {
                const order = ['highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
                const targetIndex = order.indexOf(selectedQuality);
                const fallback = order.slice(Math.max(0, targetIndex + 1)).find(level => available.includes(level));
                target = fallback || order.find(level => available.includes(level)) || available[0];
            }
            if (player.setPlaybackQualityRange) player.setPlaybackQualityRange(target, target);
            if (player.setPlaybackQuality) player.setPlaybackQuality(target);
        };
        const checkQuality = () => { clearTimeout(qualityTimeout); qualityTimeout = setTimeout(setQuality, 1000); };
        qualityObserver = new MutationObserver(() => checkQuality());
        qualityObserver.observe(document.body, { childList: true, subtree: true });
        checkQuality();
        qualityInterval = setInterval(() => { if (!settings.autoQuality) { clearInterval(qualityInterval); return; } setQuality(); }, 5000);
    }

    function removeAutoQuality() {
        if (qualityObserver) { qualityObserver.disconnect(); qualityObserver = null; }
        clearTimeout(qualityTimeout);
        clearInterval(qualityInterval);
    }

    // ==========================================
    // 1.3. ГОРЯЧИЕ КЛАВИШИ И СКОРОСТЬ
    // ==========================================

    let speedHotkeyHandler = null;

    function applySpeedHotkeys() {
        if (speedHotkeyHandler) return;
        speedHotkeyHandler = function(e) {
            if (e.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || !e.ctrlKey || e.altKey || e.metaKey) return;
            const video = document.querySelector('video');
            if (!video) return;
            let newRate = video.playbackRate || 1;
            if (e.key === 'ArrowUp') { e.preventDefault(); newRate = Math.min(4, newRate + speedStep); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); newRate = Math.max(0.25, newRate - speedStep); }
            else if (e.key === '0') { e.preventDefault(); newRate = 1; }
            else return;
            newRate = Math.round(newRate * 100) / 100;
            video.playbackRate = newRate;
            showSpeedOSD(newRate);
        };
        window.addEventListener('keydown', speedHotkeyHandler, true);
    }

    function removeSpeedHotkeys() {
        if (speedHotkeyHandler) { window.removeEventListener('keydown', speedHotkeyHandler, true); speedHotkeyHandler = null; }
    }

    function showSpeedOSD(rate) {
        let osd = document.getElementById('retube-speed-osd');
        if (!osd) {
            osd = document.createElement('div');
            osd.id = 'retube-speed-osd';
            osd.style.cssText = `position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 99999;
                background: rgba(28, 31, 42, 0.85); color: #c9d0d3; padding: 10px 20px; border-radius: 8px;
                border: 1px solid rgba(150, 165, 195, 0.18); font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif;
                font-size: 16px; font-weight: 300; pointer-events: none; transition: opacity 0.3s ease;
                backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);`;
            document.body.appendChild(osd);
        }
        osd.textContent = 'Скорость: ' + rate.toFixed(2) + '×';
        osd.style.opacity = '1';
        clearTimeout(osd._timer);
        osd._timer = setTimeout(() => { osd.style.opacity = '0'; }, 1000);
    }

    let wheelSpeedHandler = null;

    function applyWheelSpeed() {
        removeStyles('wheelSpeed');
        if (wheelSpeedHandler) return;
        wheelSpeedHandler = function(e) {
            const player = document.querySelector('#movie_player, .html5-video-player');
            if (!player || !player.contains(e.target) || !e.shiftKey) return;
            const video = document.querySelector('video');
            if (!video) return;
            e.preventDefault(); e.stopPropagation();
            const delta = e.deltaY > 0 ? -speedStep : speedStep;
            let newRate = (video.playbackRate || 1) + delta;
            newRate = Math.max(0.25, Math.min(4, newRate));
            newRate = Math.round(newRate * 100) / 100;
            video.playbackRate = newRate;
            showSpeedOSD(newRate);
        };
        window.addEventListener('wheel', wheelSpeedHandler, { passive: false, capture: true });
    }

    function removeWheelSpeed() {
        if (wheelSpeedHandler) { window.removeEventListener('wheel', wheelSpeedHandler, { capture: true }); wheelSpeedHandler = null; }
    }

    // ==========================================
    // 1.4. ПЕРЕВОД КОММЕНТАРИЕВ
    // ==========================================

    let translateObserver = null;
    function isRussian(text) {
        const value = (text || '').toLowerCase();
        if (/[іїєґўђјљњћќџъыэѝ]/i.test(value)) return false;
        return /[а-яё]/i.test(value) && !/[a-z]{3,}/i.test(value);
    }
    function getTranslationCache() {
        try { return JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}'); } catch (e) { return {}; }
    }
    function saveTranslationCache(cache) {
        try { localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Object.entries(cache).slice(-300).reduce((obj, pair) => { obj[pair[0]] = pair[1]; return obj; }, {}))); } catch (e) {}
    }

    function translateText(text, targetLang, callback) {
        const input = text.slice(0, 1500), cache = getTranslationCache(), cacheKey = targetLang + ':' + input;
        if (cache[cacheKey]) { callback(cache[cacheKey]); return; }
        const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + targetLang + '&dt=t&q=' + encodeURIComponent(input);
        GM_xmlhttpRequest({
            method: 'GET', url: url,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    let translated = '';
                    if (data && data[0]) { for (let i = 0; i < data[0].length; i++) { if (data[0][i] && data[0][i][0]) translated += data[0][i][0]; } }
                    if (translated) { cache[cacheKey] = translated; saveTranslationCache(cache); }
                    callback(translated || null);
                } catch (e) { callback(null); }
            },
            onerror: function() { callback(null); }
        });
    }

    function applyTranslateComments() {
        if (translateObserver) return;
        const addTranslateButtons = () => {
            const comments = document.querySelectorAll('ytd-comment-view-model #content-text, ytd-comment-renderer #content-text');
            comments.forEach(textEl => {
                if (textEl.dataset.retubeTranslateAdded) return;
                textEl.dataset.retubeTranslateAdded = '1';
                const originalText = textEl.textContent.trim();
                if (!originalText || isRussian(originalText)) return;

                const btnWrapper = document.createElement('div');
                btnWrapper.className = 'retube-translate-wrapper';
                btnWrapper.style.cssText = 'margin-top: 6px;';

                const btn = document.createElement('button');
                btn.className = 'retube-translate-btn';
                btn.textContent = 'Перевести';
                btn.style.cssText = `display: inline-block; padding: 3px 10px; font-size: 12px; font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif;
                    font-weight: 300; background: rgba(96, 100, 110, 0.37); color: rgb(201, 208, 211); border: 1px solid rgb(72, 75, 91);
                    border-radius: 10px; cursor: pointer; transition: background 0.2s ease, color 0.2s ease;`;
                btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(96, 100, 110, 0.6)'; btn.style.color = '#fff'; });
                btn.addEventListener('mouseleave', () => { btn.style.background = 'rgba(96, 100, 110, 0.37)'; btn.style.color = 'rgb(201, 208, 211)'; });

                const translationBox = document.createElement('div');
                translationBox.className = 'retube-translation-box';
                translationBox.style.cssText = `display: none; margin-top: 8px; padding: 10px 12px; background: rgba(87, 133, 186, 0.12);
                    border-left: 3px solid rgba(122, 163, 212, 0.7); border-radius: 6px; font-size: 14px; line-height: 1.5; color: #ddd;
                    white-space: pre-wrap; font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif; font-weight: 300;`;

                let translated = false;
                let loading = false;

                btn.addEventListener('click', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (loading) return;
                    if (translated) {
                        const visible = translationBox.style.display !== 'none';
                        translationBox.style.display = visible ? 'none' : 'block';
                        btn.textContent = visible ? 'Показать перевод' : 'Скрыть перевод';
                        return;
                    }
                    loading = true; btn.textContent = 'Перевод…'; btn.disabled = true;
                    translationBox.style.display = 'block'; translationBox.textContent = 'Перевод…';
                    translateText(originalText, 'ru', (result) => {
                        loading = false; btn.disabled = false;
                        if (result) { translated = true; translationBox.textContent = result; btn.textContent = 'Скрыть перевод'; }
                        else { translationBox.textContent = 'Не удалось перевести. Попробуйте позже.'; btn.textContent = 'Повторить'; }
                    });
                });
                btnWrapper.appendChild(btn);
                btnWrapper.appendChild(translationBox);
                textEl.parentNode.insertBefore(btnWrapper, textEl.nextSibling);
            });
        };
        addTranslateButtons();
        translateObserver = new MutationObserver(() => addTranslateButtons());
        translateObserver.observe(document.body, { childList: true, subtree: true });
    }

    function removeTranslateComments() {
        if (translateObserver) { translateObserver.disconnect(); translateObserver = null; }
        document.querySelectorAll('.retube-translate-wrapper').forEach(el => el.remove());
        document.querySelectorAll('[data-retube-translate-added]').forEach(el => { delete el.dataset.retubeTranslateAdded; });
    }

    function removeStyles(key) {
        activeStyles[key].forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el); });
        activeStyles[key] = [];
    }

    function toggleFeature(key, enabled) {
        if (key === 'smoothAnim') { if (enabled) applySmoothAnimations(); else removeStyles('smoothAnim'); }
        if (key === 'hideElements') { if (enabled) applyHideElementsCSS(); else removeStyles('hideElements'); }
        if (key === 'wheelSpeed') { if (enabled) applyWheelSpeed(); else removeWheelSpeed(); }
        if (key === 'translateComments') { if (enabled) applyTranslateComments(); else removeTranslateComments(); }
        if (key === 'compactMode') { if (enabled) applyCompactMode(); else removeStyles('compactMode'); }
        if (key === 'autoQuality') { if (enabled) applyAutoQuality(); else removeAutoQuality(); }
        if (key === 'speedHotkeys') { if (enabled) applySpeedHotkeys(); else removeSpeedHotkeys(); }
    }

    // ==========================================
    // 2. ПАНЕЛЬ НАСТРОЕК
    // ==========================================

    let tooltipEl = null;
    let tooltipTimer = null;

    function ensureTooltip() {
        if (tooltipEl) return tooltipEl;
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'retube-tooltip';
        tooltipEl.style.cssText = `position: fixed; z-index: 10000; max-width: 400px; padding: 12px 14px; background: rgba(58, 67, 77, 0.75);
            color: #fff; border-radius: 13px; font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif; font-weight: 300; font-size: 14px;
            line-height: 1.5; white-space: pre-line; box-shadow: 0 0 10px rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px); pointer-events: none; opacity: 0; transform: translateY(-6px);
            transition: opacity 0.25s ease, transform 0.25s ease;`;
        document.body.appendChild(tooltipEl);
        return tooltipEl;
    }

    function showTooltip(text, cursorX, cursorY) {
        const tip = ensureTooltip();
        tip.textContent = text;
        tip.style.opacity = '0'; tip.style.transform = 'translateY(-6px)';
        tip.style.left = '0px'; tip.style.top = '0px'; tip.style.visibility = 'hidden';

        const tipRect = tip.getBoundingClientRect();
        const margin = 16;
        let left = cursorX - tipRect.width / 2;
        let top = cursorY + margin;
        if (left < 10) left = 10;
        if (left + tipRect.width > window.innerWidth - 10) left = window.innerWidth - tipRect.width - 10;
        if (top + tipRect.height > window.innerHeight - 10) top = cursorY - tipRect.height - margin;

        tip.style.left = left + 'px'; tip.style.top = top + 'px'; tip.style.visibility = 'visible';
        requestAnimationFrame(() => { tip.style.opacity = '1'; tip.style.transform = 'translateY(0)'; });
    }

    function hideTooltip() {
        if (tooltipTimer) { clearTimeout(tooltipTimer); tooltipTimer = null; }
        if (tooltipEl) { tooltipEl.style.opacity = '0'; tooltipEl.style.transform = 'translateY(-6px)'; }
    }

    let dragState = null;

    function makeDraggable(panel, handle) {
        handle.style.cursor = 'grab';
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const rect = panel.getBoundingClientRect();
            dragState = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
            handle.style.cursor = 'grabbing';
            document.addEventListener('mousemove', onDragMove);
            document.addEventListener('mouseup', onDragEnd);
        });

        function onDragMove(e) {
            if (!dragState) return;
            let left = e.clientX - dragState.offsetX;
            let top = e.clientY - dragState.offsetY;
            const maxLeft = window.innerWidth - panel.offsetWidth - 4;
            const maxTop = window.innerHeight - panel.offsetHeight - 4;
            if (left < 4) left = 4; if (top < 4) top = 4; if (left > maxLeft) left = maxLeft; if (top > maxTop) top = maxTop;
            panel.style.left = left + 'px'; panel.style.top = top + 'px'; panel.style.right = 'auto';
        }

        function onDragEnd() {
            if (dragState) {
                try { localStorage.setItem(POS_KEY, JSON.stringify({ left: panel.style.left, top: panel.style.top })); } catch (e) {}
            }
            dragState = null; handle.style.cursor = 'grab';
            document.removeEventListener('mousemove', onDragMove); document.removeEventListener('mouseup', onDragEnd);
        }
    }

    function createSettingsPanel() {
        if (document.getElementById('retube-settings-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'retube-settings-panel';
        panel.style.cssText = `position: fixed; z-index: 9999; width: 320px; max-height: 85vh; padding: 0 0 14px 0;
            background: rgba(30, 32, 40, 0.72); color: #fff; border: 1px solid rgba(160, 175, 205, 0.22); border-radius: 14px; font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif;
            font-weight: 300; display: none; overflow-y: auto; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28); animation: retubeShow 0.25s ease;`;

        let initialLeft, initialTop;
        try {
            const savedPos = localStorage.getItem(POS_KEY);
            if (savedPos) { const pos = JSON.parse(savedPos); initialLeft = pos.left; initialTop = pos.top; }
        } catch (e) {}
        if (initialLeft && initialTop) { panel.style.left = initialLeft; panel.style.top = initialTop; }
        else {
            const w = 320, h = 480;
            panel.style.left = Math.max(20, (window.innerWidth - w) / 2) + 'px';
            panel.style.top = Math.max(20, (window.innerHeight - h) / 2) + 'px';
        }

        const header = document.createElement('div');
        header.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
            margin: 0 0 10px 0; background: rgba(67, 77, 105, 0.25); border-radius: 14px 14px 0 0; user-select: none;`;

        const title = document.createElement('span');
        title.textContent = 'YouTube Tweaks';
        title.style.cssText = `font-weight: bold; margin-left: 6px; font-size: 20px; pointer-events: none; color: rgb(201, 208, 211);`;
        header.appendChild(title);

        const dots = document.createElement('span');
        dots.textContent = '⋮⋮';
        dots.style.cssText = 'opacity: 0.4; font-size: 14px; letter-spacing: -2px; color: rgb(201, 208, 211);';
        header.appendChild(dots);
        panel.appendChild(header);

        const makeCheckbox = (id, labelText, key) => {
            const label = document.createElement('label');
            label.style.cssText = `display: flex; align-items: center; gap: 8px; margin: 0 8px 6px 8px; cursor: pointer;
                padding: 4px 8px; border-radius: 6px; transition: background 0.15s ease; font-size: 14px; color: rgb(201, 208, 211);
                font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif; font-weight: 300; user-select: none;`;

            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.id = id; cb.checked = settings[key];
            cb.style.cssText = 'width: 16px; height: 16px; accent-color: #9ba8c2; cursor: pointer;';

            const span = document.createElement('span');
            span.textContent = labelText; span.style.cssText = 'font-size: 14px;';

            label.appendChild(cb); label.appendChild(span); panel.appendChild(label);

            label.addEventListener('mouseenter', (e) => {
                label.style.background = 'rgba(120, 125, 130, 0.15)';
                if (tooltipTimer) clearTimeout(tooltipTimer);
                const x = e.clientX, y = e.clientY;
                tooltipTimer = setTimeout(() => showTooltip(TOOLTIPS[key], x, y), 400);
            });

            label.addEventListener('mousemove', (e) => {
                if (tooltipEl && tooltipEl.style.opacity === '1') {
                    const tipRect = tooltipEl.getBoundingClientRect();
                    let left = e.clientX - tipRect.width / 2; let top = e.clientY + 16;
                    if (left < 10) left = 10;
                    if (left + tipRect.width > window.innerWidth - 10) left = window.innerWidth - tipRect.width - 10;
                    if (top + tipRect.height > window.innerHeight - 10) top = e.clientY - tipRect.height - 16;
                    tooltipEl.style.left = left + 'px'; tooltipEl.style.top = top + 'px';
                }
            });

            label.addEventListener('mouseleave', () => { label.style.background = 'transparent'; hideTooltip(); });
            return cb;
        };

        const cbAnim = makeCheckbox('retube-smooth-anim', 'Плавные анимации страницы', 'smoothAnim');
        const cbHide = makeCheckbox('retube-hide-elements', 'Скрыть лишние элементы', 'hideElements');
        const cbWheel = makeCheckbox('retube-wheel-speed', 'Точная настройка скорости колесом мыши', 'wheelSpeed');
        const cbTranslate = makeCheckbox('retube-translate-comments', 'Перевод комментариев', 'translateComments');
        const cbCompact = makeCheckbox('retube-compact-mode', 'Компактный режим', 'compactMode');
        const cbAutoQuality = makeCheckbox('retube-auto-quality', 'Авто-качество', 'autoQuality');
        const cbSpeedHotkeys = makeCheckbox('retube-speed-hotkeys', 'Горячие клавиши для скорости', 'speedHotkeys');

        const qualityRow = document.createElement('div');
        qualityRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin: 0 8px 6px 8px; padding: 4px 8px;';

        const qualityLabel = document.createElement('span');
        qualityLabel.textContent = 'Качество:';
        qualityLabel.style.cssText = 'font-size: 13px; color: rgb(201, 208, 211);';
        qualityRow.appendChild(qualityLabel);

        const qualitySelect = document.createElement('select');
        qualitySelect.id = 'retube-quality-select';
        qualitySelect.style.cssText = `flex: 1; padding: 4px 8px; background: rgb(96, 100, 110, 0.37); color: rgb(201, 208, 211);
            border: 1px solid rgb(72, 75, 91); border-radius: 5px; font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif;
            font-weight: 300; font-size: 13px; cursor: pointer;`;

        ['hd720', 'hd1080', 'hd1440', 'hd2160'].forEach(q => {
            const opt = document.createElement('option');
            opt.value = q; opt.textContent = QUALITY_MAP[q];
            opt.style.cssText = 'background: rgb(37, 37, 45); color: rgb(201, 208, 211);';
            if (q === selectedQuality) opt.selected = true;
            qualitySelect.appendChild(opt);
        });

        qualitySelect.addEventListener('change', (e) => {
            selectedQuality = e.target.value;
            try { localStorage.setItem(QUALITY_KEY, selectedQuality); } catch (err) {}
            if (settings.autoQuality) {
                const player = document.querySelector('#movie_player');
                if (player && player.setPlaybackQualityRange) player.setPlaybackQualityRange(selectedQuality, selectedQuality);
            }
        });
        qualityRow.appendChild(qualitySelect);
        panel.appendChild(qualityRow);

        const speedRow = document.createElement('div');
        speedRow.style.cssText = 'display:flex; align-items:center; gap:8px; margin:0 8px 6px; padding:4px 8px;';
        const speedLabel = document.createElement('span'); speedLabel.textContent = 'Шаг скорости:';
        speedLabel.style.cssText = 'font-size:13px; color:rgb(201,208,211);';
        const speedSelect = document.createElement('select'); speedSelect.style.cssText = qualitySelect.style.cssText;
        [{value:0.05,label:'0,05×'},{value:0.1,label:'0,1×'},{value:0.25,label:'0,25×'},{value:0.5,label:'0,5×'}].forEach(item => {
            const option = document.createElement('option'); option.value = String(item.value); option.textContent = item.label;
            option.style.cssText = 'background:rgb(37,37,45); color:rgb(201,208,211);';
            if (item.value === speedStep) option.selected = true; speedSelect.appendChild(option);
        });
        speedSelect.addEventListener('change', () => { speedStep = Number(speedSelect.value); try { localStorage.setItem(SPEED_STEP_KEY, String(speedStep)); } catch (e) {} });
        speedRow.appendChild(speedLabel); speedRow.appendChild(speedSelect); panel.appendChild(speedRow);

        addFontControls(panel, null, qualitySelect.style.cssText, null);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 8px; margin: 12px 8px 0 8px;';

        const saveBtn = document.createElement('button');
        saveBtn.id = 'retube-save'; saveBtn.textContent = 'Сохранить';
        saveBtn.style.cssText = `flex: 1; padding: 8px 10px; background: rgb(96, 100, 110, 0.37); color: rgb(201, 208, 211);
            border-radius: 5px; border: 1px solid rgb(72, 75, 91); font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif;
            font-weight: 300; font-size: 14px; cursor: pointer; transition: background 0.2s ease;`;
        saveBtn.addEventListener('mouseenter', () => saveBtn.style.background = 'rgb(96, 100, 110, 0.6)');
        saveBtn.addEventListener('mouseleave', () => saveBtn.style.background = 'rgb(96, 100, 110, 0.37)');

        const resetBtn = document.createElement('button');
        resetBtn.id = 'retube-reset'; resetBtn.textContent = 'Сбросить';
        resetBtn.style.cssText = `flex:1; padding:8px 10px; background:rgba(120,80,80,0.32); color:rgb(230,215,215); border-radius:5px; border:1px solid rgba(150,95,95,0.55); font-family:"Ubuntu Light Custom","Ubuntu",sans-serif; font-size:14px; cursor:pointer;`;
        const closeBtn = document.createElement('button');
        closeBtn.id = 'retube-close'; closeBtn.textContent = 'Закрыть';
        closeBtn.style.cssText = `flex: 1; padding: 8px 10px; background: rgb(96, 100, 110, 0.37); color: rgb(201, 208, 211);
            border-radius: 5px; border: 1px solid rgb(72, 75, 91); font-family: "Ubuntu Light Custom", "Ubuntu", sans-serif;
            font-weight: 300; font-size: 14px; cursor: pointer; transition: background 0.2s ease;`;
        closeBtn.addEventListener('mouseenter', () => closeBtn.style.background = 'rgb(96, 100, 110, 0.6)');
        closeBtn.addEventListener('mouseleave', () => closeBtn.style.background = 'rgb(96, 100, 110, 0.37)');

        btnRow.appendChild(saveBtn); btnRow.appendChild(resetBtn); btnRow.appendChild(closeBtn); panel.appendChild(btnRow);
        resetBtn.addEventListener('click', () => {
            const defaults = { smoothAnim:false, hideElements:false, wheelSpeed:false, translateComments:false, compactMode:false, autoQuality:false, speedHotkeys:false };
            Object.assign(settings, defaults); selectedQuality = 'hd1080'; speedStep = 0.25;
            const ids = { smoothAnim:'retube-smooth-anim', hideElements:'retube-hide-elements', wheelSpeed:'retube-wheel-speed', translateComments:'retube-translate-comments', compactMode:'retube-compact-mode', autoQuality:'retube-auto-quality', speedHotkeys:'retube-speed-hotkeys' };
            Object.entries(ids).forEach(([key,id]) => { const cb = panel.querySelector('#' + id); if (cb) cb.checked = false; toggleFeature(key, false); });
            qualitySelect.value = selectedQuality; speedSelect.value = String(speedStep);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); localStorage.setItem(QUALITY_KEY, selectedQuality); localStorage.setItem(SPEED_STEP_KEY, String(speedStep)); } catch (e) {}
            resetBtn.textContent = 'Сброшено ✓'; setTimeout(() => { resetBtn.textContent = 'Сбросить'; }, 1200);
        });
        document.body.appendChild(panel);
        makeDraggable(panel, header);

        cbAnim.addEventListener('change', (e) => { settings.smoothAnim = e.target.checked; toggleFeature('smoothAnim', e.target.checked); });
        cbHide.addEventListener('change', (e) => { settings.hideElements = e.target.checked; toggleFeature('hideElements', e.target.checked); });
        cbWheel.addEventListener('change', (e) => { settings.wheelSpeed = e.target.checked; toggleFeature('wheelSpeed', e.target.checked); });
        cbTranslate.addEventListener('change', (e) => { settings.translateComments = e.target.checked; toggleFeature('translateComments', e.target.checked); });
        cbCompact.addEventListener('change', (e) => { settings.compactMode = e.target.checked; toggleFeature('compactMode', e.target.checked); });
        cbAutoQuality.addEventListener('change', (e) => { settings.autoQuality = e.target.checked; toggleFeature('autoQuality', e.target.checked); });
        cbSpeedHotkeys.addEventListener('change', (e) => { settings.speedHotkeys = e.target.checked; toggleFeature('speedHotkeys', e.target.checked); });

        saveBtn.addEventListener('click', () => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
                localStorage.setItem(QUALITY_KEY, selectedQuality);
                saveBtn.textContent = 'Сохранено ✓';
                setTimeout(() => { saveBtn.textContent = 'Сохранить'; }, 1200);
            } catch (e) {}
        });

        closeBtn.addEventListener('click', () => { panel.style.display = 'none'; hideTooltip(); });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            let panel = document.getElementById('retube-settings-panel');
            if (!panel) { createSettingsPanel(); panel = document.getElementById('retube-settings-panel'); }
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                if (panel.style.display === 'none') hideTooltip();
            }
        }
        if (e.key === 'Escape') {
            const panel = document.getElementById('retube-settings-panel');
            if (panel) panel.style.display = 'none';
            hideTooltip();
        }
    });

    function applySavedSettings() {
        if (settings.smoothAnim) applySmoothAnimations();
        if (settings.hideElements) applyHideElementsCSS();
        if (settings.wheelSpeed) applyWheelSpeed();
        if (settings.translateComments) applyTranslateComments();
        if (settings.compactMode) applyCompactMode();
        if (settings.autoQuality) applyAutoQuality();
        if (settings.speedHotkeys) applySpeedHotkeys();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { createSettingsPanel(); applySavedSettings(); });
    } else {
        createSettingsPanel(); applySavedSettings();
    }

})();
