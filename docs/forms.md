# Формы

Модуль `form` + библиотека `kit/js/form`: проверка как в **react-hook-form + zod**, маски,
поля (файлы, пароль, счётчик, степпер), отправка без перезагрузки, ошибки с сервера под полями.

## Минимальная форма

```html
<form data-module="form" data-form-ajax data-form-schema="callback" action="/api/callback" method="post" novalidate>
  <label class="field">
    <span class="field__label">Имя</span>
    <input class="field__input" name="name" autocomplete="name" />
  </label>
  <label class="field">
    <span class="field__label">Телефон</span>
    <input class="field__input" name="phone" type="tel" data-mask="phone" autocomplete="tel" />
  </label>
  <include src="consent.html"></include>
  <button class="btn" type="submit">Отправить</button>
  <p data-form-status role="status"></p>
</form>
```

```js
// src/forms/schemas.js (подключён в main.js до запуска модулей)
import { registerSchema, s } from 'kit/js/form/index.js'

registerSchema(
  'callback',
  s.object({
    name: s.string().trim().min(2),
    phone: s.string().phone(),
    consent: s.boolean().isTrue('Нужно ваше согласие'),
  }),
)
```

Ошибка появляется под полем: модуль сам создаёт `<p class="field__error">` в ближайшем
`[data-field]` или `.field` (для группы чекбоксов/радио — в `<fieldset>`). Своё место для
ошибки — элемент `[data-form-error]` внутри поля.

## Схемы (как zod)

| Схема              | Методы                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `s.string()`       | `.trim() .min(n) .max(n) .length(n) .email() .url() .phone() .inn() .snils() .regex(re, msg) .equals('поле', msg)` |
| `s.number()`       | `.min(n) .max(n) .int() .positive()` — строка «1 500,5» приводится к 1500.5                                        |
| `s.boolean()`      | `.isTrue(msg)` — для согласия                                                                                      |
| `s.date()`         | `.min(дата) .max(дата) .minAge(лет)` — «ДД.ММ.ГГГГ» и «ГГГГ-ММ-ДД», `'today'`                                      |
| `s.enum([…], msg)` | радио, select                                                                                                      |
| `s.array(item?)`   | `.min(n) .max(n)` — группа чекбоксов (`name="services[]"`), select multiple                                        |
| `s.files()`        | `.min(n) .max(n) .maxSize(байт) .accept(['image/*', '.pdf'])`                                                      |
| `s.object({…})`    | `.refine(fn, { path, message }) .omit([…]) .extend({…}) .safeParse() .parse()`                                     |

Общее для всех: `.optional()`, `.default(v)`, `.required(msg)`, `.refine(fn, msg)`, `.transform(fn)`.
Все тексты ошибок по умолчанию — по-русски, со склонениями («Минимум 2 символа», «5 символов»).
Каждый метод возвращает новую схему: `const phone = s.string().phone()` можно переиспользовать.

```js
const schema = s
  .object({
    password: s.string().min(8).regex(/\d/, 'Нужна цифра'),
    confirm: s.string().equals('password', 'Пароли не совпадают'),
    from: s.date(),
    to: s.date(),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, { path: 'to', message: 'Дата «по» раньше даты «с»' })

schema.safeParse(values) // { success, data, errors: { поле: 'текст' } }
```

**Уже есть zod?** Модуль примет zod-схему как есть (нужен метод `safeParse`):
`registerSchema('callback', z.object({…}))`.

**Без схемы** правила берутся из HTML: `required`, `type="email"`, `minlength`, `maxlength`,
`pattern`, `min`, `max`. Тексты — русские; свои — `data-error-required`, `data-error-type`,
`data-error-pattern`, `data-error-length`, `data-error-range`, `data-error-mask`.
Поля, которых нет в схеме, тоже проверяются по HTML.

## Когда показывать ошибки (mode)

`data-form-mode`:

| mode                       | Поведение                                              |
| -------------------------- | ------------------------------------------------------ |
| `onTouched` (по умолчанию) | первый раз — при уходе с поля, дальше — на каждый ввод |
| `onBlur`                   | при уходе с поля                                       |
| `onChange`                 | на каждый ввод (агрессивно — для коротких форм)        |
| `onSubmit`                 | только при отправке                                    |
| `all`                      | и при вводе, и при уходе                               |

После первой попытки отправки все поля проверяются на каждый ввод — ошибка исчезает, как
только исправили. При вводе перепроверяются и другие поля с ошибками («пароли не совпадают»).

## Отправка

| Как                               | Что происходит                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `data-form-ajax`                  | `fetch(action, FormData)` — файлы тоже уходят. Ответ JSON `{ message }` → статус |
| `ctx.options.onSubmit` (JS/React) | ваша функция получает приведённые данные: `(data, api) => …`                     |
| ничего                            | обычная отправка браузером (если всё верно)                                      |

**Ошибки с сервера** под полями: ответ 4xx `{ "errors": { "email": "Занят" } }` (или формат
Laravel `{ "email": ["Занят"] }`). Из `onSubmit` — выбросите ошибку с полем `errors`.
Ошибка с сервера держится, пока значение поля не изменят.

События на `<form>`: `form:invalid`, `form:submit` (можно отменить `preventDefault()` и
отправить по-своему, данные в `event.detail.data`), `form:success`, `form:error`.

```js
form.addEventListener('form:success', () => ym(12345, 'reachGoal', 'callback')) // цель Метрики
```

## Защита от спама

`data-form-antispam` — две ловушки для ботов, без капчи и без неудобств людям:

```html
<form data-module="form" data-form-ajax data-form-antispam action="/api/callback" method="post">…</form>
```

- **Поле-ловушка** (`website`, имя меняется `data-form-antispam-field`): скрыто от людей и
  скринридера. Бот заполняет все поля подряд — заполнил ловушку, значит бот.
