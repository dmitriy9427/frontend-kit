/**
 * Баннер согласия на cookies: принять, отказаться, настроить по категориям.
 *
 *   <section class="cookie" data-module="cookie-consent" hidden
 *            data-cookie-consent-endpoint="/api/consent" data-cookie-consent-version="1"
 *            aria-label="Файлы cookie">
 *     <p>Мы используем cookie… <a href="/privacy.html">Подробнее</a></p>
 *     <div class="cookie__panel" data-cookie-panel hidden>
 *       <label><input type="checkbox" data-cookie-toggle="necessary" checked disabled> Необходимые</label>
 *       <label><input type="checkbox" data-cookie-toggle="analytics"> Аналитика</label>
 *       <label><input type="checkbox" data-cookie-toggle="marketing"> Реклама</label>
 *       <button data-cookie-save>Сохранить выбор</button>
 *     </div>
 *     <button data-cookie-accept>Принять все</button>
 *     <button data-cookie-reject>Только необходимые</button>
 *     <button data-cookie-settings>Настроить</button>
 *   </section>
 *
 *   <button data-cookie-open>Настройки cookie</button>   ← в подвале: изменить выбор
 *
 * Разметка — ваша: модуль ищет только data-атрибуты и ничего не рисует сам.
 * Тексты, классы, порядок кнопок, вид (плашка, модалка, полоса) — как угодно.
 * Тексты с data-i18n="kit.cookies.*" модуль сам переводит на язык страницы.
 * Блок с `hidden` в HTML: без JS и при уже сделанном выборе его нет на странице.
 *
 * ─── Категории ──────────────────────────────────────────────────────────────
 * Список берётся из чекбоксов [data-cookie-toggle] (и/или настройки categories).
 * Чекбокс с disabled — обязательная категория: всегда включена.
 * «Принять» включает все, «Отказаться» — только обязательные, «Сохранить» —
 * как отмечено.
 *
 * ─── Сервер ─────────────────────────────────────────────────────────────────
 * И согласие, и отказ отправляются POST-запросом на endpoint (JSON):
 *   { id, action: 'accept'|'reject'|'custom', version, categories, date, url, locale }
 * Свой способ (другой формат, GraphQL, заголовки) — ctx.options.send(payload),
 * функция возвращает промис. Не дошло (нет сети, 500) — выбор всё равно
 * сохранён, а отправка повторится при следующей загрузке страницы.
 *
 * ─── Что учтено ─────────────────────────────────────────────────────────────
 * - version: сменилась версия политики — прежнее согласие сброшено, спрашиваем снова;
 * - expires: через N дней спрашиваем снова (регуляторы советуют 6–12 месяцев);
 * - отзыв согласия: выполненный скрипт не выгрузить — страница перезагружается
 *   (reloadOnRevoke), и счётчик больше не запускается;
 * - cookie: имя cookie-дубликата — чтобы сервер (PHP, Битрикс) видел выбор
 *   при отдаче страницы: «версия:категория,категория»;
 * - отложенные скрипты <script type="text/plain" data-cookie-category="…">
 *   включаются после согласия (kit/js/core/consent.js).
 *
 * Спросить из своего кода: hasConsent / whenConsent из kit/js/core/consent.js.
 * @module kit/modules/cookie-consent
 */
import { createDisposer } from '../../core/lifecycle.js'
import { readOptions } from '../../core/options.js'
import { delegate, uid } from '../../core/dom.js'
import { getLocale, translatePage } from '../../core/i18n.js'
import { activateConsented, clearConsent, getConsent, writeConsent } from '../../core/consent.js'

const DEFAULTS = {
  /** Версия политики. Поменяли текст политики — поменяйте версию: баннер спросит снова. */
  version: '1',
  /** Адрес, куда отправлять выбор (POST, JSON). Пусто — не отправлять. */
  endpoint: '',
  /** Через сколько дней спросить снова (0 — никогда). */
  expires: 180,
  /** Имя cookie с копией выбора для сервера. Пусто — не ставить. */
  cookie: '',
  /** Категории сверх тех, что есть чекбоксами в разметке. */
  categories: /** @type {string[]} */ ([]),
  /** Обязательные категории сверх чекбоксов с disabled. */
  required: /** @type {string[]} */ ([]),
  /** Перезагрузить страницу, если разрешённую категорию запретили. */
  reloadOnRevoke: true,
}

