import { describe, expect, it, vi } from 'vitest'
import { useObject } from '../src/composables/useObject'
import type { ChatProvider } from '../src/providers/types'
import type { ChatChunk, ChatRequest } from '../src/types'

function fakeProvider(chunks: ChatChunk[], requests: ChatRequest[] = []): ChatProvider {
  return {
    id: 'fake-object',
    async chat(request): Promise<AsyncIterable<ChatChunk>> {
      requests.push(request)
      return (async function* () {
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    },
    async completion(): Promise<AsyncIterable<string>> {
      return (async function* () {
        yield ''
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

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

describe('useObject', () => {
  it('streams JSON text, parses the final object, and sends responseFormat', async () => {
    const requests: ChatRequest[] = []
    const onChunk = vi.fn()
    const onPartial = vi.fn()
    const onFinish = vi.fn()
    const { object, partialObject, text, submit } = useObject<TaskSummary>({
      provider: fakeProvider(
        [{ content: '{"title":"Ship"' }, { content: ',"priority":"high"}' }],
        requests
      ),
      schema,
      schemaName: 'task_summary',
      schemaDescription: 'A normalized task summary.',
      defaultRequest: {
        model: 'structured-model',
        body: { cache_control: { type: 'ephemeral' }, providerOption: 'default' },
        messages: [{ id: 's1', role: 'system', content: 'Return JSON only.' }]
      },
      onChunk,
      onPartial,
      onFinish
    })

    const result = await submit('Summarize this task.', {
      body: { providerOption: 'runtime' }
    })

    expect(result).toEqual({ title: 'Ship', priority: 'high' })
    expect(object.value).toEqual(result)
    expect(partialObject.value).toEqual(result)
    expect(text.value).toBe('{"title":"Ship","priority":"high"}')
    expect(onChunk).toHaveBeenNthCalledWith(1, { content: '{"title":"Ship"' }, '{"title":"Ship"')
    expect(onChunk).toHaveBeenLastCalledWith(
      { content: ',"priority":"high"}' },
      '{"title":"Ship","priority":"high"}'
    )
    expect(onPartial).toHaveBeenCalledWith({ title: 'Ship' }, '{"title":"Ship"')
    expect(onPartial).toHaveBeenLastCalledWith(result, '{"title":"Ship","priority":"high"}')
    expect(onFinish).toHaveBeenCalledWith(result)
    expect(requests[0].messages.map((message) => message.content)).toEqual([
      'Return JSON only.',
      'Summarize this task.'
    ])
    expect(requests[0]).toMatchObject({
      model: 'structured-model',
      stream: true,
      body: { cache_control: { type: 'ephemeral' }, providerOption: 'runtime' },
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

  it('uses generateId for automatic prompt messages without replacing explicit ids', async () => {
    const prefixes: string[] = []
    const generateId = (prefix = 'msg') => {
      prefixes.push(prefix)
      return `${prefix}_${prefixes.length}`
    }
    const requests: ChatRequest[] = []
    const first = useObject<TaskSummary>({
      provider: fakeProvider([{ content: '{"title":"Generated","priority":"high"}' }], requests),
      schema,
      generateId
    })
    const explicitRequests: ChatRequest[] = []
    const second = useObject<TaskSummary>({
      provider: fakeProvider(
        [{ content: '{"title":"Explicit","priority":"low"}' }],
        explicitRequests
      ),
      schema,
      generateId
    })

    expect(first.id.value).toBe('object_1')
    expect(second.id.value).toBe('object_2')

    await first.submit('Use generated id.')
    await second.submit({ id: 'explicit_1', role: 'user', content: 'Keep explicit id.' })

    expect(requests[0].messages[0].id).toBe('user_3')
    expect(explicitRequests[0].messages[0].id).toBe('explicit_1')
    expect(prefixes).toEqual(['object', 'object', 'user'])
  })

  it('shares state across instances with the same id and seeds partialObject from initialValue', async () => {
    const requests: ChatRequest[] = []
    const first = useObject<TaskSummary>({
      id: 'shared-task-summary',
      provider: fakeProvider([{ content: '{"title":"Shared","priority":"high"}' }], requests),
      schema,
      initialValue: { title: 'Draft' }
    })
    const second = useObject<TaskSummary>({
      id: 'shared-task-summary',
      provider: fakeProvider([{ content: '{"title":"Ignored","priority":"low"}' }]),
      schema,
      initialValue: { title: 'Ignored' }
    })

    expect(first.id.value).toBe('shared-task-summary')
    expect(second.partialObject.value).toEqual({ title: 'Draft' })
    expect(second.object.value).toBeNull()

    second.input.value = 'Summarize shared state.'
    await first.submit()

    expect(requests[0].messages[0].content).toBe('Summarize shared state.')
    expect(second.text.value).toBe('{"title":"Shared","priority":"high"}')
    expect(second.object.value).toEqual({ title: 'Shared', priority: 'high' })
    expect(first.partialObject.value).toEqual(second.partialObject.value)

    second.clear()
    expect(first.object.value).toBeNull()
    expect(first.partialObject.value).toEqual({ title: 'Draft' })
    expect(first.input.value).toBe('')
  })

  it('updates partialObject before the final JSON object is complete', async () => {
    let releaseSecondChunk: () => void = () => {}
    let resolveFirstChunkSeen: () => void = () => {}
    const firstChunkSeen = new Promise<void>((resolve) => {
      resolveFirstChunkSeen = resolve
    })
    const secondChunkRelease = new Promise<void>((resolve) => {
      releaseSecondChunk = resolve
    })
    const provider: ChatProvider = {
      id: 'partial-object',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield { content: '{"title":"Ship","priority":' }
          resolveFirstChunkSeen()
          await secondChunkRelease
          yield { content: '"high"}' }
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return (async function* () {
          yield ''
        })()
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }
    const { object, partialObject, status, text, submit } = useObject<TaskSummary>({
      provider,
      schema
    })

    const pending = submit('Summarize.')
    expect(status.value).toBe('submitted')
    await firstChunkSeen

    expect(text.value).toBe('{"title":"Ship","priority":')
    expect(partialObject.value).toEqual({ title: 'Ship' })
    expect(object.value).toBeNull()
    expect(status.value).toBe('streaming')

    releaseSecondChunk()

    await expect(pending).resolves.toEqual({ title: 'Ship', priority: 'high' })
    expect(partialObject.value).toEqual({ title: 'Ship', priority: 'high' })
    expect(object.value).toEqual({ title: 'Ship', priority: 'high' })
    expect(status.value).toBe('ready')
  })

  it('throttles structured text and partial object ref updates', async () => {
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
      const provider: ChatProvider = {
        id: 'throttled-object',
        async chat(): Promise<AsyncIterable<ChatChunk>> {
          return (async function* () {
            yield { content: '{"title":"Ship"' }
            yield { content: ',"priority":' }
            resolveFirstBatch()
            await streamReleased
            yield { content: '"high"}' }
          })()
        },
        async completion(): Promise<AsyncIterable<string>> {
          return (async function* () {
            yield ''
          })()
        },
        async embedding() {
          return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
        }
      }
      const onPartial = vi.fn()
      const { partialObject, submit, text } = useObject<TaskSummary>({
        provider,
        schema,
        throttleMs: 50,
        onPartial
      })

      const pending = submit('Summarize.')
      await firstBatchSeen

      expect(text.value).toBe('')
      expect(partialObject.value).toBeNull()
      expect(onPartial).not.toHaveBeenCalled()

      vi.advanceTimersByTime(50)
      expect(text.value).toBe('{"title":"Ship","priority":')
      expect(partialObject.value).toEqual({ title: 'Ship' })
      expect(onPartial).toHaveBeenCalledWith({ title: 'Ship' }, text.value)

      releaseStream()
      await expect(pending).resolves.toEqual({ title: 'Ship', priority: 'high' })
      expect(text.value).toBe('{"title":"Ship","priority":"high"}')
      expect(partialObject.value).toEqual({ title: 'Ship', priority: 'high' })
      expect(onPartial).toHaveBeenLastCalledWith(
        { title: 'Ship', priority: 'high' },
        '{"title":"Ship","priority":"high"}'
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('retries structured output streams that fail before the first chunk', async () => {
    let calls = 0
    const onRetry = vi.fn()
    const provider: ChatProvider = {
      id: 'retry-object',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        calls += 1
        if (calls === 1) throw new Error('temporary object failure')
        return (async function* () {
          yield { content: '{"title":"Recovered","priority":"high"}' }
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return (async function* () {
          yield ''
        })()
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }
    const { submit, object, error } = useObject<TaskSummary>({
      provider,
      schema,
      maxRetries: 1,
      onRetry
    })

    await expect(submit('retry object')).resolves.toEqual({
      title: 'Recovered',
      priority: 'high'
    })

    expect(calls).toBe(2)
    expect(object.value?.title).toBe('Recovered')
    expect(error.value).toBeNull()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('supports input.value and clear()', async () => {
    const { input, object, partialObject, text, submit, clear } = useObject<TaskSummary>({
      provider: fakeProvider([{ content: '{"title":"Clean","priority":"low"}' }]),
      schema,
      initialObject: { title: 'Initial', priority: 'low' }
    })

    input.value = 'Summarize from input.'
    await submit()
    expect(object.value?.title).toBe('Clean')
    expect(partialObject.value?.title).toBe('Clean')
    expect(text.value).toContain('Clean')

    clear()
    expect(object.value).toEqual({ title: 'Initial', priority: 'low' })
    expect(partialObject.value).toEqual({ title: 'Initial', priority: 'low' })
    expect(text.value).toBe('')
    expect(input.value).toBe('')
  })

  it('accepts message prompts and explicit request messages', async () => {
    const firstRequests: ChatRequest[] = []
    const first = useObject<TaskSummary>({
      provider: fakeProvider(
        [{ content: '{"title":"From message","priority":"high"}' }],
        firstRequests
      ),
      schema
    })

    await first.submit({ id: '', role: 'user', content: 'Summarize this message.' })

    expect(firstRequests[0].messages[0]).toMatchObject({
      role: 'user',
      content: 'Summarize this message.'
    })
    expect(firstRequests[0].messages[0].id).not.toBe('')

    const secondRequests: ChatRequest[] = []
    const second = useObject<TaskSummary>({
      provider: fakeProvider(
        [{ content: '{"title":"Explicit","priority":"low"}' }],
        secondRequests
      ),
      schema
    })

    await second.submit(undefined, {
      messages: [{ id: 'u1', role: 'user', content: 'Use these request messages.' }]
    })

    expect(secondRequests[0].messages).toEqual([
      { id: 'u1', role: 'user', content: 'Use these request messages.' }
    ])
  })

  it('rejects with AbortError when stop() aborts the stream', async () => {
    let resolveChunkSeen: () => void = () => {}
    const chunkSeen = new Promise<void>((resolve) => {
      resolveChunkSeen = resolve
    })
    const provider: ChatProvider = {
      id: 'abort-object',
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield { content: '{"title":"' }
          resolveChunkSeen()
          await new Promise<void>((resolve) => {
            request.signal?.addEventListener('abort', () => resolve(), { once: true })
          })
        })()
      },
      async completion(): Promise<AsyncIterable<string>> {
        return (async function* () {
          yield ''
        })()
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }
    const { submit, stop, status, error } = useObject<TaskSummary>({ provider, schema })

    const pending = submit('Abort this request.')
    expect(status.value).toBe('submitted')
    await chunkSeen
    expect(status.value).toBe('streaming')
    stop()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(error.value?.name).toBe('AbortError')
    expect(status.value).toBe('error')
  })

  it('surfaces invalid JSON as an AiHooksError', async () => {
    const onError = vi.fn()
    const { clearError, submit, status, error } = useObject<TaskSummary>({
      provider: fakeProvider([{ content: 'not json' }]),
      schema,
      onError
    })

    await expect(submit('Summarize.')).rejects.toThrow(/not valid JSON/)
    expect(error.value?.name).toBe('AiHooksError')
    expect(status.value).toBe('error')
    expect(onError).toHaveBeenCalledWith(error.value)

    clearError()
    expect(error.value).toBeNull()
    expect(status.value).toBe('ready')
  })

  it('surfaces final objects that do not match the schema as an AiHooksError', async () => {
    const onError = vi.fn()
    const { object, partialObject, submit, status, error } = useObject<TaskSummary>({
      provider: fakeProvider([{ content: '{"title":"Ship","priority":"medium","extra":true}' }]),
      schema,
      onError
    })

    await expect(submit('Summarize.')).rejects.toThrow(/did not match schema/)

    expect(error.value?.name).toBe('AiHooksError')
    expect(error.value?.message).toContain('object.priority must be one of')
    expect(status.value).toBe('error')
    expect(object.value).toBeNull()
    expect(partialObject.value).toEqual({ title: 'Ship', priority: 'medium', extra: true })
    expect(onError).toHaveBeenCalledWith(error.value)
  })

  it('rejects additional properties when the schema forbids them', async () => {
    const { submit, error } = useObject<TaskSummary>({
      provider: fakeProvider([{ content: '{"title":"Ship","priority":"high","extra":true}' }]),
      schema
    })

    await expect(submit('Summarize.')).rejects.toThrow(/object.extra is not allowed/)
    expect(error.value?.message).toContain('object.extra is not allowed')
  })

  it('rejects objects missing required schema properties', async () => {
    const { submit, error } = useObject<TaskSummary>({
      provider: fakeProvider([{ content: '{"title":"Ship"}' }]),
      schema
    })

    await expect(submit('Summarize.')).rejects.toThrow(/object.priority is required/)
    expect(error.value?.message).toContain('object.priority is required')
  })

  it('validates array items against the schema', async () => {
    const { submit, error } = useObject<number[]>({
      provider: fakeProvider([{ content: '[1,2.5]' }]),
      schema: { type: ['array', 'null'], items: { type: 'integer' } }
    })

    await expect(submit('Return numbers.')).rejects.toThrow(/object\[1\] must be integer/)
    expect(error.value?.message).toContain('object[1] must be integer')
  })

  it('validates additional properties against a schema when provided', async () => {
    const { submit, error } = useObject<{ known: string; score: number }>({
      provider: fakeProvider([{ content: '{"known":"ok","score":"bad"}' }]),
      schema: {
        type: 'object',
        properties: { known: { type: 'string' } },
        additionalProperties: { type: 'number' }
      }
    })

    await expect(submit('Return scored object.')).rejects.toThrow(/object.score must be number/)
    expect(error.value?.message).toContain('object.score must be number')
  })

  it('validates object enum values', async () => {
    const { submit, error } = useObject<{ kind: string }>({
      provider: fakeProvider([{ content: '{"kind":"actual"}' }]),
      schema: { enum: [{ kind: 'expected' }] }
    })

    await expect(submit('Return expected object.')).rejects.toThrow(/must be one of/)
    expect(error.value?.message).toContain('{"kind":"expected"}')
  })
})
