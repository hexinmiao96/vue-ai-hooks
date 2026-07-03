# React hooks

`vue-ai-hooks/react` is the optional React entry. It exposes `useChat`,
`useCompletion`, and `useObject` for core React hooks, plus `useImage`, `useVideo`, `usePromptSuggestions`, and `useAgentRun`, so React consumers can use the same
providers, proxy transport, request tracing, and stream formats as the Vue entry.
Core React exports are `useChat`, `useCompletion`, and `useObject` for the most common workflow.

For app-owned media flows, it also exposes `useImage` and `useVideo`.

Install React in the consuming app only when you use this subpath:

```bash
pnpm add vue-ai-hooks react
```

To run the repository quickstart without provider keys:

```bash
pnpm example:react-chat
pnpm example:react-image
pnpm example:react-video
```

```tsx
import { useChat, useCompletion, useImage, useObject, useVideo } from 'vue-ai-hooks/react'
```

The demo source is `examples/react-chat/App.tsx`. It uses
`DirectChatTransport` with a deterministic local stream, then renders
`lastRequest`, `lastResponse`, usage, and custom stream data so you can inspect
the React request lifecycle before connecting a real `/api/chat` route.

`examples/react-image/App.tsx` and `examples/react-video/App.tsx` provide no-key
media quickstarts with deterministic local previews, request trace rendering, and
the same `VITE_EXAMPLE_PROVIDER=proxy` switch used for app-owned `/api/image`
and `/api/video` routes.

```tsx
import { useChat, useCompletion, useAgentRun } from 'vue-ai-hooks/react'
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
import { jsonSchema, openai } from 'vue-ai-hooks'

interface Ticket {
  title: string
  priority: 'low' | 'high'
}

export function ObjectBox() {
  const { object, partialObject, input, handleInputChange, handleSubmit, isLoading, error } =
    useObject<Ticket>({
      provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY }),
      schemaName: 'ticket',
      schema: jsonSchema<Ticket>({
        type: 'object',
        properties: {
          title: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'high'] }
        },
        required: ['title', 'priority']
      })
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

For task starters (suggestion chips):

```tsx
import { createPromptSuggestionRecipes, usePromptSuggestions } from 'vue-ai-hooks/react'

const starterRecipes = createPromptSuggestionRecipes({
  surfaces: ['chat', 'backend'],
  include: ['summarize-thread', 'find-risks', 'design-agent-route', 'triage-provider-error']
})

export function PromptChips() {
  const { visibleSuggestions, reloadSuggestions, selectSuggestion, clearSelection, error } =
    usePromptSuggestions({
      suggestions: starterRecipes,
      input: '',
      max: 4
    })

  return (
    <aside>
      {error ? <p>{error.message}</p> : null}
      {visibleSuggestions.map((suggestion) => (
        <button key={suggestion.id} type="button" onClick={() => void selectSuggestion(suggestion)}>
          {suggestion.title}
        </button>
      ))}
      <button onClick={() => void reloadSuggestions()} type="button">
        Reload
      </button>
      <button onClick={clearSelection} type="button">
        Clear
      </button>
    </aside>
  )
}
```

For image generation:

```tsx
import { useImage } from 'vue-ai-hooks/react'

