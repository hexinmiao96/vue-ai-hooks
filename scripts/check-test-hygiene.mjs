import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const testDir = 'tests'
const forbiddenTestMarker =
  /\b(?:describe|it|test)(?:\s*\.\s*\w+)*\s*\.\s*(?:only|skip|skipIf|todo|fails)\b/
const failures = []

for (const file of collectTestFiles(testDir)) {
  const content = readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    if (forbiddenTestMarker.test(line)) {
      failures.push(
        `${file}:${index + 1} contains focused, skipped, todo, or expected-failing test marker`
      )
    }
  })
}

if (failures.length) {
  console.error(`Test hygiene check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`Test hygiene check passed for ${collectTestFiles(testDir).length} test files.`)

function collectTestFiles(dir) {
  const files = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(path))
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      files.push(path)
    }
  }

  return files
}
