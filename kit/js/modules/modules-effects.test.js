/**
 * Тесты модулей-эффектов. В jsdom нет вёрстки и WebGL — проверяем логику,
 * разметку, классы и уборку; движение — в браузере.
 */
import { describe, expect, it, vi } from 'vitest'
import flipFilter, { keepRoomFor, matchesFilter } from './flip-filter/index.js'
import { createLightbox } from './lightbox/index.js'
import lightboxModule from './lightbox/index.js'
import hscroll, { travelDistance } from './hscroll/index.js'
import stackCards, { stackTop, stickyBlocker } from './stack-cards/index.js'
import scrambleText from './scramble-text/index.js'
import drawSvg from './draw-svg/index.js'
import scrollProgress from './scroll-progress/index.js'
import cursor from './cursor/index.js'
import infiniteGallery from './infinite-gallery/index.js'
import infiniteSlider from './infinite-slider/index.js'
import { gsap } from '../core/gsap.js'
import { isScrollLocked, resetScrollLock } from '../core/scroll-lock.js'
import { createCtx, html } from '@test/helpers.js'

const motion = (extra) => createCtx({ reduced: false, ...extra })

describe('flip-filter', () => {
  it('matchesFilter (несколько категорий), keepRoomFor', () => {
    expect(matchesFilter('site landing', 'landing')).toBe(true)
    expect(matchesFilter('site', 'shop')).toBe(false)
    expect(matchesFilter('', 'all')).toBe(true)
    expect(keepRoomFor(1000, 400, 2000, 1900)).toBe(900)
    expect(keepRoomFor(1000, 400, 2000, 0)).toBe(400)
  })

  it('фильтрует карточки, пишет фильтр в адрес и читает его при загрузке', () => {
    const markup = `<section><div><button data-filter="all">Все</button><button data-filter="site">Сайты</button></div>
      <div><article data-flip-item data-category="site">1</article><article data-flip-item data-category="shop">2</article></div></section>`
    const api = flipFilter(html(markup), createCtx())
    api.apply('site')
    expect(location.search).toBe('?filter=site')
    expect(document.querySelectorAll('.is-hidden')).toHaveLength(1)
    expect(document.querySelector('[data-filter=site]').getAttribute('aria-pressed')).toBe('true')
    api.destroy()
    document.body.innerHTML = ''
    const again = flipFilter(html(markup), createCtx())
    expect(again.filter).toBe('site')
    expect(document.querySelector('[data-category=shop]').classList.contains('is-hidden')).toBe(true)
    expect(() => flipFilter(html('<div></div>'), createCtx())).toThrow(/data-filter/)
  })
})

