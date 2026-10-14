# 8. Модуль формы

[kit/js/modules/form/index.js](../../kit/js/modules/form/index.js) — ~520 строк, самый большой
модуль кита. Идеи — в [главе 05](../learn/05-forms.md); здесь — как они устроены.

## Что это

Любая форма сайта: «Перезвоните», «Оставить отзыв», регистрация, оформление заказа.

## Что делает

- Проверяет поля по схеме (`s.object({…})` или zod) и/или по HTML-атрибутам (`required`, `type`).
- Показывает ошибки под полями в нужный момент (режимы как в react-hook-form).
- Подключает маски полей (`data-mask`).
- Отправляет через `fetch` или ваш `onSubmit`; блокирует повторную отправку.
- Показывает ошибки сервера под полями и держит их, пока значение не изменят.
- Ловит спам-ботов без капчи.
- Связывает поле и ошибку для скринридера.

## Как устроен файл

```
form(el, ctx)
├── настройки, схема, состояние: touched, errors, manual, submitted, busy
├── поля: elements(), keys(), keyOf()
├── маски: attachMask на каждое [data-mask]
├── показ ошибок: errorBox(), show()
├── проверка: nativeMessage(), validateKey(), validateAll()
├── события полей: input/change, focusin, focusout
├── сброс: reset
├── антиспам: ловушка и время
├── отправка: lock(), send(), submit
└── api: getValues, validate, setErrors, submit, destroy…
```

## Код по частям

### Состояние

```js
const touched = new Set() // поля, с которых уже уходили (для режима onTouched)
let errors = {} // поле → текущий текст ошибки
const manual = new Map() // поле → значение, при котором ошибку поставил СЕРВЕР
let submitted = false // была ли попытка отправки
let busy = false // идёт запрос
```

Всё, что модуль должен помнить между событиями. Каждое объяснено ниже по месту использования.

### Поля формы

```js
const elements = () =>
  Array.from(el.elements).filter(
    (f) =>
      f.name && !f.disabled && !SKIP_TYPES.includes(f.type) && f.tagName !== 'FIELDSET' && !('formIgnore' in f.dataset),
  )
const keyOf = (field) => field.name.replace(/\[\]$/, '')
const keys = () => [...new Set(elements().map(keyOf))]
```

- `el.elements` — встроенный список всех полей формы (включая те, что стоят вне `<form>`, но с
  атрибутом `form="id"`).
- Пропускаем поля без имени, отключённые, кнопки, `hidden` и служебные (`data-form-ignore` —
  ловушка антиспама).
- `keyOf` — `services[]` → `services`: так называют группы чекбоксов в PHP-бэкендах.
- `keys()` — уникальные имена: пять чекбоксов `services` — одно поле.
- Это **функции**, а не переменные: поля могут появиться позже (шаг «Адрес доставки»
  показался при выборе «Курьер»).

### Где показать ошибку

```js
function errorBox(key) {
  const [first, ...rest] = fieldsByName(el, key)
  if (!first) return null
  const group = rest.length > 0
  const wrap =
    first.closest('[data-field]') ??
    (group ? first.closest('fieldset') : null) ??
    first.closest('.field') ??
    first.parentElement
  let box = wrap.querySelector('[data-form-error]')
  if (!box) {
    box = document.createElement('p')
    box.className = 'field__error'
    box.setAttribute('data-form-error', '')
    wrap.append(box)
  }
  box.id ||= `${ensureId(first, 'field')}-error`
  return box
}
```

Порядок поиска обёртки — «самое явное первым»: свой `[data-field]` → `fieldset` для группы
(ошибка «Выберите хотя бы одну» под всей группой, а не под первым флажком) → `.field` →
просто родитель. Элемент для текста создаётся, только если его нет в разметке: можно
поставить свой `<p data-form-error>` в нужное место.

`box.id ||= …` — оператор «присвоить, если пусто».

### Показать или убрать ошибку

