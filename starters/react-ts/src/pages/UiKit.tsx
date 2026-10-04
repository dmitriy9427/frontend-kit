/**
 * UI-кит React-проекта: все компоненты и их состояния на одной странице.
 * Добавили компонент — покажите его здесь.
 */
import { useModule } from 'kit/react/index.js'
import tabs from 'kit/js/modules/tabs/index.js'
import { toast } from 'kit/js/modules/toast/index.js'
import { Accordion } from '../components/Accordion'

export default function UiKit() {
  const tabsRef = useModule<HTMLDivElement>(tabs)
  return (
    <main id="main" className="container section stack" style={{ '--gap': '64px' }}>
      <h1>UI-кит</h1>

      <section className="stack">
        <h2 className="h3">Кнопки</h2>
        <div className="cluster">
          <button className="btn" type="button">
            Основная
          </button>
          <button className="btn btn--secondary" type="button">
            Вторичная
          </button>
          <button className="btn btn--ghost" type="button">
            Контурная
          </button>
          <button className="btn" type="button" disabled>
            Неактивная
          </button>
        </div>
      </section>

      <section className="stack">
        <h2 className="h3">Табы</h2>
        <div className="tabs" ref={tabsRef}>
          <div className="tabs__list" data-tabs-list>
            {['Описание', 'Характеристики', 'Отзывы'].map((t) => (
              <button className="tabs__tab" data-tabs-tab key={t}>
                {t}
              </button>
            ))}
          </div>
          {['Первая', 'Вторая', 'Третья'].map((t) => (
            <div className="tabs__panel" data-tabs-panel key={t}>
              <p>{t} вкладка.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="stack">
        <h2 className="h3">Аккордеон</h2>
        <Accordion
          multiple
          openFirst={false}
          items={[
            { title: 'Первый', content: 'Текст' },
            { title: 'Второй', content: 'Текст' },
          ]}
        />
      </section>

      <section className="stack">
        <h2 className="h3">Модалка и уведомления</h2>
        <div className="cluster">
          <button className="btn btn--secondary" type="button" data-dialog-open="callback">
            Открыть модалку
          </button>
          <button className="btn btn--secondary" type="button" onClick={() => toast('Сохранено', { type: 'success' })}>
            Тост: успех
          </button>
          <button className="btn btn--secondary" type="button" onClick={() => toast('Ошибка сети', { type: 'error' })}>
            Тост: ошибка
          </button>
        </div>
      </section>
    </main>
  )
}
