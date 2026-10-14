# 10. Тесты — с нуля

## Зачем

Вы поправили аккордеон: теперь он открывается по `#id` в адресе. Проверили на главной — работает.
А на странице «Вопросы», где аккордеон **вложен** в другой аккордеон? А стрелки на клавиатуре
не сломались? А `destroy` всё убирает?

Проверять руками 50 модулей на каждую правку невозможно. Тест — это код, который проверяет
код: «вставь такую разметку, кликни сюда, убедись, что раскрылось». 300 таких проверок в ките
проходят за несколько секунд.

```bash
npm test             # один раз
npm run test:watch   # перезапускать при каждом сохранении
```

## Самый маленький тест

```js
// sum.test.js
import { describe, expect, it } from 'vitest'

const sum = (a, b) => a + b

describe('sum', () => {
  // группа проверок
  it('складывает два числа', () => {
    // одна проверка — «оно делает вот это»
    expect(sum(2, 3)).toBe(5) // ожидание: результат равен 5
  })
})
```

| Слово               | Значит                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| `describe`          | «про что эти тесты» — заголовок группы                                      |
| `it`                | одна проверка; название читается как предложение: «it складывает два числа» |
| `expect(x).toBe(y)` | «ожидаю, что x — это y»; не совпало — тест красный, с объяснением           |
| `toEqual`           | сравнение объектов **по содержимому**: `{ a: 1 }` равен `{ a: 1 }`          |

## Браузер без браузера: jsdom

Модулям нужен `document`. Запускать настоящий браузер на каждый тест — медленно. Поэтому тесты
идут в **jsdom** — «браузере в памяти» на чистом JS: есть `document`, элементы, события, но
**нет вёрстки**.

Что это значит на практике:

| В jsdom есть                                   | В jsdom нет                                                   |
| ---------------------------------------------- | ------------------------------------------------------------- |
| `querySelector`, `click()`, `addEventListener` | размеров: `offsetWidth`, `getBoundingClientRect()` — всегда 0 |
| `classList`, атрибуты, `CustomEvent`           | `matchMedia`, `IntersectionObserver`, `ResizeObserver`        |
| `<dialog>`, формы, `FormData`                  | анимаций и прокрутки                                          |

Недостающее кит подставляет в [test/setup.js](../../test/setup.js) — простыми заменителями,
которыми тест **управляет сам**:

```js
setMedia({ '(prefers-reduced-motion: reduce)': true }) // «пользователь просил меньше движения»
triggerIntersect(el, true) // «элемент появился на экране»
setSize(el, { width: 300, height: 200 }) // «у элемента такой размер»
```

## Тест модуля по шагам

Возьмём настоящий тест калькулятора —
[price-calc.test.js](../../starters/vanilla/src/components/price-calc/price-calc.test.js):

```js
import { describe, expect, it, vi } from 'vitest'
import priceCalc from './price-calc.js'
import { createCtx, html } from '@test/helpers.js'

const markup = `
  <form data-price-calc-base="10000" data-price-calc-per-page="1000">
    <b data-calc-pages-out></b>
    <input type="range" name="pages" value="5" data-calc-pages />
    <input type="checkbox" name="extras" value="3000" data-label="SEO" />
    <output data-calc-total></output>
    <button type="button" data-calc-order>Обсудить</button>
  </form>`

describe('price-calc', () => {
  it('считает сумму из настроек, страниц и опций', () => {
    const el = html(markup) // 1. вставить разметку
    const api = priceCalc(el, createCtx()) // 2. запустить модуль
    el.querySelector('input[name="extras"]').click() // 3. действие пользователя
    expect(api.value).toEqual({ pages: 5, extras: ['SEO'], sum: 18000 }) // 4. проверка
    api.destroy() // 5. убрать
  })
})
```

Это схема **«подготовь — сделай — проверь»** (по-английски Arrange — Act — Assert):

1. **`html(markup)`** — вставить разметку в документ и вернуть первый элемент. После каждого теста
   документ очищается сам.
2. **`createCtx()`** — контекст как в приложении: шина, `ctx.modules`. По умолчанию
   `reduced: true` — анимации выключены, и не нужно ждать, пока сумма «досчитает».
3. **`click()`** — настоящее событие, модуль его слушает как в браузере.
4. **Проверка через API модуля** — `api.value`. 10 000 база + 5 × 1 000 + 3 000 за SEO = 18 000.
5. **`destroy()`** — хорошая привычка: тест заодно проверяет, что уборка не падает.

Разметка в тесте — **минимальная**: только то, что нужно модулю. Не нужны классы, стили,
обёртки. Так видно, от чего модуль на самом деле зависит.

## Подмена соседей: `vi.fn()`

Второй тест калькулятора проверяет, что «Обсудить» открывает модалку. Но запускать настоящую
модалку незачем — нужно только убедиться, что её **попросили** открыться:

```js
it('«Обсудить» ждёт модалку через ctx.modules и открывает её', async () => {
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div id="callback"><input name="comment" /><p data-callback-note></p></div>',
  )

  const dialog = { open: vi.fn() } // поддельная модалка
  const ctx = createCtx({ modules: { when: vi.fn(async () => dialog) } }) // поддельный ctx.modules
  const ordered = vi.fn()
  ctx.bus.on('price:order', ordered)

  const el = html(markup)
  priceCalc(el, ctx)
  el.querySelector('[data-calc-order]').click()
  await vi.waitFor(() => expect(dialog.open).toHaveBeenCalled()) // ждём асинхронный when

  expect(ctx.modules.when).toHaveBeenCalledWith('#callback', 'dialog')
  expect(document.querySelector('#callback [name="comment"]').value).toContain('5 стр.')
  expect(ordered).toHaveBeenCalledWith(expect.objectContaining({ sum: 15000 }))
})
```

