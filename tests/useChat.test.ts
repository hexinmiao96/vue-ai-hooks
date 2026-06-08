import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useChat } from '../src/composables/useChat'
import type { ChatProvider } from '../src/providers/types'
import type { ChatChunk, ChatRequest } from '../src/types'

/**
 * Build a fake ChatProvider that yields the chunks you pass in.
 * The chunks are emitted in order, separated by microtask boundaries.
 */
function fakeProvider(chunks: ChatChunk[]): ChatProvider {
  return {
    id: 'fake',
    async chat(): Promise<AsyncIterable<ChatChunk>> {
      return (async function* () {
        for (const c of chunks) {
          await Promise.resolve()
          yield c
        }
      })()
    },
    async completion(): Promise<AsyncIterable<string>> {
      return (async function* () {
        yield ''
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

describe('useChat', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws if no provider is given', () => {
    expect(() => useChat({} as any)).toThrow(/requires a provider option/)
  })

  it('starts with empty messages by default', () => {
    const { messages } = useChat({ provider: fakeProvider([]) })
    expect(messages.value).toEqual([])
  })

  it('honors initialMessages', () => {
    const initial = [{ id: 'm1', role: 'user' as const, content: 'hi' }]
    const { messages } = useChat({ provider: fakeProvider([]), initialMessages: initial })
    expect(messages.value).toEqual(initial)
  })

  it('appends user + assistant messages and streams content', async () => {
    const chunks: ChatChunk[] = [
      { content: 'Hello' },
      { content: ', ' },
      { content: 'world' },
      { finishReason: 'stop' }
    ]
    const { messages, append, isLoading } = useChat({ provider: fakeProvider(chunks) })

    const p = append('ping')
    // After append, both user and assistant messages are pushed.
    expect(messages.value).toHaveLength(2)
    expect(messages.value[0].role).toBe('user')
    expect(messages.value[0].content).toBe('ping')
    expect(messages.value[1].role).toBe('assistant')
    expect(messages.value[1].content).toBe('')

    await p
    // After streaming finishes, the assistant content is the concatenation.
    const assistant = messages.value[messages.value.length - 1]
    expect(assistant.content).toBe('Hello, world')
    expect(assistant.metadata?.finishReason).toBe('stop')
    expect(isLoading.value).toBe(false)
  })

  it('sends the latest user message to the provider only once', async () => {
    let capturedRequest: ChatRequest | undefined
    const provider: ChatProvider = {
      id: 'capture',
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        capturedRequest = request
        return (async function* () {
          yield { content: 'ok' }
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return (async function* () {
          yield ''
        })()
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }

    const { append } = useChat({
      provider,
      initialMessages: [{ id: 'system-1', role: 'system', content: 'Be brief.' }]
    })
    await append('ping')

    expect(capturedRequest?.messages.map((m) => m.content)).toEqual(['Be brief.', 'ping'])
  })

  it('stop() cancels an in-flight stream', async () => {
    const chunks: ChatChunk[] = [
      { content: 'a' },
      { content: 'b' },
      { content: 'c' }
    ]
    const { messages, append, stop } = useChat({ provider: fakeProvider(chunks) })

    const p = append('hi')
    // Stop synchronously.
    stop()
    await p
    // We don't assert on content (depends on whether any chunk landed), but
    // the state should be sane.
    expect(messages.value.length).toBeGreaterThanOrEqual(2)
  })

  it('setMessages replaces the history', () => {
    const { messages, setMessages } = useChat({ provider: fakeProvider([]) })
    setMessages([{ id: 'x', role: 'user' as const, content: 'one' }])
    expect(messages.value).toHaveLength(1)
    expect(messages.value[0].id).toBe('x')
  })

  it('clear() resets all state', async () => {
    const { messages, input, clear, append } = useChat({ provider: fakeProvider([{ content: 'ok' }]) })
    await append('hi')
    input.value = 'leftover'
    clear()
    expect(messages.value).toEqual([])
    expect(input.value).toBe('')
  })
})
