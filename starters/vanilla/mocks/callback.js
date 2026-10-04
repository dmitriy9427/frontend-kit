/**
 * Мок для формы «Связаться»: POST /api/callback.
 * Работает только в `npm run dev` (kit/vite/mock-api.js). На проде форма
 * отправляется на настоящий бэкенд.
 *
 * Попробуйте имя «ошибка» — увидите, как форма показывает ошибку сервера.
 */
export function POST({ body }) {
  if (!body.phone) return { status: 422, body: { message: 'Не указан телефон' } }
  if (body.name?.toLowerCase() === 'ошибка') return { status: 500, body: { message: 'Сервер недоступен (тест)' } }
  return { body: { message: `Спасибо, ${body.name || 'гость'}! Перезвоним в течение часа.` } }
}
