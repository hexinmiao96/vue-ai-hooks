import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-community-health.mjs')

describe('community health check script', () => {
  it('accepts complete contributor-facing community files', () => {
    const fixture = createFixture()

    try {
      expect(runCommunityHealthCheck(fixture)).toContain('Community health check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects ownership drift for release-critical paths', () => {
    const fixture = createFixture()

    try {
      writeCodeOwners(fixture, ['* @hexinmiao96', '.github/ @hexinmiao96', 'src/ @hexinmiao96'])

      expect(() => runCommunityHealthCheck(fixture)).toThrow(
        /CODEOWNERS must include scripts\/ @hexinmiao96/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects README drift that removes the support route', () => {
    const fixture = createFixture()

    try {
      writeFileSync(join(fixture, 'README.md'), '[Code of conduct](./CODE_OF_CONDUCT.md)\n')

      expect(() => runCommunityHealthCheck(fixture)).toThrow(/README\.md must link to SUPPORT\.md/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects security policy drift that removes private reporting guidance', () => {
    const fixture = createFixture()

    try {
      writeSecurityPolicy(fixture, [
        '## Supported Versions',
        'We support the latest published minor version.',
        '## Reporting a Vulnerability',
        'Please do not open a public issue for suspected vulnerabilities.',
        'You can expect an initial response within 7 days.',
        '## API Key Safety',
        'production applications should send model requests through a backend or edge proxy.'
      ])

      expect(() => runCommunityHealthCheck(fixture)).toThrow(
        /SECURITY\.md must include: GitHub private vulnerability reporting/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-community-health-'))
  mkdirSync(join(fixture, '.github/ISSUE_TEMPLATE'), { recursive: true })

  writeFileSync(
    join(fixture, '.github/ISSUE_TEMPLATE/config.yml'),
    [
      'blank_issues_enabled: false',
      'contact_links:',
      '  - name: Questions, provider setup help, and feature ideas',
      '    url: https://github.com/hexinmiao96/vue-ai-hooks/discussions',
      '    about: Use Discussions for provider setup help and feature ideas.',
      '  - name: Support',
      '    url: https://github.com/hexinmiao96/vue-ai-hooks/blob/main/SUPPORT.md',
      '    about: Read support guidance.',
      '  - name: Private reporting process',
      '    url: https://github.com/hexinmiao96/vue-ai-hooks/blob/main/SECURITY.md',
      '    about: Follow SECURITY.md for vulnerabilities.'
    ].join('\n')
  )
  writeCodeOwners(fixture, [
    '* @hexinmiao96',
    '.github/ @hexinmiao96',
    'src/ @hexinmiao96',
    'scripts/ @hexinmiao96',
    'docs/ @hexinmiao96',
    'examples/ @hexinmiao96'
  ])
  writeFileSync(
    join(fixture, '.github/ISSUE_TEMPLATE/bug_report.md'),
    [
      '## What happened',
      '## Minimal reproduction',
      '## Steps to reproduce',
      '## Expected behavior',
      '## Actual behavior',
      '## Issue activity',
      '## Environment',
      '- vue-ai-hooks version:',
      '- Vue version:',
      '- Node version:',
      '- Package manager and version:',
      '- Bundler / framework:',
      '- Provider (OpenAI / DeepSeek / custom):',
      '- Browser / runtime (if relevant):',
      '- OS:'
    ].join('\n')
  )
  writeFileSync(
    join(fixture, '.github/PULL_REQUEST_TEMPLATE.md'),
    [
      '## What does this change?',
      '## Related issue',
      '## Type of change',
      '## Version impact',
      '- Patch',
      '- Minor',
      '- Major / breaking change',
      '- No package version impact',
      '- Migration notes required for breaking changes',
      '## How was it tested?',
      '- Ran `pnpm check` locally',
      '- I added a CHANGELOG entry if user-facing',
      '- I confirmed the version impact matches `CONTRIBUTING.md`',
      '- I documented migration notes for breaking changes',
      '- I updated the README if the public API changed',
      '- I reviewed security impact if this touches providers, fetch, auth, or examples',
      '- No new runtime dependencies added (or justified in PR description)'
    ].join('\n')
  )
  writeSecurityPolicy(fixture, [
    '## Supported Versions',
    'We support the latest published minor version.',
    '## Reporting a Vulnerability',
    'Please do not open a public issue for suspected vulnerabilities.',
    'Use GitHub private vulnerability reporting.',
    'You can expect an initial response within 7 days.',
    '## API Key Safety',
    'production applications should send model requests through a backend or edge proxy.'
  ])
  writeFileSync(
    join(fixture, 'SUPPORT.md'),
    [
      '## Questions and usage help',
      'Use GitHub Discussion for questions.',
      'Provider or custom provider adapter details help maintainers respond.',
      '## Bugs',
      'Issues are reserved for reproducible bugs.',
      'Include the `vue-ai-hooks` version.',
      'Use the bug report template for reproducible defects.',
      '## Feature requests',
      'Use GitHub Discussions for new APIs, providers, or behavior changes.',
      '## Issue activity',
      'Maintainers keep accepted bug issues active.',
      'Avoid empty `bump` comments.',
      '## Security',
      'Follow [`SECURITY.md`](./SECURITY.md) instead.'
    ].join('\n')
  )
  writeFileSync(
    join(fixture, 'CODE_OF_CONDUCT.md'),
    [
      '## Our Standards',
      'This space is focused on improving `vue-ai-hooks`.',
      '## Scope',
      'Report conduct concerns to the maintainer listed in `package.json`.',
      '## Reporting',
      'Please follow `SECURITY.md` instead of opening a public issue.',
      '## Enforcement',
      'Maintainers may edit or remove harmful content.'
    ].join('\n')
  )
  writeFileSync(join(fixture, 'CONTRIBUTING.md'), '[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)\n')
  writeFileSync(
    join(fixture, 'README.md'),
    '[Code of conduct](./CODE_OF_CONDUCT.md)\n[Support](./SUPPORT.md)\n'
  )
  writeFileSync(
    join(fixture, 'README.zh-CN.md'),
    '[行为准则](./CODE_OF_CONDUCT.md)\n[支持](./SUPPORT.md)\n'
  )

  return fixture
}

function writeCodeOwners(fixture: string, rules: string[]) {
  writeFileSync(join(fixture, '.github/CODEOWNERS'), `${rules.join('\n')}\n`)
}

function writeSecurityPolicy(fixture: string, lines: string[]) {
  writeFileSync(join(fixture, 'SECURITY.md'), `${lines.join('\n')}\n`)
}

function runCommunityHealthCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
