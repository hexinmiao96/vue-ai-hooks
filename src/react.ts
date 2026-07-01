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
  type ReactChatFinishInfo,
  type ReactChatRequestInfo,
  type ReactChatResponseInfo,
  type ReactChatStatus,
  type ReactSendChatMessageInput,
  type UseReactChatOptions,
  type UseReactChatReturn
} from './react/useChat'

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
  RetryContext,
  RetryOptions,
  StreamThrottleOptions
} from './types'
