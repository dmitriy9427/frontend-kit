/**
 * Выпадающая панель у кнопки: меню «ещё», профиль, фильтр, подменю в шапке.
 *
 *   <button data-module="popover" data-popover-target="user-menu">Профиль</button>
 *   <div id="user-menu" class="popover" role="menu" hidden>
 *     <a role="menuitem" href="/orders">Заказы</a>
 *     <a role="menuitem" href="/settings">Настройки</a>
 *     <button role="menuitem" type="button">Выйти</button>
 *   </div>
 *
 * Без role="menu" — просто панель с любым содержимым (форма фильтра, подсказка
 * с кнопками). Закрыть изнутри — [data-popover-close].
 *
 * ─── Что делает ─────────────────────────────────────────────────────────────
 * - Позиция — Floating UI: под кнопкой, не помещается — сверху (flip), у края
 *   экрана сдвигается (shift); следит за прокруткой и ресайзом, пока открыто.
 * - «Верхний слой» браузера (popover="manual"): панель не обрезается
 *   overflow: hidden у предков и не воюет z-index с шапкой и модалкой.
 * - Закрытие: Esc (фокус возвращается на кнопку), клик мимо, уход фокуса
 *   клавишей Tab, выбор пункта меню.
 * - Меню (role="menu"): ↓ на кнопке открывает и ставит фокус на первый пункт,
 *   ↑ ↓ Home End ходят по пунктам по кругу.
 * - hover: открытие наведением (подменю в шапке) — только там, где есть мышь;
 *   клик и клавиатура работают всегда. Задержка закрытия даёт довести курсор
 *   от кнопки до панели.
 * - aria-expanded, aria-controls, aria-haspopup ставятся сами.
 *
 * Тултип (data-tooltip) — для подсказки без кнопок внутри; модалка — когда
 * остальная страница должна быть недоступна. Popover — всё, что между.
 * @module kit/modules/popover
 */
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { createDisposer } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { canHover } from '../../core/env.js'

const DEFAULTS = {
  /** id панели. */
  target: '',
  /** Сторона: bottom | top | left | right (+ -start / -end). */
  placement: 'bottom-start',
  /** Отступ от кнопки, px. */
  offset: 8,
  /** Открывать наведением мыши. */
  hover: false,
  /** Задержка закрытия при уходе курсора, мс (для hover). */
  hoverDelay: 150,
  /** Закрывать по клику на ссылку/кнопку внутри (для role="menu" включено всегда). */
  closeOnSelect: false,
  /** Ширина панели не меньше ширины кнопки. */
  matchWidth: false,
}

const ITEMS = '[role^="menuitem"]:not([disabled], [aria-disabled="true"])'

