/**
 * Аккордеон: React рисует разметку из данных, модуль кита отвечает за
 * поведение (aria, клавиатура, анимация высоты).
 *   <Accordion items={[{ title: 'Вопрос', content: 'Ответ' }]} multiple />
 */
import { useModule } from 'kit/react/index.js'
import accordion from 'kit/js/modules/accordion/index.js'

export function Accordion({ items, multiple = false, openFirst = true }) {
  const ref = useModule(accordion, { multiple })
  return (
    <div className="accordion" ref={ref}>
      {items.map((item, i) => (
        // data-open задаём только при первом рендере — дальше состоянием управляет модуль.
        <div
          className="accordion__item"
          data-accordion-item
          data-open={openFirst && i === 0 ? '' : undefined}
          key={item.title}
        >
          <h3 className="h4">
            <button className="accordion__trigger" type="button" data-accordion-trigger>
              {item.title}
            </button>
          </h3>
          <div className="accordion__panel" data-accordion-panel>
            <div className="accordion__inner">
              <p>{item.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
