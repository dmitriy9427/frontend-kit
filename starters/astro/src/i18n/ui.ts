/**
 * Тексты страниц на всех языках + помощники.
 *
 * Добавить язык:
 *   1. astro.config.mjs → i18n.locales: ['ru', 'en', 'de'];
 *   2. сюда — словарь de с теми же ключами (TypeScript подскажет пропуски);
 *   3. страницы — src/pages/de/… (копии en/ с locale="de");
 *   4. тексты кита (ошибки форм и т.п.) — addMessages('de', …) в scripts/app.ts.
 */
export const LOCALES = ['ru', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'ru'

export const LOCALE_NAMES: Record<Locale, string> = { ru: 'Русский', en: 'English' }

const ru = {
  'meta.title': 'Новый проект — главная',
  'meta.description': 'Стартовая страница проекта на Astro и frontend-kit',
  'nav.home': 'Главная',
  'nav.features': 'Возможности',
  'nav.faq': 'Вопросы',
  'nav.contact': 'Связаться',
  skip: 'Перейти к содержимому',
  'hero.eyebrow': 'Astro-стартер',
  'hero.title': 'Быстрые страницы, которые не ломаются',
  'hero.lead': 'Статический HTML, модули кита и два языка из коробки. Замените тексты — и можно показывать заказчику.',
  'hero.cta': 'Обсудить проект',
  'features.title': 'Что внутри',
  'features.items': [
    ['Мультиязычность', 'Адреса / и /en/, hreflang, sitemap для обоих языков.'],
    ['Модули кита', 'Табы, модалки, формы с масками, Swiper, эффекты на GSAP.'],
    ['TypeScript', 'Строгая проверка .astro и .ts, подсказки для модулей.'],
  ],
  'faq.title': 'Вопросы',
  'faq.items': [
    ['Почему Astro?', 'Страницы собираются в HTML заранее: мгновенно открываются и хорошо индексируются.'],
    ['Где тексты?', 'В src/i18n/ui.ts — по словарю на язык.'],
  ],
  'form.title': 'Обсудим проект?',
  'form.name': 'Имя',
  'form.phone': 'Телефон',
  'form.consent': 'Соглашаюсь с обработкой персональных данных',
  'form.submit': 'Отправить',
  'footer.rights': 'Все права защищены',
  'notFound.title': 'Страница не найдена',
  'notFound.back': 'На главную',
} as const

type Dictionary = {
  [K in keyof typeof ru]: (typeof ru)[K] extends readonly unknown[] ? readonly (readonly [string, string])[] : string
}

const en: Dictionary = {
  'meta.title': 'New project — home',
  'meta.description': 'Starter page built with Astro and frontend-kit',
  'nav.home': 'Home',
  'nav.features': 'Features',
  'nav.faq': 'FAQ',
  'nav.contact': 'Contact',
  skip: 'Skip to content',
  'hero.eyebrow': 'Astro starter',
  'hero.title': 'Fast pages that do not break',
  'hero.lead': 'Static HTML, kit modules and two languages out of the box. Replace the copy and show it to the client.',
  'hero.cta': 'Discuss a project',
  'features.title': 'What’s inside',
  'features.items': [
    ['Multilingual', 'URLs / and /en/, hreflang, sitemap for both languages.'],
    ['Kit modules', 'Tabs, dialogs, forms with masks, Swiper, GSAP effects.'],
    ['TypeScript', 'Strict checks for .astro and .ts, hints for modules.'],
  ],
  'faq.title': 'FAQ',
  'faq.items': [
    ['Why Astro?', 'Pages are pre-rendered to HTML: they open instantly and index well.'],
    ['Where is the copy?', 'In src/i18n/ui.ts — one dictionary per language.'],
  ],
  'form.title': 'Let’s talk?',
  'form.name': 'Name',
  'form.phone': 'Phone',
  'form.consent': 'I agree to the processing of personal data',
  'form.submit': 'Send',
  'footer.rights': 'All rights reserved',
  'notFound.title': 'Page not found',
  'notFound.back': 'Back home',
}

export const ui = { ru, en } satisfies Record<Locale, Dictionary>

/** Переводчик для страницы: const t = useTranslations(Astro.currentLocale). */
export function useTranslations(locale: string | undefined) {
  const lang = (LOCALES as readonly string[]).includes(locale ?? '') ? (locale as Locale) : DEFAULT_LOCALE
  return <K extends keyof typeof ru>(key: K): Dictionary[K] =>
    (ui[lang][key] ?? ui[DEFAULT_LOCALE][key]) as Dictionary[K]
}

/** Адрес страницы на нужном языке: localePath('en', '/about') → '/en/about'. */
export function localePath(locale: Locale, path = '/') {
  const clean = path.startsWith('/') ? path : `/${path}`
  return locale === DEFAULT_LOCALE ? clean : `/${locale}${clean === '/' ? '/' : clean}`
}

/** Убрать языковой префикс: '/en/about' → '/about'. */
export function stripLocale(pathname: string) {
  const [, first, ...rest] = pathname.split('/')
  return (LOCALES as readonly string[]).includes(first) && first !== DEFAULT_LOCALE ? `/${rest.join('/')}` : pathname
}
