import { readFileSync } from 'node:fs'

const files = {
  config: readFileSync('docs/.vitepress/config.ts', 'utf8'),
  home: readFileSync('docs/index.md', 'utf8'),
  zhHome: readFileSync('docs/zh/index.md', 'utf8'),
  gettingStarted: readFileSync('docs/guide/getting-started.md', 'utf8'),
  zhGettingStarted: readFileSync('docs/zh/guide/getting-started.md', 'utf8'),
  useChat: readFileSync('docs/reference/use-chat.md', 'utf8'),
  zhUseChat: readFileSync('docs/zh/reference/use-chat.md', 'utf8'),
  types: readFileSync('docs/reference/types.md', 'utf8'),
  zhTypes: readFileSync('docs/zh/reference/types.md', 'utf8'),
  providers: readFileSync('docs/reference/providers.md', 'utf8'),
  zhProviders: readFileSync('docs/zh/reference/providers.md', 'utf8'),
  examples: readFileSync('docs/examples/index.md', 'utf8'),
  zhExamples: readFileSync('docs/zh/examples/index.md', 'utf8'),
  chatExample: readFileSync('examples/chat/App.vue', 'utf8'),
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
  files.zhHome.includes('可以先不配置 API key'),
  'Chinese home page must tell users they can start without an API key'
)

for (const snippet of [
  '## Pick a path',
  '## Run a demo without API keys',
  'VITE_CHAT_PROVIDER=local-tools pnpm example:chat',
  'VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat',
  'Use this browser-key version for local exploration only',
  '[Examples](/examples/)'
]) {
  expect(files.gettingStarted.includes(snippet), `English getting started must include: ${snippet}`)
}

for (const snippet of [
  '## 先选一条路径',
  '## 不需要 API key 的 Demo',
  'VITE_CHAT_PROVIDER=local-tools pnpm example:chat',
  'VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat',
  '这段浏览器 key 写法只适合本地探索',
  '[示例](/zh/examples/)'
]) {
  expect(
    files.zhGettingStarted.includes(snippet),
    `Chinese getting started must include: ${snippet}`
  )
}

expect(
  files.examples.includes('<DemoShowcase locale="en" />'),
  'English examples page must render DemoShowcase with locale="en"'
)
expect(
  files.zhExamples.includes('<DemoShowcase locale="zh" />'),
  'Chinese examples page must render DemoShowcase with locale="zh"'
)

for (const snippet of [
  '## Which demo should I open first?',
  'Build a chat surface, structured parts, or approval flow',
  '[Streaming chat](#chat-demo)',
  'Extract typed JSON from a prompt',
  '[Structured object output](#object-demo)'
]) {
  expect(files.examples.includes(snippet), `English examples page must include: ${snippet}`)
}

for (const snippet of [
  '## 先看哪个示例？',
  '做聊天界面、结构化片段或工具审批',
  '[流式对话](#chat-demo)',
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
  files.demoShowcase.includes("localeKey === 'zh' ? 'zh-CN' : 'en'"),
  'DemoShowcase lang attribute must use the normalized locale key'
)
expect(
  files.demoShowcase.includes("quickChoiceTitle: 'Choose by job'"),
  'DemoShowcase must include an English job-based chooser'
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
    files.useChat.includes('It does not rebind the current refs'),
  'English useChat docs must explain same-id shared chat state and setId boundaries'
)
expect(
  files.useChat.includes('## Message pruning') &&
    files.useChat.includes('pruneMessages({') &&
    files.useChat.includes('PruneMessagesOptions') &&
    files.useChat.includes('PruneToolCallsStrategy'),
  'English useChat docs must document message pruning utility and public types'
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
    files.useChat.includes('SendAutomaticallyWhen'),
  'English useChat docs must document AI SDK-style tool result auto-send control'
)
expect(
  files.zhUseChat.includes('共享内存中的聊天状态') &&
    files.zhUseChat.includes('initialMessages') &&
    files.zhUseChat.includes('initialInput') &&
    files.zhUseChat.includes('不会把当前 refs 重新绑定'),
  'Chinese useChat docs must explain same-id shared chat state and setId boundaries'
)
expect(
  files.zhUseChat.includes('## 消息裁剪') &&
    files.zhUseChat.includes('pruneMessages({') &&
    files.zhUseChat.includes('PruneMessagesOptions') &&
    files.zhUseChat.includes('PruneToolCallsStrategy'),
  'Chinese useChat docs must document message pruning utility and public types'
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
    files.zhUseChat.includes('SendAutomaticallyWhen'),
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
  "label: 'useObject Properties'",
  "label: 'useObject Methods'",
  "label: 'useChat 参数'",
  "label: 'useChat 方法'",
  "label: 'useCompletion 参数'",
  "label: 'useCompletion 方法'",
  "label: 'useEmbedding 参数'",
  "label: 'useEmbedding 方法'",
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
  'Docs UX check passed for language routing, first-run paths, examples task chooser, form helpers, shared chat state, message pruning, message persistence, proxy stream compatibility, file attachments, and demo navigation.'
)

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}
