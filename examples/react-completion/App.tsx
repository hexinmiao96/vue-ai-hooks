import { useCallback, useMemo, useState } from 'react'
import {
  inspectRequestTrace,
  proxyProvider,
  type ChatProvider,
  type CompletionRequest
} from 'vue-ai-hooks'
import { useCompletion } from 'vue-ai-hooks/react'

const samplePrompts = [
  'Write a short changelog entry for a production release.',
  'Explain this repo in one practical line.',
  'Summarize a risk checklist for shipping LLM features.'
]

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function localCompletionText(request: CompletionRequest): string {
  return request.prompt?.trim() || 'Generate a production-grade completion.'
}

async function* localCompletionStream(request: CompletionRequest): AsyncIterable<string> {
  const prompt = localCompletionText(request)
  const reply = [
    `Received "${prompt}". `,
    'This is a deterministic React completion demo. ',
    'Swap in proxyProvider when you are ready to use /api/completion.'
  ]

  for (const chunk of reply) {
    await sleep(90)
    yield chunk
  }
}

const localCompletionProvider: ChatProvider = {
  id: 'react-local-completion',
  async completion(request) {
    return localCompletionStream(request)
  },
  async chat() {
    return (async function* () {
      yield { content: 'This local completion provider does not expose chat.' }
    })()
  },
  async embedding() {
    return {
      embeddings: [],
      model: 'react-local-completion',
      usage: { promptTokens: 0, totalTokens: 0 }
    }
  }
}

const useProxy = import.meta.env.VITE_EXAMPLE_PROVIDER === 'proxy'
const proxyCredentials = (import.meta.env.VITE_PROXY_CREDENTIALS || undefined) as
  RequestCredentials | undefined
const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const provider = useProxy
  ? proxyProvider({
      completionUrl: import.meta.env.VITE_PROXY_COMPLETION_URL || '/api/completion',
      baseURL: proxyBaseURL,
      credentials: proxyCredentials,
      headers: import.meta.env.VITE_PROXY_AUTH_TOKEN
        ? { Authorization: `Bearer ${import.meta.env.VITE_PROXY_AUTH_TOKEN}` }
        : undefined
    })
  : localCompletionProvider

export default function App() {
  const [copiedStatus, setCopiedStatus] = useState('Copy curl')
  const {
    completion,
    input,
    status,
    isLoading,
    error,
    clear,
    clearTrace,
    complete,
    handleSubmit,
    handleInputChange,
    stop,
    lastRequest,
    lastResponse
  } = useCompletion({
    provider,
    initialInput: samplePrompts[0],
    defaultRequest: {
      model: import.meta.env.VITE_EXAMPLE_COMPLETION_MODEL || 'gpt-4.1-mini',
      streamProtocol: 'text',
      temperature: 0.25
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
    [status, error, lastRequest, lastResponse]
  )

  const inspectionSummary = useMemo(() => JSON.stringify(inspection, null, 2), [inspection])
  const canSubmit = input.trim().length > 0 && !isLoading
  const copyCurl = useCallback(() => {
    if (!inspection.curl) return
    void navigator.clipboard.writeText(inspection.curl)
    setCopiedStatus('Copied')
    window.setTimeout(() => {
      setCopiedStatus('Copy curl')
    }, 1200)
  }, [inspection.curl])

  return (
    <main className="react-demo-shell">
      <header className="demo-header" aria-label="React completion quickstart">
        <p className="eyebrow">vue-ai-hooks/react</p>
        <h1>React completion quickstart</h1>
        <p className="status-row">
          <span data-status={status}>{status}</span>
          <span>provider: {provider.id}</span>
        </p>
      </header>

      <section className="card">
        <h2>Prompt</h2>
        <div className="sample-grid">
          {samplePrompts.map((prompt) => (
            <button
              className="sample-button"
              disabled={isLoading}
              key={prompt}
              onClick={() => {
                void complete(prompt)
              }}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
        <textarea value={input} onChange={handleInputChange} rows={3} />
        <div className="composer-actions">
          <button disabled={!canSubmit} onClick={handleSubmit} type="button">
            Complete
          </button>
          <button disabled={!isLoading} onClick={stop} type="button">
            Stop
          </button>
          <button disabled={!completion && !error} onClick={clear} type="button">
            Clear
          </button>
        </div>
        {error ? <p className="error-text">{error.message}</p> : null}
      </section>

      <section className="card">
        <h2>Completion</h2>
        <pre className="pre-output">{completion || 'No completion yet.'}</pre>
      </section>

      <section className="card">
        <h2>Inspection</h2>
        <p className="inspect-summary">{inspection.summary}</p>
        <div className="inspect-actions">
          <button type="button" onClick={copyCurl} disabled={!inspection.curl}>
            {copiedStatus}
          </button>
          <button type="button" onClick={clearTrace}>
            Clear trace
          </button>
        </div>
        <pre className="pre-output">{inspectionSummary}</pre>
      </section>
    </main>
  )
}
