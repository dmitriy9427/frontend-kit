# 2. Копилка уборки, опции, шина

Три маленьких файла, которыми пользуется каждый модуль:

| Файл                                           | Строк кода | Что даёт модулю                                        |
| ---------------------------------------------- | ---------- | ------------------------------------------------------ |
| [lifecycle.js](../../kit/js/core/lifecycle.js) | ~60        | `createDisposer` — уборка, `onViewport` — «на экране?» |
| [options.js](../../kit/js/core/options.js)     | ~50        | `readOptions` — настройки из `data-`атрибутов          |
| [bus.js](../../kit/js/core/bus.js)             | ~35        | `createBus` — шина событий                             |

---

## `createDisposer` — копилка уборки

### Что делает

Собирает всё, что нужно будет выключить, и выключает одним вызовом в обратном порядке.

### Как пользоваться

```js
const d = createDisposer()
d.listen(window, 'resize', onResize) // повесить и запомнить снятие
d.add(() => tween.kill()) // любая уборка
d.timeout(() => hint.remove(), 2000) // таймер, который отменится
return { destroy: d.dispose }
```

### Код по частям

```js
export function createDisposer() {
  const tasks = []
  let disposed = false
```

**Замыкание.** `tasks` и `disposed` — обычные переменные внутри функции. Снаружи до них не
добраться, но методы, созданные ниже, их «помнят». У каждого вызова `createDisposer()` — свой
список: копилки двух модулей не смешиваются.

```js
  const api = {
    add(fn) {
      if (typeof fn !== 'function') return fn
      if (disposed) fn()
      else tasks.push(fn)
      return fn
    },
```

- Не функция — игнорируем. Это удобно: `d.add(plugin())`, даже если плагин ничего не вернул.
- **`if (disposed) fn()`** — тонкий случай. Модуль асинхронный: начал грузить three.js, его
  уничтожили, через секунду three.js загрузился, и модуль делает `d.add(() => renderer.dispose())`.
  Копилка уже пуста и закрыта — уборка выполнится **сразу**. Без этой строки рендерер жил бы
  вечно.

```js
    listen(target, type, handler, options) {
      target.addEventListener(type, handler, options)
      return api.add(() => target.removeEventListener(type, handler, options))
    },
```

`removeEventListener` снимает обработчик, только если **все** аргументы совпадают — та же
функция и те же `options` (`capture`). Частая ошибка — повесить с `{ capture: true }`, а снимать
без. Здесь это невозможно: снятие запоминается с теми же аргументами автоматически.

```js
    timeout(fn, ms) {
      if (disposed) return () => {}
      const id = setTimeout(fn, ms)
      return api.add(() => clearTimeout(id))
    },
```

Возвращает функцию отмены — можно отменить таймер и раньше, вручную.

```js
    dispose() {
      if (disposed) return
      disposed = true
      while (tasks.length) {
        try {
          tasks.pop()()
        } catch (error) {
          console.error('[kit] dispose', error)
        }
      }
    },
    get disposed() { return disposed },
  }
  return api
}
```

- **`if (disposed) return`** — второй вызов ничего не делает. `destroy` бывает вызван дважды
  (React StrictMode, ручной вызов плюс `unmount`) — и это не должно падать.
- **`tasks.pop()()`** — `pop` достаёт **последний** элемент и сразу вызываем его. Обратный порядок.
- **`try/catch` вокруг каждой** — одна упавшая уборка не мешает остальным.
- **`get disposed()`** — геттер: снаружи можно спросить «уже убрано?», но нельзя поменять.

### Что будет, если…

| Убрать                             | Что сломается                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `if (disposed) fn()` в `add`       | асинхронный модуль, уничтоженный во время загрузки, никогда не уберёт то, что создал после |
| `if (disposed) return` в `dispose` | двойной `destroy` выполнит уборку дважды: `unlockScroll` разблокирует чужую блокировку     |
| `try/catch`                        | ошибка в одной уборке оставит все следующие невыполненными                                 |

---

## `onViewport` — «блок на экране?»

```js
export function onViewport(el, { enter, leave, rootMargin = '0px', threshold = 0, once = false } = {}) {
  if (typeof IntersectionObserver === 'undefined') {
    enter?.()
    return () => {}
  }
  let inside = null
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1]
      if (entry.isIntersecting === inside) return
      inside = entry.isIntersecting
      if (inside) {
        enter?.(entry)
        if (once) observer.disconnect()
      } else leave?.(entry)
    },
    { rootMargin, threshold },
  )
  observer.observe(el)
  return () => observer.disconnect()
}
```

- **`IntersectionObserver`** — браузер сам сообщает, когда элемент входит в экран и выходит.
  Дешевле, чем проверять положение на каждый скролл.
- Нет наблюдателя (очень старый браузер) — считаем видимым: лучше запустить счётчик сразу, чем
  никогда.
- **`entries[entries.length - 1]`** — за один кадр может прийти несколько записей (быстро
  проскроллили туда и обратно); важна последняя.
- **`inside`** начинается с `null` — поэтому первый вызов всегда проходит (и `true`, и `false`
  отличаются от `null`), а дальше функции зовутся только при **смене** состояния.
- **`once`** — для «досчитать число один раз»: после первого входа наблюдение отключается.

Используют: `counter` (досчитать при появлении), `lazy-video` (грузить видео, когда рядом),
`marquee` (не крутить бегущую строку за экраном — экономит батарею).

---

## `readOptions` — настройки из атрибутов

### Код по частям

```js
const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
```

Два перевода имён: `pause-on-hover` ↔ `pauseOnHover`. Регулярка `/-([a-z0-9])/g` находит
«дефис + буква», и функция заменяет пару на заглавную букву.

