/**
 * Согласие на cookies: что пользователь разрешил и что из-за этого можно запускать.
 *
 *   import { hasConsent, whenConsent, onConsentChange } from 'kit/js/core/consent.js'
 *
 *   if (hasConsent('analytics')) …                 // разрешено ли прямо сейчас
 *   whenConsent('analytics', () => loadMetrika())  // сейчас или как только разрешат
 *   onConsentChange((record) => …)                 // любое изменение выбора
 *
 * Здесь только состояние — без интерфейса. Баннер и отправка на сервер —
 * модуль cookie-consent (kit/js/modules/cookie-consent). Разделено, чтобы
 * плагин аналитики мог спросить «можно?», не подтягивая код баннера.
 *
 * ─── Запись о согласии ──────────────────────────────────────────────────────
 * localStorage['cookie-consent'] = {
 *   id,          // случайный номер записи — по нему сервер находит согласие в журнале
 *   version,     // версия политики; сменилась — спрашиваем заново
 *   action,      // 'accept' | 'reject' | 'custom'
 *   categories,  // { necessary: true, analytics: false, … }
 *   date,        // когда выбрано (ISO)
 *   expiresAt,   // когда спросить снова (мс) или 0 — бессрочно
 *   synced,      // дошло ли до сервера
 * }
 *
 * ─── Скрипты, которым нужно согласие ────────────────────────────────────────
 * Браузер не выполняет <script type="text/plain">. Так счётчик лежит в HTML,
 * но не запускается, пока категорию не разрешили:
 *
 *   <script type="text/plain" data-cookie-category="analytics" src="https://mc.yandex.ru/metrika/tag.js"></script>
 *   <script type="text/plain" data-cookie-category="analytics">ym(123, 'init', {})</script>
 *   <iframe data-cookie-category="marketing" data-src="https://www.youtube.com/embed/…"></iframe>
 *
 * activateConsented() превращает их в настоящие. Обратно нельзя: уже
 * выполненный скрипт не «выгрузить» — поэтому при отзыве согласия модуль
 * перезагружает страницу.
 * @module kit/core/consent
 */
import { readStorage, removeStorage, writeStorage } from './storage.js'

export const CONSENT_KEY = 'cookie-consent'
export const CONSENT_EVENT = 'cookie-consent:change'

/**
 * @typedef {object} ConsentRecord
 * @property {string} id
 * @property {string} version
 * @property {'accept' | 'reject' | 'custom'} action
 * @property {Record<string, boolean>} categories
 * @property {string} date
 * @property {number} expiresAt
 * @property {boolean} synced
 */

/**
 * Действующая запись о согласии или null (не выбирали, срок вышел, данные испорчены).
 * @returns {ConsentRecord | null}
 */
export function getConsent() {
  const record = readStorage(CONSENT_KEY)
  // localStorage могли поправить руками или другой версией сайта — проверяем форму.
  if (!record || typeof record !== 'object' || !record.categories || typeof record.categories !== 'object') return null
  if (record.expiresAt && Date.now() > record.expiresAt) return null
  return record
}

/** Разрешена ли категория. Пока человек не выбрал — нет. */
export const hasConsent = (category) => getConsent()?.categories[category] === true

const notify = (record) => {
  if (typeof document === 'undefined') return
  document.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { consent: record } }))
}

/**
 * Сохранить запись и оповестить подписчиков.
 * @param {ConsentRecord} record
 * @param {{ silent?: boolean }} [o] silent — без события (поменялась только отметка synced).
 */
export function writeConsent(record, { silent = false } = {}) {
  writeStorage(CONSENT_KEY, record)
  if (!silent) notify(record)
}

/** Забыть выбор (сменилась версия политики) — баннер спросит снова. */
export function clearConsent() {
  removeStorage(CONSENT_KEY)
  notify(null)
}

/**
 * Подписаться на изменение выбора.
 * @param {(record: ConsentRecord | null) => void} fn
 * @returns {() => void} отписаться
 */
export function onConsentChange(fn) {
  const handler = (event) => fn(/** @type {CustomEvent} */ (event).detail.consent)
  document.addEventListener(CONSENT_EVENT, handler)
  return () => document.removeEventListener(CONSENT_EVENT, handler)
}

/**
 * Выполнить fn один раз: сразу, если категория разрешена, иначе — когда разрешат.
 * @param {string} category
 * @param {() => void} fn
 * @returns {() => void} отменить ожидание
 */
export function whenConsent(category, fn) {
  if (hasConsent(category)) {
    fn()
    return () => {}
  }
  const off = onConsentChange((record) => {
    if (record?.categories[category] !== true) return
    off()
    fn()
  })
  return off
}

/**
 * Запустить отложенные скрипты и iframe разрешённых категорий.
 * @param {ParentNode} [root]
 * @returns {number} сколько элементов включено
 */
export function activateConsented(root = document) {
  const allowed = getConsent()?.categories ?? {}
  let count = 0
  root.querySelectorAll('[data-cookie-category]').forEach((node) => {
    const el = /** @type {HTMLElement} */ (node)
    if (allowed[el.dataset.cookieCategory] !== true) return
    if (el instanceof HTMLScriptElement) {
      if (el.type !== 'text/plain') return
      // Поменять type у вставленного скрипта мало — браузер его не выполнит.
      // Выполняется только новый элемент, поэтому создаём копию.
      const script = document.createElement('script')
      for (const { name, value } of el.attributes) {
        if (name !== 'type' && name !== 'data-cookie-type') script.setAttribute(name, value)
      }
      // data-cookie-type="module" — если скрипту нужен свой type.
      if (el.dataset.cookieType) script.type = el.dataset.cookieType
      script.text = el.text
      el.replaceWith(script)
      count += 1
    } else if (el.dataset.src) {
      el.setAttribute('src', el.dataset.src)
      el.removeAttribute('data-src')
      count += 1
    }
  })
  return count
}
