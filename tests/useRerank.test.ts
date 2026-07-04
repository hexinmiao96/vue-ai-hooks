import { describe, expect, it, vi } from 'vitest'
import { useRerank } from '../src/composables/useRerank'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
}

describe('useRerank', () => {
  it('posts rerank requests to the app-owned proxy and normalizes ranking results', async () => {
    const response = {
      ranking: [
        { index: 1, score: 0.92 },
        { index: 0, score: 0.51 }
      ],
      model: 'rerank-model',
      providerMetadata: { provider: 'test' }
    }
    const fetcher = vi.fn(async () => jsonResponse(response))
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const docs = ['Vue streaming state', 'Rerank search results']
    const reranker = useRerank<string>({
      api: '/api/rerank',
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

    expect(reranker.rerank).toBe(reranker.rerankDocuments)
    await expect(
      reranker.rerankDocuments('search ranking', docs, {
        model: 'rerank-model',
        topN: 2,
        body: { route: 'runtime' },
        headers: { 'X-Request': 'request_1' }
      })
    ).resolves.toMatchObject({
      rerankedDocuments: ['Rerank search results', 'Vue streaming state'],
      ranking: [
        { index: 1, score: 0.92, document: 'Rerank search results' },
        { index: 0, score: 0.51, document: 'Vue streaming state' }
      ],
      model: 'rerank-model'
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://app.example.test/api/rerank')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Session': 'session_1',
      'X-Request': 'request_1'
    })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      route: 'runtime',
      query: 'search ranking',
      documents: docs,
      model: 'rerank-model',
      topN: 2
    })
    expect(reranker.originalDocuments.value).toEqual(docs)
    expect(reranker.rerankedDocuments.value).toEqual([
      'Rerank search results',
      'Vue streaming state'
    ])
    expect(reranker.ranking.value[0]).toMatchObject({
      index: 1,
      score: 0.92,
      document: 'Rerank search results'
    })
    expect(reranker.result.value?.model).toBe('rerank-model')
    expect(reranker.lastRequest.value).toMatchObject({
      api: '/api/rerank',
      credentials: 'include',
      query: 'search ranking',
      documents: docs,
      body: expect.objectContaining({ query: 'search ranking', documents: docs })
    })
    expect(reranker.lastResponse.value).toMatchObject({
      result: { rerankedDocuments: ['Rerank search results', 'Vue streaming state'] }
    })
    expect(onRequest).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledOnce()
  })

  it('accepts rerankedDocuments responses and object documents', async () => {
    type Doc = { id: string; text: string }
    const docs: Doc[] = [
      { id: 'a', text: 'Vue chat composables' },
      { id: 'b', text: 'Document reranking' }
    ]
    const fetcher = vi.fn(async () =>
      jsonResponse({
        rerankedDocuments: [docs[1], docs[0]]
      })
    )
    const reranker = useRerank<Doc>({
      initialDocuments: docs,
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(reranker.rerank('rank docs')).resolves.toMatchObject({
      originalDocuments: docs,
      rerankedDocuments: [docs[1], docs[0]]
    })

    expect(reranker.ranking.value).toEqual([
      { index: 1, score: 1, document: docs[1] },
      { index: 0, score: 0.5, document: docs[0] }
    ])
  })

  it('manages rerank form query and documents, clearing only query after submit success', async () => {
    const preventDefault = vi.fn()
    const fetcher = vi.fn(async () =>
      jsonResponse({
        ranking: [{ index: 0, relevanceScore: 0.8 }]
      })
    )
    const reranker = useRerank<string>({
      initialInput: 'seed query',
      initialDocuments: ['seed document'],
      fetch: fetcher as unknown as typeof fetch
    })

    expect(reranker.query.value).toBe('seed query')
    reranker.setQuery('manual query')
    reranker.handleInputChange({ target: { value: 42 } })
    expect(reranker.input.value).toBe('42')
    reranker.handleInputChange('form query')
    reranker.setDocuments(['doc one', 'doc two'])

    await reranker.handleSubmit({ preventDefault }, { topN: 1 })

    expect(preventDefault).toHaveBeenCalledOnce()
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toMatchObject({
      query: 'form query',
      documents: ['doc one', 'doc two'],
      topN: 1
    })
    expect(reranker.input.value).toBe('')
    expect(reranker.documents.value).toEqual(['doc one', 'doc two'])
  })

  it('supports dynamic headers/body, clearError(), clear(), and validation', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ rerankedDocuments: ['dynamic doc'] }))
    const reranker = useRerank<string>({
      initialInput: 'dynamic query',
      initialDocuments: ['dynamic doc'],
      headers: () => new Headers({ 'X-Dynamic': 'yes' }),
      body: ({ request }) => ({ tenantId: 'tenant_1', requestQuery: request.query }),
      fetch: fetcher as unknown as typeof fetch
    })

    reranker.handleInputChange({ target: {} })
    await expect(reranker.rerankDocuments()).rejects.toThrow('requires a query')
    reranker.setInput('dynamic query')
    reranker.setDocuments([])
    await expect(reranker.rerankDocuments()).rejects.toThrow('requires at least one document')

    reranker.setDocuments(['dynamic doc'])
    await reranker.rerankDocuments()

    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.headers).toMatchObject({ 'x-dynamic': 'yes' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      requestQuery: 'dynamic query',
      query: 'dynamic query',
      documents: ['dynamic doc']
    })
    expect(reranker.rerankedDocuments.value).toEqual(['dynamic doc'])

    reranker.error.value = new Error('manual')
    reranker.status.value = 'error'
    reranker.clearError()
    expect(reranker.error.value).toBeNull()
    expect(reranker.status.value).toBe('ready')

    reranker.clear()
    expect(reranker.input.value).toBe('')
    expect(reranker.documents.value).toEqual([])
    expect(reranker.ranking.value).toEqual([])
    expect(reranker.result.value).toBeNull()
    expect(reranker.lastRequest.value).toBeNull()
  })

  it('keeps form state after submit errors', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ message: 'failed' }, { status: 500 }))
    const reranker = useRerank<string>({
      initialInput: 'retry query',
      initialDocuments: ['retry doc'],
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(reranker.handleSubmit()).rejects.toThrow('Request failed with status 500')

    expect(reranker.input.value).toBe('retry query')
    expect(reranker.documents.value).toEqual(['retry doc'])
    expect(reranker.error.value?.message).toContain('Request failed with status 500')
    expect(reranker.status.value).toBe('error')
  })

  it('retries transient rerank errors before committing a result', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) return jsonResponse({ message: 'busy' }, { status: 503 })
      return jsonResponse({
        ranking: [{ index: 0, score: 0.7 }]
      })
    })
    const reranker = useRerank<string>({
      fetch: fetcher as unknown as typeof fetch,
      maxRetries: 1,
      onRetry
    })

    await expect(reranker.rerank('retry query', ['retry doc'])).resolves.toMatchObject({
      rerankedDocuments: ['retry doc']
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(reranker.rerankedDocuments.value).toEqual(['retry doc'])
    expect(reranker.error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledOnce()
    expect(reranker.inspect().retries).toHaveLength(1)
    expect(reranker.inspect().timeline).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'retry' })])
    )
  })

  it('stop() aborts an in-flight rerank request without storing an error', async () => {
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
    const reranker = useRerank<string>({
      fetch: fetcher as unknown as typeof fetch
    })

    const pending = reranker.rerank('abort query', ['abort doc']).catch((err: unknown) => err)
    await requestStarted

    expect(reranker.status.value).toBe('submitted')
    expect(reranker.isLoading.value).toBe(true)

    reranker.stop()

    expect(capturedSignal?.aborted).toBe(true)
    await expect(pending).resolves.toMatchObject({ name: 'AiHooksError' })
    expect(reranker.status.value).toBe('ready')
    expect(reranker.isLoading.value).toBe(false)
    expect(reranker.error.value).toBeNull()
    expect(reranker.rerankedDocuments.value).toEqual([])
  })

  it('does not commit a late rerank result after stop()', async () => {
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
              resolve(jsonResponse({ rerankedDocuments: ['late doc'] }))
            },
            { once: true }
          )
        })
    )
    const reranker = useRerank<string>({
      fetch: fetcher as unknown as typeof fetch
    })

    const pending = reranker.rerank('late query', ['late doc']).catch((err: unknown) => err)
    await requestStarted
    reranker.stop()

    await expect(pending).resolves.toMatchObject({ name: 'AbortError' })
    expect(reranker.rerankedDocuments.value).toEqual([])
    expect(reranker.result.value).toBeNull()
    expect(reranker.error.value).toBeNull()
    expect(reranker.status.value).toBe('ready')
  })

  it('captures inspect() snapshot metadata for proxy rerank requests', async () => {
    const response = {
      ranking: [
        { index: 1, score: 0.98 },
        { index: 0, score: 0.52 }
      ]
    }
    const fetcher = vi.fn(async () => jsonResponse(response))
    const reranker = useRerank<string>({
      api: '/api/rerank',
      headers: { 'X-Session': 'session_1' },
      body: { tenantId: 'tenant_1' },
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(reranker.rerank('inspect query', ['doc a', 'doc b'])).resolves.toMatchObject({
      originalDocuments: ['doc a', 'doc b'],
      rerankedDocuments: ['doc b', 'doc a']
    })

    const snapshot = reranker.inspect()
    expect(snapshot.hasRequest).toBe(true)
    expect(snapshot.hasResponse).toBe(true)
    expect(snapshot.providerTrace.providerId).toBe('proxy')
    expect(snapshot.providerTrace.api).toBe('/api/rerank')
    expect(snapshot.request).toMatchObject({
      providerId: 'proxy',
      attempt: 1,
      query: 'inspect query',
      documents: ['doc a', 'doc b']
    })
    expect(snapshot.response).toMatchObject({
      providerId: 'proxy',
      result: {
        originalDocuments: ['doc a', 'doc b'],
        rerankedDocuments: ['doc b', 'doc a']
      }
    })
    expect(snapshot.timeline.map((event) => event.kind)).toEqual(
      expect.arrayContaining(['request', 'response'])
    )
    expect(snapshot.curl).toContain('/api/rerank')

    reranker.clearTrace()
    const cleared = reranker.inspect()
    expect(cleared.hasRequest).toBe(false)
    expect(cleared.hasResponse).toBe(false)
  })
})
