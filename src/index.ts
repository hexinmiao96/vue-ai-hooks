/**
 * vue-ai-hooks — Vue 3 Composable library for AI applications.
 *
 * @packageDocumentation
 */

// Composables
export {
  convertToModelMessages,
  deserializeMessages,
  dynamicTool,
  hasToolCall,
  isStepCount,
  jsonSchema,
  lastAssistantMessageIsCompleteWithToolCalls,
  pruneMessages,
  safeValidateMessages,
  safeValidateUIMessages,
  serializeMessages,
  tool,
  validateMessages,
  validateUIMessages,
  useChat,
  type AddToolOutputOptions,
  type AddToolResultOptions,
  type AiSdkSendChatTrigger,
  type AnyToolDefinition,
  type AppendChatOptions,
  type ChatToolsInput,
  type ChatPersistOptions,
  type ChatFinishInfo,
  type ChatRequestInfo,
  type ChatRequestLifecycleKind,
  type ChatResponseInfo,
  type ChatStatus,
  type ChatStreamProtocol,
  type DataPartSchema,
  type DataPartSchemas,
  type DataPartValidator,
  type ConvertToModelMessagesOptions,
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
  type SafeValidateMessagesResult,
  type SafeValidateUIMessagesResult,
  type SetDataInput,
  type SetMessagesInput,
  type StopWhen,
  type StopWhenOptions,
  type ToolDefinition,
  type ToolExecute,
  type ToolInputSchema,
  type ToolSet,
  type JsonSchemaDefinition,
  type ToolApprovalResponse,
  type ToolApprovalPredicate,
  type ToolCallHandler,
  type ToolCallHandlerContext,
  type ToolResultHandlerContext,
  type UseChatOptions,
  type UseChatReturn,
  type ValidateMessagesOptions,
  type ValidateUIMessagesOptions
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
  cosineSimilarity,
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
  useVideo,
  type UseVideoOptions,
  type UseVideoReturn,
  type VideoGenerationRequestInfo,
  type VideoGenerationResponseInfo
} from './composables/useVideo'
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
  useRerank,
  type RerankRequestInfo,
  type RerankResponseInfo,
  type UseRerankOptions,
  type UseRerankReturn
} from './composables/useRerank'
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
  DefaultChatTransport,
  proxyProvider,
  type DefaultChatTransportOptions,
  type DefaultChatTransportPrepareReconnectToStreamRequest,
  type DefaultChatTransportPrepareReconnectToStreamRequestOptions,
  type DefaultChatTransportPrepareSendMessagesRequest,
  type DefaultChatTransportPrepareSendMessagesRequestOptions,
  type ProxyProviderConfig,
  type ProxyRequestContext,
  type ProxyRequestKind,
  type ProxyRequestOverride
} from './providers/proxy'
export {
  DirectChatTransport,
  type DirectChatStreamProtocol,
  type DirectChatTransportOptions
} from './providers/direct'
export { anthropic, type AnthropicConfig } from './providers/anthropic'
export { type ChatProvider } from './providers/types'

// Stream utilities
export {
  createUIMessageStream,
  createUIMessageStreamParser,
  createUIMessageStreamResponse,
  formatSSEData,
  parseSSE,
  pipeUIMessageStreamToResponse,
  readUIMessageStream,
  toChatChunks,
  type CreateUIMessageStreamOptions,
  type CreateUIMessageStreamResponseOptions,
  type PipeUIMessageStreamToResponseOptions,
  type ReadUIMessageStreamOptions,
  type ServerResponseLike,
  type UIMessageStreamPart,
  type UIMessageStreamParser,
  type UIMessageStreamSource,
  type UIMessageStreamWriter
} from './utils/stream'

// Persistence
export { usePersist, type UsePersistOptions } from './composables/usePersist'

// Types
export type {
  Message,
  ModelMessage,
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
  CreateIdGeneratorOptions,
  IdGenerator,
  Tool,
  ToolCall,
  ResponseFormat,
  TokenUsage,
  StreamDataPart,
  ChatRequest,
  ChatRequestMessage,
  ChatResumeRequest,
  ChatChunk,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult,
  GeneratedImage,
  ImageGenerationRequest,
  ImageGenerationResult,
  GeneratedVideo,
  VideoFrameImage,
  VideoGenerationRequest,
  VideoGenerationResult,
  GeneratedAudio,
  SpeechGenerationRequest,
  SpeechGenerationResult,
  TranscriptionRequest,
  TranscriptionResult,
  TranscriptionSegment,
  RerankDocument,
  RerankRankingItem,
  RerankRequest,
  RerankResult,
  RetryContext,
  RetryOptions,
  StreamThrottleOptions
} from './types'
export { AiHooksError, createIdGenerator, generateId } from './types'
