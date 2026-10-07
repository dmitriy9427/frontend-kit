# Плагины и общие библиотеки проекта

Что делать с кодом, который нужен **всему сайту**, а не конкретному блоку: GSAP с плагинами,
аналитика, сбор ошибок, настройки внешних ссылок.

| Что                                            | Где                                     | Как подключается                                             |
| ---------------------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| GSAP и его плагины, общие настройки анимаций   | `src/lib/gsap.js`                       | импортом: `import { gsap, SplitText } from '../lib/gsap.js'` |
| Другие общие утилиты (формат цены, API-клиент) | `src/lib/*.js`                          | импортом                                                     |
| Код «на весь сайт один раз»                    | `src/plugins/*.js`                      | **сам** при старте, до модулей                               |
| Поведение блока                                | `src/modules/`, `src/components/*/*.js` | сам, по `data-module`                                        |

## GSAP: одно место регистрации — `src/lib/gsap.js`

```js
// src/lib/gsap.js
import { gsap, ScrollTrigger } from 'kit/js/core/gsap.js' // уже с ScrollTrigger и фиксом для мобилок
import { SplitText } from 'gsap/SplitText'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(SplitText, ScrollToPlugin)
gsap.defaults({ ease: 'power3.out', duration: 0.8 }) // «характер» анимаций проекта
gsap.registerEase('brand', (p) => 1 - Math.pow(1 - p, 4))

export { gsap, ScrollTrigger, SplitText, ScrollToPlugin }
```

Во всём проекте — только отсюда:

```js
// src/components/hero/hero.js
import { gsap, SplitText } from '../../lib/gsap.js' // в Vite можно и '@/lib/gsap.js'

export default function hero(el, ctx) {
  if (ctx.reduced) return
  const split = SplitText.create(el.querySelector('h1'), { type: 'lines', mask: 'lines' })
  const tween = gsap.from(split.lines, { yPercent: 100, stagger: 0.08, ease: 'brand' })
  return { destroy: () => (tween.kill(), split.revert()) }
}
```

Зачем так, а не `import gsap from 'gsap'` в каждом файле:

- **плагин точно зарегистрирован.** Забытый `registerPlugin` — частый баг: анимация молча
  не работает или «SplitText is not defined» только на одной странице;
- **общие настройки в одном месте.** Заказчик просит «анимации помягче» — меняется одна строка;
- **видно, какие плагины в проекте**, — и что попадёт в бандл.

Добавить плагин: импорт + `registerPlugin` + `export` в `src/lib/gsap.js`. Список плагинов —
https://gsap.com/docs/v3/Plugins/ (все бесплатные с GSAP 3.13).

Что **не** надо класть в `lib/gsap.js`: тяжёлое и редкое (MorphSVG для одного баннера,
Physics2D для одной игры). Всё, что импортировано в `lib/gsap.js`, загружается на всех
страницах. Редкий плагин импортируйте прямо в модуле, где он нужен, — он уйдёт в ленивый
файл этого модуля. Модули кита так и делают (`registerPlugin` безопасно вызывать много раз).

## Плагины приложения — `src/plugins/`

Файл в `src/plugins/` запускается **сам** один раз при старте (`src/main.js` →
`pluginsFromGlob`) — до модулей, чтобы их события и анимации уже попадали в настроенную
среду. Порядок — по имени: `01-…`, `02-…`.

```js
// src/plugins/03-errors.js — ошибки JS отправляются на сервер
export default function errors() {
  const onError = (event) => {
    navigator.sendBeacon('/api/log', JSON.stringify({ message: event.message, url: location.href }))
  }
  window.addEventListener('error', onError)
  return () => window.removeEventListener('error', onError) // уборка (необязательно)
}
```

Плагин получает `{ ctx, modules }`: шину событий, плавный скролл, доступ к модулям.
Создать: `npm run new -- plugin 03-errors`.

В стартере два примера:

- `01-external-links.js` — внешние ссылки открываются в новой вкладке с `rel="noopener"`
  (в том числе ссылки из текстов CMS);
- `02-analytics.js` — события модулей (`price:order`) → цели Яндекс Метрики. Модули не знают
  про счётчик: они шлют события, а плагин решает, какие из них — цели;
- `03-tooltips.js` — подсказки `data-tooltip` на всём сайте ([modules.md → tooltip](modules.md#tooltip)).

## Плавный скролл и блоки со своей прокруткой

Lenis (плавный скролл) перехватывает колесо мыши. Чтобы внутри модалки, выпадающего списка,
таблицы крутился **блок, а не страница**, в ките три слоя защиты
(`kit/js/core/smooth-scroll.js`):

1. **`allowNestedScroll: true`** — Lenis сам проверяет, может ли блок под курсором
   прокрутиться (`overflow: auto/scroll` и есть куда). Свои таблицы, блоки кода, чаты
   работают без атрибутов. Докрутили блок до конца — колесо снова крутит страницу.
2. **Список блоков кита** (`NESTED_SCROLL`): `dialog`, `[popover]`, мобильное меню,
   выпадающий список селекта, `textarea`, `iframe`, `.scroll-area`, `[data-lenis-prevent]`.
3. **Вручную:** атрибут `data-lenis-prevent` (или `-vertical`, `-horizontal`, `-wheel`,
   `-touch`) или опция проекта:

```js
createApp({ smooth: { prevent: (node) => node.matches('.chat__messages, .map') }, … })
```

Готовый класс для своего блока с прокруткой:

```html
<div class="scroll-area" style="max-height: 400px">длинная таблица…</div>
```

`.scroll-area` = `overflow: auto` + `overscroll-behavior: contain` (докрутили до конца —
страница не «протаскивается»), и Lenis его не трогает.

## Красивые скроллбары

Два слоя, оба — в цветах темы (переменные `--scrollbar-thumb`, `--scrollbar-thumb-hover`,
`--scrollbar-size` в `kit/scss/base/_scrollbar.scss`):

|                                       | CSS (по умолчанию)              | Модуль `scrollbar`                                  |
| ------------------------------------- | ------------------------------- | --------------------------------------------------- |
| Где                                   | вся страница и все блоки        | отдельный блок: `data-module="scrollbar"`           |
| Как выглядит                          | тонкий системный, в цветах темы | поверх содержимого, прячется, одинаковый во всех ОС |
| JS                                    | нет                             | OverlayScrollbars (~15 КБ, лениво)                  |
| Ломает sticky / ScrollTrigger / Lenis | нет                             | нет (только для блоков, не для body)                |

Почему не SimpleBar или OverlayScrollbars на всю страницу: они заменяют прокрутку окна
прокруткой своего блока — ломаются `position: sticky`, ScrollTrigger, Lenis, якоря и
восстановление позиции при «Назад».