```js
export function coerce(raw, fallback) {
  switch (typeof fallback) {
    case 'boolean':
      return raw !== 'false' && raw !== '0'
    case 'number': {
      const n = Number(raw)
      return Number.isFinite(n) ? n : fallback
    }
    case 'object':
      if (fallback === null) return raw
      try {
        return JSON.parse(raw)
      } catch {
        console.warn(`[kit] не удалось прочитать JSON «${raw}», взято значение по умолчанию`)
        return fallback
      }
    default:
      return raw
  }
}
```

**Тип решает значение по умолчанию**, а не сама строка:

| `fallback` | `raw`                       | Результат    | Почему                                                |
| ---------- | --------------------------- | ------------ | ----------------------------------------------------- |
| `false`    | `""` (атрибут без значения) | `true`       | всё, кроме `"false"` и `"0"`, — да                    |
| `false`    | `"false"`                   | `false`      | наивный `Boolean("false")` дал бы `true`              |
| `50`       | `"80"`                      | `80`         |                                                       |
| `50`       | `"быстро"`                  | `50`         | `Number("быстро")` — `NaN`, `isFinite(NaN)` — `false` |
| `[]`       | `'["a","b"]'`               | `['a', 'b']` | `typeof []` — `'object'`                              |
| `null`     | `"#menu"`                   | `"#menu"`    | `typeof null` тоже `'object'` — отдельная проверка    |
| `'up'`     | `"down"`                    | `"down"`     | строка остаётся строкой                               |

```js
export function readOptions(el, name, defaults, overrides = {}) {
  const result = { ...defaults }
  for (const key of Object.keys(defaults)) {
    const attr = `data-${name}-${kebab(key)}`
    if (el.hasAttribute(attr)) result[key] = coerce(el.getAttribute(attr), defaults[key])
  }
```

Идём **по ключам умолчаний**, а не по атрибутам: `pauseOnHover` → ищем атрибут
`data-marquee-pause-on-hover`. Модуль никогда не получит настройку, которой нет в `DEFAULTS`.

Почему `getAttribute`, а не `el.dataset`? `dataset` переводит имена по своим правилам, и
`data-slider-3d` превратился бы в `slider-3d` (цифру после дефиса он не переводит). С явным
`getAttribute` правила одни — наши.

```js
  for (const attr of el.getAttributeNames()) {
    const prefix = `data-${name}-`
    if (attr.startsWith(prefix) && !Object.hasOwn(defaults, camel(attr.slice(prefix.length)))) {
      console.warn(`[kit] ${name}: неизвестная настройка «${attr}». Есть: ${Object.keys(defaults).join(', ')}`)
    }
  }
  return Object.assign(result, overrides)
}
```

- Второй проход — **по атрибутам**: всё, что начинается с `data-marquee-`, но не входит в
  умолчания, — скорее всего опечатка (`data-marquee-sped`). Предупреждаем со списком.
- `Object.hasOwn` — «есть ли **собственное** свойство», без учёта прототипа (`toString` не
  считается).
- `overrides` (из JS или React) накладываются последними — они главнее атрибутов.

---

## `createBus` — шина событий

Целиком:

```js
export function createBus() {
  const handlers = new Map()
  const last = new Map()

  return {
    on(event, fn, { replay = false } = {}) {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event).add(fn)
      if (replay && last.has(event)) fn(last.get(event))
      return () => handlers.get(event)?.delete(fn)
    },
    once(event, fn) {
      const off = this.on(event, (payload) => {
        off()
        fn(payload)
      })
      return off
    },
    emit(event, payload) {
      last.set(event, payload)
      Array.from(handlers.get(event) ?? []).forEach((fn) => {
        try {
          fn(payload)
        } catch (error) {
          console.error(`[kit] bus «${event}»`, error)
        }
      })
    },
    last: (event) => last.get(event),
    clear() {
      handlers.clear()
      last.clear()
    },
  }
}
```

| Строка                               | Зачем                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `new Set()` подписчиков              | одна и та же функция, подписанная дважды, вызовется один раз                                   |
| `return () => …delete(fn)`           | подписка сама возвращает отписку — положить в `d.add(off)`                                     |
| `last.set(event, payload)`           | помнить последнее значение — для `replay` и `bus.last()`                                       |
| `replay && last.has(event)`          | опоздавший подписчик сразу получает текущее состояние                                          |
| `once`: `off()` **до** `fn(payload)` | если `fn` снова вызовет `emit` того же события, подписчик уже отписан — нет бесконечного цикла |
| `Array.from(…)`                      | обход копии: отписка во время рассылки не собьёт обход                                         |
| `try/catch`                          | упал один подписчик — остальные получили событие                                               |

## Проверьте себя

1. Что вернёт `readOptions(el, 'x', { size: 10 })`, если у элемента `data-x-size="10px"`?
2. Модуль подписался на шину, но не отписался. Что будет после его `destroy`?
3. Почему `coerce` для `null` возвращает строку, а не пытается `JSON.parse`?
4. Чем `d.timeout(fn, 1000)` лучше `setTimeout(fn, 1000)` внутри модуля?

<details>
<summary>Ответы</summary>

1. `{ size: 10 }` — `Number("10px")` это `NaN`, взято умолчание. (Предупреждения нет: ключ
   известен.)
2. Обработчик останется в `Set` шины и будет вызываться на каждое событие — с обращением к
   удалённым элементам. Утечка памяти и странные ошибки.
3. `null` по умолчанию означает «необязательная строка» — например, селектор. `'#menu'` не JSON.
4. Таймер отменится при `destroy`. Иначе через секунду он сработает для уже удалённого блока.

</details>
