# useRerank

Vue 3 composable for document reranking through an app-owned backend route.

Public TypeScript types: `UseRerankOptions`, `UseRerankReturn`,
`RerankRequestInfo`, `RerankResponseInfo`, `RerankRequest`,
`RerankResult`, `RerankRankingItem`, `RerankDocument`, `RetryOptions`, and
`RetryContext`.

## Usage

```ts
import { useRerank } from 'vue-ai-hooks'

const { input, documents, rerankedDocuments, ranking, rerankDocuments } = useRerank<string>({
  api: '/api/rerank',
  initialInput: 'Vue AI search results',
  initialDocuments: [
    'Streaming chat state for Vue apps',
    'Billing workflow approval',
    'Document reranking for search'
  ]
})

await rerankDocuments(input.value, documents.value, {
  model: 'rerank-model',
  topN: 2
})

console.log(rerankedDocuments.value, ranking.value)
```

`useRerank` always calls your application backend. Keep model credentials on
the server, then return JSON with `ranking`, `rerankedDocuments`, or both.

For form wiring, bind `input`, set `documents`, and submit through
`handleSubmit()`:

```ts
const { input, documents, setDocuments, handleSubmit } = useRerank<string>({
  api: '/api/rerank'
})

setDocuments(['First result', 'Second result'])
await handleSubmit(undefined, { topN: 1 })
```

## Options

| Name               | Type                                                                   | Default       | Description                                               |
| ------------------ | ---------------------------------------------------------------------- | ------------- | --------------------------------------------------------- |
| `api`              | `string`                                                               | `/api/rerank` | Rerank URL for your app backend.                          |
| `baseURL`          | `string`                                                               | -             | Base URL prepended to relative `api` values.              |
| `headers`          | `HeadersInit \| () => HeadersInit`                                     | -             | Static or dynamic headers sent to your backend.           |
| `body`             | `Record<string, unknown> \| ({ request }) => ...`                      | -             | Extra JSON body fields merged into every proxy request.   |
| `credentials`      | `RequestCredentials`                                                   | -             | Browser credentials mode for same-origin session cookies. |
| `fetch`            | `typeof fetch`                                                         | global        | Custom fetch implementation for tests or runtimes.        |
| `timeoutMs`        | `number`                                                               | -             | Abort the backend request after this many milliseconds.   |
| `initialInput`     | `string`                                                               | `''`          | Seed the query form input.                                |
| `initialDocuments` | `TDocument[]`                                                          | `[]`          | Seed the documents to rerank.                             |
| `defaultRequest`   | `Partial<RerankRequest<TDocument>>`                                    | `{}`          | Default rerank options.                                   |
| `maxRetries`       | `number`                                                               | `0`           | Retry attempts for transient failures.                    |
| `retryDelayMs`     | `number \| (context: RetryContext) => number`                          | `0`           | Delay before each retry.                                  |
| `shouldRetry`      | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -             | Override the default retryable error decision.            |
| `onRetry`          | `(error: Error, context: RetryContext) => void`                        | -             | Called before a retry attempt waits and re-runs.          |
| `onRequest`        | `(info: RerankRequestInfo<TDocument>) => void`                         | -             | Called with the final backend request before send.        |
| `onResponse`       | `(info: RerankResponseInfo<TDocument>) => void`                        | -             | Called after the backend returns ranking data.            |
| `onFinish`         | `(result: RerankResult<TDocument>) => void`                            | -             | Called when reranking succeeds.                           |
| `onError`          | `(e: Error) => void`                                                   | -             | Called on non-abort errors.                               |

## Return value

