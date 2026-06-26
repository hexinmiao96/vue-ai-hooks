/**
 * vue-ai-hooks — Vue 3 Composable library for AI applications.
 *
 * @packageDocumentation
 */

// Composables
export {
  deserializeMessages,
  hasToolCall,
  isStepCount,
  lastAssistantMessageIsCompleteWithToolCalls,
  pruneMessages,
  serializeMessages,
  useChat,
  type AddToolOutputOptions,
  type AppendChatOptions,
  type ChatPersistOptions,
  type ChatFinishInfo,
  type ChatRequestInfo,
  type ChatRequestLifecycleKind,
  type ChatResponseInfo,
  type ChatStatus,
  type PrepareReconnectToStreamRequest,
  type PrepareReconnectToStreamRequestOptions,
  type PrepareSendMessagesRequest,
  type PrepareSendMessagesRequestOptions,
  type PrepareStep,
  type PrepareStepOptions,
  type PruneMessagesOptions,
  type PruneReasoningStrategy,
  type PruneToolCallsOption,
  type PruneToolCallsRule,
  type PruneToolCallsStrategy,
  type RegenerateChatOptions,
  type ResumeChatOptions,
  type SendAutomaticallyWhen,
  type SendAutomaticallyWhenOptions,
  type SendChatTrigger,
  type SerializedMessage,
  type SetMessagesInput,
  type StopWhen,
  type StopWhenOptions,
  type ToolApprovalResponse,
  type ToolApprovalPredicate,
  type ToolCallHandler,
  type ToolCallHandlerContext,
  type ToolResultHandlerContext,
  type UseChatOptions,
  type UseChatReturn
} from './composables/useChat'
export {
  useCompletion,
  type CompletionFinishInfo,
  type UseCompletionOptions,
  type UseCompletionReturn
} from './composables/useCompletion'
export {
  useEmbedding,
  type UseEmbeddingOptions,
  type UseEmbeddingReturn
} from './composables/useEmbedding'
export {
  useObject,
  type DeepPartial,
  type UseObjectOptions,
  type UseObjectReturn
} from './composables/useObject'

// Providers
export { openai, openaiCompatible, type OpenAiLikeConfig } from './providers/openai'
// OpenRouter is exposed as a first-class provider entry that keeps OpenAI-compatible
// request behavior while injecting OpenRouter-specific headers automatically.
export { openrouter, type OpenRouterConfig } from './providers/openrouter'
export { gemini, type GeminiConfig } from './providers/gemini'
export {
  proxyProvider,
  type ProxyProviderConfig,
  type ProxyRequestContext,
  type ProxyRequestKind,
  type ProxyRequestOverride
} from './providers/proxy'
export { anthropic, type AnthropicConfig } from './providers/anthropic'
export { type ChatProvider } from './providers/types'

// Persistence
export { usePersist, type UsePersistOptions } from './composables/usePersist'

// Types
export type {
  Message,
  MessagePart,
  MessageTextPart,
  MessageReasoningPart,
  MessageSourcePart,
  MessageFilePart,
  MessageDataPart,
  MessageToolPart,
  MessageRole,
  MessageContent,
  ContentPart,
  TextPart,
  ImageUrlPart,
  ChatFileAttachment,
  ChatAttachmentInput,
  ChatAttachmentsInput,
  AiRequestStatus,
  IdGenerator,
  Tool,
  ToolCall,
  ResponseFormat,
  TokenUsage,
  StreamDataPart,
  ChatRequest,
  ChatResumeRequest,
  ChatChunk,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult,
  RetryContext,
  RetryOptions,
  StreamThrottleOptions
} from './types'
export { AiHooksError } from './types'
