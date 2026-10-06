/**
 * useFlip — плавная перестановка элементов при изменении списка (FLIP, GSAP Flip).
 *
 *   const [listRef, capture] = useFlip(items.map((i) => i.id).join())  // ключ — «состав» списка
 *   const remove = (id) => {
 *     capture()                       // 1. запомнить, где всё стоит СЕЙЧАС
 *     setItems((list) => list.filter((i) => i.id !== id))  // 2. изменить
 *   }                                 // 3. хук сам доиграет: старые места → новые
 *   return <ul ref={listRef}>{items.map((i) => <li key={i.id}>…</li>)}</ul>
 *
 * Возвращает пару [ref, capture] — как useState: имена выбираете сами, когда
 * в компоненте несколько анимируемых списков.
 *
 * Без него при добавлении/удалении/фильтрации элементы «перескакивают», а
 * соседи дёргаются. С ним — едут со старых мест, новые проявляются.
 *
 * ─── Почему capture() вручную ──────────────────────────────────────────────
 * FLIP = First, Last, Invert, Play: снимок позиций нужен ДО того, как React
 * изменит DOM. Читать DOM во время рендера нельзя (рендер может быть
 * отброшен, линтер React это ловит), поэтому снимок берётся в обработчике —
 * там, где вы меняете состояние. После коммита (useLayoutEffect, до
 * отрисовки кадра) хук запускает Flip.from() от снимка. Нет снимка — нет
 * анимации (например, состав поменялся «извне»).
 *
 * ─── Опции ────────────────────────────────────────────────────────────────
 *   selector  — какие элементы двигать (по умолчанию — прямые дети: ':scope > *')
 *   duration  — длительность, с (0.5)
 *   absolute  — на время анимации вынести элементы из потока (для сеток, где
 *               элементы меняют ряд; контейнеру тогда нужен min-height)
 *
 * Удалённые элементы React убирает сразу — исчезают без анимации, остальные
 * плавно занимают их место. «Меньше движения» — без анимации.
 * @module kit/react/useFlip
 */
import { useCallback, useLayoutEffect, useRef } from 'react'
import { Flip } from 'gsap/Flip'
import { gsap } from '../js/core/gsap.js'
import { prefersReducedMotion } from '../js/core/env.js'

gsap.registerPlugin(Flip)

/**
 * @template [T=HTMLElement]
 * @param {string | number | boolean | null | undefined} key Меняется — анимируем (если был capture()).
 * @param {{ selector?: string, duration?: number, ease?: string, absolute?: boolean }} [options]
 * @returns {[import('react').RefObject<T | null>, () => void]}
 */
export function useFlip(
  key,
  { selector = ':scope > *', duration = 0.5, ease = 'power3.inOut', absolute = false } = {},
) {
  const ref = useRef(null)
  const snapshot = useRef(null)

  const capture = useCallback(() => {
    if (ref.current && !prefersReducedMotion()) snapshot.current = Flip.getState(ref.current.querySelectorAll(selector))
  }, [selector])

  useLayoutEffect(() => {
    const state = snapshot.current
    snapshot.current = null
    if (!state || !ref.current) return undefined
    const animation = Flip.from(state, {
      targets: ref.current.querySelectorAll(selector),
      duration,
      ease,
      absolute,
      onEnter: (elements) =>
        gsap.fromTo(
          elements,
          { opacity: 0, scale: 0.85 },
          { opacity: 1, scale: 1, duration: duration * 0.8, ease: 'power2.out' },
        ),
    })
    // Новое изменение посреди анимации — доводим старую до конца, иначе
    // элементы останутся с промежуточными inline-стилями.
    return () => {
      animation.progress(1).kill()
    }
  }, [key, selector, duration, ease, absolute])

  return [ref, capture]
}
