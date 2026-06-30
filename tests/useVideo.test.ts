import { describe, expect, it, vi } from 'vitest'
import { useVideo } from '../src/composables/useVideo'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('useVideo', () => {
  it('posts video requests to the app-owned proxy and normalizes the result', async () => {
    const response = {
      videos: [{ url: 'https://cdn.example.test/video.mp4', mediaType: 'video/mp4' }],
      model: 'video-model',
      providerMetadata: { provider: 'test' }
    }
    const fetcher = vi.fn(async () => jsonResponse(response))
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const { generateVideo, video, videos, result, lastRequest, lastResponse } = useVideo({
      api: '/api/video',
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
      onResponse
    })

    await expect(
      generateVideo('A Vue product walkthrough video', {
        model: 'video-model',
        aspectRatio: '16:9',
        resolution: '1280x720',
        duration: 6,
        fps: 24,
        generateAudio: true,
        body: { route: 'runtime' },
        headers: { 'X-Request': 'request_1' }
      })
    ).resolves.toEqual({
      ...response,
      video: response.videos[0]
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/video')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Session': 'session_1',
      'X-Request': 'request_1'
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      route: 'runtime',
      prompt: 'A Vue product walkthrough video',
      model: 'video-model',
      aspectRatio: '16:9',
      resolution: '1280x720',
      duration: 6,
      fps: 24,
      generateAudio: true
    })
    expect(video.value).toEqual(response.videos[0])
    expect(videos.value).toEqual(response.videos)
    expect(result.value?.model).toBe('video-model')
    expect(lastRequest.value).toMatchObject({
      api: '/api/video',
      credentials: 'include',
      prompt: 'A Vue product walkthrough video',
      body: expect.objectContaining({ prompt: 'A Vue product walkthrough video' })
    })
    expect(lastResponse.value).toMatchObject({
      result: { model: 'video-model' }
    })
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledOnce()
  })

  it('accepts single video and string URL responses', async () => {
    const objectFetcher = vi.fn(async () =>
      jsonResponse({ video: { base64: 'AAAA', mediaType: 'video/mp4' } })
    )
    const stringFetcher = vi.fn(async () => jsonResponse('https://cdn.example.test/movie.mp4'))
    const objectGeneration = useVideo({ fetch: objectFetcher as unknown as typeof fetch })
    const stringGeneration = useVideo({ fetch: stringFetcher as unknown as typeof fetch })

    await expect(objectGeneration.generate('inline video')).resolves.toMatchObject({
      video: { base64: 'AAAA', mediaType: 'video/mp4' },
      videos: [{ base64: 'AAAA', mediaType: 'video/mp4' }]
    })
    await expect(stringGeneration.generateVideo('url video')).resolves.toMatchObject({
      video: { url: 'https://cdn.example.test/movie.mp4' },
      videos: [{ url: 'https://cdn.example.test/movie.mp4' }]
    })
    expect(objectGeneration.video.value?.base64).toBe('AAAA')
    expect(stringGeneration.video.value?.url).toBe('https://cdn.example.test/movie.mp4')
  })

  it('normalizes array and empty video responses', async () => {
    const arrayFetcher = vi.fn(async () =>
      jsonResponse([
        { base64: 'AAAA', mediaType: 'video/mp4' },
        { url: 'https://cdn.example.test/clip.webm', durationInSeconds: 4 }
      ])
    )
    const emptyFetcher = vi.fn(async () => jsonResponse(null))
    const arrayGeneration = useVideo({ fetch: arrayFetcher as unknown as typeof fetch })
    const emptyGeneration = useVideo({ fetch: emptyFetcher as unknown as typeof fetch })

    await expect(arrayGeneration.generateVideo('array')).resolves.toMatchObject({
      video: { base64: 'AAAA' },
      videos: [{ base64: 'AAAA' }, { url: 'https://cdn.example.test/clip.webm' }]
    })
    await expect(emptyGeneration.generateVideo('empty')).resolves.toEqual({ videos: [] })

    expect(arrayGeneration.video.value?.base64).toBe('AAAA')
    expect(emptyGeneration.video.value).toBeNull()
  })

  it('manages video form input and clears it after submit success', async () => {
    const preventDefault = vi.fn()
    const fetcher = vi.fn(async () =>
      jsonResponse({ video: { url: 'https://cdn.example.test/form.mp4' } })
    )
    const { input, setInput, handleInputChange, handleSubmit } = useVideo({
      initialInput: 'seed prompt',
      fetch: fetcher as unknown as typeof fetch
    })

    expect(input.value).toBe('seed prompt')
    setInput('manual prompt')
    handleInputChange({ target: { value: 42 } })
    expect(input.value).toBe('42')
    handleInputChange('form prompt')

    await handleSubmit({ preventDefault }, { aspectRatio: '9:16', duration: 4 })

    expect(preventDefault).toHaveBeenCalledOnce()
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      prompt: 'form prompt',
      aspectRatio: '9:16',
      duration: 4
    })
    expect(input.value).toBe('')
  })

  it('supports dynamic headers and body, clearError(), clear(), and missing prompt validation', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ video: { url: 'https://cdn.example.test/dynamic.mp4' } })
    )
    const generation = useVideo({
      initialInput: 'dynamic prompt',
      headers: () => new Headers({ 'X-Dynamic': 'yes' }),
      body: ({ request }) => ({ tenantId: 'tenant_1', requestPrompt: request.prompt }),
      fetch: fetcher as unknown as typeof fetch
    })

    generation.handleInputChange({ target: {} })
    await expect(generation.generateVideo()).rejects.toThrow('requires a prompt')

    generation.setInput('dynamic prompt')
    await generation.generateVideo()

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toMatchObject({ 'x-dynamic': 'yes' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      requestPrompt: 'dynamic prompt',
      prompt: 'dynamic prompt'
    })
    expect(generation.video.value?.url).toBe('https://cdn.example.test/dynamic.mp4')

    generation.error.value = new Error('manual')
    generation.status.value = 'error'
    generation.clearError()
    expect(generation.error.value).toBeNull()
    expect(generation.status.value).toBe('ready')

    generation.clear()
    expect(generation.input.value).toBe('')
    expect(generation.video.value).toBeNull()
    expect(generation.videos.value).toEqual([])
    expect(generation.result.value).toBeNull()
    expect(generation.lastRequest.value).toBeNull()
  })

  it('keeps video form input after submit errors', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ message: 'failed' }, { status: 500 }))
    const { handleSubmit, input, error, status } = useVideo({
      initialInput: 'retry prompt',
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(handleSubmit()).rejects.toThrow('Request failed with status 500')

    expect(input.value).toBe('retry prompt')
    expect(error.value?.message).toContain('Request failed with status 500')
    expect(status.value).toBe('error')
  })

  it('retries transient video generation errors before committing a result', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) return jsonResponse({ message: 'busy' }, { status: 503 })
      return jsonResponse({ videos: [{ url: 'https://cdn.example.test/retry.mp4' }] })
    })
    const { generateVideo, video, error } = useVideo({
      fetch: fetcher as unknown as typeof fetch,
      maxRetries: 1,
      onRetry
    })

    await expect(generateVideo('retry video')).resolves.toMatchObject({
      video: { url: 'https://cdn.example.test/retry.mp4' }
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(video.value?.url).toBe('https://cdn.example.test/retry.mp4')
    expect(error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('stop() aborts an in-flight video request without storing an error', async () => {
    let capturedSignal: AbortSignal | undefined
    let resolveRequestStarted: () => void = () => {}
    const requestStarted = new Promise<void>((resolve) => {
      resolveRequestStarted = resolve
    })
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          capturedSignal = init?.signal as AbortSignal | undefined
          resolveRequestStarted()
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
    const { generateVideo, stop, status, isLoading, error, video } = useVideo({
      fetch: fetcher as unknown as typeof fetch
    })

    const pending = generateVideo('abort video').catch((err: unknown) => err)
    await requestStarted

    expect(status.value).toBe('submitted')
    expect(isLoading.value).toBe(true)

    stop()

    expect(capturedSignal?.aborted).toBe(true)
    await expect(pending).resolves.toMatchObject({ name: 'AiHooksError' })
    expect(status.value).toBe('ready')
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(video.value).toBeNull()
  })

  it('does not commit video results resolved after stop()', async () => {
    let resolveRequestStarted: () => void = () => {}
    const requestStarted = new Promise<void>((resolve) => {
      resolveRequestStarted = resolve
    })
    const fetcher = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((resolve) => {
          const signal = init?.signal as AbortSignal | undefined
          resolveRequestStarted()
          signal?.addEventListener(
            'abort',
            () => {
              resolve(jsonResponse({ video: { url: 'https://cdn.example.test/late.mp4' } }))
            },
            { once: true }
          )
        })
    )
    const { generateVideo, stop, video, videos, result, error } = useVideo({
      fetch: fetcher as unknown as typeof fetch
    })

    const aborted = generateVideo('late video').catch((err: unknown) => err)
    await requestStarted
    stop()

    await expect(aborted).resolves.toMatchObject({ name: 'AbortError' })
    expect(video.value).toBeNull()
    expect(videos.value).toEqual([])
    expect(result.value).toBeNull()
    expect(error.value).toBeNull()
  })
})
