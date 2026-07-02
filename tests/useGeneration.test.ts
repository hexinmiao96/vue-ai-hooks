import { describe, expect, it, vi } from 'vitest'
import { useGeneration } from '../src/composables/useGeneration'

const flushPromises = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })

function abortError(message = 'aborted') {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

describe('useGeneration', () => {
  it('runs a typed generation fetcher and exposes lifecycle state', async () => {
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const onFinish = vi.fn()
    const fetcher = vi.fn(async (input: { prompt: string }, context) => {
      expect(context.id).toBe('generation_1')
      expect(context.attempt).toBe(1)
      expect(context.body).toEqual({ tenant: 'docs', mode: 'final' })
      expect(context.signal).toBeInstanceOf(AbortSignal)
      return { text: input.prompt.toUpperCase() }
    })
    const generation = useGeneration<
      { prompt: string },
      { text: string },
      { percent: number },
      { token: string }
    >({
      id: 'generation_1',
      fetcher,
      defaultBody: { tenant: 'docs', mode: 'draft' },
      onRequest,
      onResponse,
      onFinish
    })

    await expect(
      generation.generate({ prompt: 'release note' }, { body: { mode: 'final' } })
    ).resolves.toEqual({ text: 'RELEASE NOTE' })

    expect(generation.result.value).toEqual({ text: 'RELEASE NOTE' })
    expect(generation.input.value).toEqual({ prompt: 'release note' })
    expect(generation.status.value).toBe('ready')
    expect(generation.isLoading.value).toBe(false)
    expect(generation.error.value).toBeNull()
    expect(generation.lastRequest.value).toEqual({
      id: 'generation_1',
      attempt: 1,
      input: { prompt: 'release note' },
      body: { tenant: 'docs', mode: 'final' }
    })
    expect(generation.lastResponse.value).toEqual({
      id: 'generation_1',
      attempt: 1,
      input: { prompt: 'release note' },
      body: { tenant: 'docs', mode: 'final' },
      result: { text: 'RELEASE NOTE' }
    })
    generation.clearTrace()
    expect(generation.lastRequest.value).toBeNull()
    expect(generation.lastResponse.value).toBeNull()
    expect(onRequest).toHaveBeenCalledWith({
      id: 'generation_1',
      attempt: 1,
      input: { prompt: 'release note' },
      body: { tenant: 'docs', mode: 'final' }
    })
    expect(onResponse).toHaveBeenCalledWith({
      id: 'generation_1',
      attempt: 1,
      input: { prompt: 'release note' },
      body: { tenant: 'docs', mode: 'final' },
      result: { text: 'RELEASE NOTE' }
    })
    expect(onFinish).toHaveBeenCalledWith({ text: 'RELEASE NOTE' })
  })

  it('reports progress and chunks while generation is running', async () => {
    const onProgress = vi.fn()
    const onChunk = vi.fn()
    const generation = useGeneration<string, string, { percent: number }, { token: string }>({
      fetcher: async (input, context) => {
        context.reportProgress({ percent: 50 })
        context.reportChunk({ token: input })
        return `${input}!`
      },
      onProgress,
      onChunk
    })

    await expect(generation.generate('draft')).resolves.toBe('draft!')

    expect(generation.progress.value).toEqual({ percent: 50 })
    expect(generation.chunks.value).toEqual([{ token: 'draft' }])
    expect(onProgress).toHaveBeenCalledWith({ percent: 50 })
    expect(onChunk).toHaveBeenCalledWith({ token: 'draft' })
  })

  it('shares state for matching ids and resets to initial values', async () => {
    const first = useGeneration<string, string, number, string>({
      id: 'shared-generation',
      initialInput: 'first',
      initialResult: 'draft',
      initialProgress: 0,
      fetcher: async (input) => `${input}-done`
    })
    const second = useGeneration<string, string, number, string>({
      id: 'shared-generation',
      initialInput: 'ignored',
      initialResult: 'ignored',
      initialProgress: 99,
      fetcher: async () => 'unused'
    })

    expect(second.input.value).toBe('first')
    expect(second.result.value).toBe('draft')
    expect(second.progress.value).toBe(0)

    await expect(first.generate()).resolves.toBe('first-done')
    expect(second.result.value).toBe('first-done')

    second.setInput('manual')
    second.setResult('manual-result')
    second.reset()

    expect(first.input.value).toBe('first')
    expect(first.result.value).toBe('draft')
    expect(first.progress.value).toBe(0)
    expect(first.chunks.value).toEqual([])
  })

  it('retries failures before any progress is reported', async () => {
    const onRetry = vi.fn()
    let calls = 0
    const generation = useGeneration<string, string>({
      maxRetries: 1,
      onRetry,
      fetcher: async () => {
        calls += 1
        if (calls === 1) throw new Error('temporary')
        return 'ok'
      }
    })

    await expect(generation.generate('retry')).resolves.toBe('ok')

    expect(calls).toBe(2)
    expect(onRetry).toHaveBeenCalledOnce()
    expect(generation.error.value).toBeNull()
  })

  it('does not retry after progress was reported', async () => {
    let calls = 0
    const generation = useGeneration<string, string, number>({
      maxRetries: 1,
      fetcher: async (_input, context) => {
        calls += 1
        context.reportProgress(1)
        throw new Error('after progress')
      }
    })

    await expect(generation.generate('no retry')).rejects.toThrow('after progress')

    expect(calls).toBe(1)
    expect(generation.status.value).toBe('error')
    expect(generation.error.value?.message).toBe('after progress')
  })

  it('aborts the active generation without storing an error', async () => {
    const generation = useGeneration<string, string>({
      fetcher: async (_input, context) => {
        await new Promise((_resolve, reject) => {
          context.signal.addEventListener('abort', () => reject(abortError()), { once: true })
        })
        return 'late result'
      }
    })

    const pending = generation.generate('abort')
    expect(generation.status.value).toBe('submitted')

    generation.stop()
    await expect(pending).rejects.toThrow('aborted')
    await flushPromises()

    expect(generation.status.value).toBe('ready')
    expect(generation.isLoading.value).toBe(false)
    expect(generation.error.value).toBeNull()
    expect(generation.result.value).toBeNull()
  })

  it('captures inspect() snapshot metadata for generation requests', async () => {
    const response = 'inspect generated text'
    const fetcher = vi.fn(async () => response)
    const generation = useGeneration<string, string>({
      fetcher,
      defaultBody: { tenantId: 'tenant_1' }
    })

    await expect(generation.generate('inspect prompt')).resolves.toBe(response)

    const snapshot = generation.inspect()
    expect(snapshot.hasRequest).toBe(true)
    expect(snapshot.hasResponse).toBe(true)
    expect(snapshot.request).toMatchObject({
      id: expect.stringMatching(/^generation-/),
      attempt: 1,
      input: 'inspect prompt'
    })
    expect(snapshot.response).toMatchObject({
      result: response
    })
    expect(snapshot.request).toMatchObject({
      body: { tenantId: 'tenant_1' }
    })
    expect(snapshot.timeline.map((event) => event.kind)).toEqual(
      expect.arrayContaining(['request', 'response'])
    )
    expect(snapshot.curl).toBeNull()

    generation.clearTrace()
    const cleared = generation.inspect()
    expect(cleared.hasRequest).toBe(false)
    expect(cleared.hasResponse).toBe(false)
  })
})
