import { existsSync } from 'node:fs'

export function extractExports(content) {
  return extractExportNames(content, { includeTypes: true })
}

export function extractRuntimeExports(content) {
  return extractExportNames(content, { includeTypes: false })
}

export function extractExportSources(content) {
  const sources = new Set()
  for (const match of content.matchAll(namedExportFromPattern)) {
    sources.add(match[3])
  }
  return [...sources].sort((a, b) => a.localeCompare(b))
}

export function resolveExportSourceFile(sourcePath) {
  return resolveExportFile(sourcePath, 'src', '.ts')
}

export function resolveExportDeclarationFile(sourcePath) {
  return resolveExportFile(sourcePath, 'dist', '.d.ts')
}

const namedExportFromPattern = /export\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"]/g

function extractExportNames(content, { includeTypes }) {
  const names = new Set()
  for (const match of content.matchAll(namedExportFromPattern)) {
    const isTypeBlock = Boolean(match[1])
    if (isTypeBlock && !includeTypes) continue

    for (const rawItem of match[2].split(',')) {
      const isTypeItem = /^\s*type\s+/.test(rawItem)
      if (isTypeItem && !includeTypes) continue

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

function resolveExportFile(sourcePath, root, extension) {
  const path = sourcePath.slice(2)
  const direct = `${root}/${path}${extension}`
  if (existsSync(direct)) return direct

  return `${root}/${path}/index${extension}`
}
