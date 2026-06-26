# vue-ai-hooks

[English](./README.md) | [简体中文](./README.zh-CN.md)

> Vue 3 Composable library for building AI-powered applications.
> Streaming-first, multi-provider, fully typed.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/hexinmiao96/vue-ai-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/hexinmiao96/vue-ai-hooks/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/vue-ai-hooks.svg)](https://www.npmjs.com/package/vue-ai-hooks)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/vue-ai-hooks)](https://bundlephobia.com/package/vue-ai-hooks)
[![Vue 3](https://img.shields.io/badge/vue-3.4+-42b883.svg)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6.svg)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CONTRIBUTING.md)

`vue-ai-hooks` brings the same DX you'd expect from [VueUse](https://vueuse.org) or
[Axios](https://axios-http.com) to the LLM world. Four composables, pluggable
providers, Server-Sent Events streaming handled for you. Works with OpenAI and any
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
| **LangChain.js**              | Powerful but heavy; opinionated chains, lots of magic                         |
| **Direct fetch + manual SSE** | Works, but you re-implement aborts, retries, and state for every project      |
| **vue-ai-hooks**              | A focused, framework-native SDK with the boring parts done                    |

## Features

- 🎯 **Four composables, one mental model** — `useChat`, `useCompletion`, `useEmbedding`, `useObject`
- 🌊 **Streaming by default** — SSE parsing, AbortController, and reactivity handled for you
- 🔌 **Multi-provider** — OpenAI, Gemini, OpenRouter, Anthropic, backend proxy, Azure OpenAI, DeepSeek, Moonshot, Zhipu, Ollama, vLLM, any OpenAI-compatible API
- 🔐 **Production proxy path** — `proxyProvider` calls your `/api/ai/*` endpoints so upstream keys stay server-side
- 🧭 **Proxy request control** — add app body fields or rewrite proxy URL, headers, and credentials per request
- 🧵 **Thread-aware backend context** — pass `threadId` and `forwardedProps` to proxy/agent backends without overloading client state ids
- 🧩 **Client-local tool context** — pass local runtime context to browser tool handlers without serializing it to the model backend
- 🧾 **Request body extensions** — pass provider-specific JSON fields through `body` without losing typed options
- 🪝 **Request preparation hooks** — customize send and resume requests after chat id, metadata, and messages resolve
- 🔎 **Request lifecycle tracing** — observe final chat, completion, object, and embedding requests with `onRequest` and `onResponse`
- 🧰 **Tool calling helpers** — run handlers automatically, gate them for approval, or control follow-up sends with `sendAutomaticallyWhen`
- 🎚️ **Active tool filtering** — keep one tool registry and expose only selected tools per request with `activeTools`
- 🛑 **Tool loop stop conditions** — stop multi-step tool loops with `isStepCount()` or `hasToolCall()`
- 🔁 **Per-step tool loop requests** — adjust body, metadata, or active tools on each automatic assistant step with `prepareStep`
- 🖼️ **File attachments** — pass browser files or preloaded file objects to `append(..., { attachments })`
- 🔁 **AI SDK-style aliases** — `sendMessage`, `addToolOutput`, and `addToolApprovalResponse` for familiar chat integrations
- 🔁 **Resumable stream hook** — reconnect proxy-backed chats with `resumeStream()` and `resumeUrl`
- 🆔 **Server message IDs** — map proxy/UI stream `start.messageId` onto the assistant message id
- 🧱 **Structured message parts** — render assistant text, reasoning, sources, files, custom data, and `tool-*` states from `Message.parts`
- 🧯 **Retry controls** — opt into `maxRetries`, `retryDelayMs`, `shouldRetry`, and `onRetry` for transient provider failures
- 🪶 **Stream throttling** — use `throttleMs` to reduce reactive updates during fast token streams
- 🆔 **Custom IDs** — pass `generateId` for deterministic chat, completion, message, tool, and stream data IDs
- 🔗 **Shared state by ID** — reuse chat, completion, and object state across Vue components with the same `id`
- ✂️ **Message pruning** — trim long chat histories, reasoning parts, and selected historical tool calls before provider requests
- ✏️ **Edit and resend** — replace an earlier message with `append(..., { messageId })`
- 🚦 **Consistent statuses** — `status`, `isLoading`, `error`, and `clearError()` work across the core composables
- 🧱 **Optimistic message edits** — `setMessages()` accepts arrays or updater functions for local chat history changes
- 📝 **Form helpers** — `useChat` and `useCompletion` include `setInput`, `handleInputChange`, and `handleSubmit`
- 👀 **Lifecycle callbacks** — observe chunks, tool calls, deltas, partial objects, finishes, and errors
- 🧩 **Custom stream data** — collect sources, progress, citations, and AI SDK message metadata during a chat turn
- 📐 **Structured output** — `useObject` sends JSON Schema response formats, streams partial objects, and validates the final object
- 🛠 **TypeScript first** — strict mode, no `any` leaks, full IDE autocomplete
- ⚡ **Tiny** — zero runtime deps beyond Vue itself
- 🧪 **Tested** — Vitest + jsdom, with fake providers you can copy
- 📦 **Tree-shakable** — ESM and CJS, named exports, no side effects

## Installation

```bash
pnpm add vue-ai-hooks
# or
npm install vue-ai-hooks
# or
yarn add vue-ai-hooks
```

Peer dependency: `vue@^3.4.0`.

## Runtime requirements

- Vue 3.4 or newer.
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
import { useEmbedding, openai } from 'vue-ai-hooks'

const { embed, embeddings } = useEmbedding({
  provider: openai({ apiKey: '...' })
})

const result = await embed(['hello world', 'goodbye world'])
console.log(result.embeddings) // number[][]
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

## Using a non-OpenAI provider

Every provider implements the same `ChatProvider` interface, so the hooks
don't care which model is on the other end:

```ts
import { useChat, openaiCompatible } from 'vue-ai-hooks'

useChat({
  provider: openaiCompatible({
    apiKey: 'sk-...',
    baseURL: 'https://api.deepseek.com/v1'
  })
})
```

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

| Return                          | Type                                                                   | Description                                                       |
| ------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `id`                            | `Ref<string>`                                                          | Stable chat id sent with provider requests                        |
| `messages`                      | `Ref<Message[]>`                                                       | Full message history (user, assistant, system, tool)              |
| `input`                         | `Ref<string>`                                                          | Bound to your composer; `handleSubmit()` clears it                |
| `status`                        | `Ref<ChatStatus>`                                                      | `ready`, `submitted`, `streaming`, or `error`                     |
| `usage`                         | `Ref<TokenUsage \| null>`                                              | Latest normalized token usage                                     |
| `streamData`                    | `Ref<StreamDataPart[]>`                                                | Custom stream data from the current assistant turn                |
| `pendingToolCalls`              | `Ref<ToolCall[]>`                                                      | Tool calls waiting for manual results                             |
| `isLoading`                     | `Ref<boolean>`                                                         | True while a stream is in flight                                  |
| `error`                         | `Ref<Error \| null>`                                                   | Last error, cleared on next `append`                              |
| `append(content, opts?)`        | `(string \| Message, AppendChatOptions) => Promise<void>`              | Send or replace a message and stream the reply                    |
| `sendMessage(content?, opts?)`  | `(string \| Message \| undefined, AppendChatOptions) => Promise<void>` | AI SDK-style send helper; omit content to submit current messages |
| `addToolResult(id, res)`        | `(string, unknown, Partial<ChatRequest>) => Promise<void>`             | Submit a manual tool result and continue when ready               |
| `addToolOutput(output)`         | `(AddToolOutputOptions, Partial<ChatRequest>) => Promise<void>`        | AI SDK-style alias for manual tool output                         |
| `addToolApprovalResponse(resp)` | `(ToolApprovalResponse, Partial<ChatRequest>) => Promise<void>`        | AI SDK-style approval response helper                             |
| `approveToolCall(id)`           | `(string, Partial<ChatRequest>) => Promise<void>`                      | Run an approval-gated local tool handler                          |
| `rejectToolCall(id)`            | `(string, unknown, Partial<ChatRequest>) => Promise<void>`             | Reject a pending tool call and continue when ready                |
| `regenerate(opts?)`             | `(RegenerateChatOptions) => Promise<void>`                             | Regenerate the latest or a specific assistant turn                |
| `resumeStream(opts?)`           | `(ResumeChatOptions) => Promise<void>`                                 | Resume an active provider/backend stream                          |
| `reload()`                      | `() => Promise<void>`                                                  | Re-run the last assistant turn                                    |
| `stop()`                        | `() => void`                                                           | Abort the in-flight stream                                        |
| `setId(id)`                     | `(string) => void`                                                     | Replace the chat id for future requests                           |
| `setInput(value)`               | `(string) => void`                                                     | Replace composer input manually                                   |
| `handleInputChange(event)`      | `(Event \| { target } \| string) => void`                              | Wire custom inputs without `v-model`                              |
| `handleSubmit(event, opts?)`    | `(Event?, AppendChatOptions?) => Promise<void>`                        | Wire a form submit; clears input after success                    |
| `setMessages(messages)`         | `(SetMessagesInput) => void`                                           | Replace or functionally update history                            |
| `clearError()`                  | `() => void`                                                           | Clear error state                                                 |
| `clear()`                       | `() => void`                                                           | Reset to empty state                                              |
| `abortController`               | `Ref<AbortController \| null>`                                         | Exposed for advanced use cases                                    |

Set `maxRetries` on `useChat`, `useCompletion`, `useEmbedding`, or `useObject`
to retry transient provider failures. Streaming calls only retry when the
failure happens before the first chunk arrives, so partial text is never
duplicated.

Use `body` in `defaultRequest` or per-call request options to pass
provider-specific JSON fields through OpenAI-compatible, Anthropic, or proxy
requests. Explicit typed fields still win on conflicts.

Use `prepareSendMessagesRequest` or `prepareReconnectToStreamRequest` when a
proxy-backed app needs tenant headers, trace metadata, or backend-only body
fields after the final chat id, messages, and request metadata are known.
Use `prepareStep` when automatic tool loops need request changes per assistant
step, such as narrowing `activeTools` after a tool result arrives.
Use `threadId` and `forwardedProps` when an agent backend needs a server thread
identifier plus app context without changing the client-side shared chat id.
Use `context` when browser-local tool handlers need stores, services, or session
state that should not be serialized.

Set `throttleMs` on `useChat`, `useCompletion`, or `useObject` to batch reactive
stream updates for busy UIs. The final stream state is always flushed before the
request resolves. `experimental_throttle` is accepted as an AI SDK-compatible
alias, but new code should prefer `throttleMs`.

`useChat` keeps the final assistant message as the first `onFinish` argument and
also passes `ChatFinishInfo` with the message snapshot, abort/error/disconnect
flags, and finish reason.

Pass `generateId` to `useChat`, `useCompletion`, or `useObject` when you need
deterministic IDs for SSR, persistence, tests, or backend trace correlation.
Explicit `id` and `messageId` values still take priority over generated IDs.
Proxy streams can also send `ChatChunk.messageId` or AI SDK UI stream
`start.messageId` to replace the current assistant id with the server's id.

Passing the same `id` to multiple `useChat()` calls shares chat state across
components. The first instance seeds `initialMessages` and `initialInput`;
`messages` is accepted as an AI SDK-style alias for `initialMessages`. `setId()`
only changes the id sent with future provider requests.

Use `pruneMessages()` inside `prepareSendMessagesRequest` when long chats should
send only recent context, system prompts, and current or selected tool details to
a provider.

### `useCompletion(options)` / `useEmbedding(options)` / `useObject(options)`

Same shape, scoped to single-shot completions, embedding vectors, and structured
JSON object output respectively.

These composables also expose `status`, `isLoading`, `error`, `clearError()`,
`stop()`, and `clear()` so UI state can follow one pattern across chat, text,
vectors, and structured JSON.

`useObject` supports `id` for shared structured-output state across components
and `initialValue` for seeding the first partial object.

`useChat` and `useCompletion` also expose `setInput()`, `handleInputChange()`,
and `handleSubmit()` for simple form wiring. Successful form submissions clear
`input`; failed submissions leave it intact. Both accept `initialInput`.

Its `onFinish` callback keeps the final text as the first argument and passes
the original prompt plus abort status through `CompletionFinishInfo`.

Passing the same `id` to multiple `useCompletion()` calls shares completion
state across components. Omit `id` for independent generated state.

### `usePersist(source, options)`

Persists any Vue `Ref` to `localStorage`, with optional versioning and custom
serialization. `useChat({ persist })` uses Date-safe message serialization
internally, and the exported `serializeMessages()` / `deserializeMessages()`
helpers also preserve valid `Message.parts` for structured chat rendering. See the
[usePersist reference](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/use-persist.md) for details.

See the [reference docs](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/use-chat.md), [provider reference](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/providers.md),
and [public types](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/types.md) for full type definitions.
For upgrade guarantees, see the [API stability guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/api-stability.md).

## Examples

Four runnable examples live in [`examples/`](https://github.com/hexinmiao96/vue-ai-hooks/tree/main/examples):

- `examples/chat` — streaming chat UI with provider switching, structured `Message.parts`, and a local tool approval demo
- `examples/proxy-server` — local backend proxy template for the `/api/ai/*` contract
- `examples/completion` — single-shot completion form
- `examples/embedding` — pairwise cosine similarity heatmap

To run them:

```bash
pnpm install
cp .env.example .env
pnpm example:chat
```

`examples/chat` defaults to the no-key `local-tools` provider unless you select a
provider or configure a real `VITE_OPENAI_KEY`.

To run the browser chat example through the local proxy template:

```bash
pnpm example:proxy-server
# in another terminal
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

For deterministic component and composable tests without live provider calls, see
the [testing guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/testing.md).

## Project status

This is **v0.2.1** — a working foundation, not feature-complete. What's in:

- ✅ Chat with streaming, abort, message history, finish metadata
- ✅ Single-shot completion
- ✅ Embedding
- ✅ Structured object output with final schema validation
- ✅ OpenAI + OpenAI-compatible provider
- ✅ OpenRouter provider
- ✅ Gemini provider
- ✅ Backend proxy provider
- ✅ Anthropic Claude provider
- ✅ Multimodal image input
- ✅ Date-safe localStorage persistence
- ✅ Tool-calling helpers
- ✅ Active tool filtering with `activeTools`
- ✅ Tool loop stop conditions with `stopWhen`
- ✅ Per-step tool loop request preparation with `prepareStep`
- ✅ AI SDK-style chat aliases for send and tool output flows
- ✅ Tool approval flow for gated local handlers
- ✅ AI SDK-style `sendAutomaticallyWhen` for tool-result follow-up control
- ✅ Custom stream data and assistant metadata
- ✅ Chat status, clearError, and regenerate controls
- ✅ Function updater support for `setMessages()`
- ✅ Consistent status and clearError controls across completion, embedding, and object output
- ✅ Stream update throttling with `throttleMs`
- ✅ Custom `generateId` hooks for deterministic chat, completion, and message ids
- ✅ Completion form helpers for input and submit handling
- ✅ Shared completion state with explicit `useCompletion({ id })`
- ✅ Chat id and request metadata passthrough for proxy-backed apps
- ✅ Thread id and forwarded props passthrough for proxy/agent backends
- ✅ Client-local tool context for handlers, approval predicates, and tool lifecycle hooks
- ✅ AI SDK UI message stream compatibility for proxy-backed apps
- ✅ Resumable stream client hook for proxy-backed apps
- ✅ Edit-and-resend flow with `append(..., { messageId })`
- ✅ Proxy request `body` and `prepareRequest` hooks for app backends
- ✅ Request-level `body` extensions for provider-specific JSON options
- ✅ Opt-in retry controls for transient provider failures
- ✅ Quality gates for tests, coverage, build, package contents, install smoke tests, examples, and docs

What we're planning next:

- 🔜 Vue DevTools tab for inspecting streams
- 🔜 More providers and production hardening

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

Adding a new provider is the single best first contribution — it's one file,
a small interface, and high-value. See [`src/providers/openai.ts`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/src/providers/openai.ts)
for the reference implementation.

## License

[MIT](./LICENSE)
