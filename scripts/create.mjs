#!/usr/bin/env node
/**
 * Создать новый проект из шаблона — или обновить кит в существующем.
 *
 *   npm run create                                   — спросит всё сам
 *   npm run create -- ../my-site --stack vanilla     — без вопросов
 *   npm run create -- ../my-app --stack react --install --git
 *   npm run create -- --update ../my-site            — обновить папку kit/ в проекте
 *
 * ─── Что получается ─────────────────────────────────────────────────────────
 * Самостоятельный проект: внутри своя копия kit/ (без зависимости от этого
 * шаблона), свой package.json только с нужными пакетами, настройки линтеров,
 * тесты, документация. Его можно отдать заказчику или другому разработчику —
 * всё работает после `npm install`.
 *
 * ─── Почему копия, а не npm-пакет ───────────────────────────────────────────
 * На фрилансе проекты живут годами и отдельно друг от друга. Пакет придётся
 * публиковать и версионировать, а правка под один проект ломает другие.
 * Копию можно менять под проект; обновить её из шаблона — `--update`
 * (перед этим закоммитьте проект — будет видно, что изменилось).
 * @module scripts/create
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { execSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

export const TEMPLATE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/**
 * Стеки:
 *   vanilla  — Vite + HTML-страницы + JS-модули (вёрстка под CMS, лендинги);
 *   react    — React + Vite (SPA) на JS;
 *   react-ts — то же на TypeScript (строгая проверка);
 *   astro    — Astro: статические страницы, мультиязычность, SEO, TS.
 */
export const STACKS = ['vanilla', 'react', 'react-ts', 'astro']
/** Стеки, которым нужна папка kit/react. */
const USES_REACT = new Set(['react', 'react-ts'])

/** Общие файлы, которые копируются в любой проект. */
const SHARED_FILES = [
  '.editorconfig',
  '.gitignore',
  '.nvmrc',
  '.prettierrc.json',
  '.prettierignore',
  'eslint.config.js',
  'stylelint.config.js',
  'vitest.config.js',
]

/** Что не копировать никогда. */
const SKIP = new Set(['node_modules', 'dist', 'coverage', '.DS_Store', '.tmp'])

/** Пакеты по стекам. Версии берутся из package.json шаблона — один источник. */
export const PACKAGES = {
  common: {
    dependencies: ['gsap', 'lenis', 'swiper', 'three'],
    devDependencies: [
      '@eslint/js',
      '@types/node',
      '@types/three',
      '@vitest/coverage-v8',
      'eslint',
      'globals',
      'jsdom',
      'prettier',
      'sass',
      'stylelint',
      'stylelint-config-standard-scss',
      'typescript',
      'vite',
      'vitest',
    ],
  },
  react: {
    dependencies: ['react', 'react-dom', 'react-router'],
    devDependencies: [
      '@vitejs/plugin-react',
      '@testing-library/dom',
      '@testing-library/react',
      'eslint-plugin-react-hooks',
    ],
  },
  'react-ts': {
    dependencies: ['react', 'react-dom', 'react-router'],
    devDependencies: [
      '@vitejs/plugin-react',
      '@testing-library/dom',
      '@testing-library/react',
      '@types/react',
      '@types/react-dom',
      'eslint-plugin-react-hooks',
      'typescript-eslint',
    ],
  },
  astro: {
    dependencies: ['astro', '@astrojs/sitemap'],
    devDependencies: ['@astrojs/check', 'typescript-eslint'],
  },
  vanilla: { dependencies: [], devDependencies: [] },
}

/** Скрипты по стекам (у Astro своя команда вместо vite). */
const SCRIPTS = {
  vite: { dev: 'vite', build: 'vite build', preview: 'vite preview', typecheck: 'tsc -p .' },
  astro: { dev: 'astro dev', build: 'astro build', preview: 'astro preview', typecheck: 'astro check' },
}

/** Имя пакета npm из имени папки: «Мой Сайт» → «moi-sait»? Нет — просто латиница/цифры/дефис. */
export function packageName(dir) {
  const name = basename(resolve(dir))
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return name || 'new-project'
}

