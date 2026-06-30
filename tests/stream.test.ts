import { describe, it, expect } from 'vitest'
import {
  createUIMessageStreamParser,
  parseSSE,
  readUIMessageStream,
  toChatChunks
} from '../src/utils/stream'

function makeResponse(events: string[]): Response {
  const body = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      for (const e of events) {
        controller.enqueue(enc.encode(e))
      }
      controller.close()
    }
  })
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' }
  })
}

function makeCancelableResponse(onCancel: () => void): Response {
  const body = new ReadableStream({
    cancel() {
      onCancel()
    }
  })
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' }
  })
}

describe('parseSSE', () => {
  it('throws when the response has no body', async () => {
    const response = new Response(null)

    const read = async () => {
      for await (const _event of parseSSE(response)) {
        // no-op
      }
    }

    await expect(read()).rejects.toThrow('Response has no body')
  })

  it('yields parsed JSON from data lines', async () => {
    const response = makeResponse(['data: {"a":1}\n\n', 'data: {"a":2}\n\n', 'data: [DONE]\n\n'])
    const out: unknown[] = []
    for await (const ev of parseSSE(response)) {
      out.push(ev)
    }
    expect(out).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('skips malformed lines', async () => {
    const response = makeResponse(['data: not-json\n\n', 'data: {"a":3}\n\n'])
    const out: unknown[] = []
    for await (const ev of parseSSE(response)) {
      out.push(ev)
    }
    expect(out).toEqual([{ a: 3 }])
  })

  it('skips comments and empty data lines', async () => {
    const response = makeResponse([': keep-alive\n\n', 'data:\n\n', 'data: {"a":4}\n\n'])
    const out: unknown[] = []
    for await (const ev of parseSSE(response)) {
      out.push(ev)
    }
    expect(out).toEqual([{ a: 4 }])
  })

  it('handles chunks split mid-line', async () => {
    const response = makeResponse(['data: {"a":1', '}\n\n'])
    const out: unknown[] = []
    for await (const ev of parseSSE(response)) {
      out.push(ev)
    }
    expect(out).toEqual([{ a: 1 }])
  })

  it('handles CRLF event separators', async () => {
    const response = makeResponse(['data: {"a":1}\r\n\r\n', 'data: {"a":2}\r\n\r\n'])
    const out: unknown[] = []
    for await (const ev of parseSSE(response)) {
      out.push(ev)
    }
    expect(out).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('cancels the reader when the signal is already aborted', async () => {
    let cancelled = false
    const controller = new AbortController()
    controller.abort()
    const response = makeCancelableResponse(() => {
      cancelled = true
    })
    const out: unknown[] = []

    for await (const ev of parseSSE(response, controller.signal)) {
      out.push(ev)
    }

    expect(out).toEqual([])
    expect(cancelled).toBe(true)
  })
})

describe('AI SDK UI message stream helpers', () => {
  it('reads AI SDK UI message stream responses as ChatChunk values', async () => {
    const response = makeResponse([
      'data: {"type":"start","messageId":"msg_1","messageMetadata":{"model":"test"}}\n\n',
      'data: {"type":"text-delta","delta":"Hel"}\n\n',
      'data: {"type":"text-delta","delta":"lo"}\n\n',
      'data: {"type":"reasoning-start","id":"r1"}\n\n',
      'data: {"type":"reasoning-delta","id":"r1","delta":"Check "}\n\n',
      'data: {"type":"reasoning-delta","id":"r1","delta":"sources."}\n\n',
      'data: {"type":"data-progress","id":"progress_1","data":{"step":1}}\n\n',
      'data: {"type":"finish","finishReason":"stop","totalUsage":{"inputTokens":2,"outputTokens":3}}\n\n'
    ])
    const chunks: unknown[] = []

    for await (const chunk of readUIMessageStream({ response })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { messageId: 'msg_1', metadata: { type: 'start', messageId: 'msg_1', model: 'test' } },
      { content: 'Hel' },
      { content: 'lo' },
      { parts: [{ type: 'reasoning', id: 'r1', text: 'Check ' }] },
      { parts: [{ type: 'reasoning', id: 'r1', text: 'Check sources.' }] },
      { data: { step: 1 }, dataType: 'data-progress', dataId: 'progress_1' },
      { finishReason: 'stop', usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 } }
    ])
  })

  it('lets custom transports reuse parser state across already-parsed parts', () => {
    const parser = createUIMessageStreamParser()
    const chunks = [
      ...toChatChunks(
        { type: 'tool-input-start', toolCallId: 'call_1', toolName: 'lookup' },
        parser
      ),
      ...toChatChunks(
        { type: 'tool-input-delta', toolCallId: 'call_1', inputTextDelta: '{"q":"' },
        parser
      ),
      ...toChatChunks(
        { type: 'tool-input-delta', toolCallId: 'call_1', inputTextDelta: 'vue"}' },
        parser
      ),
      ...parser.toChatChunks({
        type: 'tool-output-available',
        toolCallId: 'call_1',
        output: { ok: true },
        transient: true
      })
    ]

    expect(chunks).toEqual([
      {
        toolCalls: [
          {
            index: 0,
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '' }
          }
        ]
      },
      {
        toolCalls: [
          {
            index: 0,
            id: 'call_1',
            type: 'function',
            function: { arguments: '{"q":"' }
          }
        ]
      },
      {
        toolCalls: [
          {
            index: 0,
            id: 'call_1',
            type: 'function',
            function: { arguments: 'vue"}' }
          }
        ]
      },
      {
        data: { toolCallId: 'call_1', output: { ok: true }, transient: true },
        dataType: 'tool-output-available',
        dataId: 'call_1',
        transient: true
      }
    ])
  })

  it('surfaces AI SDK UI message stream error parts', async () => {
    const response = makeResponse([
      'data: {"type":"text-delta","delta":"partial"}\n\n',
      'data: {"type":"error","errorText":"bad stream"}\n\n'
    ])
    const chunks: unknown[] = []

    await expect(async () => {
      for await (const chunk of readUIMessageStream({ response })) {
        chunks.push(chunk)
      }
    }).rejects.toMatchObject({ message: 'bad stream' })
    expect(chunks).toEqual([{ content: 'partial' }])
  })
})
