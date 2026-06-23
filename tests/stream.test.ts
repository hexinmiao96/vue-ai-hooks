import { describe, it, expect } from 'vitest'
import { parseSSE } from '../src/utils/stream'

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
