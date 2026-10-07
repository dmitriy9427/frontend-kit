# Иконки (SVG-спрайт)

## Коротко

1. Положите `heart.svg` в `src/icons/`.
2. На странице или в компоненте: `<x-icon name="heart" />`.
3. Цвет — CSS `color` родителя, размер — `font-size` (иконка 1em) или `size="sm|md|lg"`.

## Как это устроено

Плагин `kit/vite/svg-sprite.js` при сборке (и в dev) находит в странице все ссылки
`href="#icon-…"` и вставляет сразу после `<body>` скрытый `<svg>` с нужными `<symbol>`.
Компонент `x-icon` выводит:

```html
<svg class="icon" aria-hidden="true" focusable="false"><use href="#icon-heart"></use></svg>
```

Почему встроенный спрайт, а не `<img src="heart.svg">` или отдельный `sprite.svg`:

| Способ                    | Перекрасить через CSS | Лишний запрос    | Работает в подпапке/на file:// |
| ------------------------- | --------------------- | ---------------- | ------------------------------ |
| `<img src="icon.svg">`    | нет                   | на каждую иконку | да                             |
| внешний `sprite.svg#icon` | да                    | один             | часто ломается (CORS, base)    |
| **встроенный спрайт**     | **да**                | **нет**          | **да**                         |

## Подготовка файлов

- Иконки из Figma: экспорт SVG; плагин сам уберёт `width`/`height`, `xmlns`, `<title>`,
  комментарии.
- Цвета (`fill="#1E1E1E"`, `stroke="black"`) заменяются на `currentColor` — иконка берёт цвет
  текста. `fill="none"` сохраняется (контурные иконки).
- Многоцветную иконку (логотип, флаг) назовите `имя.color.svg` — её цвета не тронутся,
  id будет `icon-имя`.
- Нужен `viewBox` (или `width` и `height`) — иначе иконка не масштабируется, плагин скажет об
  этом ошибкой.

## Размер и цвет

```html
<x-icon name="phone" />
<!-- 1em: размер как у текста рядом -->
<x-icon name="check" size="lg" />
<!-- 32px; sm — 16px, md — 24px -->
<x-icon name="close" label="Закрыть" />
<!-- смысловая иконка без текста: role="img" + aria-label -->
<x-icon name="star" class="rating__star" /><!-- свой класс — для своих размеров/цветов -->
```

```scss
.rating__star {
  color: var(--color-accent);
  font-size: rem(20px);
}
```

Стили `.icon` — в `kit/scss/components/_icon.scss`: `width/height: 1em`, `display:
inline-block`, `flex-shrink: 0`. Без них SVG без размеров растягивается на всю ширину
родителя — классический баг «огромных иконок».

## Иконки, которые создаёт JS

Спрайт содержит только иконки, найденные в HTML страницы. Если иконку вставляет JS
(уведомление, строка корзины), добавьте её в `always`:

```js
// vite.config.js
plugins: [...kit({ icons: { always: ['close', 'check'] } })]
// или все иконки на всех страницах:
plugins: [...kit({ icons: { always: 'all' } })]
```

```js
el.insertAdjacentHTML('beforeend', '<svg class="icon"><use href="#icon-check"></use></svg>')
```

## Ошибки

- `[svg-sprite] /index.html: нет иконки «hart». Есть: arrow-right, heart, …` — опечатка в имени.
- `[svg-sprite] logo: нет viewBox` — пересохраните SVG с viewBox.
