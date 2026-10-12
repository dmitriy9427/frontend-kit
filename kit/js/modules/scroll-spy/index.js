/**
 * Подсветка пункта меню для секции, которая сейчас на экране.
 *
 *   <nav data-module="scroll-spy">
 *     <a href="#about">О нас</a>
 *     <a href="#price">Цены</a>
 *     <a href="/blog">Блог</a>        ← не якорь — модуль его не трогает
 *   </nav>
 *   <section id="about">…</section> <section id="price">…</section>
 *
 * Активная ссылка получает aria-current="location" и класс is-active.
 *
 * ─── Как выбирается секция ──────────────────────────────────────────────────
 * Активна последняя секция, верх которой уже поднялся до «линии» под шапкой
 * (высота шапки --header-height + offset). Так выбор совпадает с тем, куда
 * привозит клик по якорю, и не скачет на коротких секциях.
 *
 * ─── Баги, закрытые здесь ───────────────────────────────────────────────────
 * 1. IntersectionObserver с порогом «половина секции видна» не срабатывает
 *    на секциях выше экрана и мигает на коротких — считаем по положению верха.
 * 2. Последняя секция короче экрана и никогда не доходит до линии — у конца
 *    страницы активной становится она.
 * 3. Выше первой секции (первый экран) не активно ничего.
 * 4. Секции подгрузились/изменили высоту — позиции читаются на каждый кадр
 *    прокрутки заново, кеша нет.
 * @module kit/modules/scroll-spy
 */
import { createDisposer } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { headerOffset } from '../../core/smooth-scroll.js'
import { rafThrottle } from '../../core/timing.js'

const DEFAULTS = {
  /** Сдвиг линии срабатывания вниз от шапки, px. */
  offset: 16,
  /** Класс активной ссылки. */
  activeClass: 'is-active',
}

/** id секции из ссылки на якорь этой же страницы (иначе null). */
export function anchorId(link) {
  const href = link.getAttribute('href') ?? ''
  if (!href.includes('#')) return null
  const url = new URL(href, location.href)
  if (url.pathname !== location.pathname || url.origin !== location.origin) return null
  return decodeURIComponent(url.hash.slice(1)) || null
}

export default function scrollSpy(root, ctx = {}) {
  const options = readOptions(root, 'scroll-spy', DEFAULTS, ctx.options)
  const d = createDisposer()
  let activeId = null

  /** Пары «ссылка — секция» в порядке секций на странице. Читаем каждый раз: меню и секции могли подгрузиться. */
  const pairs = () =>
    Array.from(root.querySelectorAll('a[href*="#"]'))
      .map((link) => ({ link, section: document.getElementById(anchorId(link) ?? '') }))
      .filter((pair) => pair.section)

  function update() {
    const list = pairs()
    const line = headerOffset() + options.offset
    let current = null
    for (const pair of list) {
      // +1: после прокрутки к якорю верх секции бывает на долю пикселя ниже линии.
      if (pair.section.getBoundingClientRect().top <= line + 1) {
        if (!current || pair.section.getBoundingClientRect().top >= current.section.getBoundingClientRect().top)
          current = pair
      }
    }
    const scroller = document.documentElement
    const atBottom = Math.ceil(window.scrollY + window.innerHeight) >= scroller.scrollHeight
    if (atBottom && list.length && window.scrollY > 0) {
      current = list.reduce((last, pair) =>
        pair.section.getBoundingClientRect().top > last.section.getBoundingClientRect().top ? pair : last,
      )
    }
    const id = current?.section.id ?? null
    list.forEach(({ link, section }) => {
      const on = section.id === id
      link.classList.toggle(options.activeClass, on)
      if (on) link.setAttribute('aria-current', 'location')
      else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current')
    })
    if (id === activeId) return
    activeId = id
    root.dispatchEvent(new CustomEvent('scroll-spy:change', { bubbles: true, detail: { id } }))
    ctx.bus?.emit('scroll-spy:change', { el: root, id })
  }

  const onScroll = rafThrottle(update)
  d.listen(window, 'scroll', onScroll, { passive: true })
  d.listen(window, 'resize', onScroll)
  d.add(() => onScroll.cancel?.())
  d.add(() =>
    root.querySelectorAll(`.${options.activeClass}`).forEach((link) => {
      link.classList.remove(options.activeClass)
      link.removeAttribute('aria-current')
    }),
  )
  update()

  return {
    /** Пересчитать вручную (после смены разметки без прокрутки). */
    update,
    get active() {
      return activeId
    },
    destroy: d.dispose,
  }
}
