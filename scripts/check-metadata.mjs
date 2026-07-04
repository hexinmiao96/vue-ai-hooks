import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  extractExportSources,
  resolveExportDeclarationFile,
  resolveExportSourceFile
} from './lib/entry-exports.mjs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8'))
const buildTsconfig = JSON.parse(readFileSync('tsconfig.build.json', 'utf8'))
const lockfile = readFileSync('pnpm-lock.yaml', 'utf8')
const eslintConfig = readFileSync('eslint.config.js', 'utf8')
const viteConfig = readFileSync('vite.config.ts', 'utf8')
const vitestConfig = readFileSync('vitest.config.ts', 'utf8')
const sizeCheck = readFileSync('scripts/check-size.mjs', 'utf8')
const secretsCheck = readFileSync('scripts/check-secrets.mjs', 'utf8')
const sourceHygieneCheck = readFileSync('scripts/check-source-hygiene.mjs', 'utf8')
const testHygieneCheck = readFileSync('scripts/check-test-hygiene.mjs', 'utf8')
const releaseCheck = readFileSync('scripts/release-check.mjs', 'utf8')
const productionReadinessLocal = readFileSync('scripts/production-readiness-local.mjs', 'utf8')
const vitepressConfig = readFileSync('docs/.vitepress/config.ts', 'utf8')
const gitignore = readFileSync('.gitignore', 'utf8')
const prettierignore = readFileSync('.prettierignore', 'utf8')
const prettierConfig = JSON.parse(readFileSync('.prettierrc', 'utf8'))
const editorConfig = readFileSync('.editorconfig', 'utf8')
const license = readFileSync('LICENSE', 'utf8')
const envExample = readFileSync('.env.example', 'utf8')
const readme = readFileSync('README.md', 'utf8')
const zhReadme = readFileSync('README.zh-CN.md', 'utf8')
const indexSource = readFileSync('src/index.ts', 'utf8')
const reactSource = readFileSync('src/react.ts', 'utf8')
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
const prettierFileGlob = '**/*.{ts,tsx,mts,cts,vue,js,jsx,mjs,cjs,html,json,md,yml,yaml}'
const sizeBudgets = readSizeBudgets(sizeCheck)
const publicExportSources = unique([
  ...extractExportSources(indexSource),
  ...extractExportSources(reactSource)
])
const requiredPublicPackageFiles = unique([
  'src/index.ts',
  'src/react.ts',
  'dist/index.d.ts',
  'dist/react.d.ts',
  ...publicExportSources.map(resolveExportSourceFile),
  ...publicExportSources.map(resolveExportDeclarationFile)
])
const checkScriptNames = extractPnpmScriptNames(packageJson.scripts?.check ?? '')
const productionReadinessCheckCoverage = {
  'format:check': "run('Format check'",
  'secrets:check': "run('Secrets scan'",
  'source:hygiene': "run('Source hygiene'",
  lint: "run('Lint'",
  'typecheck:all': "run('Typecheck'",
  'test:hygiene': "run('Test hygiene'",
  'test:coverage': "run('Test coverage'",
  build: "run('Build package'",
  'dist:check': "run('Dist check'",
  'size:check': "run('Size check'",
  'pack:check': "run('Pack check'",
  'install:check': "run('Install check'",
  'changelog:check': "run('Changelog check'",
  'metadata:check': "run('Metadata check'",
  'community:check': "run('Community health check'",
  'workflows:check': "run('Workflow check'",
  'api:check': "run('API docs check'",
  'docs:ux:check': "run('Docs UX check'",
  'proxy:check': "run('Proxy example check'",
  'image:check': "run('Image demo check'",
  'demo-ux:check': "run('Demo UX check'",
  'completion-object:check': "run('Completion and object demo check'",
  'react-video:check': "run('React video demo check'",
  'threaded-chat:check': "run('Threaded chat demo check'",
  'ui-message-stream:check': "run('UI message stream demo check'",
  'agent-run:check': "run('Agent run demo check'",
  'tool-approval:check': "run('Tool approval demo check'",
  'agent-bridge:check': "run('Agent bridge demo check'",
  'agent-route-templates:check': "run('Agent route templates check'",
  'competitive-benchmark:check': "run('Competitive benchmark check'",
  'links:check': "run('Markdown link check'",
  'examples:build': 'const exampleBuilds = [',
  'docs:build': "run('Build docs'"
}
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
  '.env.*',
  '!.env.example',
  '!**/.env.example',
  '.env.local',
  '.env.*.local',
  '*.cer',
  '*.crt',
  '*.db',
  '*.db3',
  '*.der',
  '*.dump',
  '*.jks',
  '*.key',
  '*.keystore',
  '*.p12',
  '*.pfx',
  '*.pem',
  '*.sql',
  '*.sqlite',
  '*.sqlite3',
  '*.7z',
  '*.rar',
  '*.tar',
  '*.tar.gz',
  '*.tgz',
  '*.zip'
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
  "files: ['**/*.{js,jsx,mjs,cjs}']",
  "files: ['**/*.{ts,tsx,mts,cts}']",
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
  "sourcemap: 'hidden'",
  "index: resolve(__dirname, 'src/index.ts')",
  "react: resolve(__dirname, 'src/react.ts')",
  "name: 'VueAiHooks'",
  "fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`",
  "formats: ['es', 'cjs']",
  "external: ['vue', 'react']",
  "react: 'React'",
  "vue: 'Vue'"
]
const requiredPackageFiles = [
  'README.md',
  'README.zh-CN.md',
  'CHANGELOG.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE',
  'dist/index.mjs',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/react.mjs',
  'dist/react.cjs',
  'dist/react.d.ts',
  'dist/index.d.ts.map',
  'dist/react.d.ts.map',
  'dist/**/*.d.ts.map',
  'dist/*.js',
  'dist/*.cjs',
  'dist/*.mjs',
  'src/**/*.ts',
  'src/index.ts',
  'src/react.ts',
  'src/react/useChat.ts',
  'src/react/useCompletion.ts',
  'src/react/useObject.ts',
  'src/utils/agentEvents.ts',
  'src/composables/useAgentCapabilities.ts',
  'src/composables/useAgentContext.ts',
  'src/composables/useAgentRun.ts',
  'src/composables/useChatThreads.ts',
  'src/composables/usePromptSuggestions.ts'
]
const forbiddenPackageFiles = [
  'dist/index.mjs.map',
  'dist/index.cjs.map',
  'dist/react.mjs.map',
  'dist/react.cjs.map'
]
const requiredPackageKeywords = [
  'vue',
  'react',
  'react-hooks',
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
  'embedding',
  'image',
  'video',
  'rerank',
  'speech',
  'transcription'
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
for (const file of requiredPackageFiles) {
  expect(packageJson.files?.includes(file), `package files whitelist must include ${file}`)
}
for (const file of requiredPublicPackageFiles) {
  expect(isPackageFileWhitelisted(file), `package files whitelist must publish ${file}`)
}
for (const file of forbiddenPackageFiles) {
  expect(
    !packageJson.files?.includes(file),
    `forbidden package map should not be whitelisted: ${file}`
  )
}
expect(
  packageJson.files?.length === new Set(packageJson.files ?? []).size,
  'package files whitelist must not contain duplicates'
)
const concreteDistChunkFiles = (packageJson.files ?? []).filter((file) =>
  /^dist\/[^/*]+-[A-Za-z0-9_-]+\.(?:js|cjs|mjs)(?:\.map)?$/.test(file)
)
expect(
  concreteDistChunkFiles.length === 0,
  `package files whitelist must use dist runtime globs instead of hashed chunk filenames: ${concreteDistChunkFiles.join(', ')}`
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
  Object.keys(packageJson.peerDependencies ?? {}).length === 2,
  'package must keep peer dependencies limited to Vue and optional React'
)
expect(
  packageJson.peerDependencies?.vue === '^3.4.0',
  'Vue peer dependency must stay documented as ^3.4.0'
)
expect(
  packageJson.peerDependencies?.react === '^18.2.0 || ^19.0.0',
  'React peer dependency must support React 18 and 19'
)
expect(
  packageJson.peerDependenciesMeta?.react?.optional === true,
  'React peer dependency must stay optional for Vue-only consumers'
)
expect(packageJson.engines?.node === '>=18.18.0', 'Node engine floor must stay >=18.18.0')
expect(
  packageJson.packageManager === 'pnpm@11.7.0',
  'packageManager must stay pinned to pnpm 11.7.0'
)
expect(
  lockfile.startsWith("lockfileVersion: '6.0'") || lockfile.startsWith("lockfileVersion: '9.0'"),
  'pnpm-lock.yaml must stay a supported pnpm lockfile format'
)
expect(!existsSync('package-lock.json'), 'package-lock.json must not be committed')
expect(!existsSync('yarn.lock'), 'yarn.lock must not be committed')
expect(!existsSync('bun.lockb'), 'bun.lockb must not be committed')
const hasTopLevelViteOverride = packageJson.overrides?.vite === '^6.4.3'
const hasLegacyPnpmViteOverride = packageJson.pnpm?.overrides?.vite === '^6.4.3'
const hasPinnedViteOverride = hasTopLevelViteOverride || hasLegacyPnpmViteOverride
expect(hasPinnedViteOverride, 'Vite override must stay pinned to ^6.4.3')
if (lockfile.startsWith("lockfileVersion: '6.0'")) {
  expect(
    lockfile.includes('overrides:\n  vite: ^6.4.3'),
    'pnpm-lock.yaml must include Vite override'
  )
}
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
  tsconfig.compilerOptions?.paths?.['vue-ai-hooks/react']?.[0] === 'src/react.ts',
  'tsconfig.json must map vue-ai-hooks/react to src/react.ts for local React consumers'
)
expect(
  tsconfig.include?.includes('tests/**/*.ts') &&
    tsconfig.include?.includes('tests/**/*.tsx') &&
    tsconfig.include?.includes('examples/**/*.tsx') &&
    tsconfig.include?.includes('examples/**/*.vue') &&
    tsconfig.include?.includes('docs/.vitepress/config.ts'),
  'tsconfig.json must type-check TS/TSX tests, TSX examples, Vue examples, and docs config'
)
expect(
  vitestConfig.includes("'tests/**/*.test.ts'") && vitestConfig.includes("'tests/**/*.test.tsx'"),
  'vitest.config.ts must run both TS and TSX test files'
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
  packageJson.scripts?.format === `prettier --write "${prettierFileGlob}" ".prettierrc"`,
  'format must cover source, module-format, docs, metadata, and workflow files'
)
expect(
  packageJson.scripts?.['format:check']?.includes('prettier --check'),
  'format:check must run Prettier in check mode'
)
expect(
  packageJson.scripts?.['format:check'] === `prettier --check "${prettierFileGlob}" ".prettierrc"`,
  'format:check must cover source, module-format, docs, metadata, and workflow files'
)
expect(
  packageJson.scripts?.check?.startsWith('pnpm format:check &&'),
  'pnpm check must start with format:check'
)
expect(
  packageJson.scripts?.lint?.includes('"scripts/**/*.{js,jsx,mjs,cjs}"'),
  'lint must cover repository quality gate scripts'
)
for (const lintGlob of [
  '"src/**/*.{ts,tsx,mts,cts,vue}"',
  '"tests/**/*.{ts,tsx,mts,cts}"',
  '"examples/**/*.{ts,tsx,mts,cts,vue}"',
  '"docs/.vitepress/**/*.{ts,vue}"'
]) {
  expect(packageJson.scripts?.lint?.includes(lintGlob), `lint must include ${lintGlob}`)
}
for (const configFile of ['"eslint.config.js"', '"vite.config.ts"', '"vitest.config.ts"']) {
  expect(
    packageJson.scripts?.lint?.includes(configFile),
    `lint must cover root config file ${configFile}`
  )
}
expect(
  eslintConfig.includes("files: ['**/*.{ts,tsx,mts,cts}']") &&
    eslintConfig.includes("files: ['**/*.{ts,tsx,mts,cts,vue}']"),
  'ESLint config must cover TS, TSX, MTS, and CTS files'
)
expect(
  eslintConfig.includes("files: ['**/*.{js,jsx,mjs,cjs}']") &&
    eslintConfig.includes('globals: sharedGlobals'),
  'ESLint config must define globals for JS, JSX, MJS, and CJS files'
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
  ["'.tsx'", "'.jsx'", "'.mts'", "'.cts'", "'.cjs'", "'.html'"].every((extension) =>
    secretsCheck.includes(extension)
  ),
  'secrets:check must scan TSX, JSX, MTS, CTS, CJS, and HTML files'
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
  ['tsx', 'jsx', 'mts', 'cts', 'cjs', 'html'].every((extension) =>
    sourceHygieneCheck.includes(extension)
  ),
  'source:hygiene must scan TSX, JSX, MTS, CTS, CJS, and HTML files'
)
expect(
  packageJson.scripts?.check?.includes('pnpm source:hygiene'),
  'pnpm check must include source:hygiene'
)
expect(packageJson.scripts?.lint?.includes('--max-warnings 0'), 'pnpm lint must fail on warnings')
expect(
  packageJson.scripts?.['test:hygiene'] === 'node scripts/check-test-hygiene.mjs',
  'test:hygiene must scan for focused, skipped, todo, or expected-failing tests'
)
expect(
  testHygieneCheck.includes('fails') && testHygieneCheck.includes('expected-failing'),
  'test:hygiene must reject Vitest expected-failing test markers'
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
  packageJson.scripts?.['release:cadence'] === 'node scripts/check-release-cadence.mjs',
  'release:cadence must verify the daily npm release limit'
)
expect(
  packageJson.scripts?.['release:status'] === 'node scripts/release-status.mjs',
  'release:status must report npm registry state and the release window'
)
expect(
  packageJson.scripts?.['release:check'] === 'node scripts/release-check.mjs',
  'release:check must delegate to the strict release-check script'
)
for (const snippet of [
  "RELEASE_CADENCE_REQUIRE_UNPUBLISHED: 'true'",
  "run('Security audit', bin('pnpm'), ['security:audit'])",
  "run('Full local gate', bin('pnpm'), ['check'])",
  'process.exit(error.status)'
]) {
  expect(releaseCheck.includes(snippet), `release-check script must include: ${snippet}`)
}
expect(
  releaseCheck.includes("process.platform === 'win32'"),
  'release-check script must resolve local binaries cross-platform'
)
expect(
  productionReadinessLocal.includes('process.exit(error.status)'),
  'production-readiness local script must preserve child command exit statuses'
)
expect(
  productionReadinessLocal.includes("process.platform === 'win32'"),
  'production-readiness local script must resolve local binaries cross-platform'
)
expect(
  packageJson.scripts?.['production:readiness'] === 'node scripts/production-readiness-local.mjs',
  'production:readiness must delegate to the single production-readiness runner'
)
expect(
  packageJson.scripts?.['production:readiness:local'] ===
    packageJson.scripts?.['production:readiness'],
  'production:readiness and production:readiness:local must use the same runner'
)
expect(
  productionReadinessLocal.includes(`'${prettierFileGlob}'`),
  'production-readiness format check must use the full repository formatting glob'
)
for (const lintTarget of [
  'src/**/*.{ts,tsx,mts,cts,vue}',
  'tests/**/*.{ts,tsx,mts,cts}',
  'examples/**/*.{ts,tsx,mts,cts,vue}',
  'scripts/**/*.{js,jsx,mjs,cjs}',
  'docs/.vitepress/**/*.{ts,vue}',
  'eslint.config.js',
  'vite.config.ts',
  'vitest.config.ts'
]) {
  expect(
    productionReadinessLocal.includes(`'${lintTarget}'`),
    `production-readiness lint check must include ${lintTarget}`
  )
}
for (const snippet of [
  "run('Release cadence check', bin('node'), ['./scripts/check-release-cadence.mjs'])",
  "run('Release status', bin('node'), ['./scripts/release-status.mjs'])",
  "run('Build docs', bin('vitepress'), ['build', 'docs'])"
]) {
  expect(
    productionReadinessLocal.includes(snippet),
    `production-readiness runner must include: ${snippet}`
  )
}
expect(
  arraysEqual(Object.keys(productionReadinessCheckCoverage), checkScriptNames),
  'production-readiness runner coverage map must match the pnpm check command order'
)
for (const [scriptName, snippet] of Object.entries(productionReadinessCheckCoverage)) {
  expect(
    productionReadinessLocal.includes(snippet),
    `production-readiness runner must cover pnpm ${scriptName}`
  )
}
expect(
  arraysEqual(
    readExampleBuildDirsFromRunner(productionReadinessLocal),
    readExampleBuildDirsFromScript(packageJson.scripts?.['examples:build'] ?? '')
  ),
  'production-readiness runner example build list must match examples:build'
)
expect(
  contributing.includes('pnpm production:readiness'),
  'CONTRIBUTING.md must document the production readiness command'
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
expect(contributing.includes('pnpm 11.7.0'), 'CONTRIBUTING.md must document pnpm 11.7.0')
expect(
  contributing.includes('pnpm format:check'),
  'CONTRIBUTING.md must document the format check command'
)
expect(
  contributing.includes('lint src, tests, examples, scripts, docs theme, and root config files') &&
    contributing.includes('TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML'),
  'CONTRIBUTING.md must describe lint command coverage accurately'
)
expect(
  contributing.includes('TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML'),
  'CONTRIBUTING.md must describe broad source and module-format command coverage'
)
expect(
  contributing.includes('pnpm secrets:check'),
  'CONTRIBUTING.md must document the secret check command'
)
expect(
  contributing.includes('provider keys, auth tokens, and sensitive env assignments'),
  'CONTRIBUTING.md must describe the secret check coverage accurately'
)
expect(
  contributing.includes('Git-tracked and unignored candidate files'),
  'CONTRIBUTING.md must describe the secret check file scope accurately'
)
expect(
  contributing.includes('TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML/Markdown/env candidate files'),
  'CONTRIBUTING.md must describe the secret check source file coverage accurately'
)
expect(
  contributing.includes('pnpm source:hygiene'),
  'CONTRIBUTING.md must document the source hygiene check command'
)
expect(
  contributing.includes('TS/TSX/MTS/CTS/Vue/JS/JSX/MJS/CJS/HTML source console output'),
  'CONTRIBUTING.md must describe source:hygiene browser source coverage accurately'
)
expect(
  contributing.includes('broad suppression comments'),
  'CONTRIBUTING.md must document that source:hygiene rejects broad suppression comments'
)
expect(
  contributing.includes('trailing whitespace'),
  'CONTRIBUTING.md must document that source:hygiene rejects trailing whitespace'
)
expect(
  contributing.includes('root metadata/workflows'),
  'CONTRIBUTING.md must document that source:hygiene covers root metadata and workflows'
)
expect(
  contributing.includes('docs theme source'),
  'CONTRIBUTING.md must document that source:hygiene covers docs theme source'
)
expect(
  sourceHygieneCheck.includes(
    "const ignoredDirectories = new Set(['coverage', 'dist', 'node_modules', 'output'])"
  ) &&
    sourceHygieneCheck.includes(
      "const ignoredDirectoryPaths = new Set(['docs/.vitepress/cache', 'docs/.vitepress/dist'])"
    ),
  'source:hygiene must scan VitePress source while ignoring generated VitePress output'
)
expect(
  sourceHygieneCheck.includes("file.startsWith('docs/.vitepress/')"),
  'source:hygiene must reject broad suppressions in VitePress source'
)
expect(
  sourceHygieneCheck.includes('trailingWhitespacePattern'),
  'source:hygiene must reject trailing whitespace in scanned text files'
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
  contributing.includes('links/images, anchors, unsafe protocols, and repo-boundary escapes'),
  'CONTRIBUTING.md must describe links:check coverage accurately'
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
  arraysEqual(
    sizeBudgets.map((budget) => budget.file),
    ['dist/index.mjs', 'dist/index.cjs', 'dist/react.mjs', 'dist/react.cjs']
  ),
  'size:check must cover the root and React published bundle entries'
)
for (const budget of sizeBudgets) {
  const line = `- \`${budget.file}\`: ${formatNumber(budget.maxBytes)} bytes raw, ${formatNumber(
    budget.maxGzipBytes
  )} bytes gzip.`
  expect(contributing.includes(line), `CONTRIBUTING.md must document bundle budget: ${line}`)
}
expect(
  contributing.includes('## Versioning policy'),
  'CONTRIBUTING.md must document the versioning policy'
)
expect(
  normalizedContributing.includes('publish at most one npm version per Asia/Shanghai calendar day'),
  'CONTRIBUTING.md must document the daily release cadence'
)
expect(
  contributing.includes('pnpm release:cadence'),
  'CONTRIBUTING.md must document the release cadence command'
)
expect(
  contributing.includes('pnpm release:status'),
  'CONTRIBUTING.md must document the release status command'
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

function unique(values) {
  return [...new Set(values)]
}

function isPackageFileWhitelisted(file) {
  return (packageJson.files ?? []).some((entry) => packageFileEntryMatches(entry, file))
}

function packageFileEntryMatches(entry, file) {
  if (!entry.includes('*')) return entry === file

  return new RegExp(`^${globToRegexSource(entry)}$`).test(file)
}

function globToRegexSource(pattern) {
  return escapeRegex(pattern)
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*')
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

function readSizeBudgets(content) {
  return [
    ...content.matchAll(
      /\{\s*file: '([^']+)',\s*maxBytes: ([\d_]+),\s*maxGzipBytes: ([\d_]+)\s*\}/g
    )
  ].map((match) => ({
    file: match[1],
    maxBytes: Number(match[2].replaceAll('_', '')),
    maxGzipBytes: Number(match[3].replaceAll('_', ''))
  }))
}

function formatNumber(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function extractPnpmScriptNames(script) {
  return script
    .split('&&')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('pnpm '))
    .map((part) => part.slice('pnpm '.length).trim())
}

function readExampleBuildDirsFromScript(script) {
  return [...script.matchAll(/\bpnpm example:([^:\s]+):build\b/g)].map((match) => match[1])
}

function readExampleBuildDirsFromRunner(content) {
  const list = content.match(/const exampleBuilds = \[([\s\S]*?)\n\]/)?.[1] ?? ''

  return [...list.matchAll(/\[\s*'([^']+)'\s*,\s*'[^']+'\s*\]/g)].map((match) => match[1])
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
