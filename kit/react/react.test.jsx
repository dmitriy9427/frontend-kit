import { StrictMode, useState } from 'react'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { KitProvider, useBreakpoint, useBus, useKit, useMediaQuery, useModule, useReducedMotion } from './index.js'
import accordion from '../js/modules/accordion/index.js'
import { lazy } from '../js/core/registry.js'

afterEach(cleanup)

describe('useModule', () => {
  it('запускает модуль и убирает его; StrictMode не оставляет двойных обработчиков', async () => {
    function Faq() {
      const ref = useModule(accordion)
      return (
        <div ref={ref}>
          <div data-accordion-item>
            <button data-accordion-trigger>Q</button>
            <div data-accordion-panel>A</div>
          </div>
        </div>
      )
    }
    const { unmount } = render(
      <StrictMode>
        <Faq />
      </StrictMode>,
    )
    await act(async () => {})
    const button = screen.getByText('Q')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(button)
    // При двойных обработчиках пункт открылся бы и сразу закрылся.
    expect(button.getAttribute('aria-expanded')).toBe('true')
    unmount()
  })

  it('опции: новый объект с теми же значениями не перезапускает модуль; ctx из провайдера', async () => {
    const init = vi.fn(() => ({ destroy: vi.fn() }))
    let rerender
    function Box() {
      const [, set] = useState(0)
      rerender = () => set((n) => n + 1)
      const ref = useModule(init, { speed: 1 })
      return <div ref={ref} />
    }
    render(
      <KitProvider smooth={false}>
        <Box />
      </KitProvider>,
    )
    await act(async () => {})
    const calls = init.mock.calls.length
    await act(async () => rerender())
    expect(init.mock.calls.length).toBe(calls)
    const ctx = init.mock.calls.at(-1)[1]
    expect(ctx.options).toEqual({ speed: 1 })
    expect(ctx.bus).toBeTruthy()
  })

  it('StrictMode: экземпляры на элементе по очереди — отменённый не снимает общий класс', async () => {
    // Регрессия: первый (отменённый) экземпляр асинхронного модуля запускался
    // после второго и в destroy снимал класс, нужный живому экземпляру.
    const inits = vi.fn()
    async function shared(el) {
      inits()
      await Promise.resolve()
      el.classList.add('is-on')
      return { destroy: () => el.classList.remove('is-on') }
    }
    function Box() {
      return <div ref={useModule(shared)} data-testid="box" />
    }
    render(
      <StrictMode>
        <Box />
      </StrictMode>,
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(screen.getByTestId('box').classList.contains('is-on')).toBe(true)
    expect(inits).toHaveBeenCalledTimes(1)
  })

  it('размонтировали до запуска — модуль не запускается вовсе', async () => {
    const init = vi.fn(() => ({ destroy: vi.fn() }))
    function Box() {
      return <div ref={useModule(init)} />
    }
    const { unmount } = render(<Box />)
    unmount()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5))
    })
    expect(init).not.toHaveBeenCalled()
  })

  it('ленивый модуль, размонтированный во время загрузки, убирается после неё', async () => {
    const destroy = vi.fn()
    let finishLoading
    const mod = lazy(() => new Promise((resolve) => (finishLoading = () => resolve({ default: () => ({ destroy }) }))))
    function Box() {
      return <div ref={useModule(mod)} />
    }
    const { unmount } = render(<Box />)
    await act(async () => {}) // запуск начался — грузится код модуля
    unmount()
    await act(async () => {
      finishLoading()
      await new Promise((r) => setTimeout(r, 5))
    })
    expect(destroy).toHaveBeenCalled()
  })
})

describe('хуки', () => {
  it('useMediaQuery / useBreakpoint / useReducedMotion', () => {
    setMedia({ '(prefers-reduced-motion: reduce)': true, '(min-width: 1024px)': true })
    function Probe() {
      return (
        <p>
          {String(useMediaQuery('(min-width: 1px)'))}/{String(useBreakpoint('lg'))}/{String(useReducedMotion())}
        </p>
      )
    }
    render(<Probe />)
    expect(screen.getByText('false/true/true')).toBeTruthy()
  })

  it('useBus получает события провайдера', async () => {
    const got = []
    let bus
    function Listener() {
      bus = useKit().bus
      useBus('x', (v) => got.push(v))
      return null
    }
    render(
      <KitProvider smooth={false}>
        <Listener />
      </KitProvider>,
    )
    await act(async () => bus.emit('x', 1))
    expect(got).toEqual([1])
  })
})
