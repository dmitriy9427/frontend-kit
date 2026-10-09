/**
 * Подсказки на весь сайт: data-tooltip на любом элементе (kit/js/modules/tooltip).
 * Плагины из этой папки подключаются сами — src/scripts/app.ts.
 */
import { createTooltips } from 'kit/js/modules/tooltip/index.js'

export default function tooltips() {
  return createTooltips().destroy
}
