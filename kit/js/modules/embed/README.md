# embed

Видео YouTube / Rutube / Vimeo / VK по клику: до клика — только картинка.

|                 |                                                                                        |
| --------------- | -------------------------------------------------------------------------------------- |
| Подключение     | `data-module="embed"` + `data-embed-provider` и `data-embed-id` (или `data-embed-src`) |
| Настройки       | src, provider, id, title, autoplay                                                     |
| API (экземпляр) | play, stop, isPlaying                                                                  |
| События         | embed:play                                                                             |
| Стили           | `kit/scss/components/_embed.scss`, `--embed-ratio`                                     |

**Что учтено:** плеер и его скрипты грузятся только по клику; превью YouTube, если нет своего; title у iframe; youtube-nocookie; в модалке видео останавливается при закрытии.

Разметка и примеры — [docs/modules.md](../../../../docs/modules.md#embed),
подробности и «почему так» — комментарий в начале `index.js`.
