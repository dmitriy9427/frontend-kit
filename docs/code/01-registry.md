# 1. Реестр модулей

[kit/js/core/registry.js](../../kit/js/core/registry.js) — ~240 строк, из них половина —
комментарии.

## Что это

Сердце кита. Находит на странице все `data-module="…"` и вызывает функции модулей. Следит за
новыми и удалёнными блоками. Глава учебника с идеей — [03. Как data-module находит код](../learn/03-registry.md).

## Что делает

- Запускает модули по атрибуту `data-module` — один или несколько на элементе.
- Никогда не запускает один модуль на одном элементе дважды.
- Ленивые модули скачивает, только если блок есть на странице, и только один раз.
- Ошибка одного модуля не мешает остальным; опечатка в имени — понятное предупреждение.
- Подгруженные блоки запускаются сами, удалённые — убираются сами.
- Даёт дождаться запуска модуля (`waitMounted`).

## Как пользоваться

Напрямую — почти никогда: это делает `createApp`. Но API открыт:

```js
import { mount, unmount, lazy, getInstance } from 'kit/js/core/registry.js'

const registry = { accordion, slider: lazy(() => import('./slider.js')) }
const { mounted, failed } = await mount(registry, ctx, document)
// mounted: ['accordion', 'slider'], failed: []

getInstance(document.querySelector('#faq'), 'accordion').open(0)
unmount(document.querySelector('#old-block')) // перед удалением блока
```

## Код по частям

### Хранилище

```js
const instances = new WeakMap()
const LAZY = Symbol('lazy')
const PENDING = Symbol('pending')
```

- `instances` — «элемент → `Map(имя → экземпляр)`». `WeakMap`, потому что ключи — DOM-элементы:
  удалили элемент из страницы, ссылок на него больше нет — сборщик мусора уберёт и запись.
  С обычным `Map` удалённые блоки жили бы в памяти вечно.
- `Symbol('lazy')` — уникальная метка. `Symbol` нельзя случайно совпасть с чужим свойством:
  `fn.lazy = true` мог бы задать кто угодно, а `fn[LAZY]` — только этот файл.
- `PENDING` — «модуль на этом элементе ещё запускается». Зачем — ниже, в `mount`.

### `lazy` — ленивая обёртка

```js
export function lazy(loader) {
  let promise = null
  const load = () => {
    promise ??= loader().then((mod) => mod.default ?? mod.init ?? mod)
    return promise
  }
  return Object.assign(async (el, ctx) => (await load())(el, ctx), { [LAZY]: true })
}
```

Построчно:

- `loader` — функция вида `() => import('./slider.js')`. Пока её не вызвали, ничего не
  скачивается.
- `promise ??= …` — оператор «присвоить, если `null`/`undefined`». Первый вызов `load` начнёт
  загрузку, остальные получат **то же** обещание. 10 слайдеров — 1 запрос.
- `.then((mod) => mod.default ?? mod.init ?? mod)` — из загруженного файла достаём функцию
  модуля: `export default`, `export function init` или сам объект.
- `Object.assign(функция, { [LAZY]: true })` — функции в JS — тоже объекты, им можно добавить
  свойство. Снаружи это обычная функция `(el, ctx) => …`, плюс метка для dev-панели.

### `moduleNames` и `collect`

```js
export const moduleNames = (el) => (el.dataset.module ?? '').trim().split(/\s+/).filter(Boolean)

function collect(root) {
  const list = Array.from(root.querySelectorAll?.('[data-module]') ?? [])
  if (root.nodeType === 1 && root.hasAttribute('data-module')) list.unshift(root)
  return list
}
```

- `split(/\s+/)` — разрезать по любым пробелам (в том числе двойным и переносам строк).
  `.filter(Boolean)` убирает пустые строки.
- `collect` включает **сам** `root`, если на нём есть `data-module`. `querySelectorAll` ищет
  только среди потомков, а при подгрузке новым узлом часто оказывается сам блок:
  `list.append(card)` — и `card` с `data-module` должна запуститься.
- `root.querySelectorAll?.(…)` — `?.` на случай, если `root` — текстовый узел (у него нет метода).
- `nodeType === 1` — это элемент (а не `document`, у которого нет `hasAttribute`).

### `mount` — главный цикл

