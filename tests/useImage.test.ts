import { describe, expect, it, vi } from 'vitest'
import { useImage } from '../src/composables/useImage'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('useImage', () => {
  it('posts image requests to the app-owned proxy and normalizes the result', async () => {
    const response = {
      images: [{ url: 'https://cdn.example.test/image.png', mediaType: 'image/png' }],
      model: 'image-model',
      providerMetadata: { provider: 'test' }
    }
    const fetcher = vi.fn(async () => jsonResponse(response))
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const { generateImage, image, images, result, lastRequest, lastResponse } = useImage({
      api: '/api/image',
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
      generateImage('A Vue workspace hero image', {
        model: 'image-model',
        size: '1024x1024',
        body: { route: 'runtime' },
        headers: { 'X-Request': 'request_1' }
      })
    ).resolves.toEqual({
      ...response,
      image: response.images[0]
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/image')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Session': 'session_1',
      'X-Request': 'request_1'
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      route: 'runtime',
      prompt: 'A Vue workspace hero image',
      model: 'image-model',
      size: '1024x1024'
    })
    expect(image.value).toEqual(response.images[0])
    expect(images.value).toEqual(response.images)
    expect(result.value?.model).toBe('image-model')
    expect(lastRequest.value).toMatchObject({
      api: '/api/image',
      credentials: 'include',
      prompt: 'A Vue workspace hero image',
      body: expect.objectContaining({ prompt: 'A Vue workspace hero image' })
    })
    expect(lastResponse.value).toMatchObject({
      result: { model: 'image-model' }
    })
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledOnce()
  })

  it('accepts a single image response object', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ url: 'data:image/png;base64,aGVsbG8=', mediaType: 'image/png' })
    )
    const { generate, image, images } = useImage({ fetch: fetcher as unknown as typeof fetch })

    const result = await generate('inline image')

    expect(result.image).toEqual({
      url: 'data:image/png;base64,aGVsbG8=',
      mediaType: 'image/png'
    })
    expect(image.value?.url).toBe('data:image/png;base64,aGVsbG8=')
    expect(images.value).toHaveLength(1)
  })

  it('normalizes array and empty image responses', async () => {
    const arrayFetcher = vi.fn(async () =>
      jsonResponse([
        { base64: 'aGVsbG8=', mediaType: 'image/png' },
        { revisedPrompt: 'revised prompt' }
      ])
    )
    const emptyFetcher = vi.fn(async () => jsonResponse(null))
    const arrayGeneration = useImage({ fetch: arrayFetcher as unknown as typeof fetch })
    const emptyGeneration = useImage({ fetch: emptyFetcher as unknown as typeof fetch })

    await expect(arrayGeneration.generateImage('array')).resolves.toMatchObject({
      image: { base64: 'aGVsbG8=' },
      images: [{ base64: 'aGVsbG8=' }, { revisedPrompt: 'revised prompt' }]
    })
    await expect(emptyGeneration.generateImage('empty')).resolves.toEqual({ images: [] })

    expect(arrayGeneration.image.value?.base64).toBe('aGVsbG8=')
    expect(emptyGeneration.image.value).toBeNull()
  })

  it('manages image form input and clears it after submit success', async () => {
    const preventDefault = vi.fn()
    const fetcher = vi.fn(async () =>
      jsonResponse({ image: { url: 'https://cdn.example.test/form.png' } })
    )
    const { input, setInput, handleInputChange, handleSubmit } = useImage({
      initialInput: 'seed prompt',
      fetch: fetcher as unknown as typeof fetch
    })

    expect(input.value).toBe('seed prompt')
    setInput('manual prompt')
    handleInputChange({ target: { value: 42 } })
    expect(input.value).toBe('42')
    handleInputChange('form prompt')

    await handleSubmit({ preventDefault }, { aspectRatio: '16:9' })

    expect(preventDefault).toHaveBeenCalledOnce()
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      prompt: 'form prompt',
      aspectRatio: '16:9'
    })
    expect(input.value).toBe('')
  })

  it('supports dynamic headers and body, clearError(), clear(), and missing prompt validation', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ image: { url: 'https://cdn.example.test/dynamic.png' } })
    )
    const generation = useImage({
      initialInput: 'dynamic prompt',
      headers: () => new Headers({ 'X-Dynamic': 'yes' }),
      body: ({ request }) => ({ tenantId: 'tenant_1', requestPrompt: request.prompt }),
      fetch: fetcher as unknown as typeof fetch
    })

    generation.handleInputChange({ target: {} })
    await expect(generation.generateImage()).rejects.toThrow('requires a prompt')

    generation.setInput('dynamic prompt')
    await generation.generateImage()

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toMatchObject({ 'x-dynamic': 'yes' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      requestPrompt: 'dynamic prompt',
      prompt: 'dynamic prompt'
    })
    expect(generation.image.value?.url).toBe('https://cdn.example.test/dynamic.png')

    generation.error.value = new Error('manual')
    generation.status.value = 'error'
    generation.clearError()
    expect(generation.error.value).toBeNull()
    expect(generation.status.value).toBe('ready')

    generation.clear()
    expect(generation.input.value).toBe('')
    expect(generation.image.value).toBeNull()
    expect(generation.images.value).toEqual([])
    expect(generation.result.value).toBeNull()
    expect(generation.lastRequest.value).toBeNull()
  })

  it('keeps image form input after submit errors', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ message: 'failed' }, { status: 500 }))
    const { handleSubmit, input, error, status } = useImage({
      initialInput: 'retry prompt',
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(handleSubmit()).rejects.toThrow('Request failed with status 500')

    expect(input.value).toBe('retry prompt')
    expect(error.value?.message).toContain('Request failed with status 500')
    expect(status.value).toBe('error')
  })

  it('retries transient image generation errors before committing a result', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) return jsonResponse({ message: 'busy' }, { status: 503 })
      return jsonResponse({ images: [{ url: 'https://cdn.example.test/retry.png' }] })
    })
    const { generateImage, image, error } = useImage({
      fetch: fetcher as unknown as typeof fetch,
      maxRetries: 1,
      onRetry
    })

    await expect(generateImage('retry image')).resolves.toMatchObject({
      image: { url: 'https://cdn.example.test/retry.png' }
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(image.value?.url).toBe('https://cdn.example.test/retry.png')
    expect(error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('stop() aborts an in-flight image request without storing an error', async () => {
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
    const { generateImage, stop, status, isLoading, error, image } = useImage({
      fetch: fetcher as unknown as typeof fetch
    })

    const pending = generateImage('abort image').catch((err: unknown) => err)
    await requestStarted

    expect(status.value).toBe('submitted')
    expect(isLoading.value).toBe(true)

    stop()

    expect(capturedSignal?.aborted).toBe(true)
    await expect(pending).resolves.toMatchObject({ name: 'AiHooksError' })
    expect(status.value).toBe('ready')
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(image.value).toBeNull()
  })

  it('does not commit image results resolved after stop()', async () => {
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
              resolve(jsonResponse({ image: { url: 'https://cdn.example.test/late.png' } }))
            },
            { once: true }
          )
        })
    )
    const { generateImage, stop, image, images, result, error } = useImage({
      fetch: fetcher as unknown as typeof fetch
    })

    const aborted = generateImage('late image').catch((err: unknown) => err)
    await requestStarted
    stop()

    await expect(aborted).resolves.toMatchObject({ name: 'AbortError' })
    expect(image.value).toBeNull()
    expect(images.value).toEqual([])
    expect(result.value).toBeNull()
    expect(error.value).toBeNull()
  })
})
