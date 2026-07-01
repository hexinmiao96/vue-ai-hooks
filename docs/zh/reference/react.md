# React useChat

`vue-ai-hooks/react` 是可选 React 入口。目前它提供 React 版 `useChat`，
用于流式聊天 UI，同时复用根入口里的 Provider、proxy transport、消息类型、请求追踪和
stream chunk 格式。

只有使用这个子路径时，消费侧应用才需要安装 React：

```bash
pnpm add vue-ai-hooks react
```

```tsx
import { useChat } from 'vue-ai-hooks/react'
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

## API

```ts
import { useChat } from 'vue-ai-hooks/react'
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

React 入口不会导出 Vue-only composables。Vue API 从根包导入，React 聊天 hook 从
`vue-ai-hooks/react` 导入。
