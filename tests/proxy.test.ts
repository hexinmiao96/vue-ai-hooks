import { describe, expect, it, vi } from 'vitest'
import { proxyProvider } from '../src/providers/proxy'

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

function sseResponse(events: unknown[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.close()
    }
  })
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' }
  })
}

describe('proxyProvider', () => {
  it('posts chat requests to the app backend and streams ChatChunk SSE payloads', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        { content: 'Hel' },
        {
          content: 'lo',
          finishReason: 'stop',
          usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 }
        }
      ])
    )
    const provider = proxyProvider({
      baseURL: 'https://app.example.test',
      headers: () => ({ Authorization: 'Bearer session-token' }),
      credentials: 'include',
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }],
      model: 'app-selected-model',
      headers: { 'X-Trace': 'trace-1' }
    })
    const chunks: unknown[] = []
    for await (const chunk of stream) chunks.push(chunk)

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    const headers = init.headers as Record<string, string>

    expect(url).toBe('https://app.example.test/api/ai/chat')
    expect(init.credentials).toBe('include')
    expect(headers.Authorization).toBe('Bearer session-token')
    expect(headers['X-Trace']).toBe('trace-1')
    expect(body).toEqual({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }],
      model: 'app-selected-model'
    })
    expect(chunks).toEqual([
      { content: 'Hel' },
      {
        content: 'lo',
        finishReason: 'stop',
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 }
      }
    ])
  })

  it('reads JSON chat chunk arrays from non-SSE proxy responses', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ chunks: [{ content: 'done' }] }))
    const provider = proxyProvider({ fetch: fetcher as unknown as typeof fetch })

    const stream = await provider.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }],
      stream: false
    })
    const chunks: unknown[] = []
    for await (const chunk of stream) chunks.push(chunk)

    expect(chunks).toEqual([{ content: 'done' }])
  })

  it('maps AI SDK UI message stream parts to ChatChunk values', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        { type: 'start', messageId: 'msg_1' },
        { type: 'text-start', id: 'text_1' },
        { type: 'text-delta', id: 'text_1', delta: 'Hel' },
        { type: 'text-delta', id: 'text_1', delta: 'lo' },
        { type: 'reasoning-start', id: 'reasoning_1' },
        { type: 'reasoning-delta', id: 'reasoning_1', delta: 'Check ' },
        { type: 'reasoning-delta', id: 'reasoning_1', delta: 'sources.' },
        { type: 'reasoning-end', id: 'reasoning_1' },
        { type: 'data-progress', id: 'progress_1', data: { step: 1 } },
        { type: 'source-url', sourceId: 'source_1', url: 'https://example.test/docs' },
        { type: 'tool-input-start', toolCallId: 'call_1', toolName: 'lookup' },
        { type: 'tool-input-delta', toolCallId: 'call_1', inputTextDelta: '{"q":"' },
        { type: 'tool-input-delta', toolCallId: 'call_1', inputTextDelta: 'vue"}' },
        {
          type: 'finish',
          finishReason: 'stop',
          totalUsage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 }
        }
      ])
    )
    const provider = proxyProvider({ fetch: fetcher as unknown as typeof fetch })

    const stream = await provider.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }]
    })
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)

    expect(chunks).toEqual([
      { messageId: 'msg_1', metadata: { type: 'start', messageId: 'msg_1' } },
      { content: 'Hel' },
      { content: 'lo' },
      { parts: [{ type: 'reasoning', id: 'reasoning_1', text: 'Check ' }] },
      { parts: [{ type: 'reasoning', id: 'reasoning_1', text: 'Check sources.' }] },
      { data: { step: 1 }, dataType: 'data-progress', dataId: 'progress_1' },
      {
        data: { sourceId: 'source_1', url: 'https://example.test/docs' },
        dataType: 'source-url',
        dataId: 'source_1'
      },
      {
        toolCalls: [
          {
            index: 0,
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '' }
          }
        ]
      },
      {
        toolCalls: [
          {
            index: 0,
            id: 'call_1',
            type: 'function',
            function: { arguments: '{"q":"' }
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
      {
        finishReason: 'stop',
        usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 }
      }
    ])
  })

  it('surfaces AI SDK UI message stream error parts as request errors', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        { type: 'text-delta', delta: 'partial' },
        { type: 'error', errorText: 'bad' }
      ])
    )
    const provider = proxyProvider({ fetch: fetcher as unknown as typeof fetch })
    const stream = await provider.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }]
    })

    const chunks: unknown[] = []
    await expect(async () => {
      for await (const chunk of stream) chunks.push(chunk)
    }).rejects.toMatchObject({ message: 'bad' })
    expect(chunks).toEqual([{ content: 'partial' }])
  })

  it('maps AI SDK UI message stream tool availability and data variants', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        { type: 'start-step' },
        {
          type: 'tool-input-available',
          toolCallId: 'call_2',
          toolName: 'search',
          input: { q: 'vue' }
        },
        {
          type: 'tool-output-available',
          toolCallId: 'call_2',
          output: { ok: true },
          transient: true
        },
        { type: 'file', id: 'file_1', mediaType: 'text/plain', url: 'https://example.test/a.txt' },
        { type: 'source-document', sourceId: 'doc_1', title: 'Docs' },
        { type: 'finish' }
      ])
    )
    const provider = proxyProvider({ fetch: fetcher as unknown as typeof fetch })

    const stream = await provider.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }]
    })
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)

    expect(chunks).toEqual([
      {
        toolCalls: [
          {
            index: 0,
            id: 'call_2',
            type: 'function',
            function: { name: 'search', arguments: '{"q":"vue"}' }
          }
        ]
      },
      {
        data: { toolCallId: 'call_2', output: { ok: true }, transient: true },
        dataType: 'tool-output-available',
        dataId: 'call_2',
        transient: true
      },
      {
        data: { id: 'file_1', mediaType: 'text/plain', url: 'https://example.test/a.txt' },
        dataType: 'file',
        dataId: 'file_1'
      },
      {
        data: { sourceId: 'doc_1', title: 'Docs' },
        dataType: 'source-document',
        dataId: 'doc_1'
      },
      {}
    ])
  })

  it('uses available AI SDK UI message stream error text fallbacks', async () => {
    const providerFrom = (event: unknown) =>
      proxyProvider({
        fetch: vi.fn(async () => sseResponse([event])) as unknown as typeof fetch
      })

    for (const [event, message] of [
      [{ type: 'error', message: 'message field' }, 'message field'],
      [{ type: 'error', error: 'error field' }, 'error field'],
      [{ type: 'error' }, 'AI SDK UI message stream returned an error part']
    ] as const) {
      const stream = await providerFrom(event).chat({
        messages: [{ id: 'm1', role: 'user', content: 'Hi' }]
      })

      await expect(async () => {
        for await (const _chunk of stream) {
          // consume stream
        }
      }).rejects.toMatchObject({ message })
    }
  })

  it('skips malformed AI SDK UI message stream parts and normalizes partial usage', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        { type: 'text-delta', delta: 1 },
        { type: 'start', id: 'run_1' },
        { type: 'finish-step', id: 'step_1' },
        { type: 'reasoning-start' },
        { type: 'reasoning-delta', id: 'bad_reasoning', delta: 1 },
        { type: 'reasoning-end' },
        { type: 'tool-input-start', toolCallId: 'bad' },
        { type: 'tool-input-delta', toolCallId: 'call_missing' },
        {
          type: 'tool-input-available',
          toolCallId: 'call_3',
          toolName: 'raw',
          input: '{"raw":true}'
        },
        { type: 'data-note', transient: false },
        { type: 'finish', usage: { promptTokens: 2, completionTokens: 3 } },
        { type: 'finish', usage: { promptTokens: 'bad' } }
      ])
    )
    const provider = proxyProvider({ fetch: fetcher as unknown as typeof fetch })

    const stream = await provider.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }]
    })
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)

    expect(chunks).toEqual([
      { metadata: { type: 'start', id: 'run_1' } },
      { metadata: { type: 'finish-step', id: 'step_1' } },
      {
        toolCalls: [
          {
            index: 0,
            id: 'call_3',
            type: 'function',
            function: { name: 'raw', arguments: '{"raw":true}' }
          }
        ]
      },
      { data: undefined, dataType: 'data-note', transient: false },
      { usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 } },
      {}
    ])
  })

  it('lets proxy requests add body fields and transform chat request options', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ chunks: [{ content: 'custom' }] }))
    const prepareRequest = vi.fn(({ body, headers }) => ({
      url: '/internal/chat',
      credentials: 'include' as const,
      headers: {
        ...headers,
        'X-Prepared': 'yes'
      },
      body: {
        ...body,
        messages: body?.messages?.slice(-1),
        prepared: true
      }
    }))
    const provider = proxyProvider({
      baseURL: 'https://app.example.test',
      body: () => ({ tenantId: 'tenant_1' }),
      prepareRequest,
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.chat({
      id: 'chat_1',
      body: {
        tenantId: 'tenant_request',
        requestFlag: true,
        messages: 'ignored request body messages'
      },
      messages: [
        { id: 'm1', role: 'user', content: 'Old' },
        { id: 'm2', role: 'user', content: 'Latest' }
      ],
      headers: { 'X-Trace': 'trace-1' }
    })
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    const headers = init.headers as Record<string, string>

    expect(prepareRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'chat',
        url: '/api/ai/chat',
        request: expect.objectContaining({ id: 'chat_1' }),
        headers: expect.objectContaining({ 'X-Trace': 'trace-1' }),
        body: expect.objectContaining({
          tenantId: 'tenant_request',
          requestFlag: true,
          messages: [
            { id: 'm1', role: 'user', content: 'Old' },
            { id: 'm2', role: 'user', content: 'Latest' }
          ]
        })
      })
    )
    expect(url).toBe('https://app.example.test/internal/chat')
    expect(init.credentials).toBe('include')
    expect(headers['X-Prepared']).toBe('yes')
    expect(body).toMatchObject({
      id: 'chat_1',
      requestFlag: true,
      tenantId: 'tenant_request',
      prepared: true,
      messages: [{ id: 'm2', role: 'user', content: 'Latest' }]
    })
    expect(chunks).toEqual([{ content: 'custom' }])
  })

  it('resumes active chat streams with a GET request', async () => {
    const fetcher = vi.fn(async () => sseResponse([{ content: ' resumed' }]))
    const provider = proxyProvider({
      baseURL: 'https://app.example.test',
      resumeUrl: '/api/chats/:id/stream',
      headers: { Authorization: 'Bearer session-token' },
      credentials: 'include',
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.resumeChat?.({
      id: 'chat 1',
      headers: { 'X-Trace': 'trace-1' }
    })
    const chunks = []
    for await (const chunk of stream ?? []) chunks.push(chunk)

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>

    expect(url).toBe('https://app.example.test/api/chats/chat%201/stream')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.credentials).toBe('include')
    expect(headers.Authorization).toBe('Bearer session-token')
    expect(headers['X-Trace']).toBe('trace-1')
    expect(chunks).toEqual([{ content: ' resumed' }])
  })

  it('lets proxy request preparation customize resume requests', async () => {
    const fetcher = vi.fn(async () => sseResponse([{ content: ' resumed' }]))
    const provider = proxyProvider({
      baseURL: 'https://app.example.test',
      credentials: 'omit',
      prepareRequest(context) {
        if (context.kind !== 'resume') return
        return {
          url: `/internal/resume/${context.request.id}`,
          credentials: 'include',
          headers: { 'X-Resume': 'yes' }
        }
      },
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.resumeChat?.({ id: 'chat_1' })
    const chunks = []
    for await (const chunk of stream ?? []) chunks.push(chunk)

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>

    expect(url).toBe('https://app.example.test/internal/resume/chat_1')
    expect(init.credentials).toBe('include')
    expect(headers['X-Resume']).toBe('yes')
    expect(chunks).toEqual([{ content: ' resumed' }])
  })

  it('returns null when the resume endpoint has no active stream', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(null, {
          status: 204
        })
    )
    const provider = proxyProvider({
      resumeUrl: (id) => `/api/resume?id=${encodeURIComponent(id)}`,
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(provider.resumeChat?.({ id: 'chat_1' })).resolves.toBe(null)
    expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe(
      '/api/resume?id=chat_1'
    )
  })

  it('supports completion SSE and JSON proxy responses', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(sseResponse(['Hel', { text: 'lo' }]))
      .mockResolvedValueOnce(jsonResponse({ chunks: ['Bye'] }))
      .mockResolvedValueOnce(jsonResponse({ completion: 'Done' }))
    const provider = proxyProvider({
      completionUrl: '/internal/completion',
      fetch: fetcher as unknown as typeof fetch
    })

    let text = ''
    for await (const chunk of await provider.completion({ prompt: 'Say hello' })) {
      text += chunk
    }
    let jsonText = ''
    for await (const chunk of await provider.completion({ prompt: 'Say bye', stream: false })) {
      jsonText += chunk
    }
    let objectText = ''
    for await (const chunk of await provider.completion({ prompt: 'Say done', stream: false })) {
      objectText += chunk
    }

    expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe(
      '/internal/completion'
    )
    expect(text).toBe('Hello')
    expect(jsonText).toBe('Bye')
    expect(objectText).toBe('Done')
  })

  it('returns embedding JSON from the proxy endpoint', async () => {
    const result = {
      embeddings: [[0.1, 0.2]],
      model: 'proxy-embedding',
      usage: { promptTokens: 2, totalTokens: 2 }
    }
    const fetcher = vi.fn(async () => jsonResponse(result))
    const provider = proxyProvider({
      embeddingUrl: '/internal/embedding',
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(provider.embedding({ input: 'hello' })).resolves.toEqual(result)
    expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe(
      '/internal/embedding'
    )
  })
})
