import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  name: string
  version: string
}

describe('release check wrapper', () => {
  it('stops before audit and full local gates when the package version is already published', () => {
    const result = spawnSync(process.execPath, ['scripts/release-check.mjs'], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        RELEASE_CADENCE_REGISTRY_JSON: JSON.stringify({
          time: {
            [packageJson.version]: '2026-07-03T09:12:09.161Z'
          }
        }),
        RELEASE_CADENCE_NOW: '2026-07-04T00:00:00.000Z'
      }
    })
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status).toBe(1)
    expect(output).toContain('Release cadence publish check')
    expect(output).toContain(`${packageJson.name}@${packageJson.version} is already published`)
    expect(output).not.toContain('Security audit')
    expect(output).not.toContain('Full local gate')
  })
})
