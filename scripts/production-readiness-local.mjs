#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

function bin(name) {
  const base = join(process.cwd(), 'node_modules', '.bin')
  const candidates = process.platform === 'win32' ? [`${name}.cmd`, name] : [name]

  for (const suffix of candidates) {
    const path = join(base, suffix)
    if (existsSync(path)) return path
  }

  return name
}

function run(label, command, args = [], options = {}) {
  console.log(`\n> ${label}`)
  const result = execFileSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  })

  if (result) {
    console.log(result)
  }
}

const exampleBuilds = [
  ['chat', 'chat'],
  ['threaded-chat', 'threaded-chat'],
  ['react-chat', 'react-chat'],
  ['react-completion', 'react-completion'],
  ['react-object', 'react-object'],
  ['completion', 'completion'],
  ['embedding', 'embedding'],
  ['image', 'image'],
  ['video', 'video'],
  ['speech', 'speech'],
  ['transcription', 'transcription'],
  ['rerank', 'rerank'],
  ['object', 'object'],
  ['ui-message-stream', 'ui-message-stream']
]

run('Release cadence check', bin('node'), ['./scripts/check-release-cadence.mjs'])
run('Format check', bin('prettier'), [
  '--check',
  '**/*.{ts,tsx,vue,js,mjs,json,md,yml,yaml}',
  '.prettierrc'
])
run('Secrets scan', bin('node'), ['scripts/check-secrets.mjs'])
run('Source hygiene', bin('node'), ['scripts/check-source-hygiene.mjs'])
run('Lint', bin('eslint'), [
  '--max-warnings',
  '0',
  'src/**/*.{ts,vue}',
  'tests/**/*.ts',
  'examples/**/*.{ts,tsx,vue}'
])
run('Typecheck', bin('vue-tsc'), ['-p', 'tsconfig.json', '--noEmit'])
run('Test hygiene', bin('node'), ['scripts/check-test-hygiene.mjs'])
run('Test coverage', bin('vitest'), ['run', '--coverage'])

run('Clean dist', bin('node'), [
  '-e',
  "require('node:fs').rmSync('dist',{recursive:true,force:true})"
])
run('Typecheck build target', bin('vue-tsc'), ['-p', 'tsconfig.build.json'])
run('Build package', bin('vite'), ['build'])

run('Dist check', bin('node'), ['scripts/check-dist.mjs'])
run('Size check', bin('node'), ['scripts/check-size.mjs'])
run('Pack check', bin('node'), ['scripts/check-package.mjs'])
run('Install check', bin('node'), ['scripts/check-install.mjs'])
run('Changelog check', bin('node'), ['scripts/check-changelog.mjs'])
run('Metadata check', bin('node'), ['scripts/check-metadata.mjs'])
run('Community health check', bin('node'), ['scripts/check-community-health.mjs'])
run('Workflow check', bin('node'), ['scripts/check-workflows.mjs'])
run('API docs check', bin('node'), ['scripts/check-api-docs.mjs'])
run('Docs UX check', bin('node'), ['scripts/check-docs-ux.mjs'])
run('Proxy example check', bin('node'), ['scripts/check-proxy-example.mjs'])
run('Threaded chat demo check', bin('node'), ['scripts/check-threaded-chat-demo.mjs'])
run('UI message stream demo check', bin('node'), ['scripts/check-ui-message-stream-demo.mjs'])
run('Tool approval demo check', bin('node'), ['scripts/check-tool-approval-demo.mjs'])
run('Agent bridge demo check', bin('node'), ['scripts/check-agent-bridge-demo.mjs'])
run('Markdown link check', bin('node'), ['scripts/check-markdown-links.mjs'])

for (const [dir, out] of exampleBuilds) {
  run(`Build example: ${dir}`, bin('vite'), [
    'build',
    `examples/${dir}/`,
    '--config',
    `examples/${dir}/vite.config.ts`,
    '--outDir',
    `../../output/examples/${out}`,
    '--emptyOutDir'
  ])
}

run('Build docs', bin('vitepress'), ['build', 'docs'])
console.log('\nProduction readiness local check passed.')
