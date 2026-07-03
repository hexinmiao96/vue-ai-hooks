import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useImage } from '../src/react'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('react useImage', () => {
  it('posts image requests through the app-owned endpoint and reports lifecycle callbacks', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        images: [{ url: 'https://cdn.example.test/image.png', mediaType: 'image/png' }],
        model: 'image-model'
      })
    )
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const onFinish = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useImage({
        api: '/api/react-image',
        baseURL: 'https://app.example.test',
        credentials: 'include',
        headers: { 'X-Session': 'session_1' },
        body: { tenantId: 'tenant_1' },
        fetch: fetcher as unknown as typeof fetch,
        defaultRequest: {
          model: 'default-model',
          body: { route: 'default' }
        },
        onRequest,
        onResponse,
        onFinish,
        onError
      })
    )

    await act(async () => {
      await expect(
        result.current.generateImage('A bright landing page hero image', {
          size: '1024x1024',
          body: { route: 'runtime' }
        })
      ).resolves.toEqual(
        expect.objectContaining({
          image: { url: 'https://cdn.example.test/image.png', mediaType: 'image/png' },
          model: 'image-model',
          images: [{ url: 'https://cdn.example.test/image.png', mediaType: 'image/png' }]
        })
      )
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/react-image')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      model: 'default-model',
      route: 'runtime',
      size: '1024x1024',
      prompt: 'A bright landing page hero image'
    })
    expect(result.current.image?.url).toBe('https://cdn.example.test/image.png')
    expect(result.current.status).toBe('ready')
    expect(result.current.lastRequest).toMatchObject({
      api: '/api/react-image',
      credentials: 'include',
      prompt: 'A bright landing page hero image'
    })
    expect(result.current.lastResponse).toMatchObject({
      api: '/api/react-image',
      result: expect.objectContaining({ model: 'image-model' })
    })
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })

  it('edits images and validates image input before request', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ image: { url: 'https://cdn.example.test/edited.png' } })
    )
    const { result } = renderHook(() =>
      useImage({
        fetch: fetcher as unknown as typeof fetch
      })
    )

    await act(async () => {
      await expect(
        result.current.editImage('replace the sky', {
          image: { url: 'https://cdn.example.test/source.png', mediaType: 'image/png' },
          model: 'edit-model'
        })
      ).resolves.toMatchObject({
        image: { url: 'https://cdn.example.test/edited.png' }
      })
    })

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      operation: 'edit',
      prompt: 'replace the sky',
      image: { url: 'https://cdn.example.test/source.png', mediaType: 'image/png' },
      model: 'edit-model'
    })
    await expect(
      result.current.editImage('missing source', { image: '' as unknown as string })
    ).rejects.toThrow(
      'editImage() requires an image URL, data URL, base64 payload, or image object'
    )
  })

  it('supports controlled form helpers and clears input only on successful submit', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ image: { url: 'https://cdn.example.test/form.png' } })
    )
    const { result } = renderHook(() =>
      useImage({
        initialInput: 'seed prompt',
        fetch: fetcher as unknown as typeof fetch
      })
    )

    expect(result.current.input).toBe('seed prompt')
    const preventDefault = vi.fn()

    act(() => {
      result.current.setInput('manual')
      result.current.handleInputChange({ target: { value: 'event prompt' } })
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault }, { aspectRatio: '16:9' })
    })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(result.current.input).toBe('')
    expect(
      JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    ).toMatchObject({ prompt: 'event prompt', aspectRatio: '16:9' })
  })

  it('supports the generate alias', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ image: { url: 'https://cdn.example.test/alias.png' } })
    )
    const { result } = renderHook(() =>
      useImage({
        fetch: fetcher as unknown as typeof fetch
      })
    )

    await act(async () => {
      await expect(result.current.generate('alias image')).resolves.toMatchObject({
        image: { url: 'https://cdn.example.test/alias.png' }
      })
    })

    expect(
      JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    ).toMatchObject({ prompt: 'alias image' })
  })

  it('keeps input when submit fails and supports clear helpers', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ message: 'service temporarily unavailable' }, { status: 503 })
    )
    const { result } = renderHook(() =>
      useImage({
        initialInput: 'retry prompt',
        fetch: fetcher as unknown as typeof fetch
      })
    )
    let thrown: unknown

    await act(async () => {
      try {
        await result.current.generateImage('retry prompt')
      } catch (error) {
        thrown = error
      }
    })

    expect((thrown as Error).name).toBe('AiHooksError')
    expect(thrown).toMatchObject({ status: 503 })
    expect(result.current.input).toBe('retry prompt')
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBeInstanceOf(Error)

    act(() => {
      result.current.clearError()
      result.current.clearTrace()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.lastRequest).toBeNull()
    expect(result.current.lastResponse).toBeNull()

    act(() => {
      result.current.clear()
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.input).toBe('')
    expect(result.current.image).toBeNull()
    expect(result.current.images).toEqual([])
    expect(result.current.result).toBeNull()
  })

  it('retries transient image generation errors and captures inspect retry metadata', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return jsonResponse({ message: 'busy' }, { status: 503 })
      }
      return jsonResponse({ image: { url: 'https://cdn.example.test/retry.png' }, images: [] })
    })

    const { result } = renderHook(() =>
      useImage({
        fetch: fetcher as unknown as typeof fetch,
        maxRetries: 1,
        onRetry
      })
    )

    await act(async () => {
      await expect(result.current.generateImage('retry image')).resolves.toMatchObject({
        image: { url: 'https://cdn.example.test/retry.png' }
      })
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledOnce()

    const snapshot = result.current.inspect()
    expect(snapshot.hasRequest).toBe(true)
    expect(snapshot.hasResponse).toBe(true)
    expect(snapshot.retries).toHaveLength(1)
    expect(snapshot.retries[0]).toMatchObject({
      attempt: 1,
      maxRetries: 1,
      error: expect.any(Object)
    })
    expect(snapshot.timeline.map((event) => event.kind)).toEqual(
      expect.arrayContaining(['request', 'retry', 'response'])
    )
  })

  it('supports string and missing-target handleInputChange calls', () => {
    const { result } = renderHook(() =>
      useImage({
        fetch: vi.fn(async () =>
          jsonResponse({
            image: { url: 'https://cdn.example.test/missing.png' }
          })
        ) as unknown as typeof fetch
      })
    )

    act(() => {
      result.current.handleInputChange('string prompt')
    })
    expect(result.current.input).toBe('string prompt')

    act(() => {
      result.current.handleInputChange({})
    })
    expect(result.current.input).toBe('')
  })

  it('supports aborting an in-flight request without setting an error', async () => {
    let capturedSignal: AbortSignal | null | undefined
    let requestStarted: () => void = () => {}
    const requestPending = new Promise<void>((resolve) => {
      requestStarted = resolve
    })
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        await new Promise<Response>((resolve, reject) => {
          requestStarted()
          capturedSignal?.addEventListener(
            'abort',
            () => {
              const error = new Error('aborted')
              error.name = 'AbortError'
              reject(error)
            },
            { once: true }
          )
          const signal = capturedSignal
          if (signal) {
            signal.addEventListener(
              'abort',
              () => {
                resolve(
                  new Response(JSON.stringify({ images: [] }), {
                    headers: { 'Content-Type': 'application/json' }
                  })
                )
              },
              { once: true }
            )
          }
        })
    )

    const { result } = renderHook(() =>
      useImage({
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          capturedSignal = init?.signal ?? null
          return fetcher(input, init)
        }
      })
    )

    let pending: Promise<unknown>

    await act(async () => {
      pending = result.current.generateImage('abort image').catch((error: unknown) => error)

      await requestPending
      result.current.stop()
      await expect(pending).resolves.toMatchObject({ name: 'AiHooksError' })
    })

    expect(capturedSignal?.aborted).toBe(true)
    expect(result.current.error).toBeNull()
    expect(result.current.status).toBe('ready')
    expect(result.current.isLoading).toBe(false)
  })

  it('treats a response that arrives after stop as an abort', async () => {
    let capturedSignal: AbortSignal | null | undefined
    let resolveFetch: (response: Response) => void = () => {}
    let requestStarted: () => void = () => {}
    const requestPending = new Promise<void>((resolve) => {
      requestStarted = resolve
    })
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((resolve) => {
          capturedSignal = init?.signal ?? null
          requestStarted()
          resolveFetch = resolve
        })
    )
    const { result } = renderHook(() =>
      useImage({
        fetch: fetcher as unknown as typeof fetch
      })
    )

    let pending: Promise<unknown>
    await act(async () => {
      pending = result.current.generateImage('late abort').catch((error: unknown) => error)
      await requestPending

      result.current.stop()
      resolveFetch(jsonResponse({ image: { url: 'https://cdn.example.test/late.png' } }))
      await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
    })

    expect(capturedSignal?.aborted).toBe(true)
    expect(result.current.image).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.status).toBe('ready')
  })
})
