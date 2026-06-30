/**
 * Public types for vue-ai-hooks.
 *
 * Designed to be provider-agnostic. Provider-specific types live in
 * `src/providers/*` and are mapped to these by the provider adapters.
 */

/** Role of a message participant. */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/** A text part of a multimodal message. */
export interface TextPart {
  type: 'text'
  text: string
}

/** An image part of a multimodal message. `url` may be an https URL or a data: URL. */
export interface ImageUrlPart {
  type: 'image_url'
  image_url: { url: string; detail?: 'low' | 'high' | 'auto' }
}

/** One piece of a multimodal message. */
export type ContentPart = TextPart | ImageUrlPart

/** Content can be plain text (the common case) or a list of content parts. */
export type MessageContent = string | ContentPart[]

export interface MessageTextPart {
  type: 'text'
  text: string
  id?: string
}

export interface MessageReasoningPart {
  type: 'reasoning'
  text: string
  id?: string
}

export interface MessageSourcePart {
  type: 'source'
  id?: string
  sourceType?: 'url' | 'document'
  url?: string
  title?: string
  mediaType?: string
  data?: unknown
}

export interface MessageFilePart {
  type: 'file'
  id?: string
  url: string
  mediaType?: string
  name?: string
  data?: unknown
}

export interface MessageDataPart {
  type: 'data' | `data-${string}`
  id?: string
  data: unknown
  transient?: boolean
}

export interface MessageToolPart {
  type: `tool-${string}`
  toolCallId: string
  toolName: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: unknown
  inputText?: string
  output?: unknown
  errorText?: string
}

/** Structured UI part for rendering modern chat messages. */
export type MessagePart =
  | MessageTextPart
  | MessageReasoningPart
  | MessageSourcePart
  | MessageFilePart
  | MessageDataPart
  | MessageToolPart

/** A preloaded file attachment that `useChat().append()` can convert into message content. */
export interface ChatFileAttachment {
  /** File display name, used as a label for text attachments. */
  name?: string
  /** MIME type such as `image/png` or `text/plain`. */
  type: string
  /** Remote, blob, or data URL for image attachments. */
  url?: string
  /** Already-read text content for text attachments. */
  text?: string
}

/** Browser or preloaded file input that `useChat().append()` can convert. */
export type ChatAttachmentInput = File | ChatFileAttachment

/** File input accepted by `append(..., { attachments })`. */
export type ChatAttachmentsInput = FileList | readonly ChatAttachmentInput[]

/** A function/tool the model may call. OpenAI-compatible schema. */
export interface Tool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown> // JSON Schema
    strict?: boolean
  }
}

/** A tool call emitted by the model. */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** A single chat message. */
export interface Message {
  id: string
  role: MessageRole
  content: MessageContent
  name?: string
  toolCallId?: string
  toolCalls?: ToolCall[]
  parts?: MessagePart[]
  createdAt?: Date
  /** Provider-specific metadata. Useful for OpenAI's `logprobs` etc. */
  metadata?: Record<string, unknown>
}

/** A provider/model-facing message without UI-only rendering parts. */
export interface ModelMessage {
  role: MessageRole
  content: MessageContent
  name?: string
  toolCallId?: string
  toolCalls?: ToolCall[]
  metadata?: Record<string, unknown>
  id?: string
  createdAt?: Date
}

/** Message shape accepted by provider and proxy chat requests. */
export type ChatRequestMessage = Message | ModelMessage

/** JSON response format controls for providers that support structured output. */
export type ResponseFormat =
  | { type: 'json_object' }
  | {
      type: 'json_schema'
      json_schema: {
        name: string
        description?: string
        schema: Record<string, unknown>
        strict?: boolean
      }
    }

/** Token usage normalized across provider adapters. */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type AiRequestStatus = 'ready' | 'submitted' | 'streaming' | 'error'

/** Override automatic chat, message, tool, and stream data id generation. */
export type IdGenerator = (prefix?: string) => string

export interface CreateIdGeneratorOptions {
  prefix?: string
  separator?: string
  size?: number
  alphabet?: string
}

const defaultIdAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Create a dependency-free ID generator for SSR, persistence, tests, and trace fields.
 */