describe('lightbox', () => {
  // Анимация длиной 0 завершается «на следующем кадре», но под нагрузкой одного кадра
  // бывает мало — прокручиваем, пока окно не закроется.
  const settle = (lightbox) => {
    for (let i = 0; i < 10 && lightbox.isOpen; i += 1) gsap.ticker.tick()
  }

  it('открывает картинку в окне, блокирует прокрутку, закрывается по Esc и возвращает картинку', () => {
    resetScrollLock()
    const card = html('<figure><img src="a.jpg" alt="Закат" width="400" height="300"></figure>')
    const img = card.querySelector('img')
    const lightbox = createLightbox({ reduced: true })
    lightbox.open(img, { title: 'Закат <script>', meta: '2025' })
    expect(lightbox.isOpen).toBe(true)
    expect(document.querySelector('.lightbox__frame').contains(img)).toBe(true)
    expect(document.querySelector('.lightbox__title').textContent).toBe('Закат <script>') // экранировано
    expect(isScrollLocked()).toBe(true)
    gsap.ticker.tick() // анимация длиной 0 всё равно завершается на следующем кадре
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    gsap.ticker.tick()
    expect(card.contains(img)).toBe(true)
    expect(isScrollLocked()).toBe(false)
    lightbox.destroy()
    expect(document.querySelector('.lightbox')).toBeNull()
  })

  it('модуль: клик и Enter по img[data-lightbox]', () => {
    const root = html('<div><img src="a.jpg" alt="A" data-lightbox data-lightbox-title="Альфа"></div>')
    const api = lightboxModule(root, createCtx())
    const img = root.querySelector('img')
    expect(img.getAttribute('role')).toBe('button')
    img.click()
    expect(api.lightbox.isOpen).toBe(true)
    expect(document.querySelector('.lightbox__title').textContent).toBe('Альфа')
    api.destroy()
    resetScrollLock()
  })

  it('галерея: стрелки, клавиши и свайп листают по кругу; закрытие возвращает текущее фото в его ячейку', () => {
    resetScrollLock()
    const root = html(`<div>
      <figure><img src="a.jpg" alt="A" data-lightbox></figure>
      <figure><img src="b.jpg" alt="B" data-lightbox data-lightbox-title="Бета"></figure>
      <figure><img src="c.jpg" alt="C" data-lightbox></figure></div>`)
    const api = lightboxModule(root, createCtx({ reduced: true }))
    const [a, b, c] = root.querySelectorAll('img')
    const [cellA, cellB] = root.querySelectorAll('figure')
    const frame = () => document.querySelector('.lightbox__frame')
    a.click()
    gsap.ticker.tick()
    expect(document.querySelector('.lightbox__counter').textContent).toBe('1 / 3')
    expect(document.querySelector('.lightbox__nav--next').hidden).toBe(false)

    document.querySelector('[data-lightbox-next]').click()
    expect(api.lightbox.current).toBe(b)
    expect(frame().contains(b)).toBe(true)
    expect(cellA.contains(a)).toBe(true) // предыдущее фото вернулось на место
    expect(document.querySelector('.lightbox__title').textContent).toBe('Бета')
    expect(document.querySelector('.lightbox__counter').textContent).toBe('2 / 3')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(api.lightbox.current).toBe(a) // по кругу
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(api.lightbox.current).toBe(c)

    // Свайп влево → следующее; вертикальный жест не листает.
    const swipe = (from, to) => {
      frame().dispatchEvent(new MouseEvent('pointerdown', { clientX: from[0], clientY: from[1] }))
      frame().dispatchEvent(new MouseEvent('pointerup', { clientX: to[0], clientY: to[1] }))
    }
    swipe([300, 100], [100, 110])
    expect(api.lightbox.current).toBe(a)
    swipe([300, 100], [240, 400])
    expect(api.lightbox.current).toBe(a)

    api.lightbox.next()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    settle(api.lightbox)
    expect(cellB.contains(b)).toBe(true)
    expect(api.lightbox.isOpen).toBe(false)
    api.destroy()
    resetScrollLock()
  })

  it('одно фото — без стрелок и счётчика; data-lightbox-src догружает полный размер и возвращает миниатюру', () => {
    resetScrollLock()
    const loaders = []
    vi.stubGlobal(
      'Image',
      class {
        constructor() {
          loaders.push(this)
        }
      },
    )
    const root = html(
      '<div><img src="thumb.jpg" srcset="thumb.jpg 1x" alt="A" data-lightbox data-lightbox-src="/full.jpg"></div>',
    )
    const api = lightboxModule(root, createCtx({ reduced: true }))
    const img = root.querySelector('img')
    img.click()
    gsap.ticker.tick()
    expect(document.querySelector('.lightbox__nav--next').hidden).toBe(true)
    expect(document.querySelector('.lightbox__counter').hidden).toBe(true)
    expect(loaders[0].src).toBe('/full.jpg')
    expect(img.getAttribute('src')).toBe('thumb.jpg') // до загрузки — миниатюра
    loaders[0].onload()
    expect(img.getAttribute('src')).toBe('/full.jpg')
    expect(img.hasAttribute('srcset')).toBe(false)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    settle(api.lightbox)
    expect(img.getAttribute('src')).toBe('thumb.jpg')
    expect(img.getAttribute('srcset')).toBe('thumb.jpg 1x')
    api.destroy()
    vi.unstubAllGlobals()
    resetScrollLock()
  })
})

describe('hscroll, stack-cards, draw-svg, scroll-progress', () => {
  it('hscroll: travelDistance, ошибка без ленты, включение и уборка', () => {
    expect(travelDistance(3000, 1200)).toBe(1800)
    expect(travelDistance(800, 1200)).toBe(0)
    expect(() => hscroll(html('<section></section>'), createCtx())).toThrow(/data-hscroll-track/)
    setMedia({ all: true }) // в jsdom matchMedia — заглушка; в браузере 'all' совпадает всегда
    const el = html(
      '<section><div data-hscroll-pin><div data-hscroll-track><article data-hscroll-card></article></div></div></section>',
    )
    const api = hscroll(el, motion())
    expect(el.classList.contains('is-active')).toBe(true)
    api.destroy()
    expect(el.classList.contains('is-active')).toBe(false)
  })

  it('stack-cards: индексы карточек и предупреждение про overflow', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrap = html(
      '<div style="overflow: hidden"><div><div data-stack-card></div><div data-stack-card></div></div></div>',
    )
    expect(stickyBlocker(wrap.firstElementChild)).toBe(wrap)
    const api = stackCards(wrap.firstElementChild, motion())
    expect(wrap.querySelectorAll('[data-stack-card]')[1].style.getPropertyValue('--stack-index')).toBe('1')
    expect(warn).toHaveBeenCalled()
    api.destroy()
  })

  it('stack-cards: помещается — по центру под шапкой, выше экрана — null (не липнуть)', () => {
    // Окно 800, шапка 64, карточка 400, отступы 16: запас 304 → по центру 64 + 16 + 152.
    expect(stackTop(400, 800, 64, 0, 16)).toBe(232)
    // «Корешок» стопки опускает карточку…
    expect(stackTop(400, 800, 64, 24, 16)).toBe(256)
    // …но не дальше запаса снизу: 12-я карточка (сдвиг 132) всё ещё помещается целиком.
    expect(stackTop(400, 800, 64, 500, 16)).toBe(64 + 16 + 304)
    // Карточка 726 на iPhone (окно 664) — не помещается.
    expect(stackTop(726, 664, 64, 0, 16)).toBeNull()
  })

  it('stack-cards: слой затемнения во всех карточках, кроме последней; уборка', () => {
    const root = html('<div><div data-stack-card></div><div data-stack-card></div><div data-stack-card></div></div>')
    const api = stackCards(root, motion())
    expect(root.querySelectorAll('.stack-cards__shade')).toHaveLength(2)
    expect(root.lastElementChild.querySelector('.stack-cards__shade')).toBeNull()
    api.destroy()
    expect(root.querySelectorAll('.stack-cards__shade')).toHaveLength(0)
  })

  it('draw-svg и scroll-progress', () => {
    const svg = html('<svg><path d="M0 0L10 10" data-draw /></svg>')
    expect(drawSvg(svg, createCtx())).toBeUndefined() // reduced — без анимации
    const api = drawSvg(svg, motion())
    api.destroy()
    const bar = html('<div></div>')
    const progress = scrollProgress(bar, createCtx())
    expect(bar.getAttribute('role')).toBe('progressbar')
    progress.destroy()
    expect(() => scrollProgress(html('<div data-scroll-progress-target="#nope"></div>'), createCtx())).toThrow(/#nope/)
  })
})

