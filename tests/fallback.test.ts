import { describe, expect, it, vi } from 'vitest'

import { fallbackProvider } from '../src/providers/fallback'
import type {
  ChatChunk,
  ChatProvider,
  ChatRequest,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult
} from '../src'

function provider(
  id: string,
  overrides: Partial<{
    chat: ChatProvider['chat']
    completion: ChatProvider['completion']
    embedding: ChatProvider['embedding']
  }>
): ChatProvider {
  return {
    id,
    async chat() {
      throw new Error(`${id} chat failed`)
    },
    async completion() {
      throw new Error(`${id} completion failed`)
    },
    async embedding() {
      throw new Error(`${id} embedding failed`)
    },
    ...overrides
  }
}

async function collect<T>(stream: AsyncIterable<T>) {
  const chunks: T[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

describe('fallbackProvider', () => {
  it('falls back to the next chat provider before any chunk is yielded', async () => {
    const requests: ChatRequest[] = []
    const onFallback = vi.fn()
    const primary = provider('primary', {
      async chat(request) {
        requests.push(request)
        throw new Error('primary unavailable')
      }
    })
    const secondary = provider('secondary', {
      async chat(request) {
        requests.push(request)
        return (async function* () {
          yield { content: 'ok' } satisfies ChatChunk
        })()
      }
    })

    const combined = fallbackProvider({ providers: [primary, secondary], onFallback })
    const chunks = await collect(
      await combined.chat({ messages: [{ id: 'm1', role: 'user', content: 'Hi' }] })
    )

    expect(chunks).toEqual([{ content: 'ok' }])
    expect(requests).toHaveLength(2)
    expect(onFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'chat',
        providerId: 'primary',
        nextProviderId: 'secondary',
        index: 0
      })
    )
  })

  it('does not fall back after a chat stream has yielded content', async () => {
    const secondaryChat = vi.fn()
    const primary = provider('primary', {
      async chat() {
        return (async function* () {
          yield { content: 'partial' } satisfies ChatChunk
          throw new Error('stream interrupted')
        })()
      }
    })
    const secondary = provider('secondary', {
      chat: secondaryChat
    })
    const combined = fallbackProvider({ providers: [primary, secondary] })
    const stream = await combined.chat({ messages: [{ id: 'm1', role: 'user', content: 'Hi' }] })
    const chunks: ChatChunk[] = []

    await expect(async () => {
      for await (const chunk of stream) chunks.push(chunk)
    }).rejects.toThrow('stream interrupted')

    expect(chunks).toEqual([{ content: 'partial' }])
    expect(secondaryChat).not.toHaveBeenCalled()
  })

  it('falls back for completion streams', async () => {
    const completionRequests: CompletionRequest[] = []
    const primary = provider('primary', {
      async completion(request) {
        completionRequests.push(request)
        throw new Error('completion unavailable')
      }
    })
    const secondary = provider('secondary', {
      async completion(request) {
        completionRequests.push(request)
        return (async function* () {
          yield 'done'
        })()
      }
    })
    const combined = fallbackProvider({ providers: [primary, secondary] })

    await expect(collect(await combined.completion({ prompt: 'Finish' }))).resolves.toEqual([
      'done'
    ])
    expect(completionRequests).toHaveLength(2)
  })

  it('falls back for embeddings', async () => {
    const embeddingRequests: EmbeddingRequest[] = []
    const result: EmbeddingResult = {
      embeddings: [[1, 2, 3]],
      model: 'fallback-embedding',
      usage: { promptTokens: 1, totalTokens: 1 }
    }
    const primary = provider('primary', {
      async embedding(request) {
        embeddingRequests.push(request)
        throw new Error('embedding unavailable')
      }
    })
    const secondary = provider('secondary', {
      async embedding(request) {
        embeddingRequests.push(request)
        return result
      }
    })
    const combined = fallbackProvider({ providers: [primary, secondary] })

    await expect(combined.embedding({ input: 'embed me' })).resolves.toBe(result)
    expect(embeddingRequests).toHaveLength(2)
  })

  it('respects shouldFallback decisions', async () => {
    const shouldFallback = vi.fn(() => false)
    const secondaryChat = vi.fn()
    const primary = provider('primary', {
      async chat() {
        throw new Error('do not fallback')
      }
    })
    const secondary = provider('secondary', {
      chat: secondaryChat
    })
    const combined = fallbackProvider({ providers: [primary, secondary], shouldFallback })

    await expect(
      collect(await combined.chat({ messages: [{ id: 'm1', role: 'user', content: 'Hi' }] }))
    ).rejects.toThrow('do not fallback')
    expect(shouldFallback).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'chat', providerId: 'primary' })
    )
    expect(secondaryChat).not.toHaveBeenCalled()
  })

  it('requires at least one provider', () => {
    expect(() => fallbackProvider({ providers: [] })).toThrow(
      'fallbackProvider requires at least one provider'
    )
  })
})
