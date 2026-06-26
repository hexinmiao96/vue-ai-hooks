# useChat

用于流式聊天补全的核心组合式函数。

公开 TypeScript 类型：`UseChatOptions`、`UseChatReturn`、`ToolCallHandler`、
`AppendChatOptions`、`AddToolOutputOptions`、`ToolApprovalResponse`、
`ChatFinishInfo`、`ChatStatus`、`RegenerateChatOptions`、`ResumeChatOptions`、
`PrepareSendMessagesRequest`、`PrepareSendMessagesRequestOptions`、
`PrepareReconnectToStreamRequest`、`PrepareReconnectToStreamRequestOptions`、
`SendChatTrigger`、`SetMessagesInput`、`PruneMessagesOptions`、
`PruneToolCallsStrategy`、`ChatPersistOptions`、`SerializedMessage`、
`StreamDataPart`、`ChatAttachmentInput`、`ChatAttachmentsInput`、
`MessagePart`、`MessageTextPart`、`MessageReasoningPart`、`MessageSourcePart`、
`MessageFilePart`、`MessageDataPart`、`MessageToolPart`、`ToolApprovalPredicate`、
`SendAutomaticallyWhen`、`SendAutomaticallyWhenOptions`、`IdGenerator`、
`ToolCallHandlerContext`、`ToolResultHandlerContext`、`RetryOptions` 和
`RetryContext`。

公开 helper：`pruneMessages`、`serializeMessages`、`deserializeMessages` 和
`lastAssistantMessageIsCompleteWithToolCalls`。

