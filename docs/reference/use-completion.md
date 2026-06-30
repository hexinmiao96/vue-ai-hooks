# useCompletion

Vue 3 composable for single-shot streaming completions.

Public TypeScript types: `UseCompletionOptions`, `UseCompletionReturn`,
`CompletionRequestInfo`, `CompletionResponseInfo`, `CompletionFinishInfo`,
`CompletionStreamProtocol`, `RetryOptions`, and `RetryContext`.

## Usage

```ts
import { useCompletion, openai } from 'vue-ai-hooks'

const { completion, complete, isLoading, error } = useCompletion({
  provider: openai({ apiKey: '...' })
})

await complete('Write a haiku about TypeScript:')
```

For an app-owned backend, omit `provider` and use the default proxy transport:

```ts
const { complete } = useCompletion({
  api: '/api/completion',
  headers: { 'X-Session': sessionId },
  body: { tenantId }
})
```

## Options

| Name                    | Type                                                                   | Default           | Description                                             |
| ----------------------- | ---------------------------------------------------------------------- | ----------------- | ------------------------------------------------------- |
| `provider`              | `ChatProvider`                                                         | proxy             | The provider to use. Omit to use the default proxy.     |
| `transport`             | `ChatProvider`                                                         | —                 | AI SDK-style alias for `provider`.                      |
| `api`                   | `string`                                                               | `/api/completion` | Completion URL for the default proxy transport.         |
| `baseURL`               | `string`                                                               | —                 | Base URL prepended to default proxy transport URLs.     |
| `headers`               | `Record<string, string> \| () => ...`                                  | —                 | Static or dynamic headers for the default proxy.        |
| `body`                  | `Record<string, unknown> \| () => ...`                                 | —                 | Extra JSON body fields for the default proxy.           |
| `credentials`           | `RequestCredentials`                                                   | —                 | Browser credentials mode for the default proxy.         |
| `fetch`                 | `typeof fetch`                                                         | global            | Custom fetch implementation for the default proxy.      |
| `id`                    | `string`                                                               | generated         | Completion state identifier. Matching ids share state.  |
| `generateId`            | `IdGenerator`                                                          | `createId`        | Generate an id when `id` is omitted.                    |
| `initialInput`          | `string`                                                               | `''`              | Seed the form input prompt.                             |
| `initialCompletion`     | `string`                                                               | `''`              | Seed the completion.                                    |
| `defaultRequest`        | `Partial<CompletionRequest>`                                           | `{}`              | Default options.                                        |
| `streamProtocol`        | `'text' \| 'data'`                                                     | —                 | AI SDK-compatible proxy stream protocol hint.           |
| `maxRetries`            | `number`                                                               | `0`               | Retry attempts for failures before the first delta.     |
| `retryDelayMs`          | `number \| (context: RetryContext) => number`                          | `0`               | Delay before each retry.                                |
| `shouldRetry`           | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | —                 | Override the default retryable error decision.          |
| `onRetry`               | `(error: Error, context: RetryContext) => void`                        | —                 | Called before a retry attempt waits and re-runs.        |
| `throttleMs`            | `number`                                                               | —                 | Minimum wait in ms between reactive completion updates. |
| `experimental_throttle` | `number`                                                               | —                 | AI SDK-compatible alias. Prefer `throttleMs`.           |
| `onUpdate`              | `(completion: string, delta: string) => void`                          | —                 | Called after each non-empty streamed delta is appended. |
| `onRequest`             | `(info: CompletionRequestInfo) => void`                                | —                 | Called with the final completion request before send.   |
| `onResponse`            | `(info: CompletionResponseInfo) => void`                               | —                 | Called after the provider returns a completion stream.  |
| `onFinish`              | `(completion: string, info: CompletionFinishInfo) => void`             | —                 | Called once the completion is finished.                 |
| `onError`               | `(e: Error) => void`                                                   | —                 | Called on any error.                                    |

## Return value

