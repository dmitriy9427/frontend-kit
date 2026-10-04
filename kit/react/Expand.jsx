/**
 * <Expand open> — плавное раскрытие по высоте: подсказки, доп. поля формы,
 * «показать больше». Соседи ниже не прыгают рывком, а плавно отъезжают.
 *
 *   <Expand open={withCard}>
 *     <textarea … />
 *   </Expand>
 *
 * Высота анимируется без замеров в JS: grid-template-rows 0fr → 1fr (CSS кита,
 * .expand в kit/scss/components/_misc.scss). Закрытый блок — inert: в него не
 * попадает Tab и скринридер.
 * Содержимое остаётся в DOM и когда закрыто (иначе нечему «уезжать»).
 * @module kit/react/Expand
 */

/**
 * @param {{ open: boolean, children?: import('react').ReactNode, className?: string }} props
 */
export function Expand({ open, children, className = '' }) {
  return (
    <div className={`expand ${className}`} data-open={open ? 'true' : 'false'} inert={!open}>
      <div className="expand__inner">{children}</div>
    </div>
  )
}
