<script setup lang="ts">
import { ref } from 'vue'
import { useEmbedding, gemini, openai, openrouter, proxyProvider } from 'vue-ai-hooks'

/**
 * Runtime provider selection for the embedding example:
 * - check `VITE_EXAMPLE_PROVIDER` first;
 * - if it is not `openrouter`, `gemini`, or `proxy`, check `VITE_CHAT_PROVIDER`;
 * - otherwise default to `openai`.
 *
 * - openai: uses `openai` with `VITE_OPENAI_KEY` + optional `VITE_OPENAI_BASE_URL`.
 * - openrouter: uses `openrouter` with `VITE_OPENROUTER_*` variables.
 * - gemini: uses `gemini` with `VITE_GEMINI_*` variables.
 * - proxy: uses `proxyProvider` with `VITE_PROXY_*` variables.
 *
 * Sharing the same resolution logic keeps parity between all examples.
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
 * The ternary keeps provider-specific credentials and OpenRouter attribution
 * metadata aligned with the completion/chat demos.
 */
const provider =
  selectedProvider === 'openrouter'
    ? openrouter({
        // Keep app-scoped identity headers configurable for OpenRouter quotas/rules.
        apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
        defaultModel: import.meta.env.VITE_OPENROUTER_DEFAULT_MODEL || 'text-embedding-3-small',
        siteUrl: import.meta.env.VITE_OPENROUTER_SITE_URL,
        appName: import.meta.env.VITE_OPENROUTER_APP_NAME || 'Vue AI Hooks'
      })
    : selectedProvider === 'gemini'
      ? gemini({
          // Use an embedding model by default so the demo does not send chat
          // model names to the embeddings endpoint.
          apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
          defaultModel: import.meta.env.VITE_GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
          baseURL: import.meta.env.VITE_GEMINI_BASE_URL
        })
      : selectedProvider === 'proxy'
        ? proxyProvider({
            // Browser requests go to your app backend; upstream keys stay server-side.
            embeddingUrl: import.meta.env.VITE_PROXY_EMBEDDING_URL || '/api/ai/embedding',
            baseURL: import.meta.env.VITE_PROXY_BASE_URL,
            credentials: proxyCredentials,
            headers: import.meta.env.VITE_PROXY_AUTH_TOKEN
              ? { Authorization: `Bearer ${import.meta.env.VITE_PROXY_AUTH_TOKEN}` }
              : undefined
          })
        : openai({
            // Default base is https://api.openai.com/v1 when no VITE_OPENAI_BASE_URL is set.
            apiKey: import.meta.env.VITE_OPENAI_KEY || '',
            baseURL: import.meta.env.VITE_OPENAI_BASE_URL,
            defaultModel: import.meta.env.VITE_OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
          })

// useEmbedding returns embedding vectors and request lifecycle state.
// - embed: executes one batch embedding request
// - isLoading: disables repeated submissions
// - error: renders provider/model request issues
const { embed, isLoading, error } = useEmbedding({ provider })

const a = ref('A cat sat on the mat.')
const b = ref('A kitten rested on the rug.')
const c = ref('Quantum mechanics is hard.')

const similarities = ref<{ ab: number; ac: number; bc: number } | null>(null)

/**
 * Compute cosine similarity for the demo's pairwise matrix.
 *
 * Values in [0,1] are treated as similarity where larger means closer.
 */
function cosine(x: number[], y: number[]): number {
  // Cosine = dot(x,y)/(||x|| * ||y||), used only for quick local vector
  // comparison in the demo. No numerical safety checks are needed for short,
  // controlled-length vectors in UI display mode.
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

/**
 * Request embeddings for three input texts, then render pairwise similarity.
 */
async function run() {
  const result = await embed([a.value, b.value, c.value])
  // Only render the matrix when all three vectors are returned; prevents partial
  // or malformed responses from producing invalid DOM state.
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
    <p v-if="error" class="error">
      {{ error.message }}
    </p>
    <p class="provider-badge">Provider: {{ selectedProvider }}</p>

    <div class="inputs">
      <label>A: <input v-model="a" /></label>
      <label>B: <input v-model="b" /></label>
      <label>C: <input v-model="c" /></label>
    </div>

    <button :disabled="isLoading" @click="run">Compute embeddings</button>

    <table v-if="similarities">
      <thead>
        <tr>
          <th />
          <th>A</th>
          <th>B</th>
          <th>C</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>A</th>
          <td>1.00</td>
          <td>{{ similarities.ab.toFixed(3) }}</td>
          <td>{{ similarities.ac.toFixed(3) }}</td>
        </tr>
        <tr>
          <th>B</th>
          <td />
          <td>1.00</td>
          <td>{{ similarities.bc.toFixed(3) }}</td>
        </tr>
        <tr>
          <th>C</th>
          <td />
          <td />
          <td>1.00</td>
        </tr>
      </tbody>
    </table>
  </main>
</template>

<style scoped>
.embed {
  max-width: 720px;
  margin: 32px auto;
  font-family: system-ui, sans-serif;
}
h1 {
  font-size: 18px;
}
.inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 16px 0;
}
input {
  width: 100%;
  padding: 6px;
  font: inherit;
}
button {
  padding: 8px 16px;
  margin: 12px 0;
}
table {
  border-collapse: collapse;
  margin-top: 12px;
}
th,
td {
  border: 1px solid #ddd;
  padding: 6px 12px;
  text-align: right;
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
