# 6. Табы

[kit/js/modules/tabs/index.js](../../kit/js/modules/tabs/index.js)

## Что это

Вкладки: «Описание / Характеристики / Отзывы» на странице товара, тарифы «Месяц / Год».

## Что делает

- Клик по вкладке показывает её панель, остальные прячет.
- Расставляет роли и связи ARIA сам — в разметке их писать не нужно.
- Стрелки ←/→ (по кругу), Home, End переключают вкладки.
- Пишет открытую вкладку в адрес: `/product?tab=reviews` — после перезагрузки или по ссылке
  откроется та же.
- Плавно меняет высоту, если панели разной высоты: контент ниже не «прыгает».

## Как пользоваться

```html
<div class="tabs" data-module="tabs" id="product">
  <div class="tabs__list" data-tabs-list>
    <button class="tabs__tab" data-tabs-tab>Описание</button>
    <button class="tabs__tab" data-tabs-tab data-tabs-value="reviews">Отзывы</button>
  </div>
  <div class="tabs__panel" data-tabs-panel>…</div>
  <div class="tabs__panel" data-tabs-panel>…</div>
</div>
```

| Настройка            | По умолчанию       | Зачем                             |
| -------------------- | ------------------ | --------------------------------- |
| `data-tabs-active`   | `0`                | открытая при загрузке             |
| `data-tabs-url`      | `true`             | хранить вкладку в адресе          |
| `data-tabs-param`    | id корня или `tab` | имя параметра: `?product=reviews` |
| `data-tabs-animate`  | `true`             | плавная смена высоты              |
| `data-tabs-duration` | `350`              | длительность, мс                  |

## Код по частям

### Разметить ARIA

```js
list?.setAttribute('role', 'tablist')
tabsEls.forEach((tab, i) => {
  const panel = panels[i]
  tab.setAttribute('role', 'tab')
  if (tab.tagName === 'BUTTON') tab.type = 'button'
  if (!panel) return
  tab.setAttribute('aria-controls', ensureId(panel, 'tab-panel'))
  panel.setAttribute('role', 'tabpanel')
  panel.setAttribute('aria-labelledby', ensureId(tab, 'tab'))
  panel.tabIndex = 0
})
```

- Роли `tablist` / `tab` / `tabpanel` — скринридер скажет «вкладка 2 из 3, „Отзывы“, выбрана».
- `tab.type = 'button'` — вкладки внутри формы (калькулятор с табами) иначе отправляли бы её.
- `panel.tabIndex = 0` — на панель можно попасть Tab-ом. По рекомендациям WAI-ARIA: из вкладок
  Tab ведёт **в содержимое**, даже если в нём нет ни одной ссылки.

### Значение вкладки в адресе

```js
const param = options.param || root.id || 'tab'
const valueOf = (i) => tabsEls[i]?.dataset.tabsValue || panels[i]?.id || String(i + 1)
const indexOf = (value) => tabsEls.findIndex((_, i) => valueOf(i) === value)
```

Цепочка «что первое есть»: своё значение → `id` панели → номер с единицы. Ссылка
`?tab=reviews` читается человеком, `?tab=2` — тоже работает.

```js
if (options.url) {
  if (usedParams.has(param)) {
    console.warn(`[kit] tabs: параметр адреса «${param}» уже занят другими табами — задайте data-tabs-param`, root)
  }
  usedParams.add(param)
  d.add(() => usedParams.delete(param))
}
```

Две группы табов на странице с одним `?tab=` перебивали бы друг друга. `usedParams` — общий
на весь файл набор (вне функции модуля), поэтому второй экземпляр увидит занятое имя.

### `select` — единственное место смены вкладки

```js
  function select(index, { focus = false, emit = true } = {}) {
    if (index < 0 || index >= tabsEls.length || index === current) return
    const animate = emit && current >= 0 && options.animate && typeof root.animate === 'function' && !reduced()
```

Анимировать, только если **всё** сразу: это действие пользователя (`emit`), не первый выбор
(`current >= 0`), анимация не выключена, браузер умеет `element.animate`, человек не просил
меньше движения.

```js
running.forEach((animation) => animation.cancel())
running = []
const before = animate ? root.offsetHeight : 0
```

**Сначала отменить прошлую анимацию.** Человек быстро щёлкнул по трём вкладкам. Если не
отменить, `offsetHeight` измерится **посреди** прошлой анимации (промежуточная высота), и блок
«застрянет» на неправильном размере.

`before` — высота блока **до** смены панели.

```js
current = index
tabsEls.forEach((tab, i) => {
  const active = i === index
  tab.setAttribute('aria-selected', String(active))
  tab.tabIndex = active ? 0 : -1
  tab.classList.toggle('is-active', active)
  if (panels[i]) panels[i].hidden = !active
})
```

