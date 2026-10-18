# Firefox Customization

Набор CSS-модов для пользовательского профиля Firefox, подготовленный на основе [Firefox-Mod-Blur](https://github.com/datguypiko/Firefox-Mod-Blur). Здесь находятся основной `userChrome.css`, `userContent.css` и отдельные моды, которые можно подключать независимо.

## Установка

1. Откройте `about:config`, найдите `toolkit.legacyUserProfileCustomizations.stylesheets` и установите значение `true` (тип: Boolean).
2. Откройте `about:support`, найдите пункт «Папка профиля» и нажмите «Открыть папку».
3. Если папки `chrome` нет, создайте её в корне профиля.
4. Скопируйте файлы из `firefox-customization/chrome/` этого репозитория в папку `chrome` профиля Firefox. В частности, `userChrome.css` отвечает за интерфейс браузера, а `userContent.css` — за внутренние страницы Firefox.
5. При необходимости скопируйте нужные дополнительные CSS-файлы из `EXTRA MODS` в ту же папку `chrome` и добавьте для них `@import` в `userChrome.css`.
6. Перезапустите Firefox. После обновления Firefox или темы отдельные селекторы могут потребовать адаптации.

## Дополнительные настройки about:config

Некоторые моды Firefox-Mod-Blur включаются настройками ниже. Имена вводятся в `about:config`; если параметра нет, его можно создать через «Добавить» с указанным типом.

| Функция | Параметр | Тип | Значение |
| --- | --- | --- | --- |
| Extension menu changes | `mod.number.of.extensions.in.a.row` | Number | Например, `4` |
| More compact Vertical Tabs | `mod.compact.vertical.tabs` | Boolean | `true` |
| Hide scrollbar when Vertical tabs overflow | `mod.disable.scrollbar.in.vertical.tabs` | Boolean | `true` |
| Window Frame border mods | `mod.main.window.frame.style-1` | Boolean | `true` |
| Experimental: Extra Blur mods | `mod.combined.extra.blur` | Boolean | `true` |
| Wallpaper Blur in New tab page | `mod.new-tab.background.blur` | Number | От `1` до `10`, по умолчанию `4` |
| Card Style theme | `mod.card-theme.style.1` | Boolean | `true` |

Для Extension menu changes убедитесь, что `userChrome.css` импортирует `cleaner_extensions_menu.css`. В этой версии основной файл уже содержит такой импорт.

## Структура

`chrome/` содержит файлы, которые копируются в профиль Firefox. `ASSETS/` предназначена для изображений и других ресурсов темы. `EXTRA MODS/` содержит дополнительные, необязательные моды; используйте только те, которые нужны, чтобы избежать конфликтов.

## Предупреждение

Пользовательские CSS-моды используют внутреннюю разметку Firefox и не являются официальным API. Перед обновлением Firefox рекомендуется сохранить резервную копию папки `chrome` и проверять моды по одному.