## 用法

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, handleSubmit, isLoading, stop } = useChat({
  provider: openai({ apiKey: '...' })
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

| 名称                              | 类型                                                                   | 默认值     | 说明                                                          |
| --------------------------------- | ---------------------------------------------------------------------- | ---------- | ------------------------------------------------------------- |
| `provider`                        | `ChatProvider`                                                         | 必填       | 要使用的 Provider。                                           |
| `id`                              | `string`                                                               | 自动生成   | 随 provider request 透传的稳定 chat id。                      |
| `generateId`                      | `IdGenerator`                                                          | `createId` | 覆盖自动生成 chat、message、tool 和 stream data id 的逻辑。   |
| `initialMessages`                 | `Message[]`                                                            | `[]`       | 初始消息历史。                                                |
| `initialInput`                    | `string`                                                               | `''`       | 同一个 id 的第一个实例用于初始化输入区。                      |
| `defaultRequest`                  | `Partial<ChatRequest>`                                                 | `{}`       | 合并到每次聊天请求中的默认选项。                              |
| `resume`                          | `boolean`                                                              | `false`    | 组合式函数创建时自动尝试 `resumeStream()`。                   |
| `prepareSendMessagesRequest`      | `PrepareSendMessagesRequest`                                           | -          | 发送或重新生成前，自定义最终 provider request。               |
| `prepareReconnectToStreamRequest` | `PrepareReconnectToStreamRequest`                                      | -          | `resumeStream()` 重连前，自定义最终恢复请求。                 |
| `tools`                           | `Tool[]`                                                               | -          | 默认工具列表。可以在调用 `append()` 时传入 `tools` 覆盖。     |
| `toolChoice`                      | `'auto' \| 'none' \| 'required' \| { ... }`                            | -          | 默认工具选择策略。                                            |
| `toolHandlers`                    | `Record<string, ToolCallHandler>`                                      | -          | 用于自动执行工具调用的本地 handler。                          |
| `requiresToolApproval`            | `ToolApprovalPredicate`                                                | -          | 返回 true 时暂停工具调用，等待 UI 确认后再执行。              |
| `sendAutomaticallyWhen`           | `SendAutomaticallyWhen \| false`                                       | helper     | 控制工具结果齐备后是否自动发起下一轮请求。                    |
| `maxToolRoundtrips`               | `number`                                                               | `1`        | 用户消息之后最多自动执行几轮工具调用。                        |
| `persist`                         | `ChatPersistOptions`                                                   | -          | 把 Date-safe 消息自动保存到 localStorage 或自定义 `Storage`。 |
| `maxRetries`                      | `number`                                                               | `0`        | 首个 stream chunk 到达前失败时最多重试几次。                  |
| `retryDelayMs`                    | `number \| (context: RetryContext) => number`                          | `0`        | 每次重试前等待的毫秒数。                                      |
| `shouldRetry`                     | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -          | 覆盖默认的错误是否可重试判断。                                |
| `onRetry`                         | `(error: Error, context: RetryContext) => void`                        | -          | 等待并重新发起请求前调用。                                    |
| `throttleMs`                      | `number`                                                               | -          | 响应式消息和 `streamData` 更新之间的最小等待毫秒数。          |
| `experimental_throttle`           | `number`                                                               | -          | AI SDK 风格兼容别名。新代码建议使用 `throttleMs`。            |
| `onChunk`                         | `(chunk: ChatChunk, assistant: Message) => void`                       | -          | 每个原始 chat chunk 应用到助手消息后调用。                    |
| `onData`                          | `(part: StreamDataPart) => void`                                       | -          | 收到自定义流数据片段时调用，包括 transient 片段。             |
| `onToolCall`                      | `(args: unknown, context: ToolCallHandlerContext) => void`             | -          | 注册的本地工具 handler 执行前调用。                           |
| `onToolResult`                    | `(result: unknown, context: ToolResultHandlerContext) => void`         | -          | 本地工具 handler 返回并生成 `tool` 消息后调用。               |
| `onUpdate`                        | `(m: Message) => void`                                                 | -          | 每次流式片段更新时调用。                                      |
| `onFinish`                        | `(m: Message, info: ChatFinishInfo) => void`                           | -          | 助手消息完成时调用一次。                                      |
| `onError`                         | `(e: Error) => void`                                                   | -          | 发生错误时调用；未传入时会写入 `error` ref。                  |

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

存储里的坏数据会被忽略，不会写入 `messages`。调用 `clear()` 时，也会移除对应的
持久化记录。

如果你的应用要把对话保存到数据库或自己的后端，可以直接复用这两个 helper：

```ts
const payload = serializeMessages(messages.value)
await saveChat('support-thread-1', payload)

const restored = deserializeMessages(await loadChat('support-thread-1'))
if (restored) setMessages(restored)
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
      raw && typeof raw === 'object' && 'messages' in raw ? deserializeMessages(raw.messages) : null
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

## 返回值

| 属性                            | 类型                                                                   | 说明                                                         |
| ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `id`                            | `Ref<string>`                                                          | 会随 provider request 透传的稳定 chat id。                   |
| `messages`                      | `Ref<Message[]>`                                                       | 完整消息历史，包括 user、assistant、system 和 tool。         |
| `input`                         | `Ref<string>`                                                          | 可绑定到输入框；`handleSubmit()` 成功后会清空。              |
| `status`                        | `Ref<ChatStatus>`                                                      | 请求生命周期：`ready`、`submitted`、`streaming` 或 `error`。 |
| `usage`                         | `Ref<TokenUsage \| null>`                                              | Provider 片段中最近一次归一化后的 token usage。              |
| `streamData`                    | `Ref<StreamDataPart[]>`                                                | 当前 assistant 轮次收集到的自定义流数据。                    |
| `pendingToolCalls`              | `Ref<ToolCall[]>`                                                      | 等待手动提交结果的工具调用。                                 |
| `isLoading`                     | `Ref<boolean>`                                                         | 流式请求进行中时为 true。                                    |
| `error`                         | `Ref<Error \| null>`                                                   | 最近一次错误；下次 `append` 时清空。                         |
| `append(content, opts?)`        | `(string \| Message, AppendChatOptions) => Promise<void>`              | 发送或替换消息，并流式接收回复。                             |
| `sendMessage(content?, opts?)`  | `(string \| Message \| undefined, AppendChatOptions) => Promise<void>` | AI SDK 风格发送 helper；不传 content 时提交当前 messages。   |
| `addToolResult(id, res)`        | `(string, unknown, Partial<ChatRequest>) => Promise<void>`             | 追加手动工具结果；所有结果齐备后继续对话。                   |
| `addToolOutput(output)`         | `(AddToolOutputOptions, Partial<ChatRequest>) => Promise<void>`        | AI SDK 风格的手动工具输出别名。                              |
| `addToolApprovalResponse(resp)` | `(ToolApprovalResponse, Partial<ChatRequest>) => Promise<void>`        | AI SDK 风格的工具审批/拒绝别名。                             |
| `approveToolCall(id)`           | `(string, Partial<ChatRequest>) => Promise<void>`                      | 确认后运行等待审批的本地 handler，并在结果齐备后继续对话。   |
| `rejectToolCall(id)`            | `(string, unknown, Partial<ChatRequest>) => Promise<void>`             | 追加拒绝执行的工具结果，并在结果齐备后继续对话。             |
| `regenerate(opts?)`             | `(RegenerateChatOptions) => Promise<void>`                             | 重新生成最后一轮或指定 assistant 消息。                      |
| `resumeStream(opts?)`           | `(ResumeChatOptions) => Promise<void>`                                 | Provider 支持时恢复一个后端活动流。                          |
| `reload()`                      | `() => Promise<void>`                                                  | 重新运行上一轮助手回复。                                     |
| `stop()`                        | `() => void`                                                           | 中止当前流式请求。                                           |
| `setId(id)`                     | `(string) => void`                                                     | 替换后续 provider request 使用的 chat id。                   |
| `setInput(value)`               | `(string) => void`                                                     | 手动替换输入区内容。                                         |
| `handleInputChange(event)`      | `(Event \| { target } \| string) => void`                              | 不使用 `v-model` 时接入自定义输入组件。                      |
| `handleSubmit(event, opts?)`    | `(Event?, AppendChatOptions?) => Promise<void>`                        | 接入表单提交；没有文本且没有附件时会忽略。                   |
| `setMessages(messages)`         | `(SetMessagesInput) => void`                                           | 替换消息历史，或通过函数式 updater 更新。                    |
| `clearError()`                  | `() => void`                                                           | 清空 `error`，并把 `status` 恢复为 `ready`。                 |
| `clear()`                       | `() => void`                                                           | 重置为空状态。启用 `persist` 时也会移除存储项。              |
| `abortController`               | `Ref<AbortController \| null>`                                         | 暴露给高级用法。                                             |

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

`onFinish(message, info)` 会收到最终助手消息，以及包含 `info.message`、
`info.messages`、`info.isAbort`、`info.isError` 和 `info.finishReason` 的快照。
如果流已经开始生成助手消息后失败，`onFinish` 会先以 `isError: true` 调用，然后再
触发 `onError`。

## 自定义 ID

当生成的 ID 需要可预测，或必须来自应用自己的 ID 服务时，可以传入 `generateId`：

```ts
const { id, append } = useChat({
  provider,
  generateId: (prefix = 'msg') => `${prefix}_${crypto.randomUUID()}`
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

## 消息裁剪

长对话只想把有用上下文发给 provider 或代理后端时，可以使用 `pruneMessages()`。它可以保留
system 消息、只保留最近 N 条非 system 消息、移除空消息，并裁剪历史工具调用/结果：

```ts
import { pruneMessages, useChat } from 'vue-ai-hooks'

const { append } = useChat({
  provider,
  prepareSendMessagesRequest({ request }) {
    return {
      messages: pruneMessages({
        messages: request.messages,
        maxMessages: 12,
        toolCalls: 'before-last-message'
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
| `toolCalls`     | `'none' \| 'all' \| 'before-last-message' \| before-last-N-messages` | `'none'`   | 移除历史 assistant tool calls 和对应的 tool 结果消息。 |

## 请求准备钩子

当后端需要根据当前 chat id、触发来源、metadata、headers 或最终消息列表做最后一层
请求改写时，可以使用 `prepareSendMessagesRequest`：

```ts
const { append, regenerate } = useChat({
  provider,
  id: 'thread_1',
  defaultRequest: {
    body: { tenantId: 'acme' },
    headers: { 'X-App': 'support-console' }
  },
  prepareSendMessagesRequest({ id, trigger, body, headers }) {
    return {
      headers: { ...headers, 'X-Chat-Id': id },
      body: { ...body, trigger }
    }
  }
})

await append('Summarize the latest ticket.')
await regenerate({ messageId: 'msg_assistant_1' })
```

该钩子接收 `PrepareSendMessagesRequestOptions`：`id`、`messages`、
`requestMetadata`、`body`、`headers`、完整 `request`、`trigger`
（`'submit-message'` 或 `'regenerate-message'`），以及可选 `messageId`。返回
`Partial<ChatRequest>` 可以覆盖请求字段；返回的 `body` 和 `headers` 会叠加到已经解析
好的请求上，避免默认值被意外丢掉。

可恢复代理流可以使用 `prepareReconnectToStreamRequest`：

```ts
const { resumeStream } = useChat({
  provider,
  id: 'thread_1',
  prepareReconnectToStreamRequest({ id, headers }) {
    return {
      headers: { ...headers, 'X-Resume-Thread': id }
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
  onToolCall(args, context) {
    console.debug('tool call', context.toolCall.function.name, args)
  },
  onToolResult(result, context) {
    console.debug('tool result', context.resultMessage.toolCallId, result)
  }
})

await append("What's the weather in Tokyo?")

console.log(messages.value.map((m) => m.role))
// ['user', 'assistant', 'tool', 'assistant']
```

库会把流式返回的 `tool_calls` delta 累积成 assistant 消息上的最终 `toolCalls[]`。
OpenAI-compatible Provider 使用 OpenAI wire format；Anthropic Provider 会把同一套公开 `Tool` 和 `tool` 消息映射到 Anthropic Messages API 格式。如果模型调用了未注册的工具，或者 handler 抛错，`append()` 会 reject，并写入 `error.value`。

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
```

也可以使用 AI SDK 风格别名：`addToolOutput({ toolCallId, output })`。如果浏览器侧工具执行失败，
传入 `{ toolCallId, state: 'output-error', errorText }`。

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

`addToolApprovalResponse({ id, approved, reason })` 是同一审批流程的 AI SDK 风格别名。

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
`initialMessages` 和 `initialInput`；后续实例会复用同一组 `messages`、`input`、`status`、loading、error、usage、stream data 和等待处理的工具调用 refs。

应用需要让后续 provider request 使用另一个后端线程 id 时，可以调用 `setId()`。它不会把当前 refs 重新绑定到另一个共享状态条目。单次请求的 `metadata` 也会通过 `ChatRequest` 透传；直连 Provider adapter 会在上游 API 不支持时忽略它，`proxyProvider` 会把它发送到你的后端 JSON body。

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
  defaultRequest: { metadata: { source: 'support-inbox' } }
})

mainChat.setInput('继续这个线程。')
await sidebarChat.handleSubmit(undefined, { metadata: { traceId: 'req_1' } })

mainChat.setId('backend-thread-2')
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
metadata 会合并到当前 assistant 消息；data 片段会通过 `streamData` 和 `onData` 暴露：

```ts
const { messages, streamData } = useChat({
  provider,
  onData(part) {
    console.debug(part.type, part.data)
  }
})

// 示例 provider chunk：
// { dataId: 'doc-1', dataType: 'source', data: { title: 'Vue docs' } }
```

当 `proxyProvider` 消费 AI SDK UI message stream 时，`start.messageMetadata`、
`finish.messageMetadata` 和 `message-metadata` 也会归一化到同一个 assistant
`metadata` 字段。

后续 chunk 使用同一个 `dataId` 时，会替换之前保存的片段。进度 tick 或调试事件可以设置
`transient: true`，这样只触发 `onData`，不会写入 `streamData` 或 `Message.parts`。

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
