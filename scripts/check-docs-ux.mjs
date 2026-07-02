import { readFileSync } from 'node:fs'

const files = {
  config: readFileSync('docs/.vitepress/config.ts', 'utf8'),
  home: readFileSync('docs/index.md', 'utf8'),
  zhHome: readFileSync('docs/zh/index.md', 'utf8'),
  choosing: readFileSync('docs/guide/choosing.md', 'utf8'),
  zhChoosing: readFileSync('docs/zh/guide/choosing.md', 'utf8'),
  gettingStarted: readFileSync('docs/guide/getting-started.md', 'utf8'),
  zhGettingStarted: readFileSync('docs/zh/guide/getting-started.md', 'utf8'),
  upgrade04: readFileSync('docs/guide/upgrade-0.4.md', 'utf8'),
  zhUpgrade04: readFileSync('docs/zh/guide/upgrade-0.4.md', 'utf8'),
  upgrade03: readFileSync('docs/guide/upgrade-0.3.md', 'utf8'),
  zhUpgrade03: readFileSync('docs/zh/guide/upgrade-0.3.md', 'utf8'),
  aiSdkMigration: readFileSync('docs/guide/ai-sdk-migration.md', 'utf8'),
  zhAiSdkMigration: readFileSync('docs/zh/guide/ai-sdk-migration.md', 'utf8'),
  proxyRecipes: readFileSync('docs/guide/proxy-recipes.md', 'utf8'),
  zhProxyRecipes: readFileSync('docs/zh/guide/proxy-recipes.md', 'utf8'),
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
  files.home.includes('Choose Fit') && files.home.includes('/guide/choosing'),
  'English home page must link to the library-fit guide'
)
expect(
  files.config.includes("{ text: 'Inspection', link: '/guide/inspection' }") &&
    files.config.includes("{ text: '调试检查', link: '/zh/guide/inspection' }"),
  'VitePress sidebars must expose the inspection guide in English and Chinese'
)
expect(
  files.config.includes("{ text: 'Proxy recipes', link: '/guide/proxy-recipes' }") &&
    files.config.includes("{ text: 'Proxy 配方', link: '/zh/guide/proxy-recipes' }"),
  'VitePress sidebars must expose the proxy recipes guide in English and Chinese'
)
expect(
  files.zhHome.includes('可以先不配置 API key'),
  'Chinese home page must tell users they can start without an API key'
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
  'pnpm example:chat',
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
  '[Proxy recipes](/guide/proxy-recipes)',
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
  'pnpm example:chat',
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
  '[Proxy 配方](/zh/guide/proxy-recipes)',
  '[示例](/zh/examples/)',
  '[调试检查](/zh/guide/inspection)'
]) {
  expect(
    files.zhGettingStarted.includes(snippet),
    `Chinese getting started must include: ${snippet}`
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
    files.examplesEnvExample.includes('VITE_PROXY_VIDEO_URL=/api/ai/video') &&
    files.examplesEnvExample.includes('VITE_PROXY_RERANK_URL=/api/ai/rerank') &&
    files.examplesEnvExample.includes('VITE_PROXY_TRANSCRIPTION_URL=/api/ai/transcription'),
  '.env.example files must make the chat, image, video, speech, transcription, rerank, and object examples runnable without provider keys by default'
)
expect(
  files.chatExample.includes('const openAiKey =') &&
    files.chatExample.includes('DirectChatTransport') &&
    files.chatExample.includes("'sk-...'") &&
    files.chatExample.includes("'local-tools'"),
  'Chat example must fall back to DirectChatTransport-backed local-tools when no real OpenAI key is configured'
)
expect(
  files.readme.includes('defaults to the no-key `local-tools` provider') &&
    files.zhReadme.includes('不需要 key 的 `local-tools` Provider') &&
    files.readme.includes('`useCompletion`, or `useObject` from `vue-ai-hooks/react`') &&
    files.zhReadme.includes('`useCompletion` 或 `useObject`，在 React 中复用') &&
    files.readme.includes('DirectChatTransport') &&
    files.readme.includes('DirectChatTransport({ onError })') &&
    files.zhReadme.includes('DirectChatTransport') &&
    files.zhReadme.includes('DirectChatTransport({ onError })') &&
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
    files.readme.includes('/docs/guide/choosing.md') &&
    files.zhReadme.includes('/docs/zh/guide/choosing.md') &&
    files.readme.includes('/docs/guide/upgrade-0.4.md') &&
    files.zhReadme.includes('/docs/zh/guide/upgrade-0.4.md') &&
    files.readme.includes('/docs/guide/upgrade-0.3.md') &&
    files.zhReadme.includes('/docs/zh/guide/upgrade-0.3.md') &&
    files.readme.includes('/docs/guide/ai-sdk-migration.md') &&
    files.zhReadme.includes('/docs/zh/guide/ai-sdk-migration.md') &&
    files.readme.includes('/docs/guide/proxy-recipes.md') &&
    files.zhReadme.includes('/docs/zh/guide/proxy-recipes.md') &&
    files.readme.includes('PROXY_UPSTREAM_BASE_URL') &&
    files.zhReadme.includes('PROXY_UPSTREAM_BASE_URL') &&
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
  'import { useChat, useCompletion, useObject } from',
  'CompletionBox',
  'ObjectBox',
  '`useCompletion(options)` accepts `UseReactCompletionOptions`',
  '`UseReactCompletionReturn` exposes plain React state and actions',
  '`useObject(options)` accepts `UseReactObjectOptions<T>`',
  '`UseReactObjectReturn<T>` exposes plain React state and actions',
  'complete(prompt?, options?)',
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
  'import { useChat, useCompletion, useObject } from',
  'CompletionBox',
  'ObjectBox',
  '`useCompletion(options)` 接收 `UseReactCompletionOptions`',
  '`UseReactCompletionReturn` 暴露普通 React state 和操作',
  '`useObject(options)` 接收 `UseReactObjectOptions<T>`',
  '`UseReactObjectReturn<T>` 暴露普通 React state 和操作',
  'complete(prompt?, options?)',
  'submit(prompt?, options?)',
  '只有首个文本 delta 到达前的失败会重试'
]) {
  expect(files.zhReact.includes(snippet), `Chinese React reference must include: ${snippet}`)
}

