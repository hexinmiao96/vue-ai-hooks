import { describe, expect, it, vi } from 'vitest'
import { useTranscription } from '../src/composables/useTranscription'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('useTranscription', () => {
  it('posts transcription requests to the app-owned proxy and normalizes the result', async () => {
    const response = {
      text: 'The release note is ready.',
      language: 'en',
      durationInSeconds: 2.4,
      model: 'transcription-model',
      providerMetadata: { provider: 'test' }
    }
    const fetcher = vi.fn(async () => jsonResponse(response))
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const { transcribeAudio, transcribe, transcription, text, result, lastRequest, lastResponse } =
      useTranscription({
        api: '/api/transcription',
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

    expect(transcribe).toBe(transcribeAudio)
    await expect(
      transcribeAudio('data:audio/wav;base64,UklGRg==', {
        model: 'transcription-model',
        language: 'en',
        prompt: 'Release notes',
        timestampGranularities: ['segment'],
        body: { route: 'runtime' },
        headers: { 'X-Request': 'request_1' }
      })
    ).resolves.toEqual(response)

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/transcription')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Session': 'session_1',
      'X-Request': 'request_1'
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      route: 'runtime',
      audio: 'data:audio/wav;base64,UklGRg==',
      model: 'transcription-model',
      language: 'en',
      prompt: 'Release notes',
      timestampGranularities: ['segment']
    })
    expect(transcription.value).toBe('The release note is ready.')
    expect(text.value).toBe('The release note is ready.')
    expect(result.value?.model).toBe('transcription-model')
    expect(lastRequest.value).toMatchObject({
      api: '/api/transcription',
      credentials: 'include',
      audio: 'data:audio/wav;base64,UklGRg==',
      body: expect.objectContaining({ audio: 'data:audio/wav;base64,UklGRg==' })
    })
    expect(lastResponse.value).toMatchObject({
      result: { text: 'The release note is ready.' }
    })
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledOnce()
  })

  it('accepts a string transcription or transcription field response', async () => {
    const stringFetcher = vi.fn(async () => jsonResponse('string transcript'))
    const fieldFetcher = vi.fn(async () =>
      jsonResponse({
        transcription: 'field transcript',
        language: 'en'
      })
    )
    const stringTranscription = useTranscription({
      fetch: stringFetcher as unknown as typeof fetch
    })
    const fieldTranscription = useTranscription({
      fetch: fieldFetcher as unknown as typeof fetch
    })

    await expect(stringTranscription.transcribe('audio-url')).resolves.toEqual({
      text: 'string transcript'
    })
    await expect(fieldTranscription.transcribeAudio('audio-url')).resolves.toMatchObject({
      text: 'field transcript',
      language: 'en'
    })

    expect(stringTranscription.transcription.value).toBe('string transcript')
    expect(fieldTranscription.text.value).toBe('field transcript')
  })

  it('manages transcription form input and clears it after submit success', async () => {
    const preventDefault = vi.fn()
    const fetcher = vi.fn(async () => jsonResponse({ text: 'form transcript' }))
    const { input, setInput, handleInputChange, handleSubmit } = useTranscription({
      initialInput: 'seed audio',
      fetch: fetcher as unknown as typeof fetch
    })

    expect(input.value).toBe('seed audio')
    setInput('manual audio')
    handleInputChange({ target: { value: 42 } })
    expect(input.value).toBe('42')
    handleInputChange('form audio')

    await handleSubmit({ preventDefault }, { language: 'en' })

    expect(preventDefault).toHaveBeenCalledOnce()
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      audio: 'form audio',
      language: 'en'
    })
    expect(input.value).toBe('')
  })

  it('supports dynamic headers and body, clearError(), clear(), and missing audio validation', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ text: 'dynamic transcript' }))
    const transcription = useTranscription({
      initialInput: 'dynamic audio',
      headers: () => new Headers({ 'X-Dynamic': 'yes' }),
      body: ({ request }) => ({ tenantId: 'tenant_1', requestAudio: request.audio }),
      fetch: fetcher as unknown as typeof fetch
    })

    transcription.handleInputChange({ target: {} })
    await expect(transcription.transcribeAudio()).rejects.toThrow('requires audio')

    transcription.setInput('dynamic audio')
    await transcription.transcribeAudio()

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toMatchObject({ 'x-dynamic': 'yes' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      requestAudio: 'dynamic audio',
      audio: 'dynamic audio'
    })
    expect(transcription.text.value).toBe('dynamic transcript')

    transcription.error.value = new Error('manual')
    transcription.status.value = 'error'
    transcription.clearError()
    expect(transcription.error.value).toBeNull()
    expect(transcription.status.value).toBe('ready')

    transcription.clear()
    expect(transcription.input.value).toBe('')
    expect(transcription.transcription.value).toBe('')
    expect(transcription.result.value).toBeNull()
    expect(transcription.lastRequest.value).toBeNull()
  })

  it('keeps transcription form input after submit errors', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ message: 'failed' }, { status: 500 }))
    const { handleSubmit, input, error, status } = useTranscription({
      initialInput: 'retry audio',
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(handleSubmit()).rejects.toThrow('Request failed with status 500')

    expect(input.value).toBe('retry audio')
    expect(error.value?.message).toContain('Request failed with status 500')
    expect(status.value).toBe('error')
  })

  it('retries transient transcription errors before committing a result', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) return jsonResponse({ message: 'busy' }, { status: 503 })
      return jsonResponse({ text: 'retry transcript' })
    })
    const { transcribeAudio, transcription, error } = useTranscription({
      fetch: fetcher as unknown as typeof fetch,
      maxRetries: 1,
      onRetry
    })

    await expect(transcribeAudio('retry audio')).resolves.toMatchObject({
      text: 'retry transcript'
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(transcription.value).toBe('retry transcript')
    expect(error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('stop() aborts an in-flight transcription request without storing an error', async () => {
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
    const { transcribeAudio, stop, status, isLoading, error, transcription } = useTranscription({
      fetch: fetcher as unknown as typeof fetch
    })

    const pending = transcribeAudio('abort audio').catch((err: unknown) => err)
    await requestStarted

    expect(status.value).toBe('submitted')
    expect(isLoading.value).toBe(true)

    stop()

    expect(capturedSignal?.aborted).toBe(true)
    await expect(pending).resolves.toMatchObject({ name: 'AiHooksError' })
    expect(status.value).toBe('ready')
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(transcription.value).toBe('')
  })

  it('does not commit a late transcription result after stop()', async () => {
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
              resolve(jsonResponse({ text: 'late transcript' }))
            },
            { once: true }
          )
        })
    )
    const { transcribeAudio, stop, transcription, result, error, status } = useTranscription({
      fetch: fetcher as unknown as typeof fetch
    })

    const pending = transcribeAudio('late audio').catch((err: unknown) => err)
    await requestStarted
    stop()

    await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
    expect(transcription.value).toBe('')
    expect(result.value).toBeNull()
    expect(error.value).toBeNull()
    expect(status.value).toBe('ready')
  })
})
