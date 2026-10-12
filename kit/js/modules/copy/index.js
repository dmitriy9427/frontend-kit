/**
 * Копирование в буфер обмена по клику — промокод, ссылка, реквизиты.
 *
 *   <body data-module="copy">                                   один раз на страницу (или на обёртке)
 *   <button data-copy="PROMO2026">Скопировать промокод</button>   текст — в атрибуте
 *   <button data-copy data-copy-target="#inn">Скопировать ИНН</button>  текст — из элемента (value или текст)
 *   <button data-copy>Скопировать ссылку</button>                 без текста — адрес страницы
 *   <button data-copy="…" data-copy-message="Промокод скопирован">…</button>   свой текст уведомления
 *
 * После копирования: уведомление (toast), класс is-copied на кнопке на 2 с
 * (сменить иконку на галочку), событие copy:done.
 *
 * Из своего кода: import { copyText } from 'kit/js/modules/copy/index.js'
 *
 * ─── Баги, закрытые здесь ───────────────────────────────────────────────────
 * 1. navigator.clipboard нет на http:// и в старых браузерах — запасной путь
 *    через скрытое поле и execCommand.
 * 2. Браузер запретил доступ к буферу — не молчим: уведомление об ошибке,
 *    чтобы человек скопировал вручную.
 * @module kit/modules/copy
 */
import { delegate } from '../../core/dom.js'
import { t } from '../../core/i18n.js'
import { toast } from '../toast/index.js'

/**
 * Скопировать текст. @returns {Promise<boolean>} получилось ли
 * @param {string} text
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // нет разрешения — пробуем запасной путь
  }
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
  document.body.append(field)
  field.select()
  let ok
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  field.remove()
  return ok
}

/** Что копировать для кнопки: атрибут → элемент-источник → адрес страницы. */
export function textFor(button) {
  if (button.dataset.copy) return button.dataset.copy
  const selector = button.dataset.copyTarget
  if (selector) {
    const source = document.querySelector(selector)
    if (!source) {
      console.warn(`[kit] copy: не найден элемент «${selector}»`)
      return ''
    }
    return ('value' in source ? String(source.value) : source.textContent).trim()
  }
  return location.href
}

export default function copy(root, ctx = {}) {
  const timers = new Map()
  const off = delegate(root, 'click', '[data-copy]', async (event, button) => {
    event.preventDefault()
    const text = textFor(button)
    if (!text) return
    const ok = await copyText(text)
    if (ok) {
      button.classList.add('is-copied')
      clearTimeout(timers.get(button))
      timers.set(
        button,
        setTimeout(() => button.classList.remove('is-copied'), 2000),
      )
    }
    if (button.dataset.copyToast !== 'false') {
      toast(ok ? button.dataset.copyMessage || t('kit.copy.done') : t('kit.copy.failed'), {
        type: ok ? 'success' : 'error',
      })
    }
    const name = ok ? 'copy:done' : 'copy:error'
    button.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { text } }))
    ctx.bus?.emit(name, { el: button, text })
  })
  return {
    destroy() {
      off()
      timers.forEach((id) => clearTimeout(id))
    },
  }
}
