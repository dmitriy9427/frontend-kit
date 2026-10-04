/**
 * «Магнитная» кнопка: тянется за курсором, пока он над ней.
 *
 *   <a class="btn" href="#" data-module="magnetic" data-magnetic-strength="0.3">Связаться</a>
 *
 * Только для мыши: на тач-экранах эффект бессмыслен и мешает тапу.
 *
 * Баг, закрытый здесь: если анимировать через gsap.to с overwrite: true на
 * каждый mousemove, после первого ухода курсора эффект «залипает» и больше
 * не работает (overwrite убивает quickTo). Используем quickTo — один твин,
 * которому только меняем цель.
 * @module kit/modules/magnetic
 */
import { gsap } from '../../core/gsap.js'
import { createDisposer } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { canHover } from '../../core/env.js'

const DEFAULTS = {
  /** Насколько сильно тянется: доля от расстояния курсора до центра. */
  strength: 0.35,
}

export default function magnetic(el, ctx = {}) {
  if (ctx.reduced || !canHover()) return
  const options = readOptions(el, 'magnetic', DEFAULTS, ctx.options)
  const d = createDisposer()
  const x = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' })
  const y = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' })

  d.listen(el, 'pointermove', (event) => {
    const rect = el.getBoundingClientRect()
    x((event.clientX - rect.left - rect.width / 2) * options.strength)
    y((event.clientY - rect.top - rect.height / 2) * options.strength)
  })
  d.listen(el, 'pointerleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' })
  })
  d.add(() => {
    gsap.killTweensOf(el)
    gsap.set(el, { clearProps: 'transform' })
  })
  return { destroy: d.dispose }
}
