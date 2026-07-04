import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('proxy example check script', () => {
  it('accepts default, legacy, and upstream proxy routes', () => {
    const fixture = createFixture()

    try {
      expect(runProxyCheck(fixture)).toContain('Proxy example check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects missing legacy proxy chat route compatibility', () => {
    const fixture = createFixture()

    try {
      updateFile(fixture, 'examples/proxy-server/server.mjs', (content) =>
        content.replace(
          "chat: new Set(['/api/chat', '/api/ai/chat'])",
          "chat: new Set(['/api/chat'])"
        )
      )

      expect(() => runProxyCheck(fixture)).toThrow(/\/api\/ai\/chat should return HTTP 2xx/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects proxy responses that lose provider trace metadata', () => {
    const fixture = createFixture()

    try {
      updateFile(fixture, 'examples/proxy-server/server.mjs', (content) =>
        content.split('providerMetadata').join('providerMetadataMissing')
      )

      expect(() => runProxyCheck(fixture)).toThrow(
        /\/api\/chat should include local proxy provider metadata/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-proxy-check-'))

  for (const path of ['examples/proxy-server/server.mjs', 'scripts/check-proxy-example.mjs']) {
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

function runProxyCheck(cwd: string): string {
  return execFileSync(process.execPath, ['scripts/check-proxy-example.mjs'], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
