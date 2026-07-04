import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-source-hygiene.mjs')

describe('source hygiene script', () => {
  it.each([
    ['TSX', 'App.tsx', 'export function App() { return <main /> }\n'],
    ['MTS', 'module.mts', 'export const ok = true\n'],
    ['CTS', 'module.cts', 'export const ok = true\n'],
    ['CJS', 'module.cjs', 'module.exports = { ok: true }\n'],
    ['HTML', 'index.html', '<main></main>\n']
  ])('scans %s browser-facing examples for console output', (_label, fileName, cleanSource) => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-source-hygiene-'))

    try {
      createFixtureLayout(fixture)
      writeFileSync(join(fixture, 'examples', fileName), cleanSource)

      expect(runSourceHygiene(fixture)).toContain('Source hygiene check passed')

      writeFileSync(join(fixture, 'examples', fileName), "console.log('leak')\n")

      expect(() => runSourceHygiene(fixture)).toThrow(/contains console output/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('scans VitePress theme source while ignoring generated VitePress output', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-source-hygiene-'))

    try {
      createFixtureLayout(fixture)
      mkdirSync(join(fixture, 'docs/.vitepress/theme/components'), { recursive: true })
      mkdirSync(join(fixture, 'docs/.vitepress/cache'), { recursive: true })
      writeFileSync(
        join(fixture, 'docs/.vitepress/theme/components/Demo.vue'),
        '<script setup lang="ts">const ok = true</script>\n<template><main /></template>\n'
      )
      writeFileSync(join(fixture, 'docs/.vitepress/cache/generated.ts'), 'debugger\n')

      expect(runSourceHygiene(fixture)).toContain('Source hygiene check passed')

      writeFileSync(
        join(fixture, 'docs/.vitepress/theme/components/Demo.vue'),
        '<script setup lang="ts">\ndebugger\n</script>\n<template><main /></template>\n'
      )

      expect(() => runSourceHygiene(fixture)).toThrow(/contains a debugger statement/)

      writeFileSync(
        join(fixture, 'docs/.vitepress/theme/components/Demo.vue'),
        '<script setup lang="ts">\n// @ts-ignore\nconst ok = true\n</script>\n<template><main /></template>\n'
      )

      expect(() => runSourceHygiene(fixture)).toThrow(
        /contains a broad lint, coverage, or TypeScript suppression/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects trailing whitespace in scanned text files', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-source-hygiene-'))

    try {
      createFixtureLayout(fixture)
      writeFileSync(join(fixture, 'README.md'), 'Clean line\n')

      expect(runSourceHygiene(fixture)).toContain('Source hygiene check passed')

      writeFileSync(join(fixture, 'README.md'), 'Trailing spaces  \n')

      expect(() => runSourceHygiene(fixture)).toThrow(/README\.md:1 contains trailing whitespace/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects missing generated-output and credential ignore entries', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-source-hygiene-'))

    try {
      createFixtureLayout(fixture)

      expect(runSourceHygiene(fixture)).toContain('Source hygiene check passed')

      writeFileSync(
        join(fixture, '.gitignore'),
        requiredGitignoreEntries()
          .filter((entry) => entry !== '*.pem')
          .join('\n')
      )

      expect(() => runSourceHygiene(fixture)).toThrow(/\.gitignore must ignore private keys/)

      writeFileSync(join(fixture, '.gitignore'), requiredGitignoreEntries().join('\n'))
      writeFileSync(
        join(fixture, '.sembleignore'),
        requiredSembleignoreEntries()
          .filter((entry) => entry !== 'docs/.vitepress')
          .join('\n')
      )

      expect(() => runSourceHygiene(fixture)).toThrow(
        /\.sembleignore must ignore vitepress internals/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixtureLayout(fixture: string) {
  for (const dir of ['src', 'tests', 'examples', 'docs', 'scripts', '.github']) {
    mkdirSync(join(fixture, dir), { recursive: true })
  }

  writeFileSync(join(fixture, '.gitignore'), requiredGitignoreEntries().join('\n'))
  writeFileSync(join(fixture, '.sembleignore'), requiredSembleignoreEntries().join('\n'))
}

function requiredGitignoreEntries(): string[] {
  return [
    'node_modules',
    '.pnpm-store',
    'dist',
    'output',
    'coverage',
    '*.log',
    '.env',
    '.env.*',
    '!.env.example',
    '!**/.env.example',
    '*.pem',
    '*.key',
    '*.p12',
    '*.pfx',
    '*.cer',
    '*.crt',
    '*.der',
    '*.jks',
    '*.keystore',
    '*.db',
    '*.db3',
    '*.sqlite',
    '*.sqlite3',
    '*.sql',
    '*.dump',
    '*.zip',
    '*.tar',
    '*.tar.gz',
    '*.tgz',
    '*.7z',
    '*.rar'
  ]
}

function requiredSembleignoreEntries(): string[] {
  return [
    'node_modules',
    '.pnpm-store',
    'dist',
    'output',
    'coverage',
    '.playwright-cli',
    'docs/.vitepress',
    '*.log',
    '.env',
    '.env.*',
    '*.pem',
    '*.key',
    '*.p12',
    '*.pfx',
    '*.cer',
    '*.crt',
    '*.der',
    '*.jks',
    '*.keystore',
    '*.db',
    '*.db3',
    '*.sqlite',
    '*.sqlite3',
    '*.sql',
    '*.dump',
    '*.zip',
    '*.tar',
    '*.tar.gz',
    '*.tgz',
    '*.7z',
    '*.rar'
  ]
}

function runSourceHygiene(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
