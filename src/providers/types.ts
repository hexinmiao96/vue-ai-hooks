import type {
  ChatChunk,
  ChatRequest,
  ChatResumeRequest,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult
} from '../types'

/**
 * Adapts provider-agnostic requests to an upstream AI service and normalizes its responses.
 */
export interface ChatProvider {
  /** Exposes a stable provider ID, such as `openai`. */
  readonly id: string

  /** Sends a chat request and returns normalized response chunks. */
  chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>

  /** Resumes a chat stream, or returns `null` when no resumable stream exists. */
  resumeChat?(request: ChatResumeRequest): Promise<AsyncIterable<ChatChunk> | null>

  /** Sends a completion request and returns its text chunks. */
  completion(request: CompletionRequest): Promise<AsyncIterable<string>>

  /** Computes embeddings and returns normalized vectors and usage. */
  embedding(request: EmbeddingRequest): Promise<EmbeddingResult>
}
