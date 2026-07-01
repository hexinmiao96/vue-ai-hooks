# Upgrade to v0.4.0

This guide is for apps currently on `vue-ai-hooks@0.3.x` that want the v0.4.0
release line.

## Compatibility

v0.4.0 does not intentionally remove or rename documented public exports from
v0.3.x. Existing chat, completion, embedding, image, speech, transcription,
rerank, object, provider, and proxy code should continue to compile.

Upgrade the package:

```bash
pnpm add vue-ai-hooks@^0.4.0
# or
npm install vue-ai-hooks@^0.4.0
```

Then run your app's type checks and tests. For this repository, the publishing
gate is:

```bash
pnpm release:check
```

## What changed

### Chat instances

Create a reusable `Chat` instance when multiple components should share one
conversation controller:

```ts
import { Chat, useChat } from 'vue-ai-hooks'

export const supportChat = new Chat({
  id: 'support-thread',
  api: '/api/chat',
  credentials: 'include'
})

export function useSupportChat() {
  return useChat({ chat: supportChat })
}
```

When `chat` is provided, `useChat()` returns that instance and ignores the other
options in the call. Put provider, transport, persistence, callbacks, and id
configuration on `new Chat(...)`.

### Video generation

`useVideo` adds the same app-owned route pattern already used by image, speech,
transcription, rerank, and object composables:

```ts
const { video, videos, input, handleSubmit, stop, clear, lastRequest } = useVideo({
  api: '/api/video',
  defaultRequest: {
    model: 'video-model',
    aspectRatio: '16:9',
    resolution: '1280x720',
    duration: 6
  }
})
```

Run the no-key demo with:

```bash
pnpm example:video
```

It renders a deterministic local storyboard by default and switches to your
proxy route when `VITE_PROXY_BASE_URL` is configured.

### UI message stream utilities

v0.4.0 exposes Fetch-compatible helpers for AI SDK UI message stream routes:

```ts
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  readUIMessageStream
} from 'vue-ai-hooks'
```

Use them when your backend wants to emit UI stream parts while Vue components
continue to consume normalized chat chunks. The runnable proxy route is
available at `/api/ui-message-stream`:

```bash
pnpm example:proxy-server
```

### Transport migration

`DefaultChatTransport` and `DirectChatTransport` now cover the common AI SDK
migration paths:

- Use `DefaultChatTransport` when the browser should call your `/api/chat`
  route.
- Use `DirectChatTransport` when tests, no-key demos, or local agents should run
  in process without HTTP.
- Use `DirectChatTransport({ onError })` to sanitize local UI-message stream
  errors before they reach UI state.

### Model message conversion

`convertToModelMessages()` has more control for production chat history:

- `convertDataPart` can opt custom `data-*` UI parts into model-facing content.
- `ignoreIncompleteToolCalls` skips pending or approval-gated tool calls that do
  not yet have tool results.
- Tool definitions can provide `toModelOutput` to convert stored tool results
  before they are sent back to a model.
- `stepCountIs()` is available as an AI SDK-compatible alias for
  `isStepCount()`.

### Persisted message validation

Use `validateMessages()`, `safeValidateMessages()`, `validateUIMessages()`, and
`safeValidateUIMessages()` before hydrating imported or backend-restored chat
history. They are useful when persisted messages contain structured parts,
metadata, or custom data schemas.

## Recommended migration order

1. Upgrade the package and run type checks.
2. Keep existing v0.3.x chat and provider paths working first.
3. Move shared chat state to `new Chat(...)` only where multiple components need
   one controller.
4. Add `useVideo` only for app-owned video routes; keep direct provider keys on
   the server side.
5. Use `/api/ui-message-stream` locally to validate backend stream contracts
   before replacing it with your production route.
6. Review `convertToModelMessages()` options if you persist tool calls or custom
   `data-*` parts.
7. Run `pnpm release:check` before publishing or cutting an app release.

## When to stay on 0.3.x temporarily

Stay on 0.3.x only if your app cannot yet validate shared `Chat` instance usage,
or if your backend stream format needs more time to adopt UI message stream
parts. You can still validate the new contracts without provider credentials:

```bash
pnpm example:chat
pnpm example:video
pnpm example:proxy-server
```
