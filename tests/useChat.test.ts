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

function fakeTurnProvider(turns: ChatChunk[][], requests: ChatRequest[] = []): ChatProvider {
  let callCount = 0
  return {
    id: 'fake-turns',
    async chat(request): Promise<AsyncIterable<ChatChunk>> {
      requests.push(request)
      const chunks = turns[callCount] ?? []
      callCount += 1
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
    const chunks: ChatChunk[] = [{ content: 'a' }, { content: 'b' }, { content: 'c' }]
    const { messages, append, stop } = useChat({ provider: fakeProvider(chunks) })

    const p = append('hi')
    // Stop synchronously.
    stop()
    await p
    // We don't assert on content (depends on whether any chunk landed), but
    // the state should be sane.
    expect(messages.value.length).toBeGreaterThanOrEqual(2)
  })

  it('does not execute tool handlers after stop() aborts a tool-call stream', async () => {
    let callCount = 0
    let resolveAbortReady: () => void = () => {}
    const abortReady = new Promise<void>((resolve) => {
      resolveAbortReady = resolve
    })
    const provider: ChatProvider = {
      id: 'abort-after-tool-call',
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        callCount += 1
        if (callCount > 1) {
          return (async function* () {})()
        }
        return (async function* () {
          yield {
            toolCalls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: { name: 'getWeather', arguments: '{}' }
              }
            ]
          }
          await new Promise<void>((resolve) => {
            request.signal?.addEventListener('abort', () => resolve(), { once: true })
            resolveAbortReady()
          })
          const error = new Error('aborted')
          error.name = 'AbortError'
          throw error
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
    const getWeather = vi.fn(() => 'sunny')
    const { append, messages, stop } = useChat({
      provider,
      toolHandlers: { getWeather }
    })

    const p = append('weather?')
    await abortReady
    expect(messages.value[1].toolCalls).toHaveLength(1)

    stop()
    await p

    expect(getWeather).not.toHaveBeenCalled()
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant'])
  })

  it('setMessages replaces the history', () => {
    const { messages, setMessages } = useChat({ provider: fakeProvider([]) })
    setMessages([{ id: 'x', role: 'user' as const, content: 'one' }])
    expect(messages.value).toHaveLength(1)
    expect(messages.value[0].id).toBe('x')
  })

  it('clear() resets all state', async () => {
    const { messages, input, clear, append } = useChat({
      provider: fakeProvider([{ content: 'ok' }])
    })
    await append('hi')
    input.value = 'leftover'
    clear()
    expect(messages.value).toEqual([])
    expect(input.value).toBe('')
  })

  it('executes tool handlers and continues the conversation', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider(
      [
        [
          {
            toolCalls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: { name: 'getWeather', arguments: '{"city":"Tokyo"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Tokyo is sunny.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { messages, append } = useChat({
      provider,
      toolHandlers: {
        getWeather(args) {
          expect(args).toEqual({ city: 'Tokyo' })
          return { temp: 22, conditions: 'sunny' }
        }
      }
    })

    await append('weather?')

    expect(requests).toHaveLength(2)
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant'])
    expect(messages.value[2]).toMatchObject({
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"temp":22,"conditions":"sunny"}'
    })
    expect(messages.value[3].content).toBe('Tokyo is sunny.')
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
  })

  it('preserves per-request options during tool follow-up requests', async () => {
    const requests: ChatRequest[] = []
    const weatherTool = {
      type: 'function' as const,
      function: {
        name: 'getWeather',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } }
        }
      }
    }
    const provider = fakeTurnProvider(
      [
        [
          {
            toolCalls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: { name: 'getWeather', arguments: '{"city":"Tokyo"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Tokyo is sunny.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { append } = useChat({
      provider,
      toolHandlers: {
        getWeather() {
          return 'sunny'
        }
      }
    })

    await append('weather?', {
      model: 'gpt-test',
      temperature: 0.2,
      tools: [weatherTool],
      toolChoice: 'auto'
    })

    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({
      model: 'gpt-test',
      temperature: 0.2,
      tools: [weatherTool],
      toolChoice: 'auto'
    })
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
  })

  it('throws when a streamed tool call has no registered handler', async () => {
    const provider = fakeTurnProvider([
      [
        {
          toolCalls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: { name: 'missingTool', arguments: '{}' }
            }
          ]
        }
      ]
    ])
    const { append, error, isLoading } = useChat({ provider, toolHandlers: {} })

    await expect(append('run missing tool')).rejects.toThrow(/No tool handler registered/)
    expect(error.value?.message).toMatch(/No tool handler registered/)
    expect(isLoading.value).toBe(false)
  })

  it('rejects invalid JSON tool arguments before invoking the handler', async () => {
    const provider = fakeTurnProvider([
      [
        {
          toolCalls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: { name: 'getWeather', arguments: '{"city":' }
            }
          ]
        }
      ]
    ])
    const getWeather = vi.fn(() => 'sunny')
    const { append, error, isLoading } = useChat({
      provider,
      toolHandlers: { getWeather }
    })

    await expect(append('run malformed tool')).rejects.toThrow(/Invalid JSON arguments/)
    expect(getWeather).not.toHaveBeenCalled()
    expect(error.value?.message).toMatch(/Invalid JSON arguments/)
    expect(isLoading.value).toBe(false)
  })

  it('surfaces tool handler failures', async () => {
    const provider = fakeTurnProvider([
      [
        {
          toolCalls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: { name: 'explode', arguments: '{}' }
            }
          ]
        }
      ]
    ])
    const { append, error, isLoading } = useChat({
      provider,
      toolHandlers: {
        explode() {
          throw new Error('boom')
        }
      }
    })

    await expect(append('run failing tool')).rejects.toThrow('boom')
    expect(error.value?.message).toBe('boom')
    expect(isLoading.value).toBe(false)
  })
})
