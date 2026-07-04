import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const scannedRoots = ['src', 'tests', 'examples', 'docs', 'scripts', '.github']
const scannedRootFiles = [
  '.editorconfig',
  '.env.example',
  '.gitignore',
  '.prettierignore',
  '.prettierrc',
  '.sembleignore',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md',
  'README.zh-CN.md',
  'ROADMAP.md',
  'SECURITY.md',
  'SUPPORT.md',
  'eslint.config.js',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'tsconfig.build.json',
  'tsconfig.json',
  'vite.config.ts',
  'vitest.config.ts',
  '.github/CODEOWNERS'
]
const textFilePattern = /\.(?:ts|tsx|mts|cts|vue|js|jsx|mjs|cjs|html|json|md|yml|yaml)$/
const trailingWhitespacePattern = /[ \t]$/
const conflictMarkerPattern = /^(?:<<<<<<<|=======|>>>>>>>)/
const debuggerPattern = /^\s*debugger;?\s*$/
const sourceConsolePattern = /\bconsole\.(?:debug|log|info|warn|error)\s*\(/
const broadSuppressionTokens = [
  joinParts('@ts', '-ignore'),
  joinParts('@ts', '-nocheck'),
  joinParts('eslint', '-disable'),
  joinParts('prettier', '-ignore'),
  joinParts('istanbul', ' ignore'),
  joinParts('c8', ' ignore'),
  joinParts('v8', ' ignore')
]
const broadSuppressionPattern = new RegExp(broadSuppressionTokens.map(escapeRegExp).join('|'))
const ignoredDirectories = new Set(['coverage', 'dist', 'node_modules', 'output'])
const ignoredDirectoryPaths = new Set(['docs/.vitepress/cache', 'docs/.vitepress/dist'])
const sensitiveIgnoreRequirements = [
  ['private keys', ['*.pem']],
  ['raw key files', ['*.key']],
  ['pkcs12 credentials', ['*.p12']],
  ['pfx credentials', ['*.pfx']],
  ['certificates', ['*.cer']],
  ['certificate requests', ['*.crt']],
  ['binary certificates', ['*.der']],
  ['java key stores', ['*.jks']],
  ['keystore files', ['*.keystore']],
  ['local db files', ['*.db']],
  ['local db3 files', ['*.db3']],
  ['local sqlite files', ['*.sqlite']],
  ['local sqlite3 files', ['*.sqlite3']],
  ['sql dumps', ['*.sql']],
  ['database dumps', ['*.dump']],
  ['zip archives', ['*.zip']],
  ['tar archives', ['*.tar']],
  ['compressed tar archives', ['*.tar.gz']],
  ['tgz archives', ['*.tgz']],
  ['7z archives', ['*.7z']],
  ['rar archives', ['*.rar']]
]
const ignoreFileRequirements = [
  {
    file: '.gitignore',
    requirements: [
      ['dependencies', ['node_modules', 'node_modules/']],
      ['pnpm store', ['.pnpm-store', '.pnpm-store/']],
      ['build output', ['dist', 'dist/']],
      ['example output', ['output', 'output/']],
      ['coverage output', ['coverage', 'coverage/']],
      ['logs', ['*.log']],
      ['env files', ['.env', '.env.*']],
      ['env examples', ['!.env.example', '!**/.env.example']],
      ...sensitiveIgnoreRequirements
    ]
  },
  {
    file: '.sembleignore',
    requirements: [
      ['dependencies', ['node_modules', 'node_modules/']],
      ['pnpm store', ['.pnpm-store', '.pnpm-store/']],
      ['build output', ['dist', 'dist/']],
      ['example output', ['output', 'output/']],
      ['coverage output', ['coverage', 'coverage/']],
      ['playwright output', ['.playwright-cli', '.playwright-cli/']],
      ['vitepress internals', ['docs/.vitepress', 'docs/.vitepress/']],
      ['logs', ['*.log']],
      ['env files', ['.env', '.env.*']],
      ...sensitiveIgnoreRequirements
    ]
  }
]
const failures = []
let scannedFiles = 0

const textFiles = unique([
  ...scannedRoots.flatMap(collectTextFiles),
  ...scannedRootFiles.filter((file) => existsSync(file))
])

for (const file of textFiles) {
  scannedFiles += 1
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)

  lines.forEach((line, index) => {
    if (trailingWhitespacePattern.test(line)) {
      failures.push(`${file}:${index + 1} contains trailing whitespace`)
    }

    if (conflictMarkerPattern.test(line)) {
      failures.push(`${file}:${index + 1} contains a merge conflict marker`)
    }

    if (debuggerPattern.test(line)) {
      failures.push(`${file}:${index + 1} contains a debugger statement`)
    }

    if (
      sourceConsolePattern.test(line) &&
      (file.startsWith('src/') ||
        (file.startsWith('examples/') && !file.startsWith('examples/proxy-server/')))
    ) {
      failures.push(`${file}:${index + 1} contains console output in browser-facing source`)
    }

    if (broadSuppressionPattern.test(line) && isSuppressionCheckedSource(file)) {
      failures.push(
        `${file}:${index + 1} contains a broad lint, coverage, or TypeScript suppression`
      )
    }
  })
}

checkIgnoreFiles()

if (failures.length) {
  console.error(`Source hygiene check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`Source hygiene check passed for ${scannedFiles} files.`)

function collectTextFiles(dir) {
  if (shouldIgnoreDirectory(dir)) return []

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

function shouldIgnoreDirectory(dir) {
  return (
    ignoredDirectories.has(dir) ||
    ignoredDirectories.has(basename(dir)) ||
    ignoredDirectoryPaths.has(dir)
  )
}

function isSuppressionCheckedSource(file) {
  return (
    file.startsWith('src/') ||
    file.startsWith('examples/') ||
    file.startsWith('scripts/') ||
    file.startsWith('docs/.vitepress/')
  )
}

function checkIgnoreFiles() {
  for (const { file, requirements } of ignoreFileRequirements) {
    const entries = readIgnoreEntries(file)

    for (const [label, requiredEntries] of requirements) {
      if (!requiredEntries.some((entry) => entries.has(entry))) {
        failures.push(`${file} must ignore ${label}: ${requiredEntries.join(' or ')}`)
      }
    }
  }
}

function readIgnoreEntries(file) {
  return new Set(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
  )
}

function unique(values) {
  return [...new Set(values)]
}

function joinParts(...parts) {
  return parts.join('')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
