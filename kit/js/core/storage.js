/**
 * Безопасная работа с localStorage.
 *
 * localStorage может бросить исключение: приватный режим Safari, запрет
 * cookies, переполнение квоты, встраивание в iframe. Наивный
 * `localStorage.setItem(...)` в таких случаях роняет весь скрипт страницы.
 * Здесь любая ошибка = «нет сохранённого значения», страница работает.
 * @module kit/core/storage
 */

export function readStorage(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStorage(key) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // нечего делать: хранилище недоступно
  }
}
