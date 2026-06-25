import { describe, expect, it, vi } from 'vitest'
import { gemini } from '../src/providers/gemini'

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('gemini provider', () => {
  it('uses Gemini OpenAI-compatible defaults', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] })
    )
    const provider = gemini({
      apiKey: 'gemini-key',
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.chat({
      messages: [{ id: 'u1', role: 'user', content: 'Hello' }],
      stream: false
    })
    for await (const chunk of stream) {
      expect(chunk.content).toBe('ok')
    }

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)

    expect(provider.id).toBe('gemini')
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer gemini-key')
    expect(body.model).toBe('gemini-3.5-flash')
  })

  it('allows compatible gateway overrides', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ data: [], model: 'm', usage: {} }))
    const provider = gemini({
      apiKey: 'k',
      baseURL: 'https://gateway.example.test/v1/',
      defaultModel: 'custom-gemini',
      embeddingPath: 'embeddings/custom',
      headers: { 'X-Gateway': 'yes' },
      fetch: fetcher as unknown as typeof fetch
    })

    await provider.embedding({ input: 'embed me' })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)

    expect(url).toBe('https://gateway.example.test/v1/embeddings/custom')
    expect((init.headers as Record<string, string>)['X-Gateway']).toBe('yes')
    expect(body).toEqual({ input: 'embed me', model: 'custom-gemini' })
  })
})
