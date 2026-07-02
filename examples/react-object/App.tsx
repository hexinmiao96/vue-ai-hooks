import {
  inspectRequestTrace,
  proxyProvider,
  type ChatProvider,
  type ChatRequest
} from 'vue-ai-hooks'
import { useObject } from 'vue-ai-hooks/react'
import { useMemo, useCallback, useState } from 'react'

type Priority = 'low' | 'high'

type Ticket = {
  title: string
  priority: Priority
  owner?: string
}

type ProviderMode = 'local-object' | 'proxy'

const schema: Ticket = {
  title: '',
  priority: 'low',
  owner: ''
}

const samplePrompts = [
  'Urgent: customer cannot reset password after MFA update.',
  'Customer asks for team lead on-call and priority is high.',
  'Low priority: user wants a reminder for monthly plan renewal.'
]

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function extractPromptFromRequest(request: ChatRequest) {
  const messages = request.messages
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')
  if (!lastUser) return 'Support ticket required'
  const content = typeof lastUser.content === 'string' ? lastUser.content : ''
  if (content) return content
  const fallback = Array.isArray(lastUser.content)
    ? lastUser.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join(' ')
    : ''
  return (content || fallback).trim() || 'Support ticket required'
}

function createTicket(prompt: string) {
  const ownerMatch = prompt.match(/owner[:\s]+([^\n.]+)/i)
  const isHigh = /urgent|critical|blocked|error|outage|down|无法|故障/i.test(prompt)
  return {
    title: prompt.split('\n')[0].slice(0, 72) || 'Support ticket',
    priority: isHigh ? 'high' : 'low',
    owner: ownerMatch ? ownerMatch[1].trim() : 'operations'
  }
}

async function* localObjectStream(
  request: ChatRequest
): AsyncIterable<import('vue-ai-hooks').ChatChunk> {
  const rawTicket = JSON.stringify(createTicket(extractPromptFromRequest(request)))
  const half = Math.ceil(rawTicket.length / 2)
  await sleep(120)
  yield { content: rawTicket.slice(0, half) }
  await sleep(120)
  yield { content: rawTicket.slice(half) }
  yield {
    finishReason: 'stop',
    usage: {
      promptTokens: 26,
      completionTokens: 16,
      totalTokens: 42
    }
  }
}

const localObjectProvider: ChatProvider = {
  id: 'react-local-object',
  async chat(request) {
    return localObjectStream(request)
  },
  async completion() {
    return (async function* () {
      yield ''
    })()
  },
  async embedding() {
    return {
      embeddings: [],
      model: 'react-local-object',
      usage: { promptTokens: 0, totalTokens: 0 }
    }
  }
}

const useProxy = import.meta.env.VITE_EXAMPLE_PROVIDER === 'proxy'
const proxyCredentials = (import.meta.env.VITE_PROXY_CREDENTIALS || undefined) as
  RequestCredentials | undefined
const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const provider: ChatProvider = useProxy
  ? proxyProvider({
      chatUrl:
        import.meta.env.VITE_PROXY_OBJECT_URL ||
        import.meta.env.VITE_PROXY_CHAT_URL ||
        '/api/object',
      baseURL: proxyBaseURL,
      credentials: proxyCredentials,
      headers: import.meta.env.VITE_PROXY_AUTH_TOKEN
        ? { Authorization: `Bearer ${import.meta.env.VITE_PROXY_AUTH_TOKEN}` }
        : undefined
    })
  : localObjectProvider

const providerMode = useProxy ? 'proxy' : ('local-object' as ProviderMode)

const sharedSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'high'] },
    owner: { type: 'string' }
  },
  required: ['title', 'priority'],
  additionalProperties: false
}

export default function App() {
  const [copiedStatus, setCopiedStatus] = useState('Copy curl')
  const {
    object,
    partialObject,
    text,
    input,
    status,
    isLoading,
    error,
    clear,
    clearTrace,
    stop,
    submit,
    handleInputChange,
    handleSubmit,
    lastRequest,
    lastResponse
  } = useObject<Ticket>({
    provider,
    schema: sharedSchema,
    schemaName: 'support_ticket',
    initialInput: samplePrompts[0],
    initialValue: {
      title: schema.title,
      priority: schema.priority
    },
    defaultRequest: {
      model: import.meta.env.VITE_EXAMPLE_OBJECT_MODEL || 'gpt-4.1-mini'
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
  const copyCurl = useCallback(() => {
    if (!inspection.curl) return
    void navigator.clipboard.writeText(inspection.curl)
    setCopiedStatus('Copied')
    window.setTimeout(() => {
      setCopiedStatus('Copy curl')
    }, 1200)
  }, [inspection.curl])
  const resolvedObject = useMemo(() => object ?? partialObject, [object, partialObject])
  const samplePrompt = samplePrompts[0]

  return (
    <main className="react-demo-shell">
      <header className="demo-header" aria-label="React object quickstart">
        <p className="eyebrow">vue-ai-hooks/react</p>
        <h1>React structured output quickstart</h1>
        <p className="status-row">
          <span data-status={status}>{status}</span>
          <span>provider: {providerMode}</span>
          <span>schema: support_ticket</span>
        </p>
      </header>

      <section className="card">
        <h2>Prompt</h2>
        <textarea value={input} onChange={handleInputChange} rows={4} />
        <div className="composer-actions">
          <button disabled={isLoading || !input.trim()} onClick={() => submit(input)} type="button">
            Extract
          </button>
          <button disabled={!isLoading} onClick={stop} type="button">
            Stop
          </button>
          <button
            type="button"
            onClick={() => {
              void handleSubmit()
            }}
            disabled={isLoading || !input.trim()}
          >
            Extract (form)
          </button>
          <button disabled={!input.trim()} onClick={handleSubmit} type="button">
            Run task
          </button>
          <button disabled={!isLoading && !object && !error} onClick={clear} type="button">
            Clear
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Schema</h2>
        <pre className="pre-output">{JSON.stringify(sharedSchema, null, 2)}</pre>
      </section>

      <section className="card">
        <h2>Parsed object</h2>
        <div className="object-grid">
          <span className="object-label">title</span>
          <strong>{resolvedObject?.title || samplePrompt.slice(0, 18) + '...'}</strong>
          <span className="object-label">priority</span>
          <strong>{resolvedObject?.priority || 'pending'}</strong>
          <span className="object-label">owner</span>
          <strong>{resolvedObject?.owner || 'pending'}</strong>
        </div>
      </section>

      <section className="card">
        <h2>Raw stream</h2>
        <pre className="pre-output">{text || 'No stream yet.'}</pre>
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

      {error ? <p className="error-text">{error.message}</p> : null}
    </main>
  )
}
