import { describe, expect, it } from 'vitest'
import {
  agentEventToChatChunk,
  agentEventToUIMessageStreamPart,
  readAgentEventStream
} from '../src/utils/agentEvents'
import { createUIMessageStreamResponse, readUIMessageStream } from '../src/utils/stream'
import type { AgentEvent } from '../src/utils/agentEvents'

describe('agent event adapters', () => {
  it('maps agent content, progress, source, file, finish, and error events to chat chunks', () => {
    expect(
      agentEventToChatChunk({ type: 'message-delta', messageId: 'msg_1', delta: 'Hello' })
    ).toEqual({
      messageId: 'msg_1',
      content: 'Hello'
    })

    expect(
      agentEventToChatChunk(
        {
          type: 'progress',
          id: 'step_1',
          label: 'Searching',
          value: 0.5,
          data: { query: 'vue' }
        },
        { progressDataType: 'data-agent-status' }
      )
    ).toEqual({
      data: { id: 'step_1', label: 'Searching', value: 0.5, data: { query: 'vue' } },
      dataType: 'data-agent-status',
      dataId: 'step_1',
      parts: [
        {
          type: 'data-agent-status',
          id: 'step_1',
          data: { id: 'step_1', label: 'Searching', value: 0.5, data: { query: 'vue' } }
        }
      ]
    })

    expect(
      agentEventToChatChunk({
        type: 'source',
        id: 'source_1',
        url: 'https://example.test/docs',
        title: 'Docs'
      })
    ).toEqual({
      data: { url: 'https://example.test/docs', title: 'Docs' },
      dataType: 'source-url',
      dataId: 'source_1',
      parts: [
        {
          type: 'source',
          id: 'source_1',
          sourceType: 'url',
          url: 'https://example.test/docs',
          title: 'Docs',
          data: { url: 'https://example.test/docs', title: 'Docs' }
        }
      ]
    })

    expect(
      agentEventToChatChunk({
        type: 'file',
        id: 'file_1',
        url: 'https://example.test/report.pdf',
        mediaType: 'application/pdf',
        name: 'report.pdf'
      })
    ).toEqual({
      data: {
        url: 'https://example.test/report.pdf',
        mediaType: 'application/pdf',
        name: 'report.pdf'
      },
      dataType: 'file',
      dataId: 'file_1',
      parts: [
        {
          type: 'file',
          id: 'file_1',
          url: 'https://example.test/report.pdf',
          mediaType: 'application/pdf',
          name: 'report.pdf',
          data: {
            url: 'https://example.test/report.pdf',
            mediaType: 'application/pdf',
            name: 'report.pdf'
          }
        }
      ]
    })

    expect(
      agentEventToChatChunk({
        type: 'finish',
        usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
        metadata: { model: 'agent-test' }
      })
    ).toEqual({
      finishReason: 'stop',
      usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
      metadata: { model: 'agent-test' }
    })

    expect(
      agentEventToChatChunk(
        { type: 'error', errorText: 'tool denied', metadata: { code: 'DENIED' } },
        { errorDataType: 'data-agent-warning' }
      )
    ).toEqual({
      data: { errorText: 'tool denied', metadata: { code: 'DENIED' } },
      dataType: 'data-agent-warning',
      parts: [
        {
          type: 'data-agent-warning',
          data: { errorText: 'tool denied', metadata: { code: 'DENIED' } }
        }
      ]
    })
  })

  it('maps agent tool events to tool-call chunks and structured parts', () => {
    expect(
      agentEventToChatChunk({
        type: 'tool-call',
        id: 'call_1',
        name: 'lookup',
        input: { q: 'vue' }
      })
    ).toEqual({
      toolCalls: [
        {
          index: 0,
          id: 'call_1',
          type: 'function',
          function: { name: 'lookup', arguments: '{"q":"vue"}' }
        }
      ],
      parts: [
        {
          type: 'tool-lookup',
          toolCallId: 'call_1',
          toolName: 'lookup',
          state: 'input-available',
          input: { q: 'vue' },
          inputText: '{"q":"vue"}'
        }
      ]
    })

    expect(
      agentEventToChatChunk({
        type: 'tool-call',
        id: 'call_2',
        name: '',
        inputText: '{"approved":true}'
      })
    ).toEqual({
      toolCalls: [
        {
          index: 0,
          id: 'call_2',
          type: 'function',
          function: { name: '', arguments: '{"approved":true}' }
        }
      ],
      parts: [
        {
          type: 'tool-tool',
          toolCallId: 'call_2',
          toolName: '',
          state: 'input-available',
          inputText: '{"approved":true}'
        }
      ]
    })

    expect(
      agentEventToChatChunk({
        type: 'tool-result',
        id: 'call_1',
        name: 'lookup',
        output: { answer: 42 }
      })
    ).toEqual({
      data: { toolCallId: 'call_1', toolName: 'lookup', output: { answer: 42 } },
      dataType: 'tool-output-available',
      dataId: 'call_1',
      parts: [
        {
          type: 'tool-lookup',
          toolCallId: 'call_1',
          toolName: 'lookup',
          state: 'output-available',
          output: { answer: 42 }
        }
      ]
    })

    expect(
      agentEventToChatChunk({
        type: 'tool-error',
        id: 'call_1',
        name: 'lookup',
        errorText: 'failed'
      })
    ).toEqual({
      data: { toolCallId: 'call_1', toolName: 'lookup', errorText: 'failed' },
      dataType: 'tool-output-error',
      dataId: 'call_1',
      parts: [
        {
          type: 'tool-lookup',
          toolCallId: 'call_1',
          toolName: 'lookup',
          state: 'output-error',
          errorText: 'failed'
        }
      ]
    })
  })

  it('keeps minimal chat chunks compact for optional agent event fields', () => {
    expect(agentEventToChatChunk({ type: 'progress', transient: true })).toEqual({
      data: {},
      dataType: 'data-agent-progress',
      transient: true
    })
    expect(agentEventToChatChunk({ type: 'tool-call', id: 'call_empty', name: 'noop' })).toEqual({
      toolCalls: [
        {
          index: 0,
          id: 'call_empty',
          type: 'function',
          function: { name: 'noop', arguments: '' }
        }
      ],
      parts: [
        {
          type: 'tool-noop',
          toolCallId: 'call_empty',
          toolName: 'noop',
          state: 'input-available'
        }
      ]
    })
    expect(
      agentEventToChatChunk({
        type: 'tool-call',
        id: 'call_string',
        name: 'lookup',
        input: 'plain'
      })
    ).toEqual({
      toolCalls: [
        {
          index: 0,
          id: 'call_string',
          type: 'function',
          function: { name: 'lookup', arguments: 'plain' }
        }
      ],
      parts: [
        {
          type: 'tool-lookup',
          toolCallId: 'call_string',
          toolName: 'lookup',
          state: 'input-available',
          input: 'plain',
          inputText: 'plain'
        }
      ]
    })
    expect(agentEventToChatChunk({ type: 'source', url: 'https://example.test/plain' })).toEqual({
      data: { url: 'https://example.test/plain' },
      dataType: 'source-url',
      parts: [
        {
          type: 'source',
          sourceType: 'url',
          url: 'https://example.test/plain',
          data: { url: 'https://example.test/plain' }
        }
      ]
    })
    expect(agentEventToChatChunk({ type: 'file', url: 'https://example.test/plain.txt' })).toEqual({
      data: { url: 'https://example.test/plain.txt' },
      dataType: 'file',
      parts: [
        {
          type: 'file',
          url: 'https://example.test/plain.txt',
          data: { url: 'https://example.test/plain.txt' }
        }
      ]
    })
    expect(
      agentEventToChatChunk({ type: 'error', errorText: 'temporary', transient: true })
    ).toEqual({
      data: { errorText: 'temporary' },
      dataType: 'data-agent-error',
      transient: true
    })
  })

  it('maps agent events to AI SDK UI message stream parts', () => {
    const events: AgentEvent[] = [
      { type: 'message-delta', messageId: 'msg_1', delta: 'Hi' },
      { type: 'progress', id: 'step_1', label: 'Thinking', transient: true },
      { type: 'tool-call', id: 'call_1', name: 'lookup', input: { q: 'vue' } },
      { type: 'tool-result', id: 'call_1', name: 'lookup', output: { ok: true } },
      { type: 'tool-error', id: 'call_2', name: 'charge', errorText: 'declined' },
      { type: 'source', id: 'source_1', url: 'https://example.test/docs', title: 'Docs' },
      { type: 'file', id: 'file_1', url: 'https://example.test/a.txt', name: 'a.txt' },
      { type: 'finish', finishReason: 'length', metadata: { model: 'agent-test' } },
      { type: 'error', errorText: 'soft failure', transient: true }
    ]

    expect(events.map((event) => agentEventToUIMessageStreamPart(event))).toEqual([
      { type: 'text-delta', delta: 'Hi', messageId: 'msg_1' },
      {
        type: 'data-agent-progress',
        id: 'step_1',
        data: { id: 'step_1', label: 'Thinking' },
        transient: true
      },
      {
        type: 'tool-input-available',
        toolCallId: 'call_1',
        toolName: 'lookup',
        input: { q: 'vue' }
      },
      {
        type: 'tool-output-available',
        toolCallId: 'call_1',
        toolName: 'lookup',
        output: { ok: true }
      },
      {
        type: 'tool-output-error',
        toolCallId: 'call_2',
        toolName: 'charge',
        errorText: 'declined'
      },
      {
        type: 'source-url',
        sourceId: 'source_1',
        url: 'https://example.test/docs',
        title: 'Docs'
      },
      { type: 'file', url: 'https://example.test/a.txt', id: 'file_1', name: 'a.txt' },
      { type: 'finish', finishReason: 'length', messageMetadata: { model: 'agent-test' } },
      { type: 'data-agent-error', data: { errorText: 'soft failure' }, transient: true }
    ])
  })

  it('feeds UI stream responses through existing stream readers', async () => {
    const stream = [
      { type: 'message-delta', delta: 'Hel' },
      { type: 'message-delta', delta: 'lo' },
      { type: 'finish', usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } }
    ].map((event) => agentEventToUIMessageStreamPart(event as AgentEvent))
    const response = createUIMessageStreamResponse({ stream })
    const chunks = []

    for await (const chunk of readUIMessageStream({ response })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      { content: 'Hel' },
      { content: 'lo' },
      {
        finishReason: 'stop',
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 }
      }
    ])
  })

  it('reads iterable agent events as chat chunks', async () => {
    async function* events() {
      yield { type: 'message-delta', delta: 'A' } satisfies AgentEvent
      yield { type: 'finish', finishReason: 'tool_calls' } satisfies AgentEvent
    }

    const chunks = []
    for await (const chunk of readAgentEventStream({ events: events() })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([{ content: 'A' }, { finishReason: 'tool_calls' }])
  })

  it('reads readable agent event streams as chat chunks', async () => {
    const events = new ReadableStream<AgentEvent>({
      start(controller) {
        controller.enqueue({ type: 'message-delta', delta: 'R' })
        controller.close()
      }
    })
    const chunks = []

    for await (const chunk of readAgentEventStream({ events })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([{ content: 'R' }])
  })

  it('cancels readable agent event streams when the signal is already aborted', async () => {
    let cancelled = false
    const controller = new AbortController()
    controller.abort()
    const events = new ReadableStream<AgentEvent>({
      cancel() {
        cancelled = true
      }
    })
    const chunks = []

    for await (const chunk of readAgentEventStream({ events, signal: controller.signal })) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([])
    expect(cancelled).toBe(true)
  })
})
