import { readFileSync } from 'node:fs'

const files = {
  config: readFileSync('docs/.vitepress/config.ts', 'utf8'),
  home: readFileSync('docs/index.md', 'utf8'),
  zhHome: readFileSync('docs/zh/index.md', 'utf8'),
  choosing: readFileSync('docs/guide/choosing.md', 'utf8'),
  zhChoosing: readFileSync('docs/zh/guide/choosing.md', 'utf8'),
  competitiveBenchmark: readFileSync('docs/guide/competitive-benchmark.md', 'utf8'),
  zhCompetitiveBenchmark: readFileSync('docs/zh/guide/competitive-benchmark.md', 'utf8'),
  gettingStarted: readFileSync('docs/guide/getting-started.md', 'utf8'),
  zhGettingStarted: readFileSync('docs/zh/guide/getting-started.md', 'utf8'),
  taskDemos: readFileSync('docs/guide/task-demos.md', 'utf8'),
  zhTaskDemos: readFileSync('docs/zh/guide/task-demos.md', 'utf8'),
  productionChecklist: readFileSync('docs/guide/production-checklist.md', 'utf8'),
  zhProductionChecklist: readFileSync('docs/zh/guide/production-checklist.md', 'utf8'),
  productionReadinessStatus: readFileSync('docs/guide/production-readiness-status.md', 'utf8'),
  zhProductionReadinessStatus: readFileSync('docs/zh/guide/production-readiness-status.md', 'utf8'),
  adoptionReadiness: readFileSync('docs/guide/adoption-readiness.md', 'utf8'),
  zhAdoptionReadiness: readFileSync('docs/zh/guide/adoption-readiness.md', 'utf8'),
  upgrade04: readFileSync('docs/guide/upgrade-0.4.md', 'utf8'),
  zhUpgrade04: readFileSync('docs/zh/guide/upgrade-0.4.md', 'utf8'),
  upgrade03: readFileSync('docs/guide/upgrade-0.3.md', 'utf8'),
  zhUpgrade03: readFileSync('docs/zh/guide/upgrade-0.3.md', 'utf8'),
  aiSdkMigration: readFileSync('docs/guide/ai-sdk-migration.md', 'utf8'),
  zhAiSdkMigration: readFileSync('docs/zh/guide/ai-sdk-migration.md', 'utf8'),
  proxyRecipes: readFileSync('docs/guide/proxy-recipes.md', 'utf8'),
  zhProxyRecipes: readFileSync('docs/zh/guide/proxy-recipes.md', 'utf8'),
  serverStorage: readFileSync('docs/guide/server-storage.md', 'utf8'),
  zhServerStorage: readFileSync('docs/zh/guide/server-storage.md', 'utf8'),
  regenerateBranches: readFileSync('docs/guide/regenerate-branches.md', 'utf8'),
  zhRegenerateBranches: readFileSync('docs/zh/guide/regenerate-branches.md', 'utf8'),
  toolApprovals: readFileSync('docs/guide/tool-approvals.md', 'utf8'),
  zhToolApprovals: readFileSync('docs/zh/guide/tool-approvals.md', 'utf8'),
  agentBridge: readFileSync('docs/guide/agent-bridge.md', 'utf8'),
  zhAgentBridge: readFileSync('docs/zh/guide/agent-bridge.md', 'utf8'),
  agentRouteTemplates: readFileSync('docs/guide/agent-route-templates.md', 'utf8'),
  zhAgentRouteTemplates: readFileSync('docs/zh/guide/agent-route-templates.md', 'utf8'),
  agentEvents: readFileSync('docs/guide/agent-events.md', 'utf8'),
  zhAgentEvents: readFileSync('docs/zh/guide/agent-events.md', 'utf8'),
  inspection: readFileSync('docs/guide/inspection.md', 'utf8'),
  zhInspection: readFileSync('docs/zh/guide/inspection.md', 'utf8'),
  useChat: readFileSync('docs/reference/use-chat.md', 'utf8'),
  zhUseChat: readFileSync('docs/zh/reference/use-chat.md', 'utf8'),
  useEmbedding: readFileSync('docs/reference/use-embedding.md', 'utf8'),
  zhUseEmbedding: readFileSync('docs/zh/reference/use-embedding.md', 'utf8'),
  useImage: readFileSync('docs/reference/use-image.md', 'utf8'),
  zhUseImage: readFileSync('docs/zh/reference/use-image.md', 'utf8'),
  useVideo: readFileSync('docs/reference/use-video.md', 'utf8'),
  zhUseVideo: readFileSync('docs/zh/reference/use-video.md', 'utf8'),
  useSpeech: readFileSync('docs/reference/use-speech.md', 'utf8'),
  zhUseSpeech: readFileSync('docs/zh/reference/use-speech.md', 'utf8'),
  useTranscription: readFileSync('docs/reference/use-transcription.md', 'utf8'),
  zhUseTranscription: readFileSync('docs/zh/reference/use-transcription.md', 'utf8'),
  useRerank: readFileSync('docs/reference/use-rerank.md', 'utf8'),
  zhUseRerank: readFileSync('docs/zh/reference/use-rerank.md', 'utf8'),
  useObject: readFileSync('docs/reference/use-object.md', 'utf8'),
  zhUseObject: readFileSync('docs/zh/reference/use-object.md', 'utf8'),
  useChatThreads: readFileSync('docs/reference/use-chat-threads.md', 'utf8'),
  zhUseChatThreads: readFileSync('docs/zh/reference/use-chat-threads.md', 'utf8'),
  useAgentCapabilities: readFileSync('docs/reference/use-agent-capabilities.md', 'utf8'),
  zhUseAgentCapabilities: readFileSync('docs/zh/reference/use-agent-capabilities.md', 'utf8'),
  useAgentContext: readFileSync('docs/reference/use-agent-context.md', 'utf8'),
  zhUseAgentContext: readFileSync('docs/zh/reference/use-agent-context.md', 'utf8'),
  useAgentRun: readFileSync('docs/reference/use-agent-run.md', 'utf8'),
  zhUseAgentRun: readFileSync('docs/zh/reference/use-agent-run.md', 'utf8'),
  usePromptSuggestions: readFileSync('docs/reference/use-prompt-suggestions.md', 'utf8'),
  zhUsePromptSuggestions: readFileSync('docs/zh/reference/use-prompt-suggestions.md', 'utf8'),
  types: readFileSync('docs/reference/types.md', 'utf8'),
  zhTypes: readFileSync('docs/zh/reference/types.md', 'utf8'),
  streams: readFileSync('docs/reference/streams.md', 'utf8'),
  zhStreams: readFileSync('docs/zh/reference/streams.md', 'utf8'),
  react: readFileSync('docs/reference/react.md', 'utf8'),
  zhReact: readFileSync('docs/zh/reference/react.md', 'utf8'),
  providers: readFileSync('docs/reference/providers.md', 'utf8'),
  zhProviders: readFileSync('docs/zh/reference/providers.md', 'utf8'),
  examples: readFileSync('docs/examples/index.md', 'utf8'),
  zhExamples: readFileSync('docs/zh/examples/index.md', 'utf8'),
  readme: readFileSync('README.md', 'utf8'),
  zhReadme: readFileSync('README.zh-CN.md', 'utf8'),
  envExample: readFileSync('.env.example', 'utf8'),
  examplesEnvExample: readFileSync('examples/.env.example', 'utf8'),
  packageJson: readFileSync('package.json', 'utf8'),
  chatExample: readFileSync('examples/chat/App.vue', 'utf8'),
  threadedChatExample: readFileSync('examples/threaded-chat/App.vue', 'utf8'),
  threadedChatPanel: readFileSync('examples/threaded-chat/ThreadChatPanel.vue', 'utf8'),
  threadedChatCheck: readFileSync('scripts/check-threaded-chat-demo.mjs', 'utf8'),
  agentRunExample: readFileSync('examples/agent-run/App.vue', 'utf8'),
  agentRunCheck: readFileSync('scripts/check-agent-run-demo.mjs', 'utf8'),
  imageCheck: readFileSync('scripts/check-image-demo.mjs', 'utf8'),
  reactVideoCheck: readFileSync('scripts/check-react-video-demo.mjs', 'utf8'),
  reactChatExample: readFileSync('examples/react-chat/App.tsx', 'utf8'),
  reactImageExample: readFileSync('examples/react-image/App.tsx', 'utf8'),
  reactVideoExample: readFileSync('examples/react-video/App.tsx', 'utf8'),
  embeddingExample: readFileSync('examples/embedding/App.vue', 'utf8'),
  imageExample: readFileSync('examples/image/App.vue', 'utf8'),
  videoExample: readFileSync('examples/video/App.vue', 'utf8'),
  speechExample: readFileSync('examples/speech/App.vue', 'utf8'),
  transcriptionExample: readFileSync('examples/transcription/App.vue', 'utf8'),
  rerankExample: readFileSync('examples/rerank/App.vue', 'utf8'),
  objectExample: readFileSync('examples/object/App.vue', 'utf8'),
  proxyServer: readFileSync('examples/proxy-server/server.mjs', 'utf8'),
  demoShowcase: readFileSync('docs/.vitepress/theme/components/DemoShowcase.vue', 'utf8'),
  roadmap: readFileSync('ROADMAP.md', 'utf8')
}
const failures = []
const packageJson = JSON.parse(files.packageJson)

expect(
  files.config.includes("{ text: 'Examples', link: '/examples/' }"),
  'English VitePress nav must label the examples link as Examples'
)
expect(
  files.config.includes("text: 'Examples'") && files.config.includes("text: 'Overview'"),
  'English examples sidebar must use English labels'
)
expect(
  files.config.includes("{ text: 'Upgrade to v0.4.0', link: '/guide/upgrade-0.4' }") &&
    files.config.includes("{ text: '升级到 v0.4.0', link: '/zh/guide/upgrade-0.4' }"),
  'VitePress sidebars must expose the current v0.4.0 upgrade guide in English and Chinese'
)
expect(
  !files.config.includes("{ text: '示例', link: '/examples/' }"),
  'English VitePress nav must not show Chinese text for /examples/'
)

expect(
  files.home.includes('Start without an API key'),
  'English home page must tell users they can start without an API key'
)
expect(
  files.home.includes('Fifteen composables') &&
    files.home.includes('useAgentContext') &&
    files.home.includes('useAgentCapabilities') &&
    files.home.includes('useAgentRun') &&
    files.home.includes('runtime capability discovery') &&
    files.home.includes('headless agent run state'),
  'English home page must include the current composable count and agent capabilities'
)
expect(
  files.home.includes('Choose Fit') && files.home.includes('/guide/choosing'),
  'English home page must link to the library-fit guide'
)
expect(
  files.config.includes("{ text: 'Inspection', link: '/guide/inspection' }") &&
    files.config.includes("{ text: '调试检查', link: '/zh/guide/inspection' }"),
  'VitePress sidebars must expose the inspection guide in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Task demos', link: '/guide/task-demos' }") &&
    files.config.includes("{ text: '任务型 Demo', link: '/zh/guide/task-demos' }"),
  'VitePress sidebars must expose task demo guides in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Production checklist', link: '/guide/production-checklist' }") &&
    files.config.includes("{ text: '生产检查清单', link: '/zh/guide/production-checklist' }"),
  'VitePress sidebars must expose production checklists in English and Chinese'
)
expect(
  files.config.includes(
    "{ text: 'Readiness status', link: '/guide/production-readiness-status' }"
  ) &&
    files.config.includes(
      "{ text: '生产可用性状态', link: '/zh/guide/production-readiness-status' }"
    ),
  'VitePress sidebars must expose production readiness status pages in English and Chinese'
)
expect(
  files.config.includes(
    "{ text: 'Adoption and 1.0 readiness', link: '/guide/adoption-readiness' }"
  ) && files.config.includes("{ text: '采用和 1.0 准备', link: '/zh/guide/adoption-readiness' }"),
  'VitePress sidebars must expose adoption readiness pages in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Proxy recipes', link: '/guide/proxy-recipes' }") &&
    files.config.includes("{ text: 'Proxy 配方', link: '/zh/guide/proxy-recipes' }"),
  'VitePress sidebars must expose the proxy recipes guide in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Server storage', link: '/guide/server-storage' }") &&
    files.config.includes("{ text: '服务端存储', link: '/zh/guide/server-storage' }"),
  'VitePress sidebars must expose the server storage guide in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Regenerate branches', link: '/guide/regenerate-branches' }") &&
    files.config.includes("{ text: '重新生成分支', link: '/zh/guide/regenerate-branches' }"),
  'VitePress sidebars must expose the regenerate branch guide in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Tool approvals', link: '/guide/tool-approvals' }") &&
    files.config.includes("{ text: '工具审批', link: '/zh/guide/tool-approvals' }"),
  'VitePress sidebars must expose the tool approval guide in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Agent bridge', link: '/guide/agent-bridge' }") &&
    files.config.includes("{ text: '后端 Agent 桥接', link: '/zh/guide/agent-bridge' }"),
  'VitePress sidebars must expose the agent bridge guide in English and Chinese'
)
expect(
  files.config.includes(
    "{ text: 'Agent route templates', link: '/guide/agent-route-templates' }"
  ) && files.config.includes("{ text: 'Agent 路由模板', link: '/zh/guide/agent-route-templates' }"),
  'VitePress sidebars must expose the agent route templates guide in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Agent events', link: '/guide/agent-events' }") &&
    files.config.includes("{ text: 'Agent 事件', link: '/zh/guide/agent-events' }"),
  'VitePress sidebars must expose the agent-event guide in English and Chinese'
)
expect(
  files.config.includes("{ text: 'useChatThreads', link: '/reference/use-chat-threads' }") &&
    files.config.includes("{ text: 'useChatThreads', link: '/zh/reference/use-chat-threads' }"),
  'VitePress sidebars must expose useChatThreads reference docs in English and Chinese'
)
expect(
  files.config.includes("{ text: 'useAgentContext', link: '/reference/use-agent-context' }") &&
    files.config.includes("{ text: 'useAgentContext', link: '/zh/reference/use-agent-context' }"),
  'VitePress sidebars must expose useAgentContext reference docs in English and Chinese'
)
expect(
  files.config.includes(
    "{ text: 'useAgentCapabilities', link: '/reference/use-agent-capabilities' }"
  ) &&
    files.config.includes(
      "{ text: 'useAgentCapabilities', link: '/zh/reference/use-agent-capabilities' }"
    ),
  'VitePress sidebars must expose useAgentCapabilities reference docs in English and Chinese'
)
expect(
  files.config.includes("{ text: 'useAgentRun', link: '/reference/use-agent-run' }") &&
    files.config.includes("{ text: 'useAgentRun', link: '/zh/reference/use-agent-run' }"),
  'VitePress sidebars must expose useAgentRun reference docs in English and Chinese'
)
expect(
  files.config.includes(
    "{ text: 'usePromptSuggestions', link: '/reference/use-prompt-suggestions' }"
  ) &&
    files.config.includes(
      "{ text: 'usePromptSuggestions', link: '/zh/reference/use-prompt-suggestions' }"
    ),
  'VitePress sidebars must expose usePromptSuggestions reference docs in English and Chinese'
)
expect(
  files.zhHome.includes('可以先不配置 API key'),
  'Chinese home page must tell users they can start without an API key'
)
expect(
  files.zhHome.includes('十五个组合式函数') &&
    files.zhHome.includes('useAgentContext') &&
    files.zhHome.includes('useAgentCapabilities') &&
    files.zhHome.includes('useAgentRun') &&
    files.zhHome.includes('runtime 能力发现') &&
    files.zhHome.includes('无 UI agent run 状态'),
  'Chinese home page must include the current composable count and agent capabilities'
)
expect(
  files.zhHome.includes('选型对比') && files.zhHome.includes('/zh/guide/choosing'),
  'Chinese home page must link to the library-fit guide'
)

for (const snippet of [
  '## Pick a path',
  '[Choosing vue-ai-hooks](/guide/choosing)',
  '[v0.4.0 upgrade guide](/guide/upgrade-0.4)',
  '[v0.3.0 upgrade guide](/guide/upgrade-0.3)',
  '[AI SDK migration guide](/guide/ai-sdk-migration)',
  '## Run a demo without API keys',
  '[Task-oriented demos](/guide/task-demos)',
  '[Production checklist](/guide/production-checklist)',
  '[Production readiness status](/guide/production-readiness-status)',
  '[useChatThreads](/reference/use-chat-threads)',
  'pnpm example:chat',
  'pnpm example:react-chat',
  'falls back to `local-tools`',
  'VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat',
  'The browser sends provider-agnostic JSON to your own `/api/chat` route',
  "useImage({ baseURL: 'http://127.0.0.1:8787' })",
  "useVideo({ baseURL: 'http://127.0.0.1:8787' })",
  "useTranscription({ baseURL: 'http://127.0.0.1:8787' })",
  "useRerank({ baseURL: 'http://127.0.0.1:8787' })",
  "useObject({ baseURL: 'http://127.0.0.1:8787', schema })",
  'PROXY_UPSTREAM_BASE_URL',
  'PROXY_UPSTREAM_API_KEY',
  'PROXY_UPSTREAM_MODEL',
  'PROXY_UPSTREAM_TIMEOUT_MS',
  'PROXY_UPSTREAM_TRACE_HEADER',
  '[Proxy recipes](/guide/proxy-recipes)',
  '[Agent events](/guide/agent-events)',
  '[Agent bridge recipe](/guide/agent-bridge)',
  '[Agent route templates](/guide/agent-route-templates)',
  '[server storage recipe](/guide/server-storage)',
  '[Regenerate branches recipe](/guide/regenerate-branches)',
  '[Tool approval recipe](/guide/tool-approvals)',
  '[Examples](/examples/)',
  '[Inspection](/guide/inspection)'
]) {
  expect(files.gettingStarted.includes(snippet), `English getting started must include: ${snippet}`)
}

