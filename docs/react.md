# React

React-стартер использует **те же модули кита**, что и вёрстка: разметку рисует React,
поведение (aria, клавиатура, анимации, адрес) — модуль.

## Подключение

```jsx
// src/main.jsx — KitProvider: шина событий, плавный скролл, reduced motion
<StrictMode>
  <KitProvider smooth>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </KitProvider>
</StrictMode>
```

## useModule

```jsx
import { useModule } from 'kit/react/index.js'
import accordion from 'kit/js/modules/accordion/index.js'

function Faq({ items }) {
  const ref = useModule(accordion, { multiple: true })
  return (
    <div ref={ref} className="accordion">
      {/* разметка как в modules.md */}
    </div>
  )
}
```

Доступ к API модуля — третий аргумент:

```jsx
const api = useRef(null)
const ref = useModule(dialog, undefined, (instance) => (api.current = instance))
<button onClick={() => api.current?.open()}>Открыть</button>
```

### Правила

1. **Опции** сравниваются по значению; объекты и функции внутри — по ссылке. Схемы форм,
   `onSubmit` — объявляйте вне компонента или в `useMemo`/`useCallback`.
2. **Не пишите в JSX атрибуты, которыми управляет модуль** (`aria-expanded`, `hidden`,
   `aria-selected`…): React их перезапишет.
3. **Сменился состав элементов** (слайды, пункты) — перезапустите модуль: `key={items.length}`.
4. **StrictMode** монтирует дважды — модули к этому готовы. Свой модуль обязан убирать всё в `destroy`.

## Хуки

| Хук                                    | Что возвращает                                         |
| -------------------------------------- | ------------------------------------------------------ |
| `useKit()`                             | `{ bus, scroll, reduced }`                             |
| `useBus('menu:toggle', fn)`            | подписка на шину (без переподписки при каждом рендере) |
| `useMediaQuery('(min-width: 1024px)')` | true/false, обновляется                                |
| `useBreakpoint('lg')`                  | экран шире брейкпоинта из SCSS                         |
| `useReducedMotion()`                   | пользователь просил меньше анимаций                    |

Все хуки безопасны для SSR (Next.js, Astro): на сервере — значение по умолчанию.

## Без «плясок» вёрстки

```jsx
import { Expand, useFlip } from 'kit/react/index.js'

// Список меняется (фильтр, добавили/удалили) — элементы плавно едут на новые места.
const [listRef, capture] = useFlip(items.map((i) => i.id).join())
const remove = (id) => {
  capture() // снимок «до» — в обработчике, перед изменением
  setItems((list) => list.filter((i) => i.id !== id))
}
<div ref={listRef}>{items.map((i) => <Card key={i.id} … />)}</div>

// Блок появляется — раскрывается по высоте, соседи плавно отъезжают.
<Expand open={showHint}><p>Подсказка</p></Expand>
```

Ключ `useFlip` — строка «состава» (не объект); `capture()` — перед каждым изменением. Подробнее — комментарии в `useFlip.js`,
рецепты против layout shift — [troubleshooting.md](troubleshooting.md#вёрстка-и-адаптив).

## GSAP в компонентах

```jsx
import { useEffect, useRef } from 'react'
import { gsap } from 'kit/js/core/gsap.js'

function Hero() {
  const root = useRef(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero__title', { y: 40, opacity: 0 })
    }, root) // селекторы ищутся только внутри root
    return () => ctx.revert() // убрать анимации и inline-стили при размонтировании
  }, [])
  return <section ref={root}>…</section>
}
```

## Маршруты

`src/App.jsx`: `<Route path="/about" element={<About />} />`. Редкие страницы — `lazy(() => import(…))`.
`useRouteReset` сбрасывает прокрутку и пересчитывает ScrollTrigger при смене адреса.
Хостинг должен отдавать `index.html` на любой путь — [deploy.md](deploy.md).

## Разметка, которую рисует не ваш React-код

HTML из CMS (`dangerouslySetInnerHTML`), MDX, серверные компоненты Next.js — там нет `ref` для
`useModule`. Пишите обычный `data-module` и добавьте один раз `<KitRuntime />`:

```jsx
import { KitRuntime } from 'kit/react/index.js'

;<KitProvider smooth>
  <App />
  <KitRuntime smooth={false} /> {/* плавный скролл уже включил KitProvider */}
</KitProvider>
```

Модули запустятся после гидрации, а при смене страницы — перезапустятся сами.

## Next.js, Astro, Vue

Пошагово, с проверенным примером для Next.js 16 — [frameworks.md](frameworks.md).
