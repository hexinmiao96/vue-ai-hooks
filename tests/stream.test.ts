import { describe, it, expect } from 'vitest'
import {
  createUIMessageStream,
  createUIMessageStreamParser,
  createUIMessageStreamResponse,
  formatSSEData,
  parseSSE,
  pipeUIMessageStreamToResponse,
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

  it('yields a final data line when the stream closes without a blank separator', async () => {
    const response = makeResponse(['data: {"a":1}\n'])
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
  it('creates UI message streams with writer callbacks', async () => {
    const stream = createUIMessageStream({
      execute({ write }) {
        write({ type: 'start', messageId: 'msg_1' })
        write({ type: 'text-delta', delta: 'Hello' })
        write({ type: 'finish', finishReason: 'stop' })
      }
    })
    const response = createUIMessageStreamResponse({ stream })
    const chunks: unknown[] = []

    for await (const chunk of readUIMessageStream({ response })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { messageId: 'msg_1', metadata: { type: 'start', messageId: 'msg_1' } },
      { content: 'Hello' },
      { finishReason: 'stop' }
    ])
  })

  it('merges nested UI message stream sources', async () => {
    const stream = createUIMessageStream({
      async execute({ write, merge }) {
        write({ type: 'text-delta', delta: 'A' })
        await merge([{ type: 'text-delta', delta: 'B' }])
        await merge(
          new ReadableStream({
            start(controller) {
              controller.enqueue({ type: 'text-delta', delta: 'C' })
              controller.close()
            }
          })
        )
      }
    })
    const response = createUIMessageStreamResponse({ stream })
    const chunks: unknown[] = []

    for await (const chunk of readUIMessageStream({ response })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([{ content: 'A' }, { content: 'B' }, { content: 'C' }])
  })

  it('writes error parts from thrown stream executors', async () => {
    const defaultError = createUIMessageStream({
      execute() {
        throw new Error('default failed')
      }
    })
    const customError = createUIMessageStream({
      execute() {
        throw new Error('hidden')
      },
      onError(error) {
        expect(error).toBeInstanceOf(Error)
        return 'custom failed'
      }
    })

    await expect(async () => {
      for await (const _chunk of readUIMessageStream({
        response: createUIMessageStreamResponse({ stream: defaultError })
      })) {
        // consume stream
      }
    }).rejects.toMatchObject({ message: 'default failed' })
    await expect(async () => {
      for await (const _chunk of readUIMessageStream({
        response: createUIMessageStreamResponse({ stream: customError })
      })) {
        // consume stream
      }
    }).rejects.toMatchObject({ message: 'custom failed' })
  })

  it('can suppress stream executor errors and close on abort', async () => {
    const suppressed = createUIMessageStream({
      execute({ write }) {
        write({ type: 'text-delta', delta: 'before' })
        throw new Error('suppressed')
      },
      onError: () => null
    })
    const controller = new AbortController()
    controller.abort()
    const aborted = createUIMessageStream({
      signal: controller.signal,
      execute({ write }) {
        write({ type: 'text-delta', delta: 'after' })
      }
    })
    const suppressedChunks: unknown[] = []
    const abortedChunks: unknown[] = []

    for await (const chunk of readUIMessageStream({
      response: createUIMessageStreamResponse({ stream: suppressed })
    })) {
      suppressedChunks.push(chunk)
    }
    for await (const chunk of readUIMessageStream({
      response: createUIMessageStreamResponse({ stream: aborted })
    })) {
      abortedChunks.push(chunk)
    }

    expect(suppressedChunks).toEqual([{ content: 'before' }])
    expect(abortedChunks).toEqual([])
  })

  it('formats JSON values as SSE data events', () => {
    expect(formatSSEData({ type: 'text-delta', delta: 'Hi' })).toBe(
      'data: {"type":"text-delta","delta":"Hi"}\n\n'
    )
    expect(formatSSEData('[DONE]')).toBe('data: [DONE]\n\n')
    expect(() => formatSSEData(undefined)).toThrow('SSE data must be JSON serializable')
  })

  it('creates fetch responses for AI SDK UI message stream parts', async () => {
    const response = createUIMessageStreamResponse({
      stream: [
        { type: 'text-delta', delta: 'Hel' },
        { type: 'text-delta', delta: 'lo' },
        { type: 'finish', finishReason: 'stop' }
      ],
      headers: { 'X-Trace': 'trace_1' }
    })
    const chunks: unknown[] = []

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8')
    expect(response.headers.get('cache-control')).toBe('no-cache')
    expect(response.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1')
    expect(response.headers.get('x-trace')).toBe('trace_1')

    for await (const chunk of readUIMessageStream({ response })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([{ content: 'Hel' }, { content: 'lo' }, { finishReason: 'stop' }])
  })

  it('propagates serialization failures from fetch stream responses', async () => {
    const response = createUIMessageStreamResponse({
      stream: [undefined as unknown as Record<string, unknown>]
    })

    await expect(response.text()).rejects.toThrow('SSE data must be JSON serializable')
  })

  it('pipes AI SDK UI message stream parts to a Node-like response', async () => {
    const writes: string[] = []
    const headers: Record<string, string> = {}
    const consumed: string[] = []
    const response = {
      statusCode: 0,
      statusMessage: '',
      setHeader(name: string, value: string) {
        headers[name] = value
      },
      write(chunk: string) {
        writes.push(chunk)
        return true
      },
      end(chunk?: string) {
        if (chunk) writes.push(chunk)
      }
    }

    await pipeUIMessageStreamToResponse({
      response,
      status: 201,
      statusText: 'Created',
      headers: { 'X-Trace': 'trace_2' },
      stream: (async function* () {
        yield { type: 'start', messageId: 'msg_1' }
        yield { type: 'text-delta', delta: 'done' }
      })(),
      async consumeSseStream({ stream }) {
        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            consumed.push(value)
          }
        } finally {
          reader.releaseLock()
        }
      }
    })

    expect(response.statusCode).toBe(201)
    expect(response.statusMessage).toBe('Created')
    expect(headers).toMatchObject({
      'cache-control': 'no-cache',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-trace': 'trace_2',
      'x-vercel-ai-ui-message-stream': 'v1'
    })
    expect(writes.join('')).toBe(
      'data: {"type":"start","messageId":"msg_1"}\n\ndata: {"type":"text-delta","delta":"done"}\n\ndata: [DONE]\n\n'
    )
    expect(consumed.join('')).toBe(writes.join(''))
  })

  it('supports writeHead without status text', async () => {
    const headersSeen: Record<string, string>[] = []
    const writes: string[] = []
    const response = {
      writeHead(
        status: number,
        statusTextOrHeaders?: string | Record<string, string>,
        headers?: Record<string, string>
      ) {
        headersSeen.push({
          status: String(status),
          ...(typeof statusTextOrHeaders === 'object' ? statusTextOrHeaders : {}),
          ...(headers ?? {})
        })
      },
      write(chunk: string) {
        writes.push(chunk)
      },
      end() {
        writes.push('END')
      }
    }

    await pipeUIMessageStreamToResponse({
      response,
      status: 204,
      includeDone: false,
      stream: []
    })

    expect(headersSeen[0]).toMatchObject({
      status: '204',
      'content-type': 'text/event-stream; charset=utf-8'
    })
    expect(writes).toEqual(['END'])
  })

  it('ends the response and rethrows when piping fails', async () => {
    const writes: string[] = []
    const response = {
      write() {
        throw new Error('write failed')
      },
      end() {
        writes.push('END')
      }
    }

    await expect(
      pipeUIMessageStreamToResponse({
        response,
        stream: [{ type: 'text-delta', delta: 'fail' }]
      })
    ).rejects.toThrow('write failed')
    expect(writes).toEqual(['END'])
  })

  it('supports writeHead and backpressure when piping to a Node-like response', async () => {
    const headersSeen: Record<string, string>[] = []
    const writes: string[] = []
    let drain: (() => void) | undefined
    const response = {
      writeHead(
        status: number,
        statusTextOrHeaders?: string | Record<string, string>,
        headers?: Record<string, string>
      ) {
        headersSeen.push({
          status: String(status),
          ...(typeof statusTextOrHeaders === 'string' ? { statusText: statusTextOrHeaders } : {}),
          ...(typeof statusTextOrHeaders === 'object' ? statusTextOrHeaders : {}),
          ...(headers ?? {})
        })
      },
      write(chunk: string) {
        writes.push(chunk)
        queueMicrotask(() => drain?.())
        return false
      },
      once(event: 'drain', listener: () => void) {
        if (event === 'drain') drain = listener
      },
      end() {
        writes.push('END')
      }
    }

    await pipeUIMessageStreamToResponse({
      response,
      status: 202,
      statusText: 'Accepted',
      includeDone: false,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'text-delta', delta: 'queued' })
          controller.close()
        }
      })
    })

    expect(headersSeen[0]).toMatchObject({
      status: '202',
      statusText: 'Accepted',
      'content-type': 'text/event-stream; charset=utf-8'
    })
    expect(writes).toEqual(['data: {"type":"text-delta","delta":"queued"}\n\n', 'END'])
  })

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
