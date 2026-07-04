import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-workflows.mjs')
const rootPackageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  engines: { node: string }
  packageManager: string
  scripts: { check: string }
}

describe('workflow check script', () => {
  it('accepts hardened CI, publish, CodeQL, Scorecard, and Dependabot configuration', () => {
    const fixture = createFixture()

    try {
      expect(runWorkflowCheck(fixture)).toContain('Workflow check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects CI dependency installs without the frozen lockfile', () => {
    const fixture = createFixture()

    try {
      updateWorkflow(fixture, 'ci.yml', (workflow) =>
        workflow.replace('pnpm install --frozen-lockfile', 'pnpm install')
      )

      expect(() => runWorkflowCheck(fixture)).toThrow(
        /CI workflow must install dependencies with the frozen lockfile/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects token-based npm publishing credentials', () => {
    const fixture = createFixture()

    try {
      updateWorkflow(
        fixture,
        'publish.yml',
        (workflow) => `${workflow}\n# legacy auth fallback\nNPM_TOKEN: \${{ secrets.NPM_TOKEN }}\n`
      )

      expect(() => runWorkflowCheck(fixture)).toThrow(
        /Publish workflow must not use long-lived NPM_TOKEN secrets/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-workflows-'))
  mkdirSync(join(fixture, '.github/workflows'), { recursive: true })

  writeFileSync(
    join(fixture, 'package.json'),
    JSON.stringify(
      {
        engines: rootPackageJson.engines,
        packageManager: rootPackageJson.packageManager,
        scripts: {
          check: rootPackageJson.scripts.check
        }
      },
      null,
      2
    )
  )

  for (const workflow of ['ci.yml', 'publish.yml', 'codeql.yml', 'scorecard.yml']) {
    writeFileSync(
      join(fixture, '.github/workflows', workflow),
      readFileSync(join(root, '.github/workflows', workflow), 'utf8')
    )
  }
  writeFileSync(
    join(fixture, '.github/dependabot.yml'),
    readFileSync(join(root, '.github/dependabot.yml'), 'utf8')
  )

  return fixture
}

function updateWorkflow(fixture: string, workflow: string, update: (source: string) => string) {
  const workflowPath = join(fixture, '.github/workflows', workflow)
  writeFileSync(workflowPath, update(readFileSync(workflowPath, 'utf8')))
}

function runWorkflowCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
