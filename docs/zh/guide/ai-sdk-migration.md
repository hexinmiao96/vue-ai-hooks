# AI SDK 迁移

本指南面向熟悉 Vercel AI SDK UI API、希望迁移到更轻量 Vue-first composable
接口的团队。迁移时可以对照
[AI SDK `useChat` 参考](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)。

## 心智模型

`vue-ai-hooks` 保留了 AI SDK UI 中熟悉的高层概念：

- chat transport/provider。
- 响应式 messages 和 status。
- 消息发送 helper。
- 工具结果和审批 helper。
- stream data 和 metadata。
- 后端持有流的 resume 支持。

主要差异在封装方式：本库把这些能力放在 Vue refs 和 provider 对象里，而不是完整的全栈框架集成层。

## 快速映射

| AI SDK UI 概念                                      | vue-ai-hooks 对应能力                                                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useChat()`                                         | `useChat()`                                                                                                                                                   |
| `transport`                                         | `transport` 或 `provider`                                                                                                                                     |
| `DefaultChatTransport`                              | `new DefaultChatTransport(...)`，或省略 `provider` 并使用 `api`、`baseURL`、`headers`、`body`                                                                 |
| `DirectChatTransport`                               | `new DirectChatTransport({ stream })`，用于进程内 agent、测试和本地 demo                                                                                      |
| `messages` 初始选项                                 | `messages` 或 `initialMessages`                                                                                                                               |
| `convertToModelMessages()`                          | `convertToModelMessages()`，用于移除 UI-only 消息字段                                                                                                         |
| `validateUIMessages()` / `safeValidateUIMessages()` | `validateUIMessages()`、`safeValidateUIMessages()` 或 `safeValidateMessages()`，用于持久化聊天 payload                                                        |
| `generateId()` / `createIdGenerator()`              | `generateId()` 和 `createIdGenerator()`，用于覆盖 composable id 生成逻辑                                                                                      |
| 应用自行管理 input state                            | 内置 `input`、`setInput()`、`handleInputChange()`                                                                                                             |
| `sendMessage()`                                     | `sendMessage()`                                                                                                                                               |
| `stop()`                                            | `stop()`                                                                                                                                                      |
| `resumeStream()`                                    | `resumeStream()`，需要 provider 支持 `resumeChat`                                                                                                             |
| `addToolOutput()` / 已弃用的 `addToolResult()`      | `addToolOutput()` 或 `addToolResult({ toolCallId, output })`                                                                                                  |
| `addToolApprovalResponse()`                         | `addToolApprovalResponse()`、`approveToolCall()`、`rejectToolCall()`                                                                                          |
| `stepCountIs()`                                     | `stepCountIs()`，或旧名 `isStepCount()`，用于限制自动工具循环步骤数                                                                                           |
| `tool()` / `dynamicTool()`                          | `tool()`、`dynamicTool()` 和 `jsonSchema()` 配合 `useChat({ tools })`                                                                                         |
| `stopWhen`                                          | `stopWhen`                                                                                                                                                    |
| `experimental_throttle`                             | `experimental_throttle`，或更推荐的 `throttleMs`                                                                                                              |
| 自定义 stream data                                  | `data`、`streamData`、`setData()`、`onData` 和 `ChatChunk.data`                                                                                               |
| `experimental_useObject()`                          | `experimental_useObject()` 别名，或更推荐的 `useObject()`                                                                                                     |
| AI SDK Core 图片生成                                | `useImage()` 调用你的自有 `/api/image` 路由                                                                                                                   |
| AI SDK Core 视频生成                                | `useVideo()` 调用你的自有 `/api/video` 路由                                                                                                                   |
| AI SDK Core 语音生成                                | `useSpeech()` 调用你的自有 `/api/speech` 路由                                                                                                                 |
| AI SDK Core 音频转写                                | `useTranscription()` 调用你的自有 `/api/transcription` 路由                                                                                                   |
| AI SDK Core 文档重排                                | `useRerank()` 调用你的自有 `/api/rerank` 路由                                                                                                                 |
| AI SDK Core `cosineSimilarity()`                    | `cosineSimilarity()`，用于比较 embedding 向量                                                                                                                 |
| UI message stream 协议                              | `proxyProvider`、`createUIMessageStream()`、`createUIMessageStreamResponse()`、`pipeUIMessageStreamToResponse()`、`readUIMessageStream()` 和 `toChatChunks()` |

## Transport

AI SDK 示例通常会构造 `DefaultChatTransport`。`vue-ai-hooks` 也导出
`DefaultChatTransport`，并且默认 `useChat()` 路径已经是 proxy transport：

```ts
import { DefaultChatTransport, useChat } from 'vue-ai-hooks'

