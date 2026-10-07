/**
 * Внешние ссылки открываются в новой вкладке и не дают чужому сайту доступ к
 * нашей вкладке (rel="noopener"). Без плагина это легко забыть в каждой ссылке,
 * особенно в текстах из CMS.
 *
 * Работает и для ссылок, добавленных позже (делегирование на document).
 */
export default function externalLinks() {
  const onClick = (event) => {
    const link = event.target.closest?.('a[href^="http"]')
    if (!link || link.host === location.host || link.target) return
    link.target = '_blank'
    link.rel = [link.rel, 'noopener', 'noreferrer'].filter(Boolean).join(' ')
  }
  // capture: успеваем выставить target до того, как браузер обработает клик.
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
