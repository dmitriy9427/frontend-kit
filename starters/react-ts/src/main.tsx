/**
 * Точка входа React-приложения.
 *   StrictMode — в разработке запускает эффекты дважды, чтобы ловить утечки
 *   (модули кита к этому готовы: каждый полностью убирает за собой).
 *   KitProvider — общий контекст кита: шина событий, плавный скролл.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { KitProvider } from 'kit/react/index.js'
import { App } from './App'
import './styles/main.scss'

const root = document.getElementById('root')
if (!root) throw new Error('Нет элемента #root в index.html')

createRoot(root).render(
  <StrictMode>
    <KitProvider smooth>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </KitProvider>
  </StrictMode>,
)

// Dev-панель — только в разработке (в сборку не попадает, см. kit/devtools).
if (import.meta.env.DEV) {
  import('kit/devtools/index.js').then((m) => m.installDevtools())
}
