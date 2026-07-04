import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-docs-ux.mjs')

describe('docs UX check script', () => {
  it('accepts the current docs, examples, and demo navigation shape', () => {
    const fixture = createFixture()

    try {
      expect(runDocsUxCheck(fixture)).toContain('Docs UX check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects localized labels in the English examples navigation', () => {
    const fixture = createFixture()

    try {
      updateFile(fixture, 'docs/.vitepress/config.ts', (content) =>
        content.replace(
          "{ text: 'Examples', link: '/examples/' }",
          "{ text: '示例', link: '/examples/' }"
        )
      )

      expect(() => runDocsUxCheck(fixture)).toThrow(
        /English VitePress nav must label the examples link as Examples/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects positioning guidance drift in the choosing guide', () => {
    const fixture = createFixture()

    try {
      updateFile(fixture, 'docs/guide/choosing.md', (content) =>
        content.replace('## Current positioning map', '## Alternative matrix')
      )

      expect(() => runDocsUxCheck(fixture)).toThrow(
        /English choosing guide must include: Current positioning map/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects missing local-run entrypoints on the examples page', () => {
    const fixture = createFixture()

    try {
      updateFile(fixture, 'docs/examples/index.md', (content) =>
        content.split('pnpm example:threaded-chat').join('pnpm example:chat')
      )

      expect(() => runDocsUxCheck(fixture)).toThrow(
        /English examples page must include: pnpm example:threaded-chat/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-docs-ux-'))

  for (const path of [
    '.env.example',
    'README.md',
    'README.zh-CN.md',
    'ROADMAP.md',
    'docs',
    'examples',
    'package.json',
    'scripts'
  ]) {
    copyPath(fixture, path)
  }

  return fixture
}

function copyPath(fixture: string, path: string) {
  const target = join(fixture, path)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(join(root, path), target, { recursive: true })
}

function updateFile(fixture: string, path: string, update: (content: string) => string) {
  const target = join(fixture, path)
  writeFileSync(target, update(readFileSync(target, 'utf8')))
}

function runDocsUxCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
