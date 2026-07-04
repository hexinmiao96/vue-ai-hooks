import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, isAbsolute, join, normalize, relative, resolve } from 'node:path'

const root = process.cwd()
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'coverage', 'output', '.vitepress'])
const markdownFiles = []
const failures = []
const anchorCache = new Map()

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
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('//') ||
    /^#[0-9]+$/.test(href) ||
    /^\.{1,2}\/\.{1,2}\/(issues|pulls?|discussions)(\/|$)/.test(href)
  )
}

function isUnsafeHref(href) {
  return /^(?:javascript|data|vbscript):/i.test(href)
}

function parseHref(href) {
  const hashIndex = href.indexOf('#')
  const queryIndex = href.indexOf('?')
  const pathEnd = minPositiveIndex([hashIndex, queryIndex], href.length)
  const rawPath = href.slice(0, pathEnd)
  const rawFragment = hashIndex === -1 ? '' : href.slice(hashIndex + 1).split('?')[0]

  try {
    return {
      localPath: decodeURI(rawPath),
      fragment: rawFragment ? decodeURIComponent(rawFragment) : ''
    }
  } catch {
    return null
  }
}

function resolveLocalTarget(file, localPath) {
  if (!localPath) {
    return file
  }

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

function isInsideRoot(filePath) {
  const relativePath = relative(root, filePath)
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))
}

function anchorsFor(filePath) {
  if (anchorCache.has(filePath)) {
    return anchorCache.get(filePath)
  }

  const anchors = new Set()
  const content = readFileSync(filePath, 'utf8')
  const slugCounts = new Map()

  for (const match of content.matchAll(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm)) {
    const slug = uniqueSlug(slugify(match[2]), slugCounts)
    if (slug) anchors.add(slug)
  }

  collectExplicitAnchors(content, anchors)

  for (const component of referencedComponents(content)) {
    collectComponentAnchors(component, anchors)
  }

  anchorCache.set(filePath, anchors)
  return anchors
}

function collectExplicitAnchors(content, anchors) {
  for (const match of content.matchAll(/\b(?:id|name|[A-Za-z0-9_-]+-id)=["']([^"']+)["']/g)) {
    anchors.add(match[1])
  }
}

function referencedComponents(content) {
  return unique([...content.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)].map((match) => match[1]))
}

function collectComponentAnchors(componentName, anchors) {
  const componentPath = join(root, 'docs/.vitepress/theme/components', `${componentName}.vue`)
  if (!existsSync(componentPath)) {
    return
  }

  collectExplicitAnchors(readFileSync(componentPath, 'utf8'), anchors)
}

function slugify(value) {
  return stripMarkdown(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\s\p{P}\p{S}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function stripMarkdown(value) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
}

function uniqueSlug(slug, slugCounts) {
  const count = slugCounts.get(slug) ?? 0
  slugCounts.set(slug, count + 1)
  return count === 0 ? slug : `${slug}-${count}`
}

walk(root)

for (const file of markdownFiles) {
  const content = readFileSync(file, 'utf8')
  const links = content.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)

  for (const match of links) {
    const href = match[1]
    if (isUnsafeHref(href)) {
      failures.push(`${toDisplayPath(file)}: unsafe link href: ${href}`)
      continue
    }

    if (isExternalOrVirtual(href)) {
      continue
    }

    const parsed = parseHref(href)
    if (!parsed) {
      failures.push(`${toDisplayPath(file)}: invalid encoded link href: ${href}`)
      continue
    }

    const { localPath, fragment } = parsed
    const target = resolveLocalTarget(file, localPath)
    const normalizedTarget = normalize(target)
    if (!isInsideRoot(normalizedTarget)) {
      failures.push(`${toDisplayPath(file)}: link escapes repo: ${href}`)
      continue
    }

    try {
      statSync(normalizedTarget)
    } catch {
      failures.push(`${toDisplayPath(file)}: missing link target: ${href}`)
      continue
    }

    if (
      fragment &&
      extname(normalizedTarget) === '.md' &&
      !anchorsFor(normalizedTarget).has(fragment)
    ) {
      failures.push(`${toDisplayPath(file)}: missing link anchor: ${href}`)
    }
  }
}

if (failures.length) {
  console.error(`Markdown link check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`Markdown link check passed for ${markdownFiles.length} files.`)

function minPositiveIndex(indexes, fallback) {
  const candidates = indexes.filter((index) => index >= 0)
  return candidates.length ? Math.min(...candidates) : fallback
}

function unique(values) {
  return [...new Set(values)]
}
