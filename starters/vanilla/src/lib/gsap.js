/**
 * GSAP проекта — ОДНО место, где регистрируются плагины и общие настройки.
 * Во всём проекте импортируйте отсюда:
 *
 *   import { gsap, ScrollTrigger, SplitText } from '@/lib/gsap.js'
 *
 * а не из 'gsap' напрямую. Тогда:
 *   - плагин зарегистрирован гарантированно (забытый registerPlugin — частый
 *     баг «SplitText is not defined» или «анимация молча не работает»);
 *   - общие настройки (ease, duration) одинаковы во всех анимациях проекта;
 *   - список плагинов проекта виден в одном файле.
 *
 * Что сюда добавлять: плагины, которые нужны СВОИМ модулям/компонентам проекта.
 * Модули кита регистрируют свои плагины сами (registerPlugin можно вызывать
 * сколько угодно раз). Всё, что импортировано здесь, попадает в основной бандл
 * на всех страницах, — тяжёлое и редкое (MorphSVG для одного баннера) лучше
 * импортировать прямо в том модуле, где оно нужно: оно уйдёт в его ленивый файл.
 *
 * Все плагины GSAP бесплатны с версии 3.13. Список: https://gsap.com/docs/v3/Plugins/
 */
import { gsap, ScrollTrigger } from 'kit/js/core/gsap.js' // уже с ScrollTrigger и настройкой для мобилок
import { SplitText } from 'gsap/SplitText'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(SplitText, ScrollToPlugin)

// Общий «характер» анимаций проекта. Отдельная анимация может переопределить.
gsap.defaults({ ease: 'power3.out', duration: 0.8 })

// Именованные кривые — gsap.to(el, { ease: 'brand' }).
gsap.registerEase('brand', (p) => 1 - Math.pow(1 - p, 4))

export { gsap, ScrollTrigger, SplitText, ScrollToPlugin }
