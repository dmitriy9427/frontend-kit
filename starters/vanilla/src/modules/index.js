/**
 * Модули ЭТОГО проекта. Имя слева — значение data-module в HTML.
 *
 * Как добавить модуль:
 *   1. скопируйте папку hello/ → my-block/ и поменяйте код;
 *   2. допишите строку сюда: 'my-block': lazy(() => import('./my-block/index.js')),
 *   3. в HTML: <section data-module="my-block">…</section>.
 *
 * lazy() — код скачивается, только если блок есть на странице. Без lazy
 * (обычный import) — модуль в основном бандле; так стоит делать для того,
 * что нужно на первом экране.
 */
import { lazy } from 'kit/js/core/registry.js'

export const projectModules = {
  hello: lazy(() => import('./hello/index.js')),
}
