import { describe, it, expect, vi } from 'vitest'
import { useEmbedding } from '../src/composables/useEmbedding'
import type { ChatProvider } from '../src/providers/types'
import type { ChatChunk } from '../src/types'

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

describe('useEmbedding', () => {
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
    const { embed, stop, isLoading, abortController, error } = useEmbedding({ provider, onError })

    const result = embed('hello').catch((err: unknown) => err)
    await requestStarted

    expect(isLoading.value).toBe(true)
    expect(abortController.value).not.toBeNull()

    stop()

    expect(capturedSignal?.aborted).toBe(true)
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
