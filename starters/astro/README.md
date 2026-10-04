# Стартер: Astro

| Путь                     | Что                                                                     |
| ------------------------ | ----------------------------------------------------------------------- |
| `astro.config.mjs`       | языки (ru — `/`, en — `/en/`), sitemap, Vite-плагины кита               |
| `src/layouts/Base.astro` | `<head>` с hreflang/canonical/Open Graph, шапка, подвал, запуск модулей |
| `src/pages/`             | страницы: русские в корне, английские в `en/`                           |
| `src/components/`        | компоненты; `HomePage.astro` — общая разметка для всех языков           |
| `src/i18n/ui.ts`         | тексты страниц на всех языках (TypeScript проверяет пропуски)           |
| `src/scripts/app.ts`     | запуск модулей кита (data-module)                                       |
| `src/forms/schemas.ts`   | схемы форм                                                              |

Команды проекта: `npm run dev` (http://localhost:4321), `npm run build`, `npx astro check`.
Руководство — [docs/i18n.md](../../docs/i18n.md).
