import { describe, expect, it, vi } from 'vitest'

import { useCompletion } from '../src/composables/useCompletion'

type CompletionProvider = NonNullable<NonNullable<Parameters<typeof useCompletion>[0]>['provider']>

const flushPromises = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })

const completionProvider = (provider: { completion: unknown }): CompletionProvider =>
  provider as unknown as CompletionProvider

const fakeProvider = (text: string) =>
  completionProvider({
    completion: async function* () {
      for (const char of text) {
        yield char
      }
    }
  })

describe('useCompletion', () => {
  it('uses a proxy transport when provider is omitted', async () => {
    const onRequest = vi.fn()
    const fetcher = vi.fn(
      async () =>
        new Response('ok', {
          headers: { 'Content-Type': 'text/plain' }
        })
    )
    const { complete, completion, lastRequest } = useCompletion({
      api: '/api/completion',
      streamProtocol: 'text',
      headers: { 'X-Session': 'session_1' },
      body: { tenantId: 'tenant_1' },
      credentials: 'include',
      fetch: fetcher as unknown as typeof fetch,
      onRequest
    })

    await expect(complete('finish this')).resolves.toBe('ok')

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/completion')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      prompt: 'finish this',
      streamProtocol: 'text',
      stream: true
    })
    expect(completion.value).toBe('ok')
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'proxy',
        api: '/api/completion',
        credentials: 'include',
        request: expect.objectContaining({ streamProtocol: 'text' }),
        prompt: 'finish this'
      })
    )
    expect(lastRequest.value).toMatchObject({
      providerId: 'proxy',
      api: '/api/completion',
      credentials: 'include',
      request: expect.objectContaining({ streamProtocol: 'text' }),
      prompt: 'finish this'
    })
  })

  it('streams completion into ref', async () => {
    const onUpdate = vi.fn()
    const { complete, completion, status, isLoading, error } = useCompletion({
      provider: fakeProvider('hello'),
      onUpdate
    })

    await expect(complete('Say hello')).resolves.toBe('hello')

    expect(completion.value).toBe('hello')
    expect(onUpdate).toHaveBeenNthCalledWith(1, 'h', 'h')
    expect(onUpdate).toHaveBeenLastCalledWith('hello', 'o')
    expect(status.value).toBe('ready')
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('throttles streaming completion ref updates', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      let releaseStream!: () => void
      let resolveFirstBatch!: () => void
      const firstBatchSeen = new Promise<void>((resolve) => {
        resolveFirstBatch = resolve
      })
      const streamReleased = new Promise<void>((resolve) => {
        releaseStream = resolve
      })
      const provider = completionProvider({
        completion: async function* () {
          yield 'a'
          yield 'b'
          resolveFirstBatch()
          await streamReleased
          yield 'c'
        }
      })
      const onUpdate = vi.fn()
      const { complete, completion } = useCompletion({
        provider,
        throttleMs: 50,
        onUpdate
      })

      const pending = complete('throttle')
      await firstBatchSeen

      expect(completion.value).toBe('')
      expect(onUpdate).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(completion.value).toBe('ab')
      expect(onUpdate).toHaveBeenCalledWith('ab', 'ab')

      releaseStream()
      await expect(pending).resolves.toBe('abc')
      expect(completion.value).toBe('abc')
      expect(onUpdate).toHaveBeenLastCalledWith('abc', 'c')
    } finally {
      vi.useRealTimers()
    }
  })

  it('tracks submitted, streaming, ready, and error statuses', async () => {
    let finishStream: () => void = () => {}
    const streamFinished = new Promise<void>((resolve) => {
      finishStream = resolve
    })
    const provider = completionProvider({
      completion: async function* () {
        yield 'a'
        await streamFinished
      }
    })
    const { clearError, complete, error, status } = useCompletion({ provider })

    const pending = complete('track status')
    expect(status.value).toBe('submitted')

    await flushPromises()
    expect(status.value).toBe('streaming')

    finishStream()
    await pending
    expect(status.value).toBe('ready')

    error.value = new Error('stale')
    status.value = 'error'
    clearError()
    expect(error.value).toBeNull()
    expect(status.value).toBe('ready')
  })

  it('uses input value when prompt argument is omitted', async () => {
    const requests: Array<Record<string, unknown>> = []
    const provider = completionProvider({
      completion: async function* (request: Record<string, unknown>) {
        requests.push(request)
        yield 'from input'
      }
    })
    const { complete, input } = useCompletion({ provider })

    input.value = 'prompt from input'

    await expect(complete()).resolves.toBe('from input')

    expect(requests[0]?.prompt).toBe('prompt from input')
  })

  it('supports form input helpers for completion prompts', async () => {
    const preventDefault = vi.fn()
    const requests: Array<Record<string, unknown>> = []
    const provider = completionProvider({
      completion: async function* (request: Record<string, unknown>) {
        requests.push(request)
        yield 'submitted'
      }
    })
    const { handleInputChange, handleSubmit, input, setInput } = useCompletion({
      provider,
      initialInput: 'draft prompt'
    })

    expect(input.value).toBe('draft prompt')

    setInput('manual prompt')
    expect(input.value).toBe('manual prompt')

    handleInputChange({ target: { value: 'event prompt' } })
    expect(input.value).toBe('event prompt')

    await expect(
      handleSubmit({ preventDefault }, { model: 'form-model', temperature: 0.2 })
    ).resolves.toBe('submitted')

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(input.value).toBe('')
    expect(requests[0]).toMatchObject({
      prompt: 'event prompt',
      model: 'form-model',
      temperature: 0.2,
      stream: true
    })
  })

  it('keeps input when form submission fails', async () => {
    const provider = completionProvider({
      async completion() {
        throw new Error('submission failed')
      }
    })
    const { handleSubmit, input } = useCompletion({ provider, initialInput: 'keep this prompt' })

    await expect(handleSubmit()).rejects.toThrow('submission failed')
    expect(input.value).toBe('keep this prompt')
  })

  it('uses generated completion ids', () => {
    const generateId = vi.fn((prefix?: string) => `${prefix ?? 'id'}_fixed`)
    const { id } = useCompletion({
      provider: fakeProvider('unused'),
      generateId
    })

    expect(id.value).toBe('completion_fixed')
    expect(generateId).toHaveBeenCalledWith('completion')
  })

  it('shares state for matching completion ids', async () => {
    let releaseStream!: () => void
    const streamReleased = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const requests: Array<Record<string, unknown>> = []
    const provider = completionProvider({
      completion: async function* (request: Record<string, unknown>) {
        requests.push(request)
        await streamReleased
        yield 'shared output'
      }
    })
    const first = useCompletion({
      id: 'shared-completion-state',
      provider,
      initialInput: 'first prompt',
      initialCompletion: 'first draft'
    })
    const second = useCompletion({
      id: 'shared-completion-state',
      provider: fakeProvider('unused'),
      initialInput: 'ignored prompt',
      initialCompletion: 'ignored draft'
    })

    expect(second.id.value).toBe('shared-completion-state')
    expect(second.input.value).toBe('first prompt')
    expect(second.completion.value).toBe('first draft')

    first.setInput('shared prompt')
    expect(second.input.value).toBe('shared prompt')

    const pending = first.complete()

    expect(second.status.value).toBe('submitted')

    releaseStream()
    await expect(pending).resolves.toBe('shared output')

    expect(requests[0]?.prompt).toBe('shared prompt')
    expect(second.completion.value).toBe('shared output')

    second.clear()

    expect(first.completion.value).toBe('')
    expect(first.input.value).toBe('')
    expect(first.status.value).toBe('ready')
  })

  it('merges default request and call request while forcing streaming', async () => {
    const requests: Array<Record<string, unknown>> = []
    const provider = completionProvider({
      completion: async function* (request: Record<string, unknown>) {
        requests.push(request)
        yield 'ok'
      }
    })
    const { complete } = useCompletion({
      provider,
      defaultRequest: {
        model: 'default-model',
        temperature: 0.1,
        body: {
          cache_control: { type: 'ephemeral' },
          providerOption: 'default'
        }
      }
    })
    const requestOptions = {
      model: 'runtime-model',
      body: {
        providerOption: 'runtime'
      },
      stream: false,
      temperature: 0.2
    }

    await expect(complete('runtime prompt', requestOptions)).resolves.toBe('ok')

    expect(requests[0]).toMatchObject({
      model: 'runtime-model',
      prompt: 'runtime prompt',
      stream: true,
      body: {
        cache_control: { type: 'ephemeral' },
        providerOption: 'runtime'
      },
      temperature: 0.2
    })
    expect(requests[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('supports initial completion, manual updates, and clear()', () => {
    const { completion, input, error, clear, setCompletion } = useCompletion({
      provider: fakeProvider('unused'),
      initialCompletion: 'draft'
    })

    expect(completion.value).toBe('draft')

    setCompletion('manual update')
    input.value = 'draft prompt'
    error.value = new Error('visible error')

    expect(completion.value).toBe('manual update')

    clear()

    expect(completion.value).toBe('')
    expect(input.value).toBe('')
    expect(error.value).toBeNull()
  })

  it('calls onFinish with final completion after success', async () => {
    const onFinish = vi.fn()
    const { complete, isLoading, error } = useCompletion({
      provider: fakeProvider('finished'),
      onFinish
    })

    await expect(complete('finish it')).resolves.toBe('finished')

    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledWith('finished', {
      prompt: 'finish it',
      completion: 'finished',
      isAbort: false
    })
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('throws if no prompt is available', async () => {
    const { complete } = useCompletion({
      provider: fakeProvider('unused')
    })

    await expect(complete()).rejects.toThrow('complete() requires a prompt')
  })

  it('normalizes provider errors and calls onError', async () => {
    const onError = vi.fn()
    const provider = completionProvider({
      completion: () => ({
        [Symbol.asyncIterator]() {
          return {
            async next() {
              throw 'provider failed'
            }
          }
        }
      })
    })
    const { clearError, complete, error, status, isLoading } = useCompletion({
      provider,
      onError
    })

    await expect(complete('fail')).rejects.toThrow('provider failed')

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toBe('provider failed')
    expect(status.value).toBe('error')
    expect(onError).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith(error.value)
    expect(isLoading.value).toBe(false)

    clearError()
    expect(error.value).toBeNull()
    expect(status.value).toBe('ready')
  })

  it('retries completion streams that fail before the first delta', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const provider = completionProvider({
      completion: async function* () {
        calls += 1
        if (calls === 1) throw new Error('temporary completion failure')
        yield 'ok'
      }
    })
    const { complete, completion, error } = useCompletion({
      provider,
      maxRetries: 1,
      onRetry
    })

    await expect(complete('retry')).resolves.toBe('ok')

    expect(calls).toBe(2)
    expect(completion.value).toBe('ok')
    expect(error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('reports prepared completion request lifecycle attempts', async () => {
    let calls = 0
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const provider = {
      id: 'observable-completion',
      async completion(request: Record<string, unknown>) {
        calls += 1
        if (calls === 1) throw new Error('temporary completion setup failure')
        expect(request.prompt).toBe('trace completion')
        return (async function* () {
          yield 'traced'
        })()
      }
    } as unknown as CompletionProvider
    const { complete, lastRequest, lastResponse, clearTrace } = useCompletion({
      provider,
      maxRetries: 1,
      defaultRequest: {
        body: { tenantId: 'tenant_default' },
        headers: { 'X-Default': 'yes' }
      },
      onRequest,
      onResponse
    })

    await expect(
      complete('trace completion', {
        body: { route: '/complete' },
        headers: new Headers({ 'X-Trace': 'trace_1' }),
        temperature: 0.3
      })
    ).resolves.toBe('traced')

    expect(calls).toBe(2)
    expect(onRequest.mock.calls.map(([info]) => info.attempt)).toEqual([1, 2])
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        providerId: 'observable-completion',
        attempt: 1,
        prompt: 'trace completion',
        body: { tenantId: 'tenant_default', route: '/complete' },
        headers: { 'x-trace': 'trace_1' },
        request: expect.objectContaining({
          prompt: 'trace completion',
          temperature: 0.3,
          stream: true,
          body: { tenantId: 'tenant_default', route: '/complete' }
        })
      })
    )
    expect(onResponse).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'observable-completion',
        attempt: 2,
        prompt: 'trace completion',
        hasStream: true
      })
    )
    expect(lastRequest.value).toMatchObject({
      providerId: 'observable-completion',
      attempt: 2,
      prompt: 'trace completion',
      body: { tenantId: 'tenant_default', route: '/complete' }
    })
    expect(lastResponse.value).toMatchObject({
      providerId: 'observable-completion',
      attempt: 2,
      prompt: 'trace completion',
      hasStream: true
    })
    clearTrace()
    expect(lastRequest.value).toBeNull()
    expect(lastResponse.value).toBeNull()
  })

  it('does not retry completion streams after a delta was received', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const provider = completionProvider({
      completion: async function* () {
        calls += 1
        yield 'partial'
        throw new Error('completion stream failed')
      }
    })
    const { complete, completion, error } = useCompletion({
      provider,
      maxRetries: 2,
      onRetry
    })

    await expect(complete('partial failure')).rejects.toThrow('completion stream failed')

    expect(calls).toBe(1)
    expect(completion.value).toBe('partial')
    expect(error.value?.message).toBe('completion stream failed')
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('returns partial completion when the provider reports an abort', async () => {
    const onFinish = vi.fn()
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    const provider = completionProvider({
      completion: async function* () {
        yield 'partial'
        throw abortError
      }
    })
    const { complete, error, isLoading } = useCompletion({
      provider,
      onFinish
    })

    await expect(complete('abort')).resolves.toBe('partial')

    expect(error.value).toBeNull()
    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledWith('partial', {
      prompt: 'abort',
      completion: 'partial',
      isAbort: true
    })
    expect(isLoading.value).toBe(false)
  })

  it('stop() aborts the active request and clears loading state', async () => {
    let releaseStream!: () => void
    let signal: AbortSignal | undefined
    const provider = completionProvider({
      completion: async function* (request: Record<string, unknown>) {
        signal = request.signal as AbortSignal
        yield 'a'
        await new Promise<void>((resolve) => {
          releaseStream = resolve
        })
        yield 'b'
      }
    })
    const { complete, completion, isLoading, stop } = useCompletion({ provider })

    const pending = complete('stop it')
    await flushPromises()

    expect(completion.value).toBe('a')
    expect(isLoading.value).toBe(true)

    stop()
    releaseStream()

    await expect(pending).resolves.toBe('a')
    expect(signal?.aborted).toBe(true)
    expect(completion.value).toBe('a')
    expect(isLoading.value).toBe(false)
  })

  it('does not append chunks yielded after stop()', async () => {
    let releaseStream!: () => void
    const provider = completionProvider({
      completion: async function* () {
        yield 'a'
        await new Promise<void>((resolve) => {
          releaseStream = resolve
        })
        yield 'b'
      }
    })
    const { complete, completion, stop } = useCompletion({ provider })

    const pending = complete('stop before next chunk')
    await flushPromises()

    stop()
    releaseStream()

    await expect(pending).resolves.toBe('a')
    expect(completion.value).toBe('a')
  })
})
