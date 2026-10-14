# 9. Шаблонизатор компонентов

[kit/vite/html-components.js](../../kit/vite/html-components.js) — ~600 строк, работает **в
Node.js** при сборке и в `npm run dev`. В браузер не попадает ни строчки.

## Что это

То, что превращает `<x-card title="Быстро">` в готовую разметку карточки, размножает `x-for`,
убирает ложные `x-if` и подставляет `{{ }}`. Синтаксис для вёрстки — в
[главе 01](../learn/01-components.md), как подключён плагин — в [главе 09](../learn/09-vite.md).

## Что делает

- Разбирает HTML страницы в дерево, обходит его и строит новое.
- Вычисляет выражения `{{ … }}` и `:attr="…"` в области видимости шаблона.
- Подставляет компоненты из `src/components/имя/имя.html` с props и слотами.
- Переносит `class`, `id`, `data-*`, `aria-*` из вызова на корень компонента.
- Ставит `data-module`, если у компонента есть свой JS.
- Читает данные из `src/data/*.json|js`.
- Помечает ссылку на текущую страницу `aria-current="page"`.
- Сообщает об ошибках с полным путём: страница → компонент → вложенный компонент.

## Общая схема

```mermaid
flowchart TD
    A[transformIndexHtml: HTML страницы] --> B[loadData: src/data/*.json → globals]
    B --> C[renderHtml]
    C --> D[parseDocument → дерево]
    D --> E[renderNodes: обход]
    E -->|текст| F[interpolate: {{ }}]
    E -->|x-for / x-if / x-else| G[размножить / убрать]
    E -->|&lt;x-имя&gt;| H[renderComponent → renderNodes его дерева]
    E -->|&lt;slot&gt;| I[renderSlot: содержимое из вызова]
    E --> J[dom-serializer → строка]
    J --> K[markCurrentLinks: aria-current]
```

## Код по частям

### Разбор и сборка HTML

```js
const PARSE = {
  lowerCaseAttributeNames: false,
  lowerCaseTags: false,
  recognizeSelfClosing: true,
  decodeEntities: false,
}
```

Настройки парсера `htmlparser2`:

- **не приводить к нижнему регистру** — иначе `:perPage` стал бы `:perpage`, и prop `perPage`
  потерялся бы;
- **`recognizeSelfClosing`** — `<x-card />` закрыт сразу. По стандарту HTML `/>` у
  нестандартных тегов игнорируется, и всё ниже попало бы **внутрь** карточки;
- **`decodeEntities: false`** — `&nbsp;` и `&mdash;` остаются как написаны, а не превращаются в
  символы и обратно.

### Вычисление выражений

```js
const compiled = new Map()

function evaluate(expr, scope, c, missing) {
  let fn = compiled.get(expr)
  if (!fn) {
    try {
      fn = new Function('$scope', `with ($scope) { return (${expr}\n) }`)
    } catch (error) {
      throw templateError(c, `ошибка синтаксиса в «${expr.trim()}»: ${error.message}`, error)
    }
    compiled.set(expr, fn)
  }
  const proxy = new Proxy(scope, {
    has: (_, key) => typeof key === 'string' && !GLOBALS.has(key),
    get: (target, key) => {
      if (typeof key !== 'string') return undefined
      if (key in target) return target[key]
      missing?.push(key)
      return undefined
    },
  })
  try {
    return fn(proxy)
  } catch (error) {
    throw templateError(c, `не удалось вычислить «${expr.trim()}»: ${error.message}`, error)
  }
}
```

Разберём по частям.

**`new Function('$scope', 'with ($scope) { return (price * 2) }')`** создаёт функцию из
строки. Это как `eval`, но с отдельной областью видимости. Компиляция дорогая — поэтому
кешируем по тексту выражения (`compiled`): одно и то же `{{ item.title }}` в цикле из 100
элементов компилируется один раз.

**`\n` перед `)`** — защита от выражения, которое заканчивается комментарием `// …`: без
переноса строки комментарий «съел» бы закрывающую скобку.

**`with ($scope)`** — «ищи имена сначала в этом объекте». Запрещено в строгом режиме, но
функции из `new Function` нестрогие.

**`Proxy`** — объект-посредник, который перехватывает обращения:

