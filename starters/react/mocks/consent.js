/**
 * Мок журнала согласий на cookies: POST /api/consent (модуль cookie-consent).
 * Приходит и согласие, и отказ: { id, action, version, categories, date, url, locale }.
 * На проде бэкенд пишет это в журнал — по id записи можно доказать, что и когда выбрал посетитель.
 */
export function POST({ body }) {
  if (!body.id || !body.categories) return { status: 422, body: { message: 'Нет id или categories' } }
  console.info(`[mock] consent ${body.action}:`, body.categories)
  return { body: { ok: true } }
}
