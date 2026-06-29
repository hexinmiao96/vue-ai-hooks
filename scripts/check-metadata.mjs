import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8'))
const buildTsconfig = JSON.parse(readFileSync('tsconfig.build.json', 'utf8'))
const lockfile = readFileSync('pnpm-lock.yaml', 'utf8')
const eslintConfig = readFileSync('eslint.config.js', 'utf8')
const viteConfig = readFileSync('vite.config.ts', 'utf8')
const vitepressConfig = readFileSync('docs/.vitepress/config.ts', 'utf8')
const gitignore = readFileSync('.gitignore', 'utf8')
const prettierignore = readFileSync('.prettierignore', 'utf8')
const prettierConfig = JSON.parse(readFileSync('.prettierrc', 'utf8'))
const editorConfig = readFileSync('.editorconfig', 'utf8')
const license = readFileSync('LICENSE', 'utf8')
const envExample = readFileSync('.env.example', 'utf8')
const readme = readFileSync('README.md', 'utf8')
const zhReadme = readFileSync('README.zh-CN.md', 'utf8')
const apiStabilityGuide = readFileSync('docs/guide/api-stability.md', 'utf8')
const zhApiStabilityGuide = readFileSync('docs/zh/guide/api-stability.md', 'utf8')
const ssrGuide = readFileSync('docs/guide/ssr.md', 'utf8')
const zhSsrGuide = readFileSync('docs/zh/guide/ssr.md', 'utf8')
const testingGuide = readFileSync('docs/guide/testing.md', 'utf8')
const zhTestingGuide = readFileSync('docs/zh/guide/testing.md', 'utf8')
const troubleshooting = readFileSync('docs/guide/troubleshooting.md', 'utf8')
const zhTroubleshooting = readFileSync('docs/zh/guide/troubleshooting.md', 'utf8')
const contributing = readFileSync('CONTRIBUTING.md', 'utf8')
const normalizedContributing = normalizeWhitespace(contributing)
const failures = []
const requiredGitignoreEntries = [
  'node_modules',
  '.pnpm-store',
  'dist',
  'docs/.vitepress/cache',
  'docs/.vitepress/dist',
  '.playwright-cli',
  'output',
  '*.tsbuildinfo',
  '.idea',
  '.DS_Store',
  'coverage',
  '.nyc_output',
  '*.log',
  'pnpm-debug.log*',
  '.env',
  '.env.local',
  '.env.*.local'
]
const requiredPrettierignoreEntries = [
  'node_modules',
  'dist',
  'coverage',
  'output',
  'docs/.vitepress/cache',
  'docs/.vitepress/dist',
  '*.tsbuildinfo',
  'pnpm-lock.yaml'
]
const requiredEditorConfigLines = [
  'root = true',
  '[*]',
  'indent_style = space',
  'indent_size = 2',
  'end_of_line = lf',
  'charset = utf-8',
  'trim_trailing_whitespace = true',
  'insert_final_newline = true',
  '[*.md]',
  'trim_trailing_whitespace = false'
]
const requiredEslintConfigSnippets = [
  "import js from '@eslint/js'",
  "import tsParser from '@typescript-eslint/parser'",
  "import vue from 'eslint-plugin-vue'",
  "import vueParser from 'vue-eslint-parser'",
  "ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'output/**']",
  'js.configs.recommended',
  "...vue.configs['flat/recommended']",
  "files: ['**/*.ts']",
  'parser: tsParser',
  "files: ['**/*.vue']",
  'parser: vueParser',
  "extraFileExtensions: ['.vue']",
  "'no-console': ['warn', { allow: ['warn', 'error'] }]",
  "'no-undef': 'off'",
  "'no-unused-vars': 'off'"
]
const requiredViteConfigSnippets = [
  "import vue from '@vitejs/plugin-vue'",
  'plugins: [vue()]',
  'emptyOutDir: false',
  'sourcemap: true',
  "entry: resolve(__dirname, 'src/index.ts')",
  "name: 'VueAiHooks'",
  "fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`",
  "formats: ['es', 'cjs']",
  "external: ['vue']",
  "vue: 'Vue'"
]
const expectedPackageFiles = [
  'dist',
  'src',
  'README.md',
  'README.zh-CN.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE'
]
const requiredPackageKeywords = [
  'vue',
  'vue3',
  'composables',
  'vue-composable',
  'ai',
  'ai-sdk',
  'llm',
  'openai',
  'openai-compatible',
  'claude',
  'anthropic',
  'openrouter',
  'streaming',
  'sse',
  'typescript',
  'embedding'
]
const requiredReadmeBadgeSnippets = [
  'actions/workflows/ci.yml/badge.svg',
  'https://www.npmjs.com/package/vue-ai-hooks',
  'img.shields.io/npm/v/vue-ai-hooks.svg',
  'img.shields.io/bundlephobia/minzip/vue-ai-hooks',
  'bundlephobia.com/package/vue-ai-hooks',
  'img.shields.io/badge/license-MIT-blue.svg',
  'img.shields.io/badge/vue-3.4+-42b883.svg',
  'img.shields.io/badge/typescript-strict-3178c6.svg',
  'img.shields.io/badge/PRs-welcome-brightgreen.svg'
]

