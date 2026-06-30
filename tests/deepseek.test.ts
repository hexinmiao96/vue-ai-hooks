import { describe, expect, it, vi } from 'vitest'
import { deepseek } from '../src/providers/deepseek'

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('deepseek provider', () => {
  it('uses DeepSeek OpenAI-compatible defaults', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] })
    )
    const provider = deepseek({
      apiKey: 'deepseek-key',
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

    expect(provider.id).toBe('deepseek')
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer deepseek-key')
    expect(body.model).toBe('deepseek-v4-flash')
  })

  it('allows compatible gateway overrides', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ choices: [{ text: 'done' }] }))
    const provider = deepseek({
      apiKey: 'k',
      baseURL: 'https://gateway.example.test/v1/',
      defaultModel: 'custom-deepseek',
      completionPath: 'completions/custom',
      headers: { 'X-Gateway': 'yes' },
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.completion({ prompt: 'Complete this', stream: false })
    let text = ''
    for await (const chunk of stream) {
      text += chunk
    }

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)

    expect(text).toBe('done')
    expect(url).toBe('https://gateway.example.test/v1/completions/custom')
    expect((init.headers as Record<string, string>)['X-Gateway']).toBe('yes')
    expect(body).toMatchObject({ prompt: 'Complete this', model: 'custom-deepseek' })
  })
})
