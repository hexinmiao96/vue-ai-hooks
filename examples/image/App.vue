<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import {
  createPromptSuggestionRecipes,
  useImage,
  usePromptSuggestions,
  type GeneratedImage,
  type PromptSuggestionInput
} from 'vue-ai-hooks'

type DemoMode = 'generate' | 'edit'
type ImageStarterMetadata = { surface: string; mode?: DemoMode }

const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const imageApi = import.meta.env.VITE_PROXY_IMAGE_URL || '/api/image'
const useLocalDemo = !proxyBaseURL
const demoFetch = useLocalDemo ? localImageFetch : undefined
const modeLabel = useLocalDemo ? 'Local deterministic demo' : `Proxy: ${proxyBaseURL}`
const generatePrompt = 'A clean Vue composable dashboard hero image'
const editPrompt = 'Replace the card background with a calm product workspace'
const imageStarterSuggestions: PromptSuggestionInput<ImageStarterMetadata>[] = [
  ...createPromptSuggestionRecipes<ImageStarterMetadata>({
    surfaces: ['media'],
    include: ['draft-media-prompt'],
    metadata: { surface: 'vue-image-demo' }
  }),
  {
    id: 'vue-image-dashboard',
    title: 'Dashboard hero',
    prompt: generatePrompt,
    description: 'Generate a deterministic product dashboard image.',
    metadata: { surface: 'vue-image-demo', mode: 'generate' }
  },
  {
    id: 'vue-image-launch',
    title: 'Launch visual',
    prompt: 'A minimalist product launch hero with crisp interface details',
    description: 'Try a clean generation prompt with UI context.',
    metadata: { surface: 'vue-image-demo', mode: 'generate' }
  },
  {
    id: 'vue-image-workspace-edit',
    title: 'Workspace edit',
    prompt: editPrompt,
    description: 'Switch to edit mode and update the source image.',
    metadata: { surface: 'vue-image-demo', mode: 'edit' }
  }
]
const mode = shallowRef<DemoMode>('generate')
const editSourceImage: GeneratedImage = {
  url: svgDataUrl('Source image for useImage editing', 'source'),
  mediaType: 'image/svg+xml',
  revisedPrompt: 'Source image for useImage editing'
}
const editMask = svgMaskDataUrl()

const {
  input,
  image,
  images,
  status,
  isLoading,
  error,
  lastRequest,
  lastResponse,
  editImage,
  handleSubmit,
  stop,
  clear
} = useImage({
  api: imageApi,
  baseURL: proxyBaseURL,
  fetch: demoFetch,
  initialInput: generatePrompt,
  defaultRequest: {
    model: useLocalDemo ? 'local-svg-demo' : 'image-model',
    size: '1024x1024',
    aspectRatio: '1:1'
  }
})

const { visibleSuggestions: visibleImageStarters, selectSuggestion: selectImageStarter } =
  usePromptSuggestions({
    suggestions: imageStarterSuggestions,
    input,
    max: 4,
    filter: showAllSuggestions
  })

const previewUrl = computed(() => {
  if (image.value?.url) return image.value.url
  if (image.value?.base64) {
    return `data:${image.value.mediaType || 'image/png'};base64,${image.value.base64}`
  }
  return ''
})

const sourceImageUrl = computed(() => editSourceImage.url || '')
const previewAlt = computed(() =>
  mode.value === 'edit' ? 'Edited image result' : 'Generated image result'
)
const submitLabel = computed(() => (mode.value === 'edit' ? 'Edit image' : 'Generate image'))

const traceSummary = computed(() => {
  if (!lastRequest.value) return 'No request yet.'
  return JSON.stringify(
    {
      api: lastRequest.value.api,
      operation: lastRequest.value.operation,
      prompt: lastRequest.value.prompt,
      model: lastRequest.value.request.model,
      size: lastRequest.value.request.size,
      sourceImage: lastRequest.value.request.image ? 'provided' : '-',
      images: lastResponse.value?.result.images.length ?? 0
    },
    null,
    2
  )
})

function applyImageStarter(id: string) {
  const selected = selectImageStarter(id)
  if (!selected) return

  const starterMode = selected.metadata?.mode
  if (starterMode === 'generate' || starterMode === 'edit') {
    mode.value = starterMode
  }
  input.value = selected.prompt
}

function setMode(nextMode: DemoMode) {
  const previousDefault = mode.value === 'edit' ? editPrompt : generatePrompt
  const nextDefault = nextMode === 'edit' ? editPrompt : generatePrompt
  mode.value = nextMode
  if (!input.value || input.value === previousDefault) {
    input.value = nextDefault
  }
}

async function submitImage(event?: { preventDefault?: () => void }) {
  if (mode.value === 'generate') {
    await handleSubmit(event)
    return
  }

  event?.preventDefault?.()
  await editImage(input.value, {
    image: editSourceImage,
    mask: editMask,
    model: useLocalDemo ? 'local-image-edit-demo' : 'image-edit-model',
    size: '1024x1024',
    body: { workflow: 'image-edit-demo' }
  })
  input.value = ''
}

function clearDemo() {
  clear()
  input.value = mode.value === 'edit' ? editPrompt : generatePrompt
}

