import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ignoredDirectories = new Set([
  '.git',
  '.pnpm-store',
  '.playwright-cli',
  'coverage',
  'dist',
  'node_modules',
  'output'
])
const ignoredPaths = new Set(['docs/.vitepress/cache', 'docs/.vitepress/dist'])
const scannedExtensions = new Set([
  '.env',
  '.example',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.vue',
  '.yaml',
  '.yml'
])
const tokenPatterns = [
  {
    name: 'provider API key',
    regex: /\bsk-(?:ant-|or-v1-|proj-)?[A-Za-z0-9_-]{24,}\b/g
  },
  {
    name: 'GitHub token',
    regex: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g
  },
  {
    name: 'npm token',
    regex: /\bnpm_[A-Za-z0-9]{36,}\b/g
  }
]
const envKeyPattern =
  /^\s*(?:VITE_)?(?:OPENAI|ANTHROPIC|OPENROUTER|DEEPSEEK|AI)_(?:API_)?KEY\s*=\s*['"]?([^'"\s#]+)['"]?/gm
const placeholderValues = new Set([
  '',
  '<your-api-key>',
  '<your_api_key>',
  'your-api-key',
  'your_api_key',
  'your-key',
  'your_key',
  'your-openai-key',
  'your_openai_key',
  'sk-...',
  'sk-ant-...',
  'sk-or-v1-...',
  'sk-proj-...'
])
const failures = []
let scannedFiles = 0

for (const file of walk('.')) {
  const content = readFileSync(file, 'utf8')
  scannedFiles += 1

  for (const pattern of tokenPatterns) {
    for (const match of content.matchAll(pattern.regex)) {
      failures.push(`${file}: possible ${pattern.name} at ${lineFor(content, match.index ?? 0)}`)
    }
  }

  for (const match of content.matchAll(envKeyPattern)) {
    const value = match[1].trim()

    if (value && !placeholderValues.has(value.toLowerCase())) {
      failures.push(
        `${file}: non-placeholder API key assignment at ${lineFor(content, match.index ?? 0)}`
      )
    }
  }
}

if (failures.length) {
  console.error(`Secret check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`Secret check passed for ${scannedFiles} files.`)

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    const normalized = path.replace(/^\.\//, '')

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name) || ignoredPaths.has(normalized)) {
        continue
      }

      yield* walk(path)
      continue
    }

    if (!entry.isFile() || !shouldScan(path)) {
      continue
    }

    if (statSync(path).size > 1_000_000) {
      continue
    }

    yield path
  }
}

function shouldScan(path) {
  if (path.endsWith('.env.example') || path.endsWith('.prettierrc')) {
    return true
  }

  for (const extension of scannedExtensions) {
    if (path.endsWith(extension)) {
      return true
    }
  }

  return false
}

function lineFor(content, index) {
  return content.slice(0, index).split('\n').length
}