export function createIdGenerator({
  prefix,
  separator = '-',
  size = 16,
  alphabet = defaultIdAlphabet
}: CreateIdGeneratorOptions = {}): IdGenerator {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('createIdGenerator() size must be a positive integer')
  }
  if (!alphabet) {
    throw new Error('createIdGenerator() alphabet must not be empty')
  }
  if (prefix !== undefined && alphabet.includes(separator)) {
    throw new Error('createIdGenerator() separator must not be part of the alphabet')
  }

  const createRandomPart = () => {
    let id = ''
    for (let index = 0; index < size; index += 1) {
      id += alphabet[(Math.random() * alphabet.length) | 0]
    }
    return id
  }

  return (runtimePrefix?: string) => {
    const id = createRandomPart()
    const resolvedPrefix = prefix ?? runtimePrefix
    return resolvedPrefix ? `${resolvedPrefix}${separator}${id}` : id
  }
}

/** Generate a random ID. Pass a prefix to namespace the generated value. */
export const generateId = createIdGenerator()

/** A custom data item emitted alongside a streaming assistant response. */
export interface StreamDataPart<TData = unknown> {
  id: string
  data: TData
  type?: string
  transient?: boolean
  createdAt?: Date
}

/** Request payload for a chat completion. */
export interface ChatRequest {
  id?: string
  /** Backend thread/session identifier that can differ from client-side shared state id. */
  threadId?: string
  messages: ChatRequestMessage[]
  /** App-defined props forwarded to proxy/agent backends. */
  forwardedProps?: Record<string, unknown>
  /** Extra JSON body fields for provider/proxy-specific request options. */
  body?: Record<string, unknown>
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string | string[]
  tools?: Tool[]
  /** Filter the resolved tool list by function name before sending the provider request. */
  activeTools?: string[]
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
  responseFormat?: ResponseFormat
  metadata?: unknown
  user?: string
  stream?: boolean
  signal?: AbortSignal
  headers?: HeadersInit
}

/** Request payload for resuming an active chat stream. */
export interface ChatResumeRequest {
  id: string
  /** Backend thread/session identifier that can differ from client-side shared state id. */
  threadId?: string
  /** App-defined props forwarded to proxy/agent backends. */
  forwardedProps?: Record<string, unknown>
  /** Extra JSON body fields for provider/proxy-specific resume options. */
  body?: Record<string, unknown>
  metadata?: unknown
  signal?: AbortSignal
  headers?: HeadersInit
}

/** A single delta in a streaming chat response. */
export interface ChatChunk {
  /** Server-provided id for the current assistant message. */
  messageId?: string
  /** Text delta for the assistant message. */
  content?: string
  /** Tool call deltas. */
  toolCalls?: Array<{
    index: number
    id?: string
    type?: 'function'
    function?: {
      name?: string
      arguments?: string
    }
  }>
  /** Why the model stopped, if this is the final chunk. */
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null
  /** Token usage, typically only present on the final chunk. */
  usage?: TokenUsage
  /** Extra metadata merged into the current assistant message. */
  metadata?: Record<string, unknown>
  /** Custom stream data such as sources, progress, or citations. */
  data?: unknown
  /** Structured message parts to merge into the assistant message. */
  parts?: MessagePart[]
  /** Stable id used to replace a previous custom data part. */
  dataId?: string
  /** Optional custom data kind, for example `source` or `progress`. */
  dataType?: string
  /** Fire `onData` without storing the part in `streamData`. */
  transient?: boolean
}

/** Request payload for a single-shot completion. */
export interface CompletionRequest {
  prompt: string
  /** Extra JSON body fields for provider/proxy-specific request options. */
  body?: Record<string, unknown>
  /** AI SDK-compatible completion stream protocol hint for app-owned proxy endpoints. */
  streamProtocol?: 'text' | 'data'
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string | string[]
  stream?: boolean
  signal?: AbortSignal
  headers?: HeadersInit
}

