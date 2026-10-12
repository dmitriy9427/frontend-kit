# cookie-consent

Баннер согласия на cookies: принять, отказаться, настроить по категориям. Выбор (и согласие,
и отказ) отправляется на сервер.

|                 |                                                                                  |
| --------------- | -------------------------------------------------------------------------------- |
| Подключение     | `data-module="cookie-consent"` (блок с `hidden`)                                 |
| Настройки       | version, endpoint, expires, cookie, categories, required, reloadOnRevoke         |
| Из JS/React     | `ctx.options.send(payload)` — своя отправка на сервер                            |
| API (экземпляр) | open, close, accept, reject, save, consent, isOpen                               |
| События         | cookie-consent:change, cookie-consent:error (шина); :open, :close, :change (DOM) |
| Состояние       | `hasConsent`, `whenConsent`, `onConsentChange` из `kit/js/core/consent.js`       |
| Стили           | `kit/scss/components/_cookie.scss`, переменные `--cookie-*`                      |

**Что учтено:** смена версии политики и срок действия — спрашиваем снова; сервер недоступен —
выбор действует, отправка повторится; отзыв согласия перезагружает страницу (выполненный скрипт
не выгрузить); отложенные `<script type="text/plain" data-cookie-category>` включаются после
согласия; Esc не закрывает первый вопрос.

Разметка и примеры — [docs/modules.md](../../../../docs/modules.md#cookie-consent),
подробности и «почему так» — комментарий в начале `index.js`.
