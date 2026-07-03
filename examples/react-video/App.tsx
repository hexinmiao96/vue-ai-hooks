import { useCallback, useMemo, useState } from 'react'
import { inspectRequestTrace } from 'vue-ai-hooks'
import { createPromptSuggestionRecipes, usePromptSuggestions, useVideo } from 'vue-ai-hooks/react'

const samplePrompts = [
  {
    id: 'react-video-walkthrough',
    title: 'Product walkthrough',
    prompt: 'A concise product walkthrough for a React AI dashboard',
    description: 'Generate a concise product storyboard.',
    metadata: { surface: 'react-video-demo' }
  },
  {
    id: 'react-video-launch',
    title: 'Feature launch',
    prompt: 'A three-scene launch video for an analytics feature',
    description: 'Try a release-style storyboard.',
    metadata: { surface: 'react-video-demo' }
  },
  {
    id: 'react-video-onboarding',
    title: 'Onboarding flow',
    prompt: 'A calm onboarding sequence for a support workspace',
    description: 'Create a softer user education sequence.',
    metadata: { surface: 'react-video-demo' }
  }
]

const mediaRecipePrompts = createPromptSuggestionRecipes({
  surfaces: ['media'],
  include: ['draft-media-prompt'],
  metadata: { surface: 'react-video-demo' }
})
const videoStarterPrompts = [...mediaRecipePrompts, ...samplePrompts]
const initialPrompt = 'A concise product walkthrough for a React AI dashboard'

const useProxyMode = import.meta.env.VITE_EXAMPLE_PROVIDER === 'proxy'
const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const videoApi = import.meta.env.VITE_PROXY_VIDEO_URL || '/api/video'
const useLocalDemo = !useProxyMode || !proxyBaseURL
const modeLabel = useLocalDemo ? 'Local deterministic storyboard' : `Proxy: ${proxyBaseURL}`
const showAllSuggestions = () => true

