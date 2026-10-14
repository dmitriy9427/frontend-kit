# 02. Модуль с нуля

## Зачем

Обычно поведение на сайт добавляют так:

```js
// main.js
document.querySelector('.faq button').addEventListener('click', …)
document.querySelector('.slider').…
document.querySelector('.tabs').…
```

Через месяц в `main.js` 600 строк, и начинаются вопросы:

- на странице «Контакты» нет слайдера — `document.querySelector('.slider')` вернул `null`, и
  весь скрипт упал на `.addEventListener` у `null`;
- «Показать ещё» подгрузило новые карточки — у них ничего не работает;
- открыли модалку, закрыли, открыли снова — обработчик клика сработал дважды.

Модуль — это договорённость, которая убирает все три проблемы разом.

## Договорённость (контракт)

```js
export default function имяМодуля(element, ctx) {
  // 1. оживить element: обработчики, анимации
  return {
    destroy() {
      // 2. выключить всё, что включили в пункте 1
    },
  }
}
```

И в HTML:

```html
<div data-module="имя-модуля">…</div>
```

Три правила:

1. Модуль работает **только внутри своего `element`**. Не ищет ничего по всей странице.
2. Модуль **ничего не делает сам при импорте** файла. Только когда его вызвали.
3. Всё, что модуль включил, он **выключает в `destroy`**.

Кто вызывает функцию — глава 03. Сейчас важно: блока на странице нет — функция не вызвана,
и упасть нечему. Блок подгрузился — функция вызвана для него.

## Самый маленький пример: «скопировать в буфер»

```html
<div data-module="copy-code">
  <code>npm run dev</code>
  <button type="button">Скопировать</button>
</div>
```

```js
// src/modules/copy-code/index.js
export default function copyCode(el) {
  const button = el.querySelector('button')
  const text = el.querySelector('code').textContent

  const onClick = async () => {
    await navigator.clipboard.writeText(text)
    button.textContent = 'Скопировано'
  }
  button.addEventListener('click', onClick)

  return {
    destroy() {
      button.removeEventListener('click', onClick)
    },
  }
}
```

Разбор:

| Строка                                 | Что делает                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `export default function copyCode(el)` | функция модуля; `el` — тот самый `<div data-module="copy-code">`                                    |
| `el.querySelector('button')`           | ищем **внутри блока**, а не во всём `document`. Три таких блока на странице — у каждого своя кнопка |
| `const onClick = …`                    | обработчик в переменной — чтобы потом снять **ту же самую** функцию                                 |
| `return { destroy() {…} }`             | как выключить: снять обработчик                                                                     |

Регистрировать не нужно: файл в `src/modules/copy-code/index.js` найдётся сам по имени папки.

> В ките уже есть готовый модуль `copy` (с уведомлением и запасным способом для старых браузеров).
> Пример назван `copy-code`, чтобы не путать. Если назвать свой модуль `copy`, он **заменит**
> модуль кита: модули проекта подключаются после кита и перекрывают одноимённые.

## Проблема: уборку легко забыть

В примере один обработчик — снять несложно. Настоящий модуль вешает пять обработчиков, два
таймера и анимацию. Забудете одну строку в `destroy` — утечка: обработчик висит, а блока уже
нет.

Поэтому в ките есть **копилка уборки** — `createDisposer()`:

```js
import { createDisposer } from 'kit/js/core/lifecycle.js'

export default function copyCode(el) {
  const d = createDisposer()
  const button = el.querySelector('button')
  const text = el.querySelector('code').textContent

  d.listen(button, 'click', async () => {
    // повесить И запомнить, как снять
    await navigator.clipboard.writeText(text)
    button.textContent = 'Скопировано'
    d.timeout(() => (button.textContent = 'Скопировать'), 2000) // таймер — тоже в копилку
  })

  return { destroy: d.dispose } // выключить всё накопленное
}
```

Что умеет копилка:

| Метод                           | Что делает                                                                     | Вместо чего                   |
| ------------------------------- | ------------------------------------------------------------------------------ | ----------------------------- |
| `d.listen(target, 'click', fn)` | вешает обработчик и запоминает `removeEventListener` **с теми же аргументами** | пары `add`/`remove`           |
| `d.timeout(fn, 2000)`           | `setTimeout`, который отменится при уборке                                     | `setTimeout` + `clearTimeout` |
| `d.interval(fn, 1000)`          | то же для `setInterval`                                                        |                               |
| `d.add(() => …)`                | запомнить любую уборку: `tween.kill()`, `observer.disconnect()`                |                               |
| `d.dispose()`                   | выполнить всё **в обратном порядке**; повторный вызов безопасен                | ручной `destroy`              |

