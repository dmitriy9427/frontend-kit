/**
 * Дымовой тест приложения: все страницы рендерятся без ошибок, роутинг работает.
 */
import { act, render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { KitProvider } from 'kit/react/index.js'
import { App } from './App.jsx'

afterEach(cleanup)

async function renderAt(path) {
  render(
    <KitProvider smooth={false}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </KitProvider>,
  )
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20))
  })
}

describe('App', () => {
  it('главная: заголовок, меню, модалка', async () => {
    await renderAt('/')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Компоненты')
    expect(document.getElementById('callback')).toBeTruthy()
    expect(document.querySelector('.burger').getAttribute('aria-controls')).toBe('site-menu')
  })

  it('UI-кит и 404 (ленивые страницы)', async () => {
    await renderAt('/ui-kit')
    expect(await screen.findByRole('heading', { level: 1, name: 'UI-кит' })).toBeTruthy()
    cleanup()
    await renderAt('/nope')
    expect(await screen.findByText('404')).toBeTruthy()
  })
})
