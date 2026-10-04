/**
 * Настройки Vite для многостраничной вёрстки.
 *
 * Что здесь настроено и зачем:
 * - root — папка проекта (конфиг можно запускать откуда угодно);
 * - alias `kit` — импорты вида `kit/js/core/app.js` вместо '../../../kit/…';
 * - loadPaths для SCSS — `@use 'kit/scss'` и `@use 'abstracts'` из любого файла;
 * - base — путь сайта на сервере. Сайт в подпапке (GitHub Pages, /promo/) —
 *   соберите с BASE_URL=/promo/ npm run build (иначе 404 на стили и скрипты);
 * - плагины кита: include кусков HTML, все .html — страницы, мок-API в dev,
 *   защита от dev-инструментов в проде (kit/vite/README.md).
 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { kit } from '../../kit/vite/index.js'

const root = fileURLToPath(new URL('.', import.meta.url))
const kitDir = fileURLToPath(new URL('../../kit', import.meta.url))

export default defineConfig({
  root,
  base: process.env.BASE_URL ?? '/',
  resolve: {
    alias: { kit: kitDir, '@': `${root}src` },
  },
  css: {
    preprocessorOptions: {
      scss: { loadPaths: [dirname(kitDir), `${root}src/styles`] },
    },
    devSourcemap: true, // в DevTools видно, в каком .scss файле правило
  },
  server: { port: 5173 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    // three.js (~530 КБ) — отдельный ленивый файл: грузится только для 3D-слайдера.
    // Порог поднят, чтобы предупреждение не пугало; основной бандл — ~150 КБ.
    chunkSizeWarningLimit: 600,
  },
  plugins: [...kit()],
})
