# 5. Модальное окно

[kit/js/modules/dialog/index.js](../../kit/js/modules/dialog/index.js)

## Что это

Окна «Заказать звонок», «Политика конфиденциальности», галерея на весь экран. Окно поверх
страницы, страница под ним затемнена и не прокручивается.

## Что делает

- Открывается кнопкой `data-dialog-open="id"`, ссылкой `href="#id"` или адресом `…#id`.
- Закрывается крестиком, Esc, кликом по затемнению, кнопкой «Назад» на телефоне.
- Плавно появляется **и плавно исчезает** (нативный `<dialog>` исчезает мгновенно).
- Блокирует прокрутку страницы без «прыжка» вёрстки.
- Возвращает фокус на кнопку, которая открыла окно.
- Шлёт `dialog:open` / `dialog:close`.

## Как пользоваться

```html
<button data-dialog-open="callback">Заказать звонок</button>
<a href="#callback">или ссылкой</a>

<dialog id="callback" class="dialog" data-module="dialog" aria-labelledby="callback-title">
  <div class="dialog__box">
    <button class="dialog__close" data-dialog-close aria-label="Закрыть">×</button>
    <h2 id="callback-title">Заказать звонок</h2>
    …
  </div>
</dialog>
```

`aria-labelledby` — скринридер при открытии скажет «диалог „Заказать звонок“».

## Почему `<dialog>`, а не `<div>`

`dialog.showModal()` даёт бесплатно:

| Что нужно                      | На `<div>`                 | На `<dialog>`                                |
| ------------------------------ | -------------------------- | -------------------------------------------- |
| поверх всего                   | `z-index: 9999` и надежда  | верхний слой браузера, выше любого `z-index` |
| Tab не уходит под окно         | ловушка фокуса, ~60 строк  | страница под окном становится `inert` сама   |
| Esc закрывает                  | обработчик `keydown`       | встроено (событие `cancel`)                  |
| затемнение                     | отдельный `div`            | псевдоэлемент `::backdrop`                   |
| скринридер понимает «это окно» | `role="dialog" aria-modal` | встроено                                     |

Чего `<dialog>` **не** умеет, и что добавляет модуль: блокировка прокрутки, анимация закрытия,
закрытие по затемнению, открытие по кнопкам и адресу, связь с «Назад».

## Код по частям

### Проверки и состояние

```js
export default function dialog(el, ctx = {}) {
  if (el.tagName !== 'DIALOG') throw new Error('[kit] dialog: модуль ставится на элемент <dialog>')
  if (!el.id) console.warn('[kit] dialog: без id не получится открыть окно кнопкой [data-dialog-open]', el)

  const options = readOptions(el, 'dialog', DEFAULTS, ctx.options)
  const d = createDisposer()
  const box = el.querySelector('.dialog__box')
  if (box instanceof HTMLElement) d.add(attachScrollbar(box))
  let opener = null      // кто открыл — вернуть ему фокус
  let closing = null     // таймер анимации закрытия (null — не закрываемся)
  let locked = false     // заблокировали ли МЫ прокрутку
  let pushed = false     // добавили ли МЫ запись в историю
  const useHash = options.hash && Boolean(el.id)
```

Четыре флажка — это и есть «состояние» окна. Каждый отвечает на вопрос «что **я** сделал и что
мне придётся отменить».

### Открыть

```js
function open(trigger, { fromUrl = false } = {}) {
  if (el.open && !closing) return
  if (closing) finishClose()
  opener = trigger ?? document.activeElement
  el.showModal()
  if (useHash && !fromUrl && getHash() !== el.id) {
    setHash(el.id, { push: true })
    pushed = true
  }
  if (!locked) {
    lockScroll()
    locked = true
  }
  el.dispatchEvent(new CustomEvent('dialog:open', { bubbles: true }))
}
```

- **Уже открыто** — ничего не делаем. Без этой строки повторный `open()` вызвал бы
  `lockScroll()` второй раз, и после закрытия прокрутка осталась бы заблокированной (счётчик
  блокировок не обнулился бы).
