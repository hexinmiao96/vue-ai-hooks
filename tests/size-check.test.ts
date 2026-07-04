import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-size.mjs')

describe('size check script', () => {
  it('accepts published bundles within raw and gzip budgets', () => {
    const fixture = createFixture()

    try {
      expect(runSizeCheck(fixture)).toContain('Size check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects a raw bundle that exceeds its byte budget', () => {
    const fixture = createFixture()

    try {
      writeFileSync(join(fixture, 'dist/index.mjs'), 'x'.repeat(149_501))

      expect(() => runSizeCheck(fixture)).toThrow(/dist\/index\.mjs is .* above/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects a bundle whose gzip size exceeds its budget', () => {
    const fixture = createFixture()

    try {
      writeFileSync(join(fixture, 'dist/index.mjs'), deterministicBytes(40_000))

      expect(() => runSizeCheck(fixture)).toThrow(/dist\/index\.mjs gzip is .* above/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-size-check-'))
  mkdirSync(join(fixture, 'dist'), { recursive: true })

  for (const file of ['index.mjs', 'index.cjs', 'react.mjs', 'react.cjs']) {
    writeFileSync(join(fixture, 'dist', file), 'export {}\n')
  }

  return fixture
}

function deterministicBytes(size: number): Buffer {
  const buffer = Buffer.alloc(size)
  let offset = 0
  let counter = 0

  while (offset < size) {
    const chunk = createHash('sha256').update(`vue-ai-hooks-size-${counter}`).digest()
    chunk.copy(buffer, offset)
    offset += chunk.length
    counter += 1
  }

  return buffer
}

function runSizeCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
