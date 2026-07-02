# React hooks

`vue-ai-hooks/react` 是可选 React 入口。目前它提供 React 版 `useChat`、
`useCompletion` 和 `useObject`，用于流式 React UI，同时复用根入口里的 Provider、proxy
transport、请求追踪和 stream 格式。

只有使用这个子路径时，消费侧应用才需要安装 React：

```bash
pnpm add vue-ai-hooks react
```

如果要在仓库里直接运行不需要 Provider key 的 quickstart：

```bash
pnpm example:react-chat
```

demo 源码在 `examples/react-chat/App.tsx`。它使用 `DirectChatTransport`
和确定性的本地 stream，然后渲染 `lastRequest`、`lastResponse`、usage 和自定义
stream data，方便你在接真实 `/api/chat` 路由前检查 React 请求生命周期。

```tsx
import { useChat, useCompletion } from 'vue-ai-hooks/react'
import { openai } from 'vue-ai-hooks'

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, status, error, stop } = useChat({
    provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
  })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((message) => (
        <p key={message.id}>{typeof message.content === 'string' ? message.content : ''}</p>
      ))}
      <textarea value={input} onChange={handleInputChange} />
      <button disabled={status !== 'ready' || !input.trim()}>发送</button>
      <button type="button" disabled={status === 'ready'} onClick={stop}>
        停止
      </button>
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

单次文本补全可以使用：

```tsx
import { useCompletion } from 'vue-ai-hooks/react'
import { openai } from 'vue-ai-hooks'

