/**
 * Каркас: шапка + страница + подвал. Маршруты — здесь.
 * Новая страница: создайте src/pages/About.jsx и добавьте <Route path="/about" …/>.
 */
import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { ScrollTrigger } from 'kit/js/core/gsap.js'
import { useKit } from 'kit/react/index.js'
import { Header } from './components/Header.jsx'
import { Footer } from './components/Footer.jsx'
import { CallbackDialog } from './components/CallbackDialog.jsx'
import { Home } from './pages/Home.jsx'

// Страницы, нужные не всем, грузятся лениво — меньше стартовый бандл.
const UiKit = lazy(() => import('./pages/UiKit.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

/**
 * Баг SPA №1: при переходе на другую страницу прокрутка остаётся внизу.
 * Баг SPA №2: позиции ScrollTrigger считаны для старой страницы.
 * Лечим оба при смене адреса (кроме переходов по якорю #id).
 */
function useRouteReset() {
  const { pathname, hash } = useLocation()
  const kit = useKit()
  useEffect(() => {
    if (hash) return
    if (kit?.scroll) kit.scroll.scrollTo(0, { immediate: true, offset: 0 })
    else window.scrollTo(0, 0)
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [pathname, hash, kit])
}

export function App() {
  useRouteReset()
  return (
    <>
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>
      <Header />
      <Suspense fallback={<main id="main" className="page-loading" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ui-kit" element={<UiKit />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Footer />
      <CallbackDialog />
    </>
  )
}