/** Request payload for embedding. */
export interface EmbeddingRequest {
  input: string | string[]
  /** Extra JSON body fields for provider/proxy-specific request options. */
  body?: Record<string, unknown>
  model?: string
  user?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export interface EmbeddingResult {
  embeddings: number[][]
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
}

export interface GeneratedImage {
  /** Public URL, blob URL, or data URL for the generated image. */
  url?: string
  /** Base64-encoded image payload when your backend returns inline image data. */
  base64?: string
  /** MIME type such as `image/png` or `image/webp`. */
  mediaType?: string
  /** Provider-revised prompt when the upstream model returns one. */
  revisedPrompt?: string
  /** Provider-specific metadata for this image. */
  metadata?: Record<string, unknown>
}

/** Request payload for image generation through an app-owned backend. */
export interface ImageGenerationRequest {
  prompt: string
  /** Extra JSON body fields for proxy-specific request options. */
  body?: Record<string, unknown>
  model?: string
  n?: number
  size?: string
  aspectRatio?: string
  seed?: number
  providerOptions?: Record<string, unknown>
  user?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export interface ImageGenerationResult {
  image?: GeneratedImage
  images: GeneratedImage[]
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

export interface GeneratedAudio {
  /** Public URL, blob URL, or data URL for the generated audio. */
  url?: string
  /** Base64-encoded audio payload when your backend returns inline audio data. */
  base64?: string
  /** MIME type such as `audio/mpeg`, `audio/wav`, or `audio/ogg`. */
  mediaType?: string
  /** Provider-revised text when the upstream model returns one. */
  revisedText?: string
  /** Audio duration in seconds when the backend can report it. */
  durationInSeconds?: number
  /** Provider-specific metadata for this audio output. */
  metadata?: Record<string, unknown>
}

/** Request payload for speech generation through an app-owned backend. */
export interface SpeechGenerationRequest {
  text: string
  /** Extra JSON body fields for proxy-specific request options. */
  body?: Record<string, unknown>
  model?: string
  voice?: string
  outputFormat?: string
  instructions?: string
  speed?: number
  language?: string
  providerOptions?: Record<string, unknown>
  user?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export interface SpeechGenerationResult {
  audio?: GeneratedAudio
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

export interface TranscriptionSegment {
  text: string
  start?: number
  end?: number
}

/** Request payload for transcription through an app-owned backend. */
export interface TranscriptionRequest {
  /** Audio URL, data URL, or base64 payload understood by your backend. */
  audio: string
  /** Extra JSON body fields for proxy-specific request options. */
  body?: Record<string, unknown>
  model?: string
  language?: string
  prompt?: string
  temperature?: number
  timestampGranularities?: Array<'word' | 'segment'>
  providerOptions?: Record<string, unknown>
  user?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export interface TranscriptionResult {
  text: string
  segments?: TranscriptionSegment[]
  language?: string
  durationInSeconds?: number
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

export type RerankDocument = string | Record<string, unknown>

export interface RerankRankingItem<TDocument = RerankDocument> {
  index: number
  score: number
  document: TDocument
}

/** Request payload for document reranking through an app-owned backend. */
export interface RerankRequest<TDocument = RerankDocument> {
  query: string
  documents: TDocument[]
  /** Extra JSON body fields for proxy-specific request options. */
  body?: Record<string, unknown>
  model?: string
  topN?: number
  providerOptions?: Record<string, unknown>
  user?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export interface RerankResult<TDocument = RerankDocument> {
  originalDocuments: TDocument[]
  rerankedDocuments: TDocument[]
  ranking: Array<RerankRankingItem<TDocument>>
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

export interface RetryContext {
  /** 1-based retry attempt number. */
  attempt: number
  /** Maximum retry attempts configured for this call. */
  maxRetries: number
  /** Error that caused this retry attempt. */
  error: Error
}

export interface RetryOptions {
  /** Number of retry attempts after the initial provider call fails. Defaults to 0. */
  maxRetries?: number
  /** Delay before each retry in milliseconds. Defaults to 0. */
  retryDelayMs?: number | ((context: RetryContext) => number)
  /** Return false to stop retrying a specific error. */
  shouldRetry?: (error: Error, context: RetryContext) => boolean | Promise<boolean>
  /** Called immediately before waiting and retrying. */
  onRetry?: (error: Error, context: RetryContext) => void
}

export interface StreamThrottleOptions {
  /** Minimum wait in milliseconds between reactive stream updates. Defaults to no throttling. */
  throttleMs?: number
  /** Compatibility alias for AI SDK style throttling. Prefer throttleMs in new code. */
  experimental_throttle?: number
}

/** Common error thrown by composables. */
export class AiHooksError extends Error {
  readonly cause?: unknown
  readonly status?: number

  constructor(message: string, options: { cause?: unknown; status?: number } = {}) {
    super(message)
    this.name = 'AiHooksError'
    this.cause = options.cause
    this.status = options.status
  }
}