```js
export async function mount(registry, ctx = {}, root = document, { strict = true } = {}) {
  const mounted = []
  const failed = []
  const jobs = []

  for (const el of collect(root)) {
    if (!instances.has(el)) instances.set(el, new Map())
    const own = instances.get(el)
```

Для каждого элемента с `data-module` берём его `Map` модулей (создаём, если первый раз).

```js
    for (const name of moduleNames(el)) {
      if (own.has(name)) continue
```

Модуль с таким именем на этом элементе уже есть (запущен **или запускается**) — пропускаем.
Это защита от двойного запуска.

```js
      const init = registry[name]
      if (!init) {
        if (strict) {
          console.warn(`[kit] нет модуля «${name}». Доступны: ${Object.keys(registry).join(', ') || '—'}`, el)
          failed.push(name)
        }
        continue
      }
```

Нет такого имени в реестре. В строгом режиме — предупреждение **со списком доступных** и с
самим элементом (в консоли по нему можно кликнуть). `strict: false` использует `observe`: на
странице могут быть чужие модули (из другого реестра), и ругаться на них незачем.

```js
      own.set(name, PENDING)
      jobs.push(
        (async () => {
          try {
            const instance = await init(el, ctx)
            if (!instances.get(el)?.has(name)) return instance?.destroy?.()
            own.set(name, instance ?? null)
            mounted.push(name)
            notify(el, name)
          } catch (error) {
            own.delete(name)
            failed.push(name)
            console.error(`[kit] модуль «${name}» упал при запуске`, el, error)
          }
        })(),
      )
    }
  }

  await Promise.all(jobs)
  return { mounted, failed }
}
```

Самое важное место файла:

1. **`own.set(name, PENDING)` до `await`.** Пока ленивый модуль едет по сети, место уже занято.
   Повторный `mount` увидит `own.has(name)` и пропустит.
2. **`(async () => { … })()`** — асинхронная функция, вызванная сразу. Каждый модуль
   запускается **параллельно**, а не по очереди: медленный слайдер не задерживает аккордеон.
3. **`if (!instances.get(el)?.has(name))`** — пока ждали, элемент могли **удалить** (`unmount`
   стёр запись). Тогда только что созданный экземпляр сразу уничтожаем — иначе модуль работал
   бы на мёртвом элементе.
4. **`instance ?? null`** — модуль без API ничего не возвращает (`undefined`). Храним `null`,
   чтобы `own.has(name)` оставался `true`.
5. **`notify(el, name)`** — разбудить тех, кто ждёт этот модуль (`waitMounted`).
6. **`catch`** — упавший модуль убираем из `own` (можно попробовать запустить снова) и пишем
   ошибку с элементом.
7. **`Promise.all(jobs)`** — `mount` завершится, когда запустятся **все**. `createApp` после
   этого пересчитывает анимации.

### `unmount`

```js
export function unmount(root = document) {
  const elements = collect(root).reverse()
  for (const el of elements) {
    const own = instances.get(el)
    if (!own) continue
    for (const [name, instance] of Array.from(own).reverse()) {
      try {
        if (instance !== PENDING) instance?.destroy?.()
      } catch (error) {
        console.error(`[kit] ошибка destroy у «${name}»`, error)
      }
    }
    instances.delete(el)
  }
}
```

- **`.reverse()` дважды**: элементы — с конца (сначала вложенные, потом внешние), модули на
  элементе — в обратном порядке запуска. Правило уборки: что включили последним, то
  выключаем первым.
- **`instance !== PENDING`** — у ещё не запущенного модуля нечего уничтожать. А когда он
  догрузится, проверка №3 из `mount` увидит, что записи нет, и уничтожит его сам.
- **`instances.delete(el)`** — после уборки элемент снова «чистый»: если его вернут в
  страницу, модули запустятся заново.

### `getInstance`, `isMounted`, `mountedNames`

```js
export function getInstance(el, name) {
  const instance = instances.get(el)?.get(name)
  return instance === PENDING ? undefined : instance
}
```

Наружу `PENDING` никогда не отдаётся: для внешнего кода «запускается» и «нет» одинаково —
экземпляра пока нет. Для ожидания есть `waitMounted`.

### `waitMounted` — дождаться запуска

