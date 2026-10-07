# Быстрый старт

## 1. Создать проект

Из папки шаблона:

```bash
npm run create -- ../my-site --stack vanilla      # вёрстка: HTML-страницы + JS-модули
npm run create -- ../my-app --stack react         # React-приложение (JS)
npm run create -- ../my-app --stack react-ts      # React + TypeScript
npm run create -- ../my-site --stack astro        # Astro: статический сайт, языки, SEO
npm run create                                    # спросит папку и стек сам
```

Дополнительно: `--install` (сразу `npm install`), `--git` (git init + первый коммит),
`--name my-site` (имя в package.json).

Получается **самостоятельный** проект: своя копия `kit/`, свой `package.json` только с нужными
пакетами, линтеры, тесты, документация. Шаблон ему больше не нужен.

> Какой стек выбрать:
>
> - вёрстка под CMS (Битрикс, WordPress, Django-шаблоны), промо — **vanilla**;
> - сайт, где важны скорость и SEO, несколько языков, портфолио, блог — **astro**;
> - личный кабинет, дашборд, много состояния на клиенте — **react-ts** (или **react** без TS).

## 2. Запустить

```bash
cd ../my-site
npm install
npm run dev          # http://localhost:5173
```

| Команда                        | Что делает                                                            |
| ------------------------------ | --------------------------------------------------------------------- |
| `npm run dev`                  | Сервер разработки с перезагрузкой при сохранении, мок-API, dev-панель |
| `npm run build`                | Готовый сайт в `dist/`                                                |
| `npm run preview`              | Посмотреть собранный `dist/`                                          |
| `npm test`                     | Тесты (`npm run test:watch` — перезапуск при сохранении)              |
| `npm run lint` / `npm run fix` | Проверить / автоматически поправить JS и SCSS                         |
| `npm run check`                | Линтеры + тесты + сборка — **запускайте перед сдачей**                |

## 3. Настроить «лицо» проекта

`src/styles/_abstracts.scss` — цвета, шрифты, брейкпоинты, ширина контейнера:

```scss
@forward 'kit/scss/abstracts' with (
  $colors: (
    'accent': #ff5a1f,
    'bg': #fffaf5,
  ),
  $font-base: (
    'Inter',
    system-ui,
    sans-serif,
  )
);
```

Указывайте только то, что меняете, — остальное останется по умолчанию. Все настройки с
пояснениями — `kit/scss/_config.scss`. Подробно — [styles.md](styles.md).

## 4. Первая страница (vanilla)

```bash
npm run new -- page about "О компании"
```

Создастся `about.html` — она сама попадёт в сборку:

```html
<!doctype html>
<html lang="ru">
  <head>
    <x-site-head title="О компании" />
  </head>
  <body>
    <x-site-header />
    <main id="main" data-module="reveal">
      <section class="section">
        <div class="container stack">
          <x-section-head title="О компании" />
          <p data-reveal>Содержимое страницы</p>
        </div>
      </section>
    </main>
    <x-site-footer />
  </body>
</html>
```

`<x-site-head>`, `<x-site-header>`, `<x-site-footer>` — компоненты из `src/components/`:
мета-теги, шапка с меню из `src/data/site.json`, подвал с модалкой. Ссылка на текущую страницу
в меню получит `aria-current="page"` сама. Добавьте пункт в `site.nav` — он появится на всех
страницах.

## 5. Первый компонент

```bash
npm run new -- component team-card
```

```html
<!-- src/components/team-card/team-card.html -->
<article class="team-card">
  <img :src="person.photo" :alt="person.name" width="320" height="320" loading="lazy" />
  <h3>{{ person.name }}</h3>
  <p class="muted">{{ person.role }}</p>
</article>
```

```json
// src/data/team.json
[
  { "name": "Анна", "role": "Дизайнер", "photo": "/images/anna.jpg" },
  { "name": "Игорь", "role": "Разработчик", "photo": "/images/igor.jpg" }
]
```

```html
<!-- about.html -->
<div class="auto-grid" style="--min: 240px">
  <x-team-card x-for="p of team" :person="p" />
</div>
```

Стили — в `src/components/team-card/team-card.scss`, подключаются сами. Нужно поведение —
`npm run new -- component team-card --js` (или добавьте `team-card.js` рядом): модуль
запустится сам, `data-module` писать не нужно.

Всё о компонентах — props, слоты, циклы, условия, данные, JS — [components.md](components.md).
Модули без своей разметки и связь модулей между собой — [modules.md](modules.md).
GSAP, аналитика и код на весь сайт — [plugins.md](plugins.md).

## 6. Dev-панель

В `npm run dev` слева внизу кнопка ⚙ (или Shift+Alt+K): сетка, текущий брейкпоинт, FPS,
контуры блоков, поиск того, что вылезает за экран, проверка доступности, наложение макета.
В сборку панель не попадает. Подробно — [devtools.md](devtools.md).

## 7. Перед сдачей

`npm run check` и [checklist.md](checklist.md).
