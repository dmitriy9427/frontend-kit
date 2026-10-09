# Кит в любом проекте: vanilla, React, Next.js, Astro, CMS

Модули кита — обычные функции `(элемент, ctx) → { destroy }`. Им всё равно, кто нарисовал
разметку: HTML-файл, CMS, React, Astro или сервер Next.js. Разница только в том, **кто и когда
их запускает**.

| Где разметка                                       | Как запускаются модули                           | `data-module` в разметке                 |
| -------------------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| HTML-страницы (vanilla-стартер), любой Vite-проект | `createApp()` один раз в `main.js`               | ✅ работает                              |
| HTML из CMS (Битрикс, WordPress), htmx             | `createApp()` в общем скрипте                    | ✅ работает, и для подгруженного         |
| Astro (`.astro`-компоненты)                        | `createApp()` в `src/scripts/app.ts`             | ✅ работает                              |
| Next.js — серверные компоненты, MDX                | `<KitRuntime />` в `layout`                      | ✅ работает, и при переходах `next/link` |
| React — компонент со своим состоянием              | `useModule(модуль)` на `ref`                     | ❌ не пишите — используйте хук           |
| Vue / Nuxt                                         | `createApp()` в `onMounted` / клиентском плагине | ✅ работает                              |

Почему в React-компонентах со состоянием `data-module` не используют: React перерисовывает
разметку, и модуль, запущенный «снаружи», не узнает, что его элементы заменились.
`useModule` перезапускает модуль ровно тогда, когда нужно. Проверено в шаблоне: vanilla,
React, React + TS, Astro — стартеры; Next.js 16 — тестовым приложением (серверные
компоненты, переходы `next/link`, «Назад», подсказки).

---

## Vanilla и любой Vite-проект

Так устроен vanilla-стартер (`src/main.js`):

```js
import { createApp } from 'kit/js/core/app.js'
import { modulesFromGlob, pluginsFromGlob } from 'kit/js/core/modules.js'
import { kitModules } from 'kit/js/modules/index.js'

await createApp({
  modules: { ...kitModules, ...modulesFromGlob(import.meta.glob('./modules/*/index.js')) },
  plugins: pluginsFromGlob(import.meta.glob('./plugins/*.js', { eager: true })),
})
```

В свой (не из шаблона) Vite-проект: скопируйте `kit/`, добавьте в `vite.config.js` alias
`kit` и `loadPaths` для SCSS (как в `starters/vanilla/vite.config.js`), установите пакеты кита
([libraries.md](libraries.md)).

## HTML из CMS и htmx

То же `createApp()`. Блоки, которые появятся позже (htmx-ответ, «Показать ещё», модалка из
AJAX), запустятся сами — за DOM следит `MutationObserver`. Перед удалением блока модули
остановятся сами. Если наблюдение выключено (`createApp({ watch: false })`) —
`app.mount(node)` / `app.unmount(node)` вручную.

## React (SPA)

```jsx
// src/main.jsx — общий контекст: шина, плавный скролл, reduced motion
;<KitProvider smooth>
  <App />
</KitProvider>

// компонент
import { useModule } from 'kit/react/index.js'
import accordion from 'kit/js/modules/accordion/index.js'

function Faq({ items }) {
  const ref = useModule(accordion, { multiple: true })
  return (
    <div ref={ref} className="accordion">
      {/* разметка из modules.md */}
    </div>
  )
}
```

Подробно — [react.md](react.md). Нужен `data-module` в куске HTML, который React не трогает
(текст из CMS через `dangerouslySetInnerHTML`)? Добавьте `<KitRuntime smooth={false} />`
(см. ниже): `smooth={false}`, потому что плавный скролл уже включил `KitProvider`.

## Next.js (App Router)

Проверено на Next.js 16: серверные компоненты пишут обычную разметку с `data-module`, а
клиентский `<KitRuntime />` из кита запускает модули после гидрации и следит за переходами.

**1. Кит в проект.** Скопируйте папку `kit/` в корень проекта (или `npm run create -- … --stack
react` и перенесите `kit/`). Пакеты: `npm i gsap lenis swiper three overlayscrollbars
@floating-ui/dom` и `npm i -D sass`.

**2. Пути** — `next.config.mjs`:

