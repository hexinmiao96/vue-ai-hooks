/**
 * The vue-ai-hooks package provides Vue 3 composables for AI applications.
 *
 * @packageDocumentation
 */

// Composables
export {
  Chat,
  convertToModelMessages,
  defineToolHandlers,
  deserializeMessages,
  dynamicTool,
  getToolRenderParts,
  hasToolCall,
  isStepCount,
  jsonSchema,
  lastAssistantMessageIsCompleteWithToolCalls,
  pruneMessages,
  safeValidateMessages,
  safeValidateUIMessages,
  serializeMessages,
  stepCountIs,
  tool,
  validateMessages,
  validateUIMessages,
  useChat,
  type AddToolOutputOptions,
  type AddToolResultOptions,
  type AiSdkSendChatTrigger,
  type AnyToolDefinition,
  type AppendChatOptions,
  type ChatOptions,
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
  type GetToolRenderPartsOptions,
  type InferToolInput,
  type InferToolOutput,
  type InferUITools,
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
  type ToolHandlerFor,
  type ToolHandlersFor,
  type ToolModelOutput,
  type ToolModelOutputContext,
  type ToolRenderPart,
  type ToolRenderStatus,
  type ToolSet,
  type JsonSchemaDefinition,
  type ToolApprovalResponse,
  type ToolApprovalPredicate,
  type AiSdkChatFinishCallback,
  type LegacyChatFinishCallback,
  type ChatFinishCallback,
  type AiSdkToolCallCallback,
  type LegacyToolCallCallback,
  type ToolCallCallback,
  type ToolCallCallbackOptions,
  type ToolCallHandler,
  type ToolCallHandlerContext,
  type ToolResultHandlerContext,
  type UIToolCall,
  type UseChatOptions,
  type UseChatReturn,
  type ValidateMessagesOptions,
  type ValidateUIMessagesOptions
} from './composables/useChat'
export {
  useCompletion,
  type AiSdkCompletionFinishCallback,
  type LegacyCompletionFinishCallback,
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
  type ImageEditOptions,
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
  type AiSdkObjectFinishCallback,
  type LegacyObjectFinishCallback,
  type ObjectFinishCallback,
  type ObjectFinishCallbackOptions,
  type ObjectFinishInfo,
  type ObjectRequestInfo,
  type ObjectResponseInfo,
  type UseObjectOptions,
  type UseObjectReturn
} from './composables/useObject'
export {
  deserializeChatThreads,
  deserializeChatThreadsState,
  serializeChatThreads,
  serializeChatThreadsState,
  useChatThreads,
  type ChatThread,
  type ChatThreadsPersistenceErrorInfo,
  type ChatThreadsPersistenceErrorPhase,
  type ChatThreadsPersistOptions,
  type ChatThreadsState,
  type CreateChatThreadInput,
  type SerializedChatThread,
  type SerializedChatThreadsState,
  type UpdateChatThreadInput,
  type UseChatThreadsOptions,
  type UseChatThreadsReturn
} from './composables/useChatThreads'
export {
  createAgentContextMessage,
  formatAgentContexts,
  resolveAgentContexts,
  useAgentContext,
  useAgentContextRegistry,
  withAgentContextMessage,
  type AgentContextInput,
  type AgentContextMessageOptions,
  type AgentContextRegistry,
  type AgentContextSerializable,
  type AgentContextSnapshot,
  type AgentContextSource
} from './composables/useAgentContext'
export {
  extractAgentCapabilities,
  summarizeAgentCapabilities,
  useAgentCapabilities,
  type AgentCapabilities,
  type AgentCapabilitiesRequestInfo,
  type AgentCapabilitiesResponseInfo,
  type AgentCapabilitiesSupportSummary,
  type AgentCapabilityTool,
  type AgentExecutionCapabilities,
  type AgentHumanInTheLoopCapabilities,
  type AgentIdentityCapabilities,
  type AgentInfoAgent,
  type AgentInfoResponse,
  type AgentMultiAgentCapabilities,
  type AgentMultimodalCapabilities,
  type AgentMultimodalInputCapabilities,
  type AgentMultimodalOutputCapabilities,
  type AgentOutputCapabilities,
  type AgentReasoningCapabilities,
  type AgentStateCapabilities,
  type AgentToolsCapabilities,
  type AgentTransportCapabilities,
  type LoadAgentCapabilitiesOptions,
  type UseAgentCapabilitiesOptions,
  type UseAgentCapabilitiesReturn
} from './composables/useAgentCapabilities'
export {
  useAgentRun,
  type AgentRunFinishInfo,
  type AgentRunHandler,
  type AgentRunInspectionSnapshot,
  type AgentRunRequest,
  type AgentRunRequestInfo,
  type AgentRunResponseInfo,
  type AgentRunStatus,
  type ResumeAgentRunOptions,
  type StartAgentRunOptions,
  type UseAgentRunOptions,
  type UseAgentRunReturn
} from './composables/useAgentRun'
export {
  createPromptSuggestionRecipes,
  promptSuggestionRecipeIds,
  usePromptSuggestions,
  type CreatePromptSuggestionRecipesOptions,
  type PromptSuggestion,
  type PromptSuggestionFilter,
  type PromptSuggestionFilterContext,
  type PromptSuggestionInput,
  type PromptSuggestionLoader,
  type PromptSuggestionLoaderContext,
  type PromptSuggestionRecipe,
  type PromptSuggestionRecipeCategory,
  type PromptSuggestionRecipeId,
  type PromptSuggestionRecipeLocale,
  type PromptSuggestionRecipeMetadata,
  type PromptSuggestionRecipeSurface,
  type UsePromptSuggestionsOptions,
  type UsePromptSuggestionsReturn
} from './composables/usePromptSuggestions'

// Providers
export { openai, openaiCompatible, type OpenAiLikeConfig } from './providers/openai'
export { openrouter, type OpenRouterConfig } from './providers/openrouter'
export { moonshot, type MoonshotConfig } from './providers/moonshot'
export { zhipu, type ZhipuConfig, type ZhipuEndpoint } from './providers/zhipu'
export { ollama, type OllamaConfig } from './providers/ollama'
export { vllm, type VllmConfig } from './providers/vllm'
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

// Streaming and inspection utilities
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
export {
  agentEventToChatChunk,
  agentEventToUIMessageStreamPart,
  readAgentEvents,
  readAgentEventStream,
  type AgentEvent,
  type AgentEventAdapterOptions,
  type AgentInterruptEvent,
  type AgentEventSource,
  type ReadAgentEventStreamOptions
} from './utils/agentEvents'
export {
  classifyInspectionError,
  createInspectionCurl,
  inspectRequestTrace,
  type InspectionCurlOptions,
  type InspectionErrorCategory,
  type InspectionErrorSummary,
  type InspectionProviderTrace,
  type InspectionRetryRecord,
  type InspectionRetryRecordInput,
  type InspectionStatus,
  type InspectionTimelineEvent,
  type InspectionTimelineEventInput,
  type InspectionTimelineEventKind,
  type InspectRequestTraceOptions,
  type RequestInspectionSnapshot
} from './utils/inspection'

// Persistence
export { usePersist, type UsePersistOptions } from './composables/usePersist'

// Core types and errors
export type {
  Message,
  ModelMessage,
  MessagePart,
  UIDataTypes,
  UIMessage,
  UIMessageDataPart,
  UIMessagePart,
  UIMessageToolPart,
  UITools,
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
  ImageEditInput,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageOperation,
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
