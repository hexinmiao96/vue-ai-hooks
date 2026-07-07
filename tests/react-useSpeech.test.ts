import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSpeech } from '../src/react'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('react useSpeech', () => {
  it('posts speech requests through the app-owned endpoint and reports lifecycle callbacks', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        audio: { url: 'https://cdn.example.test/speech.mp3', mediaType: 'audio/mpeg' },
        model: 'speech-model'
      })
    )
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const onFinish = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useSpeech({
        api: '/api/react-speech',
        baseURL: 'https://app.example.test',
        credentials: 'include',
        headers: { 'X-Session': 'session_1' },
        body: { tenantId: 'tenant_1' },
        fetch: fetcher as unknown as typeof fetch,
        defaultRequest: {
          model: 'default-model',
          voice: 'alloy',
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
        result.current.generateSpeech('Read this aloud', {
          format: 'mp3',
          speed: 1.1,
          body: { route: 'runtime' }
        })
      ).resolves.toEqual(
        expect.objectContaining({
          audio: { url: 'https://cdn.example.test/speech.mp3', mediaType: 'audio/mpeg' },
          model: 'speech-model'
        })
      )
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/react-speech')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      model: 'default-model',
      route: 'runtime',
      voice: 'alloy',
      format: 'mp3',
      speed: 1.1,
      text: 'Read this aloud'
    })
    expect(result.current.audio?.url).toBe('https://cdn.example.test/speech.mp3')
    expect(result.current.status).toBe('ready')
    expect(result.current.lastRequest).toMatchObject({
      api: '/api/react-speech',
      credentials: 'include',
      text: 'Read this aloud'
    })
    expect(result.current.lastResponse).toMatchObject({
      api: '/api/react-speech',
      result: expect.objectContaining({ model: 'speech-model' })
    })
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })

  it('normalizes string, object, top-level audio, and empty speech responses', async () => {
    const stringFetcher = vi.fn(async () => jsonResponse('https://cdn.example.test/speech.mp3'))
    const objectFetcher = vi.fn(async () =>
      jsonResponse({ audio: { base64: 'AAAA', mediaType: 'audio/mpeg' } })
    )
    const topLevelFetcher = vi.fn(async () =>
      jsonResponse({ url: 'https://cdn.example.test/top-level.wav', mediaType: 'audio/wav' })
    )
    const emptyFetcher = vi.fn(async () => jsonResponse(null))

    const stringHook = renderHook(() =>
      useSpeech({ fetch: stringFetcher as unknown as typeof fetch })
    )
    const objectHook = renderHook(() =>
      useSpeech({ fetch: objectFetcher as unknown as typeof fetch })
    )
    const topLevelHook = renderHook(() =>
      useSpeech({ fetch: topLevelFetcher as unknown as typeof fetch })
    )
    const emptyHook = renderHook(() =>
      useSpeech({ fetch: emptyFetcher as unknown as typeof fetch })
    )

    await act(async () => {
      await expect(stringHook.result.current.generateSpeech('url audio')).resolves.toMatchObject({
        audio: { url: 'https://cdn.example.test/speech.mp3' }
      })
      await expect(objectHook.result.current.generateSpeech('object audio')).resolves.toMatchObject(
        {
          audio: { base64: 'AAAA', mediaType: 'audio/mpeg' }
        }
      )
      await expect(
        topLevelHook.result.current.generateSpeech('top-level audio')
      ).resolves.toMatchObject({
        audio: { url: 'https://cdn.example.test/top-level.wav' }
      })
      await expect(emptyHook.result.current.generateSpeech('empty audio')).resolves.toEqual({})
    })

    expect(stringHook.result.current.audio?.url).toBe('https://cdn.example.test/speech.mp3')
    expect(objectHook.result.current.audio?.base64).toBe('AAAA')
    expect(topLevelHook.result.current.audio?.mediaType).toBe('audio/wav')
    expect(emptyHook.result.current.audio).toBeNull()
  })

  it('supports controlled form helpers and clears input only on successful submit', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ audio: { url: 'https://cdn.example.test/form.mp3' } })
    )
    const { result } = renderHook(() =>
      useSpeech({
        initialInput: 'seed text',
        fetch: fetcher as unknown as typeof fetch
      })
    )

    expect(result.current.input).toBe('seed text')
    const preventDefault = vi.fn()

    act(() => {
      result.current.setInput('manual')
      result.current.handleInputChange({ target: { value: 'event text' } })
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault }, { voice: 'verse' })
    })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(result.current.input).toBe('')
    expect(
      JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    ).toMatchObject({ text: 'event text', voice: 'verse' })
  })

  it('supports generate and speak aliases with functional headers, body, and input fallbacks', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ audio: { url: 'https://cdn.example.test/alias.mp3' } })
    )
    const headers = vi.fn(async () => ({ 'X-Configured': 'yes' }))
    const body = vi.fn(({ request }) => ({ configuredModel: request.model }))
    const { result } = renderHook(() =>
      useSpeech({
        api: 'api/react-speech',
        baseURL: 'https://app.example.test/',
        headers,
        body,
        fetch: fetcher as unknown as typeof fetch
      })
    )

    act(() => {
      result.current.handleInputChange('alias text')
    })

    await act(async () => {
      await expect(
        result.current.speak(undefined, {
          model: 'alias-model',
          body: { runtime: true },
          headers: { 'X-Request': 'request' }
        })
      ).resolves.toMatchObject({
        audio: { url: 'https://cdn.example.test/alias.mp3' }
      })
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/react-speech')
    expect(headers).toHaveBeenCalledOnce()
    expect(body).toHaveBeenCalledWith({
      request: expect.objectContaining({ text: 'alias text', model: 'alias-model' })
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
      text: 'alias text'
    })

    await act(async () => {
      await expect(result.current.generate('direct alias')).resolves.toMatchObject({
        audio: { url: 'https://cdn.example.test/alias.mp3' }
      })
    })
    expect(JSON.parse(fetcher.mock.calls[1][1].body as string)).toMatchObject({
      text: 'direct alias'
    })
  })

  it('keeps input when submit fails and supports clear helpers', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ message: 'speech service unavailable' }, { status: 503 })
    )
    const { result } = renderHook(() =>
      useSpeech({
        initialInput: 'retry text',
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
    expect(thrown).toMatchObject({ status: 503 })
    expect(result.current.input).toBe('retry text')
    expect(result.current.status).toBe('error')
    expect(result.current.error).toBeInstanceOf(Error)

    act(() => {
      result.current.clearError()
      result.current.clearTrace()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.lastRequest).toBeNull()

    act(() => {
      result.current.clear()
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.input).toBe('')
    expect(result.current.audio).toBeNull()
    expect(result.current.result).toBeNull()
  })

  it('retries transient speech generation errors and captures inspect retry metadata', async () => {
    let calls = 0
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return jsonResponse({ message: 'temporary failure' }, { status: 503 })
      }
      return jsonResponse({ audio: { url: 'https://cdn.example.test/retry.mp3' } })
    })
    const { result } = renderHook(() =>
      useSpeech({
        fetch: fetcher as unknown as typeof fetch,
        maxRetries: 1,
        retryDelayMs: 0
      })
    )

    await act(async () => {
      await expect(result.current.generateSpeech('retry speech')).resolves.toMatchObject({
        audio: { url: 'https://cdn.example.test/retry.mp3' }
      })
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.current.inspect().retries).toHaveLength(1)
  })
})
