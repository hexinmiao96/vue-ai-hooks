# React hooks

`vue-ai-hooks/react` is the optional React entry. It currently exposes React
`useChat`, `useCompletion`, and `useObject` for streaming React UIs while reusing
the same providers, proxy transport, request tracing, and stream formats as the
Vue entry.

Install React in the consuming app only when you use this subpath:

```bash
pnpm add vue-ai-hooks react
```

To run the repository quickstart without provider keys:

```bash
pnpm example:react-chat
```

The demo source is `examples/react-chat/App.tsx`. It uses
`DirectChatTransport` with a deterministic local stream, then renders
`lastRequest`, `lastResponse`, usage, and custom stream data so you can inspect
the React request lifecycle before connecting a real `/api/chat` route.

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
      <button disabled={status !== 'ready' || !input.trim()}>Send</button>
      <button type="button" disabled={status === 'ready'} onClick={stop}>
        Stop
      </button>
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

For single-shot text completion:

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
      <button disabled={isLoading || !input.trim()}>Complete</button>
      {completion ? <output>{completion}</output> : null}
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

For JSON Schema-backed structured output:

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
      <button disabled={isLoading || !input.trim()}>Extract</button>
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
| `inspect()`                                                                              | Build a production debug snapshot with timeline and retry records. |
| `append(content, options?)`                                                              | Add or replace a user message and stream the assistant reply.      |
| `sendMessage(content?, options?)`                                                        | AI SDK-style send helper. Omit content to submit current messages. |
| `regenerate(options?)`, `reload()`                                                       | Regenerate from the latest user turn.                              |
| `resumeStream(options?)`                                                                 | Resume with providers that implement `resumeChat()`.               |
| `stop()`                                                                                 | Abort the active stream.                                           |
| `setInput(value)`, `handleInputChange(event)`, `handleSubmit(event, options?)`           | Form helpers for controlled React inputs.                          |
| `setMessages(next)`, `setData(next)`                                                     | Replace or functionally update messages and stream data.           |
| `clearError()`, `clearTrace()`, `clear()`                                                | Reset error, trace, or the full chat state.                        |

`useCompletion(options)` accepts `UseReactCompletionOptions`:

| Option                                                       | Description                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `provider` / `transport`                                     | A `ChatProvider`, including `openai()`, provider presets, or `proxyProvider()`. |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`  | Proxy transport options used when no provider is passed.                        |
| `initialInput`, `initialCompletion`                          | Initial React state.                                                            |
| `defaultRequest`, `streamProtocol`                           | Defaults merged into each `CompletionRequest`.                                  |
| `id`, `generateId`                                           | Stable id and custom id generator for request traces.                           |
| `onUpdate`, `onRequest`, `onResponse`, `onFinish`, `onError` | Lifecycle callbacks for streamed text, traces, completion, and provider errors. |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`       | Retry controls; retries only happen before the first streamed text delta.       |
| `throttleMs`, `experimental_throttle`                        | Minimum wait in ms between React state updates during fast streams.             |

`UseReactCompletionReturn` exposes plain React state and actions:

| Return                                                      | Description                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| `id`, `completion`, `input`, `status`, `isLoading`, `error` | Current completion state.                                          |
| `lastRequest`, `lastResponse`                               | Last request and response trace snapshots.                         |
| `complete(prompt?, options?)`                               | Run a completion. Resolves to the final text.                      |
| `inspect()`                                                 | Build a production debug snapshot with timeline and retry records. |
| `stop()`                                                    | Abort the active stream.                                           |
| `setInput(value)`, `setCompletion(value)`                   | Controlled input and completion setters.                           |
| `handleInputChange(event)`, `handleSubmit(event, options?)` | Form helpers for controlled React inputs.                          |
| `clearError()`, `clearTrace()`, `clear()`                   | Reset error, trace, or the full completion state.                  |
| `abortController`                                           | Active `AbortController`, or `null` when no stream is in flight.   |

`useObject(options)` accepts `UseReactObjectOptions<T>`:

| Option                                                                   | Description                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `provider` / `transport`                                                 | A `ChatProvider`, including `openai()`, provider presets, or `proxyProvider()`.      |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`              | Proxy transport options used when no provider is passed. Defaults to `/api/object`.  |
| `schema`, `schemaName`, `schemaDescription`, `strict`                    | JSON Schema response format sent through each `ChatRequest`.                         |
| `initialInput`, `initialObject`, `initialValue`                          | Initial React state; `initialValue` seeds `partialObject`.                           |
| `defaultRequest`, `id`, `generateId`                                     | Defaults merged into requests and stable ids for trace snapshots.                    |
| `onChunk`, `onPartial`, `onRequest`, `onResponse`, `onFinish`, `onError` | Lifecycle callbacks for streamed chunks, parsed partials, traces, and final objects. |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`                   | Retry controls; retries only happen before the first streamed chunk arrives.         |
| `throttleMs`, `experimental_throttle`                                    | Minimum wait in ms between React state updates during fast streams.                  |

`UseReactObjectReturn<T>` exposes plain React state and actions:

| Return                                                           | Description                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `id`, `object`, `partialObject`, `text`, `input`                 | Current structured-output state and raw JSON text.                 |
| `status`, `isLoading`, `error`, `abortController`                | Request lifecycle state.                                           |
| `lastRequest`, `lastResponse`                                    | Last request and response trace snapshots.                         |
| `inspect()`                                                      | Build a production debug snapshot with timeline and retry records. |
| `submit(prompt?, options?)`                                      | Run a structured request. Resolves to the final parsed object.     |
| `stop()`                                                         | Abort the active stream; aborted object requests reject.           |
| `setInput(value)`, `setObject(value)`, `setPartialObject(value)` | Controlled state setters.                                          |
| `handleInputChange(event)`, `handleSubmit(event, options?)`      | Form helpers for controlled React inputs.                          |
| `clearError()`, `clearTrace()`, `clear()`                        | Reset error, trace, or the full object state.                      |

The React entry intentionally does not export the Vue-only composables. Import
the Vue APIs from the root package and React hooks from `vue-ai-hooks/react`.
