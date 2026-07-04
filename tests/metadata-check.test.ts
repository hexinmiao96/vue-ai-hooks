import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-metadata.mjs')

describe('metadata check script', () => {
  it('accepts the current package, docs, and contributor metadata shape', () => {
    const fixture = createFixture()

    try {
      expect(runMetadataCheck(fixture)).toContain('Metadata check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects README version drift from package.json', () => {
    const fixture = createFixture()

    try {
      updatePackageJson(fixture, (packageJson) => ({
        ...packageJson,
        version: '9.9.9'
      }))

      expect(() => runMetadataCheck(fixture)).toThrow(
        /README\.md must mention current version v9\.9\.9/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects production readiness runner coverage drift', () => {
    const fixture = createFixture()

    try {
      updateFile(fixture, 'scripts/production-readiness-local.mjs', (content) =>
        content.replace("run('Metadata check'", "run('Metadata drift'")
      )

      expect(() => runMetadataCheck(fixture)).toThrow(
        /production-readiness runner must cover pnpm metadata:check/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects source hygiene documentation drift', () => {
    const fixture = createFixture()

    try {
      updateFile(fixture, 'CONTRIBUTING.md', (content) =>
        content.replace('reject trailing whitespace, ', 'reject ')
      )

      expect(() => runMetadataCheck(fixture)).toThrow(
        /CONTRIBUTING\.md must document that source:hygiene rejects trailing whitespace/
      )
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects new runtime dependencies', () => {
    const fixture = createFixture()

    try {
      updatePackageJson(fixture, (packageJson) => ({
        ...packageJson,
        dependencies: {
          tiny_runtime_helper: '1.0.0'
        }
      }))

      expect(() => runMetadataCheck(fixture)).toThrow(/package must not add runtime dependencies/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-metadata-'))

  for (const path of [
    '.editorconfig',
    '.env.example',
    '.gitignore',
    '.prettierignore',
    '.prettierrc',
    'CONTRIBUTING.md',
    'LICENSE',
    'README.md',
    'README.zh-CN.md',
    'eslint.config.js',
    'package.json',
    'pnpm-lock.yaml',
    'tsconfig.build.json',
    'tsconfig.json',
    'vite.config.ts',
    'vitest.config.ts',
    'docs/.vitepress/config.ts',
    'docs/guide/api-stability.md',
    'docs/guide/ssr.md',
    'docs/guide/testing.md',
    'docs/guide/troubleshooting.md',
    'docs/zh/guide/api-stability.md',
    'docs/zh/guide/ssr.md',
    'docs/zh/guide/testing.md',
    'docs/zh/guide/troubleshooting.md',
    'scripts/check-secrets.mjs',
    'scripts/check-size.mjs',
    'scripts/check-source-hygiene.mjs',
    'scripts/check-test-hygiene.mjs',
    'scripts/production-readiness-local.mjs',
    'scripts/release-check.mjs'
  ]) {
    copyPath(fixture, path)
  }

  copyPath(fixture, 'examples')
  copyPath(fixture, 'src')
  createPublishedDeclarationFiles(fixture)

  return fixture
}

function copyPath(fixture: string, path: string) {
  const target = join(fixture, path)
  mkdirSync(dirname(target), { recursive: true })
  cpSync(join(root, path), target, { recursive: true })
}

function updatePackageJson(
  fixture: string,
  update: (packageJson: Record<string, unknown>) => Record<string, unknown>
) {
  const packagePath = join(fixture, 'package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as Record<string, unknown>
  writeFileSync(packagePath, `${JSON.stringify(update(packageJson), null, 2)}\n`)
}

function createPublishedDeclarationFiles(fixture: string) {
  const packageJson = JSON.parse(readFileSync(join(fixture, 'package.json'), 'utf8')) as {
    files?: string[]
  }

  for (const file of packageJson.files ?? []) {
    if (!file.endsWith('.d.ts') || file.includes('*')) continue

    const target = join(fixture, file)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, 'export {}\n')
  }
}

function updateFile(fixture: string, path: string, update: (content: string) => string) {
  const target = join(fixture, path)
  writeFileSync(target, update(readFileSync(target, 'utf8')))
}

function runMetadataCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
