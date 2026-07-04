import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const script = join(root, 'scripts/check-package.mjs')

describe('package check script', () => {
  it('accepts a clean minimal published package shape', () => {
    const fixture = createFixture()

    try {
      expect(runPackageCheck(fixture)).toContain('Package check passed')
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects credential files in the packed tarball', () => {
    const fixture = createFixture()

    try {
      writeFileSync(join(fixture, 'client.pem'), 'private key fixture\n')
      updatePackageFiles(fixture, (files) => [...files, 'client.pem'])

      expect(() => runPackageCheck(fixture)).toThrow(/Unexpected package files/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })

  it('rejects README links to files that are not published', () => {
    const fixture = createFixture()

    try {
      writeFileSync(join(fixture, 'README.md'), '# Fixture\n\n[missing](missing.md)\n')

      expect(() => runPackageCheck(fixture)).toThrow(/Broken package README links/)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})

function createFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-package-check-'))
  mkdirSync(join(fixture, 'dist'), { recursive: true })
  mkdirSync(join(fixture, 'src'), { recursive: true })

  writePackageJson(fixture, [
    'README.md',
    'README.zh-CN.md',
    'CHANGELOG.md',
    'SECURITY.md',
    'SUPPORT.md',
    'CODE_OF_CONDUCT.md',
    'LICENSE',
    'dist/index.mjs',
    'dist/index.cjs',
    'dist/index.d.ts',
    'dist/index.d.ts.map',
    'dist/react.mjs',
    'dist/react.cjs',
    'dist/react.d.ts',
    'dist/react.d.ts.map',
    'src/index.ts',
    'src/react.ts'
  ])

  writeFileSync(join(fixture, 'README.md'), '# Fixture\n\n[license](LICENSE)\n')
  writeFileSync(join(fixture, 'README.zh-CN.md'), '# Fixture\n')
  writeFileSync(join(fixture, 'CHANGELOG.md'), '# Changelog\n')
  writeFileSync(join(fixture, 'SECURITY.md'), '# Security\n')
  writeFileSync(join(fixture, 'SUPPORT.md'), '# Support\n')
  writeFileSync(join(fixture, 'CODE_OF_CONDUCT.md'), '# Code of Conduct\n')
  writeFileSync(join(fixture, 'LICENSE'), 'MIT\n')
  writeFileSync(join(fixture, 'src/index.ts'), '/** @packageDocumentation */\n')
  writeFileSync(join(fixture, 'src/react.ts'), '/** @packageDocumentation */\n')
  writeFileSync(join(fixture, 'dist/index.mjs'), 'export {}\n')
  writeFileSync(join(fixture, 'dist/index.cjs'), '"use strict";\n')
  writeFileSync(join(fixture, 'dist/react.mjs'), 'export {}\n')
  writeFileSync(join(fixture, 'dist/react.cjs'), '"use strict";\n')
  writeDeclarationWithMap(fixture, 'index', '../src/index.ts')
  writeDeclarationWithMap(fixture, 'react', '../src/react.ts')

  return fixture
}

function writeDeclarationWithMap(fixture: string, name: string, source: string) {
  writeFileSync(
    join(fixture, 'dist', `${name}.d.ts`),
    `export {}\n//# sourceMappingURL=${name}.d.ts.map\n`
  )
  writeFileSync(
    join(fixture, 'dist', `${name}.d.ts.map`),
    JSON.stringify({ version: 3, file: `${name}.d.ts`, sources: [source] })
  )
}

function updatePackageFiles(fixture: string, update: (files: string[]) => string[]) {
  const packageJson = JSON.parse(readFileSync(join(fixture, 'package.json'), 'utf8')) as {
    files: string[]
  }
  writePackageJson(fixture, update(packageJson.files))
}

function writePackageJson(fixture: string, files: string[]) {
  writeFileSync(
    join(fixture, 'package.json'),
    JSON.stringify(
      {
        name: 'vue-ai-hooks-package-check-fixture',
        version: '0.0.0',
        type: 'module',
        files
      },
      null,
      2
    )
  )
}

function runPackageCheck(cwd: string): string {
  return execFileSync(process.execPath, [script], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}
