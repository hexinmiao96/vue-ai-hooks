import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const registry = {
  time: {
    '0.14.0': '2026-07-02T05:57:15.724Z',
    '0.14.1': '2026-07-03T00:30:00.000Z'
  },
  'dist-tags.latest': '0.14.1'
}

describe('release status script', () => {
  it('reports when the current package version is already published', () => {
    const output = runReleaseStatus({
      RELEASE_STATUS_PACKAGE_VERSION: '0.14.0',
      RELEASE_STATUS_NOW: '2026-07-02T09:00:00.000Z'
    })

    expect(output).toContain('Current package: vue-ai-hooks@0.14.0')
    expect(output).toContain('Registry status: current package version is already published')
    expect(output).toContain('publishing this version again is blocked')
  })

  it('reports when a new version is blocked by the same-day release cadence', () => {
    const output = runReleaseStatus({
      RELEASE_STATUS_PACKAGE_VERSION: '0.15.0',
      RELEASE_STATUS_NOW: '2026-07-02T09:00:00.000Z'
    })

    expect(output).toContain('Registry status: vue-ai-hooks@0.15.0 is not published yet')
    expect(output).toContain(
      'Release window: blocked; vue-ai-hooks already published on 2026-07-02'
    )
    expect(output).toContain('wait for the next Asia/Shanghai calendar day')
  })

  it('reports when a new version is eligible on a later release day', () => {
    const output = runReleaseStatus({
      RELEASE_STATUS_PACKAGE_VERSION: '0.15.0',
      RELEASE_STATUS_NOW: '2026-07-04T01:00:00.000Z'
    })

    expect(output).toContain('Release window: eligible')
    expect(output).toContain('run pnpm release:check')
    expect(output).toContain('confirm the publish workflow')
  })
})

function runReleaseStatus(env: Record<string, string>): string {
  return execFileSync(process.execPath, ['scripts/release-status.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      RELEASE_STATUS_REGISTRY_JSON: JSON.stringify(registry),
      ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
