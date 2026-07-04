# useChat

用于流式聊天补全的核心组合式函数。

公开 TypeScript 类型：`Chat`、`ChatOptions`、`UseChatOptions`、`UseChatReturn`、`ToolCallHandler`、
`AppendChatOptions`、`SendChatMessageInput`、`AddToolResultOptions`、`AddToolOutputOptions`、
`ToolApprovalResponse`、`ChatFinishInfo`、`ChatRequestInfo`、`ChatRequestLifecycleKind`、
`ChatResponseInfo`、`ChatStatus`、`RegenerateChatOptions`、`ResumeChatOptions`、
`RequestInspectionSnapshot`、
`ChatStreamProtocol`、
`PrepareSendMessagesRequest`、`PrepareSendMessagesRequestOptions`、
`PrepareStep`、`PrepareStepOptions`、
`PrepareReconnectToStreamRequest`、`PrepareReconnectToStreamRequestOptions`、
`SendChatTrigger`、`SetMessagesInput`、`SetDataInput`、`PruneMessagesOptions`、
`PruneToolCallsStrategy`、`PruneToolCallsRule`、`PruneToolCallsOption`、
`GetToolRenderPartsOptions`、`ToolRenderPart`、`ToolRenderStatus`、
`ConvertToModelMessagesOptions`、`ChatPersistOptions`、`SerializedMessage`、
`StreamDataPart`、`ChatAttachmentInput`、`ChatAttachmentsInput`、
`MessagePart`、`MessageTextPart`、`MessageReasoningPart`、`MessageSourcePart`、
`MessageFilePart`、`MessageDataPart`、`MessageToolPart`、`ToolApprovalPredicate`、
`DataPartSchema`、`DataPartSchemas`、`DataPartValidator`、
`MessageMetadataSchema`、`MessageMetadataValidator`、
`SendAutomaticallyWhen`、`SendAutomaticallyWhenOptions`、`IdGenerator`、
`ToolCallHandlerContext`、`ToolResultHandlerContext`、`StopWhen`、
`StopWhenOptions`、`JsonSchemaDefinition`、`ToolInputSchema`、`ToolExecute`、
`ToolHandlerFor`、`ToolHandlersFor`、`InferToolInput`、`InferToolOutput`、`InferUITools`、
`ToolModelOutput`、`ToolModelOutputContext`、`ToolDefinition`、`AnyToolDefinition`、`ToolSet`、`ChatToolsInput`、
`ValidateMessagesOptions`、`ValidateUIMessagesOptions`、`SafeValidateMessagesResult`、
`SafeValidateUIMessagesResult`、`RetryOptions` 和 `RetryContext`。

公开 helper：`pruneMessages`、`convertToModelMessages`、`serializeMessages`、
`deserializeMessages`、`validateMessages`、`safeValidateMessages`、
`validateUIMessages`、`safeValidateUIMessages` 和
`lastAssistantMessageIsCompleteWithToolCalls`、`stepCountIs`、`isStepCount`、
`hasToolCall`、`getToolRenderParts`、`jsonSchema`、`tool`、`dynamicTool`、`defineToolHandlers`。

## 用法

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, handleSubmit, isLoading, stop } = useChat({
  provider: openai({ apiKey: '...' })
})
```

如果走应用自己的后端，可以不传 `provider`，直接使用默认 proxy transport：

```ts
const chat = useChat({
  api: '/api/chat',
  headers: { 'X-Session': sessionId },
  body: { tenantId }
})
```

多个组件需要共享同一个控制对象时，可以先创建可复用 chat 实例：

```ts
import { Chat, useChat } from 'vue-ai-hooks'

const sharedChat = new Chat({
  api: '/api/chat',
  id: 'support-thread'
})

const chat = useChat({ chat: sharedChat })
```

传入 `chat` 后，`useChat()` 会直接返回这个实例，并忽略其它选项。Provider、transport、
id、持久化和回调应配置在 `new Chat(...)` 这一步。

传入自定义数据类型后，`streamData` 和 `onData` 会带上类型：

```ts
const { streamData } = useChat<{ progress: number; label?: string }>({
  provider,
  onData(part) {
    console.debug(part.data.progress)
  }
})
```

常见输入区可以直接接到 Vue 表单：

```vue
<template>
  <form @submit="handleSubmit">
    <textarea v-model="input" />
    <button :disabled="isLoading || !input.trim()">发送</button>
    <button type="button" :disabled="!isLoading" @click="stop">停止</button>
  </form>
