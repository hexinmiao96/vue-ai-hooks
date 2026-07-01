import { readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const budgets = [
  {
    file: 'dist/index.mjs',
    maxBytes: 127_200,
    maxGzipBytes: 30_600
  },
  {
    file: 'dist/index.cjs',
    maxBytes: 89_700,
    maxGzipBytes: 26_600
  },
  {
    file: 'dist/react.mjs',
    maxBytes: 45_000,
    maxGzipBytes: 13_000
  },
  {
    file: 'dist/react.cjs',
    maxBytes: 40_000,
    maxGzipBytes: 12_000
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
