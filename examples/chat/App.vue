<script setup lang="ts">
import { useChat, openai, openrouter } from 'vue-ai-hooks'

/**
 * Runtime provider selection for the chat example:
 * - `VITE_CHAT_PROVIDER=openrouter` selects openrouter.
 * - any other value (or missing value) defaults to openai.
 *
 * - openai: created via `openai` and reads `VITE_OPENAI_KEY` + optional
 *   `VITE_OPENAI_BASE_URL`.
 * - openrouter: created via `openrouter` and reads `VITE_OPENROUTER_*` vars.
 *
 * Start the demo:
 *   pnpm install
 *   pnpm example:chat
 *   open http://localhost:5174
 */
const providerType = import.meta.env.VITE_CHAT_PROVIDER === 'openrouter' ? 'openrouter' : 'openai'
/**
 * Build the concrete provider instance used by this example so the compose logic
 * stays explicit and easy to compare in logs and screenshots.
 */
const provider = providerType === 'openrouter'
  ? openrouter({
      // Keep app-scoped identity headers configurable for OpenRouter quotas/rules.
      apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
      defaultModel: import.meta.env.VITE_OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini',
      siteUrl: import.meta.env.VITE_OPENROUTER_SITE_URL,
      appName: import.meta.env.VITE_OPENROUTER_APP_NAME || 'Vue AI Hooks'
    })
  : openai({
      // Default path is https://api.openai.com/v1 if baseURL is omitted.
      apiKey: import.meta.env.VITE_OPENAI_KEY || '',
      baseURL: import.meta.env.VITE_OPENAI_BASE_URL
    })

// useChat returns both message stream state and imperative controls.
// - messages/input: render + editor binding
// - isLoading: controls request button states
// - append/stop: send and cancel lifecycle hooks
// - error: synchronous rendering of transport/composition failures
const { messages, input, isLoading, append, stop, error } = useChat({
  provider,
  onError: (e) => console.error('chat error:', e)
})

/**
 * Send current input as a new user message when valid and idle.
 *
 * This guard prevents accidental empty submits and duplicate in-flight requests.
 */
async function send() {
  const text = input.value.trim()
  // Ignore empty input or duplicate sends while a request is already running.
  if (!text || isLoading.value) return
  // Reset input before request to keep the textarea snappy after Enter/Send.
  input.value = ''
  await append(text)
}
</script>

<template>
  <main class="chat">
    <h1>vue-ai-hooks · useChat</h1>
    <p
      v-if="error"
      class="error"
    >
      {{ error.message }}
    </p>
    <p class="provider-badge">
      Provider: {{ providerType }}
    </p>

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
        <button
          :disabled="isLoading"
          @click="send"
        >
          Send
        </button>
        <button
          :disabled="!isLoading"
          @click="stop"
        >
          Stop
        </button>
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
.provider-badge { margin: 0 0 12px; font-size: 12px; color: #334155; }
</style>
