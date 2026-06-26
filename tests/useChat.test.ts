import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import {
  deserializeMessages,
  pruneMessages,
  serializeMessages,
  useChat
} from '../src/composables/useChat'
import type { ChatProvider } from '../src/providers/types'
import type { ChatChunk, ChatRequest, ChatResumeRequest, Message } from '../src/types'

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

/** In-memory shim that matches the Storage interface. */
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(k) {
      return data.get(k) ?? null
    },
    key(i) {
      return Array.from(data.keys())[i] ?? null
    },
    removeItem(k) {
      data.delete(k)
    },
    setItem(k, v) {
      data.set(k, v)
    }
  } as Storage
}

describe('useChat', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws if no provider is given', () => {
    expect(() => useChat({ provider: undefined as unknown as ChatProvider })).toThrow(
      /requires a provider option/
    )
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

  it('serializes message dates for persistence without mutating messages', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z')
    const messages: Message[] = [
      {
        id: 'a1',
        role: 'assistant',
        content: [{ type: 'image_url', image_url: { url: 'https://cdn.test/a.png' } }],
        createdAt,
        metadata: { model: 'test' },
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q":"vue"}' }
          }
        ]
      }
    ]

    const serialized = serializeMessages(messages)

    expect(serialized[0].createdAt).toBe('2026-01-02T03:04:05.000Z')
    expect(messages[0].createdAt).toBe(createdAt)
    expect(serialized[0]).not.toBe(messages[0])
    expect(Array.isArray(serialized[0].content)).toBe(true)
    if (Array.isArray(serialized[0].content) && Array.isArray(messages[0].content)) {
      expect(serialized[0].content[0]).not.toBe(messages[0].content[0])
    }
  })

  it('deserializes persisted messages and restores valid dates', () => {
    const restored = deserializeMessages([
      {
        id: 'm1',
        role: 'user',
        content: 'hi',
        parts: [{ type: 'text', text: 'hi' }],
        createdAt: '2026-01-02T03:04:05.000Z',
        metadata: { source: 'storage' }
      }
    ])

    expect(restored?.[0].createdAt).toBeInstanceOf(Date)
    expect(restored?.[0].createdAt?.toISOString()).toBe('2026-01-02T03:04:05.000Z')
    expect(restored?.[0].parts).toEqual([{ type: 'text', text: 'hi' }])
    expect(restored?.[0].metadata).toEqual({ source: 'storage' })
    expect(deserializeMessages({})).toBeNull()
    expect(deserializeMessages([{ id: 'bad', role: 'invalid', content: 'x' }])).toBeNull()
    expect(
      deserializeMessages([
        { id: 'bad-parts', role: 'user', content: 'x', parts: [{ type: 'file' }] }
      ])
    ).toBeNull()
  })

  it('deserializes all structured message part variants', () => {
    const restored = deserializeMessages([
      {
        id: 'm1',
        role: 'assistant',
        content: 'answer',
        parts: [
          { type: 'reasoning', id: 'r1', text: 'Think first.' },
          { type: 'source', id: 's1', sourceType: 'document', title: 'Spec' },
          {
            type: 'file',
            id: 'f1',
            url: 'https://example.test/a.pdf',
            mediaType: 'application/pdf'
          },
          { type: 'data', id: 'd1', data: { score: 1 } },
          { type: 'data-progress', id: 'p1', data: { step: 2 }, transient: true },
          {
            type: 'tool-lookup',
            toolCallId: 'call_1',
            toolName: 'lookup',
            state: 'output-available',
            output: { ok: true }
          }
        ]
      }
    ])

    expect(restored?.[0].parts).toEqual([
      { type: 'reasoning', id: 'r1', text: 'Think first.' },
      { type: 'source', id: 's1', sourceType: 'document', title: 'Spec' },
      { type: 'file', id: 'f1', url: 'https://example.test/a.pdf', mediaType: 'application/pdf' },
      { type: 'data', id: 'd1', data: { score: 1 } },
      { type: 'data-progress', id: 'p1', data: { step: 2 }, transient: true },
      {
        type: 'tool-lookup',
        toolCallId: 'call_1',
        toolName: 'lookup',
        state: 'output-available',
        output: { ok: true }
      }
    ])
    expect(
      deserializeMessages([
        { id: 'bad-text-part', role: 'assistant', content: '', parts: [{ type: 'text', text: 1 }] }
      ])
    ).toBeNull()
    expect(
      deserializeMessages([
        {
          id: 'bad-tool-part',
          role: 'assistant',
          content: '',
          parts: [{ type: 'tool-lookup', toolCallId: 'call_1', state: 'input-available' }]
        }
      ])
    ).toBeNull()
    expect(
      deserializeMessages([
        {
          id: 'bad-tool-state',
          role: 'assistant',
          content: '',
          parts: [
            {
              type: 'tool-lookup',
              toolCallId: 'call_1',
              toolName: 'lookup',
              state: 'queued'
            }
          ]
        }
      ])
    ).toBeNull()
    expect(
      deserializeMessages([
        {
          id: 'bad-source-type',
          role: 'assistant',
          content: '',
          parts: [{ type: 'source', sourceType: 'web' }]
        }
      ])
    ).toBeNull()
    expect(
      deserializeMessages([
        { id: 'unknown-part', role: 'assistant', content: '', parts: [{ type: 'unknown' }] }
      ])
    ).toBeNull()
  })

  it('persists chat messages with Date-safe defaults', async () => {
    const storage = memoryStorage()
    const createdAt = new Date('2026-02-03T04:05:06.000Z')
    const first = useChat({
      provider: fakeProvider([]),
      id: 'persist-source',
      persist: { key: 'chat:persist', storage }
    })

    first.setMessages([{ id: 'm1', role: 'user', content: 'saved', createdAt }])
    await nextTick()

    expect(JSON.parse(storage.getItem('chat:persist') as string)).toEqual([
      { id: 'm1', role: 'user', content: 'saved', createdAt: '2026-02-03T04:05:06.000Z' }
    ])

    const restored = useChat({
      provider: fakeProvider([]),
      id: 'persist-target',
      persist: { key: 'chat:persist', storage }
    })

    expect(restored.messages.value[0].createdAt).toBeInstanceOf(Date)
    expect(restored.messages.value[0].createdAt?.toISOString()).toBe('2026-02-03T04:05:06.000Z')
  })

  it('prunes chat history for provider requests without mutating original messages', () => {
    const messages: Message[] = [
      { id: 'sys', role: 'system', content: 'Use short answers.' },
      { id: 'empty', role: 'user', content: '   ' },
      {
        id: 'old-assistant',
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_old',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q":"old"}' }
          }
        ]
      },
      { id: 'old-tool', role: 'tool', toolCallId: 'call_old', content: '{"old":true}' },
      { id: 'u1', role: 'user', content: 'First question' },
      { id: 'a1', role: 'assistant', content: 'First answer' },
      { id: 'u2', role: 'user', content: 'Latest question' }
    ]

    const pruned = pruneMessages({
      messages,
      maxMessages: 3,
      toolCalls: 'before-last-2-messages'
    })

    expect(pruned.map((message) => message.id)).toEqual(['sys', 'u1', 'a1', 'u2'])
    expect(messages[2].toolCalls).toHaveLength(1)
    expect(pruned[0]).not.toBe(messages[0])
    expect(pruneMessages({ messages, maxMessages: 0 }).map((message) => message.id)).toEqual([
      'sys'
    ])
    expect(pruneMessages({ messages, maxMessages: 0, keepSystem: false })).toEqual([])
  })

  it('can remove all tool call details and keep empty messages when requested', () => {
    const pruned = pruneMessages({
      messages: [
        {
          id: 'assistant',
          role: 'assistant',
          content: '',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'lookup', arguments: '{}' }
            }
          ]
        },
        { id: 'tool', role: 'tool', toolCallId: 'call_1', content: '{"ok":true}' },
        { id: 'empty', role: 'assistant', content: '' }
      ],
      emptyMessages: 'keep',
      toolCalls: 'all'
    })

    expect(pruned).toEqual([
      { id: 'assistant', role: 'assistant', content: '' },
      { id: 'empty', role: 'assistant', content: '' }
    ])
  })

  it('shares state across instances with the same id and seeds from the first instance', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'shared output' }]], requests)
    const first = useChat({
      provider,
      id: 'shared-chat-state',
      initialInput: 'first prompt',
      initialMessages: [{ id: 'seed', role: 'system', content: 'seeded' }]
    })
    const second = useChat({
      provider,
      id: 'shared-chat-state',
      initialInput: 'ignored prompt',
      initialMessages: [{ id: 'ignored', role: 'system', content: 'ignored' }]
    })

    expect(second.input.value).toBe('first prompt')
    expect(second.messages.value).toEqual([{ id: 'seed', role: 'system', content: 'seeded' }])

    first.setInput('shared prompt')
    await second.handleSubmit()

    expect(first.input.value).toBe('')
    expect(requests[0].messages.map((message) => message.content)).toEqual([
      'seeded',
      'shared prompt'
    ])
    expect(first.messages.value.map((message) => message.content)).toEqual([
      'seeded',
      'shared prompt',
      'shared output'
    ])
  })

  it('wires chat form helpers and clears input after successful submit', async () => {
    const requests: ChatRequest[] = []
    const { handleInputChange, handleSubmit, input, messages, setInput } = useChat({
      provider: fakeTurnProvider([[{ content: 'ok' }]], requests)
    })
    const event = { preventDefault: vi.fn() }

    handleInputChange({ target: { value: 'hello' } })
    expect(input.value).toBe('hello')
    handleInputChange('hello again')
    expect(input.value).toBe('hello again')
    setInput('final prompt')

    await handleSubmit(event, { temperature: 0.2 })

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(input.value).toBe('')
    expect(requests[0].temperature).toBe(0.2)
    expect(messages.value[0].content).toBe('final prompt')
    expect(messages.value[1].content).toBe('ok')
  })

  it('keeps chat input when form submission fails', async () => {
    const provider: ChatProvider = {
      ...fakeProvider([]),
      async chat() {
        throw new Error('provider failed')
      }
    }
    const { error, handleSubmit, input, setInput } = useChat({ provider })

    setInput('retry me')
    await expect(handleSubmit()).rejects.toThrow('provider failed')

    expect(input.value).toBe('retry me')
    expect(error.value?.message).toBe('provider failed')
  })

  it('ignores empty form submissions unless attachments are provided', async () => {
    const requests: ChatRequest[] = []
    const { handleSubmit, messages } = useChat({
      provider: fakeTurnProvider([[{ content: 'ok' }]], requests)
    })

    await handleSubmit()
    expect(requests).toHaveLength(0)
    expect(messages.value).toEqual([])

    await handleSubmit(undefined, {
      attachments: [{ name: 'note.txt', type: 'text/plain', text: 'hello' }]
    })

    expect(requests).toHaveLength(1)
    expect(messages.value[0].content).toEqual([{ type: 'text', text: 'File note.txt:\nhello' }])
  })

  it('uses generateId for chat, message, tool, and stream data ids', async () => {
    const prefixes: string[] = []
    const generateId = (prefix = 'msg') => {
      prefixes.push(prefix)
      return `${prefix}_${prefixes.length}`
    }
    const requests: ChatRequest[] = []
    const { addToolResult, append, id, messages, pendingToolCalls, streamData } = useChat({
      provider: fakeTurnProvider(
        [
          [
            { content: 'Needs lookup' },
            { dataType: 'source', data: { title: 'Generated data id' } },
            {
              toolCalls: [
                {
                  index: 0,
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'lookup', arguments: '{}' }
                }
              ]
            }
          ],
          [{ content: 'Done' }]
        ],
        requests
      ),
      generateId
    })

    await append('custom ids')

    expect(id.value).toBe('chat_1')
    expect(requests[0].id).toBe('chat_1')
    expect(messages.value.map((message) => message.id)).toEqual(['user_2', 'assistant_3'])
    expect(streamData.value[0].id).toBe('data_4')
    expect(pendingToolCalls.value).toHaveLength(1)

    await addToolResult('call_1', { ok: true })

    expect(messages.value.map((message) => message.id)).toEqual([
      'user_2',
      'assistant_3',
      'tool_5',
      'assistant_6'
    ])
    expect(prefixes).toEqual(['chat', 'user', 'assistant', 'data', 'tool', 'assistant'])
  })

  it('appends user + assistant messages and streams content', async () => {
    const chunks: ChatChunk[] = [
      { content: 'Hello' },
      { content: ', ' },
      { content: 'world' },
      { finishReason: 'stop' }
    ]
    const { messages, append, isLoading, usage } = useChat({ provider: fakeProvider(chunks) })

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
    expect(usage.value).toBe(null)
    expect(isLoading.value).toBe(false)
  })

  it('tracks submitted, streaming, ready, and error statuses', async () => {
    let startStream: () => void = () => {}
    let finishStream: () => void = () => {}
    const streamStarted = new Promise<void>((resolve) => {
      startStream = resolve
    })
    const streamFinished = new Promise<void>((resolve) => {
      finishStream = resolve
    })
    const provider: ChatProvider = {
      id: 'status',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield { content: 'ok' }
          startStream()
          await streamFinished
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
    const { append, clearError, error, status } = useChat({ provider })

    expect(status.value).toBe('ready')
    const p = append('hi')
    expect(status.value).toBe('submitted')

    await streamStarted
    expect(status.value).toBe('streaming')

    finishStream()
    await p
    expect(status.value).toBe('ready')

    error.value = new Error('stale')
    status.value = 'error'
    clearError()
    expect(error.value).toBe(null)
    expect(status.value).toBe('ready')
  })

  it('stores token usage on the return state and assistant metadata', async () => {
    const { messages, append, usage } = useChat({
      provider: fakeProvider([
        {
          content: 'ok',
          usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 }
        }
      ])
    })

    await append('count usage')

    expect(usage.value).toEqual({ promptTokens: 3, completionTokens: 2, totalTokens: 5 })
    expect(messages.value[1].metadata?.usage).toEqual(usage.value)
  })

  it('retries chat streams that fail before the first chunk', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const provider: ChatProvider = {
      id: 'retry-chat',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        calls += 1
        if (calls === 1) throw new Error('temporary outage')
        return (async function* () {
          yield { content: 'recovered' }
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
    const { append, messages, error } = useChat({
      provider,
      maxRetries: 1,
      onRetry
    })

    await append('retry please')

    expect(calls).toBe(2)
    expect(messages.value[1].content).toBe('recovered')
    expect(error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'temporary outage' }),
      expect.objectContaining({ attempt: 1, maxRetries: 1 })
    )
  })

  it('does not retry chat streams after a chunk was received', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const onFinish = vi.fn()
    const provider: ChatProvider = {
      id: 'partial-failure',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        calls += 1
        return (async function* () {
          yield { content: 'partial' }
          throw new Error('stream failed')
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
    const { append, messages, error } = useChat({
      provider,
      maxRetries: 2,
      onFinish,
      onRetry
    })

    await expect(append('do not duplicate')).rejects.toThrow('stream failed')

    expect(calls).toBe(1)
    expect(messages.value[1].content).toBe('partial')
    expect(error.value?.message).toBe('stream failed')
    expect(onRetry).not.toHaveBeenCalled()
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'partial' }),
      expect.objectContaining({
        message: expect.objectContaining({ content: 'partial' }),
        messages: [
          expect.objectContaining({ role: 'user', content: 'do not duplicate' }),
          expect.objectContaining({ role: 'assistant', content: 'partial' })
        ],
        isAbort: false,
        isError: true
      })
    )
  })

  it('stores custom stream data and merges assistant metadata', async () => {
    const onData = vi.fn()
    const { append, messages, streamData } = useChat({
      provider: fakeProvider([
        { dataId: 'status', dataType: 'progress', data: { state: 'loading' } },
        { dataId: 'source-1', dataType: 'source', data: { title: 'Vue docs' } },
        { dataId: 'status', dataType: 'progress', data: { state: 'done' } },
        { dataType: 'debug', data: { trace: 'temporary' }, transient: true },
        { content: 'Answer', metadata: { model: 'test-model', runId: 'run_1' } }
      ]),
      onData
    })

    await append('with stream data')

    expect(streamData.value).toMatchObject([
      { id: 'status', type: 'progress', data: { state: 'done' } },
      { id: 'source-1', type: 'source', data: { title: 'Vue docs' } }
    ])
    expect(streamData.value).toHaveLength(2)
    expect(streamData.value[0].createdAt).toBeInstanceOf(Date)
    expect(onData).toHaveBeenCalledTimes(4)
    expect(messages.value[1].metadata).toMatchObject({ model: 'test-model', runId: 'run_1' })
  })

  it('builds structured assistant message parts from stream chunks', async () => {
    const { append, messages } = useChat({
      provider: fakeProvider([
        { content: 'Hel' },
        { content: 'lo' },
        {
          dataId: 'source_1',
          dataType: 'source-url',
          data: { url: 'https://example.test/docs', title: 'Docs' }
        },
        {
          dataId: 'file_1',
          dataType: 'file',
          data: { url: 'https://example.test/a.txt', mediaType: 'text/plain', name: 'a.txt' }
        },
        {
          toolCalls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: { name: 'lookup', arguments: '{"q":"' }
            }
          ]
        },
        {
          toolCalls: [
            {
              index: 0,
              id: 'call_1',
              type: 'function',
              function: { arguments: 'vue"}' }
            }
          ]
        },
        { parts: [{ type: 'reasoning', id: 'r1', text: 'Check docs.' }] }
      ])
    })

    await append('with parts')

    expect(messages.value[1].parts).toEqual([
      { type: 'text', text: 'Hello' },
      {
        type: 'source',
        id: 'source_1',
        sourceType: 'url',
        url: 'https://example.test/docs',
        title: 'Docs',
        data: { url: 'https://example.test/docs', title: 'Docs' }
      },
      {
        type: 'file',
        id: 'file_1',
        url: 'https://example.test/a.txt',
        mediaType: 'text/plain',
        name: 'a.txt',
        data: { url: 'https://example.test/a.txt', mediaType: 'text/plain', name: 'a.txt' }
      },
      {
        type: 'tool-lookup',
        toolCallId: 'call_1',
        toolName: 'lookup',
        state: 'input-streaming',
        inputText: '{"q":"vue"}'
      },
      { type: 'reasoning', id: 'r1', text: 'Check docs.' }
    ])
  })

  it('merges explicit and data-backed structured message parts', async () => {
    const { append, messages, streamData } = useChat({
      provider: fakeProvider([
        { parts: [{ type: 'source', id: 's1', title: 'Draft title' }] },
        { parts: [{ type: 'source', id: 's1', url: 'https://example.test/source' }] },
        { parts: [{ type: 'text', id: 't1', text: 'A' }] },
        { parts: [{ type: 'text', id: 't1', text: 'B' }] },
        {
          dataId: 'doc_1',
          dataType: 'source-document',
          data: { title: 'Spec', mediaType: 'text/markdown' }
        },
        { dataId: 'trace_1', dataType: 'data-debug', data: { trace: 'visible' } },
        { dataId: 'fallback_1', dataType: 'debug', data: { trace: 'fallback' } },
        { dataId: 'file_missing_url', dataType: 'file', data: { name: 'missing-url.txt' } },
        {
          dataId: 'tool_ok',
          dataType: 'tool-output-available',
          data: { toolCallId: 'call_ok', toolName: 'lookup', output: { ok: true } }
        },
        {
          dataId: 'tool_err',
          dataType: 'tool-output-error',
          data: { toolCallId: 'call_err', errorText: 'failed' }
        },
        { dataId: 'tick', dataType: 'data-progress', data: { step: 1 }, transient: true }
      ])
    })

    await append('merge parts')

    expect(streamData.value.map((part) => part.id)).toEqual([
      'doc_1',
      'trace_1',
      'fallback_1',
      'file_missing_url',
      'tool_ok',
      'tool_err'
    ])
    expect(messages.value[1].parts).toEqual([
      {
        type: 'source',
        id: 's1',
        title: 'Draft title',
        url: 'https://example.test/source'
      },
      { type: 'text', id: 't1', text: 'AB' },
      {
        type: 'source',
        id: 'doc_1',
        sourceType: 'document',
        title: 'Spec',
        mediaType: 'text/markdown',
        data: { title: 'Spec', mediaType: 'text/markdown' }
      },
      { type: 'data-debug', id: 'trace_1', data: { trace: 'visible' }, transient: undefined },
      { type: 'data', id: 'fallback_1', data: { trace: 'fallback' }, transient: undefined },
      {
        type: 'data',
        id: 'file_missing_url',
        data: { name: 'missing-url.txt' },
        transient: undefined
      },
      {
        type: 'tool-lookup',
        toolCallId: 'call_ok',
        toolName: 'lookup',
        state: 'output-available',
        output: { ok: true }
      },
      {
        type: 'tool-tool',
        toolCallId: 'call_err',
        toolName: 'tool',
        state: 'output-error',
        errorText: 'failed'
      }
    ])
  })

  it('throttles chat message and stream data ref updates', async () => {
    let releaseStream!: () => void
    let resolveFirstBatch!: () => void
    const firstBatchSeen = new Promise<void>((resolve) => {
      resolveFirstBatch = resolve
    })
    const streamReleased = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const provider: ChatProvider = {
      id: 'throttled-chat',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield { content: 'A' }
          yield { dataId: 'progress', dataType: 'status', data: { step: 1 } }
          yield { content: 'B' }
          resolveFirstBatch()
          await streamReleased
          yield { content: 'C' }
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
    const onUpdate = vi.fn()
    const { append, messages, streamData } = useChat({
      provider,
      throttleMs: 50,
      onUpdate
    })

    const pending = append('throttle')
    await firstBatchSeen

    expect(messages.value[1].content).toBe('')
    expect(streamData.value).toEqual([])
    expect(onUpdate).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(messages.value[1].content).toBe('AB')
    expect(streamData.value).toMatchObject([{ id: 'progress', type: 'status', data: { step: 1 } }])
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ content: 'AB' }))

    releaseStream()
    await pending

    expect(messages.value[1].content).toBe('ABC')
    expect(streamData.value).toHaveLength(1)
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ content: 'ABC' }))
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

  it('converts append attachments into multimodal message parts', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'ok' }]], requests)
    const { append, messages } = useChat({ provider })
    const noteFile = new File(['short note'], 'note.txt', { type: 'text/plain' })
    const imageFile = new File([new Uint8Array([1, 2, 3])], 'diagram.png', {
      type: 'image/png'
    })

    await append('Review these files.', {
      attachments: [noteFile, imageFile]
    })

    expect(messages.value[0].content).toEqual([
      { type: 'text', text: 'Review these files.' },
      { type: 'text', text: 'File note.txt:\nshort note' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AQID' } }
    ])
    expect(requests[0].messages[0].content).toEqual(messages.value[0].content)
  })

  it('appends attachments to an existing message object content array', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'ok' }]], requests)
    const { append } = useChat({ provider })
    const imageFile = new File([new Uint8Array([4, 5, 6])], 'chart.png', {
      type: 'image/png'
    })

    await append(
      {
        id: 'u1',
        role: 'user',
        content: [{ type: 'text', text: 'Describe this chart.' }]
      },
      { attachments: [imageFile] }
    )

    expect(requests[0].messages[0].content).toEqual([
      { type: 'text', text: 'Describe this chart.' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,BAUG' } }
    ])
  })

  it('converts preloaded file attachment objects into multimodal message parts', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'ok' }]], requests)
    const { append } = useChat({ provider })

    await append('Review uploaded assets.', {
      attachments: [
        {
          name: 'uploaded.png',
          type: 'image/png',
          url: 'https://cdn.example.test/uploaded.png'
        },
        {
          name: 'draft.txt',
          type: 'text/plain',
          text: 'Already read on the app side.'
        }
      ]
    })

    expect(requests[0].messages[0].content).toEqual([
      { type: 'text', text: 'Review uploaded assets.' },
      {
        type: 'image_url',
        image_url: { url: 'https://cdn.example.test/uploaded.png' }
      },
      { type: 'text', text: 'File draft.txt:\nAlready read on the app side.' }
    ])
  })

  it('rejects unsupported attachments before sending to the provider', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'unused' }]], requests)
    const { append, error, messages, status } = useChat({ provider })
    const pdfFile = new File(['pdf'], 'contract.pdf', { type: 'application/pdf' })

    await expect(append('Read this.', { attachments: [pdfFile] })).rejects.toThrow(
      /Unsupported attachment type "application\/pdf"/
    )

    expect(requests).toEqual([])
    expect(messages.value).toEqual([])
    expect(error.value?.message).toMatch(/Only image\/\* and text\/\* files/)
    expect(status.value).toBe('error')
  })

  it('rejects incomplete preloaded attachment objects before sending', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'unused' }]], requests)
    const { append, error, messages } = useChat({ provider })

    await expect(
      append('Read this.', {
        attachments: [{ name: 'remote.txt', type: 'text/plain', url: 'https://example.test/a.txt' }]
      })
    ).rejects.toThrow(/Provide image\/\* with url or text\/\* with text/)

    expect(requests).toEqual([])
    expect(messages.value).toEqual([])
    expect(error.value?.message).toMatch(/Unsupported attachment object "text\/plain"/)
  })

  it('encodes image attachments without Node Buffer when browser btoa is available', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'ok' }]], requests)
    const { append } = useChat({ provider })
    const imageFile = {
      name: 'pixel.png',
      type: 'image/png',
      async arrayBuffer() {
        return new Uint8Array([7, 8, 9]).buffer
      }
    } as File
    const originalBuffer = Reflect.get(globalThis, 'Buffer') as unknown

    try {
      Reflect.set(globalThis, 'Buffer', undefined)
      await append('Look at this.', { attachments: [imageFile] })
    } finally {
      Reflect.set(globalThis, 'Buffer', originalBuffer)
    }

    expect(requests[0].messages[0].content).toEqual([
      { type: 'text', text: 'Look at this.' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,BwgJ' } }
    ])
  })

  it('rejects image attachments when base64 encoding is unavailable', async () => {
    const provider = fakeTurnProvider([[{ content: 'unused' }]])
    const { append, error } = useChat({ provider })
    const imageFile = {
      name: 'pixel.png',
      type: 'image/png',
      async arrayBuffer() {
        return new Uint8Array([1]).buffer
      }
    } as File
    const originalBuffer = Reflect.get(globalThis, 'Buffer') as unknown
    const originalBtoa = Reflect.get(globalThis, 'btoa') as unknown

    try {
      Reflect.set(globalThis, 'Buffer', undefined)
      Reflect.set(globalThis, 'btoa', undefined)
      await expect(append('Look at this.', { attachments: [imageFile] })).rejects.toThrow(
        /base64 is unavailable/
      )
    } finally {
      Reflect.set(globalThis, 'Buffer', originalBuffer)
      Reflect.set(globalThis, 'btoa', originalBtoa)
    }

    expect(error.value?.message).toMatch(/base64 is unavailable/)
  })

  it('rejects text attachments when FileReader is unavailable', async () => {
    const provider = fakeTurnProvider([[{ content: 'unused' }]])
    const { append, error } = useChat({ provider })
    const textFile = new File(['note'], 'note.txt', { type: 'text/plain' })
    const originalFileReader = Reflect.get(globalThis, 'FileReader') as unknown

    try {
      Reflect.set(globalThis, 'FileReader', undefined)
      await expect(append('Read this.', { attachments: [textFile] })).rejects.toThrow(
        /FileReader is unavailable/
      )
    } finally {
      Reflect.set(globalThis, 'FileReader', originalFileReader)
    }

    expect(error.value?.message).toMatch(/FileReader is unavailable/)
  })

  it('rejects image attachments when FileReader is unavailable', async () => {
    const provider = fakeTurnProvider([[{ content: 'unused' }]])
    const { append, error } = useChat({ provider })
    const imageFile = new File([new Uint8Array([1])], 'pixel.png', { type: 'image/png' })
    const originalFileReader = Reflect.get(globalThis, 'FileReader') as unknown

    try {
      Reflect.set(globalThis, 'FileReader', undefined)
      await expect(append('Look at this.', { attachments: [imageFile] })).rejects.toThrow(
        /FileReader is unavailable/
      )
    } finally {
      Reflect.set(globalThis, 'FileReader', originalFileReader)
    }

    expect(error.value?.message).toMatch(/FileReader is unavailable/)
  })

  it('accepts a message object and reports update and finish callbacks', async () => {
    const onUpdate = vi.fn()
    const onChunk = vi.fn()
    const onFinish = vi.fn()
    const { append, messages } = useChat({
      provider: fakeProvider([{ content: 'ok' }, { finishReason: 'stop' }]),
      onChunk,
      onUpdate,
      onFinish
    })

    await append({ id: '', role: 'user', content: 'from object' } as Message)

    expect(messages.value[0]).toMatchObject({
      role: 'user',
      content: 'from object'
    })
    expect(messages.value[0].id).not.toBe('')
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ content: 'ok' }))
    expect(onChunk).toHaveBeenNthCalledWith(
      1,
      { content: 'ok' },
      expect.objectContaining({ content: 'ok' })
    )
    expect(onChunk).toHaveBeenNthCalledWith(
      2,
      { finishReason: 'stop' },
      expect.objectContaining({ metadata: { finishReason: 'stop' } })
    )
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'assistant',
        content: 'ok',
        metadata: { finishReason: 'stop' }
      }),
      expect.objectContaining({
        message: expect.objectContaining({
          role: 'assistant',
          content: 'ok',
          metadata: { finishReason: 'stop' }
        }),
        messages: [
          expect.objectContaining({ role: 'user', content: 'from object' }),
          expect.objectContaining({ role: 'assistant', content: 'ok' })
        ],
        isAbort: false,
        isError: false,
        finishReason: 'stop'
      })
    )
  })

  it('replaces an existing message by messageId and drops later history before streaming', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'edited answer' }]], requests)
    const { append, messages } = useChat({
      provider,
      initialMessages: [
        { id: 's1', role: 'system', content: 'Be brief.' },
        { id: 'u1', role: 'user', content: 'old question' },
        { id: 'a1', role: 'assistant', content: 'old answer' },
        { id: 'u2', role: 'user', content: 'later question' },
        { id: 'a2', role: 'assistant', content: 'later answer' }
      ]
    })

    await append('edited question', { messageId: 'u1', temperature: 0.4 })

    expect(requests[0]).toMatchObject({ temperature: 0.4 })
    expect(requests[0].messages.map((m) => m.content)).toEqual(['Be brief.', 'edited question'])
    expect(messages.value.map((m) => m.id)).toEqual([
      's1',
      'u1',
      expect.stringMatching(/^assistant_/)
    ])
    expect(messages.value[1]).toMatchObject({
      id: 'u1',
      role: 'user',
      content: 'edited question'
    })
    expect(messages.value[2]).toMatchObject({
      role: 'assistant',
      content: 'edited answer'
    })
  })

  it('rejects when append messageId does not exist', async () => {
    const provider = fakeTurnProvider([[{ content: 'unused' }]])
    const initial = [{ id: 'u1', role: 'user' as const, content: 'question' }]
    const { append, error, messages, status } = useChat({ provider, initialMessages: initial })

    await expect(append('edit', { messageId: 'missing' })).rejects.toThrow(
      /No message found for "missing"/
    )

    expect(messages.value).toEqual(initial)
    expect(error.value?.message).toBe('No message found for "missing"')
    expect(status.value).toBe('error')
  })

  it('passes default request options, tools, and toolChoice to the provider', async () => {
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
    const provider = fakeTurnProvider([[{ content: 'ok' }]], requests)
    const { sendMessage } = useChat({
      provider,
      defaultRequest: {
        model: 'default-model',
        temperature: 0.1,
        body: { providerOption: 'default', cache_control: { type: 'ephemeral' } }
      },
      tools: [weatherTool],
      toolChoice: 'auto'
    })

    await sendMessage('weather?', { body: { providerOption: 'runtime' } })

    expect(requests[0]).toMatchObject({
      model: 'default-model',
      temperature: 0.1,
      body: { providerOption: 'runtime', cache_control: { type: 'ephemeral' } },
      tools: [weatherTool],
      toolChoice: 'auto'
    })
    expect(requests[0].signal).toBeInstanceOf(AbortSignal)
  })

  it('prepares send-message requests before calling the provider', async () => {
    const requests: ChatRequest[] = []
    const prepareSendMessagesRequest = vi.fn(({ body, headers, request }) => ({
      body: { prepared: true, tenantId: body?.tenantId },
      headers: { ...headers, 'X-Prepared': 'yes' },
      metadata: { source: 'prepared', originalMetadata: request.metadata },
      temperature: 0.7
    }))
    const provider = fakeTurnProvider([[{ content: 'prepared' }]], requests)
    const { append } = useChat({
      provider,
      id: 'chat_prepare',
      defaultRequest: {
        model: 'default-model',
        body: { tenantId: 'tenant_default', defaultOnly: true },
        headers: { 'X-Default': 'yes' }
      },
      prepareSendMessagesRequest
    })

    await append('prepare this', {
      body: { tenantId: 'tenant_runtime' },
      headers: { 'X-Trace': 'trace_1' },
      metadata: { traceId: 'trace_1' }
    })

    expect(prepareSendMessagesRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chat_prepare',
        trigger: 'submit-message',
        messageId: undefined,
        body: { tenantId: 'tenant_runtime', defaultOnly: true },
        headers: { 'X-Default': 'yes', 'X-Trace': 'trace_1' },
        requestMetadata: { traceId: 'trace_1' },
        messages: [expect.objectContaining({ role: 'user', content: 'prepare this' })],
        request: expect.objectContaining({
          id: 'chat_prepare',
          model: 'default-model',
          metadata: { traceId: 'trace_1' }
        })
      })
    )
    expect(requests[0]).toMatchObject({
      id: 'chat_prepare',
      model: 'default-model',
      temperature: 0.7,
      metadata: {
        source: 'prepared',
        originalMetadata: { traceId: 'trace_1' }
      },
      body: {
        tenantId: 'tenant_runtime',
        defaultOnly: true,
        prepared: true
      },
      headers: {
        'X-Default': 'yes',
        'X-Trace': 'trace_1',
        'X-Prepared': 'yes'
      }
    })
    expect(requests[0].signal).toBeInstanceOf(AbortSignal)
  })

  it('reports regenerate trigger and message id to the send request preparer', async () => {
    const requests: ChatRequest[] = []
    const prepareSendMessagesRequest = vi.fn()
    const provider = fakeTurnProvider([[{ content: 'new answer' }]], requests)
    const { regenerate } = useChat({
      provider,
      initialMessages: [
        { id: 'u1', role: 'user', content: 'question' },
        { id: 'a1', role: 'assistant', content: 'old answer' },
        { id: 'u2', role: 'user', content: 'later' }
      ],
      prepareSendMessagesRequest
    })

    await regenerate({ messageId: 'a1' })

    expect(prepareSendMessagesRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: 'regenerate-message',
        messageId: 'a1',
        messages: [{ id: 'u1', role: 'user', content: 'question' }]
      })
    )
    expect(requests[0].messages).toEqual([{ id: 'u1', role: 'user', content: 'question' }])
  })

  it('passes chat id and request metadata to provider requests', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'ok' }], [{ content: 'updated' }]], requests)
    const { append, id, setId } = useChat({
      provider,
      id: 'chat_1',
      defaultRequest: { metadata: { source: 'default' } }
    })

    await append('with metadata', { metadata: { traceId: 'trace_1' } })

    expect(id.value).toBe('chat_1')
    expect(requests[0]).toMatchObject({
      id: 'chat_1',
      metadata: { traceId: 'trace_1' }
    })

    setId('chat_2')
    await append('after id change')

    expect(id.value).toBe('chat_2')
    expect(requests[1]).toMatchObject({
      id: 'chat_2',
      metadata: { source: 'default' }
    })
  })

  it('resumes an active stream into the latest assistant message', async () => {
    const resumeRequests: ChatResumeRequest[] = []
    const onFinish = vi.fn()
    const provider: ChatProvider = {
      ...fakeProvider([]),
      id: 'resumable',
      async resumeChat(request): Promise<AsyncIterable<ChatChunk>> {
        resumeRequests.push(request)
        return (async function* () {
          yield { content: ' continued' }
          yield {
            finishReason: 'stop',
            usage: { promptTokens: 4, completionTokens: 2, totalTokens: 6 }
          }
        })()
      }
    }
    const { messages, resumeStream, status, usage } = useChat({
      provider,
      id: 'chat_resume',
      initialMessages: [{ id: 'a1', role: 'assistant', content: 'Partial' }],
      defaultRequest: { metadata: { source: 'restore' } },
      onFinish
    })

    await resumeStream({ metadata: { traceId: 'resume_1' } })

    expect(resumeRequests[0]).toMatchObject({
      id: 'chat_resume',
      metadata: { traceId: 'resume_1' }
    })
    expect(resumeRequests[0].signal).toBeInstanceOf(AbortSignal)
    expect(messages.value).toHaveLength(1)
    expect(messages.value[0].content).toBe('Partial continued')
    expect(messages.value[0].metadata).toMatchObject({
      finishReason: 'stop',
      usage: { promptTokens: 4, completionTokens: 2, totalTokens: 6 }
    })
    expect(usage.value).toEqual({ promptTokens: 4, completionTokens: 2, totalTokens: 6 })
    expect(status.value).toBe('ready')
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Partial continued' }),
      expect.objectContaining({
        message: expect.objectContaining({ content: 'Partial continued' }),
        messages: [expect.objectContaining({ role: 'assistant', content: 'Partial continued' })],
        isAbort: false,
        isError: false,
        finishReason: 'stop'
      })
    )
  })

  it('prepares reconnect requests before resuming a stream', async () => {
    const resumeRequests: ChatResumeRequest[] = []
    const prepareReconnectToStreamRequest = vi.fn(({ body, headers, request }) => ({
      body: { ...body, prepared: true },
      headers: { ...headers, 'X-Prepared-Resume': 'yes' },
      metadata: { source: 'prepared-resume', originalMetadata: request.metadata }
    }))
    const provider: ChatProvider = {
      ...fakeProvider([]),
      id: 'prepared-resume',
      async resumeChat(request): Promise<AsyncIterable<ChatChunk>> {
        resumeRequests.push(request)
        return (async function* () {
          yield { content: ' resumed' }
        })()
      }
    }
    const { resumeStream } = useChat({
      provider,
      id: 'chat_resume_prepare',
      defaultRequest: {
        body: { tenantId: 'tenant_default' },
        headers: { 'X-Default': 'yes' },
        metadata: { source: 'restore' }
      },
      prepareReconnectToStreamRequest
    })

    await resumeStream({
      body: { resumeReason: 'manual' },
      headers: { 'X-Trace': 'resume_1' },
      metadata: { traceId: 'resume_1' }
    })

    expect(prepareReconnectToStreamRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chat_resume_prepare',
        requestMetadata: { traceId: 'resume_1' },
        body: { tenantId: 'tenant_default', resumeReason: 'manual' },
        headers: { 'X-Default': 'yes', 'X-Trace': 'resume_1' },
        request: expect.objectContaining({
          id: 'chat_resume_prepare',
          metadata: { traceId: 'resume_1' }
        })
      })
    )
    expect(resumeRequests[0]).toMatchObject({
      id: 'chat_resume_prepare',
      body: {
        tenantId: 'tenant_default',
        resumeReason: 'manual',
        prepared: true
      },
      headers: {
        'X-Default': 'yes',
        'X-Trace': 'resume_1',
        'X-Prepared-Resume': 'yes'
      },
      metadata: {
        source: 'prepared-resume',
        originalMetadata: { traceId: 'resume_1' }
      }
    })
    expect(resumeRequests[0].signal).toBeInstanceOf(AbortSignal)
  })

  it('keeps state ready when resume has no active stream', async () => {
    const provider: ChatProvider = {
      ...fakeProvider([]),
      id: 'no-active-stream',
      async resumeChat(): Promise<AsyncIterable<ChatChunk> | null> {
        return null
      }
    }
    const onFinish = vi.fn()
    const { messages, resumeStream, status } = useChat({ provider, onFinish })

    await resumeStream()

    expect(messages.value).toEqual([])
    expect(status.value).toBe('ready')
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('surfaces unsupported provider resume attempts', async () => {
    const { error, resumeStream, status } = useChat({ provider: fakeProvider([]) })

    await expect(resumeStream()).rejects.toThrow(/does not support resumeChat/)

    expect(error.value?.message).toMatch(/does not support resumeChat/)
    expect(status.value).toBe('error')
  })

  it('normalizes provider errors and calls onError', async () => {
    const onError = vi.fn()
    const provider: ChatProvider = {
      id: 'failing-chat',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        throw 'chat failed'
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
    const { append, clearError, error, isLoading, status } = useChat({ provider, onError })

    await expect(append('fail')).rejects.toThrow('chat failed')

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toBe('chat failed')
    expect(status.value).toBe('error')
    expect(onError).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith(error.value)
    expect(isLoading.value).toBe(false)

    clearError()
    expect(error.value).toBe(null)
    expect(status.value).toBe('ready')
  })

  it('stop() cancels an in-flight stream', async () => {
    const chunks: ChatChunk[] = [{ content: 'a' }, { content: 'b' }, { content: 'c' }]
    const onFinish = vi.fn()
    const { messages, append, stop } = useChat({ provider: fakeProvider(chunks), onFinish })

    const p = append('hi')
    // Stop synchronously.
    stop()
    await p
    // We don't assert on content (depends on whether any chunk landed), but
    // the state should be sane.
    expect(messages.value.length).toBeGreaterThanOrEqual(2)
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant' }),
      expect.objectContaining({ isAbort: true, isError: false })
    )
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

  it('setMessages replaces the history and clears turn-scoped stream state', async () => {
    const { messages, setMessages, append, streamData } = useChat({
      provider: fakeProvider([{ dataId: 'source-1', data: { title: 'old' } }])
    })
    await append('collect data')
    expect(streamData.value).toHaveLength(1)

    setMessages([{ id: 'x', role: 'user' as const, content: 'one' }])

    expect(messages.value).toHaveLength(1)
    expect(messages.value[0].id).toBe('x')
    expect(streamData.value).toEqual([])
  })

  it('setMessages accepts an updater function with a history snapshot', () => {
    const { messages, setMessages } = useChat({
      provider: fakeProvider([]),
      initialMessages: [{ id: 'a', role: 'user', content: 'one' }]
    })
    const previousMessages = messages.value
    let updaterInput: Message[] | undefined

    setMessages((current) => {
      updaterInput = current
      current.push({ id: 'b', role: 'assistant', content: 'two' })
      return current
    })

    expect(updaterInput).not.toBe(previousMessages)
    expect(updaterInput).not.toBe(messages.value)
    expect(messages.value.map((message) => message.id)).toEqual(['a', 'b'])
  })

  it('clear() resets all state', async () => {
    const { messages, input, usage, streamData, clear, append } = useChat({
      provider: fakeProvider([{ content: 'ok' }, { dataId: 'source-1', data: { title: 'doc' } }])
    })
    await append('hi')
    input.value = 'leftover'
    usage.value = { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
    clear()
    expect(messages.value).toEqual([])
    expect(input.value).toBe('')
    expect(usage.value).toBe(null)
    expect(streamData.value).toEqual([])
  })

  it('reloads the last assistant turn from the prior messages', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'new answer' }]], requests)
    const { messages, reload } = useChat({
      provider,
      initialMessages: [
        { id: 'u1', role: 'user', content: 'question' },
        { id: 'a1', role: 'assistant', content: 'old answer' },
        { id: 'u2', role: 'user', content: 'later message' }
      ]
    })

    await reload()

    expect(requests[0].messages.map((m) => m.content)).toEqual(['question'])
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(messages.value[1].content).toBe('new answer')
  })

  it('regenerates a specific assistant turn and drops later messages', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'new first answer' }]], requests)
    const { messages, regenerate } = useChat({
      provider,
      initialMessages: [
        { id: 'u1', role: 'user', content: 'first question' },
        { id: 'a1', role: 'assistant', content: 'old first answer' },
        { id: 'u2', role: 'user', content: 'second question' },
        { id: 'a2', role: 'assistant', content: 'old second answer' }
      ]
    })

    await regenerate({ messageId: 'a1', temperature: 0.3 })

    expect(requests[0]).toMatchObject({ temperature: 0.3 })
    expect(requests[0].messages.map((m) => m.content)).toEqual(['first question'])
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(messages.value[1].content).toBe('new first answer')
  })

  it('throws when reload() has no assistant message to re-run', async () => {
    const { reload } = useChat({
      provider: fakeProvider([]),
      initialMessages: [{ id: 'u1', role: 'user', content: 'question' }]
    })

    await expect(reload()).rejects.toThrow(/no assistant message/)
  })

  it('executes tool handlers and continues the conversation', async () => {
    const requests: ChatRequest[] = []
    const onToolCall = vi.fn()
    const onToolResult = vi.fn()
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
      onToolCall,
      onToolResult,
      toolHandlers: {
        getWeather(args, context) {
          expect(args).toEqual({ city: 'Tokyo' })
          expect(context.args).toEqual(args)
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
    expect(onToolCall).toHaveBeenCalledWith(
      { city: 'Tokyo' },
      expect.objectContaining({
        args: { city: 'Tokyo' },
        toolCall: expect.objectContaining({ id: 'call_1' })
      })
    )
    expect(onToolResult).toHaveBeenCalledWith(
      { temp: 22, conditions: 'sunny' },
      expect.objectContaining({
        args: { city: 'Tokyo' },
        resultMessage: expect.objectContaining({
          role: 'tool',
          toolCallId: 'call_1',
          content: '{"temp":22,"conditions":"sunny"}'
        })
      })
    )
  })

  it('waits for manual tool results and continues after addToolResult()', async () => {
    const requests: ChatRequest[] = []
    const onToolCall = vi.fn()
    const onToolResult = vi.fn()
    const provider = fakeTurnProvider(
      [
        [
          {
            toolCalls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: { name: 'confirmPurchase', arguments: '{"sku":"pro"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Purchase confirmed.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { addToolResult, append, messages, pendingToolCalls } = useChat({
      provider,
      onToolCall,
      onToolResult
    })

    await append('Buy the pro plan.')

    expect(requests).toHaveLength(1)
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(pendingToolCalls.value).toHaveLength(1)
    expect(pendingToolCalls.value[0].function.name).toBe('confirmPurchase')
    expect(onToolCall).toHaveBeenCalledWith(
      { sku: 'pro' },
      expect.objectContaining({
        args: { sku: 'pro' },
        toolCall: expect.objectContaining({ id: 'call_1' })
      })
    )

    await addToolResult('call_1', { approved: true }, { temperature: 0 })

    expect(pendingToolCalls.value).toEqual([])
    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({ temperature: 0 })
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant'])
    expect(messages.value[2]).toMatchObject({
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"approved":true}'
    })
    expect(messages.value[3].content).toBe('Purchase confirmed.')
    expect(onToolResult).toHaveBeenCalledWith(
      { approved: true },
      expect.objectContaining({
        args: { sku: 'pro' },
        resultMessage: expect.objectContaining({
          role: 'tool',
          toolCallId: 'call_1',
          content: '{"approved":true}'
        })
      })
    )
  })

  it('accepts AI SDK-style addToolOutput() options', async () => {
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
                function: { name: 'lookupOrder', arguments: '{"orderId":"o1"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Lookup failed but handled.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { addToolOutput, append, messages, pendingToolCalls } = useChat({ provider })

    await append('Look up this order.')
    await addToolOutput(
      {
        tool: 'lookupOrder',
        toolCallId: 'call_1',
        state: 'output-error',
        errorText: 'Order service unavailable'
      },
      { body: { retryPolicy: 'none' } }
    )

    expect(pendingToolCalls.value).toEqual([])
    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({ body: { retryPolicy: 'none' } })
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(messages.value[2]).toMatchObject({
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"state":"output-error","errorText":"Order service unavailable"}'
    })
    expect(messages.value[3].content).toBe('Lookup failed but handled.')
  })

  it('waits for approval before running a registered tool handler', async () => {
    const requests: ChatRequest[] = []
    const chargeCard = vi.fn(() => ({ charged: true }))
    const requiresToolApproval = vi.fn((args) => {
      expect(args).toEqual({ amount: 49 })
      return true
    })
    const provider = fakeTurnProvider(
      [
        [
          {
            toolCalls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: { name: 'chargeCard', arguments: '{"amount":49}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Card charged.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { addToolApprovalResponse, append, messages, pendingToolCalls } = useChat({
      provider,
      requiresToolApproval,
      toolHandlers: { chargeCard }
    })

    await append('Charge my card.')

    expect(requests).toHaveLength(1)
    expect(chargeCard).not.toHaveBeenCalled()
    expect(pendingToolCalls.value.map((call) => call.id)).toEqual(['call_1'])
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant'])

    await addToolApprovalResponse({ id: 'call_1', approved: true }, { temperature: 0 })

    expect(requiresToolApproval).toHaveBeenCalledWith(
      { amount: 49 },
      expect.objectContaining({ toolCall: expect.objectContaining({ id: 'call_1' }) })
    )
    expect(chargeCard).toHaveBeenCalledWith(
      { amount: 49 },
      expect.objectContaining({ toolCall: expect.objectContaining({ id: 'call_1' }) })
    )
    expect(pendingToolCalls.value).toEqual([])
    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({ temperature: 0 })
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'assistant'])
    expect(messages.value[2]).toMatchObject({
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"charged":true}'
    })
    expect(messages.value[3].content).toBe('Card charged.')
  })

  it('continues with a rejected tool result when approval is denied', async () => {
    const requests: ChatRequest[] = []
    const chargeCard = vi.fn(() => ({ charged: true }))
    const provider = fakeTurnProvider(
      [
        [
          {
            toolCalls: [
              {
                index: 0,
                id: 'call_1',
                type: 'function',
                function: { name: 'chargeCard', arguments: '{"amount":49}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Charge cancelled.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { append, messages, pendingToolCalls, rejectToolCall } = useChat({
      provider,
      requiresToolApproval: () => true,
      toolHandlers: { chargeCard }
    })

    await append('Charge my card.')
    await rejectToolCall('call_1', 'User denied')

    expect(chargeCard).not.toHaveBeenCalled()
    expect(pendingToolCalls.value).toEqual([])
    expect(requests).toHaveLength(2)
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(messages.value[2]).toMatchObject({
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"approved":false,"reason":"User denied"}'
    })
    expect(messages.value[3].content).toBe('Charge cancelled.')
  })

  it('mixes automatic tool handlers with approval-gated handlers in the same turn', async () => {
    const requests: ChatRequest[] = []
    const lookup = vi.fn(() => 'known customer')
    const chargeCard = vi.fn(() => ({ charged: true }))
    const provider = fakeTurnProvider(
      [
        [
          {
            toolCalls: [
              {
                index: 0,
                id: 'call_lookup',
                type: 'function',
                function: { name: 'lookup', arguments: '{"userId":"u1"}' }
              },
              {
                index: 1,
                id: 'call_charge',
                type: 'function',
                function: { name: 'chargeCard', arguments: '{"amount":49}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Lookup complete and card charged.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { approveToolCall, append, messages, pendingToolCalls } = useChat({
      provider,
      requiresToolApproval(_args, context) {
        return context.toolCall.function.name === 'chargeCard'
      },
      toolHandlers: { chargeCard, lookup }
    })

    await append('Check and charge.')

    expect(lookup).toHaveBeenCalledWith(
      { userId: 'u1' },
      expect.objectContaining({ toolCall: expect.objectContaining({ id: 'call_lookup' }) })
    )
    expect(chargeCard).not.toHaveBeenCalled()
    expect(requests).toHaveLength(1)
    expect(pendingToolCalls.value.map((call) => call.id)).toEqual(['call_charge'])
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(messages.value[2]).toMatchObject({
      role: 'tool',
      toolCallId: 'call_lookup',
      content: 'known customer'
    })

    await approveToolCall('call_charge')

    expect(chargeCard).toHaveBeenCalledWith(
      { amount: 49 },
      expect.objectContaining({ toolCall: expect.objectContaining({ id: 'call_charge' }) })
    )
    expect(requests).toHaveLength(2)
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'tool'])
    expect(messages.value[messages.value.length - 1].content).toBe(
      'Lookup complete and card charged.'
    )
  })

  it('waits until every pending tool call has a manual result before continuing', async () => {
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
                function: { name: 'lookup', arguments: '{"q":"vue"}' }
              },
              {
                index: 1,
                id: 'call_2',
                type: 'function',
                function: { name: 'readCache', arguments: '{"key":"docs"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Both tool results are ready.' }]
      ],
      requests
    )
    const { addToolResult, append, messages, pendingToolCalls } = useChat({ provider })

    await append('Use two tools.')
    expect(pendingToolCalls.value.map((call) => call.id)).toEqual(['call_1', 'call_2'])

    await addToolResult('call_1', 'lookup result')

    expect(pendingToolCalls.value.map((call) => call.id)).toEqual(['call_2'])
    expect(requests).toHaveLength(1)
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])

    await addToolResult('call_2', 'cache result')

    expect(pendingToolCalls.value).toEqual([])
    expect(requests).toHaveLength(2)
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'tool'])
    expect(messages.value[messages.value.length - 1].content).toBe('Both tool results are ready.')
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
