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

## Основные возможности

### Общий вид темы

| Возможность | Скриншот из исходного проекта |
| --- | --- |
| Общий вид Firefox-Mod-Blur | ![Общий вид Firefox-Mod-Blur](https://i.imgur.com/ChlWHFp.png) |
| Кнопки окна в стиле macOS | ![Кнопки окна в стиле macOS](https://i.imgur.com/cvBzN61.gif) |
| Светлая и тёмная темы | ![Светлая и тёмная темы](https://github.com/datguypiko/Firefox-Mod-Blur/assets/61329159/08099fbc-8b04-4f04-9f57-9b73911fd0c0) |
| Обновлённое контекстное меню | ![Контекстное меню](https://i.imgur.com/uG9BgQH.png) |
| Компактная адресная строка | ![Компактная адресная строка](https://i.imgur.com/gu3HnMx.gif) |
| Компактная домашняя страница | ![Домашняя страница](https://i.imgur.com/lhc2Muh.gif) |

### Кнопки управления окном

В исходном проекте есть разные варианты расположения кнопок сворачивания, разворачивания и закрытия. Подключайте только один вариант.

<details><summary>Скриншоты вариантов</summary>

**Кнопки слева, стиль macOS**

![Кнопки слева, macOS](https://i.imgur.com/pR78PN5.png)

**Кнопки справа, стиль macOS**

![Кнопки справа, macOS](https://i.imgur.com/032WjXp.png)

**Кнопки справа, стиль ОС**

![Кнопки справа, стиль ОС](https://i.imgur.com/uTcbB4p.png)

**Кнопки слева, стиль ОС**

![Кнопки слева, стиль ОС](https://github.com/datguypiko/Firefox-Mod-Blur/assets/61329159/45180997-9195-48bd-a135-9de65c4a27ac)

**Стандартный стиль**

![Стандартный стиль](https://github.com/datguypiko/Firefox-Mod-Blur/assets/61329159/cddf0baf-0f9e-4467-a47f-77036361999f)

</details>

### Панель закладок

<details><summary>Скриншоты модификаций панели закладок</summary>

**Показывать панель при наведении**

![Панель закладок при наведении](https://i.imgur.com/Hjy8kyU.gif)

**Убрать значки папок у закладок**

![Закладки без значков папок](https://i.imgur.com/xxpKEaP.gif)

**Цвет панели закладок совпадает с панелью инструментов**

![Одинаковый цвет панелей](https://i.imgur.com/a2sjphq.gif)

**Прозрачная панель закладок**

![Прозрачная панель закладок](https://user-images.githubusercontent.com/61329159/209413186-8fbb75ec-f058-4a74-87bc-61141fe7efea.jpg)

</details>

### Меню расширений

| Возможность | Скриншот из исходного проекта |
| --- | --- |
| Компактное меню — стиль 1 | ![Меню расширений, стиль 1](https://github.com/datguypiko/Firefox-Mod-Blur/blob/master/EXTRA%20MODS/Compact%20extensions%20menu/Style%201/preview.gif?raw=true) |
| Компактное меню — стиль 2 | ![Меню расширений, стиль 2](https://github.com/datguypiko/Firefox-Mod-Blur/blob/master/EXTRA%20MODS/Compact%20extensions%20menu/Style%202/preview.png?raw=true) |
| Количество расширений в строке | ![Количество расширений в строке](https://github.com/user-attachments/assets/f73ed998-c70e-441e-8572-3361b4793cca) |
| Размер значков расширений | ![Размер значков расширений](https://github.com/user-attachments/assets/1d7c0815-dff3-4c4f-9f12-3a981e989e0b) |
| Скрыть кнопку управления расширениями | ![Кнопка управления расширениями](https://github.com/user-attachments/assets/eb191a66-3cb5-4f2c-905d-57c44fef941f) |
| Скрыть разделитель меню | ![Разделитель меню](https://github.com/user-attachments/assets/f40b7043-9917-46a4-b3c1-4eb0ea510ed3) |
| Скрыть неактивные расширения | ![Неактивные расширения](https://github.com/user-attachments/assets/531b9958-40f0-4e12-95dd-649519670b10) |

### Приватность

<details><summary>Показать скриншоты приватных модификаций</summary>

**Скрытие почты в главном меню**

![Скрытие почты в главном меню](https://i.imgur.com/gE2PVpr.gif)

**Скрытие почты в меню синхронизации**

![Скрытие почты в меню синхронизации](https://i.imgur.com/MJqZ9TW.gif)

**Размытие содержимого вкладок**

![Размытие содержимого вкладок](https://i.imgur.com/8RPR1It.gif)

**Изменение отображаемого адреса почты**

![Изменение текста почты](https://i.imgur.com/uuq06p5.png)

</details>

### Вкладки

<details><summary>Скриншоты модификаций вкладок</summary>

**Компактные вертикальные вкладки** — `mod.compact.vertical.tabs`

![Компактные вертикальные вкладки](https://github.com/user-attachments/assets/fbd97abb-6115-4861-888a-1c6aa4197f11)

**Центрирование вкладок** — `mod.centered.tabs`

![Центрированные вкладки](https://github.com/user-attachments/assets/2a74fd5a-ae63-4469-a502-d6482fadd62e)

**Скрыть панель предпросмотра вкладки** — `firefoxcss.disable.tab.preview.panel.fully`

![Отключённый предпросмотр вкладки](https://github.com/user-attachments/assets/dd684579-3142-4245-9e75-f0cd29e1d1e6)

**Скрыть полосу прокрутки вертикальных вкладок** — `mod.disable.scrollbar.in.vertical.tabs`

![Полоса прокрутки вертикальных вкладок](https://github.com/user-attachments/assets/9d9bca08-67cc-4d91-babe-d56938f07095)

**Размещение вкладок сверху** — `firefoxcss.tabs.on.top.enable`

![Вкладки сверху](https://github.com/user-attachments/assets/a3b86a6f-9627-4534-b493-04c06c7087ae)

**Фиксированная ширина активной вкладки**

![Фиксированная ширина активной вкладки](https://github.com/datguypiko/Firefox-Mod-Blur/assets/61329159/4dc26c78-6714-43f8-bfb5-b17a0dab3b920)

**Цветная вкладка при воспроизведении звука**

![Цветная вкладка со звуком](https://github.com/datguypiko/Firefox-Mod-Blur/assets/61329159/8963e4fb-491f-440f-84c1-ec1629da4074)

**Кнопка списка всех вкладок**

![Кнопка списка всех вкладок](https://i.imgur.com/M669iGJ.gif)

</details>

### Адресная строка и рамка окна

<details><summary>Показать скриншоты параметров about:config</summary>

**Контур фокуса поисковой строки** — `mod.searchBox.focus.outline.enable`

![Контур фокуса поисковой строки](https://github.com/user-attachments/assets/52537d21-347b-4d3c-9ebf-d3b3e1ba3af9)

**Всегда показывать кнопки информации о сайте** — `mod.search.info.buttons.show.always`

![Кнопки информации в адресной строке](https://github.com/user-attachments/assets/147a8ee1-3cf7-40ac-9d21-3e123172ddd8)

**Пользовательская рамка окна** — `mod.main.window.frame.style-1` или `mod.main.window.frame.style-2`

![Пользовательская рамка окна](https://github.com/user-attachments/assets/1ca0e1a7-8330-4f80-bf35-7caee051ac2e)

**Стандартная рамка и тень Firefox** — в исходном проекте восстанавливается отключением `mod.disable.browser.border-and-shadow`

![Стандартная рамка и тень](https://github.com/user-attachments/assets/0370b503-f02d-4260-92dc-e09c9d948144)

</details>

## Дополнительные настройки about:config

Откройте `about:config`, найдите параметр и измените значение. Если параметра нет, создайте его с указанным типом. Для включения Boolean-параметров установите `true`.

| Функция | Параметр | Тип | Значение | Пояснение | Скриншот |
| --- | --- | --- | --- | --- | --- |
| Скрыть неактивные расширения | `mod.hide.faded-extensions.inside.extensions-menu` | Boolean | `true` | Скрывает неактивные или визуально приглушённые расширения в меню расширений. | ![Скрытие неактивных расширений](https://github.com/user-attachments/assets/531b9958-40f0-4e12-95dd-649519670b10) |
| Компактные вертикальные вкладки | `mod.compact.vertical.tabs` | Boolean | `true` | Делает вертикальные вкладки более компактными, чтобы они занимали меньше места. | ![Компактные вертикальные вкладки](https://github.com/user-attachments/assets/fbd97abb-6115-4861-888a-1c6aa4197f11) |
| Скрыть полосу прокрутки вертикальных вкладок | `mod.disable.scrollbar.in.vertical.tabs` | Boolean | `true` | Скрывает полосу прокрутки, когда список вертикальных вкладок переполняет доступную область. | ![Полоса прокрутки вертикальных вкладок](https://github.com/user-attachments/assets/9d9bca08-67cc-4d91-babe-d56938f07095) |
| Рамка окна — стиль 1 | `mod.main.window.frame.style-1` | Boolean | `true` | Включает первый вариант оформления рамки окна Firefox. | ![Рамка окна](https://github.com/user-attachments/assets/1ca0e1a7-8330-4f80-bf35-7caee051ac2e) |
| Дополнительное размытие | `mod.combined.extra.blur` | Boolean | `true` | Включает дополнительные эффекты размытия интерфейса, предусмотренные модификацией. | [Исходный проект](https://github.com/datguypiko/Firefox-Mod-Blur) |
| Размытие фона новой вкладки | `mod.new-tab.background.blur` | Number | От `1` до `10`, по умолчанию `4` | Задаёт интенсивность размытия фона на странице новой вкладки. | [Исходный проект](https://github.com/datguypiko/Firefox-Mod-Blur) |
| Тема карточек — стиль 1 | `mod.card-theme.style.1` | Boolean | `true` | Включает первый вариант оформления карточек на странице новой вкладки. | [Исходный проект](https://github.com/datguypiko/Firefox-Mod-Blur) |
| Центрирование вкладок | `mod.centered.tabs` | Boolean | `true` | Выравнивает вкладки по центру в соответствии со стилем модификации. | ![Центрирование вкладок](https://github.com/user-attachments/assets/2a74fd5a-ae63-4469-a502-d6482fadd62e) |
| Всегда показывать кнопки информации о сайте | `mod.search.info.buttons.show.always` | Boolean | `true` | Постоянно отображает кнопки информации о сайте в адресной строке, а не только при определённых состояниях интерфейса. | ![Кнопки информации о сайте](https://github.com/user-attachments/assets/147a8ee1-3cf7-40ac-9d21-3e123172ddd8) |

### Сброс настройки

В `about:config` найдите параметр. Для пользовательского параметра можно удалить запись или установить Boolean в `false`. Не удаляйте параметры Firefox, назначение которых вам неизвестно.

## Дополнительные CSS-моды

В каталоге [`chrome/EXTRA MODS/`](chrome/EXTRA%20MODS/) лежат необязательные стили: варианты кнопок окна, прозрачная панель закладок, скрытие названий ярлыков домашней страницы и другие эффекты. Перед подключением прочитайте `installation.txt` или `readme.txt`, если такой файл есть. Некоторые моды конфликтуют друг с другом или требуют ручного добавления `@import` в `userChrome.css`.

## Устранение проблем

- Если Firefox выглядит некорректно, временно уберите дополнительные `@import` и включайте их по одному.
- Если интерфейс не меняется, проверьте `toolkit.legacyUserProfileCustomizations.stylesheets` и перезапустите Firefox.
- После крупных обновлений Firefox проверьте совместимость CSS-селекторов.
- Чтобы вернуться к исходному интерфейсу, удалите пользовательские CSS-файлы из папки профиля `chrome` или восстановите резервную копию.

## Источник

Проект-источник: [datguypiko/Firefox-Mod-Blur](https://github.com/datguypiko/Firefox-Mod-Blur). Скриншоты принадлежат исходному проекту и приведены для демонстрации функций. Смотрите оригинальный README и [релизы](https://github.com/datguypiko/Firefox-Mod-Blur/releases) для актуальной информации о совместимости.
