/**
 * Лайтбокс — раскрытие фото на весь экран по клику (плагин Flip).
 *
 * ─── Что делает ───────────────────────────────────────────────────────────
 * Клик по фото → оно плавно «вылетает» из своего места в центр
 * экрана и растёт до полного кадра, под ним появляется подпись с автором.
 * Закрытие (крестик, клик по фону, Esc) — фото так же плавно возвращается.
 *
 * ─── Как работает Flip (главная идея) ─────────────────────────────────────
 * Flip = First, Last, Invert, Play — приём, который позволяет анимировать
 * то, что обычно анимировать нельзя: перенос элемента в другой родитель.
 *
 *   1. First  — запоминаем, где и какого размера элемент СЕЙЧАС:
 *               `const state = Flip.getState(img)`
 *   2. Last   — мгновенно делаем любое изменение DOM: здесь переносим
 *               тот же самый <img> из ячейки сетки в окно лайтбокса.
 *   3. Invert — Flip сдвигает и растягивает элемент так, чтобы он ВЫГЛЯДЕЛ
 *               как в «First», хотя в DOM он уже на новом месте.
 *   4. Play   — и анимирует эти поправки к нулю: `Flip.from(state, …)`.
 *
 * Мы переносим именно тот же элемент, а не копию: не нужна вторая загрузка
 * картинки, и браузер не мигает.
 *
 * ─── Почему `scale: false` ───────────────────────────────────────────────
 * По умолчанию Flip анимирует transform: scale — это быстро, но картинка в
 * процессе «растягивается». С `scale: false` Flip меняет реальные width и
 * height, а `object-fit: cover` у картинки на каждом кадре пересчитывает
 * кадрирование: из обрезанного квадратика ячейки фото плавно «раскрывается»
 * до полного кадра без искажений.
 *
 * ─── Галерея ──────────────────────────────────────────────────────────────
 * Несколько фото в одном блоке листаются, не закрывая окно: стрелки на экране,
 * ← → на клавиатуре, свайп пальцем; счётчик «2 / 7». Закрытие возвращает
 * фото в ЕГО ячейку — ту, что открыта сейчас, а не ту, с которой начали.
 * Фото вне блока (другой data-module="lightbox") — другая галерея.
 *
 * ─── Большое фото ─────────────────────────────────────────────────────────
 * data-lightbox-src="/img/full.jpg" — в сетке лёгкая миниатюра, в окне
 * догружается полный размер. Раскрытие начинается сразу с миниатюры (ждать
 * загрузку не нужно), картинка «дорезчается» по готовности. После закрытия
 * в сетку возвращается миниатюра.
 *
 * ─── Два способа подключить ────────────────────────────────────────────────
 * 1. Модулем — все картинки с data-lightbox внутри блока открываются по клику:
 *      <div data-module="lightbox">
 *        <img src="…" alt="Закат" data-lightbox data-lightbox-title="Закат" data-lightbox-meta="2025">
 *      </div>
 * 2. Из JS (так делает infinite-gallery):
 *      const lightbox = createLightbox({ reduced })
 *      lightbox.open(img, { title, meta, credit })
 *      lightbox.open(img, info, { group: [img1, img2, …], getInfo: (img) => ({ title }) })  ← с листанием
 *
 * Пока окно открыто, прокрутка страницы заблокирована (core/scroll-lock),
 * фокус — на кнопке закрытия, Esc и клик по фону закрывают, фокус возвращается.
 * Стили — kit/scss/components/_effects.scss (.lightbox*).
 * @module kit/modules/lightbox
 */
import { gsap } from '../../core/gsap.js'
import { Flip } from 'gsap/Flip'
import { delegate } from '../../core/dom.js'
import { lockScroll, unlockScroll } from '../../core/scroll-lock.js'
import { t } from '../../core/i18n.js'

gsap.registerPlugin(Flip)