/** package.json нового проекта: только нужные пакеты и понятные скрипты. */
export function buildPackageJson({ name, stack, template = readJson(join(TEMPLATE, 'package.json')) }) {
  const versions = { ...template.dependencies, ...template.devDependencies }
  const pick = (names) =>
    Object.fromEntries(
      names.sort().map((n) => {
        if (!versions[n]) throw new Error(`В package.json шаблона нет версии пакета ${n}`)
        return [n, versions[n]]
      }),
    )
  return {
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    engines: template.engines,
    scripts: {
      ...SCRIPTS[stack === 'astro' ? 'astro' : 'vite'],
      test: 'vitest run',
      'test:watch': 'vitest',
      coverage: 'vitest run --coverage',
      lint: 'npm run lint:js && npm run lint:css',
      'lint:js': 'eslint .',
      'lint:css': 'stylelint "**/*.scss"',
      fix: 'eslint . --fix && stylelint "**/*.scss" --fix && prettier . --write --log-level warn',
      check: 'npm run lint && npm run typecheck && npm test && npm run build',
    },
    dependencies: pick([...PACKAGES.common.dependencies, ...PACKAGES[stack].dependencies]),
    devDependencies: pick([...PACKAGES.common.devDependencies, ...PACKAGES[stack].devDependencies]),
  }
}

/**
 * Поправить пути в файлах стартера: в шаблоне кит и тесты лежат на два
 * уровня выше (starters/vanilla → ../../kit), в проекте — рядом (./kit).
 */
export const rewriteKitPaths = (text) => text.replaceAll('../../kit', './kit').replaceAll('../../test', './test')

/** Файлы конфигурации стартера, в которых есть пути к киту. */
const CONFIGS = ['vite.config.js', 'vite.config.ts', 'astro.config.mjs', 'tsconfig.json']

/**
 * tsconfig для JS-проектов (vanilla, react) — из корневого tsconfig шаблона,
 * но с путями проекта (src/ вместо starters/…).
 */
export const projectTsconfig = (text) =>
  text
    .replace(/"include": \[[^\]]*\]/, '"include": ["kit/**/*", "kit/types/*.d.ts", "src/**/*", "*.config.js"]')
    .replace(', "starters/react-ts"', '')

