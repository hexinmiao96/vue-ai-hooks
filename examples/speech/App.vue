<script setup lang="ts">
import { computed } from 'vue'
import { useSpeech } from 'vue-ai-hooks'

const silentWavBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const speechApi = import.meta.env.VITE_PROXY_SPEECH_URL || '/api/speech'
const useLocalDemo = !proxyBaseURL
const demoFetch = useLocalDemo ? localSpeechFetch : undefined
const modeLabel = useLocalDemo ? 'Local deterministic demo' : `Proxy: ${proxyBaseURL}`

const {
  input,
  audio,
  result,
  status,
  isLoading,
  error,
  lastRequest,
  lastResponse,
  handleSubmit,
  stop,
  clear
} = useSpeech({
  api: speechApi,
  baseURL: proxyBaseURL,
  fetch: demoFetch,
  initialInput: 'Read this release note aloud for the product team.',
  defaultRequest: {
    model: useLocalDemo ? 'local-wav-demo' : 'speech-model',
    voice: 'alloy',
    outputFormat: 'wav'
  }
})

const audioUrl = computed(() => {
  if (audio.value?.url) return audio.value.url
  if (audio.value?.base64) {
    return `data:${audio.value.mediaType || 'audio/wav'};base64,${audio.value.base64}`
  }
  return ''
})

const traceSummary = computed(() => {
  if (!lastRequest.value) return 'No request yet.'
  return JSON.stringify(
    {
      api: lastRequest.value.api,
      text: lastRequest.value.text,
      model: lastRequest.value.request.model,
      voice: lastRequest.value.request.voice,
      mediaType: lastResponse.value?.result.audio?.mediaType ?? null
    },
    null,
    2
  )
})

async function localSpeechFetch(_url: RequestInfo | URL, init?: RequestInit) {
  const body = parseRequestBody(init?.body)
  const text = typeof body.text === 'string' ? body.text : 'Vue AI Hooks speech demo'
  return new Response(
    JSON.stringify({
      audio: {
        url: `data:audio/wav;base64,${silentWavBase64}`,
        mediaType: 'audio/wav',
        revisedText: text,
        durationInSeconds: 0,
        metadata: { seed: hashText(text) }
      },
      model: body.model || 'local-wav-demo',
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

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}
</script>

<template>
  <main class="speech-demo">
    <header class="header">
      <div>
        <h1 class="title">vue-ai-hooks - useSpeech</h1>
        <p class="mode">{{ modeLabel }}</p>
      </div>
      <span class="status">{{ status }}</span>
    </header>

    <form class="form" @submit="handleSubmit">
      <label class="field">
        Text
        <textarea v-model="input" rows="4" class="textarea" />
      </label>
      <div class="actions">
        <button class="button" type="submit" :disabled="isLoading">Generate speech</button>
        <button class="button" type="button" :disabled="!isLoading" @click="stop">Stop</button>
        <button class="button" type="button" :disabled="isLoading" @click="clear">Clear</button>
      </div>
    </form>

    <p v-if="error" class="error">
      {{ error.message }}
    </p>

    <section class="preview">
      <div class="player-panel">
        <h2 class="section-title">Generated audio</h2>
        <div class="wave" aria-hidden="true">
          <span v-for="index in 28" :key="index" :style="{ height: `${12 + (index % 7) * 7}px` }" />
        </div>
        <audio v-if="audioUrl" class="player" controls :src="audioUrl" />
        <p v-else class="empty">No audio yet.</p>
      </div>
      <aside class="details">
        <h2 class="section-title">Result</h2>
        <dl class="result-list">
          <div>
            <dt>Media type</dt>
            <dd>{{ audio?.mediaType || '-' }}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{{ result?.model || '-' }}</dd>
          </div>
          <div>
            <dt>Revised text</dt>
            <dd>{{ audio?.revisedText || '-' }}</dd>
          </div>
        </dl>
        <h2 class="section-title">Trace</h2>
        <pre class="trace">{{ traceSummary }}</pre>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.speech-demo {
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

.player-panel,
.details {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.player-panel {
  display: grid;
  gap: 14px;
  align-content: center;
  min-height: 280px;
  padding: 18px;
}

.section-title {
  margin: 0;
  font-size: 14px;
}

.wave {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 76px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
}

.wave span {
  display: block;
  width: 8px;
  border-radius: 999px;
  background: #2563eb;
}

.player {
  width: 100%;
}

.empty {
  color: #64748b;
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