Зачем таймер в копилке? Пользователь нажал «Скопировать» и сразу ушёл на другую вкладку SPA.
Блок удалили. Через 2 секунды таймер меняет текст **удалённой** кнопки. Здесь — безобидно, но
если таймер шлёт аналитику или открывает модалку, получается «событие из прошлого».

Почему **обратный** порядок? Уборка — как разбор матрёшки: что включили последним, то
выключаем первым. Если анимация создана поверх наблюдателя, сначала убиваем анимацию.

Как копилка устроена внутри — [разбор кода](../code/02-lifecycle.md).

## Настройки из атрибутов: `readOptions`

Скопированное сообщение хочется менять: в одном блоке «Скопировано», в другом «Готово!».
Настройки модуля пишутся атрибутами `data-<модуль>-<настройка>`:

```html
<div data-module="copy-code" data-copy-code-done="Готово!" data-copy-code-reset="3000">…</div>
```

```js
import { readOptions } from 'kit/js/core/options.js'

const DEFAULTS = {
  done: 'Скопировано', // строка
  reset: 2000, // число
}

export default function copyCode(el, ctx = {}) {
  const options = readOptions(el, 'copy-code', DEFAULTS, ctx.options)
  // options = { done: 'Готово!', reset: 3000 }  ← 3000 — ЧИСЛО, а не "3000"
}
```

Главная хитрость: **тип берётся из значения по умолчанию**. В атрибутах всё — строки, но:

| Значение по умолчанию | Атрибут                                | Получится                                                                      |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| `2000` (число)        | `data-copy-code-reset="3000"`          | `3000`                                                                         |
| `2000` (число)        | `data-copy-code-reset="abc"`           | `2000` — не число, взяли умолчание                                             |
| `false` (boolean)     | `data-copy-code-silent` (без значения) | `true`                                                                         |
| `false` (boolean)     | `data-copy-code-silent="false"`        | `false` ← частый баг в чужом коде: `"false"` — непустая строка, то есть `true` |
| `[]` (массив)         | `data-copy-code-list='["a","b"]'`      | `['a', 'b']`                                                                   |

Ещё `readOptions` предупреждает об опечатках:

```html
<div data-module="copy-code" data-copy-code-dnoe="Готово!"></div>
```

```
[kit] copy-code: неизвестная настройка «data-copy-code-dnoe». Есть: done, reset
```

`ctx.options` — настройки, переданные из JS (например, из React). Они важнее атрибутов.

## Свой API: управлять модулем снаружи

То, что вернула функция, — **экземпляр**. В нём кроме `destroy` можно вернуть свои методы:

```js
return {
  copy: () => button.click(), // скопировать программно
  get text() {
    return text
  }, // прочитать, что копируем
  destroy: d.dispose,
}
```

Другой модуль сможет их вызвать — как именно, глава 04.

## Как это сделано в ките: аккордеон

[kit/js/modules/accordion/index.js](../../kit/js/modules/accordion/index.js) — 100 строк, в
которых есть всё из этой главы. Вот он по частям.

**1. Настройки и копилка:**

```js
const DEFAULTS = {
  multiple: false,   // можно открыть несколько пунктов
  hash: true,        // открыть пункт, если #id в адресе
}

export default function accordion(root, ctx = {}) {
  const options = readOptions(root, 'accordion', DEFAULTS, ctx.options)
  const d = createDisposer()
```

**2. Найти части и подготовить доступность:**

```js
  const items = ownElements(root, '[data-accordion-item]', '[data-accordion-panel]')

  const parts = items.map((item) => {
    const trigger = …'[data-accordion-trigger]'…
    const panel = …'[data-accordion-panel]'…
    trigger.setAttribute('aria-controls', ensureId(panel, 'acc-panel'))
    panel.setAttribute('role', 'region')
    panel.setAttribute('aria-labelledby', ensureId(trigger, 'acc-trigger'))
    return { item, trigger, panel }
  })
```

- `ownElements` вместо `querySelectorAll` — потому что аккордеон бывает **вложенным**.
  `querySelectorAll('[data-accordion-item]')` нашёл бы и пункты внутреннего аккордеона, и
  внешний начал бы ими управлять. `ownElements` берёт только «свои» — те, что не лежат внутри
  чужой панели.
- `ensureId(panel)` — даёт элементу `id`, если его нет. Нужен, чтобы связать кнопку с панелью
  через `aria-controls`: скринридер скажет «кнопка, управляет областью „Ответ“».

**3. Одна функция меняет состояние:**

```js
function set(index, open, { emit = true } = {}) {
  const { item, trigger, panel } = parts[index]
  if (open && !options.multiple) parts.forEach((_, i) => i !== index && set(i, false, { emit }))
  item.toggleAttribute('data-open', open) // для CSS: [data-open] — раскрыт
  trigger.setAttribute('aria-expanded', String(open)) // для скринридера
  panel.inert = !open // Tab не попадёт в закрытую панель
  if (emit) root.dispatchEvent(new CustomEvent('accordion:toggle', { bubbles: true, detail: { index, open, item } }))
}
```