```js
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default {
  turbopack: { resolveAlias: { kit: './kit' } }, // import … from 'kit/js/…'
  sassOptions: { loadPaths: [root, `${root}styles`] }, // @use 'kit/scss', @use 'abstracts'
}
```

и `jsconfig.json` (или `tsconfig.json`) — чтобы редактор понимал `kit/…`:

```json
{ "compilerOptions": { "baseUrl": ".", "paths": { "kit/*": ["./kit/*"] } } }
```

**3. Стили** — `styles/_abstracts.scss` и `styles/main.scss`, как в стартерах:

```scss
// styles/_abstracts.scss
@forward 'kit/scss/abstracts' with (
  $colors: (
    'accent': #3b5bff,
  )
);

// styles/main.scss
@use 'abstracts';
@use 'kit/scss';
```

**4. Запуск модулей** — `app/kit.jsx` (клиентский) и `app/layout.jsx`:

```jsx
// app/kit.jsx
'use client'
import { KitRuntime } from 'kit/react/KitRuntime.jsx'
import { createTooltips } from 'kit/js/modules/tooltip/index.js'

// Плагины — здесь, в клиентском файле: функции нельзя передать из серверного компонента.
const plugins = [() => createTooltips().destroy]

export function Kit() {
  return <KitRuntime plugins={plugins} />
}
```

```jsx
// app/layout.jsx — серверный компонент
import '../styles/main.scss'
import { Kit } from './kit'

export default function Layout({ children }) {
  return (
    <html lang="ru">
      <body>
        {children}
        <Kit />
      </body>
    </html>
  )
}
```

**5. Разметка** — в любом серверном компоненте, без `'use client'`:

```jsx
export default function Faq({ items }) {
  return (
    <div className="accordion" data-module="accordion">
      {items.map((item) => (
        <div className="accordion__item" data-accordion-item key={item.q}>
          <h3>
            <button className="accordion__trigger" data-accordion-trigger>
              {item.q}
            </button>
          </h3>
          <div className="accordion__panel" data-accordion-panel>
            <div className="accordion__inner">{item.a}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

Что происходит при переходе по `next/link`: React заменяет разметку страницы, наблюдатель
кита останавливает модули старой страницы и запускает модули новой. «Назад» — так же.

Клиентские компоненты со своим состоянием (`useState`) — через `useModule`, как в React-SPA.

## Astro

В стартере `src/scripts/app.ts` подключён в `layouts/Base.astro` и запускается на каждой
странице. В `.astro`-компонентах — обычная разметка:

```astro
<div class="accordion" data-module="accordion">…</div>
```

Свои модули — `src/modules/<имя>/index.ts`, плагины — `src/plugins/*.ts` (регистрируются
сами). React-острова (`client:visible`) — через `useModule`.

> В стартере нет `<ClientRouter />` (View Transitions): каждая страница загружается заново,
> и `app.ts` запускается на ней. `ClientRouter` подменяет весь `<body>` без перезагрузки —
> если включите его, перезапускайте модули на событие `astro:page-load`
> (`app.mount(document.body)`) и проверьте переходы. В шаблоне этот вариант не проверялся.

## Vue / Nuxt

Схема та же, что для Next.js (в шаблоне не проверялась — стартера под Vue нет):

```js
// Nuxt: plugins/kit.client.js
export default defineNuxtPlugin(async () => {
  const { createApp } = await import('~/kit/js/core/app.js')
  const { kitModules } = await import('~/kit/js/modules/index.js')
  await createApp({ modules: kitModules })
})
```

Для компонента со своим состоянием — аналог `useModule`: в `onMounted` вызвать
`модуль(ref.value, ctx)`, в `onBeforeUnmount` — `instance.destroy()`.

## Частые ошибки

| Симптом                                                             | Причина                                                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| В React модуль работает до первой перерисовки, потом «отваливается» | `data-module` в компоненте со состоянием — нужен `useModule`                                  |
| В Next.js «Hydration failed»                                        | модуль запустили до гидрации (в теле компонента, не в `useEffect`) — используйте `KitRuntime` |
| Плавный скролл дёргается, два Lenis                                 | одновременно `<KitProvider smooth>` и `<KitRuntime />` — второму `smooth={false}`             |
| Next.js не находит `kit/…`                                          | нет `turbopack.resolveAlias` в `next.config`                                                  |
| `Can't find stylesheet to import 'kit/scss'`                        | нет `sassOptions.loadPaths`                                                                   |
