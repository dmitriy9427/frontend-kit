/**
 * Подсказки на весь сайт: любой элемент с data-tooltip (или data-tooltip-template)
 * получает подсказку — без data-module, в том числе подгруженный позже.
 *   <button aria-label="Тёмная тема" data-tooltip>…</button>
 * Модуль и настройки — kit/js/modules/tooltip.
 */
import { createTooltips } from 'kit/js/modules/tooltip/index.js'

export default function tooltips() {
  return createTooltips({ delay: 300 }).destroy
}