| Ловушка    | Когда вызывается                            | Что делает                                           |
| ---------- | ------------------------------------------- | ---------------------------------------------------- |
| `has(key)` | `with` спрашивает «есть ли у тебя `price`?» | «да» на **любое** имя, кроме `Math`, `JSON`, `Date`… |
| `get(key)` | читают `price`                              | значение из области или `undefined`                  |

Зачем говорить «да» на всё? Иначе `with` пошёл бы искать незнакомое имя в глобальной области
Node и бросил бы `ReferenceError: subtitle is not defined`. А так `subtitle` — просто
`undefined`, и `x-if="subtitle"` ложно. Встроенные объекты (`GLOBALS`) — исключение: для них
`has` отвечает «нет», и `with` берёт настоящий `Math`.

### Подстановка `{{ }}`

```js
const MUSTACHE = /\{\{\{([\s\S]+?)\}\}\}|\{\{([\s\S]+?)\}\}/g

function interpolate(text, scope, c) {
  if (!text.includes('{{')) return text
  return text.replace(MUSTACHE, (_, raw, escaped) => {
    const expr = (raw ?? escaped).trim()
    let value
    const legacy = expr.match(LEGACY_DEFAULT)
    if (legacy) { … }                                   // {{ title | По умолчанию }} — старый синтаксис
    else if (KEBAB_NAME.test(expr)) value = lookup(scope, expr)   // {{ og-image }}
    else value = evaluate(expr, scope, c)
    …
    if (value === undefined || value === null || value === false) return ''
    return raw !== undefined ? String(value) : escapeHtml(value)
  })
}
```

- Быстрый выход `if (!text.includes('{{'))` — большинство текстовых узлов без выражений.
- Регулярка с **двумя группами**: сначала `{{{ }}}` (группа `raw`), потом `{{ }}` (группа
  `escaped`). Порядок важен — иначе `{{{x}}}` поймалось бы как `{{` + `{x` + `}}`.
- `[\s\S]+?` — любые символы, включая перенос строки, **нежадно** (до первого `}}`).
- `{{ og-image }}` — с дефисом это не вычитание `og - image`, а имя: так называли переменные в
  старых `<include>`.
- `undefined`, `null`, `false` → пустая строка. Удобно: `{{ subtitle }}` без subtitle ничего не
  выводит.
- Две скобки — `escapeHtml`, три — как есть.

```js
export const escapeHtml = (value) =>
  String(value)
    .replace(/&(?!(?:[a-z\d]+|#\d+|#x[\da-f]+);)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
```

Первая замена хитрая: `&` превращается в `&amp;`, **кроме** уже готовых сущностей (`&nbsp;`,
`&#8212;`). Иначе `&nbsp;` из данных превратился бы в `&amp;nbsp;` и на странице появился бы
текст «&nbsp;».

### Обход дерева: `renderNodes`

```js
function renderNodes(nodes, scope, c) {
  const out = []
  let lastIf = null
  for (const node of nodes) {
    if (isText(node)) {
      out.push(new Text(c.raw ? node.data : interpolate(node.data, scope, c)))
      if (node.data.trim()) lastIf = null
      continue
    }
    …
```

`lastIf` — результат последнего `x-if` среди соседей, для `x-else`. Текст **с содержимым** между
ними сбрасывает его (`x-else` должен идти сразу после), а пробелы и переносы — нет.

```js
    if ('x-else' in a) {
      if (lastIf === null) throw templateError(c, `x-else без x-if перед ним (<${node.name}>)`)
      const show = !lastIf
      lastIf = null
      if (show) out.push(...renderElement(withoutAttrs(node, ['x-else']), scope, c, isTemplate))
      continue
    }
```

`withoutAttrs` — копия узла без служебного атрибута: в итоговый HTML `x-else` не попадёт.

```js
    if ('x-for' in a) {
      lastIf = null
      const { index, list, assign } = parseFor(a['x-for'], c)
      const items = toList(evaluate(list, scope, c))
      const clone = withoutAttrs(node, ['x-for'])
      items.forEach((value, i) => {
        const itemScope = Object.create(scope)
        assign(itemScope, value)
        if (index) itemScope[index] = i
        if ('x-if' in clone.attribs && !evaluate(clone.attribs['x-if'], itemScope, c)) return
        out.push(...renderElement(withoutAttrs(clone, ['x-if']), itemScope, c, isTemplate))
      })
      continue
    }
```

- `parseFor` разбирает `"(item, i) of items"` на имя элемента, имя индекса и выражение списка.
  Понимает и деструктуризацию: `([key, value], i) of Object.entries(obj)`.