for (const snippet of [
  '## 先选一条路径',
  '[选择 vue-ai-hooks](/zh/guide/choosing)',
  '[v0.4.0 升级指南](/zh/guide/upgrade-0.4)',
  '[v0.3.0 升级指南](/zh/guide/upgrade-0.3)',
  '[AI SDK 迁移指南](/zh/guide/ai-sdk-migration)',
  '## 不需要 API key 的 Demo',
  '[任务型 Demo](/zh/guide/task-demos)',
  '[生产检查清单](/zh/guide/production-checklist)',
  '[生产可用性状态](/zh/guide/production-readiness-status)',
  '[useChatThreads](/zh/reference/use-chat-threads)',
  'pnpm example:chat',
  'pnpm example:react-chat',
  '自动回退到 `local-tools`',
  'VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat',
  '浏览器会把框架无关的 JSON 发给你自己的 `/api/chat` 路由',
  "useImage({ baseURL: 'http://127.0.0.1:8787' })",
  "useVideo({ baseURL: 'http://127.0.0.1:8787' })",
  "useTranscription({ baseURL: 'http://127.0.0.1:8787' })",
  "useRerank({ baseURL: 'http://127.0.0.1:8787' })",
  "useObject({ baseURL: 'http://127.0.0.1:8787', schema })",
  'PROXY_UPSTREAM_BASE_URL',
  'PROXY_UPSTREAM_API_KEY',
  'PROXY_UPSTREAM_MODEL',
  'PROXY_UPSTREAM_TIMEOUT_MS',
  'PROXY_UPSTREAM_TRACE_HEADER',
  '[Proxy 配方](/zh/guide/proxy-recipes)',
  '[Agent 事件](/zh/guide/agent-events)',
  '[后端 Agent 桥接配方](/zh/guide/agent-bridge)',
  '[Agent 路由模板](/zh/guide/agent-route-templates)',
  '[服务端存储配方](/zh/guide/server-storage)',
  '[重新生成分支配方](/zh/guide/regenerate-branches)',
  '[工具审批配方](/zh/guide/tool-approvals)',
  '[示例](/zh/examples/)',
  '[调试检查](/zh/guide/inspection)'
]) {
  expect(
    files.zhGettingStarted.includes(snippet),
    `Chinese getting started must include: ${snippet}`
  )
}

for (const snippet of [
  '# Task-oriented demos',
  'Vue chat with tool approval',
  '[Tool approvals](/guide/tool-approvals)',
  'idempotent `runId`',
  'narrow renderer contract',
  'React chat quickstart',
  'Thread sidebar persistence',
  'pnpm example:threaded-chat',
  'examples/threaded-chat/App.vue',
  '[useChatThreads](/reference/use-chat-threads)',
  'Headless agent run approval',
  'pnpm example:agent-run',
  'examples/agent-run/App.vue',
  '[useAgentRun](/reference/use-agent-run)',
  'threads.createThread',
  'Server-side chat history',
  '[Server storage](/guide/server-storage)',
  'Regenerate or branch history',
  '[Regenerate branches](/guide/regenerate-branches)',
  'sourceMessageId',
  'runId: crypto.randomUUID()',
  'Own `/api/chat` proxy',
  'Agent backend bridge',
  '[Agent bridge](/guide/agent-bridge)',
  '[Agent route templates](/guide/agent-route-templates)',
  'LangChain',
  'LangGraph',
  'checkpoints',
  'AI SDK UI stream migration',
  'Production deployment readiness',
  'pnpm example:chat',
  'pnpm example:react-chat',
  'examples/react-chat/App.tsx',
  'pnpm example:proxy-server',
  'readUIMessageStream()',
  'readAgentEventStream',
  'agentEventToUIMessageStreamPart()',
  'pnpm agent-route-templates:check',
  '[Production checklist](/guide/production-checklist)'
]) {
  expect(files.taskDemos.includes(snippet), `English task demos guide must include: ${snippet}`)
}

for (const snippet of [
  '# 任务型 Demo',
  'Vue 聊天 + 工具审批',
  '[工具审批](/zh/guide/tool-approvals)',
  '幂等 `runId`',
  'renderer',
  'React 聊天最小接入',
  'Thread 侧边栏持久化',
  'pnpm example:threaded-chat',
  'examples/threaded-chat/App.vue',
  '[useChatThreads](/zh/reference/use-chat-threads)',
  '无 UI Agent run 审批',
  'pnpm example:agent-run',
  'examples/agent-run/App.vue',
  '[useAgentRun](/zh/reference/use-agent-run)',
  'threads.createThread',
  '服务端聊天历史',
  '[服务端存储](/zh/guide/server-storage)',
  '重新生成或分支历史',
  '[重新生成分支](/zh/guide/regenerate-branches)',
  'sourceMessageId',
  'runId: crypto.randomUUID()',
  '自有 `/api/chat` proxy',
  'Agent 后端桥接',
  '[后端 Agent 桥接](/zh/guide/agent-bridge)',
  '[Agent 路由模板](/zh/guide/agent-route-templates)',
  'LangChain',
  'LangGraph',
  'checkpoint',
  'AI SDK UI stream 迁移',
  '生产部署准备',
  'pnpm example:chat',
  'pnpm example:react-chat',
  'examples/react-chat/App.tsx',
  'pnpm example:proxy-server',
  'readUIMessageStream()',
  'readAgentEventStream',
  'agentEventToUIMessageStreamPart()',
  'pnpm agent-route-templates:check',
  '[生产检查清单](/zh/guide/production-checklist)'
]) {
  expect(files.zhTaskDemos.includes(snippet), `Chinese task demos guide must include: ${snippet}`)
}

for (const snippet of [
  '# Agent event adapters',
  'AgentEvent',
  'readAgentEventStream',
  'agentEventToChatChunk',
  'agentEventToUIMessageStreamPart',
  'createUIMessageStreamResponse',
  'interrupt',
  'tool-call',
  'tool-result',
  'data-agent-progress',
  'data-agent-interrupt',
  '[Agent bridge recipe](/guide/agent-bridge)',
  '[useAgentRun](/reference/use-agent-run)',
  '[tool approval recipe](/guide/tool-approvals)',
  'Production notes'
]) {
  expect(files.agentEvents.includes(snippet), `English agent events guide must include: ${snippet}`)
}

for (const snippet of [
  '# Agent 事件适配',
  'AgentEvent',
  'readAgentEventStream',
  'agentEventToChatChunk',
  'agentEventToUIMessageStreamPart',
  'createUIMessageStreamResponse',
  'interrupt',
  'tool-call',
  'tool-result',
  'data-agent-progress',
  'data-agent-interrupt',
  '[后端 Agent 桥接配方](/zh/guide/agent-bridge)',
  '[useAgentRun](/zh/reference/use-agent-run)',
  '[工具审批配方](/zh/guide/tool-approvals)',
  '生产注意事项'
]) {
  expect(
    files.zhAgentEvents.includes(snippet),
    `Chinese agent events guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# Production checklist',
  '## Browser boundary',
  '## Backend proxy',
  '[agent bridge recipe](/guide/agent-bridge)',
  '[agent route templates](/guide/agent-route-templates)',
  'Nuxt/Nitro',
  'LangChain',
  'LangGraph',
  'LangSmith keys',
  'HTTP 400',
  '"error":"Agent route failed"',
  '## Streaming contract',
  '## Tools and approvals',
  '[tool approval recipe](/guide/tool-approvals)',
  'approvalId',
  'toolCallId',
  'privileged tools',
  'cannot execute a tool twice',
  '## UI state and inspection',
  '[server storage recipe](/guide/server-storage)',
  '[regenerate branches recipe](/guide/regenerate-branches)',
  'multi-device history',
  'Do not overwrite old',
  'inspectRequestTrace()',
  'pnpm check',
  'pnpm release:check',
  'Send one malformed `/api/chat` request',
  '`400` + `{"error":"Agent route failed"}`',
  'pnpm image:check',
  'pnpm react-video:check',
  'pnpm agent-run:check',
  'pnpm agent-route-templates:check',
  '## Production smoke test',
  'without duplicate `runId` writes',
  'branch_revision_conflict',
  'run_in_progress',
  'GitHub issues should contain reproducible bugs only'
]) {
  expect(
    files.productionChecklist.includes(snippet),
    `English production checklist must include: ${snippet}`
  )
}
expect(
  files.productionChecklist.includes('pnpm release:status'),
  'English production checklist must include the release status gate'
)
expect(
  files.productionChecklist.includes('Node runner') &&
    files.productionChecklist.includes(packageJson.scripts?.['production:readiness']),
  'English production checklist must describe the shared production readiness runner'
)

for (const snippet of [
  '# 生产检查清单',
  '## 浏览器边界',
  '## 后端代理',
  '[后端 Agent 桥接配方](/zh/guide/agent-bridge)',
  '[Agent 路由模板](/zh/guide/agent-route-templates)',
  'Nuxt/Nitro',
  'LangChain',
  'LangGraph',
  'LangSmith key',
  'HTTP 400',
  '"error":"Agent route failed"',
  '## 流式契约',
  '## 工具和审批',
  '[工具审批配方](/zh/guide/tool-approvals)',
  'approvalId',
  'toolCallId',
  '特权工具',
  '不能执行两次',
  '## UI 状态和检查',
  '[服务端存储配方](/zh/guide/server-storage)',
  '[重新生成分支配方](/zh/guide/regenerate-branches)',
  '多设备历史',
  '重新生成时不要覆盖旧 assistant 消息',
  'inspectRequestTrace()',
  '发送一次格式错误的 `/api/chat` 请求',
  '确认响应为 `400`',
  '`{"error":"Agent route failed"}`',
  'pnpm check',
  'pnpm release:check',
  'pnpm image:check',
  'pnpm react-video:check',
  'pnpm agent-run:check',
  'pnpm agent-route-templates:check',
  '## 生产 smoke test',
  '没有重复写入相同 `runId`',
  'branch_revision_conflict',
  'run_in_progress',
  'GitHub issue 只记录可复现 bug'
]) {
  expect(
    files.zhProductionChecklist.includes(snippet),
    `Chinese production checklist must include: ${snippet}`
  )
}
expect(
  files.zhProductionChecklist.includes('pnpm release:status'),
  'Chinese production checklist must include the release status gate'
)
expect(
  files.zhProductionChecklist.includes('同一个\nNode runner') &&
    files.zhProductionChecklist.includes(packageJson.scripts?.['production:readiness']),
  'Chinese production checklist must describe the shared production readiness runner'
)

for (const snippet of [
  '# Production readiness status',
  'GitHub issues remain reserved for reproducible bugs',
  '## Status matrix',
  'Inspection',
  'Task demos',
  'Provider presets',
  'React support',
  'Migration bridge',
  'Tool approval',
  'Threads and persistence',
  'Agent bridge',
  'route templates',
  'agent route templates',
  'pnpm production:readiness',
  'node scripts/production-readiness-local.mjs',
  'pnpm release:status',
  'CI, CodeQL, OpenSSF Scorecard',
  'daily release cadence',
  'Do not publish another npm version on the same Asia/Shanghai calendar day',
  '[Adoption and 1.0 readiness](/guide/adoption-readiness)',
  'Do not turn this package into a backend agent framework',
  'Do not add React hooks only for symmetry',
  '`useChat`, `useCompletion`, `useObject`, `useImage`, `useVideo`, `usePromptSuggestions`, and `useAgentRun`'
]) {
  expect(
    files.productionReadinessStatus.includes(snippet),
    `English production readiness status must include: ${snippet}`
  )
}

for (const snippet of [
  '# Adoption and 1.0 readiness',
  '## Current baseline',
  '`0.14.x` has release gates',
  '## Adoption loop',
  'at least three real host apps',
  'time-to-first-chat',
  'inspectRequestTrace()',
  'useChatThreads()',
  '## 1.0 exit criteria',
  'compatibility matrix covers Vue 3, Vite, Nuxt/Nitro, current Node LTS',
  'pnpm production:readiness',
  'pnpm links:check',
  'pnpm docs:build',
  'GitHub issues are for reproducible bugs',
  '## Do not chase',
  'A hosted backend service',
  'A full backend agent framework'
]) {
  expect(
    files.adoptionReadiness.includes(snippet),
    `English adoption readiness guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# 生产可用性状态',
  'issue 仍然只记录可复现 bug',
  '## 状态矩阵',
  '调试检查',
  '任务型 demo',
  'Provider preset',
  'React 支持',
  '迁移桥定位',
  '工具审批',
  '线程和持久化',
  'Agent 桥接',
  '路由模板',
  'agent route templates',
  'pnpm production:readiness',
  'node scripts/production-readiness-local.mjs',
  'pnpm release:status',
  'CI、CodeQL、OpenSSF Scorecard',
  'release cadence',
  '同一个 Asia/Shanghai 自然日',
  '[采用和 1.0 准备](/zh/guide/adoption-readiness)',
  '不把这个包做成后端 Agent 框架',
  '不为了对称而扩 React hook',
  '`useChat`、`useCompletion`、`useObject`、`useImage`、`useVideo`、`usePromptSuggestions` 和 `useAgentRun`'
]) {
  expect(
    files.zhProductionReadinessStatus.includes(snippet),
    `Chinese production readiness status must include: ${snippet}`
  )
}

for (const snippet of [
  '# 采用和 1.0 准备',
  '## 当前基线',
  '`0.14.x` 已经有',
  '## 采用闭环',
  '至少用三个真实宿主应用',
  'time-to-first-chat',
  'inspectRequestTrace()',
  'useChatThreads()',
  '## 1.0 退出标准',
  '兼容矩阵覆盖 Vue 3、Vite、Nuxt/Nitro、当前 Node LTS',
  'pnpm production:readiness',
  'pnpm links:check',
  'pnpm docs:build',
  'GitHub issue 只放可复现 bug',
  '## 不追这些',
  '托管后端服务',
  '完整后端 Agent 框架'
]) {
  expect(
    files.zhAdoptionReadiness.includes(snippet),
    `Chinese adoption readiness guide must include: ${snippet}`
  )
}

for (const snippet of [
  '### 0.15.x to 1.0 readiness',
  'at least\n  three real host apps',
  'time-to-first-chat',
  'redacted trace usefulness',
  'documented stability levels',
  'GitHub issues limited to reproducible bugs'
]) {
  expect(files.roadmap.includes(snippet), `Roadmap must include adoption readiness: ${snippet}`)
}

