import { describe, it, expect } from 'vitest'
import { useCompletion } from '../src/composables/useCompletion'
import type { ChatProvider } from '../src/providers/types'
import type { ChatChunk } from '../src/types'

function fakeProvider(text: string): ChatProvider {
  return {
    id: 'fake',
    async chat(): Promise<AsyncIterable<ChatChunk>> {
      return (async function* () {
        yield { content: text }
      })()
    },
    async completion(): Promise<AsyncIterable<string>> {
      return (async function* () {
        // Emit one chunk at a time to mimic streaming.
        for (const ch of text) {
          await Promise.resolve()
          yield ch
        }
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

describe('useCompletion', () => {
  it('streams a completion into the ref', async () => {
    const { completion, complete } = useCompletion({ provider: fakeProvider('Hello, world!') })
    const result = await complete('say hi')
    expect(result).toBe('Hello, world!')
    expect(completion.value).toBe('Hello, world!')
  })

  it('throws if no prompt is given', async () => {
    const { complete, input } = useCompletion({ provider: fakeProvider('x') })
    input.value = ''
    await expect(complete()).rejects.toThrow(/requires a prompt/)
  })

  it('stop() clears loading state', async () => {
    const { isLoading, stop } = useCompletion({ provider: fakeProvider('xyz') })
    stop()
    expect(isLoading.value).toBe(false)
  })

  it('does not append chunks yielded after stop()', async () => {
    let resolveFirstChunk: () => void = () => {}
    const firstChunk = new Promise<void>((resolve) => {
      resolveFirstChunk = resolve
    })
    const provider: ChatProvider = {
      id: 'abort-aware',
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          yield { content: '' }
        })()
      },
      async completion(request): Promise<AsyncIterable<string>> {
        return (async function* () {
          yield 'a'
          resolveFirstChunk()
          await new Promise<void>((resolve) => {
            request.signal?.addEventListener('abort', () => resolve(), { once: true })
          })
          yield 'b'
        })()
      },
      async embedding() {
        return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
      }
    }
    const { complete, completion, stop } = useCompletion({ provider })

    const resultPromise = complete('say hi')
    await firstChunk
    expect(completion.value).toBe('a')

    stop()
    const result = await resultPromise

    expect(result).toBe('a')
    expect(completion.value).toBe('a')
  })
})
