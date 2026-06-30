import type { ChatChunk } from '../types'
import { AiHooksError } from '../types'

interface UiStreamState {
  toolIndexes: Map<string, number>
  toolArgumentDeltas: Map<string, string>
  reasoningDeltas: Map<string, string>
}

export type UIMessageStreamPart = Record<string, unknown>

export type UIMessageStreamSource =
  | Iterable<UIMessageStreamPart>
  | AsyncIterable<UIMessageStreamPart>
  | ReadableStream<UIMessageStreamPart>

export interface UIMessageStreamWriter {
  write(part: UIMessageStreamPart): void
  merge(stream: UIMessageStreamSource): Promise<void>
  error(error: unknown): void
}

export interface CreateUIMessageStreamOptions {
  execute: (writer: UIMessageStreamWriter) => void | Promise<void>
  onError?: (error: unknown) => UIMessageStreamPart | string | null | undefined
  signal?: AbortSignal
}

export interface UIMessageStreamParser {
  toChatChunks(raw: Record<string, unknown>): ChatChunk[]
}

export interface ReadUIMessageStreamOptions {
  signal?: AbortSignal
  parser?: UIMessageStreamParser
}

export interface CreateUIMessageStreamResponseOptions {
  stream: UIMessageStreamSource
  status?: number
  statusText?: string
  headers?: HeadersInit
  includeDone?: boolean
}

export interface ServerResponseLike {
  statusCode?: number
  statusMessage?: string
  setHeader?: (name: string, value: string) => void
  writeHead?: (
    statusCode: number,
    statusMessageOrHeaders?: string | Record<string, string>,
    headers?: Record<string, string>
  ) => unknown
  write: (chunk: string) => boolean | void
  end: (chunk?: string) => unknown
  once?: (event: 'drain', listener: () => void) => unknown
}

export interface PipeUIMessageStreamToResponseOptions extends CreateUIMessageStreamResponseOptions {
  response: ServerResponseLike
  consumeSseStream?: (options: { stream: ReadableStream<string> }) => void | Promise<void>
}

/**
 * Server-Sent Events (SSE) parser.
 *
 * Yields the parsed JSON payload of each `data: ...` line. Stops on
 * the canonical `[DONE]` sentinel. Skips malformed lines silently
 * (we surface errors through the chunk type, not exceptions).
 */
