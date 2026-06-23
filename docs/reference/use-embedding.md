# useEmbedding

Vue 3 composable for generating text embeddings.

Public TypeScript types: `UseEmbeddingOptions` and `UseEmbeddingReturn`.

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

| Name             | Type                                | Default  | Description                     |
| ---------------- | ----------------------------------- | -------- | ------------------------------- |
| `provider`       | `ChatProvider`                      | required | The provider to use.            |
| `defaultRequest` | `Partial<EmbeddingRequest>`         | `{}`     | Default options.                |
| `onSuccess`      | `(result: EmbeddingResult) => void` | —        | Called when embedding succeeds. |
| `onError`        | `(e: Error) => void`                | —        | Called on any error.            |

## Return value

| Property              | Type                                                                          | Description                                                             |
| --------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `embeddings`          | `Ref<number[][]>`                                                             | The most recent embedding vectors.                                      |
| `isLoading`           | `Ref<boolean>`                                                                | True while a request is in flight.                                      |
| `error`               | `Ref<Error \| null>`                                                          | Last error.                                                             |
| `result`              | `Ref<EmbeddingResult \| null>`                                                | The most recent full result, including usage stats.                     |
| `embed(input, opts?)` | `(string \| string[], Partial<EmbeddingRequest>) => Promise<EmbeddingResult>` | Generate embeddings.                                                    |
| `stop()`              | `() => void`                                                                  | Abort the in-flight request.                                            |
| `clear()`             | `() => void`                                                                  | Reset embeddings, result, and error. Also aborts the in-flight request. |
| `abortController`     | `Ref<AbortController \| null>`                                                | Exposed for advanced use cases.                                         |

## Notes

- Anthropic has no embeddings API. `useEmbedding` with the Anthropic provider
  throws an `AiHooksError` with `status: 501`.
- Input can be a single string or an array of strings (batched into one request).