for (const snippet of [
  '# Server storage recipe',
  'GET /api/chat/threads',
  'PUT /api/chat/threads',
  'GET /api/chat/threads/:id',
  'POST /api/chat',
  'deserializeChatThreadsState',
  'serializeChatThreadsState',
  'deserializeMessages',
  'serializeMessages',
  'safeValidateMessages',
  'ChatThreadStorageAdapter',
  'createHttpThreadStorageAdapter',
  'loadThreadIndex()',
  'saveThreadMessages',
  "'if-match'",
  "'x-run-id'",
  'tenant',
  'revision',
  'restore smoke test',
  'Do not store provider credentials'
]) {
  expect(
    files.serverStorage.includes(snippet),
    `English server storage guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# 服务端存储配方',
  'GET /api/chat/threads',
  'PUT /api/chat/threads',
  'GET /api/chat/threads/:id',
  'POST /api/chat',
  'deserializeChatThreadsState',
  'serializeChatThreadsState',
  'deserializeMessages',
  'serializeMessages',
  'safeValidateMessages',
  'ChatThreadStorageAdapter',
  'createHttpThreadStorageAdapter',
  'loadThreadIndex()',
  'saveThreadMessages',
  "'if-match'",
  "'x-run-id'",
  'tenant',
  'revision',
  'restore smoke test',
  '不要在这两份 payload 里保存 Provider 凭据'
]) {
  expect(
    files.zhServerStorage.includes(snippet),
    `Chinese server storage guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# Regenerate branches recipe',
  'POST /api/chat/threads/:threadId/regenerate',
  'POST /api/chat/threads/:threadId/branches',
  'GET  /api/chat/threads/:threadId/branches',
  'PATCH /api/chat/threads/:threadId/branches/:branchId',
  'branchId',
  'runId',
  'revision',
  'sourceMessageId',
  'parentMessageId',
  'deserializeMessages',
  'serializeMessages',
  'pruneMessages',
  'inspectRequestTrace',
  'safeValidateMessages()',
  'idempotent key',
  'Conflict and idempotency contract',
  'branch_revision_conflict',
  'latestRevision',
  'run_in_progress',
  'status: "replayed"',
  'creates at most one assistant message',
  'tenant',
  'Do not store provider credentials',
  'Restore smoke test',
  'do not mutate an old assistant message'
]) {
  expect(
    files.regenerateBranches.includes(snippet),
    `English regenerate branches guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# 重新生成分支配方',
  'POST /api/chat/threads/:threadId/regenerate',
  'POST /api/chat/threads/:threadId/branches',
  'GET  /api/chat/threads/:threadId/branches',
  'PATCH /api/chat/threads/:threadId/branches/:branchId',
  'branchId',
  'runId',
  'revision',
  'sourceMessageId',
  'parentMessageId',
  'deserializeMessages',
  'serializeMessages',
  'pruneMessages',
  'inspectRequestTrace',
  'safeValidateMessages()',
  '幂等 key',
  '冲突和幂等契约',
  'branch_revision_conflict',
  'latestRevision',
  'run_in_progress',
  'status: "replayed"',
  '一个 `runId` 最多创建一条 assistant',
  'tenant',
  'branch 或 message JSON 里保存 Provider 凭据',
  'Restore smoke test',
  '不要原地修改旧 assistant 消息'
]) {
  expect(
    files.zhRegenerateBranches.includes(snippet),
    `Chinese regenerate branches guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# Tool approval recipe',
  'GET  /api/chat/threads/:threadId/approvals',
  'POST /api/chat/threads/:threadId/approvals',
  'POST /api/chat/approvals/:approvalId/approve',
  'POST /api/chat/approvals/:approvalId/reject',
  'approvalId',
  'toolCallId',
  'argsSnapshot',
  'runId',
  'revision',
  'traceId',
  'ToolApprovalView',
  'pendingToolCalls',
  'addToolApprovalResponse',
  'inspectRequestTrace',
  'sendAutomaticallyWhen: false',
  'stopWhen',
  'idempotency key',
  'Decision contract',
  'approval_revision_conflict',
  'latestRevision',
  'status: "replayed"',
  'One `runId` should create at most one tool execution',
  'privileged tool credentials',
  'Production smoke test'
]) {
  expect(
    files.toolApprovals.includes(snippet),
    `English tool approval guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# 工具审批配方',
  'GET  /api/chat/threads/:threadId/approvals',
  'POST /api/chat/threads/:threadId/approvals',
  'POST /api/chat/approvals/:approvalId/approve',
  'POST /api/chat/approvals/:approvalId/reject',
  'approvalId',
  'toolCallId',
  'argsSnapshot',
  'runId',
  'revision',
  'traceId',
  'ToolApprovalView',
  'pendingToolCalls',
  'addToolApprovalResponse',
  'inspectRequestTrace',
  'sendAutomaticallyWhen: false',
  'stopWhen',
  '幂等 key',
  '决策契约',
  'approval_revision_conflict',
  'latestRevision',
  'status: "replayed"',
  '一个 `runId` 最多触发一次工具执行',
  '特权工具凭据',
  'Production smoke test'
]) {
  expect(
    files.zhToolApprovals.includes(snippet),
    `Chinese tool approval guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# Agent bridge recipe',
  'streamEvents',
  "version: 'v3'",
  'streamMode',
  'messages',
  'updates',
  'tools',
  'interrupt/resume',
  'data-agent-interrupt',
  'Projection guardrails',
  'Command({ resume',
  'thread_id',
  'pnpm agent-bridge:check',
  'AgentEvent',
  'POST /api/agent/runs',
  'GET  /api/agent/runs/:runId/events',
  'POST /api/agent/runs/:runId/resume',
  'runLangChainAgent',
  'runLangGraphAgent',
  'readAgentEventStream',
  'agentEventToUIMessageStreamPart',
  'createUIMessageStreamResponse',
  'LangSmith',
  'runId',
  'Smoke test'
]) {
  expect(files.agentBridge.includes(snippet), `English agent bridge guide must include: ${snippet}`)
}

for (const snippet of [
  '# 后端 Agent 桥接配方',
  'streamEvents',
  "version: 'v3'",
  'streamMode',
  'messages',
  'updates',
  'tools',
  'interrupt/resume',
  'data-agent-interrupt',
  '投影守护规则',
  'Command({ resume',
  'thread_id',
  'pnpm agent-bridge:check',
  'AgentEvent',
  'POST /api/agent/runs',
  'GET  /api/agent/runs/:runId/events',
  'POST /api/agent/runs/:runId/resume',
  'runLangChainAgent',
  'runLangGraphAgent',
  'readAgentEventStream',
  'agentEventToUIMessageStreamPart',
  'createUIMessageStreamResponse',
  'LangSmith',
  'runId',
  'Smoke test'
]) {
  expect(
    files.zhAgentBridge.includes(snippet),
    `Chinese agent bridge guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# Agent route templates',
  'Next.js App Router',
  'export async function POST(request: Request)',
  'request.json()',
  "export const runtime = 'nodejs'",
  "export const dynamic = 'force-dynamic'",
  'Nuxt server route',
  'server/api/chat.post.ts',
  'defineEventHandler',
  'readBody(event)',
  'event.req?.signal',
  'Hono',
  "app.post('/api/chat'",
  'c.req.json()',
  'streamText',
  'Web Fetch route',
  'agentRouteErrorResponse()',
  'LangGraph interrupt resume',
  'Command({ resume',
  'data-agent-interrupt',
  'x-agent-run-id',
  'x-agent-trace-id',
  'pnpm agent-route-templates:check'
]) {
  expect(
    files.agentRouteTemplates.includes(snippet),
    `English agent route templates guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# Agent 路由模板',
  'Next.js App Router',
  'export async function POST(request: Request)',
  'request.json()',
  "export const runtime = 'nodejs'",
  "export const dynamic = 'force-dynamic'",
  'Nuxt server route',
  'server/api/chat.post.ts',
  'defineEventHandler',
  'readBody(event)',
  'event.req?.signal',
  'Hono',
  "app.post('/api/chat'",
  'c.req.json()',
  'streamText',
  'Web Fetch route',
  'agentRouteErrorResponse()',
  'LangGraph interrupt resume',
  'Command({ resume',
  'data-agent-interrupt',
  'x-agent-run-id',
  'x-agent-trace-id',
  'pnpm agent-route-templates:check'
]) {
  expect(
    files.zhAgentRouteTemplates.includes(snippet),
    `Chinese agent route templates guide must include: ${snippet}`
  )
}

expect(
  !files.gettingStarted.includes('cp examples/.env.example .env') &&
    !files.zhGettingStarted.includes('cp examples/.env.example .env'),
  'Getting started docs must not reference a non-existent examples/.env.example file'
)
expect(
  files.envExample.includes(
    'Supported chat values: local-tools, openai, openrouter, gemini, deepseek, proxy'
  ) &&
    files.envExample.includes('VITE_CHAT_PROVIDER=local-tools') &&
    files.envExample.includes('VITE_EXAMPLE_PROVIDER=local-object') &&
    files.envExample.includes('VITE_PROXY_IMAGE_URL=/api/ai/image') &&
    files.envExample.includes('VITE_PROXY_VIDEO_URL=/api/ai/video') &&
    files.envExample.includes('VITE_PROXY_SPEECH_URL=/api/ai/speech') &&
    files.envExample.includes('VITE_PROXY_TRANSCRIPTION_URL=/api/ai/transcription') &&
    files.envExample.includes('VITE_PROXY_RERANK_URL=/api/ai/rerank') &&
    files.envExample.includes('VITE_PROXY_OBJECT_URL=/api/ai/object') &&
    files.envExample.includes('PROXY_UPSTREAM_TIMEOUT_MS=30000') &&
    files.envExample.includes('PROXY_UPSTREAM_TRACE_HEADER=x-request-id') &&
    files.examplesEnvExample.includes('VITE_PROXY_VIDEO_URL=/api/ai/video') &&
    files.examplesEnvExample.includes('VITE_PROXY_RERANK_URL=/api/ai/rerank') &&
    files.examplesEnvExample.includes('VITE_PROXY_TRANSCRIPTION_URL=/api/ai/transcription') &&
    files.examplesEnvExample.includes('PROXY_UPSTREAM_TIMEOUT_MS=30000') &&
    files.examplesEnvExample.includes('PROXY_UPSTREAM_TRACE_HEADER=x-request-id'),
  '.env.example files must make examples runnable without provider keys and document server-only upstream proxy controls'
)
expect(
  files.chatExample.includes('const openAiKey =') &&
    files.chatExample.includes('DirectChatTransport') &&
    files.chatExample.includes("'sk-...'") &&
    files.chatExample.includes("'local-tools'") &&
    files.chatExample.includes('useAgentContextRegistry') &&
    files.chatExample.includes('useAgentContext') &&
    files.chatExample.includes('agentContextMessage') &&
    files.chatExample.includes('Runtime chat context') &&
    files.chatExample.includes('getToolRenderParts') &&
    files.chatExample.includes('ToolRenderPart') &&
    files.chatExample.includes('awaiting approval') &&
    files.chatExample.includes('usePromptSuggestions') &&
    files.chatExample.includes('visibleSuggestions') &&
    files.chatExample.includes('reloadSuggestions') &&
    files.chatExample.includes('isLoadingSuggestions') &&
    files.chatExample.includes('applySuggestion') &&
    files.chatExample.includes('suggestion-chip'),
  'Chat example must fall back to DirectChatTransport-backed local-tools and expose agent context, tool render rows, plus static/dynamic prompt suggestion chips'
)
expect(
  files.reactChatExample.includes("from 'vue-ai-hooks/react'") &&
    files.reactChatExample.includes('DirectChatTransport') &&
    files.reactChatExample.includes("'react-local'") &&
    files.reactChatExample.includes('localReactStream') &&
    files.packageJson.includes('"example:react-chat"') &&
    files.packageJson.includes('"example:react-chat:build"') &&
    files.packageJson.includes('pnpm example:react-chat:build'),
  'React chat example must be runnable without provider keys and included in the examples build gate'
)
expect(
  files.reactVideoExample.includes("from 'vue-ai-hooks/react'") &&
    files.reactVideoExample.includes('useVideo') &&
    files.reactVideoExample.includes('createPromptSuggestionRecipes') &&
    files.reactVideoExample.includes('usePromptSuggestions') &&
    files.reactVideoExample.includes("surfaces: ['media']") &&
    files.reactVideoExample.includes('visibleSuggestions') &&
    files.reactVideoExample.includes('localVideoFetch') &&
    files.reactVideoExample.includes('VITE_EXAMPLE_PROVIDER') &&
    files.reactVideoExample.includes('VITE_PROXY_VIDEO_URL') &&
    files.reactVideoExample.includes('inspectRequestTrace') &&
    files.reactVideoExample.includes('Trace JSON') &&
    files.reactVideoCheck.includes('React video demo check passed') &&
    files.packageJson.includes('"example:react-video"') &&
    files.packageJson.includes('"example:react-video:build"') &&
    files.packageJson.includes('"react-video:check"') &&
    files.packageJson.includes('pnpm example:react-video:build') &&
    files.packageJson.includes('pnpm react-video:check'),
  'React video example must be runnable without provider keys, traceable, checked, and included in readiness gates'
)
expect(
  files.threadedChatExample.includes("import { useChatThreads } from 'vue-ai-hooks'") &&
    files.threadedChatExample.includes('ThreadChatPanel') &&
    files.threadedChatExample.includes('THREAD_INDEX_KEY') &&
    files.threadedChatExample.includes('threadStorageError') &&
    files.threadedChatExample.includes('clearPersistenceError()') &&
    files.threadedChatExample.includes('archiveActiveThread') &&
    files.threadedChatExample.includes('restoreThread') &&
    files.threadedChatPanel.includes('DirectChatTransport') &&
    files.threadedChatPanel.includes('createPromptSuggestionRecipes') &&
    files.threadedChatPanel.includes("'thread-local'") &&
    files.threadedChatPanel.includes('useChat({') &&
    files.threadedChatPanel.includes('persist: {') &&
    files.threadedChatPanel.includes('vue-ai-hooks:threaded-chat:messages') &&
    files.threadedChatPanel.includes('thread-checkpoint') &&
    files.taskDemos.includes("createPromptSuggestionRecipes({ surfaces: ['thread'] })") &&
    files.zhTaskDemos.includes("createPromptSuggestionRecipes({ surfaces: ['thread'] })") &&
    files.packageJson.includes('"example:threaded-chat"') &&
    files.packageJson.includes('"example:threaded-chat:build"') &&
    files.packageJson.includes('pnpm example:threaded-chat:build') &&
    files.threadedChatCheck.includes('persistenceError') &&
    files.threadedChatCheck.includes('clearPersistenceError()'),
  'Threaded chat example must pair useChatThreads with per-thread useChat({ persist }), expose persistence diagnostics, and be included in the examples build gate'
)
expect(
  files.agentRunExample.includes("from 'vue-ai-hooks'") &&
    files.agentRunExample.includes('useAgentRun') &&
    files.agentRunExample.includes('createPromptSuggestionRecipes') &&
    files.agentRunExample.includes('usePromptSuggestions') &&
    files.agentRunExample.includes("surfaces: ['agent', 'tool-approval']") &&
    files.agentRunExample.includes('visibleAgentStarters') &&
    files.agentRunExample.includes('runLocalAgent') &&
    files.agentRunExample.includes("name: 'approvePlan'") &&
    files.agentRunExample.includes('agent.resume(') &&
    files.agentRunExample.includes('agent.inspect()') &&
    files.agentRunExample.includes('agent.clearTrace()') &&
    files.agentRunExample.includes('startDuplicateRun') &&
    files.agentRunExample.includes('Replay same id') &&
    files.agentRunExample.includes('Inspection snapshot') &&
    files.agentRunCheck.includes('Agent run demo check passed') &&
    files.agentRunCheck.includes('same interrupted run id should replay existing state') &&
    files.packageJson.includes('"example:agent-run"') &&
    files.packageJson.includes('"example:agent-run:build"') &&
    files.packageJson.includes('"agent-run:check"') &&
    files.packageJson.includes('pnpm example:agent-run:build') &&
    files.packageJson.includes('pnpm agent-run:check') &&
    files.taskDemos.includes(
      "createPromptSuggestionRecipes({ surfaces: ['agent', 'tool-approval'] })"
    ) &&
    files.zhTaskDemos.includes(
      "createPromptSuggestionRecipes({ surfaces: ['agent', 'tool-approval'] })"
    ),
  'Agent run example must verify interrupt/resume, same-run replay, inspection, and readiness gates'
)
expect(
  files.readme.includes('defaults to the no-key `local-tools` provider') &&
    files.zhReadme.includes('不需要 key 的 `local-tools` Provider') &&
    files.readme.includes('`useCompletion`, or `useObject` from `vue-ai-hooks/react`') &&
    files.zhReadme.includes('`useCompletion` 或 `useObject`，在 React 中复用') &&
    files.readme.includes('DirectChatTransport') &&
    files.readme.includes('DirectChatTransport({ onError })') &&
    files.readme.includes('useAgentContextRegistry') &&
    files.readme.includes('useAgentCapabilities') &&
    files.readme.includes('useAgentRun') &&
    files.readme.includes('usePromptSuggestions') &&
    files.readme.includes('getToolRenderParts') &&
    files.readme.includes('defineToolHandlers()') &&
    files.zhReadme.includes('DirectChatTransport') &&
    files.zhReadme.includes('DirectChatTransport({ onError })') &&
    files.zhReadme.includes('useAgentContextRegistry') &&
    files.zhReadme.includes('useAgentCapabilities') &&
    files.zhReadme.includes('useAgentRun') &&
    files.zhReadme.includes('usePromptSuggestions') &&
    files.zhReadme.includes('getToolRenderParts') &&
    files.zhReadme.includes('defineToolHandlers()') &&
    files.readme.includes('Direct alternative') &&
    files.readme.includes('Backend complement') &&
    files.readme.includes('Vue DX benchmark') &&
    files.zhReadme.includes('直接替代') &&
    files.zhReadme.includes('后端互补层') &&
    files.zhReadme.includes('Vue DX 标杆') &&
    files.readme.includes('**CopilotKit**') &&
    files.zhReadme.includes('**CopilotKit**') &&
    files.readme.includes('**VueUse**') &&
    files.zhReadme.includes('**VueUse**') &&
    files.readme.includes('`examples/image`') &&
    files.zhReadme.includes('`examples/image`') &&
    files.readme.includes('`examples/video`') &&
    files.zhReadme.includes('`examples/video`') &&
    files.readme.includes('`examples/speech`') &&
    files.zhReadme.includes('`examples/speech`') &&
    files.readme.includes('`examples/rerank`') &&
    files.zhReadme.includes('`examples/rerank`') &&
    files.readme.includes('`examples/object`') &&
    files.zhReadme.includes('`examples/object`') &&
    files.readme.includes('`examples/react-chat`') &&
    files.zhReadme.includes('`examples/react-chat`') &&
    files.readme.includes('`examples/react-video`') &&
    files.zhReadme.includes('`examples/react-video`') &&
    files.readme.includes('`examples/threaded-chat`') &&
    files.zhReadme.includes('`examples/threaded-chat`') &&
    files.readme.includes('`examples/agent-run`') &&
    files.zhReadme.includes('`examples/agent-run`') &&
    files.readme.includes('pnpm example:react-chat') &&
    files.zhReadme.includes('pnpm example:react-chat') &&
    files.readme.includes('pnpm example:react-video') &&
    files.zhReadme.includes('pnpm example:react-video') &&
    files.readme.includes('pnpm example:threaded-chat') &&
    files.zhReadme.includes('pnpm example:threaded-chat') &&
    files.readme.includes('pnpm example:agent-run') &&
    files.zhReadme.includes('pnpm example:agent-run') &&
    files.readme.includes('/docs/guide/choosing.md') &&
    files.zhReadme.includes('/docs/zh/guide/choosing.md') &&
    files.readme.includes('/docs/guide/task-demos.md') &&
    files.zhReadme.includes('/docs/zh/guide/task-demos.md') &&
    files.readme.includes('/docs/guide/production-checklist.md') &&
    files.zhReadme.includes('/docs/zh/guide/production-checklist.md') &&
    files.readme.includes('/docs/guide/upgrade-0.4.md') &&
    files.zhReadme.includes('/docs/zh/guide/upgrade-0.4.md') &&
    files.readme.includes('/docs/guide/upgrade-0.3.md') &&
    files.zhReadme.includes('/docs/zh/guide/upgrade-0.3.md') &&
    files.readme.includes('/docs/guide/ai-sdk-migration.md') &&
    files.zhReadme.includes('/docs/zh/guide/ai-sdk-migration.md') &&
    files.readme.includes('/docs/guide/agent-bridge.md') &&
    files.zhReadme.includes('/docs/zh/guide/agent-bridge.md') &&
    files.readme.includes('/docs/guide/agent-route-templates.md') &&
    files.zhReadme.includes('/docs/zh/guide/agent-route-templates.md') &&
    files.readme.includes('/docs/guide/proxy-recipes.md') &&
    files.zhReadme.includes('/docs/zh/guide/proxy-recipes.md') &&
    files.readme.includes('/docs/guide/server-storage.md') &&
    files.zhReadme.includes('/docs/zh/guide/server-storage.md') &&
    files.readme.includes('/docs/guide/regenerate-branches.md') &&
    files.zhReadme.includes('/docs/zh/guide/regenerate-branches.md') &&
    files.readme.includes('/docs/guide/tool-approvals.md') &&
    files.zhReadme.includes('/docs/zh/guide/tool-approvals.md') &&
    files.readme.includes('Nuxt/Nitro, Next.js, Hono, Express, Fastify, or Fetch') &&
    files.zhReadme.includes('Nuxt/Nitro、Next.js、Hono、Express、Fastify 或 Fetch') &&
    files.readme.includes('PROXY_UPSTREAM_BASE_URL') &&
    files.zhReadme.includes('PROXY_UPSTREAM_BASE_URL') &&
    files.readme.includes('PROXY_UPSTREAM_TIMEOUT_MS') &&
    files.zhReadme.includes('PROXY_UPSTREAM_TIMEOUT_MS') &&
    files.readme.includes('sanitized retryable errors') &&
    files.zhReadme.includes('脱敏') &&
    files.readme.includes(
      '[ROADMAP.md](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/ROADMAP.md)'
    ) &&
    files.zhReadme.includes(
      '[ROADMAP.md](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/ROADMAP.md)'
    ) &&
    /GitHub\s+issue 只记录可复现 bug/.test(files.zhReadme),
  'Readmes must explain no-key chat defaults, list image/video/object examples, and link upgrade/migration guidance'
)

