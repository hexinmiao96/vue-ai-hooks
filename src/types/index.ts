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

/** A function/tool the model may call. OpenAI-compatible schema. */
export interface Tool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown> // JSON Schema
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
  createdAt?: Date
  /** Provider-specific metadata. Useful for OpenAI's `logprobs` etc. */
  metadata?: Record<string, unknown>
}

/** Request payload for a chat completion. */
export interface ChatRequest {
  messages: Message[]
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string | string[]
  tools?: Tool[]
  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } }
  user?: string
  stream?: boolean
  signal?: AbortSignal
  headers?: Record<string, string>
}

/** A single delta in a streaming chat response. */
export interface ChatChunk {
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
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/** Request payload for a single-shot completion. */
export interface CompletionRequest {
  prompt: string
  model?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string | string[]
  stream?: boolean
  signal?: AbortSignal
  headers?: Record<string, string>
}

/** Request payload for embedding. */
export interface EmbeddingRequest {
  input: string | string[]
  model?: string
  user?: string
  signal?: AbortSignal
  headers?: Record<string, string>
}

export interface EmbeddingResult {
  embeddings: number[][]
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
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