- **Открыли во время анимации закрытия** — сначала мгновенно закрыть до конца, потом открыть
  заново. Иначе окно осталось бы с классом `is-closing`.
- **`opener`** — запоминаем, где был фокус. Если открыли из JS без кнопки — текущий
  `activeElement`.
- **`setHash(el.id, { push: true })`** — добавить `#callback` в адрес **новой записью** истории.
  Тогда «Назад» снимет именно её — окно закроется, а не уйдёт со страницы.
- Если окно открыто **по адресу** (`fromUrl`) — запись уже есть, добавлять не нужно.

### Закрыть — с анимацией

```js
function close() {
  if (!el.open || closing) return
  el.classList.add('is-closing')
  const done = () => {
    el.removeEventListener('animationend', done)
    if (closing) finishClose()
  }
  el.addEventListener('animationend', done)
  closing = setTimeout(done, ctx.reduced ? 0 : options.closeTimeout)
}

function finishClose() {
  clearTimeout(closing)
  closing = null
  el.classList.remove('is-closing')
  el.close()
}
```

`el.close()` убирает окно **мгновенно** — анимации исчезновения не видно. Поэтому:

1. ставим класс `is-closing` — CSS запускает анимацию исчезновения;
2. ждём `animationend` — «анимация закончилась»;
3. только тогда настоящий `el.close()`.

**Страховка `setTimeout`** — если у окна нет CSS-анимации (переопределили стили, «меньше
движения»), `animationend` не придёт **никогда**, и окно не закроется. Таймер закроет его через
`closeTimeout` (400 мс) в любом случае. Кто первым — тот и закрывает, второй увидит
`closing === null` и ничего не сделает.

### Нативное событие `close` — уборка за окном

```js
d.listen(el, 'close', () => {
  if (locked) {
    unlockScroll()
    locked = false
  }
  if (opener?.isConnected) opener.focus?.({ preventScroll: true })
  opener = null
  if (useHash && getHash() === el.id) {
    if (pushed) history.back()
    else setHash('')
  }
  pushed = false
  el.dispatchEvent(new CustomEvent('dialog:close', { bubbles: true, detail: { returnValue: el.returnValue } }))
})
```

Браузер шлёт `close` при **любом** закрытии — нашим `close()`, формой с `method="dialog"`, чужим
кодом. Поэтому уборка здесь, а не в `close()`:

- разблокировать прокрутку, если блокировали **мы**;
- вернуть фокус (`isConnected` — кнопку могли удалить, пока окно было открыто;
  `preventScroll` — не прокручивать к ней страницу);
- убрать `#callback` из адреса. Если запись добавили мы — `history.back()` её снимет (и «Назад»
  после этого поведёт куда надо). Если окно открыли по ссылке извне, записи «до» нет —
  `back()` увёл бы со страницы, поэтому просто стираем хеш.

### Esc, крестик, затемнение

```js
d.listen(el, 'cancel', (event) => {
  event.preventDefault()
  close()
})
```

Esc вызывает событие `cancel`, и браузер закрыл бы окно мгновенно. `preventDefault()` отменяет
это, и мы закрываем сами — с анимацией.

```js
d.listen(el, 'click', (event) => {
  if (event.target.closest('[data-dialog-close]')) return close()
  if (options.closeOnBackdrop && event.target === el) close()
})
```

Как отличить клик по затемнению от клика по содержимому? Хитрость в CSS: у `<dialog>` нет
`padding`, а фон есть только у `.dialog__box`. Клик по затемнению попадает в **сам** `<dialog>`
(`event.target === el`), клик по содержимому — во что-то внутри `.dialog__box`.

### Открытие кнопками в любом месте страницы

```js
if (el.id) {
  const id = CSS.escape(el.id)
  d.add(
    delegate(document, 'click', `[data-dialog-open="${id}"], a[href="#${id}"]`, (event, trigger) => {
      event.preventDefault()
      open(trigger)
    }),
  )
}
```

- Слушаем **весь документ** — кнопка может быть в шапке, в подвале, в подгруженной позже карточке.
- `CSS.escape` — `id` с точкой или цифрой в начале (`1st-step`) сломал бы селектор.
- `preventDefault()` — ссылка `href="#callback"` иначе прыгнула бы к окну прокруткой.

