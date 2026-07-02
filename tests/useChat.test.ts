import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import {
  Chat,
  convertToModelMessages,
  deserializeMessages,
  dynamicTool,
  hasToolCall,
  isStepCount,
  jsonSchema,
  lastAssistantMessageIsCompleteWithToolCalls,
  pruneMessages,
  safeValidateMessages,
  safeValidateUIMessages,
  serializeMessages,
  stepCountIs,
  tool,
  validateMessages,
  validateUIMessages,
  useChat
} from '../src/composables/useChat'
import type { ChatProvider } from '../src/providers/types'
import type {
  ChatChunk,
  ChatRequest,
  ChatResumeRequest,
  Message,
  Tool,
  ToolCall
} from '../src/types'

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

  it('uses a proxy transport when provider is omitted', async () => {
    const prepareSendMessagesRequest = vi.fn(({ api, credentials, body, headers }) => ({
      body: { ...body, prepared: true },
      headers: { ...headers, 'X-Prepared': 'yes' },
      metadata: { api, credentials }
    }))
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify([{ content: 'ok' }]), {
          headers: { 'Content-Type': 'application/json' }
        })
    )
    const { append, lastRequest, messages } = useChat({
      api: '/api/chat',
      headers: { 'X-Session': 'session_1' },
      body: { tenantId: 'tenant_1' },
      credentials: 'include',
      fetch: fetcher as unknown as typeof fetch,
      prepareSendMessagesRequest
    })

    await append('hi')

    expect(prepareSendMessagesRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        api: '/api/chat',
        credentials: 'include',
        trigger: 'submit-message',
        aiSdkTrigger: 'submit-user-message'
      })
    )
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/chat')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1', 'X-Prepared': 'yes' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      prepared: true,
      metadata: { api: '/api/chat', credentials: 'include' },
      messages: [{ role: 'user', content: 'hi' }]
    })
    expect(lastRequest.value).toMatchObject({
      api: '/api/chat',
      credentials: 'include'
    })
    expect(messages.value[1]).toMatchObject({ role: 'assistant', content: 'ok' })
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

  it('accepts messages as an AI SDK-style initial history alias', () => {
    const initial = [{ id: 'm1', role: 'user' as const, content: 'hi' }]
    const { messages } = useChat({ provider: fakeProvider([]), messages: initial })
    expect(messages.value).toEqual(initial)
  })

  it('reuses an existing Chat instance when useChat receives chat', async () => {
    const requests: ChatRequest[] = []
    const chat = new Chat({
      id: 'chat-instance',
      provider: fakeTurnProvider([[{ content: 'from instance' }]], requests)
    })
    const ignoredProvider = fakeProvider([{ content: 'ignored' }])

    const reused = useChat({
      chat,
      id: 'ignored-id',
      provider: ignoredProvider,
      messages: [{ id: 'ignored-message', role: 'user', content: 'ignored' }]
    })

    expect(reused).toBe(chat)
    expect(reused.id.value).toBe('chat-instance')

    await reused.sendMessage({ text: 'hello' })

    expect(requests).toHaveLength(1)
    expect(requests[0].id).toBe('chat-instance')
    expect(reused.messages.value.map((message) => message.content)).toEqual([
      'hello',
      'from instance'
    ])
  })

  it('prefers initialMessages over messages when both are provided', () => {
    const initialMessages = [{ id: 'preferred', role: 'user' as const, content: 'preferred' }]
    const aliasedMessages = [{ id: 'alias', role: 'user' as const, content: 'alias' }]
    const { messages } = useChat({
      provider: fakeProvider([]),
      initialMessages,
      messages: aliasedMessages
    })

    expect(messages.value).toEqual(initialMessages)
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

  it('validates persisted messages without hydrating them', () => {
    const raw = [
      {
        id: 'm1',
        role: 'assistant',
        content: 'answer',
        parts: [{ type: 'text', text: 'answer' }],
        createdAt: '2026-01-02T03:04:05.000Z'
      }
    ]

    expect(validateMessages(raw)).toBe(true)
    expect(raw[0].createdAt).toBe('2026-01-02T03:04:05.000Z')
    expect(validateMessages([{ id: 'bad', role: 'assistant', content: 1 }])).toBe(false)
    expect(validateMessages({ messages: raw })).toBe(false)
  })

  it('safely validates persisted messages with metadata and data part schemas', () => {
    const raw = [
      {
        id: 'm1',
        role: 'assistant',
        content: 'answer',
        metadata: { source: 'storage' },
        parts: [
          { type: 'text', text: 'answer' },
          { type: 'data-progress', data: { value: 60 } }
        ]
      }
    ]

    const result = safeValidateMessages(raw, {
      messageMetadataSchema: {
        type: 'object',
        required: ['source'],
        properties: { source: { type: 'string' } },
        additionalProperties: false
      },
      dataPartSchemas: {
        'data-progress': {
          type: 'object',
          required: ['value'],
          properties: { value: { type: 'number' } },
          additionalProperties: false
        }
      }
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.messages[0].metadata).toEqual({ source: 'storage' })
      expect(result.messages[0].parts?.[1]).toEqual({
        type: 'data-progress',
        data: { value: 60 }
      })
    }
    expect(
      validateMessages(raw, { dataPartSchemas: { 'data-progress': { type: 'object' } } })
    ).toBe(true)
  })

  it('reports safe message validation errors without throwing', () => {
    const raw = [
      {
        id: 'm1',
        role: 'assistant',
        content: 'answer',
        metadata: { source: 1 },
        parts: [{ type: 'data-progress', data: { value: 'bad' } }]
      }
    ]

    const metadataResult = safeValidateMessages(raw, {
      messageMetadataSchema: {
        type: 'object',
        properties: { source: { type: 'string' } }
      }
    })
    const dataResult = safeValidateMessages(raw, {
      dataPartSchemas: {
        'data-progress': {
          type: 'object',
          properties: { value: { type: 'number' } }
        }
      }
    })

    expect(metadataResult.success).toBe(false)
    if (!metadataResult.success) {
      expect(metadataResult.error.message).toContain('messages[0].metadata.source must be string')
    }
    expect(dataResult.success).toBe(false)
    if (!dataResult.success) {
      expect(dataResult.error.message).toContain('messages[0].parts[0].data.value must be number')
    }
    expect(
      validateMessages(raw, { dataPartSchemas: { 'data-progress': { type: 'number' } } })
    ).toBe(false)
  })

  it('exposes AI SDK-style UI message validation aliases', () => {
    const raw = [{ id: 'm1', role: 'user', content: 'hi' }]

    expect(validateUIMessages(raw)).toEqual([{ id: 'm1', role: 'user', content: 'hi' }])
    expect(safeValidateUIMessages(raw)).toEqual({
      success: true,
      messages: [{ id: 'm1', role: 'user', content: 'hi' }]
    })
    expect(() => validateUIMessages([{ id: 'bad', role: 'user', content: 1 }])).toThrow(
      'Messages could not be deserialized'
    )
  })

  it('converts UI messages to model messages without mutating originals', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z')
    const messages: Message[] = [
      {
        id: 'u1',
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image' },
          {
            type: 'image_url',
            image_url: { url: 'https://cdn.test/image.png', detail: 'high' }
          }
        ],
        parts: [{ type: 'text', id: 'part_1', text: 'Describe this image' }],
        createdAt,
        metadata: { source: 'composer' }
      },
      {
        id: 'a1',
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q":"vue"}' }
          }
        ],
        parts: [
          {
            type: 'tool-lookup',
            toolCallId: 'call_1',
            toolName: 'lookup',
            state: 'input-available',
            input: { q: 'vue' }
          }
        ]
      },
      {
        id: 'tool_1',
        role: 'tool',
        toolCallId: 'call_1',
        content: '{"ok":true}'
      }
    ]

    const modelMessages = convertToModelMessages(messages)

    expect(modelMessages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this image' },
          {
            type: 'image_url',
            image_url: { url: 'https://cdn.test/image.png', detail: 'high' }
          }
        ],
        metadata: { source: 'composer' }
      },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q":"vue"}' }
          }
        ]
      },
      {
        role: 'tool',
        toolCallId: 'call_1',
        content: '{"ok":true}'
      }
    ])
    expect('id' in modelMessages[0]).toBe(false)
    expect('createdAt' in modelMessages[0]).toBe(false)
    expect('parts' in modelMessages[0]).toBe(false)
    expect(modelMessages[0].content).not.toBe(messages[0].content)
    if (Array.isArray(modelMessages[0].content) && Array.isArray(messages[0].content)) {
      expect(modelMessages[0].content[1]).not.toBe(messages[0].content[1])
      if (
        modelMessages[0].content[1].type === 'image_url' &&
        messages[0].content[1].type === 'image_url'
      ) {
        expect(modelMessages[0].content[1].image_url).not.toBe(messages[0].content[1].image_url)
      }
    }
    expect(modelMessages[1].toolCalls).not.toBe(messages[1].toolCalls)
    expect(modelMessages[1].toolCalls?.[0].function).not.toBe(messages[1].toolCalls?.[0].function)
    expect(messages[0].parts).toHaveLength(1)
  })

  it('can preserve model message ids and dates while stripping metadata', () => {
    const createdAt = new Date('2026-01-02T03:04:05.000Z')
    const modelMessages = convertToModelMessages(
      [
        {
          id: 'u1',
          role: 'user',
          content: 'Hello',
          createdAt,
          metadata: { source: 'composer' }
        }
      ],
      { preserveIds: true, preserveCreatedAt: true, stripMetadata: true }
    )

    expect(modelMessages).toEqual([
      {
        id: 'u1',
        role: 'user',
        content: 'Hello',
        createdAt
      }
    ])
    expect(modelMessages[0].createdAt).not.toBe(createdAt)
    expect(modelMessages[0].createdAt?.toISOString()).toBe('2026-01-02T03:04:05.000Z')
    expect('metadata' in modelMessages[0]).toBe(false)
  })

  it('converts custom data parts into model message content when requested', () => {
    const messages: Message[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'Use this dashboard context.',
        parts: [
          { type: 'text', text: 'Use this dashboard context.' },
          { type: 'data-chart', data: { title: 'Revenue', value: 42 } },
          { type: 'data-empty', data: { hidden: true } },
          { type: 'data-image', data: { url: 'https://cdn.test/chart.png' } }
        ]
      }
    ]

    const modelMessages = convertToModelMessages(messages, {
      convertDataPart(part) {
        if (part.type === 'data-chart' && typeof part.data === 'object' && part.data !== null) {
          const data = part.data as { title?: unknown; value?: unknown }
          return `Chart ${String(data.title)} value: ${String(data.value)}`
        }
        if (part.type === 'data-image') {
          return {
            type: 'image_url',
            image_url: { url: 'https://cdn.test/chart.png', detail: 'auto' }
          }
        }
        return undefined
      }
    })

    expect(modelMessages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Use this dashboard context.' },
          { type: 'text', text: 'Chart Revenue value: 42' },
          {
            type: 'image_url',
            image_url: { url: 'https://cdn.test/chart.png', detail: 'auto' }
          }
        ]
      }
    ])
    expect(messages[0].parts).toHaveLength(4)
    expect(typeof messages[0].content).toBe('string')
  })

  it('can ignore incomplete tool calls during model message conversion', () => {
    const messages: Message[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'Look up docs and billing status.'
      },
      {
        id: 'a1',
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_done',
            type: 'function',
            function: { name: 'lookupDocs', arguments: '{"q":"vue"}' }
          },
          {
            id: 'call_pending',
            type: 'function',
            function: { name: 'chargeCard', arguments: '{"amount":42}' }
          }
        ]
      },
      {
        id: 'tool_1',
        role: 'tool',
        content: '{"ok":true}',
        toolCallId: 'call_done'
      }
    ]

    const defaultMessages = convertToModelMessages(messages)
    const modelMessages = convertToModelMessages(messages, {
      ignoreIncompleteToolCalls: true
    })

    expect(defaultMessages[1].toolCalls).toHaveLength(2)
    expect(modelMessages).toEqual([
      {
        role: 'user',
        content: 'Look up docs and billing status.'
      },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_done',
            type: 'function',
            function: { name: 'lookupDocs', arguments: '{"q":"vue"}' }
          }
        ]
      },
      {
        role: 'tool',
        content: '{"ok":true}',
        toolCallId: 'call_done'
      }
    ])
    expect(messages[1].toolCalls).toHaveLength(2)
  })

  it('converts tool results with tool toModelOutput definitions', () => {
    const messages: Message[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'Inspect the generated chart.'
      },
      {
        id: 'a1',
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_chart',
            type: 'function',
            function: { name: 'renderChart', arguments: '{"kind":"revenue"}' }
          }
        ]
      },
      {
        id: 'tool_1',
        role: 'tool',
        content: '{"url":"https://cdn.test/chart.png","caption":"Revenue chart"}',
        toolCallId: 'call_chart'
      }
    ]

    const modelMessages = convertToModelMessages(messages, {
      tools: {
        renderChart: tool<{ kind: string }, { url: string; caption: string }>({
          inputSchema: jsonSchema({
            type: 'object',
            required: ['kind'],
            properties: { kind: { type: 'string' } }
          }),
          toModelOutput(output, context) {
            expect(output.caption).toBe('Revenue chart')
            expect(context.toolCall.id).toBe('call_chart')
            return [
              { type: 'text', text: output.caption },
              { type: 'image_url', image_url: { url: output.url, detail: 'auto' } }
            ]
          }
        })
      }
    })

    expect(modelMessages[2]).toEqual({
      role: 'tool',
      content: [
        { type: 'text', text: 'Revenue chart' },
        {
          type: 'image_url',
          image_url: { url: 'https://cdn.test/chart.png', detail: 'auto' }
        }
      ],
      toolCallId: 'call_chart'
    })
    expect(messages[2].content).toBe(
      '{"url":"https://cdn.test/chart.png","caption":"Revenue chart"}'
    )
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

  it('can prune selected tool call details without removing other tools', () => {
    const messages: Message[] = [
      {
        id: 'assistant',
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_lookup',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q":"old"}' }
          },
          {
            id: 'call_calculate',
            type: 'function',
            function: { name: 'calculate', arguments: '{"value":2}' }
          }
        ]
      },
      { id: 'lookup-tool', role: 'tool', toolCallId: 'call_lookup', content: '{"old":true}' },
      {
        id: 'calculate-tool',
        role: 'tool',
        toolCallId: 'call_calculate',
        content: '{"value":4}'
      },
      { id: 'latest', role: 'user', content: 'Use the calculator result.' }
    ]

    const pruned = pruneMessages({
      messages,
      emptyMessages: 'keep',
      toolCalls: [{ type: 'all', tools: ['lookup'] }]
    })

    expect(pruned.map((message) => message.id)).toEqual(['assistant', 'calculate-tool', 'latest'])
    expect(pruned[0].toolCalls).toEqual([
      {
        id: 'call_calculate',
        type: 'function',
        function: { name: 'calculate', arguments: '{"value":2}' }
      }
    ])
    expect(messages[0].toolCalls).toHaveLength(2)
  })

  it('can prune historical reasoning parts without mutating original messages', () => {
    const messages: Message[] = [
      {
        id: 'a1',
        role: 'assistant',
        content: 'First answer',
        parts: [
          { type: 'reasoning', id: 'r1', text: 'Old reasoning' },
          { type: 'text', id: 't1', text: 'First answer' }
        ]
      },
      { id: 'u2', role: 'user', content: 'Latest question' },
      {
        id: 'a2',
        role: 'assistant',
        content: 'Latest answer',
        parts: [
          { type: 'reasoning', id: 'r2', text: 'Keep recent reasoning' },
          { type: 'text', id: 't2', text: 'Latest answer' }
        ]
      }
    ]

    const pruned = pruneMessages({ messages, reasoning: 'before-last-message' })

    expect(pruned[0].parts).toEqual([{ type: 'text', id: 't1', text: 'First answer' }])
    expect(pruned[2].parts).toEqual(messages[2].parts)
    expect(messages[0].parts).toHaveLength(2)
    expect(pruneMessages({ messages, reasoning: 'none' })[0].parts).toEqual(messages[0].parts)
  })

  it('can remove all reasoning parts before empty message pruning', () => {
    const pruned = pruneMessages({
      messages: [
        {
          id: 'reasoning-only',
          role: 'assistant',
          content: '',
          parts: [{ type: 'reasoning', id: 'r1', text: 'Drop me' }]
        },
        {
          id: 'answer',
          role: 'assistant',
          content: 'Visible answer',
          parts: [
            { type: 'reasoning', id: 'r2', text: 'Drop me too' },
            { type: 'text', id: 't2', text: 'Visible answer' }
          ]
        }
      ],
      reasoning: 'all'
    })

    expect(pruned).toEqual([
      {
        id: 'answer',
        role: 'assistant',
        content: 'Visible answer',
        parts: [{ type: 'text', id: 't2', text: 'Visible answer' }]
      }
    ])
  })

  it('rejects unsupported reasoning pruning strategies', () => {
    expect(() =>
      pruneMessages({
        messages: [{ id: 'a1', role: 'assistant', content: 'answer' }],
        reasoning: 'before-last-many-messages' as never
      })
    ).toThrow(/Unsupported reasoning pruning strategy/)
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

  it('reports prepared chat request lifecycle attempts', async () => {
    let calls = 0
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const provider: ChatProvider = {
      id: 'observable-chat',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        calls += 1
        if (calls === 1) throw new Error('retryable setup failure')
        return (async function* () {
          yield { content: 'observed' }
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
    const { append, lastRequest, lastResponse, clearTrace } = useChat({
      provider,
      maxRetries: 1,
      defaultRequest: {
        body: { tenantId: 'tenant_default' },
        headers: { 'X-Default': 'yes' }
      },
      prepareSendMessagesRequest: ({ body, headers }) => ({
        body: { ...body, prepared: true },
        headers: { ...headers, 'X-Prepared': 'yes' },
        metadata: { source: 'prepared' }
      }),
      onRequest,
      onResponse
    })

    await append('observe lifecycle', {
      body: { route: '/tickets/1' },
      headers: { 'X-Trace': 'trace_1' },
      metadata: { traceId: 'trace_1' }
    })

    expect(calls).toBe(2)
    expect(onRequest.mock.calls.map(([info]) => info.attempt)).toEqual([1, 2])
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'chat',
        id: expect.any(String),
        providerId: 'observable-chat',
        attempt: 1,
        trigger: 'submit-message',
        aiSdkTrigger: 'submit-user-message',
        stepNumber: 0,
        requestMetadata: { source: 'prepared' },
        body: { tenantId: 'tenant_default', route: '/tickets/1', prepared: true },
        headers: {
          'X-Default': 'yes',
          'X-Trace': 'trace_1',
          'X-Prepared': 'yes'
        },
        messages: [expect.objectContaining({ role: 'user', content: 'observe lifecycle' })],
        request: expect.objectContaining({
          metadata: { source: 'prepared' },
          body: { tenantId: 'tenant_default', route: '/tickets/1', prepared: true }
        })
      })
    )
    expect(onResponse).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'chat',
        providerId: 'observable-chat',
        attempt: 2,
        hasStream: true,
        messages: [expect.objectContaining({ role: 'user', content: 'observe lifecycle' })]
      })
    )
    expect(lastRequest.value).toMatchObject({
      kind: 'chat',
      providerId: 'observable-chat',
      attempt: 2,
      trigger: 'submit-message',
      aiSdkTrigger: 'submit-user-message',
      body: { tenantId: 'tenant_default', route: '/tickets/1', prepared: true }
    })
    expect(lastResponse.value).toMatchObject({
      kind: 'chat',
      providerId: 'observable-chat',
      attempt: 2,
      hasStream: true
    })
    clearTrace()
    expect(lastRequest.value).toBeNull()
    expect(lastResponse.value).toBeNull()
  })

  it('captures inspect() timeline, retry and request trace metadata', async () => {
    let calls = 0
    const provider: ChatProvider = {
      id: 'inspect-chat',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        calls += 1
        if (calls === 1) {
          const error = new Error('temporary outage')
          Object.assign(error, { status: 429 })
          throw error
        }
        return (async function* () {
          yield { content: 'recovered' }
          yield {
            usage: { promptTokens: 3, completionTokens: 2, totalTokens: 5 }
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
    const { append, inspect } = useChat({
      provider,
      maxRetries: 1,
      defaultRequest: {
        body: { tenantId: 'tenant_1' },
        headers: { Authorization: 'Bearer secret', 'x-tenant': 'tenant_1' }
      }
    })

    await append('retry please')

    expect(calls).toBe(2)

    const snapshot = inspect()
    expect(snapshot.hasRequest).toBe(true)
    expect(snapshot.hasResponse).toBe(true)
    expect(snapshot.request).toMatchObject({
      providerId: 'inspect-chat',
      attempt: 2,
      body: { tenantId: 'tenant_1' },
      headers: {
        Authorization: 'Bearer secret',
        'x-tenant': 'tenant_1'
      }
    })
    expect(snapshot.response).toMatchObject({
      providerId: 'inspect-chat',
      attempt: 2,
      hasStream: true
    })
    const kinds = snapshot.timeline.map((event) => event.kind)
    expect(kinds).toEqual(expect.arrayContaining(['request', 'retry', 'stream', 'response']))
    expect(
      snapshot.timeline.filter((event) => event.kind === 'request').map((event) => event.attempt)
    ).toEqual([1, 2])
    expect(snapshot.retries).toHaveLength(1)
    expect(snapshot.retries[0]).toMatchObject({
      attempt: 1,
      maxRetries: 1,
      error: expect.objectContaining({
        category: 'rate-limit',
        status: 429
      })
    })
    expect(snapshot.providerTrace).toMatchObject({
      providerId: 'inspect-chat',
      attempt: 2,
      hasStream: true
    })
    expect(snapshot.curl).toBeNull()
    expect(snapshot.summary).toBe('response received')
  })

  it('adds runId to chat requests and preserves it during retries', async () => {
    const requests: ChatRequest[] = []
    let calls = 0
    const provider: ChatProvider = {
      id: 'runid-chat',
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        requests.push(request)
        calls += 1
        if (calls === 1) {
          throw new Error('temporary outage')
        }
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

    const { append } = useChat({ provider, maxRetries: 1 })

    await append('retry to verify')

    expect(requests).toHaveLength(2)
    expect(requests[0].runId).toBeDefined()
    expect(requests[0].runId).toBe(requests[1].runId)
  })

  it('keeps an explicit runId when one is provided on request options', async () => {
    const requests: ChatRequest[] = []
    const provider: ChatProvider = {
      id: 'runid-chat-explicit',
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        requests.push(request)
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

    const { append } = useChat({ provider })
    await append('explicit runId', { runId: 'manual-run-id' })

    expect(requests[0].runId).toBe('manual-run-id')
  })

  it('clearTrace() also clears inspect snapshot state', async () => {
    const { append, clearTrace, inspect } = useChat({
      provider: fakeProvider([{ content: 'ok' }])
    })

    await append('clear inspect')

    expect(inspect().hasRequest).toBe(true)
    expect(inspect().hasResponse).toBe(true)
    clearTrace()
    const snapshot = inspect()

    expect(snapshot.hasRequest).toBe(false)
    expect(snapshot.hasResponse).toBe(false)
    expect(snapshot.retries).toEqual([])
    expect(snapshot.timeline).toEqual([
      {
        kind: 'status',
        label: 'status ready',
        timestamp: expect.any(String),
        status: 'ready'
      }
    ])
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
        isError: true,
        isDisconnect: true
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

  it('adds and validates user message metadata', async () => {
    const requests: ChatRequest[] = []
    const { append, messages } = useChat<unknown, { source: string; intent?: string }>({
      provider: fakeTurnProvider([[{ content: 'ok' }]], requests),
      messageMetadataSchema: {
        type: 'object',
        required: ['source'],
        properties: {
          source: { type: 'string' },
          intent: { type: 'string' }
        },
        additionalProperties: false
      }
    })

    await append('with metadata', {
      messageMetadata: { source: 'composer', intent: 'search' }
    })

    expect(messages.value[0].metadata).toEqual({ source: 'composer', intent: 'search' })
    expect(requests[0].messages[0].metadata).toEqual({ source: 'composer', intent: 'search' })
  })

  it('validates assistant chunk metadata with function schemas', async () => {
    const { append, messages } = useChat<unknown, { model: string }>({
      provider: fakeProvider([{ content: 'Answer', metadata: { model: 'test-model' } }]),
      messageMetadataSchema: (metadata): metadata is { model: string } =>
        typeof metadata === 'object' &&
        metadata !== null &&
        'model' in metadata &&
        typeof metadata.model === 'string'
    })

    await append('with typed assistant metadata')

    expect(messages.value[1].metadata).toMatchObject({ model: 'test-model' })
  })

  it('rejects message metadata that fails messageMetadataSchema', async () => {
    const requests: ChatRequest[] = []
    const onError = vi.fn()
    const { append, error, status, messages } = useChat<unknown, { source: string }>({
      provider: fakeTurnProvider([[{ content: 'ok' }]], requests),
      messageMetadataSchema: {
        type: 'object',
        required: ['source'],
        properties: {
          source: { type: 'string' }
        },
        additionalProperties: false
      },
      onError
    })

    await expect(
      append('bad metadata', {
        messageMetadata: { source: 1 as unknown as string }
      })
    ).rejects.toThrow(/Message metadata did not match schema/)

    expect(status.value).toBe('error')
    expect(error.value?.name).toBe('AiHooksError')
    expect(messages.value).toEqual([])
    expect(requests).toEqual([])
    expect(onError).toHaveBeenCalledWith(error.value)
  })

  it('rejects assistant chunk metadata that fails messageMetadataSchema', async () => {
    const onError = vi.fn()
    const { append, error, status, messages } = useChat<unknown, { model: string }>({
      provider: fakeProvider([{ content: 'Answer', metadata: { model: 123 } }]),
      messageMetadataSchema: {
        type: 'object',
        required: ['model'],
        properties: {
          model: { type: 'string' }
        },
        additionalProperties: false
      },
      onError
    })

    await expect(append('with invalid assistant metadata')).rejects.toThrow(
      /Message metadata did not match schema/
    )

    expect(status.value).toBe('error')
    expect(error.value?.name).toBe('AiHooksError')
    expect(messages.value[1]).toMatchObject({ role: 'assistant', content: '' })
    expect(messages.value[1].metadata).toBeUndefined()
    expect(onError).toHaveBeenCalledWith(error.value)
  })

  it('validates custom stream data with dataPartSchemas', async () => {
    const onData = vi.fn()
    const { append, streamData } = useChat<{ state: 'loading' | 'done' }>({
      provider: fakeProvider([
        { dataId: 'status', dataType: 'progress', data: { state: 'loading' } },
        { dataId: 'status', dataType: 'progress', data: { state: 'done' } }
      ]),
      dataPartSchemas: {
        progress: {
          type: 'object',
          required: ['state'],
          properties: {
            state: { type: 'string', enum: ['loading', 'done'] }
          },
          additionalProperties: false
        }
      },
      onData
    })

    await append('with typed stream data')

    expect(streamData.value).toMatchObject([{ id: 'status', data: { state: 'done' } }])
    expect(onData).toHaveBeenCalledTimes(2)
  })

  it('validates custom stream data with function schemas', async () => {
    const { append, streamData } = useChat<{ url: string }>({
      provider: fakeProvider([
        { dataId: 'source-1', dataType: 'source', data: { url: 'https://example.test/docs' } }
      ]),
      dataPartSchemas: {
        source: (data): data is { url: string } =>
          typeof data === 'object' && data !== null && 'url' in data && typeof data.url === 'string'
      }
    })

    await append('with validator stream data')

    expect(streamData.value).toMatchObject([
      { id: 'source-1', type: 'source', data: { url: 'https://example.test/docs' } }
    ])
  })

  it('aliases streamData as data and supports manual setData updates', async () => {
    const { append, data, setData, streamData } = useChat<{ step: number }>({
      provider: fakeProvider([{ dataId: 'progress', dataType: 'progress', data: { step: 1 } }]),
      dataPartSchemas: {
        progress: {
          type: 'object',
          required: ['step'],
          properties: {
            step: { type: 'number' }
          },
          additionalProperties: false
        }
      }
    })

    expect(data).toBe(streamData)

    await append('with manual data')

    expect(data.value).toMatchObject([{ id: 'progress', type: 'progress', data: { step: 1 } }])

    const previous = data.value
    let updaterInput: typeof data.value | undefined
    setData((current) => {
      updaterInput = current
      current.push({ id: 'manual', type: 'progress', data: { step: 2 } })
      return current
    })

    expect(updaterInput).not.toBe(previous)
    expect(data.value.map((part) => part.id)).toEqual(['progress', 'manual'])

    expect(() =>
      setData([{ id: 'bad', type: 'progress', data: { step: 'bad' as unknown as number } }])
    ).toThrow(/Stream data part "progress" did not match schema/)
    expect(data.value.map((part) => part.id)).toEqual(['progress', 'manual'])

    setData([{ id: 'override', data: { step: 3 } }])
    expect(streamData.value).toEqual([{ id: 'override', data: { step: 3 } }])
  })

  it('rejects custom stream data that fails dataPartSchemas', async () => {
    const onData = vi.fn()
    const onError = vi.fn()
    const { append, error, status, streamData } = useChat<{ state: 'done' }>({
      provider: fakeProvider([
        { dataId: 'status', dataType: 'progress', data: { state: 'loading' } }
      ]),
      dataPartSchemas: {
        progress: {
          type: 'object',
          required: ['state'],
          properties: {
            state: { type: 'string', enum: ['done'] }
          },
          additionalProperties: false
        }
      },
      onData,
      onError
    })

    await expect(append('with invalid stream data')).rejects.toThrow(
      /Stream data part "progress" did not match schema/
    )

    expect(status.value).toBe('error')
    expect(error.value?.name).toBe('AiHooksError')
    expect(error.value?.message).toContain('data.progress.state must be one of')
    expect(streamData.value).toEqual([])
    expect(onData).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(error.value)
  })

  it('uses stream messageId as the assistant message id', async () => {
    const onFinish = vi.fn()
    const { append, messages } = useChat({
      provider: fakeProvider([
        { messageId: 'server_assistant_1', metadata: { type: 'start' } },
        { content: 'Answer' }
      ]),
      onFinish
    })

    await append('with server id')

    expect(messages.value[1]).toMatchObject({
      id: 'server_assistant_1',
      role: 'assistant',
      content: 'Answer',
      metadata: { type: 'start' }
    })
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'server_assistant_1', content: 'Answer' }),
      expect.objectContaining({
        message: expect.objectContaining({ id: 'server_assistant_1' })
      })
    )
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
        isDisconnect: false,
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
      expect.stringMatching(/^assistant-/)
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

  it('accepts AI SDK-style tool helpers and registers execute handlers', async () => {
    const requests: ChatRequest[] = []
    const getWeather = vi.fn((args: { city: string }) => ({ city: args.city, temp: 22 }))
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
    const { append, messages } = useChat({
      provider,
      tools: {
        getWeather: tool<{ city: string }, { city: string; temp: number }>({
          description: 'Get current weather.',
          inputSchema: jsonSchema<{ city: string }>({
            type: 'object',
            required: ['city'],
            properties: {
              city: { type: 'string' }
            },
            additionalProperties: false
          }),
          strict: true,
          execute: getWeather
        }),
        routePlanner: dynamicTool({
          parameters: {
            type: 'object',
            properties: {
              destination: { type: 'string' }
            }
          }
        })
      }
    })

    await append('weather?')

    expect(requests[0].tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'getWeather',
          description: 'Get current weather.',
          parameters: {
            type: 'object',
            required: ['city'],
            properties: {
              city: { type: 'string' }
            },
            additionalProperties: false
          },
          strict: true
        }
      },
      {
        type: 'function',
        function: {
          name: 'routePlanner',
          parameters: {
            type: 'object',
            properties: {
              destination: { type: 'string' }
            }
          }
        }
      }
    ])
    expect(getWeather).toHaveBeenCalledWith(
      { city: 'Tokyo' },
      expect.objectContaining({
        args: { city: 'Tokyo' },
        toolCall: expect.objectContaining({ id: 'call_1' })
      })
    )
    expect(messages.value.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant'
    ])
    expect(messages.value[2].content).toBe('{"city":"Tokyo","temp":22}')
  })

  it('accepts AI SDK-style sendMessage objects with files and metadata', async () => {
    const requests: ChatRequest[] = []
    const { sendMessage, messages } = useChat<unknown, { source: string }>({
      provider: fakeTurnProvider([[{ content: 'ok' }]], requests),
      messageMetadataSchema: {
        type: 'object',
        required: ['source'],
        properties: {
          source: { type: 'string' }
        },
        additionalProperties: false
      }
    })

    await sendMessage(
      {
        text: 'Review this note.',
        files: [{ type: 'text/plain', name: 'note.txt', text: 'Ship it.' }],
        metadata: { source: 'composer' },
        messageId: 'user_1'
      },
      {
        metadata: { traceId: 'req_1' },
        body: { tenantId: 'tenant_1' }
      }
    )

    expect(messages.value[0]).toMatchObject({
      id: 'user_1',
      role: 'user',
      metadata: { source: 'composer' }
    })
    expect(messages.value[0].content).toEqual([
      { type: 'text', text: 'Review this note.' },
      { type: 'text', text: 'File note.txt:\nShip it.' }
    ])
    expect(requests[0]).toMatchObject({
      metadata: { traceId: 'req_1' },
      body: { tenantId: 'tenant_1' }
    })
    expect(requests[0].messages[0].metadata).toEqual({ source: 'composer' })
  })

  it('filters resolved tools with activeTools before provider requests', async () => {
    const requests: ChatRequest[] = []
    const weatherTool: Tool = {
      type: 'function',
      function: {
        name: 'getWeather',
        parameters: { type: 'object', properties: { city: { type: 'string' } } }
      }
    }
    const chargeTool: Tool = {
      type: 'function',
      function: {
        name: 'chargeCard',
        parameters: { type: 'object', properties: { amount: { type: 'number' } } }
      }
    }
    const provider = fakeTurnProvider(
      [[{ content: 'weather' }], [{ content: 'charge' }], [{ content: 'none' }]],
      requests
    )
    const { sendMessage } = useChat({
      provider,
      tools: [weatherTool, chargeTool],
      toolChoice: 'auto',
      activeTools: ['getWeather']
    })

    await sendMessage('weather?')
    await sendMessage('charge?', {
      activeTools: ['chargeCard'],
      toolChoice: { type: 'function', function: { name: 'chargeCard' } }
    })
    await sendMessage('no tools', { activeTools: [] })

    expect(requests[0].tools).toEqual([weatherTool])
    expect(requests[0].toolChoice).toBe('auto')
    expect(requests[0]).not.toHaveProperty('activeTools')
    expect(requests[1].tools).toEqual([chargeTool])
    expect(requests[1].toolChoice).toEqual({
      type: 'function',
      function: { name: 'chargeCard' }
    })
    expect(requests[1]).not.toHaveProperty('activeTools')
    expect(requests[2].tools).toBeUndefined()
    expect(requests[2].toolChoice).toBeUndefined()
    expect(requests[2]).not.toHaveProperty('activeTools')
  })

  it('resubmits current messages when sendMessage is called without content', async () => {
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
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Tool result accepted.' }]
      ],
      requests
    )
    const { addToolResult, append, messages, sendMessage } = useChat({
      provider,
      sendAutomaticallyWhen: false
    })

    await append('Use a tool.')
    await addToolResult('call_1', 'done')
    await sendMessage(undefined, { body: { providerOption: 'manual-follow-up' } })

    expect(requests).toHaveLength(2)
    expect(requests[1].messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool'
    ])
    expect(requests[1].body).toEqual({ providerOption: 'manual-follow-up' })
    expect(messages.value.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant'
    ])
    expect(messages.value[messages.value.length - 1].content).toBe('Tool result accepted.')
  })

  it('rejects message-only options when sendMessage resubmits current messages', async () => {
    const provider = fakeTurnProvider([[{ content: 'Should not be requested.' }]])
    const { error, sendMessage } = useChat({ provider })

    await expect(sendMessage(undefined, { messageId: 'u1' })).rejects.toThrow(/without a message/)
    await expect(sendMessage(undefined, { attachments: [] })).rejects.toThrow(/without a message/)
    expect(error.value?.message).toContain('without a message')
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
        aiSdkTrigger: 'submit-user-message',
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

  it('can prepare provider requests with model-facing messages', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'compact' }]], requests)
    const { append, lastRequest, messages } = useChat({
      provider,
      prepareSendMessagesRequest({ messages }) {
        return {
          messages: convertToModelMessages(messages)
        }
      }
    })

    await append({
      id: 'user_1',
      role: 'user',
      content: 'Use compact context.',
      parts: [{ type: 'text', id: 'part_1', text: 'Use compact context.' }],
      createdAt: new Date('2026-01-02T03:04:05.000Z')
    })

    expect(requests[0].messages).toEqual([{ role: 'user', content: 'Use compact context.' }])
    expect('id' in requests[0].messages[0]).toBe(false)
    expect('parts' in requests[0].messages[0]).toBe(false)
    expect('createdAt' in requests[0].messages[0]).toBe(false)
    expect(lastRequest.value?.request).toEqual(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'Use compact context.' }]
      })
    )
    expect(messages.value[0]).toMatchObject({
      id: 'user_1',
      role: 'user',
      parts: [{ type: 'text', id: 'part_1', text: 'Use compact context.' }]
    })
  })

  it('passes thread id and forwarded props through chat requests', async () => {
    const requests: ChatRequest[] = []
    const prepareSendMessagesRequest = vi.fn()
    const provider = fakeTurnProvider([[{ content: 'threaded' }]], requests)
    const { append } = useChat({
      provider,
      id: 'client_chat',
      threadId: 'thread_default',
      forwardedProps: { locale: 'en-US', theme: 'light' },
      defaultRequest: {
        threadId: 'thread_request_default',
        forwardedProps: { theme: 'dark', route: '/inbox' }
      },
      prepareSendMessagesRequest
    })

    await append('threaded request', {
      threadId: 'thread_runtime',
      forwardedProps: { route: '/ticket/1', panel: 'sidebar' }
    })

    expect(prepareSendMessagesRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          id: 'client_chat',
          threadId: 'thread_runtime',
          forwardedProps: {
            locale: 'en-US',
            theme: 'dark',
            route: '/ticket/1',
            panel: 'sidebar'
          }
        })
      })
    )
    expect(requests[0]).toMatchObject({
      id: 'client_chat',
      threadId: 'thread_runtime',
      forwardedProps: {
        locale: 'en-US',
        theme: 'dark',
        route: '/ticket/1',
        panel: 'sidebar'
      }
    })
  })

  it('passes thread id and forwarded props through resume requests', async () => {
    const requests: ChatResumeRequest[] = []
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const provider: ChatProvider = {
      id: 'resume-thread',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {})()
      },
      async resumeChat(request): Promise<AsyncIterable<ChatChunk>> {
        requests.push(request)
        return (async function* () {
          yield { content: 'resumed' }
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return (async function* () {})()
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }
    const { resumeStream } = useChat({
      provider,
      id: 'client_chat',
      threadId: 'thread_default',
      forwardedProps: { locale: 'en-US' },
      defaultRequest: {
        forwardedProps: { route: '/chat' }
      },
      onRequest,
      onResponse
    })

    await resumeStream({
      threadId: 'thread_resume',
      forwardedProps: { route: '/chat/2', reconnect: true }
    })

    expect(requests[0]).toMatchObject({
      id: 'client_chat',
      threadId: 'thread_resume',
      forwardedProps: {
        locale: 'en-US',
        route: '/chat/2',
        reconnect: true
      }
    })
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'resume',
        id: 'client_chat',
        providerId: 'resume-thread',
        attempt: 1,
        messages: [
          expect.objectContaining({ role: 'user', content: 'threaded request' }),
          expect.objectContaining({ role: 'assistant', content: 'threaded' })
        ],
        request: expect.objectContaining({
          id: 'client_chat',
          threadId: 'thread_resume',
          forwardedProps: {
            locale: 'en-US',
            route: '/chat/2',
            reconnect: true
          }
        })
      })
    )
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'resume',
        id: 'client_chat',
        providerId: 'resume-thread',
        attempt: 1,
        hasStream: true
      })
    )
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
        aiSdkTrigger: 'regenerate-assistant-message',
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
        isDisconnect: false,
        finishReason: 'stop'
      })
    )
  })

  it('passes proxy api and credentials to reconnect request preparers', async () => {
    const prepareReconnectToStreamRequest = vi.fn(({ api, credentials, headers }) => ({
      headers: { ...headers, 'X-Prepared-Resume': 'yes' },
      metadata: { api, credentials }
    }))
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify([{ content: 'resumed through proxy' }]), {
          headers: { 'Content-Type': 'application/json' }
        })
    )
    const { lastRequest, messages, resumeStream } = useChat({
      api: '/api/chat',
      credentials: 'include',
      fetch: fetcher as unknown as typeof fetch,
      headers: { 'X-Session': 'session_1' },
      id: 'chat_proxy_resume',
      prepareReconnectToStreamRequest
    })

    await resumeStream()

    expect(prepareReconnectToStreamRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        api: '/api/chat',
        credentials: 'include'
      })
    )
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/ai/chat/chat_proxy_resume/stream')
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({
      'X-Session': 'session_1',
      'X-Prepared-Resume': 'yes'
    })
    expect(lastRequest.value).toMatchObject({
      kind: 'resume',
      api: '/api/chat',
      credentials: 'include',
      requestMetadata: { api: '/api/chat', credentials: 'include' }
    })
    expect(messages.value[0]).toMatchObject({
      role: 'assistant',
      content: 'resumed through proxy'
    })
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
      expect.objectContaining({ isAbort: true, isError: false, isDisconnect: false })
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
    const runtimeContext = { tenantId: 'tenant_1', mode: 'checkout' }
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
      context: runtimeContext,
      onToolCall,
      onToolResult,
      toolHandlers: {
        getWeather(args, context) {
          expect(args).toEqual({ city: 'Tokyo' })
          expect(context.args).toEqual(args)
          expect(context.context).toBe(runtimeContext)
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
        context: runtimeContext,
        toolCall: expect.objectContaining({ id: 'call_1' })
      })
    )
    expect(onToolResult).toHaveBeenCalledWith(
      { temp: 22, conditions: 'sunny' },
      expect.objectContaining({
        args: { city: 'Tokyo' },
        context: runtimeContext,
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

  it('accepts AI SDK-style addToolResult() options', async () => {
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
                function: { name: 'lookupAccount', arguments: '{"accountId":"acct_1"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Account is active.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { addToolResult, append, messages, pendingToolCalls } = useChat({ provider })

    await append('Look up this account.')
    await addToolResult(
      {
        tool: 'lookupAccount',
        toolCallId: 'call_1',
        output: { status: 'active' }
      },
      { headers: { 'X-Tool-Source': 'modal' } }
    )

    expect(pendingToolCalls.value).toEqual([])
    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({ headers: { 'X-Tool-Source': 'modal' } })
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(messages.value[2]).toMatchObject({
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"status":"active"}'
    })
    expect(messages.value[3].content).toBe('Account is active.')
  })

  it('waits for approval before running a registered tool handler', async () => {
    const requests: ChatRequest[] = []
    const runtimeContext = { userId: 'user_1' }
    const chargeCard = vi.fn(() => ({ charged: true }))
    const requiresToolApproval = vi.fn((args, context) => {
      expect(args).toEqual({ amount: 49 })
      expect(context.context).toBe(runtimeContext)
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
      context: runtimeContext,
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
      expect.objectContaining({
        context: runtimeContext,
        toolCall: expect.objectContaining({ id: 'call_1' })
      })
    )
    expect(chargeCard).toHaveBeenCalledWith(
      { amount: 49 },
      expect.objectContaining({
        context: runtimeContext,
        toolCall: expect.objectContaining({ id: 'call_1' })
      })
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

  it('sends approved tool responses to the backend when no local handler is registered', async () => {
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
                function: { name: 'chargeCard', arguments: '{"amount":49}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Server-side charge approved.' }, { finishReason: 'stop' }]
      ],
      requests
    )
    const { addToolApprovalResponse, append, messages, pendingToolCalls } = useChat({
      provider
    })

    await append('Charge my card.')

    expect(requests).toHaveLength(1)
    expect(pendingToolCalls.value.map((call) => call.id)).toEqual(['call_1'])

    await addToolApprovalResponse(
      { id: 'call_1', approved: true, reason: 'User confirmed' },
      { body: { approvalSource: 'modal' } }
    )

    expect(pendingToolCalls.value).toEqual([])
    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({ body: { approvalSource: 'modal' } })
    expect(requests[1].messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
    expect(messages.value[2]).toMatchObject({
      role: 'tool',
      toolCallId: 'call_1',
      content: '{"id":"call_1","approved":true,"reason":"User confirmed"}'
    })
    expect(messages.value[3].content).toBe('Server-side charge approved.')
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

  it('can disable automatic continuation after manual tool results', async () => {
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
                function: { name: 'confirmPurchase', arguments: '{"sku":"pro"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Should not be requested.' }]
      ],
      requests
    )
    const { addToolResult, append, messages, pendingToolCalls } = useChat({
      provider,
      sendAutomaticallyWhen: false
    })

    await append('Buy the pro plan.')
    await addToolResult('call_1', { approved: true })

    expect(pendingToolCalls.value).toEqual([])
    expect(requests).toHaveLength(1)
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
  })

  it('can stop automatic continuation from sendAutomaticallyWhen', async () => {
    const requests: ChatRequest[] = []
    const sendAutomaticallyWhen = vi.fn(() => false)
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
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Should not be requested.' }]
      ],
      requests
    )
    const { addToolResult, append, messages } = useChat({
      provider,
      sendAutomaticallyWhen
    })

    await append('Use a tool.')
    await addToolResult('call_1', 'deny')

    expect(sendAutomaticallyWhen).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(1)
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
  })

  it('reports sendAutomaticallyWhen errors after manual tool results', async () => {
    const requests: ChatRequest[] = []
    const failure = new Error('auto-send check failed')
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
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ]
      ],
      requests
    )
    const { addToolResult, append, error, status } = useChat({
      provider,
      sendAutomaticallyWhen() {
        throw failure
      }
    })

    await append('Use a tool.')
    await expect(addToolResult('call_1', 'done')).rejects.toBe(failure)

    expect(error.value).toBe(failure)
    expect(status.value).toBe('error')
    expect(requests).toHaveLength(1)
  })

  it('uses sendAutomaticallyWhen to decide whether tool results continue', async () => {
    const requests: ChatRequest[] = []
    const sendAutomaticallyWhen = vi.fn(({ messages }: { messages: Message[] }) => {
      expect(messages.map((message) => message.role)).toEqual(['user', 'assistant', 'tool'])
      return messages.some((message) => message.role === 'tool' && message.content === 'allow')
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
                function: { name: 'lookup', arguments: '{"q":"vue"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Allowed continuation.' }]
      ],
      requests
    )
    const { addToolResult, append, messages } = useChat({
      provider,
      sendAutomaticallyWhen
    })

    await append('Use a tool.')
    await addToolResult('call_1', 'allow')

    expect(sendAutomaticallyWhen).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(2)
    expect(messages.value[messages.value.length - 1].content).toBe('Allowed continuation.')
  })

  it('stops automatic continuation when stopWhen matches manual tool results', async () => {
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
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Should not be requested.' }]
      ],
      requests
    )
    const { addToolResult, append, messages } = useChat({
      provider,
      stopWhen: hasToolCall('lookup')
    })

    await append('Use a tool.')
    await addToolResult('call_1', 'done')

    expect(requests).toHaveLength(1)
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
  })

  it('stops automatic local tool loops when isStepCount matches', async () => {
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
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [
          {
            toolCalls: [
              {
                index: 0,
                id: 'call_2',
                type: 'function',
                function: { name: 'lookup', arguments: '{"q":"hooks"}' }
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Should not be requested.' }]
      ],
      requests
    )
    const { append, messages } = useChat({
      provider,
      maxToolRoundtrips: 3,
      stopWhen: isStepCount(2),
      toolHandlers: {
        lookup(args) {
          return args
        }
      }
    })

    await append('Loop with lookup.')

    expect(requests).toHaveLength(2)
    expect(messages.value.map((m) => m.role)).toEqual([
      'user',
      'assistant',
      'tool',
      'assistant',
      'tool'
    ])
  })

  it('prepares each automatic tool step request with step context', async () => {
    const requests: ChatRequest[] = []
    const prepareStep = vi.fn(({ body, stepNumber, toolCalls, trigger }) => ({
      body: {
        ...body,
        stepNumber,
        toolNames: toolCalls.map((call: ToolCall) => call.function.name)
      },
      headers: { [`X-Step-${stepNumber}`]: trigger }
    }))
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
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Prepared follow-up.' }]
      ],
      requests
    )
    const { append } = useChat({
      provider,
      prepareStep,
      toolHandlers: {
        lookup() {
          return 'docs'
        }
      }
    })

    await append('Use a tool.', { body: { traceId: 'trace_1' } })

    expect(prepareStep).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        stepNumber: 0,
        toolCalls: [],
        trigger: 'submit-message',
        aiSdkTrigger: 'submit-user-message'
      })
    )
    expect(prepareStep).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        stepNumber: 1,
        toolCalls: [expect.objectContaining({ id: 'call_1' })],
        trigger: 'submit-message',
        aiSdkTrigger: 'submit-user-message'
      })
    )
    expect(requests).toHaveLength(2)
    expect(requests[0]).toMatchObject({
      body: { traceId: 'trace_1', stepNumber: 0, toolNames: [] },
      headers: { 'X-Step-0': 'submit-message' }
    })
    expect(requests[1]).toMatchObject({
      body: { traceId: 'trace_1', stepNumber: 1, toolNames: ['lookup'] },
      headers: { 'X-Step-1': 'submit-message' }
    })
    expect(requests[1].messages.map((message) => message.role)).toEqual([
      'user',
      'assistant',
      'tool'
    ])
  })

  it('prepares manual tool follow-up requests with the completed tool step', async () => {
    const requests: ChatRequest[] = []
    const prepareStep = vi.fn(({ stepNumber, toolCalls }) => ({
      metadata: { stepNumber, toolCallCount: toolCalls.length }
    }))
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
              }
            ]
          },
          { finishReason: 'tool_calls' }
        ],
        [{ content: 'Manual result accepted.' }]
      ],
      requests
    )
    const { addToolResult, append } = useChat({ provider, prepareStep })

    await append('Use a manual tool.')
    await addToolResult('call_1', 'done')

    expect(prepareStep).toHaveBeenCalledTimes(2)
    expect(requests[1]).toMatchObject({
      metadata: { stepNumber: 1, toolCallCount: 1 }
    })
  })

  it('can disable automatic continuation after local tool handlers', async () => {
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
        [{ content: 'Should not be requested.' }]
      ],
      requests
    )
    const { append, messages } = useChat({
      provider,
      sendAutomaticallyWhen: false,
      toolHandlers: {
        getWeather() {
          return 'sunny'
        }
      }
    })

    await append('weather?')

    expect(requests).toHaveLength(1)
    expect(messages.value.map((m) => m.role)).toEqual(['user', 'assistant', 'tool'])
  })

  it('detects complete assistant tool calls for automatic sending', () => {
    const messages: Message[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'Use a tool.'
      },
      {
        id: 'a1',
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
      {
        id: 'tool_1',
        role: 'tool',
        content: 'done',
        toolCallId: 'call_1'
      }
    ]

    expect(lastAssistantMessageIsCompleteWithToolCalls({ messages })).toBe(true)
    expect(
      lastAssistantMessageIsCompleteWithToolCalls({
        messages: messages.slice(0, 2)
      })
    ).toBe(false)
  })

  it('exports an AI SDK-style stepCountIs stop helper alias', () => {
    const messages: Message[] = [
      {
        id: 'u1',
        role: 'user',
        content: 'Use tools.'
      },
      {
        id: 'a1',
        role: 'assistant',
        content: '',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '{}' }
          }
        ]
      }
    ]
    const options = {
      messages,
      toolCalls: messages[1].toolCalls ?? []
    }

    expect(stepCountIs).toBe(isStepCount)
    expect(stepCountIs(1)(options)).toBe(true)
    expect(stepCountIs(2)(options)).toBe(false)
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
