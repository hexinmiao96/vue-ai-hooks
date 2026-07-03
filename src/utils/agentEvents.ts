import type { ChatChunk, MessagePart, TokenUsage } from '../types'
import type { UIMessageStreamPart } from './stream'

export interface AgentInterruptEvent {
  type: 'interrupt'
  id?: string
  name: string
  value?: unknown
  transient?: boolean
}

export type AgentEvent =
  | {
      type: 'message-delta'
      delta: string
      messageId?: string
    }
  | {
      type: 'progress'
      id?: string
      label?: string
      value?: number
      data?: unknown
      transient?: boolean
    }
  | {
      type: 'tool-call'
      id: string
      name: string
      input?: unknown
      inputText?: string
    }
  | {
      type: 'tool-result'
      id: string
      name: string
      output?: unknown
    }
  | {
      type: 'tool-error'
      id: string
      name: string
      errorText: string
    }
  | {
      type: 'source'
      id?: string
      url: string
      title?: string
    }
  | {
      type: 'file'
      id?: string
      url: string
      mediaType?: string
      name?: string
    }
  | {
      type: 'finish'
      finishReason?: ChatChunk['finishReason']
      usage?: TokenUsage
      metadata?: Record<string, unknown>
    }
  | {
      type: 'error'
      errorText: string
      metadata?: Record<string, unknown>
      transient?: boolean
    }
  | AgentInterruptEvent

export type AgentEventSource =
  Iterable<AgentEvent> | AsyncIterable<AgentEvent> | ReadableStream<AgentEvent>

export interface AgentEventAdapterOptions {
  /** Data part type for progress events. */
  progressDataType?: `data-${string}`
  /** Data part type for interrupt events. */
  interruptDataType?: `data-${string}`
  /** Data part type for non-throwing agent error events. */
  errorDataType?: `data-${string}`
}

export interface ReadAgentEventStreamOptions extends AgentEventAdapterOptions {
  events: AgentEventSource
  signal?: AbortSignal
}

const defaultProgressDataType = 'data-agent-progress'
const defaultInterruptDataType = 'data-agent-interrupt'
const defaultErrorDataType = 'data-agent-error'