</template>
```

## 选项

| 名称                              | 类型                                                                   | 默认值       | 说明                                                                            |
| --------------------------------- | ---------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| `chat`                            | `Chat`                                                                 | -            | 复用已有 chat 实例；传入后其它选项会被忽略。                                    |
| `provider`                        | `ChatProvider`                                                         | proxy        | 要使用的 Provider；省略时使用默认 proxy transport。                             |
| `transport`                       | `ChatProvider`                                                         | -            | AI SDK 风格的 `provider` 别名。                                                 |
| `api`                             | `string`                                                               | `/api/chat`  | 默认 proxy transport 的 chat URL。                                              |
| `baseURL`                         | `string`                                                               | -            | 拼接到默认 proxy transport URL 前的 base URL。                                  |
| `headers`                         | `HeadersInit \| () => HeadersInit`                                     | -            | 默认 proxy transport 的静态或动态 headers。                                     |
| `body`                            | `Record<string, unknown> \| () => ...`                                 | -            | 默认 proxy transport 附加到 JSON body 的字段。                                  |
| `credentials`                     | `RequestCredentials`                                                   | -            | 默认 proxy transport 的浏览器 credentials 模式。                                |
| `fetch`                           | `typeof fetch`                                                         | global       | 默认 proxy transport 的自定义 fetch 实现。                                      |
| `streamProtocol`                  | `ChatStreamProtocol`                                                   | auto         | 应用自有 chat proxy 的流协议提示；纯文本流使用 `'text'`。                       |
| `id`                              | `string`                                                               | 自动生成     | 随 provider request 透传的稳定 chat id。                                        |
| `threadId`                        | `string`                                                               | -            | 随 chat 和 resume request 透传的后端 thread id。                                |
| `forwardedProps`                  | `Record<string, unknown>`                                              | -            | 转发给 proxy/agent 后端的应用上下文 props。                                     |
| `agentContext`                    | `AgentContextRegistry \| AgentContextSnapshot[]`                       | -            | 运行时应用上下文，会以 system message 插入 chat 请求。                          |
| `agentContextMessage`             | `AgentContextMessageOptions`                                           | -            | 自定义生成的 context system message id、标题或时间戳。                          |
| `context`                         | `unknown`                                                              | -            | 只传给本地工具回调的客户端上下文。                                              |
| `generateId`                      | `IdGenerator`                                                          | `generateId` | 覆盖自动生成 chat、message、tool 和 stream data id 的逻辑。                     |
| `initialMessages`                 | `Message[]`                                                            | `[]`         | 初始消息历史。                                                                  |
| `messages`                        | `Message[]`                                                            | `[]`         | AI SDK 风格的 `initialMessages` 别名；两者同时存在时后者优先。                  |
| `initialInput`                    | `string`                                                               | `''`         | 同一个 id 的第一个实例用于初始化输入区。                                        |
| `defaultRequest`                  | `Partial<ChatRequest>`                                                 | `{}`         | 合并到每次聊天请求中的默认选项。                                                |
| `resume`                          | `boolean`                                                              | `false`      | 组合式函数创建时自动尝试 `resumeStream()`。                                     |
| `prepareStep`                     | `PrepareStep`                                                          | -            | 每个 assistant 步骤请求发出前做请求级自定义。                                   |
| `prepareSendMessagesRequest`      | `PrepareSendMessagesRequest`                                           | -            | 发送或重新生成前，自定义最终 provider request。                                 |
| `prepareReconnectToStreamRequest` | `PrepareReconnectToStreamRequest`                                      | -            | `resumeStream()` 重连前，自定义最终恢复请求。                                   |
| `tools`                           | `Tool[] \| ToolSet`                                                    | -            | 默认工具列表，或 AI SDK 风格工具映射。                                          |
| `activeTools`                     | `string[]`                                                             | -            | 按函数名筛选本次聊天/请求真正发送给 Provider 的工具。                           |
| `toolChoice`                      | `'auto' \| 'none' \| 'required' \| { ... }`                            | -            | 默认工具选择策略。                                                              |
| `toolHandlers`                    | `Record<string, ToolCallHandler>`                                      | -            | 用于自动执行工具调用的本地 handler。                                            |
| `requiresToolApproval`            | `ToolApprovalPredicate`                                                | -            | 返回 true 时暂停工具调用，等待 UI 确认后再执行。                                |
| `sendAutomaticallyWhen`           | `SendAutomaticallyWhen \| false`                                       | helper       | 控制工具结果齐备后是否自动发起下一轮请求。                                      |
| `stopWhen`                        | `StopWhen \| StopWhen[]`                                               | -            | 条件命中时停止工具结果后的自动续跑。                                            |
| `maxToolRoundtrips`               | `number`                                                               | `1`          | 用户消息之后最多自动执行几轮工具调用。                                          |
| `dataPartSchemas`                 | `DataPartSchemas<TData>`                                               | -            | 按 `dataType` 校验自定义流数据，再触发 `onData` 或保存。                        |
| `messageMetadataSchema`           | `MessageMetadataSchema<TMetadata>`                                     | -            | 消息 metadata 写入历史前先校验。                                                |
| `persist`                         | `ChatPersistOptions`                                                   | -            | 把 Date-safe 消息自动保存到 localStorage 或自定义 `Storage`。                   |
| `maxRetries`                      | `number`                                                               | `0`          | 首个 stream chunk 到达前失败时最多重试几次。                                    |
| `retryDelayMs`                    | `number \| (context: RetryContext) => number`                          | `0`          | 每次重试前等待的毫秒数。                                                        |
| `shouldRetry`                     | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -            | 覆盖默认的错误是否可重试判断。                                                  |
| `onRetry`                         | `(error: Error, context: RetryContext) => void`                        | -            | 等待并重新发起请求前调用。                                                      |
| `throttleMs`                      | `number`                                                               | -            | 响应式消息和 `streamData` 更新之间的最小等待毫秒数。                            |
| `experimental_throttle`           | `number`                                                               | -            | AI SDK 风格兼容别名。新代码建议使用 `throttleMs`。                              |
| `onChunk`                         | `(chunk: ChatChunk, assistant: Message) => void`                       | -            | 每个原始 chat chunk 应用到助手消息后调用。                                      |
| `onData`                          | `(part: StreamDataPart<TData>) => void`                                | -            | 收到自定义流数据片段时调用，包括 transient 片段。                               |
| `onRequest`                       | `(info: ChatRequestInfo) => void`                                      | -            | Provider 调用前，拿到最终 chat/resume request。                                 |
| `onResponse`                      | `(info: ChatResponseInfo) => void`                                     | -            | Provider 返回 chat/resume stream 或无活动 stream 后调用。                       |
| `onToolCall`                      | `ToolCallCallback`                                                     | -            | AI SDK 风格的 `({ toolCall })` 回调；旧的 `(args, context)` 仍然可用。          |
| `onToolResult`                    | `(result: unknown, context: ToolResultHandlerContext) => void`         | -            | 本地工具 handler 返回并生成 `tool` 消息后调用。                                 |
| `onUpdate`                        | `(m: Message) => void`                                                 | -            | 每次流式片段更新时调用。                                                        |
| `onFinish`                        | `ChatFinishCallback`                                                   | -            | AI SDK 风格的 `({ message, messages })` 回调；旧的 `(message, info)` 仍然可用。 |
| `onError`                         | `(e: Error) => void`                                                   | -            | 发生错误时调用；未传入时会写入 `error` ref。                                    |

## 文件附件

`append()` 的第二个参数可以直接接收浏览器文件：

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { useChat } from 'vue-ai-hooks'

const fileInput = shallowRef<HTMLInputElement | null>(null)
const { input, handleSubmit } = useChat({ provider })

async function send(event?: { preventDefault?: () => void }) {
  await handleSubmit(event, {
    attachments: fileInput.value?.files ?? undefined
  })
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <form @submit="send">
    <input ref="fileInput" type="file" multiple />
    <textarea v-model="input" />
    <button>发送</button>
  </form>
</template>
```

`attachments` 可以是 `<input type="file">` 得到的 `FileList`、`File[]`，也可以是
应用已经预加载好的文件对象：

```ts
await append('检查这些上传后的素材。', {
  attachments: [
    { name: 'screenshot.png', type: 'image/png', url: uploadedImageUrl },
    { name: 'notes.txt', type: 'text/plain', text: alreadyReadText }
  ]
})
```

