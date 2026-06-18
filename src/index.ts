/**
 * vue-ai-hooks — Vue 3 Composable library for AI applications.
 *
 * @packageDocumentation
 */

// Composables
export {
  useChat,
  type ToolCallHandler,
  type ToolCallHandlerContext,
  type UseChatOptions,
  type UseChatReturn
} from './composables/useChat'
export {
  useCompletion,
  type UseCompletionOptions,
  type UseCompletionReturn
} from './composables/useCompletion'
export {
  useEmbedding,
  type UseEmbeddingOptions,
  type UseEmbeddingReturn
} from './composables/useEmbedding'

// Providers
export { openai, openaiCompatible, type OpenAiLikeConfig } from './providers/openai'
// OpenRouter is exposed as a first-class provider entry that keeps OpenAI-compatible
// request behavior while injecting OpenRouter-specific headers automatically.
export { openrouter, type OpenRouterConfig } from './providers/openrouter'
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