export function CompletionBox() {
  const { completion, input, handleInputChange, handleSubmit, isLoading, error } = useCompletion({
    provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
  })

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={input} onChange={handleInputChange} />
      <button disabled={isLoading || !input.trim()}>补全</button>
      {completion ? <output>{completion}</output> : null}
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

JSON Schema 结构化输出可以使用：

```tsx
import { useObject } from 'vue-ai-hooks/react'
import { openai } from 'vue-ai-hooks'

interface Ticket {
  title: string
  priority: 'low' | 'high'
}

export function ObjectBox() {
  const { object, partialObject, input, handleInputChange, handleSubmit, isLoading, error } =
    useObject<Ticket>({
      provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY }),
      schemaName: 'ticket',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'high'] }
        },
        required: ['title', 'priority']
      }
    })

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={input} onChange={handleInputChange} />
      <button disabled={isLoading || !input.trim()}>提取</button>
      <output>{object ? object.title : partialObject?.title}</output>
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

## API

```ts
import { useChat, useCompletion, useObject } from 'vue-ai-hooks/react'
```

`useChat(options)` 接收 `UseReactChatOptions`：

| 选项                                                                              | 说明                                                                                             |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `provider` / `transport`                                                          | `ChatProvider`，可以是 `openai()`、`openrouter()`、`proxyProvider()` 或 `DefaultChatTransport`。 |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`                       | 没有传 provider 时使用的 proxy transport 配置。                                                  |
| `initialMessages`, `messages`, `initialInput`                                     | 初始 React 状态。                                                                                |
| `defaultRequest`, `threadId`, `forwardedProps`, `context`                         | 合并到 provider 请求里的默认值。                                                                 |
| `generateId`                                                                      | 自定义 chat、user、assistant 和 data id 生成器。                                                 |
| `prepareSendMessagesRequest`                                                      | chat 请求发出前的最终准备钩子。                                                                  |
| `prepareReconnectToStreamRequest`                                                 | 恢复流请求发出前的最终准备钩子。                                                                 |
| `onChunk`, `onData`, `onRequest`, `onResponse`, `onUpdate`, `onFinish`, `onError` | 生命周期回调。                                                                                   |

`UseReactChatReturn` 暴露普通 React state 和操作：

| 返回值                                                                                   | 说明                                                       |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `id`, `messages`, `input`, `status`, `usage`, `data`, `streamData`, `isLoading`, `error` | 当前聊天状态。                                             |
| `lastRequest`, `lastResponse`                                                            | 最近一次请求和响应追踪快照。                               |
| `append(content, options?)`                                                              | 添加或替换用户消息，并流式生成助手回复。                   |
| `sendMessage(content?, options?)`                                                        | AI SDK 风格发送 helper；不传 content 时提交当前 messages。 |
| `regenerate(options?)`, `reload()`                                                       | 从最近一个用户回合重新生成。                               |
| `resumeStream(options?)`                                                                 | 对实现了 `resumeChat()` 的 provider 恢复流。               |
| `stop()`                                                                                 | 中止当前流。                                               |
| `setInput(value)`, `handleInputChange(event)`, `handleSubmit(event, options?)`           | 受控 React 输入框和表单 helper。                           |
| `setMessages(next)`, `setData(next)`                                                     | 替换或函数式更新 messages 和 stream data。                 |
| `clearError()`, `clearTrace()`, `clear()`                                                | 重置错误、请求追踪或完整聊天状态。                         |

`useCompletion(options)` 接收 `UseReactCompletionOptions`：

| 选项                                                         | 说明                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `provider` / `transport`                                     | `ChatProvider`，可以是 `openai()`、Provider preset 或 `proxyProvider()`。 |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`  | 没有传 provider 时使用的 proxy transport 配置。                           |
| `initialInput`, `initialCompletion`                          | 初始 React 状态。                                                         |
| `defaultRequest`, `streamProtocol`                           | 合并到每次 `CompletionRequest` 的默认值。                                 |
| `id`, `generateId`                                           | 请求 trace 使用的稳定 id 和自定义 id 生成器。                             |
| `onUpdate`, `onRequest`, `onResponse`, `onFinish`, `onError` | 流式文本、trace、完成和 Provider 错误的生命周期回调。                     |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`       | 重试控制；只有首个文本 delta 到达前的失败会重试。                         |
| `throttleMs`, `experimental_throttle`                        | 快速流式响应期间 React state 更新的最小间隔。                             |

`UseReactCompletionReturn` 暴露普通 React state 和操作：

| 返回值                                                      | 说明                                            |
| ----------------------------------------------------------- | ----------------------------------------------- |
| `id`, `completion`, `input`, `status`, `isLoading`, `error` | 当前补全状态。                                  |
| `lastRequest`, `lastResponse`                               | 最近一次请求和响应追踪快照。                    |
| `complete(prompt?, options?)`                               | 执行补全，resolve 最终文本。                    |
| `stop()`                                                    | 中止当前流。                                    |
| `setInput(value)`, `setCompletion(value)`                   | 受控输入和补全文本 setter。                     |
| `handleInputChange(event)`, `handleSubmit(event, options?)` | 受控 React 输入框和表单 helper。                |
| `clearError()`, `clearTrace()`, `clear()`                   | 重置错误、trace 或完整补全状态。                |
| `abortController`                                           | 当前 `AbortController`，没有流进行时为 `null`。 |

`useObject(options)` 接收 `UseReactObjectOptions<T>`：

| 选项                                                                     | 说明                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `provider` / `transport`                                                 | `ChatProvider`，可以是 `openai()`、Provider preset 或 `proxyProvider()`。 |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`              | 没有传 provider 时使用的 proxy transport 配置；默认 `/api/object`。       |
| `schema`, `schemaName`, `schemaDescription`, `strict`                    | 每次 `ChatRequest` 携带的 JSON Schema response format。                   |
| `initialInput`, `initialObject`, `initialValue`                          | 初始 React 状态；`initialValue` 会填充 `partialObject`。                  |
| `defaultRequest`, `id`, `generateId`                                     | 合并到请求里的默认值，以及 trace 快照使用的稳定 id。                      |
| `onChunk`, `onPartial`, `onRequest`, `onResponse`, `onFinish`, `onError` | 流式 chunk、已解析 partial、trace 和最终对象生命周期回调。                |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`                   | 重试控制；只有首个 chunk 到达前的失败会重试。                             |
| `throttleMs`, `experimental_throttle`                                    | 快速流式响应期间 React state 更新的最小间隔。                             |

`UseReactObjectReturn<T>` 暴露普通 React state 和操作：

| 返回值                                                           | 说明                                        |
| ---------------------------------------------------------------- | ------------------------------------------- |
| `id`, `object`, `partialObject`, `text`, `input`                 | 当前结构化输出状态和原始 JSON 文本。        |
| `status`, `isLoading`, `error`, `abortController`                | 请求生命周期状态。                          |
| `lastRequest`, `lastResponse`                                    | 最近一次请求和响应追踪快照。                |
| `submit(prompt?, options?)`                                      | 执行结构化请求，resolve 最终解析对象。      |
| `stop()`                                                         | 中止当前流；被中止的 object 请求会 reject。 |
| `setInput(value)`, `setObject(value)`, `setPartialObject(value)` | 受控状态 setter。                           |
| `handleInputChange(event)`, `handleSubmit(event, options?)`      | 受控 React 输入框和表单 helper。            |
| `clearError()`, `clearTrace()`, `clear()`                        | 重置错误、trace 或完整 object 状态。        |

React 入口不会导出 Vue-only composables。Vue API 从根包导入，React hooks 从
`vue-ai-hooks/react` 导入。
