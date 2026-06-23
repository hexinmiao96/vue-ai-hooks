import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestJson } from '../src/utils/fetch'
import { AiHooksError } from '../src/types'

function abortError() {
  const error = new Error('aborted')
  error.name = 'AbortError'
  return error
}

describe('requestJson', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('uses the provided fetch implementation and returns successful responses', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe('POST')
      expect(init?.body).toBe('{"ok":true}')
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return new Response('{"ok":true}', { status: 200 })
    })

    const response = await requestJson('https://example.test/ok', {
      method: 'POST',
      body: '{"ok":true}',
      fetcher
    })

    await expect(response.json()).resolves.toEqual({ ok: true })
    expect(fetcher).toHaveBeenCalledWith(
      'https://example.test/ok',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws AiHooksError with parsed JSON body for HTTP failures', async () => {
    const fetcher = vi.fn(async () => {
      return new Response('{"error":"rate_limited"}', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Content-Type': 'application/json' }
      })
    })

    await expect(requestJson('https://example.test/limited', { fetcher })).rejects.toMatchObject({
      name: 'AiHooksError',
      message: 'Request failed with status 429 Too Many Requests',
      status: 429,
      cause: { error: 'rate_limited' }
    })
  })

  it('falls back to text body when an HTTP failure is not JSON', async () => {
    const fetcher = vi.fn(async () => {
      return new Response('upstream unavailable', {
        status: 503,
        statusText: 'Service Unavailable'
      })
    })

    await expect(requestJson('https://example.test/down', { fetcher })).rejects.toMatchObject({
      name: 'AiHooksError',
      message: 'Request failed with status 503 Service Unavailable',
      status: 503,
      cause: 'upstream unavailable'
    })
  })

  it('wraps network failures consistently', async () => {
    const cause = new TypeError('socket closed')
    const fetcher = vi.fn(async () => {
      throw cause
    })

    await expect(requestJson('https://example.test/network', { fetcher })).rejects.toMatchObject({
      name: 'AiHooksError',
      message: 'Network error',
      cause
    })
  })

  it('aborts immediately when the external signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.signal?.aborted) throw abortError()
      return new Response('{}')
    })

    await expect(
      requestJson('https://example.test/aborted', {
        signal: controller.signal,
        fetcher
      })
    ).rejects.toMatchObject({
      name: 'AiHooksError',
      message: 'Request aborted'
    })
  })

  it('aborts when the external signal fires while the request is pending', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(abortError()), { once: true })
      })
    })

    const request = requestJson('https://example.test/pending-abort', {
      signal: controller.signal,
      fetcher
    })

    controller.abort()

    await expect(request).rejects.toMatchObject({
      name: 'AiHooksError',
      message: 'Request aborted'
    })
  })

  it('aborts when timeoutMs elapses', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(abortError()), { once: true })
      })
    })

    const request = requestJson('https://example.test/timeout', {
      timeoutMs: 10,
      fetcher
    })
    const assertion = expect(request).rejects.toMatchObject({
      name: 'AiHooksError',
      message: 'Request aborted'
    })

    await vi.advanceTimersByTimeAsync(10)
    await assertion
  })

  it('throws a clear error when no fetch implementation is available', async () => {
    vi.stubGlobal('fetch', undefined)

    await expect(requestJson('https://example.test/no-fetch')).rejects.toBeInstanceOf(AiHooksError)
    await expect(requestJson('https://example.test/no-fetch')).rejects.toMatchObject({
      message: 'No fetch implementation available'
    })
  })
})
