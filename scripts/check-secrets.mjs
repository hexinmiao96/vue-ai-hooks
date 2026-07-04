import { execFileSync } from 'node:child_process'
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
  '.cjs',
  '.cts',
  '.example',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
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
  },
  {
    name: 'Google API key',
    regex: /\bAIza[A-Za-z0-9_-]{35}\b/g
  }
]
const sensitiveEnvAssignmentPattern =
  /^[^\S\r\n]*(?:export[^\S\r\n]+)?([A-Z][A-Z0-9_]*(?:API_KEY|KEY|AUTH_TOKEN|TOKEN|SECRET|PASSWORD))[^\S\r\n]*=[^\S\r\n]*['"]?([^'"\s#]*)['"]?/gm
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
  'sk-proj-...',
  'aiza...'
])
const failures = []
let scannedFiles = 0

for (const file of collectScannableFiles()) {
  const content = readFileSync(file, 'utf8')
  scannedFiles += 1

  for (const pattern of tokenPatterns) {
    for (const match of content.matchAll(pattern.regex)) {
      failures.push(`${file}: possible ${pattern.name} at ${lineFor(content, match.index ?? 0)}`)
    }
  }

  for (const match of content.matchAll(sensitiveEnvAssignmentPattern)) {
    const name = match[1]
    const value = match[2].trim()

    if (!isSafePlaceholder(value)) {
      failures.push(
        `${file}: non-placeholder sensitive env assignment ${name} at ${lineFor(
          content,
          match.index ?? 0
        )}`
      )
    }
  }
}

if (failures.length) {
  console.error(`Secret check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`Secret check passed for ${scannedFiles} files.`)

function collectScannableFiles() {
  const gitFiles = listGitCandidateFiles()
  return gitFiles ?? [...walk('.')]
}

function listGitCandidateFiles() {
  try {
    const output = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }
    )

    return output.split('\0').filter(Boolean).filter(shouldScan).filter(isSmallReadableFile).sort()
  } catch {
    return null
  }
}

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

    if (isSmallReadableFile(path)) yield path
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

function isSafePlaceholder(value) {
  const normalized = value.toLowerCase()
  return placeholderValues.has(normalized) || value.includes('...') || /^\$[A-Z0-9_]+$/.test(value)
}

function isSmallReadableFile(path) {
  try {
    return statSync(path).size <= 1_000_000
  } catch {
    return false
  }
}
