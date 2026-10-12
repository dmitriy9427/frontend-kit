/**
 * Яндекс.Карта, которая не тормозит страницу: грузится, когда до неё докрутили.
 *
 *   <div class="map" data-module="map" data-map-apikey="ваш-ключ" data-map-zoom="15">
 *     <div data-map-marker data-lat="55.7558" data-lng="37.6173" data-title="Офис">
 *       <b>Офис</b><br />Москва, Красная площадь, 1<br />Пн–Пт 9:00–18:00
 *     </div>
 *     <a href="https://yandex.ru/maps/?text=Москва, Красная площадь, 1">Открыть в Яндекс.Картах</a>
 *   </div>
 *
 * Метки — элементы [data-map-marker]: координаты в data-lat / data-lng, содержимое —
 * текст балуна. Одна метка — карта центрируется на ней; несколько — показываются все.
 * Свой центр — data-map-center="[55.75, 37.61]". Остальное содержимое блока (адрес,
 * ссылка) видно, пока карта не загрузилась, — и остаётся, если она не загрузится вовсе.
 *
 * ─── Зачем ──────────────────────────────────────────────────────────────────
 * API карт — около 1 МБ скриптов. Карта обычно в подвале, и большинство
 * посетителей до неё не доходят: грузить её сразу — платить скоростью
 * первого экрана ни за что. Здесь API подключается за 300 px до блока.
 *
 * ─── Что учтено ─────────────────────────────────────────────────────────────
 * 1. Колесо мыши над картой масштабирует её вместо прокрутки страницы — человек
 *    «застревает». Масштаб колесом выключен (scrollZoom), кнопки +/− остаются.
 * 2. На телефоне палец двигает карту вместо страницы — перетаскивание одним
 *    пальцем выключено (touchDrag), двумя — работает.
 * 3. Несколько карт на странице — API грузится один раз.
 * 4. consent: карта ставит cookies; data-map-consent="marketing" — загрузка
 *    только после согласия на эту категорию (модуль cookie-consent).
 * 5. API не загрузился (блокировщик, нет сети) — остаётся запасное содержимое
 *    блока, класс is-failed, событие map:error.
 *
 * Ключ API — https://developer.tech.yandex.ru (JavaScript API и HTTP Геокодер).
 * Нужна другая карта (2ГИС, Google, Leaflet) — ctx.options.create(el, { center, zoom, markers }):
 * ленивая загрузка, согласие и метки из разметки останутся, а карту рисуете вы.
 * @module kit/modules/map
 */
import { createDisposer, onViewport } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { isTouch } from '../../core/env.js'
import { getLocale } from '../../core/i18n.js'
import { whenConsent } from '../../core/consent.js'

const DEFAULTS = {
  /** Ключ API Яндекс.Карт. */
  apikey: '',
  /** Центр [широта, долгота]. Пусто — по меткам. */
  center: /** @type {number[]} */ ([]),
  /** Масштаб (для одной метки или своего центра). */
  zoom: 15,
  /** Масштабировать колесом мыши. */
  scrollZoom: false,
  /** Двигать карту одним пальцем на телефоне. */
  touchDrag: false,
  /** Категория cookies, без согласия на которую карта не грузится. Пусто — не ждать. */
  consent: '',
  /** За сколько px до блока начинать загрузку. */
  margin: 300,
}

const LANGS = { ru: 'ru_RU', en: 'en_US', tr: 'tr_TR', uk: 'uk_UA' }
let apiPromise = null

/** Подключить API Яндекс.Карт один раз на страницу. */
export function loadYandexMaps({ apikey = '', lang = 'ru' } = {}) {
  const w = /** @type {any} */ (window)
  if (w.ymaps?.ready) return new Promise((resolve) => w.ymaps.ready(() => resolve(w.ymaps)))
  apiPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const query = new URLSearchParams({ lang: LANGS[lang] ?? LANGS.ru, ...(apikey ? { apikey } : {}) })
    script.src = `https://api-maps.yandex.ru/2.1/?${query}`
    script.async = true
    script.onload = () => w.ymaps.ready(() => resolve(w.ymaps))
    script.onerror = () => {
      apiPromise = null // следующая карта (или повтор) попробует снова
      script.remove()
      reject(new Error('[kit] map: не удалось загрузить API Яндекс.Карт'))
    }
    document.head.append(script)
  })
  return apiPromise
}

