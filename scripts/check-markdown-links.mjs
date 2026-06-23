import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize, relative, resolve } from 'node:path'

const root = process.cwd()
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'coverage', 'output', '.vitepress'])
const markdownFiles = []
const failures = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (!ignoredDirs.has(entry)) {
        walk(fullPath)
      }
      continue
    }
    if (extname(entry) === '.md') {
      markdownFiles.push(fullPath)
    }
  }
}

function isExternalOrVirtual(href) {
  return (
    href.startsWith('#') ||
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('javascript:') ||
    href.startsWith('//') ||
    /^#[0-9]+$/.test(href) ||
    /^\.{1,2}\/\.{1,2}\/(issues|pulls?|discussions)(\/|$)/.test(href)
  )
}

function stripHashAndQuery(href) {
  return href.split('#')[0].split('?')[0]
}

function resolveLocalTarget(file, localPath) {
  if (localPath.startsWith('/')) {
    return resolveDocsTarget(localPath)
  }

  return resolve(dirname(file), localPath)
}

function resolveDocsTarget(localPath) {
  const withoutSlash = localPath.replace(/^\/+/, '')
  const docsPath = resolve(root, 'docs', withoutSlash)
  const candidates = [docsPath, `${docsPath}.md`, join(docsPath, 'index.md')]

  for (const candidate of candidates) {
    try {
      statSync(candidate)
      return candidate
    } catch {
      // try next candidate
    }
  }

  return docsPath
}

function toDisplayPath(filePath) {
  return relative(root, filePath)
}

walk(root)

for (const file of markdownFiles) {
  const content = readFileSync(file, 'utf8')
  const links = content.matchAll(/(?<!!)\[[^\]\n]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)

  for (const match of links) {
    const href = match[1]
    if (isExternalOrVirtual(href)) {
      continue
    }

    const localPath = stripHashAndQuery(decodeURI(href))
    if (!localPath) {
      continue
    }

    const target = resolveLocalTarget(file, localPath)
    const normalizedTarget = normalize(target)
    if (!normalizedTarget.startsWith(root)) {
      failures.push(`${toDisplayPath(file)}: link escapes repo: ${href}`)
      continue
    }

    try {
      statSync(normalizedTarget)
    } catch {
      failures.push(`${toDisplayPath(file)}: missing link target: ${href}`)
    }
  }
}

if (failures.length) {
  console.error(`Markdown link check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`Markdown link check passed for ${markdownFiles.length} files.`)