### Синхронизация с адресом

```js
if (useHash) {
  const sync = () => {
    const wanted = getHash() === el.id
    if (wanted && (!el.open || closing)) open(null, { fromUrl: true })
    else if (!wanted && el.open) {
      pushed = false
      close()
    }
  }
  d.listen(window, 'popstate', sync)
  d.listen(window, 'hashchange', sync)
  if (getHash() === el.id) open(null, { fromUrl: true })
}
```

Сценарий «Назад» на телефоне:

```mermaid
sequenceDiagram
    actor Человек
    participant Окно
    participant История
    Человек->>Окно: нажал «Заказать звонок»
    Окно->>История: pushState(#callback)
    Человек->>История: жест «Назад»
    История-->>Окно: popstate, хеша нет
    Окно->>Окно: pushed = false; close()
    Note over Окно: history.back() второй раз не делаем — запись уже снята
```

`pushed = false` перед `close()` — важно: запись истории уже снял **браузер**. Если бы флажок
остался `true`, обработчик `close` вызвал бы `history.back()` ещё раз — и человек улетел бы на
предыдущую страницу.

### Уборка модуля

```js
d.add(() => {
  clearTimeout(closing)
  if (el.open) el.close()
  if (locked) unlockScroll()
})
```

Модуль уничтожили при открытом окне (ушли со страницы в SPA) — закрыть окно и отпустить
прокрутку. Иначе страница осталась бы заблокированной навсегда.

## Блокировка прокрутки: почему счётчик

[kit/js/core/scroll-lock.js](../../kit/js/core/scroll-lock.js):

```js
let locks = 0
export function lockScroll() {
  locks += 1
  if (locks > 1) return
  const width = window.innerWidth - document.documentElement.clientWidth
  root.style.setProperty('--scrollbar-width', `${width}px`)
  root.classList.add('is-scroll-locked')
  engine?.stop?.()
}
```

- **Счётчик**, а не флажок: меню блокирует прокрутку, из меню открыли модалку (блок №2),
  модалку закрыли — меню всё ещё открыто, прокрутка должна остаться заблокированной.
  Разблокируем, когда `locks` вернётся к нулю.
- **`--scrollbar-width`** — при `overflow: hidden` полоса прокрутки исчезает, и страница
  «прыгает» вправо на 15px. Ширину полосы подставляем как `padding-right`.
- **`engine.stop()`** — Lenis не слушается `overflow: hidden`, его надо остановить отдельно.

## Что будет, если…

| Убрать                                     | Что сломается                                                        |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `if (el.open && !closing) return` в `open` | двойной `open()` — прокрутка остаётся заблокированной после закрытия |
| таймер-страховку в `close`                 | окно без CSS-анимации никогда не закроется                           |
| `event.preventDefault()` в `cancel`        | Esc закрывает мгновенно, без анимации                                |
| `pushed = false` в `sync`                  | «Назад» закрывает окно **и** уводит на прошлую страницу              |
| уборку `unlockScroll` в `d.add`            | ушли со страницы с открытым окном — страница не прокручивается       |

## Проверьте себя

1. Почему уборка (`unlockScroll`, фокус, хеш) в обработчике `close`, а не в функции `close()`?
2. Окно открыли по ссылке `site.ru/#callback` из письма. Человек закрыл крестиком. Что будет
   с адресом и почему не `history.back()`?
3. Как открыть окно из своего модуля?

<details>
<summary>Ответы</summary>

1. Окно закрывается не только нашим `close()`: форма с `method="dialog"`, чужой код с
   `el.close()`. Событие `close` браузер шлёт при любом закрытии.
2. Хеш сотрётся (`setHash('')`), человек останется на странице. `back()` увёл бы туда, откуда
   пришли (в почту), потому что запись `#callback` создали не мы.
3. `const dialog = await ctx.modules.when('#callback', 'dialog'); dialog.open()` — или просто
   кнопка с `data-dialog-open="callback"`.

</details>