export function ImageBox() {
  const { image, input, handleInputChange, handleSubmit, status, error } = useImage({
    defaultRequest: { model: 'stable-diffusion-3' }
  })

  return (
    <form onSubmit={handleSubmit}>
      <input value={input} onChange={handleInputChange} />
      <button disabled={status !== 'ready' || !input.trim()}>Generate</button>
      {image ? <img src={image.url} /> : null}
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

For video generation:

```tsx
import { useVideo } from 'vue-ai-hooks/react'

export function VideoBox() {
  const { video, input, handleInputChange, handleSubmit, status, error } = useVideo({
    defaultRequest: { model: 'video-model' }
  })

  return (
    <form onSubmit={handleSubmit}>
      <input value={input} onChange={handleInputChange} />
      <button disabled={status !== 'ready' || !input.trim()}>Generate</button>
      {video ? <a href={video.url}>Open video</a> : null}
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

## API

```ts
import {
  useChat,
  useCompletion,
  useImage,
  useObject,
  createPromptSuggestionRecipes,
  usePromptSuggestions,
  useVideo,
  useAgentRun
} from 'vue-ai-hooks/react'
```

`useChat(options)` accepts `UseReactChatOptions`:

| Option                                                                                              | Description                                                                                           |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `provider` / `transport`                                                                            | A `ChatProvider`, including `openai()`, `openrouter()`, `proxyProvider()`, or `DefaultChatTransport`. |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`                                         | Proxy transport options used when no provider is passed.                                              |
| `initialMessages`, `messages`, `initialInput`                                                       | Initial React state.                                                                                  |
| `defaultRequest`, `threadId`, `forwardedProps`, `context`                                           | Defaults merged into provider requests.                                                               |
| `generateId`                                                                                        | Custom id generator for chat, user, assistant, and data ids.                                          |
| `prepareSendMessagesRequest`                                                                        | Final hook before a chat request is sent.                                                             |
| `prepareReconnectToStreamRequest`                                                                   | Final hook before a resumable stream request is sent.                                                 |
| `onChunk`, `onData`, `onRequest`, `onResponse`, `onUpdate`, `onFinish`, `onFinishLegacy`, `onError` | Lifecycle callbacks.                                                                                  |

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

| Option                                                                         | Description                                                                     |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `provider` / `transport`                                                       | A `ChatProvider`, including `openai()`, provider presets, or `proxyProvider()`. |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`                    | Proxy transport options used when no provider is passed.                        |
| `initialInput`, `initialCompletion`                                            | Initial React state.                                                            |
| `defaultRequest`, `streamProtocol`                                             | Defaults merged into each `CompletionRequest`.                                  |
| `id`, `generateId`                                                             | Stable id and custom id generator for request traces.                           |
| `onUpdate`, `onRequest`, `onResponse`, `onFinish`, `onFinishLegacy`, `onError` | Lifecycle callbacks for streamed text, traces, completion, and provider errors. |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`                         | Retry controls; retries only happen before the first streamed text delta.       |
| `throttleMs`, `experimental_throttle`                                          | Minimum wait in ms between React state updates during fast streams.             |

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

`onFinish(prompt, completion, info?)` follows AI SDK ordering. `onFinishLegacy(completion, info)` is retained for old call sites.

- `stop()` triggers `onFinish` with `{ isAbort: true }` when a completion stream is in flight, and does not call `onError`.

`onFinish({ message, messages, isAbort, isError, isDisconnect, finishReason })` is the AI SDK-style callback for `useChat`. `onFinishLegacy(message, info)` remains available for existing code.

`useImage(options)` accepts `UseReactImageOptions`:

| Option                                                      | Description                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch` | Proxy transport options used when posting to an app-owned image endpoint. |
| `initialInput`, `defaultRequest`, `timeoutMs`               | Defaults merged into each image request and optional request timeout.     |
| `onRequest`, `onResponse`, `onFinish`, `onError`            | Lifecycle callbacks for request and response traces.                      |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`      | Retry controls for non-streaming image requests.                          |

`UseReactImageReturn` exposes plain React state and actions:

| Return                                                                         | Description                                                                 |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `id`, `input`, `status`, `isLoading`, `error`, `image`, `images`, `result`     | Current image generation state.                                             |
| `lastRequest`, `lastResponse`                                                  | Last request and response trace snapshots.                                  |
| `inspect()`                                                                    | Build a production debug snapshot with timeline and retry records.          |
| `generate(prompt?, options?)`, `generateImage(prompt?, options?)`              | Start image generation from inline or form input.                           |
| `editImage(prompt?, options)`                                                  | Start image editing when `image` is provided; optional `mask` is supported. |
| `stop()`                                                                       | Abort the active request.                                                   |
| `setInput(value)`, `handleInputChange(event)`, `handleSubmit(event, options?)` | Form helpers for controlled React inputs.                                   |
| `clearError()`, `clearTrace()`, `clear()`                                      | Reset error, trace, or the full image state.                                |

`useVideo(options)` accepts `UseReactVideoOptions`:

| Option                                                      | Description                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch` | Proxy transport options used when posting to an app-owned video endpoint. |
| `initialInput`, `defaultRequest`, `timeoutMs`               | Defaults merged into each video request and optional request timeout.     |
| `onRequest`, `onResponse`, `onFinish`, `onError`            | Lifecycle callbacks for request and response traces.                      |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`      | Retry controls for non-streaming video requests.                          |

`UseReactVideoReturn` exposes plain React state and actions:

| Return                                                                         | Description                                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `id`, `input`, `status`, `isLoading`, `error`, `video`, `videos`, `result`     | Current video generation state.                                    |
| `lastRequest`, `lastResponse`                                                  | Last request and response trace snapshots.                         |
| `inspect()`                                                                    | Build a production debug snapshot with timeline and retry records. |
| `generate(prompt?, options?)`, `generateVideo(prompt?, options?)`              | Start video generation from inline or form input.                  |
| `stop()`                                                                       | Abort the active request.                                          |
| `setInput(value)`, `handleInputChange(event)`, `handleSubmit(event, options?)` | Form helpers for controlled React inputs.                          |
| `clearError()`, `clearTrace()`, `clear()`                                      | Reset error, trace, or the full video state.                       |

`usePromptSuggestions(options)` accepts `UseReactPromptSuggestionsOptions`:

`createPromptSuggestionRecipes()` is also exported from the React subpath for
shared task starters with stable `PromptSuggestionRecipeMetadata`, including
recipe `surfaces` for chat, backend, agent, release, media, thread, code, and
tool-approval entry points.

| Option        | Description                                        |
| ------------- | -------------------------------------------------- |
| `suggestions` | Base suggestion list (`string` or object entries). |
| `input`       | Current composer value used for text filtering.    |
| `messages`    | Current message context used by custom filters.    |
| `max`         | Optional max number of visible suggestions.        |
| `filter`      | Custom filter callback.                            |
| `loader`      | Optional async suggestion loader.                  |
| `loadOnInit`  | Whether to call loader on mount.                   |

`UseReactPromptSuggestionsReturn` exposes:

| Return                               | Description                                    |
| ------------------------------------ | ---------------------------------------------- |
| `suggestions`                        | Full normalized suggestions list.              |
| `visibleSuggestions`                 | Filtered and capped suggestions for rendering. |
| `selectedSuggestion`                 | Current selection.                             |
| `isLoading`                          | Whether a loader is currently in-flight.       |
| `error`                              | Last loader error.                             |
| `reloadSuggestions`, `clearError`    | Reload dynamic suggestions and clear errors.   |
| `selectSuggestion`, `clearSelection` | Select by id/object and clear the selection.   |

`useAgentRun(options)` accepts `UseReactAgentRunOptions<T, R>`:

| Option                                      | Description                                                         |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `run`                                       | `AgentRunHandler` used to consume app-owned agent event streams.    |
| `id`, `generateId`                          | Stable run ids and custom id generator.                             |
| `progressDataType`, `interruptDataType`     | Override stream data part naming for progress and interrupt events. |
| `onEvent`, `onChunk`, `onFinish`, `onError` | Lifecycle callbacks for event stream and run completion/error.      |

`UseReactAgentRunReturn<T, R>` exposes plain React state and actions:

| Return                                                            | Description                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `id`, `currentRunId`, `status`, `isLoading`, `error`, `interrupt` | Current run status and latest interrupt snapshot.                                      |
| `events`, `chunks`, `messages`, `streamData`, `usage`             | Normalized stream outputs aligned to message/chunk formats.                            |
| `lastRequest`, `lastResponse`                                     | Last agent start/resume request and event-count response snapshots.                    |
| `inspect()`                                                       | Build an agent run debug snapshot with event timeline, interrupt, usage, and errors.   |
| `hasInterrupt`                                                    | Whether the run is waiting on an interrupt input.                                      |
| `start(input?, options?)`, `resume(response?, options?)`          | Start or resume a run; repeated active/completed `options.id` calls reuse local state. |
| `stop()`, `clearTrace()`, `clear()`                               | Abort in-flight work, hide trace snapshots, or reset to idle state.                    |
| `abortController`                                                 | Active `AbortController`, or `null` when no stream is in flight.                       |

`useObject(options)` accepts `UseReactObjectOptions<T>`:

| Option                                                                                     | Description                                                                          |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `provider` / `transport`                                                                   | A `ChatProvider`, including `openai()`, provider presets, or `proxyProvider()`.      |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`                                | Proxy transport options used when no provider is passed. Defaults to `/api/object`.  |
| `schema`, `schemaName`, `schemaDescription`, `strict`                                      | Raw JSON Schema or `jsonSchema()` wrapper sent through each `ChatRequest`.           |
| `initialInput`, `initialObject`, `initialValue`                                            | Initial React state; `initialValue` seeds `partialObject`.                           |
| `defaultRequest`, `id`, `generateId`                                                       | Defaults merged into requests and stable ids for trace snapshots.                    |
| `onChunk`, `onPartial`, `onRequest`, `onResponse`, `onFinish`, `onFinishLegacy`, `onError` | Lifecycle callbacks for streamed chunks, parsed partials, traces, and final objects. |

`onFinish({ object, text, isAbort, error })` is the AI SDK-style callback for `useObject`. `onFinishLegacy(object, info)` remains available for existing code.
It also fires on parse/validation failures with `object: undefined` and an `Error` in `error`.
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry` | Retry controls; retries only happen before the first streamed chunk arrives. |
| `throttleMs`, `experimental_throttle` | Minimum wait in ms between React state updates during fast streams. |

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
