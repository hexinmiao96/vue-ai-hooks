import { describe, expect, it, vi } from 'vitest'

import { useCompletion } from '../src/composables/useCompletion'

type CompletionProvider = Parameters<typeof useCompletion>[0]['provider']

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
  it('streams completion into ref', async () => {
    const { complete, completion, isLoading, error } = useCompletion({
      provider: fakeProvider('hello')
    })

    await expect(complete('Say hello')).resolves.toBe('hello')

    expect(completion.value).toBe('hello')
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
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
        temperature: 0.1
      }
    })
    const requestOptions = {
      model: 'runtime-model',
      stream: false,
      temperature: 0.2
    }

    await expect(complete('runtime prompt', requestOptions)).resolves.toBe('ok')

    expect(requests[0]).toMatchObject({
      model: 'runtime-model',
      prompt: 'runtime prompt',
      stream: true,
      temperature: 0.2
    })
    expect(requests[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('supports initial completion and manual completion updates', () => {
    const { completion, setCompletion } = useCompletion({
      provider: fakeProvider('unused'),
      initialCompletion: 'draft'
    })

    expect(completion.value).toBe('draft')

    setCompletion('manual update')

    expect(completion.value).toBe('manual update')
  })

  it('calls onFinish with final completion after success', async () => {
    const onFinish = vi.fn()
    const { complete, isLoading, error } = useCompletion({
      provider: fakeProvider('finished'),
      onFinish
    })

    await expect(complete('finish it')).resolves.toBe('finished')

    expect(onFinish).toHaveBeenCalledOnce()
    expect(onFinish).toHaveBeenCalledWith('finished')
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
    const { complete, error, isLoading } = useCompletion({
      provider,
      onError
    })

    await expect(complete('fail')).rejects.toThrow('provider failed')

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toBe('provider failed')
    expect(onError).toHaveBeenCalledOnce()
    expect(onError).toHaveBeenCalledWith(error.value)
    expect(isLoading.value).toBe(false)
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
    expect(onFinish).toHaveBeenCalledWith('partial')
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
