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
    const chunks = []
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
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)

    expect(chunks).toEqual([{ content: 'done' }])
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
