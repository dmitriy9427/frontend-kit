# map

Яндекс.Карта, которая грузится только когда до неё докрутили.

|                 |                                                                           |
| --------------- | ------------------------------------------------------------------------- |
| Подключение     | `data-module="map"`; метки — `[data-map-marker]` с `data-lat`, `data-lng` |
| Настройки       | apikey, center, zoom, scrollZoom, touchDrag, consent, margin              |
| Из JS/React     | `ctx.options.create(el, data)` — своя карта (2ГИС, Leaflet)               |
| API (экземпляр) | load, state                                                               |
| События         | map:ready, map:error                                                      |
| Стили           | `kit/scss/components/_embed.scss` (.map), `--map-height`                  |

**Что учтено:** ленивая загрузка API; колесо мыши и палец не «застревают» на карте; API грузится один раз на страницу; загрузка только после согласия на cookies (`consent`); не загрузилась — остаётся адрес и ссылка.

Разметка и примеры — [docs/modules.md](../../../../docs/modules.md#map),
подробности и «почему так» — комментарий в начале `index.js`.
