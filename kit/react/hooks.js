/**
 * Хуки окружения. Безопасны для SSR (Next.js, Astro): на сервере возвращают
 * значение по умолчанию, в браузере — настоящее, без ошибки гидрации.
 * @module kit/react/hooks
 */
import { useContext, useEffect, useRef, useSyncExternalStore } from 'react'
import { KitContext } from './context.js'
import { upQuery } from '../js/core/env.js'

/**
 * Совпадает ли медиазапрос. Перерисовывает компонент при изменении.
 *   const wide = useMediaQuery('(min-width: 1024px)')
 * useSyncExternalStore — официальный способ React подписаться на внешний
 * источник без «рваных» состояний в конкурентном режиме.
 */
export function useMediaQuery(query, serverValue = false) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

/** Экран шире брейкпоинта (как @include up('lg') в SCSS). */
export const useBreakpoint = (name) => useMediaQuery(upQuery(name))

/** Пользователь просил меньше анимаций. */
export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')

/**
 * Подписка на событие шины кита. Обработчик можно не мемоизировать —
 * хук всегда вызывает последнюю версию (без переподписки на каждый рендер).
 *   useBus('menu:toggle', (open) => setOverlay(open))
 */
export function useBus(event, handler) {
  const kit = useContext(KitContext)
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => kit?.bus.on(event, (payload) => latest.current(payload)), [kit, event])
}
