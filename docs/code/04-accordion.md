# 4. Аккордеон

[kit/js/modules/accordion/index.js](../../kit/js/modules/accordion/index.js) +
[kit/scss/components/_accordion.scss](../../kit/scss/components/_accordion.scss)

## Что это

Раскрывающиеся блоки: FAQ, характеристики товара, фильтры каталога. Самый наглядный модуль
кита — в 100 строках есть всё, что делает модуль «правильным»: настройки, уборка, единое место
изменения состояния, доступность, клавиатура, API наружу.

## Что делает

- Клик по заголовку раскрывает или сворачивает ответ.
- По умолчанию открыт только один пункт; с `data-accordion-multiple` — сколько угодно.
- Плавно анимирует высоту без замеров в JS.
- Открывает пункт, если его `id` в адресе: `/faq#delivery`.
- Скринридер слышит «кнопка, развёрнуто/свёрнуто», Tab не заходит в закрытые ответы.
- Стрелки ↑/↓, Home, End переходят между заголовками.
- Работает вложенным: аккордеон внутри ответа другого аккордеона.

## Как пользоваться

```html
<div class="accordion" data-module="accordion" data-accordion-multiple>
  <div class="accordion__item" id="delivery" data-accordion-item data-open>
    <h3>
      <button class="accordion__trigger" data-accordion-trigger>Сколько идёт доставка?</button>
    </h3>
    <div class="accordion__panel" data-accordion-panel>
      <div class="accordion__inner">От 1 до 3 дней.</div>
    </div>
  </div>
  …
</div>
```

| Атрибут                       | Где           | Зачем                                         |
| ----------------------------- | ------------- | --------------------------------------------- |
| `data-module="accordion"`     | корень        | запустить модуль                              |
| `data-accordion-multiple`     | корень        | можно открыть несколько                       |
| `data-accordion-hash="false"` | корень        | не открывать по `#id` в адресе                |
| `data-accordion-item`         | пункт         | один вопрос с ответом                         |
| `data-open`                   | пункт         | открыт при загрузке                           |
| `data-accordion-trigger`      | `<button>`    | заголовок-кнопка                              |
| `data-accordion-panel`        | ответ         | анимируемая обёртка                           |
| `.accordion__inner`           | внутри панели | **обязательная** внутренняя обёртка (см. CSS) |

`<h3>` вокруг кнопки — не для красоты: скринридер ходит по заголовкам клавишей H, и вопросы
FAQ должны быть заголовками.

Из JS:

```js
const faq = await ctx.modules.when('#faq', 'accordion')
faq.open(2) // открыть третий
faq.isOpen(0) // открыт ли первый
```

## Код по частям

### Настройки

```js
const DEFAULTS = {
  /** Можно открыть несколько пунктов одновременно. */
  multiple: false,
  /** Открывать пункт, если его id совпадает с #хешем в адресе. */
  hash: true,
}

export default function accordion(root, ctx = {}) {
  const options = readOptions(root, 'accordion', DEFAULTS, ctx.options)
  const d = createDisposer()
```

`ctx = {}` — значение по умолчанию: модуль можно вызвать и без контекста (в тесте, вручную).

### Найти «свои» пункты

```js
const items = ownElements(root, '[data-accordion-item]', '[data-accordion-panel]')
```

Почему не `root.querySelectorAll('[data-accordion-item]')`? Представьте вложенный аккордеон:

```
Аккордеон А
├── пункт А1
│   └── панель А1
│       └── Аккордеон Б
│           ├── пункт Б1     ← querySelectorAll из А найдёт и его!
│           └── пункт Б2
└── пункт А2
```

`querySelectorAll` ищет на любой глубине, и аккордеон А начал бы управлять пунктами Б.
`ownElements` отбрасывает элементы, у которых между ними и корнем есть **чужая панель**:

```js
export function ownElements(root, selector, nestedIn) {
  return qsa(selector, root).filter((el) => {
    const outer = el.parentElement?.closest(nestedIn) // ближайшая панель над элементом
    return !outer || !root.contains(outer) // нет её — свой; панель вне root — тоже свой
  })
}
```

Для Б1: ближайшая панель над ним — «панель А1», она внутри А → Б1 для А чужой. Для А1: панели
над ним нет → свой.

