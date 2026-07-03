import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useVideo } from '../src/react'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('react useVideo', () => {
  it('posts video requests through the app-owned endpoint and reports lifecycle callbacks', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        videos: [{ url: 'https://cdn.example.test/video.mp4', mediaType: 'video/mp4' }],
        model: 'video-model'
      })
    )
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const onFinish = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useVideo({
        api: '/api/react-video',
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
        result.current.generateVideo('A concise product walkthrough video', {
          aspectRatio: '16:9',
          resolution: '1280x720',
          duration: 6,
          fps: 24,
          generateAudio: true,
          body: { route: 'runtime' }
        })
      ).resolves.toEqual(
        expect.objectContaining({
          video: { url: 'https://cdn.example.test/video.mp4', mediaType: 'video/mp4' },
          model: 'video-model',
          videos: [{ url: 'https://cdn.example.test/video.mp4', mediaType: 'video/mp4' }]
        })
      )
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/react-video')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      model: 'default-model',
      route: 'runtime',
      aspectRatio: '16:9',
      resolution: '1280x720',
      duration: 6,
      fps: 24,
      generateAudio: true,
      prompt: 'A concise product walkthrough video'
    })
    expect(result.current.video?.url).toBe('https://cdn.example.test/video.mp4')
    expect(result.current.status).toBe('ready')
    expect(result.current.lastRequest).toMatchObject({
      api: '/api/react-video',
      credentials: 'include',
      prompt: 'A concise product walkthrough video'
    })
    expect(result.current.lastResponse).toMatchObject({
      api: '/api/react-video',
      result: expect.objectContaining({ model: 'video-model' })
    })
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })

  it('normalizes string, object, array, and empty video responses', async () => {
    const stringFetcher = vi.fn(async () => jsonResponse('https://cdn.example.test/movie.mp4'))
    const objectFetcher = vi.fn(async () =>
      jsonResponse({ video: { base64: 'AAAA', mediaType: 'video/mp4' } })
    )
    const arrayFetcher = vi.fn(async () =>
      jsonResponse([
        { base64: 'BBBB', mediaType: 'video/mp4' },
        { url: 'https://cdn.example.test/clip.webm', durationInSeconds: 4 }
      ])
    )
    const emptyFetcher = vi.fn(async () => jsonResponse(null))

    const stringHook = renderHook(() =>
      useVideo({ fetch: stringFetcher as unknown as typeof fetch })
    )
    const objectHook = renderHook(() =>
      useVideo({ fetch: objectFetcher as unknown as typeof fetch })
    )
    const arrayHook = renderHook(() => useVideo({ fetch: arrayFetcher as unknown as typeof fetch }))
    const emptyHook = renderHook(() => useVideo({ fetch: emptyFetcher as unknown as typeof fetch }))

    await act(async () => {
      await expect(stringHook.result.current.generateVideo('url video')).resolves.toMatchObject({
        video: { url: 'https://cdn.example.test/movie.mp4' },
        videos: [{ url: 'https://cdn.example.test/movie.mp4' }]
      })
      await expect(objectHook.result.current.generateVideo('object video')).resolves.toMatchObject({
        video: { base64: 'AAAA', mediaType: 'video/mp4' },
        videos: [{ base64: 'AAAA', mediaType: 'video/mp4' }]
      })
      await expect(arrayHook.result.current.generateVideo('array video')).resolves.toMatchObject({
        video: { base64: 'BBBB' },
        videos: [{ base64: 'BBBB' }, { url: 'https://cdn.example.test/clip.webm' }]
      })
      await expect(emptyHook.result.current.generateVideo('empty video')).resolves.toEqual({
        videos: []
      })
    })

    expect(stringHook.result.current.video?.url).toBe('https://cdn.example.test/movie.mp4')
    expect(objectHook.result.current.video?.base64).toBe('AAAA')
    expect(arrayHook.result.current.videos).toHaveLength(2)
    expect(emptyHook.result.current.video).toBeNull()
  })

  it('supports controlled form helpers and clears input only on successful submit', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ video: { url: 'https://cdn.example.test/form.mp4' } })
    )
    const { result } = renderHook(() =>
      useVideo({
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
      await result.current.handleSubmit({ preventDefault }, { aspectRatio: '9:16', duration: 4 })
    })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(result.current.input).toBe('')
    expect(
      JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    ).toMatchObject({ prompt: 'event prompt', aspectRatio: '9:16', duration: 4 })
  })

  it('supports the generate alias with functional headers, body, and input fallbacks', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ video: { url: 'https://cdn.example.test/alias.mp4' } })
    )
    const headers = vi.fn(async () => ({ 'X-Configured': 'yes' }))
    const body = vi.fn(({ request }) => ({ configuredModel: request.model }))
    const { result } = renderHook(() =>
      useVideo({
        api: 'api/react-video',
        baseURL: 'https://app.example.test/',
        headers,
        body,
        fetch: fetcher as unknown as typeof fetch
      })
    )

    act(() => {
      result.current.handleInputChange('alias prompt')
    })

    await act(async () => {
      await expect(
        result.current.generate(undefined, {
          model: 'alias-model',
          body: { runtime: true },
          headers: { 'X-Request': 'request' }
        })
      ).resolves.toMatchObject({
        video: { url: 'https://cdn.example.test/alias.mp4' }
      })
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/react-video')
    expect(headers).toHaveBeenCalledOnce()
    expect(body).toHaveBeenCalledWith({
      request: expect.objectContaining({ prompt: 'alias prompt', model: 'alias-model' })
    })
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Configured': 'yes',
      'X-Request': 'request'
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      configuredModel: 'alias-model',
      runtime: true,
      model: 'alias-model',
      prompt: 'alias prompt'
    })

    act(() => {
      result.current.handleInputChange({})
    })
    expect(result.current.input).toBe('')
    await expect(result.current.generateVideo()).rejects.toThrow(
      'generateVideo() requires a prompt'
    )
  })

  it('keeps input when submit fails and supports clear helpers', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ message: 'service temporarily unavailable' }, { status: 503 })
    )
    const { result } = renderHook(() =>
      useVideo({
        initialInput: 'retry prompt',
        fetch: fetcher as unknown as typeof fetch
      })
    )
    let thrown: unknown

    await act(async () => {
      try {
        await result.current.handleSubmit()
      } catch (error) {
        thrown = error
      }
    })

    expect((thrown as Error).name).toBe('AiHooksError')
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
    expect(result.current.video).toBeNull()
    expect(result.current.videos).toEqual([])
    expect(result.current.result).toBeNull()
  })

  it('retries transient video generation errors and captures inspect retry metadata', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return jsonResponse({ message: 'busy' }, { status: 503 })
      }
      return jsonResponse({ video: { url: 'https://cdn.example.test/retry.mp4' }, videos: [] })
    })

    const { result } = renderHook(() =>
      useVideo({
        fetch: fetcher as unknown as typeof fetch,
        maxRetries: 1,
        onRetry
      })
    )

    await act(async () => {
      await expect(result.current.generateVideo('retry video')).resolves.toMatchObject({
        video: { url: 'https://cdn.example.test/retry.mp4' }
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

  it('supports aborting an in-flight request without setting an error', async () => {
    let capturedSignal: AbortSignal | null | undefined
    let requestStarted: () => void = () => {}
    const requestPending = new Promise<void>((resolve) => {
      requestStarted = resolve
    })
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
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
        })
    )

    const { result } = renderHook(() =>
      useVideo({
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          capturedSignal = init?.signal ?? null
          return fetcher(input, init)
        }
      })
    )

    let pending: Promise<unknown>

    await act(async () => {
      pending = result.current.generateVideo('abort video').catch((error: unknown) => error)

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
      useVideo({
        fetch: fetcher as unknown as typeof fetch
      })
    )

    let pending: Promise<unknown>
    await act(async () => {
      pending = result.current.generateVideo('late abort').catch((error: unknown) => error)
      await requestPending

      result.current.stop()
      resolveFetch(jsonResponse({ video: { url: 'https://cdn.example.test/late.mp4' } }))
      await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
    })

    expect(capturedSignal?.aborted).toBe(true)
    expect(result.current.video).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.status).toBe('ready')
  })
})
