/**
 * This module defines provider-agnostic public contracts for vue-ai-hooks.
 *
 * Provider adapters map vendor-specific wire formats to these shared types.
 */

/** Identifies a message participant's role. */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/** Represents text in a multimodal message. */
export interface TextPart {
  type: 'text'
  text: string
}

/** Represents an image whose URL may use HTTPS or the `data:` scheme. */
export interface ImageUrlPart {
  type: 'image_url'
  image_url: { url: string; detail?: 'low' | 'high' | 'auto' }
}

/** Represents a supported multimodal message content part. */
export type ContentPart = TextPart | ImageUrlPart

/** Represents plain text or an ordered list of multimodal content parts. */
export type MessageContent = string | ContentPart[]

/** Represents renderable text in a structured UI message. */
export interface MessageTextPart {
  type: 'text'
  text: string
  id?: string
}

/** Represents renderable model reasoning in a structured UI message. */
export interface MessageReasoningPart {
  type: 'reasoning'
  text: string
  id?: string
}

/** Represents a source citation attached to a structured UI message. */
export interface MessageSourcePart {
  type: 'source'
  id?: string
  sourceType?: 'url' | 'document'
  url?: string
  title?: string
  mediaType?: string
  data?: unknown
}

/** Represents a file reference attached to a structured UI message. */
export interface MessageFilePart {
  type: 'file'
  id?: string
  url: string
  mediaType?: string
  name?: string
  data?: unknown
}

/** Represents application-defined data attached to a structured UI message. */
export interface MessageDataPart {
  type: 'data' | `data-${string}`
  id?: string
  data: unknown
  transient?: boolean
}

/** Represents tool lifecycle state attached to a structured UI message. */
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

/** Maps application data names to payload types used by UI message parts. */
export type UIDataTypes = Record<string, unknown>

/** Maps tool names to input and output contracts used by UI message parts. */
export type UITools = Record<string, { input: unknown; output: unknown }>

type UIStringKey<T> = Extract<keyof T, string>

type UIDataValue<TDataTypes extends UIDataTypes> =
  UIStringKey<TDataTypes> extends never ? unknown : TDataTypes[UIStringKey<TDataTypes>]

type UIToolInput<
  TTools extends UITools,
  TName extends UIStringKey<TTools>
> = TTools[TName] extends { input: infer TInput } ? TInput : unknown

type UIToolOutput<
  TTools extends UITools,
  TName extends UIStringKey<TTools>
> = TTools[TName] extends { output: infer TOutput } ? TOutput : unknown

/** Represents a typed application-data part in an AI SDK-compatible UI message. */
export type UIMessageDataPart<TDataTypes extends UIDataTypes = UIDataTypes> =
  | {
      type: 'data'
      id?: string
      data: UIDataValue<TDataTypes>
      transient?: boolean
    }
  | {
      [TName in UIStringKey<TDataTypes>]: {
        type: `data-${TName}`
        id?: string
        data: TDataTypes[TName]
        transient?: boolean
      }
    }[UIStringKey<TDataTypes>]

/** Represents a typed tool lifecycle part in an AI SDK-compatible UI message. */
export type UIMessageToolPart<TTools extends UITools = UITools> = {
  [TName in UIStringKey<TTools>]: {
    type: `tool-${TName}`
    toolCallId: string
    toolName: TName
    state: MessageToolPart['state']
    input?: UIToolInput<TTools, TName>
    inputText?: string
    output?: UIToolOutput<TTools, TName>
    errorText?: string
  }
}[UIStringKey<TTools>]

/** Represents a structured part for rendering modern chat messages. */
export type MessagePart =
  | MessageTextPart
  | MessageReasoningPart
  | MessageSourcePart
  | MessageFilePart
  | MessageDataPart
  | MessageToolPart

/** Represents a structured UI message part parameterized by data and tool contracts. */
export type UIMessagePart<
  TDataTypes extends UIDataTypes = UIDataTypes,
  TTools extends UITools = UITools
> =
  | MessageTextPart
  | MessageReasoningPart
  | MessageSourcePart
  | MessageFilePart
  | UIMessageDataPart<TDataTypes>
  | UIMessageToolPart<TTools>

/** Describes a preloaded attachment that `useChat().append()` can convert into message content. */
export interface ChatFileAttachment {
  /** Provides the display name used to label a text attachment. */
  name?: string
  /** Specifies a MIME type such as `image/png` or `text/plain`. */
  type: string
  /** Provides a remote, blob, or data URL for an image attachment. */
  url?: string
  /** Provides already-read content for a text attachment. */
  text?: string
}

