<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRerank } from 'vue-ai-hooks'

const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const rerankApi = import.meta.env.VITE_PROXY_RERANK_URL || '/api/rerank'
const useLocalDemo = !proxyBaseURL
const demoFetch = useLocalDemo ? localRerankFetch : undefined
const modeLabel = useLocalDemo ? 'Local deterministic demo' : `Proxy: ${proxyBaseURL}`

const documentText = ref(`Vue composables keep AI request state predictable.
Billing workflows need approval before charging a customer.
Reranking moves the most relevant search results to the top.
Audio generation turns release notes into spoken updates.`)

const {
  input,
  documents,
  rerankedDocuments,
  ranking,
  status,
  isLoading,
  error,
  lastRequest,
  lastResponse,
  setDocuments,
  handleSubmit,
  stop,
  clear
} = useRerank<string>({
  api: rerankApi,
  baseURL: proxyBaseURL,
  fetch: demoFetch,
  initialInput: 'How do I rank search results for Vue AI apps?',
  initialDocuments: splitDocuments(documentText.value),
  defaultRequest: {
    model: useLocalDemo ? 'local-rerank-demo' : 'rerank-model',
    topN: 3
  }
})

const rankedRows = computed(() =>
  rerankedDocuments.value.map((document, index) => ({
    document,
    score: ranking.value[index]?.score ?? 0,
    originalIndex: ranking.value[index]?.index ?? index
  }))
)

const traceSummary = computed(() => {
  if (!lastRequest.value) return 'No request yet.'
  return JSON.stringify(
    {
      api: lastRequest.value.api,
      query: lastRequest.value.query,
      documents: lastRequest.value.documents.length,
      top: lastResponse.value?.result.rerankedDocuments.length ?? 0
    },
    null,
    2
  )
})

function syncDocuments() {
  setDocuments(splitDocuments(documentText.value))
}

async function submit(event?: { preventDefault?: () => void }) {
  syncDocuments()
  await handleSubmit(event)
}

async function localRerankFetch(_url: RequestInfo | URL, init?: RequestInit) {
  const body = parseRequestBody(init?.body)
  const query = typeof body.query === 'string' ? body.query : ''
  const sourceDocuments = Array.isArray(body.documents) ? body.documents.map(String) : []
  const ranking = sourceDocuments
    .map((document, index) => ({
      index,
      score: localScore(query, document),
      document
    }))
    .sort((a, b) => b.score - a.score)
  const topN = typeof body.topN === 'number' && body.topN > 0 ? body.topN : ranking.length
  const limitedRanking = ranking.slice(0, topN)
  return new Response(
    JSON.stringify({
      originalDocuments: sourceDocuments,
      rerankedDocuments: limitedRanking.map((item) => item.document),
      ranking: limitedRanking,
      model: body.model || 'local-rerank-demo',
      providerMetadata: { provider: 'local-demo' }
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

function splitDocuments(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseRequestBody(body: BodyInit | null | undefined): Record<string, unknown> {
  if (typeof body !== 'string') return {}
  try {
    const parsed = JSON.parse(body)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function localScore(query: string, document: string) {
  const queryTerms = tokenize(query)
  const docTerms = new Set(tokenize(document))
  const overlap = queryTerms.filter((term) => docTerms.has(term)).length
  return Number((overlap + (Math.abs(hashText(`${query}:${document}`)) % 100) / 1000).toFixed(3))
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return hash
}
</script>

<template>
  <main class="rerank-demo">
    <header class="header">
      <div>
        <h1 class="title">vue-ai-hooks - useRerank</h1>
        <p class="mode">{{ modeLabel }}</p>
      </div>
      <span class="status">{{ status }}</span>
    </header>

    <form class="form" @submit="submit">
      <label class="field">
        Query
        <input v-model="input" class="input" />
      </label>
      <label class="field">
        Documents, one per line
        <textarea v-model="documentText" rows="7" class="textarea" @blur="syncDocuments" />
      </label>
      <div class="actions">
        <button class="button" type="submit" :disabled="isLoading || !documents.length">
          Rerank
        </button>
        <button class="button" type="button" :disabled="!isLoading" @click="stop">Stop</button>
        <button class="button" type="button" :disabled="isLoading" @click="clear">Clear</button>
      </div>
    </form>

    <p v-if="error" class="error">
      {{ error.message }}
    </p>

    <section class="layout">
      <div class="results">
        <h2 class="section-title">Reranked documents</h2>
        <ol v-if="rankedRows.length" class="ranking">
          <li v-for="row in rankedRows" :key="`${row.originalIndex}-${row.document}`">
            <span class="score">{{ row.score.toFixed(3) }}</span>
            <p>{{ row.document }}</p>
          </li>
        </ol>
        <p v-else class="empty">Run rerank to see ordered results.</p>
      </div>
      <aside class="details">
        <h2 class="section-title">Input</h2>
        <dl class="result-list">
          <div>
            <dt>Documents</dt>
            <dd>{{ documents.length }}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{{ lastResponse?.result.model || '-' }}</dd>
          </div>
        </dl>
        <h2 class="section-title">Trace</h2>
        <pre class="trace">{{ traceSummary }}</pre>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.rerank-demo {
  max-width: 960px;
  margin: 32px auto;
  padding: 0 16px;
  font-family: system-ui, sans-serif;
  color: #0f172a;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.title {
  margin: 0;
  font-size: 18px;
}

.mode {
  margin: 6px 0 0;
  color: #475569;
  font-size: 13px;
}

.status {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #334155;
  font-size: 12px;
}

.form {
  display: grid;
  gap: 12px;
  margin: 18px 0;
}

.field {
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.input,
.textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  color: #0f172a;
  font: inherit;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.button {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #0f766e;
  border-radius: 8px;
  background: #0f766e;
  color: white;
  font-weight: 700;
}

.button:disabled {
  border-color: #cbd5e1;
  background: #e2e8f0;
  color: #64748b;
}

.layout {
  display: grid;
  gap: 16px;
}

.results,
.details {
  padding: 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: white;
}

.section-title {
  margin: 0 0 12px;
  font-size: 15px;
}

.ranking {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 24px;
}

.ranking li {
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.ranking p {
  margin: 6px 0 0;
  line-height: 1.55;
}

.score {
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
}

.result-list {
  display: grid;
  gap: 8px;
  margin: 0 0 16px;
}

.result-list div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.result-list dt {
  color: #475569;
  font-size: 13px;
}

.result-list dd {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.trace {
  overflow: auto;
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
}

.empty,
.error {
  margin: 0;
}

.error {
  color: #b00020;
}

@media (min-width: 760px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
}
</style>
