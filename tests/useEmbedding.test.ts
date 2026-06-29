import { describe, it, expect, vi } from 'vitest'
import { useEmbedding } from '../src/composables/useEmbedding'
import type { ChatProvider } from '../src/providers/types'
import { AiHooksError, type ChatChunk, type EmbeddingRequest } from '../src/types'

function fakeProvider(vectors: number[][]): ChatProvider {
  return {
    id: 'fake',
    async chat(): Promise<AsyncIterable<ChatChunk>> {
      return (async function* () {
        yield {}
      })()
    },
    async completion(): Promise<AsyncIterable<string>> {
      return (async function* () {
        yield ''
      })()
    },
    async embedding() {
      return {
        embeddings: vectors,
        model: 'fake-embed',
        usage: { promptTokens: 1, totalTokens: 1 }
      }
    }
  }
}

function fakeEmbeddingProvider(embedding: ChatProvider['embedding']): ChatProvider {
  return {
    id: 'fake-embedding',
    async chat(): Promise<AsyncIterable<ChatChunk>> {
      return (async function* () {
        yield {}
      })()
    },
    async completion(): Promise<AsyncIterable<string>> {
      return (async function* () {
        yield ''
      })()
    },
    embedding
  }
}

describe('useEmbedding', () => {
  it('uses a proxy transport when provider is omitted', async () => {
    const response = {
      embeddings: [[0.1, 0.2]],
      model: 'proxy-embedding',
      usage: { promptTokens: 2, totalTokens: 2 }
    }
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' }
        })
    )
    const { embed, embeddings, result } = useEmbedding({
      api: '/api/embedding',
      headers: { 'X-Session': 'session_1' },
      body: { tenantId: 'tenant_1' },
      credentials: 'include',
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(
      embed('hello proxy', {
        model: 'text-embedding-3-small',
        body: { traceId: 'trace_1' },
        headers: { 'X-Request': 'request_1' }
      })
    ).resolves.toEqual(response)

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/embedding')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({
      'X-Session': 'session_1',
      'X-Request': 'request_1'
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      traceId: 'trace_1',
      input: 'hello proxy',
      model: 'text-embedding-3-small'
    })
    expect(embeddings.value).toEqual(response.embeddings)
    expect(result.value).toEqual(response)
  })

  it('returns embeddings for the given input', async () => {
    const vec = [0.1, 0.2, 0.3]
    const { embed, embeddings, result } = useEmbedding({ provider: fakeProvider([vec]) })
    const res = await embed('hello')
    expect(res.embeddings).toEqual([vec])
    expect(embeddings.value).toEqual([vec])
    expect(result.value?.model).toBe('fake-embed')
  })

  it('handles batch input', async () => {
    const { embed, embeddings } = useEmbedding({
      provider: fakeProvider([
        [0.1, 0.2],
        [0.3, 0.4]
      ])
    })
    await embed(['a', 'b'])
    expect(embeddings.value).toHaveLength(2)
  })

  it('merges request defaults and calls onSuccess with the final result', async () => {
    const requests: EmbeddingRequest[] = []
    const onSuccess = vi.fn()
    const provider = fakeEmbeddingProvider(async (request) => {
      requests.push(request)
      return {
        embeddings: [[0.5, 0.6]],
        model: 'runtime-model',
        usage: { promptTokens: 2, totalTokens: 2 }
      }
    })
    const { embed, result, status, error, isLoading } = useEmbedding({
      provider,
      defaultRequest: {
        model: 'default-model',
        body: { encoding_format: 'float', providerOption: 'default' }
      },
      onSuccess
    })
    const requestOptions = {
      input: 'ignored input',
      model: 'runtime-model',
      body: { providerOption: 'runtime' }
    }

    const res = await embed(['a', 'b'], requestOptions)

    expect(requests[0]).toMatchObject({
      input: ['a', 'b'],
      model: 'runtime-model',
      body: { encoding_format: 'float', providerOption: 'runtime' }
    })
    expect(requests[0]?.signal).toBeInstanceOf(AbortSignal)
    expect(result.value).toBe(res)
    expect(status.value).toBe('ready')
    expect(error.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(onSuccess).toHaveBeenCalledWith(res)
  })

  it('normalizes embedding errors and calls onError', async () => {
    const onError = vi.fn()
    const provider = fakeEmbeddingProvider(async () => {
      throw 'embedding failed'
    })
    const { clearError, embed, error, status, isLoading } = useEmbedding({ provider, onError })

    await expect(embed('bad input')).rejects.toThrow('embedding failed')

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toBe('embedding failed')
    expect(status.value).toBe('error')
    expect(onError).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith(error.value)
    expect(isLoading.value).toBe(false)

    clearError()
    expect(error.value).toBeNull()
    expect(status.value).toBe('ready')
  })

  it('tracks submitted and ready statuses for embedding requests', async () => {
    let resolveRequest: (value: Awaited<ReturnType<ChatProvider['embedding']>>) => void = () => {}
    const requestPending = new Promise<Awaited<ReturnType<ChatProvider['embedding']>>>(
      (resolve) => {
        resolveRequest = resolve
      }
    )
    const provider = fakeEmbeddingProvider(async () => requestPending)
    const { embed, status } = useEmbedding({ provider })

    const pending = embed('status')
    expect(status.value).toBe('submitted')

    resolveRequest({
      embeddings: [[0.1]],
      model: 'status-model',
      usage: { promptTokens: 1, totalTokens: 1 }
    })

    await pending
    expect(status.value).toBe('ready')
  })

  it('retries embedding requests before surfacing transient errors', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const provider = fakeEmbeddingProvider(async () => {
      calls += 1
      if (calls === 1) throw new Error('temporary embedding failure')
      return {
        embeddings: [[0.4, 0.5]],
        model: 'retry-model',
        usage: { promptTokens: 2, totalTokens: 2 }
      }
    })
    const { embed, embeddings, error } = useEmbedding({
      provider,
      maxRetries: 1,
      onRetry
    })

    const result = await embed('retry')

    expect(calls).toBe(2)
    expect(result.model).toBe('retry-model')
    expect(embeddings.value).toEqual([[0.4, 0.5]])
    expect(error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('reports embedding request lifecycle attempts and final result', async () => {
    let calls = 0
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const provider = fakeEmbeddingProvider(async () => {
      calls += 1
      if (calls === 1) throw new Error('temporary embedding setup failure')
      return {
        embeddings: [[0.7, 0.8]],
        model: 'observable-embedding',
        usage: { promptTokens: 3, totalTokens: 3 }
      }
    })
    const { embed } = useEmbedding({
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
      embed(['trace one', 'trace two'], {
        body: { route: '/embed' },
        headers: { 'X-Trace': 'trace_1' },
        model: 'embedding-model'
      })
    ).resolves.toMatchObject({ model: 'observable-embedding' })

    expect(calls).toBe(2)
    expect(onRequest.mock.calls.map(([info]) => info.attempt)).toEqual([1, 2])
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'fake-embedding',
        attempt: 1,
        input: ['trace one', 'trace two'],
        body: { tenantId: 'tenant_default', route: '/embed' },
        headers: { 'X-Trace': 'trace_1' },
        request: expect.objectContaining({
          input: ['trace one', 'trace two'],
          model: 'embedding-model',
          body: { tenantId: 'tenant_default', route: '/embed' }
        })
      })
    )
    expect(onResponse).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'fake-embedding',
        attempt: 2,
        input: ['trace one', 'trace two'],
        result: {
          embeddings: [[0.7, 0.8]],
          model: 'observable-embedding',
          usage: { promptTokens: 3, totalTokens: 3 }
        }
      })
    )
  })

  it('does not retry non-retryable embedding status errors by default', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const provider = fakeEmbeddingProvider(async () => {
      calls += 1
      throw new AiHooksError('bad request', { status: 400 })
    })
    const { embed, error } = useEmbedding({
      provider,
      maxRetries: 2,
      onRetry
    })

    await expect(embed('bad')).rejects.toThrow('bad request')

    expect(calls).toBe(1)
    expect(error.value?.message).toBe('bad request')
    expect(onRetry).not.toHaveBeenCalled()
  })

  it('stop() aborts the in-flight request and clears loading state', async () => {
    let capturedSignal: AbortSignal | undefined
    let resolveRequestStarted: () => void = () => {}
    const requestStarted = new Promise<void>((resolve) => {
      resolveRequestStarted = resolve
    })
    const provider: ChatProvider = {
      id: 'abortable',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield {}
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return (async function* () {
          yield ''
        })()
      },
      async embedding(request) {
        capturedSignal = request.signal
        resolveRequestStarted()
        return await new Promise<never>((_, reject) => {
          request.signal?.addEventListener(
            'abort',
            () => {
              const error = new Error('aborted')
              error.name = 'AbortError'
              reject(error)
            },
            { once: true }
          )
        })
      }
    }
    const onError = vi.fn()
    const { embed, stop, status, isLoading, abortController, error } = useEmbedding({
      provider,
      onError
    })

    const result = embed('hello').catch((err: unknown) => err)
    await requestStarted

    expect(isLoading.value).toBe(true)
    expect(status.value).toBe('submitted')
    expect(abortController.value).not.toBeNull()

    stop()

    expect(capturedSignal?.aborted).toBe(true)
    expect(status.value).toBe('ready')
    expect(isLoading.value).toBe(false)
    await expect(result).resolves.toMatchObject({ name: 'AbortError' })
    expect(error.value).toBeNull()
    expect(onError).not.toHaveBeenCalled()
  })

  it('does not commit results resolved after stop()', async () => {
    let resolveRequestStarted: () => void = () => {}
    const requestStarted = new Promise<void>((resolve) => {
      resolveRequestStarted = resolve
    })
    const provider: ChatProvider = {
      id: 'abort-ignored',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield {}
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return (async function* () {
          yield ''
        })()
      },
      async embedding(request) {
        resolveRequestStarted()
        await new Promise<void>((resolve) => {
          request.signal?.addEventListener('abort', () => resolve(), { once: true })
        })
        return {
          embeddings: [[0.9, 0.8]],
          model: 'late',
          usage: { promptTokens: 1, totalTokens: 1 }
        }
      }
    }
    const onSuccess = vi.fn()
    const { embed, stop, embeddings, result, error } = useEmbedding({ provider, onSuccess })

    const aborted = embed('hello').catch((err: unknown) => err)
    await requestStarted
    stop()

    await expect(aborted).resolves.toMatchObject({ name: 'AbortError' })
    expect(embeddings.value).toEqual([])
    expect(result.value).toBeNull()
    expect(error.value).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('clear() resets state and aborts the in-flight request', async () => {
    let callCount = 0
    let capturedSignal: AbortSignal | undefined
    let resolveRequestStarted: () => void = () => {}
    const requestStarted = new Promise<void>((resolve) => {
      resolveRequestStarted = resolve
    })
    const provider: ChatProvider = {
      id: 'clearable',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield {}
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return (async function* () {
          yield ''
        })()
      },
      async embedding(request) {
        callCount += 1
        if (callCount === 1) {
          return {
            embeddings: [[0.1, 0.2]],
            model: 'seed',
            usage: { promptTokens: 1, totalTokens: 1 }
          }
        }

        capturedSignal = request.signal
        resolveRequestStarted()
        return await new Promise<never>((_, reject) => {
          request.signal?.addEventListener(
            'abort',
            () => {
              const error = new Error('aborted')
              error.name = 'AbortError'
              reject(error)
            },
            { once: true }
          )
        })
      }
    }

    const { embed, clear, embeddings, result, error, isLoading } = useEmbedding({ provider })

    await embed('seed')
    expect(embeddings.value).toEqual([[0.1, 0.2]])
    expect(result.value?.model).toBe('seed')

    const pending = embed('pending').catch((err: unknown) => err)
    await requestStarted

    clear()

    expect(capturedSignal?.aborted).toBe(true)
    expect(isLoading.value).toBe(false)
    expect(embeddings.value).toEqual([])
    expect(result.value).toBeNull()
    expect(error.value).toBeNull()
    await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
  })
})
