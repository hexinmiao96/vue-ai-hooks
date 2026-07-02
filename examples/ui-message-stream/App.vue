<script setup lang="ts">
import { computed, ref } from 'vue'
import { readUIMessageStream } from 'vue-ai-hooks'
import type { ChatChunk } from 'vue-ai-hooks'

type StreamRecord = {
  summary: string
  raw: string
}

const endpoint = ref('/api/ui-message-stream')
const prompt = ref('Ship a migration path from an AI SDK UI stream route to vue-ai-hooks.')
const isLoading = ref(false)
const status = ref('Ready')
const errorText = ref('')
const streamText = ref('')
const records = ref<StreamRecord[]>([])
const dataParts = ref<string[]>([])
const responseMeta = ref<{
  status: number
  statusText: string
  contentType: string
  requestId: string
} | null>(null)
const abortController = ref<AbortController | null>(null)

const requestPayload = computed(() =>
  JSON.stringify(
    {
      messages: [
        {
          role: 'user',
          content: prompt.value
        }
      ]
    },
    null,
    2
  )
)

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function summarizeChunk(chunk: ChatChunk): string {
  if (typeof chunk.content === 'string') return `text: ${chunk.content}`
  if (typeof chunk.dataType === 'string') {
    return `${chunk.dataType}${chunk.dataId ? ` (${chunk.dataId})` : ''}`
  }
  if (typeof chunk.finishReason === 'string') return `finish: ${chunk.finishReason}`
  if (Array.isArray(chunk.toolCalls) && chunk.toolCalls.length > 0)
    return `tool-calls: ${chunk.toolCalls.length}`
  if (typeof chunk.messageId === 'string') return `message: ${chunk.messageId}`

  return 'metadata-only chunk'
}

function reset() {
  status.value = 'Ready'
  errorText.value = ''
  streamText.value = ''
  records.value = []
  dataParts.value = []
  responseMeta.value = null
}

function recordChunk(chunk: ChatChunk) {
  records.value.push({ summary: summarizeChunk(chunk), raw: formatJson(chunk) })

  if (typeof chunk.content === 'string' && chunk.content.length > 0) {
    streamText.value += chunk.content
  }

  if (typeof chunk.dataType === 'string') {
    dataParts.value.push(`${chunk.dataType}: ${formatJson(chunk.data)}`)
  }
}

async function run(event?: Event) {
  event?.preventDefault()
  reset()

  const message = prompt.value.trim()
  if (!message) {
    errorText.value = 'Please enter a prompt first.'
    return
  }

  isLoading.value = true
  const controller = new AbortController()
  abortController.value = controller
  status.value = 'Requesting stream'

  try {
    const response = await fetch(endpoint.value, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: message }] }),
      signal: controller.signal
    })

    responseMeta.value = {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type') || 'not set',
      requestId: response.headers.get('x-request-id') || 'n/a'
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('No response stream body returned.')
    }

    status.value = 'Reading UI message chunks'

    for await (const chunk of readUIMessageStream({ response, signal: controller.signal })) {
      recordChunk(chunk)
    }

    status.value = 'Stream complete'
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      status.value = 'Stream cancelled'
      return
    }
    errorText.value = error instanceof Error ? error.message : 'Stream failed unexpectedly.'
    status.value = 'Error'
  } finally {
    isLoading.value = false
    abortController.value = null
  }
}

function stop() {
  abortController.value?.abort()
}
</script>

<template>
  <main class="ui-message-stream-demo">
    <h1>AI SDK UI stream migration demo</h1>
    <p>
      This demo keeps the browser side deterministic: it posts to a UI stream endpoint, then decodes
      chunks with <code>readUIMessageStream()</code>.
    </p>

    <form class="panel" @submit="run">
      <label>
        Endpoint
        <input v-model="endpoint" type="text" />
      </label>

      <label>
        Prompt
        <textarea
          v-model="prompt"
          rows="3"
          placeholder="Describe what should be in the stream response"
        />
      </label>

      <div class="actions">
        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Reading…' : 'Run migration check' }}
        </button>
        <button type="button" :disabled="!isLoading" @click="stop">Cancel</button>
        <button type="button" @click="reset">Clear</button>
      </div>
    </form>

    <p class="status">Status: {{ status }}</p>

    <p v-if="errorText" class="error">{{ errorText }}</p>

    <section class="panel">
      <h2>Request payload</h2>
      <pre>{{ requestPayload }}</pre>
    </section>

    <section v-if="responseMeta" class="panel">
      <h2>Response metadata</h2>
      <pre>{{ JSON.stringify(responseMeta, null, 2) }}</pre>
    </section>

    <section v-if="streamText" class="panel">
      <h2>Assembled text</h2>
      <p class="assistant-text">{{ streamText || 'No text chunks yet.' }}</p>
    </section>

    <section class="panel">
      <h2>Decoded chunks</h2>
      <ol class="chunk-list">
        <li v-for="item in records" :key="item.summary + item.raw">
          <p>{{ item.summary }}</p>
          <pre>{{ item.raw }}</pre>
        </li>
        <li v-if="records.length === 0">No chunks yet. Run the demo to decode the stream.</li>
      </ol>
    </section>

    <section v-if="dataParts.length" class="panel">
      <h2>Data parts</h2>
      <ul>
        <li v-for="item in dataParts" :key="item">{{ item }}</li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.ui-message-stream-demo {
  max-width: 860px;
  margin: 24px auto;
  padding: 0 12px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

h1 {
  margin-bottom: 8px;
}

form {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.status {
  margin: 0 0 8px;
  font-size: 14px;
}

.error {
  color: #b91c1c;
}

.assistant-text {
  white-space: pre-wrap;
  line-height: 1.5;
  margin: 0;
}

label {
  display: grid;
  gap: 4px;
  font-size: 14px;
}

input,
textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px;
  font: inherit;
}

textarea {
  resize: vertical;
}

.actions {
  display: flex;
  gap: 8px;
}

button {
  border: 1px solid #1f2937;
  border-radius: 6px;
  background: white;
  padding: 8px 12px;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8fafc;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.chunk-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
}

.chunk-list li {
  display: grid;
  gap: 4px;
}
</style>