/** Метки из разметки: [{ coords, title, html }]. Метки без координат пропускаются с предупреждением. */
export function readMarkers(root) {
  return Array.from(root.querySelectorAll('[data-map-marker]')).flatMap((node) => {
    const el = /** @type {HTMLElement} */ (node)
    const coords = [Number(el.dataset.lat), Number(el.dataset.lng)]
    if (!coords.every(Number.isFinite) || el.dataset.lat === undefined || el.dataset.lng === undefined) {
      console.warn('[kit] map: у метки нет data-lat / data-lng', el)
      return []
    }
    return [{ coords, title: el.dataset.title ?? '', html: el.innerHTML.trim(), icon: el.dataset.icon ?? '' }]
  })
}

/** Карта Яндекса на элементе. @returns {Promise<() => void>} функция уборки */
async function createYandexMap(el, { center, zoom, markers, options }) {
  const ymaps = await loadYandexMaps({ apikey: options.apikey, lang: getLocale() })
  const map = new ymaps.Map(el, {
    center: center ?? markers[0]?.coords ?? [55.7558, 37.6173],
    zoom,
    controls: ['zoomControl', 'fullscreenControl'],
  })
  if (!options.scrollZoom) map.behaviors.disable('scrollZoom')
  if (!options.touchDrag && isTouch()) map.behaviors.disable('drag')
  markers.forEach((marker) => {
    map.geoObjects.add(
      new ymaps.Placemark(
        marker.coords,
        { hintContent: marker.title, balloonContentHeader: marker.title, balloonContentBody: marker.html },
        marker.icon
          ? {
              iconLayout: 'default#image',
              iconImageHref: marker.icon,
              iconImageSize: [40, 40],
              iconImageOffset: [-20, -40],
            }
          : {},
      ),
    )
  })
  // Несколько меток без своего центра — показать все.
  if (!center && markers.length > 1) {
    map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 40 })
  }
  return () => map.destroy()
}

export default function map(root, ctx = {}) {
  const options = readOptions(root, 'map', DEFAULTS, ctx.options)
  /** @type {(el: HTMLElement, data: object) => unknown} */
  const create = ctx.options?.create ?? createYandexMap
  const d = createDisposer()
  const markers = readMarkers(root)
  const center = options.center.length === 2 ? options.center.map(Number) : null
  let state = 'idle'

  async function load() {
    if (state !== 'idle') return
    state = 'loading'
    root.classList.add('is-loading')
    // Карта рисуется в отдельном слое поверх запасного содержимого: не загрузится — оно останется.
    const canvas = document.createElement('div')
    canvas.className = 'map__canvas'
    root.append(canvas)
    try {
      const cleanup = await create(canvas, { center, zoom: options.zoom, markers, options })
      if (d.disposed) {
        if (typeof cleanup === 'function') cleanup()
        return
      }
      if (typeof cleanup === 'function') d.add(cleanup)
      d.add(() => canvas.remove())
      state = 'loaded'
      root.classList.add('is-loaded')
      root.dispatchEvent(new CustomEvent('map:ready', { bubbles: true }))
      ctx.bus?.emit('map:ready', { el: root })
    } catch (error) {
      canvas.remove()
      state = 'failed'
      root.classList.add('is-failed')
      console.warn(error)
      root.dispatchEvent(new CustomEvent('map:error', { bubbles: true, detail: error }))
    } finally {
      root.classList.remove('is-loading')
    }
  }

  const arm = () => d.add(onViewport(root, { enter: load, rootMargin: `${options.margin}px`, once: true }))
  if (options.consent) d.add(whenConsent(options.consent, arm))
  else arm()

  return {
    /** Загрузить сейчас, не дожидаясь прокрутки. */
    load,
    get state() {
      return state
    },
    destroy: d.dispose,
  }
}
