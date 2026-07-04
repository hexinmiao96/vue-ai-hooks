import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { extractExports, extractRuntimeExports } from './lib/entry-exports.mjs'

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
const requiredReactExportFields = {
  types: './dist/react.d.ts',
  import: './dist/react.mjs',
  require: './dist/react.cjs'
}
const indexSource = readFileSync(fromRoot('src/index.ts'), 'utf8')
const reactSource = readFileSync(fromRoot('src/react.ts'), 'utf8')
const publicExports = extractExports(indexSource)
const reactPublicExports = extractExports(reactSource)
const requiredRuntimeExports = extractRuntimeExports(indexSource)
const requiredReactRuntimeExports = extractRuntimeExports(reactSource)

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
for (const [field, expected] of Object.entries(requiredReactExportFields)) {
  assertEqual(
    packageJson.exports?.['./react']?.[field],
    expected,
    `package.json exports["./react"].${field}`
  )
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
  'dist/index.d.ts.map',
  'dist/react.mjs',
  'dist/react.mjs.map',
  'dist/react.cjs',
  'dist/react.cjs.map',
  'dist/react.d.ts',
  'dist/react.d.ts.map'
]) {
  if (!existsSync(fromRoot(path))) {
    fail(`Missing built file: ${path}`)
  }
}

const esmBundle = readFileSync(fromRoot('dist/index.mjs'), 'utf8')
const cjsBundle = readFileSync(fromRoot('dist/index.cjs'), 'utf8')
const reactEsmBundle = readFileSync(fromRoot('dist/react.mjs'), 'utf8')
const reactCjsBundle = readFileSync(fromRoot('dist/react.cjs'), 'utf8')
if (!/from\s+["']vue["']/.test(esmBundle)) {
  fail('dist/index.mjs must keep Vue externalized as an ESM import')
}
if (!/require\(["']vue["']\)/.test(cjsBundle)) {
  fail('dist/index.cjs must keep Vue externalized as a CJS require')
}
if (/from\s+["']react["']/.test(esmBundle) || /require\(["']react["']\)/.test(cjsBundle)) {
  fail('root dist bundles must not import React')
}
if (!/from\s+["']react["']/.test(reactEsmBundle)) {
  fail('dist/react.mjs must keep React externalized as an ESM import')
}
if (!/require\(["']react["']\)/.test(reactCjsBundle)) {
  fail('dist/react.cjs must keep React externalized as a CJS require')
}

const esm = await import(pathToFileURL(fileURLToPath(fromRoot('dist/index.mjs'))).href)
const cjs = require(fileURLToPath(fromRoot('dist/index.cjs')))
const reactEsm = await import(pathToFileURL(fileURLToPath(fromRoot('dist/react.mjs'))).href)
const reactCjs = require(fileURLToPath(fromRoot('dist/react.cjs')))

for (const name of requiredRuntimeExports) {
  if (!(name in esm)) {
    fail(`Missing ESM runtime export: ${name}`)
  }
  if (!(name in cjs)) {
    fail(`Missing CJS runtime export: ${name}`)
  }
}
for (const name of requiredReactRuntimeExports) {
  if (!(name in reactEsm)) {
    fail(`Missing ESM React runtime export: ${name}`)
  }
  if (!(name in reactCjs)) {
    fail(`Missing CJS React runtime export: ${name}`)
  }
}

assertEqual(esm.openai({ apiKey: 'test-key' }).id, 'openai-compatible', 'ESM openai provider id')
assertEqual(esm.deepseek({ apiKey: 'test-key' }).id, 'deepseek', 'ESM deepseek provider id')
assertEqual(esm.moonshot({ apiKey: 'test-key' }).id, 'moonshot', 'ESM moonshot provider id')
assertEqual(esm.zhipu({ apiKey: 'test-key' }).id, 'zhipu', 'ESM zhipu provider id')
assertEqual(esm.ollama().id, 'ollama', 'ESM ollama provider id')
assertEqual(esm.vllm().id, 'vllm', 'ESM vllm provider id')
assertEqual(cjs.openrouter({ apiKey: 'test-key' }).id, 'openrouter', 'CJS openrouter provider id')
assertEqual(esm.proxyProvider().id, 'proxy', 'ESM proxy provider id')
assertEqual(
  esm.classifyInspectionError(new esm.AiHooksError('too many requests', { status: 429 })).category,
  'rate-limit',
  'ESM classifyInspectionError category'
)
assertEqual(
  esm.inspectRequestTrace({ lastRequest: { providerId: 'proxy' }, now: 0 }).providerId,
  'proxy',
  'ESM inspectRequestTrace provider id'
)
assertEqual(
  esm.createInspectionCurl({
    api: '/api/chat',
    headers: { authorization: 'Bearer secret' },
    body: { prompt: 'hello' }
  }),
  "curl -X 'POST' '/api/chat' \\\n" +
    "  -H 'authorization: [redacted]' \\\n" +
    '  --data-raw \'{"prompt":"hello"}\'',
  'ESM createInspectionCurl redaction'
)
assertEqual(
  new esm.DirectChatTransport({ stream: () => [] }).id,
  'direct',
  'ESM DirectChatTransport provider id'
)
assertEqual(esm.anthropic({ apiKey: 'test-key' }).id, 'anthropic', 'ESM anthropic provider id')
assertEqual(new cjs.AiHooksError('test').name, 'AiHooksError', 'CJS AiHooksError instance name')
assertEqual(typeof reactEsm.useChat, 'function', 'ESM React useChat export')
assertEqual(typeof reactCjs.useChat, 'function', 'CJS React useChat export')
assertEqual(typeof reactEsm.useCompletion, 'function', 'ESM React useCompletion export')
assertEqual(typeof reactCjs.useCompletion, 'function', 'CJS React useCompletion export')
assertEqual(typeof reactEsm.useObject, 'function', 'ESM React useObject export')
assertEqual(typeof reactCjs.useObject, 'function', 'CJS React useObject export')

const declarations = readFileSync(fromRoot('dist/index.d.ts'), 'utf8')
for (const name of publicExports) {
  if (!declarations.includes(name)) {
    fail(`Missing declaration export: ${name}`)
  }
}
const reactDeclarations = readFileSync(fromRoot('dist/react.d.ts'), 'utf8')
for (const name of reactPublicExports) {
  if (!reactDeclarations.includes(name)) {
    fail(`Missing React declaration export: ${name}`)
  }
}

console.log(
  `Dist check passed for root and React ESM/CJS bundles, ${publicExports.length} root exports, and ${reactPublicExports.length} React exports.`
)
