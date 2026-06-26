# useEmbedding

Vue 3 composable for generating text embeddings.

Public TypeScript types: `UseEmbeddingOptions`, `UseEmbeddingReturn`,
`EmbeddingRequestInfo`, `EmbeddingResponseInfo`, `RetryOptions`, and
`RetryContext`.

## Usage

```ts
import { useEmbedding, openai } from 'vue-ai-hooks'

const { embed, embeddings, isLoading, error } = useEmbedding({
  provider: openai({ apiKey: '...' })
})

const result = await embed(['hello world', 'goodbye world'])
console.log(result.embeddings) // number[][]
```

## Options

| Name             | Type                                                                   | Default  | Description                                      |
| ---------------- | ---------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| `provider`       | `ChatProvider`                                                         | required | The provider to use.                             |
| `defaultRequest` | `Partial<EmbeddingRequest>`                                            | `{}`     | Default options.                                 |
| `maxRetries`     | `number`                                                               | `0`      | Retry attempts for transient failures.           |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`      | Delay before each retry.                         |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | —        | Override the default retryable error decision.   |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | —        | Called before a retry attempt waits and re-runs. |
| `onRequest`      | `(info: EmbeddingRequestInfo) => void`                                 | —        | Called with the final embedding request.         |
| `onResponse`     | `(info: EmbeddingResponseInfo) => void`                                | —        | Called after the provider returns embeddings.    |
| `onSuccess`      | `(result: EmbeddingResult) => void`                                    | —        | Called when embedding succeeds.                  |
| `onError`        | `(e: Error) => void`                                                   | —        | Called on any error.                             |

## Return value

| Property              | Type                                                                          | Description                                                             |
| --------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `embeddings`          | `Ref<number[][]>`                                                             | The most recent embedding vectors.                                      |
| `status`              | `Ref<AiRequestStatus>`                                                        | Request lifecycle: `ready`, `submitted`, or `error`.                    |
| `isLoading`           | `Ref<boolean>`                                                                | True while a request is in flight.                                      |
| `error`               | `Ref<Error \| null>`                                                          | Last error.                                                             |
| `result`              | `Ref<EmbeddingResult \| null>`                                                | The most recent full result, including usage stats.                     |
| `embed(input, opts?)` | `(string \| string[], Partial<EmbeddingRequest>) => Promise<EmbeddingResult>` | Generate embeddings.                                                    |
| `stop()`              | `() => void`                                                                  | Abort the in-flight request.                                            |
| `clearError()`        | `() => void`                                                                  | Clear `error` and move `status` back to `ready`.                        |
| `clear()`             | `() => void`                                                                  | Reset embeddings, result, and error. Also aborts the in-flight request. |
| `abortController`     | `Ref<AbortController \| null>`                                                | Exposed for advanced use cases.                                         |

## Notes

- Anthropic has no embeddings API. `useEmbedding` with the Anthropic provider
  throws an `AiHooksError` with `status: 501`.
- Input can be a single string or an array of strings (batched into one request).
- Use `defaultRequest.body` or `embed(input, { body })` for provider-specific
  JSON request fields. Typed fields such as `input`, `model`, and `user` win if
  keys conflict.
- `onRequest(info)` receives the final `EmbeddingRequest` before the provider
  runs. `onResponse(info)` receives the final result after the provider returns.
  Both include the 1-based `attempt`, provider id, input, body, headers, and
  request snapshot.
- `maxRetries` retries failed embedding requests before committing any result.
