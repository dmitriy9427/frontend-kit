/**
 * useModule — запустить модуль кита на DOM-элементе компонента.
 *
 *   const ref = useModule(slider, { autoplay: 5000 })
 *   return <div ref={ref} className="slider">…</div>
 *
 * Нужен доступ к API модуля (открыть модалку из кода)? Третий аргумент —
 * функция, которая получит экземпляр после запуска (и null после остановки):
 *
 *   const api = useRef(null)
 *   const ref = useModule(dialog, {}, (instance) => (api.current = instance))
 *   <button onClick={() => api.current?.open()}>…</button>
 *
 * ─── Что учтено ─────────────────────────────────────────────────────────────
 * 1. StrictMode в разработке монтирует компонент дважды (mount → unmount →
 *    mount). Модуль корректно запускается, убирается и запускается снова —
 *    поэтому каждый модуль ОБЯЗАН полностью убирать за собой в destroy.
 * 2. Асинхронный (lazy) модуль: если компонент размонтировали, пока код
 *    грузился, destroy вызывается сразу после загрузки.
 * 3. Опции сравниваются по значению, а не по ссылке: объект
 *    `{ autoplay: 5000 }`, созданный заново при каждом рендере, НЕ
 *    перезапускает модуль. Функции и объекты внутри опций (schema, onSubmit)
 *    сравниваются по ссылке — объявляйте их ВНЕ компонента или в useMemo /
 *    useCallback, иначе модуль будет перезапускаться на каждый рендер.
 * 4. ctx берётся из <KitProvider> (bus, reduced, scroll). Без провайдера
 *    модуль тоже работает — с минимальным контекстом.
 * 5. Экземпляры на одном элементе живут строго по очереди: следующий
 *    запускается только после того, как предыдущий запустился И убрался.
 *    Баг был такой: в StrictMode первый (уже отменённый) экземпляр
 *    запускался после второго и в destroy снимал общий класс — у select
 *    пропадал select__native, и родной <select> становился виден рядом с
 *    красивым. Отменённый до запуска экземпляр теперь не запускается вовсе.
 *
 * ─── Важно: React и DOM ─────────────────────────────────────────────────────
 * Модули кита меняют атрибуты (aria-*, hidden, классы is-*), но не
 * пересоздают элементы. Если React перерисует те же атрибуты из JSX, он
 * затрёт изменения модуля. Правило: не задавайте в JSX то, чем управляет
 * модуль (aria-expanded у аккордеона, hidden у панелей табов и т.д.).
 * Модуль читает разметку один раз при запуске: поменялся СОСТАВ элементов
 * (другие слайды, новые пункты) — перезапустите его через key:
 *   <Slider key={items.length}>…</Slider>
 * @module kit/react/useModule
 */
import { useContext, useEffect, useRef } from 'react'
import { KitContext } from './context.js'
import { prefersReducedMotion } from '../js/core/env.js'

const ids = new WeakMap()
/** Элемент → обещание «предыдущий экземпляр запущен и убран» (п. 5). */
const queues = new WeakMap()
let lastId = 0
/** Ключ опций: примитивы — по значению, функции/объекты — по ссылке. */
export function optionsKey(options = {}) {
  return Object.keys(options)
    .sort()
    .map((key) => {
      const value = options[key]
      if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
        if (!ids.has(value)) ids.set(value, ++lastId)
        return `${key}#${ids.get(value)}`
      }
      return `${key}=${JSON.stringify(value)}`
    })
    .join('&')
}

/**
 * @template [T=any] Тип элемента (в TS): useModule<HTMLDivElement>(…)
 * @param {(el: any, ctx: any) => any} init Модуль кита (функция init).
 * @param {Record<string, any>} [options] Настройки — важнее data-атрибутов.
 * @param {(instance: any) => void} [onInstance] Получить API модуля.
 * @returns {import('react').RefObject<T | null>}
 */
export function useModule(init, options, onInstance) {
  const ref = useRef(null)
  const callback = useRef(onInstance)
  const latestOptions = useRef(options)
  const kit = useContext(KitContext)
  const key = optionsKey(options)

  // Всегда держим последние версии колбэка и опций, не перезапуская модуль.
  // (Этот эффект объявлен раньше — React выполнит его первым.)
  useEffect(() => {
    callback.current = onInstance
    latestOptions.current = options
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    let alive = true
    let destroy = null
    // Object.create, а не {...kit}: у контекста есть «живые» поля-геттеры
    // (scroll появляется после монтирования провайдера) — копия их бы заморозила.
    const ctx = Object.assign(Object.create(kit ?? { reduced: prefersReducedMotion() }), {
      options: latestOptions.current ?? {},
    })

    const run = (queues.get(el) ?? Promise.resolve())
      .then(() => (alive ? init(el, ctx) : null))
      .then((result) => {
        if (!alive) return result?.destroy?.()
        destroy = result?.destroy ?? null
        callback.current?.(result ?? null)
        return undefined
      })
      .catch((error) => console.error('[kit] useModule: модуль упал при запуске', error))
    queues.set(el, run)

    return () => {
      alive = false
      destroy?.()
      callback.current?.(null)
    }
  }, [init, key, kit])

  return ref
}
