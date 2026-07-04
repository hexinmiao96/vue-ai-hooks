import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractRuntimeExports } from './lib/entry-exports.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const tempRoot = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-install-'))
const viteBin = join(root, 'node_modules/vite/bin/vite.js')
const expectedRootRuntimeExports = extractRuntimeExports(
  readFileSync(join(root, 'src/index.ts'), 'utf8')
)
const expectedReactRuntimeExports = extractRuntimeExports(
  readFileSync(join(root, 'src/react.ts'), 'utf8')
)

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  })
}

try {
  const packOutput = run('npm', ['pack', '--json', '--pack-destination', tempRoot], { cwd: root })
  const [packed] = JSON.parse(packOutput)
  const tarball = join(tempRoot, packed.filename)
  const vuePeer = realpathSync(join(root, 'node_modules/vue'))
  const reactPeer = realpathSync(join(root, 'node_modules/react'))

  writeFileSync(
    join(tempRoot, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }, null, 2)
  )
  run(
    'npm',
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball, vuePeer, reactPeer],
    {
      cwd: tempRoot
    }
  )

  writeFileSync(
    join(tempRoot, 'esm-check.mjs'),
    `
import { createRequire } from 'node:module'
import * as rootEntry from 'vue-ai-hooks'
import {
  AiHooksError,
  createInspectionCurl,
  createPromptSuggestionRecipes,
  deepseek,
  openai,
  openrouter,
  proxyProvider,
  useChat
} from 'vue-ai-hooks'

const expectedRootRuntimeExports = ${JSON.stringify(expectedRootRuntimeExports)}
const expectedReactRuntimeExports = ${JSON.stringify(expectedReactRuntimeExports)}
const require = createRequire(import.meta.url)
const packageJson = require('vue-ai-hooks/package.json')

if (packageJson.name !== 'vue-ai-hooks') {
  throw new Error('ESM package.json subpath export failed')
}
if (openai({ apiKey: 'test-key' }).id !== 'openai-compatible') {
  throw new Error('ESM openai provider failed')
}
if (openrouter({ apiKey: 'test-key' }).id !== 'openrouter') {
  throw new Error('ESM openrouter provider failed')
}
if (deepseek({ apiKey: 'test-key' }).id !== 'deepseek') {
  throw new Error('ESM deepseek provider failed')
}
if (proxyProvider().id !== 'proxy') {
  throw new Error('ESM proxy provider failed')
}
if (new AiHooksError('test').name !== 'AiHooksError') {
  throw new Error('ESM AiHooksError failed')
}
if (typeof useChat !== 'function') {
  throw new Error('ESM useChat export failed')
}
if (createPromptSuggestionRecipes({ include: ['find-risks'] })[0]?.id !== 'find-risks') {
  throw new Error('ESM createPromptSuggestionRecipes export failed')
}
if (!createInspectionCurl({ api: '/api/chat' })?.includes('/api/chat')) {
  throw new Error('ESM createInspectionCurl export failed')
}
for (const name of expectedRootRuntimeExports) {
  if (!(name in rootEntry)) {
    throw new Error(\`ESM root runtime export missing: \${name}\`)
  }
}

const reactEntry = await import('vue-ai-hooks/react')
for (const name of expectedReactRuntimeExports) {
  if (!(name in reactEntry)) {
    throw new Error(\`ESM React runtime export missing: \${name}\`)
  }
}
if (typeof reactEntry.useChat !== 'function') {
  throw new Error('ESM React useChat export failed')
}
if (typeof reactEntry.useCompletion !== 'function') {
  throw new Error('ESM React useCompletion export failed')
}
if (typeof reactEntry.useObject !== 'function') {
  throw new Error('ESM React useObject export failed')
}
if (typeof reactEntry.useImage !== 'function') {
  throw new Error('ESM React useImage export failed')
}
if (typeof reactEntry.useAgentRun !== 'function') {
  throw new Error('ESM React useAgentRun export failed')
}
if (typeof reactEntry.usePromptSuggestions !== 'function') {
  throw new Error('ESM React usePromptSuggestions export failed')
}
if (typeof reactEntry.createPromptSuggestionRecipes !== 'function') {
  throw new Error('ESM React createPromptSuggestionRecipes export failed')
}
if (typeof reactEntry.useVideo !== 'function') {
  throw new Error('ESM React useVideo export failed')
}
`
  )
  run('node', ['esm-check.mjs'], { cwd: tempRoot })

  writeFileSync(
    join(tempRoot, 'cjs-check.cjs'),
    `
const rootEntry = require('vue-ai-hooks')
const {
  AiHooksError,
  anthropic,
  createInspectionCurl,
  createPromptSuggestionRecipes,
  openaiCompatible,
  useCompletion
} = rootEntry
const expectedRootRuntimeExports = ${JSON.stringify(expectedRootRuntimeExports)}
const expectedReactRuntimeExports = ${JSON.stringify(expectedReactRuntimeExports)}
const packageJson = require('vue-ai-hooks/package.json')

if (packageJson.name !== 'vue-ai-hooks') {
  throw new Error('CJS package.json subpath export failed')
}
if (openaiCompatible({ apiKey: 'test-key', baseURL: 'https://example.test/v1' }).id !== 'openai-compatible') {
  throw new Error('CJS openaiCompatible provider failed')
}
if (anthropic({ apiKey: 'test-key' }).id !== 'anthropic') {
  throw new Error('CJS anthropic provider failed')
}
if (new AiHooksError('test').name !== 'AiHooksError') {
  throw new Error('CJS AiHooksError failed')
}
if (typeof useCompletion !== 'function') {
  throw new Error('CJS useCompletion export failed')
}
if (createPromptSuggestionRecipes({ include: ['find-risks'] })[0]?.id !== 'find-risks') {
  throw new Error('CJS createPromptSuggestionRecipes export failed')
}
if (!createInspectionCurl({ api: '/api/chat' })?.includes('/api/chat')) {
  throw new Error('CJS createInspectionCurl export failed')
}
for (const name of expectedRootRuntimeExports) {
  if (!(name in rootEntry)) {
    throw new Error(\`CJS root runtime export missing: \${name}\`)
  }
}

const reactEntry = require('vue-ai-hooks/react')
for (const name of expectedReactRuntimeExports) {
  if (!(name in reactEntry)) {
    throw new Error(\`CJS React runtime export missing: \${name}\`)
  }
}
if (typeof reactEntry.useChat !== 'function') {
  throw new Error('CJS React useChat export failed')
}
if (typeof reactEntry.useCompletion !== 'function') {
  throw new Error('CJS React useCompletion export failed')
}
if (typeof reactEntry.useObject !== 'function') {
  throw new Error('CJS React useObject export failed')
}
if (typeof reactEntry.useImage !== 'function') {
  throw new Error('CJS React useImage export failed')
}
if (typeof reactEntry.useAgentRun !== 'function') {
  throw new Error('CJS React useAgentRun export failed')
}
if (typeof reactEntry.usePromptSuggestions !== 'function') {
  throw new Error('CJS React usePromptSuggestions export failed')
}
if (typeof reactEntry.createPromptSuggestionRecipes !== 'function') {
  throw new Error('CJS React createPromptSuggestionRecipes export failed')
}
if (typeof reactEntry.useVideo !== 'function') {
  throw new Error('CJS React useVideo export failed')
}
`
  )
  run('node', ['cjs-check.cjs'], { cwd: tempRoot })

  writeFileSync(
    join(tempRoot, 'types-check.mts'),
    `
import { createInspectionCurl, createPromptSuggestionRecipes, useChat, openaiCompatible } from 'vue-ai-hooks'
import type { ChatProvider, InspectionTimelineEvent, Message, PromptSuggestionInput, UseChatReturn } from 'vue-ai-hooks'
import {
  createPromptSuggestionRecipes as createReactPromptSuggestionRecipes,
  useAgentRun as useReactAgentRun,
  useChat as useReactChat,
  useCompletion as useReactCompletion,
  useImage as useReactImage,
  useObject as useReactObject,
  usePromptSuggestions as useReactPromptSuggestions,
  useVideo as useReactVideo
} from 'vue-ai-hooks/react'
import type {
  UseReactAgentRunReturn,
  UseReactChatReturn,
  UseReactCompletionReturn,
  UseReactImageReturn,
  UseReactObjectReturn,
  UseReactPromptSuggestionsReturn,
  UseReactVideoReturn
} from 'vue-ai-hooks/react'

const provider: ChatProvider = openaiCompatible({
  apiKey: 'test-key',
  baseURL: 'https://example.test/v1'
})
const initialMessages: Message[] = [{ id: 'msg_1', role: 'user', content: 'hello' }]
const chat: UseChatReturn = useChat({ provider, initialMessages })
const reactChat: UseReactChatReturn = useReactChat({ provider, initialMessages })
const reactCompletion: UseReactCompletionReturn = useReactCompletion({ provider })
const reactObject: UseReactObjectReturn<{ answer: string }> = useReactObject({
  provider,
  schema: { type: 'object', properties: { answer: { type: 'string' } } }
})
const reactImage: UseReactImageReturn = useReactImage()
const reactAgentRun: UseReactAgentRunReturn<string, string> = useReactAgentRun({
  run: async function* () {}
})
const reactPromptSuggestions: UseReactPromptSuggestionsReturn = useReactPromptSuggestions({
  suggestions: ['Summarize this thread']
})
const promptRecipes: PromptSuggestionInput[] = createPromptSuggestionRecipes({
  include: ['find-risks']
})
const reactPromptRecipes: PromptSuggestionInput[] = createReactPromptSuggestionRecipes({
  include: ['write-test-plan']
})
const reactVideo: UseReactVideoReturn = useReactVideo()

chat.setMessages(initialMessages)
const timelineEvent: InspectionTimelineEvent = {
  kind: 'request',
  timestamp: '2026-07-01T00:00:00.000Z'
}
const curl: string | null = createInspectionCurl({ api: '/api/chat' })
void timelineEvent
void curl
void promptRecipes
void reactPromptRecipes
reactChat.setMessages(initialMessages)
reactChat.setInput('hello from react')
reactCompletion.setInput('complete from react')
reactObject.setInput('object from react')
reactImage.setInput('image from react')
reactAgentRun.stop()
reactPromptSuggestions.selectSuggestion('suggestion-1')
reactVideo.setInput('video from react')
`
  )
  run(
    'node',
    [
      join(root, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
      '--strict',
      '--target',
      'ES2022',
      '--module',
      'NodeNext',
      '--moduleResolution',
      'NodeNext',
      '--skipLibCheck',
      'types-check.mts'
    ],
    { cwd: tempRoot }
  )

  mkdirSync(join(tempRoot, 'src'), { recursive: true })
  writeFileSync(
    join(tempRoot, 'index.html'),
    '<div id="app"></div><script type="module" src="/src/main.ts"></script>\n'
  )
  writeFileSync(
    join(tempRoot, 'src/main.ts'),
    `
import { ref } from 'vue'
import { openai, useChat, type Message } from 'vue-ai-hooks'

const messages = ref<Message[]>([{ id: '1', role: 'user', content: 'hello' }])
const provider = openai({ apiKey: 'test-key' })
const chat = useChat({ provider, initialMessages: messages.value })

if (typeof chat.append !== 'function') {
  throw new Error('Vite consumer useChat export failed')
}

document.querySelector('#app')!.textContent = provider.id
`
  )
  run('node', [viteBin, 'build', '--outDir', 'dist-vite', '--emptyOutDir'], { cwd: tempRoot })

  console.log('Install check passed for packed metadata, ESM, CJS, TypeScript, and Vite consumers.')
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
