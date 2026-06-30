# useGeneration

Provider-agnostic Vue 3 composable for one-shot AI generation tasks such as
image creation, audio jobs, summaries, or any custom async model call.

Public TypeScript types: `UseGenerationOptions`, `UseGenerationReturn`,
`GenerationFetcher`, `GenerationRunContext`, `GenerationRequestInfo`,
`GenerationResponseInfo`, `GenerateOptions`, `RetryOptions`, and
`RetryContext`.

## Usage

```ts
import { useGeneration } from 'vue-ai-hooks'

const { input, result, progress, chunks, generate, isLoading } = useGeneration<
  string,
  { url: string },
  { percent: number },
  string
>({
  initialInput: 'A minimal Vue workspace',
  async fetcher(prompt, context) {
    context.reportProgress({ percent: 50 })
    context.reportChunk('queued')

    const response = await fetch('/api/image', {
      method: 'POST',
      signal: context.signal,
      body: JSON.stringify({ prompt })
    })

    return (await response.json()) as { url: string }
  }
})

await generate(input.value)
```

`useGeneration` does not impose a provider transport. Keep model credentials on
your server, then call your own route from `fetcher`. The composable owns the
Vue state, abort signal, retries before visible output, progress, chunks, and
callbacks.

## Options

| Name                    | Type                                                                   | Default      | Description                                                     |
| ----------------------- | ---------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| `fetcher`               | `GenerationFetcher<TInput, TResult, TProgress, TChunk>`                | required     | Async generation function. Receives the input and run context.  |
| `id`                    | `string`                                                               | generated    | Generation state identifier. Matching ids share state.          |
| `generateId`            | `IdGenerator`                                                          | `generateId` | Generate an id when `id` is omitted.                            |
| `initialInput`          | `TInput`                                                               | —            | Seed the input value.                                           |
| `initialResult`         | `TResult \| null`                                                      | `null`       | Seed or reset the result.                                       |
| `initialProgress`       | `TProgress \| null`                                                    | `null`       | Seed or reset the progress value.                               |
| `defaultBody`           | `Record<string, unknown>`                                              | —            | Default JSON-like metadata merged with per-call `body`.         |
| `maxRetries`            | `number`                                                               | `0`          | Retry attempts for failures before progress or chunks appear.   |
| `retryDelayMs`          | `number \| (context: RetryContext) => number`                          | `0`          | Delay before each retry.                                        |
| `shouldRetry`           | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | —            | Override the default retryable error decision.                  |
| `onRetry`               | `(error: Error, context: RetryContext) => void`                        | —            | Called before a retry attempt waits and re-runs.                |
| `throttleMs`            | `number`                                                               | —            | Minimum wait in ms between reactive progress and chunk updates. |
| `experimental_throttle` | `number`                                                               | —            | AI SDK-compatible alias. Prefer `throttleMs`.                   |
| `onRequest`             | `(info: GenerationRequestInfo<TInput>) => void`                        | —            | Called before `fetcher` runs.                                   |
| `onResponse`            | `(info: GenerationResponseInfo<TInput, TResult>) => void`              | —            | Called when `fetcher` resolves.                                 |
| `onProgress`            | `(progress: TProgress) => void`                                        | —            | Called when `context.reportProgress()` flushes.                 |
| `onChunk`               | `(chunk: TChunk) => void`                                              | —            | Called when `context.reportChunk()` flushes.                    |
| `onFinish`              | `(result: TResult) => void`                                            | —            | Called once the final result is stored.                         |
| `onError`               | `(e: Error) => void`                                                   | —            | Called on non-abort errors.                                     |

## Fetcher context

`GenerationRunContext<TInput, TProgress, TChunk>` includes:

```ts
interface GenerationRunContext<TInput, TProgress, TChunk> {
  id: string
  attempt: number
  input: TInput
  body?: Record<string, unknown>
  signal: AbortSignal
  reportProgress(progress: TProgress): void
  reportChunk(chunk: TChunk): void
}
```

Use `signal` with `fetch()` or your SDK's abort hook. Use `reportProgress()` for
percentages or job stages, and `reportChunk()` for logs, preview URLs, or model
events.

## Return value

| Property                  | Type                                                   | Description                                                     |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `id`                      | `Ref<string>`                                          | Generation state id selected at composable creation.            |
| `input`                   | `Ref<TInput \| undefined>`                             | Current input.                                                  |
| `result`                  | `Ref<TResult \| null>`                                 | Final generated value.                                          |
| `progress`                | `Ref<TProgress \| null>`                               | Latest progress reported by the fetcher.                        |
| `chunks`                  | `Ref<TChunk[]>`                                        | Chunks reported by the fetcher for the current run.             |
| `status`                  | `Ref<AiRequestStatus>`                                 | Request lifecycle: `ready`, `submitted`, `streaming`, `error`.  |
| `isLoading`               | `Ref<boolean>`                                         | True while a generation run is active.                          |
| `error`                   | `Ref<Error \| null>`                                   | Last non-abort error.                                           |
| `lastRequest`             | `Ref<GenerationRequestInfo<TInput> \| null>`           | Last prepared generation request snapshot.                      |
| `lastResponse`            | `Ref<GenerationResponseInfo<TInput, TResult> \| null>` | Last resolved generation response snapshot.                     |
| `generate(input?, opts?)` | `(TInput?, GenerateOptions?) => Promise<TResult>`      | Run the fetcher. Resolves to the final result.                  |
| `stop()`                  | `() => void`                                           | Abort the active generation.                                    |
| `setInput(value)`         | `(TInput \| undefined) => void`                        | Replace the input value.                                        |
| `setResult(value)`        | `(TResult \| null) => void`                            | Replace the result manually.                                    |
| `clearError()`            | `() => void`                                           | Clear `error` and move `status` back to `ready`.                |
| `clearTrace()`            | `() => void`                                           | Clear `lastRequest` and `lastResponse` without changing result. |
| `clear()`                 | `() => void`                                           | Reset input, result, progress, chunks, error, and status.       |
| `reset()`                 | `() => void`                                           | Alias for `clear()`.                                            |
| `abortController`         | `Ref<AbortController \| null>`                         | Exposed for advanced integrations.                              |

## Notes

- `defaultBody` and `generate(input, { body })` are merged before `fetcher`
  runs. Per-call keys win when they overlap.
- The latest `onRequest` and `onResponse` payloads are also exposed through
  `lastRequest` and `lastResponse` for rendering diagnostics in the UI.
- `generate()` uses `input.value` when no input argument is passed. It throws if
  both are `undefined`.
- Passing the same `id` to multiple `useGeneration()` calls shares input,
  result, progress, chunks, status, error, loading, and abort state.
- `result`, `progress`, and `chunks` reset at the start of each run.
- When `maxRetries` is enabled, retries happen only before the fetcher reports
  progress or chunks. This avoids duplicating visible output.
- `stop()` aborts the active signal and keeps `error` empty for aborts.
- Set `throttleMs` to batch fast `reportProgress()` and `reportChunk()` updates.
  Final progress and chunks are flushed before `generate()` resolves or rejects.
