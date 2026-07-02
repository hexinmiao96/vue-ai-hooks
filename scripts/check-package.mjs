import { execFileSync } from 'node:child_process'
import { dirname, normalize, posix } from 'node:path'
import { readFileSync } from 'node:fs'

const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
})

const [pack] = JSON.parse(output)
const files = new Set(pack.files.map((file) => file.path))
const maxPackageSize = 485_000
const maxUnpackedSize = 2_275_000

const requiredFiles = [
  'package.json',
  'README.md',
  'README.zh-CN.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'LICENSE',
  'src/index.ts',
  'src/composables/useChatThreads.ts',
  'src/react.ts',
  'src/react/useChat.ts',
  'src/react/useCompletion.ts',
  'src/react/useObject.ts',
  'src/utils/agentEvents.ts',
  'dist/index.mjs',
  'dist/index.mjs.map',
  'dist/index.cjs',
  'dist/index.cjs.map',
  'dist/index.d.ts',
  'dist/index.d.ts.map',
  'dist/composables/useChatThreads.d.ts',
  'dist/composables/useChatThreads.d.ts.map',
  'dist/utils/agentEvents.d.ts',
  'dist/utils/agentEvents.d.ts.map',
  'dist/react.mjs',
  'dist/react.mjs.map',
  'dist/react.cjs',
  'dist/react.cjs.map',
  'dist/react.d.ts',
  'dist/react.d.ts.map',
  'dist/react/useCompletion.d.ts',
  'dist/react/useCompletion.d.ts.map',
  'dist/react/useObject.d.ts',
  'dist/react/useObject.d.ts.map'
]

const forbiddenPrefixes = [
  'tests/',
  'examples/',
  'docs/',
  '.github/',
  '.vscode/',
  '.idea/',
  'coverage/',
  'output/',
  'node_modules/'
]
const forbiddenFilePatterns = [
  /(^|\/)\.DS_Store$/,
  /(^|\/)__MACOSX\//,
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)\.npmrc$/,
  /\.log$/,
  /\.tgz$/,
  /\.tmp$/,
  /\.bak$/,
  /\.swp$/,
  /~$/,
  /\.(?:pem|key|p12|pfx)$/
]
const missing = requiredFiles.filter((file) => !files.has(file))
const forbidden = [...files].filter(isForbiddenPackageFile)
const brokenReadmeLinks = ['README.md', 'README.zh-CN.md'].flatMap((file) =>
  findBrokenPackageLinks(file, files)
)
const brokenDeclarationMapSources = [...files]
  .filter((file) => file.endsWith('.d.ts.map'))
  .flatMap((file) => findBrokenMapSources(file, files))
const sizeFailures = []

if (pack.size > maxPackageSize) {
  sizeFailures.push(
    `packed tarball is ${formatBytes(pack.size)}, above ${formatBytes(maxPackageSize)}`
  )
}

if (pack.unpackedSize > maxUnpackedSize) {
  sizeFailures.push(
    `unpacked package is ${formatBytes(pack.unpackedSize)}, above ${formatBytes(maxUnpackedSize)}`
  )
}

if (
  missing.length ||
  forbidden.length ||
  brokenReadmeLinks.length ||
  brokenDeclarationMapSources.length ||
  sizeFailures.length
) {
  if (missing.length) {
    console.error(`Missing package files:\n${missing.map((file) => `- ${file}`).join('\n')}`)
  }
  if (forbidden.length) {
    console.error(`Unexpected package files:\n${forbidden.map((file) => `- ${file}`).join('\n')}`)
  }
  if (brokenReadmeLinks.length) {
    console.error(
      `Broken package README links:\n${brokenReadmeLinks.map((line) => `- ${line}`).join('\n')}`
    )
  }
  if (brokenDeclarationMapSources.length) {
    console.error(
      `Broken declaration map sources:\n${brokenDeclarationMapSources.map((line) => `- ${line}`).join('\n')}`
    )
  }
  if (sizeFailures.length) {
    console.error(
      `Package size budget failures:\n${sizeFailures.map((line) => `- ${line}`).join('\n')}`
    )
  }
  process.exit(1)
}

console.log(
  `Package check passed with ${files.size} files, ${formatBytes(pack.size)} packed, ${formatBytes(pack.unpackedSize)} unpacked.`
)

function findBrokenPackageLinks(file, packageFiles) {
  const content = readFileSync(file, 'utf8')
  const broken = []
  const links = content.matchAll(/(?<!!)\[[^\]\n]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)

  for (const match of links) {
    const href = match[1]
    if (isExternalOrAnchor(href)) {
      continue
    }

    const localPath = href.split('#')[0].split('?')[0]
    if (!localPath) {
      continue
    }

    const target = normalizePackagePath(posix.join(dirname(file), decodeURI(localPath)))
    if (!target || !packageFiles.has(target)) {
      broken.push(`${file}: ${href}`)
    }
  }

  return broken
}

function isForbiddenPackageFile(file) {
  return (
    forbiddenPrefixes.some((prefix) => file.startsWith(prefix)) ||
    forbiddenFilePatterns.some((pattern) => pattern.test(file))
  )
}

function isExternalOrAnchor(href) {
  return (
    href.startsWith('#') ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('//')
  )
}

function normalizePackagePath(value) {
  const normalized = normalize(value).replaceAll('\\', '/')
  if (normalized.startsWith('../') || normalized === '..') {
    return null
  }
  return normalized.replace(/^\.\//, '')
}

function findBrokenMapSources(file, packageFiles) {
  const map = JSON.parse(readFileSync(file, 'utf8'))
  const broken = []
  for (const source of map.sources ?? []) {
    const target = normalizePackagePath(posix.join(dirname(file), source))
    if (!target || !packageFiles.has(target)) {
      broken.push(`${file}: ${source}`)
    }
  }
  return broken
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}
