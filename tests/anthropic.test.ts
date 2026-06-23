import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { anthropic } from '../src/providers/anthropic'
import { AiHooksError } from '../src/types'

/** Build a fake Response with a streamed body containing the given SSE chunks. */
function sseResponse(events: Array<{ event?: string; data: string }>): Response {
  const enc = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const e of events) {
        if (e.event) {
          controller.enqueue(enc.encode(`event: ${e.event}\n`))
        }
        controller.enqueue(enc.encode(`data: ${e.data}\n\n`))
      }
      controller.close()
    }
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

/** Build a fake JSON Response for non-streaming Anthropic calls. */
function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

/** Helper to mock global fetch. */
function mockFetchOnce(response: Response | Error) {
  const fn = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  globalThis.fetch = fn as unknown as typeof fetch
  return fn
}

describe('anthropic provider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('has the right id', () => {
    const p = anthropic({ apiKey: 'test' })
    expect(p.id).toBe('anthropic')
  })

  it('sends the right headers and body for a chat request', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        { event: 'message_start', data: '{"type":"message_start"}' },
        {
          event: 'content_block_delta',
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hi"}}'
        },
        {
          event: 'message_delta',
          data: '{"type":"message_delta","delta":{"stop_reason":"end_turn"}}'
        },
        { event: 'message_stop', data: '{"type":"message_stop"}' }
      ])
    )

    const p = anthropic({ apiKey: 'sk-ant-test', defaultModel: 'claude-3-5-sonnet-20241022' })
    const stream = await p.chat({
      messages: [
        { id: 's1', role: 'system', content: 'You are concise.' },
        { id: 'u1', role: 'user', content: 'Hello' }
      ],
      maxTokens: 256
    })

    const chunks: string[] = []
    for await (const c of stream) {
      if (c.content) chunks.push(c.content)
    }
    expect(chunks.join('')).toBe('hi')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain('/v1/messages')
    const headers = init.headers as Record<string, string>
    expect(headers['x-api-key']).toBe('sk-ant-test')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('claude-3-5-sonnet-20241022')
    expect(body.system).toBe('You are concise.')
    expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }])
    expect(body.max_tokens).toBe(256)
    expect(body.stream).toBe(true)
  })

  it('maps non-stream chat responses and serializes optional request fields', async () => {
    const fetchMock = mockFetchOnce(
      jsonResponse({
        content: [{ type: 'image' }, { type: 'text', text: 'full answer' }],
        stop_reason: 'stop_sequence',
        usage: { input_tokens: 7, output_tokens: 3 }
      })
    )

    const p = anthropic({
      apiKey: 'sk-ant-test',
      baseURL: 'https://proxy.example.test/api/',
      defaultModel: 'claude-custom',
      maxTokens: 777,
      anthropicVersion: '2024-01-01',
      headers: { 'X-Provider': 'provider' }
    })
    const stream = await p.chat({
      messages: [
        { id: 's1', role: 'system', content: 'System prompt' },
        { id: 'u1', role: 'user', content: 'Hello' },
        { id: 'a1', role: 'assistant', content: 'Previous answer' },
        { id: 't1', role: 'tool', content: 'Tool result' }
      ],
      temperature: 0.4,
      topP: 0.8,
      stop: 'END',
      user: 'user-123',
      stream: false,
      headers: { 'X-Request': 'request' }
    })

    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    const body = JSON.parse(init.body as string)

    expect(url).toBe('https://proxy.example.test/api/v1/messages')
    expect(headers['x-api-key']).toBe('sk-ant-test')
    expect(headers['anthropic-version']).toBe('2024-01-01')
    expect(headers['X-Provider']).toBe('provider')
    expect(headers['X-Request']).toBe('request')
    expect(body).toMatchObject({
      model: 'claude-custom',
      max_tokens: 777,
      stream: false,
      system: 'System prompt',
      temperature: 0.4,
      top_p: 0.8,
      stop_sequences: ['END'],
      metadata: { user_id: 'user-123' }
    })
    expect(body.messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Previous answer' }
    ])
    expect(chunks).toEqual([
      {
        content: 'full answer',
        finishReason: 'stop',
        usage: { promptTokens: 7, completionTokens: 3, totalTokens: 10 }
      }
    ])
  })

  it('joins multiple system messages with double newline', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}'
        }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.chat({
      messages: [
        { id: 's1', role: 'system', content: 'A' },
        { id: 's2', role: 'system', content: 'B' },
        { id: 'u1', role: 'user', content: 'go' }
      ]
    })
    for await (const chunk of stream) {
      void chunk
    }
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    expect(body.system).toBe('A\n\nB')
  })

  it('omits system field when there are no system messages', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"x"}}'
        }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.chat({ messages: [{ id: 'u1', role: 'user', content: 'hi' }] })
    for await (const chunk of stream) {
      void chunk
    }
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    expect(body.system).toBeUndefined()
  })

  it('maps Anthropic stop reasons to our finishReason', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"x"}}'
        },
        { data: '{"type":"message_delta","delta":{"stop_reason":"max_tokens"}}' }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.chat({ messages: [{ id: 'u1', role: 'user', content: 'hi' }] })
    let finishReason: string | undefined
    for await (const c of stream) {
      if (c.finishReason) finishReason = c.finishReason
    }
    expect(finishReason).toBe('length')
    void fetchMock
  })

  it('maps tool_use and unknown stop reasons predictably', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        { data: '{"type":"message_delta","delta":{"stop_reason":"tool_use"}}' },
        { data: '{"type":"message_delta","delta":{"stop_reason":"unknown_reason"}}' }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.chat({ messages: [{ id: 'u1', role: 'user', content: 'hi' }] })
    const reasons: Array<string | null | undefined> = []
    for await (const c of stream) {
      if (c.finishReason) reasons.push(c.finishReason)
    }

    expect(reasons).toEqual(['tool_calls', 'stop'])
    void fetchMock
  })

  it('throws AiHooksError on Anthropic error event', async () => {
    mockFetchOnce(
      sseResponse([
        { data: '{"type":"error","error":{"type":"invalid_request_error","message":"bad"}}' }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.chat({ messages: [{ id: 'u1', role: 'user', content: 'hi' }] })
    await expect(async () => {
      for await (const chunk of stream) {
        void chunk
      }
    }).rejects.toThrow(/invalid_request_error/)
  })

  it('embedding() throws a clear error', async () => {
    const p = anthropic({ apiKey: 'k' })
    await expect(p.embedding({ input: 'hi' })).rejects.toBeInstanceOf(AiHooksError)
    await expect(p.embedding({ input: 'hi' })).rejects.toThrow(/no embedding API/)
  })

  it('completion() routes through chat() with a user message', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"done"}}'
        }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.completion({ prompt: 'Say done' })
    let out = ''
    for await (const chunk of stream) {
      out += chunk
    }
    expect(out).toBe('done')
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    expect(body.messages).toEqual([{ role: 'user', content: 'Say done' }])
  })

  it('uses the custom fetch implementation from config', async () => {
    const customFetch = vi.fn(async () =>
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"custom"}}'
        }
      ])
    )
    globalThis.fetch = vi.fn(async () => {
      throw new Error('global fetch should not be used')
    }) as unknown as typeof fetch

    const p = anthropic({ apiKey: 'k', fetch: customFetch as unknown as typeof fetch })
    const stream = await p.chat({ messages: [{ id: 'u1', role: 'user', content: 'hi' }] })
    let out = ''
    for await (const chunk of stream) {
      out += chunk.content ?? ''
    }

    expect(out).toBe('custom')
    expect(customFetch).toHaveBeenCalledTimes(1)
  })

  it('falls back to url image source when a data URL is not base64 encoded', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}'
        }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.chat({
      messages: [
        {
          id: 'u1',
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: 'data:image/png,not-base64' } }]
        }
      ]
    })

    for await (const chunk of stream) {
      void chunk
    }

    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    expect(body.messages[0].content).toEqual([
      { type: 'image', source: { type: 'url', url: 'data:image/png,not-base64' } }
    ])
  })
})
