# popover

Выпадающая панель у кнопки: меню, профиль, фильтр, подменю в шапке.

|                 |                                                                         |
| --------------- | ----------------------------------------------------------------------- |
| Подключение     | `data-module="popover"` на кнопке + `data-popover-target="id"`          |
| Настройки       | target, placement, offset, hover, hoverDelay, closeOnSelect, matchWidth |
| API (экземпляр) | open, close, toggle, update, isOpen                                     |
| События         | popover:open, popover:close                                             |
| Стили           | `kit/scss/components/_popover.scss`, переменные `--popover-*`           |

**Что учтено:** позиция Floating UI (flip, shift) в «верхнем слое» — не режется overflow; Esc, клик мимо, уход фокуса; меню с role="menu" — стрелки, Home/End, фокус на первом пункте; открытие наведением только при мыши.

Разметка и примеры — [docs/modules.md](../../../../docs/modules.md#popover),
подробности и «почему так» — комментарий в начале `index.js`.
