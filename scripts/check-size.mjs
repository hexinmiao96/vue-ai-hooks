import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const budgets = [
  {
    file: 'dist/index.mjs',
    maxBytes: 68_200,
    maxGzipBytes: 18_100
  },
  {
    file: 'dist/index.cjs',
    maxBytes: 47_700,
    maxGzipBytes: 15_700
  }
]
const failures = []

for (const budget of budgets) {
  const content = readFileSync(budget.file)
  const bytes = statSync(budget.file).size
  const gzipBytes = gzipSync(content).length

  if (bytes > budget.maxBytes) {
    failures.push(`${budget.file} is ${formatBytes(bytes)}, above ${formatBytes(budget.maxBytes)}`)
  }

  if (gzipBytes > budget.maxGzipBytes) {
    failures.push(
      `${budget.file} gzip is ${formatBytes(gzipBytes)}, above ${formatBytes(budget.maxGzipBytes)}`
    )
  }

  console.log(
    `${budget.file}: ${formatBytes(bytes)} / ${formatBytes(budget.maxBytes)}, gzip ${formatBytes(gzipBytes)} / ${formatBytes(budget.maxGzipBytes)}`
  )
}

if (failures.length) {
  console.error(`Size check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log('Size check passed for published ESM and CJS bundles.')

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}