const DAY = 24 * 60 * 60 * 1000

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${uid('consent')}`

/** Отправка по умолчанию: POST JSON. keepalive — запрос дойдёт, даже если страницу закрыли. */
async function post(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  })
  if (!response.ok) throw new Error(`[kit] cookie-consent: сервер ответил ${response.status}`)
}

export default function cookieConsent(el, ctx = {}) {
  const accept = el.querySelector('[data-cookie-accept]')
  if (!accept) throw new Error('[kit] cookie-consent: нет кнопки [data-cookie-accept]')

  const options = readOptions(el, 'cookie-consent', DEFAULTS, ctx.options)
  /** @type {((payload: object) => Promise<unknown>) | undefined} */
  const send = ctx.options?.send ?? (options.endpoint ? (payload) => post(options.endpoint, payload) : undefined)
  const d = createDisposer()
  const panel = el.querySelector('[data-cookie-panel]')
  const settings = el.querySelector('[data-cookie-settings]')
  /** @type {HTMLInputElement[]} */
  const toggles = Array.from(el.querySelectorAll('input[data-cookie-toggle]'))
  const names = [...new Set([...toggles.map((t) => t.dataset.cookieToggle), ...options.categories])]
  const required = new Set([
    ...toggles.filter((t) => t.disabled).map((t) => t.dataset.cookieToggle),
    ...options.required,
  ])
  let opener = null

  if (!el.hasAttribute('tabindex')) el.tabIndex = -1 // чтобы перевести фокус на баннер при открытии из подвала
  if (panel && settings) {
    if (!panel.id) panel.id = uid('cookie-panel')
    settings.setAttribute('aria-controls', panel.id)
  }

  // ─── Вид ─────────────────────────────────────────────────────────────────
  function togglePanel(open) {
    if (!panel) return
    panel.hidden = !open
    settings?.setAttribute('aria-expanded', String(open))
  }

  /** Чекбоксы = сохранённый выбор (обязательные всегда отмечены). */
  function fill(record) {
    toggles.forEach((toggle) => {
      const name = toggle.dataset.cookieToggle
      if (required.has(name)) toggle.checked = true
      else if (record) toggle.checked = record.categories[name] === true
    })
  }

  function show() {
    el.hidden = false
    el.dispatchEvent(new CustomEvent('cookie-consent:open', { bubbles: true }))
  }

  function close() {
    if (el.hidden) return
    el.hidden = true
    togglePanel(false)
    if (opener?.isConnected) opener.focus?.({ preventScroll: true })
    opener = null
    el.dispatchEvent(new CustomEvent('cookie-consent:close', { bubbles: true }))
  }

  /** Открыть настройки (кнопка в подвале): с текущим выбором и фокусом на баннере. */
  function open(trigger) {
    opener = trigger ?? document.activeElement
    fill(getConsent())
    togglePanel(true)
    show()
    el.focus({ preventScroll: true })
  }

  // ─── Сохранение ──────────────────────────────────────────────────────────
  function writeCookie(record) {
    if (!options.cookie) return
    const granted = record ? names.filter((name) => record.categories[name]) : []
    const value = record ? encodeURIComponent(`${record.version}:${granted.join(',')}`) : ''
    const maxAge = record ? (options.expires > 0 ? options.expires * 24 * 60 * 60 : 60 * 60 * 24 * 365) : 0
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${options.cookie}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
  }

  async function sync(record) {
    if (!send) return
    const { id, action, version, categories, date } = record
    try {
      await send({ id, action, version, categories, date, url: location.pathname, locale: getLocale() })
      // Запись могли успеть поменять, пока шёл запрос — отмечаем только свою.
      if (getConsent()?.date === date) writeConsent({ ...record, synced: true }, { silent: true })
    } catch (error) {
      // Выбор уже действует; synced: false — отправим ещё раз при следующей загрузке.
      console.warn('[kit] cookie-consent: не удалось отправить выбор на сервер', error)
      ctx.bus?.emit('cookie-consent:error', { consent: record, error })
    }
  }

  /**
   * @param {'accept' | 'reject' | 'custom'} action
   * @param {(name: string) => boolean} pick Разрешена ли необязательная категория.
   */
  function save(action, pick) {
    const previous = getConsent()
    const categories = Object.fromEntries(names.map((name) => [name, required.has(name) || Boolean(pick(name))]))
    const record = {
      id: previous?.id ?? newId(),
      version: options.version,
      action,
      categories,
      date: new Date().toISOString(),
      expiresAt: options.expires > 0 ? Date.now() + options.expires * DAY : 0,
      synced: !send,
    }
    writeConsent(record)
    writeCookie(record)
    fill(record)
    close()
    activateConsented()
    ctx.bus?.emit('cookie-consent:change', record)
    const revoked = previous && names.some((name) => previous.categories[name] === true && !categories[name])
    const pending = sync(record)
    // Запрос с keepalive переживёт перезагрузку; не дошёл — повторим после неё.
    if (revoked && options.reloadOnRevoke) location.reload()
    return pending
  }

  const acceptAll = () => save('accept', () => true)
  const rejectAll = () => save('reject', () => false)
  const saveChoice = () =>
    save('custom', (name) => toggles.find((toggle) => toggle.dataset.cookieToggle === name)?.checked ?? false)

  // ─── События ─────────────────────────────────────────────────────────────
  d.listen(el, 'click', (event) => {
    const target = /** @type {Element} */ (event.target)
    if (target.closest('[data-cookie-accept]')) acceptAll()
    else if (target.closest('[data-cookie-reject]')) rejectAll()
    else if (target.closest('[data-cookie-save]')) saveChoice()
    else if (target.closest('[data-cookie-settings]')) togglePanel(panel?.hidden ?? false)
    else if (target.closest('[data-cookie-close]')) close()
  })
  // Esc закрывает, только если выбор уже сделан: от первого вопроса клавишей не уйти —
  // иначе баннер пропадал бы без ответа и появлялся на каждой странице.
  d.listen(el, 'keydown', (event) => {
    if (event.key === 'Escape' && getConsent()) close()
  })
  d.add(
    delegate(document, 'click', '[data-cookie-open]', (event, trigger) => {
      event.preventDefault()
      open(trigger)
    }),
  )

  // ─── Старт ───────────────────────────────────────────────────────────────
  // Тексты с data-i18n — на языке страницы: одна разметка на все языковые версии.
  translatePage(el)
  togglePanel(false)
  let current = getConsent()
  if (current && current.version !== options.version) {
    clearConsent()
    writeCookie(null)
    current = null
  }
  if (current) {
    fill(current)
    activateConsented()
    if (!current.synced) sync(current)
  } else {
    show()
  }

  return {
    open: (trigger) => open(trigger),
    close,
    accept: acceptAll,
    reject: rejectAll,
    /** Сохранить свой набор: save({ analytics: true }). Без аргумента — как отмечено чекбоксами. */
    save: (categories) => (categories ? save('custom', (name) => categories[name] === true) : saveChoice()),
    get consent() {
      return getConsent()
    },
    get isOpen() {
      return !el.hidden
    },
    destroy: d.dispose,
  }
}