### Подготовить части и ARIA

```js
const parts = items.map((item) => {
  const trigger = ownElements(item, '[data-accordion-trigger]', '[data-accordion-panel]')[0]
  const panel = ownElements(item, '[data-accordion-panel]', '[data-accordion-panel]')[0]
  if (!trigger || !panel)
    throw new Error('[kit] accordion: в пункте нужны [data-accordion-trigger] и [data-accordion-panel]')
  trigger.setAttribute('aria-controls', ensureId(panel, 'acc-panel'))
  panel.setAttribute('role', 'region')
  panel.setAttribute('aria-labelledby', ensureId(trigger, 'acc-trigger'))
  return { item, trigger, panel }
})
```

- Внутри пункта тоже `ownElements` — по той же причине.
- **Понятная ошибка** вместо «Cannot read properties of undefined»: сразу ясно, что не так с
  разметкой. Реестр поймает её и напишет в консоль с элементом.
- `ensureId(panel)` — у панели может не быть `id`, а `aria-controls` ссылается **по id**. Функция
  даёт уникальный (`acc-panel-3`), если его нет.

Связи для скринридера:

```html
<button id="acc-trigger-1" aria-controls="acc-panel-1" aria-expanded="false">Вопрос</button>
<div id="acc-panel-1" role="region" aria-labelledby="acc-trigger-1" inert>Ответ</div>
```

«Кнопка „Вопрос“, свёрнуто» → нажали → «развёрнуто». Попав в ответ, скринридер скажет
«область „Вопрос“» — ясно, к какому вопросу ответ.

### Единственное место, где меняется состояние

```js
function set(index, open, { emit = true } = {}) {
  const part = parts[index]
  if (!part) return
  const { item, trigger, panel } = part
  if (open && !options.multiple) parts.forEach((_, i) => i !== index && set(i, false, { emit }))
  const was = item.hasAttribute('data-open')
  item.toggleAttribute('data-open', open)
  trigger.setAttribute('aria-expanded', String(open))
  panel.inert = !open
  if (emit && was !== open) {
    root.dispatchEvent(new CustomEvent('accordion:toggle', { bubbles: true, detail: { index, open, item } }))
  }
}
```

Построчно:

- `if (!part) return` — `open(99)` при трёх пунктах ничего не сломает.
- Режим «один открыт»: открываем пункт — сначала закрываем все остальные (рекурсивный вызов
  `set` с `false`).
- `toggleAttribute('data-open', open)` — второй аргумент «поставить или снять». По этому
  атрибуту CSS анимирует высоту.
- `String(open)` — `aria-expanded` ждёт строку `"true"`/`"false"`.
- `panel.inert = !open` — закрытая панель «невидима» для Tab, мыши и скринридера. Без этого Tab
  ходил бы по ссылкам внутри свёрнутого ответа.
- Событие — только если состояние **изменилось** (`was !== open`): `close(2)` на закрытом пункте
  не пошлёт лишнего `accordion:toggle`.

Одна функция — значит, `data-open`, `aria-expanded` и `inert` всегда согласованы.

### Начальное состояние

```js
parts.forEach(({ item }, i) => set(i, item.hasAttribute('data-open'), { emit: false }))
if (!options.multiple) {
  const firstOpen = parts.findIndex(({ item }) => item.hasAttribute('data-open'))
  if (firstOpen >= 0) set(firstOpen, true, { emit: false })
}
```

- Первый проход проставляет ARIA всем пунктам по разметке. `emit: false` — это не действие
  пользователя, событий не нужно.
- В режиме «один открыт» в разметке по ошибке могут быть два `data-open`. Оставляем первый.

```js
if (options.hash && location.hash) {
  const target = parts.findIndex(({ item }) => `#${item.id}` === location.hash)
  if (target >= 0) set(target, true, { emit: false })
}
```

Ссылка `/faq#delivery` из письма поддержки откроет нужный ответ.

### Клик — делегированием

```js
d.listen(root, 'click', (event) => {
  const trigger = event.target.closest('[data-accordion-trigger]')
  const index = parts.findIndex((p) => p.trigger === trigger)
  if (index >= 0) set(index, !parts[index].item.hasAttribute('data-open'))
})
```