| Property                      | Type                                                                                 | Description                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `id`                          | `Ref<string>`                                                                        | Completion state id selected at composable creation.                                    |
| `completion`                  | `Ref<string>`                                                                        | The current completion (grows during streaming).                                        |
| `input`                       | `Ref<string>`                                                                        | The prompt, if not passed inline to `complete()`.                                       |
| `status`                      | `Ref<AiRequestStatus>`                                                               | Request lifecycle: `ready`, `submitted`, `streaming`, or `error`.                       |
| `isLoading`                   | `Ref<boolean>`                                                                       | True while a stream is in flight.                                                       |
| `error`                       | `Ref<Error \| null>`                                                                 | Last error.                                                                             |
| `lastRequest`                 | `Ref<CompletionRequestInfo \| null>`                                                 | Last prepared completion request snapshot.                                              |
| `lastResponse`                | `Ref<CompletionResponseInfo \| null>`                                                | Last provider response snapshot, including whether a stream opened.                     |
| `complete(prompt?, opts?)`    | `(string?, Partial<CompletionRequest>) => Promise<string>`                           | Run a completion. Resolves to the final string.                                         |
| `stop()`                      | `() => void`                                                                         | Abort the in-flight stream.                                                             |
| `setInput(value)`             | `(string) => void`                                                                   | Replace the input prompt.                                                               |
| `handleInputChange(event)`    | `(Event \| { target?: { value?: unknown } } \| string) => void`                      | Update `input` from a native input event or string.                                     |
| `handleSubmit(event?, opts?)` | `({ preventDefault?: () => void }?, Partial<CompletionRequest>?) => Promise<string>` | Prevent default form submit, run `complete(input.value)`, and clear `input` on success. |
| `setCompletion(value)`        | `(string) => void`                                                                   | Replace the completion (e.g. on reset).                                                 |
| `clearError()`                | `() => void`                                                                         | Clear `error` and move `status` back to `ready`.                                        |
| `clearTrace()`                | `() => void`                                                                         | Clear `lastRequest` and `lastResponse` without changing completion text.                |
| `abortController`             | `Ref<AbortController \| null>`                                                       | Exposed for advanced use cases.                                                         |

## Notes

- Anthropic has no `/v1/completions` endpoint. `useCompletion` with the Anthropic
  provider routes through `/v1/messages` as a single-turn chat.
- When `provider` and `transport` are omitted, `useCompletion` calls
  `/api/completion` through the built-in proxy transport. Pass `api`, `baseURL`,
  `headers`, `body`, `credentials`, or `fetch` to configure that request.
- Passing the same `id` to multiple `useCompletion()` calls shares `input`,
  `completion`, `status`, `error`, loading, and abort state across components.
  The first instance for an id seeds `initialInput` and `initialCompletion`.
- Omit `id` to create an independent generated completion state.
- The completion is reset to `''` at the start of each `complete()` call.
- Use `defaultRequest.body` or `complete(prompt, { body })` for
  provider-specific JSON request fields. Typed fields such as `prompt`, `model`,
  and `stream` win if keys conflict.
- Set `streamProtocol: 'text'` when your app-owned completion endpoint returns a
  plain text stream. The default proxy sends the protocol hint in the request
  JSON and reads `text/plain` responses as streamed text. The default `data`
  path keeps the existing SSE/JSON response support.
- `handleSubmit()` clears `input` only after a successful completion. Provider
  errors leave the prompt available for retry.
- `onFinish(completion, info)` keeps the final completion as the first argument
  and passes `info.prompt`, `info.completion`, and `info.isAbort` as completion
  metadata.
- `onRequest(info)` receives the final `CompletionRequest` before the provider
  runs. `onResponse(info)` runs once the provider returns a stream. Both include
  the 1-based `attempt`, provider id, prompt, body, headers, and request snapshot.
  When the default proxy transport is used, they also include the configured
  proxy `api` and browser `credentials` mode.
  The same latest snapshots are available as `lastRequest` and `lastResponse`
  for rendering diagnostics in the UI.
- When `maxRetries` is enabled, streaming completions only retry before the
  first delta arrives.
- Set `throttleMs` to batch reactive `completion` and `onUpdate` updates during
  fast streams. The final completion is always flushed before `complete()`
  resolves.
