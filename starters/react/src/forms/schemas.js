/**
 * Схемы форм React-проекта. Объявлены ВНЕ компонентов: useModule сравнивает
 * объекты в опциях по ссылке — схема, созданная внутри компонента, заново
 * создавалась бы на каждый рендер и перезапускала модуль формы.
 * Методы схем: kit/js/form/schema.js, docs/forms.md.
 */
import { s } from 'kit/js/form/index.js'

export const callbackSchema = s.object({
  name: s.string().trim().min(2, 'Как к вам обращаться? Минимум 2 буквы'),
  phone: s.string().phone(),
  consent: s.boolean().isTrue('Нужно ваше согласие на обработку данных'),
})
