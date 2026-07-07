/**
 * React entry for vue-ai-hooks.
 *
 * Import from `vue-ai-hooks/react` to keep React code out of the Vue-first root entry.
 *
 * @packageDocumentation
 */

export {
  useChat,
  type ReactAppendChatOptions,
  type ReactAiSdkChatFinishCallback,
  type ReactChatFinishCallback,
  type ReactLegacyChatFinishCallback,
  type ReactChatFinishInfo,
  type ReactChatRequestInfo,
  type ReactChatResponseInfo,
  type ReactChatStatus,
  type ReactSendChatMessageInput,
  type UseReactChatOptions,
  type UseReactChatReturn
} from './react/useChat'

export {
  useCompletion,
  type ReactAiSdkCompletionFinishCallback,
  type ReactLegacyCompletionFinishCallback,
  type ReactCompletionFinishInfo,
  type ReactCompletionRequestInfo,
  type ReactCompletionResponseInfo,
  type ReactCompletionStatus,
  type ReactCompletionStreamProtocol,
  type UseReactCompletionOptions,
  type UseReactCompletionReturn
} from './react/useCompletion'

export {
  cosineSimilarity,
  useEmbedding,
  type ReactEmbeddingRequestInfo,
  type ReactEmbeddingResponseInfo,
  type UseReactEmbeddingOptions,
  type UseReactEmbeddingReturn
} from './react/useEmbedding'

export {
  useImage,
  type ReactImageGenerationRequestInfo,
  type ReactImageGenerationResponseInfo,
  type ReactImageEditOptions,
  type UseReactImageOptions,
  type UseReactImageReturn
} from './react/useImage'

export {
  useVideo,
  type ReactVideoGenerationRequestInfo,
  type ReactVideoGenerationResponseInfo,
  type UseReactVideoOptions,
  type UseReactVideoReturn
} from './react/useVideo'

export {
  useSpeech,
  type ReactSpeechGenerationRequestInfo,
  type ReactSpeechGenerationResponseInfo,
  type UseReactSpeechOptions,
  type UseReactSpeechReturn
} from './react/useSpeech'

export {
  createPromptSuggestionRecipes,
  promptSuggestionRecipeIds,
  usePromptSuggestions,
  type CreatePromptSuggestionRecipesOptions,
  type PromptSuggestionRecipe,
  type PromptSuggestionRecipeCategory,
  type PromptSuggestionRecipeId,
  type PromptSuggestionRecipeLocale,
  type PromptSuggestionRecipeMetadata,
  type PromptSuggestionRecipeSurface,
  type UseReactPromptSuggestionsOptions,
  type UseReactPromptSuggestionsReturn
} from './react/usePromptSuggestions'

export {
  useAgentRun,
  type ReactAgentRunFinishInfo,
  type ReactAgentRunHandler,
  type ReactAgentRunInspectionSnapshot,
  type ReactAgentRunRequest,
  type ReactAgentRunRequestInfo,
  type ReactAgentRunResponseInfo,
  type ReactAgentRunStatus,
  type ResumeAgentRunOptions,
  type StartAgentRunOptions,
  type UseReactAgentRunOptions,
  type UseReactAgentRunReturn
} from './react/useAgentRun'

export {
  useObject,
  type ReactObjectDeepPartial,
  type ReactAiSdkObjectFinishCallback,
  type ReactLegacyObjectFinishCallback,
  type ReactObjectFinishInfo,
  type ReactObjectFinishCallback,
  type ReactObjectFinishCallbackOptions,
  type ReactObjectRequestInfo,
  type ReactObjectResponseInfo,
  type ReactObjectStatus,
  type UseReactObjectOptions,
  type UseReactObjectReturn
} from './react/useObject'

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
  AiRequestStatus,
  IdGenerator,
  TokenUsage,
  StreamDataPart,
  ChatRequest,
  ChatRequestMessage,
  ChatResumeRequest,
  ChatChunk,
  ChatStreamProtocol,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult,
  GeneratedAudio,
  ResponseFormat,
  RetryContext,
  RetryOptions,
  SpeechGenerationRequest,
  SpeechGenerationResult,
  StreamThrottleOptions
} from './types'
