# useImage

Vue 3 composable for image generation through an app-owned backend route.

Public TypeScript types: `UseImageOptions`, `UseImageReturn`,
`ImageGenerationRequestInfo`, `ImageGenerationResponseInfo`,
`ImageGenerationRequest`, `ImageGenerationResult`, `GeneratedImage`,
`RetryOptions`, and `RetryContext`.

## Usage

```ts
import { useImage } from 'vue-ai-hooks'

const { input, image, images, generateImage, isLoading, error } = useImage({
  api: '/api/image',
  initialInput: 'A minimal Vue workspace hero image'
})

await generateImage(input.value, {
  size: '1024x1024',
  providerOptions: { quality: 'high' }
})

console.log(image.value?.url)
console.log(images.value)
```

`useImage` always calls your application backend. Keep model credentials on the
server, then return JSON shaped like `{ images: [{ url, mediaType }] }`,
`{ image: { url } }`, or a single image object.

For form wiring, bind `input` and submit it through `handleSubmit()`:

```ts
const { input, handleInputChange, handleSubmit, image } = useImage({
  api: '/api/image'
})

await handleSubmit(undefined, { aspectRatio: '16:9' })
```

## Options

| Name             | Type                                                                   | Default      | Description                                               |
| ---------------- | ---------------------------------------------------------------------- | ------------ | --------------------------------------------------------- |
| `api`            | `string`                                                               | `/api/image` | Image generation URL for your app backend.                |
| `baseURL`        | `string`                                                               | —            | Base URL prepended to relative `api` values.              |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | —            | Static or dynamic headers sent to your backend.           |
| `body`           | `Record<string, unknown> \| ({ request }) => ...`                      | —            | Extra JSON body fields merged into every proxy request.   |
| `credentials`    | `RequestCredentials`                                                   | —            | Browser credentials mode for same-origin session cookies. |
| `fetch`          | `typeof fetch`                                                         | global       | Custom fetch implementation for tests or runtimes.        |
| `timeoutMs`      | `number`                                                               | —            | Abort the backend request after this many milliseconds.   |
| `initialInput`   | `string`                                                               | `''`         | Seed the form input prompt.                               |
| `defaultRequest` | `Partial<ImageGenerationRequest>`                                      | `{}`         | Default generation options.                               |
| `maxRetries`     | `number`                                                               | `0`          | Retry attempts for transient failures.                    |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`          | Delay before each retry.                                  |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | —            | Override the default retryable error decision.            |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | —            | Called before a retry attempt waits and re-runs.          |
| `onRequest`      | `(info: ImageGenerationRequestInfo) => void`                           | —            | Called with the final backend request before send.        |
| `onResponse`     | `(info: ImageGenerationResponseInfo) => void`                          | —            | Called after the backend returns generated images.        |
| `onFinish`       | `(result: ImageGenerationResult) => void`                              | —            | Called when image generation succeeds.                    |
| `onError`        | `(e: Error) => void`                                                   | —            | Called on non-abort errors.                               |

## Return value

| Property                        | Type                                                                                                     | Description                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `input`                         | `Ref<string>`                                                                                            | Prompt binding for image forms.                                  |
| `image`                         | `Ref<GeneratedImage \| null>`                                                                            | First generated image from the latest successful run.            |
| `images`                        | `Ref<GeneratedImage[]>`                                                                                  | All generated images from the latest successful run.             |
| `result`                        | `Ref<ImageGenerationResult \| null>`                                                                     | Full backend result, including warnings or provider metadata.    |
| `status`                        | `Ref<AiRequestStatus>`                                                                                   | Request lifecycle: `ready`, `submitted`, or `error`.             |
| `isLoading`                     | `Ref<boolean>`                                                                                           | True while a request is in flight.                               |
| `error`                         | `Ref<Error \| null>`                                                                                     | Last non-abort error.                                            |
| `lastRequest`                   | `Ref<ImageGenerationRequestInfo \| null>`                                                                | Last prepared image request snapshot.                            |
| `lastResponse`                  | `Ref<ImageGenerationResponseInfo \| null>`                                                               | Last backend response snapshot, including the normalized result. |
| `generate(prompt?, opts?)`      | `(string?, Partial<ImageGenerationRequest>?) => Promise<ImageGenerationResult>`                          | Alias for `generateImage()`.                                     |
| `generateImage(prompt?, opts?)` | `(string?, Partial<ImageGenerationRequest>?) => Promise<ImageGenerationResult>`                          | Generate images. Uses `input.value` when prompt is omitted.      |
| `stop()`                        | `() => void`                                                                                             | Abort the in-flight request.                                     |
| `setInput(value)`               | `(string) => void`                                                                                       | Replace prompt input manually.                                   |
| `handleInputChange(e)`          | `(Event \| { target } \| string) => void`                                                                | Wire custom inputs without `v-model`.                            |
| `handleSubmit(e, opts?)`        | `({ preventDefault?: () => void }?, Partial<ImageGenerationRequest>?) => Promise<ImageGenerationResult>` | Submit `input.value`; clears input after success.                |
| `clearError()`                  | `() => void`                                                                                             | Clear `error` and move `status` back to `ready`.                 |
| `clearTrace()`                  | `() => void`                                                                                             | Clear `lastRequest` and `lastResponse` without changing images.  |
| `clear()`                       | `() => void`                                                                                             | Reset input, images, result, error, trace, and status.           |
| `abortController`               | `Ref<AbortController \| null>`                                                                           | Exposed for advanced integrations.                               |

## Notes

- `defaultRequest.body`, top-level `body`, and `generateImage(prompt, { body })`
  are merged before sending JSON to the backend. Per-call keys win when they
  overlap.
- The backend request JSON includes typed fields such as `prompt`, `model`, `n`,
  `size`, `aspectRatio`, `seed`, `providerOptions`, and `user`.
- `handleSubmit()` clears `input` only after a successful image generation
  request. Backend errors leave the prompt available for retry.
- `onRequest(info)` and `onResponse(info)` include the resolved `api`,
  credentials mode, headers, final JSON body, and retry attempt. The same latest
  snapshots are available as `lastRequest` and `lastResponse`.
- `stop()` aborts the active request and leaves `error` empty for aborts.
