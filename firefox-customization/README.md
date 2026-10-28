# Firefox Customization

Набор CSS-модификаций для интерфейса Firefox на основе [Firefox-Mod-Blur](https://github.com/datguypiko/Firefox-Mod-Blur). Здесь собраны основные файлы `userChrome.css`, `userContent.css`, дополнительные моды и настройки `about:config`.

> **О скриншотах:** изображения ниже взяты из README исходного проекта Firefox-Mod-Blur и показывают визуальный эффект оригинальных модификаций. Внешний вид может отличаться в зависимости от версии Firefox, ОС, темы и состава CSS-файлов в этом репозитории.

## Установка

1. В Firefox откройте `about:config`.
2. Найдите `toolkit.legacyUserProfileCustomizations.stylesheets` и установите значение `true` (тип Boolean).
3. Откройте `about:support`, найдите «Папка профиля» и нажмите «Открыть папку».
4. Закройте Firefox. В папке профиля создайте каталог `chrome`, если его ещё нет.
5. Скопируйте содержимое каталога [`chrome/`](chrome/) этого репозитория в папку `chrome` профиля Firefox. Путь к файлу должен быть `<профиль>/chrome/userChrome.css`.
6. Запустите Firefox. Если изменения не появились, проверьте настройку из шага 2 и перезапустите браузер.

Перед заменой существующих файлов сохраните резервную копию. Не объединяйте вслепую несколько разных тем: одинаковые CSS-селекторы могут конфликтовать.

## Дополнительные настройки about:config

Откройте `about:config`, найдите параметр и измените значение. Если параметра нет, создайте его с указанным типом. Для включения Boolean-параметров установите `true`.

| Функция | Параметр | Тип | Значение | Пояснение | Скриншот |
| --- | --- | --- | --- | --- | --- |
| Скрыть панель предпросмотра вкладки | `firefoxcss.disable.tab.preview.panel.fully` | Boolean | `true` | Отключает всплывающую панель предпросмотра, которая появляется при наведении на вкладку. | ![Отключённый предпросмотр вкладки](https://github.com/user-attachments/assets/dd684579-3142-4245-9e75-f0cd29e1d1e6) |
| Контур фокуса поисковой строки | `mod.searchBox.focus.outline.enable` | Boolean | `true` | Включает контур, выделяющий поисковую строку при получении фокуса. | ![Контур фокуса поисковой строки](https://github.com/user-attachments/assets/52537d21-347b-4d3c-9ebf-d3b3e1ba3af9) |
| Скрыть неактивные расширения | `mod.hide.faded-extensions.inside.extensions-menu` | Boolean | `true` | Скрывает неактивные или визуально приглушённые расширения в меню расширений. | ![Скрытие неактивных расширений](https://github.com/user-attachments/assets/531b9958-40f0-4e12-95dd-649519670b10) |
| Компактные вертикальные вкладки | `mod.compact.vertical.tabs` | Boolean | `true` | Делает вертикальные вкладки более компактными, чтобы они занимали меньше места. | ![Компактные вертикальные вкладки](https://github.com/user-attachments/assets/fbd97abb-6115-4861-888a-1c6aa4197f11) |
| Скрыть полосу прокрутки вертикальных вкладок | `mod.disable.scrollbar.in.vertical.tabs` | Boolean | `true` | Скрывает полосу прокрутки, когда список вертикальных вкладок переполняет доступную область. | ![Полоса прокрутки вертикальных вкладок](https://github.com/user-attachments/assets/9d9bca08-67cc-4d91-babe-d56938f07095) |
| Рамка окна — стиль 1 | `mod.main.window.frame.style-1` | Boolean | `true` | Включает первый вариант оформления рамки окна Firefox. | ![Рамка окна](https://github.com/user-attachments/assets/1ca0e1a7-8330-4f80-bf35-7caee051ac2e) |
| Дополнительное размытие | `mod.combined.extra.blur` | Boolean | `true` | Включает дополнительные эффекты размытия интерфейса, предусмотренные модификацией. | [Исходный проект](https://github.com/datguypiko/Firefox-Mod-Blur) |
| Размытие фона новой вкладки | `mod.new-tab.background.blur` | Number | От `1` до `10`, по умолчанию `4` | Задаёт интенсивность размытия фона на странице новой вкладки. | [Исходный проект](https://github.com/datguypiko/Firefox-Mod-Blur) |
| Тема карточек — стиль 1 | `mod.card-theme.style.1` | Boolean | `true` | Включает первый вариант оформления карточек на странице новой вкладки. | [Исходный проект](https://github.com/datguypiko/Firefox-Mod-Blur) |
| Центрирование вкладок | `mod.centered.tabs` | Boolean | `true` | Выравнивает вкладки по центру в соответствии со стилем модификации. | ![Центрирование вкладок](https://github.com/user-attachments/assets/2a74fd5a-ae63-4469-a502-d6482fadd62e) |
| Всегда показывать кнопки информации о сайте | `mod.search.info.buttons.show.always` | Boolean | `true` | Постоянно отображает кнопки информации о сайте в адресной строке, а не только при определённых состояниях интерфейса. | ![Кнопки информации о сайте](https://github.com/user-attachments/assets/147a8ee1-3cf7-40ac-9d21-3e123172ddd8) |

## Дополнительные CSS-моды

В таблице перечислены отдельные CSS-модификации. В столбце «Скриншот» показан предварительный просмотр, если он есть в репозитории. Нажмите на изображение, чтобы открыть его в полном размере. Подключайте модификации по одной и проверяйте результат.

| Файл или модификация | Что делает | Скриншот |
| --- | --- | --- |
| [`cleaner_extensions_menu.css`](chrome/cleaner_extensions_menu.css) | Делает меню расширений компактнее: позволяет настраивать размер значков и число значков в строке, уменьшает отступы и скрывает некоторые элементы меню. | — |
| [`colored_soundplaying_tab.css`](chrome/colored_soundplaying_tab.css) | Подсвечивает фоном неактивную вкладку, в которой воспроизводится звук. Цвет задаётся переменной `--firefoxcss-colored-sound-tab`. | — |
| [`icons_in_main_menu.css`](chrome/icons_in_main_menu.css) | Добавляет значки к пунктам главного меню Firefox. | — |
| [`menu_icon_change_to_firefox.css`](chrome/menu_icon_change_to_firefox.css) | Заменяет значок главного меню логотипом Firefox; предусмотрены варианты для светлой, тёмной и приватной темы. | — |
| [`min-max-close_buttons.css`](chrome/min-max-close_buttons.css) | Оформляет кнопки сворачивания, разворачивания и закрытия окна в стиле macOS и размещает их рядом с панелью вкладок. | — |
| [`only_show_list-all-tabs_when_tabs_overflowing.css`](chrome/only_show_list-all-tabs_when_tabs_overflowing.css) | Показывает кнопку списка всех вкладок только тогда, когда вкладки не помещаются в панели. | — |
| [`remove_folder_icons_from_bookmarks.css`](chrome/remove_folder_icons_from_bookmarks.css) | Скрывает значки папок на панели закладок, оставляя названия. | — |
| [`thin_scrollbar_windows10.css`](chrome/thin_scrollbar_windows10.css) | Делает полосы прокрутки тоньше. В комментарии к файлу указано, что он ориентирован на Windows 10; на других системах результат может отличаться. | — |
| [`ublock-icon-change.css`](chrome/ublock-icon-change.css) | Стили для изменения значка uBlock Origin. | — |
| [`white_github_icon_in_bookmarks.css`](chrome/white_github_icon_in_bookmarks.css) | Заменяет значок GitHub на панели закладок белой версией для лучшей видимости на тёмном фоне. | — |
| **Вкладки: закреплённые без фона** — [CSS](chrome/EXTRA%20MODS/1Tabs%20Bar%20Mods/Pinned%20Tabs%20-%20no%20background%20color/pinned_tabs_no_bg_color.css) | Убирает фон у закреплённых вкладок, чтобы они визуально отличались от обычных. | ![Закреплённые вкладки без фона](chrome/EXTRA%20MODS/1Tabs%20Bar%20Mods/Pinned%20Tabs%20-%20no%20background%20color/preview.png) |
| **Вкладки: обратный цвет фона** — [CSS](chrome/EXTRA%20MODS/1Tabs%20Bar%20Mods/Tabs%20-%20reversed%20background%20color/reversed_tabs_bg_color.css) | Меняет распределение фоновых цветов вкладок на противоположное относительно базового оформления. | ![Вкладки с обратным цветом фона](chrome/EXTRA%20MODS/1Tabs%20Bar%20Mods/Tabs%20-%20reversed%20background%20color/preview.png) |
| **Вкладки: прозрачный фон** — [CSS](chrome/EXTRA%20MODS/1Tabs%20Bar%20Mods/Tabs%20-%20transparent%20background%20color/transparent_tabs_bg_color.css) | Делает фон вкладок прозрачным, позволяя лучше сочетать вкладки с фоном темы. | ![Вкладки с прозрачным фоном](chrome/EXTRA%20MODS/1Tabs%20Bar%20Mods/Tabs%20-%20transparent%20background%20color/preview.png) |
| **Автоматическое скрытие панели вкладок и закладок** — [CSS](chrome/EXTRA%20MODS/Autohide%20tab%20and%20bookmarks%20bar/autohide_tab_and_bookmarks_bars.css) | Автоматически скрывает панели вкладок и закладок, освобождая место на экране; способ активации и детали смотрите в [инструкции](chrome/EXTRA%20MODS/Autohide%20tab%20and%20bookmarks%20bar/installation.txt). | — |
| **Кнопки macOS слева** — [CSS](chrome/EXTRA%20MODS/Left%20side%20MacOS%20style%20buttons/min-max-close_buttons.css) | Размещает круглые кнопки закрытия, сворачивания и разворачивания слева, в стиле macOS. | ![Кнопки macOS слева](chrome/EXTRA%20MODS/Left%20side%20MacOS%20style%20buttons/Preview-left_mac_os_style.png) |
| **Кнопки macOS слева без анимации** — [CSS](chrome/EXTRA%20MODS/Left%20side%20MacOS%20style%20buttons/Without%20animation/min-max-close_buttons.css) | Тот же вариант кнопок слева, но без анимационных эффектов. | ![Кнопки слева без анимации](chrome/EXTRA%20MODS/Left%20side%20MacOS%20style%20buttons/Without%20animation/preview.gif) |
| **Скрытие подписей ярлыков домашней страницы** — [CSS](chrome/EXTRA%20MODS/Remove%20text%20from%20homepage%20shortcuts/remove_homepage_shortcut_title_text.css) | Скрывает текстовые названия ярлыков на странице новой вкладки, оставляя значки сайтов. | ![Ярлыки без подписей](chrome/EXTRA%20MODS/Remove%20text%20from%20homepage%20shortcuts/preview.png) |
| **Кнопки macOS справа** — [CSS](chrome/EXTRA%20MODS/Right%20side%20MacOS%20style%20buttons/min-max-close_buttons.css) | Размещает кнопки управления окном справа, сохраняя оформление в стиле macOS. | ![Кнопки macOS справа](chrome/EXTRA%20MODS/Right%20side%20MacOS%20style%20buttons/Preview.png) |
| **Кнопки macOS справа, вариант MenuButtonsOnLeft** — [CSS](chrome/EXTRA%20MODS/Right%20side%20MacOS%20style%20buttons/MenuButtonsOnLeft/min-max-close_buttons.css) | Вариант расположения кнопок окна справа с дополнительной настройкой положения кнопок меню. | ![Вариант MenuButtonsOnLeft](chrome/EXTRA%20MODS/Right%20side%20MacOS%20style%20buttons/MenuButtonsOnLeft/Preview-right_mac_os_style.png) |
| **Кнопки macOS справа без анимации** — [CSS](chrome/EXTRA%20MODS/Right%20side%20MacOS%20style%20buttons/Without%20animation/min-max-close_buttons.css) | Вариант кнопок справа без анимационных эффектов. | ![Кнопки справа без анимации](chrome/EXTRA%20MODS/Right%20side%20MacOS%20style%20buttons/Without%20animation/preview.gif) |
| **Кнопки macOS справа без анимации, MenuButtonsOnLeft** — [CSS](chrome/EXTRA%20MODS/Right%20side%20MacOS%20style%20buttons/Without%20animation/MenuButtonsOnLeft/min-max-close_buttons.css) | Комбинирует вариант кнопок справа без анимации с вариантом расположения кнопок меню. | ![Вариант без анимации MenuButtonsOnLeft](chrome/EXTRA%20MODS/Right%20side%20MacOS%20style%20buttons/Without%20animation/MenuButtonsOnLeft/Preview-right_mac_os_style.png) |
| **Прозрачная панель закладок** — [инструкция и файлы](chrome/EXTRA%20MODS/Transparent%20bookmarks%20bar/) | Делает панель закладок прозрачной, чтобы она сочеталась с фоном интерфейса. | ![Прозрачная панель закладок](chrome/EXTRA%20MODS/Transparent%20bookmarks%20bar/preview.jpg) |

### Дополнительные ресурсы

- [`chrome/ASSETS/icons/`](chrome/ASSETS/icons/) — изображения значков, используемые оформлением, включая варианты логотипа Firefox и значки поисковых систем.
- [`chrome/ASSETS/other/`](chrome/ASSETS/other/) — вспомогательные графические ресурсы, например текстура шума.
- [`chrome/ASSETS/wallpaper/`](chrome/ASSETS/wallpaper/) — изображения обоев, которые могут использоваться оформлением.
- [`chrome/EXTRA MODS/`](chrome/EXTRA%20MODS/) — дополнительные модификации, которые не следует подключать одновременно, если они меняют один и тот же элемент интерфейса.

**Важно:** CSS-файлы в `chrome/` не обязательно активны автоматически. Проверяйте импорты в `userChrome.css` и подключайте дополнительные моды по одному, чтобы избежать конфликтов.