/** Convert one lightweight agent event into a normalized chat chunk. */
export function agentEventToChatChunk(
  event: AgentEvent,
  options: AgentEventAdapterOptions = {}
): ChatChunk {
  if (event.type === 'message-delta') {
    return {
      ...(event.messageId ? { messageId: event.messageId } : {}),
      content: event.delta
    }
  }

  if (event.type === 'progress') {
    const dataType = options.progressDataType ?? defaultProgressDataType
    const data = progressPayload(event)
    return {
      data,
      dataType,
      ...(event.id ? { dataId: event.id } : {}),
      ...(event.transient !== undefined ? { transient: event.transient } : {}),
      ...(event.transient ? {} : { parts: [dataMessagePart(dataType, event.id, data)] })
    }
  }

  if (event.type === 'tool-call') {
    const inputText = toolInputText(event)
    return {
      toolCalls: [
        {
          index: 0,
          id: event.id,
          type: 'function',
          function: { name: event.name, arguments: inputText ?? '' }
        }
      ],
      parts: [toolCallPart(event, inputText)]
    }
  }

  if (event.type === 'tool-result') {
    return toolOutputChunk(event, {
      state: 'output-available',
      dataType: 'tool-output-available',
      data: { toolCallId: event.id, toolName: event.name, output: event.output },
      part: {
        type: toolPartType(event.name),
        toolCallId: event.id,
        toolName: event.name,
        state: 'output-available',
        output: event.output
      }
    })
  }

  if (event.type === 'tool-error') {
    return toolOutputChunk(event, {
      state: 'output-error',
      dataType: 'tool-output-error',
      data: { toolCallId: event.id, toolName: event.name, errorText: event.errorText },
      part: {
        type: toolPartType(event.name),
        toolCallId: event.id,
        toolName: event.name,
        state: 'output-error',
        errorText: event.errorText
      }
    })
  }

  if (event.type === 'source') {
    const data = {
      url: event.url,
      ...(event.title ? { title: event.title } : {})
    }
    return {
      data,
      dataType: 'source-url',
      ...(event.id ? { dataId: event.id } : {}),
      parts: [
        {
          type: 'source',
          ...(event.id ? { id: event.id } : {}),
          sourceType: 'url',
          url: event.url,
          ...(event.title ? { title: event.title } : {}),
          data
        }
      ]
    }
  }

  if (event.type === 'file') {
    const data = {
      url: event.url,
      ...(event.mediaType ? { mediaType: event.mediaType } : {}),
      ...(event.name ? { name: event.name } : {})
    }
    return {
      data,
      dataType: 'file',
      ...(event.id ? { dataId: event.id } : {}),
      parts: [
        {
          type: 'file',
          ...(event.id ? { id: event.id } : {}),
          url: event.url,
          ...(event.mediaType ? { mediaType: event.mediaType } : {}),
          ...(event.name ? { name: event.name } : {}),
          data
        }
      ]
    }
  }

  if (event.type === 'finish') {
    return {
      finishReason: event.finishReason ?? 'stop',
      ...(event.usage ? { usage: event.usage } : {}),
      ...(event.metadata ? { metadata: event.metadata } : {})
    }
  }

  if (event.type === 'interrupt') {
    const dataType = options.interruptDataType ?? defaultInterruptDataType
    const data = interruptPayload(event)
    return {
      data,
      dataType,
      ...(event.id ? { dataId: event.id } : {}),
      ...(event.transient !== undefined ? { transient: event.transient } : {}),
      ...(event.transient ? {} : { parts: [dataMessagePart(dataType, event.id, data)] })
    }
  }

  const dataType = options.errorDataType ?? defaultErrorDataType
  const data = {
    errorText: event.errorText,
    ...(event.metadata ? { metadata: event.metadata } : {})
  }
  return {
    data,
    dataType,
    ...(event.transient !== undefined ? { transient: event.transient } : {}),
    ...(event.transient ? {} : { parts: [dataMessagePart(dataType, undefined, data)] })
  }
}

/** Convert one lightweight agent event into an AI SDK UI message stream part. */
export function agentEventToUIMessageStreamPart(
  event: AgentEvent,
  options: AgentEventAdapterOptions = {}
): UIMessageStreamPart {
  if (event.type === 'message-delta') {
    return {
      type: 'text-delta',
      delta: event.delta,
      ...(event.messageId ? { messageId: event.messageId } : {})
    }
  }

  if (event.type === 'progress') {
    return {
      type: options.progressDataType ?? defaultProgressDataType,
      data: progressPayload(event),
      ...(event.id ? { id: event.id } : {}),
      ...(event.transient !== undefined ? { transient: event.transient } : {})
    }
  }

  if (event.type === 'tool-call') {
    return {
      type: 'tool-input-available',
      toolCallId: event.id,
      toolName: event.name,
      input: event.input ?? event.inputText
    }
  }

  if (event.type === 'tool-result') {
    return {
      type: 'tool-output-available',
      toolCallId: event.id,
      toolName: event.name,
      output: event.output
    }
  }

  if (event.type === 'tool-error') {
    return {
      type: 'tool-output-error',
      toolCallId: event.id,
      toolName: event.name,
      errorText: event.errorText
    }
  }

  if (event.type === 'source') {
    return {
      type: 'source-url',
      url: event.url,
      ...(event.id ? { sourceId: event.id } : {}),
      ...(event.title ? { title: event.title } : {})
    }
  }

  if (event.type === 'file') {
    return {
      type: 'file',
      url: event.url,
      ...(event.id ? { id: event.id } : {}),
      ...(event.mediaType ? { mediaType: event.mediaType } : {}),
      ...(event.name ? { name: event.name } : {})
    }
  }

  if (event.type === 'finish') {
    return {
      type: 'finish',
      finishReason: event.finishReason ?? 'stop',
      ...(event.usage ? { usage: event.usage } : {}),
      ...(event.metadata ? { messageMetadata: event.metadata } : {})
    }
  }

  if (event.type === 'interrupt') {
    return {
      type: options.interruptDataType ?? defaultInterruptDataType,
      data: interruptPayload(event),
      ...(event.id ? { id: event.id } : {}),
      ...(event.transient !== undefined ? { transient: event.transient } : {})
    }
  }

  return {
    type: options.errorDataType ?? defaultErrorDataType,
    data: {
      errorText: event.errorText,
      ...(event.metadata ? { metadata: event.metadata } : {})
    },
    ...(event.transient !== undefined ? { transient: event.transient } : {})
  }
}

