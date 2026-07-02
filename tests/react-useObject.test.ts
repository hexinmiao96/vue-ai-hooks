import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useObject } from '../src/react'
import type { ChatProvider } from '../src/providers/types'
import type { ChatChunk, ChatRequest } from '../src/types'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

interface TaskSummary {
  title: string
  priority: 'low' | 'high'
}

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'high'] }
  },
  required: ['title', 'priority'],
  additionalProperties: false
}

function objectProvider(
  chunks: ChatChunk[],
  requests: ChatRequest[] = [],
  id = 'react-object-fake'
): ChatProvider {
  return {
    id,
    async chat(request): Promise<AsyncIterable<ChatChunk>> {
      requests.push(request)
      return (async function* () {
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    },
    async completion() {
      return (async function* () {})()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

function textResponse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    }
  })
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}

describe('react useObject', () => {
  it('streams JSON text, parses the final object, and reports lifecycle callbacks', async () => {
    const requests: ChatRequest[] = []
    const onChunk = vi.fn()
    const onPartial = vi.fn()
    const onFinish = vi.fn()
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const { result } = renderHook(() =>
      useObject<TaskSummary>({
        provider: objectProvider(
          [{ content: '{"title":"Ship"' }, { content: ',"priority":"high"}' }],
          requests
        ),
        schema,
        schemaName: 'task_summary',
        schemaDescription: 'A normalized task summary.',
        defaultRequest: {
          model: 'structured-model',
          body: { tenantId: 'tenant_default', providerOption: 'default' },
          messages: [{ id: 's1', role: 'system', content: 'Return JSON only.' }]
        },
        onChunk,
        onPartial,
        onFinish,
        onRequest,
        onResponse
      })
    )

    await act(async () => {
      await expect(
        result.current.submit('Summarize this task.', {
          body: { providerOption: 'runtime' },
          metadata: { traceId: 'trace_1' }
        })
      ).resolves.toEqual({ title: 'Ship', priority: 'high' })
    })

    expect(result.current.object).toEqual({ title: 'Ship', priority: 'high' })
    expect(result.current.partialObject).toEqual({ title: 'Ship', priority: 'high' })
    expect(result.current.text).toBe('{"title":"Ship","priority":"high"}')
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
    expect(onChunk).toHaveBeenNthCalledWith(1, { content: '{"title":"Ship"' }, '{"title":"Ship"')
    expect(onPartial).toHaveBeenCalledWith({ title: 'Ship' }, '{"title":"Ship"')
    expect(onFinish).toHaveBeenCalledWith(
      { title: 'Ship', priority: 'high' },
      {
        object: { title: 'Ship', priority: 'high' },
        text: '{"title":"Ship","priority":"high"}',
        isAbort: false,
        error: undefined
      }
    )
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'react-object-fake' })
    )
    expect(onResponse).toHaveBeenCalledWith(expect.objectContaining({ hasStream: true }))
    expect(result.current.lastRequest).toMatchObject({
      providerId: 'react-object-fake',
      requestMetadata: { traceId: 'trace_1' },
      body: { tenantId: 'tenant_default', providerOption: 'runtime' },
      messages: [
        expect.objectContaining({ role: 'system', content: 'Return JSON only.' }),
        expect.objectContaining({ role: 'user', content: 'Summarize this task.' })
      ]
    })
    expect(requests[0]).toMatchObject({
      model: 'structured-model',
      stream: true,
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'task_summary',
          description: 'A normalized task summary.',
          schema,
          strict: true
        }
      }
    })
  })

  it('uses proxy transport when provider is omitted', async () => {
    const fetcher = vi.fn(async () => textResponse(['{"title":"Proxy"', ',"priority":"high"}']))
    const { result } = renderHook(() =>
      useObject<TaskSummary>({
        api: '/api/react-object',
        schema,
        schemaName: 'task_summary',
        body: { tenantId: 'tenant_1' },
        headers: { 'X-Session': 'session_1' },
        credentials: 'include',
        fetch: fetcher as unknown as typeof fetch
      })
    )

    await act(async () => {
      await expect(result.current.submit('Extract a task.')).resolves.toEqual({
        title: 'Proxy',
        priority: 'high'
      })
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/react-object')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      messages: [{ role: 'user', content: 'Extract a task.' }],
      responseFormat: {
        type: 'json_schema',
        json_schema: { name: 'task_summary', schema, strict: true }
      },
      stream: true
    })
    expect(result.current.lastRequest).toMatchObject({
      providerId: 'proxy',
      api: '/api/react-object',
      credentials: 'include'
    })
    expect(result.current.lastResponse).toMatchObject({ hasStream: true })
  })

  it('updates partial object state before final JSON is complete', async () => {
    let releaseSecondChunk: () => void = () => {}
    let resolveFirstChunkSeen: () => void = () => {}
    const firstChunkSeen = new Promise<void>((resolve) => {
      resolveFirstChunkSeen = resolve
    })
    const secondChunkRelease = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve
    })
    const provider: ChatProvider = {
      ...objectProvider([]),
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield { content: '{"title":"Ship","priority":' }
          resolveFirstChunkSeen()
          await secondChunkRelease
          yield { content: '"high"}' }
        })()
      }
    }
    const { result } = renderHook(() => useObject<TaskSummary>({ provider, schema }))
    let pending!: Promise<TaskSummary>

    await act(async () => {
      pending = result.current.submit('Summarize.')
      await firstChunkSeen
    })

    await waitFor(() => {
      expect(result.current.text).toBe('{"title":"Ship","priority":')
      expect(result.current.partialObject).toEqual({ title: 'Ship' })
      expect(result.current.object).toBeNull()
      expect(result.current.status).toBe('streaming')
    })

    await act(async () => {
      releaseSecondChunk()
      await expect(pending).resolves.toEqual({ title: 'Ship', priority: 'high' })
    })
    expect(result.current.object).toEqual({ title: 'Ship', priority: 'high' })
  })

  it('supports controlled input helpers and clears input only after success', async () => {
    const requests: ChatRequest[] = []
    const { result } = renderHook(() =>
      useObject<TaskSummary>({
        provider: objectProvider([{ content: '{"title":"Form","priority":"low"}' }], requests),
        schema,
        initialObject: { title: 'Initial', priority: 'low' },
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
        result.current.handleSubmit({ preventDefault }, { temperature: 0.2 })
      ).resolves.toEqual({
        title: 'Form',
        priority: 'low'
      })
    })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(result.current.input).toBe('')
    expect(requests[0]).toMatchObject({
      temperature: 0.2,
      messages: [expect.objectContaining({ content: 'event prompt' })]
    })

    act(() => {
      result.current.setObject({ title: 'Manual', priority: 'high' })
      result.current.setPartialObject({ title: 'Partial' })
      result.current.clear()
    })
    expect(result.current.object).toEqual({ title: 'Initial', priority: 'low' })
    expect(result.current.partialObject).toEqual({ title: 'Initial', priority: 'low' })
    expect(result.current.text).toBe('')
    expect(result.current.input).toBe('')
  })

  it('accepts message prompts, explicit request messages, and initial partial values', async () => {
    const messageRequests: ChatRequest[] = []
    const generateId = vi.fn((prefix = 'id') => `${prefix}_${messageRequests.length}`)
    const first = renderHook(() =>
      useObject<TaskSummary>({
        provider: objectProvider(
          [{ content: '{"title":"Message","priority":"high"}' }],
          messageRequests
        ),
        schema,
        initialValue: { title: 'Draft' },
        strict: false,
        generateId
      })
    )

    expect(first.result.current.partialObject).toEqual({ title: 'Draft' })
    act(() => {
      first.result.current.handleInputChange('from string event')
      first.result.current.handleInputChange({})
    })
    expect(first.result.current.input).toBe('')

    await act(async () => {
      await expect(
        first.result.current.submit({ id: '', role: 'user', content: 'Use message prompt.' })
      ).resolves.toEqual({ title: 'Message', priority: 'high' })
    })

    expect(messageRequests[0].messages[0]).toMatchObject({
      id: 'user_0',
      role: 'user',
      content: 'Use message prompt.'
    })
    expect(messageRequests[0].responseFormat).toMatchObject({
      type: 'json_schema',
      json_schema: { strict: false }
    })

    const explicitRequests: ChatRequest[] = []
    const second = renderHook(() =>
      useObject<TaskSummary>({
        provider: objectProvider(
          [{ content: '{"title":"Explicit","priority":"low"}' }],
          explicitRequests
        ),
        schema
      })
    )

    await act(async () => {
      await expect(
        second.result.current.submit(undefined, {
          messages: [{ id: 'u1', role: 'user', content: 'Use explicit request messages.' }]
        })
      ).resolves.toEqual({ title: 'Explicit', priority: 'low' })
    })

    expect(explicitRequests[0].messages).toEqual([
      { id: 'u1', role: 'user', content: 'Use explicit request messages.' }
    ])
  })

  it('rejects missing prompts, invalid JSON, and schema mismatches', async () => {
    const empty = renderHook(() =>
      useObject<TaskSummary>({
        provider: objectProvider([]),
        schema
      })
    )

    await act(async () => {
      await expect(empty.result.current.submit()).rejects.toThrow(
        'submit() requires a prompt, input state, or request messages'
      )
    })

    const invalidJson = renderHook(() =>
      useObject<TaskSummary>({
        provider: objectProvider([{ content: 'not json' }]),
        schema
      })
    )

    await act(async () => {
      await expect(invalidJson.result.current.submit('invalid json')).rejects.toThrow(
        'Structured output was not valid JSON'
      )
    })
    expect(invalidJson.result.current.status).toBe('error')

    const schemaMismatch = renderHook(() =>
      useObject<TaskSummary>({
        provider: objectProvider([{ content: '{"title":"Missing priority"}' }]),
        schema
      })
    )

    await act(async () => {
      await expect(schemaMismatch.result.current.submit('schema mismatch')).rejects.toThrow(
        /did not match schema/
      )
    })
    expect(schemaMismatch.result.current.error?.message).toMatch(/did not match schema/)
  })

  it('repairs escaped string and array partial JSON while streaming', async () => {
    let releaseObjectTail: () => void = () => {}
    let resolveObjectPartial: () => void = () => {}
    const objectPartialSeen = new Promise<void>((resolve) => {
      resolveObjectPartial = resolve
    })
    const objectTailReleased = new Promise<void>((resolve) => {
      releaseObjectTail = resolve
    })
    const objectProviderWithEscapes: ChatProvider = {
      ...objectProvider([]),
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield { content: '{"title":"Ship \\"now\\"","priority":' }
          resolveObjectPartial()
          await objectTailReleased
          yield { content: '"high"}' }
        })()
      }
    }
    const objectHook = renderHook(() =>
      useObject<TaskSummary>({ provider: objectProviderWithEscapes, schema })
    )
    let objectPending!: Promise<TaskSummary>

    await act(async () => {
      objectPending = objectHook.result.current.submit('escaped')
      await objectPartialSeen
    })
    expect(objectHook.result.current.partialObject).toEqual({ title: 'Ship "now"' })

    await act(async () => {
      releaseObjectTail()
      await expect(objectPending).resolves.toEqual({
        title: 'Ship "now"',
        priority: 'high'
      })
    })

    let releaseArrayTail: () => void = () => {}
    let resolveArrayPartial: () => void = () => {}
    const arrayPartialSeen = new Promise<void>((resolve) => {
      resolveArrayPartial = resolve
    })
    const arrayTailReleased = new Promise<void>((resolve) => {
      releaseArrayTail = resolve
    })
    const arrayProvider: ChatProvider = {
      ...objectProvider([]),
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield { content: '[1,' }
          resolveArrayPartial()
          await arrayTailReleased
          yield { content: '2]' }
        })()
      }
    }
    const arrayHook = renderHook(() =>
      useObject<number[]>({
        provider: arrayProvider,
        schema: { type: 'array', items: { type: 'integer' } }
      })
    )
    let arrayPending!: Promise<number[]>

    await act(async () => {
      arrayPending = arrayHook.result.current.submit('array')
      await arrayPartialSeen
    })
    expect(arrayHook.result.current.partialObject).toEqual([1])

    await act(async () => {
      releaseArrayTail()
      await expect(arrayPending).resolves.toEqual([1, 2])
    })
  })

  it('keeps input when submit fails and supports clear helpers', async () => {
    const provider: ChatProvider = {
      ...objectProvider([]),
      async chat() {
        throw new Error('object failed')
      }
    }
    const { result } = renderHook(() =>
      useObject<TaskSummary>({ provider, schema, initialInput: 'keep prompt' })
    )
    let thrown: unknown

    await act(async () => {
      try {
        await result.current.handleSubmit()
      } catch (error) {
        thrown = error
      }
    })

    expect(thrown).toMatchObject({ message: 'object failed' })
    await waitFor(() => {
      expect(result.current.error?.message).toBe('object failed')
      expect(result.current.status).toBe('error')
    })
    expect(result.current.input).toBe('keep prompt')

    act(() => {
      result.current.clearError()
      result.current.clearTrace()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.lastRequest).toBeNull()
    expect(result.current.lastResponse).toBeNull()
  })

  it('retries before the first chunk', async () => {
    const requests: ChatRequest[] = []
    let calls = 0
    const provider: ChatProvider = {
      ...objectProvider([], requests),
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        requests.push(request)
        calls += 1
        if (calls === 1) throw new Error('temporary object failure')
        return (async function* () {
          yield { content: '{"title":"Recovered","priority":"high"}' }
        })()
      }
    }
    const onRetry = vi.fn()
    const { result } = renderHook(() =>
      useObject<TaskSummary>({ provider, schema, maxRetries: 1, onRetry })
    )

    await act(async () => {
      await expect(result.current.submit('retry')).resolves.toEqual({
        title: 'Recovered',
        priority: 'high'
      })
    })

    expect(calls).toBe(2)
    expect(requests).toHaveLength(2)
    expect(result.current.lastRequest?.attempt).toBe(2)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('rejects stopped streams with an abort error', async () => {
    const onError = vi.fn()
    let resolveOnAbort: (() => void) | undefined
    const provider: ChatProvider = {
      ...objectProvider([]),
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          await new Promise<void>((resolve) => {
            resolveOnAbort = resolve
            request.signal?.addEventListener('abort', () => resolve(), { once: true })
          })
          yield { content: '{"title":"Ignored","priority":"low"}' }
        })()
      }
    }
    const { result } = renderHook(() => useObject<TaskSummary>({ provider, schema, onError }))
    let pending!: Promise<TaskSummary>

    act(() => {
      pending = result.current.submit('stop')
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      result.current.stop()
    })
    resolveOnAbort?.()
    await act(async () => {
      await expect(pending).rejects.toThrow('Structured output request was aborted')
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error?.name).toBe('AbortError')
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: 'AbortError' }))
  })
})
