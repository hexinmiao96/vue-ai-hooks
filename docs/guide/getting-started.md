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
| Try your backend proxy contract  | Run the [proxy template](#try-the-backend-proxy-template-locally) |
| Add chat to an app               | Copy [your first chat](#your-first-chat)                          |
| Choose a model provider          | Jump to [using a different provider](#using-a-different-provider) |

## Run a demo without API keys

The fastest first run is the local chat demo. It uses a deterministic provider,
so you can test streaming UI and tool approval before touching real credentials:

```bash
cp examples/.env.example .env
VITE_CHAT_PROVIDER=local-tools pnpm example:chat
```

Open the local URL printed by Vite, then click **Run approval demo**. The UI will
show a pending `chargeCard` tool call and continue after `approveToolCall()` or
`rejectToolCall()`.

## Security note before real providers

Any `VITE_*` key in a browser app is public. Use the examples for local demos,
prototypes, or tightly restricted provider keys only. Production apps should
send requests through your own backend or edge proxy and keep upstream API keys
server-side.

## Your first chat

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
  <p v-if="error">{{ error.message }}</p>
</template>
```

That's it — every message is streamed into `messages` as it arrives, with the
content growing word by word. `isLoading` flips between true and false as the
stream starts and ends.

Use this browser-key version for local exploration only. For production, switch
to `proxyProvider` so your upstream model key stays on the server.

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

The proxy example implements the same `/api/ai/*` contract used by
`proxyProvider`. It streams deterministic chunks and embeddings without any
third-party API key:

```bash
pnpm example:proxy-server
# in another terminal
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

When this works, replace the template server with your own `/api/ai/chat`,
`/api/ai/completion`, and `/api/ai/embedding` routes.

## Using a different provider

Every provider implements the same `ChatProvider` interface. To use a non-OpenAI
service, swap the factory:

```ts
import {
  useChat,
  anthropic,
  gemini,
  openaiCompatible,
  openrouter,
  proxyProvider
} from 'vue-ai-hooks'

// Anthropic Claude
const { messages, append } = useChat({
  provider: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY })
})

// Any OpenAI-compatible service (DeepSeek, Moonshot, Zhipu, Ollama via its
// OpenAI shim, vLLM, ...)
const { messages: messages2, append: append2 } = useChat({
  provider: openaiCompatible({
    apiKey: 'sk-...',
    baseURL: 'https://api.deepseek.com/v1'
  })
})

// OpenRouter via dedicated helper
const { messages: messages3, append: append3 } = useChat({
  provider: openrouter({ apiKey: import.meta.env.VITE_OPENROUTER_API_KEY })
})

// Gemini via Google's OpenAI-compatible endpoint
const { messages: messages4, append: append4 } = useChat({
  provider: gemini({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
})

// Production browser path through your own backend or edge route
const { messages: messages5, append: append5 } = useChat({
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
- [useChat reference](/reference/use-chat) — full API
- [useCompletion reference](/reference/use-completion)
- [useEmbedding reference](/reference/use-embedding)
- [useObject reference](/reference/use-object)
