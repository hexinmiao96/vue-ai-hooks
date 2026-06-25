<script setup lang="ts">
import { useCompletion, gemini, openai, openrouter, proxyProvider } from 'vue-ai-hooks'

/**
 * Runtime provider selection for the completion example:
 * - check `VITE_EXAMPLE_PROVIDER` first;
 * - if not set to `openrouter`, `gemini`, or `proxy`, check `VITE_CHAT_PROVIDER`;
 * - otherwise fall back to `openai`.
 *
 * - openai: uses `openai` with `VITE_OPENAI_KEY` + optional `VITE_OPENAI_BASE_URL`.
 * - openrouter: uses `openrouter` with `VITE_OPENROUTER_*` variables.
 * - gemini: uses `gemini` with `VITE_GEMINI_*` variables.
 * - proxy: uses `proxyProvider` with `VITE_PROXY_*` variables.
 *
 * This keeps the provider switch behavior consistent across all demo pages.
 */
const selectedProvider =
  import.meta.env.VITE_EXAMPLE_PROVIDER === 'openrouter' ||
  import.meta.env.VITE_CHAT_PROVIDER === 'openrouter'
    ? 'openrouter'
    : import.meta.env.VITE_EXAMPLE_PROVIDER === 'gemini' ||
        import.meta.env.VITE_CHAT_PROVIDER === 'gemini'
      ? 'gemini'
      : import.meta.env.VITE_EXAMPLE_PROVIDER === 'proxy' ||
          import.meta.env.VITE_CHAT_PROVIDER === 'proxy'
        ? 'proxy'
        : 'openai'
const proxyCredentials = (import.meta.env.VITE_PROXY_CREDENTIALS || undefined) as
  | RequestCredentials
  | undefined
/**
 * Build the concrete provider instance used by this example.
 * The ternary keeps one source of truth for base URL, API keys and attribution
 * headers so completion behavior matches chat/embedding demos.
 */
const provider =
  selectedProvider === 'openrouter'
    ? openrouter({
        // Keep app-scoped identity headers configurable for OpenRouter quotas/rules.
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
        defaultModel: import.meta.env.VITE_OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini',
        siteUrl: import.meta.env.VITE_OPENROUTER_SITE_URL,
        appName: import.meta.env.VITE_OPENROUTER_APP_NAME || 'Vue AI Hooks'
      })
    : selectedProvider === 'gemini'
      ? gemini({
          // Gemini uses Google's OpenAI-compatible base by default.
          apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
          defaultModel: import.meta.env.VITE_GEMINI_DEFAULT_MODEL || 'gemini-3.5-flash',
          baseURL: import.meta.env.VITE_GEMINI_BASE_URL
        })
      : selectedProvider === 'proxy'
        ? proxyProvider({
            // Browser requests go to your app backend; upstream keys stay server-side.
            completionUrl: import.meta.env.VITE_PROXY_COMPLETION_URL || '/api/ai/completion',
            baseURL: import.meta.env.VITE_PROXY_BASE_URL,
            credentials: proxyCredentials,
            headers: import.meta.env.VITE_PROXY_AUTH_TOKEN
              ? { Authorization: `Bearer ${import.meta.env.VITE_PROXY_AUTH_TOKEN}` }
              : undefined
          })
        : openai({
            // Default base is https://api.openai.com/v1 when no VITE_OPENAI_BASE_URL is set.
            apiKey: import.meta.env.VITE_OPENAI_KEY || '',
            baseURL: import.meta.env.VITE_OPENAI_BASE_URL
          })

// useCompletion returns completion text and request lifecycle controls.
// - completion: latest response text
// - input: prompt binding
// - isLoading: controls UI disablement
// - complete/stop: request start and abort hooks
// - error: inline feedback
const { completion, input, isLoading, complete, stop, error } = useCompletion({ provider })

/**
 * Trigger one completion request for the current prompt.
 */
async function run() {
  // Start a single completion request using the current textarea content.
  await complete()
}
</script>

<template>
  <main class="completion">
    <h1>vue-ai-hooks · useCompletion</h1>
    <p v-if="error" class="error">
      {{ error.message }}
    </p>
    <p class="provider-badge">Provider: {{ selectedProvider }}</p>

    <label>
      Prompt
      <textarea v-model="input" rows="4" placeholder="Write a haiku about TypeScript" />
    </label>

    <div class="actions">
      <button :disabled="isLoading" @click="run">Complete</button>
      <button :disabled="!isLoading" @click="stop">Stop</button>
    </div>

    <article v-if="completion" class="output">
      {{ completion }}
    </article>
  </main>
</template>

<style scoped>
.completion {
  max-width: 720px;
  margin: 32px auto;
  font-family: system-ui, sans-serif;
}
h1 {
  font-size: 18px;
}
label {
  display: block;
  margin: 16px 0 8px;
}
textarea {
  width: 100%;
  padding: 8px;
  font: inherit;
}
.actions {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
button {
  padding: 8px 16px;
}
.output {
  padding: 12px;
  background: #f7f7f7;
  border-radius: 8px;
  white-space: pre-wrap;
}
.error {
  color: #b00020;
}
.provider-badge {
  margin: 0 0 12px;
  font-size: 12px;
  color: #334155;
}
</style>
