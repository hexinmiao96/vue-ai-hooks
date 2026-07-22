import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('competitive benchmark check script', () => {
  it('accepts the current benchmark docs and runtime smoke surface', () => {
    const fixture = createFixture()

    try {
      expect(runCompetitiveBenchmarkCheck(fixture)).toContain(
        'Competitive benchmark readiness check passed'
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects benchmark wording that overstates shell ownership', () => {
    const fixture = createFixture()

    try {
      updateFile(
        fixture,
        'docs/guide/competitive-benchmark.md',
        (content) => `${content}\n✅ Full copilot shell starter\n`
      )

      expect(() => runCompetitiveBenchmarkCheck(fixture)).toThrow(
        /English competitive benchmark must not overstate shell ownership/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects English and Chinese snapshot date drift', () => {
    const fixture = createFixture()

    try {
      updateFile(fixture, 'docs/zh/guide/competitive-benchmark.md', (content) =>
        content.split('P0 基线（快照：2026-07-22）').join('P0 基线（快照：2026-07-21）')
      )

      expect(() => runCompetitiveBenchmarkCheck(fixture)).toThrow(
        /English and Chinese snapshot dates should match/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects restoring the former feature-count score', () => {
    const fixture = createFixture()

    try {
      updateFile(
        fixture,
        'docs/guide/competitive-benchmark.md',
        (content) => `${content}\nIn-scope direct benchmark score: **8 / 8**\n`
      )

      expect(() => runCompetitiveBenchmarkCheck(fixture)).toThrow(
        /must not restore stale scoring or roadmap text/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects missing runtime smoke exports', () => {
    const fixture = createFixture()

    try {
      writeDistStub(fixture, { omitPromptSuggestions: true })

      expect(() => runCompetitiveBenchmarkCheck(fixture)).toThrow(
        /usePromptSuggestions must be exported/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-competitive-'))

  for (const path of [
    'docs/guide/competitive-benchmark.md',
    'docs/zh/guide/competitive-benchmark.md',
    'docs/guide/choosing.md',
    'docs/zh/guide/choosing.md',
    'docs/guide/agent-route-templates.md',
    'examples/threaded-chat/App.vue',
    'ROADMAP.md',
    'scripts/check-competitive-benchmark.mjs'
  ]) {
    copyPath(fixture, path)
  }
  writeDistStub(fixture)

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

function writeDistStub(fixture: string, options: { omitPromptSuggestions?: boolean } = {}) {
  const exports = [
    "export function inspectRequestTrace() { return { providerId: 'openai-compatible', curl: null } }",
    'export function proxyProvider() { return {} }',
    'export function openai() { return {} }',
    "export function useChat() { return { status: { value: 'ready' }, stop() {}, addToolOutput() {}, inspect() { return { providerTrace: {} } } } }",
    "export function useCompletion() { return { status: { value: 'ready' }, complete() {}, stop() {}, inspect() { return {} } } }",
    'export function useEmbedding() { return { embeddings: { value: [] }, embed() {} } }',
    'export function useObject() { return { submit() {}, text: {} } }',
    'export function useChatThreads() { return { createThread() {}, setActiveThread() {} } }',
    'export function useAgentRun() {}',
    'export function useAgentCapabilities() { return { supports: {}, hasCapabilities: { value: true } } }'
  ]

  if (!options.omitPromptSuggestions) {
    exports.push(
      'export function usePromptSuggestions() { return { visibleSuggestions: { value: [] } } }'
    )
  }

  const target = join(fixture, 'dist/index.mjs')
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${exports.join('\n')}\n`)
}

function runCompetitiveBenchmarkCheck(cwd: string): string {
  return execFileSync(process.execPath, ['scripts/check-competitive-benchmark.mjs'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
