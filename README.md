# vue-ai-hooks

[English](./README.md) | [简体中文](./README.zh-CN.md)

> Vue 3 Composable library for building AI-powered applications.
> Streaming-first, multi-provider, fully typed, with optional React chat,
> completion, and object entries.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/hexinmiao96/vue-ai-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/hexinmiao96/vue-ai-hooks/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/vue-ai-hooks.svg)](https://www.npmjs.com/package/vue-ai-hooks)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/vue-ai-hooks)](https://bundlephobia.com/package/vue-ai-hooks)
[![Vue 3](https://img.shields.io/badge/vue-3.4+-42b883.svg)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6.svg)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CONTRIBUTING.md)

`vue-ai-hooks` brings the same DX you'd expect from [VueUse](https://vueuse.org) or
[Axios](https://axios-http.com) to the LLM world. Ten Vue composables, an optional
React `useChat` / `useCompletion` / `useObject` subpath, pluggable providers,
Server-Sent Events streaming handled for you. Works with OpenAI and any
OpenAI-compatible service (DeepSeek, Moonshot, Zhipu, Ollama via its OpenAI shim,
vLLM, Gemini's OpenAI-compatible endpoint, etc.).

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, handleSubmit, isLoading, stop } = useChat({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
```

## Why

The AI-in-Vue story is currently fragmented. Options today:

| Library                       | Tradeoff                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------- |
| **Vercel AI SDK**             | Broad full-stack SDK; larger surface area than a focused Vue composable layer |
| **CopilotKit**                | Higher-level copilot UI and agent integration; more product opinion           |
| **LangChain.js**              | Powerful but heavy; opinionated chains, lots of magic                         |
| **VueUse**                    | Excellent Vue utility layer, but not an AI request lifecycle SDK              |
| **Direct fetch + manual SSE** | Works, but you re-implement aborts, retries, and state for every project      |
| **vue-ai-hooks**              | A focused, framework-native SDK with the boring parts done                    |

## Features

- **Ten composables, one mental model**: `useChat`, `useCompletion`,
  `useEmbedding`, `useGeneration`, `useImage`, `useVideo`, `useSpeech`,
  `useTranscription`, `useRerank`, and `useObject`.
- **Optional React chat, completion, and object support**: import `useChat`,
  `useCompletion`, or `useObject` from `vue-ai-hooks/react` for React streaming
  state while reusing the same providers and request types.
- **Streaming-first Vue state**: SSE parsing, AbortController, throttling,
  retries, lifecycle callbacks, shared state by id, and consistent
  `status`/`error` controls.
- **Provider and proxy coverage**: OpenAI, Gemini, OpenRouter, Anthropic,
  backend proxy, Azure OpenAI, DeepSeek, Moonshot, Zhipu, Ollama, vLLM, and
  OpenAI-compatible APIs.
- **Production chat workflows**: server-side proxy paths, resumable streams,
  thread context, request preparation hooks, custom body fields, metadata, and
  request tracing.
- **Thread persistence**: `useChatThreads` manages local thread indexes,
  current thread selection, rename, archive, restore, delete, and Date-safe
  thread persistence.
- **AI SDK-style UI and agent helpers**: `sendMessage`, tool output/approval aliases,
  file attachments, structured `Message.parts`, custom stream data, and message
  pruning, reusable `Chat` instances, `DefaultChatTransport`,
  `DirectChatTransport`, reusable UI stream decoding utilities, and lightweight
  `AgentEvent` adapters for app-owned agent streams.
- **Tool calling controls**: `tool()`/`dynamicTool()` helpers, local handlers,
  approval gates, active tool filtering, stop conditions, and per-step request
  preparation.
- **Typed output and generation**: JSON Schema object output, embedding vectors,
  app-owned image, video, speech, transcription, and rerank routes, custom generation
  jobs, deterministic ids, and Date-safe persistence helpers.
- **Library quality**: strict TypeScript, no runtime dependencies beyond Vue,
  tree-shakable ESM/CJS builds, and Vitest coverage.

## Installation

```bash
pnpm add vue-ai-hooks
# or
npm install vue-ai-hooks
# or
yarn add vue-ai-hooks
```

Peer dependencies: `vue@^3.4.0` for the root Vue entry. `react@^18.2.0 || ^19.0.0`
is optional and only needed when importing from `vue-ai-hooks/react`.

## Runtime requirements

- Vue 3.4 or newer.
- React 18.2 or newer only for the optional `vue-ai-hooks/react` entry.
- Modern browser APIs for client-side usage: `fetch`, `AbortController`,
  `ReadableStream`, and Server-Sent Events.
- Node.js 18.18 or newer for development, tests, examples, and docs builds.

Older browsers or constrained runtimes should provide compatible polyfills or
call provider APIs through a backend or edge proxy. For server rendering notes,
see the [SSR and Nuxt guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/ssr.md).

## Security note

Any `VITE_*` key in a browser app is visible to users. The examples are fine for
local demos, prototypes, or tightly restricted provider keys, but production apps
should call your own backend or edge proxy and keep upstream API keys server-side.

To report a vulnerability, follow the process in [`SECURITY.md`](./SECURITY.md).

## Quick start

### Streaming chat

```vue
<script setup lang="ts">
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, handleSubmit, isLoading, stop, error } = useChat({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
</script>

<template>
  <div v-for="m in messages" :key="m.id" :class="m.role">
    {{ m.content }}
  </div>
  <form @submit="handleSubmit">
    <textarea v-model="input" />
    <button :disabled="isLoading || !input.trim()">Send</button>
    <button type="button" :disabled="!isLoading" @click="stop">Stop</button>
  </form>
</template>
```

### React streaming chat

```tsx
import { useChat, useCompletion, useObject } from 'vue-ai-hooks/react'
import { openai } from 'vue-ai-hooks'

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, error } = useChat({
    provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
  })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((message) => (
        <p key={message.id}>{typeof message.content === 'string' ? message.content : ''}</p>
      ))}
      <textarea value={input} onChange={handleInputChange} />
      <button disabled={isLoading || !input.trim()}>Send</button>
      <button type="button" disabled={!isLoading} onClick={stop}>
        Stop
      </button>
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

`vue-ai-hooks/react` also exposes React `useCompletion`:

```tsx
const { completion, input, handleInputChange, handleSubmit, isLoading } = useCompletion({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
```

For structured JSON in React, use `useObject` with the same provider contract:

```tsx
const { object, partialObject, input, handleInputChange, handleSubmit } = useObject<{
  title: string
  priority: 'low' | 'high'
}>({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY }),
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'high'] }
    },
    required: ['title', 'priority']
  }
})
```

### Single-shot completion

```ts
import { useCompletion, openai } from 'vue-ai-hooks'

const { completion, complete } = useCompletion({
  provider: openai({ apiKey: '...' })
})

await complete('Write a haiku about TypeScript:')
```

### Embeddings

```ts
import { cosineSimilarity, useEmbedding, openai } from 'vue-ai-hooks'

const { embed, embeddings } = useEmbedding({
  provider: openai({ apiKey: '...' })
})

const result = await embed(['hello world', 'goodbye world'])
console.log(result.embeddings) // number[][]
console.log(cosineSimilarity(result.embeddings[0], result.embeddings[1]))
```

### Reranking

```ts
import { useRerank } from 'vue-ai-hooks'

const { rerankedDocuments, rerankDocuments } = useRerank<string>({
  api: '/api/rerank'
})

await rerankDocuments('Vue AI search', [
  'Streaming chat state for Vue apps',
  'Document reranking for search',
  'Text-to-speech release notes'
])

console.log(rerankedDocuments.value)
```

### Image generation

```ts
import { useImage } from 'vue-ai-hooks'

const { image, generateImage } = useImage({
  api: '/api/image'
})

await generateImage('A Vue workspace hero image', {
  size: '1024x1024'
})
console.log(image.value?.url)
```

### Video generation

```ts
import { useVideo } from 'vue-ai-hooks'

const { video, generateVideo } = useVideo({
  api: '/api/video'
})

await generateVideo('A concise Vue product walkthrough video', {
  aspectRatio: '16:9',
  resolution: '1280x720',
  duration: 6
})
console.log(video.value?.url)
```

### Speech generation

```ts
import { useSpeech } from 'vue-ai-hooks'

const { audio, generateSpeech } = useSpeech({
  api: '/api/speech'
})

await generateSpeech('Read this release note aloud.', {
  voice: 'alloy',
  outputFormat: 'mp3'
})
console.log(audio.value?.url)
```

### Audio transcription

```ts
import { useTranscription } from 'vue-ai-hooks'

const { transcription, transcribeAudio } = useTranscription({
  api: '/api/transcription'
})

await transcribeAudio('data:audio/wav;base64,...', {
  language: 'en'
})
console.log(transcription.value)
```

### Structured object output

```ts
import { useObject, openai } from 'vue-ai-hooks'

const { object, partialObject, submit } = useObject<{ title: string; priority: 'low' | 'high' }>({
  provider: openai({ apiKey: '...' }),
  schemaName: 'ticket',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'high'] }
    },
    required: ['title', 'priority'],
    additionalProperties: false
  }
})

await submit('Extract a support ticket from this message.')
console.log(partialObject.value?.title)
console.log(object.value)
```

### Custom generation task

```ts
import { useGeneration } from 'vue-ai-hooks'

const { result, progress, generate } = useGeneration<string, { url: string }, number>({
  async fetcher(prompt, context) {
    context.reportProgress(50)
    const response = await fetch('/api/image', {
      method: 'POST',
      signal: context.signal,
      body: JSON.stringify({ prompt })
    })
    return (await response.json()) as { url: string }
  }
})

await generate('A Vue workspace hero image')
console.log(progress.value, result.value?.url)
```

## Using a non-OpenAI provider

Every provider implements the same `ChatProvider` interface, so the hooks
don't care which model is on the other end:

```ts
import { useChat, deepseek } from 'vue-ai-hooks'

useChat({
  provider: deepseek({
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY
  })
})
```

OpenAI-compatible presets are available for common local and hosted routes:

```ts
import { moonshot, ollama, vllm, zhipu } from 'vue-ai-hooks'

moonshot({ apiKey: import.meta.env.VITE_MOONSHOT_API_KEY, defaultModel: 'kimi-k2' })
zhipu({ apiKey: import.meta.env.VITE_ZHIPU_API_KEY, endpoint: 'bigmodel' })
ollama({ defaultModel: 'qwen3:8b' })
vllm({ defaultModel: 'served-model' })
```

Use `openaiCompatible` directly for unlisted OpenAI-compatible gateways.

For OpenRouter specifically, the dedicated helper is shorter:

```ts
import { useChat, openrouter } from 'vue-ai-hooks'

useChat({
  provider: openrouter({
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
    siteUrl: 'https://your-app.example.com',
    appName: 'My App'
  })
})
```

Gemini also has a dedicated helper for Google's OpenAI-compatible endpoint:

```ts
import { useChat, gemini } from 'vue-ai-hooks'

useChat({
  provider: gemini({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY
  })
})
```

For production browser apps, use your own backend or edge routes:

```ts
import { useChat, proxyProvider } from 'vue-ai-hooks'

useChat({
  provider: proxyProvider({
    chatUrl: '/api/ai/chat',
    headers: () => ({ Authorization: `Bearer ${getSessionToken()}` }),
    credentials: 'include'
  })
})
```

Add a new provider in one file by implementing `ChatProvider`:

```ts
// src/providers/anthropic.ts
import type { ChatProvider } from 'vue-ai-hooks'
// ... implement chat / completion / embedding
```

Then open a PR — the hook layer stays untouched.

## API reference

### `useChat(options)`

Returns a reactive bundle for managing a streaming chat conversation.

| Return                          | Type                                                                                           | Description                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `id`                            | `Ref<string>`                                                                                  | Stable chat id sent with provider requests                        |
| `messages`                      | `Ref<Message[]>`                                                                               | Full message history (user, assistant, system, tool)              |
| `input`                         | `Ref<string>`                                                                                  | Bound to your composer; `handleSubmit()` clears it                |
| `status`                        | `Ref<ChatStatus>`                                                                              | `ready`, `submitted`, `streaming`, or `error`                     |
| `usage`                         | `Ref<TokenUsage \| null>`                                                                      | Latest normalized token usage                                     |
| `data`                          | `Ref<StreamDataPart<TData>[]>`                                                                 | AI SDK-style alias for custom stream data                         |
| `streamData`                    | `Ref<StreamDataPart<TData>[]>`                                                                 | Custom stream data from the current assistant turn                |
| `pendingToolCalls`              | `Ref<ToolCall[]>`                                                                              | Tool calls waiting for manual results                             |
| `isLoading`                     | `Ref<boolean>`                                                                                 | True while a stream is in flight                                  |
| `error`                         | `Ref<Error \| null>`                                                                           | Last error, cleared on next `append`                              |
| `lastRequest`                   | `Ref<ChatRequestInfo \| null>`                                                                 | Last prepared provider request snapshot                           |
| `lastResponse`                  | `Ref<ChatResponseInfo \| null>`                                                                | Last provider response snapshot                                   |
| `append(content, opts?)`        | `(string \| Message, AppendChatOptions) => Promise<void>`                                      | Send or replace a message and stream the reply                    |
| `sendMessage(content?, opts?)`  | `(string \| Message \| SendChatMessageInput \| undefined, AppendChatOptions) => Promise<void>` | AI SDK-style send helper; omit content to submit current messages |
| `addToolResult(input, opts?)`   | `(string, unknown, Partial<ChatRequest>) \| (AddToolResultOptions, Partial<ChatRequest>)`      | Submit a manual tool result and continue when ready               |
| `addToolOutput(output)`         | `(AddToolOutputOptions, Partial<ChatRequest>) => Promise<void>`                                | AI SDK-style alias for manual tool output                         |
| `addToolApprovalResponse(resp)` | `(ToolApprovalResponse, Partial<ChatRequest>) => Promise<void>`                                | AI SDK-style approval response helper                             |
| `approveToolCall(id)`           | `(string, Partial<ChatRequest>) => Promise<void>`                                              | Run an approval-gated local tool handler                          |
| `rejectToolCall(id)`            | `(string, unknown, Partial<ChatRequest>) => Promise<void>`                                     | Reject a pending tool call and continue when ready                |
| `regenerate(opts?)`             | `(RegenerateChatOptions) => Promise<void>`                                                     | Regenerate the latest or a specific assistant turn                |
| `resumeStream(opts?)`           | `(ResumeChatOptions) => Promise<void>`                                                         | Resume an active provider/backend stream                          |
| `reload()`                      | `() => Promise<void>`                                                                          | Re-run the last assistant turn                                    |
| `stop()`                        | `() => void`                                                                                   | Abort the in-flight stream                                        |
| `setId(id)`                     | `(string) => void`                                                                             | Replace the chat id for future requests                           |
| `setInput(value)`               | `(string) => void`                                                                             | Replace composer input manually                                   |
| `handleInputChange(event)`      | `(Event \| { target } \| string) => void`                                                      | Wire custom inputs without `v-model`                              |
| `handleSubmit(event, opts?)`    | `(Event?, AppendChatOptions?) => Promise<void>`                                                | Wire a form submit; clears input after success                    |
| `setMessages(messages)`         | `(SetMessagesInput) => void`                                                                   | Replace or functionally update history                            |
| `setData(data)`                 | `(SetDataInput<TData>) => void`                                                                | Replace or functionally update custom stream data                 |
| `clearError()`                  | `() => void`                                                                                   | Clear error state                                                 |
| `clearTrace()`                  | `() => void`                                                                                   | Clear `lastRequest` and `lastResponse`                            |
| `clear()`                       | `() => void`                                                                                   | Reset to empty state                                              |
| `abortController`               | `Ref<AbortController \| null>`                                                                 | Exposed for advanced use cases                                    |

Set `maxRetries` on `useChat`, `useCompletion`, `useEmbedding`, `useImage`,
`useVideo`, `useSpeech`, `useTranscription`, `useRerank`, or `useObject` to retry transient
provider or backend failures. Streaming calls only retry when the failure happens
before the first chunk arrives, so partial text is never duplicated.

Use `body` in `defaultRequest` or per-call request options to pass
provider-specific JSON fields through OpenAI-compatible, Anthropic, or proxy
requests. Explicit typed fields still win on conflicts.

Use `prepareSendMessagesRequest` or `prepareReconnectToStreamRequest` when a
proxy-backed app needs tenant headers, trace metadata, or backend-only body
fields after the final chat id, messages, proxy `api`, credentials, and request
metadata are known.
Use `prepareStep` when automatic tool loops need request changes per assistant
step, such as narrowing `activeTools` after a tool result arrives.
Use `stepCountIs()` or `hasToolCall()` with `stopWhen` to port AI SDK-style tool
loop limits without changing the underlying Vue state model.
Use `threadId` and `forwardedProps` when an agent backend needs a server thread
identifier plus app context without changing the client-side shared chat id.
Use `context` when browser-local tool handlers need stores, services, or session
state that should not be serialized.
Use `tool()`, `dynamicTool()`, and `jsonSchema()` when you want AI SDK-style
tool definitions inside `useChat({ tools })`; provider requests still receive
the normalized OpenAI-compatible `Tool[]`.

Set `throttleMs` on `useChat`, `useCompletion`, or `useObject` to batch reactive
stream updates for busy UIs. The final stream state is always flushed before the
request resolves. `experimental_throttle` is accepted as an AI SDK-compatible
alias, but new code should prefer `throttleMs`.
`useCompletion({ streamProtocol: 'text' })` is available for app-owned proxy
routes that return plain text streams. `useChat({ streamProtocol: 'text' })`
does the same for existing chat endpoints that stream raw text.

`useChat` keeps the final assistant message as the first `onFinish` argument and
also passes `ChatFinishInfo` with the message snapshot, abort/error/disconnect
flags, and finish reason.

Pass `generateId` to `useChat`, `useCompletion`, `useGeneration`, or
`useObject` when you need deterministic IDs for SSR, persistence, tests, or
backend trace correlation. Use `createIdGenerator()` when AI SDK-style random
IDs are enough. Explicit `id` and `messageId` values still take priority over
generated IDs.
Proxy streams can also send `ChatChunk.messageId` or AI SDK UI stream
`start.messageId` to replace the current assistant id with the server's id.

Passing the same `id` to multiple `useChat()` calls shares chat state across
components. The first instance seeds `initialMessages` and `initialInput`;
`messages` is accepted as an AI SDK-style alias for `initialMessages`. `setId()`
only changes the id sent with future provider requests.
When a component tree should share one explicit controller object, create
`new Chat({ ... })` and pass it to `useChat({ chat })`; the instance owns the
provider, persistence, callbacks, messages, and status, and other `useChat`
options are ignored.

Use `pruneMessages()` inside `prepareSendMessagesRequest` when long chats should
send only recent context, system prompts, and current or selected tool details to
a provider. Use `convertToModelMessages()` after pruning when a proxy route or
provider adapter should receive model-facing messages without UI-only
`Message.parts`; pass `convertDataPart` when selected custom `data-*` parts
should become model-readable context, and `ignoreIncompleteToolCalls` when
approval-gated tool calls should be skipped until results arrive. Pass `tools`
when tool definitions include `toModelOutput` for model-facing tool results.
`ChatRequest.messages` accepts those `ChatRequestMessage[]` payloads directly.

Use `createUIMessageStream()` when an app-owned route should produce AI SDK UI
message stream parts over time. Use `createUIMessageStreamResponse()` or
`pipeUIMessageStreamToResponse()` to emit those parts, and
`DirectChatTransport` when an in-process agent, demo, or test harness should
consume them without an HTTP proxy. `readUIMessageStream()` remains available
for lower-level custom transports outside `proxyProvider`.
`DirectChatTransport({ onError })` can sanitize local agent failures before they
reach the UI message stream.
`createUIMessageStreamParser()`, `toChatChunks()`, `formatSSEData()`, and `parseSSE()` are exported for
already-parsed parts or custom SSE readers.

### `useCompletion(options)` / `useEmbedding(options)` / `useGeneration(options)` / `useImage(options)` / `useVideo(options)` / `useSpeech(options)` / `useTranscription(options)` / `useRerank(options)` / `useObject(options)`

Same shape, scoped to single-shot completions, embedding vectors, custom
generation jobs, app-owned image generation routes, app-owned video generation
routes, app-owned speech generation routes, app-owned transcription routes,
app-owned rerank routes, and structured JSON object output respectively.

These composables also expose `status`, `isLoading`, `error`, `clearError()`,
`lastRequest`, `lastResponse`, `clearTrace()`, `stop()`, and `clear()` so UI
state and trace panels can follow one pattern across chat, text, vectors, custom
generation jobs, image generation, video generation, speech generation,
transcription, reranking, and structured JSON. Default proxy traces include the resolved proxy `api` and
browser credentials mode.
Use `inspectRequestTrace()` to turn those refs into a production debug snapshot
with timeline events, normalized retry records, a compact provider trace, and an
opt-in redacted `curl` command for support handoff.

`useObject` supports `id` for shared structured-output state across components
and `initialValue` for seeding the first partial object. Default proxy object
routes may return either chat chunks or `text/plain` JSON streams.
`experimental_useObject` is also exported as an AI SDK-compatible alias for the
same composable.
Its `onFinish` callback keeps the parsed object as the first argument and passes
`ObjectFinishInfo` with the final object, raw JSON text, abort status, and error
field.

`useGeneration` accepts a custom `fetcher` and provides typed `result`,
`progress`, `chunks`, `stop()`, `reset()`, lifecycle callbacks, and retries before
visible output.

`useImage` targets your own `/api/image` route and provides `image`, `images`,
`result`, `generateImage()`, lifecycle trace refs, aborts, retries, and form
helpers while keeping provider credentials server-side.

`useVideo` targets your own `/api/video` route and provides `video`, `videos`,
`result`, `generateVideo()`, lifecycle trace refs, aborts, retries, and form
helpers while keeping video model credentials server-side.

`useSpeech` targets your own `/api/speech` route and provides `audio`, `result`,
`generateSpeech()`, `speak()`, lifecycle trace refs, aborts, retries, and form
helpers while keeping text-to-speech credentials server-side.

`useTranscription` targets your own `/api/transcription` route and provides
`transcription`, `text`, `result`, `transcribeAudio()`, lifecycle trace refs,
aborts, retries, and form helpers while keeping transcription credentials
server-side.

`useRerank` targets your own `/api/rerank` route and provides `documents`,
`ranking`, `rerankedDocuments`, `rerankDocuments()`, lifecycle trace refs,
aborts, retries, and form helpers while keeping rerank credentials server-side.

`useChat`, `useCompletion`, `useEmbedding`, `useImage`, `useVideo`,
`useSpeech`, `useTranscription`, `useRerank`, and `useObject` also expose `setInput()`,
`handleInputChange()`, and `handleSubmit()` for simple form wiring. Successful
form submissions clear `input`; failed submissions leave it intact. All ten
accept `initialInput`.

`useCompletion`'s `onFinish` callback keeps the final text as the first argument
and passes the original prompt plus abort status through `CompletionFinishInfo`.

Passing the same `id` to multiple `useCompletion()` calls shares completion
state across components. Omit `id` for independent generated state.

### `usePersist(source, options)`

Persists any Vue `Ref` to `localStorage`, with optional versioning and custom
serialization. `useChat({ persist })` uses Date-safe message serialization
internally, and the exported `serializeMessages()` / `deserializeMessages()` /
`validateMessages()` / `safeValidateMessages()` / `validateUIMessages()` helpers
also preserve and check valid `Message.parts`, metadata schemas, and custom data
part schemas for structured chat rendering. `onLoadError` and `onClearError`
make storage restore and cleanup failures observable. See the
[usePersist reference](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/use-persist.md) for details.

### `useChatThreads(options)`

Manages a lightweight thread index for chat sidebars: active thread selection,
rename, archive, restore, delete, recency updates, and Date-safe persistence.
`persistenceError` reports the last thread-index storage failure without
including thread payloads or message bodies.
Keep message bodies separate with `useChat({ id: thread.id, persist })` or your
server storage. See the
[useChatThreads reference](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/use-chat-threads.md)
for details.

See the [reference docs](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/use-chat.md), [provider reference](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/providers.md),
and [public types](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/types.md) for full type definitions.
For a product-task path through the demos, see
[Task-oriented demos](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/task-demos.md).
For library fit, see [Choosing vue-ai-hooks](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/choosing.md).
For upgrade guarantees, see the [API stability guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/api-stability.md).
For the current release line, use the
[v0.4.0 upgrade guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/upgrade-0.4.md).
If you are coming from `0.2.1`, read the
[v0.3.0 upgrade guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/upgrade-0.3.md).
If you are porting an AI SDK UI surface, use the
[AI SDK migration guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/ai-sdk-migration.md).
If you are connecting an app-owned agent service, use the
[Agent events guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/agent-events.md).
For LangChain, LangGraph, or custom backend agent runtimes, use the
[Agent bridge recipe](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/agent-bridge.md).
For durable human approval around privileged tools, use the
[Tool approval recipe](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/tool-approvals.md).
For copyable backend proxy environment recipes, use
[Proxy recipes](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/proxy-recipes.md).
For retry or compare-answer UI on stored threads, use the
[Regenerate branches recipe](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/regenerate-branches.md).
Before production rollout, use the
[Production checklist](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/production-checklist.md).
Use `pnpm production:readiness` as a one-line pre-release gate. If your environment
blocks pnpm execution wrappers, use either `pnpm production:readiness:local` or
`node scripts/production-readiness-local.mjs`.

## Examples

Fifteen runnable examples live in [`examples/`](https://github.com/hexinmiao96/vue-ai-hooks/tree/main/examples):

- `examples/chat` — streaming chat UI with provider switching, structured `Message.parts`, and a local tool approval demo
- `examples/threaded-chat` — no-key threaded chat demo with `useChatThreads`, per-thread `useChat({ persist })`, and local restore checks
- `examples/react-chat` — no-key React chat quickstart with `vue-ai-hooks/react`, `DirectChatTransport`, and request trace state
- `examples/react-completion` — no-key React completion quickstart with `useCompletion` and trace state
- `examples/react-object` — no-key React structured output quickstart with `useObject` and trace state
- `examples/proxy-server` — local backend proxy template for the default `/api/*` routes, the explicit `/api/ai/*` contract, and a UI message stream route
- `examples/completion` — single-shot completion form
- `examples/embedding` — pairwise cosine similarity heatmap
- `examples/image` — no-key image generation form with a deterministic local SVG fallback
- `examples/video` — no-key video generation form with a deterministic local storyboard fallback
- `examples/speech` — no-key speech generation form with a deterministic local WAV fallback
- `examples/transcription` — no-key audio transcription form with a deterministic local transcript
- `examples/rerank` — no-key document reranking form with deterministic local ranking
- `examples/object` — no-key structured JSON extraction demo with a local object provider
- `examples/ui-message-stream` — no-key AI SDK UI stream migration demo that reads chunks with `readUIMessageStream()` and validates decoded chunk shapes

To run them:

```bash
pnpm install
cp .env.example .env
pnpm example:chat
pnpm example:threaded-chat
pnpm example:react-chat
pnpm example:react-completion
pnpm example:react-object
```

`examples/chat` defaults to the no-key `local-tools` provider backed by
`DirectChatTransport` unless you select a provider or configure a real
`VITE_OPENAI_KEY`.

`examples/threaded-chat` uses `useChatThreads()` for the sidebar and a keyed
`useChat({ persist })` instance per active thread, so you can create, rename,
archive, restore, delete, refresh, and verify message restore without provider
keys.

`examples/react-chat` uses the same no-key transport pattern through
`vue-ai-hooks/react`, so React consumers can verify streaming state, `stop()`,
`lastRequest`, `lastResponse`, usage, and stream data before wiring a real
`/api/chat` route.

`examples/react-completion` reuses `useCompletion` in the same production-safe
shape, with an optional proxy path via `VITE_EXAMPLE_PROVIDER=proxy` and shared
`/api/completion` checks.

`examples/react-object` mirrors `useObject` production wiring for JSON Schema
outputs, including a local object baseline and an optional `/api/object` proxy route.

To run the browser chat example through the local proxy template:

```bash
pnpm example:proxy-server
# in another terminal
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

Use `VITE_CHAT_PROVIDER=proxy` if you intentionally need to test the explicit
`/api/ai/*` `proxyProvider` contract directly.

To connect the same template to a real OpenAI-compatible upstream, set
`PROXY_UPSTREAM_BASE_URL`, `PROXY_UPSTREAM_API_KEY`, `PROXY_UPSTREAM_MODEL`,
`PROXY_UPSTREAM_TIMEOUT_MS`, and `PROXY_UPSTREAM_TRACE_HEADER` on the Node
process. The template keeps those values server-side, normalizes chat,
completion, and embedding responses back to the browser contract, and returns
sanitized retryable errors with trace ids instead of raw upstream error bodies.

The same proxy template also accepts `useChat({ baseURL })`,
`useCompletion({ baseURL })`, `useEmbedding({ baseURL })`, and
`useImage({ baseURL })`, `useVideo({ baseURL })`, `useSpeech({ baseURL })`,
`useTranscription({ baseURL })`, `useRerank({ baseURL })`, and
`useObject({ baseURL, schema })` through `/api/chat`, `/api/completion`,
`/api/embedding`, `/api/image`, `/api/video`, `/api/speech`, `/api/transcription`,
`/api/rerank`, and `/api/object`. It also exposes `/api/ui-message-stream` for
checking AI SDK UI message stream parts with `readUIMessageStream()`.
Provider, proxy, and per-request headers
accept `HeadersInit`, so records, `Headers` instances, and `[key, value][]`
entries all work.

For deterministic component and composable tests without live provider calls, see
the [testing guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/testing.md).

## Project status

This is **v0.14.0** — a working foundation, not feature-complete. The core
surface covers the main composables, provider/proxy adapters, tool flows,
persistence, retries, stream data, metadata, shared state, and quality gates.
This release adds `useChatThreads` for local thread indexes, active thread
selection, rename, archive, restore, delete, recency updates, and Date-safe
thread persistence. Current follow-up work is focused on production agent bridge
recipes, approval decision contracts, regenerate/branch workflows, and the
[server storage recipe](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/server-storage.md)
for tenant-scoped thread indexes, message bodies, and app-owned storage adapter
contracts, with regenerate/branch conflict handling for `revision`, `runId`, and
restore smoke tests, plus approval replay/conflict checks. Feature planning lives in
[ROADMAP.md](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/ROADMAP.md);
GitHub issues are reserved for reproducible bugs.

## Known limitations

- Browser examples expose `VITE_*` values by design; production apps should proxy
  provider requests through a backend or edge runtime.
- Tool calling helpers execute local handlers, but sandboxing and permission
  prompts are application responsibilities.
- Provider adapters cover common API shapes; provider-specific retries, rate
  limits, and observability should be handled by the host app when needed.

## Contributing

Contributions are very welcome. See [`CONTRIBUTING.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CONTRIBUTING.md) for
the workflow, read the [`CODE_OF_CONDUCT.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CODE_OF_CONDUCT.md), and check the
[open bug issues](https://github.com/hexinmiao96/vue-ai-hooks/issues?q=is%3Aissue%20is%3Aopen%20label%3Abug)
for reproducible defects that need hands.

For usage questions, feature ideas, or support channels, see [`SUPPORT.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/SUPPORT.md).

## License

[MIT](./LICENSE)
