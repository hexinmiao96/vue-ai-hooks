<script setup lang="ts">
import { ref } from 'vue'
import { useCompletion, openai } from 'vue-ai-hooks'

const provider = openai({
  apiKey: import.meta.env.VITE_OPENAI_KEY || '',
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL
})

const { completion, input, isLoading, complete, stop, error } = useCompletion({ provider })

async function run() {
  await complete()
}
</script>

<template>
  <main class="completion">
    <h1>vue-ai-hooks · useCompletion</h1>
    <p v-if="error" class="error">{{ error.message }}</p>

    <label>
      Prompt
      <textarea v-model="input" rows="4" placeholder="Write a haiku about TypeScript" />
    </label>

    <div class="actions">
      <button :disabled="isLoading" @click="run">Complete</button>
      <button :disabled="!isLoading" @click="stop">Stop</button>
    </div>

    <article class="output" v-if="completion">
      {{ completion }}
    </article>
  </main>
</template>

<style scoped>
.completion { max-width: 720px; margin: 32px auto; font-family: system-ui, sans-serif; }
h1 { font-size: 18px; }
label { display: block; margin: 16px 0 8px; }
textarea { width: 100%; padding: 8px; font: inherit; }
.actions { display: flex; gap: 8px; margin: 12px 0; }
button { padding: 8px 16px; }
.output { padding: 12px; background: #f7f7f7; border-radius: 8px; white-space: pre-wrap; }
.error { color: #b00020; }
</style>
