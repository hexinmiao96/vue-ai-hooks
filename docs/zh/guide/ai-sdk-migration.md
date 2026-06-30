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

| AI SDK UI 概念              | vue-ai-hooks 对应能力                                                |
| --------------------------- | -------------------------------------------------------------------- |
| `useChat()`                 | `useChat()`                                                          |
| `transport`                 | `transport` 或 `provider`                                            |
| `DefaultChatTransport`      | 省略 `provider`，使用 `api`、`baseURL`、`headers`、`body`            |
| `messages` 初始选项         | `messages` 或 `initialMessages`                                      |
| 应用自行管理 input state    | 内置 `input`、`setInput()`、`handleInputChange()`                    |
| `sendMessage()`             | `sendMessage()`                                                      |
| `stop()`                    | `stop()`                                                             |
| `resumeStream()`            | `resumeStream()`，需要 provider 支持 `resumeChat`                    |
| `addToolOutput()`           | `addToolOutput()` 或 `addToolResult()`                               |
| `addToolApprovalResponse()` | `addToolApprovalResponse()`、`approveToolCall()`、`rejectToolCall()` |
| `stopWhen`                  | `stopWhen`                                                           |
| `experimental_throttle`     | `experimental_throttle`，或更推荐的 `throttleMs`                     |
| 自定义 stream data          | `streamData`、`onData` 和 `ChatChunk.data`                           |
| UI message stream 协议      | `proxyProvider` / 默认 proxy transport 支持                          |

## Transport

AI SDK 示例通常会构造 `DefaultChatTransport`。在 `vue-ai-hooks` 中，默认路径已经是
proxy transport：

```ts
import { useChat } from 'vue-ai-hooks'

const chat = useChat({
  api: '/api/chat',
  credentials: 'include',
  headers: () => ({ Authorization: `Bearer ${sessionToken}` }),
  body: () => ({ tenantId })
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
  stopWhen: isStepCount(4),
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

## 请求检查

AI SDK 迁移经常需要在切换 transport 时看清最终请求。可以使用内置 trace refs：

```ts
const { lastRequest, lastResponse, clearTrace } = useChat({ api: '/api/chat' })
```

这些 refs 会展示默认值、单次调用选项、body、headers 和 retry attempt 合并后的最终
provider/proxy 请求。

## 迁移清单

1. 把 AI SDK UI 的 import 替换为 `vue-ai-hooks`。
2. 将 `DefaultChatTransport` 选项映射到 `api`、`baseURL`、`headers`、`body`、
   `credentials` 和 `fetch`。
3. 通过 `messages` 或 `initialMessages` 保留已有初始历史。
4. 将模型直连调用替换为 `openai`、`deepseek`、`openrouter`、`gemini`、`anthropic`
   或 `openaiCompatible`。
5. 将工具结果逻辑迁移到 `addToolOutput()` 或 `addToolApprovalResponse()`。
6. 在切换生产流量前，把 `lastRequest` 和 `lastResponse` 接入调试视图。
7. 发布前运行 `pnpm release:check` 或你项目等价的门禁。