/** Read raw lightweight agent events from an iterable, async iterable, or stream. */
export async function* readAgentEvents(
  events: AgentEventSource,
  signal?: AbortSignal
): AsyncGenerator<AgentEvent> {
  yield* agentEvents(events, signal)
}

/** Read an iterable or stream of lightweight agent events as normalized chat chunks. */
export async function* readAgentEventStream({
  events,
  signal,
  ...options
}: ReadAgentEventStreamOptions): AsyncGenerator<ChatChunk> {
  for await (const event of agentEvents(events, signal)) {
    yield agentEventToChatChunk(event, options)
  }
}

async function* agentEvents(
  source: AgentEventSource,
  signal?: AbortSignal
): AsyncGenerator<AgentEvent> {
  if (isReadableStream(source)) {
    const reader = source.getReader()
    try {
      while (true) {
        if (signal?.aborted) {
          await reader.cancel()
          return
        }
        const { done, value } = await reader.read()
        if (done) break
        yield value
      }
    } finally {
      reader.releaseLock()
    }
    return
  }

  for await (const event of source) {
    if (signal?.aborted) return
    yield event
  }
}

function isReadableStream(source: AgentEventSource): source is ReadableStream<AgentEvent> {
  return typeof (source as ReadableStream<AgentEvent>).getReader === 'function'
}

function progressPayload(event: Extract<AgentEvent, { type: 'progress' }>) {
  return {
    ...(event.id ? { id: event.id } : {}),
    ...(event.label ? { label: event.label } : {}),
    ...(typeof event.value === 'number' ? { value: event.value } : {}),
    ...(event.data === undefined ? {} : { data: event.data })
  }
}

function interruptPayload(event: AgentInterruptEvent) {
  return {
    ...(event.id ? { id: event.id } : {}),
    name: event.name,
    ...(event.value === undefined ? {} : { value: event.value })
  }
}

function toolInputText(event: Extract<AgentEvent, { type: 'tool-call' }>) {
  if (typeof event.inputText === 'string') return event.inputText
  if (event.input === undefined) return undefined
  return typeof event.input === 'string' ? event.input : JSON.stringify(event.input)
}

function toolPartType(name: string): `tool-${string}` {
  return `tool-${name || 'tool'}`
}

function toolCallPart(
  event: Extract<AgentEvent, { type: 'tool-call' }>,
  inputText: string | undefined
): MessagePart {
  return {
    type: toolPartType(event.name),
    toolCallId: event.id,
    toolName: event.name,
    state: 'input-available',
    ...(event.input === undefined ? {} : { input: event.input }),
    ...(inputText === undefined ? {} : { inputText })
  }
}

function toolOutputChunk(
  event: Extract<AgentEvent, { type: 'tool-result' | 'tool-error' }>,
  output: {
    state: 'output-available' | 'output-error'
    dataType: 'tool-output-available' | 'tool-output-error'
    data: unknown
    part: MessagePart
  }
): ChatChunk {
  return {
    data: output.data,
    dataType: output.dataType,
    dataId: event.id,
    parts: [output.part]
  }
}

function dataMessagePart(
  type: `data-${string}`,
  id: string | undefined,
  data: unknown
): MessagePart {
  return {
    type,
    ...(id ? { id } : {}),
    data
  }
}
