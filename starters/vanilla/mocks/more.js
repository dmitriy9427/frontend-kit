/**
 * Мок для «Показать ещё» (модуль load-more) на ui-kit.html: GET /api/more?page=2.
 * Отвечает HTML-страницей со списком и ссылкой на следующую страницу — так же,
 * как обычная постраничная навигация любой CMS. На третьей странице ссылки нет:
 * модуль поймёт, что это конец, и спрячет кнопку.
 */
const PER_PAGE = 3
const LAST_PAGE = 3

export function GET({ query }) {
  const page = Number(query.page) || 1
  const items = Array.from({ length: PER_PAGE }, (_, i) => (page - 1) * PER_PAGE + i + 1)
  return `<div id="uikit-more">
    <ul data-load-more-list>${items.map((n) => `<li class="card">Новость ${n}</li>`).join('')}</ul>
    ${page < LAST_PAGE ? `<a href="/api/more?page=${page + 1}" data-load-more-button>Показать ещё</a>` : ''}
  </div>`
}
