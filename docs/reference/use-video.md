# useVideo

Vue 3 composable for video generation through an app-owned backend route.

Public TypeScript types: `UseVideoOptions`, `UseVideoReturn`,
`VideoGenerationRequestInfo`, `VideoGenerationResponseInfo`,
`VideoGenerationRequest`, `VideoGenerationResult`, `VideoFrameImage`,
`GeneratedVideo`, `RetryOptions`, and `RetryContext`.

## Usage

```ts
import { useVideo } from 'vue-ai-hooks'

const { input, video, videos, generateVideo, isLoading, error } = useVideo({
  api: '/api/video',
  initialInput: 'A short product walkthrough for a Vue AI dashboard'
})

await generateVideo(input.value, {
  aspectRatio: '16:9',
  resolution: '1280x720',
  duration: 6,
  providerOptions: { quality: 'high' }
})

console.log(video.value?.url)
console.log(videos.value)
```

`useVideo` always calls your application backend. Keep model credentials on the
server, then return JSON shaped like `{ videos: [{ url, mediaType }] }`,
`{ video: { url } }`, a single video object, or a string URL.

For form wiring, bind `input` and submit it through `handleSubmit()`:

```ts
const { input, handleInputChange, handleSubmit, video } = useVideo({
  api: '/api/video'
})

await handleSubmit(undefined, { aspectRatio: '9:16', duration: 4 })
```

## Options

| Name             | Type                                                                   | Default      | Description                                               |
| ---------------- | ---------------------------------------------------------------------- | ------------ | --------------------------------------------------------- |
| `api`            | `string`                                                               | `/api/video` | Video generation URL for your app backend.                |
| `baseURL`        | `string`                                                               | -            | Base URL prepended to relative `api` values.              |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | -            | Static or dynamic headers sent to your backend.           |
| `body`           | `Record<string, unknown> \| ({ request }) => ...`                      | -            | Extra JSON body fields merged into every proxy request.   |
| `credentials`    | `RequestCredentials`                                                   | -            | Browser credentials mode for same-origin session cookies. |
| `fetch`          | `typeof fetch`                                                         | global       | Custom fetch implementation for tests or runtimes.        |
| `timeoutMs`      | `number`                                                               | -            | Abort the backend request after this many milliseconds.   |
| `initialInput`   | `string`                                                               | `''`         | Seed the form input prompt.                               |
| `defaultRequest` | `Partial<VideoGenerationRequest>`                                      | `{}`         | Default video generation options.                         |
| `maxRetries`     | `number`                                                               | `0`          | Retry attempts for transient failures.                    |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`          | Delay before each retry.                                  |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -            | Override the default retryable error decision.            |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | -            | Called before a retry attempt waits and re-runs.          |
| `onRequest`      | `(info: VideoGenerationRequestInfo) => void`                           | -            | Called with the final backend request before send.        |
| `onResponse`     | `(info: VideoGenerationResponseInfo) => void`                          | -            | Called after the backend returns generated videos.        |
| `onFinish`       | `(result: VideoGenerationResult) => void`                              | -            | Called when video generation succeeds.                    |
| `onError`        | `(e: Error) => void`                                                   | -            | Called on non-abort errors.                               |

## Return value

| Property                        | Type                                                                                                     | Description                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `input`                         | `Ref<string>`                                                                                            | Prompt binding for video forms.                                          |
| `video`                         | `Ref<GeneratedVideo \| null>`                                                                            | First generated video from the latest successful run.                    |
| `videos`                        | `Ref<GeneratedVideo[]>`                                                                                  | All generated videos from the latest successful run.                     |
| `result`                        | `Ref<VideoGenerationResult \| null>`                                                                     | Full backend result, including warnings or provider metadata.            |
| `status`                        | `Ref<AiRequestStatus>`                                                                                   | Request lifecycle: `ready`, `submitted`, or `error`.                     |
| `isLoading`                     | `Ref<boolean>`                                                                                           | True while a request is in flight.                                       |
| `error`                         | `Ref<Error \| null>`                                                                                     | Last non-abort error.                                                    |
| `lastRequest`                   | `Ref<VideoGenerationRequestInfo \| null>`                                                                | Last prepared video request snapshot.                                    |
| `lastResponse`                  | `Ref<VideoGenerationResponseInfo \| null>`                                                               | Last backend response snapshot, including the normalized result.         |
| `inspect()`                     | `() => RequestInspectionSnapshot<VideoGenerationRequestInfo, VideoGenerationResponseInfo>`               | Build a production-ready debug snapshot with timeline and retry records. |
| `generate(prompt?, opts?)`      | `(string?, Partial<VideoGenerationRequest>?) => Promise<VideoGenerationResult>`                          | Alias for `generateVideo()`.                                             |
| `generateVideo(prompt?, opts?)` | `(string?, Partial<VideoGenerationRequest>?) => Promise<VideoGenerationResult>`                          | Generate videos. Uses `input.value` when prompt is omitted.              |
| `stop()`                        | `() => void`                                                                                             | Abort the in-flight request.                                             |
| `setInput(value)`               | `(string) => void`                                                                                       | Replace prompt input manually.                                           |
| `handleInputChange(e)`          | `(Event \| { target } \| string) => void`                                                                | Wire custom inputs without `v-model`.                                    |
| `handleSubmit(e, opts?)`        | `({ preventDefault?: () => void }?, Partial<VideoGenerationRequest>?) => Promise<VideoGenerationResult>` | Submit `input.value`; clears input after success.                        |
| `clearError()`                  | `() => void`                                                                                             | Clear `error` and move `status` back to `ready`.                         |
| `clearTrace()`                  | `() => void`                                                                                             | Clear `lastRequest` and `lastResponse` without changing videos.          |
| `clear()`                       | `() => void`                                                                                             | Reset input, videos, result, error, trace, and status.                   |
| `abortController`               | `Ref<AbortController \| null>`                                                                           | Exposed for advanced integrations.                                       |

## Notes

- `defaultRequest.body`, top-level `body`, and `generateVideo(prompt, { body })`
  are merged before sending JSON to the backend. Per-call keys win when they
  overlap.
- The backend request JSON includes typed fields such as `prompt`, `model`, `n`,
  `aspectRatio`, `resolution`, `size`, `duration`, `fps`, `seed`, `image`,
  `frameImages`, `inputReferences`, `generateAudio`, `providerOptions`, and
  `user`.
- `handleSubmit()` clears `input` only after a successful video generation
  request. Backend errors leave the prompt available for retry.
- `onRequest(info)` and `onResponse(info)` include the resolved `api`,
  credentials mode, headers, final JSON body, and retry attempt. The same latest
  snapshots are available as `lastRequest` and `lastResponse`.
- `stop()` aborts the active request and leaves `error` empty for aborts.