export async function* parseSSE(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  if (!response.body) {
    throw new Error('Response has no body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel()
        return
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      let sepIndex: number
      // SSE events are separated by a blank line (\n\n).
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)

        for (const line of rawEvent.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') return
          if (!data) continue
          try {
            yield JSON.parse(data)
          } catch {
            // Skip malformed line. Provider can put garbage in the stream
            // (e.g. comment lines, retries); we don't want to crash the hook.
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** Create a stateful decoder for AI SDK UI message stream parts. */
export function createUIMessageStreamParser(): UIMessageStreamParser {
  const state: UiStreamState = {
    toolIndexes: new Map(),
    toolArgumentDeltas: new Map(),
    reasoningDeltas: new Map()
  }

  return {
    toChatChunks(raw) {
      return decodeUIMessageStreamPart(raw, state)
    }
  }
}

/**
 * Read an AI SDK UI message stream response as provider-agnostic chat chunks.
 */
export async function* readUIMessageStream({
  response,
  signal,
  parser = createUIMessageStreamParser()
}: ReadUIMessageStreamOptions & { response: Response }): AsyncGenerator<ChatChunk> {
  for await (const raw of parseSSE(response, signal)) {
    const chunks = parser.toChatChunks(raw)
    for (const chunk of chunks) yield chunk
  }
}

/**
 * Create an AI SDK UI message stream from imperative writer callbacks.
 */
export function createUIMessageStream({
  execute,
  onError,
  signal
}: CreateUIMessageStreamOptions): ReadableStream<UIMessageStreamPart> {
  return new ReadableStream<UIMessageStreamPart>({
    async start(controller) {
      let closed = false
      const close = () => {
        if (closed) return
        closed = true
        controller.close()
      }
      const write = (part: UIMessageStreamPart) => {
        if (closed || signal?.aborted) return
        controller.enqueue(part)
      }
      const abort = () => close()
      const writer: UIMessageStreamWriter = {
        write,
        async merge(stream) {
          for await (const part of streamParts(stream)) {
            write(part)
          }
        },
        error(error) {
          const part = normalizeUIMessageStreamError(error, onError)
          if (part) write(part)
        }
      }

      if (signal?.aborted) {
        close()
        return
      }

      signal?.addEventListener('abort', abort, { once: true })
      try {
        await execute(writer)
      } catch (error) {
        writer.error(error)
      } finally {
        signal?.removeEventListener('abort', abort)
        close()
      }
    }
  })
}

/**
 * Format one value as an SSE `data:` event.
 */
export function formatSSEData(value: unknown): string {
  if (value === '[DONE]') return 'data: [DONE]\n\n'
  const payload = JSON.stringify(value)
  if (payload === undefined) {
    throw new Error('SSE data must be JSON serializable')
  }
  return `data: ${payload}\n\n`
}

/**
 * Create a Fetch API response that streams AI SDK UI message stream parts.
 */
export function createUIMessageStreamResponse({
  stream,
  status = 200,
  statusText,
  headers,
  includeDone = true
}: CreateUIMessageStreamResponseOptions): Response {
  return new Response(encodeTextStream(createSSETextStream(stream, includeDone)), {
    status,
    statusText,
    headers: uiMessageStreamHeaders(headers)
  })
}

/**
 * Pipe AI SDK UI message stream parts to a Node-like HTTP response.
 */
export async function pipeUIMessageStreamToResponse({
  response,
  stream,
  status = 200,
  statusText,
  headers,
  includeDone = true,
  consumeSseStream
}: PipeUIMessageStreamToResponseOptions): Promise<void> {
  const headerRecord = Object.fromEntries(uiMessageStreamHeaders(headers))
  writeResponseHead(response, status, statusText, headerRecord)

  const textStream = createSSETextStream(stream, includeDone)
  let responseStream = textStream
  let consumePromise: void | Promise<void> | undefined
  if (consumeSseStream) {
    const [writeStream, inspectStream] = textStream.tee()
    responseStream = writeStream
    consumePromise = consumeSseStream({ stream: inspectStream })
  }

  try {
    for await (const chunk of readTextStream(responseStream)) {
      await writeResponseChunk(response, chunk)
    }
    response.end()
    await consumePromise
  } catch (error) {
    response.end()
    throw error
  }
}

/**
 * Convert one AI SDK UI message stream part to chat chunks.
 *
 * Pass a parser from `createUIMessageStreamParser()` when decoding a multi-part
 * stream so tool-call and reasoning deltas share state across parts.
 */
export function toChatChunks(
  raw: Record<string, unknown>,
  parser = createUIMessageStreamParser()
): ChatChunk[] {
  return parser.toChatChunks(raw)
}

function createSSETextStream(
  source: UIMessageStreamSource,
  includeDone: boolean
): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      try {
        for await (const part of streamParts(source)) {
          controller.enqueue(formatSSEData(part))
        }
        if (includeDone) {
          controller.enqueue(formatSSEData('[DONE]'))
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}

async function* streamParts(source: UIMessageStreamSource): AsyncGenerator<UIMessageStreamPart> {
  if (isReadableStream(source)) {
    const reader = source.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        yield value
      }
    } finally {
      reader.releaseLock()
    }
    return
  }

  yield* source
}

function isReadableStream(
  source: UIMessageStreamSource
): source is ReadableStream<UIMessageStreamPart> {
  return typeof (source as ReadableStream<UIMessageStreamPart>).getReader === 'function'
}

function normalizeUIMessageStreamError(
  error: unknown,
  onError?: (error: unknown) => UIMessageStreamPart | string | null | undefined
): UIMessageStreamPart | null {
  const handled = onError ? onError(error) : defaultUIMessageStreamError(error)
  if (handled === null || handled === undefined) return null
  if (typeof handled === 'string') return { type: 'error', errorText: handled }
  return handled
}

function defaultUIMessageStreamError(error: unknown): UIMessageStreamPart {
  return {
    type: 'error',
    errorText: error instanceof Error ? error.message : 'UI message stream failed'
  }
}

function encodeTextStream(stream: ReadableStream<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of readTextStream(stream)) {
          controller.enqueue(encoder.encode(chunk))
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}

async function* readTextStream(stream: ReadableStream<string>): AsyncGenerator<string> {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}

function uiMessageStreamHeaders(headers?: HeadersInit): Headers {
  const next = new Headers(headers)
  if (!next.has('content-type')) {
    next.set('content-type', 'text/event-stream; charset=utf-8')
  }
  if (!next.has('cache-control')) {
    next.set('cache-control', 'no-cache')
  }
  if (!next.has('x-vercel-ai-ui-message-stream')) {
    next.set('x-vercel-ai-ui-message-stream', 'v1')
  }
  return next
}

function writeResponseHead(
  response: ServerResponseLike,
  status: number,
  statusText: string | undefined,
  headers: Record<string, string>
) {
  if (response.writeHead) {
    if (statusText) {
      response.writeHead(status, statusText, headers)
    } else {
      response.writeHead(status, headers)
    }
    return
  }

  response.statusCode = status
  if (statusText) {
    response.statusMessage = statusText
  }
  for (const [name, value] of Object.entries(headers)) {
    response.setHeader?.(name, value)
  }
}

async function writeResponseChunk(response: ServerResponseLike, chunk: string) {
  const shouldContinue = response.write(chunk)
  if (shouldContinue === false && response.once) {
    await new Promise<void>((resolve) => {
      response.once?.('drain', resolve)
    })
  }
}

function decodeUIMessageStreamPart(
  raw: Record<string, unknown>,
  state: UiStreamState
): ChatChunk[] {
  if (!isUiMessageStreamPart(raw)) return [raw as ChatChunk]

  const type = raw.type
  if (type === 'text-delta') {
    const delta = typeof raw.delta === 'string' ? raw.delta : ''
    return delta ? [{ content: delta }] : []
  }

  if (type === 'reasoning-start') {
    const id = typeof raw.id === 'string' ? raw.id : undefined
    if (id) state.reasoningDeltas.set(id, '')
    return []
  }

  if (type === 'reasoning-delta') {
    return reasoningDeltaChunk(raw, state)
  }

  if (type === 'reasoning-end') {
    const id = typeof raw.id === 'string' ? raw.id : undefined
    if (id) state.reasoningDeltas.delete(id)
    return []
  }

  if (type === 'finish') {
    return [
      {
        ...(typeof raw.finishReason === 'string'
          ? { finishReason: raw.finishReason as ChatChunk['finishReason'] }
          : {}),
        ...normalizeUsage(raw.totalUsage ?? raw.usage),
        ...messageMetadataChunk(raw)
      }
    ]
  }

  if (type === 'error') {
    throw new AiHooksError(uiErrorMessage(raw), { cause: raw })
  }

  if (type === 'tool-input-start') {
    return toolInputStartChunk(raw, state)
  }

  if (type === 'tool-input-delta') {
    return toolInputDeltaChunk(raw, state)
  }

  if (type === 'tool-input-available') {
    return toolInputAvailableChunk(raw, state)
  }

  if (
    type === 'tool-output-available' ||
    type === 'tool-output-error' ||
    type === 'source-url' ||
    type === 'source-document' ||
    type === 'file' ||
    type.startsWith('data-')
  ) {
    return [uiDataChunk(raw)]
  }

  if (type === 'start') {
    const messageId = typeof raw.messageId === 'string' && raw.messageId ? raw.messageId : undefined
    const metadata = { ...withoutMessageMetadata(raw), ...messageMetadata(raw) }
    if (messageId) return [{ messageId, metadata }]
    return raw.id || raw.messageMetadata !== undefined ? [{ metadata }] : []
  }

  if (type === 'start-step' || type === 'finish-step') {
    return raw.messageId || raw.id ? [{ metadata: { ...raw } }] : []
  }

  if (type === 'message-metadata') {
    const chunk = messageMetadataChunk(raw)
    return chunk.metadata ? [chunk] : []
  }

  return []
}

function isUiMessageStreamPart(raw: Record<string, unknown>): raw is Record<string, unknown> & {
  type: string
} {
  return typeof raw.type === 'string'
}

function normalizeUsage(raw: unknown): Pick<ChatChunk, 'usage'> {
  if (!raw || typeof raw !== 'object') return {}
  const usage = raw as Record<string, unknown>
  const promptTokens = numberValue(usage.promptTokens ?? usage.inputTokens)
  const completionTokens = numberValue(usage.completionTokens ?? usage.outputTokens)
  const totalTokens = numberValue(usage.totalTokens)
  if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) {
    return {}
  }
  return {
    usage: {
      promptTokens: promptTokens ?? 0,
      completionTokens: completionTokens ?? 0,
      totalTokens: totalTokens ?? (promptTokens ?? 0) + (completionTokens ?? 0)
    }
  }
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function messageMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  if (!('messageMetadata' in raw)) return {}
  const metadata = raw.messageMetadata
  if (metadata === undefined) return {}
  return isRecord(metadata) ? { ...metadata } : { messageMetadata: metadata }
}

function messageMetadataChunk(raw: Record<string, unknown>): Pick<ChatChunk, 'metadata'> {
  const metadata = messageMetadata(raw)
  return Object.keys(metadata).length ? { metadata } : {}
}

function withoutMessageMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  const metadata = { ...raw }
  delete metadata.messageMetadata
  return metadata
}

function uiErrorMessage(raw: Record<string, unknown>) {
  if (typeof raw.errorText === 'string') return raw.errorText
  if (typeof raw.message === 'string') return raw.message
  if (typeof raw.error === 'string') return raw.error
  return 'AI SDK UI message stream returned an error part'
}

function toolIndex(id: string, state: UiStreamState) {
  const existing = state.toolIndexes.get(id)
  if (existing !== undefined) return existing
  const next = state.toolIndexes.size
  state.toolIndexes.set(id, next)
  return next
}

function toolInputStartChunk(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  const id = typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined
  const name = typeof raw.toolName === 'string' ? raw.toolName : undefined
  if (!id || !name) return []
  state.toolArgumentDeltas.set(id, '')
  return [
    {
      toolCalls: [
        {
          index: toolIndex(id, state),
          id,
          type: 'function',
          function: { name, arguments: '' }
        }
      ]
    }
  ]
}

function reasoningDeltaChunk(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  const id = typeof raw.id === 'string' ? raw.id : undefined
  const delta = typeof raw.delta === 'string' ? raw.delta : undefined
  if (!id || !delta) return []
  const text = `${state.reasoningDeltas.get(id) ?? ''}${delta}`
  state.reasoningDeltas.set(id, text)
  return [{ parts: [{ type: 'reasoning', id, text }] }]
}

function toolInputDeltaChunk(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  const id = typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined
  const delta = typeof raw.inputTextDelta === 'string' ? raw.inputTextDelta : undefined
  if (!id || !delta) return []
  state.toolArgumentDeltas.set(id, `${state.toolArgumentDeltas.get(id) ?? ''}${delta}`)
  return [
    {
      toolCalls: [
        {
          index: toolIndex(id, state),
          id,
          type: 'function',
          function: { arguments: delta }
        }
      ]
    }
  ]
}

function toolInputAvailableChunk(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  const id = typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined
  const name = typeof raw.toolName === 'string' ? raw.toolName : undefined
  if (!id || !name) return []

  const hasDelta = Boolean(state.toolArgumentDeltas.get(id))
  const input = hasDelta ? '' : stringifyToolInput(raw.input)
  return [
    {
      toolCalls: [
        {
          index: toolIndex(id, state),
          id,
          type: 'function',
          function: { name, arguments: input }
        }
      ]
    }
  ]
}

function stringifyToolInput(value: unknown) {
  if (value === undefined) return ''
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function uiDataChunk(raw: Record<string, unknown>): ChatChunk {
  const type = raw.type as string
  const data = type.startsWith('data-')
    ? raw.data
    : Object.fromEntries(Object.entries(raw).filter(([key]) => key !== 'type'))
  return {
    data,
    dataType: type,
    ...(typeof raw.id === 'string' ? { dataId: raw.id } : {}),
    ...(typeof raw.sourceId === 'string' ? { dataId: raw.sourceId } : {}),
    ...(typeof raw.toolCallId === 'string' ? { dataId: raw.toolCallId } : {}),
    ...(typeof raw.transient === 'boolean' ? { transient: raw.transient } : {})
  }
}