const chat = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    credentials: 'include',
    headers: () => ({ Authorization: `Bearer ${sessionToken}` }),
    body: () => ({ tenantId }),
    prepareSendMessagesRequest({ body, messages }) {
      return {
        body: { ...body, messageCount: messages.length }
      }
    }
  })
})
```

如果不需要复用 transport 实例，也可以省略 `provider`/`transport`，直接把 `api`、
`baseURL`、`headers` 和 `body` 传给 `useChat()`。

`DefaultChatTransport({ api })` 默认使用 `/api/chat`，可恢复流默认使用
`${api}/:id/stream`，除非显式传入 `resumeUrl`。已有 AI SDK 代码如果把 body 或
headers 准备逻辑放在 transport 上，可以继续使用 `prepareSendMessagesRequest` 和
`prepareReconnectToStreamRequest`；省略 transport 时再使用 `useChat()` 上的同名选项。

只有已有 chat endpoint 返回原始文本流时才需要 `streamProtocol: 'text'`。AI SDK UI message
stream、`ChatChunk` SSE 和 JSON chunk 响应保持默认即可。

```ts
const chat = useChat({
  api: '/api/chat',
  streamProtocol: 'text'
})
```

需要直连模型 adapter 时，使用 `provider` 或 `transport`：

```ts
const chat = useChat({
  transport: deepseek({
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
    timeoutMs: 30_000
  })
})
```

`transport` 是 AI SDK 风格别名。新代码可以使用 `provider` 或 `transport`；同一个代码库里建议统一一种命名。

如果模型或 agent 调用已经在同一进程内完成，只需要 Vue 的流式状态管理，可以使用
`DirectChatTransport`：

```ts
import { DirectChatTransport, useChat } from 'vue-ai-hooks'

const chat = useChat({
  transport: new DirectChatTransport({
    async *stream() {
      yield { type: 'text-delta', id: 'text_1', delta: '你好' }
      yield { type: 'finish', finishReason: 'stop' }
    }
  })
})
```

它默认消费 AI SDK UI message stream parts。使用 `onError` 可以先清洗本地 agent 失败，
再让它作为 UI message stream 错误浮到 UI。如果 handler 已经返回 `ChatChunk`，传入
`streamProtocol: 'chat-chunk'`。

## Input 处理

AI SDK v5 期望应用自行管理 input state。`vue-ai-hooks` 为 Vue 使用习惯保留了输入 helper：

```vue
<script setup lang="ts">
import { useChat } from 'vue-ai-hooks'

const { input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat'
})
</script>

<template>
  <form @submit="handleSubmit">
    <textarea :value="input" @input="handleInputChange" />
    <button :disabled="isLoading">Send</button>
  </form>
</template>
```

如果你已经自己管理输入状态，可以直接调用 `sendMessage()`：

```ts
await chat.sendMessage(draft.value, {
  metadata: { source: 'composer' }
})
```

## Messages

`messages` 可以作为 AI SDK 风格的初始历史别名：

```ts
useChat({
  id: 'support-thread',
  messages: restoredMessages
})
```

也支持 `initialMessages`，两者同时存在时 `initialMessages` 优先。返回的 `messages`
ref 仍是渲染时的事实来源。

从不可信来源恢复持久化 UI messages 前，可以先用 `safeValidateUIMessages()`。
它会恢复 `Date`，并用和 `useChat()` 相同的 schema 选项校验 `Message.parts`、message
metadata 和自定义 data parts：

```ts
const result = safeValidateUIMessages(rawMessages, {
  messageMetadataSchema,
  dataPartSchemas
})

if (result.success) {
  useChat({ messages: result.messages })
}
```

后端路由或 provider 调用需要面向模型的历史，而不是 UI 渲染状态时，可以使用
`convertToModelMessages(messages)`。它默认移除 `parts`、`id` 和 `createdAt`，
保留 content 和工具调用字段。某个自定义 `data-*` part 需要变成模型可读上下文时，使用
`convertDataPart`：

```ts
import { convertToModelMessages } from 'vue-ai-hooks'

