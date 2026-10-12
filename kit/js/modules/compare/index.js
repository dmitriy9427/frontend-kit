/**
 * Сравнение «до / после»: шторка, которую тянут по картинке.
 *
 *   <div class="compare" data-module="compare">
 *     <img src="after.jpg" alt="После ремонта" />
 *     <img class="compare__before" src="before.jpg" alt="До ремонта" />
 *     <span class="compare__handle" aria-hidden="true"></span>
 *     <input class="compare__range" type="range" min="0" max="100" value="50" />
 *   </div>
 *
 * ─── Почему внутри <input type="range"> ─────────────────────────────────────
 * Шторка — это ползунок. Невидимый range поверх картинок бесплатно даёт то,
 * что самодельный drag обычно теряет: стрелки и Home/End с клавиатуры, палец
 * и мышь, скринридер («Положение шторки, 50%»), вертикальная прокрутка
 * страницы пальцем поверх блока (touch-action: pan-y в стилях).
 * Модуль только переносит значение ползунка в CSS-переменную --compare,
 * которой стили обрезают верхнюю картинку и ставят ручку.
 *
 * Картинки должны быть одного размера (или с object-fit: cover — так в стилях).
 * @module kit/modules/compare
 */
import { createDisposer } from '../../core/lifecycle.js'
import { onLocaleChange, t } from '../../core/i18n.js'

export default function compare(root, ctx = {}) {
  /** @type {HTMLInputElement | null} */
  const range = root.querySelector('input[type="range"]')
  if (!range) throw new Error('[kit] compare: нужен <input type="range"> внутри блока')
  const d = createDisposer()
  const own = range.hasAttribute('aria-label') || range.hasAttribute('aria-labelledby')

  const percent = () => {
    const min = Number(range.min || 0)
    const max = Number(range.max || 100)
    return max > min ? ((Number(range.value) - min) / (max - min)) * 100 : 0
  }

  function render() {
    const value = percent()
    root.style.setProperty('--compare', `${value}%`)
    range.setAttribute('aria-valuetext', `${Math.round(value)}%`)
    if (!own) range.setAttribute('aria-label', t('kit.compare.label'))
  }

  d.listen(range, 'input', () => {
    render()
    root.dispatchEvent(new CustomEvent('compare:change', { bubbles: true, detail: { value: percent() } }))
    ctx.bus?.emit('compare:change', { el: root, value: percent() })
  })
  d.add(onLocaleChange(render))
  render()

  return {
    get value() {
      return percent()
    },
    /** Поставить шторку из кода, 0–100. */
    set(value) {
      range.value = String(value)
      range.dispatchEvent(new Event('input', { bubbles: true }))
    },
    destroy: d.dispose,
  }
}
