import { existsSync, readFileSync } from 'node:fs'

const distEntry = new URL('../dist/index.mjs', import.meta.url)

if (!existsSync(distEntry)) {
  throw new Error(
    'dist/index.mjs is missing. Run `pnpm build` before `pnpm competitive-benchmark:check`.'
  )
}

const files = {
  competitive: readFileSync('docs/guide/competitive-benchmark.md', 'utf8'),
  zhCompetitive: readFileSync('docs/zh/guide/competitive-benchmark.md', 'utf8'),
  choosing: readFileSync('docs/guide/choosing.md', 'utf8'),
  zhChoosing: readFileSync('docs/zh/guide/choosing.md', 'utf8'),
  threadedChat: readFileSync('examples/threaded-chat/App.vue', 'utf8'),
  routeTemplates: readFileSync('docs/guide/agent-route-templates.md', 'utf8'),
  roadmap: readFileSync('ROADMAP.md', 'utf8')
}

const enDateMatch = files.competitive.match(
  /P0 baseline \(snapshot: ([0-9]{4}-[0-9]{2}-[0-9]{2})\)/
)
const zhDateMatch = files.zhCompetitive.match(/P0 基线（快照：([0-9]{4}-[0-9]{2}-[0-9]{2})）/)
expect(Boolean(enDateMatch), 'English benchmark should include snapshot date')
expect(Boolean(zhDateMatch), 'Chinese benchmark should include snapshot date')
expect(enDateMatch[1] === zhDateMatch[1], 'English and Chinese snapshot dates should match')

for (const snippet of [
  '# Competitive benchmark v2',
  '## Current checkpoint against direct alternatives',
  '## Outcome benchmark',
  'Feature coverage is supporting evidence, not the score.',
  '| DX',
  '| Durability',
  '| Agent UX',
  '| Observability',
  '| Adoption',
  'within 10 minutes',
  'within 30 minutes',
  'explicit cancel stops the active upstream run once',
  'state snapshot/delta',
  'One existing business application',
  '## Delivery gates',
  'COMP-DX',
  'COMP-DURABLE',
  'COMP-AGENT',
  'COMP-OBS',
  'COMP-ADOPTION',
  'pnpm durable-chat:check',
  'pnpm agent-protocol:check',
  'pnpm completion-object:check',
  'pnpm image:check',
  '## P0 baseline (snapshot:',
  'it is no longer',
  'Vue-native composition API',
  'Streaming states + Abort/Retry',
  'Proxy-first production path',
  'Tool calling + approval workflows',
  'Thread side panel primitives',
  'Agent runtime adapters',
  'Headless agent runtime discovery & capabilities',
  'Message/task suggestion starters',
  'Full copilot shell / built-in widgets',
  '⚪ (starter only; shell stays app-owned)',
  'Deliberate non-goal: full copilot shell widgets stay in the app',
  '`threaded-chat` is a copyable starter, not a packaged shell.'
]) {
  expect(
    files.competitive.includes(snippet),
    `English competitive benchmark should include: ${snippet}`
  )
}

for (const snippet of [
  '# 竞品基准 v2',
  '## 结果基准',
  '功能覆盖只作为支撑证据，不再作为分数。',
  '| 开发体验',
  '| 耐久性',
  '| Agent UX',
  '| 可观测性',
  '| 采用',
  '10 分钟内',
  '30 分钟内',
  '显式取消只终止一次当前上游 run',
  'state snapshot/delta',
  '一个现有业务应用',
  '## 交付门禁',
  'COMP-DX',
  'COMP-DURABLE',
  'COMP-AGENT',
  'COMP-OBS',
  'COMP-ADOPTION',
  'pnpm durable-chat:check',
  'pnpm agent-protocol:check',
  'pnpm completion-object:check',
  'pnpm image:check',
  '## P0 基线（快照：',
  '不再作为竞品分数',
  'Vue 优先的组合式 API',
  '流式状态 + 终止/重试',
  '面向生产的 proxy 默认路径',
  '工具调用 + 审批流程',
  '侧边栏 Thread 级能力',
  'Agent 适配能力',
  '能力发现与运行时上下文',
  '任务建议 / 快速提示词起点',
  '开箱 copilot 外壳/内置组件',
  '⚪（只提供 starter，shell 由应用拥有）',
  '刻意不做：完整 copilot shell 组件属于应用层或 CopilotKit 这类产品层',
  '`threaded-chat` 是可复制 starter，不是内置 shell。'
]) {
  expect(
    files.zhCompetitive.includes(snippet),
    `Chinese competitive benchmark should include: ${snippet}`
  )
}

