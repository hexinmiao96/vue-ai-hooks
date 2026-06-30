<script setup lang="ts">
import { computed } from 'vue'
import { useTranscription } from 'vue-ai-hooks'

const sampleAudioUrl =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const transcriptionApi = import.meta.env.VITE_PROXY_TRANSCRIPTION_URL || '/api/transcription'
const useLocalDemo = !proxyBaseURL
const demoFetch = useLocalDemo ? localTranscriptionFetch : undefined
const modeLabel = useLocalDemo ? 'Local deterministic demo' : `Proxy: ${proxyBaseURL}`

const {
  input,
  transcription,
  result,
  status,
  isLoading,
  error,
  lastRequest,
  lastResponse,
  handleSubmit,
  stop,
  clear
} = useTranscription({
  api: transcriptionApi,
  baseURL: proxyBaseURL,
  fetch: demoFetch,
  initialInput: sampleAudioUrl,
  defaultRequest: {
    model: useLocalDemo ? 'local-transcription-demo' : 'transcription-model',
    language: 'en'
  }
})

const traceSummary = computed(() => {
  if (!lastRequest.value) return 'No request yet.'
  return JSON.stringify(
    {
      api: lastRequest.value.api,
      audio: summarizeAudio(lastRequest.value.audio),
      model: lastRequest.value.request.model,
      language: lastRequest.value.request.language,
      text: lastResponse.value?.result.text ?? null
    },
    null,
    2
  )
})

async function localTranscriptionFetch(_url: RequestInfo | URL, init?: RequestInit) {
  const body = parseRequestBody(init?.body)
  const audio = typeof body.audio === 'string' ? body.audio : sampleAudioUrl
  return new Response(
    JSON.stringify({
      text: `Local transcript for ${summarizeAudio(audio)}.`,
      language: body.language || 'en',
      durationInSeconds: 0,
      model: body.model || 'local-transcription-demo',
      providerMetadata: { provider: 'local-demo' }
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  )
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

function summarizeAudio(audio: string) {
  if (audio.startsWith('data:audio/')) return 'inline audio payload'
  return audio.length > 54 ? `${audio.slice(0, 51)}...` : audio
}
</script>

<template>
  <main class="transcription-demo">
    <header class="header">
      <div>
        <h1 class="title">vue-ai-hooks - useTranscription</h1>
        <p class="mode">{{ modeLabel }}</p>
      </div>
      <span class="status">{{ status }}</span>
    </header>

    <form class="form" @submit="handleSubmit">
      <label class="field">
        Audio URL or data URL
        <textarea v-model="input" rows="4" class="textarea" />
      </label>
      <div class="actions">
        <button class="button" type="submit" :disabled="isLoading">Transcribe</button>
        <button class="button" type="button" :disabled="!isLoading" @click="stop">Stop</button>
        <button class="button" type="button" :disabled="isLoading" @click="clear">Clear</button>
      </div>
    </form>

    <p v-if="error" class="error">
      {{ error.message }}
    </p>

    <section class="preview">
      <article class="transcript-panel">
        <h2 class="section-title">Transcript</h2>
        <p class="transcript">
          {{ transcription || 'No transcript yet.' }}
        </p>
      </article>
      <aside class="details">
        <h2 class="section-title">Result</h2>
        <dl class="result-list">
          <div>
            <dt>Language</dt>
            <dd>{{ result?.language || '-' }}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{{ result?.model || '-' }}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{{ result?.durationInSeconds ?? '-' }}</dd>
          </div>
        </dl>
        <h2 class="section-title">Trace</h2>
        <pre class="trace">{{ traceSummary }}</pre>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.transcription-demo {
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

.textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
  resize: vertical;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.error {
  color: #b00020;
}

.preview {
  display: grid;
  gap: 16px;
}

.transcript-panel,
.details {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.transcript-panel {
  display: grid;
  gap: 12px;
  align-content: start;
  min-height: 280px;
  padding: 18px;
}

.section-title {
  margin: 0;
  font-size: 14px;
}

.transcript {
  margin: 0;
  color: #334155;
  font-size: 15px;
  line-height: 1.7;
}

.details {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 14px;
}

.result-list {
  display: grid;
  gap: 8px;
  margin: 0;
}

.result-list div {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px;
}

.result-list dt {
  color: #64748b;
}

.result-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.trace {
  overflow: auto;
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.5;
}

@media (min-width: 760px) {
  .preview {
    grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  }
}
</style>