- `toList` — что угодно в массив: число `3` → `[1, 2, 3]`, объект → его пары, `null` → `[]`.
- **`Object.create(scope)`** — новая область, **наследующая** внешнюю. `item` своя у каждой
  итерации, а `site`, `page` и всё внешнее видно через прототип. Внешняя область не меняется.
- `x-if` на том же элементе проверяется **для каждого** элемента — это фильтр:
  `<li x-for="p of products" x-if="p.inStock">`.

### Компонент: `renderComponent`

```js
function renderComponent(node, scope, c) {
  const name = node.name.toLowerCase().slice(2)          // 'x-card' → 'card'
  if (c.stack.length >= MAX_DEPTH)
    throw templateError(c, `слишком глубокая вложенность компонентов (бесконечная рекурсия?)`)
  const component = c.load(name)
  if (!component) { … throw с перечнем существующих компонентов }
```

`MAX_DEPTH = 25` — компонент, вызывающий сам себя (`<x-card>` внутри `card.html`), иначе
«завесил» бы сборку.

```js
const props = {}
const passed = {}
for (const [attr, value] of Object.entries(node.attribs)) {
  const isBound = attr.startsWith(':')
  const key = isBound ? attr.slice(1) : attr
  const val = isBound ? evaluate(value, scope, c) : value === '' ? true : interpolate(value, scope, c)
  props[camel(key)] = val
  passed[key] = val
}
```

- `:price="1990"` → вычислить → число. `title="Быстро"` → строка. `featured` (пусто) → `true`.
- Значения вычисляются в области **вызывающего** (`scope`): `:items="faq"` ищет `faq` там, где
  написан вызов.
- `props` — с camelCase-именами (`per-page` → `perPage`) для шаблона; `passed` — с исходными,
  для переноса атрибутов.

```js
const slots = { default: [] }
for (const child of node.children) {
  const slot = isTag(child) ? child.attribs.slot : undefined
  if (!slot) slots.default.push(child)
  else if (child.name.toLowerCase() === 'template') slots[slot] = child.children
  else slots[slot] = [withoutAttrs(child, ['slot'])]
}
const $slots = Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, hasContent(v)]))
```

Дети вызова раскладываются по слотам. `<template slot="footer">` отдаёт **содержимое** (без
самого `<template>`), обычный элемент со `slot` — себя целиком. `$slots.footer` — есть ли там
что-то кроме пробелов.

```js
const local = Object.assign(Object.create(c.globals), props, { $props: props, $attrs: passed, $slots })
const inner = {
  ...c,
  stack: [...c.stack, `x-${name}`],
  slots: { nodes: slots, scope, ctx: c },
}
const nodes = renderNodes(component.nodes, local, inner)
```

Ключевое решение — **изоляция**: область компонента наследует только `globals` (данные из
`src/data`, `page`, `year`), а **не** область вызывающего. Переменная цикла снаружи не
«протекает» внутрь компонента — только то, что передали props. Как в React.

А вот слоты запоминают **область вызывающего** (`slots.scope`): содержимое слота написано там и
должно видеть переменные того места.

```html
<li x-for="p of team">
  <x-card :title="p.name">
    <p>{{ p.role }}</p>
    <!-- p видна: слот рисуется в области вызова -->
  </x-card>
</li>
```

```js
function renderSlot(node, scope, c) {
  const name = node.attribs.name || 'default'
  const provided = c.slots.nodes[name]
  if (provided && hasContent(provided)) return renderNodes(provided, c.slots.scope, c.slots.ctx)
  return renderNodes(node.children, scope, c)
}
```

Не передали — рисуется **запасное** содержимое `<slot>…</slot>` из самого компонента.

### Перенос атрибутов на корень

```js
  const rootEl = nodes.find((n) => isTag(n))
  const fall = Object.entries(passed).filter(([k]) => FALLTHROUGH.test(k))
  if (rootEl) {
    for (const [key, val] of fall) {
      if (key === 'class') rootEl.attribs.class = [rootEl.attribs.class, classValue(val)].filter(Boolean).join(' ')
      else if (key === 'style') …
      else if (key === 'data-module') addModule(rootEl, String(val))
      else if (val !== false && val !== null && val !== undefined)
        rootEl.attribs[key] = val === true ? '' : escapeHtml(String(val))
    }
    if (component.script) addModule(rootEl, name)
  }
```