describe('scramble-text и cursor', () => {
  it('scramble-text: aria-label с итоговым текстом, destroy возвращает текст', () => {
    const el = html('<h2>Кейсы</h2>')
    const api = scrambleText(el, motion())
    expect(el.getAttribute('aria-label')).toBe('Кейсы')
    triggerIntersect(el, true)
    api.destroy()
    expect(el.textContent).toBe('Кейсы')
  })

  it('cursor: без мыши не запускается; с мышью — подсказка из data-cursor', () => {
    const el = html('<div class="cursor"></div>')
    expect(cursor(el, motion())).toBeUndefined()
    expect(el.hidden).toBe(true)
    setMedia({ '(hover: hover) and (pointer: fine)': true })
    el.hidden = false
    const api = cursor(el, motion())
    expect(document.documentElement.classList.contains('has-cursor')).toBe(true)
    const link = html('<a href="#" data-cursor="Смотреть">x</a>')
    link.dispatchEvent(new Event('pointerover', { bubbles: true }))
    expect(el.querySelector('.cursor__label').textContent).toBe('Смотреть')
    expect(el.classList.contains('has-label')).toBe(true)
    api.destroy()
    expect(document.documentElement.classList.contains('has-cursor')).toBe(false)
  })
})

describe('infinite-gallery и infinite-slider', () => {
  it('галерея: включается, предупреждает о неполном ряде, убирается', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const items = Array.from({ length: 5 }, () => '<figure data-gallery-item><img src="a.jpg" alt=""></figure>').join(
      '',
    )
    const el = html(
      `<section style="--gallery-columns: 3"><div data-gallery-pin><div data-gallery-viewport><div data-gallery-grid>${items}</div></div></div></section>`,
    )
    const api = infiniteGallery(el, motion({ options: { pin: false } }))
    expect(el.classList.contains('is-active')).toBe(true)
    expect(warn.mock.calls[0][0]).toContain('5 ячеек')
    api.moveBy(100, 0)
    api.destroy()
    expect(el.classList.contains('is-active')).toBe(false)
    expect(() => infiniteGallery(html('<section></section>'), createCtx())).toThrow(/data-gallery-viewport/)
  })

  it('слайдер: меньше 3 слайдов — предупреждение; иначе подпись, счётчик, кнопки', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(
      await infiniteSlider(
        html('<div><div data-infinite-viewport><div data-infinite-slide></div></div></div>'),
        createCtx(),
      ),
    ).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    const slides = ['А', 'Б', 'В'].map((t) => `<figure data-infinite-slide data-title="${t}"></figure>`).join('')
    const el =
      html(`<div><div data-infinite-viewport>${slides}</div><p data-infinite-title></p><p data-infinite-counter></p>
      <button data-infinite-next></button></div>`)
    const api = await infiniteSlider(el, createCtx())
    expect(el.querySelector('[data-infinite-counter]').textContent).toBe('01 / 03')
    expect(el.querySelector('[data-infinite-title]').textContent).toBe('А')
    expect(el.querySelector('[data-infinite-viewport]').tabIndex).toBe(0)
    el.querySelector('[data-infinite-next]').click()
    expect(api.index).toBe(1)
    api.destroy()
    expect(el.classList.contains('is-ready')).toBe(false)
  })
})