export default function App() {
  const [copiedStatus, setCopiedStatus] = useState('Copy curl')

  const {
    input,
    video,
    videos,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    generateVideo,
    handleSubmit,
    handleInputChange,
    setInput,
    stop,
    clear,
    clearTrace
  } = useVideo({
    api: videoApi,
    baseURL: useProxyMode ? proxyBaseURL : '',
    fetch: useLocalDemo ? localVideoFetch : undefined,
    initialInput: initialPrompt,
    defaultRequest: {
      model: useLocalDemo ? 'local-storyboard-demo' : 'video-model',
      aspectRatio: '16:9',
      resolution: '1280x720',
      duration: 6,
      fps: 24
    }
  })

  const inspection = useMemo(
    () =>
      inspectRequestTrace({
        status,
        error,
        lastRequest,
        lastResponse,
        curl: true
      }),
    [error, lastRequest, lastResponse, status]
  )

  const previewUrl = useMemo(() => {
    if (video?.url) return video.url
    if (video?.base64) return `data:${video.mediaType || 'video/mp4'};base64,${video.base64}`
    return ''
  }, [video])

  const isPlayableVideo = video?.mediaType?.startsWith('video/') ?? false

  const traceSummary = useMemo(() => {
    if (!lastRequest) return 'No request yet.'
    return JSON.stringify(
      {
        api: lastRequest.api,
        provider: lastRequest.providerId,
        prompt: lastRequest.prompt,
        model: lastRequest.request.model,
        resolution: lastRequest.request.resolution,
        duration: lastRequest.request.duration,
        videos: lastResponse?.result.videos.length ?? 0,
        status: inspection.status
      },
      null,
      2
    )
  }, [inspection.status, lastRequest, lastResponse])

  const tracePayload = useMemo(() => JSON.stringify(inspection, null, 2), [inspection])
  const providerId = inspection.providerId || (useLocalDemo ? 'react-local-video' : 'proxy')
  const canSubmit = input.trim().length > 0 && !isLoading
  const { visibleSuggestions, selectSuggestion } = usePromptSuggestions({
    suggestions: videoStarterPrompts,
    input,
    max: 5,
    filter: showAllSuggestions
  })

  const copyCurl = useCallback(() => {
    if (!inspection.curl) return
    void navigator.clipboard.writeText(inspection.curl)
    setCopiedStatus('Copied')
    window.setTimeout(() => {
      setCopiedStatus('Copy curl')
    }, 1200)
  }, [inspection.curl])

  const onSample = useCallback(
    async (suggestionId: string) => {
      const selected = selectSuggestion(suggestionId)
      if (!selected) return

      const prompt = selected.prompt
      setInput(prompt)
      await generateVideo(prompt, {
        model: useLocalDemo ? 'local-storyboard-demo' : 'video-model',
        aspectRatio: '16:9',
        resolution: '1280x720',
        duration: 6,
        fps: 24
      })
      setInput('')
    },
    [generateVideo, selectSuggestion, setInput, useLocalDemo]
  )

  const clearDemo = useCallback(() => {
    clear()
    setInput(initialPrompt)
  }, [clear, setInput])

  return (
    <main className="react-demo-shell">
      <header className="demo-header" aria-label="React video quickstart">
        <p className="eyebrow">vue-ai-hooks/react</p>
        <h1>React video quickstart</h1>
        <p className="status-row">
          <span data-status={status}>{status}</span>
          <span>{providerId}</span>
          <span>{modeLabel}</span>
        </p>
      </header>

      <section className="card">
        <h2>Prompt</h2>
        <div className="sample-grid" aria-label="Video prompt samples">
          {visibleSuggestions.map((suggestion) => (
            <button
              className="sample-button"
              disabled={isLoading}
              key={suggestion.id}
              onClick={() => {
                void onSample(suggestion.id)
              }}
              type="button"
            >
              <span>{suggestion.title}</span>
              {suggestion.description ? <small>{suggestion.description}</small> : null}
            </button>
          ))}
        </div>

        <label className="field-label" htmlFor="video-prompt">
          Prompt
        </label>
        <textarea
          id="video-prompt"
          value={input}
          onChange={handleInputChange}
          placeholder="Describe the video storyboard or production brief."
          rows={3}
        />

        <div className="composer-actions">
          <button disabled={!canSubmit} onClick={(event) => void handleSubmit(event)} type="button">
            Generate video
          </button>
          <button disabled={!isLoading} onClick={stop} type="button">
            Stop
          </button>
          <button disabled={isLoading} onClick={clearDemo} type="button">
            Clear
          </button>
          <button onClick={clearTrace} type="button">
            Clear trace
          </button>
        </div>
        {error ? <p className="error-text">{error.message}</p> : null}
      </section>

      <section className="card">
        <h2>Result</h2>
        <p>{video ? `Generated ${video.mediaType || 'video'}` : 'No video yet.'}</p>
        <div className="result-layout">
          <div className="result-frame">
            {previewUrl && isPlayableVideo ? (
              <video className="preview-video" controls playsInline src={previewUrl} />
            ) : previewUrl ? (
              <img className="preview-image" src={previewUrl} alt="Generated video storyboard" />
            ) : null}
          </div>
          <ul className="result-metadata" aria-label="Video metadata">
            <li>Count: {videos.length}</li>
            <li>Provider: {lastRequest?.providerId || providerId}</li>
            <li>Media type: {video?.mediaType || '-'}</li>
            <li>Duration: {video?.durationInSeconds ?? '-'}</li>
            <li>Model: {lastResponse?.result.model || '-'}</li>
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Inspection</h2>
        <p className="inspect-summary">{inspection.summary}</p>
        <div className="inspect-actions">
          <button onClick={copyCurl} type="button" disabled={!inspection.curl}>
            {copiedStatus}
          </button>
        </div>
        <pre className="pre-output">{traceSummary}</pre>
      </section>

      <section className="card">
        <h2>Trace JSON</h2>
        <pre className="pre-output">{tracePayload}</pre>
      </section>
    </main>
  )
}

function localVideoFetch(_url: RequestInfo | URL, init?: RequestInit) {
  const body = parseRequestBody(init?.body)
  const prompt = typeof body.prompt === 'string' ? body.prompt : 'React AI Hooks video demo'
  const durationInSeconds = Number(body.duration) || 6
  const videoUrl = storyboardDataUrl(prompt)
  return Promise.resolve(
    new Response(
      JSON.stringify({
        video: {
          url: videoUrl,
          mediaType: 'image/svg+xml',
          durationInSeconds,
          metadata: { seed: hashText(prompt), localPreview: 'storyboard' }
        },
        videos: [
          {
            url: videoUrl,
            mediaType: 'image/svg+xml',
            durationInSeconds,
            metadata: { seed: hashText(prompt), localPreview: 'storyboard' }
          }
        ],
        model: body.model || 'local-storyboard-demo',
        providerMetadata: {
          provider: 'react-local-video'
        }
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
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
  const normalized = prompt.replace(/\s+/g, ' ').trim() || 'React AI Hooks'
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
