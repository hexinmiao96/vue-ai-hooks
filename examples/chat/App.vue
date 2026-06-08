<script setup lang="ts">
import { useChat, openai } from 'vue-ai-hooks'

/**
 * Basic streaming chat example.
 *
 * To run:
 *   pnpm install
 *   pnpm --filter example-chat dev
 *   open http://localhost:5174
 *
 * Set VITE_OPENAI_KEY in your .env, or pass the key explicitly.
 */
const provider = openai({
  apiKey: import.meta.env.VITE_OPENAI_KEY || '',
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL
})

const { messages, input, isLoading, append, stop, error } = useChat({
  provider,
  onError: (e) => console.error('chat error:', e)
})

async function send() {
  const text = input.value.trim()
  if (!text || isLoading.value) return
  input.value = ''
  await append(text)
}
</script>

<template>
  <main class="chat">
    <h1>vue-ai-hooks · useChat</h1>
    <p v-if="error" class="error">{{ error.message }}</p>

    <section class="messages">
      <article
        v-for="m in messages"
        :key="m.id"
        :class="['message', `role-${m.role}`]"
      >
        <header>{{ m.role }}</header>
        <p>{{ m.content }}</p>
      </article>
    </section>

    <div class="composer">
      <textarea
        v-model="input"
        rows="3"
        placeholder="Say something..."
        @keydown.enter.exact.prevent="send"
      />
      <div class="actions">
        <button :disabled="isLoading" @click="send">Send</button>
        <button :disabled="!isLoading" @click="stop">Stop</button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.chat { max-width: 720px; margin: 32px auto; font-family: system-ui, sans-serif; }
h1 { font-size: 18px; }
.messages { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
.message { padding: 10px 12px; border-radius: 8px; }
.message header { font-size: 12px; color: #666; margin-bottom: 4px; }
.role-user { background: #f0f7ff; }
.role-assistant { background: #f7f7f7; }
.composer { display: flex; flex-direction: column; gap: 8px; }
textarea { width: 100%; padding: 8px; font: inherit; }
.actions { display: flex; gap: 8px; }
button { padding: 8px 16px; }
.error { color: #b00020; }
</style>