/** Текст для вставки в HTML: < > & " ' — безопасно (подпись может прийти из CMS). */
const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** Длительность раскрытия, секунды. */
export const OPEN_DURATION = 0.85
/** Длительность закрытия, секунды (чуть быстрее — закрытие не должно «тянуть»). */
export const CLOSE_DURATION = 0.6

/**
 * Создать лайтбокс. Разметка окна добавляется в <body> один раз.
 *
 * Окно лежит в <body>, а не внутри секции: у предков секции может быть
 * transform (анимации появления), а внутри transform-родителя
 * `position: fixed` перестаёт фиксироваться к экрану.
 *
 * @param {{ reduced?: boolean, onOpen?: () => void, onClose?: () => void }} [options]
 *   `onOpen` / `onClose` — например, остановить дрейф галереи.
 */
export function createLightbox({ reduced = false, onOpen, onClose } = {}) {
  const root = document.createElement('div')

  root.className = 'lightbox'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', t('kit.lightbox.label'))
  root.hidden = true
  root.innerHTML = `
    <div class="lightbox__backdrop" data-lightbox-close></div>
    <figure class="lightbox__figure">
      <div class="lightbox__frame" data-lightbox-frame></div>
      <figcaption class="lightbox__caption" data-lightbox-caption></figcaption>
    </figure>
    <button type="button" class="lightbox__nav lightbox__nav--prev" data-lightbox-prev aria-label="${t('kit.slider.prev')}" hidden>‹</button>
    <button type="button" class="lightbox__nav lightbox__nav--next" data-lightbox-next aria-label="${t('kit.slider.next')}" hidden>›</button>
    <p class="lightbox__counter" data-lightbox-counter aria-live="polite" hidden></p>
    <button type="button" class="lightbox__close" data-lightbox-close aria-label="${t('kit.dialog.close')}">✕</button>`
  document.body.appendChild(root)

  /** @type {HTMLElement} */
  const frame = root.querySelector('[data-lightbox-frame]')
  const caption = root.querySelector('[data-lightbox-caption]')
  const backdrop = root.querySelector('.lightbox__backdrop')
  /** @type {HTMLButtonElement} */
  const closeButton = root.querySelector('.lightbox__close')

  /** @type {HTMLElement} */
  const counter = root.querySelector('[data-lightbox-counter]')
  const navButtons = /** @type {HTMLElement[]} */ (Array.from(root.querySelectorAll('.lightbox__nav')))

  /** Что сейчас открыто: картинка и откуда её взяли (чтобы вернуть на место). */
  let current = null
  /** Галерея: картинки, между которыми можно листать, и как получить подпись каждой. */
  let group = /** @type {HTMLImageElement[]} */ ([])
  let getInfo = /** @type {((img: HTMLImageElement) => object) | null} */ (null)
  /** Идёт анимация — новые клики игнорируем, иначе состояния перепутаются. */
  let busy = false

  const duration = (value) => (reduced ? 0 : value)

  /** Запомнить, куда вернуть картинку, и что в ней подменим (полный размер). */
  const remember = (img, focus) => ({
    img,
    parent: img.parentNode,
    next: img.nextSibling,
    focus,
    thumb: { src: img.getAttribute('src'), srcset: img.getAttribute('srcset'), sizes: img.getAttribute('sizes') },
  })

  /** Пропорции окна, подпись, счётчик — под картинку. */
  function describe(img, info) {
    // Пропорции окна = пропорции снимка: тогда object-fit: cover внутри окна
    // показывает кадр целиком, без обрезки.
    const w = img.naturalWidth || Number(img.getAttribute('width')) || 4
    const h = img.naturalHeight || Number(img.getAttribute('height')) || 3

    // Число пропорций уходит в CSS-переменную: стили сами вписывают окно в экран
    // и по ширине, и по высоте (см. .lightbox__frame в src/styles/effects.css).
    frame.style.setProperty('--ar', (w / h).toFixed(4))
    caption.innerHTML = `
      <span class="lightbox__title">${escapeHtml(info.title ?? img.alt ?? '')}</span>
      <span class="lightbox__meta">${escapeHtml(info.meta ?? '')}</span>
      <span class="lightbox__credit">${escapeHtml(info.credit ?? '')}</span>`
    const many = group.length > 1
    navButtons.forEach((button) => (button.hidden = !many))
    counter.hidden = !many
    if (many) counter.textContent = `${group.indexOf(img) + 1} / ${group.length}`
  }

  /** Догрузить полный размер (data-lightbox-src) и подменить, если это фото ещё открыто. */
  function upgrade(img) {
    const full = img.dataset.lightboxSrc
    if (!full || img.getAttribute('src') === full) return
    const loader = new Image()
    loader.onload = () => {
      if (current?.img !== img) return
      img.removeAttribute('srcset')
      img.removeAttribute('sizes')
      img.src = full
    }
    loader.src = full
  }

  /** Вернуть миниатюру, инлайн-стили Flip убрать — картинка снова подчиняется CSS карточки. */
  function restore({ img, thumb }) {
    for (const [name, value] of Object.entries(thumb)) {
      if (value === null) img.removeAttribute(name)
      else if (img.getAttribute(name) !== value) img.setAttribute(name, value)
    }
    gsap.set(img, { clearProps: 'all' })
  }

  /**
   * Открыть картинку.
   * @param {HTMLImageElement} img Картинка из любой карточки (переедет в окно и обратно).
   * @param {{ title?: string, meta?: string, credit?: string }} [info] Подпись.
   * @param {{ group?: HTMLImageElement[], getInfo?: (img: HTMLImageElement) => object }} [gallery]
   *   group — картинки, между которыми можно листать; getInfo — подпись для каждой.
   */
  function open(img, info = {}, gallery = {}) {
    if (busy || current || !img) return
    busy = true
    group = gallery.group?.includes(img) ? gallery.group : []
    getInfo = gallery.getInfo ?? null

    current = remember(img, document.activeElement)
    describe(img, info)

    // 1. First: где картинка сейчас (в ячейке сетки).
    const state = Flip.getState(img)

    // 2. Last: показываем окно и переносим ТУ ЖЕ картинку в него.
    root.hidden = false
    frame.appendChild(img)
    lockScroll()
    onOpen?.()

    // 3–4. Invert + Play: Flip анимирует путь из ячейки в окно.
    Flip.from(state, {
      duration: duration(OPEN_DURATION),
      ease: 'expo.inOut', // мягкий старт, быстрый пролёт, мягкая посадка
      scale: false, // менять реальные width/height → кадрирование пересчитывается плавно
      absolute: true, // на время анимации вынуть из потока, чтобы соседи не прыгали
      onComplete: () => {
        busy = false
        closeButton.focus({ preventScroll: true })
      },
    })
    upgrade(img)
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: duration(0.5) })
    gsap.fromTo(caption, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: duration(0.5), delay: duration(0.35) })
  }

  /**
   * Листать галерею: +1 — следующее фото, −1 — предыдущее (по кругу).
   * Текущее фото возвращается в свою ячейку, следующее переезжает в окно.
   * Без Flip: фото меняются на месте с лёгким проявлением — полёт через
   * весь экран при каждом листании утомляет.
   */
  function go(delta) {
    if (busy || !current || group.length < 2) return
    const index = group.indexOf(current.img)
    const img = group[(index + delta + group.length) % group.length]
    if (!img || img === current.img) return
    const { focus } = current
    current.parent.insertBefore(current.img, current.next)
    restore(current)
    current = remember(img, focus)
    describe(img, getInfo?.(img) ?? {})
    frame.appendChild(img)
    gsap.fromTo(img, { opacity: 0 }, { opacity: 1, duration: duration(0.3), clearProps: 'opacity' })
    upgrade(img)
  }

  /** Закрыть: вернуть картинку на её место в карточке. */
  function close() {
    if (busy || !current) return
    busy = true

    const closing = current
    const { img, parent, next, focus } = closing
    const state = Flip.getState(img)

    // Возвращаем картинку туда, где она была, и анимируем обратный путь.
    parent.insertBefore(img, next)
    Flip.from(state, {
      duration: duration(CLOSE_DURATION),
      ease: 'power3.inOut',
      scale: false,
      absolute: true,
      onComplete: () => {
        // Flip оставляет на время анимации инлайн-стили — убираем их,
        // чтобы картинка снова подчинялась CSS карточки.
        restore(closing)
        root.hidden = true
        current = null
        group = []
        busy = false
        unlockScroll()
        onClose?.()
        focus?.focus?.({ preventScroll: true })
      },
    })
    gsap.to(backdrop, { opacity: 0, duration: duration(0.4) })
    gsap.to(caption, { opacity: 0, duration: duration(0.2) })
  }

  // Закрыть по клику на фон / крестик и по Esc.
  const onClick = (event) => {
    if (event.target.closest('[data-lightbox-prev]')) go(-1)
    else if (event.target.closest('[data-lightbox-next]')) go(1)
    else if (event.target.closest('[data-lightbox-close]')) close()
  }
  const onKey = (event) => {
    if (!current) return
    if (event.key === 'Escape') close()
    else if (event.key === 'ArrowLeft') go(-1)
    else if (event.key === 'ArrowRight') go(1)
  }
  // Свайп: палец прошёл по горизонтали больше 50 px и заметно больше, чем по вертикали.
  let swipe = null
  const onDown = (event) => {
    swipe = { x: event.clientX, y: event.clientY }
  }
  const onUp = (event) => {
    if (!swipe) return
    const dx = event.clientX - swipe.x
    const dy = event.clientY - swipe.y
    swipe = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
  }

  root.addEventListener('click', onClick)
  window.addEventListener('keydown', onKey)
  frame.addEventListener('pointerdown', onDown)
  frame.addEventListener('pointerup', onUp)
  frame.addEventListener('pointercancel', () => (swipe = null))

  return {
    open,
    close,
    /** Следующее / предыдущее фото галереи. */
    next: () => go(1),
    prev: () => go(-1),
    /** Картинка, открытая сейчас. */
    get current() {
      return current?.img ?? null
    },
    get isOpen() {
      return !!current
    },
    /** Убрать окно со страницы (если открыто — вернуть картинку на место без анимации). */
    destroy() {
      if (current) {
        current.parent.insertBefore(current.img, current.next)
        restore(current)
        unlockScroll()
      }
      root.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
      root.remove()
    },
  }
}

/** Модуль: картинки с data-lightbox внутри блока открываются по клику. */
export default function lightboxModule(root, ctx = {}) {
  const lightbox = createLightbox({ reduced: ctx.reduced })
  root.querySelectorAll('img[data-lightbox]').forEach((img) => {
    img.tabIndex = 0
    img.setAttribute('role', 'button')
    img.style.cursor = 'zoom-in'
  })
  const info = (img) => ({
    title: img.dataset.lightboxTitle ?? img.alt,
    meta: img.dataset.lightboxMeta ?? '',
    credit: img.dataset.lightboxCredit ?? '',
  })
  // Галерея — все фото блока на момент клика (карточки могли подгрузиться позже).
  const show = (img) =>
    lightbox.open(img, info(img), { group: Array.from(root.querySelectorAll('img[data-lightbox]')), getInfo: info })
  const offClick = delegate(root, 'click', 'img[data-lightbox]', (_, img) => show(img))
  const offKey = delegate(root, 'keydown', 'img[data-lightbox]', (event, img) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      show(img)
    }
  })
  return {
    lightbox,
    destroy() {
      offClick()
      offKey()
      lightbox.destroy()
    },
  }
}
