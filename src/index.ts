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
  type AddToolResultOptions,
  type AppendChatOptions,
  type ChatPersistOptions,
  type ChatFinishInfo,
  type ChatRequestInfo,
  type ChatRequestLifecycleKind,
  type ChatResponseInfo,
  type ChatStatus,
  type DataPartSchema,
  type DataPartSchemas,
  type DataPartValidator,
  type MessageMetadataSchema,
  type MessageMetadataValidator,
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
  type SendChatMessageInput,
  type SendChatTrigger,
  type SerializedMessage,
  type SetDataInput,
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
  type CompletionRequestInfo,
  type CompletionResponseInfo,
  type CompletionStreamProtocol,
  type UseCompletionOptions,
  type UseCompletionReturn
} from './composables/useCompletion'
export {
  useEmbedding,
  type EmbeddingRequestInfo,
  type EmbeddingResponseInfo,
  type UseEmbeddingOptions,
  type UseEmbeddingReturn
} from './composables/useEmbedding'
export {
  useGeneration,
  type GenerateOptions,
  type GenerationFetcher,
  type GenerationRequestInfo,
  type GenerationResponseInfo,
  type GenerationRunContext,
  type UseGenerationOptions,
  type UseGenerationReturn
} from './composables/useGeneration'
export {
  useImage,
  type ImageGenerationRequestInfo,
  type ImageGenerationResponseInfo,
  type UseImageOptions,
  type UseImageReturn
} from './composables/useImage'
export {
  useSpeech,
  type SpeechGenerationRequestInfo,
  type SpeechGenerationResponseInfo,
  type UseSpeechOptions,
  type UseSpeechReturn
} from './composables/useSpeech'
export {
  useTranscription,
  type TranscriptionRequestInfo,
  type TranscriptionResponseInfo,
  type UseTranscriptionOptions,
  type UseTranscriptionReturn
} from './composables/useTranscription'
export {
  useObject as experimental_useObject,
  useObject,
  type DeepPartial,
  type ObjectFinishInfo,
  type ObjectRequestInfo,
  type ObjectResponseInfo,
  type UseObjectOptions,
  type UseObjectReturn
} from './composables/useObject'

// Providers
export { openai, openaiCompatible, type OpenAiLikeConfig } from './providers/openai'
// OpenRouter is exposed as a first-class provider entry that keeps OpenAI-compatible
// request behavior while injecting OpenRouter-specific headers automatically.
export { openrouter, type OpenRouterConfig } from './providers/openrouter'
export { gemini, type GeminiConfig } from './providers/gemini'
export { deepseek, type DeepSeekConfig } from './providers/deepseek'
export {
  fallbackProvider,
  type FallbackProviderConfig,
  type FallbackProviderContext,
  type FallbackProviderKind
} from './providers/fallback'
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
  GeneratedImage,
  ImageGenerationRequest,
  ImageGenerationResult,
  GeneratedAudio,
  SpeechGenerationRequest,
  SpeechGenerationResult,
  TranscriptionRequest,
  TranscriptionResult,
  TranscriptionSegment,
  RetryContext,
  RetryOptions,
  StreamThrottleOptions
} from './types'
export { AiHooksError } from './types'
