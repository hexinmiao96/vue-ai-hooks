import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-api-docs.mjs')

describe('API docs check script', () => {
  it('accepts documented root and React public exports', () => {
    const fixture = createFixture()

    try {
      expect(runApiDocsCheck(fixture)).toContain('API docs check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects React exports that are missing from English reference docs', () => {
    const fixture = createFixture()

    try {
      writeReferenceDoc(fixture, 'docs/reference/api.md', ['useChat', 'Message', 'AiHooksError'])

      expect(() => runApiDocsCheck(fixture)).toThrow(
        /English React reference docs:\n- useReactChat/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects unexpected public entry export sources', () => {
    const fixture = createFixture()

    try {
      writeFileSync(
        join(fixture, 'src/index.ts'),
        [
          '/** @packageDocumentation */',
          "export { useChat } from './composables/useChat'",
          "export { internalDebug } from './internal/debug'",
          "export type { Message, AiHooksError } from './types'"
        ].join('\n')
      )
      mkdirSync(join(fixture, 'src/internal'), { recursive: true })
      writeFileSync(join(fixture, 'src/internal/debug.ts'), 'export const internalDebug = true\n')

      expect(() => runApiDocsCheck(fixture)).toThrow(
        /src\/index\.ts unexpected public export source: \.\/internal\/debug/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-api-docs-'))

  for (const dir of [
    'src/composables',
    'src/react',
    'src/types',
    'docs/.vitepress',
    'docs/guide',
    'docs/zh/guide',
    'docs/reference',
    'docs/zh/reference'
  ]) {
    mkdirSync(join(fixture, dir), { recursive: true })
  }

  writeFileSync(
    join(fixture, 'src/index.ts'),
    [
      '/** @packageDocumentation */',
      "export { useChat } from './composables/useChat'",
      "export type { Message, AiHooksError } from './types'"
    ].join('\n')
  )
  writeFileSync(
    join(fixture, 'src/react.ts'),
    [
      '/** @packageDocumentation */',
      "export { useReactChat } from './react/useChat'",
      "export type { Message } from './types'"
    ].join('\n')
  )
  writeFileSync(join(fixture, 'src/composables/useChat.ts'), 'export const useChat = () => null\n')
  writeFileSync(join(fixture, 'src/react/useChat.ts'), 'export const useReactChat = () => null\n')
  writeFileSync(
    join(fixture, 'src/types/index.ts'),
    'export interface Message { id: string }\nexport class AiHooksError extends Error { status?: number }\n'
  )

  writeFileSync(join(fixture, 'docs/guide/start.md'), '# Start\n')
  writeFileSync(join(fixture, 'docs/zh/guide/start.md'), '# 开始\n')
  writeReferenceDoc(fixture, 'docs/reference/api.md', [
    'useChat',
    'useReactChat',
    'Message',
    'AiHooksError'
  ])
  writeReferenceDoc(fixture, 'docs/zh/reference/api.md', [
    'useChat',
    'useReactChat',
    'Message',
    'AiHooksError'
  ])
  writeFileSync(
    join(fixture, 'docs/.vitepress/config.ts'),
    [
      'export default { themeConfig: { nav: [',
      "  { link: '/guide/start' },",
      "  { link: '/zh/guide/start' },",
      "  { link: '/reference/api' },",
      "  { link: '/zh/reference/api' }",
      '] } }'
    ].join('\n')
  )

  return fixture
}

function writeReferenceDoc(fixture: string, path: string, exports: string[]) {
  writeFileSync(
    join(fixture, path),
    [
      '# API',
      '',
      ...exports.map((name) => `## ${name}`),
      '',
      'Use instanceof AiHooksError to branch on expected provider failures.',
      'The error status and cause fields are documented for consumers.'
    ].join('\n')
  )
}

function runApiDocsCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