`vi.fn()` — **функция-шпион**: ничего не делает, но запоминает, сколько раз и с чем её вызвали.

| Проверка                                      | Значит                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `toHaveBeenCalled()`                          | вызывали хотя бы раз                                                                                       |
| `toHaveBeenCalledWith('#callback', 'dialog')` | вызывали **с этими** аргументами                                                                           |
| `expect.objectContaining({ sum: 15000 })`     | объект, в котором **есть** `sum: 15000` (остальное — неважно). Опцию здесь не отмечали: 10 000 + 5 × 1 000 |

Вот где окупается то, что модули общаются через `ctx` (глава 04): соседа легко подменить, потому
что модуль получает его **снаружи**, а не импортирует.

## Что тестировать в модуле

Хороший набор тестов модуля отвечает на пять вопросов:

1. **Основное поведение.** Клик — раскрылось.
2. **Настройки.** `data-accordion-multiple` — открываются несколько.
3. **Доступность.** После клика `aria-expanded="true"`, закрытая панель `inert`.
4. **Клавиатура.** Стрелка вниз — фокус на следующем заголовке.
5. **Уборка.** После `destroy` клик **ничего не делает**.

Последнее проверяется так:

```js
it('после destroy не реагирует на клики', () => {
  const el = html(markup)
  const api = accordion(el, createCtx())
  api.destroy()
  el.querySelector('[data-accordion-trigger]').click()
  expect(el.querySelector('[data-accordion-item]').hasAttribute('data-open')).toBe(false)
})
```

## Асинхронное: не гадайте со временем

```js
await tick(50) // ✗ «на глаз»: под нагрузкой не успеет — тест падает через раз
await until(() => dialog.open) // ✓ ждать ровно столько, сколько нужно
await vi.waitFor(() => expect(spy).toHaveBeenCalled()) // ✓ то же из Vitest
```

Тест, который падает «иногда», хуже, чем никакой: ему перестают верить. Ждите **условие**, а не
миллисекунды.

## Что тестируется кроме модулей

| Что                      | Где                                | Как                                          |
| ------------------------ | ---------------------------------- | -------------------------------------------- |
| Шаблонизатор компонентов | `kit/vite/html-components.test.js` | `renderHtml('<x-card …>')` → сравнить строку |
| SCSS-функции             | `kit/scss/scss.test.js`            | скомпилировать кусок SCSS и проверить CSS    |
| Генератор `npm run new`  | `kit/cli/new.test.js`              | создать во временной папке, проверить файлы  |
| `npm run create`         | `scripts/*.test.js`                | создать проект во временной папке            |
| React-хуки               | `kit/react/react.test.jsx`         | Testing Library + StrictMode                 |

Пример — шаблонизатор тестируется без Vite вообще, потому что `renderHtml` — **чистая функция**
(строка на входе, строка на выходе):

```js
const out = renderHtml('<p x-for="n of 3">{{ n }}</p>')
expect(out).toBe('<p>1</p><p>2</p><p>3</p>')
```

Чистые функции — самое простое для тестов. Поэтому в ките логика по возможности вынесена в них
(`stackTop`, `travelDistance`, `optionsKey`, `plural`), а модуль только связывает их с DOM.

## Ошибки

> **`getBoundingClientRect` возвращает нули** — это jsdom. `setSize(el, {…})`.
>
> **`matchMedia is not a function`** — тест запущен без `test/setup.js` (не та папка, свой
> конфиг). Запускайте из корня шаблона.
>
> **Тест проходит один, а вместе с другими падает** — предыдущий тест не убрал за собой
> (модуль не `destroy`, глобальная блокировка скролла). Ищите, что «утекает».
>
> **Тест «иногда» красный** — ожидание по времени вместо условия.

## Попробуйте сами

1. Запустите `npm run test:watch`, откройте `kit/js/core/core.test.js` и сломайте ожидание в
   любом тесте. Что показывает Vitest?
2. Напишите тест для модуля `copy-code` из главы 02: после клика текст кнопки «Скопировано».
   Как подменить `navigator.clipboard`?
3. Почему `createCtx()` по умолчанию даёт `reduced: true`?

<details>
<summary>Ответы</summary>

1. Какой тест упал, что ожидалось, что получилось, и строку с ошибкой.
2. ```js
   it('копирует и меняет текст', async () => {
     const writeText = vi.fn(async () => {})
     Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
     const el = html('<div><code>npm run dev</code><button>Скопировать</button></div>')
     const api = copyCode(el, createCtx())
     el.querySelector('button').click()
     await vi.waitFor(() => expect(el.querySelector('button').textContent).toBe('Скопировано'))
     expect(writeText).toHaveBeenCalledWith('npm run dev')
     api.destroy()
   })
   ```
3. Чтобы не ждать анимаций: модули с `reduced` показывают результат сразу. Тест с анимацией
   включает её явно: `createCtx({ reduced: false })`.

</details>
