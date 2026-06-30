import { readFileSync } from 'node:fs'

const files = {
  config: readFileSync('docs/.vitepress/config.ts', 'utf8'),
  home: readFileSync('docs/index.md', 'utf8'),
  zhHome: readFileSync('docs/zh/index.md', 'utf8'),
  choosing: readFileSync('docs/guide/choosing.md', 'utf8'),
  zhChoosing: readFileSync('docs/zh/guide/choosing.md', 'utf8'),
  gettingStarted: readFileSync('docs/guide/getting-started.md', 'utf8'),
  zhGettingStarted: readFileSync('docs/zh/guide/getting-started.md', 'utf8'),
  upgrade03: readFileSync('docs/guide/upgrade-0.3.md', 'utf8'),
  zhUpgrade03: readFileSync('docs/zh/guide/upgrade-0.3.md', 'utf8'),
  aiSdkMigration: readFileSync('docs/guide/ai-sdk-migration.md', 'utf8'),
  zhAiSdkMigration: readFileSync('docs/zh/guide/ai-sdk-migration.md', 'utf8'),
  useChat: readFileSync('docs/reference/use-chat.md', 'utf8'),
  zhUseChat: readFileSync('docs/zh/reference/use-chat.md', 'utf8'),
  useEmbedding: readFileSync('docs/reference/use-embedding.md', 'utf8'),
  zhUseEmbedding: readFileSync('docs/zh/reference/use-embedding.md', 'utf8'),
  useImage: readFileSync('docs/reference/use-image.md', 'utf8'),
  zhUseImage: readFileSync('docs/zh/reference/use-image.md', 'utf8'),
  useObject: readFileSync('docs/reference/use-object.md', 'utf8'),
  zhUseObject: readFileSync('docs/zh/reference/use-object.md', 'utf8'),
  types: readFileSync('docs/reference/types.md', 'utf8'),
  zhTypes: readFileSync('docs/zh/reference/types.md', 'utf8'),
  providers: readFileSync('docs/reference/providers.md', 'utf8'),
  zhProviders: readFileSync('docs/zh/reference/providers.md', 'utf8'),
  examples: readFileSync('docs/examples/index.md', 'utf8'),
  zhExamples: readFileSync('docs/zh/examples/index.md', 'utf8'),
  readme: readFileSync('README.md', 'utf8'),
  zhReadme: readFileSync('README.zh-CN.md', 'utf8'),
  envExample: readFileSync('.env.example', 'utf8'),
  packageJson: readFileSync('package.json', 'utf8'),
  chatExample: readFileSync('examples/chat/App.vue', 'utf8'),
  imageExample: readFileSync('examples/image/App.vue', 'utf8'),
  objectExample: readFileSync('examples/object/App.vue', 'utf8'),
  demoShowcase: readFileSync('docs/.vitepress/theme/components/DemoShowcase.vue', 'utf8')
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
  '[v0.3.0 upgrade guide](/guide/upgrade-0.3)',
  '[AI SDK migration guide](/guide/ai-sdk-migration)',
  '## Run a demo without API keys',
  'pnpm example:chat',
  'falls back to `local-tools`',
  'VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat',
  'The browser sends provider-agnostic JSON to your own `/api/chat` route',
  "useImage({ baseURL: 'http://127.0.0.1:8787' })",
  "useObject({ baseURL: 'http://127.0.0.1:8787', schema })",
  '[Examples](/examples/)'
]) {
  expect(files.gettingStarted.includes(snippet), `English getting started must include: ${snippet}`)
}

