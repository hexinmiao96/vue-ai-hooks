import type {
  ChatChunk,
  ChatRequest,
  ChatResumeRequest,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult
} from '../types'

/**
 * A Provider translates framework-agnostic request types into the
 * specific wire format of an upstream LLM service, and translates
 * the wire format back into framework-agnostic chunks.
 *
 * This is the only seam that knows about a vendor's quirks, so adding
 * a new provider is a single file.
 */
export interface ChatProvider {
  /** Provider identifier, e.g. 'openai'. */
  readonly id: string

  /** Send a chat completion request. If `stream` is true, the returned async iterable yields deltas. */
  chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>

  /** Resume an existing chat stream when the provider/backend supports resumable streams. */
  resumeChat?(request: ChatResumeRequest): Promise<AsyncIterable<ChatChunk> | null>

  /** Send a single-shot completion request. */
  completion(request: CompletionRequest): Promise<AsyncIterable<string>>

  /** Compute embeddings for the given input. */
  embedding(request: EmbeddingRequest): Promise<EmbeddingResult>
}