expect(packageJson.name === 'vue-ai-hooks', 'package name should stay vue-ai-hooks')
expect(
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version),
  'package version must be semver-like'
)
for (const phrase of [
  'Vue 3 Composable library',
  'AI-powered applications',
  'useChat, useCompletion, useEmbedding',
  'multi-provider',
  'streaming-first',
  'fully typed'
]) {
  expect(packageJson.description?.includes(phrase), `package description must include ${phrase}`)
}
expect(
  new Set(packageJson.keywords ?? []).size === (packageJson.keywords ?? []).length,
  'package keywords must not contain duplicates'
)
for (const keyword of requiredPackageKeywords) {
  expect(packageJson.keywords?.includes(keyword), `package keywords must include ${keyword}`)
}
expect(packageJson.license === 'MIT', 'package license must be MIT')
expect(packageJson.author === 'hexinmiao96', 'package author must stay hexinmiao96')
expect(license.startsWith('MIT License\n'), 'LICENSE must contain the MIT license heading')
expect(
  license.includes(`Copyright (c) 2026 ${packageJson.author}`),
  'LICENSE copyright holder must match package author'
)
expect(
  license.includes('Permission is hereby granted, free of charge'),
  'LICENSE must contain the MIT permission grant'
)
expect(
  license.includes('THE SOFTWARE IS PROVIDED "AS IS"'),
  'LICENSE must contain the MIT warranty disclaimer'
)
expect(packageJson.type === 'module', 'package type must be module')
expect(packageJson.sideEffects === false, 'package must remain side-effect free for tree shaking')
expect(packageJson.publishConfig?.access === 'public', 'publishConfig.access must be public')
expect(
  arraysEqual(packageJson.files ?? [], expectedPackageFiles),
  `package files whitelist must stay exact: ${expectedPackageFiles.join(', ')}`
)
expect(!existsSync('.npmignore'), 'package must rely on package.json files, not .npmignore')
for (const entry of requiredGitignoreEntries) {
  expect(hasIgnoreEntry(gitignore, entry), `.gitignore must include ${entry}`)
}
for (const entry of requiredPrettierignoreEntries) {
  expect(hasIgnoreEntry(prettierignore, entry), `.prettierignore must include ${entry}`)
}
expect(prettierConfig.semi === false, '.prettierrc must keep semicolons disabled')
expect(prettierConfig.singleQuote === true, '.prettierrc must keep single quotes enabled')
expect(prettierConfig.trailingComma === 'none', '.prettierrc must keep trailing commas disabled')
expect(prettierConfig.printWidth === 100, '.prettierrc must keep printWidth at 100')
expect(prettierConfig.tabWidth === 2, '.prettierrc must keep tabWidth at 2')
expect(prettierConfig.arrowParens === 'always', '.prettierrc must keep arrowParens set to always')
expect(prettierConfig.endOfLine === 'lf', '.prettierrc must keep LF line endings')
for (const line of requiredEditorConfigLines) {
  expect(hasLine(editorConfig, line), `.editorconfig must include ${line}`)
}
for (const snippet of requiredEslintConfigSnippets) {
  expect(
    eslintConfig.includes(snippet),
    `eslint.config.js must include required config: ${snippet}`
  )
}
for (const snippet of requiredViteConfigSnippets) {
  expect(viteConfig.includes(snippet), `vite.config.ts must include required config: ${snippet}`)
}
expect(
  hasLine(envExample, 'VITE_OPENAI_KEY=sk-...'),
  '.env.example must keep a placeholder OpenAI key'
)
expect(
  hasLine(envExample, 'VITE_OPENAI_BASE_URL=https://api.openai.com/v1'),
  '.env.example must keep the default OpenAI-compatible base URL'
)
expect(
  envExample.includes('Do not ship real provider keys in browser apps'),
  '.env.example must warn against shipping browser provider keys'
)
expect(
  envExample.includes('production apps should proxy requests server-side'),
  '.env.example must direct production apps to server-side proxying'
)
for (const name of findViteEnvNamesInExamples()) {
  expect(hasEnvAssignment(envExample, name), `.env.example must document ${name} used by examples`)
}
expect(
  Object.keys(packageJson.dependencies ?? {}).length === 0,
  'package must not add runtime dependencies'
)
expect(
  Object.keys(packageJson.optionalDependencies ?? {}).length === 0,
  'package must not add optional runtime dependencies'
)
expect(
  Object.keys(packageJson.bundledDependencies ?? packageJson.bundleDependencies ?? {}).length === 0,
  'package must not bundle runtime dependencies'
)
expect(
  Object.keys(packageJson.peerDependencies ?? {}).length === 1,
  'package must keep peer dependencies limited to Vue'
)
expect(
  packageJson.peerDependencies?.vue === '^3.4.0',
  'Vue peer dependency must stay documented as ^3.4.0'
)
expect(packageJson.engines?.node === '>=18.18.0', 'Node engine floor must stay >=18.18.0')
expect(
  packageJson.packageManager === 'pnpm@8.15.9',
  'packageManager must stay pinned to pnpm 8.15.9'
)
expect(lockfile.startsWith("lockfileVersion: '6.0'"), 'pnpm-lock.yaml must stay pnpm 8 format')
expect(!existsSync('package-lock.json'), 'package-lock.json must not be committed')
expect(!existsSync('yarn.lock'), 'yarn.lock must not be committed')
expect(!existsSync('bun.lockb'), 'bun.lockb must not be committed')
expect(packageJson.pnpm?.overrides?.vite === '^6.4.3', 'Vite override must stay pinned in pnpm')
expect(lockfile.includes('overrides:\n  vite: ^6.4.3'), 'pnpm-lock.yaml must include Vite override')
expect(
  tsconfig.extends === '@vue/tsconfig/tsconfig.dom.json',
  'tsconfig.json must extend the Vue DOM TypeScript base config'
)
expect(tsconfig.compilerOptions?.strict === true, 'tsconfig.json must keep strict mode enabled')
expect(tsconfig.compilerOptions?.noUnusedLocals === true, 'tsconfig.json must reject unused locals')
expect(
  tsconfig.compilerOptions?.noUnusedParameters === true,
  'tsconfig.json must reject unused parameters'
)
expect(
  tsconfig.compilerOptions?.noFallthroughCasesInSwitch === true,
  'tsconfig.json must reject switch fallthrough'
)
expect(
  tsconfig.compilerOptions?.moduleResolution === 'bundler',
  'tsconfig.json must use bundler module resolution'
)
expect(
  tsconfig.compilerOptions?.isolatedModules === true,
  'tsconfig.json must keep isolatedModules enabled'
)
expect(tsconfig.compilerOptions?.declaration === true, 'tsconfig.json must emit declarations')
expect(
  tsconfig.compilerOptions?.declarationMap === true,
  'tsconfig.json must emit declaration maps'
)
expect(tsconfig.compilerOptions?.sourceMap === true, 'tsconfig.json must emit source maps')
expect(
  tsconfig.compilerOptions?.paths?.['vue-ai-hooks']?.[0] === 'src/index.ts',
  'tsconfig.json must map vue-ai-hooks to src/index.ts for local consumers'
)
expect(
  tsconfig.include?.includes('tests/**/*.ts') &&
    tsconfig.include?.includes('examples/**/*.vue') &&
    tsconfig.include?.includes('docs/.vitepress/config.ts'),
  'tsconfig.json must type-check tests, examples, and docs config'
)
expect(
  buildTsconfig.extends === './tsconfig.json',
  'tsconfig.build.json must extend the root tsconfig'
)
expect(buildTsconfig.compilerOptions?.rootDir === 'src', 'build tsconfig rootDir must be src')
expect(
  buildTsconfig.compilerOptions?.noEmit === false,
  'build tsconfig must allow declaration emit'
)
expect(
  buildTsconfig.compilerOptions?.emitDeclarationOnly === true,
  'build tsconfig must emit declarations only'
)
expect(
  arraysEqual(buildTsconfig.include ?? [], ['src/**/*.ts']),
  'build tsconfig must include only src TypeScript files'
)
expect(
  ['node_modules', 'dist', 'tests', 'examples'].every((entry) =>
    buildTsconfig.exclude?.includes(entry)
  ),
  'build tsconfig must exclude node_modules, dist, tests, and examples'
)
expect(
  packageJson.scripts?.['format:check']?.includes('prettier --check'),
  'format:check must run Prettier in check mode'
)
expect(
  packageJson.scripts?.check?.startsWith('pnpm format:check &&'),
  'pnpm check must start with format:check'
)
expect(
  packageJson.scripts?.typecheck === 'vue-tsc -p tsconfig.build.json',
  'typecheck must use the build tsconfig'
)
expect(
  packageJson.scripts?.['typecheck:all'] === 'vue-tsc -p tsconfig.json --noEmit',
  'typecheck:all must run the root tsconfig without emitting'
)
expect(
  packageJson.scripts?.check?.includes('pnpm typecheck:all'),
  'pnpm check must include typecheck:all'
)
expect(
  packageJson.scripts?.['secrets:check'] === 'node scripts/check-secrets.mjs',
  'secrets:check must scan for committed secrets'
)
expect(
  packageJson.scripts?.check?.includes('pnpm secrets:check'),
  'pnpm check must include secrets:check'
)
expect(
  packageJson.scripts?.['source:hygiene'] === 'node scripts/check-source-hygiene.mjs',
  'source:hygiene must scan for source hygiene issues'
)
expect(
  packageJson.scripts?.check?.includes('pnpm source:hygiene'),
  'pnpm check must include source:hygiene'
)
expect(packageJson.scripts?.lint?.includes('--max-warnings 0'), 'pnpm lint must fail on warnings')
expect(
  packageJson.scripts?.['test:hygiene'] === 'node scripts/check-test-hygiene.mjs',
  'test:hygiene must scan for focused, skipped, or todo tests'
)
expect(
  packageJson.scripts?.check?.includes('pnpm test:hygiene'),
  'pnpm check must include test:hygiene'
)
expect(
  packageJson.scripts?.['size:check'] === 'node scripts/check-size.mjs',
  'size:check must verify bundle budgets'
)
expect(
  packageJson.scripts?.check?.includes('pnpm size:check'),
  'pnpm check must include size:check'
)
expect(
  packageJson.scripts?.check?.includes('pnpm changelog:check'),
  'pnpm check must include changelog:check'
)
expect(
  packageJson.scripts?.check?.includes('pnpm community:check'),
  'pnpm check must include community:check'
)
expect(
  packageJson.scripts?.['docs:ux:check'] === 'node scripts/check-docs-ux.mjs',
  'docs:ux:check must verify documentation onboarding and examples UX'
)
expect(
  packageJson.scripts?.check?.includes('pnpm docs:ux:check'),
  'pnpm check must include docs:ux:check'
)
expect(
  packageJson.scripts?.['release:check'] === 'pnpm security:audit && pnpm check',
  'release:check must run security audit and pnpm check'
)
expect(
  packageJson.scripts?.prepublishOnly === 'pnpm release:check',
  'prepublishOnly must delegate to release:check'
)
expect(
  packageJson.repository?.url === 'git+https://github.com/hexinmiao96/vue-ai-hooks.git',
  'repository URL must point at the canonical GitHub repo'
)
expect(
  packageJson.bugs?.url === 'https://github.com/hexinmiao96/vue-ai-hooks/issues',
  'bugs URL must point at GitHub issues'
)
expect(
  packageJson.homepage === 'https://github.com/hexinmiao96/vue-ai-hooks#readme',
  'homepage must point at the canonical README'
)