/** Accepts a browser file or preloaded attachment for `useChat().append()`. */
export type ChatAttachmentInput = File | ChatFileAttachment

/** Accepts file inputs supported by `append(..., { attachments })`. */
export type ChatAttachmentsInput = FileList | readonly ChatAttachmentInput[]

/** Defines an OpenAI-compatible function tool exposed to a model. */
export interface Tool {
  type: 'function'
  function: {
    name: string
    description?: string
    /** Provides the JSON Schema describing accepted function arguments. */
    parameters: Record<string, unknown>
    strict?: boolean
  }
}

/** Describes a tool call emitted by the model. */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** Represents a single chat message. */
export interface Message {
  id: string
  role: MessageRole
  content: MessageContent
  name?: string
  toolCallId?: string
  toolCalls?: ToolCall[]
  parts?: MessagePart[]
  createdAt?: Date
  /** Stores provider-specific metadata, such as OpenAI `logprobs`. */
  metadata?: Record<string, unknown>
}

/** Represents a chat message with typed metadata, data, and tool parts for UI rendering. */
export interface UIMessage<
  TMetadata extends Record<string, unknown> | never = Record<string, unknown>,
  TDataTypes extends UIDataTypes = UIDataTypes,
  TTools extends UITools = UITools
> extends Omit<Message, 'metadata' | 'parts'> {
  parts?: UIMessagePart<TDataTypes, TTools>[]
  metadata?: TMetadata
}

/** Represents a provider-facing message without UI-only rendering parts. */
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

/** Accepts either UI-facing or provider-facing messages in chat requests. */
export type ChatRequestMessage = Message | ModelMessage

/** Configures JSON response formats for providers that support structured output. */
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

/** Reports token usage normalized across provider adapters. */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** Identifies lifecycle states shared by asynchronous AI request composables. */
export type AiRequestStatus = 'ready' | 'submitted' | 'streaming' | 'error'

/** Overrides automatic chat, message, tool, and stream data ID generation. */
export type IdGenerator = (prefix?: string) => string

/** Configures the format and entropy of IDs produced by `createIdGenerator`. */
export interface CreateIdGeneratorOptions {
  /** Specifies a fixed prefix that takes precedence over any per-call prefix. */
  prefix?: string
  /** Specifies the separator inserted between a prefix and random value. Defaults to `-`. */
  separator?: string
  /** Sets the number of random characters. Defaults to `16`. */
  size?: number
  /** Specifies the non-empty alphabet used for random characters. */
  alphabet?: string
}

const defaultIdAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/**
 * Creates a dependency-free ID generator for SSR, persistence, tests, and trace fields.
 *
 * The returned generator prefers the configured prefix to a per-call prefix. It
 * requires a positive integer size and a non-empty alphabet; when a fixed prefix
 * is configured, the separator must not appear in that alphabet.
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

/** Generates a random ID, optionally namespaced by a prefix. */
export const generateId = createIdGenerator()

/** Describes a custom data item emitted alongside a streaming assistant response. */
export interface StreamDataPart<TData = unknown> {
  id: string
  data: TData
  type?: string
  transient?: boolean
  createdAt?: Date
}

/** Selects the stream protocol expected from an app-owned chat endpoint. */
export type ChatStreamProtocol = 'ui-message' | 'data' | 'text'

/** Describes a chat completion request. */
export interface ChatRequest {
  id?: string
  /** Identifies a backend thread or session independently of client-side shared state. */
  threadId?: string
  /** Provides the idempotency key for one assistant attempt. */
  runId?: string
  messages: ChatRequestMessage[]
  /** Forwards application-defined props to proxy or agent backends. */
  forwardedProps?: Record<string, unknown>
  /** Adds provider- or proxy-specific JSON body fields. */
  body?: Record<string, unknown>
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string | string[]
  tools?: Tool[]
  /** Filters the resolved tool list by function name before sending the provider request. */
  activeTools?: string[]
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
  responseFormat?: ResponseFormat
  metadata?: unknown
  /** Selects the AI SDK-compatible stream protocol expected from an app-owned endpoint. */
  streamProtocol?: ChatStreamProtocol
  user?: string
  stream?: boolean
  signal?: AbortSignal
  headers?: HeadersInit
}