export default function popover(button, ctx = {}) {
  const options = readOptions(button, 'popover', DEFAULTS, ctx.options)
  /** @type {HTMLElement | null} */
  const panel = document.getElementById(options.target)
  if (!panel) throw new Error(`[kit] popover: не найдена панель с id «${options.target}»`)
  if (!button.id && !panel.hasAttribute('aria-label') && !panel.hasAttribute('aria-labelledby')) {
    // Имя панели = текст кнопки: скринридер объявит «Профиль, меню».
    button.id = `${panel.id}-trigger`
    panel.setAttribute('aria-labelledby', button.id)
  }

  const d = createDisposer()
  const isMenu = panel.getAttribute('role') === 'menu'
  const canPopover = typeof panel.showPopover === 'function'
  let open = false
  let stopAutoUpdate = null
  let hoverTimer = 0

  button.setAttribute('aria-controls', panel.id)
  button.setAttribute('aria-expanded', 'false')
  if (isMenu) button.setAttribute('aria-haspopup', 'menu')
  if (canPopover) panel.popover = 'manual'
  panel.hidden = true

  const items = () =>
    /** @type {HTMLElement[]} */ (Array.from(panel.querySelectorAll(ITEMS))).filter((el) => !el.hidden)

  async function place() {
    if (!open) return
    if (options.matchWidth) panel.style.minWidth = `${button.getBoundingClientRect().width}px`
    const { x, y, placement } = await computePosition(button, panel, {
      strategy: 'fixed',
      placement: /** @type {any} */ (options.placement),
      middleware: [offset(options.offset), flip(), shift({ padding: 8 })],
    })
    Object.assign(panel.style, { left: `${x}px`, top: `${y}px` })
    panel.dataset.placement = placement.split('-')[0]
  }

  /** @param {{ focus?: 'first' | 'last' | null }} [o] */
  function show({ focus = null } = {}) {
    clearTimeout(hoverTimer)
    if (open) return
    open = true
    panel.hidden = false
    if (canPopover && !panel.matches(':popover-open')) panel.showPopover()
    button.setAttribute('aria-expanded', 'true')
    stopAutoUpdate = autoUpdate(button, panel, place)
    requestAnimationFrame(() => open && panel.classList.add('is-open'))
    if (focus) {
      const list = items()
      ;(focus === 'last' ? list[list.length - 1] : list[0])?.focus({ preventScroll: true })
    }
    button.dispatchEvent(new CustomEvent('popover:open', { bubbles: true }))
    ctx.bus?.emit('popover:open', { el: button, panel })
  }

  /** @param {{ restoreFocus?: boolean }} [o] */
  function hide({ restoreFocus = false } = {}) {
    clearTimeout(hoverTimer)
    if (!open) return
    open = false
    // Фокус был внутри — возвращаем на кнопку ДО скрытия, иначе он «проваливается» на <body>.
    if (restoreFocus || panel.contains(document.activeElement)) button.focus({ preventScroll: true })
    stopAutoUpdate?.()
    stopAutoUpdate = null
    panel.classList.remove('is-open')
    panel.hidden = true
    if (canPopover && panel.matches(':popover-open')) panel.hidePopover()
    button.setAttribute('aria-expanded', 'false')
    button.dispatchEvent(new CustomEvent('popover:close', { bubbles: true }))
    ctx.bus?.emit('popover:close', { el: button, panel })
  }

  const inside = (node) => node instanceof Node && (button.contains(node) || panel.contains(node))

  // ─── Кнопка ──────────────────────────────────────────────────────────────
  d.listen(button, 'click', (event) => {
    event.preventDefault()
    // detail === 0 — Enter/Пробел: в меню сразу ставим фокус на первый пункт.
    if (open) hide()
    else show({ focus: isMenu && event.detail === 0 ? 'first' : null })
  })
  d.listen(button, 'keydown', (event) => {
    if (!isMenu) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (open) hide()
      show({ focus: event.key === 'ArrowDown' ? 'first' : 'last' })
    }
  })

  // ─── Панель ──────────────────────────────────────────────────────────────
  d.listen(panel, 'keydown', (event) => {
    if (!isMenu) return
    const list = items()
    const index = list.indexOf(/** @type {HTMLElement} */ (document.activeElement))
    const move = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: list.length - 1 }[event.key]
    if (move === undefined || !list.length) return
    event.preventDefault()
    list[(move + list.length) % list.length].focus({ preventScroll: true })
  })
  d.listen(panel, 'click', (event) => {
    const target = /** @type {Element} */ (event.target)
    if (target.closest('[data-popover-close]')) return hide({ restoreFocus: true })
    const selectable = isMenu ? ITEMS : options.closeOnSelect ? 'a[href], button' : null
    if (selectable && target.closest(selectable)) hide({ restoreFocus: true })
  })

  // ─── Закрытие снаружи ────────────────────────────────────────────────────
  d.listen(document, 'pointerdown', (event) => {
    if (open && !inside(event.target)) hide()
  })
  d.listen(document, 'keydown', (event) => {
    if (event.key !== 'Escape' || !open) return
    // Модалка под панелью закрыться не должна — Esc «съедаем».
    event.preventDefault()
    event.stopPropagation()
    hide({ restoreFocus: true })
  })
  const onFocusOut = (event) => {
    // relatedTarget = null при клике в пустое место — это обрабатывает pointerdown.
    if (open && event.relatedTarget && !inside(event.relatedTarget)) hide()
  }
  d.listen(button, 'focusout', onFocusOut)
  d.listen(panel, 'focusout', onFocusOut)

  // ─── Наведение ───────────────────────────────────────────────────────────
  if (options.hover && canHover()) {
    const enter = (event) => event.pointerType !== 'touch' && show()
    const leave = (event) => {
      if (event.pointerType === 'touch') return
      clearTimeout(hoverTimer)
      hoverTimer = window.setTimeout(() => hide(), options.hoverDelay)
    }
    for (const el of [button, panel]) {
      d.listen(el, 'pointerenter', enter)
      d.listen(el, 'pointerleave', leave)
    }
  }

  d.add(() => {
    hide()
    if (canPopover) panel.removeAttribute('popover')
    button.removeAttribute('aria-expanded')
  })

  return {
    open: () => show(),
    close: () => hide(),
    toggle: () => (open ? hide() : show()),
    /** Пересчитать позицию (если содержимое панели изменилось). */
    update: place,
    get isOpen() {
      return open
    },
    destroy: d.dispose,
  }
}