**«Блуждающий» tabindex** (roving tabindex): у активной вкладки `tabIndex = 0`, у остальных `-1`.
Tab попадает только на активную вкладку и сразу уходит в панель, а между вкладками ходят
стрелками. Без этого, чтобы дойти до содержимого через 6 вкладок, нужно 6 нажатий Tab.

`hidden` — прячет панель полностью (и для скринридера тоже).

```js
if (animate) {
  const after = root.offsetHeight
  const timing = { duration: options.duration, easing: EASE }
  if (before !== after) {
    running.push(
      root.animate(
        [
          { height: `${before}px`, overflow: 'hidden' },
          { height: `${after}px`, overflow: 'hidden' },
        ],
        timing,
      ),
    )
  }
  if (panels[index]) {
    running.push(
      panels[index].animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'none' },
        ],
        timing,
      ),
    )
  }
}
```

Приём **FLIP** в миниатюре: измерили «до» (**F**irst), поменяли панели, измерили «после»
(**L**ast), и анимируем блок от старой высоты к новой. Пользователь не видит скачка: блок
плавно растёт или сжимается.

- `root.animate([...], timing)` — **Web Animations API**, встроен в браузер. Модулю табов не нужен
  GSAP — его код меньше, и он грузится быстрее.
- `overflow: hidden` — пока блок ниже содержимого (растёт), новая панель не торчит поверх
  соседей.
- Анимации кладутся в `running` — чтобы следующий клик мог их отменить.
- Анимация **не меняет стили навсегда**: по окончании `height` возвращается к `auto`. Поэтому
  после неё блок продолжает подстраиваться под содержимое.

```js
    if (focus) tabsEls[index].focus()
    if (options.url && emit) setParam(param, index === fallback ? null : valueOf(index))
    if (emit) root.dispatchEvent(new CustomEvent('tabs:change', { bubbles: true, detail: { index } }))
  }
```

- Вкладка по умолчанию в адрес **не пишется** (`null` удаляет параметр) — адрес чище.
- `setParam` использует `replaceState`, а не `pushState`: щелчки по вкладкам не засоряют
  историю «Назад».

### Начальная вкладка и «Назад»

```js
const fromUrl = options.url ? indexOf(getParam(param)) : -1
const fromHash = panels.findIndex((p) => p.id && `#${p.id}` === location.hash)
select(fromUrl >= 0 ? fromUrl : fromHash >= 0 ? fromHash : fallback, { emit: false })
```

Порядок: адрес `?tab=` → старые ссылки `#id` → `data-tabs-active` → первая.

### Клавиатура

```js
d.listen(root, 'keydown', (event) => {
  const index = tabsEls.indexOf(event.target)
  if (index < 0) return
  const n = tabsEls.length
  const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: n - 1 }[event.key]
  if (next === undefined) return
  event.preventDefault()
  select((next + n) % n, { focus: true })
})
```

Тот же приём, что в аккордеоне: таблица переходов и `% n` по кругу. Разница: стрелки
**сразу переключают** вкладку (`select`), а не только двигают фокус — так рекомендует WAI-ARIA
для вкладок с мгновенным содержимым.

### Уборка

```js
  destroy: () => {
    running.forEach((animation) => animation.cancel())
    d.dispose()
  },
```

Незаконченные анимации отменяются: иначе после `destroy` блок ещё 350 мс менял бы высоту.

## Что будет, если…

| Убрать                                               | Что сломается                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `running.forEach(a => a.cancel())` в начале `select` | быстрые клики — блок застывает на промежуточной высоте             |
| `tab.tabIndex = active ? 0 : -1`                     | Tab проходит по каждой вкладке, до содержимого долго               |
| `tab.type = 'button'`                                | клик по вкладке внутри `<form>` отправляет форму                   |
| `index === fallback ? null : …`                      | в адресе всегда висит `?tab=1` даже на вкладке по умолчанию        |
| `replaceState` → `pushState`                         | «Назад» перебирает все щелчки по вкладкам вместо ухода со страницы |

## Проверьте себя

1. На странице две группы табов без `id` и `data-tabs-param`. Что будет?
2. Почему высота меряется до `hidden`, а не после?
3. Чем «блуждающий» tabindex удобнее для человека с клавиатурой?

<details>
<summary>Ответы</summary>

1. Обе возьмут параметр `tab`; вторая предупредит в консоли. Переключение одной меняло бы
   вкладку другой после перезагрузки. Решение — `id` у корней или `data-tabs-param`.
2. Чтобы знать высоту **старой** панели. После смены `hidden` блок уже другой высоты.
3. Группа вкладок — одна остановка Tab: одно нажатие — в группу, стрелки — внутри, ещё одно —
   в содержимое.

</details>
