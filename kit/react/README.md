# react — адаптер для React

| Файл           | Что делает                                                                     |
| -------------- | ------------------------------------------------------------------------------ |
| `useModule.js` | запустить модуль кита на элементе компонента (StrictMode-безопасно)            |
| `provider.jsx` | `KitProvider` — шина, плавный скролл, reduced motion для всего приложения      |
| `hooks.js`     | `useMediaQuery`, `useBreakpoint`, `useReducedMotion`, `useBus` (SSR-безопасны) |
| `useFlip.js`   | плавная перестановка элементов при изменении списка (GSAP Flip)                |
| `Expand.jsx`   | `<Expand open>` — плавное раскрытие по высоте (подсказки, доп. поля)           |
| `context.js`   | React-контекст                                                                 |

Руководство — [docs/react.md](../../docs/react.md). Тесты — `react.test.jsx`.
