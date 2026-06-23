import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { openai } from '../src/providers/openai'
import { anthropic } from '../src/providers/anthropic'

function sseResponse(events: Array<{ event?: string; data: string }>): Response {
  const enc = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const e of events) {
        if (e.event) controller.enqueue(enc.encode(`event: ${e.event}\n`))
        controller.enqueue(enc.encode(`data: ${e.data}\n\n`))
      }
      controller.close()
    }
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
}

function mockFetchOnce(response: Response) {
  const fn = vi.fn(async () => response)
  globalThis.fetch = fn as unknown as typeof fetch
  return fn
}

describe('OpenAI vision support', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('passes ContentPart[] through to the wire format', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([{ data: '{"choices":[{"delta":{"content":"ok"}}]}' }])
    )
    const p = openai({ apiKey: 'k' })
    const stream = await p.chat({
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image_url', image_url: { url: 'https://example.com/x.png' } }
          ]
        }
      ]
    })
    for await (const chunk of stream) {
      void chunk
    }
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    expect(body.messages[0].role).toBe('user')
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'What is in this image?' },
      { type: 'image_url', image_url: { url: 'https://example.com/x.png' } }
    ])
  })

  it('passes plain string content through unchanged', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([{ data: '{"choices":[{"delta":{"content":"ok"}}]}' }])
    )
    const p = openai({ apiKey: 'k' })
    const stream = await p.chat({ messages: [{ id: 'm', role: 'user', content: 'hi' }] })
    for await (const chunk of stream) {
      void chunk
    }
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    expect(body.messages[0].content).toBe('hi')
  })

  it('uses the custom fetch implementation from config', async () => {
    const customFetch = vi.fn(async () =>
      sseResponse([{ data: '{"choices":[{"delta":{"content":"custom"}}]}' }])
    )
    globalThis.fetch = vi.fn(async () => {
      throw new Error('global fetch should not be used')
    }) as unknown as typeof fetch

    const p = openai({ apiKey: 'k', fetch: customFetch as unknown as typeof fetch })
    const stream = await p.chat({ messages: [{ id: 'm', role: 'user', content: 'hi' }] })
    let out = ''
    for await (const chunk of stream) {
      out += chunk.content ?? ''
    }

    expect(out).toBe('custom')
    expect(customFetch).toHaveBeenCalledTimes(1)
  })
})

describe('Anthropic vision support', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('converts text part to Anthropic text block', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}'
        }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.chat({
      messages: [{ id: 'm', role: 'user', content: [{ type: 'text', text: 'hello' }] }]
    })
    for await (const chunk of stream) {
      void chunk
    }
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    expect(body.messages[0].content).toEqual([{ type: 'text', text: 'hello' }])
  })

  it('converts https image URL to Anthropic url source', async () => {
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
          id: 'm',
          role: 'user',
          content: [
            { type: 'text', text: 'see' },
            { type: 'image_url', image_url: { url: 'https://example.com/x.png' } }
          ]
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
      { type: 'text', text: 'see' },
      { type: 'image', source: { type: 'url', url: 'https://example.com/x.png' } }
    ])
  })

  it('converts data URL to Anthropic base64 source with correct media_type', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}'
        }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEX/AAAZ4gk3AAAAAXRSTlPM0jRW/QAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII='
    const stream = await p.chat({
      messages: [
        {
          id: 'm',
          role: 'user',
          content: [{ type: 'image_url', image_url: { url: dataUrl } }]
        }
      ]
    })
    for await (const chunk of stream) {
      void chunk
    }
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    const image = body.messages[0].content[0]
    expect(image.type).toBe('image')
    expect(image.source.type).toBe('base64')
    expect(image.source.media_type).toBe('image/png')
    expect(image.source.data).toContain('iVBORw0KGgo')
  })

  it('passes plain string content through unchanged', async () => {
    const fetchMock = mockFetchOnce(
      sseResponse([
        {
          data: '{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"ok"}}'
        }
      ])
    )
    const p = anthropic({ apiKey: 'k' })
    const stream = await p.chat({ messages: [{ id: 'm', role: 'user', content: 'hi' }] })
    for await (const chunk of stream) {
      void chunk
    }
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string
    )
    expect(body.messages[0].content).toBe('hi')
  })
})
