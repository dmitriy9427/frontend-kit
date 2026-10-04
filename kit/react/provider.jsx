/**
 * KitProvider — общий контекст для модулей кита в React-приложении:
 * шина событий, плавный скролл, reduced motion. Оберните им приложение:
 *
 *   <KitProvider smooth>
 *     <App />
 *   </KitProvider>
 *
 * ─── Почему контекст не меняется после монтирования ────────────────────────
 * Плавный скролл (Lenis) создаётся в эффекте — уже ПОСЛЕ того, как дочерние
 * компоненты запустили свои модули (эффекты детей выполняются раньше эффекта
 * родителя). Если бы провайдер после этого отдавал новый объект контекста,
 * все useModule перезапустили бы свои модули. Поэтому объект контекста
 * создаётся один раз, а поле scroll — «живой» геттер: модуль, который
 * обращается к ctx.scroll в момент клика, получает уже готовый Lenis.
 *
 * На таче и при prefers-reduced-motion Lenis не включается — как и в
 * vanilla-стартере.
 * @module kit/react/provider
 */
import { useContext, useEffect, useState } from 'react'
import { KitContext } from './context.js'
import { createBus } from '../js/core/bus.js'
import { isTouch, prefersReducedMotion } from '../js/core/env.js'
import { setScrollEngine } from '../js/core/scroll-lock.js'
import { createSmoothScroll } from '../js/core/smooth-scroll.js'

function createKitValue() {
  const holder = { scroll: null }
  return {
    bus: createBus(),
    reduced: prefersReducedMotion(),
    get scroll() {
      return holder.scroll
    },
    attachScroll(scroll) {
      holder.scroll = scroll
    },
  }
}

export function KitProvider({ smooth = true, children }) {
  const [value] = useState(createKitValue)

  useEffect(() => {
    document.documentElement.classList.add('js')
    const scroll = createSmoothScroll({ enabled: smooth && !value.reduced && !isTouch(), reduced: value.reduced })
    value.attachScroll(scroll)
    setScrollEngine(scroll)
    return () => {
      value.attachScroll(null)
      setScrollEngine(null)
      scroll.destroy()
    }
  }, [smooth, value])

  return <KitContext.Provider value={value}>{children}</KitContext.Provider>
}

/**
 * { bus, reduced, scroll } — или null вне KitProvider.
 * @returns {import('./context.js').KitValue | null}
 */
export const useKit = () => useContext(KitContext)
