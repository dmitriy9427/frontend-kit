/**
 * Видео с YouTube / VK / Rutube / Vimeo, которое не тормозит страницу:
 * сначала только картинка с кнопкой, плеер грузится по клику.
 *
 *   <div class="embed" data-module="embed" data-embed-provider="youtube" data-embed-id="dQw4w9WgXcQ"
 *        data-embed-title="Обзор проекта">
 *     <img class="embed__poster" src="/img/video.jpg" alt="" loading="lazy" />
 *     <button class="embed__play" type="button" data-embed-play aria-label="Смотреть видео"></button>
 *   </div>
 *
 *   <div class="embed" data-module="embed" data-embed-src="https://vk.com/video_ext.php?oid=-1&id=2&hd=2">…</div>
 *
 * ─── Зачем ──────────────────────────────────────────────────────────────────
 * Один <iframe> YouTube — это ~1 МБ скриптов и десятки запросов ещё до того,
 * как человек решил смотреть. Три видео на странице — и Lighthouse красный.
 * Здесь плеер и его скрипты (а значит, и cookies) появляются только после клика —
 * явного действия пользователя. Со своим постером до клика к видеохостингу нет
 * вообще ни одного запроса.
 *
 * ─── Что учтено ─────────────────────────────────────────────────────────────
 * - Постера нет — для YouTube берётся его превью (одна картинка с i.ytimg.com).
 * - После клика плеер запускается сам (autoplay) и получает фокус — с
 *   клавиатуры можно сразу управлять.
 * - YouTube — через youtube-nocookie.com (без рекламных cookies до старта).
 * - У iframe обязателен title (иначе скринридер читает «фрейм»): data-embed-title.
 * - Пропорции держит CSS (.embed, переменная --embed-ratio) — без «прыжка» вёрстки.
 * - Внутри модалки: при закрытии окна плеер убирается (stop) — звук не играет «из ниоткуда».
 * @module kit/modules/embed
 */
import { createDisposer } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { t } from '../../core/i18n.js'

const DEFAULTS = {
  /** Готовый адрес плеера (embed-ссылка). Важнее provider + id. */
  src: '',
  /** youtube | vimeo | rutube. */
  provider: '',
  /** id ролика у провайдера. */
  id: '',
  /** Название ролика — для title у iframe. */
  title: '',
  /** Запускать сразу после клика. */
  autoplay: true,
}

/** @type {Record<string, (id: string) => string>} */
const PROVIDERS = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
  vimeo: (id) => `https://player.vimeo.com/video/${id}`,
  rutube: (id) => `https://rutube.ru/play/embed/${id}`,
}

/**
 * Адрес плеера. @returns {string} '' — собрать не из чего
 * @param {{ src?: string, provider?: string, id?: string, autoplay?: boolean }} o
 */
export function embedUrl({ src = '', provider = '', id = '', autoplay = false }) {
  const base = src || (id ? (PROVIDERS[provider]?.(encodeURIComponent(id)) ?? '') : '')
  if (!base) return ''
  const url = new URL(base, location.href)
  if (autoplay) url.searchParams.set('autoplay', '1')
  return url.href
}

export default function embed(root, ctx = {}) {
  const options = readOptions(root, 'embed', DEFAULTS, ctx.options)
  if (!embedUrl(options)) {
    throw new Error(
      `[kit] embed: укажите data-embed-src или data-embed-provider (${Object.keys(PROVIDERS).join(', ')}) + data-embed-id`,
    )
  }
  const d = createDisposer()
  const play = root.querySelector('[data-embed-play]')
  let frame = null

  // Превью YouTube, если своего постера нет.
  if (options.provider === 'youtube' && options.id && !root.querySelector('img, picture')) {
    const poster = document.createElement('img')
    poster.className = 'embed__poster'
    poster.src = `https://i.ytimg.com/vi/${encodeURIComponent(options.id)}/hqdefault.jpg`
    poster.alt = ''
    poster.loading = 'lazy'
    root.prepend(poster)
  }

  function start() {
    if (frame) return
    frame = document.createElement('iframe')
    frame.className = 'embed__frame'
    frame.src = embedUrl(options)
    frame.title = options.title || t('kit.embed.title')
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    frame.allowFullscreen = true
    frame.referrerPolicy = 'strict-origin-when-cross-origin'
    frame.tabIndex = -1
    root.append(frame)
    root.classList.add('is-playing')
    frame.focus({ preventScroll: true })
    root.dispatchEvent(new CustomEvent('embed:play', { bubbles: true }))
    ctx.bus?.emit('embed:play', { el: root })
  }

  function stop() {
    if (!frame) return
    const hadFocus = frame === document.activeElement
    frame.remove()
    frame = null
    root.classList.remove('is-playing')
    if (hadFocus) /** @type {HTMLElement | null} */ (play)?.focus({ preventScroll: true })
  }

  // Клик по всему блоку: и по кнопке, и по картинке.
  d.listen(root, 'click', (event) => {
    if (frame) return
    event.preventDefault()
    start()
  })
  const dialog = root.closest('dialog')
  if (dialog) d.listen(dialog, 'close', stop)
  d.add(stop)

  return {
    play: start,
    stop,
    get isPlaying() {
      return Boolean(frame)
    },
    destroy: d.dispose,
  }
}
