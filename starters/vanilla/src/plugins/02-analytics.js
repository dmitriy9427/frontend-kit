/**
 * Аналитика: события модулей из шины → цели счётчика. Модули ничего не знают
 * про Метрику — они шлют события (`price:order`, `form:success`), а этот
 * плагин решает, что из этого цели. Сменился счётчик — правится один файл.
 *
 * Подключите счётчик в site-head и замените COUNTER_ID. Пока счётчика нет,
 * цели пишутся в консоль (в dev) — видно, что события доходят.
 */
const COUNTER_ID = 0 // id Яндекс Метрики

/** Событие шины → имя цели. */
const GOALS = {
  'price:order': 'calc-order',
  'copy-link:copied': 'copy-link',
}

export default function analytics({ ctx }) {
  const reach = (goal, params) => {
    const ym = /** @type {any} */ (window).ym // функция счётчика Метрики (появится после его кода)
    if (COUNTER_ID && typeof ym === 'function') ym(COUNTER_ID, 'reachGoal', goal, params)
    else if (import.meta.env.DEV) console.info(`[analytics] цель «${goal}»`, params)
  }
  const offs = Object.entries(GOALS).map(([event, goal]) => ctx.bus.on(event, (payload) => reach(goal, payload)))
  return () => offs.forEach((off) => off())
}
