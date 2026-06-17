<script setup lang="ts">
import { ref } from 'vue'
import { useEmbedding, openai } from 'vue-ai-hooks'

const provider = openai({
  apiKey: import.meta.env.VITE_OPENAI_KEY || '',
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL
})

const { embed, isLoading, error } = useEmbedding({ provider })

const a = ref('A cat sat on the mat.')
const b = ref('A kitten rested on the rug.')
const c = ref('Quantum mechanics is hard.')

const similarities = ref<{ ab: number; ac: number; bc: number } | null>(null)

function cosine(x: number[], y: number[]): number {
  let dot = 0
  let nx = 0
  let ny = 0
  for (let i = 0; i < x.length; i++) {
    dot += x[i] * y[i]
    nx += x[i] * x[i]
    ny += y[i] * y[i]
  }
  return dot / (Math.sqrt(nx) * Math.sqrt(ny))
}

async function run() {
  const result = await embed([a.value, b.value, c.value])
  if (result.embeddings.length !== 3) return
  similarities.value = {
    ab: cosine(result.embeddings[0], result.embeddings[1]),
    ac: cosine(result.embeddings[0], result.embeddings[2]),
    bc: cosine(result.embeddings[1], result.embeddings[2])
  }
}
</script>

<template>
  <main class="embed">
    <h1>vue-ai-hooks · useEmbedding</h1>
    <p
      v-if="error"
      class="error"
    >
      {{ error.message }}
    </p>

    <div class="inputs">
      <label>A: <input v-model="a"></label>
      <label>B: <input v-model="b"></label>
      <label>C: <input v-model="c"></label>
    </div>

    <button
      :disabled="isLoading"
      @click="run"
    >
      Compute embeddings
    </button>

    <table v-if="similarities">
      <thead><tr><th /><th>A</th><th>B</th><th>C</th></tr></thead>
      <tbody>
        <tr><th>A</th><td>1.00</td><td>{{ similarities.ab.toFixed(3) }}</td><td>{{ similarities.ac.toFixed(3) }}</td></tr>
        <tr><th>B</th><td /><td>1.00</td><td>{{ similarities.bc.toFixed(3) }}</td></tr>
        <tr><th>C</th><td /><td /><td>1.00</td></tr>
      </tbody>
    </table>
  </main>
</template>

<style scoped>
.embed { max-width: 720px; margin: 32px auto; font-family: system-ui, sans-serif; }
h1 { font-size: 18px; }
.inputs { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
input { width: 100%; padding: 6px; font: inherit; }
button { padding: 8px 16px; margin: 12px 0; }
table { border-collapse: collapse; margin-top: 12px; }
th, td { border: 1px solid #ddd; padding: 6px 12px; text-align: right; }
.error { color: #b00020; }
</style>
