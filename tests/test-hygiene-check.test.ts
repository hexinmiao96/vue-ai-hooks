import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-test-hygiene.mjs')

describe('test hygiene script', () => {
  it('accepts clean TS and TSX test files', () => {
    const fixture = createFixture()

    try {
      writeFileSync(
        join(fixture, 'tests/clean.test.ts'),
        "import { it } from 'vitest'\nit('runs normally', () => {})\n"
      )
      writeFileSync(
        join(fixture, 'tests/react-clean.test.tsx'),
        "import { it } from 'vitest'\nit('runs TSX normally', () => <span />)\n"
      )

      expect(runTestHygiene(fixture)).toContain('Test hygiene check passed for 2 test files')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it.each([
    ['focused', "import { describe } from 'vitest'\ndescribe.only('focused', () => {})\n"],
    ['skipped', "import { it } from 'vitest'\nit.skip('skipped', () => {})\n"],
    ['todo', "import { test } from 'vitest'\ntest.todo('todo')\n"],
    [
      'chained skipped',
      "import { test } from 'vitest'\ntest.concurrent.skip('skipped', () => {})\n"
    ],
    [
      'conditionally skipped',
      "import { test } from 'vitest'\ntest.skipIf(process.env.CI)('conditional', () => {})\n"
    ],
    [
      'expected failing',
      "import { test } from 'vitest'\ntest.fails('expected failure', () => {})\n"
    ],
    [
      'chained expected failing',
      "import { test } from 'vitest'\ntest.concurrent.fails('expected failure', () => {})\n"
    ]
  ])('rejects %s test markers', (_label, source) => {
    const fixture = createFixture()

    try {
      writeFileSync(join(fixture, 'tests/bad.test.ts'), source)

      expect(() => runTestHygiene(fixture)).toThrow(
        /contains focused, skipped, todo, or expected-failing/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-test-hygiene-'))
  mkdirSync(join(fixture, 'tests'))
  return fixture
}

function runTestHygiene(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