/** Describes a request to resume an active chat stream. */
export interface ChatResumeRequest {
  id: string
  /** Identifies a backend thread or session independently of client-side shared state. */
  threadId?: string
  /** Provides the resume attempt's idempotency key when supported by the backend. */
  runId?: string
  /** Forwards application-defined props to proxy or agent backends. */
  forwardedProps?: Record<string, unknown>
  /** Adds provider- or proxy-specific JSON body fields. */
  body?: Record<string, unknown>
  metadata?: unknown
  /** Selects the protocol expected when resuming an app-owned proxy stream. */
  streamProtocol?: ChatStreamProtocol
  signal?: AbortSignal
  headers?: HeadersInit
}

/** Represents a single delta in a streaming chat response. */
export interface ChatChunk {
  /** Identifies the current assistant message using the server-provided ID. */
  messageId?: string
  /** Contains a text delta for the assistant message. */
  content?: string
  /** Contains tool call deltas. */
  toolCalls?: Array<{
    index: number
    id?: string
    type?: 'function'
    function?: {
      name?: string
      arguments?: string
    }
  }>
  /** Indicates why the model stopped when this is the final chunk. */
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null
  /** Reports token usage, typically only on the final chunk. */
  usage?: TokenUsage
  /** Provides metadata to merge into the current assistant message. */
  metadata?: Record<string, unknown>
  /** Carries custom stream data such as sources, progress, or citations. */
  data?: unknown
  /** Carries structured parts to merge into the assistant message. */
  parts?: MessagePart[]
  /** Identifies a custom data part that may replace an earlier value. */
  dataId?: string
  /** Labels the custom data kind, such as `source` or `progress`. */
  dataType?: string
  /** Fires `onData` without storing the part in `streamData`. */
  transient?: boolean
}

