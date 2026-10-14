# Практикум: задания на живом коде

Каждое задание — 15–40 минут. Делайте в шаблоне (`npm run dev`) или в проекте, созданном
`npm run create`. После каждого — `npm test` и `npm run lint`: если что-то покраснело, это часть
задания.

Ответы — под спойлерами. Сначала попробуйте сами.

---

## Лаба 1. Компонент из данных (глава 01)

**Задача.** Секция «Команда» на главной: заголовок через `<x-section-head>`, карточки людей
сеткой, данные из `src/data/team.json`. У человека может не быть фото — тогда кружок с
инициалами.

**Шаги:**

1. `npm run new -- component team-card`.
2. `src/data/team.json` — 3–4 человека, у одного без `photo`.
3. В `team-card.html` — `x-if`/`x-else` для фото и инициалов.
4. В `index.html` — секция с циклом.

<details>
<summary>Решение</summary>

```html
<!-- src/components/team-card/team-card.html -->
<article class="team-card">
  <img
    x-if="person.photo"
    class="team-card__photo"
    :src="person.photo"
    :alt="person.name"
    width="160"
    height="160"
    loading="lazy"
  />
  <span x-else class="team-card__initials" aria-hidden="true">
    {{ person.name.split(' ').map((w) => w[0]).join('') }}
  </span>
  <h3 class="h4">{{ person.name }}</h3>
  <p class="muted">{{ person.role }}</p>
</article>
```

```html
<section class="section">
  <div class="container stack">
    <x-section-head eyebrow="Люди" title="Команда" />
    <div class="auto-grid" style="--min: 220px" data-module="reveal">
      <x-team-card x-for="p of team" :person="p" data-reveal />
    </div>
  </div>
</section>
```

`data-reveal` перейдёт на корень карточки (атрибуты `data-*` переходят сами), и карточки
появятся волной.
</details>

---

## Лаба 2. Модуль «Прочитать полностью» (главы 02, 03)

**Задача.** Длинный отзыв обрезан до трёх строк; кнопка «Читать полностью» раскрывает его и
меняет текст на «Свернуть». Если текст и так короткий — кнопки нет.

```html
<div data-module="read-more" data-read-more-lines="3">
  <p data-read-more-text>Очень длинный отзыв…</p>
  <button type="button" data-read-more-button hidden>Читать полностью</button>
</div>
```

**Требования:** настройка `lines` через `readOptions`; уборка через `createDisposer`;
`aria-expanded` на кнопке; API `{ open, close, destroy }`; тест.

**Подсказка.** Обрезку делает CSS (`-webkit-line-clamp`, в ките есть миксин `line-clamp`).
Понять, обрезан ли текст: `text.scrollHeight > text.clientHeight`.

<details>
<summary>Решение</summary>

```js
// src/modules/read-more/index.js
import { createDisposer } from 'kit/js/core/lifecycle.js'
import { readOptions } from 'kit/js/core/options.js'

const DEFAULTS = { lines: 3, more: 'Читать полностью', less: 'Свернуть' }

export default function readMore(el, ctx = {}) {
  const options = readOptions(el, 'read-more', DEFAULTS, ctx.options)
  const d = createDisposer()
  const text = el.querySelector('[data-read-more-text]')
  const button = el.querySelector('[data-read-more-button]')
  text.style.setProperty('--lines', String(options.lines))

  function set(open) {
    el.toggleAttribute('data-open', open)
    button.setAttribute('aria-expanded', String(open))
    button.textContent = open ? options.less : options.more
  }

  // Обрезан ли текст — проверяем, когда он закрыт.
  const check = () => {
    if (el.hasAttribute('data-open')) return
    button.hidden = text.scrollHeight <= text.clientHeight
  }
  set(false)
  check()
  const ro = new ResizeObserver(check) // поменялась ширина — могло перестать обрезаться
  ro.observe(text)
  d.add(() => ro.disconnect())

  d.listen(button, 'click', () => set(!el.hasAttribute('data-open')))

  return { open: () => set(true), close: () => set(false), destroy: d.dispose }
}
```

