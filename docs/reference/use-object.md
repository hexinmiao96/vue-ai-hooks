# useObject

Structured JSON output composable for prompts that should return one parsed
object.

Public TypeScript types: `UseObjectOptions`, `UseObjectReturn`, `DeepPartial`,
`ObjectRequestInfo`, `ObjectResponseInfo`, `ResponseFormat`, `IdGenerator`,
`RetryOptions`, and `RetryContext`.

## Usage

```ts
import { useObject, openai } from 'vue-ai-hooks'

type Ticket = {
  title: string
  priority: 'low' | 'high'
}

const { object, partialObject, text, input, submit, isLoading, error } = useObject<Ticket>({
  provider: openai({ apiKey: '...' }),
  schemaName: 'ticket',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'high'] }
    },
    required: ['title', 'priority'],
    additionalProperties: false
  }
})

await submit('Turn this customer message into a ticket.')
console.log(partialObject.value?.title)
console.log(object.value?.priority)
```

For an app-owned backend, omit `provider` and send the structured request to
your API route:

```ts
const { object, partialObject, submit } = useObject<Ticket>({
  api: '/api/object',
  schema: ticketSchema,
  headers: { 'X-Session': sessionId },
  body: { tenantId }
})
```

`text` stores the streamed raw JSON text. `partialObject` is updated with a
`DeepPartial<T>` whenever the current stream can be repaired into valid JSON.
`object` is assigned only after the final text parses successfully.

## Options

| Name                    | Type                                                                   | Default       | Description                                                                |
| ----------------------- | ---------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| `provider`              | `ChatProvider`                                                         | proxy         | Provider used to send the structured chat request. Omit to use proxy.      |
| `transport`             | `ChatProvider`                                                         | -             | AI SDK-style alias for `provider`.                                         |
| `api`                   | `string`                                                               | `/api/object` | Chat URL for the default proxy transport.                                  |
| `baseURL`               | `string`                                                               | -             | Base URL prepended to default proxy transport URLs.                        |
| `headers`               | `Record<string, string> \| () => ...`                                  | -             | Static or dynamic headers for the default proxy transport.                 |
| `body`                  | `Record<string, unknown> \| () => ...`                                 | -             | Extra JSON body fields for the default proxy transport.                    |
| `credentials`           | `RequestCredentials`                                                   | -             | Browser credentials mode for the default proxy transport.                  |
| `fetch`                 | `typeof fetch`                                                         | global        | Custom fetch implementation for the default proxy transport.               |
| `id`                    | `string`                                                               | generated     | Object state id. Matching ids share state across instances.                |
| `schema`                | `Record<string, unknown>`                                              | required      | JSON Schema sent through `responseFormat`.                                 |
| `schemaName`            | `string`                                                               | `'object'`    | Name for the provider-side JSON schema.                                    |
| `schemaDescription`     | `string`                                                               | -             | Optional schema description.                                               |
| `strict`                | `boolean`                                                              | `true`        | Strict JSON Schema mode for providers that support it.                     |
| `initialObject`         | `T \| null`                                                            | `null`        | Object value used before submit and after `clear()`.                       |
| `initialValue`          | `DeepPartial<T> \| null`                                               | —             | AI SDK-style initial partial object value.                                 |
| `defaultRequest`        | `Partial<ChatRequest>`                                                 | `{}`          | Default request payload merged into every submit.                          |
| `generateId`            | `IdGenerator`                                                          | `createId`    | Override automatic object and prompt message id generation.                |
| `maxRetries`            | `number`                                                               | `0`           | Retry attempts for failures before the first stream chunk.                 |
| `retryDelayMs`          | `number \| (context: RetryContext) => number`                          | `0`           | Delay before each retry.                                                   |
| `shouldRetry`           | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -             | Override the default retryable error decision.                             |
| `onRetry`               | `(error: Error, context: RetryContext) => void`                        | -             | Called before a retry attempt waits and re-runs.                           |
| `throttleMs`            | `number`                                                               | -             | Minimum wait in ms between reactive `text` and `partialObject` updates.    |
| `experimental_throttle` | `number`                                                               | -             | AI SDK-compatible alias. Prefer `throttleMs`.                              |
| `onChunk`               | `(chunk: ChatChunk, text: string) => void`                             | -             | Called after each streamed chat chunk is applied.                          |
| `onPartial`             | `(partialObject: DeepPartial<T>, text: string) => void`                | -             | Called whenever the current JSON stream can be parsed as a partial object. |
| `onRequest`             | `(info: ObjectRequestInfo) => void`                                    | -             | Called with the final structured chat request before send.                 |
| `onResponse`            | `(info: ObjectResponseInfo) => void`                                   | -             | Called after the provider returns a structured chat stream.                |
| `onFinish`              | `(object: T) => void`                                                  | -             | Called after the final JSON parses successfully.                           |
| `onError`               | `(err: Error) => void`                                                 | -             | Called on provider errors or invalid JSON parse failures.                  |

