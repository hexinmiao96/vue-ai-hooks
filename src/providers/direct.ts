import type {
  ChatChunk,
  ChatRequest,
  ChatResumeRequest,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult
} from '../types'
import { AiHooksError } from '../types'
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  readUIMessageStream,
  type CreateUIMessageStreamOptions,
  type UIMessageStreamSource
} from '../utils/stream'
import type { ChatProvider } from './types'

/** Selects the wire format returned by an in-process chat handler. */
export type DirectChatStreamProtocol = 'ui-message' | 'chat-chunk'

type DirectChatChunkSource = Iterable<ChatChunk> | AsyncIterable<ChatChunk>

type DirectChatStreamSource = UIMessageStreamSource | DirectChatChunkSource

type DirectChatStreamHandler = (
  request: ChatRequest
) => DirectChatStreamSource | Promise<DirectChatStreamSource>

type DirectChatResumeHandler = (
  request: ChatResumeRequest
) => DirectChatStreamSource | null | Promise<DirectChatStreamSource | null>

/** Configures an in-process chat transport. */
export interface DirectChatTransportOptions {
  /** Sets the stable provider ID shown in request traces. */
  id?: string
  /** Provides an in-process handler that returns AI SDK UI message parts by default. */
  stream: DirectChatStreamHandler
  /** Provides an optional stream handler used by `useChat().resumeStream()`. */
  resumeStream?: DirectChatResumeHandler
  /** Maps thrown UI-message stream errors into an AI SDK UI error part. */
  onError?: CreateUIMessageStreamOptions['onError']
  /** Uses `chat-chunk` when the handler already returns `ChatChunk` values. */
  streamProtocol?: DirectChatStreamProtocol
}

/**
 * Runs chat handlers in-process for local agents, tests, and demo-only providers.
 *
 * Completion and embedding operations are unsupported and reject with `AiHooksError`.
 */
export class DirectChatTransport implements ChatProvider {
  declare readonly id: string

  declare private readonly s: DirectChatStreamHandler
  declare private readonly r?: DirectChatResumeHandler
  declare private readonly e?: CreateUIMessageStreamOptions['onError']
  declare private readonly p?: DirectChatStreamProtocol

  constructor(options: DirectChatTransportOptions) {
    this.id = options.id ?? 'direct'
    this.s = options.stream
    this.r = options.resumeStream
    this.e = options.onError
    this.p = options.streamProtocol
  }

  async chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>> {
    if (this.p === 'chat-chunk') {
      const source = await this.s(request)
      return readChatChunkStream(source as DirectChatChunkSource, request.signal)
    }

    return this.c(() => this.s(request), request.signal)
  }

  async resumeChat(request: ChatResumeRequest): Promise<AsyncIterable<ChatChunk> | null> {
    if (!this.r) return null

    const source = await this.r(request)
    if (!source) return null
    if (this.p === 'chat-chunk')
      return readChatChunkStream(source as DirectChatChunkSource, request.signal)
    return this.c(() => source, request.signal)
  }

  completion(request: CompletionRequest): Promise<AsyncIterable<string>>
  async completion(): Promise<AsyncIterable<string>> {
    throw new AiHooksError('Chat')
  }

  embedding(request: EmbeddingRequest): Promise<EmbeddingResult>
  async embedding(): Promise<EmbeddingResult> {
    throw new AiHooksError('Chat')
  }

  private c(
    source: () => DirectChatStreamSource | Promise<DirectChatStreamSource>,
    signal?: AbortSignal
  ): AsyncIterable<ChatChunk> {
    return readUIMessageStream({
      response: createUIMessageStreamResponse({
        stream: createUIMessageStream({
          signal,
          onError: this.e,
          async execute({ merge }) {
            return merge((await source()) as UIMessageStreamSource)
          }
        })
      }),
      signal
    })
  }
}

function readChatChunkStream(
  source: DirectChatChunkSource,
  signal?: AbortSignal
): AsyncIterable<ChatChunk> {
  return (async function* () {
    for await (const chunk of source) {
      if (signal?.aborted) break
      yield chunk
    }
  })()
}