- `class` и `style` **дописываются** к своим, остальные заменяют.
- `data-module` из вызова **добавляется** к модулям компонента:
  `<x-card data-module="reveal">` у карточки со своим JS → `data-module="card reveal"`.
- `component.script` — у компонента есть `card.js` → `data-module="card"`.

### Загрузчик компонентов с кешем

```js
export function componentLoader(dirs) {
  const cache = new Map()
  const load = (name) => {
    for (const dir of dirs) {
      const file = join(dir, name, `${name}.html`)
      if (!existsSync(file)) continue
      const mtime = statSync(file).mtimeMs
      const hit = cache.get(file)
      if (hit && hit.mtime === mtime) return hit
      const entry = {
        file, mtime,
        nodes: stripDocs(parseDocument(readFileSync(file, 'utf8'), PARSE).children),
        script: ['js', 'ts'].some((ext) => existsSync(join(dir, name, `${name}.${ext}`))),
      }
      cache.set(file, entry)
      return entry
    }
    return null
  }
```

- Несколько папок по порядку — **первая найденная главнее**: можно подключить общую папку
  компонентов, а одноимённый компонент проекта её перекроет.
- Кеш по **времени изменения файла** (`mtimeMs`): пока файл не трогали, разбирается один раз.
  Поправили — время другое, разберётся заново. Поэтому `dev` и быстрый, и свежий.
- `stripDocs` — убирает комментарии **верхнего уровня**: это документация компонента, на каждой
  странице она не нужна.

### Ссылка на текущую страницу

```js
export function markCurrentLinks(html, pagePath) {
  const norm = (p) =>
    ('/' + p.replace(/^\.?\//, '').replace(/^%BASE_URL%/, ''))
      .replace(/[?#].*$/, '')
      .replace(/index\.html$/, '')
      .replace(/\.html$/, '')
      .replace(/\/$/, '') || '/'
  const current = norm(pagePath)
  return html.replace(/<a\b([^>]*?)\bhref="([^"]+)"([^>]*)>/g, (tag, before, href, after) => {
    if (/^(https?:|mailto:|tel:)/.test(href) || href.includes('#') || /aria-current/.test(tag)) return tag
    return norm(href) === current ? `<a${before}href="${href}" aria-current="page"${after}>` : tag
  })
}
```

`norm` приводит разные записи одного адреса к одному виду: `/about.html`, `about.html`,
`/about`, `/about/` → `/about`. Якоря (`/#faq`) пропускаются — это раздел страницы, а не сама
страница (их подсвечивает модуль `scroll-spy`).

## Что будет, если…

| Убрать                                              | Что сломается                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `recognizeSelfClosing`                              | всё после `<x-card />` окажется внутри карточки                          |
| ловушку `has` у Proxy                               | `{{ subtitle }}` без subtitle роняет сборку `ReferenceError`             |
| кеш `compiled`                                      | сборка большого сайта замедлится в разы (компиляция на каждое вхождение) |
| `Object.create(c.globals)` → `Object.create(scope)` | переменные вызывающего «протекают» в компонент, имена конфликтуют        |
| `slots.scope` (рисовать слот в области компонента)  | `{{ p.role }}` внутри слота не видит `p` из цикла                        |
| исключение готовых сущностей в `escapeHtml`         | `&nbsp;` из данных выводится текстом                                     |

## Проверьте себя

1. Почему props вычисляются в области вызывающего, а шаблон компонента — в своей?
2. Что выведет `<p x-for="[k, v] of Object.entries({ a: 1 })">{{ k }}={{ v }}</p>`?
3. Плагину передали две папки: `htmlComponents({ components: ['src/components', 'shared/components'] })`,
   и `button` есть в обеих. Какой возьмётся?
4. Почему ошибка в шаблоне содержит цепочку `index.html → x-faq → x-button`?

<details>
<summary>Ответы</summary>

1. Значение prop пишется в месте вызова (`:title="p.name"` — `p` есть только там). А шаблон
   компонента должен видеть только свои props — иначе он зависел бы от того, где его вызвали.
2. `<p>a=1</p>` — деструктуризация в `x-for` поддерживается.
3. Из `src/components` — первая найденная папка главнее. Так проект перекрывает общие компоненты.
4. `c.stack` — каждый `renderComponent` добавляет своё имя в копию стека, а `templateError`
   вписывает его в сообщение.

</details>
