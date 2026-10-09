# Библиотеки: что, зачем и где

Все версии — в `package.json` шаблона (один источник правды). Проект получает только пакеты
своего стека. Как обновлять — [create-and-update.md](create-and-update.md#6-обновить-библиотеки-npm-пакеты).

Правило кита: **тяжёлая библиотека грузится, только если на странице есть блок, которому
она нужна.** Модули кита ленивые (`lazy()` в `kit/js/modules/index.js`), поэтому страница
без слайдера не скачивает Swiper, а без WebGL-ленты — three.js.

## Работают в браузере (dependencies)

| Пакет                    | Зачем                                                                    | Где в ките                                                                                        | Когда грузится                                | Документация                         |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| **gsap**                 | анимации: появление, параллакс, счётчики, Flip, SplitText, ScrollTrigger | `kit/js/core/gsap.js` (ScrollTrigger), модули reveal, split-text, hscroll, lightbox, flip-filter… | ядро + плагины в модулях                      | gsap.com/docs                        |
| **lenis**                | плавный скролл страницы (нативный скролл, без обёрток)                   | `kit/js/core/smooth-scroll.js`                                                                    | сразу (выключен на таче и при reduced motion) | github.com/darkroomengineering/lenis |
| **swiper**               | слайдер с петлёй, эффектами, миниатюрами                                 | модуль `swiper`                                                                                   | только при `data-module="swiper"`             | swiperjs.com                         |
| **three**                | WebGL: 3D-барабан бесконечной ленты                                      | `infinite-slider/gl-renderer.js`                                                                  | только при WebGL-режиме ленты                 | threejs.org/docs                     |
| **overlayscrollbars**    | «плавающий» скроллбар у блоков                                           | модуль `scrollbar`, `kit/js/core/scrollbars.js` (селект, модалка)                                 | первый такой блок и только с мышью            | kingsora.github.io/OverlayScrollbars |
| **@floating-ui/dom**     | позиция подсказки: переворот у края, сдвиг, стрелка                      | модуль `tooltip`                                                                                  | при первом показе подсказки                   | floating-ui.com                      |
| **react**, **react-dom** | React-стартеры                                                           | `kit/react/`                                                                                      | —                                             | react.dev                            |
| **react-router**         | маршруты React-стартеров                                                 | `starters/react*/src/App.jsx`                                                                     | —                                             | reactrouter.com                      |

Чего в ките нет намеренно и чем закрыто:

| Обычно берут          | В ките                            | Почему                                               |
| --------------------- | --------------------------------- | ---------------------------------------------------- |
| jQuery                | DOM API + `kit/js/core/dom.js`    | браузеры давно умеют всё сами                        |
| Inputmask, IMask      | модуль `mask` (9 масок)           | маленький, свой, с тестами, ИНН с контрольной суммой |
| Yup, Zod, Validate.js | `kit/js/form` — схемы в стиле zod | без зависимостей, работает и без сборщика            |
| Fancybox, PhotoSwipe  | модуль `lightbox` (GSAP Flip)     | уже есть GSAP — плюс 0 КБ библиотек                  |
| Tippy.js              | модуль `tooltip` (Floating UI)    | Tippy не развивается, Floating UI — его преемник     |
| SimpleBar             | CSS + OverlayScrollbars           | см. [plugins.md](plugins.md#красивые-скроллбары)     |
| AOS, WOW.js           | модуль `reveal` (GSAP)            | одна библиотека анимаций вместо двух                 |
| Choices.js, Select2   | модуль `select`                   | доступность, поиск, мультивыбор, загрузка с сервера  |

## Только при разработке и сборке (devDependencies)

| Пакет                                                                  | Зачем                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **vite**                                                               | dev-сервер и сборка (vanilla, React)                                                    |
| **astro**, **@astrojs/sitemap**, **@astrojs/check**                    | Astro-стартер, карта сайта, проверка типов `.astro`                                     |
| **@vitejs/plugin-react**                                               | JSX и быстрый refresh в React-стартерах                                                 |
| **sass**                                                               | SCSS кита и проектов                                                                    |
| **htmlparser2**, **dom-serializer**, **domhandler**                    | разбор HTML для компонентов `<x-…>` (`kit/vite/html-components.js`) — только при сборке |
| **typescript**, **typescript-eslint**, **@types/***                    | проверка типов: JSDoc в JS, стартер react-ts                                            |
| **eslint**, **@eslint/js**, **globals**, **eslint-plugin-react-hooks** | проверка JS: ошибки, правила хуков React                                                |
| **stylelint**, **stylelint-config-standard-scss**                      | проверка SCSS (БЭМ, порядок)                                                            |
| **prettier**                                                           | единое оформление кода                                                                  |
| **vitest**, **jsdom**, **@vitest/coverage-v8**                         | тесты и покрытие                                                                        |
| **@testing-library/react**, **@testing-library/dom**                   | тесты React-компонентов                                                                 |

## Какому модулю что нужно

| Модуль кита                                                                                                                                                                                       | Библиотеки                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| reveal, split-text, counter, parallax, magnetic, marquee, hscroll, stack-cards, scramble-text, draw-svg, cursor, flip-filter, lightbox, scroll-progress                                           | gsap (+ его плагины)                |
| swiper                                                                                                                                                                                            | swiper                              |
| infinite-slider                                                                                                                                                                                   | gsap; three — только в режиме WebGL |
| infinite-gallery                                                                                                                                                                                  | gsap                                |
| tooltip                                                                                                                                                                                           | @floating-ui/dom                    |
| scrollbar, select (скроллбар списка), dialog (скроллбар окна)                                                                                                                                     | overlayscrollbars                   |
| accordion, tabs, dialog, menu, sticky-header, theme-switch, form, mask, select, toast, stepper, autosize, password, char-counter, file-upload, lazy-video, lang-switch, slider, range, scroll-top | — (без библиотек)                   |

## Добавить библиотеку в проект

1. `npm install имя` (в проекте; нужна во всех проектах — в шаблоне).
2. Импортируйте **в модуле**, где она нужна, — модуль ленивый, библиотека уйдёт в его
   отдельный файл и не будет грузиться на других страницах.
3. Если это плагин GSAP — регистрируйте в `src/lib/gsap.js` ([plugins.md](plugins.md)).
4. Код на весь сайт (виджет чата, счётчик) — плагин в `src/plugins/`.
5. Проверьте размер: `npm run build` печатает размеры файлов; основной бандл должен остаться
   небольшим (~150 КБ без gzip у vanilla-стартера).
