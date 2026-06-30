# useSpeech

Vue 3 composable for text-to-speech generation through an app-owned backend route.

Public TypeScript types: `UseSpeechOptions`, `UseSpeechReturn`,
`SpeechGenerationRequestInfo`, `SpeechGenerationResponseInfo`,
`SpeechGenerationRequest`, `SpeechGenerationResult`, `GeneratedAudio`,
`RetryOptions`, and `RetryContext`.

## Usage

```ts
import { useSpeech } from 'vue-ai-hooks'

const { input, audio, generateSpeech, isLoading, error } = useSpeech({
  api: '/api/speech',
  initialInput: 'Read this release note aloud.'
})

await generateSpeech(input.value, {
  voice: 'alloy',
  outputFormat: 'mp3'
})

console.log(audio.value?.url)
```

`useSpeech` always calls your application backend. Keep model credentials on the
server, then return JSON shaped like `{ audio: { url, mediaType } }`, a single
audio object, or a string URL.

For form wiring, bind `input` and submit it through `handleSubmit()`:

```ts
const { input, handleInputChange, handleSubmit, audio } = useSpeech({
  api: '/api/speech'
})

await handleSubmit(undefined, { voice: 'verse' })
```

## Options

| Name             | Type                                                                   | Default       | Description                                               |
| ---------------- | ---------------------------------------------------------------------- | ------------- | --------------------------------------------------------- |
| `api`            | `string`                                                               | `/api/speech` | Speech generation URL for your app backend.               |
| `baseURL`        | `string`                                                               | —             | Base URL prepended to relative `api` values.              |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | —             | Static or dynamic headers sent to your backend.           |
| `body`           | `Record<string, unknown> \| ({ request }) => ...`                      | —             | Extra JSON body fields merged into every proxy request.   |
| `credentials`    | `RequestCredentials`                                                   | —             | Browser credentials mode for same-origin session cookies. |
| `fetch`          | `typeof fetch`                                                         | global        | Custom fetch implementation for tests or runtimes.        |
| `timeoutMs`      | `number`                                                               | —             | Abort the backend request after this many milliseconds.   |
| `initialInput`   | `string`                                                               | `''`          | Seed the form input text.                                 |
| `defaultRequest` | `Partial<SpeechGenerationRequest>`                                     | `{}`          | Default speech options.                                   |
| `maxRetries`     | `number`                                                               | `0`           | Retry attempts for transient failures.                    |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`           | Delay before each retry.                                  |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | —             | Override the default retryable error decision.            |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | —             | Called before a retry attempt waits and re-runs.          |
| `onRequest`      | `(info: SpeechGenerationRequestInfo) => void`                          | —             | Called with the final backend request before send.        |
| `onResponse`     | `(info: SpeechGenerationResponseInfo) => void`                         | —             | Called after the backend returns generated audio.         |
| `onFinish`       | `(result: SpeechGenerationResult) => void`                             | —             | Called when speech generation succeeds.                   |
| `onError`        | `(e: Error) => void`                                                   | —             | Called on non-abort errors.                               |

## Return value

| Property                       | Type                                                                                                       | Description                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `input`                        | `Ref<string>`                                                                                              | Text binding for speech forms.                                   |
| `audio`                        | `Ref<GeneratedAudio \| null>`                                                                              | Generated audio from the latest successful run.                  |
| `result`                       | `Ref<SpeechGenerationResult \| null>`                                                                      | Full backend result, including warnings or provider metadata.    |
| `status`                       | `Ref<AiRequestStatus>`                                                                                     | Request lifecycle: `ready`, `submitted`, or `error`.             |
| `isLoading`                    | `Ref<boolean>`                                                                                             | True while a request is in flight.                               |
| `error`                        | `Ref<Error \| null>`                                                                                       | Last non-abort error.                                            |
| `lastRequest`                  | `Ref<SpeechGenerationRequestInfo \| null>`                                                                 | Last prepared speech request snapshot.                           |
| `lastResponse`                 | `Ref<SpeechGenerationResponseInfo \| null>`                                                                | Last backend response snapshot, including the normalized result. |
| `generate(text?, opts?)`       | `(string?, Partial<SpeechGenerationRequest>?) => Promise<SpeechGenerationResult>`                          | Alias for `generateSpeech()`.                                    |
| `generateSpeech(text?, opts?)` | `(string?, Partial<SpeechGenerationRequest>?) => Promise<SpeechGenerationResult>`                          | Generate speech. Uses `input.value` when text is omitted.        |
| `speak(text?, opts?)`          | `(string?, Partial<SpeechGenerationRequest>?) => Promise<SpeechGenerationResult>`                          | Alias for `generateSpeech()`.                                    |
| `stop()`                       | `() => void`                                                                                               | Abort the in-flight request.                                     |
| `setInput(value)`              | `(string) => void`                                                                                         | Replace text input manually.                                     |
| `handleInputChange(e)`         | `(Event \| { target } \| string) => void`                                                                  | Wire custom inputs without `v-model`.                            |
| `handleSubmit(e, opts?)`       | `({ preventDefault?: () => void }?, Partial<SpeechGenerationRequest>?) => Promise<SpeechGenerationResult>` | Submit `input.value`; clears input after success.                |
| `clearError()`                 | `() => void`                                                                                               | Clear `error` and move `status` back to `ready`.                 |
| `clearTrace()`                 | `() => void`                                                                                               | Clear `lastRequest` and `lastResponse` without changing audio.   |
| `clear()`                      | `() => void`                                                                                               | Reset input, audio, result, error, trace, and status.            |
| `abortController`              | `Ref<AbortController \| null>`                                                                             | Exposed for advanced integrations.                               |

## Notes

- `defaultRequest.body`, top-level `body`, and `generateSpeech(text, { body })`
  are merged before sending JSON to the backend. Per-call keys win when they
  overlap.
- The backend request JSON includes typed fields such as `text`, `model`,
  `voice`, `outputFormat`, `instructions`, `speed`, `language`,
  `providerOptions`, and `user`.
- `handleSubmit()` clears `input` only after a successful speech request.
  Backend errors leave the text available for retry.
- `onRequest(info)` and `onResponse(info)` include the resolved `api`,
  credentials mode, headers, final JSON body, and retry attempt. The same latest
  snapshots are available as `lastRequest` and `lastResponse`.
- `stop()` aborts the active request and leaves `error` empty for aborts.
