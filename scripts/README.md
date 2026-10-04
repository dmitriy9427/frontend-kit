# scripts

`create.mjs` — создать проект из шаблона или обновить в нём кит:

```bash
npm run create -- ../my-site --stack vanilla [--install] [--git] [--name my-site]
npm run create -- --update ../my-site
```

Что копируется и почему копия, а не npm-пакет, — комментарий в начале файла и
[docs/structure.md](../docs/structure.md). Тесты — `create.test.js`.
