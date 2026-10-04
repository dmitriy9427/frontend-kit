/**
 * Запуск модулей кита на каждой странице (подключён в layouts/Base.astro).
 * Astro собирает этот файл в один модуль и грузит его один раз.
 */
import { createApp } from 'kit/js/core/app.js'
import { kitModules } from 'kit/js/modules/index.js'
import '../forms/schemas'

createApp({ modules: kitModules, smooth: true })

if (import.meta.env.DEV) {
  import('kit/devtools/index.js').then((m) => m.installDevtools())
}