浏览器里的 `image/*` 文件会在发送前转换成 `image_url` data URL。`image/*`
对象会直接使用自己的 `url`，适合文件已上传到你自己的存储后再发给模型。`text/*`
文件会转换成额外的文本片段；文本对象必须提供 `text`。`useChat` 不会替你拉取远程文本 URL。
不支持的文件类型会让 `append()` reject，并把错误写入 `error.value`。

## 消息持久化

`useChat({ persist })` 默认使用 `serializeMessages()` 和 `deserializeMessages()`。
`createdAt: Date` 会先保存成 ISO 字符串；恢复聊天时会重新变回 `Date`：

```ts
const { messages, append, clear } = useChat({
  provider,
  id: 'support-thread-1',
  persist: {
    key: 'support-thread-1',
    version: 1
  }
})
```

存储里的坏数据会被忽略，不会写入 `messages`。如果你想记录损坏 storage 或读取受阻，
可以使用 `persist.onLoadError`。调用 `clear()` 时，也会移除对应的持久化记录；如果要观测
storage 移除失败，可以使用 `persist.onClearError`。

如果你的应用要把对话保存到数据库或自己的后端，可以直接复用这两个 helper：

```ts
const payload = serializeMessages(messages.value)
await saveChat('support-thread-1', payload)

const restored = deserializeMessages(await loadChat('support-thread-1'))
if (restored) setMessages(restored)
```

只需要在导入或接收 payload 前做 boolean 门禁时，用 `validateMessages(raw)`；希望拿到
“恢复后的 messages 或错误”且不抛异常时，用 `safeValidateMessages(raw)`。迁移已有
AI SDK 服务端代码时，可以使用 `validateUIMessages(raw, options)`，或
`safeValidateUIMessages({ messages, metadataSchema, dataSchemas, tools })`。
UI-message helper 支持 AI SDK 风格的 `metadataSchema`、`dataSchemas` 别名，也支持通过
`tools` 校验恢复出来的 tool input。所有校验 helper 都支持 `messageMetadataSchema` 和
`dataPartSchemas`，因此导入的 payload 可以复用 `useChat()` 运行时的 schema：

```ts
const raw = await loadChat('support-thread-1')
const result = safeValidateMessages(raw, {
  messageMetadataSchema: {
    type: 'object',
    properties: { source: { type: 'string' } }
  },
  dataPartSchemas: {
    'data-progress': {
      type: 'object',
      properties: { value: { type: 'number' } }
    }
  }
})

if (!result.success) throw result.error
setMessages(result.messages)
```

AI SDK 风格的 object form 在 safe validation 成功时会同时暴露 `messages` 和 `data`：

```ts
const result = safeValidateUIMessages({
  messages: raw,
  metadataSchema: { type: 'object' },
  dataSchemas: {
    'data-progress': { type: 'object' }
  },
  tools
})

if (result.success) setMessages(result.data)
```

只有当你需要自定义包裹结构，或不想用默认 localStorage 时，才覆盖 `storage`、
`serialize` 或 `deserialize`：

```ts
const chat = useChat({
  provider,
  persist: {
    key: 'support-thread-1',
    storage: sessionStorage,
    serialize: (messages) => ({
      savedAt: new Date().toISOString(),
      messages: serializeMessages(messages)
    }),
    deserialize: (raw) =>
      raw && typeof raw === 'object' && 'messages' in raw
        ? deserializeMessages(raw.messages)
        : null,
    onLoadError: (error) => console.warn('Could not restore chat cache', error),
    onClearError: (error) => console.warn('Could not clear chat cache', error)
  }
})
```

## 结构化消息 parts

assistant 消息会继续保留 `content`，用于向后兼容的文本渲染；同时也可以包含
`Message.parts`，用于更丰富的 UI。流式过程中，`useChat` 会追加 text parts，把
source/file/custom data chunk 转成 `source`、`file` 和 `data-*` parts，并把累积后的工具调用同步成
`tool-*` parts：

```vue
<template>
  <article v-for="message in messages" :key="message.id">
    <template v-for="part in message.parts ?? []" :key="part.id ?? part.type">
      <p v-if="part.type === 'text'">{{ part.text }}</p>
      <a v-else-if="part.type === 'source'" :href="part.url">{{ part.title ?? part.url }}</a>
      <code v-else-if="part.type.startsWith('tool-')">{{ part.state }}</code>
    </template>
  </article>
</template>
```

`serializeMessages()` 和 `deserializeMessages()` 会保留合法的 `Message.parts`，
因此持久化聊天恢复后也能继续使用同一套结构化渲染状态。

### 工具渲染行

聊天界面需要稳定、headless 的工具调用/审批/结果渲染契约时，可以使用
`getToolRenderParts()`。它会读取 `Message.parts`、assistant `toolCalls`、
`role: 'tool'` 结果消息，以及可选的 `useChat().pendingToolCalls`；它不会注册全局
renderer，也不会替你渲染 UI。

```ts
const toolRows = computed(() =>
  getToolRenderParts({
    messages: chat.messages.value,
    pendingToolCalls: chat.pendingToolCalls.value
  })
)
```

每个 `ToolRenderPart` 都包含 `toolCallId`、`toolName`、原始 `state`、归一化后的
`status`、`pending`、可选 `input` / `inputText`、可选 `output`、可选
`errorText`，以及提供当前行状态的 `messageId`。`status` 取值为
`'inProgress'`、`'executing'`、`'awaitingAction'`、`'complete'` 或 `'error'`。

## 返回值