for (const snippet of [
  '# Roadmap',
  'GitHub issues are reserved for',
  'reproducible bugs',
  '0.5.x',
  '0.6.x',
  '0.7.x',
  '0.8.x',
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
  'classifies errors',
  'hasCause',
  'submit-user-message',
  'Request trace',
  'Debugging checklist',
  'Production path',
  'provider credentials'
]) {
  expect(files.inspection.includes(snippet), `English inspection guide must include: ${snippet}`)
}

for (const snippet of [
  '# 调试检查',
  'lastRequest',
  'lastResponse',
  'clearTrace()',
  'inspectRequestTrace',
  'hasCause',
  'submit-user-message',
  '请求 trace',
  '排查清单',
  '生产路径',
  'Provider 凭据'
]) {
  expect(files.zhInspection.includes(snippet), `Chinese inspection guide must include: ${snippet}`)
}

for (const snippet of [
  '# Choosing vue-ai-hooks',
  'Short answer',
  'Current competitive snapshot',
  'Snapshot date: 2026-07-01',
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
  'What this package intentionally does not own'
]) {
  expect(files.choosing.includes(snippet), `English choosing guide must include: ${snippet}`)
}

for (const snippet of [
  '# 选择 vue-ai-hooks',
  '简短结论',
  '当前竞品快照',
  '快照日期：2026-07-01',
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
  '本包刻意不负责什么'
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
  '## Local Ollama or vLLM',
  'PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1',
  'PROXY_UPSTREAM_CHAT_PATH=/chat/completions',
  '## Client wiring',
  "useChat({ baseURL: 'http://127.0.0.1:8787' })",
  'proxyProvider({',
  '## Production checklist',
  'Keep provider keys in server-only environment variables'
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
  '## 本地 Ollama 或 vLLM',
  'PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1',
  'PROXY_UPSTREAM_CHAT_PATH=/chat/completions',
  '## 客户端接入',
  "useChat({ baseURL: 'http://127.0.0.1:8787' })",
  'proxyProvider({',
  '## 生产检查清单',
  'Provider key 只放在服务端环境变量里'
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
    files.packageJson.includes('"example:image:build"') &&
    files.packageJson.includes('pnpm example:image:build') &&
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
  'package scripts must expose and build the image, video, speech, transcription, rerank, and object examples'
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
  'deterministic `local-tools` provider',
  'click **Run approval demo**',
  '`/api/image`, `/api/video`, `/api/speech`, `/api/transcription`, `/api/object`, and',
  '`/api/rerank`',
  '`/api/ui-message-stream`',
  'pnpm example:image',
  'deterministic local SVG',
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
  '## Which demo should I open first?',
  'Build a chat surface, structured parts, or approval flow',
  '[Streaming chat](#chat-demo)',
  'Test an AI SDK UI stream backend route',
  '[UI message stream route](#stream-demo)',
  'Generate an image through an app route',
  '[Image generation](#image-demo)',
  'Generate a video through an app route',
  '[Video generation](#video-demo)',
  'Generate speech through an app route',
  '[Speech generation](#speech-demo)',
  'Turn audio into text through an app route',
  '[Audio transcription](#transcription-demo)',
  'Rerank search results through an app route',
  '[Document reranking](#rerank-demo)',
  'Extract typed JSON from a prompt',
  '[Structured object output](#object-demo)'
]) {
  expect(files.examples.includes(snippet), `English examples page must include: ${snippet}`)
}

