import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const registry = {
  time: {
    '0.14.0': '2026-07-02T05:57:15.724Z',
    '0.14.1': '2026-07-03T00:30:00.000Z'
  }
}

describe('release cadence script', () => {
  it('allows local readiness checks when the current version is already published', () => {
    const output = runReleaseCadence({
      RELEASE_CADENCE_PACKAGE_VERSION: '0.14.0',
      RELEASE_CADENCE_NOW: '2026-07-02T09:00:00.000Z'
    })

    expect(output).toContain('vue-ai-hooks@0.14.0 is already published')
  })

  it('rejects an already-published version in publish mode', () => {
    expect(() =>
      runReleaseCadence({
        RELEASE_CADENCE_PACKAGE_VERSION: '0.14.0',
        RELEASE_CADENCE_NOW: '2026-07-02T09:00:00.000Z',
        RELEASE_CADENCE_REQUIRE_UNPUBLISHED: 'true'
      })
    ).toThrow(/already published/)
  })

  it('rejects a new version when another version was published that day', () => {
    expect(() =>
      runReleaseCadence({
        RELEASE_CADENCE_PACKAGE_VERSION: '0.15.0',
        RELEASE_CADENCE_NOW: '2026-07-02T09:00:00.000Z',
        RELEASE_CADENCE_REQUIRE_UNPUBLISHED: 'true'
      })
    ).toThrow(/already published on 2026-07-02/)
  })

  it('allows a new unpublished version on the next release day', () => {
    const output = runReleaseCadence({
      RELEASE_CADENCE_PACKAGE_VERSION: '0.15.0',
      RELEASE_CADENCE_NOW: '2026-07-04T01:00:00.000Z',
      RELEASE_CADENCE_REQUIRE_UNPUBLISHED: 'true'
    })

    expect(output).toContain('no vue-ai-hooks version was published on 2026-07-04')
  })
})

function runReleaseCadence(env: Record<string, string>): string {
  return execFileSync(process.execPath, ['scripts/check-release-cadence.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      RELEASE_CADENCE_REGISTRY_JSON: JSON.stringify(registry),
      ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
