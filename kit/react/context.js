/** Контекст кита для React (отдельный файл — чтобы Fast Refresh не перезагружал всё приложение). */
import { createContext } from 'react'

/**
 * @typedef {object} KitValue
 * @property {ReturnType<typeof import('../js/core/bus.js').createBus>} bus Шина событий.
 * @property {boolean} reduced Пользователь просил меньше движения.
 * @property {ReturnType<typeof import('../js/core/smooth-scroll.js').createSmoothScroll> | null} scroll Плавный скролл.
 */

/** @type {import('react').Context<KitValue | null>} */
export const KitContext = createContext(null)
