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
 *
 * ─── Быстрые клики (табы, фильтры) ─────────────────────────────────────────
 * Новый клик посреди анимации: снимок берётся с элементов «как они сейчас на
 * экране», потом прошлая анимация и проявление новых элементов доводятся до
 * конца (иначе карточка застынет с промежуточным transform и прозрачностью),
 * и новая анимация едет от снимка. Снимок без смены ключа (клик не поменял
 * состав) выбрасывается — иначе он сработал бы на следующем изменении со
 * старыми координатами.
 *
 * ─── Чужие анимации появления ──────────────────────────────────────────────
 * Если у элементов есть своя анимация появления (CSS-переход translate/scale
 * по классу), Flip замерит их посреди неё, а GSAP «запечёт» промежуточные
 * translate/rotate/scale в inline-transform — элемент застынет. Поэтому:
 *   - перед снимком контейнер шлёт событие 'flip:capture' (всплывает) —
 *     скрипт появления должен по нему мгновенно закончить своё у детей;
 *   - пока идёт перестановка, у контейнера есть атрибут data-flipping —
 *     новые элементы скрипт появления не трогает (их проявляет onEnter).
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
  const running = useRef(null)

  const capture = useCallback(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    el.dispatchEvent(new CustomEvent('flip:capture', { bubbles: true }))
    el.setAttribute('data-flipping', '')
    snapshot.current = Flip.getState(el.querySelectorAll(selector))
  }, [selector])

  useLayoutEffect(() => {
    const state = snapshot.current
    snapshot.current = null
    const el = ref.current
    if (!state || !el) return undefined
    // Прошлая анимация (быстрый второй клик) — до конца: снимок уже снят,
    // а конечные места новой должны мериться по «чистым» элементам.
    running.current?.()
    const entering = []
    const done = () => el.removeAttribute('data-flipping')
    const animation = Flip.from(state, {
      targets: el.querySelectorAll(selector),
      duration,
      ease,
      absolute,
      onEnter: (elements) => {
        const tween = gsap.fromTo(
          elements,
          { opacity: 0, scale: 0.85 },
          {
            opacity: 1,
            scale: 1,
            duration: duration * 0.8,
            ease: 'power2.out',
            // Без следов: inline-transform перебил бы hover-эффекты из CSS.
            clearProps: 'opacity,transform,translate,rotate,scale',
          },
        )
        entering.push(tween)
        return tween
      },
      onComplete: () => {
        done()
        running.current = null
      },
    })
    const finish = () => {
      animation.progress(1).kill()
      entering.forEach((tween) => tween.progress(1).kill())
      done()
      running.current = null
    }
    running.current = finish
    return undefined
  }, [key, selector, duration, ease, absolute])

  // Снимок без смены ключа (клик не поменял состав) — выбрасываем после
  // коммита, иначе он сработал бы на следующем изменении со старыми местами.
  // Эффект объявлен после основного — React запускает их по порядку.
  useLayoutEffect(() => {
    if (!snapshot.current) return
    snapshot.current = null
    if (!running.current) ref.current?.removeAttribute('data-flipping')
  })

  // Размонтирование — доводим анимацию до конца.
  useLayoutEffect(() => () => running.current?.(), [])

  return [ref, capture]
}