for (const [file, content] of [
  ['README.md', readme],
  ['README.zh-CN.md', zhReadme]
]) {
  for (const snippet of requiredReadmeBadgeSnippets) {
    expect(content.includes(snippet), `${file} must include README badge/link: ${snippet}`)
  }
  expect(
    content.includes(`v${packageJson.version}`),
    `${file} must mention current version v${packageJson.version}`
  )
  expect(content.includes('vue@^3.4.0'), `${file} must mention Vue peer dependency vue@^3.4.0`)
}
expect(readme.includes('/docs/guide/testing.md'), 'README.md must link to the testing guide')
expect(
  zhReadme.includes('/docs/zh/guide/testing.md'),
  'README.zh-CN.md must link to the Chinese testing guide'
)
expect(
  readme.includes('/docs/guide/api-stability.md'),
  'README.md must link to the API stability guide'
)
expect(
  zhReadme.includes('/docs/zh/guide/api-stability.md'),
  'README.zh-CN.md must link to the Chinese API stability guide'
)
expect(readme.includes('/docs/guide/ssr.md'), 'README.md must link to the SSR guide')
expect(
  zhReadme.includes('/docs/zh/guide/ssr.md'),
  'README.zh-CN.md must link to the Chinese SSR guide'
)
for (const snippet of [
  '## Known limitations',
  'production apps should proxy',
  'Tool calling helpers execute local handlers',
  'provider-specific retries',
  'observability'
]) {
  expect(readme.includes(snippet), `README.md must document limitation: ${snippet}`)
}
for (const snippet of [
  '## Runtime requirements',
  'Vue 3.4 or newer',
  '`fetch`, `AbortController`',
  '`ReadableStream`',
  'Server-Sent Events',
  'Node.js 18.18 or newer',
  'compatible polyfills'
]) {
  expect(readme.includes(snippet), `README.md must document runtime requirement: ${snippet}`)
}
for (const snippet of [
  '## 已知限制',
  '生产应用应通过后端或边缘运行时代理',
  '沙箱隔离和权限确认应由宿主应用负责',
  'Provider 专属重试、限流和可观测性'
]) {
  expect(zhReadme.includes(snippet), `README.zh-CN.md must document limitation: ${snippet}`)
}
for (const snippet of [
  '## 运行时要求',
  'Vue 3.4 或更高版本',
  '`fetch`、`AbortController`',
  '`ReadableStream`',
  'Server-Sent Events',
  'Node.js 18.18 或更高版本',
  '兼容 polyfill'
]) {
  expect(
    zhReadme.includes(snippet),
    `README.zh-CN.md must document runtime requirement: ${snippet}`
  )
}
for (const snippet of [
  '/guide/api-stability',
  '/guide/troubleshooting',
  '/guide/ssr',
  '/guide/testing',
  '/zh/guide/api-stability',
  '/zh/guide/troubleshooting',
  '/zh/guide/ssr',
  '/zh/guide/testing',
  'API stability',
  'API 稳定性',
  'SSR and Nuxt',
  'SSR 和 Nuxt',
  'Troubleshooting',
  'Testing',
  '测试',
  '故障排查'
]) {
  expect(
    vitepressConfig.includes(snippet),
    `VitePress config must link troubleshooting: ${snippet}`
  )
}
for (const snippet of [
  '# API stability',
  'Stable public surface',
  'What counts as a breaking change',
  'Internal implementation details',
  'Do not import files below `vue-ai-hooks/dist`',
  'Provider and model behavior'
]) {
  expect(apiStabilityGuide.includes(snippet), `English API stability docs must include ${snippet}`)
}
for (const snippet of [
  '# API 稳定性',
  '稳定公开接口',
  '什么算破坏性变更',
  '内部实现细节',
  '不要直接导入 `vue-ai-hooks/dist`',
  'Provider 和模型行为'
]) {
  expect(
    zhApiStabilityGuide.includes(snippet),
    `Chinese API stability docs must include ${snippet}`
  )
}
for (const snippet of [
  '# SSR and Nuxt',
  'Keep provider credentials server-side',
  'Run composables in client-owned state',
  'Persistence during SSR',
  'Streaming through a backend',
  'Testing SSR boundaries'
]) {
  expect(ssrGuide.includes(snippet), `English SSR docs must include ${snippet}`)
}
for (const snippet of [
  '# SSR 和 Nuxt',
  'Provider 凭据只放服务端',
  '在客户端所属状态中运行组合式函数',
  'SSR 中的持久化',
  '通过后端转发流式响应',
  '测试 SSR 边界'
]) {
  expect(zhSsrGuide.includes(snippet), `Chinese SSR docs must include ${snippet}`)
}
for (const snippet of [
  '# Testing',
  'fake providers',
  'fakeChatProvider',
  'Test completions without a network',
  'Test embeddings deterministically',
  'Test provider errors',
  'Test persistence with explicit storage',
  'Avoid real provider calls in unit tests'
]) {
  expect(testingGuide.includes(snippet), `English testing docs must include ${snippet}`)
}
for (const snippet of [
  '# 测试',
  'fake provider',
  'fakeChatProvider',
  '不依赖网络测试 completion',
  '稳定测试 embeddings',
  '测试 Provider 错误',
  '使用显式 storage 测试持久化',
  '单元测试应避免真实 Provider 调用'
]) {
  expect(zhTestingGuide.includes(snippet), `Chinese testing docs must include ${snippet}`)
}
for (const snippet of [
  '# Troubleshooting',
  'Browser API keys are visible',
  'CORS or provider request fails in the browser',
  'Streaming response does not update',
  '`stop()` does not cancel upstream work immediately',
  'Tool calling needs explicit trust boundaries',
  'Minimal issue details'
]) {
  expect(troubleshooting.includes(snippet), `English troubleshooting docs must include ${snippet}`)
}
for (const snippet of [
  '# 故障排查',
  '浏览器 API key 会暴露',
  'CORS 或 Provider 请求失败',
  '流式响应没有实时更新',
  '`stop()` 不一定立刻取消上游任务',
  'Tool calling 需要明确的信任边界',
  '最小 issue 信息'
]) {
  expect(
    zhTroubleshooting.includes(snippet),
    `Chinese troubleshooting docs must include ${snippet}`
  )
}

