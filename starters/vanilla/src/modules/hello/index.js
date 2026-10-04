/**
 * Пример модуля проекта — образец для копирования.
 *
 *   <button data-module="hello" data-hello-name="мир">Поздороваться</button>
 *
 * Шаблон любого модуля:
 *   1. DEFAULTS — все настройки со значениями по умолчанию (тип важен!);
 *   2. readOptions — настройки из data-атрибутов (+ ctx.options из JS/React);
 *   3. createDisposer — всё, что включили, сразу кладём «на выключение»;
 *   4. return { destroy } — модуль можно остановить без следов.
 */
import { createDisposer } from 'kit/js/core/lifecycle.js'
import { readOptions } from 'kit/js/core/options.js'
import { toast } from 'kit/js/modules/toast/index.js'

const DEFAULTS = {
  name: 'мир',
}

export default function hello(el, ctx = {}) {
  const options = readOptions(el, 'hello', DEFAULTS, ctx.options)
  const d = createDisposer()

  d.listen(el, 'click', () => {
    toast(`Привет, ${options.name}!`, { type: 'success' })
    ctx.bus?.emit('hello:said', options.name)
  })

  return { destroy: d.dispose }
}
