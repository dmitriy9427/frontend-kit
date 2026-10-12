/**
 * Баннер согласия на cookies (модуль кита cookie-consent). Стоит в App — значит, на всех страницах.
 *
 *   <CookieBanner />
 *   <CookieBanner version="2" endpoint="/api/consent" policyHref="/privacy" />
 *
 * version — версия политики: поменяли политику → поменяйте версию, баннер спросит снова.
 * endpoint — куда отправляется выбор (и согласие, и отказ); в dev отвечает mocks/consent.js.
 * Своя отправка (axios, GraphQL) — добавьте в опции send: (payload) => Promise,
 * объявив функцию ВНЕ компонента (см. kit/react/useModule.js, п. 3).
 *
 * hidden у блока и панели задан один раз и дальше им управляет модуль — не привязывайте
 * его к состоянию React. Тексты — ключи kit.cookies.* (kit/js/i18n): модуль переводит их
 * на язык страницы. Категории — чекбоксы data-cookie-toggle. Вид — переменные --cookie-*.
 *
 * Спросить согласие из своего кода:
 *   import { hasConsent, whenConsent } from 'kit/js/core/consent.js'
 * Изменить выбор позже — любая кнопка с data-cookie-open (есть в Footer).
 */
import { useModule } from 'kit/react/index.js'
import cookieConsent from 'kit/js/modules/cookie-consent/index.js'

/** @param {{ version?: string, endpoint?: string, policyHref?: string }} props */
export function CookieBanner({ version = '1', endpoint = '/api/consent', policyHref }) {
  const ref = useModule(cookieConsent, { version, endpoint })
  return (
    <section
      ref={ref}
      className="cookie"
      aria-label="Файлы cookie"
      data-i18n-attr="aria-label:kit.cookies.label"
      hidden
    >
      <p className="cookie__text">
        <span data-i18n="kit.cookies.text">Мы используем cookie, чтобы сайт работал и становился удобнее.</span>
        {policyHref && (
          <>
            {' '}
            <a href={policyHref} data-i18n="kit.cookies.more">
              Подробнее
            </a>
          </>
        )}
      </p>
      <div className="cookie__panel" data-cookie-panel hidden>
        <label className="cookie__option">
          <input type="checkbox" data-cookie-toggle="necessary" defaultChecked disabled />
          <span className="cookie__option-title" data-i18n="kit.cookies.necessary">
            Необходимые
          </span>
          <span className="cookie__option-hint" data-i18n="kit.cookies.necessaryHint">
            Без них сайт не работает: вход, корзина, сам этот выбор.
          </span>
        </label>
        <label className="cookie__option">
          <input type="checkbox" data-cookie-toggle="analytics" />
          <span className="cookie__option-title" data-i18n="kit.cookies.analytics">
            Аналитика
          </span>
          <span className="cookie__option-hint" data-i18n="kit.cookies.analyticsHint">
            Помогают понять, какие страницы полезны, а какие нет.
          </span>
        </label>
        <label className="cookie__option">
          <input type="checkbox" data-cookie-toggle="marketing" />
          <span className="cookie__option-title" data-i18n="kit.cookies.marketing">
            Реклама
          </span>
          <span className="cookie__option-hint" data-i18n="kit.cookies.marketingHint">
            Показывают рекламу, которая вам ближе.
          </span>
        </label>
        <button className="btn btn--secondary btn--sm" type="button" data-cookie-save data-i18n="kit.cookies.save">
          Сохранить выбор
        </button>
      </div>
      <div className="cookie__actions">
        <button className="btn btn--sm" type="button" data-cookie-accept data-i18n="kit.cookies.accept">
          Принять все
        </button>
        <button className="btn btn--secondary btn--sm" type="button" data-cookie-reject data-i18n="kit.cookies.reject">
          Только необходимые
        </button>
        <button className="btn btn--ghost btn--sm" type="button" data-cookie-settings data-i18n="kit.cookies.settings">
          Настроить
        </button>
      </div>
    </section>
  )
}
