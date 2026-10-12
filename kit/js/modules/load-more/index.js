/**
 * «Показать ещё»: догрузка следующей страницы списка без перезагрузки.
 *
 *   <div data-module="load-more">
 *     <ul data-load-more-list>
 *       <li>Новость 1</li> …
 *     </ul>
 *     <a class="btn" href="/news?page=2" data-load-more-button>Показать ещё</a>
 *     <p data-load-more-status role="status"></p>
 *   </div>
 *
 * ─── Как работает ───────────────────────────────────────────────────────────
 * Кнопка — обычная ссылка на следующую страницу (без JS и для поисковика
 * пагинация работает как раньше). Модуль по клику скачивает эту страницу,
 * берёт из неё элементы такого же списка и следующую ссылку — и дописывает
 * в текущую страницу. Бэкенд менять не нужно: подходит любая CMS с обычной
 * постраничной навигацией (WordPress, Битрикс, свой движок).
 * Нет следующей ссылки в ответе — кнопка прячется: это была последняя страница.
 *
 * Если удобнее API — сервер может ответить JSON: { html: '<li>…</li>', next: '/api/news?page=3' }
 * (next: null — страниц больше нет).
 *
 * Несколько списков на странице — дайте блокам id: в скачанной странице
 * модуль ищет блок с тем же id.
 *
 * ─── Что учтено ─────────────────────────────────────────────────────────────
 * 1. Двойной клик — второй запрос не уходит, пока идёт первый.
 * 2. Фокус: после догрузки переходит на первый новый элемент — с клавиатуры
 *    и скринридером продолжают с того же места, а не с начала страницы.
 * 3. Ошибка сети — кнопка остаётся, текст в [data-load-more-status], можно повторить.
 * 4. Модули в новых элементах (reveal, lightbox…) запускаются сами — за DOM
 *    следит приложение.
 * 5. auto — догрузка при прокрутке до кнопки («бесконечная лента»); кнопка
 *    остаётся запасным вариантом.
 * @module kit/modules/load-more
 */
import { createDisposer, onViewport } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { t } from '../../core/i18n.js'

const DEFAULTS = {
  /** Догружать самому, когда кнопка появилась на экране. */
  auto: false,
  /** За сколько px до кнопки начинать догрузку (для auto). */
  margin: 300,
}

export default function loadMore(root, ctx = {}) {
  const options = readOptions(root, 'load-more', DEFAULTS, ctx.options)
  const list = root.querySelector('[data-load-more-list]')
  /** @type {HTMLAnchorElement | null} */
  const button = root.querySelector('[data-load-more-button]')
  if (!list || !button) throw new Error('[kit] load-more: нужны [data-load-more-list] и [data-load-more-button]')
  const status = root.querySelector('[data-load-more-status]')
  const d = createDisposer()
  let busy = false
  let page = 1

  const nextUrl = () => button.getAttribute('href') || button.dataset.loadMoreUrl || ''
  const setStatus = (text) => {
    if (status) status.textContent = text
  }

  function lock(on) {
    busy = on
    root.classList.toggle('is-loading', on)
    button.setAttribute('aria-busy', String(on))
    button.toggleAttribute('aria-disabled', on)
  }

  function finish() {
    button.hidden = true
    root.classList.add('is-complete')
  }

  /** Разобрать ответ: { html, next } из JSON или из HTML-страницы. */
  async function parse(response) {
    if ((response.headers.get('content-type') ?? '').includes('json')) {
      const data = await response.json()
      return { html: String(data.html ?? ''), next: data.next || null }
    }
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
    const scope = (root.id && doc.getElementById(root.id)) || doc
    const nextButton = scope.querySelector('[data-load-more-button]')
    return {
      html: scope.querySelector('[data-load-more-list]')?.innerHTML ?? '',
      next: nextButton?.getAttribute('href') || null,
    }
  }

  async function load() {
    const url = nextUrl()
    if (busy || !url || button.hidden) return
    lock(true)
    root.classList.remove('is-failed')
    setStatus('')
    try {
      const response = await fetch(new URL(url, location.href), { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
      if (!response.ok) throw new Error(`[kit] load-more: сервер ответил ${response.status}`)
      const { html, next } = await parse(response)
      if (d.disposed) return
      const template = document.createElement('template')
      template.innerHTML = html
      const items = Array.from(template.content.children)
      list.append(template.content)
      page += 1
      if (next && items.length) {
        // Ссылка относительна адреса, с которого её скачали, а не текущей страницы.
        button.setAttribute('href', new URL(next, new URL(url, location.href)).href)
      } else finish()
      const first = /** @type {HTMLElement | undefined} */ (items[0])
      if (first && !options.auto) {
        if (!first.hasAttribute('tabindex')) first.tabIndex = -1
        first.focus({ preventScroll: true })
      }
      setStatus(t('kit.loadMore.loaded', { count: items.length }))
      root.dispatchEvent(new CustomEvent('load-more:loaded', { bubbles: true, detail: { items, page } }))
      ctx.bus?.emit('load-more:loaded', { el: root, items, page })
    } catch (error) {
      if (d.disposed) return
      root.classList.add('is-failed') // auto не повторяет сам — только по клику
      setStatus(t('kit.loadMore.failed'))
      root.dispatchEvent(new CustomEvent('load-more:error', { bubbles: true, detail: error }))
    } finally {
      lock(false)
    }
    // auto: наблюдатель сообщает только о ПОЯВЛЕНИИ кнопки. Если новая порция короткая
    // и кнопка осталась на экране, второго сигнала не будет — проверяем сами.
    if (options.auto && !d.disposed && !button.hidden && !root.classList.contains('is-failed') && nearViewport()) load()
  }

  function nearViewport() {
    const rect = button.getBoundingClientRect()
    return rect.top < window.innerHeight + options.margin && rect.bottom > -options.margin
  }

  d.listen(button, 'click', (event) => {
    event.preventDefault()
    load()
  })
  if (options.auto) d.add(onViewport(button, { enter: load, rootMargin: `${options.margin}px` }))

  return {
    load,
    get page() {
      return page
    },
    get complete() {
      return button.hidden
    },
    destroy: d.dispose,
  }
}
