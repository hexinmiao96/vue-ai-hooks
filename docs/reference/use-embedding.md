# useEmbedding

Vue 3 composable for generating text embeddings.

Public TypeScript types: `UseEmbeddingOptions`, `UseEmbeddingReturn`,
`EmbeddingRequestInfo`, `EmbeddingResponseInfo`, `RetryOptions`, and
`RetryContext`.

Public helpers: `cosineSimilarity`.

## Usage

```ts
import { cosineSimilarity, useEmbedding, openai } from 'vue-ai-hooks'

const { embed, embeddings, isLoading, error } = useEmbedding({
  provider: openai({ apiKey: '...' })
})

const result = await embed(['hello world', 'goodbye world'])
console.log(result.embeddings) // number[][]
console.log(cosineSimilarity(result.embeddings[0], result.embeddings[1]))
```

For an app-owned backend, omit `provider` and use the default proxy transport:

```ts
const { embed } = useEmbedding({
  api: '/api/embedding',
  headers: { 'X-Session': sessionId },
  body: { tenantId }
})
```

For form wiring, bind `input` and submit it through `handleSubmit()`:

```ts
const { input, handleInputChange, handleSubmit, embeddings } = useEmbedding({
  provider: openai({ apiKey: '...' }),
  initialInput: 'hello world'
})

await handleSubmit()
console.log(embeddings.value)
```

## Options

| Name             | Type                                                                   | Default          | Description                                         |
| ---------------- | ---------------------------------------------------------------------- | ---------------- | --------------------------------------------------- |
| `provider`       | `ChatProvider`                                                         | proxy            | The provider to use. Omit to use the default proxy. |
| `transport`      | `ChatProvider`                                                         | —                | AI SDK-style alias for `provider`.                  |
| `api`            | `string`                                                               | `/api/embedding` | Embedding URL for the default proxy transport.      |
| `baseURL`        | `string`                                                               | —                | Base URL prepended to default proxy transport URLs. |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | —                | Static or dynamic headers for the default proxy.    |
| `body`           | `Record<string, unknown> \| () => ...`                                 | —                | Extra JSON body fields for the default proxy.       |
| `credentials`    | `RequestCredentials`                                                   | —                | Browser credentials mode for the default proxy.     |
| `fetch`          | `typeof fetch`                                                         | global           | Custom fetch implementation for the default proxy.  |
| `initialInput`   | `string`                                                               | `''`             | Seed the form input text.                           |
| `defaultRequest` | `Partial<EmbeddingRequest>`                                            | `{}`             | Default options.                                    |
| `maxRetries`     | `number`                                                               | `0`              | Retry attempts for transient failures.              |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`              | Delay before each retry.                            |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | —                | Override the default retryable error decision.      |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | —                | Called before a retry attempt waits and re-runs.    |
| `onRequest`      | `(info: EmbeddingRequestInfo) => void`                                 | —                | Called with the final embedding request.            |
| `onResponse`     | `(info: EmbeddingResponseInfo) => void`                                | —                | Called after the provider returns embeddings.       |
| `onSuccess`      | `(result: EmbeddingResult) => void`                                    | —                | Called when embedding succeeds.                     |
| `onError`        | `(e: Error) => void`                                                   | —                | Called on any error.                                |

## Return value

| Property                 | Type                                                                                         | Description                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `embeddings`             | `Ref<number[][]>`                                                                            | The most recent embedding vectors.                                       |
| `input`                  | `Ref<string>`                                                                                | Text binding for embedding forms.                                        |
| `status`                 | `Ref<AiRequestStatus>`                                                                       | Request lifecycle: `ready`, `submitted`, or `error`.                     |
| `isLoading`              | `Ref<boolean>`                                                                               | True while a request is in flight.                                       |
| `error`                  | `Ref<Error \| null>`                                                                         | Last error.                                                              |
| `result`                 | `Ref<EmbeddingResult \| null>`                                                               | The most recent full result, including usage stats.                      |
| `lastRequest`            | `Ref<EmbeddingRequestInfo \| null>`                                                          | Last prepared embedding request snapshot.                                |
| `lastResponse`           | `Ref<EmbeddingResponseInfo \| null>`                                                         | Last provider response snapshot, including the full result.              |
| `inspect()`              | `() => RequestInspectionSnapshot<EmbeddingRequestInfo, EmbeddingResponseInfo>`               | Build a production-ready debug snapshot with timeline and retry records. |
| `embed(input, opts?)`    | `(string \| string[], Partial<EmbeddingRequest>) => Promise<EmbeddingResult>`                | Generate embeddings.                                                     |
| `stop()`                 | `() => void`                                                                                 | Abort the in-flight request.                                             |
| `setInput(value)`        | `(string) => void`                                                                           | Replace form input manually.                                             |
| `handleInputChange(e)`   | `(Event \| { target } \| string) => void`                                                    | Wire custom inputs without `v-model`.                                    |
| `handleSubmit(e, opts?)` | `({ preventDefault?: () => void }?, Partial<EmbeddingRequest>?) => Promise<EmbeddingResult>` | Submit `input.value`; clears input after success.                        |
| `clearError()`           | `() => void`                                                                                 | Clear `error` and move `status` back to `ready`.                         |
| `clearTrace()`           | `() => void`                                                                                 | Clear `lastRequest` and `lastResponse` without changing embeddings.      |
| `clear()`                | `() => void`                                                                                 | Reset embeddings, result, and error. Also aborts the in-flight request.  |
| `abortController`        | `Ref<AbortController \| null>`                                                               | Exposed for advanced use cases.                                          |

## Vector similarity

Use `cosineSimilarity(vectorA, vectorB)` to compare two embedding vectors when
building semantic search, clustering, duplicate detection, or local reranking
UIs:

```ts
import { cosineSimilarity } from 'vue-ai-hooks'

const score = cosineSimilarity(queryEmbedding, documentEmbedding)
```

Both vectors must be non-empty, have the same length, have non-zero magnitude,
and contain only finite numbers. The returned score is clamped to the `[-1, 1]`
cosine similarity range.

## Notes

- Anthropic has no embeddings API. `useEmbedding` with the Anthropic provider
  throws an `AiHooksError` with `status: 501`.
- When `provider` and `transport` are omitted, `useEmbedding` calls
  `/api/embedding` through the built-in proxy transport. Pass `api`, `baseURL`,
  `headers`, `body`, `credentials`, or `fetch` to configure that request.
- Input can be a single string or an array of strings (batched into one request).
  Form helpers manage a single text input; call `embed([...])` directly for
  batched embedding requests.
- Use `defaultRequest.body` or `embed(input, { body })` for provider-specific
  JSON request fields. Typed fields such as `input`, `model`, and `user` win if
  keys conflict.
- `handleSubmit()` clears `input` only after a successful embedding request.
  Provider errors leave the text available for retry.
- `onRequest(info)` receives the final `EmbeddingRequest` before the provider
  runs. `onResponse(info)` receives the final result after the provider returns.
  Both include the 1-based `attempt`, provider id, input, body, headers, and
  request snapshot.
  The same latest snapshots are available as `lastRequest` and `lastResponse`
  for rendering diagnostics in the UI.
- `maxRetries` retries failed embedding requests before committing any result.
