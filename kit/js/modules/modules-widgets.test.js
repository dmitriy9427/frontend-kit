/**
 * Тесты «бытовых» модулей сайта: выпадающая панель, подсветка меню, обратный
 * отсчёт, копирование, «поделиться», до/после, «показать ещё», видео, карта.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import popover from './popover/index.js'
import scrollSpy, { anchorId } from './scroll-spy/index.js'
import countdown, { splitTime } from './countdown/index.js'
import copy, { copyText, textFor } from './copy/index.js'
import share, { shareUrl } from './share/index.js'
import compare from './compare/index.js'
import loadMore from './load-more/index.js'
import embed, { embedUrl } from './embed/index.js'
import map, { readMarkers } from './map/index.js'
import { writeConsent } from '../core/consent.js'
import { createCtx, html, key, tick, until } from '@test/helpers.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
})

describe('popover', () => {
  const MENU = `<div>
    <button data-popover-target="m">Профиль</button>
    <div id="m" role="menu" hidden>
      <a role="menuitem" href="#a">Заказы</a>
      <button role="menuitem" type="button" disabled>Недоступно</button>
      <a role="menuitem" href="#b">Выйти</a>
    </div>
    <button id="other">Другая кнопка</button>
  </div>`
  const setup = (markup = MENU, options) => {
    const root = html(markup)
    const button = root.querySelector('[data-popover-target]')
    const panel = root.querySelector('[id]')
    const api = popover(button, createCtx({ options }))
    return { root, button, panel, api }
  }

  it('aria, открытие кликом, Esc закрывает и возвращает фокус', () => {
    const { button, panel, api } = setup()
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(button.getAttribute('aria-controls')).toBe('m')
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(panel.getAttribute('aria-labelledby')).toBe(button.id)
    const events = []
    button.addEventListener('popover:open', () => events.push('open'))
    button.addEventListener('popover:close', () => events.push('close'))
    button.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    expect(api.isOpen).toBe(true)
    expect(panel.hidden).toBe(false)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    panel.querySelector('a').focus()
    key(document.body, 'Escape')
    expect(api.isOpen).toBe(false)
    expect(panel.hidden).toBe(true)
    expect(document.activeElement).toBe(button)
    expect(events).toEqual(['open', 'close'])
    api.destroy()
  })

  it('меню: ↓ открывает с фокусом на первом пункте, стрелки ходят по кругу мимо выключенных', () => {
    const { button, panel, api } = setup()
    const [first, last] = panel.querySelectorAll('a')
    key(button, 'ArrowDown')
    expect(document.activeElement).toBe(first)
    key(first, 'ArrowDown')
    expect(document.activeElement).toBe(last)
    key(last, 'ArrowDown')
    expect(document.activeElement).toBe(first)
    key(first, 'End')
    expect(document.activeElement).toBe(last)
    api.close()
    button.click() // «клик» с клавиатуры (detail = 0) — фокус сразу в меню
    expect(document.activeElement).toBe(first)
    api.destroy()
  })

  it('закрывается кликом мимо, выбором пункта и уходом фокуса', () => {
    const { root, button, panel, api } = setup()
    api.open()
    panel.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(api.isOpen).toBe(true) // клик внутри панели не закрывает
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(api.isOpen).toBe(false)
    api.open()
    panel.querySelector('a').click()
    expect(api.isOpen).toBe(false)
    api.open()
    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: root.querySelector('#other') }))
    expect(api.isOpen).toBe(false)
    api.destroy()
  })

  it('обычная панель: клики внутри не закрывают, [data-popover-close] закрывает; без панели — ошибка', () => {
    const { panel, api } = setup(
      `<div><button data-popover-target="f">Фильтр</button>
       <div id="f" hidden><button type="button" id="apply">Применить</button><button data-popover-close>×</button></div></div>`,
    )
    api.open()
    panel.querySelector('#apply').click()
    expect(api.isOpen).toBe(true)
    panel.querySelector('[data-popover-close]').click()
    expect(api.isOpen).toBe(false)
    api.destroy()
    expect(() => popover(html('<button data-popover-target="nope"></button>'))).toThrow(/nope/)
  })
})

describe('scroll-spy', () => {
  const rect = (el, top) => (el.getBoundingClientRect = () => ({ top, bottom: top + 500, height: 500 }))

  it('anchorId: только якоря этой страницы', () => {
    expect(anchorId(html('<a href="#about">a</a>'))).toBe('about')
    expect(anchorId(html('<a href="/#price">a</a>'))).toBe('price')
    expect(anchorId(html('<a href="/blog#top">a</a>'))).toBe(null)
    expect(anchorId(html('<a href="/blog">a</a>'))).toBe(null)
  })

  it('активна последняя секция выше линии; выше первой — ничего; событие при смене', async () => {
    const nav = html('<nav><a href="#a">A</a><a href="#b">B</a><a href="/blog">Блог</a></nav>')
    const a = html('<section id="a"></section>')
    const b = html('<section id="b"></section>')
    rect(a, 400)
    rect(b, 900)
    const ctx = createCtx()
    const ids = []
    ctx.bus.on('scroll-spy:change', (payload) => ids.push(payload.id))
    const api = scrollSpy(nav, ctx)
    const [linkA, linkB, blog] = nav.querySelectorAll('a')
    expect(api.active).toBe(null)
    expect(linkA.hasAttribute('aria-current')).toBe(false)

    rect(a, -100)
    rect(b, 400)
    api.update()
    expect(api.active).toBe('a')
    expect(linkA.getAttribute('aria-current')).toBe('location')
    expect(linkA.classList.contains('is-active')).toBe(true)

    rect(a, -600)
    rect(b, 10)
    window.dispatchEvent(new Event('scroll'))
    await until(() => api.active === 'b')
    expect(linkA.hasAttribute('aria-current')).toBe(false)
    expect(linkB.classList.contains('is-active')).toBe(true)
    expect(blog.classList.contains('is-active')).toBe(false)
    expect(ids).toEqual(['a', 'b'])
    api.destroy()
    expect(linkB.classList.contains('is-active')).toBe(false)
  })
})

describe('countdown', () => {
  it('splitTime: части без старших единиц переходят в младшие', () => {
    const ms = ((2 * 24 + 1) * 3600 + 5 * 60 + 9) * 1000
    expect(splitTime(ms)).toEqual({ days: 2, hours: 1, minutes: 5, seconds: 9 })
    expect(splitTime(ms, ['hours', 'minutes', 'seconds'])).toEqual({ hours: 49, minutes: 5, seconds: 9 })
    expect(splitTime(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })

  it('считает до даты, склоняет подписи, по окончании — событие и блок «завершено»', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const el = html(`<div data-countdown-to="2026-01-02T01:00:02Z">
      <b data-countdown-days></b><i data-countdown-label="days"></i>
      <b data-countdown-hours></b><i data-countdown-label="hours"></i>
      <b data-countdown-seconds></b><i data-countdown-label="seconds"></i>
      <p data-countdown-ended hidden>Всё</p></div>`)
    const ended = vi.fn()
    el.addEventListener('countdown:end', ended)
    const api = countdown(el, createCtx())
    const text = (unit) => el.querySelector(`[data-countdown-${unit}]`).textContent
    const label = (unit) => el.querySelector(`[data-countdown-label="${unit}"]`).textContent
    expect(el.getAttribute('role')).toBe('timer')
    expect([text('days'), text('hours'), text('seconds')]).toEqual(['01', '01', '02'])
    expect([label('days'), label('hours'), label('seconds')]).toEqual(['день', 'час', 'секунды'])
    vi.advanceTimersByTime(1000)
    expect(text('seconds')).toBe('01')
    expect(label('seconds')).toBe('секунда')
    vi.setSystemTime(new Date('2026-01-03T00:00:00Z'))
    vi.advanceTimersByTime(1000)
    expect(text('seconds')).toBe('00')
    expect(api.ended).toBe(true)
    expect(el.querySelector('[data-countdown-ended]').hidden).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(ended).toHaveBeenCalledTimes(1)
    api.destroy()
  })

  it('личный таймер запоминает срок; дата без пояса — предупреждение, мусор — ошибка', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const markup = '<div data-countdown-minutes="15" data-countdown-key="promo"><b data-countdown-minutes></b></div>'
    const first = countdown(html(markup))
    expect(first.left).toBe(15 * 60_000)
    first.destroy()
    vi.setSystemTime(new Date('2026-01-01T00:05:00Z'))
    const second = countdown(html(markup))
    expect(second.left).toBe(10 * 60_000) // перезагрузка не сбросила
    second.destroy()

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    countdown(html('<div data-countdown-to="2026-12-31T23:59:59"></div>')).destroy()
    expect(warn.mock.calls[0][0]).toMatch(/часового пояса/)
    expect(() => countdown(html('<div data-countdown-to="завтра"></div>'))).toThrow(/завтра/)
  })
})

describe('copy и share', () => {
  const stubClipboard = (writeText) =>
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: writeText ? { writeText } : undefined })

  it('textFor: атрибут, элемент-источник, адрес страницы', () => {
    html('<input id="inn" value=" 7707083893 ">')
    html('<code id="promo"> SALE </code>')
    expect(textFor(html('<button data-copy="PROMO">c</button>'))).toBe('PROMO')
    expect(textFor(html('<button data-copy data-copy-target="#inn">c</button>'))).toBe('7707083893')
    expect(textFor(html('<button data-copy data-copy-target="#promo">c</button>'))).toBe('SALE')
    expect(textFor(html('<button data-copy>c</button>'))).toBe(location.href)
  })

  it('копирует, показывает уведомление, ставит is-copied и шлёт событие', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    const root = html('<div><button data-copy="PROMO" data-copy-message="Промокод скопирован"><i>c</i></button></div>')
    const ctx = createCtx()
    const done = []
    ctx.bus.on('copy:done', (payload) => done.push(payload.text))
    const api = copy(root, ctx)
    root.querySelector('i').click()
    await tick()
    expect(writeText).toHaveBeenCalledWith('PROMO')
    expect(root.querySelector('button').classList.contains('is-copied')).toBe(true)
    expect(document.querySelector('.toast--success').textContent).toContain('Промокод скопирован')
    expect(done).toEqual(['PROMO'])
    api.destroy()
  })

  it('буфер недоступен — запасной путь; не вышло — уведомление об ошибке', async () => {
    stubClipboard(null)
    document.execCommand = vi.fn(() => true)
    expect(await copyText('x')).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull() // временное поле убрано

    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')))
    document.execCommand = vi.fn(() => false)
    const root = html('<div><button data-copy="x">c</button></div>')
    const api = copy(root, createCtx())
    root.querySelector('button').click()
    await tick()
    expect(document.querySelector('.toast--error')).toBeTruthy()
    expect(root.querySelector('button').classList.contains('is-copied')).toBe(false)
    api.destroy()
    delete document.execCommand
  })

  it('share: ссылки на сети, канонический адрес, системное окно и запасное копирование', async () => {
    expect(shareUrl('telegram', { url: 'https://a.ru/?x=1', title: 'Привет' })).toBe(
      'https://t.me/share/url?url=https%3A%2F%2Fa.ru%2F%3Fx%3D1&text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82',
    )
    expect(shareUrl('myspace', { url: 'https://a.ru' })).toBe(null)
    document.head.insertAdjacentHTML('beforeend', '<link rel="canonical" href="https://site.ru/page">')
    const root = html(`<div data-share-title="Скидка">
      <button data-share-native>Поделиться</button>
      <a data-share-to="vk">VK</a><a data-share-to="email">Почта</a></div>`)
    const api = share(root, createCtx())
    const [vk, email] = root.querySelectorAll('a')
    expect(vk.href).toBe(
      'https://vk.com/share.php?url=https%3A%2F%2Fsite.ru%2Fpage&title=%D0%A1%D0%BA%D0%B8%D0%B4%D0%BA%D0%B0',
    )
    expect(vk.target).toBe('_blank')
    expect(vk.rel).toContain('noopener')
    expect(email.href.startsWith('mailto:?subject=')).toBe(true)
    expect(email.target).toBe('')

    const nativeShare = vi.fn().mockResolvedValue(undefined)
    navigator.share = nativeShare
    root.querySelector('button').click()
    await tick()
    expect(nativeShare).toHaveBeenCalledWith({ url: 'https://site.ru/page', title: 'Скидка' })

    delete navigator.share
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard(writeText)
    root.querySelector('button').click()
    await tick()
    expect(writeText).toHaveBeenCalledWith('https://site.ru/page')
    expect(document.body.textContent).toContain('Ссылка скопирована')
    api.destroy()
    document.querySelector('link[rel="canonical"]').remove()
  })
})

describe('compare', () => {
  it('переносит положение ползунка в --compare, подписывает его, шлёт событие', () => {
    const root = html('<div><img alt=""><img alt=""><input type="range" min="0" max="100" value="50"></div>')
    const api = compare(root, createCtx())
    const range = root.querySelector('input')
    expect(root.style.getPropertyValue('--compare')).toBe('50%')
    expect(range.getAttribute('aria-label')).toBe('Положение шторки «до / после»')
    const seen = vi.fn()
    root.addEventListener('compare:change', (e) => seen(e.detail.value))
    range.value = '80'
    range.dispatchEvent(new Event('input', { bubbles: true }))
    expect(root.style.getPropertyValue('--compare')).toBe('80%')
    expect(range.getAttribute('aria-valuetext')).toBe('80%')
    api.set(10)
    expect(api.value).toBe(10)
    expect(seen.mock.calls).toEqual([[80], [10]])
    api.destroy()
    expect(() => compare(html('<div></div>'))).toThrow(/range/)
  })
})

describe('load-more', () => {
  const PAGE = (items, next) =>
    `<html><body><div id="news"><ul data-load-more-list>${items.map((i) => `<li>${i}</li>`).join('')}</ul>
     ${next ? `<a href="${next}" data-load-more-button>Ещё</a>` : ''}</div></body></html>`
  const respond = (body, type = 'text/html') => ({
    ok: true,
    headers: new Headers({ 'content-type': type }),
    text: async () => body,
    json: async () => JSON.parse(body),
  })
  const setup = (attrs = '') =>
    html(`<div id="news" ${attrs}><ul data-load-more-list><li>1</li></ul>
      <a href="/news?page=2" data-load-more-button>Ещё</a><p data-load-more-status></p></div>`)

  it('дописывает элементы из следующей страницы, берёт из неё новую ссылку, фокус — на первый новый', async () => {
    const fetchMock = vi.fn(async () => respond(PAGE([2, 3], '?page=3')))
    vi.stubGlobal('fetch', fetchMock)
    const root = setup()
    const api = loadMore(root, createCtx())
    const button = root.querySelector('a')
    button.click()
    expect(button.getAttribute('aria-busy')).toBe('true')
    button.click() // двойной клик — второй запрос не уходит
    await until(() => api.page === 2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/news?page=2')
    expect([...root.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['1', '2', '3'])
    expect(new URL(button.href).search).toBe('?page=3') // относительно скачанной страницы
    expect(document.activeElement).toBe(root.querySelectorAll('li')[1])
    expect(root.querySelector('[data-load-more-status]').textContent).toBe('Загружено ещё 2 элемента')
    expect(button.getAttribute('aria-busy')).toBe('false')
    api.destroy()
  })

  it('последняя страница — кнопка прячется; JSON-ответ { html, next }', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respond(JSON.stringify({ html: '<li>2</li>', next: null }), 'application/json')),
    )
    const root = setup()
    const api = loadMore(root, createCtx())
    await api.load()
    expect(root.querySelectorAll('li')).toHaveLength(2)
    expect(api.complete).toBe(true)
    expect(root.classList.contains('is-complete')).toBe(true)
    api.destroy()
  })

  it('ошибка сети — кнопка остаётся, можно повторить', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline'))
    fetchMock.mockResolvedValueOnce(respond(PAGE([2], null)))
    vi.stubGlobal('fetch', fetchMock)
    const root = setup()
    const api = loadMore(root, createCtx())
    const failed = vi.fn()
    root.addEventListener('load-more:error', failed)
    await api.load()
    expect(failed).toHaveBeenCalled()
    expect(api.complete).toBe(false)
    expect(root.querySelector('[data-load-more-status]').textContent).toMatch(/Не удалось/)
    await api.load()
    expect(root.querySelectorAll('li')).toHaveLength(2)
    api.destroy()
    expect(() => loadMore(html('<div></div>'))).toThrow(/data-load-more-list/)
  })

  it('auto: догружает при появлении кнопки и продолжает, пока она на экране', async () => {
    const pages = [PAGE([2], '/news?page=3'), PAGE([3], null)]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => respond(pages.shift())),
    )
    const root = setup('data-load-more-auto')
    const api = loadMore(root, createCtx())
    triggerIntersect(root.querySelector('a'), true)
    await until(() => api.complete)
    expect(root.querySelectorAll('li')).toHaveLength(3)
    api.destroy()
  })
})

describe('embed', () => {
  it('embedUrl: провайдеры, готовый адрес, autoplay', () => {
    expect(embedUrl({ provider: 'youtube', id: 'abc' })).toBe('https://www.youtube-nocookie.com/embed/abc?rel=0')
    expect(embedUrl({ provider: 'rutube', id: 'x1', autoplay: true })).toBe(
      'https://rutube.ru/play/embed/x1?autoplay=1',
    )
    expect(embedUrl({ src: 'https://vk.com/video_ext.php?oid=-1&id=2', autoplay: true })).toBe(
      'https://vk.com/video_ext.php?oid=-1&id=2&autoplay=1',
    )
    expect(embedUrl({ provider: 'tiktok', id: '1' })).toBe('')
  })

  it('до клика плеера нет; клик создаёт iframe с title; stop убирает', () => {
    const root = html(
      '<div data-embed-provider="youtube" data-embed-id="abc" data-embed-title="Обзор"><button data-embed-play>▶</button></div>',
    )
    const api = embed(root, createCtx())
    expect(root.querySelector('iframe')).toBeNull()
    expect(root.querySelector('img').src).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg') // превью YouTube
    root.querySelector('button').click()
    const frame = root.querySelector('iframe')
    expect(frame.src).toBe('https://www.youtube-nocookie.com/embed/abc?rel=0&autoplay=1')
    expect(frame.title).toBe('Обзор')
    expect(root.classList.contains('is-playing')).toBe(true)
    root.querySelector('button').click()
    expect(root.querySelectorAll('iframe')).toHaveLength(1) // второй клик не плодит плееры
    api.stop()
    expect(root.querySelector('iframe')).toBeNull()
    api.destroy()
    expect(() => embed(html('<div></div>'))).toThrow(/data-embed-src/)
  })

  it('в модалке: закрытие окна останавливает видео', () => {
    const dialog = html('<dialog open><div data-embed-src="https://player.example/v/1"></div></dialog>')
    const api = embed(dialog.firstElementChild, createCtx())
    api.play()
    expect(api.isPlaying).toBe(true)
    dialog.dispatchEvent(new Event('close'))
    expect(api.isPlaying).toBe(false)
    api.destroy()
  })
})

describe('map', () => {
  const MAP = (attrs = '') => `<div ${attrs}>
    <div data-map-marker data-lat="55.75" data-lng="37.61" data-title="Офис"><b>Офис</b></div>
    <div data-map-marker data-lat="59.93" data-lng="30.31">Склад</div>
    <div data-map-marker>без координат</div>
    <a href="#">Открыть в картах</a></div>`

  it('readMarkers: координаты, заголовок, разметка балуна; метка без координат пропускается', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(readMarkers(html(MAP()))).toEqual([
      { coords: [55.75, 37.61], title: 'Офис', html: '<b>Офис</b>', icon: '' },
      { coords: [59.93, 30.31], title: '', html: 'Склад', icon: '' },
    ])
  })

  it('грузится только при появлении на экране; уборка вызывает cleanup карты', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const cleanup = vi.fn()
    const create = vi.fn(async () => cleanup)
    const root = html(MAP('data-map-zoom="12" data-map-center="[55, 37]"'))
    const api = map(root, createCtx({ options: { create } }))
    expect(create).not.toHaveBeenCalled()
    triggerIntersect(root, true)
    await until(() => api.state === 'loaded')
    const [canvas, data] = create.mock.calls[0]
    expect(canvas.className).toBe('map__canvas')
    expect(data).toMatchObject({ center: [55, 37], zoom: 12 })
    expect(data.markers).toHaveLength(2)
    expect(root.classList.contains('is-loaded')).toBe(true)
    api.destroy()
    expect(cleanup).toHaveBeenCalled()
    expect(root.querySelector('.map__canvas')).toBeNull()
  })

  it('карта не загрузилась — запасное содержимое остаётся; consent — ждёт согласия', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken = html(MAP())
    const failed = map(broken, createCtx({ options: { create: async () => Promise.reject(new Error('blocked')) } }))
    await failed.load()
    expect(failed.state).toBe('failed')
    expect(broken.classList.contains('is-failed')).toBe(true)
    expect(broken.querySelector('.map__canvas')).toBeNull()
    expect(broken.querySelector('a')).toBeTruthy()

    const create = vi.fn(async () => {})
    const root = html(MAP('data-map-consent="marketing"'))
    const api = map(root, createCtx({ options: { create } }))
    triggerIntersect(root, true)
    await tick()
    expect(create).not.toHaveBeenCalled()
    writeConsent({
      id: '1',
      version: '1',
      action: 'accept',
      categories: { marketing: true },
      date: '',
      expiresAt: 0,
      synced: true,
    })
    triggerIntersect(root, true)
    await until(() => api.state === 'loaded')
    expect(create).toHaveBeenCalledTimes(1)
    api.destroy()
  })
})
