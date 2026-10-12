/**
 * Аналитика: события модулей из шины → цели счётчика. Модули ничего не знают
 * про Метрику — они шлют события (`price:order`, `form:success`), а этот
 * плагин решает, что из этого цели. Сменился счётчик — правится один файл.
 *
 * Подключите счётчик в site-head и замените COUNTER_ID. Пока счётчика нет,
 * цели пишутся в консоль (в dev) — видно, что события доходят.
 *
 * Cookies: счётчик ставит cookie, поэтому ему нужно согласие на «аналитику»
 * (баннер — <x-cookie-banner>). Код счётчика подключайте отложенным, тогда он
 * запустится только после согласия:
 *   <script type="text/plain" data-cookie-category="analytics">…код Метрики…</script>
 * Цели без согласия не отправляются.
 */
import { hasConsent } from 'kit/js/core/consent.js'

const COUNTER_ID = 0 // id Яндекс Метрики

/** Событие шины → имя цели. */
const GOALS = {
  'price:order': 'calc-order',
  'copy-link:copied': 'copy-link',
}

export default function analytics({ ctx }) {
  const reach = (goal, params) => {
    const ym = /** @type {any} */ (window).ym // функция счётчика Метрики (появится после его кода)
    if (!hasConsent('analytics')) {
      if (import.meta.env.DEV) console.info(`[analytics] цель «${goal}» не отправлена: нет согласия на аналитику`)
      return
    }
    if (COUNTER_ID && typeof ym === 'function') ym(COUNTER_ID, 'reachGoal', goal, params)
    else if (import.meta.env.DEV) console.info(`[analytics] цель «${goal}»`, params)
  }
  const offs = Object.entries(GOALS).map(([event, goal]) => ctx.bus.on(event, (payload) => reach(goal, payload)))
  return () => offs.forEach((off) => off())
}
