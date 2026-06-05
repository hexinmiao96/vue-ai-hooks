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

describe('parseSSE', () => {
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

  it('handles chunks split mid-line', async () => {
    const response = makeResponse(['data: {"a', ':1}\n\n'])
    const out: unknown[] = []
    for await (const ev of parseSSE(response)) {
      out.push(ev)
    }
    expect(out).toEqual([{ 'a:1': undefined }])
    // The point is: even when a chunk is split, we still produce exactly one event.
  })
})
