/**
 * Калькулятор стоимости. Пример компонента с поведением — и того, как один
 * модуль управляет другим.
 *
 * Регистрировать не нужно: src/main.js находит все src/components/*\/*.js сам,
 * а плагин разметки ставит data-module="price-calc" корню компонента.
 *
 * Что показывает:
 *   1. readOptions — настройки из data-атрибутов (их выставил шаблон из props);
 *   2. createDisposer — все обработчики снимаются в destroy;
 *   3. ctx.modules.when — дождаться модалки (её модуль ленивый и мог ещё не
 *      загрузиться) и вызвать её метод open();
 *   4. ctx.bus.emit — сообщить «всем, кому интересно» (аналитика, корзина),
 *      не зная, кто слушает;
 *   5. return { … } — свой API: другие модули могут спросить сумму;
 *   6. GSAP — из src/lib/gsap.js (единая точка плагинов и настроек проекта).
 */
import { createDisposer } from 'kit/js/core/lifecycle.js'
import { readOptions } from 'kit/js/core/options.js'
// Относительный путь работает и в Vite, и в тестах; в Vite можно и '@/lib/gsap.js'.
import { gsap } from '../../lib/gsap.js'

const DEFAULTS = {
  base: 15000,
  perPage: 4000,
}

const rub = (n) => `${n.toLocaleString('ru-RU')} ₽`

export default function priceCalc(el, ctx = {}) {
  const options = readOptions(el, 'price-calc', DEFAULTS, ctx.options)
  const d = createDisposer()
  const pages = /** @type {HTMLInputElement} */ (el.querySelector('[data-calc-pages]'))
  const pagesOut = el.querySelector('[data-calc-pages-out]')
  const total = el.querySelector('[data-calc-total]')

  function state() {
    const extras = Array.from(
      el.querySelectorAll('input[name="extras"]:checked'),
      (i) => /** @type {HTMLInputElement} */ (i),
    )
    const sum = options.base + Number(pages.value) * options.perPage + extras.reduce((s, i) => s + Number(i.value), 0)
    return { pages: Number(pages.value), extras: extras.map((i) => i.dataset.label), sum }
  }

  // Сумма «досчитывает» до нового значения. При «меньше движения» — сразу.
  const shown = { value: 0 }
  d.add(() => gsap.killTweensOf(shown))
  const render = () => (total.textContent = rub(Math.round(shown.value)))

  function update() {
    const s = state()
    pagesOut.textContent = String(s.pages)
    if (ctx.reduced || !shown.value) {
      shown.value = s.sum
      render()
    } else {
      gsap.to(shown, { value: s.sum, duration: 0.4, overwrite: true, onUpdate: render })
    }
    ctx.bus?.emit('price:change', s)
  }

  d.listen(el, 'input', update)
  d.listen(el, 'submit', (event) => event.preventDefault()) // Enter в форме не перезагружает страницу

  d.listen(el, 'click', async (event) => {
    if (!event.target.closest('[data-calc-order]')) return
    const s = state()
    // Модалка — другой модуль (dialog из кита, ленивый). when дождётся его запуска.
    const dialog = await ctx.modules.when('#callback', 'dialog')
    const box = document.getElementById('callback')
    const comment = /** @type {HTMLInputElement} */ (box.querySelector('input[name="comment"]'))
    comment.value = `Калькулятор: ${s.pages} стр.${s.extras.length ? ', ' + s.extras.join(', ') : ''} — ${rub(s.sum)}`
    box.querySelector('[data-callback-note]').textContent =
      `Ваш расчёт: ${rub(s.sum)}. Оставьте телефон — обсудим детали.`
    dialog.open()
    ctx.bus?.emit('price:order', s)
  })

  update()

  return {
    /** Текущий расчёт: { pages, extras, sum }. */
    get value() {
      return state()
    },
    destroy: d.dispose,
  }
}
