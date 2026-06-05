/**
 * vue-ai-hooks — Vue 3 Composable library for AI applications.
 *
 * @packageDocumentation
 */

// Composables
export { useChat, type UseChatOptions, type UseChatReturn } from './composables/useChat'
export { useCompletion, type UseCompletionOptions, type UseCompletionReturn } from './composables/useCompletion'
export { useEmbedding, type UseEmbeddingOptions, type UseEmbeddingReturn } from './composables/useEmbedding'

// Providers
export { openai, openaiCompatible, type OpenAiLikeConfig } from './providers/openai'
export { anthropic, type AnthropicConfig } from './providers/anthropic'
export { type ChatProvider } from './providers/types'

// Persistence
export { usePersist, type UsePersistOptions } from './composables/usePersist'

// Types
export type {
  Message,
  MessageRole,
  MessageContent,
  ContentPart,
  TextPart,
  ImageUrlPart,
  Tool,
  ToolCall,
  ChatRequest,
  ChatChunk,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult
} from './types'
export { AiHooksError } from './types'