```scss
[data-module='read-more']:not([data-open]) [data-read-more-text] {
  display: -webkit-box;
  -webkit-line-clamp: var(--lines, 3);
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

В тесте jsdom не считает высоту — `setSize(text, { height: 60, scrollHeight: 200 })` до запуска
модуля, и проверяйте, что кнопка видна. `ResizeObserver` в jsdom нет, но `test/setup.js`
подставляет заглушку.
</details>

---

## Лаба 3. Корзина из двух модулей (глава 04)

**Задача.** Кнопки «В корзину» на карточках (`data-module="add-to-cart"`) и счётчик в шапке
(`data-module="cart-badge"`). Модули не знают друг о друге. Счётчик должен показать
правильное число, даже если запустился **позже** первого добавления.

<details>
<summary>Решение</summary>

Шина с `replay`:

```js
// src/modules/add-to-cart/index.js
let count = 0 // общее на все кнопки: переменная модуля-файла
export default function addToCart(el, ctx) {
  const d = createDisposer()
  d.listen(el, 'click', () => ctx.bus.emit('cart:count', ++count))
  return { destroy: d.dispose }
}
```

```js
// src/modules/cart-badge/index.js
export default function cartBadge(el, ctx) {
  const d = createDisposer()
  d.add(
    ctx.bus.on(
      'cart:count',
      (n) => {
        el.textContent = String(n)
        el.hidden = n === 0
      },
      { replay: true },
    ),
  )
  return { destroy: d.dispose }
}
```

В настоящем проекте счётчик хранили бы в `localStorage` или брали с сервера, но принцип тот же:
одна сторона **сообщает**, другая **слушает**, `replay` спасает от гонки запуска.
</details>

---

## Лаба 4. Форма записи с ошибкой сервера (глава 05)

**Задача.** Форма «Записаться на консультацию»: имя, телефон, дата (не раньше завтра), время
(`data-mask="time"`), согласие. Мок отвечает 422 «Это время занято» под полем времени, если
выбрано `12:00`.

<details>
<summary>Решение</summary>

```js
// src/forms/schemas.js
const tomorrow = new Date()
tomorrow.setHours(24, 0, 0, 0) // ближайшая полночь — начало завтрашнего дня
registerSchema(
  'booking',
  s.object({
    name: s.string().trim().min(2),
    phone: s.string().phone(),
    date: s.date().min(tomorrow, 'Запись — с завтрашнего дня'),
    time: s.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время в формате ЧЧ:ММ'),
    consent: s.boolean().isTrue('Нужно ваше согласие'),
  }),
)
```

```js
// mocks/booking.js
export function POST({ body }) {
  if (body.time === '12:00') return { status: 422, body: { errors: { time: 'Это время занято' } } }
  return { body: { message: `Ждём вас ${body.date} в ${body.time}` } }
}
```

```html
<form data-module="form" data-form-ajax data-form-schema="booking" action="/api/booking" method="post" novalidate>
  …поля с name="name|phone|date|time|consent"…
  <p data-form-status role="status"></p>
</form>
```

Проверьте: выберите 12:00 → «Это время занято» под временем → уйдите с поля и вернитесь —
ошибка держится → измените на 12:30 — исчезла.
</details>

---

## Лаба 5. Свой цвет, слой и брейкпоинт (глава 06)

**Задача.**

1. Акцентный цвет `#0f766e`, тёмная тема — `#5eead4`.
2. Новый слой z-index `promo` между шапкой и меню.
3. Брейкпоинт `xs: 400px`, и на экранах от 400px карточки — в две колонки.

<details>
<summary>Решение</summary>

```scss
// src/styles/_abstracts.scss
@forward 'kit/scss/abstracts' with (
  $colors: (
    'accent': #0f766e,
  ),
  $colors-dark: (
    'accent': #5eead4,
  ),
  $z-layers: (
    'promo': 250,
  ),
  $breakpoints: (
    'xs': 400px,
  )
);
```

```scss
.cards {
  display: grid;
  @include up('xs') {
    grid-template-columns: 1fr 1fr;
  }
}
.promo-bar {
  z-index: z('promo');
}
```

Слой `250` совпадает с `popover` — если промо-плашка не должна спорить с выпадашками, выберите
`260`. Видно сразу, потому что все слои в одном списке. JS о новом брейкпоинте **не узнает**
автоматически: `getBreakpoints()` читает только стандартные имена — добавьте его в
`DEFAULT_BREAKPOINTS`, если он нужен в JS.
</details>

---

## Лаба 6. Анимация, которая уважает людей (глава 07)

**Задача.** Модуль `count-up`: число в `<span data-module="count-up" data-count-up-to="1500">`
досчитывает от 0, когда блок появился на экране. При «меньше движения» — сразу итог. Анимация
одна (не повторяется при прокрутке назад).

<details>
<summary>Решение</summary>