```js
function show(key, message) {
  if (message) errors[key] = message
  else delete errors[key]
  const box = errorBox(key)
  if (!box) return
  box.textContent = message
  if (message) box.setAttribute('role', 'alert')
  else box.removeAttribute('role')
  for (const field of fieldsByName(el, key)) {
    field.setAttribute('aria-invalid', String(Boolean(message)))
    const described = new Set((field.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean))
    if (message) described.add(box.id)
    else described.delete(box.id)
    if (described.size) field.setAttribute('aria-describedby', [...described].join(' '))
    else field.removeAttribute('aria-describedby')
    field.closest('[data-field], .field')?.classList.toggle('is-invalid', Boolean(message))
  }
}
```

Самая аккуратная часть — `aria-describedby`. У поля **уже может быть** своё описание (подсказка
«Пароль — от 8 символов» с `id="pass-hint"`). Если просто перезаписать атрибут id ошибки,
подсказка пропадёт для скринридера. Поэтому атрибут разбирается в `Set`, id ошибки добавляется
или убирается, остальное остаётся.

`role="alert"` ставится вместе с текстом: появление «алерта» с текстом скринридер зачитывает
сразу, не дожидаясь, пока человек дойдёт до поля.

### Проверить одно поле

```js
function validateKey(key) {
  const current = JSON.stringify(formValues(el)[key] ?? null)
  if (manual.has(key)) {
    if (manual.get(key) === current) return errors[key] ?? ''
    manual.delete(key)
  }
  let message
  if (inSchema(key)) {
    const values = formValues(el)
    const result = schema.shape && !schema._def ? schema.safeParse(values, { only: key }) : schema.safeParse(values)
    message = pickError(result, key)
  } else message = nativeMessage(key)
  show(key, message)
  return message
}
```

Три шага:

1. **Ошибка сервера держится.** Сервер сказал «e-mail занят» при значении `a@b.ru` — модуль
   запомнил это значение в `manual`. Пока в поле `a@b.ru`, ошибка остаётся, даже если клиентская
   проверка проходит. Изменили — ошибка снята, работает обычная проверка.
   `JSON.stringify` — чтобы сравнивать и строки, и массивы (группа чекбоксов) одинаково.
2. **Есть в схеме** — проверить схемой. Своя схема умеет проверять одно поле (`{ only: key }`) **с
   учётом остальных** (для «пароли совпадают»). У zod такого нет — проверяем всю форму и берём
   ошибку нужного поля. `schema._def` — признак zod-схемы.
3. **Нет в схеме** — проверить HTML-атрибутами (`nativeMessage`): `required`, `minlength`,
   `type="email"`, `pattern` и недозаполненная маска. Тексты — по-русски, свои — через
   `data-error-required`, `data-error-pattern` и т. д.

### Когда проверять

```js
const shouldValidateOnChange = (key) =>
  submitted ||
  options.mode === 'onChange' ||
  options.mode === 'all' ||
  (options.mode === 'onTouched' && touched.has(key))

const onValueChange = (event) => {
  const field = event.target
  if (!field.name || !field.form || field.form !== el) return
  const key = keyOf(field)
  if (shouldValidateOnChange(key)) validateKey(key)
  Object.keys(errors)
    .filter((other) => other !== key && other !== '_')
    .forEach(validateKey)
}
d.listen(el, 'input', onValueChange)
d.listen(el, 'change', onValueChange)
```

- `field.form !== el` — событие от поля **вложенной** формы (в разметке так нельзя, но через
  `form="id"` бывает) — не наше.
- Слушаем и `input` (каждая буква), и `change` (флажки, селекты, выбор файла).
- **Перепроверка полей с ошибками** — «Пароли не совпадают» висит под вторым полем, исправили
  первое — ошибка должна уйти. `'_'` — общая ошибка формы, у неё нет поля.

```js
d.listen(el, 'focusout', (event) => {
  const field = event.target
  if (!field.name || field.form !== el) return
  const mask = getMask(field)
  if (mask && !mask.unmask(field.value)) field.value = ''
  const key = keyOf(field)
  if (event.relatedTarget?.name === field.name) return
  if (['onBlur', 'onTouched', 'all'].includes(options.mode) || submitted) {
    touched.add(key)
    validateKey(key)
  }
})
```

- `focusout`, а не `blur`: `blur` не всплывает, его пришлось бы вешать на каждое поле.
  `focusout` всплывает до формы — один обработчик.
