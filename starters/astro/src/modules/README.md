# src/modules — модули проекта

`src/modules/<имя>/index.ts` с `export default function (el, ctx) { …; return { destroy } }`
регистрируется сам (src/scripts/app.ts). В разметке: `<div data-module="имя">`.
Контракт модуля и примеры — docs/modules.md.