```js
import { gsap } from '@/lib/gsap.js'
import { createDisposer, onViewport } from 'kit/js/core/lifecycle.js'
import { readOptions } from 'kit/js/core/options.js'

export default function countUp(el, ctx = {}) {
  const { to } = readOptions(el, 'count-up', { to: 0 }, ctx.options)
  const d = createDisposer()
  const shown = { value: 0 }
  const render = () => (el.textContent = Math.round(shown.value).toLocaleString('ru-RU'))
  if (ctx.reduced) {
    shown.value = to
    render()
    return
  }
  render()
  d.add(
    onViewport(el, {
      once: true,
      enter: () => gsap.to(shown, { value: to, duration: 1.2, onUpdate: render }),
    }),
  )
  d.add(() => gsap.killTweensOf(shown))
  return { destroy: d.dispose }
}
```

В ките уже есть такой модуль — `counter`. Сравните своё решение с
`kit/js/modules/counter/index.js`: что там учтено, чего нет у вас?
</details>

---

## Лаба 7. Тот же блок в React (глава 08)

**Задача.** Компонент `<Tabs items={[{ title, content }]} />` на модуле `tabs` кита в
React-стартере. Переключение должно работать в StrictMode, а смена `items` — подхватываться.

<details>
<summary>Решение</summary>

```jsx
import { useModule } from 'kit/react/index.js'
import tabs from 'kit/js/modules/tabs/index.js'

const OPTIONS = { url: false } // вне компонента: одна ссылка — модуль не перезапускается

export function Tabs({ items }) {
  const ref = useModule(tabs, OPTIONS)
  return (
    <div className="tabs" ref={ref} key={items.map((i) => i.title).join('|')}>
      <div className="tabs__list" data-tabs-list>
        {items.map((item) => (
          <button className="tabs__tab" data-tabs-tab key={item.title}>
            {item.title}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div className="tabs__panel" data-tabs-panel key={item.title}>
          {item.content}
        </div>
      ))}
    </div>
  )
}
```

- В JSX нет `aria-selected`, `hidden`, `role` — это делает модуль.
- `key` по составу вкладок: поменялся набор — React пересоздаст блок, модуль запустится заново.
- `url: false` — в SPA адресом обычно управляет роутер.

</details>

---

## Лаба 8. Плагин сборки (глава 09)

**Задача.** Плагин Vite, который при сборке добавляет каждой внешней ссылке
`rel="noopener"` и `target="_blank"` (сейчас это делает JS-плагин `01-external-links.js` в
браузере). Что лучше и почему?

<details>
<summary>Решение</summary>

```js
export function externalLinks() {
  return {
    name: 'external-links',
    transformIndexHtml: {
      order: 'post', // после компонентов — ссылки уже развёрнуты
      handler: (html) =>
        html.replace(/<a\b([^>]*\bhref="https?:\/\/[^"]+"[^>]*)>/g, (tag, attrs) =>
          /\btarget=/.test(attrs) ? tag : `<a${attrs} target="_blank" rel="noopener noreferrer">`,
        ),
    },
  }
}
```

**Плюс сборки:** работает без JS и сразу видно в HTML. **Плюс браузерного плагина:** ловит
ссылки, которые появятся позже (тексты из CMS, «Показать ещё»), и не путает свой домен с чужим
(при сборке домен сайта неизвестен). Для вёрстки под CMS браузерный вариант надёжнее — поэтому
он в стартере.
</details>

---

## Лаба 9. Тест, который ловит утечку (глава 10)

**Задача.** Напишите тест: после `destroy` модуля `dialog` прокрутка страницы разблокирована,
даже если окно было открыто. Затем закомментируйте `if (locked) unlockScroll()` в уборке
модуля — тест должен покраснеть.

<details>
<summary>Решение</summary>

```js
import dialog from 'kit/js/modules/dialog/index.js'
import { isScrollLocked } from 'kit/js/core/scroll-lock.js'
import { createCtx, html } from '@test/helpers.js'

it('destroy при открытом окне снимает блокировку прокрутки', () => {
  const el = html('<dialog id="t" data-dialog-hash="false"><div class="dialog__box"></div></dialog>')
  const api = dialog(el, createCtx())
  api.open()
  expect(isScrollLocked()).toBe(true)
  api.destroy()
  expect(isScrollLocked()).toBe(false)
})
```

`data-dialog-hash="false"` — чтобы тест не трогал адрес и историю. `showModal` в jsdom нет —
его подставляет `test/setup.js`.
</details>
