/**
 * Шапка: те же модули кита, что в vanilla (sticky-header, menu, theme-switch),
 * подключённые хуком useModule. NavLink сам ставит aria-current="page".
 */
import { NavLink, Link } from 'react-router'
import { useModule } from 'kit/react/index.js'
import stickyHeader from 'kit/js/modules/sticky-header/index.js'
import menu from 'kit/js/modules/menu/index.js'
import themeSwitch from 'kit/js/modules/theme-switch/index.js'

const LINKS = [
  { to: '/', label: 'Главная', end: true },
  { to: '/#faq', label: 'Вопросы' },
  { to: '/ui-kit', label: 'UI-кит' },
]

export function Header() {
  const header = useModule(stickyHeader)
  const burger = useModule(menu, { target: 'site-menu' })
  const theme = useModule(themeSwitch)

  return (
    <header className="header" ref={header}>
      <div className="header__inner">
        <Link className="logo" to="/">
          Логотип
        </Link>
        <nav id="site-menu" className="nav mobile-menu" aria-label="Основное меню" data-lenis-prevent>
          <ul className="nav__list">
            {LINKS.map(({ to, label, end }) => (
              <li key={to}>
                {to.includes('#') ? (
                  <a className="nav__link" href={to}>
                    {label}
                  </a>
                ) : (
                  <NavLink className="nav__link" to={to} end={end}>
                    {label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="header__actions">
          <button ref={theme} className="theme-switch" type="button" aria-label="Тёмная тема" />
          <button className="btn btn--sm header__cta" type="button" data-dialog-open="callback">
            Связаться
          </button>
          {/* aria-expanded/aria-label ставит модуль — в JSX их не пишем, иначе React затрёт */}
          <button ref={burger} className="burger" type="button">
            <span className="burger__lines" />
          </button>
        </div>
      </div>
    </header>
  )
}