for (const snippet of [
  '## 先跑不需要 key 的 Demo',
  'pnpm example:chat',
  '确定性的',
  '`local-tools` Provider',
  '点击 **Run approval demo**',
  '`/api/video`',
  '`/api/transcription`、`/api/object` 和',
  '`/api/rerank`',
  '`/api/ui-message-stream`',
  'pnpm example:image',
  '确定性的本地',
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
  '`local-object` Provider',
  '## 先看哪个示例？',
  '做聊天界面、结构化片段或工具审批',
  '[流式对话](#chat-demo)',
  '测试 AI SDK UI stream 后端路由',
  '[UI message stream 路由](#stream-demo)',
  '通过应用后端生成图片',
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
    files.imageExample.includes('localImageFetch') &&
    files.imageExample.includes('VITE_PROXY_IMAGE_URL') &&
    files.imageExample.includes('VITE_PROXY_BASE_URL') &&
    files.imageExample.includes('previewUrl'),
  'Image example must run without keys and switch to the proxy image route when configured'
)
expect(
  files.videoExample.includes('useVideo') &&
    files.videoExample.includes('localVideoFetch') &&
    files.videoExample.includes('VITE_PROXY_VIDEO_URL') &&
    files.videoExample.includes('VITE_PROXY_BASE_URL') &&
    files.videoExample.includes('previewUrl'),
  'Video example must run without keys and switch to the proxy video route when configured'
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
    files.demoShowcase.includes("{ label: 'Composables', value: '10' }") &&
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
    files.demoShowcase.includes("{ label: '组合式函数', value: '10' }") &&
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
    files.zhStreams.includes('pnpm example:proxy-server') &&
    files.zhStreams.includes('/api/ui-message-stream') &&
    files.zhStreams.includes('readUIMessageStream()') &&
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
    files.readme.includes('All ten') &&
    files.readme.includes('cosineSimilarity(result.embeddings[0], result.embeddings[1])') &&
    files.zhReadme.includes('`useVideo`、`useSpeech`、`useTranscription`、`useRerank` 和') &&
    files.zhReadme.includes('十者都支持 `initialInput`') &&
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
    files.useImage.includes('handleSubmit(e, opts?)') &&
    files.useImage.includes('Backend errors leave the prompt available for retry') &&
    files.zhUseImage.includes('# useImage') &&
    files.zhUseImage.includes('应用自有后端') &&
    files.zhUseImage.includes('generateImage(prompt?, opts?)') &&
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
    files.useChat.includes('safeValidateUIMessages(raw)') &&
    files.useChat.includes('ValidateMessagesOptions') &&
    files.aiSdkMigration.includes('safeValidateUIMessages(rawMessages') &&
    files.aiSdkMigration.includes('| `validateUIMessages()` / `safeValidateUIMessages()`') &&
    files.useChat.includes('serializeMessages(messages.value)') &&
    files.useChat.includes("deserializeMessages(await loadChat('support-thread-1'))"),
  'English useChat docs must document Date-safe and schema-safe message persistence helpers and public types'
)
expect(
  files.useChat.includes('## Structured message parts') &&
    files.useChat.includes('Message.parts') &&
    files.useChat.includes('MessagePart') &&
    files.useChat.includes('data-*') &&
    files.useChat.includes("part.type.startsWith('tool-')") &&
    files.useChat.includes('serializeMessages()'),
  'English useChat docs must document structured Message.parts rendering and persistence'
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
    files.useChat.includes(
      'Provider requests still receive the normalized OpenAI-compatible `Tool[]`'
    ),
  'English useChat docs must document AI SDK-style tool result auto-send control'
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
    files.zhUseChat.includes('safeValidateUIMessages(raw)') &&
    files.zhUseChat.includes('ValidateMessagesOptions') &&
    files.zhAiSdkMigration.includes('safeValidateUIMessages(rawMessages') &&
    files.zhAiSdkMigration.includes('| `validateUIMessages()` / `safeValidateUIMessages()`') &&
    files.zhUseChat.includes('serializeMessages(messages.value)') &&
    files.zhUseChat.includes("deserializeMessages(await loadChat('support-thread-1'))"),
  'Chinese useChat docs must document Date-safe and schema-safe message persistence helpers and public types'
)
expect(
  files.zhUseChat.includes('## 结构化消息 parts') &&
    files.zhUseChat.includes('Message.parts') &&
    files.zhUseChat.includes('MessagePart') &&
    files.zhUseChat.includes('data-*') &&
    files.zhUseChat.includes("part.type.startsWith('tool-')") &&
    files.zhUseChat.includes('serializeMessages()'),
  'Chinese useChat docs must document structured Message.parts rendering and persistence'
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
    files.zhUseChat.includes('Provider 请求仍会收到归一化后的 OpenAI-compatible `Tool[]`'),
  'Chinese useChat docs must document AI SDK-style tool result auto-send control'
)
expect(
  files.types.includes('type MessagePart =') &&
    files.types.includes('parts?: MessagePart[]') &&
    files.types.includes('messageId?: string') &&
    files.types.includes('MessageToolPart') &&
    files.types.includes('tool-*') &&
    files.types.includes('ChatChunk.parts') &&
    files.types.includes('ChatChunk.messageId') &&
    files.types.includes('SendAutomaticallyWhen') &&
    files.types.includes('interface JsonSchemaDefinition') &&
    files.types.includes('type ToolSet') &&
    files.types.includes('type ChatToolsInput') &&
    files.types.includes('interface ModelMessage') &&
    files.types.includes('interface ConvertToModelMessagesOptions') &&
    files.types.includes('interface CreateIdGeneratorOptions') &&
    files.types.includes('createIdGenerator(options?)') &&
    files.types.includes('generateId(prefix?)') &&
    files.types.includes('type ChatRequestMessage = Message | ModelMessage') &&
    files.types.includes('jsonSchema(schema)') &&
    files.types.includes('dynamicTool()'),
  'English public type docs must expose Message.parts, ChatChunk.parts, ChatChunk.messageId, and SendAutomaticallyWhen'
)
expect(
  files.zhTypes.includes('type MessagePart =') &&
    files.zhTypes.includes('parts?: MessagePart[]') &&
    files.zhTypes.includes('messageId?: string') &&
    files.zhTypes.includes('MessageToolPart') &&
    files.zhTypes.includes('tool-*') &&
    files.zhTypes.includes('ChatChunk.parts') &&
    files.zhTypes.includes('ChatChunk.messageId') &&
    files.zhTypes.includes('SendAutomaticallyWhen') &&
    files.zhTypes.includes('interface JsonSchemaDefinition') &&
    files.zhTypes.includes('type ToolSet') &&
    files.zhTypes.includes('type ChatToolsInput') &&
    files.zhTypes.includes('interface ModelMessage') &&
    files.zhTypes.includes('interface ConvertToModelMessagesOptions') &&
    files.zhTypes.includes('interface CreateIdGeneratorOptions') &&
    files.zhTypes.includes('createIdGenerator(options?)') &&
    files.zhTypes.includes('generateId(prefix?)') &&
    files.zhTypes.includes('type ChatRequestMessage = Message | ModelMessage') &&
    files.zhTypes.includes('jsonSchema(schema)') &&
    files.zhTypes.includes('dynamicTool()'),
  'Chinese public type docs must expose Message.parts, ChatChunk.parts, ChatChunk.messageId, and SendAutomaticallyWhen'
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
  files.chatExample.includes('visibleMessageParts(message.parts)') &&
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
  'Docs UX check passed for language routing, roadmap, inspection, first-run paths, competitive positioning, provider presets, examples local run recipe, examples task chooser, form helpers, transcription/rerank docs, shared chat state, provider trace refs, message pruning, message persistence, proxy stream compatibility, file attachments, and demo navigation.'
)

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}