for (const snippet of [
  '### 1.1 - Durable chat contract',
  '### 1.2 - Headless agent protocol projection',
  '### 1.3 - Adoption proof',
  'durable-chat:check',
  'agent-protocol:check',
  'existing business application',
  '10 and 30 minutes respectively'
]) {
  expect(files.roadmap.includes(snippet), `Post-1.0 roadmap should include: ${snippet}`)
}

for (const snippet of [
  'In-scope direct benchmark score:',
  '范围内直对标基准分：',
  '### 0.15.x to 1.0 readiness'
]) {
  const content = snippet.startsWith('范围内')
    ? files.zhCompetitive
    : `${files.competitive}\n${files.roadmap}`
  expect(
    !content.includes(snippet),
    `Benchmark v2 must not restore stale scoring or roadmap text: ${snippet}`
  )
}

for (const snippet of ['✅ (threaded-chat starter shipped)', '✅ Full copilot shell starter']) {
  expect(
    !files.competitive.includes(snippet),
    `English competitive benchmark must not overstate shell ownership: ${snippet}`
  )
}

for (const snippet of ['✅（threaded-chat 示例起步）', '全量 copilot 外壳特性']) {
  expect(
    !files.zhCompetitive.includes(snippet),
    `Chinese competitive benchmark must not overstate shell ownership: ${snippet}`
  )
}

for (const snippet of ['Direct alternative', 'AI SDK UI', 'CopilotKit', 'LangChain.js', 'VueUse']) {
  expect(files.choosing.includes(snippet), `English choosing map should include: ${snippet}`)
}

for (const snippet of [
  '直接替代',
  'AI SDK UI',
  '产品相邻标杆',
  '后端互补层，不是 UI 竞品',
  'Vue DX 标杆，不是 AI 竞品',
  'CopilotKit',
  'LangChain.js',
  'VueUse'
]) {
  expect(files.zhChoosing.includes(snippet), `Chinese choosing map should include: ${snippet}`)
}

for (const snippet of [
  'useChatThreads',
  'threadId',
  'activeThread',
  'threads.setActiveThread',
  'thread.id',
  'threaded-chat'
]) {
  expect(
    files.threadedChat.includes(snippet),
    `Threaded chat example should remain runnable starter surface with: ${snippet}`
  )
}

for (const snippet of [
  '## Next.js App Router',
  '## Nuxt server route',
  'export async function POST(request: Request)'
]) {
  expect(
    files.routeTemplates.includes(snippet),
    `Agent route templates should keep executable fixture text: ${snippet}`
  )
}

const {
  inspectRequestTrace,
  useChat,
  useCompletion,
  useEmbedding,
  useObject,
  usePromptSuggestions,
  useChatThreads,
  useAgentRun,
  useAgentCapabilities,
  proxyProvider,
  openai
} = await import(distEntry.href)