| 属性                            | 类型                                                                                           | 说明                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `id`                            | `Ref<string>`                                                                                  | 会随 provider request 透传的稳定 chat id。                   |
| `messages`                      | `Ref<Message[]>`                                                                               | 完整消息历史，包括 user、assistant、system 和 tool。         |
| `input`                         | `Ref<string>`                                                                                  | 可绑定到输入框；`handleSubmit()` 成功后会清空。              |
| `status`                        | `Ref<ChatStatus>`                                                                              | 请求生命周期：`ready`、`submitted`、`streaming` 或 `error`。 |
| `usage`                         | `Ref<TokenUsage \| null>`                                                                      | Provider 片段中最近一次归一化后的 token usage。              |
| `data`                          | `Ref<StreamDataPart<TData>[]>`                                                                 | `streamData` 的 AI SDK 风格别名。                            |
| `streamData`                    | `Ref<StreamDataPart<TData>[]>`                                                                 | 当前 assistant 轮次收集到的自定义流数据。                    |
| `pendingToolCalls`              | `Ref<ToolCall[]>`                                                                              | 等待手动提交结果的工具调用。                                 |
| `isLoading`                     | `Ref<boolean>`                                                                                 | 流式请求进行中时为 true。                                    |
| `error`                         | `Ref<Error \| null>`                                                                           | 最近一次错误；下次 `append` 时清空。                         |
| `lastRequest`                   | `Ref<ChatRequestInfo \| null>`                                                                 | 最近一次准备完成的 chat 或 resume 请求快照。                 |
| `lastResponse`                  | `Ref<ChatResponseInfo \| null>`                                                                | 最近一次 Provider 响应快照，包含 stream 是否已打开。         |
| `inspect()`                     | `() => RequestInspectionSnapshot<ChatRequestInfo, ChatResponseInfo>`                           | 最近一次请求/响应、timeline、重试与脱敏 curl 的快照。        |
| `append(content, opts?)`        | `(string \| Message, AppendChatOptions) => Promise<void>`                                      | 发送或替换消息，并流式接收回复。                             |
| `sendMessage(content?, opts?)`  | `(string \| Message \| SendChatMessageInput \| undefined, AppendChatOptions) => Promise<void>` | AI SDK 风格发送 helper；不传 content 时提交当前 messages。   |
| `addToolResult(input, opts?)`   | `(string, unknown, Partial<ChatRequest>) \| (AddToolResultOptions, Partial<ChatRequest>)`      | 追加手动工具结果；所有结果齐备后继续对话。                   |
| `addToolOutput(output)`         | `(AddToolOutputOptions, Partial<ChatRequest>) => Promise<void>`                                | AI SDK 风格的手动工具输出别名。                              |
| `addToolApprovalResponse(resp)` | `(ToolApprovalResponse, Partial<ChatRequest>) => Promise<void>`                                | AI SDK 风格的工具审批/拒绝别名。                             |
| `approveToolCall(id)`           | `(string, Partial<ChatRequest>) => Promise<void>`                                              | 确认后运行等待审批的本地 handler，并在结果齐备后继续对话。   |
| `rejectToolCall(id)`            | `(string, unknown, Partial<ChatRequest>) => Promise<void>`                                     | 追加拒绝执行的工具结果，并在结果齐备后继续对话。             |
| `regenerate(opts?)`             | `(RegenerateChatOptions) => Promise<void>`                                                     | 重新生成最后一轮或指定 assistant 消息。                      |
| `resumeStream(opts?)`           | `(ResumeChatOptions) => Promise<void>`                                                         | Provider 支持时恢复一个后端活动流。                          |
| `reload()`                      | `() => Promise<void>`                                                                          | 重新运行上一轮助手回复。                                     |
| `stop()`                        | `() => void`                                                                                   | 中止当前流式请求。                                           |
| `setId(id)`                     | `(string) => void`                                                                             | 替换后续 provider request 使用的 chat id。                   |
| `setInput(value)`               | `(string) => void`                                                                             | 手动替换输入区内容。                                         |
| `handleInputChange(event)`      | `(Event \| { target } \| string) => void`                                                      | 不使用 `v-model` 时接入自定义输入组件。                      |
| `handleSubmit(event, opts?)`    | `(Event?, AppendChatOptions?) => Promise<void>`                                                | 接入表单提交；没有文本且没有附件时会忽略。                   |
| `setMessages(messages)`         | `(SetMessagesInput) => void`                                                                   | 替换消息历史，或通过函数式 updater 更新。                    |
| `setData(data)`                 | `(SetDataInput<TData>) => void`                                                                | 替换自定义流数据，或通过函数式 updater 更新。                |
| `clearError()`                  | `() => void`                                                                                   | 清空 `error`，并把 `status` 恢复为 `ready`。                 |
| `clearTrace()`                  | `() => void`                                                                                   | 清空 `lastRequest` 和 `lastResponse`，不改变消息。           |
| `clear()`                       | `() => void`                                                                                   | 重置为空状态。启用 `persist` 时也会移除存储项。              |
| `abortController`               | `Ref<AbortController \| null>`                                                                 | 暴露给高级用法。                                             |

## 重试行为

`maxRetries` 默认是 `0`，所以已有调用仍然只发起一次 Provider 请求。开启后，
`useChat` 只会在首个 stream chunk 到达前失败时重试。只要已经收到内容、工具调用、
metadata 或自定义 data chunk，后续错误都会通过 `error` 和 `onError` 暴露，而不会
自动重试造成重复输出。

默认策略会重试类似网络错误的异常，以及 `AiHooksError.status` 为 `408`、`409`、
`425`、`429` 或 `5xx` 的错误。要阻止某个失败重试，可以从 `shouldRetry` 返回
`false`。

## 流式更新节流

设置 `throttleMs` 可以在快速流式响应中批量刷新响应式 `messages` 和 `streamData`：

```ts
const { append, messages } = useChat({
  provider,
  throttleMs: 50
})
```

`onChunk` 和 `onData` 仍会收到每个原始流事件。`onUpdate` 跟随节流后的助手消息
flush。`append()`、`regenerate()` 或 `resumeStream()` resolve 前一定会刷新最终
助手消息和 stream data。

## 生命周期回调

`onRequest(info)` 会在 `prepareStep`、`prepareSendMessagesRequest` 或
`prepareReconnectToStreamRequest` 产出最终请求之后、调用 Provider adapter 之前执行。
`info.kind` 为 `'chat'` 或 `'resume'`，`info.request` 是即将发送请求的浅拷贝快照，
`info.attempt` 从 1 开始，便于和 `onRetry` 串联分析。使用默认 proxy transport 时，
`info.api` 和 `info.credentials` 会反映配置的 chat URL 与浏览器 credentials 模式。

`onResponse(info)` 会在 Provider adapter 返回后执行。由于 `vue-ai-hooks` 的
Provider 层抽象了不同 fetch 客户端，回调里不会暴露原始 `Response` 对象，而是通过
`info.hasStream` 表示本次是否拿到了可消费的 stream。它适合做链路追踪、分析埋点、
请求日志和 resume 诊断。
同一份最新快照也会写入 `lastRequest` 和 `lastResponse`，方便内部保留 trace 状态，而不需要在
callback 里重复维护状态。支持面板需要展示脱敏请求/响应 metadata 时，应渲染 `inspect()` 输出。

