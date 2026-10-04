/**
 * Модалка с формой. Открывается любой кнопкой data-dialog-open="callback"
 * (модуль dialog слушает клики по всему документу).
 *
 * Окно открывается и по адресу …#callback, и кнопкой «Назад» закрывается.
 *
 * Форма — модуль кита form со схемой callbackSchema (src/forms/schemas.js):
 * проверка как в react-hook-form + zod, маска телефона, отправка на
 * /api/callback (в dev отвечает mocks/callback.js). Поля неконтролируемые
 * (без useState) — значения собираются при отправке. Нужна своя логика
 * отправки — передайте onSubmit: useModule(form, { schema, onSubmit }).
 */
import { useModule } from 'kit/react/index.js'
import dialog from 'kit/js/modules/dialog/index.js'
import form from 'kit/js/modules/form/index.js'
import { callbackSchema } from '../forms/schemas'

const FORM_OPTIONS = { ajax: true, schema: callbackSchema }

export function CallbackDialog() {
  const dialogRef = useModule<HTMLDialogElement>(dialog)
  const formRef = useModule<HTMLFormElement>(form, FORM_OPTIONS)
  return (
    <dialog id="callback" className="dialog" ref={dialogRef} aria-labelledby="callback-title">
      <div className="dialog__box">
        <button className="dialog__close" type="button" data-dialog-close aria-label="Закрыть">
          ×
        </button>
        <h2 id="callback-title" className="h3">
          Обсудим проект?
        </h2>
        <form ref={formRef} className="stack form" action="/api/callback" method="post" noValidate>
          <label className="field">
            <span className="field__label">Имя</span>
            <input className="field__input" name="name" autoComplete="name" required minLength={2} />
          </label>
          <label className="field">
            <span className="field__label">Телефон</span>
            <input className="field__input" name="phone" type="tel" autoComplete="tel" data-mask="phone" required />
          </label>
          <label className="checkbox field">
            <input type="checkbox" name="consent" required data-error-required="Нужно ваше согласие" />
            <span>Соглашаюсь с обработкой персональных данных</span>
          </label>
          <button className="btn" type="submit">
            Отправить
          </button>
          <p data-form-status role="status" />
        </form>
      </div>
    </dialog>
  )
}
