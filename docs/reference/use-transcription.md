# useTranscription

Vue 3 composable for audio transcription through an app-owned backend route.

Public TypeScript types: `UseTranscriptionOptions`, `UseTranscriptionReturn`,
`TranscriptionRequestInfo`, `TranscriptionResponseInfo`,
`TranscriptionRequest`, `TranscriptionResult`, `TranscriptionSegment`,
`RetryOptions`, and `RetryContext`.

## Usage

```ts
import { useTranscription } from 'vue-ai-hooks'

const { input, transcription, transcribeAudio, isLoading, error } = useTranscription({
  api: '/api/transcription',
  initialInput: 'data:audio/wav;base64,...'
})

await transcribeAudio(input.value, {
  language: 'en',
  timestampGranularities: ['segment']
})

console.log(transcription.value)
```

`useTranscription` always calls your application backend. Keep model credentials
on the server, then return JSON shaped like `{ text }`, a string transcript, or
an object with a `transcription` string field.

For form wiring, bind `input` and submit it through `handleSubmit()`:

```ts
const { input, handleInputChange, handleSubmit, text } = useTranscription({
  api: '/api/transcription'
})

await handleSubmit(undefined, { language: 'en' })
```

## Options

| Name             | Type                                                                   | Default              | Description                                               |
| ---------------- | ---------------------------------------------------------------------- | -------------------- | --------------------------------------------------------- |
| `api`            | `string`                                                               | `/api/transcription` | Transcription URL for your app backend.                   |
| `baseURL`        | `string`                                                               | —                    | Base URL prepended to relative `api` values.              |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | —                    | Static or dynamic headers sent to your backend.           |
| `body`           | `Record<string, unknown> \| ({ request }) => ...`                      | —                    | Extra JSON body fields merged into every proxy request.   |
| `credentials`    | `RequestCredentials`                                                   | —                    | Browser credentials mode for same-origin session cookies. |
| `fetch`          | `typeof fetch`                                                         | global               | Custom fetch implementation for tests or runtimes.        |
| `timeoutMs`      | `number`                                                               | —                    | Abort the backend request after this many milliseconds.   |
| `initialInput`   | `string`                                                               | `''`                 | Seed the form audio URL, data URL, or base64 payload.     |
| `defaultRequest` | `Partial<TranscriptionRequest>`                                        | `{}`                 | Default transcription options.                            |
| `maxRetries`     | `number`                                                               | `0`                  | Retry attempts for transient failures.                    |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`                  | Delay before each retry.                                  |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | —                    | Override the default retryable error decision.            |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | —                    | Called before a retry attempt waits and re-runs.          |
| `onRequest`      | `(info: TranscriptionRequestInfo) => void`                             | —                    | Called with the final backend request before send.        |
| `onResponse`     | `(info: TranscriptionResponseInfo) => void`                            | —                    | Called after the backend returns transcription text.      |
| `onFinish`       | `(result: TranscriptionResult) => void`                                | —                    | Called when transcription succeeds.                       |
| `onError`        | `(e: Error) => void`                                                   | —                    | Called on non-abort errors.                               |

## Return value

| Property                         | Type                                                                                                 | Description                                                      |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `input`                          | `Ref<string>`                                                                                        | Audio URL, data URL, or base64 text binding for forms.           |
| `transcription`                  | `Ref<string>`                                                                                        | Transcript text from the latest successful run.                  |
| `text`                           | `Ref<string>`                                                                                        | Alias for `transcription`.                                       |
| `result`                         | `Ref<TranscriptionResult \| null>`                                                                   | Full backend result, including segments or provider metadata.    |
| `status`                         | `Ref<AiRequestStatus>`                                                                               | Request lifecycle: `ready`, `submitted`, or `error`.             |
| `isLoading`                      | `Ref<boolean>`                                                                                       | True while a request is in flight.                               |
| `error`                          | `Ref<Error \| null>`                                                                                 | Last non-abort error.                                            |
| `lastRequest`                    | `Ref<TranscriptionRequestInfo \| null>`                                                              | Last prepared transcription request snapshot.                    |
| `lastResponse`                   | `Ref<TranscriptionResponseInfo \| null>`                                                             | Last backend response snapshot, including the normalized result. |
| `transcribe(audio?, opts?)`      | `(string?, Partial<TranscriptionRequest>?) => Promise<TranscriptionResult>`                          | Alias for `transcribeAudio()`.                                   |
| `transcribeAudio(audio?, opts?)` | `(string?, Partial<TranscriptionRequest>?) => Promise<TranscriptionResult>`                          | Transcribe audio. Uses `input.value` when audio is omitted.      |
| `stop()`                         | `() => void`                                                                                         | Abort the in-flight request.                                     |
| `setInput(value)`                | `(string) => void`                                                                                   | Replace audio input manually.                                    |
| `handleInputChange(e)`           | `(Event \| { target } \| string) => void`                                                            | Wire custom inputs without `v-model`.                            |
| `handleSubmit(e, opts?)`         | `({ preventDefault?: () => void }?, Partial<TranscriptionRequest>?) => Promise<TranscriptionResult>` | Submit `input.value`; clears input after success.                |
| `clearError()`                   | `() => void`                                                                                         | Clear `error` and move `status` back to `ready`.                 |
| `clearTrace()`                   | `() => void`                                                                                         | Clear `lastRequest` and `lastResponse` without changing text.    |
| `clear()`                        | `() => void`                                                                                         | Reset input, transcription, result, error, trace, and status.    |
| `abortController`                | `Ref<AbortController \| null>`                                                                       | Exposed for advanced integrations.                               |

## Notes

- `defaultRequest.body`, top-level `body`, and
  `transcribeAudio(audio, { body })` are merged before sending JSON to the
  backend. Per-call keys win when they overlap.
- The backend request JSON includes typed fields such as `audio`, `model`,
  `language`, `prompt`, `temperature`, `timestampGranularities`,
  `providerOptions`, and `user`.
- `handleSubmit()` clears `input` only after a successful transcription request.
  Backend errors leave the audio input available for retry.
- `onRequest(info)` and `onResponse(info)` include the resolved `api`,
  credentials mode, headers, final JSON body, and retry attempt. The same latest
  snapshots are available as `lastRequest` and `lastResponse`.
- `stop()` aborts the active request and leaves `error` empty for aborts.
