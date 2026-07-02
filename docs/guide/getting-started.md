# Getting started

## Install

```bash
pnpm add vue-ai-hooks
# or
npm install vue-ai-hooks
```

`vue-ai-hooks` requires Vue 3.4 or later.

## Pick a path

| If you want to...                | Start here                                                        |
| -------------------------------- | ----------------------------------------------------------------- |
| See the UI without provider keys | Run the [local tool approval demo](#run-a-demo-without-api-keys)  |
| Compare library fit              | Read [Choosing vue-ai-hooks](/guide/choosing)                     |
| Upgrade from v0.3.x              | Read the [v0.4.0 upgrade guide](/guide/upgrade-0.4)               |
| Upgrade from v0.2.1              | Read the [v0.3.0 upgrade guide](/guide/upgrade-0.3)               |
| Port an AI SDK UI app            | Use the [AI SDK migration guide](/guide/ai-sdk-migration)         |
| Try your backend proxy contract  | Run the [proxy template](#try-the-backend-proxy-template-locally) |
| Add chat to an app               | Copy [your first chat](#your-first-chat)                          |
| Choose a model provider          | Jump to [using a different provider](#using-a-different-provider) |

## Run a demo without API keys

The fastest first run is the local chat demo. It uses a deterministic provider,
so you can test streaming UI and tool approval before touching real credentials:

```bash
pnpm install
pnpm example:chat
```

Open the local URL printed by Vite, then click **Run approval demo**. When no
provider is selected and no real `VITE_OPENAI_KEY` is present, the chat example
falls back to `local-tools`, shows a pending `chargeCard` tool call, and
continues after `approveToolCall()` or `rejectToolCall()`.

## Security note before real providers

Any `VITE_*` key in a browser app is public. Use the examples for local demos,
prototypes, or tightly restricted provider keys only. Production apps should
send requests through your own backend or edge proxy and keep upstream API keys
server-side.

## Your first chat

```vue
<script setup lang="ts">
import { useChat } from 'vue-ai-hooks'

const { messages, input, append, isLoading, stop, error } = useChat({
  api: '/api/chat',
  credentials: 'include'
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
  <p v-if="error">{{ error.message }}</p>
</template>
```

That's it — every message is streamed into `messages` as it arrives, with the
content growing word by word. `isLoading` flips between true and false as the
stream starts and ends.

The browser sends provider-agnostic JSON to your own `/api/chat` route. Keep the
upstream model key on that server route, then return SSE `ChatChunk` objects or
AI SDK UI stream parts.

## Adding persistence

The `persist` option automatically saves and restores `messages` to localStorage:

```ts
const { messages, append, clear } = useChat({
  provider: openai({ apiKey: '...' }),
  persist: { key: 'my-app:thread-1' }
})
```

When the user reloads the page, their previous conversation is restored from
`localStorage["my-app:thread-1"]`. `clear()` removes the entry. Bump `version` if
you change the `Message` shape and want to invalidate old data.

The default chat persistence is Date-safe: `createdAt` is stored as an ISO
string and restored as a `Date`. When saving messages to your own backend, use
`serializeMessages(messages.value)` before writing and `deserializeMessages(raw)`
before calling `setMessages()`.

## Try the backend proxy template locally

The proxy example supports both the default composable endpoints (`/api/chat`,
`/api/completion`, `/api/embedding`, `/api/image`, `/api/video`, `/api/speech`,
`/api/transcription`, `/api/rerank`, `/api/object`) and the explicit `proxyProvider` endpoints
(`/api/ai/*`). It streams deterministic chunks, structured JSON, image data
URLs, video storyboards, audio data URLs, transcripts, reranked documents, and embeddings without any third-party API
key:

```bash
pnpm example:proxy-server
# in another terminal
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

You can also point the default transport at the same local server:

```ts
useChat({ baseURL: 'http://127.0.0.1:8787' })
useCompletion({ baseURL: 'http://127.0.0.1:8787' })
useEmbedding({ baseURL: 'http://127.0.0.1:8787' })
useImage({ baseURL: 'http://127.0.0.1:8787' })
useVideo({ baseURL: 'http://127.0.0.1:8787' })
useSpeech({ baseURL: 'http://127.0.0.1:8787' })
useTranscription({ baseURL: 'http://127.0.0.1:8787' })
useRerank({ baseURL: 'http://127.0.0.1:8787' })
useObject({ baseURL: 'http://127.0.0.1:8787', schema })
```

When this works, replace the template server with your own `/api/chat`,
`/api/completion`, `/api/embedding`, `/api/image`, `/api/video`, `/api/speech`,
`/api/transcription`, `/api/rerank`, and `/api/object` routes.

## Using a different provider

Every provider implements the same `ChatProvider` interface. To use a non-OpenAI
service, swap the factory:

```ts
import {
  useChat,
  anthropic,
  deepseek,
  gemini,
  moonshot,
  ollama,
  openaiCompatible,
  openrouter,
  proxyProvider,
  vllm,
  zhipu
} from 'vue-ai-hooks'

// Anthropic Claude
const { messages, append } = useChat({
  provider: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY })
})

// DeepSeek via dedicated helper
const { messages: messages2, append: append2 } = useChat({
  provider: deepseek({ apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY })
})

// OpenRouter via dedicated helper
const { messages: messages3, append: append3 } = useChat({
  provider: openrouter({ apiKey: import.meta.env.VITE_OPENROUTER_API_KEY })
})

// Gemini via Google's OpenAI-compatible endpoint
const { messages: messages4, append: append4 } = useChat({
  provider: gemini({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
})

// Moonshot/Kimi via its OpenAI-compatible endpoint
const { messages: messages5, append: append5 } = useChat({
  provider: moonshot({ apiKey: import.meta.env.VITE_MOONSHOT_API_KEY })
})

// Zhipu BigModel or Z.ai endpoint presets
const { messages: messages6, append: append6 } = useChat({
  provider: zhipu({ apiKey: import.meta.env.VITE_ZHIPU_API_KEY, endpoint: 'bigmodel' })
})

// Local Ollama OpenAI compatibility server
const { messages: messages7, append: append7 } = useChat({
  provider: ollama({ defaultModel: 'qwen3:8b' })
})

// Local or gateway-backed vLLM OpenAI-compatible server
const { messages: messages8, append: append8 } = useChat({
  provider: vllm({ defaultModel: 'served-model' })
})

// Any other OpenAI-compatible service
const { messages: messages9, append: append9 } = useChat({
  provider: openaiCompatible({
    apiKey: 'sk-...',
    baseURL: 'https://gateway.example.com/v1'
  })
})

// Production browser path through your own backend or edge route
const { messages: messages10, append: append10 } = useChat({
  provider: proxyProvider({
    chatUrl: '/api/ai/chat',
    headers: () => ({ Authorization: `Bearer ${getSessionToken()}` }),
    credentials: 'include'
  })
})
```

## Next steps

- [Examples](/examples/) — choose the right composable by product task
- [Providers](/guide/providers) — how to add your own
- [Inspection](/guide/inspection) — inspect request traces and provider failures
- [useChat reference](/reference/use-chat) — full API
- [useCompletion reference](/reference/use-completion)
- [useEmbedding reference](/reference/use-embedding)
- [useImage reference](/reference/use-image)
- [useVideo reference](/reference/use-video)
- [useSpeech reference](/reference/use-speech)
- [useTranscription reference](/reference/use-transcription)
- [useRerank reference](/reference/use-rerank)
- [useObject reference](/reference/use-object)
