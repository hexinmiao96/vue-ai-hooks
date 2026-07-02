import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync('src/index.ts', 'utf8')
const vitePressConfig = readFileSync('docs/.vitepress/config.ts', 'utf8')
const englishDocs = readReferenceDocs('docs/reference')
const chineseDocs = readReferenceDocs('docs/zh/reference')
const exports = extractExports(source)
const publicEntryFailures = validatePublicEntry(source)
const docsNavigationFailures = validateDocsNavigation(vitePressConfig)
const missingEnglish = missingExports(englishDocs, exports)
const missingChinese = missingExports(chineseDocs, exports)
const missingRequirements = [
  ['English AiHooksError instanceof example', englishDocs, /instanceof\s+AiHooksError/],
  ['English AiHooksError status docs', englishDocs, /\bstatus\b/],
  ['English AiHooksError cause docs', englishDocs, /\bcause\b/],
  ['Chinese AiHooksError instanceof example', chineseDocs, /instanceof\s+AiHooksError/],
  ['Chinese AiHooksError status docs', chineseDocs, /\bstatus\b/],
  ['Chinese AiHooksError cause docs', chineseDocs, /\bcause\b/]
].filter(([, docs, pattern]) => !pattern.test(docs))

if (publicEntryFailures.length) {
  console.error(
    `API docs check failed. Invalid public entry exports:\n${publicEntryFailures.map((line) => `- ${line}`).join('\n')}`
  )
  process.exit(1)
}

if (docsNavigationFailures.length) {
  console.error(
    `API docs check failed. Missing documentation navigation links:\n${docsNavigationFailures.map((line) => `- ${line}`).join('\n')}`
  )
  process.exit(1)
}

if (missingEnglish.length || missingChinese.length) {
  console.error(
    [
      'API docs check failed. Missing public export references:',
      formatMissing('English reference docs', missingEnglish),
      formatMissing('Chinese reference docs', missingChinese)
    ]
      .filter(Boolean)
      .join('\n')
  )
  process.exit(1)
}

if (missingRequirements.length) {
  console.error(
    `API docs check failed. Missing required documentation details:\n${missingRequirements.map(([name]) => `- ${name}`).join('\n')}`
  )
  process.exit(1)
}

console.log(`API docs check passed for ${exports.length} public exports.`)

function missingExports(docs, exports) {
  return exports.filter((name) => !new RegExp(`\\b${escapeRegExp(name)}\\b`).test(docs))
}

function formatMissing(label, names) {
  return names.length ? `${label}:\n${names.map((name) => `- ${name}`).join('\n')}` : ''
}

function extractExports(content) {
  const names = new Set()
  for (const match of content.matchAll(/export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from/g)) {
    for (const rawItem of match[1].split(',')) {
      const item = rawItem.trim().replace(/^type\s+/, '')
      if (!item) continue
      const alias = item
        .split(/\s+as\s+/)
        .pop()
        ?.trim()
      if (alias) names.add(alias)
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

function validatePublicEntry(content) {
  const failures = []

  if (!content.includes('@packageDocumentation')) {
    failures.push('src/index.ts must keep package documentation metadata')
  }

  for (const match of content.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)) {
    failures.push(`wildcard export is not allowed: ${match[1]}`)
  }

  for (const sourcePath of extractExportSources(content)) {
    if (!sourcePath.startsWith('./')) {
      failures.push(`export source must be relative: ${sourcePath}`)
      continue
    }

    if (sourcePath.includes('/_')) {
      failures.push(`internal implementation module must not be public: ${sourcePath}`)
    }

    if (!isAllowedPublicSource(sourcePath)) {
      failures.push(`unexpected public export source: ${sourcePath}`)
    }

    if (!sourceExists(sourcePath)) {
      failures.push(`export source does not exist: ${sourcePath}`)
    }
  }

  return failures
}

function extractExportSources(content) {
  const sources = new Set()
  for (const match of content.matchAll(
    /export\s+(?:type\s+)?\{[\s\S]*?\}\s+from\s+['"]([^'"]+)['"]/g
  )) {
    sources.add(match[1])
  }
  return [...sources].sort((a, b) => a.localeCompare(b))
}

function isAllowedPublicSource(sourcePath) {
  return (
    sourcePath === './types' ||
    sourcePath === './utils/agentEvents' ||
    sourcePath === './utils/inspection' ||
    sourcePath === './utils/stream' ||
    sourcePath.startsWith('./composables/use') ||
    sourcePath.startsWith('./providers/')
  )
}

function sourceExists(sourcePath) {
  const relativePath = join('src', sourcePath.slice(2))
  return (
    existsSync(`${relativePath}.ts`) ||
    existsSync(`${relativePath}.vue`) ||
    existsSync(join(relativePath, 'index.ts'))
  )
}

function validateDocsNavigation(config) {
  const failures = []
  const requiredLinks = [
    ...markdownLinks('docs/guide', '/guide/'),
    ...markdownLinks('docs/zh/guide', '/zh/guide/'),
    ...referenceLinks('docs/reference', '/reference/'),
    ...referenceLinks('docs/zh/reference', '/zh/reference/')
  ]

  for (const link of requiredLinks) {
    if (!hasVitePressLink(config, link)) {
      failures.push(link)
    }
  }

  return failures
}

function markdownLinks(dir, prefix) {
  const links = []

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isFile() && entry.endsWith('.md')) {
      links.push(`${prefix}${entry.replace(/\.md$/, '')}`)
    }
  }

  return links.sort((a, b) => a.localeCompare(b))
}

function referenceLinks(dir, prefix) {
  return markdownLinks(dir, prefix)
}

function hasVitePressLink(config, link) {
  return new RegExp(`link:\\s*['"]${escapeRegExp(link)}['"]`).test(config)
}

function readReferenceDocs(dir) {
  let content = ''
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isFile() && entry.endsWith('.md')) {
      content += `\n${readFileSync(fullPath, 'utf8')}`
    }
  }
  return content
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
