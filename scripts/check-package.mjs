import { execFileSync } from 'node:child_process'
import { dirname, normalize, posix } from 'node:path'
import { readFileSync } from 'node:fs'
import {
  extractExportSources,
  resolveExportDeclarationFile,
  resolveExportSourceFile
} from './lib/entry-exports.mjs'

const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe']
})

const [pack] = JSON.parse(output)
const files = new Set(pack.files.map((file) => file.path))
const maxPackageSize = 595_000
const maxUnpackedSize = 2_780_000
const indexSource = readFileSync('src/index.ts', 'utf8')
const reactSource = readFileSync('src/react.ts', 'utf8')
const publicExportSources = unique([
  ...extractExportSources(indexSource),
  ...extractExportSources(reactSource)
])
const requiredPublicSourceFiles = unique([
  'src/index.ts',
  'src/react.ts',
  ...publicExportSources.map(resolveExportSourceFile)
])
const requiredPublicDeclarationFiles = unique([
  'dist/index.d.ts',
  'dist/react.d.ts',
  ...publicExportSources.map(resolveExportDeclarationFile)
])

const requiredFiles = [
  'package.json',
  'README.md',
  'README.zh-CN.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE',
  'dist/index.mjs',
  'dist/index.cjs',
  'dist/index.d.ts.map',
  'dist/react.mjs',
  'dist/react.cjs',
  'dist/react.d.ts.map',
  ...requiredPublicSourceFiles,
  ...requiredPublicDeclarationFiles
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
  /^dist\/.*\.(?:js|cjs|mjs)\.map$/,
  /\.(?:7z|rar|tar|tar\.gz|tgz|zip)$/,
  /\.tmp$/,
  /\.bak$/,
  /\.swp$/,
  /~$/,
  /\.(?:cer|crt|der|jks|key|keystore|p12|pem|pfx)$/,
  /\.(?:db|db3|dump|sql|sqlite|sqlite3)$/
]
const missing = requiredFiles.filter((file) => !files.has(file))
const forbidden = [...files].filter(isForbiddenPackageFile)
const brokenReadmeLinks = ['README.md', 'README.zh-CN.md'].flatMap((file) =>
  findBrokenPackageLinks(file, files)
)
const brokenDeclarationMapSources = [...files]
  .filter((file) => file.endsWith('.d.ts.map'))
  .flatMap((file) => findBrokenMapSources(file, files))
const brokenDeclarationSourceMaps = [...files]
  .filter((file) => file.endsWith('.d.ts'))
  .flatMap((file) => findBrokenDeclarationSourceMaps(file, files))
const brokenRuntimeBundleReferences = [...files]
  .filter((file) => /^dist\/.*\.(?:js|cjs|mjs)$/.test(file))
  .flatMap((file) => findBrokenRuntimeBundleReferences(file, files))
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
  brokenDeclarationSourceMaps.length ||
  brokenRuntimeBundleReferences.length ||
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
  if (brokenDeclarationSourceMaps.length) {
    console.error(
      `Broken declaration source maps:\n${brokenDeclarationSourceMaps.map((line) => `- ${line}`).join('\n')}`
    )
  }
  if (brokenRuntimeBundleReferences.length) {
    console.error(
      `Broken runtime bundle references:\n${brokenRuntimeBundleReferences.map((line) => `- ${line}`).join('\n')}`
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
  const sources = map.sources ?? []
  const sourcesContent = map.sourcesContent ?? []
  for (const [index, source] of sources.entries()) {
    const target = normalizePackagePath(posix.join(dirname(file), source))
    if ((!target || !packageFiles.has(target)) && sourcesContent[index] === undefined) {
      broken.push(`${file}: ${source}`)
    }
  }
  return broken
}

function findBrokenDeclarationSourceMaps(file, packageFiles) {
  const content = readFileSync(file, 'utf8')
  const broken = []
  const matches = content.matchAll(/sourceMappingURL=([^\s]+)/g)
  for (const match of matches) {
    const target = normalizePackagePath(posix.join(dirname(file), match[1]))
    if (!target || !packageFiles.has(target)) {
      broken.push(`${file}: ${match[1]}`)
    }
  }
  return broken
}

function findBrokenRuntimeBundleReferences(file, packageFiles) {
  const content = readFileSync(file, 'utf8')
  const broken = []
  const patterns = [
    /(?:import|export)\s+[^'"]*\s+from\s+["'](\.\/[^"']+)["']/g,
    /import\(["'](\.\/[^"']+)["']\)/g,
    /require\(["'](\.\/[^"']+)["']\)/g,
    /sourceMappingURL=([^\s]+)/g
  ]

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const target = normalizePackagePath(posix.join(dirname(file), match[1]))
      if (!target || !packageFiles.has(target)) {
        broken.push(`${file}: ${match[1]}`)
      }
    }
  }

  return broken
}

function unique(values) {
  return [...new Set(values)]
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`
}
