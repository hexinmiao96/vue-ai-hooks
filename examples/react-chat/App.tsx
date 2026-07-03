import { DirectChatTransport, inspectRequestTrace } from 'vue-ai-hooks'
import { useCallback, useMemo, useState } from 'react'
import {
  createPromptSuggestionRecipes,
  useChat,
  usePromptSuggestions,
  type ChatChunk,
  type ChatRequest,
  type Message
} from 'vue-ai-hooks/react'

const samplePrompts = [
  'Show me the minimum React integration path.',
  'How should I keep provider keys out of the browser?',
  'What should I inspect when a stream fails?'
]

const starterPrompts = createPromptSuggestionRecipes({
  surfaces: ['chat', 'backend'],
  metadata: { surface: 'react-chat' }
})

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function messageText(message: Message): string {
  if (typeof message.content === 'string') return message.content
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function requestText(request: ChatRequest): string {
  const lastUser = [...request.messages].reverse().find((message) => message.role === 'user')
  if (!lastUser) return 'Hello from React.'
  if (typeof lastUser.content === 'string') return lastUser.content
  return lastUser.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

const useProxyRoute = import.meta.env.VITE_CHAT_PROVIDER === 'proxy-route'
const proxyCredentials = (import.meta.env.VITE_PROXY_CREDENTIALS || undefined) as
  RequestCredentials | undefined
const proxyBaseURL = (import.meta.env.VITE_PROXY_BASE_URL || '').trim()
const proxyRouteHeaders = import.meta.env.VITE_PROXY_AUTH_TOKEN
  ? { Authorization: `Bearer ${import.meta.env.VITE_PROXY_AUTH_TOKEN}` }
  : undefined

async function* localReactStream(request: ChatRequest): AsyncIterable<ChatChunk> {
  const prompt = requestText(request)
  const reply = [
    `Received "${prompt}". `,
    'This React demo uses vue-ai-hooks/react for state and DirectChatTransport for a no-key stream. ',
    'Swap the provider for proxyProvider or your own /api/chat route when moving to production.'
  ]

  for (const chunk of reply) {
    await sleep(80)
    yield { content: chunk }
  }

  yield {
    dataId: 'react-demo-trace',
    dataType: 'demo-trace',
    data: {
      provider: 'react-local',
      messageCount: request.messages.length,
      streamProtocol: request.streamProtocol ?? 'chat-chunk'
    }
  }
  yield {
    finishReason: 'stop',
    usage: { promptTokens: 24, completionTokens: 36, totalTokens: 60 }
  }
}

const provider = new DirectChatTransport({
  id: 'react-local',
  streamProtocol: 'chat-chunk',
  stream: localReactStream
})

export default function App() {
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    status: chatStatus,
    stop,
    clear,
    usage,
    streamData,
    lastRequest,
    lastResponse,
    clearTrace,
    error: chatError
  } = useChat({
    ...(useProxyRoute
      ? {
          api: '/api/chat',
          ...(proxyBaseURL ? { baseURL: proxyBaseURL } : {}),
          credentials: proxyCredentials,
          ...(proxyRouteHeaders ? { headers: proxyRouteHeaders } : {})
        }
      : {
          provider
        }),
    initialInput: samplePrompts[0],
    defaultRequest: {
      streamProtocol: 'ui-message',
      metadata: { demo: 'react-chat' }
    }
  })
  const { visibleSuggestions } = usePromptSuggestions({
    suggestions: [
      ...samplePrompts.map((prompt, index) => ({
        id: `react-chat-prompt-${index + 1}`,
        prompt
      })),
      ...starterPrompts
    ],
    input,
    messages,
    max: 6
  })
  const [copiedStatus, setCopiedStatus] = useState('Copy curl')
  const inspection = useMemo(
    () =>
      inspectRequestTrace({
        status: chatStatus,
        lastRequest,
        lastResponse,
        error: chatError,
        curl: true
      }),
    [chatStatus, lastRequest, lastResponse, chatError]
  )
  const inspectionSummary = useMemo(() => JSON.stringify(inspection, null, 2), [inspection])
  const copyInspectionCurl = useCallback(() => {
    if (!inspection.curl) return
    void navigator.clipboard.writeText(inspection.curl)
    setCopiedStatus('Copied')
    window.setTimeout(() => {
      setCopiedStatus('Copy curl')
    }, 1200)
  }, [inspection.curl])

  const canSubmit = input.trim().length > 0 && !isLoading
  const providerId = inspection.providerId ?? (useProxyRoute ? 'proxy-transport' : provider.id)
  const inspectionRows = [
    { label: 'Provider', value: providerId },
    {
      label: 'Request',
      value: inspection.request
        ? `${inspection.request.kind} #${inspection.request.attempt}`
        : 'none'
    },
    { label: 'Status', value: inspection.status },
    {
      label: 'Stream',
      value: inspection.response?.hasStream ? 'open' : 'no stream'
    },
    {
      label: 'Timeline',
      value: String(inspection.timeline.length)
    },
    {
      label: 'Retries',
      value: String(inspection.retries.length)
    },
    { label: 'Attempt', value: String(inspection.attempt ?? 'none') }
  ]

  return (
    <main className="app-shell">
      <section className="conversation-panel" aria-label="React chat demo">
        <header className="toolbar">
          <div>
            <p className="eyebrow">vue-ai-hooks/react</p>
            <h1>React chat quickstart</h1>
          </div>
          <div className="status-strip" aria-label="Request status">
            <span data-status={chatStatus}>{chatStatus}</span>
            <span>{messages.length} messages</span>
          </div>
        </header>

        <div className="sample-grid" aria-label="Prompt suggestions">
          {visibleSuggestions.map((suggestion) => (
            <button
              className="sample-button"
              disabled={isLoading}
              key={suggestion.id}
              onClick={() => {
                setInput(suggestion.prompt)
              }}
              type="button"
            >
              {suggestion.prompt}
            </button>
          ))}
        </div>

        <div className="message-list" aria-live="polite">
          {messages.length === 0 ? (
            <p className="empty-state">Send a prompt to see the local React stream.</p>
          ) : (
            messages.map((message) => (
              <article className="message-row" data-role={message.role} key={message.id}>
                <strong>{message.role}</strong>
                <p>{messageText(message)}</p>
              </article>
            ))
          )}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            aria-label="Prompt"
            onChange={handleInputChange}
            placeholder="Ask about the React integration..."
            rows={3}
            value={input}
          />
          <div className="composer-actions">
            <button disabled={!canSubmit} type="submit">
              Send
            </button>
            <button disabled={!isLoading} onClick={stop} type="button">
              Stop
            </button>
            <button disabled={isLoading && messages.length === 0} onClick={clear} type="button">
              Clear
            </button>
          </div>
        </form>

        {chatError ? <p className="error-text">{chatError.message}</p> : null}
      </section>

      <aside className="inspect-panel" aria-label="Request inspection">
        <h2>Inspection</h2>
        <p className="inspect-summary">{inspection.summary}</p>
        <div className="inspect-actions">
          <button type="button" disabled={!inspection.curl} onClick={copyInspectionCurl}>
            {copiedStatus}
          </button>
          <button type="button" onClick={clearTrace}>
            Clear trace
          </button>
        </div>
        <dl>
          {inspectionRows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
          <div>
            <dt>Usage</dt>
            <dd>{usage ? `${usage.totalTokens} tokens` : 'pending'}</dd>
          </div>
          <div>
            <dt>Data parts</dt>
            <dd>{streamData.length}</dd>
          </div>
        </dl>
        <details>
          <summary>Timeline ({inspection.timeline.length})</summary>
          <ul className="trace-list">
            {inspection.timeline.map((event) => (
              <li
                key={`${event.kind}-${event.timestamp}-${event.message ?? event.label ?? event.category ?? event.attempt}`}
              >
                {event.kind}
                {event.attempt ? ` #${event.attempt}` : ''}
                {` — ${event.label ?? event.message ?? 'event'}`}
              </li>
            ))}
          </ul>
        </details>
        <details>
          <summary>Retries ({inspection.retries.length})</summary>
          <ul className="trace-list">
            {inspection.retries.map((retry) => (
              <li key={`r-${retry.attempt}-${retry.timestamp}`}>
                #{retry.attempt}: {retry.error.category} — {retry.error.message}
              </li>
            ))}
          </ul>
        </details>
        <details>
          <summary>Provider trace</summary>
          <pre className="trace-code">{JSON.stringify(inspection.providerTrace, null, 2)}</pre>
        </details>

        <pre className="trace-code">{inspectionSummary}</pre>
      </aside>
    </main>
  )
}
