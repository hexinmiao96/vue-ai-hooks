import { describe, expect, it, vi } from 'vitest'
import { useSpeech } from '../src/composables/useSpeech'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('useSpeech', () => {
  it('posts speech requests to the app-owned proxy and normalizes the result', async () => {
    const response = {
      audio: {
        url: 'data:audio/wav;base64,UklGRg==',
        mediaType: 'audio/wav',
        durationInSeconds: 1.2
      },
      model: 'speech-model',
      providerMetadata: { provider: 'test' }
    }
    const fetcher = vi.fn(async () => jsonResponse(response))
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const { generateSpeech, speak, audio, result, lastRequest, lastResponse } = useSpeech({
      api: '/api/speech',
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

    expect(speak).toBe(generateSpeech)
    await expect(
      generateSpeech('Read this release note.', {
        model: 'speech-model',
        voice: 'alloy',
        outputFormat: 'wav',
        body: { route: 'runtime' },
        headers: { 'X-Request': 'request_1' }
      })
    ).resolves.toEqual(response)

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/speech')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Session': 'session_1',
      'X-Request': 'request_1'
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      route: 'runtime',
      text: 'Read this release note.',
      model: 'speech-model',
      voice: 'alloy',
      outputFormat: 'wav'
    })
    expect(audio.value).toEqual(response.audio)
    expect(result.value?.model).toBe('speech-model')
    expect(lastRequest.value).toMatchObject({
      api: '/api/speech',
      credentials: 'include',
      text: 'Read this release note.',
      body: expect.objectContaining({ text: 'Read this release note.' })
    })
    expect(lastResponse.value).toMatchObject({
      result: { model: 'speech-model' }
    })
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledOnce()
  })

  it('accepts a string URL or a single audio response object', async () => {
    const stringFetcher = vi.fn(async () => jsonResponse('https://cdn.example.test/speech.mp3'))
    const objectFetcher = vi.fn(async () =>
      jsonResponse({
        base64: 'UklGRg==',
        mediaType: 'audio/wav',
        revisedText: 'Revised text'
      })
    )
    const stringSpeech = useSpeech({ fetch: stringFetcher as unknown as typeof fetch })
    const objectSpeech = useSpeech({ fetch: objectFetcher as unknown as typeof fetch })

    await expect(stringSpeech.generate('string url')).resolves.toEqual({
      audio: { url: 'https://cdn.example.test/speech.mp3' }
    })
    await expect(objectSpeech.generateSpeech('object audio')).resolves.toMatchObject({
      audio: { base64: 'UklGRg==', mediaType: 'audio/wav' }
    })

    expect(stringSpeech.audio.value?.url).toBe('https://cdn.example.test/speech.mp3')
    expect(objectSpeech.audio.value?.base64).toBe('UklGRg==')
  })

  it('manages speech form input and clears it after submit success', async () => {
    const preventDefault = vi.fn()
    const fetcher = vi.fn(async () =>
      jsonResponse({ audio: { url: 'https://cdn.example.test/form.wav' } })
    )
    const { input, setInput, handleInputChange, handleSubmit } = useSpeech({
      initialInput: 'seed text',
      fetch: fetcher as unknown as typeof fetch
    })

    expect(input.value).toBe('seed text')
    setInput('manual text')
    handleInputChange({ target: { value: 42 } })
    expect(input.value).toBe('42')
    handleInputChange('form text')

    await handleSubmit({ preventDefault }, { voice: 'verse' })

    expect(preventDefault).toHaveBeenCalledOnce()
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      text: 'form text',
      voice: 'verse'
    })
    expect(input.value).toBe('')
  })

  it('supports dynamic headers and body, clearError(), clear(), and missing text validation', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ audio: { url: 'https://cdn.example.test/dynamic.wav' } })
    )
    const speech = useSpeech({
      initialInput: 'dynamic text',
      headers: () => new Headers({ 'X-Dynamic': 'yes' }),
      body: ({ request }) => ({ tenantId: 'tenant_1', requestText: request.text }),
      fetch: fetcher as unknown as typeof fetch
    })

    speech.handleInputChange({ target: {} })
    await expect(speech.generateSpeech()).rejects.toThrow('requires text')

    speech.setInput('dynamic text')
    await speech.generateSpeech()

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toMatchObject({ 'x-dynamic': 'yes' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      requestText: 'dynamic text',
      text: 'dynamic text'
    })
    expect(speech.audio.value?.url).toBe('https://cdn.example.test/dynamic.wav')

    speech.error.value = new Error('manual')
    speech.status.value = 'error'
    speech.clearError()
    expect(speech.error.value).toBeNull()
    expect(speech.status.value).toBe('ready')

    speech.clear()
    expect(speech.input.value).toBe('')
    expect(speech.audio.value).toBeNull()
    expect(speech.result.value).toBeNull()
    expect(speech.lastRequest.value).toBeNull()
  })

  it('keeps speech form input after submit errors', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ message: 'failed' }, { status: 500 }))
    const { handleSubmit, input, error, status } = useSpeech({
      initialInput: 'retry text',
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(handleSubmit()).rejects.toThrow('Request failed with status 500')

    expect(input.value).toBe('retry text')
    expect(error.value?.message).toContain('Request failed with status 500')
    expect(status.value).toBe('error')
  })

  it('retries transient speech generation errors before committing a result', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) return jsonResponse({ message: 'busy' }, { status: 503 })
      return jsonResponse({ audio: { url: 'https://cdn.example.test/retry.wav' } })
    })
    const { generateSpeech, audio, error } = useSpeech({
      fetch: fetcher as unknown as typeof fetch,
      maxRetries: 1,
      onRetry
    })

    await expect(generateSpeech('retry speech')).resolves.toMatchObject({
      audio: { url: 'https://cdn.example.test/retry.wav' }
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(audio.value?.url).toBe('https://cdn.example.test/retry.wav')
    expect(error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('stop() aborts an in-flight speech request without storing an error', async () => {
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
    const { generateSpeech, stop, status, isLoading, error, audio } = useSpeech({
      fetch: fetcher as unknown as typeof fetch
    })

    const pending = generateSpeech('abort speech').catch((err: unknown) => err)
    await requestStarted

    expect(status.value).toBe('submitted')
    expect(isLoading.value).toBe(true)

    stop()

    expect(capturedSignal?.aborted).toBe(true)
    await expect(pending).resolves.toMatchObject({ name: 'AiHooksError' })
    expect(status.value).toBe('ready')
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(audio.value).toBeNull()
  })

  it('does not commit a late speech result after stop()', async () => {
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
              resolve(jsonResponse({ audio: { url: 'https://cdn.example.test/late.wav' } }))
            },
            { once: true }
          )
        })
    )
    const { generateSpeech, stop, audio, result, error, status } = useSpeech({
      fetch: fetcher as unknown as typeof fetch
    })

    const pending = generateSpeech('late speech').catch((err: unknown) => err)
    await requestStarted
    stop()

    await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
    expect(audio.value).toBeNull()
    expect(result.value).toBeNull()
    expect(error.value).toBeNull()
    expect(status.value).toBe('ready')
  })

  it('captures inspect() snapshot metadata for proxy speech requests', async () => {
    const response = {
      audio: { url: 'https://cdn.example.test/inspect.wav', mediaType: 'audio/wav' },
      model: 'inspect-speech'
    }
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' }
        })
    )
    const { generateSpeech, inspect, clearTrace } = useSpeech({
      api: '/api/speech',
      headers: { 'X-Session': 'session_1' },
      body: { tenantId: 'tenant_1' },
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(generateSpeech('inspect text', { model: 'speech-model' })).resolves.toEqual(
      response
    )

    const snapshot = inspect()
    expect(snapshot.hasRequest).toBe(true)
    expect(snapshot.hasResponse).toBe(true)
    expect(snapshot.providerTrace.providerId).toBe('proxy')
    expect(snapshot.providerTrace.api).toBe('/api/speech')
    expect(snapshot.request).toMatchObject({
      providerId: 'proxy',
      attempt: 1,
      text: 'inspect text'
    })
    expect(snapshot.response).toMatchObject({
      providerId: 'proxy',
      result: response
    })
    expect(snapshot.timeline.map((event) => event.kind)).toEqual(
      expect.arrayContaining(['request', 'response'])
    )
    expect(snapshot.curl).toContain('/api/speech')

    clearTrace()
    const cleared = inspect()
    expect(cleared.hasRequest).toBe(false)
    expect(cleared.hasResponse).toBe(false)
  })
})