for (const snippet of [
  'moonshot({ apiKey:',
  'zhipu({ apiKey:',
  "ollama({ defaultModel: 'qwen3:8b' })",
  "vllm({ defaultModel: 'served-model' })"
]) {
  expect(files.readme.includes(snippet), `English README must include provider preset: ${snippet}`)
  expect(
    files.gettingStarted.includes(snippet),
    `English getting started must include provider preset: ${snippet}`
  )
}

for (const snippet of [
  'moonshot({ apiKey:',
  'zhipu({ apiKey:',
  "ollama({ defaultModel: 'qwen3:8b' })",
  "vllm({ defaultModel: 'served-model' })"
]) {
  expect(
    files.zhReadme.includes(snippet),
    `Chinese README must include provider preset: ${snippet}`
  )
  expect(
    files.zhGettingStarted.includes(snippet),
    `Chinese getting started must include provider preset: ${snippet}`
  )
}

expect(
  files.competitiveBenchmark.includes('## Current checkpoint against direct alternatives') &&
    files.competitiveBenchmark.includes('In-scope direct benchmark score: **8 / 8**') &&
    files.competitiveBenchmark.includes('Current execution score (snapshot: 2026-07-04)') &&
    files.competitiveBenchmark.includes('Next 30-day target:') &&
    files.zhCompetitiveBenchmark.includes('## 与目标的一致性') &&
    files.zhCompetitiveBenchmark.includes('范围内直对标基准分：**8 / 8**') &&
    files.zhCompetitiveBenchmark.includes('当前执行进度（快照：2026-07-04）') &&
    files.zhCompetitiveBenchmark.includes('下 30 天目标') &&
    files.zhCompetitiveBenchmark.includes('可观测化'),
  'Competitive benchmark docs must align score and snapshot wording between English and Chinese'
)

for (const snippet of [
  '`moonshot(config)`',
  '`zhipu(config)`',
  '`ollama(config)`',
  '`vllm(config)`',
  '`MoonshotConfig`',
  '`ZhipuConfig`',
  '`ZhipuEndpoint`',
  '`OllamaConfig`',
  '`VllmConfig`'
]) {
  expect(files.providers.includes(snippet), `English provider reference must include: ${snippet}`)
  expect(files.zhProviders.includes(snippet), `Chinese provider reference must include: ${snippet}`)
}

for (const snippet of [
  '# React hooks',
  '`useChat`, `useCompletion`, and `useObject`',
  'import { useChat, useCompletion, useImage, useObject, useVideo } from',
  'pnpm example:react-chat',
  'pnpm example:react-video',
  'DirectChatTransport',
  'examples/react-chat/App.tsx',
  'examples/react-video/App.tsx',
  'CompletionBox',
  'ObjectBox',
  '`useCompletion(options)` accepts `UseReactCompletionOptions`',
  '`UseReactCompletionReturn` exposes plain React state and actions',
  '`useObject(options)` accepts `UseReactObjectOptions<T>`',
  '`UseReactObjectReturn<T>` exposes plain React state and actions',
  '`useVideo(options)` accepts `UseReactVideoOptions`',
  '`UseReactVideoReturn` exposes plain React state and actions',
  'complete(prompt?, options?)',
  'generateVideo(prompt?, options?)',
  'submit(prompt?, options?)',
  'Retry controls; retries only happen before the first streamed text delta'
]) {
  expect(files.react.includes(snippet), `English React reference must include: ${snippet}`)
}

for (const snippet of [
  '# React hooks',
  'React 版 `useChat`、',
  '`useCompletion`',
  '`useObject`',
  'import { useChat, useCompletion, useImage, useObject, useVideo } from',
  'pnpm example:react-chat',
  'pnpm example:react-video',
  'DirectChatTransport',
  'examples/react-chat/App.tsx',
  'examples/react-video/App.tsx',
  'CompletionBox',
  'ObjectBox',
  '`useCompletion(options)` 接收 `UseReactCompletionOptions`',
  '`UseReactCompletionReturn` 暴露普通 React state 和操作',
  '`useObject(options)` 接收 `UseReactObjectOptions<T>`',
  '`UseReactObjectReturn<T>` 暴露普通 React state 和操作',
  '`useVideo(options)` 接收 `UseReactVideoOptions`',
  '`UseReactVideoReturn` 暴露常规 React state 和操作',
  'complete(prompt?, options?)',
  'generateVideo(prompt?, options?)',
  'submit(prompt?, options?)',
  '只有首个文本 delta 到达前的失败会重试'
]) {
  expect(files.zhReact.includes(snippet), `Chinese React reference must include: ${snippet}`)
}

for (const snippet of [
  '# Roadmap',
  'GitHub issues are reserved for',
  'reproducible bugs',
  'Shipped through 0.9.x',
  '0.10.x',
  '0.11.x',
  '0.12.x',
  '0.13.x',
  '0.14.x',
  'AgentEvent',
  'LangChain',
  'LangGraph',
  'useChatThreads',
  'server storage',
  'regenerate/branch',
  'idempotent `runId`',
  'safe approval renderer contracts',
  'inspection',
  'provider presets',
  'React',
  'Non-goals'
]) {
  expect(files.roadmap.includes(snippet), `Roadmap must include: ${snippet}`)
}

for (const snippet of [
  '# Inspection',
  'lastRequest',
  'lastResponse',
  'clearTrace()',
  'inspectRequestTrace',
  'createInspectionCurl',
  'timeline',
  'curl: true',
  'classifies errors',
  'hasCause',
  'submit-user-message',
  'Request trace',
  'Debugging checklist',
  'Production path',
  'provider credentials',
  'persistence load failed',
  'persistence save failed',
  'persistence clear failed'
]) {
  expect(files.inspection.includes(snippet), `English inspection guide must include: ${snippet}`)
}

for (const snippet of [
  '# 调试检查',
  'lastRequest',
  'lastResponse',
  'clearTrace()',
  'inspectRequestTrace',
  'createInspectionCurl',
  'timeline',
  'curl: true',
  'hasCause',
  'submit-user-message',
  '请求 trace',
  '排查清单',
  '生产路径',
  'Provider 凭据',
  'persistence load failed',
  'persistence save failed',
  'persistence clear failed'
]) {
  expect(files.zhInspection.includes(snippet), `Chinese inspection guide must include: ${snippet}`)
}

for (const snippet of [
  '# Choosing vue-ai-hooks',
  'Short answer',
  'Current positioning map',
  'Snapshot date: 2026-07-03',
  'claim that every row is a competitor',
  'Direct alternative',
  'Product-adjacent benchmark',
  'not as the API shape to copy',
  'Backend complement, not UI competitor',
  'Vue DX benchmark, not AI competitor',
  'Decision table',
  'Vercel AI SDK',
  'CopilotKit',
  'LangChain.js',
  'Direct fetch and SSE parsing',
  'VueUse',
  'Build a product-specific AI UI without buying a shell',
  'Drop in a full copilot panel tied to agent protocols',
  'framework SDKs',
  'Vue composables and components',
  'AG-UI docs',
  'event-based SSE protocol',
  'Architecture fit',
  'What this package intentionally does not own',
  '## Competitive speed-to-first-chat matrix',
  'Job to complete in your first week'
]) {
  expect(files.choosing.includes(snippet), `English choosing guide must include: ${snippet}`)
}

for (const snippet of [
  '# 选择 vue-ai-hooks',
  '简短结论',
  '当前定位图',
  '快照日期：2026-07-03',
  '不是把每一行都定义为竞品',
  '直接替代',
  '产品相邻标杆',
  '不是要照搬的 API',
  '后端互补层，不是 UI 竞品',
  'Vue DX 标杆，不是 AI 竞品',
  '决策表',
  'Vercel AI SDK',
  'CopilotKit',
  'LangChain.js',
  '手写 fetch 和 SSE 解析',
  'VueUse',
  '构建强产品定制的 AI UI，不接入成品外壳',
  '快速放入接入 agent 协议的完整 copilot 面板',
  'Vue composables 和 components',
  'event-based SSE',
  '架构适配',
  '本包刻意不负责什么',
  '## 一次上手决策矩阵',
  '一周内要落地的任务'
]) {
  expect(files.zhChoosing.includes(snippet), `Chinese choosing guide must include: ${snippet}`)
}

for (const snippet of [
  '# Proxy recipes',
  'Production browser apps should call app-owned routes',
  '## No-key local check',
  'VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat',
  '## OpenAI-compatible upstream',
  'PROXY_UPSTREAM_BASE_URL=https://api.openai.com/v1',
  'PROXY_UPSTREAM_API_KEY=$OPENAI_API_KEY',
  'PROXY_UPSTREAM_MODEL=gpt-4.1-mini',
  '## Timeout, trace, and safe errors',
  'PROXY_UPSTREAM_TIMEOUT_MS=30000',
  'PROXY_UPSTREAM_TRACE_HEADER=x-request-id',
  'upstream_timeout',
  'retryable: true',
  '## Local Ollama',
  'PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1',
  'PROXY_UPSTREAM_TIMEOUT_MS=60000',
  '## vLLM gateway',
  'python -m vllm.entrypoints.openai.api_server',
  '## Private OpenAI-compatible gateway',
  'PROXY_UPSTREAM_TRACE_HEADER=x-correlation-id',
  'PROXY_UPSTREAM_CHAT_PATH=/chat/completions',
  '## Client wiring',
  "useChat({ baseURL: 'http://127.0.0.1:8787' })",
  'proxyProvider({',
  '## Production checklist',
  'Keep provider keys in server-only environment variables',
  'Convert provider `429` and `5xx` responses into sanitized retryable errors'
]) {
  expect(files.proxyRecipes.includes(snippet), `English proxy recipes must include: ${snippet}`)
}

for (const snippet of [
  '# Proxy 配方',
  '生产环境的浏览器应用应调用应用自己的后端路由',
  '## 不需要 key 的本地检查',
  'VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat',
  '## OpenAI-compatible 上游',
  'PROXY_UPSTREAM_BASE_URL=https://api.openai.com/v1',
  'PROXY_UPSTREAM_API_KEY=$OPENAI_API_KEY',
  'PROXY_UPSTREAM_MODEL=gpt-4.1-mini',
  '## 超时、trace 和安全错误',
  'PROXY_UPSTREAM_TIMEOUT_MS=30000',
  'PROXY_UPSTREAM_TRACE_HEADER=x-request-id',
  'upstream_timeout',
  'retryable: true',
  '## 本地 Ollama',
  'PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1',
  'PROXY_UPSTREAM_TIMEOUT_MS=60000',
  '## vLLM 网关',
  'python -m vllm.entrypoints.openai.api_server',
  '## 私有 OpenAI-compatible 网关',
  'PROXY_UPSTREAM_TRACE_HEADER=x-correlation-id',
  'PROXY_UPSTREAM_CHAT_PATH=/chat/completions',
  '## 客户端接入',
  "useChat({ baseURL: 'http://127.0.0.1:8787' })",
  'proxyProvider({',
  '## 生产检查清单',
  'Provider key 只放在服务端环境变量里',
  '把 Provider `429` 和 `5xx` 响应转换成脱敏的 retryable 错误'
]) {
  expect(files.zhProxyRecipes.includes(snippet), `Chinese proxy recipes must include: ${snippet}`)
}

for (const snippet of [
  '# Upgrade to v0.4.0',
  'currently on `vue-ai-hooks@0.3.x`',
  'v0.4.0 does not intentionally remove or rename documented public exports',
  'pnpm add vue-ai-hooks@^0.4.0',
  'pnpm release:check',
  'Chat instances',
  'useChat({ chat: supportChat })',
  'Video generation',
  'pnpm example:video',
  'UI message stream utilities',
  '/api/ui-message-stream',
  'Transport migration',
  'DefaultChatTransport',
  'DirectChatTransport({ onError })',
  'Model message conversion',
  'ignoreIncompleteToolCalls',
  'stepCountIs()',
  'Persisted message validation',
  'Recommended migration order'
]) {
  expect(files.upgrade04.includes(snippet), `English v0.4.0 upgrade guide must include: ${snippet}`)
}

for (const snippet of [
  '# 升级到 v0.4.0',
  '当前使用 `vue-ai-hooks@0.3.x`',
  'v0.4.0 不会有意移除或重命名',
  'pnpm add vue-ai-hooks@^0.4.0',
  'pnpm release:check',
  'Chat 实例',
  'useChat({ chat: supportChat })',
  '视频生成',
  'pnpm example:video',
  'UI message stream 工具',
  '/api/ui-message-stream',
  'Transport 迁移',
  'DefaultChatTransport',
  'DirectChatTransport({ onError })',
  'Model message 转换',
  'ignoreIncompleteToolCalls',
  'stepCountIs()',
  '持久化消息校验',
  '推荐迁移顺序'
]) {
  expect(
    files.zhUpgrade04.includes(snippet),
    `Chinese v0.4.0 upgrade guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# Upgrade to v0.3.0',
  'currently on `vue-ai-hooks@0.2.1`',
  'v0.3.0 does not intentionally remove or rename documented public exports',
  'pnpm add vue-ai-hooks@^0.3.0',
  'pnpm release:check',
  'Default proxy transports',
  'Request inspection',
  'Provider fallback',
  'Direct provider timeouts',
  'DeepSeek helper',
  'Recommended migration order'
]) {
  expect(files.upgrade03.includes(snippet), `English v0.3.0 upgrade guide must include: ${snippet}`)
}

for (const snippet of [
  '# 升级到 v0.3.0',
  '当前使用 `vue-ai-hooks@0.2.1`',
  'v0.3.0 不会有意移除或重命名',
  'pnpm add vue-ai-hooks@^0.3.0',
  'pnpm release:check',
  '默认 proxy transport',
  '请求检查',
  'Provider fallback',
  '直连 Provider 超时',
  'DeepSeek helper',
  '推荐迁移顺序'
]) {
  expect(
    files.zhUpgrade03.includes(snippet),
    `Chinese v0.3.0 upgrade guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# AI SDK migration',
  'AI SDK `useChat` reference',
  'Quick mapping',
  'new Chat(...)',
  'useChat({ chat })',
  'AI SDK Core video generation',
  'AI SDK Core transcription',
  'AI SDK Core reranking',
  'DefaultChatTransport',
  'DirectChatTransport',
  'onError',
  'transport` or `provider`',
  'input`, `setInput()`, `handleInputChange()`',
  'addToolApprovalResponse()',
  'tool()` / `dynamicTool()`',
  'stopWhen',
  "streamProtocol: 'text'",
  'UI message stream protocol',
  'Migration checklist'
]) {
  expect(
    files.aiSdkMigration.includes(snippet),
    `English AI SDK migration guide must include: ${snippet}`
  )
}

