/**
 * Обратный отсчёт до даты (акция, старт продаж) или «у вас 15 минут».
 *
 *   <div class="countdown" data-module="countdown" data-countdown-to="2026-12-31T23:59:59+03:00">
 *     <span data-countdown-days>00</span> <span data-countdown-label="days">дней</span>
 *     <span data-countdown-hours>00</span> <span data-countdown-label="hours">часов</span>
 *     <span data-countdown-minutes>00</span> <span data-countdown-label="minutes">минут</span>
 *     <span data-countdown-seconds>00</span> <span data-countdown-label="seconds">секунд</span>
 *     <p data-countdown-ended hidden>Акция завершена</p>
 *   </div>
 *
 * Нужны не все части: нет [data-countdown-days] — дни уходят в часы (49 часов).
 * [data-countdown-label] — подпись со склонением на языке страницы (1 день, 2 дня, 5 дней).
 *
 * «Личный» таймер — data-countdown-minutes="15": отсчёт от первого визита,
 * срок запоминается (localStorage), перезагрузка страницы его не сбрасывает.
 *
 * ─── Баги, закрытые здесь ───────────────────────────────────────────────────
 * 1. Дата без часового пояса («2026-12-31 23:59») у каждого посетителя своя —
 *    акция в Москве и Владивостоке кончается в разное время. Пишите пояс: +03:00.
 *    Без пояса модуль предупредит в консоли.
 * 2. setInterval «уплывает» и замирает в фоновой вкладке — остаток каждый раз
 *    считается от текущего времени, а не вычитанием секунды.
 * 3. Скринридер зачитывает каждую секунду — role="timer" (aria-live выключен).
 * 4. Срок вышел — отсчёт останавливается на нулях, а не уходит в минус.
 * @module kit/modules/countdown
 */
import { createDisposer } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { readStorage, writeStorage } from '../../core/storage.js'
import { onLocaleChange, t } from '../../core/i18n.js'

const DEFAULTS = {
  /** Дата окончания в формате ISO с часовым поясом: 2026-12-31T23:59:59+03:00. */
  to: '',
  /** «Личный» таймер: минут от первого визита (вместо to). */
  minutes: 0,
  /** Ключ запоминания личного таймера (если таймеров на сайте несколько). */
  key: 'countdown',
  /** Дополнять нулём до двух цифр: 07. */
  pad: true,
}

const UNITS = /** @type {const} */ (['days', 'hours', 'minutes', 'seconds'])
const SIZE = { days: 86400, hours: 3600, minutes: 60, seconds: 1 }

/**
 * Разложить остаток (мс) на части. Старшие части, которых нет в `units`,
 * переходят в младшие: без дней 2 дня 1 час = 49 часов.
 * @param {number} ms
 * @param {readonly string[]} [units]
 * @returns {Record<string, number>}
 */
export function splitTime(ms, units = UNITS) {
  let rest = Math.max(0, Math.floor(ms / 1000))
  /** @type {Record<string, number>} */
  const parts = {}
  for (const unit of UNITS) {
    if (!units.includes(unit)) continue
    parts[unit] = Math.floor(rest / SIZE[unit])
    rest -= parts[unit] * SIZE[unit]
  }
  return parts
}

export default function countdown(el, ctx = {}) {
  const options = readOptions(el, 'countdown', DEFAULTS, ctx.options)
  const d = createDisposer()

  let deadline = NaN
  if (options.minutes > 0) {
    const storageKey = `countdown:${options.key}`
    deadline = Number(readStorage(storageKey))
    if (!Number.isFinite(deadline) || deadline <= 0) {
      deadline = Date.now() + options.minutes * 60_000
      writeStorage(storageKey, deadline)
    }
  } else {
    deadline = new Date(options.to).getTime()
    if (Number.isNaN(deadline)) throw new Error(`[kit] countdown: не удалось прочитать дату «${options.to}»`)
    if (!/(Z|[+-]\d\d:?\d\d)$/i.test(options.to.trim())) {
      console.warn(`[kit] countdown: у даты «${options.to}» нет часового пояса — у посетителей срок будет разным`)
    }
  }

  const slots = Object.fromEntries(UNITS.map((unit) => [unit, el.querySelector(`[data-countdown-${unit}]`)]))
  const units = UNITS.filter((unit) => slots[unit])
  const labels = Array.from(el.querySelectorAll('[data-countdown-label]'))
  const endedBox = el.querySelector('[data-countdown-ended]')
  let ended = false
  let stop = () => {}

  if (!el.hasAttribute('role')) el.setAttribute('role', 'timer')

  function render() {
    const left = deadline - Date.now()
    const parts = splitTime(left, units)
    for (const unit of units) {
      const text = options.pad ? String(parts[unit]).padStart(2, '0') : String(parts[unit])
      if (slots[unit].textContent !== text) slots[unit].textContent = text
    }
    labels.forEach((label) => {
      const unit = /** @type {HTMLElement} */ (label).dataset.countdownLabel
      if (unit in parts) label.textContent = t(`kit.countdown.${unit}`, { count: parts[unit] })
    })
    if (left > 0 || ended) return
    ended = true
    stop()
    el.classList.add('is-ended')
    if (endedBox) endedBox.hidden = false
    el.dispatchEvent(new CustomEvent('countdown:end', { bubbles: true }))
    ctx.bus?.emit('countdown:end', { el })
  }

  stop = d.interval(render, 1000)
  // Вкладку вернули из фона — показываем верное время сразу, не дожидаясь тика.
  d.listen(document, 'visibilitychange', () => !document.hidden && render())
  d.add(onLocaleChange(render))
  render()

  return {
    /** Остаток, мс (не меньше нуля). */
    get left() {
      return Math.max(0, deadline - Date.now())
    },
    get ended() {
      return ended
    },
    destroy: d.dispose,
  }
}
