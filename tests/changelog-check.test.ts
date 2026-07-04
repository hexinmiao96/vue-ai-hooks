import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-changelog.mjs')

describe('changelog check script', () => {
  it('accepts a dated current-version changelog with release gate and coverage notes', () => {
    const fixture = createFixture()

    try {
      expect(runChangelogCheck(fixture)).toContain('Changelog check passed for version 1.2.3')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects stale release gate wording', () => {
    const fixture = createFixture({
      currentSectionExtra: '- `prepublishOnly` now delegates to `pnpm check`\n'
    })

    try {
      expect(() => runChangelogCheck(fixture)).toThrow(/stale phrase/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects current-version notes that omit the active coverage thresholds', () => {
    const fixture = createFixture({
      coverageLine: '- Coverage thresholds remain at least 90% statements.\n'
    })

    try {
      expect(() => runChangelogCheck(fixture)).toThrow(/current coverage thresholds/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects an empty Unreleased section', () => {
    const fixture = createFixture({ unreleasedBullet: '' })

    try {
      expect(() => runChangelogCheck(fixture)).toThrow(
        /Unreleased section must include a placeholder or change bullet/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(
  options: { coverageLine?: string; currentSectionExtra?: string; unreleasedBullet?: string } = {}
): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-changelog-check-'))

  writeFileSync(
    join(fixture, 'package.json'),
    JSON.stringify({ name: 'vue-ai-hooks-changelog-check-fixture', version: '1.2.3' }, null, 2)
  )
  writeFileSync(
    join(fixture, 'vitest.config.ts'),
    [
      'export default {',
      '  test: {',
      '    coverage: {',
      '      thresholds: { statements: 98, branches: 90, functions: 96, lines: 98 }',
      '    }',
      '  }',
      '}'
    ].join('\n')
  )
  writeFileSync(
    join(fixture, 'CHANGELOG.md'),
    [
      '# Changelog',
      '',
      'All notable changes to this project will be documented in this file.',
      '',
      'The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),',
      'and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
      '',
      '## [Unreleased]',
      '',
      options.unreleasedBullet ?? '- No unreleased changes pending.',
      '',
      '## [1.2.3] - 2026-07-04',
      '',
      '### Changed',
      '',
      '- Release notes keep the active publishing contract visible:',
      '  `prepublishOnly` now delegates to `release:check`.',
      '- Added regression coverage for changelog validation so stale release-gate wording, empty Unreleased sections, and mismatched coverage threshold notes keep failing before release.',
      options.coverageLine ??
        '- Coverage thresholds remain at least 98% statements, 90% branches, 96% functions, and 98% lines for this release.',
      options.currentSectionExtra ?? ''
    ].join('\n')
  )

  return fixture
}

function runChangelogCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
