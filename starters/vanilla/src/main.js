/**
 * Точка входа. Порядок важен:
 *   1. стили: общие (main.scss), затем стили всех компонентов;
 *   2. запуск приложения: все data-module на странице оживают;
 *   3. dev-панель — ТОЛЬКО в разработке (в сборку не попадает).
 *
 * Новый компонент или модуль сюда дописывать НЕ нужно — они находятся сами:
 *   src/components/card/card.scss   → стили подключены
 *   src/components/card/card.js     → модуль «card» (data-module ставит плагин разметки)
 *   src/modules/price/index.js      → модуль «price» (data-module="price" в HTML)
 *   src/plugins/02-analytics.js     → плагин сайта (запускается один раз до модулей)
 *
 * GSAP и его плагины — из src/lib/gsap.js (одно место регистрации на проект).
 */
import './styles/main.scss'
import { createApp } from 'kit/js/core/app.js'
import { modulesFromGlob, pluginsFromGlob } from 'kit/js/core/modules.js'
import { kitModules } from 'kit/js/modules/index.js'
// Схемы форм регистрируются ДО запуска модулей (форма ищет схему по имени при старте).
import './forms/schemas.js'

// Стили компонентов. eager — сразу в общий CSS (без ожидания и «мигания»).
import.meta.glob('./components/*/*.scss', { eager: true })

// JS компонентов и модулей проекта. Без eager — ленивые: код скачивается,
// только если такой блок есть на странице.
const components = modulesFromGlob(import.meta.glob(['./components/*/*.js', '!./components/**/*.test.js']))
const projectModules = modulesFromGlob(import.meta.glob(['./modules/*/index.js']))

// Плагины сайта (аналитика, внешние ссылки…) — eager: нужны сразу, на всех страницах.
const plugins = pluginsFromGlob(import.meta.glob('./plugins/*.js', { eager: true }))

await createApp({
  plugins,
  // Порядок = приоритет: одноимённый модуль проекта/компонента заменяет модуль кита.
  modules: { ...kitModules, ...projectModules, ...components },
  // Плавный скролл. На тач-устройствах и при reduced motion выключится сам.
  smooth: true,
})

// Условие должно быть именно таким — import.meta.env.DEV прямо в if.
// Тогда при сборке сборщик видит if (false) и выбрасывает код целиком.
if (import.meta.env.DEV) {
  import('kit/devtools/index.js').then((m) => m.installDevtools())
}