const modelMessages = convertToModelMessages(chat.messages.value, {
  convertDataPart(part) {
    if (part.type !== 'data-chart') return
    return `图表上下文：${JSON.stringify(part.data)}`
  }
})
```

## Tools

本地工具 handler 通过 `toolHandlers` 传入：

```ts
const chat = useChat({
  api: '/api/chat',
  tools: [chargeCardTool],
  toolHandlers: {
    async chargeCard(args) {
      return await billing.charge(args)
    }
  }
})
```

AI SDK 风格工具定义也可以把 `execute` 和 schema 放在一起：

```ts
const chat = useChat({
  api: '/api/chat',
  tools: {
    chargeCard: tool({
      description: '扣款已保存银行卡',
      inputSchema: jsonSchema({
        type: 'object',
        required: ['amount'],
        properties: { amount: { type: 'number' } }
      }),
      async execute(args) {
        return await billing.charge(args)
      }
    })
  }
})
```

如果需要用户审批，不要在 config 里传 handler，手动响应即可：

```ts
await chat.addToolApprovalResponse({
  id: pendingToolCall.id,
  approved: true
})
```

`approveToolCall()` 和 `rejectToolCall()` 是同一流程的 Vue 友好封装。

## 多步骤循环

用 `stopWhen`、`sendAutomaticallyWhen` 和 `prepareStep` 控制自动工具循环：

```ts
const chat = useChat({
  api: '/api/chat',
  stopWhen: stepCountIs(4),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  prepareStep({ stepNumber, request }) {
    return {
      body: {
        ...request.body,
        stepNumber
      }
    }
  }
})
```

## Stream data 和 UI message stream

如果你的后端已经输出 AI SDK UI message stream parts，默认 proxy transport 可以直接消费。
text delta 会更新 assistant message，finish part 会更新 finish/usage 状态，data/source/file/tool-output
parts 会通过 `streamData` 和 `Message.parts` 暴露。

应用自定义数据可以通过泛型标注：

```ts
const { streamData } = useChat<{ progress: number; label?: string }>({
  api: '/api/chat'
})
```

## 结构化对象

AI SDK 把结构化输出 hook 命名为 `experimental_useObject()`。本库导出了同名兼容别名，所以迁移代码可以先保留原 import，新 Vue 代码则可以使用更短的 `useObject()`：

```ts
import { experimental_useObject as useObject } from 'vue-ai-hooks'
```

Vue 结构化输出表单也可以直接使用 `useObject()` 返回的 `input`、`setInput()`、
`handleInputChange()` 和 `handleSubmit()`。`handleSubmit()` 会在结构化响应成功后清空
`input`，Provider 或解析失败时保留输入。

## 请求检查

AI SDK 迁移经常需要在切换 transport 时看清最终请求。可以使用内置 trace refs：

```ts
const { lastRequest, lastResponse, clearTrace } = useChat({ api: '/api/chat' })
```

`useCompletion()` 和 `useObject()` 也提供同样的 trace refs。这些 refs 会展示默认值、单次调用选项、proxy `api`、credentials、body、headers 和 retry attempt 合并后的最终 provider/proxy 请求。默认 chat proxy transport 下，`prepareSendMessagesRequest`、`prepareStep` 和 `prepareReconnectToStreamRequest` 也会收到同一组 `api` 和 `credentials` 字段。

## 迁移清单

1. 把 AI SDK UI 的 import 替换为 `vue-ai-hooks`。
2. 保留 `DefaultChatTransport` 为 `new DefaultChatTransport(...)`；`api`、`headers`、
   `body`、`credentials`、`fetch`、`prepareSendMessagesRequest` 和
   `prepareReconnectToStreamRequest` 都可以继续放在 transport 上。
3. 将 AI SDK `DirectChatTransport` 风格的进程内 handler 映射到
   `new DirectChatTransport({ stream })`。
4. 已有 chat 或 completion 路由返回纯文本流时，映射 `streamProtocol: 'text'`。
5. 可以先保留 `experimental_useObject` import，也可以迁移完成后改名为 `useObject`。
6. 迁移已有 AI SDK object endpoint 时，可以让 `useObject` proxy 路由直接返回
   `text/plain` JSON 文本流。
7. 将图片生成调用迁移到 `useImage({ api: '/api/image' })`，并把图片模型凭据保留在服务端。
8. 将视频生成调用迁移到 `useVideo({ api: '/api/video' })`，并把视频模型凭据保留在服务端。
9. 将语音生成调用迁移到 `useSpeech({ api: '/api/speech' })`，并把文字转语音凭据保留在服务端。
10. 将音频转写调用迁移到 `useTranscription({ api: '/api/transcription' })`，并把转写凭据保留在服务端。
11. 将文档重排调用迁移到 `useRerank({ api: '/api/rerank' })`，并把重排模型凭据保留在服务端。
12. 通过 `messages` 或 `initialMessages` 保留已有初始历史。
13. 恢复持久化聊天历史前，用 `validateUIMessages()` 或
    `safeValidateUIMessages()` 做服务端 UI message 校验。
14. 将模型直连调用替换为 `openai`、`deepseek`、`openrouter`、`gemini`、`anthropic`
    或 `openaiCompatible`。
15. UI 需要 AI SDK 风格命名时，把自定义数据状态迁移到 `data` / `setData()`。
16. 将 AI SDK 的 `tool()` 定义直接放进 `useChat({ tools })`，或继续使用已有
    wire-format `Tool[]` 加 `toolHandlers`。
17. 将工具结果逻辑迁移到 `addToolOutput()`、`addToolResult({ toolCallId, output })` 或
    `addToolApprovalResponse()`。
18. 在切换生产流量前，把 `lastRequest` 和 `lastResponse` 接入调试视图。
19. 发布前运行 `pnpm release:check` 或你项目等价的门禁。
