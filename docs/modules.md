# Модули

Модуль — это поведение, которое включается атрибутом `data-module="имя"`. Несколько модулей на
одном элементе — через пробел: `data-module="reveal magnetic"`. Настройки — атрибутами
`data-<модуль>-<настройка>` (или `ctx.options` из JS/React — они важнее атрибутов).

Живые примеры всех модулей — страницы **ui-kit.html** и **effects.html** стартера.

**В этом документе:** [каталог модулей кита](#каталог) ·
[нужно ли писать data-module](#нужно-ли-писать-data-module) · [свой модуль](#свой-модуль) ·
[связь модулей](#связь-модулей) · [жизненный цикл](#жизненный-цикл-и-подгружаемый-контент).

## Нужно ли писать data-module

| Ситуация                                              | data-module                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Компонент со своим JS (`src/components/card/card.js`) | **не нужен** — плагин ставит его корню сам                                |
| Модуль кита внутри компонента (`<x-faq>` = аккордеон) | пишется **один раз** в разметке компонента                                |
| Модуль кита/проекта на обычной разметке страницы      | нужен: `<div data-module="marquee">`                                      |
| Добавить модуль к компоненту в одном месте            | атрибутом вызова: `<x-button data-module="magnetic">` — допишется к корню |
| Разметка из CMS, htmx, «Показать ещё»                 | нужен; модули запустятся сами, когда блок появится в DOM                  |

Почему не «полностью автоматически» (например, по классу `.accordion`): атрибут — явное
«включи здесь поведение». По классу модуль запускался бы на любом блоке с таким классом —
в том числе в чужой разметке из CMS, где этого не ждали. Один и тот же класс часто нужен
только для стилей. А компоненты убирают ручную работу там, где она действительно повторяется.

Модули проекта и компонентов регистрируются **сами** по папкам (`src/main.js`):

```js
const components = modulesFromGlob(import.meta.glob(['./components/*/*.js', '!./components/**/*.test.js']))
const projectModules = modulesFromGlob(import.meta.glob(['./modules/*/index.js']))
createApp({ modules: { ...kitModules, ...projectModules, ...components } })
```

Имя модуля = имя файла (`card.js` → `card`) или папки (`modules/copy-link/index.js` →
`copy-link`). Одноимённый модуль проекта **заменяет** модуль кита — так правят кит под проект,
не трогая `kit/`.

## Каталог

| Модуль                                | Для чего                                              | Загрузка |
| ------------------------------------- | ----------------------------------------------------- | -------- |
| [reveal](#reveal)                     | Появление элементов при прокрутке                     | сразу    |
| [menu](#menu)                         | Мобильное меню (бургер)                               | сразу    |
| [sticky-header](#sticky-header)       | Шапка прячется при прокрутке вниз                     | сразу    |
| [theme-switch](#theme-switch)         | Светлая/тёмная тема                                   | сразу    |
| [accordion](#accordion)               | Раскрывающиеся блоки, FAQ                             | лениво   |
| [tabs](#tabs)                         | Вкладки (состояние в адресе)                          | лениво   |
| [dialog](#dialog)                     | Модальное окно (открывается и по ссылке #id)          | лениво   |
| [slider](#slider)                     | Карусель на scroll-snap                               | лениво   |
| [marquee](#marquee)                   | Бегущая строка                                        | лениво   |
| [split-text](#split-text)             | Заголовок появляется по строкам/словам/буквам         | лениво   |
| [counter](#counter)                   | Число «набегает»                                      | лениво   |
| [parallax](#parallax)                 | Параллакс                                             | лениво   |
| [magnetic](#magnetic)                 | Кнопка тянется за курсором                            | лениво   |
| [scroll-top](#scroll-top)             | Кнопка «Наверх»                                       | лениво   |
| [lazy-video](#lazy-video)             | Фоновое видео: грузится и играет, только когда видно  | лениво   |
| [form](#form)                         | Проверка, маски, отправка формы                       | лениво   |
| [mask](#mask)                         | Маска на отдельном поле                               | лениво   |
| [file-upload](#file-upload)           | Загрузка файлов                                       | лениво   |
| [password](#password)                 | Показать/скрыть пароль                                | лениво   |
| [autosize](#autosize)                 | Textarea растёт по тексту                             | лениво   |
| [char-counter](#char-counter)         | Счётчик символов                                      | лениво   |
| [stepper](#stepper)                   | Поле количества − 1 +                                 | лениво   |
| [toast](#toast)                       | Уведомления (`toast()` из JS или кнопки `data-toast`) | лениво   |
| [select](#select)                     | Красивый выпадающий список с поиском                  | лениво   |
| [lang-switch](#lang-switch)           | Переключатель языка                                   | лениво   |
| [swiper](#swiper)                     | Swiper: петля, эффекты, миниатюры, автопрокрутка      | лениво   |
| [infinite-slider](#infinite-slider)   | Бесконечная лента с инерцией (в т.ч. WebGL)           | лениво   |
| [infinite-gallery](#infinite-gallery) | Бесконечная галерея, тянется во все стороны           | лениво   |
| [lightbox](#lightbox)                 | Просмотр фото на весь экран                           | лениво   |
| [hscroll](#hscroll)                   | Горизонтальная прокрутка секции при скролле вниз      | лениво   |
| [flip-filter](#flip-filter)           | Фильтр карточек с плавной перестановкой               | лениво   |
| [stack-cards](#stack-cards)           | Карточки складываются стопкой при прокрутке           | лениво   |
| [scramble-text](#scramble-text)       | Текст «перебирает» символы                            | лениво   |
| [draw-svg](#draw-svg)                 | Линии SVG «рисуются»                                  | лениво   |
| [scroll-progress](#scroll-progress)   | Полоса прогресса чтения                               | лениво   |
| [cursor](#cursor)                     | Свой курсор                                           | лениво   |

«Лениво» — код модуля скачивается, только если такой блок есть на странице.

---

### reveal

Ставится на контейнер (хоть на `<main>`), анимирует потомков с `data-reveal`.

```html
<main data-module="reveal">
  <h2 data-reveal>Заголовок</h2>
  <p data-reveal="fade" data-reveal-delay="0.2">Текст</p>
</main>
```

Пресеты `data-reveal`: `up` (по умолчанию), `down`, `left`, `right`, `fade`, `scale`, `clip`.
Настройки корня: `start` ('top 85%'), `duration` (0.9), `stagger` (0.08), `once` (true).
Элементы, появляющиеся вместе, идут «волной».

### menu

На кнопку-бургер; панель — по id.

```html
<button class="burger" data-module="menu" data-menu-target="site-menu"><span class="burger__lines"></span></button>
<nav id="site-menu" class="mobile-menu" data-lenis-prevent>…</nav>
```

Настройки: `target`, `closeAbove` ('lg' — закрыть при расширении экрана), `labelOpen`, `labelClose`.
API: `open()`, `close()`, `toggle()`. Событие `menu:toggle`. Esc, клик по ссылке — закрывают.

### sticky-header

```html
<header class="header" data-module="sticky-header">…</header>
```

Классы `is-scrolled`, `is-hidden`. Пишет высоту шапки в `--header-height` (для якорей).
Настройки: `hide` (true), `offset` (80), `tolerance` (8).

### theme-switch

```html
<button class="theme-switch" data-module="theme-switch" aria-label="Тёмная тема"></button>
```

Тема — `data-theme` на `<html>`, запоминается. Без выбора — системная. Инлайн-скрипт в `<head>`
стартера применяет тему до отрисовки (без «вспышки»).

### accordion

```html
<div class="accordion" data-module="accordion">
  <div class="accordion__item" data-accordion-item data-open>
    <h3><button class="accordion__trigger" data-accordion-trigger>Вопрос</button></h3>
    <div class="accordion__panel" data-accordion-panel><div class="accordion__inner">Ответ</div></div>
  </div>
</div>
```

Настройки: `multiple` (false), `hash` (true — открыть пункт, чей `id` в адресе).
API: `open(i)`, `close(i)`, `toggle(i)`, `isOpen(i)`. Событие `accordion:toggle`.
`.accordion__inner` обязателен — на нём держится анимация высоты.

### tabs

```html
<div class="tabs" data-module="tabs" id="product">
  <div class="tabs__list" data-tabs-list>
    <button class="tabs__tab" data-tabs-tab>Описание</button>
    <button class="tabs__tab" data-tabs-tab>Отзывы</button>
  </div>
  <div class="tabs__panel" data-tabs-panel id="about">…</div>
  <div class="tabs__panel" data-tabs-panel id="reviews">…</div>
</div>
```

Открытая вкладка хранится в адресе: `?product=reviews` — после перезагрузки и по ссылке
откроется она же. Имя параметра: `data-tabs-param` → `id` корня → `tab`. Значение:
`data-tabs-value` вкладки → `id` панели → номер с 1. Вкладка по умолчанию в адрес не пишется.
Настройки: `active` (0), `url` (true), `param`. API: `select(i)`, `index`. Событие `tabs:change`.

### dialog

```html
<button data-dialog-open="callback">Заказать звонок</button>
<a href="#callback">или ссылкой</a>
<dialog id="callback" class="dialog" data-module="dialog" aria-labelledby="callback-title">
  <div class="dialog__box">
    <button class="dialog__close" data-dialog-close aria-label="Закрыть">×</button>
    <h2 id="callback-title">Заказать звонок</h2>
  </div>
</dialog>
```

Адрес `/page#callback` открывает окно сразу — ссылку можно отправить. Открытие добавляет
запись в историю: «Назад» на телефоне закрывает окно.
Настройки: `closeOnBackdrop` (true), `closeTimeout` (400), `hash` (true).
API: `open()`, `close()`, `isOpen`. События `dialog:open`, `dialog:close`.

### slider

```html
<div class="slider" data-module="slider" style="--slide-width: 80%">
  <div class="slider__track" data-slider-track>
    <div class="slider__slide">…</div>
  </div>
  <div class="slider__nav">
    <button class="slider__arrow" data-slider-prev aria-label="Назад">←</button>
    <div class="slider__dots" data-slider-dots></div>
    <button class="slider__arrow" data-slider-next aria-label="Вперёд">→</button>
  </div>
</div>
```

Настройки: `autoplay` (0 — выкл., иначе мс), `dotLabel`. API: `goTo(i)`, `next()`, `prev()`, `index`.
Нужна бесконечная петля или эффекты (fade, 3D) — берите Swiper/Embla для этого блока.

### marquee

```html
<div class="marquee" data-module="marquee" data-marquee-speed="60">
  <ul class="marquee__track" data-marquee-track>
    <li>…</li>
  </ul>
</div>
```

Настройки: `speed` (px/с), `reverse`, `pauseOnHover`.

### split-text

```html
<h2 data-module="split-text" data-split-text-type="lines">Заголовок</h2>
```

`type`: `lines` | `words` | `chars`. Также `start`, `stagger`, `duration`.

### counter

```html
<span class="counter" data-module="counter" data-counter-suffix="+">1 500</span>
```

Итоговое число — в разметке (видно без JS и поисковикам). Настройки: `to`, `from`, `duration`,
`decimals`, `prefix`, `suffix`, `locale`.

### parallax

```html
<div data-module="parallax" data-parallax-speed="0.3"><img src="…" alt="" /></div>
```

`speed`: 0 — без сдвига, отрицательный — обгоняет прокрутку.

### magnetic

```html
<a class="btn" data-module="magnetic" data-magnetic-strength="0.3">Связаться</a>
```

Только при мыши. `strength` (0.35).

### scroll-top

```html
<button class="scroll-top" data-module="scroll-top" aria-label="Наверх">↑</button>
```

`after`: px или доля высоты экрана (≤ 1), по умолчанию 1 экран.

### lazy-video

```html
<video
  data-module="lazy-video"
  data-src="/video/bg.mp4"
  poster="/video/bg.jpg"
  muted
  loop
  playsinline
  preload="none"
></video>
```

### form

Подробно — [forms.md](forms.md).

```html
<form
  data-module="form"
  data-form-ajax
  data-form-schema="callback"
  action="/api/callback"
  method="post"
  novalidate
></form>
```

Настройки: `ajax`, `mode` (onTouched | onBlur | onChange | onSubmit | all), `schema`,
`resetOnSuccess`, `success`, `failure`, `invalid`. Из JS: `ctx.options.onSubmit(data, api)`.
API: `getValues()`, `validate()`, `validateField(name)`, `setErrors({})`, `clearErrors()`,
`errors`, `reset()`, `submit()`. События: `form:invalid`, `form:submit` (отменяемое),
`form:success`, `form:error`.

### mask

```html
<input data-module="mask" data-mask="phone" />
```

Внутри формы с `data-module="form"` маски включаются сами — модуль не нужен. Список масок —
[forms.md](forms.md#маски).

### file-upload

```html
<div class="upload" data-module="file-upload" data-file-upload-max-files="3" data-file-upload-max-size="5">
  <input class="upload__input" type="file" name="files" id="files" multiple accept="image/*,.pdf" />
  <label class="upload__zone" for="files">Перетащите или <u>выберите</u> <small data-file-upload-hint></small></label>
  <ul class="upload__list" data-file-upload-list></ul>
</div>
```

Настройки: `maxFiles`, `maxSize` (МБ), `accept`, `preview`. API: `files`, `add(files)`, `clear()`.
Событие `file-upload:change`.

### password

```html
<div class="field__control" data-module="password">
  <input class="field__input" type="password" name="password" />
  <button class="field__action" type="button" data-password-toggle></button>
</div>
```

### autosize

```html
<textarea class="field__input" data-module="autosize"></textarea>
```

### char-counter

```html
<textarea maxlength="500" data-module="char-counter"></textarea>
```

`max` — если обрезать ввод не нужно (тогда без `maxlength`).

### stepper

```html
<div class="stepper" data-module="stepper">
  <button type="button" data-stepper-dec aria-label="Меньше">−</button>
  <input type="number" name="qty" value="1" min="1" max="10" />
  <button type="button" data-stepper-inc aria-label="Больше">+</button>
</div>
```

### toast

```js
import { toast } from 'kit/js/modules/toast/index.js'
toast('Сохранено', { type: 'success' }) // info | success | warning | error
toast('Ошибка сети', { type: 'error', duration: 0 }) // 0 — пока не закроют
```

Без JS: `<div data-module="toast"><button data-toast="Скопировано" data-toast-type="success">`.

### select

Поверх настоящего `<select>` — он остаётся в форме (отправка, проверка, reset работают).

```html
<select name="city" data-module="select" data-select-search data-select-clearable>
  <option value="">Начните вводить город</option>
  <!-- пустой первый option = подсказка -->
  <optgroup label="Центр"><option value="msk">Москва</option></optgroup>
</select>
<select name="skills[]" multiple data-module="select" data-select-search data-select-max="4">
  …
</select>
```

Настройки: `search`, `placeholder`, `max`, `clearable`, `closeOnSelect`. Из JS: `ctx.options.load = async (query) => [{ value, label }]`
— варианты с сервера. API: `value`, `setValue(v)`, `open()`, `close()`, `refresh()`, `clear()`.
Список открывается в верхнем слое браузера (Popover API) — не обрезается модалкой.

### lang-switch

Ссылками на языковые версии (сайты, SEO) или кнопками `data-lang="en"` (смена «на лету»).
Подробно — [i18n.md](i18n.md).

### swiper

```html
<section>
  <div class="swiper-nav"><button class="swiper-button-prev"></button><button class="swiper-button-next"></button></div>
  <div
    class="swiper"
    data-module="swiper"
    data-swiper-preset="coverflow"
    data-swiper-breakpoints='{"md": {"slidesPerView": 2}}'
  >
    <div class="swiper-wrapper"><div class="swiper-slide">…</div></div>
    <div class="swiper-pagination"></div>
  </div>
</section>
```

Пресеты: `default`, `fade`, `cards`, `coverflow`, `creative`, `center`, `marquee`, `vertical`, `free`, `grid`.
Свои опции Swiper — `data-swiper-options='{...}'`. Брейкпоинты — по именам из SCSS.
Стрелки/точки ищутся внутри слайдера, затем в секции (или `data-swiper-controls="#id"`).
Миниатюры — `data-swiper-thumbs="#thumbs"`. API: `swiper` (экземпляр Swiper). Событие `swiper:change`.
Когда брать `slider` (scroll-snap), а когда `swiper`: нужна петля, эффекты, миниатюры — swiper;
простая лента карточек — slider (легче, родная прокрутка).

### infinite-slider

```html
<div class="infinite" data-module="infinite-slider" data-infinite-slider-mode="3d">
  <div class="infinite__viewport" data-infinite-viewport>
    <figure class="infinite__slide" data-infinite-slide data-title="Подпись">
      <div class="infinite__art" data-infinite-art><img src="…" alt="…" /></div>
    </figure>
    …
  </div>
  <p class="infinite__title" data-infinite-title></p>
  <p class="infinite__counter" data-infinite-counter></p>
  <button data-infinite-prev>←</button><button data-infinite-next>→</button>
</div>
```

Настройки: `mode` (dom | 3d), `skew`, `parallax`, `curve`, `reflection`, `snap`, `bounce`. Размеры — CSS-переменные
`--infinite-slide-width/height`, `--infinite-gap`. 3D: three.js грузится только для этого режима;
без WebGL — DOM-версия. Картинки с другого домена для 3D — только с CORS.

### infinite-gallery

```html
<section class="gallery" data-module="infinite-gallery" style="--gallery-columns: 6">
  <div class="gallery__pin" data-gallery-pin>
    <div class="gallery__viewport" data-gallery-viewport tabindex="0">
      <div class="gallery__grid" data-gallery-grid>
        <figure class="gallery__item" data-gallery-item tabindex="0">
          <img src="…" alt="…" data-lightbox-title="…" />
        </figure>
      </div>
    </div>
  </div>
</section>
```

Число ячеек — кратно числу колонок (иначе дыры; в консоли подсказка). Настройки: `lag`, `dragSpeed`,
`columnStep`, `scrollFollow`, `drift` (JSON `[x, y]`), `tilt`, `pin`, `pinLength`, `lightbox`.

### lightbox

`<div data-module="lightbox"><img src="…" alt="…" data-lightbox data-lightbox-title="…" data-lightbox-meta="…"></div>`
или из JS: `createLightbox().open(img, { title, meta, credit })`.

### hscroll

```html
<section class="hscroll" data-module="hscroll" data-hscroll-min="md">
  <div class="hscroll__pin" data-hscroll-pin>
    <div class="hscroll__progress" data-hscroll-progress></div>
    <div class="hscroll__track" data-hscroll-track>
      <article class="hscroll__card" data-hscroll-card>
        <img data-hscroll-zoom … /><span data-hscroll-scramble>2024</span>
      </article>
    </div>
  </div>
</section>
```

`min` — брейкпоинт, с которого включается (ниже — лента со scroll-snap). `scrub` — плавность.

### flip-filter

```html
<section data-module="flip-filter">
  <div class="flip-filter__tabs"><button data-filter="all">Все</button><button data-filter="site">Сайты</button></div>
  <div class="auto-grid"><article data-flip-item data-category="site landing">…</article></div>
</section>
```

Фильтр — в адресе (`?filter=site`, настройка `param`). Страница не «прыгает» при смене фильтра.

### stack-cards

`<div class="stack-cards" data-module="stack-cards"><article class="stack-cards__item" data-stack-card>…</article></div>`.
Настройки: `scale`, `dim`. Липкость — CSS `position: sticky` (не работает под `overflow: hidden` — предупреждение в консоли).

### scramble-text

`<h2 data-module="scramble-text">…</h2>`, при наведении — `data-scramble-text-on="hover"`. Настройки: `chars`, `duration`.

### draw-svg

`<svg data-module="draw-svg"><path data-draw d="…" /></svg>`; к скроллу — `data-draw-svg-scrub`.

### scroll-progress

`<div class="scroll-progress" data-module="scroll-progress"></div>`; по статье — `data-scroll-progress-target="#article"`.

### cursor

`<div class="cursor" data-module="cursor"></div>` в конце `<body>`; подсказка — `data-cursor="Смотреть"` на любом
элементе, размер — `data-cursor-size="96"`. Только при мыши.

---

### tooltip

Подсказка у любого элемента — **без `data-module`**: подключена на весь сайт плагином
`src/plugins/03-tooltips.js` и работает для элементов, добавленных позже.

```html
<button aria-label="Удалить" data-tooltip><x-icon name="trash" /></button>
<!-- текст = aria-label -->
<a href="/price.pdf" data-tooltip="PDF, 2 МБ">Прайс</a>
<span tabindex="0" data-tooltip="Справа" data-tooltip-placement="right">?</span>
<abbr tabindex="0" data-tooltip-template="#vat">НДС</abbr>
<template id="vat"><b>НДС 20%</b><br />уже в цене</template>
```

| Атрибут                       | Что делает                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `data-tooltip="текст"`        | текст подсказки; пустой — берётся `aria-label`                                                 |
| `data-tooltip-placement`      | `top` (по умолчанию), `bottom`, `left`, `right`, `top-start`… — у края экрана перевернётся сам |
| `data-tooltip-template="#id"` | разметка из `<template>` (только своя разметка — не текст пользователей)                       |

Мышь — показ с задержкой 300 мс; клавиатура — при фокусе (Tab); Esc — спрятать (модалка
под подсказкой не закрывается). Подсказка в верхнем слое (popover): видна поверх `<dialog>`.
Позиция — Floating UI. Настройки — `createTooltips({ delay, offset, placement })` в плагине.
На тач-экранах наведения нет: важное не прячьте только в подсказку, иконкам-кнопкам нужен `aria-label`.

### scrollbar

Скроллбар **поверх** содержимого блока (не отнимает ширину), прячется, когда блок не крутят,
одинаковый во всех ОС. На OverlayScrollbars, прокрутка остаётся нативной.

```html
<div class="card" data-module="scrollbar" style="max-height: 320px">…</div>
<div data-module="scrollbar" data-scrollbar-axis="x">широкая таблица</div>
<div data-module="scrollbar" data-scrollbar-auto-hide="never">…</div>
```

| Атрибут                          | По умолчанию | Значения                           |
| -------------------------------- | ------------ | ---------------------------------- |
| `data-scrollbar-axis`            | `y`          | `y`, `x`, `both`                   |
| `data-scrollbar-auto-hide`       | `leave`      | `leave`, `scroll`, `move`, `never` |
| `data-scrollbar-auto-hide-delay` | `600`        | мс                                 |

API: `ctx.modules.get(el, 'scrollbar').viewport.scrollTo({ top: 0 })`, `.instance` — полный
API библиотеки. Для **всей страницы** модуль не используйте: страница красится CSS
(`kit/scss/base/_scrollbar.scss`) — так не ломаются sticky, ScrollTrigger и Lenis.
Цвета обоих вариантов — переменные `--scrollbar-thumb`, `--scrollbar-thumb-hover`,
`--scrollbar-size`.

---

## Свой модуль

Создать заготовку: `npm run new -- module copy-link` (модуль для чужой разметки) или
`npm run new -- component card --js` (компонент со своей разметкой — [components.md](components.md)).

### Контракт

Модуль — функция, которая получает элемент и контекст и возвращает объект с `destroy`:

```js
export default function myModule(el, ctx) {
  // включили поведение
  return {
    destroy() {
      /* выключили всё, что включили */
    },
  }
}
```

Больше от модуля ничего не требуется. Регистрация, поиск элементов, повторный запуск,
ленивая загрузка, ошибки — забота реестра (`kit/js/core/registry.js`).

### Разбор по шагам: «Копировать ссылку»

Задача: кнопка копирует адрес (или текст из настройки) и на 2 секунды меняет подпись.

```html
<button data-module="copy-link" data-copy-link-text="https://example.com/promo">Скопировать ссылку</button>
<button data-module="copy-link">Скопировать адрес этой страницы</button>
```

```js
// src/modules/copy-link/index.js
import { createDisposer } from 'kit/js/core/lifecycle.js'
import { readOptions } from 'kit/js/core/options.js'
import { toast } from 'kit/js/modules/toast/index.js'

// 1. ВСЕ настройки со значениями по умолчанию. Тип значения = тип настройки:
//    data-copy-link-timeout="3000" станет числом, потому что здесь число.
const DEFAULTS = {
  text: '', // пусто — копируем адрес страницы
  done: 'Скопировано ✓',
  timeout: 2000,
}

export default function copyLink(el, ctx = {}) {
  // 2. Настройки: data-copy-link-* + ctx.options (из JS/React, важнее атрибутов).
  const options = readOptions(el, 'copy-link', DEFAULTS, ctx.options)
  // 3. Disposer: всё, что включаем, сразу регистрируем на выключение.
  const d = createDisposer()
  const label = el.textContent

  async function copy() {
    const text = options.text || location.href
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      toast('Не удалось скопировать — браузер запретил доступ к буферу', { type: 'error' })
      return
    }
    el.textContent = options.done
    // Таймер через d.timeout — если блок удалят раньше, таймер не сработает на удалённом элементе.
    d.timeout(() => (el.textContent = label), options.timeout)
    // 4. Сообщаем «наружу» — аналитика, другие модули. Кто слушает — модулю неважно.
    ctx.bus?.emit('copy-link:copied', { text })
  }

  d.listen(el, 'click', copy)

  // 5. API: что можно сделать с модулем снаружи (ctx.modules.get(el, 'copy-link').copy()).
  return {
    copy,
    destroy() {
      d.dispose()
      el.textContent = label // вернуть разметку как было
    },
  }
}
```

Регистрировать не нужно — папка `src/modules/copy-link/` подхватится сама.

### Что есть в ctx

| Поле              | Что это                             | Пример                                                                   |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `ctx.bus`         | шина событий                        | `ctx.bus.emit('cart:add', item)`, `d.add(ctx.bus.on('cart:add', fn))`    |
| `ctx.modules`     | доступ к другим модулям             | `await ctx.modules.when('#callback', 'dialog')` — [ниже](#связь-модулей) |
| `ctx.scroll`      | плавный скролл (Lenis)              | `ctx.scroll.scrollTo('#faq')`, `ctx.scroll.stop()`                       |
| `ctx.reduced`     | пользователь просит меньше движения | `if (!ctx.reduced) gsap.from(...)`                                       |
| `ctx.breakpoints` | брейкпоинты из SCSS                 | `ctx.breakpoints.md` → `768`                                             |
| `ctx.options`     | настройки из JS/React               | важнее data-атрибутов                                                    |

### Что умеет disposer

```js
const d = createDisposer()
d.listen(window, 'resize', onResize, { passive: true }) // addEventListener + снять при destroy
d.timeout(fn, 500) // setTimeout + отменить
d.interval(fn, 1000) // setInterval + отменить
d.add(ctx.bus.on('cart:add', fn)) // любая функция-«выключатель»
d.add(() => tween.kill()) // анимации GSAP
d.dispose() // выключить всё разом (в обратном порядке)
```

### Правила надёжного модуля

- **Ищите элементы внутри `el`**, а не по всему `document`: блоков на странице может быть
  несколько. `el.querySelector('[data-copy-link-button]')`, а не `document.querySelector(...)`.
- **Состояние — в замыкании функции**, не в глобальных переменных: у каждого блока своё.
- **Нет обязательного элемента — понятная ошибка**:
  `if (!input) throw new Error('[price-calc] нужен [data-calc-pages] внутри')`. Реестр
  напишет её в консоль с элементом и запустит остальные модули.
- **`destroy` убирает всё**: обработчики, таймеры, анимации, добавленные элементы и классы.
  Проверка: запустить → destroy → запустить снова — дублей быть не должно.
- **Уважайте `ctx.reduced`**: без анимаций, сразу конечное состояние.
- **Расчёты — отдельными функциями с `export`**: их проще тестировать без DOM.
- **Тест рядом** (`copy-link.test.js`, см. [testing.md](testing.md)).

### Модуль с тяжёлой библиотекой

Импортируйте библиотеку внутри модуля — модули проекта ленивые, и библиотека скачается, только
если блок есть на странице:

```js
// src/modules/map/index.js
export default async function map(el, ctx) {
  const { default: maplibre } = await import('maplibre-gl') // отдельный файл сборки
  const instance = new maplibre.Map({ container: el, style: '…' })
  return { map: instance, destroy: () => instance.remove() }
}
```

Асинхронный модуль (возвращает Promise) — нормально: реестр дождётся его, а `ctx.modules.when`
вернёт экземпляр, когда он готов.

---

## Связь модулей

Три способа, от слабой связи к сильной.

### 1. События через шину — когда модулю всё равно, кто слушает

```js
// калькулятор: «заявка готова» — и всё
ctx.bus.emit('price:order', { sum: 67000 })

// аналитика (src/main.js или отдельный модуль): «если будет заявка — отправлю цель»
app.ctx.bus.on('price:order', (calc) => ym(12345, 'reachGoal', 'calc-order', calc))

// корзина в шапке: подписка с replay — получит последнее значение, даже если
// событие было до её запуска
d.add(ctx.bus.on('cart:change', render, { replay: true }))
```

Имена событий — `«область:что»`: `cart:add`, `dialog:open`, `price:order`. Список событий
проекта стоит вести в README проекта.

### 2. ctx.modules — когда нужен конкретный модуль и его методы

Модуль возвращает объект с методами — это его API:

```js
// dialog из кита возвращает { open, close, isOpen, destroy }
// accordion — { open(i), close(i), toggle(i), isOpen(i), destroy }
```

Другой модуль получает этот API через `ctx.modules` (вне модулей — `import { modules } from
'kit/js/core/modules.js'`, в консоли dev — `__kit.modules`):

| Метод                                      | Что возвращает                                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `get(target, name?)`                       | экземпляр модуля на элементе (`target` — элемент или селектор); без `name` — если модуль на элементе один |
| `all(name, scope?)`                        | все запущенные экземпляры: `all('accordion')`                                                             |
| `first(name)`                              | первый запущенный                                                                                         |
| `when(target, name?, { timeout, signal })` | **Promise**: дождаться запуска (элемента может ещё не быть)                                               |
| `whenAny(name)`                            | Promise: первый модуль с таким именем где угодно                                                          |

**Почему `when`, а не `get`.** Модули запускаются асинхронно и в произвольном порядке:
ленивый модуль модалки скачивается по сети. Если калькулятор при старте сделает
`get('#callback', 'dialog')`, он может получить `undefined` — модалка ещё грузится.
`when` вернёт экземпляр сразу, если он готов, или дождётся. По умолчанию ждёт 10 с,
потом — понятная ошибка «не дождались запуска: dialog на #callback. Есть ли он на странице?».

Пример из стартера (`src/components/price-calc/price-calc.js`):

```js
d.listen(el, 'click', async (event) => {
  if (!event.target.closest('[data-calc-order]')) return
  const dialog = await ctx.modules.when('#callback', 'dialog') // ждём модалку
  document.querySelector('#callback [name="comment"]').value = `Расчёт: ${sum} ₽`
  dialog.open()
})
```

Ещё примеры:

```js
// раскрыть вопрос FAQ по ссылке «Как оплатить?» в другом месте страницы
d.listen(link, 'click', async () => {
  const faq = await ctx.modules.when('#faq .accordion', 'accordion')
  faq.open(2)
  ctx.scroll?.scrollTo('#faq')
})

// все слайдеры на паузу, пока открыта модалка (dialog шлёт DOM-событие dialog:open, оно всплывает)
d.listen(document, 'dialog:open', () => ctx.modules.all('swiper').forEach((s) => s.swiper?.autoplay?.stop()))

// отменить ожидание, если модуль удалили раньше (htmx заменил блок)
const controller = new AbortController()
d.add(() => controller.abort())
ctx.modules
  .when('#cart', 'cart', { signal: controller.signal })
  .then((cart) => cart.add(item))
  .catch(() => {})
```

### 3. Прямой импорт — для общих функций, а не для модулей

`import { toast } from 'kit/js/modules/toast/index.js'` — нормально: это функция, а не блок
на странице. А вот импортировать модуль калькулятора в модуль корзины, чтобы вызвать его
код, — нельзя: получится второй экземпляр без разметки. Для этого — пункты 1 и 2.

### Что выбрать

| Нужно                                                              | Способ                          |
| ------------------------------------------------------------------ | ------------------------------- |
| «Случилось X» — кому надо, отреагирует (аналитика, счётчики)       | `ctx.bus.emit`                  |
| Вызвать метод конкретного блока (открыть модалку, переключить таб) | `ctx.modules.when(...).метод()` |
| Узнать состояние другого блока (сумма калькулятора)                | `ctx.modules.get(...).value`    |
| Общая утилита (формат цены, toast)                                 | обычный `import`                |

---

## Жизненный цикл и подгружаемый контент

- `createApp` запускает модули всех `[data-module]` страницы и **следит за DOM**: блок,
  добавленный позже (htmx, «Показать ещё», `innerHTML`), запустится сам, удалённый — сам
  вызовет `destroy`.
- Повторный запуск на том же элементе невозможен — реестр помнит запущенные модули.
- Ошибка одного модуля не ломает остальные: в консоли — имя модуля, элемент и ошибка.
- Опечатка в имени — предупреждение со списком доступных модулей.
- Вручную: `app.mount(node)` / `app.unmount(node)` (если `createApp({ watch: false })`).
