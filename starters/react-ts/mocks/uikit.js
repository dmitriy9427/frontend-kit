/**
 * Мок для формы UI-кита: POST /api/uikit.
 * Показывает, как сервер возвращает ошибки полей (422) — форма покажет их
 * под нужными полями. Формат { errors: { поле: 'текст' } } (или массивы, как в Laravel).
 */
export function POST({ body }) {
  if (body.email === 'taken@mail.ru') {
    return { status: 422, body: { message: 'Проверьте поля', errors: { email: ['Этот e-mail уже зарегистрирован'] } } }
  }
  return { body: { message: 'Форма отправлена — всё прошло проверку' } }
}