## Return value

| Property          | Type                                                      | Description                                                           |
| ----------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| `id`              | `Ref<string>`                                             | Object state id selected at composable creation.                      |
| `object`          | `Ref<T \| null>`                                          | Final parsed object from the latest successful submit.                |
| `partialObject`   | `Ref<DeepPartial<T> \| null>`                             | Best-effort partial object while JSON is streaming.                   |
| `text`            | `Ref<string>`                                             | Raw streamed JSON text.                                               |
| `input`           | `Ref<string>`                                             | Prompt binding for forms.                                             |
| `status`          | `Ref<AiRequestStatus>`                                    | Request lifecycle: `ready`, `submitted`, `streaming`, or `error`.     |
| `isLoading`       | `Ref<boolean>`                                            | True while a request is in flight.                                    |
| `error`           | `Ref<Error \| null>`                                      | Last provider or parse error.                                         |
| `lastRequest`     | `Ref<ObjectRequestInfo \| null>`                          | Last prepared structured chat request snapshot.                       |
| `lastResponse`    | `Ref<ObjectResponseInfo \| null>`                         | Last provider response snapshot, including whether a stream opened.   |
| `submit(prompt?)` | `(string \| Message, Partial<ChatRequest>) => Promise<T>` | Send a prompt and parse the final JSON object.                        |
| `stop()`          | `() => void`                                              | Abort the in-flight request.                                          |
| `clearError()`    | `() => void`                                              | Clear `error` and move `status` back to `ready`.                      |
| `clearTrace()`    | `() => void`                                              | Clear `lastRequest` and `lastResponse` without changing object state. |
| `clear()`         | `() => void`                                              | Reset object state, `text`, `input`, and `error`.                     |
| `abortController` | `Ref<AbortController \| null>`                            | Exposed for advanced use cases.                                       |

## Provider support

`useObject` sends `ChatRequest.responseFormat` with a JSON Schema response
format. `openai`, `openaiCompatible`, `openrouter`, and `gemini` serialize it to
OpenAI-compatible `response_format`; `proxyProvider` forwards it to your backend
unchanged. When `provider` and `transport` are omitted, `useObject` uses the
built-in proxy transport and calls `api` or `/api/object`.

Providers that do not enforce structured output may still return valid JSON if
prompted carefully. The client validates the final parsed JSON against common
schema keywords: `type`, `required`, `enum`, `properties`, `items`, and
`additionalProperties`. Invalid JSON or schema mismatches reject `submit()` with
`AiHooksError`.

When `maxRetries` is enabled, `useObject` only retries provider failures before
the first chunk arrives. Invalid final JSON or schema mismatches are not retried
because they are already the model output for that request.

Use `defaultRequest.body` or `submit(prompt, { body })` for provider-specific
JSON request fields. Typed fields such as `messages`, `responseFormat`, and
`stream` win if keys conflict.

Set `throttleMs` to batch reactive `text`, `partialObject`, and `onPartial`
updates during fast JSON streams. `onChunk` still receives every raw stream
event, and the final parsed object is always flushed before `submit()` resolves.

`onRequest(info)` receives the final structured `ChatRequest` after messages and
`responseFormat` are resolved. `onResponse(info)` runs after the provider returns
a stream. Both include the 1-based `attempt`, provider id, request metadata,
body, headers, and message snapshot.
The same latest snapshots are available as `lastRequest` and `lastResponse` for
rendering diagnostics in the UI.

Pass `generateId` when prompt messages created by `submit('...')` need
deterministic ids. It also generates the object state id when `id` is omitted.
Explicit `Message.id` values passed to `submit(message)` are preserved.

Passing the same `id` to multiple `useObject()` calls shares `object`,
`partialObject`, `text`, `input`, `status`, `error`, loading, and abort state
across instances. The first instance for an id seeds `initialObject` and
`initialValue`.