- Маска телефона при фокусе ставит `+7 (`. Ушли, ничего не введя, — стираем, иначе пустое поле
  выглядит заполненным, и `required` не сработает.
- **`event.relatedTarget?.name === field.name`** — фокус ушёл на соседний флажок **той же группы**.
  Это не «ушёл с поля»: человек ещё выбирает. Без этой строки ошибка «Выберите хотя бы одну»
  выскочила бы после первого же Tab внутри группы.

### Сброс

```js
d.listen(el, 'reset', () => {
  setTimeout(() => {
    touched.clear()
    manual.clear()
    submitted = false
    keys().forEach((key) => show(key, ''))
    errors = {}
    elements().forEach((f) => f.dispatchEvent(new Event('change', { bubbles: true })))
    keys().forEach((key) => show(key, ''))
    errors = {}
    if (!keepStatus) setStatus('')
    keepStatus = false
  })
})
```

- `setTimeout(…)` без задержки — событие `reset` приходит **до** очистки полей. Ждём один тик,
  когда значения уже сброшены.
- `change` на каждое поле — кастомные поля (красивый селект, загрузка файлов) перерисовываются
  по этому событию. Без него селект показывал бы старый выбор.
- Ошибки чистятся **дважды**: разосланные `change` запускают перепроверку и могли снова
  навесить ошибки. Второй проход — окончательный.
- `keepStatus` — после успешной отправки форма сбрасывается, но «Спасибо!» должно остаться.

### Антиспам

```js
if (options.antispam) {
  const wrap = document.createElement('div')
  wrap.setAttribute('aria-hidden', 'true')
  wrap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden'
  trap = document.createElement('input')
  trap.type = 'text'
  trap.name = options.antispamField // 'website' — правдоподобное имя
  trap.tabIndex = -1
  trap.autocomplete = 'off'
  trap.dataset.formIgnore = ''
  timeField = document.createElement('input')
  timeField.type = 'hidden'
  timeField.name = 'form_time'
  wrap.append(trap, timeField)
  el.append(wrap)
  d.add(() => wrap.remove())
}
const isSpam = () => Boolean(trap) && (trap.value !== '' || Date.now() - shownAt < options.antispamDelay)
```

| Деталь                                | Зачем                                                                 |
| ------------------------------------- | --------------------------------------------------------------------- |
| `left: -9999px`, а не `display: none` | боты научились пропускать невидимые поля; за экраном — «видимое»      |
| `aria-hidden`                         | скринридер не предложит человеку заполнить ловушку                    |
| `tabIndex = -1`                       | Tab не попадёт в неё                                                  |
| `autocomplete = 'off'`                | автозаполнение браузера не вставит туда сайт человека                 |
| имя `website`                         | бот заполняет поля с «понятными» именами; `honeypot` он бы узнал      |
| `form_time`                           | сколько мс прошло от показа до отправки — сервер может проверить тоже |

### Отправка

```js
  d.listen(el, 'submit', async (event) => {
    submitted = true
    const result = validateAll()
    if (!result.success) {
      event.preventDefault()
      setStatus(result.errors._ ?? (options.invalid || t('kit.form.invalid')), 'error')
      focusFirstError()
      el.dispatchEvent(new CustomEvent('form:invalid', { bubbles: true, detail: { errors: result.errors } }))
      return
    }
```

Ошибки — остановить отправку, написать общий статус, **перевести фокус на первое неверное
поле** (на телефоне оно могло быть за экраном), сообщить событием.

```js
const proceed = el.dispatchEvent(
  new CustomEvent('form:submit', { bubbles: true, cancelable: true, detail: { data: result.data } }),
)
if (!proceed) return event.preventDefault()
```

`cancelable: true` + `dispatchEvent` возвращает `false`, если кто-то вызвал `preventDefault()`.
Так внешний код может сказать «стоп» — например, показать подтверждение.

```js
if (timeField) timeField.value = String(Date.now() - shownAt)
if (isSpam()) {
  event.preventDefault()
  el.dispatchEvent(new CustomEvent('form:spam', { bubbles: true }))
  setStatus(options.success || t('kit.form.success'), 'success')
  return
}
if (!options.ajax && !onSubmit) return
```

