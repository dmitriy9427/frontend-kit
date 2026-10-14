# 3. Запуск приложения

[starters/vanilla/src/main.js](../../starters/vanilla/src/main.js) и
[kit/js/core/app.js](../../kit/js/core/app.js).

## Что это

Первые строки JavaScript, которые выполняет браузер на каждой странице вёрстки. От того, в каком
порядке они идут, зависит, будут ли «мигать» стили, найдёт ли форма свою схему и сработают ли
анимации в нужном месте.

## Что делает

- Подключает стили: общие и всех компонентов.
- Регистрирует схемы форм.
- Собирает реестр модулей: кит + модули проекта + JS компонентов — без ручных списков.
- Запускает плагины сайта, потом модули.
- Приводит в порядок ScrollTrigger и следит за высотой страницы.
- В разработке подключает dev-панель (в сборку она не попадает).

## `main.js` по частям

```js
import './styles/main.scss'
```

Импорт стилей из JS — особенность Vite: он превратит SCSS в CSS и вставит на страницу. В
сборке — отдельный `.css` файл в `<head>`.

```js
import { createApp } from 'kit/js/core/app.js'
import { modulesFromGlob, pluginsFromGlob } from 'kit/js/core/modules.js'
import { kitModules } from 'kit/js/modules/index.js'
import './forms/schemas.js'
```

`'kit/…'` — псевдоним из `vite.config.js` (`alias: { kit: kitDir }`), чтобы не писать
`'../../kit/…'`.

**`import './forms/schemas.js'` стоит до `createApp`** — и это важно. Файл схем при выполнении
вызывает `registerSchema('callback', …)`. Модуль формы при запуске ищет схему по имени. Импорты
выполняются **по порядку и до** остального кода файла — значит, к запуску модулей схемы уже
зарегистрированы.

```js
import.meta.glob('./components/*/*.scss', { eager: true })
```

**`import.meta.glob`** — возможность Vite: «найди файлы по маске». Во время сборки Vite
превращает эту строку в обычные импорты:

```js
// во что примерно превращается
import './components/feature-card/feature-card.scss'
import './components/price-calc/price-calc.scss'
import './components/section-head/section-head.scss'
```

`{ eager: true }` — «импортировать сразу», а не по требованию. Стили нужны сразу: иначе
компонент сначала покажется без стилей, потом «прыгнет».

```js
const components = modulesFromGlob(import.meta.glob(['./components/*/*.js', '!./components/**/*.test.js']))
const projectModules = modulesFromGlob(import.meta.glob(['./modules/*/index.js']))
```

Здесь **без** `eager` — Vite возвращает объект «путь → функция-загрузчик»:

```js
{
  './components/price-calc/price-calc.js': () => import('./components/price-calc/price-calc.js'),
  './modules/copy-code/index.js': () => import('./modules/copy-code/index.js'),
}
```

`modulesFromGlob` превращает пути в имена и оборачивает загрузчики в `lazy`:

```js
export function modulesFromGlob(files) {
  const registry = {}
  for (const [path, entry] of Object.entries(files)) {
    const parts = path.split('/') // ['.', 'modules', 'copy-code', 'index.js']
    const file = parts.pop().replace(/\.[cm]?[jt]sx?$/, '') // 'index'
    if (/\.(test|spec|stories)$/.test(file)) continue // тесты — не модули
    const name = file === 'index' ? parts.pop() : file // index → имя папки: 'copy-code'
    if (typeof entry === 'function') registry[name] = lazy(entry)
    else {
      /* eager-вариант: берём default или init */
    }
  }
  return registry
}
```

- `'!./components/**/*.test.js'` — восклицательный знак исключает файлы. Без него тест
  компонента попал бы в сборку как «модуль».
- Регулярка `/\.[cm]?[jt]sx?$/` срезает расширение: `.js`, `.mjs`, `.ts`, `.jsx`, `.tsx`.

```js
const plugins = pluginsFromGlob(import.meta.glob('./plugins/*.js', { eager: true }))
```

Плагины — `eager`: нужны на каждой странице сразу. `pluginsFromGlob` сортирует их **по имени
файла** — поэтому файлы называются `01-external-links.js`, `02-analytics.js`: префикс задаёт
порядок.

```js
await createApp({
  plugins,
  modules: { ...kitModules, ...projectModules, ...components },
  smooth: true,
})
```

**Порядок в объекте = приоритет.** Если в проекте есть модуль `accordion`, `...projectModules`
перезапишет одноимённый ключ из `...kitModules`. Так можно заменить модуль кита своим, не трогая
кит.

`await` на верхнем уровне модуля работает в современных браузерах (`target: 'es2022'` в
`vite.config.js`).

```js
if (import.meta.env.DEV) {
  import('kit/devtools/index.js').then((m) => m.installDevtools())
}
```

