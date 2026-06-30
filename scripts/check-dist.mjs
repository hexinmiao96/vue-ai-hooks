import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = new URL('../', import.meta.url)
const fromRoot = (path) => new URL(path, root)
const require = createRequire(import.meta.url)

const packageJson = JSON.parse(readFileSync(fromRoot('package.json'), 'utf8'))
const requiredPackageFields = {
  main: './dist/index.cjs',
  module: './dist/index.mjs',
  types: './dist/index.d.ts'
}
const requiredExportFields = {
  types: './dist/index.d.ts',
  import: './dist/index.mjs',
  require: './dist/index.cjs'
}
const requiredRuntimeExports = [
  'AiHooksError',
  'anthropic',
  'deepseek',
  'openai',
  'openaiCompatible',
  'openrouter',
  'proxyProvider',
  'useChat',
  'useCompletion',
  'useEmbedding',
  'usePersist'
]
const publicExports = extractExports(readFileSync(fromRoot('src/index.ts'), 'utf8'))

function fail(message) {
  console.error(message)
  process.exit(1)
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label} expected ${expected}, received ${actual}`)
  }
}

for (const [field, expected] of Object.entries(requiredPackageFields)) {
  assertEqual(packageJson[field], expected, `package.json ${field}`)
}

for (const [field, expected] of Object.entries(requiredExportFields)) {
  assertEqual(packageJson.exports?.['.']?.[field], expected, `package.json exports["."].${field}`)
}
assertEqual(
  packageJson.exports?.['./package.json'],
  './package.json',
  'package.json exports["./package.json"]'
)

for (const path of [
  'dist/index.mjs',
  'dist/index.mjs.map',
  'dist/index.cjs',
  'dist/index.cjs.map',
  'dist/index.d.ts',
  'dist/index.d.ts.map'
]) {
  if (!existsSync(fromRoot(path))) {
    fail(`Missing built file: ${path}`)
  }
}

const esmBundle = readFileSync(fromRoot('dist/index.mjs'), 'utf8')
const cjsBundle = readFileSync(fromRoot('dist/index.cjs'), 'utf8')
if (!/from\s+["']vue["']/.test(esmBundle)) {
  fail('dist/index.mjs must keep Vue externalized as an ESM import')
}
if (!/require\(["']vue["']\)/.test(cjsBundle)) {
  fail('dist/index.cjs must keep Vue externalized as a CJS require')
}

const esm = await import(pathToFileURL(fileURLToPath(fromRoot('dist/index.mjs'))).href)
const cjs = require(fileURLToPath(fromRoot('dist/index.cjs')))

for (const name of requiredRuntimeExports) {
  if (!(name in esm)) {
    fail(`Missing ESM runtime export: ${name}`)
  }
  if (!(name in cjs)) {
    fail(`Missing CJS runtime export: ${name}`)
  }
}

assertEqual(esm.openai({ apiKey: 'test-key' }).id, 'openai-compatible', 'ESM openai provider id')
assertEqual(esm.deepseek({ apiKey: 'test-key' }).id, 'deepseek', 'ESM deepseek provider id')
assertEqual(cjs.openrouter({ apiKey: 'test-key' }).id, 'openrouter', 'CJS openrouter provider id')
assertEqual(esm.proxyProvider().id, 'proxy', 'ESM proxy provider id')
assertEqual(esm.anthropic({ apiKey: 'test-key' }).id, 'anthropic', 'ESM anthropic provider id')
assertEqual(new cjs.AiHooksError('test').name, 'AiHooksError', 'CJS AiHooksError instance name')

const declarations = readFileSync(fromRoot('dist/index.d.ts'), 'utf8')
for (const name of publicExports) {
  if (!declarations.includes(name)) {
    fail(`Missing declaration export: ${name}`)
  }
}

console.log(`Dist check passed for ESM, CJS, and ${publicExports.length} declaration exports.`)

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
