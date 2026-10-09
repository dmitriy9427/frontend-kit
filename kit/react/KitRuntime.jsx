'use client'
/**
 * KitRuntime — запуск модулей кита по data-module в разметке, которую рисует
 * НЕ React-код с useModule: серверные компоненты Next.js, HTML из CMS
 * (dangerouslySetInnerHTML), MDX, статичные части страницы.
 *
 *   // app/layout.jsx (Next.js App Router)
 *   import { KitRuntime } from 'kit/react/KitRuntime.jsx'
 *   <body>
 *     {children}
 *     <KitRuntime />
 *   </body>
 *
 *   // любой серверный компонент — просто разметка, без 'use client':
 *   <div className="accordion" data-module="accordion">…</div>
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * Один раз после гидрации вызывает createApp: модули запускаются на всех
 * [data-module], а наблюдатель DOM запускает модули новой страницы при
 * клиентском переходе (next/link) и останавливает модули старой.
 * Код кита грузится динамическим import — в серверный бандл не попадает.
 *
 * ─── Когда НЕ нужен ─────────────────────────────────────────────────────────
 * В клиентских компонентах со своим состоянием используйте useModule: там
 * React перерисовывает разметку, и модуль должен знать о её смене.
 * Вместе с <KitProvider smooth> передайте smooth={false} — иначе два Lenis.
 * @module kit/react/KitRuntime
 */
import { useEffect } from 'react'

/**
 * @param {{ modules?: Record<string, Function>, plugins?: Function[], smooth?: boolean }} props
 *   modules — свой реестр (по умолчанию все модули кита); plugins — плагины приложения;
 *   smooth — плавный скролл Lenis (по умолчанию включён).
 */
export function KitRuntime({ modules, plugins = [], smooth = true }) {
  useEffect(() => {
    let app = null
    let cancelled = false
    Promise.all([import('../js/core/app.js'), modules ? null : import('../js/modules/index.js')])
      .then(([{ createApp }, kit]) => createApp({ modules: modules ?? kit.kitModules, plugins, smooth }))
      .then((created) => {
        // StrictMode/быстрая смена страницы: эффект уже убран — сразу останавливаем.
        if (cancelled) created.destroy()
        else app = created
      })
      .catch((error) => console.error('[kit] KitRuntime не запустился', error))
    return () => {
      cancelled = true
      app?.destroy()
    }
    // Запуск один раз: реестр и плагины — на всё время жизни страницы.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
