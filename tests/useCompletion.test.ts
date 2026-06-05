import { describe, it, expect } from 'vitest'
import { useCompletion, type ChatProvider } from '../src/composables/useCompletion'
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
})
