# React useChat

`vue-ai-hooks/react` is the optional React entry. It currently exposes React
`useChat` for streaming chat UIs while reusing the same providers, proxy
transport, message types, request tracing, and stream chunk format as the Vue
entry.

Install React in the consuming app only when you use this subpath:

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
      <button disabled={status !== 'ready' || !input.trim()}>Send</button>
      <button type="button" disabled={status === 'ready'} onClick={stop}>
        Stop
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

`useChat(options)` accepts `UseReactChatOptions`:

| Option                                                                            | Description                                                                                           |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `provider` / `transport`                                                          | A `ChatProvider`, including `openai()`, `openrouter()`, `proxyProvider()`, or `DefaultChatTransport`. |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`                       | Proxy transport options used when no provider is passed.                                              |
| `initialMessages`, `messages`, `initialInput`                                     | Initial React state.                                                                                  |
| `defaultRequest`, `threadId`, `forwardedProps`, `context`                         | Defaults merged into provider requests.                                                               |
| `generateId`                                                                      | Custom id generator for chat, user, assistant, and data ids.                                          |
| `prepareSendMessagesRequest`                                                      | Final hook before a chat request is sent.                                                             |
| `prepareReconnectToStreamRequest`                                                 | Final hook before a resumable stream request is sent.                                                 |
| `onChunk`, `onData`, `onRequest`, `onResponse`, `onUpdate`, `onFinish`, `onError` | Lifecycle callbacks.                                                                                  |

`UseReactChatReturn` exposes plain React state and actions:

| Return                                                                                   | Description                                                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `id`, `messages`, `input`, `status`, `usage`, `data`, `streamData`, `isLoading`, `error` | Current chat state.                                                |
| `lastRequest`, `lastResponse`                                                            | Last request and response trace snapshots.                         |
| `append(content, options?)`                                                              | Add or replace a user message and stream the assistant reply.      |
| `sendMessage(content?, options?)`                                                        | AI SDK-style send helper. Omit content to submit current messages. |
| `regenerate(options?)`, `reload()`                                                       | Regenerate from the latest user turn.                              |
| `resumeStream(options?)`                                                                 | Resume with providers that implement `resumeChat()`.               |
| `stop()`                                                                                 | Abort the active stream.                                           |
| `setInput(value)`, `handleInputChange(event)`, `handleSubmit(event, options?)`           | Form helpers for controlled React inputs.                          |
| `setMessages(next)`, `setData(next)`                                                     | Replace or functionally update messages and stream data.           |
| `clearError()`, `clearTrace()`, `clear()`                                                | Reset error, trace, or the full chat state.                        |

The React entry intentionally does not export the Vue-only composables. Import
the Vue APIs from the root package and the React chat hook from
`vue-ai-hooks/react`.
