/**
 * Запуск модулей кита на каждой странице (подключён в layouts/Base.astro).
 * Astro собирает этот файл в один модуль и грузит его один раз.
 *
 * Как в vanilla-стартере, новое регистрируется само:
 *   src/modules/<имя>/index.ts → модуль «имя» (data-module="имя" в разметке .astro)
 *   src/plugins/*.ts           → плагин сайта (один раз при старте, до модулей)
 */
import { createApp } from 'kit/js/core/app.js'
import { modulesFromGlob, pluginsFromGlob } from 'kit/js/core/modules.js'
import { kitModules } from 'kit/js/modules/index.js'
import '../forms/schemas'

const projectModules = modulesFromGlob(import.meta.glob(['../modules/*/index.{js,ts}']))
const plugins = pluginsFromGlob(import.meta.glob('../plugins/*.{js,ts}', { eager: true }))

createApp({ modules: { ...kitModules, ...projectModules }, plugins, smooth: true })

if (import.meta.env.DEV) {
  import('kit/devtools/index.js').then((m) => m.installDevtools())
}