for (const snippet of [
  '# AI SDK 迁移',
  'AI SDK `useChat` 参考',
  '快速映射',
  'new Chat(...)',
  'useChat({ chat })',
  'AI SDK Core 视频生成',
  'AI SDK Core 音频转写',
  'AI SDK Core 文档重排',
  'DefaultChatTransport',
  'DirectChatTransport',
  'onError',
  'transport` 或 `provider`',
  'input`、`setInput()`、`handleInputChange()`',
  'addToolApprovalResponse()',
  'tool()` / `dynamicTool()`',
  'stopWhen',
  "streamProtocol: 'text'",
  'UI message stream 协议',
  '迁移清单'
]) {
  expect(
    files.zhAiSdkMigration.includes(snippet),
    `Chinese AI SDK migration guide must include: ${snippet}`
  )
}
expect(
  files.providers.includes("Set `streamProtocol: 'text'` on a") &&
    files.zhProviders.includes("`streamProtocol: 'text'`") &&
    files.readme.includes("useChat({ streamProtocol: 'text' })") &&
    files.zhReadme.includes("useChat({ streamProtocol: 'text' })"),
  'English and Chinese docs must document chat text stream protocol compatibility'
)
expect(
  files.providers.includes('`onError`') &&
    files.providers.includes('createUIMessageStream({ onError })') &&
    files.zhProviders.includes('`onError`') &&
    files.zhProviders.includes('createUIMessageStream({ onError })') &&
    files.aiSdkMigration.includes('Use `onError`') &&
    files.zhAiSdkMigration.includes('使用 `onError`'),
  'DirectChatTransport docs must explain UI-message onError sanitization in English and Chinese'
)
expect(
  files.providers.includes('## `DefaultChatTransport`') &&
    files.providers.includes('DefaultChatTransportOptions') &&
    files.providers.includes('new DefaultChatTransport') &&
    files.providers.includes('prepareSendMessagesRequest') &&
    files.providers.includes('prepareReconnectToStreamRequest') &&
    files.zhProviders.includes('## `DefaultChatTransport`') &&
    files.zhProviders.includes('DefaultChatTransportOptions') &&
    files.zhProviders.includes('new DefaultChatTransport') &&
    files.zhProviders.includes('prepareSendMessagesRequest') &&
    files.zhProviders.includes('prepareReconnectToStreamRequest') &&
    files.aiSdkMigration.includes('new DefaultChatTransport') &&
    files.aiSdkMigration.includes('prepareSendMessagesRequest') &&
    files.zhAiSdkMigration.includes('new DefaultChatTransport') &&
    files.zhAiSdkMigration.includes('prepareSendMessagesRequest'),
  'Provider and migration docs must expose AI SDK-style DefaultChatTransport endpoints and prepare hooks'
)
expect(
  files.packageJson.includes('"example:image"') &&
    files.packageJson.includes('"image:check"') &&
    files.packageJson.includes('"example:threaded-chat"') &&
    files.packageJson.includes('"example:threaded-chat:build"') &&
    files.packageJson.includes('pnpm example:threaded-chat:build') &&
    files.packageJson.includes('"example:agent-run"') &&
    files.packageJson.includes('"example:agent-run:build"') &&
    files.packageJson.includes('pnpm example:agent-run:build') &&
    files.packageJson.includes('"agent-run:check"') &&
    files.packageJson.includes('pnpm agent-run:check') &&
    files.packageJson.includes('"example:react-video"') &&
    files.packageJson.includes('"example:react-video:build"') &&
    files.packageJson.includes('pnpm example:react-video:build') &&
    files.packageJson.includes('"react-video:check"') &&
    files.packageJson.includes('pnpm react-video:check') &&
    files.packageJson.includes('"example:image:build"') &&
    files.packageJson.includes('pnpm example:image:build') &&
    files.packageJson.includes('pnpm image:check') &&
    files.packageJson.includes('"example:video"') &&
    files.packageJson.includes('"example:video:build"') &&
    files.packageJson.includes('pnpm example:video:build') &&
    files.packageJson.includes('"example:speech"') &&
    files.packageJson.includes('"example:speech:build"') &&
    files.packageJson.includes('pnpm example:speech:build') &&
    files.packageJson.includes('"example:transcription"') &&
    files.packageJson.includes('"example:transcription:build"') &&
    files.packageJson.includes('pnpm example:transcription:build') &&
    files.packageJson.includes('"example:rerank"') &&
    files.packageJson.includes('"example:rerank:build"') &&
    files.packageJson.includes('pnpm example:rerank:build') &&
    files.packageJson.includes('"example:object"') &&
    files.packageJson.includes('"example:object:build"') &&
    files.packageJson.includes('pnpm example:object:build'),
  'package scripts must expose and build the threaded chat, agent run, React video, image, video, speech, transcription, rerank, and object examples'
)

expect(
  files.examples.includes('<DemoShowcase locale="en" />'),
  'English examples page must render DemoShowcase with locale="en"'
)
expect(
  files.zhExamples.includes('<DemoShowcase locale="zh" />'),
  'Chinese examples page must render DemoShowcase with locale="zh"'
)

for (const snippet of [
  '## Run the no-key demo first',
  'pnpm example:chat',
  'pnpm example:threaded-chat',
  'pnpm example:agent-run',
  'pnpm example:react-video',
  'useChatThreads()',
  'per-thread `useChat({ persist })`',
  'deterministic `local-tools` provider',
  'click **Run approval demo**',
  '`/api/image`, `/api/video`, `/api/speech`, `/api/transcription`, `/api/object`, and',
  '`/api/rerank`',
  '`/api/ui-message-stream`',
  'useAgentContext()',
  'usePromptSuggestions()',
  'useAgentRun()',
  'approvePlan',
  'Inspection snapshot',
  'pnpm example:image',
  'deterministic local SVG',
  'editImage()',
  'proxy `/api/image`',
  'pnpm example:video',
  'deterministic local storyboard',
  '`/api/video` route',
  'pnpm example:speech',
  'deterministic local WAV',
  'proxy `/api/speech`',
  'pnpm example:transcription',
  'deterministic local transcript',
  '`/api/transcription` route',
  'pnpm example:rerank',
  'local ranking by default',
  'proxy `/api/rerank`',
  '`local-object` provider',
  '## Demo acceptance checklist',
  'Validate the first demo in each lane before you decide your integration path:',
  '## Which demo should I open first?',
  'Build a chat surface, structured parts, or approval flow',
  '[Streaming chat](#chat-demo)',
  'Add thread sidebar and local restore checks',
  'Track a headless app-owned agent run',
  'Test an AI SDK UI stream backend route',
  '[UI message stream route](#stream-demo)',
  'Try the React video generation migration entry',
  'Generate or edit an image through an app route',
  '[Image generation](#image-demo)',
  'Generate a video through an app route',
  '[Video generation](#video-demo)',
  'Generate speech through an app route',
  '[Speech generation](#speech-demo)',
  'Turn audio into text through an app route',
  '[Audio transcription](#transcription-demo)',
  'Rerank search results through an app route',
  '[Document reranking](#rerank-demo)',
  '`pnpm example:embedding`',
  'Embedding similarity',
  'Compare text by semantic similarity',
  'Extract typed JSON from a prompt',
  '[Structured object output](#object-demo)'
]) {
  expect(files.examples.includes(snippet), `English examples page must include: ${snippet}`)
}

for (const snippet of [
  '## 先跑不需要 key 的 Demo',
  'pnpm example:chat',
  'pnpm example:threaded-chat',
  'pnpm example:agent-run',
  'pnpm example:react-video',
  'useChatThreads()',
  '每个 thread 独立的 `useChat({ persist })`',
  '确定性的',
  '`local-tools` Provider',
  '点击 **Run approval demo**',
  '`/api/video`',
  '`/api/transcription`、`/api/object` 和',
  '`/api/rerank`',
  '`/api/ui-message-stream`',
  'useAgentContext()',
  'usePromptSuggestions()',
  'useAgentRun()',
  'approvePlan',
  'Inspection snapshot',
  '试 React 视频生成入口',
  'pnpm example:image',
  '确定性的本地',
  'editImage()',
  'proxy `/api/image`',
  'pnpm example:video',
  'storyboard',
  'proxy `/api/video`',
  'pnpm example:speech',
  '确定性的本地',
  'proxy `/api/speech`',
  'pnpm example:transcription',
  '确定性的本地转写文本',
  'proxy `/api/transcription`',
  'pnpm example:rerank',
  '确定性的本地排序',
  'proxy `/api/rerank`',
  'pnpm example:embedding',
  '做语义相似度比较',
  '向量相似度',
  '`local-object` Provider',
  '## Demo 验收清单',
  '在决定接入路径前，先用这些条目快速验收：',
  '## 先看哪个示例？',
  '做聊天界面、结构化片段或工具审批',
  '[流式对话](#chat-demo)',
  '增加 thread 侧边栏和本地恢复验证',
  '跟踪无 UI 的自有 agent run',
  '测试 AI SDK UI stream 后端路由',
  '[UI message stream 路由](#stream-demo)',
  '通过应用后端生成或编辑图片',
  '[图片生成](#image-demo)',
  '通过应用后端生成视频',
  '[视频生成](#video-demo)',
  '通过应用后端生成语音',
  '[语音生成](#speech-demo)',
  '通过应用后端把音频转成文本',
  '[音频转写](#transcription-demo)',
  '通过应用后端重排搜索结果',
  '[文档重排](#rerank-demo)',
  '从提示词抽取类型化 JSON',
  '[结构化对象输出](#object-demo)'
]) {
  expect(files.zhExamples.includes(snippet), `Chinese examples page must include: ${snippet}`)
}