Бот получает «Спасибо», заявка не уходит. Без `ajax` и `onSubmit` — обычная отправка браузером
(страница перезагрузится) — так работают формы в CMS.

```js
    event.preventDefault()
    if (busy) return
    lock(true)
    setStatus('')
    try {
      const payload = (await send(result.data)) ?? {}
      el.dispatchEvent(new CustomEvent('form:success', { bubbles: true, detail: payload }))
      ctx.bus?.emit('form:success', { form: el, data: payload })
      if (options.resetOnSuccess) { keepStatus = true; el.reset() }
      shownAt = Date.now()
      if (successBox) successBox.hidden = false
      setStatus(payload.message ?? (options.success || t('kit.form.success')), 'success')
    } catch (error) {
      const fieldErrors = error.errors ?? serverErrors(error.payload)
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors)
      el.dispatchEvent(new CustomEvent('form:error', { bubbles: true, detail: error }))
      setStatus(error.payload?.message ?? …, 'error')
    } finally {
      lock(false)
    }
  })
```

- `if (busy) return` + `lock(true)` — двойной клик не отправит две заявки. `lock` ставит
  кнопкам `disabled` и `aria-busy`, форме — `is-loading`.
- `finally` — разблокировать **в любом случае**: и при успехе, и при ошибке. Без `finally` после
  ошибки сети кнопка осталась бы заблокированной.
- `shownAt = Date.now()` — новый отсчёт для антиспама: вторая заявка из той же формы.
- Ошибки сервера: `error.errors` (из своего `onSubmit`) или из ответа (`serverErrors` понимает и
  `{ errors: { phone: '…' } }`, и формат Laravel `{ errors: { phone: ['…'] } }`).

### `send` — куда отправлять

```js
async function send(data) {
  if (onSubmit) return onSubmit(data, api)
  const response = await fetch(el.action, {
    method: (el.getAttribute('method') ?? 'post').toUpperCase(),
    body: new FormData(el),
    headers: { Accept: 'application/json' },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(payload.message ?? response.statusText), { payload })
  return payload
}
```

- `onSubmit` из JS/React — ваш код решает сам (например, GraphQL-мутация).
- `new FormData(el)` — все поля, **включая файлы**, в формате `multipart/form-data`.
- `el.getAttribute('method')`, а не `el.method`: свойство `method` всегда вернёт `'get'`, если
  атрибута нет, а нам по умолчанию нужен POST.
- `.catch(() => ({}))` — сервер ответил не JSON (страница ошибки nginx) — не падаем.
- `fetch` **не бросает** ошибку на 4xx/5xx — только на обрыв сети. Проверяем `response.ok` сами.

## Что будет, если…

| Убрать                                          | Что сломается                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `manual`                                        | «e-mail занят» пропадает при уходе с поля, хотя ничего не исправили |
| перепроверку полей с ошибками в `onValueChange` | исправили пароль — «не совпадают» висит под повтором                |
| `relatedTarget?.name === field.name`            | ошибка группы флажков после первого Tab                             |
| `finally { lock(false) }`                       | после сбоя сети кнопка «Отправить» заблокирована навсегда           |
| `setTimeout` в `reset`                          | ошибки чистятся до сброса значений — и тут же появляются снова      |
| слияние `aria-describedby`                      | подсказка поля пропадает для скринридера при появлении ошибки       |

## Проверьте себя

1. Почему `focusout`, а не `blur`?
2. Сервер вернул `{ errors: { email: ['Занят', 'Слишком длинный'] } }`. Что покажется под полем?
3. Как из своего кода отправить форму с проверкой?

<details>
<summary>Ответы</summary>

1. `blur` не всплывает — пришлось бы вешать обработчик на каждое поле (и на добавленные позже).
   `focusout` всплывает до формы.
2. «Занят» — `serverErrors` берёт первый элемент массива.
3. `api.submit()` — внутри `el.requestSubmit()`: в отличие от `el.submit()`, он вызывает событие
   `submit`, и проверка проходит как при нажатии кнопки.

</details>
