/**
 * Слайдер на scroll-snap (модуль кита slider).
 *   <Slider label="Кейсы">{cases.map((c) => <Card key={c.id} {...c} />)}</Slider>
 * Каждый ребёнок — слайд. Ширина слайда — CSS-переменная --slide-width.
 */
import { Children } from 'react'
import { useModule } from 'kit/react/index.js'
import slider from 'kit/js/modules/slider/index.js'

export function Slider({ children, label, autoplay = 0, className = '' }) {
  const ref = useModule(slider, { autoplay })
  return (
    <div className={`slider ${className}`} ref={ref} aria-label={label}>
      <div className="slider__track" data-slider-track>
        {Children.map(children, (child) => (
          <div className="slider__slide">{child}</div>
        ))}
      </div>
      <div className="slider__nav">
        <button className="slider__arrow" type="button" data-slider-prev aria-label="Назад">
          ←
        </button>
        <div className="slider__dots" data-slider-dots />
        <button className="slider__arrow" type="button" data-slider-next aria-label="Вперёд">
          →
        </button>
      </div>
    </div>
  )
}
