import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const scannedRoots = ['src', 'tests', 'examples', 'docs', 'scripts']
const textFilePattern = /\.(?:ts|vue|js|mjs|json|md|yml|yaml)$/
const conflictMarkerPattern = /^(?:<<<<<<<|=======|>>>>>>>)/
const debuggerPattern = /^\s*debugger;?\s*$/
const sourceConsolePattern = /\bconsole\.(?:debug|log|info|warn|error)\s*\(/
const failures = []
let scannedFiles = 0

for (const file of scannedRoots.flatMap(collectTextFiles)) {
  scannedFiles += 1
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)

  lines.forEach((line, index) => {
    if (conflictMarkerPattern.test(line)) {
      failures.push(`${file}:${index + 1} contains a merge conflict marker`)
    }

    if (debuggerPattern.test(line)) {
      failures.push(`${file}:${index + 1} contains a debugger statement`)
    }

    if (file.startsWith('src/') && sourceConsolePattern.test(line)) {
      failures.push(`${file}:${index + 1} contains console output in published source`)
    }
  })
}

if (failures.length) {
  console.error(`Source hygiene check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`Source hygiene check passed for ${scannedFiles} files.`)

function collectTextFiles(dir) {
  const files = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectTextFiles(path))
    } else if (textFilePattern.test(entry.name)) {
      files.push(path)
    }
  }

  return files
}
