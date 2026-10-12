import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CONSENT_KEY,
  activateConsented,
  clearConsent,
  getConsent,
  hasConsent,
  onConsentChange,
  whenConsent,
  writeConsent,
} from './consent.js'
import { html } from '@test/helpers.js'

const record = (categories, extra = {}) => ({
  id: 'r1',
  version: '1',
  action: 'custom',
  categories,
  date: '2026-01-01T00:00:00.000Z',
  expiresAt: 0,
  synced: true,
  ...extra,
})

afterEach(() => localStorage.clear())

describe('consent (состояние согласия на cookies)', () => {
  it('пока не выбрано — ничего не разрешено; после записи — по категориям', () => {
    expect(getConsent()).toBe(null)
    expect(hasConsent('analytics')).toBe(false)
    writeConsent(record({ necessary: true, analytics: true, marketing: false }))
    expect(hasConsent('analytics')).toBe(true)
    expect(hasConsent('marketing')).toBe(false)
    expect(hasConsent('unknown')).toBe(false)
  })

  it('истёкшая или испорченная запись = выбора нет', () => {
    writeConsent(record({ analytics: true }, { expiresAt: Date.now() - 1 }))
    expect(hasConsent('analytics')).toBe(false)
    localStorage.setItem(CONSENT_KEY, '{"categories":"все"}')
    expect(getConsent()).toBe(null)
    localStorage.setItem(CONSENT_KEY, 'не json')
    expect(getConsent()).toBe(null)
  })

  it('подписка: запись и сброс оповещают, silent — нет', () => {
    const seen = []
    const off = onConsentChange((r) => seen.push(r?.categories ?? null))
    writeConsent(record({ analytics: true }))
    writeConsent(record({ analytics: true }), { silent: true })
    clearConsent()
    off()
    writeConsent(record({ analytics: false }))
    expect(seen).toEqual([{ analytics: true }, null])
  })

  it('whenConsent: сразу, если разрешено; иначе один раз, когда разрешат', () => {
    const fn = vi.fn()
    whenConsent('analytics', fn)
    writeConsent(record({ analytics: false }))
    expect(fn).not.toHaveBeenCalled()
    writeConsent(record({ analytics: true }))
    writeConsent(record({ analytics: true }))
    expect(fn).toHaveBeenCalledTimes(1)
    whenConsent('analytics', fn)
    expect(fn).toHaveBeenCalledTimes(2)
    const cancelled = vi.fn()
    whenConsent('marketing', cancelled)()
    writeConsent(record({ marketing: true }))
    expect(cancelled).not.toHaveBeenCalled()
  })

  it('включает отложенные скрипты и iframe только разрешённых категорий', () => {
    const root = html(`<div>
      <script type="text/plain" data-cookie-category="analytics" data-id="a" async>document.body.dataset.ran = "a"</script>
      <script type="text/plain" data-cookie-category="marketing" data-id="m">document.body.dataset.ran = "m"</script>
      <script type="text/plain" data-cookie-category="analytics" data-cookie-type="module" data-id="mod"></script>
      <iframe data-cookie-category="analytics" data-src="about:blank"></iframe>
    </div>`)
    const original = root.querySelector('[data-id="a"]')
    expect(activateConsented(root)).toBe(0)
    writeConsent(record({ analytics: true, marketing: false }))
    expect(activateConsented(root)).toBe(3)
    const script = root.querySelector('[data-id="a"]')
    expect(script).not.toBe(original) // новый элемент: смену type у старого браузер не выполнит
    expect(script.hasAttribute('type')).toBe(false)
    expect(script.hasAttribute('async')).toBe(true)
    expect(document.body.dataset.ran).toBe('a') // выполнился только разрешённый
    expect(root.querySelector('[data-id="mod"]').type).toBe('module')
    expect(root.querySelector('[data-id="m"]').type).toBe('text/plain')
    expect(root.querySelector('iframe').getAttribute('src')).toBe('about:blank')
    // Повторный вызов уже включённое не трогает.
    expect(activateConsented(root)).toBe(0)
    delete document.body.dataset.ran
  })
})
