import { describe, it, expect } from 'vitest'
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
})