/** Фильтр копирования кита: kit/react — только React-стекам. */
export const kitFilter = (stack) => (src) => {
  const rel = relative(join(TEMPLATE, 'kit'), src)
  if (SKIP.has(basename(src))) return false
  if (!USES_REACT.has(stack) && (rel === 'react' || rel.startsWith(`react${sep}`))) return false
  return true
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'))
const notSkipped = (src) => !SKIP.has(basename(src)) && basename(src) !== '.astro'

const STACK_NAMES = {
  vanilla: 'Vite + HTML + JS',
  react: 'React + Vite',
  'react-ts': 'React + TypeScript + Vite',
  astro: 'Astro + TypeScript',
}

const STRUCTURE = {
  vanilla:
    '| `*.html`, `partials/` | страницы и общие куски (шапка, подвал) |\n| `src/modules/` | модули ЭТОГО проекта (data-module) |',
  react: '| `src/pages/`, `src/components/` | страницы и компоненты React |',
  'react-ts': '| `src/pages/`, `src/components/` | страницы и компоненты React (TypeScript) |',
  astro:
    '| `src/pages/` | страницы (русские в корне, английские в `en/`) |\n| `src/components/`, `src/layouts/` | компоненты и каркас |\n| `src/i18n/ui.ts` | тексты на всех языках |',
}

function projectReadme({ name, stack }) {
  const devUrl = stack === 'astro' ? 'http://localhost:4321' : 'http://localhost:5173'
  return `# ${name}

Проект создан из шаблона **frontend-kit** (стек: ${STACK_NAMES[stack]}).

\`\`\`bash
npm install
npm run dev        # ${devUrl}
npm test           # тесты
npm run check      # линтеры + тесты + сборка — перед сдачей
npm run build      # готовый сайт в dist/
\`\`\`

## Где что

| Папка | Что там |
| --- | --- |
${STRUCTURE[stack]}
| \`src/styles/\` | стили проекта; настройки цвета/шрифтов — \`_abstracts.scss\` |
| \`mocks/\` | фейковый API для разработки (\`/api/*\`) |
| \`kit/\` | общий кит: модули, SCSS, dev-инструменты. Под проект можно менять |
| \`docs/\` | документация: с чего начать, рецепты, **частые баги** |

Dev-панель (сетка, макет, проверки): кнопка ⚙ в углу или Shift+Alt+K — только в \`npm run dev\`.

Начните с [docs/README.md](docs/README.md).
`
}

/**
 * Создать проект.
 * @param {{ target: string, stack: string, name?: string, log?: (s: string) => void }} o
 */
export function createProject({ target, stack, name = packageName(target), log = console.log }) {
  if (!STACKS.includes(stack)) throw new Error(`Стек «${stack}» не знаю. Есть: ${STACKS.join(', ')}`)
  const dest = resolve(target)
  if (dest === TEMPLATE || dest.startsWith(TEMPLATE + sep)) {
    throw new Error('Проект нельзя создавать внутри шаблона — укажите папку рядом: ../my-site')
  }
  if (existsSync(dest) && readdirSync(dest).length) throw new Error(`Папка ${dest} уже существует и не пуста`)
  mkdirSync(dest, { recursive: true })

  // 1. Стартер — в корень проекта.
  cpSync(join(TEMPLATE, 'starters', stack), dest, { recursive: true, filter: notSkipped })
  // 2. Кит, тестовые помощники, документация.
  cpSync(join(TEMPLATE, 'kit'), join(dest, 'kit'), { recursive: true, filter: kitFilter(stack) })
  cpSync(join(TEMPLATE, 'test'), join(dest, 'test'), { recursive: true, filter: notSkipped })
  if (existsSync(join(TEMPLATE, 'docs')))
    cpSync(join(TEMPLATE, 'docs'), join(dest, 'docs'), { recursive: true, filter: notSkipped })
  // 3. Настройки инструментов. tsconfig: у react-ts и astro — свой (уже скопирован
  //    со стартером), JS-проектам — общий с проверкой JSDoc.
  for (const file of SHARED_FILES) cpSync(join(TEMPLATE, file), join(dest, file))
  if (!existsSync(join(dest, 'tsconfig.json'))) {
    writeFileSync(join(dest, 'tsconfig.json'), projectTsconfig(readFileSync(join(TEMPLATE, 'tsconfig.json'), 'utf8')))
  }
  // 4. Пути к киту.
  for (const file of CONFIGS) {
    const path = join(dest, file)
    if (existsSync(path)) writeFileSync(path, rewriteKitPaths(readFileSync(path, 'utf8')))
  }
  // 5. Стартер README.md был про шаблон — заменяем README проекта.
  writeFileSync(join(dest, 'README.md'), projectReadme({ name, stack }))
  writeFileSync(join(dest, 'package.json'), `${JSON.stringify(buildPackageJson({ name, stack }), null, 2)}\n`)

  log(`✓ Проект ${name} (${stack}) создан: ${dest}`)
  return dest
}

/** Обновить kit/ в существующем проекте (перезаписывает файлы кита). */
export function updateKit({ target, log = console.log }) {
  const dest = resolve(target)
  const pkg = join(dest, 'package.json')
  if (!existsSync(join(dest, 'kit')) || !existsSync(pkg))
    throw new Error(`${dest} — не проект из шаблона (нет kit/ или package.json)`)
  const deps = readJson(pkg).dependencies ?? {}
  const stack = deps.react ? 'react' : deps.astro ? 'astro' : 'vanilla'
  cpSync(join(TEMPLATE, 'kit'), join(dest, 'kit'), { recursive: true, filter: kitFilter(stack) })
  cpSync(join(TEMPLATE, 'test'), join(dest, 'test'), { recursive: true, filter: notSkipped })
  log(`✓ Кит обновлён в ${dest} (${stack}). Посмотрите изменения: git diff kit/`)
  return dest
}

/** Разобрать аргументы командной строки. */
export function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (['stack', 'name'].includes(key) && next && !next.startsWith('--')) {
        args[key] = next
        i++
      } else args[key] = true
    } else args._.push(arg)
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    console.log(
      readFileSync(fileURLToPath(import.meta.url), 'utf8')
        .split('\n')
        .slice(2, 8)
        .join('\n'),
    )
    return
  }
  if (args.update) {
    updateKit({ target: args._[0] ?? (typeof args.update === 'string' ? args.update : '.') })
    return
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = async (question, fallback) => (await rl.question(`${question} [${fallback}]: `)).trim() || fallback
  const target = args._[0] ?? (await ask('Папка проекта', '../new-project'))
  const stack = args.stack ?? (await ask(`Стек (${STACKS.join(' / ')})`, 'vanilla'))
  rl.close()

  const dest = createProject({ target, stack, name: args.name })
  if (args.git) {
    execSync('git init -q && git add -A && git commit -qm "Начальная версия из frontend-kit"', {
      cwd: dest,
      stdio: 'inherit',
    })
    console.log('✓ git-репозиторий создан')
  }
  if (args.install) execSync('npm install', { cwd: dest, stdio: 'inherit' })
  console.log(
    `\nДальше:\n  cd ${relative(process.cwd(), dest) || '.'}\n${args.install ? '' : '  npm install\n'}  npm run dev\n`,
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ ${error.message}`)
    process.exit(1)
  })
}
