import { DirectChatTransport } from 'vue-ai-hooks'
import { useChat, type ChatChunk, type ChatRequest, type Message } from 'vue-ai-hooks/react'

const samplePrompts = [
  'Show me the minimum React integration path.',
  'How should I keep provider keys out of the browser?',
  'What should I inspect when a stream fails?'
]

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
    handleInputChange,
    handleSubmit,
    sendMessage,
    isLoading,
    status,
    stop,
    error,
    clear,
    usage,
    streamData,
    lastRequest,
    lastResponse
  } = useChat({
    provider,
    initialInput: samplePrompts[0],
    defaultRequest: {
      streamProtocol: 'ui-message',
      metadata: { demo: 'react-chat' }
    }
  })

  const canSubmit = input.trim().length > 0 && !isLoading

  return (
    <main className="app-shell">
      <section className="conversation-panel" aria-label="React chat demo">
        <header className="toolbar">
          <div>
            <p className="eyebrow">vue-ai-hooks/react</p>
            <h1>React chat quickstart</h1>
          </div>
          <div className="status-strip" aria-label="Request status">
            <span data-status={status}>{status}</span>
            <span>{messages.length} messages</span>
          </div>
        </header>

        <div className="sample-grid" aria-label="Sample prompts">
          {samplePrompts.map((prompt) => (
            <button
              className="sample-button"
              disabled={isLoading}
              key={prompt}
              onClick={() => {
                void sendMessage(prompt)
              }}
              type="button"
            >
              {prompt}
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

        {error ? <p className="error-text">{error.message}</p> : null}
      </section>

      <aside className="inspect-panel" aria-label="Request inspection">
        <h2>Inspection</h2>
        <dl>
          <div>
            <dt>Provider</dt>
            <dd>{lastRequest?.providerId ?? provider.id}</dd>
          </div>
          <div>
            <dt>Last request</dt>
            <dd>{lastRequest ? `${lastRequest.kind} #${lastRequest.attempt}` : 'none'}</dd>
          </div>
          <div>
            <dt>Stream seen</dt>
            <dd>{lastResponse ? String(lastResponse.hasStream) : 'none'}</dd>
          </div>
          <div>
            <dt>Usage</dt>
            <dd>{usage ? `${usage.totalTokens} tokens` : 'pending'}</dd>
          </div>
          <div>
            <dt>Data parts</dt>
            <dd>{streamData.length}</dd>
          </div>
        </dl>

        <pre>
          {JSON.stringify(
            {
              requestId: lastRequest?.id,
              trigger: lastRequest?.trigger,
              aiSdkTrigger: lastRequest?.aiSdkTrigger,
              data: streamData.map((part) => ({ id: part.id, type: part.type }))
            },
            null,
            2
          )}
        </pre>
      </aside>
    </main>
  )
}
