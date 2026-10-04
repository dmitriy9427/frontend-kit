/**
 * React-адаптер кита: те же модули (аккордеон, слайдер, модалка…) и то же
 * ядро, но через хуки.
 *
 *   import { KitProvider, useModule, useMediaQuery } from 'kit/react'
 *   import accordion from 'kit/js/modules/accordion'
 *
 *   function Faq() {
 *     const ref = useModule(accordion, { multiple: true })
 *     return <div ref={ref} className="accordion">…</div>
 *   }
 *
 * Подробно — kit/react/README.md.
 * @module kit/react
 */
export { KitProvider, useKit } from './provider.jsx'
export { useModule } from './useModule.js'
export { useBus, useBreakpoint, useMediaQuery, useReducedMotion } from './hooks.js'
