<script setup lang="ts">
import { computed } from 'vue'
import { useImage } from 'vue-ai-hooks'

const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const imageApi = import.meta.env.VITE_PROXY_IMAGE_URL || '/api/image'
const useLocalDemo = !proxyBaseURL
const demoFetch = useLocalDemo ? localImageFetch : undefined
const modeLabel = useLocalDemo ? 'Local deterministic demo' : `Proxy: ${proxyBaseURL}`

const {
  input,
  image,
  images,
  status,
  isLoading,
  error,
  lastRequest,
  lastResponse,
  handleSubmit,
  stop,
  clear
} = useImage({
  api: imageApi,
  baseURL: proxyBaseURL,
  fetch: demoFetch,
  initialInput: 'A clean Vue composable dashboard hero image',
  defaultRequest: {
    model: useLocalDemo ? 'local-svg-demo' : 'image-model',
    size: '1024x1024',
    aspectRatio: '1:1'
  }
})

const previewUrl = computed(() => {
  if (image.value?.url) return image.value.url
  if (image.value?.base64) {
    return `data:${image.value.mediaType || 'image/png'};base64,${image.value.base64}`
  }
  return ''
})

const traceSummary = computed(() => {
  if (!lastRequest.value) return 'No request yet.'
  return JSON.stringify(
    {
      api: lastRequest.value.api,
      prompt: lastRequest.value.prompt,
      model: lastRequest.value.request.model,
      size: lastRequest.value.request.size,
      images: lastResponse.value?.result.images.length ?? 0
    },
    null,
    2
  )
})

async function localImageFetch(_url: RequestInfo | URL, init?: RequestInit) {
  const body = parseRequestBody(init?.body)
  const prompt = typeof body.prompt === 'string' ? body.prompt : 'Vue AI Hooks'
  const imageUrl = svgDataUrl(prompt)
  return new Response(
    JSON.stringify({
      image: {
        url: imageUrl,
        mediaType: 'image/svg+xml',
        revisedPrompt: prompt
      },
      images: [
        {
          url: imageUrl,
          mediaType: 'image/svg+xml',
          revisedPrompt: prompt
        }
      ],
      model: body.model || 'local-svg-demo',
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

function svgDataUrl(prompt: string) {
  const normalized = prompt.replace(/\s+/g, ' ').trim() || 'Vue AI Hooks'
  const shortPrompt = normalized.length > 82 ? `${normalized.slice(0, 79)}...` : normalized
  const hue = Math.abs(hashText(normalized)) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 78% 48%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 56) % 360} 72% 42%)"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="64" fill="url(#bg)"/>
  <rect x="96" y="122" width="832" height="780" rx="42" fill="rgba(255,255,255,0.86)"/>
  <text x="144" y="228" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="700">useImage demo</text>
  <text x="144" y="320" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="30">${escapeSvg(shortPrompt)}</text>
  <circle cx="780" cy="690" r="118" fill="hsl(${(hue + 150) % 360} 82% 48%)"/>
  <rect x="144" y="520" width="420" height="34" rx="17" fill="#0f172a"/>
  <rect x="144" y="590" width="560" height="26" rx="13" fill="#475569"/>
  <rect x="144" y="650" width="480" height="26" rx="13" fill="#64748b"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return hash
}

function escapeSvg(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
</script>

<template>
  <main class="image-demo">
    <header class="header">
      <div>
        <h1 class="title">vue-ai-hooks - useImage</h1>
        <p class="mode">{{ modeLabel }}</p>
      </div>
      <span class="status">{{ status }}</span>
    </header>

    <form class="form" @submit="handleSubmit">
      <label class="field">
        Prompt
        <textarea v-model="input" rows="4" class="textarea" />
      </label>
      <div class="actions">
        <button class="button" type="submit" :disabled="isLoading">Generate image</button>
        <button class="button" type="button" :disabled="!isLoading" @click="stop">Stop</button>
        <button class="button" type="button" :disabled="isLoading" @click="clear">Clear</button>
      </div>
    </form>

    <p v-if="error" class="error">
      {{ error.message }}
    </p>

    <section class="preview">
      <div class="preview-frame">
        <img v-if="previewUrl" class="preview-image" :src="previewUrl" alt="Generated result" />
        <p v-else class="empty">No image yet.</p>
      </div>
      <aside class="details">
        <h2 class="section-title">Result</h2>
        <dl class="result-list">
          <div>
            <dt>Images</dt>
            <dd>{{ images.length }}</dd>
          </div>
          <div>
            <dt>Media type</dt>
            <dd>{{ image?.mediaType || '-' }}</dd>
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
.image-demo {
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

.preview-frame,
.details {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.preview-frame {
  display: grid;
  min-height: 320px;
  place-items: center;
  padding: 12px;
}

.preview-image {
  display: block;
  width: min(100%, 520px);
  aspect-ratio: 1;
  border-radius: 8px;
  object-fit: cover;
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

.section-title {
  margin: 0;
  font-size: 14px;
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