- Один обработчик на корне. `closest` поднимается от места клика (иконка внутри кнопки) до
  кнопки.
- `parts.findIndex(p => p.trigger === trigger)` — не просто «какая-то кнопка аккордеона», а
  **наша**. Клик по кнопке вложенного аккордеона всплывёт и сюда, но в `parts` её нет —
  `index === -1`, ничего не делаем.

### Клавиатура

```js
d.listen(root, 'keydown', (event) => {
  const index = parts.findIndex((p) => p.trigger === event.target)
  if (index < 0) return
  const last = parts.length - 1
  const next = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: last }[event.key]
  if (next === undefined) return
  event.preventDefault()
  parts[(next + parts.length) % parts.length].trigger.focus()
})
```

- **Объект как таблица переходов** — вместо четырёх `if`: клавиша → номер.
- `event.preventDefault()` — иначе стрелка вниз ещё и прокрутит страницу.
- `(next + parts.length) % parts.length` — **по кругу**: с последнего вниз → на первый, с первого
  вверх → на последний (`-1 + 5) % 5 = 4`).

### API наружу

```js
  return {
    open: (i) => set(i, true),
    close: (i) => set(i, false),
    toggle: (i) => set(i, !parts[i]?.item.hasAttribute('data-open')),
    isOpen: (i) => Boolean(parts[i]?.item.hasAttribute('data-open')),
    destroy: d.dispose,
  }
}
```

Уборка — только обработчики (их снимет копилка). Атрибуты `data-open`/`aria-*` остаются: блок
после `destroy` выглядит так же, как был.

## CSS: анимация без замеров

```scss
.accordion__panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--duration) var(--ease);

  [data-open] > & {
    grid-template-rows: 1fr;
  }
}

.accordion__inner {
  min-height: 0;
  overflow: hidden;
}
```

- Панель — сетка с **одной строкой**. `0fr` — строка нулевой высоты, `1fr` — высотой с
  содержимое. Браузер умеет плавно анимировать `grid-template-rows` между ними.
- `min-height: 0` у внутренней обёртки — по умолчанию элемент сетки не сжимается меньше своего
  содержимого, и строка `0fr` всё равно была бы высотой с текст.
- `overflow: hidden` — пока строка низкая, текст не торчит наружу.
- `[data-open] > &` — «панель, чей родитель с `data-open`». Именно **родитель** (`>`), а не любой
  предок: иначе открытый внешний пункт раскрыл бы все вложенные панели.

Почему не измерить высоту в JS и анимировать `height`? Потому что высота меняется **после**
открытия: догрузилась картинка, повернули телефон. Застывшая в `style="height: 240px"` высота
обрежет текст. `1fr` всегда равна текущему содержимому.

## Что будет, если…

| Убрать                                | Что сломается                                                    |
| ------------------------------------- | ---------------------------------------------------------------- |
| `ownElements` → `querySelectorAll`    | внешний аккордеон начнёт открывать/закрывать пункты вложенного   |
| `panel.inert = !open`                 | Tab ходит по невидимым ссылкам внутри свёрнутых ответов          |
| `.accordion__inner`                   | высота не анимируется: строка `0fr` не сожмётся ниже содержимого |
| `event.preventDefault()` в клавиатуре | стрелки одновременно двигают фокус и прокручивают страницу       |
| проверку `was !== open`               | `close()` на закрытом пункте шлёт ложные события аналитике       |

## Проверьте себя

1. Почему клик по кнопке вложенного аккордеона не переключает пункт внешнего, хотя событие
   всплывает до его корня?
2. Что произойдёт при `faq.open(1)`, если сейчас открыт пункт 0, а `multiple` выключен?
   Сколько событий `accordion:toggle` придёт?
3. Как сделать, чтобы при загрузке все пункты были закрыты?

<details>
<summary>Ответы</summary>

1. `parts.findIndex(p => p.trigger === trigger)` вернёт `-1`: кнопки вложенного аккордеона нет
   среди `parts` внешнего.
2. Пункт 0 закроется, пункт 1 откроется — два события: `{ index: 0, open: false }` и
   `{ index: 1, open: true }`.
3. Не ставить `data-open` ни одному пункту. (В компоненте `<x-faq>` по умолчанию открыт первый —
   передайте `:open="-1"`.)

</details>
