import { describe, expect, it, vi } from 'vitest'
import hello from './index.js'
import { createCtx, html } from '@test/helpers.js'

describe('hello (пример модуля проекта)', () => {
  it('показывает тост и шлёт событие', () => {
    const ctx = createCtx()
    const said = vi.fn()
    ctx.bus.on('hello:said', said)
    const el = html('<button data-hello-name="Дима">Привет</button>')
    const api = hello(el, ctx)
    el.click()
    expect(document.querySelector('.toast').textContent).toContain('Привет, Дима!')
    expect(said).toHaveBeenCalledWith('Дима')
    api.destroy()
    el.click()
    expect(said).toHaveBeenCalledTimes(1)
  })
})
