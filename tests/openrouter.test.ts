import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { openrouter } from '../src/providers/openrouter'

/**
 * Build a Response object with a JSON payload that matches production provider
 * responses.
 */
function jsonResponse(data: unknown): Response {
  // Use Content-Type header so parser branches in shared request utilities stay
  // consistent with real HTTP behavior.
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Install a one-off mocked global fetch and return the mock function.
 */
function mockFetchOnce(response: Response) {
  // A scoped mock keeps test state deterministic and avoids cross-test leakage.
  const fn = vi.fn(async () => response)
  globalThis.fetch = fn as unknown as typeof fetch
  return fn
}

/**
 * OpenRouter provider behavior contract.
 *
 * These tests validate request composition (URLs/headers/body) and transport
 * override behavior so downstream consumers can rely on deterministic wiring.
 */
describe('openrouter provider', () => {
  /**
   * Keep async behavior deterministic to avoid flaky chunk/timer assertions.
   */
  beforeEach(() => {
    // Keep timer behavior deterministic in asynchronous chunks and event loops.
    vi.useFakeTimers()
  })

  /**
   * Reset mutable global/test state so subsequent suites stay isolated.
   */
  afterEach(() => {
    // Prevent mock timer/fetch state leaking into other test files.
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  /**
   * Verify non-stream chat wiring uses OpenRouter base path and injected headers.
   */
  it('uses OpenRouter defaults and injects optional headers', async () => {
    // Arrange: mock first-party fetch and drive a non-stream chat request.
    const fetchMock = mockFetchOnce(
      jsonResponse({
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 }
      })
    )

    const p = openrouter({
      apiKey: 'k',
      defaultModel: 'openai/gpt-4o-mini',
      siteUrl: 'https://app.example.com',
      appName: 'My App'
    })

    const stream = await p.chat({
      messages: [{ id: 'm', role: 'user', content: 'hi' }],
      stream: false
    })

    const chunks: string[] = []
    let reason: string | undefined
    for await (const chunk of stream) {
      if (chunk.content) chunks.push(chunk.content)
      if (chunk.finishReason) reason = chunk.finishReason
    }

    // Consume stream output to exercise the same read path as real consumers.
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    const headers = options.headers as Record<string, string>
    const body = JSON.parse(options.body as string)

    // Assert: request endpoint/path, request payload and injected headers.
    expect(p.id).toBe('openrouter')
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(body.model).toBe('openai/gpt-4o-mini')
    expect(body.stream).toBe(false)
    expect(headers['HTTP-Referer']).toBe('https://app.example.com')
    expect(headers['X-Title']).toBe('My App')
    expect(chunks).toEqual(['ok'])
    expect(reason).toBe('stop')
  })

  /**
   * Verify provider-level `fetch` override always wins over global fetch.
   */
  it('uses custom fetch override when provided', async () => {
    // Arrange: inject a provider-level fetch and make global fetch fail fast.
    // If provider ignores the override, this test will throw.
    const customFetch = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: 'custom' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      })
    )
    globalThis.fetch = vi.fn(async () => {
      throw new Error('global fetch should not be used')
    }) as unknown as typeof fetch

    const p = openrouter({ apiKey: 'k', fetch: customFetch as unknown as typeof fetch })
    const stream = await p.completion({ prompt: 'hi' })
    let out = ''
    // Act: consume the completion stream produced by p.completion.
    for await (const chunk of stream) {
      out += chunk
    }

    // Assert: custom fetch is used and result content comes from custom adapter.
    expect(out).toBe('custom')
    expect(customFetch).toHaveBeenCalledTimes(1)
  })
})