`import.meta.env.DEV` при сборке заменяется на `false`, условие становится `if (false)`, и
сборщик выбрасывает импорт вместе с dev-панелью. Условие должно быть **именно в `if`** — в
переменной сборщик его не вычислит (подробно — [глава 09](../learn/09-vite.md#плагин-5-защита-прода--devtools-guardjs)).

## `createApp` по частям

```js
export async function createApp({ modules = {}, plugins = [], smooth = true, watch = true, root = document } = {}) {
  const html = document.documentElement
  html.classList.add('js')
```

Класс `js` уже поставил встроенный скрипт в `<head>` (до первой отрисовки). Здесь — на случай,
если `createApp` используют без стартового `site-head`.

```js
const d = createDisposer()
const reduced = prefersReducedMotion()
const smoothOptions = typeof smooth === 'object' ? smooth : {}
const scroll = createSmoothScroll({ ...smoothOptions, enabled: Boolean(smooth) && !reduced && !isTouch(), reduced })
d.add(() => scroll.destroy())
setScrollEngine(scroll)
d.add(() => setScrollEngine(null))
```

- У приложения своя копилка — `app.destroy()` уберёт всё.
- Плавный скролл включён, только если **всё** сразу: его просили, нет «меньше движения», не тач.
- `setScrollEngine(scroll)` — сообщить блокировке прокрутки о Lenis: когда модалка блокирует
  страницу, надо остановить и его (`overflow: hidden` Lenis не останавливает).

```js
const ctx = { bus: createBus(), scroll, reduced, breakpoints: getBreakpoints(), modules: modulesApi }
```

Тот самый «рюкзак», который получит каждый модуль вторым аргументом.

```js
for (const plugin of plugins) {
  try {
    d.add(await plugin({ ctx, modules: modulesApi }))
  } catch (error) {
    console.error(`[kit] плагин «${plugin.name || 'без имени'}» упал при запуске`, error)
  }
}
```

Плагины — **по одному и до модулей**: плагин аналитики должен подписаться на шину раньше, чем
модуль пошлёт первое событие. Плагин может вернуть функцию уборки — она уйдёт в копилку
(`d.add` пропустит, если вернули не функцию).

```js
const result = await mount(modules, ctx, root)
ScrollTrigger.sort()
ScrollTrigger.refresh()
```

Запустить все модули и **упорядочить** анимации. Модули ленивые и запускаются в случайном
порядке; ScrollTrigger считает позиции в порядке создания, поэтому нижняя анимация, созданная
раньше верхней с закреплением, не учла бы место закрепления. `sort()` упорядочивает по
положению на странице, `refresh()` пересчитывает.

```js
if (watch) d.add(observe(modules, ctx, document.body, { strict: false }))
```

Следить за подгружаемым контентом. `strict: false` — не ругаться на незнакомые имена (на
странице могут быть модули чужого реестра — например, виджет CMS).

```js
const refresh = debounce(() => {
  ScrollTrigger.sort()
  ScrollTrigger.refresh()
}, 200)
d.add(refresh.cancel)
if (typeof ResizeObserver !== 'undefined') {
  let lastHeight = document.body.scrollHeight
  const ro = new ResizeObserver(() => {
    const height = document.body.scrollHeight
    if (height !== lastHeight) {
      lastHeight = height
      refresh()
    }
  })
  ro.observe(document.body)
  d.add(() => ro.disconnect())
}
document.fonts?.ready.then(() => !d.disposed && refresh())
```

Главное средство от «анимация срабатывает не там»:

- **`ResizeObserver` на `body`** — сообщает о смене размера: догрузилась картинка, раскрылся
  аккордеон, пришли новые карточки.
- **`height !== lastHeight`** — реагируем только на **высоту**. Ширина меняется при ресайзе окна,
  а его ScrollTrigger обрабатывает сам.
- **`debounce(…, 200)`** — галерея из 30 картинок даст 30 изменений; пересчёт будет один, через
  200 мс после последнего.
- **`d.add(refresh.cancel)`** — если приложение уничтожили, отложенный пересчёт не должен
  сработать.
- **`document.fonts.ready`** — веб-шрифт догрузился, строки стали другой длины, высота блоков
  изменилась. `!d.disposed` — проверка, что приложение ещё живо.

```js
html.classList.add('is-ready')
ctx.bus.emit('app:ready', result)
```

Сигнал «всё запущено»: для CSS (`.is-ready .hero { … }`) и для кода (`bus.on('app:ready', …, { replay: true })`).

```js
  const app = {
    ctx,
    ...result,
    modules: modulesApi,
    mount: (node) => mount(modules, ctx, node),
    unmount,
    destroy() { unmount(root); d.dispose(); ctx.bus.clear(); html.classList.remove('is-ready') },
  }
  if (import.meta.env?.DEV) window.__kit = app
  return app
}
```

`window.__kit` — только в разработке: из консоли можно позвать любой модуль
(`__kit.modules.get('#faq').open(1)`) или послать событие в шину.

## Что будет, если…

| Сделать                                                  | Что сломается                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------- |
| перенести `import './forms/schemas.js'` ниже `createApp` | «нет схемы «callback»»: форма запустится раньше регистрации               |
| убрать `eager` у стилей компонентов                      | стили грузятся отдельно после JS — компоненты «прыгают»                   |
| поменять местами `...kitModules` и `...projectModules`   | модуль проекта с именем модуля кита перестанет его заменять               |
| убрать `ScrollTrigger.sort()` после `mount`              | анимации ниже секции с закреплением стартуют на сотни пикселей раньше     |
| убрать `debounce` у `refresh`                            | при загрузке галереи — десятки пересчётов подряд, страница подтормаживает |
| вынести `import.meta.env.DEV` в переменную               | dev-панель попадёт в сборку (и сборка упадёт благодаря `devtools-guard`)  |

## Проверьте себя

1. Назовите файл в `src/plugins/`, чтобы он запускался раньше `01-external-links.js`.
2. Почему плагины запускаются по одному (`await` в цикле), а модули — параллельно?
3. Как из консоли узнать, какие модули не запустились?

<details>
<summary>Ответы</summary>

1. `00-что-угодно.js` — сортировка по имени файла.
2. У плагинов важен порядок (настройки GSAP до аналитики, подписки до событий). Модулям порядок
   не важен (для зависимостей есть `ctx.modules.when`), а параллельный запуск быстрее.
3. `__kit.failed` — `createApp` кладёт в приложение результат `mount`: `{ mounted, failed }`.

</details>
