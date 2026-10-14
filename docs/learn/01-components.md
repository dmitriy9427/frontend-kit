# 01. Страницы и компоненты — с нуля

## Зачем

У сайта пять страниц, и на каждой одинаковая шапка. Без компонентов шапку копируют в пять
файлов. Потом заказчик просит добавить пункт меню — и вы правите пять мест, а в шестом
(о котором забыли) остаётся старое меню.

Во фреймворках (React, Vue) это решают компонентами. Но вёрстка под CMS (Битрикс, WordPress)
должна быть **обычным HTML** — без React в браузере. Кит даёт компоненты, которые работают
**при сборке**: вы пишете `<x-site-header />`, а в браузер уходит готовая разметка шапки.

## Самый маленький пример

Создайте две вещи.

**1. Компонент** — папка с HTML-файлом того же имени:

```html
<!-- src/components/hello/hello.html -->
<p class="hello">Привет, {{ name }}!</p>
```

**2. Вызов** на странице:

```html
<!-- index.html -->
<x-hello name="Анна" />
<x-hello name="Игорь" />
```

В браузер придёт:

```html
<p class="hello">Привет, Анна!</p>
<p class="hello">Привет, Игорь!</p>
```

Что произошло:

- тег `<x-hello>` — «найди папку `src/components/hello/` и возьми оттуда `hello.html`»;
- атрибут `name="Анна"` — это **prop** (значение для компонента);
- `{{ name }}` внутри компонента — «подставь сюда значение `name`».

Больше ничего регистрировать не нужно: папка есть — компонент есть.

## Пять вещей, которые нужно знать

### 1. Строка или выражение: `title="…"` и `:title="…"`

```html
<x-price title="Тариф" amount="1990" />
<!-- оба значения — СТРОКИ: "Тариф", "1990" -->
<x-price title="Тариф" :amount="1990" />
<!-- amount — ЧИСЛО 1990 -->
<x-price :title="'Тариф ' + plan.name" />
<!-- выражение JS: склеили строку -->
```

Двоеточие означает «это не текст, а JavaScript». Без двоеточия всё — строка. Это важно для
чисел и условий:

```html
<x-badge hidden="false" />
<!-- hidden — строка "false", а она ИСТИННА (непустая)! -->
<x-badge :hidden="false" />
<!-- hidden — false -->
```

Атрибут без значения — `true`: `<x-card featured />` → `featured === true`.

### 2. Данные из JSON: `src/data/*.json`

Каждый файл из `src/data/` становится переменной **с именем файла**:

```json
// src/data/team.json
[
  { "name": "Анна", "role": "Дизайнер" },
  { "name": "Игорь", "role": "Разработчик" }
]
```

```html
<p>В команде {{ team.length }} человека</p>
<!-- «В команде 2 человека» -->
```

`site-info.json` превращается в `siteInfo` (дефисы → camelCase). Ещё всегда есть `page`
(текущая страница), `base` (путь сайта), `dev` (идёт ли разработка), `year` (текущий год —
для «© 2026» в подвале).

### 3. Цикл: `x-for`

```html
<ul>
  <li x-for="person of team">{{ person.name }} — {{ person.role }}</li>
</ul>
```

Результат:

```html
<ul>
  <li>Анна — Дизайнер</li>
  <li>Игорь — Разработчик</li>
</ul>
```

`x-for` повторяет **сам элемент**, на котором стоит. Нужен номер — `(person, i) of team`
(с нуля). Нужно просто N раз — `n of 3` даст 1, 2, 3.

Цикл работает и на компонентах — так в стартере выводятся карточки преимуществ:

```html
<x-feature-card x-for="f of features" :icon="f.icon" :title="f.title" :text="f.text" />
```

### 4. Условие: `x-if` и `x-else`

```html
<p x-if="price">{{ price }} ₽</p>
<p x-else>Цена по запросу</p>
```

`x-else` должен стоять **сразу после** элемента с `x-if` (между ними можно только пробелы).

Неизвестная переменная — не ошибка, а `undefined`. Поэтому `x-if="subtitle"` просто ложно,
если `subtitle` не передали. Так делают необязательные части компонента.

### 5. Слоты: содержимое из вызова

Иногда компоненту нужно передать не строку, а **кусок разметки**:

