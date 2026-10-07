/**
 * Тесты создания проекта: файлы на месте, пути переписаны, лишнего нет.
 * @vitest-environment node
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { buildPackageJson, createProject, packageName, parseArgs, rewriteKitPaths, updateKit } from './create.mjs'

const root = mkdtempSync(join(tmpdir(), 'kit-create-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
const quiet = () => {}

describe('create', () => {
  it('vanilla: стартер в корне, кит без react, пути переписаны, package.json без React', () => {
    const dest = createProject({ target: join(root, 'My Site'), stack: 'vanilla', log: quiet })
    for (const file of [
      'index.html',
      'src/components/site-header/site-header.html',
      'src/data/site.json',
      'src/icons/check.svg',
      'kit/cli/new.mjs',
      'src/main.js',
      'kit/js/core/app.js',
      'kit/scss/_index.scss',
      'docs/README.md',
      'test/setup.js',
      'eslint.config.js',
      'mocks/callback.js',
      '.gitignore',
    ]) {
      expect(existsSync(join(dest, file)), file).toBe(true)
    }
    expect(existsSync(join(dest, 'kit/react'))).toBe(false)
    expect(existsSync(join(dest, 'dist'))).toBe(false)
    const vite = readFileSync(join(dest, 'vite.config.js'), 'utf8')
    expect(vite).toContain("'./kit/vite/index.js'")
    expect(vite).not.toContain('../../kit')
    const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-site')
    expect(pkg.dependencies).toHaveProperty('gsap')
    expect(pkg.dependencies).not.toHaveProperty('react')
    expect(pkg.scripts.dev).toBe('vite')
    expect(pkg.scripts.new).toBe('node kit/cli/new.mjs')
    expect(pkg.devDependencies).toHaveProperty('htmlparser2')
    expect(readFileSync(join(dest, 'README.md'), 'utf8')).toContain('# my-site')
  })

  it('react: есть kit/react и React-пакеты', () => {
    const dest = createProject({ target: join(root, 'app'), stack: 'react', log: quiet })
    expect(existsSync(join(dest, 'kit/react/useModule.js'))).toBe(true)
    expect(existsSync(join(dest, 'src/App.jsx'))).toBe(true)
    const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
    expect(pkg.dependencies).toHaveProperty('react')
    expect(pkg.devDependencies).toHaveProperty('@vitejs/plugin-react')
  })

  it('понятные ошибки: неизвестный стек, непустая папка, внутри шаблона', () => {
    expect(() => createProject({ target: join(root, 'x'), stack: 'vue', log: quiet })).toThrow(/vue/)
    expect(() => createProject({ target: join(root, 'app'), stack: 'react', log: quiet })).toThrow(/не пуста/)
    expect(() => createProject({ target: './inside', stack: 'vanilla', log: quiet })).toThrow(/внутри шаблона/)
  })

  it('updateKit перезаписывает кит и определяет стек', () => {
    const dest = join(root, 'My Site')
    writeFileSync(join(dest, 'kit/js/core/math.js'), '// испорчено')
    updateKit({ target: dest, log: quiet })
    expect(readFileSync(join(dest, 'kit/js/core/math.js'), 'utf8')).toContain('export const clamp')
    expect(existsSync(join(dest, 'kit/react'))).toBe(false)
    expect(() => updateKit({ target: root, log: quiet })).toThrow(/не проект/)
  })

  it('мелкие функции', () => {
    expect(packageName('/a/Мой Сайт 2')).toBe('2')
    expect(packageName('/a/!!!')).toBe('new-project')
    expect(rewriteKitPaths("import x from '../../kit/vite'")).toBe("import x from './kit/vite'")
    expect(parseArgs(['../site', '--stack', 'react', '--git'])).toEqual({ _: ['../site'], stack: 'react', git: true })
    expect(() =>
      buildPackageJson({ name: 'a', stack: 'vanilla', template: { dependencies: {}, devDependencies: {} } }),
    ).toThrow(/нет версии/)
  })
})

describe('create: TypeScript и Astro', () => {
  it('react-ts: tsx, свой строгий tsconfig с путями проекта', () => {
    const dest = createProject({ target: join(root, 'ts-app'), stack: 'react-ts', log: quiet })
    expect(existsSync(join(dest, 'src/App.tsx'))).toBe(true)
    expect(existsSync(join(dest, 'kit/react/useModule.js'))).toBe(true)
    const tsconfig = readFileSync(join(dest, 'tsconfig.json'), 'utf8')
    expect(tsconfig).toContain('"strict": true')
    expect(tsconfig).toContain('"./kit/*"')
    expect(tsconfig).not.toContain('../../')
    expect(readFileSync(join(dest, 'vite.config.ts'), 'utf8')).toContain("'./kit/vite/index.js'")
    const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
    expect(pkg.devDependencies).toHaveProperty('typescript-eslint')
    expect(pkg.scripts.typecheck).toBe('tsc -p .')
  })

  it('astro: команды astro, без kit/react, пути в astro.config', () => {
    const dest = createProject({ target: join(root, 'site-astro'), stack: 'astro', log: quiet })
    expect(existsSync(join(dest, 'src/i18n/ui.ts'))).toBe(true)
    expect(existsSync(join(dest, 'kit/react'))).toBe(false)
    expect(readFileSync(join(dest, 'astro.config.mjs'), 'utf8')).toContain("'./kit/vite/index.js'")
    const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
    expect(pkg.scripts.dev).toBe('astro dev')
    expect(pkg.dependencies).toHaveProperty('astro')
    expect(pkg.dependencies).toHaveProperty('swiper')
  })

  it('vanilla получает tsconfig с проверкой JSDoc для своих путей', () => {
    const tsconfig = readFileSync(join(root, 'My Site', 'tsconfig.json'), 'utf8')
    expect(tsconfig).toContain('"checkJs": true')
    expect(tsconfig).toContain('"src/**/*"')
    expect(tsconfig).not.toContain('starters')
  })
})
