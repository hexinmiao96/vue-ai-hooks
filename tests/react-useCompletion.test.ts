import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCompletion } from '../src/react'
import type { ChatProvider } from '../src/providers/types'
import type { CompletionRequest } from '../src/types'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function completionProvider(
  chunks: string[],
  requests: CompletionRequest[] = [],
  id = 'react-completion-fake'
): ChatProvider {
  return {
    id,
    async chat() {
      return (async function* () {})()
    },
    async completion(request): Promise<AsyncIterable<string>> {
      requests.push(request)
      return (async function* () {
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

function textResponse(text: string): Response {
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}

describe('react useCompletion', () => {
  it('streams completion text with React state and lifecycle callbacks', async () => {
    const requests: CompletionRequest[] = []
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const onUpdate = vi.fn()
    const onFinish = vi.fn()
    const { result } = renderHook(() =>
      useCompletion({
        provider: completionProvider(['Hello', ' React'], requests),
        generateId: (prefix = 'id') => `${prefix}_fixed`,
        onRequest,
        onResponse,
        onUpdate,
        onFinish
      })
    )

    await act(async () => {
      await expect(result.current.complete('Say hello')).resolves.toBe('Hello React')
    })

    expect(result.current.id).toBe('completion_fixed')
    expect(result.current.completion).toBe('Hello React')
    expect(result.current.status).toBe('ready')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(requests[0]).toMatchObject({ prompt: 'Say hello', stream: true })
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'react-completion-fake', prompt: 'Say hello' })
    )
    expect(onResponse).toHaveBeenCalledWith(expect.objectContaining({ hasStream: true }))
    expect(onUpdate).toHaveBeenLastCalledWith('Hello React', ' React')
    expect(onFinish).toHaveBeenCalledWith(
      'Say hello',
      'Hello React',
      expect.objectContaining({ prompt: 'Say hello', completion: 'Hello React', isAbort: false })
    )
  })

  it('supports legacy onFinish callbacks', async () => {
    const onFinishLegacy = vi.fn()
    const { result } = renderHook(() =>
      useCompletion({
        provider: completionProvider(['Done'], []),
        onFinishLegacy
      })
    )

    await act(async () => {
      await expect(result.current.complete('Legacy it')).resolves.toBe('Done')
    })

    expect(onFinishLegacy).toHaveBeenCalledOnce()
    expect(onFinishLegacy).toHaveBeenCalledWith(
      'Done',
      expect.objectContaining({ prompt: 'Legacy it', completion: 'Done', isAbort: false })
    )
  })

  it('uses proxy transport when provider is omitted', async () => {
    const fetcher = vi.fn(async () => textResponse('proxied completion'))
    const { result } = renderHook(() =>
      useCompletion({
        api: '/api/react-completion',
        streamProtocol: 'text',
        body: { tenantId: 'tenant_1' },
        headers: { 'X-Session': 'session_1' },
        credentials: 'include',
        fetch: fetcher as unknown as typeof fetch
      })
    )

    await act(async () => {
      await expect(result.current.complete('finish this')).resolves.toBe('proxied completion')
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/react-completion')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      prompt: 'finish this',
      streamProtocol: 'text',
      stream: true
    })
    expect(result.current.lastRequest).toMatchObject({
      providerId: 'proxy',
      api: '/api/react-completion',
      credentials: 'include',
      prompt: 'finish this'
    })
    expect(result.current.lastResponse).toMatchObject({ hasStream: true })
  })

  it('supports controlled input helpers and clears input after submit', async () => {
    const requests: CompletionRequest[] = []
    const { result } = renderHook(() =>
      useCompletion({
        provider: completionProvider(['submitted'], requests),
        initialInput: 'draft prompt'
      })
    )
    const preventDefault = vi.fn()

    expect(result.current.input).toBe('draft prompt')
    act(() => {
      result.current.setInput('manual prompt')
      result.current.handleInputChange({ target: { value: 'event prompt' } })
    })

    await act(async () => {
      await expect(
        result.current.handleSubmit({ preventDefault }, { model: 'form-model', temperature: 0.2 })
      ).resolves.toBe('submitted')
    })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(result.current.input).toBe('')
    expect(requests[0]).toMatchObject({
      prompt: 'event prompt',
      model: 'form-model',
      temperature: 0.2,
      stream: true
    })
  })

  it('keeps input when submit fails and supports clear helpers', async () => {
    const provider: ChatProvider = {
      ...completionProvider([]),
      async completion() {
        throw new Error('completion failed')
      }
    }
    const { result } = renderHook(() =>
      useCompletion({ provider, initialInput: 'keep prompt', initialCompletion: 'seed' })
    )
    let thrown: unknown

    await act(async () => {
      try {
        await result.current.handleSubmit()
      } catch (error) {
        thrown = error
      }
    })

    expect(thrown).toMatchObject({ message: 'completion failed' })
    await waitFor(() => {
      expect(result.current.error?.message).toBe('completion failed')
      expect(result.current.status).toBe('error')
    })
    expect(result.current.input).toBe('keep prompt')

    act(() => {
      result.current.clearError()
      result.current.clearTrace()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.lastRequest).toBeNull()

    act(() => {
      result.current.setCompletion('manual')
      result.current.clear()
    })
    expect(result.current.completion).toBe('')
    expect(result.current.input).toBe('')
    expect(result.current.status).toBe('ready')
  })

  it('retries before the first delta', async () => {
    const requests: CompletionRequest[] = []
    let calls = 0
    const provider: ChatProvider = {
      ...completionProvider([], requests),
      async completion(request): Promise<AsyncIterable<string>> {
        requests.push(request)
        calls += 1
        if (calls === 1) throw new Error('temporary failure')
        return (async function* () {
          yield 'after retry'
        })()
      }
    }
    const onRetry = vi.fn()
    const { result } = renderHook(() => useCompletion({ provider, maxRetries: 1, onRetry }))

    await act(async () => {
      await expect(result.current.complete('retry')).resolves.toBe('after retry')
    })

    expect(onRetry).toHaveBeenCalledOnce()
    expect(requests).toHaveLength(2)
    expect(result.current.lastRequest?.attempt).toBe(2)
  })

  it('calls onRetry before retrying completion streams that fail before first delta', async () => {
    const onRetry = vi.fn()
    const requests: CompletionRequest[] = []
    const provider: ChatProvider = {
      ...completionProvider([], requests),
      async completion(request): Promise<AsyncIterable<string>> {
        requests.push(request)
        throw new Error('temporary retryable failure')
      }
    }

    const { result } = renderHook(() => useCompletion({ provider, maxRetries: 1, onRetry }))

    await act(async () => {
      await expect(result.current.complete('retry-should-call')).rejects.toThrow(
        'temporary retryable failure'
      )
    })

    expect(onRetry).toHaveBeenCalledOnce()
    expect(onRetry).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ attempt: 1, maxRetries: 1, error: expect.any(Error) })
    )
    expect(requests).toHaveLength(2)
  })

  it('does not call onError for abort error paths', async () => {
    const onError = vi.fn()
    let resolveOnAbort: (() => void) | undefined
    const provider: ChatProvider = {
      ...completionProvider([]),
      async completion(request): Promise<AsyncIterable<string>> {
        return (async function* () {
          await new Promise<void>((resolve) => {
            resolveOnAbort = resolve
            request.signal?.addEventListener('abort', () => resolve(), { once: true })
          })
          yield 'ignored'
        })()
      }
    }

    const { result } = renderHook(() => useCompletion({ provider, onError }))

    let pending!: Promise<string>
    act(() => {
      pending = result.current.complete('abort')
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      result.current.stop()
    })
    resolveOnAbort?.()

    await act(async () => {
      await expect(pending).resolves.toBe('')
    })

    expect(onError).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it('normalizes provider errors and calls onError', async () => {
    const onError = vi.fn()
    const onFinish = vi.fn()
    const provider: ChatProvider = {
      ...completionProvider([]),
      async completion() {
        throw 'provider failed'
      }
    }
    const { result } = renderHook(() =>
      useCompletion({
        provider,
        onError,
        onFinish
      })
    )

    await act(async () => {
      await expect(result.current.complete('fail')).rejects.toThrow('provider failed')
    })

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('provider failed')
      expect(result.current.status).toBe('error')
      expect(result.current.isLoading).toBe(false)
    })
    expect(onError).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith(result.current.error)
    expect(onFinish).not.toHaveBeenCalled()

    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.status).toBe('ready')
  })

  it('captures inspect() timeline, retry and request trace metadata', async () => {
    let calls = 0
    const requests: CompletionRequest[] = []
    const provider: ChatProvider = {
      id: 'react-inspect-completion',
      async chat() {
        return (async function* () {
          yield { content: '' }
        })()
      },
      async completion(request): Promise<AsyncIterable<string>> {
        requests.push(request)
        calls += 1
        if (calls === 1) {
          const error = new Error('temporary outage')
          Object.assign(error, { status: 429 })
          throw error
        }
        return (async function* () {
          yield 'ok'
        })()
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }

    const { result } = renderHook(() =>
      useCompletion({
        provider,
        maxRetries: 1,
        defaultRequest: {
          body: { tenantId: 'tenant_1' },
          headers: { Authorization: 'Bearer secret', 'x-tenant': 'tenant_1' }
        }
      })
    )

    await act(async () => {
      await expect(result.current.complete('retry please')).resolves.toBe('ok')
    })

    expect(calls).toBe(2)

    const snapshot = result.current.inspect()
    expect(snapshot.hasRequest).toBe(true)
    expect(snapshot.hasResponse).toBe(true)
    expect(snapshot.request).toMatchObject({
      providerId: 'react-inspect-completion',
      attempt: 2,
      body: { tenantId: 'tenant_1' },
      headers: {
        'x-tenant': 'tenant_1'
      },
      request: expect.objectContaining({
        prompt: 'retry please',
        stream: true
      })
    })
    expect(snapshot.response).toMatchObject({
      providerId: 'react-inspect-completion',
      attempt: 2,
      hasStream: true
    })
    const kinds = snapshot.timeline.map((event) => event.kind)
    expect(kinds).toEqual(expect.arrayContaining(['request', 'retry', 'stream', 'response']))
    expect(snapshot.retries).toHaveLength(1)
    expect(snapshot.retries[0]).toMatchObject({
      attempt: 1,
      maxRetries: 1,
      error: expect.objectContaining({
        category: 'rate-limit',
        status: 429
      })
    })
    expect(snapshot.providerTrace).toMatchObject({
      providerId: 'react-inspect-completion',
      attempt: 2,
      hasStream: true
    })
    expect(snapshot.curl).toBeNull()
    expect(snapshot.summary).toBe('response received')
    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({
      body: { tenantId: 'tenant_1' },
      headers: { 'x-tenant': 'tenant_1' },
      prompt: 'retry please',
      stream: true
    })
  })

  it('uses retryDelayMs function while retrying', async () => {
    const retryDelayMs = vi.fn(() => 20)
    let calls = 0
    const requests: CompletionRequest[] = []
    const provider: ChatProvider = {
      id: 'react-retry-delay-completion',
      async chat() {
        return (async function* () {
          yield { content: '' }
        })()
      },
      async completion(request): Promise<AsyncIterable<string>> {
        requests.push(request)
        calls += 1
        if (calls === 1) {
          const error = new Error('temporary completion failure')
          Object.assign(error, { status: 429 })
          throw error
        }
        return (async function* () {
          yield 'retried'
        })()
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }

    const { result } = renderHook(() =>
      useCompletion({
        provider,
        maxRetries: 1,
        retryDelayMs
      })
    )

    await act(async () => {
      await expect(result.current.complete('retry delay')).resolves.toBe('retried')
    })

    expect(retryDelayMs).toHaveBeenCalledTimes(2)
    expect(retryDelayMs).toHaveBeenNthCalledWith(1, expect.objectContaining({ attempt: 1 }))
    const snapshot = result.current.inspect()
    expect(snapshot.retries).toHaveLength(1)
    expect(snapshot.retries[0]).toMatchObject({
      attempt: 1,
      maxRetries: 1,
      delayMs: 20,
      error: expect.objectContaining({
        name: 'Error',
        message: 'temporary completion failure'
      })
    })
    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({
      prompt: 'retry delay',
      stream: true
    })
  })

  it('supports string and missing-target calls to handleInputChange', () => {
    const { result } = renderHook(() => useCompletion({ provider: completionProvider(['ok']) }))

    act(() => {
      result.current.handleInputChange('string prompt')
    })
    expect(result.current.input).toBe('string prompt')

    act(() => {
      result.current.handleInputChange({})
    })
    expect(result.current.input).toBe('')
  })

  it('throws a clear error when no prompt can be resolved', async () => {
    const { result } = renderHook(() =>
      useCompletion({ provider: completionProvider(['ignored']) })
    )

    await act(async () => {
      await expect(result.current.complete()).rejects.toThrow('complete() requires a prompt')
    })
  })

  it('handles non-iterable stream responses as non-stream in trace', async () => {
    const provider: ChatProvider = {
      id: 'react-non-stream',
      async chat() {
        return (async function* () {
          yield { content: '' }
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return null as unknown as AsyncIterable<string>
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }

    const { result } = renderHook(() =>
      useCompletion({
        provider,
        maxRetries: 0
      })
    )

    await act(async () => {
      await expect(result.current.complete('non stream')).rejects.toThrow()
    })

    expect(result.current.lastResponse).toMatchObject({
      hasStream: false,
      attempt: 1,
      prompt: 'non stream'
    })
  })

  it('returns completed output and onFinish state for AbortError completion failures', async () => {
    const onFinish = vi.fn()
    const error = new Error('aborted')
    error.name = 'AbortError'
    const provider: ChatProvider = {
      id: 'react-abort-failure',
      async chat() {
        return (async function* () {
          yield { content: '' }
        })()
      },
      async completion() {
        throw error
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }
    const { result } = renderHook(() => useCompletion({ provider, onFinish }))

    await act(async () => {
      await expect(result.current.complete('abort')).resolves.toBe('')
    })

    expect(onFinish).toHaveBeenCalledWith(
      'abort',
      '',
      expect.objectContaining({ isAbort: true, prompt: 'abort' })
    )
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
  })

  it('clearTrace() also clears inspect snapshot state', async () => {
    const { result } = renderHook(() => useCompletion({ provider: completionProvider(['ok']) }))

    await act(async () => {
      await expect(result.current.complete('clear inspect')).resolves.toBe('ok')
    })

    expect(result.current.inspect().hasRequest).toBe(true)
    expect(result.current.inspect().hasResponse).toBe(true)

    act(() => {
      result.current.clearTrace()
    })

    const snapshot = result.current.inspect()
    expect(snapshot.hasRequest).toBe(false)
    expect(snapshot.hasResponse).toBe(false)
    expect(snapshot.retries).toEqual([])
    expect(snapshot.timeline).toEqual([
      {
        kind: 'status',
        label: 'status ready',
        timestamp: expect.any(String),
        status: 'ready'
      }
    ])
  })

  it('marks stopped streams as aborted finishes', async () => {
    const onFinish = vi.fn()
    let resolveOnAbort: (() => void) | undefined
    const provider: ChatProvider = {
      ...completionProvider([]),
      async completion(request): Promise<AsyncIterable<string>> {
        return (async function* () {
          await new Promise<void>((resolve) => {
            resolveOnAbort = resolve
            request.signal?.addEventListener('abort', () => resolve(), { once: true })
          })
          yield 'ignored'
        })()
      }
    }
    const { result } = renderHook(() => useCompletion({ provider, onFinish }))
    let pending!: Promise<string>

    act(() => {
      pending = result.current.complete('stop')
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      result.current.stop()
    })
    resolveOnAbort?.()
    await act(async () => {
      await expect(pending).resolves.toBe('')
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.completion).toBe('')
    expect(onFinish).toHaveBeenCalledWith(
      'stop',
      '',
      expect.objectContaining({ isAbort: true, prompt: 'stop' })
    )
  })
})