/** Describes a single-shot completion request. */
export interface CompletionRequest {
  prompt: string
  /** Adds provider- or proxy-specific JSON body fields. */
  body?: Record<string, unknown>
  /** Selects the completion stream protocol expected from an app-owned endpoint. */
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

/** Describes an embedding request. */
export interface EmbeddingRequest {
  input: string | string[]
  /** Adds provider- or proxy-specific JSON body fields. */
  body?: Record<string, unknown>
  model?: string
  user?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

/** Contains normalized embedding vectors and provider usage metadata. */
export interface EmbeddingResult {
  embeddings: number[][]
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
}

/** Represents a normalized image returned by an app-owned generation backend. */
export interface GeneratedImage {
  /** Provides a public, blob, or data URL for the generated image. */
  url?: string
  /** Provides a Base64-encoded payload when the backend returns inline image data. */
  base64?: string
  /** Specifies a MIME type such as `image/png` or `image/webp`. */
  mediaType?: string
  /** Provides the provider-revised prompt when the upstream model returns one. */
  revisedPrompt?: string
  /** Stores provider-specific metadata for this image. */
  metadata?: Record<string, unknown>
}

/** Selects whether an image request creates or edits media. */
export type ImageOperation = 'generate' | 'edit'

/** Accepts an image edit input as a raw payload or normalized generated image. */
export type ImageEditInput = string | GeneratedImage

/** Describes an image generation or edit request to an app-owned backend. */
export interface ImageGenerationRequest {
  prompt: string
  /** Selects the task for backends that share one route for generation and editing. */
  operation?: ImageOperation
  /** Provides source images as URLs, Base64 payloads, or normalized image objects. */
  image?: ImageEditInput | ImageEditInput[]
  /** Provides an optional edit mask as a URL, Base64 payload, or normalized image object. */
  mask?: ImageEditInput
  /** Adds proxy-specific JSON body fields. */
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

/** Contains the normalized result of an image generation or edit request. */
export interface ImageGenerationResult {
  image?: GeneratedImage
  images: GeneratedImage[]
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

/** Assigns an image to a semantic position in an image-to-video request. */
export interface VideoFrameImage {
  /** Provides an image URL, data URL, or Base64 payload understood by the backend. */
  image: string
  /** Identifies the frame role, such as `first_frame` or `last_frame`. */
  frameType: string
}

/** Represents a normalized video returned by an app-owned generation backend. */
export interface GeneratedVideo {
  /** Provides a public, blob, or data URL for the generated video. */
  url?: string
  /** Provides a Base64-encoded payload when the backend returns inline video data. */
  base64?: string
  /** Provides a binary payload for runtimes that pass files directly. */
  uint8Array?: Uint8Array
  /** Specifies a MIME type such as `video/mp4` or `video/webm`. */
  mediaType?: string
  /** Reports the video duration in seconds when available. */
  durationInSeconds?: number
  /** Stores provider-specific metadata for this video. */
  metadata?: Record<string, unknown>
}

/** Describes a video generation request to an app-owned backend. */
export interface VideoGenerationRequest {
  prompt: string
  /** Adds proxy-specific JSON body fields. */
  body?: Record<string, unknown>
  model?: string
  n?: number
  aspectRatio?: string
  resolution?: string
  size?: string
  duration?: number
  fps?: number
  seed?: number
  image?: string
  frameImages?: VideoFrameImage[]
  inputReferences?: string[]
  generateAudio?: boolean
  providerOptions?: Record<string, unknown>
  user?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

/** Contains the normalized result of a video generation request. */
export interface VideoGenerationResult {
  video?: GeneratedVideo
  videos: GeneratedVideo[]
  model?: string
  warnings?: unknown[]
  responses?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

/** Represents normalized audio returned by an app-owned speech backend. */
export interface GeneratedAudio {
  /** Provides a public, blob, or data URL for the generated audio. */
  url?: string
  /** Provides a Base64-encoded payload when the backend returns inline audio data. */
  base64?: string
  /** Specifies a MIME type such as `audio/mpeg`, `audio/wav`, or `audio/ogg`. */
  mediaType?: string
  /** Provides provider-revised text when the upstream model returns one. */
  revisedText?: string
  /** Reports the audio duration in seconds when available. */
  durationInSeconds?: number
  /** Stores provider-specific metadata for this audio output. */
  metadata?: Record<string, unknown>
}

/** Describes a speech generation request to an app-owned backend. */
export interface SpeechGenerationRequest {
  text: string
  /** Adds proxy-specific JSON body fields. */
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

/** Contains the normalized result of a speech generation request. */
export interface SpeechGenerationResult {
  audio?: GeneratedAudio
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

/** Represents a text segment with an optional time range from a transcription backend. */
export interface TranscriptionSegment {
  text: string
  start?: number
  end?: number
}

/** Describes a transcription request to an app-owned backend. */
export interface TranscriptionRequest {
  /** Provides an audio URL, data URL, or Base64 payload understood by the backend. */
  audio: string
  /** Adds proxy-specific JSON body fields. */
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

/** Contains the normalized result of a transcription request. */
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

/** Represents a document accepted by a reranking backend. */
export type RerankDocument = string | Record<string, unknown>

/** Reports one document's position, relevance score, and value after reranking. */
export interface RerankRankingItem<TDocument = RerankDocument> {
  index: number
  score: number
  document: TDocument
}

/** Describes a document reranking request to an app-owned backend. */
export interface RerankRequest<TDocument = RerankDocument> {
  query: string
  documents: TDocument[]
  /** Adds proxy-specific JSON body fields. */
  body?: Record<string, unknown>
  model?: string
  topN?: number
  providerOptions?: Record<string, unknown>
  user?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

/** Contains the normalized result of a document reranking request. */
export interface RerankResult<TDocument = RerankDocument> {
  originalDocuments: TDocument[]
  rerankedDocuments: TDocument[]
  ranking: Array<RerankRankingItem<TDocument>>
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

/** Provides retry attempt details to policy and lifecycle callbacks. */
export interface RetryContext {
  /** Reports the one-based retry attempt number. */
  attempt: number
  /** Reports the maximum retry attempts configured for this call. */
  maxRetries: number
  /** Provides the error that caused this retry attempt. */
  error: Error
}

/** Configures retry count, delay, filtering, and lifecycle callbacks. */
export interface RetryOptions {
  /** Sets the retry attempts after the initial provider call fails. Defaults to `0`. */
  maxRetries?: number
  /** Sets the delay before each retry in milliseconds. Defaults to `0`. */
  retryDelayMs?: number | ((context: RetryContext) => number)
  /** Returns `false` to stop retrying a specific error. */
  shouldRetry?: (error: Error, context: RetryContext) => boolean | Promise<boolean>
  /** Runs immediately before waiting and retrying. */
  onRetry?: (error: Error, context: RetryContext) => void
}

/** Configures the minimum interval between reactive streaming updates. */
export interface StreamThrottleOptions {
  /** Sets the minimum interval between reactive stream updates. Defaults to no throttling. */
  throttleMs?: number
  /** Provides an AI SDK-compatible alias. Prefer `throttleMs` in new code. */
  experimental_throttle?: number
}

/** Represents errors raised by composables, providers, and shared transport utilities. */
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