`onFinish({ message, messages, isAbort, isError, isDisconnect, finishReason })`
会收到最终助手消息和会话快照。旧的 `onFinish(message, info)` 签名仍然可用于已有代码。
这个旧签名里的 `info` 对象仍然保留 `info.isDisconnect`。
如果流已经开始生成助手消息后失败，`onFinish` 会先以 `isError: true` 和
`isDisconnect: true` 调用，然后再触发 `onError`。

## 自定义 ID

当生成的 ID 需要可预测，或必须来自应用自己的 ID 服务时，可以传入 `generateId`。
如果 AI SDK 风格的随机生成器已经够用，可以直接使用内置 `createIdGenerator()`：

```ts
import { createIdGenerator } from 'vue-ai-hooks'

const { id, append } = useChat({
  provider,
  generateId: createIdGenerator({ separator: '_' })
})
```

未显式传入 `id` 时，`generateId` 会用于 chat id；它也会用于字符串创建的 user
message、assistant message、本地 tool result message，以及没有 `dataId` 的自定义
stream data。显式 message `id`、`messageId` 和 chunk `dataId` 会被保留。

## 请求 body 扩展

可以通过 `defaultRequest.body`，或 `append(message, { body })`、
`regenerate({ body })` 这类单次调用选项，传入 typed request options 尚未覆盖的
Provider 专属 JSON 字段：

```ts
await append('Use provider-specific options.', {
  body: {
    reasoning_effort: 'low',
    cache_control: { type: 'ephemeral' }
  }
})
```

`body` 会先合并，然后再写入 `messages`、`model`、`stream` 等显式字段；如果 key
冲突，typed request options 优先。

## Agent context

当模型或后端需要当前 Vue 应用状态，比如路由、选中记录、筛选条件或用户偏好时，使用
`useAgentContextRegistry()`。

```ts
const agentContext = useAgentContextRegistry()

useAgentContext(agentContext, {
  description: '当前工单筛选条件',
  value: () => ({
    status: filters.status,
    owner: filters.owner
  })
})

const chat = useChat({
  api: '/api/chat',
  agentContext,
  agentContextMessage: { title: 'Runtime context' }
})
```

上下文会在每次准备请求时解析，插入开头 system messages 之后，并且不会写入可见
`messages` 历史。如果后端希望接收结构化 JSON，可以在 `prepareSendMessagesRequest()`
里调用 `agentContext.toJSON()` 并放进 `body`。

## 消息裁剪

长对话只想把有用上下文发给 provider 或代理后端时，可以使用 `pruneMessages()`。它可以保留
system 消息、只保留最近 N 条非 system 消息、移除空消息，并裁剪历史 reasoning parts
和工具调用/结果：

```ts
import { pruneMessages, useChat } from 'vue-ai-hooks'

const { append } = useChat({
  provider,
  prepareSendMessagesRequest({ messages }) {
    return {
      messages: pruneMessages({
        messages,
        maxMessages: 12,
        reasoning: 'before-last-message',
        toolCalls: [{ type: 'before-last-message', tools: ['searchDocs', 'lookupAccount'] }]
      })
    }
  }
})

await append('使用最近的相关上下文。')
```

| 选项            | 类型                                                                 | 默认值     | 说明                                                   |
| --------------- | -------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| `messages`      | `Message[]`                                                          | 必填       | 要裁剪的历史。原数组和消息对象会被克隆。               |
| `maxMessages`   | `number`                                                             | -          | 保留最近 N 条非 system 消息。                          |
| `keepSystem`    | `boolean`                                                            | `true`     | 即使 `maxMessages` 裁剪历史，也保留 system 消息。      |
| `emptyMessages` | `'keep' \| 'remove'`                                                 | `'remove'` | 移除没有文本/图片内容且没有 tool call 的消息。         |
| `reasoning`     | `'none' \| 'all' \| 'before-last-message' \| before-last-N-messages` | `'none'`   | 移除历史 `reasoning` message parts。                   |
| `toolCalls`     | strategy 或 `{ type, tools? }[]`                                     | `'none'`   | 移除历史 assistant tool calls 和对应的 tool 结果消息。 |

`toolCalls` 可以使用和 `reasoning` 相同的字符串策略；如果只想裁剪指定工具，
也可以传规则数组。每条规则包含 `type: 'all' | 'before-last-message' |
before-last-N-messages`，以及可选的 `tools: string[]`。省略 `tools` 时，该规则会应用到所有工具调用。

## 模型消息转换

UI 里保留 render-only 的 `Message.parts`，但后端或 provider 请求只需要更小的模型上下文时，
可以使用 `convertToModelMessages()`：

```ts
import { convertToModelMessages, pruneMessages, useChat } from 'vue-ai-hooks'

const { append } = useChat({
  provider,
  prepareSendMessagesRequest({ messages }) {
    const pruned = pruneMessages({
      messages,
      maxMessages: 12,
      reasoning: 'before-last-message'
    })

    return {
      messages: convertToModelMessages(pruned)
    }
  }
})

await append('发送精简后的模型上下文。')
```

默认情况下，`convertToModelMessages(messages)` 会移除 UI-only 的 `parts`、`id`
和 `createdAt`，保留 `role`、`content`、`name`、工具调用字段和浅克隆的
`metadata`。后端需要这些字段时可以传 `{ preserveIds: true }` 或
`{ preserveCreatedAt: true }`；metadata 只应留在客户端时传 `{ stripMetadata: true }`。
当 UI 中可能还有等待审批或尚未返回结果的工具调用时，可以传
`{ ignoreIncompleteToolCalls: true }`，只保留已经有匹配 `role: 'tool'` 结果消息的
tool call。
工具定义里包含 `toModelOutput`、且希望把 tool result 消息转换成模型可读文本或多模态
`ContentPart[]` 时，可以传 `{ tools }`。
自定义 `data-*` parts 默认也会被移除。某个 data part 需要变成模型可读上下文时，显式传入
`convertDataPart`：

```ts
const modelMessages = convertToModelMessages(messages.value, {
  convertDataPart(part) {
    if (part.type !== 'data-chart') return
    const data = part.data as { title?: string; value?: number }
    return `图表 ${data.title}: ${data.value}`
  }
})
```

`ChatRequest.messages` 接收 `ChatRequestMessage[]`，因此
`prepareSendMessagesRequest` 和 `prepareStep` 可以返回面向 provider/proxy 请求的
`ModelMessage[]`，响应式 UI 状态仍保持 `Message[]`。请求准备钩子里，使用
`messages` 获取 UI 快照；需要已经准备好的 provider payload 时再读取 `request.messages`。

