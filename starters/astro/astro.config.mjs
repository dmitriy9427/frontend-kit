/**
 * Настройки Astro.
 *
 * Astro собирает статические HTML-страницы (быстро и хорошо для SEO), а
 * JS отправляет в браузер только там, где он нужен. Модули кита
 * (data-module="…") оживляются одним скриптом в layouts/Base.astro.
 *
 * Мультиязычность: русский — по адресу /, английский — /en/.
 * У каждой версии свой адрес, свой <html lang> и ссылки hreflang друг на
 * друга — поисковики индексируют обе. Тексты — src/i18n/ui.ts.
 *
 * site — адрес сайта на проде: нужен для sitemap.xml и абсолютных ссылок
 * (Open Graph). Поменяйте перед запуском.
 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { kit } from '../../kit/vite/index.js'

const kitDir = fileURLToPath(new URL('../../kit', import.meta.url))
const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  site: 'https://example.com',
  base: process.env.BASE_URL ?? '/',
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru',
    // Русская версия без префикса (/about), английская — с /en/ (/en/about).
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'ru', locales: { ru: 'ru-RU', en: 'en-US' } },
    }),
  ],
  server: { port: 4321 },
  vite: {
    resolve: { alias: { kit: kitDir, '@': `${root}src` } },
    css: {
      preprocessorOptions: { scss: { loadPaths: [dirname(kitDir), `${root}src/styles`] } },
      devSourcemap: true,
    },
    // include и pages не нужны: страницы и вставки — средства самого Astro.
    plugins: [...kit({ include: false, pages: false })],
    build: {
      // three.js (~530 КБ) — отдельный ленивый файл: грузится только для 3D-слайдера.
      // Порог поднят, чтобы предупреждение не пугало; основной бандл — ~150 КБ.
      chunkSizeWarningLimit: 600,
    },
  },
})