| Property                                | Type                                                                                                         | Description                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `input`                                 | `Ref<string>`                                                                                                | Query text binding for forms.                                            |
| `query`                                 | `Ref<string>`                                                                                                | Alias for `input`.                                                       |
| `documents`                             | `Ref<TDocument[]>`                                                                                           | Current documents that will be sent to the backend.                      |
| `originalDocuments`                     | `Ref<TDocument[]>`                                                                                           | Documents from the latest successful result before ranking.              |
| `rerankedDocuments`                     | `Ref<TDocument[]>`                                                                                           | Documents ordered by relevance from the latest successful result.        |
| `ranking`                               | `Ref<RerankRankingItem<TDocument>[]>`                                                                        | Ranking rows with `index`, `score`, and `document`.                      |
| `result`                                | `Ref<RerankResult<TDocument> \| null>`                                                                       | Full backend result, including provider metadata.                        |
| `status`                                | `Ref<AiRequestStatus>`                                                                                       | Request lifecycle: `ready`, `submitted`, or `error`.                     |
| `isLoading`                             | `Ref<boolean>`                                                                                               | True while a request is in flight.                                       |
| `error`                                 | `Ref<Error \| null>`                                                                                         | Last non-abort error.                                                    |
| `lastRequest`                           | `Ref<RerankRequestInfo<TDocument> \| null>`                                                                  | Last prepared rerank request snapshot.                                   |
| `lastResponse`                          | `Ref<RerankResponseInfo<TDocument> \| null>`                                                                 | Last backend response snapshot.                                          |
| `inspect()`                             | `() => RequestInspectionSnapshot<RerankRequestInfo<TDocument>, RerankResponseInfo<TDocument>>`               | Build a production-ready debug snapshot with timeline and retry records. |
| `rerank(query?, docs?, opts?)`          | `(string?, TDocument[]?, Partial<RerankRequest<TDocument>>?) => Promise<RerankResult<TDocument>>`            | Alias for `rerankDocuments()`.                                           |
| `rerankDocuments(query?, docs?, opts?)` | `(string?, TDocument[]?, Partial<RerankRequest<TDocument>>?) => Promise<RerankResult<TDocument>>`            | Rerank documents. Uses current refs when arguments are omitted.          |
| `stop()`                                | `() => void`                                                                                                 | Abort the in-flight request.                                             |
| `setInput(value)`                       | `(string) => void`                                                                                           | Replace the query input manually.                                        |
| `setQuery(value)`                       | `(string) => void`                                                                                           | Alias for `setInput()`.                                                  |
| `handleInputChange(e)`                  | `(Event \| { target } \| string) => void`                                                                    | Wire custom inputs without `v-model`.                                    |
| `setDocuments(value)`                   | `(TDocument[]) => void`                                                                                      | Replace the documents array.                                             |
| `handleSubmit(e, opts?)`                | `({ preventDefault?: () => void }?, Partial<RerankRequest<TDocument>>?) => Promise<RerankResult<TDocument>>` | Submit refs; clears query after success.                                 |
| `clearError()`                          | `() => void`                                                                                                 | Clear `error` and move `status` back to `ready`.                         |
| `clearTrace()`                          | `() => void`                                                                                                 | Clear `lastRequest` and `lastResponse` without changing results.         |
| `clear()`                               | `() => void`                                                                                                 | Reset query, documents, ranking, result, error, trace, and status.       |
| `abortController`                       | `Ref<AbortController \| null>`                                                                               | Exposed for advanced integrations.                                       |

## Notes

- `defaultRequest.body`, top-level `body`, and `rerankDocuments(query, docs, { body })`
  are merged before sending JSON to the backend. Per-call keys win when they
  overlap.
- The backend request JSON includes typed fields such as `query`, `documents`,
  `model`, `topN`, `providerOptions`, and `user`.
- `handleSubmit()` clears `input` only after a successful rerank request.
  Backend errors leave the query and documents available for retry.
- `onRequest(info)` and `onResponse(info)` include the resolved `api`,
  credentials mode, headers, final JSON body, and retry attempt. The same latest
  snapshots are available as `lastRequest` and `lastResponse` for internal trace
  state. Render `inspect()` output when the UI needs redacted diagnostics.
