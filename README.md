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
[Axios](https://axios-http.com) to the LLM world. Three composables, pluggable
providers, Server-Sent Events streaming handled for you. Works with OpenAI and any
OpenAI-compatible service (DeepSeek, Moonshot, Zhipu, Ollama via its OpenAI shim,
vLLM, etc.).

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, append, isLoading, stop } = useChat({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
```

## Why

The AI-in-Vue story is currently fragmented. Options today:

| Library                       | Tradeoff                                                                 |
| ----------------------------- | ------------------------------------------------------------------------ |
| **Vercel AI SDK**             | React-first; Vue support is unofficial and lags behind                   |
| **LangChain.js**              | Powerful but heavy; opinionated chains, lots of magic                    |
| **Direct fetch + manual SSE** | Works, but you re-implement aborts, retries, and state for every project |
| **vue-ai-hooks**              | A focused, framework-native SDK with the boring parts done               |

## Features

- 🎯 **Three composables, one mental model** — `useChat`, `useCompletion`, `useEmbedding`
- 🌊 **Streaming by default** — SSE parsing, AbortController, and reactivity handled for you
- 🔌 **Multi-provider** — OpenAI, Azure OpenAI, DeepSeek, Moonshot, Zhipu, Ollama, vLLM, any OpenAI-compatible API
- 🧰 **Tool calling helpers** — register local handlers and let `useChat` continue the model round-trip
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

const { messages, input, append, isLoading, stop, error } = useChat({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
</script>

<template>
  <div v-for="m in messages" :key="m.id" :class="m.role">
    {{ m.content }}
  </div>
  <textarea v-model="input" />
  <button
    :disabled="isLoading"
    @click="
      append(input)
      input = ''
    "
  >
    Send
  </button>
  <button :disabled="!isLoading" @click="stop">Stop</button>
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

| Return                   | Type                                                         | Description                                          |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------- |
| `messages`               | `Ref<Message[]>`                                             | Full message history (user, assistant, system, tool) |
| `input`                  | `Ref<string>`                                                | Bound to your composer; not auto-cleared             |
| `isLoading`              | `Ref<boolean>`                                               | True while a stream is in flight                     |
| `error`                  | `Ref<Error \| null>`                                         | Last error, cleared on next `append`                 |
| `append(content, opts?)` | `(string \| Message, Partial<ChatRequest>) => Promise<void>` | Send a message and stream the reply                  |
| `reload()`               | `() => Promise<void>`                                        | Re-run the last assistant turn                       |
| `stop()`                 | `() => void`                                                 | Abort the in-flight stream                           |
| `setMessages(messages)`  | `(Message[]) => void`                                        | Replace history (e.g. on restore)                    |
| `clear()`                | `() => void`                                                 | Reset to empty state                                 |
| `abortController`        | `Ref<AbortController \| null>`                               | Exposed for advanced use cases                       |

### `useCompletion(options)` / `useEmbedding(options)`

Same shape, scoped to single-shot completions and embedding vectors respectively.

### `usePersist(source, options)`

Persists any Vue `Ref` to `localStorage`, with optional versioning and custom
serialization. `useChat({ persist })` uses it internally. See the
[usePersist reference](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/use-persist.md) for details.

See the [reference docs](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/use-chat.md), [provider reference](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/providers.md),
and [public types](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/types.md) for full type definitions.
For upgrade guarantees, see the [API stability guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/api-stability.md).

## Examples

Three runnable examples live in [`examples/`](https://github.com/hexinmiao96/vue-ai-hooks/tree/main/examples):

- `examples/chat` — minimal streaming chat UI
- `examples/completion` — single-shot completion form
- `examples/embedding` — pairwise cosine similarity heatmap

To run them:

```bash
pnpm install
cp .env.example .env
pnpm example:chat
```

For deterministic component and composable tests without live provider calls, see
the [testing guide](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/testing.md).

## Project status

This is **v0.2.1** — a working foundation, not feature-complete. What's in:

- ✅ Chat with streaming, abort, message history
- ✅ Single-shot completion
- ✅ Embedding
- ✅ OpenAI + OpenAI-compatible provider
- ✅ OpenRouter provider
- ✅ Anthropic Claude provider
- ✅ Multimodal image input
- ✅ localStorage persistence
- ✅ Tool-calling helpers
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
[open issues](https://github.com/hexinmiao96/vue-ai-hooks/issues) for things
that need hands.

For usage questions or support channels, see [`SUPPORT.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/SUPPORT.md).

Adding a new provider is the single best first contribution — it's one file,
a small interface, and high-value. See [`src/providers/openai.ts`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/src/providers/openai.ts)
for the reference implementation.

## License

[MIT](./LICENSE)
