// ============================================================================
// Firefox Customization — Шаблон user.js (SolasFor/Browser)
// Поместите этот файл в корень папки профиля Firefox (рядом с папкой chrome/).
// Внимание: активные строки user_pref(...) применяются при каждом запуске Firefox.
// Обязательные системные параметры включены ниже по умолчанию; дополнительные
// флаги mod.* закомментированы, чтобы вы могли свободно переключать их на лету
// через about:config (либо раскомментируйте нужные для жёсткой фиксации).
// ============================================================================

// --- 1. Обязательные параметры движка для работы темы и SVG-иконок ---
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("svg.context-properties.content.enabled", true);
user_pref("layout.css.backdrop-filter.enabled", true);

// --- 2. Основные опции темы Firefox-Mod-Blur (раскомментируйте при необходимости) ---
// user_pref("mod.disable.custom.font", true);                     // Отключить шрифт Ubuntu Light в интерфейсе браузера
// user_pref("mod.disable.tab.preview.panel.fully", true);         // Скрыть всплывающее превью вкладок при наведении
// user_pref("mod.searchbox.focus.outline.enable", true);          // Контур фокуса у адресной/поисковой строки
// user_pref("mod.search.info.buttons.show.always", true);         // Всегда показывать значки информации о сайте в адресной строке
// user_pref("mod.compact.vertical.tabs", true);                   // Компактные вертикальные вкладки
// user_pref("mod.disable.scrollbar.in.vertical.tabs", true);      // Скрыть полосу прокрутки вертикальных вкладок
// user_pref("mod.centered.tabs", true);                           // Выравнивание горизонтальных вкладок по центру
// user_pref("mod.main.window.frame.style-1", true);               // Альтернативная рамка окна (стиль 1)
// user_pref("mod.combined.extra.blur", true);                     // Дополнительное размытие меню и панелей
// user_pref("mod.new-tab.background.blur", 5);                    // Интенсивность размытия обоев новой вкладки (1..10)
// user_pref("mod.card-theme.style.1", true);                      // Оформление карточек новой вкладки (стиль 1)

// --- 3. Меню расширений ---
// user_pref("mod.hide.faded-extensions.inside.extensions-menu", true); // Скрыть неактивные расширения в меню
// user_pref("mod.hide.manage-extensions.button", true);                // Скрыть кнопку «Управление расширениями»
// user_pref("mod.number.of.extensions.in.a.row", 4);                   // Число значков расширений в одном ряду (1..10)
// user_pref("mod.extensions.menu.extention-icon.size", 22);            // Размер значков в меню расширений в px (12..30)

// --- 4. Отключение отдельных модульных CSS-файлов (по умолчанию все 10 включены) ---
// Установите true для любого модуля, который хотите выключить без удаления CSS-файлов:
// user_pref("mod.disable.macos.window.buttons", true);            // Отключить кнопки окна (свернуть/развернуть/закрыть) в стиле macOS
// user_pref("mod.disable.firefox.menu.icon", true);               // Вернуть стандартную иконку меню вместо логотипа Firefox
// user_pref("mod.disable.main.menu.icons", true);                 // Убрать иконки у пунктов главного меню
// user_pref("mod.disable.cleaner.extensions.menu", true);         // Отключить компактную сетку меню расширений
// user_pref("mod.disable.colored.sound.tab", true);               // Отключить цветную подсветку звучащей неактивной вкладки
// user_pref("mod.disable.overflow.only.alltabs", true);           // Всегда показывать кнопку списка всех вкладок
// user_pref("mod.disable.remove.bookmark.folder.icons", true);    // Вернуть значки папок на панели закладок
// user_pref("mod.disable.white.github.bookmark.icon", true);      // Не заменять иконку GitHub в закладках на белую
// user_pref("mod.disable.ublock.icon.change", true);              // Не заменять значок uBlock Origin
// user_pref("mod.disable.thin.scrollbar", true);                  // Отключить принудительно тонкие полосы прокрутки