## 请求准备钩子

当后端需要根据当前 chat id、proxy `api`、credentials、trigger、AI SDK trigger、
metadata、headers 或最终消息列表做最后一层请求改写时，可以使用
`prepareSendMessagesRequest`：

```ts
const { append, regenerate } = useChat({
  provider,
  id: 'thread_1',
  defaultRequest: {
    body: { tenantId: 'acme' },
    headers: { 'X-App': 'support-console' }
  },
  prepareSendMessagesRequest({ id, api, credentials, trigger, aiSdkTrigger, body, headers }) {
    return {
      headers: { ...headers, 'X-Chat-Id': id, 'X-Chat-Api': api ?? 'direct' },
      body: { ...body, credentials, trigger, aiSdkTrigger }
    }
  }
})

await append('Summarize the latest ticket.')
await regenerate({ messageId: 'msg_assistant_1' })
```

该钩子接收 `PrepareSendMessagesRequestOptions`：`id`、`messages`、
`requestMetadata`、`body`、`headers`、完整 `request`、`trigger`
（`'submit-message'` 或 `'regenerate-message'`）、`aiSdkTrigger`
（`'submit-user-message'` 或 `'regenerate-assistant-message'`），以及可选
`messageId`。返回 `Partial<ChatRequest>` 可以覆盖请求字段；返回的 `body` 和
`headers` 会叠加到已经解析好的请求上，避免默认值被意外丢掉。

可恢复代理流可以使用 `prepareReconnectToStreamRequest`：

```ts
const { resumeStream } = useChat({
  provider,
  id: 'thread_1',
  prepareReconnectToStreamRequest({ id, api, headers }) {
    return {
      headers: { ...headers, 'X-Resume-Thread': id, 'X-Chat-Api': api ?? 'direct' }
    }
  }
})

await resumeStream({ body: { reason: 'manual-retry' } })
```

重连钩子接收 `PrepareReconnectToStreamRequestOptions`：`id`、`requestMetadata`、
`body`、`headers` 和完整 `ChatResumeRequest`。

## 本地消息更新

`setMessages()` 可以接收完整消息数组，也可以接收一个函数；该函数会拿到当前
messages 的快照：

```ts
setMessages((messages) => [...messages, { id: 'note_1', role: 'assistant', content: 'Local note' }])
```

这个能力适合乐观编辑、外部恢复流程或本地系统消息。调用 `setMessages()` 也会清理
`streamData` 和 pending tool calls 等当前轮次状态。

## Tool calling

传入 `tools` 后，模型可以选择调用函数，而不是只返回文本。如果同时传入 `toolHandlers`，`useChat` 会解析参数、执行匹配的本地 handler、追加 `tool` 消息，并自动继续下一轮模型请求：

```ts
const { messages, append } = useChat({
  provider: openai({ apiKey: '...' }),
  tools: [
    {
      type: 'function',
      function: {
        name: 'getWeather',
        description: 'Get the weather in a city',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city']
        }
      }
    }
  ],
  toolHandlers: {
    async getWeather(args) {
      const { city } = args as { city: string }
      return { city, temp: 22, conditions: 'sunny' }
    }
  },
  onToolCall({ toolCall }) {
    console.debug('tool call', toolCall.toolName, toolCall.input)
  },
  onToolResult(result, context) {
    console.debug('tool result', context.resultMessage.toolCallId, result)
  }
})

await append("What's the weather in Tokyo?")

console.log(messages.value.map((m) => m.role))
// ['user', 'assistant', 'tool', 'assistant']
```

也可以使用 AI SDK 风格的工具 helper。`tool()` 可以把定义和 `execute` handler 放在一起；
`dynamicTool()` 适合运行时才确定的工具形态：

```ts
import { jsonSchema, tool, dynamicTool, useChat } from 'vue-ai-hooks'

const chat = useChat({
  provider,
  tools: {
    getWeather: tool<{ city: string }, { temp: number }>({
      description: '查询某个城市天气',
      inputSchema: jsonSchema({
        type: 'object',
        required: ['city'],
        properties: { city: { type: 'string' } },
        additionalProperties: false
      }),
      strict: true,
      async execute({ city }) {
        return { temp: await weatherService.temperature(city) }
      },
      toModelOutput(output) {
        return `天气：${output.temp}`
      }
    }),
    runtimeLookup: dynamicTool({
      parameters: { type: 'object', additionalProperties: true }
    })
  }
})
```

当 handler 不写在工具定义里时，可以用 `defineToolHandlers()` 让 handler 参数跟
`ToolSet` 保持类型一致：

```ts
import { defineToolHandlers, tool, useChat, type InferUITools } from 'vue-ai-hooks'

const tools = {
  getWeather: tool<{ city: string }, { temp: number }>({
    description: '查询某个城市天气'
  })
}

type AppTools = InferUITools<typeof tools>
// AppTools['getWeather']['input'] 是 { city: string }
// AppTools['getWeather']['output'] 是 { temp: number }

const chat = useChat({
  provider,
  tools,
  toolHandlers: defineToolHandlers(tools, {
    getWeather(input) {
      return weatherService.current(input.city)
    }
  })
})
```

Provider 请求仍会收到归一化后的 OpenAI-compatible `Tool[]`。如果同时传入
`toolHandlers`，显式 handler 会覆盖 helper 定义里的 `execute`。
`toModelOutput` 会被 `convertToModelMessages(messages, { tools })` 使用，用于把已存储的
tool result 消息转换成面向模型的文本或现有 `ContentPart[]`。

浏览器本地工具需要 store、session 快照或客户端服务实例时，可以使用 `context`。它会通过
`ToolCallHandlerContext.context` 传给 `toolHandlers`、`requiresToolApproval`、旧签名
`onToolCall(args, context)` 和 `onToolResult`；不会复制进 provider request。AI SDK 风格的
`onToolCall({ toolCall, context })` 会收到同一个运行时上下文，以及
`toolCall.toolName`、`toolCall.toolCallId`、`toolCall.input` 和 `toolCall.dynamic`。
proxy/agent 后端需要 JSON 上下文时，应使用 `forwardedProps`。

库会把流式返回的 `tool_calls` delta 累积成 assistant 消息上的最终 `toolCalls[]`。
OpenAI-compatible Provider 使用 OpenAI wire format；Anthropic Provider 会把同一套公开 `Tool` 和 `tool` 消息映射到 Anthropic Messages API 格式。如果模型调用了未注册的工具，或者 handler 抛错，`append()` 会 reject，并写入 `error.value`。

