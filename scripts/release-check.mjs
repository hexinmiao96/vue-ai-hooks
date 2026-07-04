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
  try {
    execFileSync(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options
    })
  } catch (error) {
    if (typeof error?.status === 'number') {
      process.exit(error.status)
    }
    throw error
  }
}

run('Release cadence publish check', process.execPath, ['scripts/check-release-cadence.mjs'], {
  env: {
    ...process.env,
    RELEASE_CADENCE_REQUIRE_UNPUBLISHED: 'true'
  }
})
run('Security audit', bin('pnpm'), ['security:audit'])
run('Full local gate', bin('pnpm'), ['check'])

console.log('\nRelease check passed.')