```html
<!-- src/components/card/card.html -->
<article class="card">
  <h3>{{ title }}</h3>
  <slot />
  <!-- сюда попадёт содержимое вызова -->
  <footer x-if="$slots.footer">
    <slot name="footer" />
    <!-- сюда — именованная часть -->
  </footer>
</article>
```

```html
<x-card title="Быстро">
  <p>Сделаем за неделю.</p>
  <!-- → в <slot /> -->
  <template slot="footer">
    <a href="/buy">Купить</a>
    <!-- → в <slot name="footer" /> -->
  </template>
</x-card>
```

`$slots.footer` — «передали ли footer». Без него пустой `<footer>` всё равно попал бы в
разметку.

## Как это сделано в ките: три компонента стартера

### Кнопка — `x-if`/`x-else` и класс-массив

[button.html](../../starters/vanilla/src/components/button/button.html):

```html
<a x-if="href" :href="href" :class="['btn', variant && 'btn--' + variant, size && 'btn--' + size]">
  <slot />
  <x-icon x-if="icon" :name="icon" />
</a>
<button x-else :type="type ?? 'button'" :class="['btn', variant && 'btn--' + variant, size && 'btn--' + size]">
  <slot />
  <x-icon x-if="icon" :name="icon" />
</button>
```

Что делает каждая строка:

| Строка                                           | Что значит                                                                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `<a x-if="href" …>`                              | передали `href` — кнопка становится ссылкой                                                                          |
| `<button x-else …>`                              | иначе — настоящая `<button>`                                                                                         |
| `:class="['btn', variant && 'btn--' + variant]"` | **массив классов**: `false` и `undefined` выбрасываются. `variant="ghost"` → `btn btn--ghost`; без `variant` → `btn` |
| `:type="type ?? 'button'"`                       | тип по умолчанию — `button`, а не `submit` (иначе кнопка внутри формы её отправит)                                   |
| `<x-icon x-if="icon">`                           | компонент внутри компонента; иконка — только если передали                                                           |

Вызовы и результат:

```html
<x-button>Отправить</x-button>
<!-- <button type="button" class="btn">Отправить</button> -->

<x-button href="/price.html" variant="secondary" icon="arrow-right">Цены</x-button>
<!-- <a href="/price.html" class="btn btn--secondary">Цены <svg class="icon">…</svg></a> -->
```

### FAQ — цикл плюс модуль

[faq.html](../../starters/vanilla/src/components/faq/faq.html):

```html
<div class="accordion" data-module="accordion" :data-accordion-multiple="multiple">
  <div x-for="(item, i) of items" class="accordion__item" data-accordion-item :data-open="i === Number(open ?? 0)">
    <h3 class="h4">
      <button class="accordion__trigger" data-accordion-trigger>{{ item.question }}</button>
    </h3>
    <div class="accordion__panel" data-accordion-panel>
      <div class="accordion__inner">{{{ item.answer }}}</div>
    </div>
  </div>
</div>
```

| Что                                    | Зачем                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `data-module="accordion"`              | в браузере на этом `div` запустится модуль аккордеона (глава 02)                                                                   |
| `:data-accordion-multiple="multiple"`  | передали `multiple` — атрибут появится, модуль разрешит открыть несколько. Не передали — `undefined`, **атрибут не пишется вовсе** |
| `(item, i) of items`                   | `i` — номер вопроса с нуля                                                                                                         |
| `:data-open="i === Number(open ?? 0)"` | открыт вопрос номер `open` (по умолчанию первый). `true` → атрибут без значения, `false` → атрибута нет                            |
| `{{{ item.answer }}}`                  | **три** скобки — вставить как HTML. В ответе бывают ссылки и `<strong>`                                                            |

Вызов: `<x-faq :items="faq" />` — `faq` пришёл из `src/data/faq.json`.

> **`{{ }}` или `{{{ }}}`?** Две скобки **экранируют**: `<` превращается в `&lt;`, и браузер
> покажет символ, а не тег. Три скобки вставляют как есть. Используйте три только для своих
> данных (JSON проекта), никогда — для того, что ввёл посетитель.

### Шапка — данные из `site.json` и подсветка текущей страницы

[site-header.html](../../starters/vanilla/src/components/site-header/site-header.html), главное:

```html
<ul class="nav__list">
  <li x-for="link of site.nav">
    <a class="nav__link" href="%BASE_URL%{{ link.href }}">{{ link.label }}</a>
  </li>
</ul>
```

- `site.nav` — массив из `src/data/site.json`. Добавили туда пункт — он появился на **всех**
  страницах.
- `%BASE_URL%` — путь сайта. Vite заменит его на `/` или на `/promo/`, если сайт живёт в
  подпапке. Без этого ссылки сломаются на GitHub Pages.
- Подсветку текущей страницы писать не нужно: плагин сам ставит `aria-current="page"` ссылке на
  открытую страницу, а CSS подсвечивает `[aria-current='page']`.

## Атрибуты вызова переходят на корень

```html
<x-button class="mt-4" id="buy" data-dialog-open="callback">Купить</x-button>
```

У кнопки в `button.html` нет ни `id`, ни `data-dialog-open` — но они появятся на `<button>`:

```html
<button type="button" class="btn mt-4" id="buy" data-dialog-open="callback">Купить</button>
```

Так переходят `class` (дописывается к своему), `style`, `id`, `role`, `tabindex`, `hidden`,
все `data-*` и `aria-*`. Остальные атрибуты — только props.

## Компонент со своим JS

Положите рядом с `card.html` файл `card.js` — и на корневой элемент компонента сам
добавится `data-module="card"`. Писать атрибут руками не нужно. Как написать `card.js` —
глава 02.

```
src/components/price-calc/
├── price-calc.html     разметка
├── price-calc.scss     стили — подключаются сами
├── price-calc.js       поведение — запускается само
└── price-calc.test.js  тест — живой пример
```

## Где это работает

Всё это происходит **в Node.js при сборке** (и в `npm run dev` на лету). В браузер не попадает
ни одной строчки кода шаблонизатора — только готовый HTML. Поэтому:

- `{{ Date.now() }}` покажет время **сборки**, а не время открытия страницы;
- в выражениях нет `window` и `document` — их нет в Node;
- поменяли `site.json` — в `dev` страница перезагрузится сама.

Как устроен сам шаблонизатор — глава 09 и [разбор кода](../code/09-html-components.md).

## Ошибки

> **«нет компонента <x-hero>»** — нет файла `src/components/hero/hero.html`. Имя папки и файла
> должны совпадать с тегом. В сообщении будет список существующих компонентов.
>
> **`:items="faq"` без двоеточия** — `items` станет строкой `"faq"`, и цикл пройдёт по буквам
> «f», «a», «q».
>
> **`x-else` не сработал** — между ним и `x-if` оказался другой элемент или текст.
>
> **Комментарий-документация появился на странице** — комментарии **в начале** файла
> компонента считаются его описанием и не копируются. Комментарии внутри разметки остаются.
>
> **`{{ price.toLocaleString() }}`, а `price` не передали** — ошибка «не удалось вычислить».
> Защитите: `{{ price?.toLocaleString() }}` или оберните в `x-if="price"`.

## Попробуйте сами

1. Сделайте компонент `<x-team-card>` и выведите циклом команду из `src/data/team.json`.
2. Как передать в `<x-button>` атрибут `disabled`, если он не входит в «переходящие»?
3. Что выведет `<p x-for="n of 3">{{ n * 10 }}</p>`?
4. Почему у `<x-button>` по умолчанию `type="button"`, а не `submit`?

<details>
<summary>Ответы</summary>

1. ```html
   <!-- src/components/team-card/team-card.html -->
   <article class="team-card">
     <h3>{{ person.name }}</h3>
     <p class="muted">{{ person.role }}</p>
   </article>
   ```
   ```html
   <x-team-card x-for="p of team" :person="p" />
   ```
   Или сгенерируйте заготовку: `npm run new -- component team-card`.
2. Добавить в `button.html` на `<button>`: `:disabled="disabled"`. Передали `disabled` —
   `true` → атрибут без значения; не передали — `undefined` → атрибута нет.
3. `<p>10</p><p>20</p><p>30</p>`.
4. По стандарту HTML `<button>` внутри `<form>` без `type` — это `submit`. Кнопка «Показать
   пароль» в форме отправила бы форму.

</details>
