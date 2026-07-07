import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { cosineSimilarity, useEmbedding } from '../src/react'
import type { ChatProvider } from '../src/providers/types'
import type { ChatChunk, EmbeddingRequest, EmbeddingResult } from '../src/types'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function embeddingProvider(
  result: EmbeddingResult,
  requests: EmbeddingRequest[] = [],
  id = 'react-embedding-fake'
): ChatProvider {
  return {
    id,
    async chat(): Promise<AsyncIterable<ChatChunk>> {
      return (async function* () {})()
    },
    async completion(): Promise<AsyncIterable<string>> {
      return (async function* () {})()
    },
    async embedding(request) {
      requests.push(request)
      return result
    }
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('react useEmbedding', () => {
  it('exports cosine similarity from the React entry', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it('embeds input with React state and lifecycle callbacks', async () => {
    const requests: EmbeddingRequest[] = []
    const embeddingResult = {
      embeddings: [[0.1, 0.2, 0.3]],
      model: 'fake-embedding',
      usage: { promptTokens: 2, totalTokens: 2 }
    }
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useEmbedding({
        provider: embeddingProvider(embeddingResult, requests),
        defaultRequest: {
          model: 'default-model',
          body: { encodingFormat: 'float' }
        },
        onRequest,
        onResponse,
        onSuccess,
        onError
      })
    )

    await act(async () => {
      await expect(
        result.current.embed(['alpha', 'beta'], {
          model: 'runtime-model',
          body: { tenantId: 'tenant_1' }
        })
      ).resolves.toEqual(embeddingResult)
    })

    expect(result.current.embeddings).toEqual(embeddingResult.embeddings)
    expect(result.current.result).toEqual(embeddingResult)
    expect(result.current.status).toBe('ready')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(requests[0]).toMatchObject({
      input: ['alpha', 'beta'],
      model: 'runtime-model',
      body: { encodingFormat: 'float', tenantId: 'tenant_1' }
    })
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'react-embedding-fake', input: ['alpha', 'beta'] })
    )
    expect(onResponse).toHaveBeenCalledWith(expect.objectContaining({ result: embeddingResult }))
    expect(onSuccess).toHaveBeenCalledWith(embeddingResult)
    expect(onError).not.toHaveBeenCalled()
  })

  it('uses proxy transport when provider is omitted', async () => {
    const embeddingResult = {
      embeddings: [[0.4, 0.5]],
      model: 'proxy-embedding',
      usage: { promptTokens: 3, totalTokens: 3 }
    }
    const fetcher = vi.fn(async () => jsonResponse(embeddingResult))
    const { result } = renderHook(() =>
      useEmbedding({
        api: '/api/react-embedding',
        body: { tenantId: 'tenant_1' },
        headers: { 'X-Session': 'session_1' },
        credentials: 'include',
        fetch: fetcher as unknown as typeof fetch
      })
    )

    await act(async () => {
      await expect(
        result.current.embed('semantic search', {
          model: 'text-embedding-3-small',
          body: { traceId: 'trace_1' },
          headers: { 'X-Request': 'request_1' }
        })
      ).resolves.toEqual(embeddingResult)
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/react-embedding')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({
      'X-Session': 'session_1',
      'X-Request': 'request_1'
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      traceId: 'trace_1',
      input: 'semantic search',
      model: 'text-embedding-3-small'
    })
    expect(result.current.lastRequest).toMatchObject({
      providerId: 'proxy',
      input: 'semantic search'
    })
    expect(result.current.lastResponse).toMatchObject({ result: embeddingResult })
  })

  it('supports controlled input helpers and clears input after submit', async () => {
    const requests: EmbeddingRequest[] = []
    const { result } = renderHook(() =>
      useEmbedding({
        provider: embeddingProvider(
          {
            embeddings: [[0.7, 0.8]],
            model: 'form-model',
            usage: { promptTokens: 2, totalTokens: 2 }
          },
          requests
        ),
        initialInput: 'draft query'
      })
    )
    const preventDefault = vi.fn()

    expect(result.current.input).toBe('draft query')
    act(() => {
      result.current.setInput('manual query')
      result.current.handleInputChange({ target: { value: 'event query' } })
    })

    await act(async () => {
      await expect(
        result.current.handleSubmit({ preventDefault }, { model: 'form-embedding' })
      ).resolves.toMatchObject({ model: 'form-model' })
    })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(result.current.input).toBe('')
    expect(requests[0]).toMatchObject({ input: 'event query', model: 'form-embedding' })
  })

  it('keeps input when submit fails and supports clear helpers', async () => {
    const provider: ChatProvider = {
      ...embeddingProvider({
        embeddings: [],
        model: 'fake',
        usage: { promptTokens: 0, totalTokens: 0 }
      }),
      async embedding() {
        throw new Error('embedding failed')
      }
    }
    const { result } = renderHook(() => useEmbedding({ provider, initialInput: 'keep query' }))
    let thrown: unknown

    await act(async () => {
      try {
        await result.current.handleSubmit()
      } catch (error) {
        thrown = error
      }
    })

    expect(thrown).toMatchObject({ message: 'embedding failed' })
    await waitFor(() => {
      expect(result.current.error?.message).toBe('embedding failed')
      expect(result.current.status).toBe('error')
    })
    expect(result.current.input).toBe('keep query')

    act(() => {
      result.current.clearError()
      result.current.clearTrace()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.lastRequest).toBeNull()

    act(() => {
      result.current.clear()
    })
    expect(result.current.embeddings).toEqual([])
    expect(result.current.input).toBe('')
    expect(result.current.result).toBeNull()
    expect(result.current.status).toBe('ready')
  })

  it('retries transient embedding failures and records retry metadata', async () => {
    const requests: EmbeddingRequest[] = []
    let calls = 0
    const provider: ChatProvider = {
      ...embeddingProvider({
        embeddings: [],
        model: 'fake',
        usage: { promptTokens: 0, totalTokens: 0 }
      }),
      async embedding(request) {
        requests.push(request)
        calls += 1
        if (calls === 1) throw new Error('temporary failure')
        return {
          embeddings: [[0.9, 1]],
          model: 'retry-model',
          usage: { promptTokens: 1, totalTokens: 1 }
        }
      }
    }
    const { result } = renderHook(() => useEmbedding({ provider, maxRetries: 1, retryDelayMs: 0 }))

    await act(async () => {
      await expect(result.current.embed('retry query')).resolves.toMatchObject({
        model: 'retry-model'
      })
    })

    expect(calls).toBe(2)
    expect(requests).toHaveLength(2)
    expect(result.current.inspect().retries).toHaveLength(1)
  })
})