expect(typeof inspectRequestTrace === 'function', 'inspectRequestTrace must be exported')
expect(typeof useChat === 'function', 'useChat must be exported')
expect(typeof useCompletion === 'function', 'useCompletion must be exported')
expect(typeof useEmbedding === 'function', 'useEmbedding must be exported')
expect(typeof useObject === 'function', 'useObject must be exported')
expect(typeof usePromptSuggestions === 'function', 'usePromptSuggestions must be exported')
expect(typeof useChatThreads === 'function', 'useChatThreads must be exported')
expect(typeof useAgentRun === 'function', 'useAgentRun must be exported')
expect(typeof useAgentCapabilities === 'function', 'useAgentCapabilities must be exported')
expect(typeof proxyProvider === 'function', 'proxyProvider must be exported')

const smokeProvider = openai({
  apiKey: 'smoke-key',
  defaultModel: 'gpt-4o-mini',
  baseURL: 'https://api.openai.com/v1'
})

const chat = useChat({ provider: smokeProvider })
expect(chat.status.value === 'ready', 'useChat should initialize in ready state')
expect(typeof chat.stop === 'function', 'useChat should expose stop() for abort flow')
expect(
  typeof chat.addToolOutput === 'function',
  'useChat should expose tool approval input/output path'
)
const chatTrace = chat.inspect()
expect(
  chatTrace.providerTrace && typeof chatTrace.providerTrace === 'object',
  'chat inspect should include providerTrace'
)

const completion = useCompletion({
  provider: smokeProvider,
  defaultRequest: { model: 'gpt-4o-mini', api: '/api/completion' }
})
expect(completion.status.value === 'ready', 'useCompletion should initialize in ready state')
expect(
  typeof completion.complete === 'function',
  'useCompletion should expose completion submitter'
)
expect(typeof completion.stop === 'function', 'useCompletion should expose stop()')
expect(typeof completion.inspect() === 'object', 'useCompletion should expose inspect() snapshot')

const embedding = useEmbedding({ provider: smokeProvider })
expect(Array.isArray(embedding.embeddings.value), 'useEmbedding should expose embeddings array')
expect(typeof embedding.embed === 'function', 'useEmbedding should expose embed() submitter')

const object = useObject({
  provider: smokeProvider,
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'high'] }
    },
    required: ['title', 'priority'],
    additionalProperties: false
  },
  schemaName: 'benchmark-task'
})
expect(typeof object.submit === 'function', 'useObject should expose submit()')
expect(typeof object.text === 'object', 'useObject should expose parsed text refs')

const threads = useChatThreads()
expect(typeof threads.createThread === 'function', 'useChatThreads should expose thread creation')
expect(
  typeof threads.setActiveThread === 'function',
  'useChatThreads should expose thread activation'
)

const capabilities = useAgentCapabilities({ initialCapabilities: { tools: true, streaming: true } })
expect(
  capabilities.supports && typeof capabilities.supports === 'object',
  'useAgentCapabilities should expose supports capabilities'
)
expect(
  typeof capabilities.hasCapabilities === 'object',
  'useAgentCapabilities should expose readiness flag'
)
expect(capabilities.hasCapabilities.value === true, 'initial capabilities should register as ready')

const suggestions = usePromptSuggestions({ max: 4 })
expect(
  Array.isArray(suggestions.visibleSuggestions.value),
  'usePromptSuggestions should expose visible suggestions'
)

const trace = inspectRequestTrace({
  status: 'ready',
  error: null,
  lastRequest: {
    request: { method: 'POST', api: '/api/chat', id: 'benchmark-smoke', model: 'gpt-4o-mini' },
    providerId: 'openai-compatible',
    attempt: 1
  },
  lastResponse: {
    providerId: 'openai-compatible',
    status: 'ready',
    timestamp: '2026-07-03T09:00:00.000Z',
    usage: {
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3
    }
  },
  retryable: true,
  timestamp: '2026-07-03T09:00:00.000Z',
  now: '2026-07-03T09:00:00.000Z'
})

expect(typeof trace.providerId === 'string', 'inspectRequestTrace should return provider id')
expect(
  trace.curl === null || typeof trace.curl === 'string',
  'inspectRequestTrace should return a safe curl string or null'
)

console.log('Competitive benchmark readiness check passed.')

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
