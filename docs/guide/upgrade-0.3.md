# Upgrade to v0.3.0

This guide is for apps currently on `vue-ai-hooks@0.2.1` that want the v0.3.0
release line.

## Compatibility

v0.3.0 does not intentionally remove or rename documented public exports from
v0.2.1. Existing `useChat`, `useCompletion`, `useEmbedding`, `useObject`,
provider, and proxy code should continue to compile.

Upgrade the package:

```bash
pnpm add vue-ai-hooks@^0.3.0
# or
npm install vue-ai-hooks@^0.3.0
```

Then run your app's type checks and tests. For this repository, the publishing
gate is:

```bash
pnpm release:check
```

## What changed

### Default proxy transports

You can omit `provider` and call your own backend routes directly:

```ts
const chat = useChat({ api: '/api/chat', credentials: 'include' })
const completion = useCompletion({ api: '/api/completion' })
const embedding = useEmbedding({ api: '/api/embedding' })
const object = useObject({ api: '/api/object', schema })
```

This is the recommended production browser path because upstream provider keys
stay server-side.

### Request inspection

All main composables now expose `lastRequest`, `lastResponse`, and
`clearTrace()` so you can build debug panels without wrapping every provider:

```ts
const { lastRequest, lastResponse, clearTrace } = useChat({ api: '/api/chat' })
```

### Provider fallback

Use `fallbackProvider()` when you want a secondary provider before a stream has
started:

```ts
const provider = fallbackProvider({
  providers: [
    deepseek({ apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY }),
    openrouter({ apiKey: import.meta.env.VITE_OPENROUTER_API_KEY })
  ]
})
```

Fallback stops once a stream has yielded content, so a single UI response cannot
mix chunks from different providers.

### Direct provider timeouts

Direct OpenAI-compatible, OpenRouter, Gemini, DeepSeek, and Anthropic providers
support `timeoutMs`:

```ts
const provider = deepseek({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
  timeoutMs: 30_000
})
```

### DeepSeek helper

Use the first-class DeepSeek helper instead of hand-writing a generic
OpenAI-compatible config:

```ts
const provider = deepseek({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY
})
```

It defaults to `https://api.deepseek.com` and `deepseek-v4-flash`.

### Chat UX helpers

v0.3.0 adds AI SDK-style helpers around the existing Vue state model:

- `sendMessage()` for message submission.
- `addToolOutput()` and `addToolApprovalResponse()` for tool result flows.
- `resumeStream()` for resumable proxy streams.
- `prepareStep`, `stopWhen`, `sendAutomaticallyWhen`, and tool approval
  predicates for multi-step chat loops.
- `messages` as an alias for `initialMessages`.

### Stream data and message parts

Proxy streams can now carry structured `Message.parts`, `streamData`, metadata,
source/file parts, and AI SDK UI message stream parts. Existing plain-text
messages still work.

## Recommended migration order

1. Upgrade the package and run type checks.
2. Keep existing provider calls working first.
3. Move browser production calls to default proxy transports or `proxyProvider`.
4. Add `lastRequest` / `lastResponse` to your internal debug view.
5. Add `timeoutMs` for direct provider experiments.
6. Replace generic DeepSeek configs with `deepseek()`.

## When to stay on 0.2.1 temporarily

Stay on 0.2.1 only if your release process cannot yet accept new public exports
or if you need to validate your backend proxy contract first. For that proxy
check, run the local template:

```bash
pnpm example:proxy-server
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```
