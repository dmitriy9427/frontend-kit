# Компоненты: вёрстка из переиспользуемых блоков

> Стек **vanilla** (Vite + HTML). В React-стартере компоненты — обычные React-компоненты,
> в Astro — `.astro`-файлы; там этот документ не нужен.

Компонент — **папка**, в которой лежит всё про один блок интерфейса: разметка, стили и
(если нужно) поведение. На странице он вставляется одним тегом:

```html
<x-feature-card icon="check" title="Тесты" text="Каждый модуль покрыт тестами" />
```

При сборке (и в `npm run dev`) тег заменяется готовым HTML. В браузер не уходит ни
строчки «шаблонизатора» — только обычная вёрстка, поэтому её можно отдать в любую CMS.

**Содержание**

1. [Зачем компоненты](#1-зачем-компоненты)
2. [Анатомия компонента](#2-анатомия-компонента)
3. [Первый компонент за 5 минут](#3-первый-компонент-за-5-минут)
4. [Props: что передать компоненту](#4-props-что-передать-компоненту)
5. [Вывод значений: `{{ }}` и `{{{ }}}`](#5-вывод-значений--и-)
6. [Условия: `x-if` и `x-else`](#6-условия-x-if-и-x-else)
7. [Циклы: `x-for`](#7-циклы-x-for)
8. [Атрибуты из выражений: `:attr`](#8-атрибуты-из-выражений-attr)
9. [Слоты: вставить свою разметку внутрь](#9-слоты-вставить-свою-разметку-внутрь)
10. [Какие атрибуты переходят на компонент сами](#10-какие-атрибуты-переходят-на-компонент-сами)
11. [Данные: `src/data/`](#11-данные-srcdata)
12. [Стили компонента](#12-стили-компонента)
13. [Компонент с JS](#13-компонент-с-js)
14. [Компонент поверх модуля кита](#14-компонент-поверх-модуля-кита)
15. [Рецепты](#15-рецепты)
16. [Ошибки и как их читать](#16-ошибки-и-как-их-читать)
17. [Ограничения и частые вопросы](#17-ограничения-и-частые-вопросы)

---

## 1. Зачем компоненты

Без компонентов карточка, которая встречается на трёх страницах, копируется трижды. Через
месяц заказчик просит «добавить в карточку бейдж» — и правка делается в трёх местах (а
четвёртое забывается). С компонентом:

| Без компонентов                                     | С компонентами                                                |
| --------------------------------------------------- | ------------------------------------------------------------- |
| HTML карточки скопирован на каждую страницу         | `<x-card>` — разметка в одном файле                           |
| Стили в общем `_home.scss`, непонятно, где чьи      | `card/card.scss` рядом с разметкой                            |
| JS в `main.js` ищет `.card` на всех страницах       | `card/card.js` запускается сам, только там, где есть карточка |
| 12 карточек = 12 копий HTML                         | `x-for` по массиву из `src/data/cards.json`                   |
| Удалить блок — искать его стили и скрипт по проекту | удалить папку                                                 |

## 2. Анатомия компонента

```
src/components/
  price-calc/
    price-calc.html      разметка — ОБЯЗАТЕЛЬНО (имя файла = имя папки)
    price-calc.scss      стили — подключаются автоматически
    price-calc.js        поведение — запускается автоматически (data-module ставится сам)
    price-calc.test.js   тест поведения
```

Как всё «само» подключается:

| Файл     | Кто подключает                                                                                                                      | Где это видно                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `*.html` | Vite-плагин `kit/vite/html-components.js` заменяет `<x-имя>` разметкой                                                              | в исходном коде страницы в браузере (Ctrl+U)            |
| `*.scss` | `import.meta.glob('./components/*/*.scss', { eager: true })` в `src/main.js`                                                        | весь CSS — в одном файле сборки                         |
| `*.js`   | `modulesFromGlob(import.meta.glob('./components/*/*.js'))` в `src/main.js` + плагин дописывает `data-module="имя"` корню компонента | Код скачивается, только если компонент есть на странице |

Создать заготовку командой (ничего не перезаписывает):

```bash
npm run new -- component card          # card.html + card.scss
npm run new -- component card --js     # + card.js + card.test.js
```

## 3. Первый компонент за 5 минут

Сделаем карточку тарифа.

**Шаг 1.** `npm run new -- component plan` — появилась папка `src/components/plan/`.

**Шаг 2.** Разметка `src/components/plan/plan.html`:

```html
<!--
  Карточка тарифа.
    <x-plan name="Старт" :price="9900" :features="['Лендинг', 'Адаптив']" />
  Комментарий в начале файла — документация компонента, на страницу он не попадает.
-->
<article class="plan">
  <h3 class="plan__name">{{ name }}</h3>
  <p class="plan__price">{{ price.toLocaleString('ru-RU') }} ₽</p>
  <ul class="plan__features">
    <li x-for="feature of features">{{ feature }}</li>
  </ul>
</article>
```

**Шаг 3.** Стили `src/components/plan/plan.scss`:

```scss
@use 'abstracts' as *; // функции и миксины кита: space(), rem(), up('md')…

.plan {
  display: grid;
  gap: space(4);
  padding: space(6);
  border: 1px solid var(--color-border);
  border-radius: radius('lg');
}

.plan__price {
  font-size: fluid(28px, 40px);
  font-weight: 800;
}
```

**Шаг 4.** Вставляем на страницу (`index.html`):

```html
<div class="auto-grid" style="--min: 260px">
  <x-plan name="Старт" :price="9900" :features="['Лендинг', 'Адаптив']" />
  <x-plan name="Бизнес" :price="29900" :features="['До 10 страниц', 'Анимации', 'CMS']" />
</div>
```

**Шаг 5.** Смотрим результат в браузере и в исходном коде страницы (Ctrl+U):

```html
<div class="auto-grid" style="--min: 260px">
  <article class="plan">
    <h3 class="plan__name">Старт</h3>
    <p class="plan__price">9 900 ₽</p>
    <ul class="plan__features">
      <li>Лендинг</li>
      <li>Адаптив</li>
    </ul>
  </article>
  …
</div>
```

Перезапускать `npm run dev` не нужно: правка `.html` перезагружает страницу, правка `.scss`
применяется без перезагрузки.

## 4. Props: что передать компоненту

Всё, что записано атрибутами в вызове, внутри компонента доступно как переменные.

| В вызове                  | Внутри компонента                       | Тип                            |
| ------------------------- | --------------------------------------- | ------------------------------ |
| `title="Привет"`          | `title` → `'Привет'`                    | строка                         |
| `featured` (без значения) | `featured` → `true`                     | boolean                        |
| `:price="9900"`           | `price` → `9900`                        | число (выражение JS)           |
| `:items="faq"`            | `items` → массив из `src/data/faq.json` | что угодно                     |
| `:open="false"`           | `open` → `false`                        | boolean                        |
| `per-page="5"`            | `perPage` → `'5'`                       | дефисы → camelCase             |
| `title="{{ site.name }}"` | `title` → значение                      | `{{ }}` работает и в атрибутах |

> **Главное правило:** без двоеточия — **строка**, с двоеточием — **выражение JS**.
> `price="100"` — это строка `'100'`, `:price="100"` — число `100`.

**Значения по умолчанию** пишутся прямо в шаблоне через `??`:

```html
<button :type="type ?? 'button'">{{ label ?? 'Отправить' }}</button>
```

Не переданный prop равен `undefined` (это не ошибка — `x-if="subtitle"` просто ложно).
Но если вывести его через `{{ title }}`, в консоли сборки появится предупреждение
`x-plan: нет значения для {{ title }}` — опечатку в имени prop'а видно сразу.

Служебные переменные внутри компонента:

| Имя      | Что это                                                      |
| -------- | ------------------------------------------------------------ |
| `$props` | все props объектом (`{ title, price }`)                      |
| `$attrs` | атрибуты вызова как есть, с дефисами (`{ 'per-page': '5' }`) |
| `$slots` | какие слоты заполнены: `$slots.footer` → `true/false`        |

## 5. Вывод значений: `{{ }}` и `{{{ }}}`

```html
<h3>{{ title }}</h3>
обычный вывод
<p>{{ price.toLocaleString('ru-RU') }} ₽</p>
любое выражение JS
<p>{{ items.length }} {{ items.length > 4 ? 'товаров' : 'товара' }}</p>
<time datetime="{{ date }}">{{ new Date(date).toLocaleDateString('ru-RU') }}</time>
<div class="answer">{{{ item.answer }}}</div>
HTML как есть
```

- `{{ }}` **экранирует** `<`, `>`, `"`, `&`: текст «A < B» из JSON не сломает вёрстку.
  Готовые сущности (`&nbsp;`, `&mdash;`) не портятся.
- `{{{ }}}` вставляет HTML без экранирования — для ответов FAQ, текстов из CMS с `<p>`,
  `<strong>`. Только для **своих** данных: в данные от пользователей так делать нельзя.
- `undefined`, `null` и `false` выводятся пустой строкой: `{{ isNew && 'Новинка' }}`.
- Доступны `Math`, `JSON`, `Number`, `String`, `Date`, `Intl`, `Array`, `Object`,
  `encodeURIComponent`.

## 6. Условия: `x-if` и `x-else`

```html
<span x-if="badge" class="plan__badge">{{ badge }}</span>

<a x-if="href" :href="href" class="btn"><slot /></a>
<button x-else type="button" class="btn"><slot /></button>
```

- `x-else` ставится на **следующий** элемент после элемента с `x-if` (пробелы и переносы
  строк между ними не мешают).
- Чтобы показать/скрыть несколько элементов без лишней обёртки, используйте `<template>` —
  он сам в HTML не попадёт:

```html
<template x-if="phone">
  <dt>Телефон</dt>
  <dd><a href="tel:{{ phone }}">{{ phone }}</a></dd>
</template>
```

## 7. Циклы: `x-for`

| Запись                              | Что перебирает                        |
| ----------------------------------- | ------------------------------------- |
| `x-for="item of items"`             | элементы массива                      |
| `x-for="(item, i) of items"`        | с номером (с нуля)                    |
| `x-for="[key, value] of prices"`    | пары объекта `{ s: 990, m: 1490 }`    |
| `x-for="({ title, url }) of links"` | деструктуризация полей                |
| `x-for="n of 5"`                    | числа 1…5 (звёзды рейтинга, заглушки) |
| `x-for="tech of ['Vite', 'SCSS']"`  | массив прямо в разметке               |

```html
<!-- Рейтинг: 5 звёзд, закрашены первые rating -->
<span class="rating" aria-label="Рейтинг {{ rating }} из 5">
  <x-icon x-for="n of 5" name="star" :class="{ 'is-on': n <= rating }" />
</span>

<!-- x-if вместе с x-for — фильтр: выводятся только опубликованные -->
<x-review x-for="r of reviews" x-if="r.published" :review="r" />

<!-- Несколько элементов на шаг цикла — через template -->
<dl>
  <template x-for="spec of specs">
    <dt>{{ spec.name }}</dt>
    <dd>{{ spec.value }}</dd>
  </template>
</dl>
```

## 8. Атрибуты из выражений: `:attr`

На обычных тегах двоеточие работает так же, как в props, плюс несколько удобств:

| Запись                                                           | Результат                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------------- |
| `:href="'/catalog/' + item.slug"`                                | `href="/catalog/rozy"`                                          |
| `:disabled="!inStock"`                                           | `false` → атрибута нет, `true` → `disabled`                     |
| `:aria-current="active ? 'page' : null"`                         | `null`/`undefined` → атрибута нет                               |
| `class="card" :class="{ 'card--hot': hot, 'card--sale': sale }"` | `class="card card--hot"` — объект: класс, если значение истинно |
| `:class="['btn', size && 'btn--' + size]"`                       | массив: пустые значения отбрасываются                           |
| `:style="{ '--accent': color, gridColumn: 'span 2' }"`           | `style="--accent: #f00; grid-column: span 2"`                   |
| `:data-options="{ loop: true }"`                                 | объект → JSON: `data-options="{&quot;loop&quot;:true}"`         |

Для простых случаев хватает и `{{ }}` внутри обычного атрибута:
`href="/catalog/{{ item.slug }}"`.

## 9. Слоты: вставить свою разметку внутрь

Props хороши для текста и чисел. Когда внутрь нужно передать **разметку** (кнопки, картинку,
список) — используйте слоты.

**Компонент** `src/components/panel/panel.html`:

```html
<section class="panel">
  <header x-if="$slots.head" class="panel__head">
    <slot name="head" />
  </header>
  <div class="panel__body">
    <slot>Здесь пока пусто</slot>
    <!-- default-слот с запасным содержимым -->
  </div>
  <footer x-if="$slots.actions" class="panel__actions">
    <slot name="actions" />
  </footer>
</section>
```

**Вызов:**

```html
<x-panel>
  <template slot="head"><h2>Заказ №{{ order.id }}</h2></template>

  <p>Всё, что без slot="…", попадает в default-слот.</p>
  <x-order-items :items="order.items" />

  <x-button slot="actions" href="/pay">Оплатить</x-button>
</x-panel>
```

- `<template slot="имя">…</template>` — несколько элементов в слот (обёртка не попадает в HTML).
- `slot="имя"` на обычном элементе — один элемент в слот (атрибут `slot` уберётся).
- Внутри `<slot>…</slot>` — запасное содержимое: выводится, если слот не передали.
- `$slots.имя` — передан ли слот: удобно, чтобы не выводить пустые обёртки.
- Содержимое слота видит переменные **того места, где компонент вызвали** (например,
  `order` из цикла снаружи), а не переменные компонента. Так же, как в Vue.

## 10. Какие атрибуты переходят на компонент сами

Атрибуты из этого списка переносятся на **корневой** (первый) элемент компонента — их не надо
объявлять в шаблоне:

| Атрибут                            | Как переходит                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `class`                            | **дописывается** к классам корня: `<x-plan class="mt-8">` → `class="plan mt-8"` |
| `style`                            | дописывается                                                                    |
| `data-module`                      | дописывается: `<x-plan data-module="reveal">` → `data-module="reveal plan"`     |
| `id`, `role`, `tabindex`, `hidden` | ставятся (заменяют значение корня)                                              |
| `data-*`, `aria-*`                 | ставятся                                                                        |

Поэтому любой компонент можно «довесить» модулем кита или атрибутом без правки его кода:

```html
<x-button data-dialog-open="callback" data-module="magnetic" data-reveal>Обсудить</x-button>
<x-feature-card id="tests" class="is-highlighted" … />
```

Остальные атрибуты (`title`, `href`, `price`) — это props: компонент сам решает, куда их
поставить.

## 11. Данные: `src/data/`

Каждый файл папки `src/data/` — переменная, доступная во **всех** страницах и компонентах:

| Файл                | Переменная                          |
| ------------------- | ----------------------------------- |
| `site.json`         | `site` — название, телефон, меню    |
| `faq.json`          | `faq`                               |
| `calc-options.json` | `calcOptions` (дефисы → camelCase)  |
| `team.js`           | `team` — то, что в `export default` |

Плюс встроенные: `page` (`page.path` — адрес текущей страницы), `base` (путь сайта, например
`/promo/`), `dev` (`true` в `npm run dev`), `year` (текущий год — для ©).

**JSON** — для текстов, которые может править не программист:

```json
// src/data/team.json
[
  { "name": "Анна", "role": "Дизайнер", "photo": "/images/team/anna.jpg" },
  { "name": "Игорь", "role": "Разработчик", "photo": "/images/team/igor.jpg" }
]
```

```html
<x-person x-for="p of team" :person="p" />
```

**JS** — когда данные нужно вычислить: отсортировать, сгруппировать, скачать при сборке:

```js
// src/data/prices.js — выполняется в Node при сборке, в браузер не попадает
import raw from './prices-raw.json' with { type: 'json' }

export default raw
  .filter((p) => p.active)
  .sort((a, b) => a.price - b.price)
  .map((p) => ({ ...p, priceText: p.price.toLocaleString('ru-RU') + ' ₽' }))
```

```js
// src/data/posts.js — данные из API при сборке (headless CMS)
const res = await fetch('https://cms.example.com/api/posts?limit=6')
export default await res.json()
```

> Файлы данных выполняются **при сборке**. Если данные меняются без пересборки сайта
> (цены из 1С каждый час) — их грузит JS в браузере, а не `src/data/`.

Правка любого файла данных в `npm run dev` перезагружает страницу.

## 12. Стили компонента

- Файл `имя.scss` рядом с разметкой подключается сам — в `main.scss` дописывать не нужно.
- Первая строка всегда `@use 'abstracts' as *;` — так доступны `space()`, `rem()`, `fluid()`,
  `radius()`, миксины `up('md')`, `hover` и настройки проекта (цвета, шрифты).
- Классы — по БЭМ от имени компонента: `.plan`, `.plan__price`, `.plan--featured`. Тогда
  стили одного компонента никогда не заденут другой.
- Порядок CSS: сначала кит и `main.scss`, потом компоненты. Поэтому компонент может
  переопределить стиль кита без `!important`.
- Модификатор из props:

```html
<article :class="['plan', featured && 'plan--featured']"></article>
```

```scss
.plan--featured {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-lg);
}
```

## 13. Компонент с JS

Если рядом с разметкой лежит `имя.js`, плагин **сам** добавляет корневому элементу
`data-module="имя"`, а `src/main.js` сам регистрирует модуль. Писать `data-module` руками
и дописывать что-то в реестр не нужно.

JS компонента — это обычный модуль кита: функция `(el, ctx) → { destroy }`
(подробно — [modules.md](modules.md#свой-модуль)). `el` — корневой элемент компонента.

**Как передать настройки из props в JS.** Шаблон работает при сборке, JS — в браузере.
Мост между ними — `data-атрибуты`:

```html
<!-- price-calc.html: props → data-атрибуты корня -->
<form class="price-calc" :data-price-calc-base="base ?? 15000" :data-price-calc-per-page="perPage ?? 4000"></form>
```

```js
// price-calc.js: data-атрибуты → настройки с правильными типами
const DEFAULTS = { base: 15000, perPage: 4000 }
const options = readOptions(el, 'price-calc', DEFAULTS, ctx.options) // { base: 20000, perPage: 4000 }
```

```html
<!-- страница -->
<x-price-calc :base="20000" />
```

Для сложных данных (массив товаров) — JSON в атрибуте:
`:data-products="products"` → в JS `JSON.parse(el.dataset.products)`, или
`readOptions` с `DEFAULTS = { products: [] }` — он разберёт JSON сам.

**Полный пример** — `src/components/price-calc/` в стартере: ползунок, галочки, расчёт суммы,
кнопка «Обсудить» открывает модалку другого модуля (`ctx.modules`, см.
[modules.md → Связь модулей](modules.md#связь-модулей)), событие `price:order` в шину для
аналитики, свой API `{ value }` и тест.

## 14. Компонент поверх модуля кита

Модули кита (аккордеон, табы, слайдер) требуют определённой разметки. Оберните её в компонент
один раз — и больше никогда не вспоминайте, какие там `data-accordion-item`:

```html
<!-- src/components/faq/faq.html -->
<div class="accordion" data-module="accordion" :data-accordion-multiple="multiple">
  <div x-for="(item, i) of items" class="accordion__item" data-accordion-item :data-open="i === Number(open ?? 0)">
    <h3 class="h4">
      <button class="accordion__trigger" data-accordion-trigger>{{ item.question }}</button>
    </h3>
    <div class="accordion__panel" data-accordion-panel>
      <div class="accordion__inner">{{{ item.answer }}}</div>
    </div>
  </div>
</div>
```

```html
<x-faq :items="faq" /> <x-faq :items="deliveryFaq" multiple :open="-1" />
```

Так же удобно завернуть табы, слайдер, модалку, форму. Это ответ на вопрос «обязательно ли
писать `data-module`»: внутри компонента — один раз, в вызовах — никогда.

## 15. Рецепты

### Навигация из данных с активным пунктом

```json
// src/data/site.json
{
  "nav": [
    { "href": "", "label": "Главная" },
    { "href": "about.html", "label": "О нас" }
  ]
}
```

```html
<ul class="nav__list">
  <li x-for="link of site.nav">
    <a class="nav__link" href="%BASE_URL%{{ link.href }}">{{ link.label }}</a>
  </li>
</ul>
```

`aria-current="page"` у ссылки на текущую страницу плагин поставит сам —
стилизуйте `.nav__link[aria-current='page']`.

### Меню с подменю любой глубины (компонент вызывает сам себя)

```html
<!-- src/components/menu-tree/menu-tree.html -->
<ul class="menu-tree">
  <li x-for="item of items">
    <a :href="item.href">{{ item.label }}</a>
    <x-menu-tree x-if="item.children" :items="item.children" />
  </li>
</ul>
```

### Хлебные крошки по адресу страницы

```html
<!-- src/components/breadcrumbs/breadcrumbs.html -->
<nav class="breadcrumbs" aria-label="Хлебные крошки">
  <ol>
    <li><a href="%BASE_URL%">Главная</a></li>
    <li x-for="item of items">
      <a x-if="item.href" :href="item.href">{{ item.label }}</a><span x-else aria-current="page">{{ item.label }}</span>
    </li>
  </ol>
</nav>
```

```html
<x-breadcrumbs :items="[{ label: 'Каталог', href: 'catalog.html' }, { label: 'Розы' }]" />
```

### Сетка тарифов с выделенным

```json
// src/data/plans.json
[
  { "name": "Старт", "price": 9900, "features": ["Лендинг"] },
  { "name": "Бизнес", "price": 29900, "features": ["10 страниц", "CMS"], "featured": true }
]
```

```html
<div class="auto-grid" style="--min: 260px">
  <x-plan x-for="p of plans" :name="p.name" :price="p.price" :features="p.features" :featured="p.featured" />
</div>
```

```html
<!-- plan.html -->
<article :class="['plan', featured && 'plan--featured']">
  <span x-if="featured" class="plan__badge">Популярный</span>
  …
</article>
```

### Модалка-компонент на любой случай

```html
<!-- src/components/modal/modal.html -->
<dialog :id="id" class="dialog" data-module="dialog" :aria-labelledby="id + '-title'">
  <div class="dialog__box">
    <button class="dialog__close" data-dialog-close aria-label="Закрыть"><x-icon name="close" /></button>
    <h2 :id="id + '-title'" class="h3">{{ title }}</h2>
    <slot />
  </div>
</dialog>
```

```html
<x-button data-dialog-open="video">Смотреть видео</x-button>
<x-modal id="video" title="Как мы работаем">
  <video src="/video/about.mp4" controls></video>
</x-modal>
```

### Карточка товара с бейджами и ценой со скидкой

```html
<!-- product-card.html -->
<article class="product-card">
  <a :href="'product.html?id=' + product.id" class="product-card__link">
    <img :src="product.image" :alt="product.title" loading="lazy" width="400" height="400" />
    <h3>{{ product.title }}</h3>
  </a>
  <div class="product-card__badges">
    <span x-if="product.isNew" class="badge">Новинка</span>
    <span x-if="product.oldPrice" class="badge badge--sale">
      −{{ Math.round((1 - product.price / product.oldPrice) * 100) }}%
    </span>
  </div>
  <p class="product-card__price">
    <b>{{ product.price.toLocaleString('ru-RU') }} ₽</b>
    <s x-if="product.oldPrice">{{ product.oldPrice.toLocaleString('ru-RU') }} ₽</s>
  </p>
  <x-button icon="cart" :data-product-id="product.id" data-module="add-to-cart">В корзину</x-button>
</article>
```

### Разметка для JS: `<template>` для того, что JS создаёт сам

Компоненты рисуются при сборке. Если JS должен создавать элементы в браузере (новые строки
корзины, результаты поиска), положите образец в настоящий `<template>` без директив — он
попадёт в HTML как есть, и JS будет его клонировать:

```html
<template id="cart-row">
  <li class="cart__row"><span data-title></span><b data-price></b></li>
</template>
```

```js
const row = document.getElementById('cart-row').content.firstElementChild.cloneNode(true)
row.querySelector('[data-title]').textContent = item.title
```

## 16. Ошибки и как их читать

Ошибка шаблона показывается в окне ошибки Vite (в `npm run dev`) или останавливает сборку.
В сообщении — страница и цепочка компонентов:

| Сообщение                                                                                                  | Причина                                 | Что делать                                            |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| `/index.html: нет компонента <x-plna>. Есть: x-button, x-plan…`                                            | опечатка или нет файла `plna/plna.html` | исправить имя                                         |
| `/index.html → x-plan: не удалось вычислить «price.toLocaleString()»: Cannot read properties of undefined` | prop не передан                         | передать `:price` или `{{ price?.toLocaleString() }}` |
| `ошибка синтаксиса в «item.»`                                                                              | незаконченное выражение                 | проверить выражение                                   |
| `x-else без x-if перед ним`                                                                                | между ними другой элемент               | поставить `x-else` сразу после `x-if`                 |
| `x-for="item items": ожидается «item of items»`                                                            | забыли `of`                             | `item of items`                                       |
| `слишком глубокая вложенность компонентов`                                                                 | компонент вызывает сам себя без условия | добавить `x-if` (см. меню-дерево)                     |
| ⚠ `x-plan: нет значения для {{ title }}` (предупреждение)                                                  | prop не передан или опечатка            | передать или написать `{{ title ?? '' }}`             |
| ⚠ `[svg-sprite] нет иконки «strar». Есть: …`                                                               | опечатка в имени иконки                 | исправить имя / добавить файл                         |

## 17. Ограничения и частые вопросы

**Это работает в браузере?** Нет, только при сборке и в `npm run dev`. В браузер приходит
готовый HTML. Поэтому `x-for` не «перерисуется», если данные изменились в браузере, — для
этого есть JS (модули) или React-стартер.

**Можно отдать вёрстку в Битрикс/WordPress?** Да: `npm run build` → в `dist/*.html` обычный
HTML без `<x-…>` и `{{ }}`. Программист CMS увидит обычную разметку.

**Чем это отличается от Vue/React?** Синтаксис похож на Vue (`:attr`, `x-for` ~ `v-for`,
`x-if` ~ `v-if`, слоты) — навык переносится. Но реактивности нет: это шаблоны,
как в Nunjucks/Twig/Pug, только с HTML-синтаксисом и стилями рядом.

**А старый `<include src="header.html">`?** Работает (папка `partials/`), для совместимости
со старыми проектами. Всё новое лучше делать компонентами: у них props, слоты, свои стили и JS.

**Компонент может использовать другой компонент?** Да, сколько угодно глубоко
(`x-site-footer` внутри вызывает `x-callback-dialog` и `x-icon`).

**Как вывести `{{` буквально (пример кода)?** Атрибут `x-pre` у обёртки:
`<pre x-pre><code>{{ title }}</code></pre>` — внутри ничего не обрабатывается.

**Можно ли выносить компоненты в общий кит?** Можно настроить несколько папок:
`kit({ include: { components: ['src/components', 'kit/components'] } })` — первая главнее,
так проект переопределяет компонент кита одноимённой папкой.

**Подсказки в редакторе.** В `.vscode/` лежат подсказки для `x-for`, `x-if`, `slot` в
`.html` (VS Code предложит их при наборе).
