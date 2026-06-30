<script setup lang="ts">
import { computed } from 'vue'
import { useVideo } from 'vue-ai-hooks'

const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const videoApi = import.meta.env.VITE_PROXY_VIDEO_URL || '/api/video'
const useLocalDemo = !proxyBaseURL
const demoFetch = useLocalDemo ? localVideoFetch : undefined
const modeLabel = useLocalDemo ? 'Local deterministic storyboard' : `Proxy: ${proxyBaseURL}`

const {
  input,
  video,
  videos,
  status,
  isLoading,
  error,
  lastRequest,
  lastResponse,
  handleSubmit,
  stop,
  clear
} = useVideo({
  api: videoApi,
  baseURL: proxyBaseURL,
  fetch: demoFetch,
  initialInput: 'A concise product walkthrough for a Vue AI dashboard',
  defaultRequest: {
    model: useLocalDemo ? 'local-storyboard-demo' : 'video-model',
    aspectRatio: '16:9',
    resolution: '1280x720',
    duration: 6,
    fps: 24
  }
})

const previewUrl = computed(() => {
  if (video.value?.url) return video.value.url
  if (video.value?.base64) {
    return `data:${video.value.mediaType || 'video/mp4'};base64,${video.value.base64}`
  }
  return ''
})

const isPlayableVideo = computed(() => video.value?.mediaType?.startsWith('video/') ?? false)

const traceSummary = computed(() => {
  if (!lastRequest.value) return 'No request yet.'
  return JSON.stringify(
    {
      api: lastRequest.value.api,
      prompt: lastRequest.value.prompt,
      model: lastRequest.value.request.model,
      resolution: lastRequest.value.request.resolution,
      duration: lastRequest.value.request.duration,
      videos: lastResponse.value?.result.videos.length ?? 0
    },
    null,
    2
  )
})

async function localVideoFetch(_url: RequestInfo | URL, init?: RequestInit) {
  const body = parseRequestBody(init?.body)
  const prompt = typeof body.prompt === 'string' ? body.prompt : 'Vue AI Hooks video demo'
  const videoUrl = storyboardDataUrl(prompt)
  return new Response(
    JSON.stringify({
      video: {
        url: videoUrl,
        mediaType: 'image/svg+xml',
        durationInSeconds: Number(body.duration) || 6,
        metadata: { seed: hashText(prompt), localPreview: 'storyboard' }
      },
      videos: [
        {
          url: videoUrl,
          mediaType: 'image/svg+xml',
          durationInSeconds: Number(body.duration) || 6,
          metadata: { seed: hashText(prompt), localPreview: 'storyboard' }
        }
      ],
      model: body.model || 'local-storyboard-demo',
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

function storyboardDataUrl(prompt: string) {
  const normalized = prompt.replace(/\s+/g, ' ').trim() || 'Vue AI Hooks'
  const shortPrompt = normalized.length > 76 ? `${normalized.slice(0, 73)}...` : normalized
  const hue = Math.abs(hashText(normalized)) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" rx="36" fill="#0f172a"/>
  <rect x="52" y="52" width="1176" height="616" rx="30" fill="#f8fafc"/>
  <text x="88" y="124" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700">useVideo demo storyboard</text>
  <text x="88" y="182" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="24">${escapeSvg(shortPrompt)}</text>
  <g transform="translate(88 248)">
    <rect width="310" height="232" rx="22" fill="hsl(${hue} 76% 45%)"/>
    <rect x="32" y="42" width="182" height="22" rx="11" fill="#ffffff"/>
    <rect x="32" y="92" width="236" height="16" rx="8" fill="rgba(255,255,255,0.72)"/>
    <circle cx="238" cy="164" r="42" fill="hsl(${(hue + 150) % 360} 82% 52%)"/>
  </g>
  <g transform="translate(486 248)">
    <rect width="310" height="232" rx="22" fill="hsl(${(hue + 42) % 360} 72% 45%)"/>
    <path d="M116 68 L226 116 L116 164 Z" fill="#ffffff"/>
    <rect x="42" y="184" width="226" height="14" rx="7" fill="rgba(255,255,255,0.78)"/>
  </g>
  <g transform="translate(884 248)">
    <rect width="310" height="232" rx="22" fill="hsl(${(hue + 92) % 360} 68% 42%)"/>
    <rect x="40" y="54" width="230" height="24" rx="12" fill="#ffffff"/>
    <rect x="40" y="112" width="170" height="18" rx="9" fill="rgba(255,255,255,0.72)"/>
    <rect x="40" y="160" width="210" height="18" rx="9" fill="rgba(255,255,255,0.58)"/>
  </g>
  <rect x="88" y="560" width="820" height="20" rx="10" fill="#cbd5e1"/>
  <rect x="88" y="560" width="420" height="20" rx="10" fill="#0f172a"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
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
  <main class="video-demo">
    <header class="header">
      <div>
        <h1 class="title">vue-ai-hooks - useVideo</h1>
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
        <button class="button" type="submit" :disabled="isLoading">Generate video</button>
        <button class="button" type="button" :disabled="!isLoading" @click="stop">Stop</button>
        <button class="button" type="button" :disabled="isLoading" @click="clear">Clear</button>
      </div>
    </form>

    <p v-if="error" class="error">
      {{ error.message }}
    </p>

    <section class="preview">
      <div class="preview-frame">
        <video
          v-if="previewUrl && isPlayableVideo"
          class="preview-video"
          controls
          playsinline
          :src="previewUrl"
        />
        <img
          v-else-if="previewUrl"
          class="preview-image"
          :src="previewUrl"
          alt="Generated video storyboard"
        />
        <p v-else class="empty">No video yet.</p>
      </div>
      <aside class="details">
        <h2 class="section-title">Result</h2>
        <dl class="result-list">
          <div>
            <dt>Videos</dt>
            <dd>{{ videos.length }}</dd>
          </div>
          <div>
            <dt>Media type</dt>
            <dd>{{ video?.mediaType || '-' }}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{{ video?.durationInSeconds ?? '-' }}</dd>
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
.video-demo {
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
  place-items: center;
  min-height: 320px;
  overflow: hidden;
  background: #f8fafc;
}

.preview-video,
.preview-image {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 460px;
  object-fit: contain;
}

.empty {
  color: #64748b;
}

.details {
  padding: 16px;
}

.section-title {
  margin: 0 0 10px;
  font-size: 14px;
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
  color: #64748b;
}

.result-list dd {
  margin: 0;
  text-align: right;
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

@media (min-width: 840px) {
  .preview {
    grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.8fr);
  }
}
</style>
