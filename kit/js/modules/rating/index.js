/**
 * Рейтинг звёздами: показ оценки (в т.ч. дробной) и выбор оценки в форме.
 *
 * Показ — пустой элемент, звёзды рисует CSS:
 *   <span class="rating rating--readonly" data-module="rating" data-rating-value="4.3"></span>
 *
 * Выбор — обычные radio, по одному на звезду:
 *   <fieldset class="rating" data-module="rating" data-rating-clearable>
 *     <legend class="visually-hidden">Оцените работу</legend>
 *     <label class="rating__star"><input type="radio" name="score" value="1" /></label>
 *     <label class="rating__star"><input type="radio" name="score" value="2" /></label>
 *     … до 5
 *   </fieldset>
 *   <span data-rating-output></span>   ← необязательно, внутри блока: «4 из 5»
 *
 * ─── Почему radio ───────────────────────────────────────────────────────────
 * Оценка — это «один вариант из нескольких», то есть группа radio. Отсюда
 * бесплатно: стрелки на клавиатуре, значение в FormData и в схеме формы
 * (s.enum / s.number), required, сброс формы, скринридер читает «3 из 5».
 * Звёзды закрашивает CSS (:has), наведение — тоже, поэтому выбор работает
 * и без JS.
 *
 * ─── Что добавляет модуль ───────────────────────────────────────────────────
 * - подписи звёзд для скринридера на языке страницы («3 звезды») — если у
 *   радио нет своей подписи;
 * - clearable: повторный клик по выбранной звезде (или Delete/Backspace)
 *   снимает оценку — у radio этого нет вовсе;
 * - текст оценки в [data-rating-output];
 * - событие rating:change (на элементе и в шине), API value / set / reset;
 * - в режиме показа — переменные --rating-value / --rating-max и подпись
 *   «Оценка 4,3 из 5» (role="img"): без неё незрячий не узнает оценку.
 *
 * Вид — переменные --rating-size, --rating-color, --rating-color-empty,
 * --rating-icon (kit/scss/components/_rating.scss).
 * @module kit/modules/rating
 */
import { createDisposer } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { getLocale, onLocaleChange, t } from '../../core/i18n.js'

const DEFAULTS = {
  /** Оценка для показа (режим без radio), можно дробную: 4.3. */
  value: 0,
  /** Сколько звёзд в режиме показа (при выборе — по числу radio). */
  max: 5,
  /** Повторный клик по выбранной звезде снимает оценку. */
  clearable: false,
}

/** Число на языке страницы: 4.3 → «4,3» в русском. */
const formatNumber = (n) => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }).format(n)

export default function rating(el, ctx = {}) {
  const options = readOptions(el, 'rating', DEFAULTS, ctx.options)
  const d = createDisposer()
  /** @type {HTMLInputElement[]} */
  const radios = Array.from(el.querySelectorAll('input[type="radio"]'))
  const output = el.querySelector('[data-rating-output]')

  // ─── Показ ───────────────────────────────────────────────────────────────
  if (!radios.length) {
    let shown = options.value
    const render = () => {
      const value = Math.min(options.max, Math.max(0, Number(shown) || 0))
      el.style.setProperty('--rating-value', String(value))
      el.style.setProperty('--rating-max', String(options.max))
      el.setAttribute('role', 'img')
      el.setAttribute('aria-label', t('kit.rating.value', { value: formatNumber(value), max: options.max }))
    }
    render()
    d.add(onLocaleChange(render))
    return {
      get value() {
        return shown
      },
      set(value) {
        shown = value
        render()
      },
      destroy: d.dispose,
    }
  }

  // ─── Выбор ───────────────────────────────────────────────────────────────
  const max = radios.length
  // Подписи ставим только тем, у кого своей нет, — и только их переводим при смене языка.
  const unlabeled = radios.filter(
    (radio) => !radio.hasAttribute('aria-label') && !radio.closest('label')?.textContent.trim(),
  )
  const current = () => radios.find((radio) => radio.checked) ?? null
  const valueOf = (radio) => (radio ? Number(radio.value) : 0)
  // Что было выбрано ДО клика: к событию click браузер уже отметил radio,
  // и «клик по выбранной» от «клик по новой» иначе не отличить.
  let before = current()

  function render() {
    const value = valueOf(current())
    el.style.setProperty('--rating-value', String(value))
    el.style.setProperty('--rating-max', String(max))
    unlabeled.forEach((radio) =>
      radio.setAttribute('aria-label', t('kit.rating.stars', { count: Number(radio.value) })),
    )
    if (output) output.textContent = value ? t('kit.rating.of', { value: formatNumber(value), max }) : ''
  }

  function changed() {
    before = current()
    if (before) el.classList.remove('is-cleared')
    render()
    const detail = { value: valueOf(before), name: radios[0].name }
    el.dispatchEvent(new CustomEvent('rating:change', { bubbles: true, detail }))
    ctx.bus?.emit('rating:change', { el, ...detail })
  }

  /** Выбрать/снять из кода — форма и фреймворк узнают так же, как при клике. */
  function set(value) {
    const next = radios.find((radio) => Number(radio.value) === Number(value)) ?? null
    if (next === current()) return
    const target = next ?? current()
    radios.forEach((radio) => (radio.checked = radio === next))
    target.dispatchEvent(new Event('input', { bubbles: true }))
    target.dispatchEvent(new Event('change', { bubbles: true }))
  }

  d.listen(el, 'change', changed)
  if (options.clearable) {
    d.listen(el, 'click', (event) => {
      const radio = event.target
      // detail === 0 — «клик» от клавиатуры (стрелки, пробел): им оценку не снимаем.
      if (!radios.includes(radio) || event.detail === 0) return
      if (radio !== before) return
      set(0)
      // Курсор всё ещё на звезде, и подсветка наведения выглядела бы как «оценка не снялась».
      // Гасим её, пока курсор не уйдёт с блока или не выберут снова.
      el.classList.add('is-cleared')
    })
    d.listen(el, 'pointerleave', () => el.classList.remove('is-cleared'))
    d.listen(el, 'keydown', (event) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && current()) {
        event.preventDefault()
        set(0)
      }
    })
  }
  const form = radios[0].form
  // reset: браузер возвращает значения ПОСЛЕ события — читаем на следующем тике.
  if (form)
    d.listen(form, 'reset', () =>
      d.timeout(() => {
        before = current()
        render()
      }, 0),
    )
  d.add(onLocaleChange(render))
  render()

  return {
    get value() {
      return valueOf(current())
    },
    set,
    reset: () => set(0),
    destroy: d.dispose,
  }
}
