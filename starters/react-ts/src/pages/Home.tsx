/**
 * Главная. Появление при прокрутке — модуль reveal на <main>: анимирует все
 * [data-reveal] внутри (как в vanilla-стартере).
 */
import { useModule } from 'kit/react/index.js'
import reveal from 'kit/js/modules/reveal/index.js'
import splitText from 'kit/js/modules/split-text/index.js'
import marquee from 'kit/js/modules/marquee/index.js'
import { Accordion } from '../components/Accordion'
import { Slider } from '../components/Slider'

const FEATURES = [
  { title: 'Модули кита', text: 'Аккордеон, табы, модалка, слайдер, формы — через useModule.' },
  { title: 'SCSS-система', text: 'Токены, плавная типографика, миксины, тёмная тема.' },
  { title: 'Dev-панель', text: 'Сетка, макет поверх вёрстки, проверка доступности.' },
]

const CASES = ['Сайт университета', 'Промо-лендинг', 'Личный кабинет', 'Дашборд']

const FAQ = [
  { title: 'Чем React-стартер отличается от vanilla?', content: 'Разметка — в JSX, поведение — те же модули кита.' },
  { title: 'Можно ли без React?', content: 'Да: npm run create -- ../site --stack vanilla.' },
]

export function Home() {
  const main = useModule<HTMLElement>(reveal)
  const title = useModule<HTMLHeadingElement>(splitText)
  const line = useModule<HTMLDivElement>(marquee, { speed: 50 })

  return (
    <main id="main" ref={main}>
      <section className="hero">
        <div className="container hero__inner">
          <p className="hero__eyebrow" data-reveal="fade">
            React-стартер
          </p>
          <h1 className="hero__title" ref={title}>
            Компоненты, которые не ломаются на проде
          </h1>
          <p className="lead hero__lead" data-reveal>
            Те же модули и стили, что в vanilla-стартере, но в React-компонентах.
          </p>
          <div className="cluster">
            <button className="btn btn--lg" type="button" data-dialog-open="callback" data-reveal>
              Обсудить проект
            </button>
          </div>
        </div>
      </section>

      <div className="marquee section-marquee" ref={line} aria-label="Технологии">
        <ul className="marquee__track" data-marquee-track>
          {['React', 'Vite', 'SCSS', 'GSAP', 'Lenis', 'Vitest'].map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <section className="section">
        <div className="container stack" style={{ '--gap': '40px' }}>
          <h2 data-reveal>Что внутри</h2>
          <ul className="auto-grid features">
            {FEATURES.map((f) => (
              <li className="card" data-reveal key={f.title}>
                <h3 className="h4">{f.title}</h3>
                <p className="muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container stack" style={{ '--gap': '32px' }}>
          <h2 data-reveal>Кейсы</h2>
          <Slider label="Кейсы" className="cases">
            {CASES.map((c) => (
              <article className="case" key={c}>
                <h3 className="h4">{c}</h3>
              </article>
            ))}
          </Slider>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container stack" style={{ '--gap': '32px', maxWidth: 860 }}>
          <h2 data-reveal>Вопросы</h2>
          <Accordion items={FAQ} />
        </div>
      </section>
    </main>
  )
}
