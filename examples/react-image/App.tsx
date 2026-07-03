import { useCallback, useMemo, useState } from 'react'
import { inspectRequestTrace, type GeneratedImage, type PromptSuggestionInput } from 'vue-ai-hooks'
import { createPromptSuggestionRecipes, useImage, usePromptSuggestions } from 'vue-ai-hooks/react'

type DemoMode = 'generate' | 'edit'
type ImageStarterMetadata = { surface: string; mode?: DemoMode }

const mediaRecipePrompts = createPromptSuggestionRecipes<ImageStarterMetadata>({
  surfaces: ['media'],
  include: ['draft-media-prompt'],
  metadata: { surface: 'react-image-demo' }
})

const generatePrompts: PromptSuggestionInput<ImageStarterMetadata>[] = [
  {
    id: 'react-image-fintech',
    title: 'Fintech dashboard',
    prompt: 'A clean fintech dashboard hero image',
    description: 'Generate a product UI image.',
    metadata: { surface: 'react-image-demo', mode: 'generate' }
  },
  {
    id: 'react-image-launch',
    title: 'Launch hero',
    prompt: 'A minimalist product launch hero with geometric lines',
    description: 'Try a crisp launch visual.',
    metadata: { surface: 'react-image-demo', mode: 'generate' }
  },
  {
    id: 'react-image-workspace',
    title: 'Workspace scene',
    prompt: 'A calm workspace scene with soft evening light',
    description: 'Generate a softer product backdrop.',
    metadata: { surface: 'react-image-demo', mode: 'generate' }
  }
]

const editPrompts: PromptSuggestionInput<ImageStarterMetadata>[] = [
  {
    id: 'react-image-edit-gradient',
    title: 'Gradient workspace',
    prompt: 'Replace the hero background with a calm gradient workspace',
    description: 'Edit the source image background.',
    metadata: { surface: 'react-image-demo', mode: 'edit' }
  },
  {
    id: 'react-image-edit-panel',
    title: 'Glass panel',
    prompt: 'Add a subtle glassmorphism panel and sharpen the logo',
    description: 'Try a layout-preserving edit.',
    metadata: { surface: 'react-image-demo', mode: 'edit' }
  },
  {
    id: 'react-image-edit-evening',
    title: 'Evening tone',
    prompt: 'Shift to a warmer evening atmosphere',
    description: 'Adjust mood without changing structure.',
    metadata: { surface: 'react-image-demo', mode: 'edit' }
  }
]

const generatePrompt = 'A clean Vue AI Hooks image demo'
const editPrompt = 'Replace the background with a warm studio scene'

const editSourceImage: GeneratedImage = {
  url: svgDataUrl('Source image for React image editing', 'source'),
  mediaType: 'image/svg+xml',
  revisedPrompt: 'Source image for React image editing'
}

const editMask = svgMaskDataUrl()

const useProxyMode = import.meta.env.VITE_EXAMPLE_PROVIDER === 'proxy'
const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const imageApi = import.meta.env.VITE_PROXY_IMAGE_URL || '/api/image'
const useLocalDemo = !useProxyMode || !proxyBaseURL
const modeLabel = useLocalDemo ? 'Local deterministic demo' : `Proxy: ${proxyBaseURL}`

const showAllSuggestions = () => true