- **Время**: быстрее 2 секунд (`data-form-antispam-delay="2000"`) форму отправляет только бот.

Пойманной заявке показывается обычное «Спасибо», но запрос не уходит (событие `form:spam`).
Бот может слать запросы и мимо страницы, поэтому **проверяйте то же на сервере**: с каждой
заявкой приходят поле-ловушка и `form_time` (мс от показа формы до отправки).

### Куда отправлять заявки

Токен бота и пароль от почты нельзя класть во фронтенд — их увидит любой посетитель. Нужен
маленький обработчик на сервере. Два готовых варианта — скопируйте и впишите свои данные.

**PHP → Telegram** (любой хостинг: Beget, Timeweb, reg.ru) — `api/callback.php`,
у формы `action="/api/callback.php"`:

```php
<?php
header('Content-Type: application/json; charset=utf-8');
const BOT_TOKEN = '123456:ABC…';   // токен от @BotFather
const CHAT_ID   = '-1001234567890'; // куда слать (узнать: @userinfobot)

$name  = trim($_POST['name']  ?? '');
$phone = trim($_POST['phone'] ?? '');

// Антиспам: ловушка заполнена или форма отправлена быстрее 2 секунд — молча «успех».
if (($_POST['website'] ?? '') !== '' || (int)($_POST['form_time'] ?? 0) < 2000) {
  exit(json_encode(['message' => 'Спасибо!']));
}
if ($phone === '') {
  http_response_code(422);
  exit(json_encode(['errors' => ['phone' => 'Укажите телефон']]));
}

$text = "Заявка с сайта\nИмя: $name\nТелефон: $phone";
$ok = @file_get_contents('https://api.telegram.org/bot' . BOT_TOKEN . '/sendMessage?' . http_build_query([
  'chat_id' => CHAT_ID,
  'text'    => $text,
]));

if ($ok === false) {
  http_response_code(502);
  exit(json_encode(['message' => 'Не удалось отправить. Позвоните нам, пожалуйста.']));
}
echo json_encode(['message' => 'Спасибо! Перезвоним в течение часа.']);
```

**Serverless-функция** (Vercel / Netlify / Cloudflare) — `api/callback.js`:

```js
export default async function handler(request) {
  const form = await request.formData()
  if (form.get('website') || Number(form.get('form_time')) < 2000) return Response.json({ message: 'Спасибо!' })
  if (!form.get('phone')) return Response.json({ errors: { phone: 'Укажите телефон' } }, { status: 422 })

  const text = `Заявка с сайта\nИмя: ${form.get('name')}\nТелефон: ${form.get('phone')}`
  const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.CHAT_ID, text }),
  })
  if (!response.ok) return Response.json({ message: 'Не удалось отправить' }, { status: 502 })
  return Response.json({ message: 'Спасибо! Перезвоним в течение часа.' })
}
```

Формат ответов тот же, что у мока `mocks/callback.js`: `{ message }` при успехе,
`{ errors: { поле: 'текст' } }` с кодом 422 — ошибки появятся под полями.

## Маски

| `data-mask`                  | Вид                | Особенности                                                         |
| ---------------------------- | ------------------ | ------------------------------------------------------------------- |
| `phone`                      | +7 (912) 345-67-89 | «8…» и «+7…» при вставке — код страны; при фокусе показывает «+7 (» |
| `date`                       | 31.12.2025         | вместе с `s.date()`                                                 |
| `time`                       | 23:59              |                                                                     |
| `inn`                        | 10 или 12 цифр     | вместе с `.inn()` — проверка контрольной цифры                      |
| `snils`                      | 112-233-445 95     | вместе с `.snils()`                                                 |
| `postcode`                   | 6 цифр             |                                                                     |
| `passport`                   | 45 06 123456       |                                                                     |
| `number`                     | 1 500 000,50       | `data-mask-decimals="2"`                                            |
| `data-mask-pattern="AA-999"` | свой шаблон        | `9` цифра, `A` буква, `*` буква или цифра                           |

Незаполненная до конца маска — ошибка «Заполните полностью». Отправляется значение с маской
(как видит пользователь); нужны «чистые» цифры — `.transform((v) => v.replace(/\D/g, ''))` в схеме
или `getMask(input).unmask(value)`.

## Поля

Модули полей и их разметка — [modules.md](modules.md): `select` (кастомный селект с поиском и
мультивыбором), `file-upload`, `password`, `autosize`, `char-counter`, `stepper`. Классы оформления: `.field`, `.field__label`, `.field__input`,
`.field__hint`, `.field__error`, `.field__control` + `.field__action`, `.choice`, `.choice-group`.

## Языки

Тексты ошибок по умолчанию берутся из словарей кита на языке страницы (`<html lang>`):
на английской версии сайта форма сама говорит по-английски. Поменять текст на всех
языках сразу — `addMessages('ru', { kit: { schema: { required: '…' } } })`.
Подробно — [i18n.md](i18n.md).

## Значения формы

```js
import { formValues } from 'kit/js/form/index.js'
formValues(form) // { name: 'Иван', consent: true, services: ['seo'], files: [File], contact: 'email' }
```

## React

```jsx
const schema = s.object({ … })               // ВНЕ компонента
const OPTIONS = { schema, ajax: true }

function Callback() {
  const ref = useModule(form, OPTIONS)
  return <form ref={ref} action="/api/callback" noValidate>…</form>
}
```

Своя отправка: `useModule(form, { schema, onSubmit })`, где `onSubmit` — из `useCallback`
или вне компонента. Для сложных форм с зависимыми полями и пошаговыми мастерами в React
естественнее react-hook-form + zod — схемы `s.*` и zod там взаимозаменяемы по смыслу.