async function localImageFetch(_url: RequestInfo | URL, init?: RequestInit) {
  const body = parseRequestBody(init?.body)
  const prompt = typeof body.prompt === 'string' ? body.prompt : 'Vue AI Hooks'
  const operation = body.operation === 'edit' ? 'edit' : 'generate'
  const imageUrl = svgDataUrl(prompt, operation)
  const model =
    typeof body.model === 'string'
      ? body.model
      : operation === 'edit'
        ? 'local-image-edit-demo'
        : 'local-svg-demo'
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
      model,
      providerMetadata: {
        operation,
        provider: 'local-demo'
      }
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

function svgDataUrl(prompt: string, kind: 'generate' | 'edit' | 'source' = 'generate') {
  const normalized = prompt.replace(/\s+/g, ' ').trim() || 'Vue AI Hooks'
  const shortPrompt = normalized.length > 82 ? `${normalized.slice(0, 79)}...` : normalized
  const hue = Math.abs(hashText(normalized)) % 360
  const title =
    kind === 'edit' ? 'useImage edit' : kind === 'source' ? 'source image' : 'useImage generate'
  const accentHue = kind === 'edit' ? (hue + 28) % 360 : kind === 'source' ? 168 : hue
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="hsl(${accentHue} 78% 48%)"/>
      <stop offset="100%" stop-color="hsl(${(accentHue + 56) % 360} 72% 42%)"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="64" fill="url(#bg)"/>
  <rect x="96" y="122" width="832" height="780" rx="42" fill="rgba(255,255,255,0.86)"/>
  <text x="144" y="228" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="700">${title}</text>
  <text x="144" y="320" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="30">${escapeSvg(shortPrompt)}</text>
  <circle cx="780" cy="690" r="118" fill="hsl(${(accentHue + 150) % 360} 82% 48%)"/>
  <rect x="144" y="520" width="420" height="34" rx="17" fill="#0f172a"/>
  <rect x="144" y="590" width="560" height="26" rx="13" fill="#475569"/>
  <rect x="144" y="650" width="480" height="26" rx="13" fill="#64748b"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function svgMaskDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="black"/>
  <circle cx="756" cy="672" r="172" fill="white"/>
  <rect x="122" y="494" width="560" height="210" rx="36" fill="white"/>
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

function showAllSuggestions() {
  return true
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

    <div class="segments" role="tablist" aria-label="Image operation">
      <button
        class="segment"
        :class="{ 'segment-active': mode === 'generate' }"
        type="button"
        :aria-pressed="mode === 'generate'"
        @click="setMode('generate')"
      >
        Generate
      </button>
      <button
        class="segment"
        :class="{ 'segment-active': mode === 'edit' }"
        type="button"
        :aria-pressed="mode === 'edit'"
        @click="setMode('edit')"
      >
        Edit
      </button>
    </div>

    <form class="form" @submit="submitImage">
      <label class="field">
        Prompt
        <textarea v-model="input" rows="4" class="textarea" />
      </label>
      <div class="starter-grid" aria-label="Image prompt starters">
        <button
          v-for="suggestion in visibleImageStarters"
          :key="suggestion.id"
          class="starter-button"
          type="button"
          :disabled="isLoading"
          @click="applyImageStarter(suggestion.id)"
        >
          <span>{{ suggestion.title }}</span>
          <small v-if="suggestion.description">{{ suggestion.description }}</small>
        </button>
      </div>
      <section v-if="mode === 'edit'" class="source-panel" aria-label="Image edit source">
        <div class="source-frame">
          <img class="source-image" :src="sourceImageUrl" alt="Edit source" />
        </div>
        <dl class="source-list">
          <div>
            <dt>Source</dt>
            <dd>Normalized image object</dd>
          </div>
          <div>
            <dt>Mask</dt>
            <dd>Data URL</dd>
          </div>
        </dl>
      </section>
      <div class="actions">
        <button class="button" type="submit" :disabled="isLoading">{{ submitLabel }}</button>
        <button class="button" type="button" :disabled="!isLoading" @click="stop">Stop</button>
        <button class="button" type="button" :disabled="isLoading" @click="clearDemo">Clear</button>
      </div>
    </form>

    <p v-if="error" class="error">
      {{ error.message }}
    </p>

    <section class="preview">
      <div class="preview-frame">
        <img v-if="previewUrl" class="preview-image" :src="previewUrl" :alt="previewAlt" />
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
            <dt>Operation</dt>
            <dd>{{ lastRequest?.operation || mode }}</dd>
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

.segments {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(96px, 1fr));
  gap: 2px;
  margin-top: 18px;
  padding: 3px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.segment {
  min-height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.segment-active {
  background: #0f172a;
  color: #f8fafc;
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

.starter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
}

.starter-button {
  display: grid;
  gap: 5px;
  align-content: start;
  min-height: 70px;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.starter-button span {
  font-size: 13px;
  font-weight: 800;
}

.starter-button small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
}

.starter-button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.source-panel {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.source-frame {
  display: grid;
  width: 112px;
  aspect-ratio: 1;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
}

.source-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.source-list {
  display: grid;
  gap: 6px;
  margin: 0;
}

.source-list div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
}

.source-list dt {
  color: #64748b;
}

.source-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
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

@media (max-width: 520px) {
  .source-panel {
    grid-template-columns: 1fr;
  }

  .source-frame {
    width: min(100%, 180px);
  }
}
</style>