expect(
  contributing.includes('Node.js 18.18 or newer'),
  'CONTRIBUTING.md must document Node.js 18.18+'
)
expect(contributing.includes('pnpm 8.15.9'), 'CONTRIBUTING.md must document pnpm 8.15.9')
expect(
  contributing.includes('pnpm format:check'),
  'CONTRIBUTING.md must document the format check command'
)
expect(
  contributing.includes('pnpm secrets:check'),
  'CONTRIBUTING.md must document the secret check command'
)
expect(
  contributing.includes('pnpm source:hygiene'),
  'CONTRIBUTING.md must document the source hygiene check command'
)
expect(
  contributing.includes('pnpm test:hygiene'),
  'CONTRIBUTING.md must document the test hygiene check command'
)
expect(
  contributing.includes('pnpm size:check'),
  'CONTRIBUTING.md must document the bundle size check command'
)
expect(
  contributing.includes('package metadata, README, docs navigation, and contributor facts'),
  'CONTRIBUTING.md must describe metadata:check coverage accurately'
)
expect(
  contributing.includes('CODEOWNERS, issue/PR templates, support, security, and conduct files'),
  'CONTRIBUTING.md must describe community:check coverage accurately'
)
expect(
  contributing.includes('public exports, reference docs, and VitePress guide/reference navigation'),
  'CONTRIBUTING.md must describe api:check coverage accurately'
)
expect(
  contributing.includes('docs onboarding paths, examples language routing, and demo navigation'),
  'CONTRIBUTING.md must describe docs:ux:check coverage accurately'
)
expect(
  contributing.includes('No external runtime deps'),
  'CONTRIBUTING.md must document the no runtime dependency policy'
)
expect(
  contributing.includes('pnpm build && pnpm size:check'),
  'CONTRIBUTING.md must document how to check bundle size budgets'
)
expect(
  contributing.includes('`dist/index.mjs`: 83,500 bytes raw, 21,800 bytes gzip.'),
  'CONTRIBUTING.md must document the ESM bundle size budget'
)
expect(
  contributing.includes('`dist/index.cjs`: 58,500 bytes raw, 19,000 bytes gzip.'),
  'CONTRIBUTING.md must document the CJS bundle size budget'
)
expect(
  contributing.includes('## Versioning policy'),
  'CONTRIBUTING.md must document the versioning policy'
)
expect(
  normalizedContributing.includes(
    'Semantic Versioning for public exports and documented runtime behavior'
  ),
  'CONTRIBUTING.md must define the Semantic Versioning scope'
)
expect(
  contributing.includes('**Patch**: bug fixes'),
  'CONTRIBUTING.md must document patch version changes'
)
expect(
  contributing.includes('**Minor**: new public exports'),
  'CONTRIBUTING.md must document minor version changes'
)
expect(
  contributing.includes('**Major**: removing or renaming public exports'),
  'CONTRIBUTING.md must document major version changes'
)
expect(
  contributing.includes('Call out any breaking change explicitly in the PR and `CHANGELOG.md`'),
  'CONTRIBUTING.md must require explicit breaking change disclosure'
)
expect(
  contributing.includes('pnpm release:check'),
  'CONTRIBUTING.md must document the release check command'
)
expect(
  contributing.includes(`for example \`v${packageJson.version}\``),
  'CONTRIBUTING.md release tag example must match the package version'
)
expect(
  !contributing.includes('v0.2.0'),
  'CONTRIBUTING.md must not include stale release tag examples'
)

if (failures.length) {
  console.error(`Metadata check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log('Metadata check passed for package, README, and contributing docs.')

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}

function arraysEqual(actual, expected) {
  return (
    actual.length === expected.length && actual.every((value, index) => value === expected[index])
  )
}

function hasIgnoreEntry(content, expected) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .includes(expected)
}

function hasLine(content, expected) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .includes(expected)
}

function normalizeWhitespace(content) {
  return content.replace(/\s+/g, ' ').trim()
}

function hasEnvAssignment(content, name) {
  return new RegExp(`^${escapeRegex(name)}=`, 'm').test(content)
}

function findViteEnvNamesInExamples() {
  const names = new Set()

  for (const file of collectExampleFiles('examples')) {
    const content = readFileSync(file, 'utf8')
    for (const match of content.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) {
      names.add(match[1])
    }
  }

  return [...names].sort((a, b) => a.localeCompare(b))
}

function collectExampleFiles(dir) {
  const files = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectExampleFiles(path))
    } else if (/\.(?:ts|vue)$/.test(entry.name)) {
      files.push(path)
    }
  }

  return files
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