Все изменения проходят через **одно место**. Поэтому `data-open`, `aria-expanded` и `inert`
никогда не разъедутся: невозможно открыть пункт и забыть про `aria-expanded`.

`inert` — свойство браузера «этого блока как будто нет»: внутрь не попадает Tab, по нему не
кликнуть, скринридер его пропускает. Без него Tab ходил бы по ссылкам **внутри закрытого**
ответа — невидимым.

**4. Обработчики — через копилку и делегирование:**

```js
d.listen(root, 'click', (event) => {
  const trigger = event.target.closest('[data-accordion-trigger]')
  const index = parts.findIndex((p) => p.trigger === trigger)
  if (index >= 0) set(index, !parts[index].item.hasAttribute('data-open'))
})
```

Один обработчик на **весь** аккордеон, а не по одному на кнопку. Клик по `<span>` внутри
кнопки всплывает до `root`, `closest` находит кнопку. Это называется **делегирование**.

**5. Клавиатура:** стрелки ↑/↓ и Home/End переходят между заголовками — так ожидает
пользователь скринридера (по рекомендациям WAI-ARIA для аккордеона).

**6. Экземпляр:**

```js
  return {
    open: (i) => set(i, true),
    close: (i) => set(i, false),
    toggle: (i) => …,
    isOpen: (i) => …,
    destroy: d.dispose,
  }
}
```

Полный разбор с каждой строкой — [code/04-accordion.md](../code/04-accordion.md).

### А анимация где?

В JS её нет. Высоту раскрытия анимирует CSS:

```scss
.accordion__panel {
  display: grid;
  grid-template-rows: 0fr; // закрыто: строка нулевой высоты
  transition: grid-template-rows 0.3s;
}
.accordion__item[data-open] .accordion__panel {
  grid-template-rows: 1fr; // открыто: строка во всю высоту содержимого
}
.accordion__inner {
  min-height: 0; // без этого строка не сожмётся до нуля
  overflow: hidden; // и содержимое не будет торчать из-под неё
}
```

`height: auto` анимировать нельзя, поэтому обычно высоту **меряют** JS-ом. Это ломается, когда
внутри догрузилась картинка: высота «застыла» на старом значении, и текст обрезан. Трюк с
`0fr → 1fr` анимирует настоящую высоту силами CSS без всяких замеров. Модуль только ставит
`data-open`.

**Правило кита: JS меняет состояние (атрибуты), CSS решает, как это выглядит.**

## Ошибки

> **`document.querySelector` внутри модуля.** Два аккордеона на странице — второй управляет
> первым. Ищите внутри `el`.
>
> **Анонимная функция в `removeEventListener`.**
> `el.removeEventListener('click', () => …)` ничего не снимет: это **другая** функция. Используйте
> `d.listen`.
>
> **Модуль работает при импорте.** Код вне `export default function` выполнится, даже если
> блока нет на странице. Всё — внутри функции.
>
> **Нет значения по умолчанию у настройки.** `readOptions` не знает, какого типа
> `data-copy-code-reset="3000"`, и не видит ключ вовсе. Каждая настройка — в `DEFAULTS`.
>
> **Состояние меняется в трёх местах.** Где-то поставили `data-open`, а `aria-expanded` забыли.
> Заведите одну функцию `set()`, через которую идут все изменения.

## Попробуйте сами

1. Сгенерируйте модуль `npm run new -- module copy-code` и напишите его по этой главе. Где он
   окажется и что нужно, чтобы он запустился?
2. Добавьте модулю `copy-code` настройку `reset` (через сколько вернуть текст). Какой атрибут нужен
   в HTML?
3. В консоли разработчика на странице с FAQ выполните
   `__kit.modules.get('.accordion').open(2)`. Что произошло и откуда взялся `__kit`?
4. Почему в аккордеоне один обработчик клика на весь блок, а не по одному на кнопку?

<details>
<summary>Ответы</summary>

1. В `src/modules/copy-code/index.js` (+ тест рядом). Достаточно `data-module="copy-code"` в HTML —
   `main.js` находит модули проекта по маске `./modules/*/index.js` сам.
2. `DEFAULTS = { done: 'Скопировано', reset: 2000 }`, в коде
   `d.timeout(…, options.reset)`. В HTML: `data-copy-code-reset="5000"`.
3. Раскрылся третий вопрос (нумерация с нуля). `__kit` — приложение, которое `createApp`
   кладёт в `window` **только в разработке** (`if (import.meta.env.DEV) window.__kit = app`).
4. Делегирование: меньше обработчиков, и не нужно ничего вешать заново, если пункт
   добавили позже. И уборка — одна строка.

</details>
