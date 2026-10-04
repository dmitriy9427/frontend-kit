/**
 * Схемы форм. Тексты ошибок по умолчанию — на языке страницы (<html lang>):
 * на /en/ — по-английски. Свой текст можно задать на всех языках:
 *   .min(2, () => (document.documentElement.lang === 'en' ? 'Too short' : 'Слишком коротко'))
 */
import { registerSchema, s } from 'kit/js/form/index.js'

registerSchema(
  'callback',
  s.object({
    name: s.string().trim().min(2),
    phone: s.string().phone(),
    consent: s.boolean().isTrue(),
  }),
)
