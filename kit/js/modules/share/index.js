/**
 * «Поделиться»: системное окно на телефоне и ссылки на соцсети.
 *
 *   <div class="share" data-module="share" data-share-title="Скидка 20% до пятницы">
 *     <button data-share-native>Поделиться</button>
 *     <a data-share-to="telegram">Telegram</a>
 *     <a data-share-to="vk">ВКонтакте</a>
 *     <a data-share-to="whatsapp">WhatsApp</a>
 *     <a data-share-to="email">Почта</a>
 *   </div>
 *
 * По умолчанию делимся текущей страницей: адрес — канонический (<link rel="canonical">),
 * заголовок — <title>. Другое — data-share-url / data-share-title / data-share-text.
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * - Ссылкам [data-share-to] модуль проставляет href (и target="_blank",
 *   rel="noopener") — это обычные ссылки, без всплывающих окон и чужих скриптов
 *   соцсетей (те следят за посетителями и тормозят страницу).
 * - [data-share-native] открывает системное «Поделиться» (Web Share API: все
 *   приложения телефона). Где его нет (большинство десктопов) — копирует
 *   ссылку и показывает уведомление.
 * - Сети: telegram, vk, whatsapp, ok, viber, x, facebook, linkedin, email.
 *
 * Отмена системного окна пользователем — не ошибка: молчим.
 * @module kit/modules/share
 */
import { createDisposer } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { t } from '../../core/i18n.js'
import { copyText } from '../copy/index.js'
import { toast } from '../toast/index.js'

const DEFAULTS = {
  /** Чем делимся. Пусто — канонический адрес страницы. */
  url: '',
  /** Заголовок. Пусто — <title>. */
  title: '',
  /** Текст-описание (попадает не во все сети). */
  text: '',
}

const e = encodeURIComponent
/** @type {Record<string, (d: { url: string, title: string, text: string }) => string>} */
const NETWORKS = {
  telegram: ({ url, title }) => `https://t.me/share/url?url=${e(url)}&text=${e(title)}`,
  vk: ({ url, title }) => `https://vk.com/share.php?url=${e(url)}&title=${e(title)}`,
  whatsapp: ({ url, title }) => `https://wa.me/?text=${e(`${title} ${url}`.trim())}`,
  ok: ({ url, title }) => `https://connect.ok.ru/offer?url=${e(url)}&title=${e(title)}`,
  viber: ({ url, title }) => `viber://forward?text=${e(`${title} ${url}`.trim())}`,
  x: ({ url, title }) => `https://x.com/intent/tweet?url=${e(url)}&text=${e(title)}`,
  facebook: ({ url }) => `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
  linkedin: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`,
  email: ({ url, title, text }) => `mailto:?subject=${e(title)}&body=${e(`${text ? `${text}\n\n` : ''}${url}`)}`,
}

/**
 * Ссылка «поделиться» для сети (null — сети нет в списке).
 * @param {string} network
 * @param {{ url: string, title?: string, text?: string }} data
 */
export function shareUrl(network, { url, title = '', text = '' }) {
  return NETWORKS[network]?.({ url, title, text }) ?? null
}

export default function share(root, ctx = {}) {
  const options = readOptions(root, 'share', DEFAULTS, ctx.options)
  const d = createDisposer()

  const data = () => ({
    url: options.url
      ? new URL(options.url, location.href).href
      : /** @type {HTMLLinkElement | null} */ (document.querySelector('link[rel="canonical"]'))?.href || location.href,
    title: options.title || document.title,
    text: options.text,
  })

  root.querySelectorAll('a[data-share-to]').forEach((node) => {
    const link = /** @type {HTMLAnchorElement} */ (node)
    const href = shareUrl(link.dataset.shareTo, data())
    if (!href) {
      console.warn(`[kit] share: нет сети «${link.dataset.shareTo}». Есть: ${Object.keys(NETWORKS).join(', ')}`)
      return
    }
    link.href = href
    if (!href.startsWith('mailto:')) {
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
    }
  })

  d.listen(root, 'click', async (event) => {
    const button = /** @type {Element} */ (event.target).closest('[data-share-native]')
    if (!button) return
    event.preventDefault()
    const payload = data()
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          url: payload.url,
          title: payload.title,
          ...(payload.text ? { text: payload.text } : {}),
        })
        ctx.bus?.emit('share:done', { el: root, ...payload, via: 'native' })
      } catch (error) {
        // AbortError — человек закрыл окно. Остальное (нет прав) — запасной путь ниже.
        if (/** @type {Error} */ (error).name === 'AbortError') return
        fallback(payload)
      }
      return
    }
    fallback(payload)
  })

  async function fallback(payload) {
    const ok = await copyText(payload.url)
    toast(ok ? t('kit.share.copied') : t('kit.copy.failed'), { type: ok ? 'success' : 'error' })
    if (ok) ctx.bus?.emit('share:done', { el: root, ...payload, via: 'copy' })
  }

  return { destroy: d.dispose }
}
