import { describe, expect, it, vi } from 'vitest'
import priceCalc from './price-calc.js'
import { createCtx, html } from '@test/helpers.js'

const markup = `
  <form data-price-calc-base="10000" data-price-calc-per-page="1000">
    <b data-calc-pages-out></b>
    <input type="range" name="pages" value="5" data-calc-pages />
    <input type="checkbox" name="extras" value="3000" data-label="SEO" />
    <output data-calc-total></output>
    <button type="button" data-calc-order>Обсудить</button>
  </form>`

describe('price-calc', () => {
  it('считает сумму из настроек, страниц и опций', () => {
    const el = html(markup)
    const api = priceCalc(el, createCtx())
    expect(el.querySelector('[data-calc-total]').textContent).toBe(`${(15000).toLocaleString('ru-RU')} ₽`)
    el.querySelector('input[name="extras"]').click()
    expect(api.value).toEqual({ pages: 5, extras: ['SEO'], sum: 18000 })
    api.destroy()
  })

  it('«Обсудить» ждёт модалку через ctx.modules и открывает её с расчётом', async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="callback"><input name="comment" /><p data-callback-note></p></div>',
    )
    const dialog = { open: vi.fn() }
    const ctx = createCtx({ modules: { when: vi.fn(async () => dialog) } })
    const ordered = vi.fn()
    ctx.bus.on('price:order', ordered)
    const el = html(markup)
    priceCalc(el, ctx)
    el.querySelector('[data-calc-order]').click()
    await vi.waitFor(() => expect(dialog.open).toHaveBeenCalled())
    expect(ctx.modules.when).toHaveBeenCalledWith('#callback', 'dialog')
    expect(document.querySelector('#callback [name="comment"]').value).toContain('5 стр.')
    expect(ordered).toHaveBeenCalledWith(expect.objectContaining({ sum: 15000 }))
  })
})
