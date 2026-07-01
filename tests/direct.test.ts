import { describe, expect, it } from 'vitest'
import { DirectChatTransport } from '../src/providers/direct'
import { AiHooksError, type ChatRequest } from '../src/types'

async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const chunks: T[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return chunks
}

describe('DirectChatTransport', () => {
  it('streams AI SDK UI message parts from an in-process handler', async () => {
    const requests: ChatRequest[] = []
    const transport = new DirectChatTransport({
      stream(request) {
        requests.push(request)
        return [
          { type: 'start', messageId: 'msg_1', messageMetadata: { model: 'local-agent' } },
          { type: 'text-start', id: 'text_1' },
          { type: 'text-delta', id: 'text_1', delta: 'Hel' },
          { type: 'text-delta', id: 'text_1', delta: 'lo' },
          {
            type: 'finish',
            finishReason: 'stop',
            totalUsage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 }
          }
        ]
      }
    })

    const stream = await transport.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }]
    })

    await expect(collect(stream)).resolves.toEqual([
      {
        messageId: 'msg_1',
        metadata: { type: 'start', messageId: 'msg_1', model: 'local-agent' }
      },
      { content: 'Hel' },
      { content: 'lo' },
      {
        finishReason: 'stop',
        usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 }
      }
    ])
    expect(requests).toHaveLength(1)
  })

  it('streams ChatChunk values directly when configured for chat-chunk protocol', async () => {
    const transport = new DirectChatTransport({
      id: 'local-tools',
      streamProtocol: 'chat-chunk',
      async *stream(request) {
        expect(request.messages).toHaveLength(1)
        yield { content: 'tool ' }
        yield { content: 'approved', finishReason: 'stop' }
      }
    })

    const stream = await transport.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Run tool' }]
    })

    await expect(collect(stream)).resolves.toEqual([
      { content: 'tool ' },
      { content: 'approved', finishReason: 'stop' }
    ])
  })

  it('stops direct ChatChunk streams when the request is already aborted', async () => {
    const controller = new AbortController()
    const transport = new DirectChatTransport({
      streamProtocol: 'chat-chunk',
      stream: () => [{ content: 'skip' }]
    })
    controller.abort()

    const stream = await transport.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Stop' }],
      signal: controller.signal
    })

    await expect(collect(stream)).resolves.toEqual([])
  })

  it('maps UI message stream handler errors through onError', async () => {
    const transport = new DirectChatTransport({
      stream() {
        throw new Error('secret upstream failure')
      },
      onError(error) {
        expect(error).toBeInstanceOf(Error)
        return 'local agent failed'
      }
    })

    const stream = await transport.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }]
    })

    await expect(collect(stream)).rejects.toMatchObject({
      name: 'AiHooksError',
      message: 'local agent failed'
    })
  })

  it('maps UI message source iteration errors after yielding earlier parts', async () => {
    const transport = new DirectChatTransport({
      async *stream() {
        yield { type: 'text-delta', id: 'text_1', delta: 'before' }
        throw new Error('hidden iteration failure')
      },
      onError() {
        return 'iteration failed'
      }
    })

    const stream = await transport.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Hi' }]
    })
    const chunks: unknown[] = []

    await expect(async () => {
      for await (const chunk of stream) chunks.push(chunk)
    }).rejects.toMatchObject({
      name: 'AiHooksError',
      message: 'iteration failed'
    })
    expect(chunks).toEqual([{ content: 'before' }])
  })

  it('supports optional resumable streams', async () => {
    const transport = new DirectChatTransport({
      stream: () => [],
      resumeStream(request) {
        if (request.id !== 'active') return null
        return [{ type: 'text-delta', id: 'text_1', delta: 'resumed' }]
      }
    })

    await expect(transport.resumeChat({ id: 'missing' })).resolves.toBeNull()

    const resumed = await transport.resumeChat({ id: 'active' })
    expect(resumed).not.toBeNull()
    await expect(collect(resumed!)).resolves.toEqual([{ content: 'resumed' }])
  })

  it('throws explicit errors for unsupported completion and embedding calls', async () => {
    const transport = new DirectChatTransport({
      stream: () => []
    })

    await expect(transport.completion({ prompt: 'Hi' })).rejects.toMatchObject({
      name: 'AiHooksError'
    } satisfies Partial<AiHooksError>)
    await expect(transport.embedding({ input: 'Hi' })).rejects.toMatchObject({
      name: 'AiHooksError'
    } satisfies Partial<AiHooksError>)
  })
})
