/**
 * Настройки Vite для React-приложения (SPA).
 *
 * Отличия от vanilla-стартера:
 * - плагин @vitejs/plugin-react (JSX, Fast Refresh — правки без потери состояния);
 * - include и pages выключены: страница одна (index.html), маршруты — в React;
 * - mock-api и защита dev-инструментов — те же.
 *
 * SPA на хостинге: сервер должен отдавать index.html на ЛЮБОЙ путь
 * (/about, /cases/1), иначе обновление страницы даст 404. См. docs/deploy.md.
 */
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
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
    devSourcemap: true,
  },
  server: { port: 5174 },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    // three.js (~530 КБ) — отдельный ленивый файл: грузится только для 3D-слайдера.
    // Порог поднят, чтобы предупреждение не пугало; основной бандл — ~150 КБ.
    chunkSizeWarningLimit: 600,
  },
  plugins: [react(), ...kit({ include: false, pages: false })],
})
