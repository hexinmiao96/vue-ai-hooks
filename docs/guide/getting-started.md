# Getting started

## Install

```bash
pnpm add vue-ai-hooks
# or
npm install vue-ai-hooks
```

`vue-ai-hooks` requires Vue 3.4 or later.

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
  <button :disabled="isLoading" @click="append(input); input = ''">Send</button>
  <button :disabled="!isLoading" @click="stop">Stop</button>
  <p v-if="error">{{ error.message }}</p>
</template>
```

That's it — every message is streamed into `messages` as it arrives, with the
content growing word by word. `isLoading` flips between true and false as the
stream starts and ends.

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

## Using a different provider

Every provider implements the same `ChatProvider` interface. To use a non-OpenAI
service, swap the factory:

```ts
import { useChat, anthropic, openaiCompatible, openrouter } from 'vue-ai-hooks'

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
```

## Next steps

- [Providers](/guide/providers) — how to add your own
- [useChat reference](/reference/use-chat) — full API
- [useCompletion reference](/reference/use-completion)
- [useEmbedding reference](/reference/use-embedding)