export default function App() {
  const [copiedStatus, setCopiedStatus] = useState('Copy curl')
  const [mode, setModeState] = useState<DemoMode>('generate')

  const {
    input,
    image,
    images,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    generateImage,
    editImage,
    handleSubmit,
    handleInputChange,
    setInput,
    stop,
    clear,
    clearTrace
  } = useImage({
    api: imageApi,
    baseURL: useProxyMode ? proxyBaseURL : '',
    fetch: useLocalDemo ? localImageFetch : undefined,
    initialInput: generatePrompt,
    defaultRequest: {
      model: useLocalDemo ? 'local-svg-demo' : 'image-model',
      size: '1024x1024',
      aspectRatio: '1:1'
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
    if (image?.url) return image.url
    if (image?.base64) return `data:${image.mediaType || 'image/png'};base64,${image.base64}`
    return ''
  }, [image])

  const traceSummary = useMemo(() => {
    if (!lastRequest) return 'No request yet.'
    return JSON.stringify(
      {
        api: lastRequest.api,
        provider: lastRequest.providerId,
        operation: lastRequest.operation,
        prompt: lastRequest.prompt,
        model: lastRequest.request.model,
        size: lastRequest.request.size,
        sourceImage: lastRequest.request.image ? 'provided' : '-',
        images: lastResponse?.result.images.length ?? 0,
        status: inspection.status
      },
      null,
      2
    )
  }, [inspection.status, lastRequest, lastResponse])

  const tracePayload = useMemo(() => JSON.stringify(inspection, null, 2), [inspection])
  const canSubmit = input.trim().length > 0 && !isLoading

  const providerId = inspection.providerId || (useLocalDemo ? 'react-local-image' : 'proxy')
  const activePromptInputs = useMemo<PromptSuggestionInput<ImageStarterMetadata>[]>(
    () => [...mediaRecipePrompts, ...(mode === 'edit' ? editPrompts : generatePrompts)],
    [mode]
  )
  const { visibleSuggestions, selectSuggestion } = usePromptSuggestions<ImageStarterMetadata>({
    suggestions: activePromptInputs,
    input,
    max: 6,
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

  const switchMode = useCallback(
    (nextMode: DemoMode) => {
      const previousDefault = mode === 'edit' ? editPrompt : generatePrompt
      const nextDefault = nextMode === 'edit' ? editPrompt : generatePrompt
      setModeState(nextMode)
      if (!input.trim() || input === previousDefault) {
        setInput(nextDefault)
      }
    },
    [input, mode, setInput]
  )

  const runEdit = useCallback(async () => {
    await editImage(input, {
      image: editSourceImage,
      mask: editMask,
      model: useLocalDemo ? 'local-image-edit-demo' : 'image-edit-model',
      body: { workflow: 'react-image-edit-demo' },
      size: '1024x1024'
    })
    setInput('')
  }, [editImage, input, setInput, useLocalDemo])

  const onSubmit = useCallback(
    async (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.()
      if (mode === 'edit') {
        await runEdit()
        return
      }
      await handleSubmit(undefined, { size: '1024x1024' })
    },
    [handleSubmit, mode, runEdit]
  )

  const onSample = useCallback(
    async (suggestionId: string) => {
      const selected = selectSuggestion(suggestionId)
      if (!selected) return

      const prompt = selected.prompt
      setInput(prompt)
      if (mode === 'edit') {
        await editImage(prompt, {
          image: editSourceImage,
          mask: editMask,
          model: useLocalDemo ? 'local-image-edit-demo' : 'image-edit-model',
          size: '1024x1024',
          body: { workflow: 'react-image-edit-demo' }
        })
      } else {
        await generateImage(prompt, {
          model: useLocalDemo ? 'local-svg-demo' : 'image-model',
          aspectRatio: '1:1',
          size: '1024x1024'
        })
      }
      setInput('')
    },
    [editImage, generateImage, mode, selectSuggestion, setInput, useLocalDemo]
  )

  const clearDemo = useCallback(() => {
    clear()
    setInput(mode === 'edit' ? editPrompt : generatePrompt)
  }, [clear, mode, setInput])

  const sampleLabel = mode === 'edit' ? 'Edit prompt starters' : 'Generate prompt starters'

  return (
    <main className="react-demo-shell">
      <header className="demo-header" aria-label="React image quickstart">
        <p className="eyebrow">vue-ai-hooks/react</p>
        <h1>React image quickstart</h1>
        <p className="status-row">
          <span data-status={status}>{status}</span>
          <span>{providerId}</span>
          <span>{modeLabel}</span>
        </p>
      </header>

      <section className="card">
        <h2>Mode</h2>
        <div className="mode-grid" role="tablist" aria-label="Image operation">
          <button
            type="button"
            className="sample-button"
            data-active={mode === 'generate'}
            aria-pressed={mode === 'generate'}
            onClick={() => {
              switchMode('generate')
            }}
          >
            Generate
          </button>
          <button
            type="button"
            className="sample-button"
            data-active={mode === 'edit'}
            aria-pressed={mode === 'edit'}
            onClick={() => {
              switchMode('edit')
            }}
          >
            Edit
          </button>
        </div>

        <div className="sample-grid" aria-label={sampleLabel}>
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

        <label className="field-label" htmlFor="image-prompt">
          Prompt
        </label>
        <textarea
          id="image-prompt"
          value={input}
          onChange={handleInputChange}
          placeholder="Describe the target image or edit objective."
          rows={3}
        />

        {mode === 'edit' ? (
          <div className="source-panel" aria-label="Image edit source">
            <figure>
              <img className="source-image" src={editSourceImage.url} alt="React image source" />
              <figcaption>Edit source image</figcaption>
            </figure>
            <figure>
              <img className="source-image" src={editMask} alt="Edit mask" />
              <figcaption>Editable mask</figcaption>
            </figure>
          </div>
        ) : null}

        <div className="composer-actions">
          <button disabled={!canSubmit} onClick={onSubmit} type="button">
            {mode === 'edit' ? 'Edit image' : 'Generate image'}
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
        <p>{image ? `Generated ${image.mediaType || 'image'}` : 'No image yet.'}</p>
        <div className="result-layout">
          <div className="result-frame">
            {previewUrl ? (
              <img className="preview-image" src={previewUrl} alt="Generated image" />
            ) : null}
          </div>
          <ul className="result-metadata" aria-label="Image metadata">
            <li>Count: {images.length}</li>
            <li>Provider: {lastRequest?.providerId || providerId}</li>
            <li>Operation: {lastRequest?.operation || mode}</li>
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

function localImageFetch(_url: RequestInfo | URL, init?: RequestInit) {
  const body = parseRequestBody(init?.body)
  const prompt = typeof body.prompt === 'string' ? body.prompt : 'React AI Hooks'
  const operation = body.operation === 'edit' ? 'edit' : 'generate'
  const imageUrl = svgDataUrl(`${operation}: ${prompt}`, operation)
  const model =
    typeof body.model === 'string'
      ? body.model
      : operation === 'edit'
        ? 'local-image-edit-demo'
        : 'local-svg-demo'
  return Promise.resolve(
    new Response(
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
          provider: 'react-local-image'
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

function svgDataUrl(prompt: string, kind: DemoMode | 'source' = 'generate') {
  const normalized = prompt.replace(/\s+/g, ' ').trim() || 'React AI Hooks'
  const shortPrompt = normalized.length > 78 ? `${normalized.slice(0, 75)}...` : normalized
  const hue = Math.abs(hashText(normalized)) % 360
  const accentHue = kind === 'edit' ? (hue + 36) % 360 : kind === 'source' ? 180 : hue
  const title =
    kind === 'edit' ? 'useImage edit' : kind === 'source' ? 'source image' : 'useImage generate'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="hsl(${accentHue} 78% 48%)"/>
      <stop offset="100%" stop-color="hsl(${(accentHue + 56) % 360} 72% 42%)"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="64" fill="url(#bg)"/>
  <rect x="88" y="118" width="848" height="788" rx="42" fill="rgba(255,255,255,0.88)"/>
  <text x="144" y="230" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="700">${title}</text>
  <text x="144" y="314" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="30">${escapeSvg(shortPrompt)}</text>
  <circle cx="768" cy="700" r="118" fill="hsl(${(accentHue + 150) % 360} 82% 48%)"/>
  <rect x="144" y="520" width="432" height="34" rx="17" fill="#0f172a"/>
  <rect x="144" y="590" width="560" height="26" rx="13" fill="#475569"/>
  <rect x="144" y="650" width="480" height="26" rx="13" fill="#64748b"/>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function svgMaskDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="black"/>
  <rect x="126" y="500" width="620" height="218" rx="40" fill="white"/>
  <circle cx="740" cy="666" r="154" fill="white"/>
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
