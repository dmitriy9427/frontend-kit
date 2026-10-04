/**
 * Точка входа. Порядок важен:
 *   1. стили (Vite вставит их <link> в <head>);
 *   2. запуск приложения: все data-module на странице оживают;
 *   3. dev-панель — ТОЛЬКО в разработке (в сборку не попадает).
 */
import './styles/main.scss'
import { createApp } from 'kit/js/core/app.js'
import { kitModules } from 'kit/js/modules/index.js'
import { projectModules } from './modules/index.js'
// Схемы форм регистрируются ДО запуска модулей (форма ищет схему по имени при старте).
import './forms/schemas.js'

createApp({
  // Модули проекта идут вторыми: одноимённый модуль проекта заменяет модуль кита.
  modules: { ...kitModules, ...projectModules },
  // Плавный скролл. На тач-устройствах и при reduced motion выключится сам.
  smooth: true,
})

// Условие должно быть именно таким — import.meta.env.DEV прямо в if.
// Тогда при сборке сборщик видит if (false) и выбрасывает код целиком.
if (import.meta.env.DEV) {
  import('kit/devtools/index.js').then((m) => m.installDevtools())
}