for (const snippet of [
  '## 先选一条路径',
  '[选择 vue-ai-hooks](/zh/guide/choosing)',
  '[v0.3.0 升级指南](/zh/guide/upgrade-0.3)',
  '[AI SDK 迁移指南](/zh/guide/ai-sdk-migration)',
  '## 不需要 API key 的 Demo',
  'pnpm example:chat',
  '自动回退到 `local-tools`',
  'VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat',
  '浏览器会把框架无关的 JSON 发给你自己的 `/api/chat` 路由',
  "useImage({ baseURL: 'http://127.0.0.1:8787' })",
  "useObject({ baseURL: 'http://127.0.0.1:8787', schema })",
  '[示例](/zh/examples/)'
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
    files.envExample.includes('VITE_PROXY_OBJECT_URL=/api/ai/object'),
  '.env.example must make the chat, image, and object examples runnable without provider keys by default'
)
expect(
  files.chatExample.includes('const openAiKey =') &&
    files.chatExample.includes("'sk-...'") &&
    files.chatExample.includes("'local-tools'"),
  'Chat example must fall back to local-tools when no real OpenAI key is configured'
)
expect(
  files.readme.includes('defaults to the no-key `local-tools` provider') &&
    files.zhReadme.includes('默认使用不需要 key 的 `local-tools` Provider') &&
    files.readme.includes('`examples/image`') &&
    files.zhReadme.includes('`examples/image`') &&
    files.readme.includes('`examples/object`') &&
    files.zhReadme.includes('`examples/object`') &&
    files.readme.includes('/docs/guide/choosing.md') &&
    files.zhReadme.includes('/docs/zh/guide/choosing.md') &&
    files.readme.includes('/docs/guide/upgrade-0.3.md') &&
    files.zhReadme.includes('/docs/zh/guide/upgrade-0.3.md') &&
    files.readme.includes('/docs/guide/ai-sdk-migration.md') &&
    files.zhReadme.includes('/docs/zh/guide/ai-sdk-migration.md'),
  'Readmes must explain no-key chat defaults, list image/object examples, and link upgrade/migration guidance'
)

for (const snippet of [
  '# Choosing vue-ai-hooks',
  'Short answer',
  'Decision table',
  'Vercel AI SDK',
  'LangChain.js',
  'Direct fetch and SSE parsing',
  'VueUse',
  'Architecture fit',
  'What this package intentionally does not own'
]) {
  expect(files.choosing.includes(snippet), `English choosing guide must include: ${snippet}`)
}

for (const snippet of [
  '# 选择 vue-ai-hooks',
  '简短结论',
  '决策表',
  'Vercel AI SDK',
  'LangChain.js',
  '手写 fetch 和 SSE 解析',
  'VueUse',
  '架构适配',
  '本包刻意不负责什么'
]) {
  expect(files.zhChoosing.includes(snippet), `Chinese choosing guide must include: ${snippet}`)
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
  'DefaultChatTransport',
  'transport` or `provider`',
  'input`, `setInput()`, `handleInputChange()`',
  'addToolApprovalResponse()',
  'stopWhen',
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
  'DefaultChatTransport',
  'transport` 或 `provider`',
  'input`、`setInput()`、`handleInputChange()`',
  'addToolApprovalResponse()',
  'stopWhen',
  'UI message stream 协议',
  '迁移清单'
]) {
  expect(
    files.zhAiSdkMigration.includes(snippet),
    `Chinese AI SDK migration guide must include: ${snippet}`
  )
}
expect(
  files.packageJson.includes('"example:image"') &&
    files.packageJson.includes('"example:image:build"') &&
    files.packageJson.includes('pnpm example:image:build') &&
    files.packageJson.includes('"example:object"') &&
    files.packageJson.includes('"example:object:build"') &&
    files.packageJson.includes('pnpm example:object:build'),
  'package scripts must expose and build the image and object examples'
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
  'default `/api/chat`, `/api/completion`, `/api/embedding`, `/api/image`, and',
  'pnpm example:image',
  'deterministic local SVG',
  'proxy `/api/image`',
  '`local-object` provider',
  '## Which demo should I open first?',
  'Build a chat surface, structured parts, or approval flow',
  '[Streaming chat](#chat-demo)',
  'Generate an image through an app route',
  '[Image generation](#image-demo)',
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
  '`/api/chat`、`/api/completion`、`/api/embedding`、`/api/image`、`/api/object`',
  'pnpm example:image',
  '确定性的本地',
  'proxy `/api/image`',
  '`local-object` Provider',
  '## 先看哪个示例？',
  '做聊天界面、结构化片段或工具审批',
  '[流式对话](#chat-demo)',
  '通过应用后端生成图片',
  '[图片生成](#image-demo)',
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
    files.demoShowcase.includes("{ label: 'Composables', value: '6' }") &&
    files.demoShowcase.includes("{ label: 'Image', href: '#image-demo' }") &&
    files.demoShowcase.includes("{ label: 'useImage API', href: '#image-demo-api' }") &&
    files.demoShowcase.includes('const imageCode = computed') &&
    files.demoShowcase.includes('id="image-demo"'),
  'DemoShowcase must include the image generation demo and API shortcuts'
)
expect(
  files.demoShowcase.includes("quickChoiceTitle: '按任务选择'"),
  'DemoShowcase must include a Chinese job-based chooser'
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
    files.zhUseChat.includes('lastRequest') &&
    files.zhUseChat.includes('lastResponse') &&
    files.zhUseChat.includes('clearTrace()') &&
    files.readme.includes('lastRequest') &&
    files.zhReadme.includes('lastRequest') &&
    files.chatExample.includes('lastRequest') &&
    files.chatExample.includes('trace-panel'),
  'Docs and chat example must surface provider request trace refs'
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
    files.zhUseEmbedding.includes('initialInput') &&
    files.zhUseEmbedding.includes('input`') &&
    files.zhUseEmbedding.includes('setInput(value)') &&
    files.zhUseEmbedding.includes('handleInputChange(e)') &&
    files.zhUseEmbedding.includes('handleSubmit(e, opts?)') &&
    files.zhUseEmbedding.includes('Provider 错误会保留文本') &&
    files.readme.includes(
      '`useChat`, `useCompletion`, `useEmbedding`, `useImage`, and `useObject` also expose'
    ) &&
    files.zhReadme.includes(
      '`useChat`、`useCompletion`、`useEmbedding`、`useImage` 和 `useObject` 还提供'
    ),
  'Object and embedding docs plus READMEs must document form helpers'
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
  files.useChat.includes('## Message pruning') &&
    files.useChat.includes('pruneMessages({') &&
    files.useChat.includes('reasoning') &&
    files.useChat.includes("tools: ['searchDocs', 'lookupAccount']") &&
    files.useChat.includes('PruneMessagesOptions') &&
    files.useChat.includes('PruneToolCallsOption'),
  'English useChat docs must document message pruning utility, reasoning pruning, selected tool pruning, and public types'
)
expect(
  files.useChat.includes('## Message persistence') &&
    files.useChat.includes('ChatPersistOptions') &&
    files.useChat.includes('SerializedMessage') &&
    files.useChat.includes('serializeMessages(messages.value)') &&
    files.useChat.includes("deserializeMessages(await loadChat('support-thread-1'))"),
  'English useChat docs must document Date-safe message persistence helpers and public types'
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
    files.useChat.includes('SendAutomaticallyWhen') &&
    files.useChat.includes('call `sendMessage()` without content'),
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
  files.zhUseChat.includes('## 消息持久化') &&
    files.zhUseChat.includes('ChatPersistOptions') &&
    files.zhUseChat.includes('SerializedMessage') &&
    files.zhUseChat.includes('serializeMessages(messages.value)') &&
    files.zhUseChat.includes("deserializeMessages(await loadChat('support-thread-1'))"),
  'Chinese useChat docs must document Date-safe message persistence helpers and public types'
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
    files.zhUseChat.includes('SendAutomaticallyWhen') &&
    files.zhUseChat.includes('无参调用') &&
    files.zhUseChat.includes('`sendMessage()`'),
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
    files.types.includes('SendAutomaticallyWhen'),
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
    files.zhTypes.includes('SendAutomaticallyWhen'),
  'Chinese public type docs must expose Message.parts, ChatChunk.parts, ChatChunk.messageId, and SendAutomaticallyWhen'
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
  'Docs UX check passed for language routing, first-run paths, examples local run recipe, examples task chooser, form helpers, shared chat state, provider trace refs, message pruning, message persistence, proxy stream compatibility, file attachments, and demo navigation.'
)

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}
