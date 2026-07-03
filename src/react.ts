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
  ResponseFormat,
  RetryContext,
  RetryOptions,
  StreamThrottleOptions
} from './types'
