/**
 * Схемы форм проекта. Имя схемы — значение data-form-schema у <form>.
 *
 *   <form data-module="form" data-form-schema="callback" …>
 *
 * Правила и тексты ошибок — в одном месте, а не размазаны по HTML-атрибутам.
 * Те же схемы можно использовать на бэкенде (Node) — один источник правды.
 * Все методы: kit/js/form/schema.js и docs/forms.md.
 */
import { registerSchema, s } from 'kit/js/form/index.js'

const phone = s.string().phone()
const consent = s.boolean().isTrue('Нужно ваше согласие на обработку данных')

/** «Обсудим проект?» — модалка в partials/callback-dialog.html. */
export const callbackSchema = s.object({
  name: s.string().trim().min(2, 'Как к вам обращаться? Минимум 2 буквы'),
  phone,
  consent,
})

/** Витрина всех полей на ui-kit.html. */
export const uikitSchema = s
  .object({
    email: s.string().email(),
    phone,
    birthday: s.date().minAge(18),
    inn: s.string().inn().optional(),
    snils: s.string().snils().optional(),
    amount: s.number().min(1000, 'Бюджет — от 1 000 ₽'),
    password: s.string().min(8).regex(/\d/, 'Нужна хотя бы одна цифра'),
    confirm: s.string().equals('password', 'Пароли не совпадают'),
    topic: s.enum(['site', 'support', 'other'], 'Выберите тему'),
    city: s.string().optional(),
    stack: s.array().min(1, 'Выберите хотя бы одну технологию'),
    contact: s.enum(['phone', 'email'], 'Как с вами связаться?'),
    services: s.array().min(1, 'Выберите хотя бы одну услугу'),
    files: s
      .files()
      .max(3)
      .maxSize(5 * 1024 * 1024)
      .accept(['image/*', '.pdf'])
      .optional(),
    message: s.string().max(500).optional(),
    qty: s.number().int().min(1).max(10),
    consent,
  })
  .refine((d) => d.contact !== 'email' || Boolean(d.email), { path: 'email', message: 'Укажите e-mail для связи' })

registerSchema('callback', callbackSchema)
registerSchema('uikit', uikitSchema)