expect(
  files.demoShowcase.includes("locale: 'en'"),
  'DemoShowcase default locale must be English for root docs'
)
expect(
  files.imageExample.includes('useImage') &&
    files.imageExample.includes('createPromptSuggestionRecipes') &&
    files.imageExample.includes('usePromptSuggestions') &&
    files.imageExample.includes("surfaces: ['media']") &&
    files.imageExample.includes('visibleImageStarters') &&
    files.imageExample.includes('editImage') &&
    files.imageExample.includes('localImageFetch') &&
    files.imageExample.includes('VITE_PROXY_IMAGE_URL') &&
    files.imageExample.includes('VITE_PROXY_BASE_URL') &&
    files.imageExample.includes('source-panel') &&
    files.imageExample.includes('operation: lastRequest.value.operation') &&
    files.imageExample.includes('previewUrl') &&
    files.imageCheck.includes('editImage') &&
    files.imageCheck.includes("operation === 'edit'") &&
    files.taskDemos.includes("createPromptSuggestionRecipes({ surfaces: ['media'] })") &&
    files.zhTaskDemos.includes("createPromptSuggestionRecipes({ surfaces: ['media'] })"),
  'Image example must run generation and editing without keys, then switch to the proxy image route when configured'
)
expect(
  files.reactImageExample.includes('useImage') &&
    files.reactImageExample.includes('createPromptSuggestionRecipes') &&
    files.reactImageExample.includes('usePromptSuggestions') &&
    files.reactImageExample.includes("surfaces: ['media']") &&
    files.reactImageExample.includes('visibleSuggestions') &&
    files.reactImageExample.includes('editImage') &&
    files.reactImageExample.includes('inspectRequestTrace'),
  'React image example must run without keys, expose trace state, and render media starter chips'
)
expect(
  files.videoExample.includes('useVideo') &&
    files.videoExample.includes('createPromptSuggestionRecipes') &&
    files.videoExample.includes('usePromptSuggestions') &&
    files.videoExample.includes("surfaces: ['media']") &&
    files.videoExample.includes('visibleVideoStarters') &&
    files.videoExample.includes('localVideoFetch') &&
    files.videoExample.includes('VITE_PROXY_VIDEO_URL') &&
    files.videoExample.includes('VITE_PROXY_BASE_URL') &&
    files.videoExample.includes('previewUrl'),
  'Video example must run without keys and switch to the proxy video route when configured'
)
expect(
  files.reactVideoExample.includes('useVideo') &&
    files.reactVideoExample.includes('createPromptSuggestionRecipes') &&
    files.reactVideoExample.includes('usePromptSuggestions') &&
    files.reactVideoExample.includes("surfaces: ['media']") &&
    files.reactVideoExample.includes('visibleSuggestions') &&
    files.reactVideoExample.includes('localVideoFetch') &&
    files.reactVideoExample.includes('VITE_PROXY_VIDEO_URL') &&
    files.reactVideoExample.includes('VITE_PROXY_BASE_URL') &&
    files.reactVideoExample.includes('previewUrl') &&
    files.reactVideoExample.includes('inspectRequestTrace') &&
    files.reactVideoCheck.includes('VITE_PROXY_VIDEO_URL'),
  'React video example must run without keys, expose trace state, and switch to the proxy video route when configured'
)
expect(
  files.speechExample.includes('useSpeech') &&
    files.speechExample.includes('localSpeechFetch') &&
    files.speechExample.includes('VITE_PROXY_SPEECH_URL') &&
    files.speechExample.includes('VITE_PROXY_BASE_URL') &&
    files.speechExample.includes('audioUrl'),
  'Speech example must run without keys and switch to the proxy speech route when configured'
)
expect(
  files.transcriptionExample.includes('useTranscription') &&
    files.transcriptionExample.includes('localTranscriptionFetch') &&
    files.transcriptionExample.includes('VITE_PROXY_TRANSCRIPTION_URL') &&
    files.transcriptionExample.includes('VITE_PROXY_BASE_URL') &&
    files.transcriptionExample.includes('traceSummary'),
  'Transcription example must run without keys and switch to the proxy transcription route when configured'
)
expect(
  files.rerankExample.includes('useRerank') &&
    files.rerankExample.includes('localRerankFetch') &&
    files.rerankExample.includes('VITE_PROXY_RERANK_URL') &&
    files.rerankExample.includes('VITE_PROXY_BASE_URL') &&
    files.rerankExample.includes('traceSummary'),
  'Rerank example must run without keys and switch to the proxy rerank route when configured'
)
expect(
  files.objectExample.includes("id: 'local-object'") &&
    files.objectExample.includes('useObject<Ticket>') &&
    files.objectExample.includes("schemaName: 'support_ticket'") &&
    files.objectExample.includes('localObjectStream') &&
    files.objectExample.includes('chatUrl:') &&
    files.objectExample.includes("'/api/ai/object'"),
  'Object example must run without keys and support the proxy object route'
)
expect(
  files.demoShowcase.includes("localeKey === 'zh' ? 'zh-CN' : 'en'"),
  'DemoShowcase lang attribute must use the normalized locale key'
)
expect(
  files.demoShowcase.includes("quickChoiceTitle: 'Choose by job'"),
  'DemoShowcase must include an English job-based chooser'
)
expect(
  files.demoShowcase.includes("{ job: 'Image generation', pick: 'useImage' }") &&
    files.demoShowcase.includes("{ job: 'Video generation', pick: 'useVideo' }") &&
    files.demoShowcase.includes("{ job: 'Speech generation', pick: 'useSpeech' }") &&
    files.demoShowcase.includes("{ job: 'Audio transcription', pick: 'useTranscription' }") &&
    files.demoShowcase.includes("{ job: 'Document reranking', pick: 'useRerank' }") &&
    files.demoShowcase.includes(
      "{ job: 'Thread sidebar and local restore', pick: 'useChatThreads' }"
    ) &&
    files.demoShowcase.includes("{ job: 'Custom generation job', pick: 'useGeneration' }") &&
    files.demoShowcase.includes("{ job: 'Runtime app context', pick: 'useAgentContext' }") &&
    files.demoShowcase.includes(
      "{ job: 'Runtime capability flags', pick: 'useAgentCapabilities' }"
    ) &&
    files.demoShowcase.includes("{ job: 'Headless agent run state', pick: 'useAgentRun' }") &&
    files.demoShowcase.includes(
      "{ job: 'Composer task starters', pick: 'usePromptSuggestions' }"
    ) &&
    files.demoShowcase.includes("{ label: 'Runnable examples', value: '15' }") &&
    files.demoShowcase.includes("{ label: 'Demo panels', value: '10' }") &&
    files.demoShowcase.includes("{ label: 'Image', href: '#image-demo' }") &&
    files.demoShowcase.includes("{ label: 'Video', href: '#video-demo' }") &&
    files.demoShowcase.includes("{ label: 'Speech', href: '#speech-demo' }") &&
    files.demoShowcase.includes("{ label: 'Transcription', href: '#transcription-demo' }") &&
    files.demoShowcase.includes("{ label: 'Rerank', href: '#rerank-demo' }") &&
    files.demoShowcase.includes("{ label: 'Streams', href: '#stream-demo' }") &&
    files.demoShowcase.includes("{ label: 'useImage API', href: '#image-demo-api' }") &&
    files.demoShowcase.includes("{ label: 'Stream API', href: '#stream-demo-api' }") &&
    files.demoShowcase.includes("{ label: 'useSpeech API', href: '#speech-demo-api' }") &&
    files.demoShowcase.includes(
      "{ label: 'useTranscription API', href: '#transcription-demo-api' }"
    ) &&
    files.demoShowcase.includes("{ label: 'useRerank API', href: '#rerank-demo-api' }") &&
    files.demoShowcase.includes('const imageCode = computed') &&
    files.demoShowcase.includes("{ label: 'useVideo API', href: '#video-demo-api' }") &&
    files.demoShowcase.includes('const videoCode = computed') &&
    files.demoShowcase.includes('const speechCode = computed') &&
    files.demoShowcase.includes('const transcriptionCode = computed') &&
    files.demoShowcase.includes('const rerankCode = computed') &&
    files.demoShowcase.includes('const streamCode = computed') &&
    files.demoShowcase.includes("name: 'useVideo'") &&
    files.demoShowcase.includes("name: 'useChatThreads'") &&
    files.demoShowcase.includes("name: 'useAgentCapabilities'") &&
    files.demoShowcase.includes('id="image-demo"') &&
    files.demoShowcase.includes('id="stream-demo"') &&
    files.demoShowcase.includes('id="video-demo"') &&
    files.demoShowcase.includes('id="speech-demo"') &&
    files.demoShowcase.includes('id="transcription-demo"') &&
    files.demoShowcase.includes('id="rerank-demo"'),
  'DemoShowcase must include the stream, image, video, speech, transcription, and rerank demos and API shortcuts'
)
expect(
  files.demoShowcase.includes("quickChoiceTitle: '按任务选择'"),
  'DemoShowcase must include a Chinese job-based chooser'
)
expect(
  files.demoShowcase.includes("{ job: '视频生成', pick: 'useVideo' }") &&
    files.demoShowcase.includes("{ job: '语音生成', pick: 'useSpeech' }") &&
    files.demoShowcase.includes("{ job: '音频转写', pick: 'useTranscription' }") &&
    files.demoShowcase.includes("{ job: '文档重排', pick: 'useRerank' }") &&
    files.demoShowcase.includes("{ job: 'Thread 侧边栏和本地恢复', pick: 'useChatThreads' }") &&
    files.demoShowcase.includes("{ job: '自定义生成任务', pick: 'useGeneration' }") &&
    files.demoShowcase.includes("{ job: '运行时应用上下文', pick: 'useAgentContext' }") &&
    files.demoShowcase.includes("{ job: '运行时能力开关', pick: 'useAgentCapabilities' }") &&
    files.demoShowcase.includes("{ job: '无 UI Agent run 状态', pick: 'useAgentRun' }") &&
    files.demoShowcase.includes("{ job: '输入区任务入口', pick: 'usePromptSuggestions' }") &&
    files.demoShowcase.includes("{ label: '可运行示例', value: '15' }") &&
    files.demoShowcase.includes("{ label: '展示面板', value: '10' }") &&
    files.demoShowcase.includes("{ label: '视频', href: '#video-demo' }") &&
    files.demoShowcase.includes("{ label: '语音', href: '#speech-demo' }") &&
    files.demoShowcase.includes("{ label: '转写', href: '#transcription-demo' }") &&
    files.demoShowcase.includes("{ label: '重排', href: '#rerank-demo' }") &&
    files.demoShowcase.includes("{ label: 'Stream', href: '#stream-demo' }") &&
    files.demoShowcase.includes("{ label: 'useVideo 接口', href: '#video-demo-api' }") &&
    files.demoShowcase.includes("{ label: 'Stream 接口', href: '#stream-demo-api' }") &&
    files.demoShowcase.includes("{ label: 'useSpeech 接口', href: '#speech-demo-api' }") &&
    files.demoShowcase.includes(
      "{ label: 'useTranscription 接口', href: '#transcription-demo-api' }"
    ) &&
    files.demoShowcase.includes("{ label: 'useRerank 接口', href: '#rerank-demo-api' }"),
  'DemoShowcase must include the Chinese stream, video, speech, transcription, and rerank demos and API shortcuts'
)
expect(
  files.demoShowcase.includes('createUIMessageStreamResponse') &&
    files.demoShowcase.includes('/api/ui-message-stream') &&
    files.demoShowcase.includes('readUIMessageStream({ response })') &&
    files.demoShowcase.includes("title: 'UI message stream route'") &&
    files.demoShowcase.includes("title: 'UI message stream 路由'"),
  'DemoShowcase must include copyable UI message stream route examples in English and Chinese'
)
expect(
  files.streams.includes('pnpm example:proxy-server') &&
    files.streams.includes('/api/ui-message-stream') &&
    files.streams.includes('readUIMessageStream()') &&
    files.streams.includes('readAgentEvents') &&
    files.streams.includes('readAgentEventStream') &&
    files.streams.includes('agentEventToUIMessageStreamPart') &&
    files.streams.includes('data-agent-interrupt') &&
    files.zhStreams.includes('pnpm example:proxy-server') &&
    files.zhStreams.includes('/api/ui-message-stream') &&
    files.zhStreams.includes('readUIMessageStream()') &&
    files.zhStreams.includes('readAgentEvents') &&
    files.zhStreams.includes('readAgentEventStream') &&
    files.zhStreams.includes('agentEventToUIMessageStreamPart') &&
    files.zhStreams.includes('data-agent-interrupt') &&
    files.readme.includes('/api/ui-message-stream') &&
    files.zhReadme.includes('/api/ui-message-stream') &&
    files.proxyServer.includes("uiMessageStream: new Set(['/api/ui-message-stream'") &&
    files.proxyServer.includes('async function handleUIMessageStream') &&
    files.proxyServer.includes("type: 'text-delta'") &&
    files.proxyServer.includes("type: 'finish'"),
  'Stream reference docs, READMEs, and proxy server must expose the runnable UI message stream route'
)
expect(
  files.demoShowcase.includes('const attachments = fileInput.value?.files ?? undefined'),
  'DemoShowcase chat code sample must show FileList attachments'
)
expect(
  files.demoShowcase.includes('handleSubmit(event, { attachments })'),
  'DemoShowcase chat code sample must use handleSubmit for copyable form wiring'
)
expect(
  files.demoShowcase.includes("id: 'support-thread-1'") &&
    files.demoShowcase.includes("initialInput: 'Review this release note.'") &&
    files.demoShowcase.includes("initialInput: '检查这段发布说明。'"),
  'DemoShowcase chat code sample must show shared id state and seeded input'
)
expect(
  files.demoShowcase.includes('messages: pruneMessages({') &&
    files.demoShowcase.includes("reasoning: 'before-last-message'") &&
    files.demoShowcase.includes("toolCalls: 'before-last-message'"),
  'DemoShowcase chat code sample must show message pruning before provider requests'
)
expect(
  files.demoShowcase.includes('persist: {') &&
    files.demoShowcase.includes("key: 'support-thread-1'") &&
    files.demoShowcase.includes("type: 'ChatPersistOptions'"),
  'DemoShowcase chat code sample and API table must show message persistence'
)
expect(
  files.demoShowcase.includes('structured Message.parts') &&
    files.demoShowcase.includes('const visibleParts = computed(() =>') &&
    files.demoShowcase.includes('const 可见Parts = computed(() =>') &&
    files.demoShowcase.includes('message-part-strip') &&
    files.demoShowcase.includes('messages[].parts'),
  'DemoShowcase chat preview and code sample must show structured Message.parts'
)
expect(
  files.demoShowcase.includes("attachment: 'Attached: dashboard.png + release-notes.txt'"),
  'DemoShowcase English chat preview must surface attached files'
)
expect(
  files.demoShowcase.includes("attachment: '已附加：dashboard.png + release-notes.txt'"),
  'DemoShowcase Chinese chat preview must surface attached files'
)
expect(
  files.demoShowcase.includes("persistence: 'Saved locally: support-thread-1 · Date-safe history'"),
  'DemoShowcase English chat preview must surface Date-safe persistence'
)
expect(
  files.demoShowcase.includes("persistence: '已本地保存：support-thread-1 · Date-safe 历史'"),
  'DemoShowcase Chinese chat preview must surface Date-safe persistence'
)
expect(
  files.useChat.includes('## File attachments') &&
    files.useChat.includes('<form @submit="handleSubmit">') &&
    files.useChat.includes('handleSubmit(event, {') &&
    files.useChat.includes('attachments: fileInput.value?.files ?? undefined') &&
    files.useChat.includes("{ name: 'screenshot.png', type: 'image/png', url: uploadedImageUrl }"),
  'English useChat docs must show copyable form, file, and preloaded attachment examples'
)
expect(
  files.zhUseChat.includes('## 文件附件') &&
    files.zhUseChat.includes('<form @submit="handleSubmit">') &&
    files.zhUseChat.includes('handleSubmit(event, {') &&
    files.zhUseChat.includes('attachments: fileInput.value?.files ?? undefined') &&
    files.zhUseChat.includes(
      "{ name: 'screenshot.png', type: 'image/png', url: uploadedImageUrl }"
    ),
  'Chinese useChat docs must show copyable form, file, and preloaded attachment examples'
)
expect(
  files.useChat.includes('shares in-memory chat state') &&
    files.useChat.includes('initialMessages') &&
    files.useChat.includes('initialInput') &&
    files.useChat.includes('AI SDK-style alias for `initialMessages`') &&
    files.useChat.includes('It does not rebind the current refs'),
  'English useChat docs must explain same-id shared chat state, messages alias, and setId boundaries'
)
expect(
  files.useChat.includes('## Lifecycle callbacks') &&
    files.useChat.includes('info.isDisconnect') &&
    files.useChat.includes('isDisconnect: true'),
  'English useChat docs must document disconnect-aware finish callbacks'
)
expect(
  files.useChat.includes('lastRequest') &&
    files.useChat.includes('lastResponse') &&
    files.useChat.includes('clearTrace()') &&
    files.useChat.includes('aiSdkTrigger') &&
    files.useChat.includes('submit-user-message') &&
    files.zhUseChat.includes('lastRequest') &&
    files.zhUseChat.includes('lastResponse') &&
    files.zhUseChat.includes('clearTrace()') &&
    files.zhUseChat.includes('aiSdkTrigger') &&
    files.zhUseChat.includes('submit-user-message') &&
    files.readme.includes('lastRequest') &&
    files.zhReadme.includes('lastRequest') &&
    files.chatExample.includes('lastRequest') &&
    files.chatExample.includes('trace-panel'),
  'Docs and chat example must surface provider request trace refs'
)
expect(
  files.types.includes('aiSdkTrigger?:') &&
    files.types.includes('regenerate-assistant-message') &&
    files.zhTypes.includes('aiSdkTrigger?:') &&
    files.zhTypes.includes('regenerate-assistant-message'),
  'Public type docs must expose AI SDK-style chat trigger metadata'
)
expect(
  files.useObject.includes('initialInput') &&
    files.useObject.includes('setInput(value)') &&
    files.useObject.includes('handleInputChange(e)') &&
    files.useObject.includes('handleSubmit(e, opts?)') &&
    files.useObject.includes('Provider or parse failures leave the input intact') &&
    files.zhUseObject.includes('initialInput') &&
    files.zhUseObject.includes('setInput(value)') &&
    files.zhUseObject.includes('handleInputChange(e)') &&
    files.zhUseObject.includes('handleSubmit(e, opts?)') &&
    files.zhUseObject.includes('Provider 或解析失败时会保留输入') &&
    files.useEmbedding.includes('initialInput') &&
    files.useEmbedding.includes('input`') &&
    files.useEmbedding.includes('setInput(value)') &&
    files.useEmbedding.includes('handleInputChange(e)') &&
    files.useEmbedding.includes('handleSubmit(e, opts?)') &&
    files.useEmbedding.includes('Provider errors leave the text available for retry') &&
    files.useEmbedding.includes('## Vector similarity') &&
    files.useEmbedding.includes('cosineSimilarity(vectorA, vectorB)') &&
    files.zhUseEmbedding.includes('initialInput') &&
    files.zhUseEmbedding.includes('input`') &&
    files.zhUseEmbedding.includes('setInput(value)') &&
    files.zhUseEmbedding.includes('handleInputChange(e)') &&
    files.zhUseEmbedding.includes('handleSubmit(e, opts?)') &&
    files.zhUseEmbedding.includes('Provider 错误会保留文本') &&
    files.zhUseEmbedding.includes('## 向量相似度') &&
    files.zhUseEmbedding.includes('cosineSimilarity(vectorA, vectorB)') &&
    files.useVideo.includes('initialInput') &&
    files.useVideo.includes('video`') &&
    files.useVideo.includes('setInput(value)') &&
    files.useVideo.includes('handleInputChange(e)') &&
    files.useVideo.includes('handleSubmit(e, opts?)') &&
    files.useVideo.includes('Backend errors leave the prompt available for retry') &&
    files.zhUseVideo.includes('initialInput') &&
    files.zhUseVideo.includes('video`') &&
    files.zhUseVideo.includes('setInput(value)') &&
    files.zhUseVideo.includes('handleInputChange(e)') &&
    files.zhUseVideo.includes('handleSubmit(e, opts?)') &&
    files.zhUseVideo.includes('后端错误会保留提示词') &&
    files.useSpeech.includes('initialInput') &&
    files.useSpeech.includes('audio`') &&
    files.useSpeech.includes('setInput(value)') &&
    files.useSpeech.includes('handleInputChange(e)') &&
    files.useSpeech.includes('handleSubmit(e, opts?)') &&
    files.useSpeech.includes('Backend errors leave the text available for retry') &&
    files.zhUseSpeech.includes('initialInput') &&
    files.zhUseSpeech.includes('audio`') &&
    files.zhUseSpeech.includes('setInput(value)') &&
    files.zhUseSpeech.includes('handleInputChange(e)') &&
    files.zhUseSpeech.includes('handleSubmit(e, opts?)') &&
    files.zhUseSpeech.includes('后端错误会保留文本') &&
    files.useTranscription.includes('initialInput') &&
    files.useTranscription.includes('transcription`') &&
    files.useTranscription.includes('text`') &&
    files.useTranscription.includes('setInput(value)') &&
    files.useTranscription.includes('handleInputChange(e)') &&
    files.useTranscription.includes('handleSubmit(e, opts?)') &&
    files.useTranscription.includes('Backend errors leave the audio input available for retry') &&
    files.useRerank.includes('initialInput') &&
    files.useRerank.includes('initialDocuments') &&
    files.useRerank.includes('rerankedDocuments') &&
    files.useRerank.includes('setInput(value)') &&
    files.useRerank.includes('setQuery(value)') &&
    files.useRerank.includes('setDocuments(value)') &&
    files.useRerank.includes('handleInputChange(e)') &&
    files.useRerank.includes('handleSubmit(e, opts?)') &&
    files.useRerank.includes('Backend errors leave the query and documents available for retry') &&
    files.zhUseTranscription.includes('initialInput') &&
    files.zhUseTranscription.includes('transcription`') &&
    files.zhUseTranscription.includes('text`') &&
    files.zhUseTranscription.includes('setInput(value)') &&
    files.zhUseTranscription.includes('handleInputChange(e)') &&
    files.zhUseTranscription.includes('handleSubmit(e, opts?)') &&
    files.zhUseTranscription.includes('后端错误会保留音频输入') &&
    files.zhUseRerank.includes('initialInput') &&
    files.zhUseRerank.includes('initialDocuments') &&
    files.zhUseRerank.includes('rerankedDocuments') &&
    files.zhUseRerank.includes('setInput(value)') &&
    files.zhUseRerank.includes('setQuery(value)') &&
    files.zhUseRerank.includes('setDocuments(value)') &&
    files.zhUseRerank.includes('handleInputChange(e)') &&
    files.zhUseRerank.includes('handleSubmit(e, opts?)') &&
    files.zhUseRerank.includes('后端错误会保留查询和文档') &&
    files.readme.includes('`useSpeech`, `useTranscription`, `useRerank`, and `useObject`') &&
    files.readme.includes('composables accept `initialInput`') &&
    files.readme.includes('cosineSimilarity(result.embeddings[0], result.embeddings[1])') &&
    files.zhReadme.includes('`useVideo`、`useSpeech`、`useTranscription`、`useRerank` 和') &&
    files.zhReadme.includes('请求类组合式函数都支持 `initialInput`') &&
    files.zhReadme.includes('cosineSimilarity(result.embeddings[0], result.embeddings[1])') &&
    files.embeddingExample.includes('cosineSimilarity') &&
    files.aiSdkMigration.includes('AI SDK Core `cosineSimilarity()`') &&
    files.zhAiSdkMigration.includes('AI SDK Core `cosineSimilarity()`'),
  'Object, embedding, speech, transcription, rerank docs plus READMEs must document form helpers'
)
expect(
  files.config.includes("{ text: 'useImage', link: '/reference/use-image' }") &&
    files.config.includes("{ text: 'useImage', link: '/zh/reference/use-image' }") &&
    files.useImage.includes('# useImage') &&
    files.useImage.includes('app-owned backend') &&
    files.useImage.includes('generateImage(prompt?, opts?)') &&
    files.useImage.includes('editImage(prompt, opts)') &&
    files.useImage.includes('ImageEditOptions') &&
    files.useImage.includes('handleSubmit(e, opts?)') &&
    files.useImage.includes('Backend errors leave the prompt available for retry') &&
    files.zhUseImage.includes('# useImage') &&
    files.zhUseImage.includes('应用自有后端') &&
    files.zhUseImage.includes('generateImage(prompt?, opts?)') &&
    files.zhUseImage.includes('editImage(prompt, opts)') &&
    files.zhUseImage.includes('ImageEditOptions') &&
    files.zhUseImage.includes('handleSubmit(e, opts?)') &&
    files.zhUseImage.includes('后端错误会保留提示词') &&
    files.readme.includes('`useImage`') &&
    files.zhReadme.includes('`useImage`'),
  'Image generation docs and navigation must document the app-owned proxy hook'
)
expect(
  files.config.includes("{ text: 'useVideo', link: '/reference/use-video' }") &&
    files.config.includes("{ text: 'useVideo', link: '/zh/reference/use-video' }") &&
    files.useVideo.includes('# useVideo') &&
    files.useVideo.includes('app-owned backend') &&
    files.useVideo.includes('generateVideo(prompt?, opts?)') &&
    files.useVideo.includes('handleSubmit(e, opts?)') &&
    files.useVideo.includes('Backend errors leave the prompt available for retry') &&
    files.zhUseVideo.includes('# useVideo') &&
    files.zhUseVideo.includes('应用自有后端') &&
    files.zhUseVideo.includes('generateVideo(prompt?, opts?)') &&
    files.zhUseVideo.includes('handleSubmit(e, opts?)') &&
    files.zhUseVideo.includes('后端错误会保留提示词') &&
    files.readme.includes('`useVideo`') &&
    files.zhReadme.includes('`useVideo`'),
  'Video generation docs and navigation must document the app-owned proxy hook'
)
expect(
  files.config.includes("{ text: 'useSpeech', link: '/reference/use-speech' }") &&
    files.config.includes("{ text: 'useSpeech', link: '/zh/reference/use-speech' }") &&
    files.useSpeech.includes('# useSpeech') &&
    files.useSpeech.includes('app-owned backend') &&
    files.useSpeech.includes('generateSpeech(text?, opts?)') &&
    files.useSpeech.includes('handleSubmit(e, opts?)') &&
    files.useSpeech.includes('Backend errors leave the text available for retry') &&
    files.zhUseSpeech.includes('# useSpeech') &&
    files.zhUseSpeech.includes('应用自有后端') &&
    files.zhUseSpeech.includes('generateSpeech(text?, opts?)') &&
    files.zhUseSpeech.includes('handleSubmit(e, opts?)') &&
    files.zhUseSpeech.includes('后端错误会保留文本') &&
    files.readme.includes('`useSpeech`') &&
    files.zhReadme.includes('`useSpeech`'),
  'Speech generation docs and navigation must document the app-owned proxy hook'
)
expect(
  files.config.includes("{ text: 'useTranscription', link: '/reference/use-transcription' }") &&
    files.config.includes(
      "{ text: 'useTranscription', link: '/zh/reference/use-transcription' }"
    ) &&
    files.useTranscription.includes('# useTranscription') &&
    files.useTranscription.includes('app-owned backend') &&
    files.useTranscription.includes('transcribeAudio(audio?, opts?)') &&
    files.useTranscription.includes('handleSubmit(e, opts?)') &&
    files.useTranscription.includes('Backend errors leave the audio input available for retry') &&
    files.zhUseTranscription.includes('# useTranscription') &&
    files.zhUseTranscription.includes('应用自有后端') &&
    files.zhUseTranscription.includes('transcribeAudio(audio?, opts?)') &&
    files.zhUseTranscription.includes('handleSubmit(e, opts?)') &&
    files.zhUseTranscription.includes('后端错误会保留音频输入') &&
    files.readme.includes('`useTranscription`') &&
    files.zhReadme.includes('`useTranscription`'),
  'Transcription docs and navigation must document the app-owned proxy hook'
)
expect(
  files.config.includes("{ text: 'useRerank', link: '/reference/use-rerank' }") &&
    files.config.includes("{ text: 'useRerank', link: '/zh/reference/use-rerank' }") &&
    files.useRerank.includes('# useRerank') &&
    files.useRerank.includes('app-owned backend') &&
    files.useRerank.includes('rerankDocuments(query?, docs?, opts?)') &&
    files.useRerank.includes('handleSubmit(e, opts?)') &&
    files.useRerank.includes('Backend errors leave the query and documents available for retry') &&
    files.zhUseRerank.includes('# useRerank') &&
    files.zhUseRerank.includes('应用自有后端') &&
    files.zhUseRerank.includes('rerankDocuments(query?, docs?, opts?)') &&
    files.zhUseRerank.includes('handleSubmit(e, opts?)') &&
    files.zhUseRerank.includes('后端错误会保留查询和文档') &&
    files.readme.includes('`useRerank`') &&
    files.zhReadme.includes('`useRerank`'),
  'Rerank docs and navigation must document the app-owned proxy hook'
)
expect(
  files.useChat.includes('## Message pruning') &&
    files.useChat.includes('pruneMessages({') &&
    files.useChat.includes('reasoning') &&
    files.useChat.includes("tools: ['searchDocs', 'lookupAccount']") &&
    files.useChat.includes('PruneMessagesOptions') &&
    files.useChat.includes('PruneToolCallsOption'),
  'English useChat docs must document message pruning utility, reasoning pruning, selected tool pruning, and public types'
)
expect(
  files.useChat.includes('## Model message conversion') &&
    files.useChat.includes('convertToModelMessages(pruned)') &&
    files.useChat.includes('ConvertToModelMessagesOptions') &&
    files.useChat.includes('ChatRequestMessage[]') &&
    files.useChat.includes('stripMetadata') &&
    files.useChat.includes('ignoreIncompleteToolCalls') &&
    files.useChat.includes('toModelOutput') &&
    files.useChat.includes('convertDataPart') &&
    files.aiSdkMigration.includes('| `convertToModelMessages()`') &&
    files.aiSdkMigration.includes('const modelMessages = convertToModelMessages') &&
    files.aiSdkMigration.includes('ignoreIncompleteToolCalls') &&
    files.aiSdkMigration.includes('tools: chatTools') &&
    files.aiSdkMigration.includes('convertDataPart') &&
    files.readme.includes('`convertToModelMessages()`'),
  'English docs must document model message conversion helper in useChat, migration guide, and README'
)
expect(
  files.useChat.includes('Public TypeScript types: `Chat`, `ChatOptions`') &&
    files.useChat.includes('const sharedChat = new Chat') &&
    files.useChat.includes('useChat({ chat: sharedChat })') &&
    files.useChat.includes('other options are ignored') &&
    files.aiSdkMigration.includes('## Chat instances') &&
    files.aiSdkMigration.includes('export const supportChat = new Chat') &&
    files.readme.includes('new Chat({ ... })') &&
    files.readme.includes('useChat({ chat })'),
  'English docs must document reusable Chat instances and useChat({ chat }) precedence'
)
expect(
  files.zhUseChat.includes('公开 TypeScript 类型：`Chat`、`ChatOptions`') &&
    files.zhUseChat.includes('const sharedChat = new Chat') &&
    files.zhUseChat.includes('useChat({ chat: sharedChat })') &&
    files.zhUseChat.includes('其它选项') &&
    files.zhAiSdkMigration.includes('## Chat 实例') &&
    files.zhAiSdkMigration.includes('export const supportChat = new Chat') &&
    files.zhReadme.includes('new Chat({ ... })') &&
    files.zhReadme.includes('useChat({ chat })'),
  'Chinese docs must document reusable Chat instances and useChat({ chat }) precedence'
)
expect(
  files.useChat.includes('## Message persistence') &&
    files.useChat.includes('ChatPersistOptions') &&
    files.useChat.includes('SerializedMessage') &&
    files.useChat.includes('validateMessages(raw)') &&
    files.useChat.includes('safeValidateMessages(raw)') &&
    files.useChat.includes('safeValidateUIMessages({ messages') &&
    files.useChat.includes('metadataSchema') &&
    files.useChat.includes('dataSchemas') &&
    files.useChat.includes('checking restored tool inputs') &&
    files.useChat.includes('setMessages(result.data)') &&
    files.useChat.includes('persist.onLoadError') &&
    files.useChat.includes('persist.onClearError') &&
    files.useChat.includes('ValidateMessagesOptions') &&
    files.aiSdkMigration.includes('safeValidateUIMessages(rawMessages') &&
    files.aiSdkMigration.includes('| `validateUIMessages()` / `safeValidateUIMessages()`') &&
    files.useChat.includes('serializeMessages(messages.value)') &&
    files.useChat.includes("deserializeMessages(await loadChat('support-thread-1'))"),
  'English useChat docs must document Date-safe and schema-safe message persistence helpers and public types'
)
for (const snippet of [
  '# useChatThreads',
  'thread creation',
  'active thread selection',
  'archive',
  'restore',
  'delete',
  'serializeChatThreadsState',
  'deserializeChatThreadsState',
  'ChatThreadsPersistOptions',
  'UseChatThreadsReturn',
  'ChatThreadsPersistenceErrorInfo',
  'persistenceError',
  'clearPersistenceError()',
  'lastMessagePreview',
  'threadId: thread.id'
]) {
  expect(
    files.useChatThreads.includes(snippet),
    `English useChatThreads docs must include: ${snippet}`
  )
}
for (const snippet of [
  '# useAgentContextRegistry',
  'Headless, Vue-scoped application context',
  'useAgentContextRegistry',
  'useAgentContext',
  'formatAgentContexts',
  'createAgentContextMessage',
  'withAgentContextMessage',
  'resolveAgentContexts',
  'AgentContextInput',
  'AgentContextSnapshot',
  'agentContextMessage',
  'The context message is part of the provider request only',
  'agentContext.toJSON()'
]) {
  expect(
    files.useAgentContext.includes(snippet),
    `English useAgentContext docs must include: ${snippet}`
  )
}
for (const snippet of [
  '# useAgentCapabilities',
  'Headless runtime capability discovery',
  'useAgentCapabilities',
  'summarizeAgentCapabilities',
  'extractAgentCapabilities',
  'AgentCapabilities',
  'AgentCapabilitiesSupportSummary',
  'LoadAgentCapabilitiesOptions',
  'UseAgentCapabilitiesOptions',
  'UseAgentCapabilitiesReturn',
  'supports',
  'loadCapabilities()',
  'selectCapabilities',
  '/api/agent/info',
  "api: '/info'",
  'does not create an agent instance, negotiate features, or render UI'
]) {
  expect(
    files.useAgentCapabilities.includes(snippet),
    `English useAgentCapabilities docs must include: ${snippet}`
  )
}
for (const snippet of [
  '# useAgentRun',
  'Headless agent run state',
  'AgentRunRequest',
  'AgentRunRequestInfo',
  'AgentRunResponseInfo',
  'AgentRunInspectionSnapshot',
  'AgentRunHandler',
  'AgentRunStatus',
  'UseAgentRunOptions',
  'UseAgentRunReturn',
  'interrupt',
  'resume()',
  'lastRequest',
  'lastResponse',
  'inspect()',
  'clearTrace()',
  '## Inspection',
  'raw `AgentEvent` timeline entries',
  "status: 'completed' \\| 'interrupted'",
  'data-agent-interrupt',
  '## Run id replay safety',
  'reuses the active or completed state',
  'returns the active promise instead of calling `run` again',
  'agentEventToChatChunk()',
  'does not render a copilot UI, execute tools, or call a provider'
]) {
  expect(files.useAgentRun.includes(snippet), `English useAgentRun docs must include: ${snippet}`)
}
for (const snippet of [
  '# usePromptSuggestions',
  'Headless prompt suggestion state',
  'createPromptSuggestionRecipes',
  'promptSuggestionRecipeIds',
  'PromptSuggestionInput',
  'PromptSuggestionFilter',
  'PromptSuggestionLoader',
  'PromptSuggestionLoaderContext',
  'PromptSuggestionRecipeMetadata',
  'PromptSuggestionRecipeSurface',
  'CreatePromptSuggestionRecipesOptions',
  'UsePromptSuggestionsOptions',
  'UsePromptSuggestionsReturn',
  '## Recipe starters',
  "kind: 'task-starter'",
  'surfaces',
  'categories',
  'verify-release-gates',
  'design-agent-route',
  'draft-media-prompt',
  'trace-inspection starters',
  'visibleSuggestions',
  'isLoading',
  'reloadSuggestions()',
  'loadOnInit',
  'selectSuggestion(id)',
  'fill `useChat().input`',
  'does not render UI, call a provider, or send messages'
]) {
  expect(
    files.usePromptSuggestions.includes(snippet),
    `English usePromptSuggestions docs must include: ${snippet}`
  )
}
expect(
  files.useChat.includes('## Structured message parts') &&
    files.useChat.includes('Message.parts') &&
    files.useChat.includes('MessagePart') &&
    files.useChat.includes('data-*') &&
    files.useChat.includes("part.type.startsWith('tool-')") &&
    files.useChat.includes('getToolRenderParts()') &&
    files.useChat.includes('ToolRenderPart') &&
    files.useChat.includes('awaitingAction') &&
    files.useChat.includes('defineToolHandlers') &&
    files.useChat.includes('InferUITools') &&
    files.useChat.includes('serializeMessages()'),
  'English useChat docs must document structured Message.parts rendering, tool render rows, and persistence'
)
expect(
  files.useChat.includes('sendAutomaticallyWhen') &&
    files.useChat.includes('lastAssistantMessageIsCompleteWithToolCalls') &&
    files.useChat.includes('stepCountIs') &&
    files.useChat.includes('SendAutomaticallyWhen') &&
    files.useChat.includes('call `sendMessage()` without content') &&
    files.useChat.includes('`Tool[] \\| ToolSet`') &&
    files.useChat.includes('jsonSchema') &&
    files.useChat.includes('dynamicTool') &&
    files.useChat.includes('ToolHandlersFor') &&
    files.useChat.includes('defineToolHandlers') &&
    files.useChat.includes(
      'Provider requests still receive the normalized OpenAI-compatible `Tool[]`'
    ),
  'English useChat docs must document AI SDK-style tool result auto-send control'
)
expect(
  files.useChat.includes('agentContext') &&
    files.useChat.includes('AgentContextRegistry') &&
    files.useChat.includes('agentContextMessage') &&
    files.useChat.includes('## Agent context') &&
    files.useChat.includes('useAgentContextRegistry()') &&
    files.useChat.includes('kept out of the visible `messages` history'),
  'English useChat docs must document agentContext request injection'
)
expect(
  files.zhUseChat.includes('共享内存中的聊天状态') &&
    files.zhUseChat.includes('initialMessages') &&
    files.zhUseChat.includes('initialInput') &&
    files.zhUseChat.includes('AI SDK 风格的') &&
    files.zhUseChat.includes('`initialMessages` 别名') &&
    files.zhUseChat.includes('不会把当前 refs 重新绑定'),
  'Chinese useChat docs must explain same-id shared chat state, messages alias, and setId boundaries'
)
expect(
  files.zhUseChat.includes('## 生命周期回调') &&
    files.zhUseChat.includes('info.isDisconnect') &&
    files.zhUseChat.includes('isDisconnect: true'),
  'Chinese useChat docs must document disconnect-aware finish callbacks'
)
expect(
  files.zhUseChat.includes('## 消息裁剪') &&
    files.zhUseChat.includes('pruneMessages({') &&
    files.zhUseChat.includes('reasoning') &&
    files.zhUseChat.includes("tools: ['searchDocs', 'lookupAccount']") &&
    files.zhUseChat.includes('PruneMessagesOptions') &&
    files.zhUseChat.includes('PruneToolCallsOption'),
  'Chinese useChat docs must document message pruning utility, reasoning pruning, selected tool pruning, and public types'
)
expect(
  files.zhUseChat.includes('## 模型消息转换') &&
    files.zhUseChat.includes('convertToModelMessages(pruned)') &&
    files.zhUseChat.includes('ConvertToModelMessagesOptions') &&
    files.zhUseChat.includes('ChatRequestMessage[]') &&
    files.zhUseChat.includes('stripMetadata') &&
    files.zhUseChat.includes('ignoreIncompleteToolCalls') &&
    files.zhUseChat.includes('toModelOutput') &&
    files.zhUseChat.includes('convertDataPart') &&
    files.zhAiSdkMigration.includes('| `convertToModelMessages()`') &&
    files.zhAiSdkMigration.includes('const modelMessages = convertToModelMessages') &&
    files.zhAiSdkMigration.includes('ignoreIncompleteToolCalls') &&
    files.zhAiSdkMigration.includes('tools: chatTools') &&
    files.zhAiSdkMigration.includes('convertDataPart') &&
    files.zhReadme.includes('`convertToModelMessages()`'),
  'Chinese docs must document model message conversion helper in useChat, migration guide, and README'
)
expect(
  files.zhUseChat.includes('## 消息持久化') &&
    files.zhUseChat.includes('ChatPersistOptions') &&
    files.zhUseChat.includes('SerializedMessage') &&
    files.zhUseChat.includes('validateMessages(raw)') &&
    files.zhUseChat.includes('safeValidateMessages(raw)') &&
    files.zhUseChat.includes('safeValidateUIMessages({ messages') &&
    files.zhUseChat.includes('metadataSchema') &&
    files.zhUseChat.includes('dataSchemas') &&
    files.zhUseChat.includes('校验恢复出来的 tool input') &&
    files.zhUseChat.includes('setMessages(result.data)') &&
    files.zhUseChat.includes('persist.onLoadError') &&
    files.zhUseChat.includes('persist.onClearError') &&
    files.zhUseChat.includes('ValidateMessagesOptions') &&
    files.zhAiSdkMigration.includes('safeValidateUIMessages(rawMessages') &&
    files.zhAiSdkMigration.includes('| `validateUIMessages()` / `safeValidateUIMessages()`') &&
    files.zhUseChat.includes('serializeMessages(messages.value)') &&
    files.zhUseChat.includes("deserializeMessages(await loadChat('support-thread-1'))"),
  'Chinese useChat docs must document Date-safe and schema-safe message persistence helpers and public types'
)
for (const snippet of [
  '# useChatThreads',
  '创建 thread',
  '切换当前 thread',
  '归档',
  '恢复',
  '删除',
  'serializeChatThreadsState',
  'deserializeChatThreadsState',
  'ChatThreadsPersistOptions',
  'UseChatThreadsReturn',
  'ChatThreadsPersistenceErrorInfo',
  'persistenceError',
  'clearPersistenceError()',
  'lastMessagePreview',
  'threadId: thread.id'
]) {
  expect(
    files.zhUseChatThreads.includes(snippet),
    `Chinese useChatThreads docs must include: ${snippet}`
  )
}
for (const snippet of [
  '# useAgentContextRegistry',
  'Vue 作用域应用上下文',
  'useAgentContextRegistry',
  'useAgentContext',
  'formatAgentContexts',
  'createAgentContextMessage',
  'withAgentContextMessage',
  'resolveAgentContexts',
  'AgentContextInput',
  'AgentContextSnapshot',
  'agentContextMessage',
  '不会追加到可见的 `messages` 历史里',
  'agentContext.toJSON()'
]) {
  expect(
    files.zhUseAgentContext.includes(snippet),
    `Chinese useAgentContext docs must include: ${snippet}`
  )
}
for (const snippet of [
  '# useAgentCapabilities',
  'runtime capability discovery',
  'useAgentCapabilities',
  'summarizeAgentCapabilities',
  'extractAgentCapabilities',
  'AgentCapabilities',
  'AgentCapabilitiesSupportSummary',
  'LoadAgentCapabilitiesOptions',
  'UseAgentCapabilitiesOptions',
  'UseAgentCapabilitiesReturn',
  'supports',
  'loadCapabilities()',
  'selectCapabilities',
  '/api/agent/info',
  "api: '/info'",
  '不会创建 agent 实例、协商功能，也不会渲染 UI'
]) {
  expect(
    files.zhUseAgentCapabilities.includes(snippet),
    `Chinese useAgentCapabilities docs must include: ${snippet}`
  )
}
for (const snippet of [
  '# useAgentRun',
  '无 UI agent run 状态',
  'AgentRunRequest',
  'AgentRunRequestInfo',
  'AgentRunResponseInfo',
  'AgentRunInspectionSnapshot',
  'AgentRunHandler',
  'AgentRunStatus',
  'UseAgentRunOptions',
  'UseAgentRunReturn',
  'interrupt',
  'resume()',
  'lastRequest',
  'lastResponse',
  'inspect()',
  'clearTrace()',
  '## 检查快照',
  '原始 `AgentEvent` timeline',
  "`status` 为 `'completed' \\| 'interrupted'`",
  'data-agent-interrupt',
  '## Run id 重放安全',
  '复用进行中或已完成的本地状态',
  '而不会再次调用 `run`',
  'agentEventToChatChunk()',
  '不渲染 copilot UI、不执行工具，也不会替你调用 Provider'
]) {
  expect(files.zhUseAgentRun.includes(snippet), `Chinese useAgentRun docs must include: ${snippet}`)
}
for (const snippet of [
  '# usePromptSuggestions',
  '无 UI prompt suggestion 状态',
  'createPromptSuggestionRecipes',
  'promptSuggestionRecipeIds',
  'PromptSuggestionInput',
  'PromptSuggestionFilter',
  'PromptSuggestionLoader',
  'PromptSuggestionLoaderContext',
  'PromptSuggestionRecipeMetadata',
  'PromptSuggestionRecipeSurface',
  'CreatePromptSuggestionRecipesOptions',
  'UsePromptSuggestionsOptions',
  'UsePromptSuggestionsReturn',
  '## 任务启动 recipes',
  "kind: 'task-starter'",
  'surfaces',
  'categories',
  'verify-release-gates',
  'design-agent-route',
  'draft-media-prompt',
  'trace-inspection',
  'visibleSuggestions',
  'isLoading',
  'reloadSuggestions()',
  'loadOnInit',
  'selectSuggestion(id)',
  '填入 `useChat().input`',
  '不渲染 UI、不调用 Provider，也不会自动发送消息'
]) {
  expect(
    files.zhUsePromptSuggestions.includes(snippet),
    `Chinese usePromptSuggestions docs must include: ${snippet}`
  )
}
expect(
  files.zhUseChat.includes('## 结构化消息 parts') &&
    files.zhUseChat.includes('Message.parts') &&
    files.zhUseChat.includes('MessagePart') &&
    files.zhUseChat.includes('data-*') &&
    files.zhUseChat.includes("part.type.startsWith('tool-')") &&
    files.zhUseChat.includes('getToolRenderParts()') &&
    files.zhUseChat.includes('ToolRenderPart') &&
    files.zhUseChat.includes('awaitingAction') &&
    files.zhUseChat.includes('defineToolHandlers') &&
    files.zhUseChat.includes('InferUITools') &&
    files.zhUseChat.includes('serializeMessages()'),
  'Chinese useChat docs must document structured Message.parts rendering, tool render rows, and persistence'
)
expect(
  files.zhUseChat.includes('sendAutomaticallyWhen') &&
    files.zhUseChat.includes('lastAssistantMessageIsCompleteWithToolCalls') &&
    files.zhUseChat.includes('stepCountIs') &&
    files.zhUseChat.includes('SendAutomaticallyWhen') &&
    files.zhUseChat.includes('无参调用') &&
    files.zhUseChat.includes('`sendMessage()`') &&
    files.zhUseChat.includes('`Tool[] \\| ToolSet`') &&
    files.zhUseChat.includes('jsonSchema') &&
    files.zhUseChat.includes('dynamicTool') &&
    files.zhUseChat.includes('ToolHandlersFor') &&
    files.zhUseChat.includes('defineToolHandlers') &&
    files.zhUseChat.includes('Provider 请求仍会收到归一化后的 OpenAI-compatible `Tool[]`'),
  'Chinese useChat docs must document AI SDK-style tool result auto-send control'
)
expect(
  files.zhUseChat.includes('agentContext') &&
    files.zhUseChat.includes('AgentContextRegistry') &&
    files.zhUseChat.includes('agentContextMessage') &&
    files.zhUseChat.includes('## Agent context') &&
    files.zhUseChat.includes('useAgentContextRegistry()') &&
    files.zhUseChat.includes('不会写入可见'),
  'Chinese useChat docs must document agentContext request injection'
)
expect(
  files.types.includes('type MessagePart =') &&
    files.types.includes('parts?: MessagePart[]') &&
    files.types.includes('messageId?: string') &&
    files.types.includes('MessageToolPart') &&
    files.types.includes('tool-*') &&
    files.types.includes('ToolRenderPart') &&
    files.types.includes('GetToolRenderPartsOptions') &&
    files.types.includes('ToolRenderStatus') &&
    files.types.includes('interface UIMessage') &&
    files.types.includes('type UIMessagePart') &&
    files.types.includes('type UIMessageToolPart') &&
    files.types.includes('type UIDataTypes') &&
    files.types.includes('Pair `UIMessage<Metadata, DataParts, InferUITools<typeof tools>>`') &&
    files.types.includes('awaitingAction') &&
    files.types.includes('ChatChunk.parts') &&
    files.types.includes('ChatChunk.messageId') &&
    files.types.includes('SendAutomaticallyWhen') &&
    files.types.includes('interface JsonSchemaDefinition') &&
    files.types.includes('type ToolSet') &&
    files.types.includes('InferUITools') &&
    files.types.includes('ToolHandlersFor') &&
    files.types.includes('type ChatToolsInput') &&
    files.types.includes('interface ModelMessage') &&
    files.types.includes('interface ConvertToModelMessagesOptions') &&
    files.types.includes('interface CreateIdGeneratorOptions') &&
    files.types.includes('createIdGenerator(options?)') &&
    files.types.includes('generateId(prefix?)') &&
    files.types.includes('type ChatRequestMessage = Message | ModelMessage') &&
    files.types.includes('jsonSchema(schema)') &&
    files.types.includes('dynamicTool()') &&
    files.types.includes('defineToolHandlers(tools, handlers)'),
  'English public type docs must expose Message.parts, tool render rows, ChatChunk.parts, ChatChunk.messageId, and SendAutomaticallyWhen'
)
expect(
  files.zhTypes.includes('type MessagePart =') &&
    files.zhTypes.includes('parts?: MessagePart[]') &&
    files.zhTypes.includes('messageId?: string') &&
    files.zhTypes.includes('MessageToolPart') &&
    files.zhTypes.includes('tool-*') &&
    files.zhTypes.includes('ToolRenderPart') &&
    files.zhTypes.includes('GetToolRenderPartsOptions') &&
    files.zhTypes.includes('ToolRenderStatus') &&
    files.zhTypes.includes('interface UIMessage') &&
    files.zhTypes.includes('type UIMessagePart') &&
    files.zhTypes.includes('type UIMessageToolPart') &&
    files.zhTypes.includes('type UIDataTypes') &&
    files.zhTypes.includes('UIMessage<Metadata, DataParts, InferUITools<typeof tools>>') &&
    files.zhTypes.includes('awaitingAction') &&
    files.zhTypes.includes('ChatChunk.parts') &&
    files.zhTypes.includes('ChatChunk.messageId') &&
    files.zhTypes.includes('SendAutomaticallyWhen') &&
    files.zhTypes.includes('interface JsonSchemaDefinition') &&
    files.zhTypes.includes('type ToolSet') &&
    files.zhTypes.includes('InferUITools') &&
    files.zhTypes.includes('ToolHandlersFor') &&
    files.zhTypes.includes('type ChatToolsInput') &&
    files.zhTypes.includes('interface ModelMessage') &&
    files.zhTypes.includes('interface ConvertToModelMessagesOptions') &&
    files.zhTypes.includes('interface CreateIdGeneratorOptions') &&
    files.zhTypes.includes('createIdGenerator(options?)') &&
    files.zhTypes.includes('generateId(prefix?)') &&
    files.zhTypes.includes('type ChatRequestMessage = Message | ModelMessage') &&
    files.zhTypes.includes('jsonSchema(schema)') &&
    files.zhTypes.includes('dynamicTool()') &&
    files.zhTypes.includes('defineToolHandlers(tools, handlers)'),
  'Chinese public type docs must expose Message.parts, tool render rows, ChatChunk.parts, ChatChunk.messageId, and SendAutomaticallyWhen'
)
expect(
  files.types.includes('### `TranscriptionRequest`') &&
    files.types.includes('`audio`') &&
    files.types.includes('timestampGranularities') &&
    files.types.includes('interface TranscriptionSegment') &&
    files.types.includes('interface TranscriptionResult') &&
    files.types.includes('segments?: TranscriptionSegment[]') &&
    files.types.includes('### `RerankRequest`') &&
    files.types.includes('`query`') &&
    files.types.includes('`documents`') &&
    files.types.includes('type RerankDocument') &&
    files.types.includes('interface RerankRankingItem') &&
    files.types.includes('interface RerankResult') &&
    files.types.includes('rerankedDocuments: TDocument[]') &&
    files.types.includes('### `VideoGenerationRequest`') &&
    files.types.includes('interface VideoFrameImage') &&
    files.types.includes('interface VideoGenerationResult') &&
    files.types.includes('videos: GeneratedVideo[]') &&
    files.types.includes('`frameImages`, `query`, `documents`') &&
    files.zhTypes.includes('### `TranscriptionRequest`') &&
    files.zhTypes.includes('`audio`') &&
    files.zhTypes.includes('timestampGranularities') &&
    files.zhTypes.includes('interface TranscriptionSegment') &&
    files.zhTypes.includes('interface TranscriptionResult') &&
    files.zhTypes.includes('segments?: TranscriptionSegment[]') &&
    files.zhTypes.includes('### `RerankRequest`') &&
    files.zhTypes.includes('`query`') &&
    files.zhTypes.includes('`documents`') &&
    files.zhTypes.includes('type RerankDocument') &&
    files.zhTypes.includes('interface RerankRankingItem') &&
    files.zhTypes.includes('interface RerankResult') &&
    files.zhTypes.includes('rerankedDocuments: TDocument[]') &&
    files.zhTypes.includes('### `VideoGenerationRequest`') &&
    files.zhTypes.includes('interface VideoFrameImage') &&
    files.zhTypes.includes('interface VideoGenerationResult') &&
    files.zhTypes.includes('videos: GeneratedVideo[]') &&
    files.zhTypes.includes('`query`、`documents`、`model`'),
  'Public type docs must expose video, transcription, and rerank request/result contracts'
)
expect(
  files.chatExample.includes('visibleMessageParts(message.parts,') &&
    files.chatExample.includes('getToolRenderParts({ messages: messages.value') &&
    files.chatExample.includes('aria-label="structured message parts"') &&
    files.chatExample.includes("dataType: 'source-url'") &&
    files.chatExample.includes("dataType: 'file'") &&
    files.chatExample.includes(
      "dataType: approved ? 'tool-output-available' : 'tool-output-error'"
    ),
  'Runnable chat example must render and produce structured Message.parts'
)
expect(
  files.providers.includes('AI SDK UI message stream protocol') &&
    files.providers.includes('start.messageId') &&
    files.providers.includes('message-metadata') &&
    files.providers.includes('ChatChunk.metadata') &&
    files.providers.includes('text-delta') &&
    files.providers.includes('reasoning-*') &&
    files.providers.includes('tool-input-*'),
  'English provider docs must document AI SDK UI message stream compatibility'
)
expect(
  files.zhProviders.includes('AI SDK UI message stream 协议') &&
    files.zhProviders.includes('start.messageId') &&
    files.zhProviders.includes('message-metadata') &&
    files.zhProviders.includes('ChatChunk.metadata') &&
    files.zhProviders.includes('text-delta') &&
    files.zhProviders.includes('reasoning-*') &&
    files.zhProviders.includes('tool-input-*'),
  'Chinese provider docs must document AI SDK UI message stream compatibility'
)