当页面有一组默认工具，但某条消息只想开放其中一部分时，可以使用 `activeTools`。
这个筛选会在发送 Provider request 之前完成，`activeTools` 本身不会透传：

```ts
const { append } = useChat({
  provider,
  tools: [searchDocsTool, chargeCardTool],
  activeTools: ['searchDocs']
})

await append('只搜索文档。')
await append('准备结账。', { activeTools: ['chargeCard'] })
await append('不用工具直接回答。', { activeTools: [] })
```

对于需要用户确认的工具，可以不传 `toolHandlers`。`useChat` 会把调用暴露到
`pendingToolCalls`；当 UI 完成确认或浏览器侧操作后，调用 `addToolResult()`。如果模型一次请求多个工具，只有所有 pending 调用都有结果后才会继续下一轮对话：

```ts
const { pendingToolCalls, addToolResult, append } = useChat({
  provider: openai({ apiKey: '...' }),
  tools: [confirmPurchaseTool]
})

await append('购买专业版。')

const [call] = pendingToolCalls.value
await addToolResult(call.id, { approved: true })
await addToolResult({ tool: 'confirmPurchase', toolCallId: call.id, output: { approved: true } })
```

也可以使用 AI SDK 风格对象签名：`addToolResult({ toolCallId, output })` 或
`addToolOutput({ toolCallId, output })`。如果浏览器侧工具执行失败，传入
`{ toolCallId, state: 'output-error', errorText }`。

默认情况下，只要最新 assistant 工具调用都有对应的 `tool` 结果消息，`useChat` 就会自动继续下一轮。传入
`sendAutomaticallyWhen: false` 可以关闭自动续跑；也可以显式传入
`lastAssistantMessageIsCompleteWithToolCalls`，保持和 AI SDK 风格一致的配置方式：

```ts
import { lastAssistantMessageIsCompleteWithToolCalls, useChat } from 'vue-ai-hooks'

const chat = useChat({
  provider,
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls
})
```

自动工具循环需要按条件停住时，可以使用 `stopWhen`。内置 helper 覆盖常见限制：
`stepCountIs(n)` 会在第 N 个 assistant 工具调用步骤后停止，`isStepCount(n)` 是同一
helper 的旧名称，`hasToolCall(...names)` 会在最新 assistant 步骤调用指定工具时停止：

```ts
import { hasToolCall, stepCountIs, useChat } from 'vue-ai-hooks'

const chat = useChat({
  provider,
  tools: [searchDocsTool, chargeCardTool],
  toolHandlers,
  maxToolRoundtrips: 4,
  stopWhen: [stepCountIs(3), hasToolCall('chargeCard')]
})
```

`stopWhen` 会在工具结果已经追加、下一次 assistant request 发起之前执行；它不会中止当前流。

自动工具循环需要按步骤调整请求时，可以使用 `prepareStep`，例如切换
`activeTools`、追加 trace metadata，或在工具结果回来后降低 temperature。它会在
`prepareSendMessagesRequest` 之前执行，并收到从 0 开始的 `stepNumber` 和最新
assistant 的 `toolCalls`：

```ts
const chat = useChat({
  provider,
  tools: [searchDocsTool, chargeCardTool],
  toolHandlers,
  maxToolRoundtrips: 3,
  prepareStep({ stepNumber, toolCalls, body }) {
    return {
      body: {
        ...body,
        stepNumber,
        lastToolNames: toolCalls.map((call) => call.function.name)
      },
      activeTools: stepNumber === 0 ? ['searchDocs'] : ['chargeCard']
    }
  }
})
```

关闭自动续跑时，可以在 `addToolResult()` 或 `addToolOutput()` 之后无参调用
`sendMessage()`，提交当前 messages，让模型从工具结果继续生成。

如果某个已注册的本地 handler 仍然需要用户确认，可以传入
`requiresToolApproval`。匹配到的调用会先进入 `pendingToolCalls`，不会立即执行
handler。用户确认后调用 `approveToolCall()` 来运行 handler；拒绝时调用
`rejectToolCall()`，把拒绝结果回传给模型：

```ts
const { pendingToolCalls, approveToolCall, rejectToolCall, append } = useChat({
  provider: openai({ apiKey: '...' }),
  tools: [chargeCardTool],
  toolHandlers: {
    async chargeCard(args) {
      return await billing.charge(args)
    }
  },
  requiresToolApproval(_args, context) {
    return context.toolCall.function.name === 'chargeCard'
  }
})

await append('扣款。')

const [call] = pendingToolCalls.value
await approveToolCall(call.id)
// 或：await rejectToolCall(call.id, '用户拒绝')
```

`addToolApprovalResponse({ id, approved, reason })` 是 AI SDK 风格别名。有匹配的本地
handler 时，approved response 会运行该 handler；没有本地 handler 时，approved 或
denied response 会作为 `tool` 消息追加，让 proxy/backend 根据审批结果继续。

## 状态和重新生成

当 UI 需要区分“请求已提交”和“正在流式接收”时，使用 `status`。`clearError()` 只清空错误状态，不会修改消息历史。

```ts
const { append, regenerate, status, clearError } = useChat({ provider })

await append('解释一下计划。')

if (status.value === 'error') {
  clearError()
}

await regenerate()
```

给 `regenerate()` 传入 `messageId` 可以重新生成指定 assistant 轮次。该轮之后的消息会被丢弃，Provider 会收到生成这条 assistant 消息之前的上下文。

给 `append()` 传入 `messageId` 可以替换一条已有消息、丢弃该消息之后的历史，并基于编辑后的上下文流式生成新的 assistant 回复。这适合实现“编辑后重新发送”的聊天 UI。

```ts
await append('用更短的例子解释。', {
  messageId: 'msg_user_1',
  temperature: 0.2
})
```

## Chat 身份和请求 metadata

`useChat({ id })` 会维护一个响应式 chat id，把它带入每次 provider request，并让同一个
id 创建出来的多个 `useChat()` 实例共享内存中的聊天状态。某个 id 的第一个实例会写入
`initialMessages` 和 `initialInput`；`messages` 也可以作为 AI SDK 风格的
`initialMessages` 别名。后续实例会复用同一组 `messages`、`input`、`status`、loading、error、usage、stream data 和等待处理的工具调用 refs。

