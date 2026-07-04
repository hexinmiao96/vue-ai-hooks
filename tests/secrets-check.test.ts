import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-secrets.mjs')

describe('secret check script', () => {
  it('respects Git ignores while still scanning unignored candidate files', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-secrets-'))

    try {
      execFileSync('git', ['init'], { cwd: fixture, stdio: 'ignore' })
      writeFileSync(fixturePath(fixture, '.gitignore'), '.env\n.env.*\n!.env.example\n')
      writeFileSync(fixturePath(fixture, '.env'), `OPENAI_API_KEY=sk-proj-${'a'.repeat(24)}\n`)
      writeFileSync(fixturePath(fixture, '.env.example'), 'OPENAI_API_KEY=sk-...\n')
      writeFileSync(fixturePath(fixture, 'clean.ts'), 'export const ok = true\n')

      expect(runSecretCheck(fixture)).toContain('Secret check passed')

      for (const extension of ['tsx', 'mts', 'cts', 'cjs', 'html']) {
        writeFileSync(
          fixturePath(fixture, `leaked.${extension}`),
          `export const leaked = "sk-proj-${'b'.repeat(24)}"\n`
        )

        expect(() => runSecretCheck(fixture)).toThrow(/possible provider API key/)
        writeFileSync(fixturePath(fixture, `leaked.${extension}`), 'export const ok = true\n')
      }
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function fixturePath(rootPath: string, file: string): string {
  return join(rootPath, file)
}

function runSecretCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