for (const noisyLabel of [
  "label: 'useChat Properties'",
  "label: 'useChat Methods'",
  "label: 'useCompletion Properties'",
  "label: 'useCompletion Methods'",
  "label: 'useEmbedding Properties'",
  "label: 'useEmbedding Methods'",
  "label: 'useImage Properties'",
  "label: 'useImage Methods'",
  "label: 'useRerank Properties'",
  "label: 'useRerank Methods'",
  "label: 'useTranscription Properties'",
  "label: 'useTranscription Methods'",
  "label: 'useObject Properties'",
  "label: 'useObject Methods'",
  "label: 'useChat 参数'",
  "label: 'useChat 方法'",
  "label: 'useCompletion 参数'",
  "label: 'useCompletion 方法'",
  "label: 'useEmbedding 参数'",
  "label: 'useEmbedding 方法'",
  "label: 'useImage 参数'",
  "label: 'useImage 方法'",
  "label: 'useRerank 参数'",
  "label: 'useRerank 方法'",
  "label: 'useTranscription 参数'",
  "label: 'useTranscription 方法'",
  "label: 'useObject 参数'",
  "label: 'useObject 方法'"
]) {
  expect(!files.demoShowcase.includes(noisyLabel), `Demo API shortcut nav must omit ${noisyLabel}`)
}

if (failures.length) {
  console.error(`Docs UX check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(
  'Docs UX check passed for language routing, roadmap, inspection, production readiness status, adoption readiness, first-run paths, positioning map, provider presets, examples local run recipe, examples task chooser, server storage, regenerate branches, tool approvals, agent bridge, form helpers, transcription/rerank docs, shared chat state, provider trace refs, message pruning, message persistence, proxy stream compatibility, file attachments, and demo navigation.'
)

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}