后端线程标识需要和客户端共享状态 id 分开时，可以使用 `threadId`。`forwardedProps`
用于把租户、路由、语言或 UI mode 等应用上下文传给 proxy/agent 后端。两者都可以写在
`useChat()`、`defaultRequest` 或单次调用里；单次调用优先，`forwardedProps` 会浅合并。

应用需要让后续 provider request 使用另一个 chat id 时，可以调用 `setId()`。它不会把当前 refs 重新绑定到另一个共享状态条目。单次请求的 `metadata` 也会通过 `ChatRequest` 透传；直连 Provider adapter 会在上游 API 不支持时忽略它，`proxyProvider` 会把它发送到你的后端 JSON body。

当 metadata 属于用户消息本身时，在 `append()`、`sendMessage()` 或
`handleSubmit()` 中传 `messageMetadata`。它会写入 `Message.metadata`，并随该条消息进入
Provider 请求。请求追踪、租户上下文或只给后端使用的字段，继续放在请求级 `metadata`、
`body` 或 `forwardedProps` 中。

```ts
const mainChat = useChat({
  provider,
  id: 'thread_1',
  initialMessages: restoredMessages,
  initialInput: draftText
})

const sidebarChat = useChat({
  provider,
  id: 'thread_1',
  threadId: 'backend-thread-1',
  forwardedProps: { locale: 'zh-CN' },
  defaultRequest: {
    metadata: { source: 'support-inbox' },
    forwardedProps: { route: '/support' }
  }
})

await sidebarChat.handleSubmit(undefined, {
  metadata: { traceId: 'req_1' },
  messageMetadata: { source: 'composer' },
  forwardedProps: { route: '/support/ticket-1' }
})

await sidebarChat.sendMessage(
  {
    text: '总结当前工单。',
    files: [{ type: 'text/plain', name: 'ticket.txt', text: ticketText }],
    metadata: { source: 'composer' },
    messageId: 'msg_user_1'
  },
  {
    metadata: { traceId: 'req_2' }
  }
)

mainChat.setId('client-chat-2')
```

## 可恢复流

`resumeStream()` 会按当前 chat id 重新连接后端仍在运行的流。这需要 Provider 支持
`resumeChat()`。`proxyProvider` 已经通过对 `resumeUrl` 发起 GET 请求实现了这个可选方法；直连厂商 Provider 不会自行恢复流。

```ts
const { resumeStream, status } = useChat({
  provider: proxyProvider({
    chatUrl: '/api/chat',
    resumeUrl: '/api/chat/:id/stream'
  }),
  id: 'thread_1',
  initialMessages: restoredMessages,
  resume: true
})

await resumeStream({ metadata: { reason: 'manual-retry' } })

console.log(status.value)
```

如果后端返回 `204 No Content`，不会新增 assistant 消息，状态会回到 `ready`。如果存在活动流，chunk 会优先追加到历史中最后一条 assistant 消息；否则会创建一条新的 assistant 消息。后端存储、活动流追踪和流过期策略仍由你的应用负责。

## 自定义流数据和 metadata

Provider 或 proxy endpoint 可以产出带有 `metadata` 和自定义 `data` 的 `ChatChunk`。
metadata 会合并到当前 assistant 消息；data 片段会通过 `streamData` 和 `onData` 暴露。
`data` 指向和 `streamData` 相同的 ref；`setData()` 可以替换或函数式更新已保存的片段：

```ts
const { data, messages, setData, streamData } = useChat<{ title: string; url?: string }>({
  provider,
  onData(part) {
    console.debug(part.type, part.data.title)
  }
})

setData((parts) => parts.filter((part) => part.type !== 'debug'))

// 示例 provider chunk：
// { dataId: 'doc-1', dataType: 'source', data: { title: 'Vue docs' } }
```

当 `proxyProvider` 消费 AI SDK UI message stream 时，`start.messageMetadata`、
`finish.messageMetadata` 和 `message-metadata` 也会归一化到同一个 assistant
`metadata` 字段。

后续 chunk 使用同一个 `dataId` 时，会替换之前保存的片段。进度 tick 或调试事件可以设置
`transient: true`，这样只触发 `onData`，不会写入 `streamData` 或 `Message.parts`。
`useChat<TData>()` 泛型只作用于 `data`、`streamData`、`setData()` 和 `onData`；
持久化的 `Message.parts` 仍保持 Provider 无关，数据 payload 类型继续是 `unknown`。

当 proxy 或 Provider chunk 需要先校验再交给 UI 消费时，可以使用
`dataPartSchemas`：

```ts
const { append, streamData } = useChat<{ title: string; url?: string }>({
  provider,
  dataPartSchemas: {
    source: {
      type: 'object',
      required: ['title'],
      properties: {
        title: { type: 'string' },
        url: { type: 'string' }
      },
      additionalProperties: false
    }
  }
})
```

schema key 对应 `ChatChunk.dataType`。value 可以是 JSON Schema 对象，支持和
`useObject` 相同的常见子集（`type`、`required`、`enum`、`properties`、`items`
和 `additionalProperties`），也可以是 validator 函数：

```ts
const chat = useChat<{ url: string }>({
  provider,
  dataPartSchemas: {
    source: (data): data is { url: string } =>
      typeof data === 'object' && data !== null && 'url' in data && typeof data.url === 'string'
  }
})
```

无效 data part 会让当前请求以 `AiHooksError` reject，不会触发 `onData`，也不会写入
`streamData` 或 `Message.parts`。

当消息 metadata 写入历史前也需要校验时，可以使用 `messageMetadataSchema`。它会校验
`messageMetadata` 传入的 metadata、初始消息或 `setMessages()` 中已有的 metadata，以及
Provider/proxy chunk 的 `metadata`（在合并到 assistant 消息前）。请求级 `metadata`
不会被这个选项校验。

```ts
const chat = useChat<unknown, { source: string; confidence?: number }>({
  provider,
  messageMetadataSchema: {
    type: 'object',
    required: ['source'],
    properties: {
      source: { type: 'string' },
      confidence: { type: 'number' }
    },
    additionalProperties: false
  }
})

await chat.append('Search release notes.', {
  messageMetadata: { source: 'composer', confidence: 0.9 }
})
```

## 视觉输入

多模态内容可以以 `ContentPart` 数组的形式传入：

```ts
await append({
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image_url', image_url: { url: 'https://example.com/x.png' } }
  ]
})
```

对于 `data:` URL（base64），Anthropic Provider 会自动转换为正确的接口格式。OpenAI Provider 会直接透传。