```js
const waiters = new Set()

function notify(el, name) {
  for (const waiter of Array.from(waiters)) if (waiter.match(el, name)) waiter.done(el, name)
}

export function waitMounted(match, { timeout = 10000, signal, label = 'модуль' } = {}) {
  return new Promise((resolve, reject) => {
    const waiter = {
      match,
      done: (el, name) => {
        cleanup()
        resolve({ el, name })
      },
    }
    const timer =
      timeout > 0
        ? setTimeout(() => {
            cleanup()
            reject(new Error(`[kit] не дождались запуска: ${label} …`))
          }, timeout)
        : null
    const onAbort = () => {
      cleanup()
      reject(signal.reason ?? new Error('aborted'))
    }
    function cleanup() {
      waiters.delete(waiter)
      if (timer) clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
    signal?.addEventListener('abort', onAbort)
    waiters.add(waiter)
  })
}
```

Паттерн «список ожидающих»:

- `waiters` — все, кто сейчас чего-то ждёт. У каждого своя проверка `match(el, name)` — «это
  тот модуль, который мне нужен?».
- `mount` после каждого запуска зовёт `notify` — тот проверяет всех ожидающих.
- Три способа закончить ожидание: дождались (`done`), таймаут (10 с по умолчанию), отмена через
  `AbortSignal`. **Каждый** вызывает `cleanup` — иначе ожидающий висел бы в `waiters` вечно.
- `Array.from(waiters)` в `notify` — копия: `done` удаляет себя из `waiters` прямо во время обхода.

Этим пользуется `ctx.modules.when(…)` из [modules.js](../../kit/js/core/modules.js).

### `observe` — следить за DOM

```js
export function observe(registry, ctx = {}, root = document.body, options) {
  if (typeof MutationObserver === 'undefined') return () => {}
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.removedNodes.forEach((node) => {
        if (node instanceof Element && !node.isConnected) unmount(node)
      })
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) mount(registry, ctx, node, options)
      })
    }
  })
  observer.observe(root, { childList: true, subtree: true })
  return () => observer.disconnect()
}
```

- `childList: true, subtree: true` — сообщать о добавлении и удалении детей на **любой** глубине.
- `node instanceof Element` — пропускаем текстовые узлы и комментарии.
- `!node.isConnected` — узел **переставили**, а не удалили: в момент обработки он уже снова в
  документе. Останавливать нельзя.
- Сначала `removed`, потом `added` — при замене содержимого (`innerHTML = …`) старые модули
  успевают убраться до запуска новых.
- Возвращает функцию отключения — её кладёт в копилку `createApp`.

## Что будет, если…

| Убрать                                                 | Что сломается                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `own.set(name, PENDING)` до `await`                    | ленивый модуль запустится дважды, если `mount` вызовут во время загрузки — двойные обработчики |
| проверку `!instances.get(el)?.has(name)` после `await` | ушли со страницы во время загрузки — модуль работает на удалённом элементе, таймеры тикают     |
| `WeakMap` → `Map`                                      | каждый удалённый блок остаётся в памяти навсегда                                               |
| `try/catch` в `mount`                                  | одна ошибка в слайдере — и `Promise.all` упадёт, `createApp` не закончит запуск                |
| `!node.isConnected` в `observe`                        | сортировка списка (`appendChild` существующих карточек) уничтожит их модули                    |
| `cleanup()` в `waitMounted`                            | каждое ожидание навсегда остаётся в `waiters` и таймер не снимается                            |

## Проверьте себя

1. Почему `instances` хранит `Map` на каждый элемент, а не один экземпляр?
2. Что вернёт `getInstance(el, 'slider')`, пока слайдер грузится? Почему не `PENDING`?
3. В каком порядке вызовутся `destroy`, если на элементе `data-module="reveal magnetic"`?
4. Зачем `mount` возвращает `failed`, если ошибки и так в консоли?

<details>
<summary>Ответы</summary>

1. На одном элементе может быть несколько модулей: `data-module="reveal magnetic"`.
2. `undefined`. `PENDING` — внутренняя метка; снаружи «запускается» и «не запущен» неотличимы,
   а для ожидания есть `waitMounted` / `ctx.modules.when`.
3. Сначала `magnetic`, потом `reveal` — в обратном порядке запуска.
4. Для кода и тестов: dev-панель показывает упавшие модули, тест может проверить
   `expect(failed).toEqual([])`.

</details>
