import { mergeDeltas as mergeD } from './_tc_merge'

import { ref, shallowRef, type Ref } from 'vue'
import { usePersist, type UsePersistOptions } from './usePersist'
import type { ChatProvider } from '../providers/types'
import { proxyProvider, type ProxyProviderConfig } from '../providers/proxy'
import type {
  ChatChunk,
  ChatRequest,
  ChatResumeRequest,
  ChatStreamProtocol,
  AiRequestStatus,
  ChatAttachmentInput,
  ChatAttachmentsInput,
  ChatFileAttachment,
  ChatRequestMessage,
  Message,
  MessageContent,
  ModelMessage,
  MessagePart,
  MessageRole,
  ContentPart,
  StreamDataPart,
  TokenUsage,
  Tool,
  ToolCall,
  IdGenerator,
  RetryOptions,
  StreamThrottleOptions
} from '../types'
import { createId } from '../utils/id'
import { AiHooksError } from '../types'
import { cloneMessageSnapshot as cloneMessage, cloneRequestSnapshot } from '../utils/lifecycle'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import { headersToRecord, mergeHeaders } from '../utils/headers'
import { mergeRequestBody } from '../utils/requestBody'
import { validateJsonSchema } from '../utils/jsonSchema'
import { createStreamUpdateThrottler, getThrottleMs } from '../utils/throttle'
import { createRequestTrace, type RequestTrace } from '../utils/trace'

export interface ToolCallHandlerContext {
  toolCall: ToolCall
  messages: Message[]
  args: unknown
  context?: unknown
}

export type ToolCallHandler = (
  args: unknown,
  context: ToolCallHandlerContext
) => unknown | Promise<unknown>

export type ToolApprovalPredicate = (
  args: unknown,
  context: ToolCallHandlerContext
) => boolean | Promise<boolean>

export interface ToolResultHandlerContext extends ToolCallHandlerContext {
  resultMessage: Message
}

export interface JsonSchemaDefinition<TInput = unknown> {
  readonly kind: 'json-schema'
  readonly schema: Record<string, unknown>
  readonly validate?: (value: unknown) => value is TInput
}

export type ToolInputSchema<TInput = unknown> =
  | Record<string, unknown>
  | JsonSchemaDefinition<TInput>

export type ToolExecute<TInput = unknown, TOutput = unknown> = (
  args: TInput,
  context: ToolCallHandlerContext
) => TOutput | Promise<TOutput>

export interface ToolModelOutputContext {
  toolCall: ToolCall
  message: Message
  messages: Message[]
}

export type ToolModelOutput = string | ContentPart | ContentPart[] | null | undefined

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  description?: string
  inputSchema?: ToolInputSchema<TInput>
  parameters?: Record<string, unknown>
  execute?: {
    bivarianceHack(args: TInput, context: ToolCallHandlerContext): TOutput | Promise<TOutput>
  }['bivarianceHack']
  toModelOutput?: {
    bivarianceHack(output: TOutput, context: ToolModelOutputContext): ToolModelOutput
  }['bivarianceHack']
  strict?: boolean
  dynamic?: boolean
}

export type AnyToolDefinition = ToolDefinition<unknown, unknown>
export type ToolSet = Record<string, Tool | AnyToolDefinition>
export type ChatToolsInput = Tool[] | ToolSet
export type { ChatStreamProtocol }

export function jsonSchema<TInput = unknown>(
  schema: Record<string, unknown>,
  options: { validate?: (value: unknown) => value is TInput } = {}
): JsonSchemaDefinition<TInput> {
  return {
    kind: 'json-schema',
    schema,
    ...(options.validate ? { validate: options.validate } : {})
  }
}

export function tool<TInput = unknown, TOutput = unknown>(
  definition: ToolDefinition<TInput, TOutput>
): ToolDefinition<TInput, TOutput> {
  return {
    ...definition,
    dynamic: false
  }
}

export function dynamicTool<TInput = unknown, TOutput = unknown>(
  definition: ToolDefinition<TInput, TOutput>
): ToolDefinition<TInput, TOutput> {
  return {
    ...definition,
    dynamic: true
  }
}

export interface SendAutomaticallyWhenOptions {
  messages: Message[]
}

export type SendAutomaticallyWhen = (
  options: SendAutomaticallyWhenOptions
) => boolean | PromiseLike<boolean>

export interface StopWhenOptions {
  messages: Message[]
  toolCalls: ToolCall[]
}

export type StopWhen = (options: StopWhenOptions) => boolean | PromiseLike<boolean>

export interface ChatFinishInfo {
  message: Message
  messages: Message[]
  isAbort: boolean
  isError: boolean
  isDisconnect: boolean
  finishReason?: ChatChunk['finishReason']
}

export type ChatRequestLifecycleKind = 'chat' | 'resume'

export interface ChatRequestInfo {
  kind: ChatRequestLifecycleKind
  id: string
  providerId: string
  attempt: number
  api?: string
  credentials?: RequestCredentials
  request: ChatRequest | ChatResumeRequest
  messages: ChatRequestMessage[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  trigger?: SendChatTrigger
  aiSdkTrigger?: AiSdkSendChatTrigger
  messageId?: string
  stepNumber?: number
}

export interface ChatResponseInfo extends ChatRequestInfo {
  hasStream: boolean
}

export type ChatStatus = AiRequestStatus

export interface RegenerateChatOptions extends Partial<ChatRequest> {
  messageId?: string
}

export interface ResumeChatOptions extends Partial<ChatResumeRequest> {}

export interface AppendChatOptions<
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> extends Partial<ChatRequest> {
  messageId?: string
  attachments?: ChatAttachmentsInput
  messageMetadata?: TMessageMetadata
}

export interface SendChatMessageInput<
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  text?: string
  files?: ChatAttachmentsInput
  metadata?: TMessageMetadata
  messageId?: string
}

export type SendChatTrigger = 'submit-message' | 'regenerate-message'
export type AiSdkSendChatTrigger = 'submit-user-message' | 'regenerate-assistant-message'

export interface PrepareSendMessagesRequestOptions {
  id: string
  api?: string
  credentials?: RequestCredentials
  messages: Message[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  request: ChatRequest
  trigger: SendChatTrigger
  aiSdkTrigger?: AiSdkSendChatTrigger
  messageId?: string
}

export type PrepareSendMessagesRequest = (
  options: PrepareSendMessagesRequestOptions
) => Partial<ChatRequest> | void | Promise<Partial<ChatRequest> | void>

export interface PrepareStepOptions extends PrepareSendMessagesRequestOptions {
  stepNumber: number
  toolCalls: ToolCall[]
}

export type PrepareStep = (
  options: PrepareStepOptions
) => Partial<ChatRequest> | void | Promise<Partial<ChatRequest> | void>

export interface PrepareReconnectToStreamRequestOptions {
  id: string
  api?: string
  credentials?: RequestCredentials
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  request: ChatResumeRequest
}

export type PrepareReconnectToStreamRequest = (
  options: PrepareReconnectToStreamRequestOptions
) => Partial<ChatResumeRequest> | void | Promise<Partial<ChatResumeRequest> | void>

export type AddToolOutputOptions =
  | {
      tool?: string
      toolCallId: string
      output: unknown
    }
  | {
      tool?: string
      toolCallId: string
      state: 'output-error'
      errorText: string
    }

export type AddToolResultOptions = AddToolOutputOptions

export interface ToolApprovalResponse {
  id: string
  approved: boolean
  reason?: unknown
}

export type SetMessagesInput = Message[] | ((messages: Message[]) => Message[])
export type SetDataInput<TData = unknown> =
  | StreamDataPart<TData>[]
  | ((data: StreamDataPart<TData>[]) => StreamDataPart<TData>[])

export type PruneToolCallsStrategy =
  | 'none'
  | 'all'
  | 'before-last-message'
  | `before-last-${number}-messages`

export interface PruneToolCallsRule {
  type: Exclude<PruneToolCallsStrategy, 'none'>
  tools?: readonly string[]
}

export type PruneToolCallsOption = PruneToolCallsStrategy | readonly PruneToolCallsRule[]

export type PruneReasoningStrategy = PruneToolCallsStrategy

export interface PruneMessagesOptions {
  messages: Message[]
  maxMessages?: number
  keepSystem?: boolean
  emptyMessages?: 'keep' | 'remove'
  toolCalls?: PruneToolCallsOption
  reasoning?: PruneReasoningStrategy
}

export type SerializedMessage = Omit<Message, 'createdAt'> & { createdAt?: string }

export interface ConvertToModelMessagesOptions {
  preserveIds?: boolean
  preserveCreatedAt?: boolean
  stripMetadata?: boolean
  ignoreIncompleteToolCalls?: boolean
  tools?: ToolSet
  convertDataPart?: (
    part: Extract<MessagePart, { type: 'data' | `data-${string}` }>,
    message: Message
  ) => string | ContentPart | ContentPart[] | null | undefined
}

export interface ChatPersistOptions {
  key: string
  version?: number
  storage?: Storage | null
  serialize?: UsePersistOptions<Message[]>['serialize']
  deserialize?: UsePersistOptions<Message[]>['deserialize']
}

export type DataPartValidator<TData = unknown> = (data: unknown) => data is TData

export type DataPartSchema<TData = unknown> = Record<string, unknown> | DataPartValidator<TData>

export type DataPartSchemas<TData = unknown> = Record<string, DataPartSchema<TData>>

export type MessageMetadataValidator<
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> = (metadata: unknown) => metadata is TMessageMetadata

export type MessageMetadataSchema<
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> = Record<string, unknown> | MessageMetadataValidator<TMessageMetadata>

export interface ValidateMessagesOptions<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  dataPartSchemas?: DataPartSchemas<TData>
  messageMetadataSchema?: MessageMetadataSchema<TMessageMetadata>
}

export type ValidateUIMessagesOptions<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> = ValidateMessagesOptions<TData, TMessageMetadata>

export type SafeValidateMessagesResult =
  | {
      success: true
      messages: Message[]
    }
  | {
      success: false
      error: Error
    }

export type SafeValidateUIMessagesResult = SafeValidateMessagesResult

export interface UseChatOptions<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
>
  extends RetryOptions, StreamThrottleOptions {
  chat?: Chat<TData, TMessageMetadata>
  provider?: ChatProvider
  transport?: ChatProvider
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: ProxyProviderConfig['headers']
  body?: ProxyProviderConfig['body']
  fetch?: typeof fetch
  streamProtocol?: ChatStreamProtocol
  initialMessages?: Message[]
  messages?: Message[]
  initialInput?: string
  defaultRequest?: Partial<ChatRequest>
  id?: string
  threadId?: string
  forwardedProps?: Record<string, unknown>
  context?: unknown
  generateId?: IdGenerator
  resume?: boolean
  prepareStep?: PrepareStep
  prepareSendMessagesRequest?: PrepareSendMessagesRequest
  prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest
  persist?: ChatPersistOptions
  tools?: ChatToolsInput
  activeTools?: string[]
  toolChoice?: ChatRequest['toolChoice']
  toolHandlers?: Record<string, ToolCallHandler>
  requiresToolApproval?: ToolApprovalPredicate
  sendAutomaticallyWhen?: SendAutomaticallyWhen | false
  stopWhen?: StopWhen | readonly StopWhen[]
  maxToolRoundtrips?: number
  dataPartSchemas?: DataPartSchemas<TData>
  messageMetadataSchema?: MessageMetadataSchema<TMessageMetadata>
  onChunk?: (chunk: ChatChunk, assistant: Message) => void
  onData?: (part: StreamDataPart<TData>) => void
  onRequest?: (info: ChatRequestInfo) => void
  onResponse?: (info: ChatResponseInfo) => void
  onToolCall?: (args: unknown, context: ToolCallHandlerContext) => void
  onToolResult?: (result: unknown, context: ToolResultHandlerContext) => void
  onUpdate?: (m: Message) => void
  onFinish?: (m: Message, info: ChatFinishInfo) => void
  onError?: (e: Error) => void
}

export interface UseChatReturn<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  id: Ref<string>
  messages: Ref<Message[]>
  input: Ref<string>
  status: Ref<ChatStatus>
  usage: Ref<TokenUsage | null>
  data: Ref<StreamDataPart<TData>[]>
  streamData: Ref<StreamDataPart<TData>[]>
  pendingToolCalls: Ref<ToolCall[]>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<ChatRequestInfo | null>
  lastResponse: Ref<ChatResponseInfo | null>
  append: (c: string | Message, o?: AppendChatOptions<TMessageMetadata>) => Promise<void>
  sendMessage: (
    c?: string | Message | SendChatMessageInput<TMessageMetadata>,
    o?: AppendChatOptions<TMessageMetadata>
  ) => Promise<void>
  addToolResult: {
    (toolCallId: string, result: unknown, o?: Partial<ChatRequest>): Promise<void>
    (output: AddToolResultOptions, o?: Partial<ChatRequest>): Promise<void>
  }
  addToolOutput: (output: AddToolOutputOptions, o?: Partial<ChatRequest>) => Promise<void>
  addToolApprovalResponse: (
    response: ToolApprovalResponse,
    o?: Partial<ChatRequest>
  ) => Promise<void>
  approveToolCall: (toolCallId: string, o?: Partial<ChatRequest>) => Promise<void>
  rejectToolCall: (toolCallId: string, reason?: unknown, o?: Partial<ChatRequest>) => Promise<void>
  regenerate: (o?: RegenerateChatOptions) => Promise<void>
  resumeStream: (o?: ResumeChatOptions) => Promise<void>
  reload: () => Promise<void>
  stop: () => void
  setId: (id: string) => void
  setInput: (value: string) => void
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: AppendChatOptions<TMessageMetadata>
  ) => Promise<void>
  setMessages: (m: SetMessagesInput) => void
  setData: (data: SetDataInput<TData>) => void
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

export type ChatOptions<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> = Omit<UseChatOptions<TData, TMessageMetadata>, 'chat'>

const empty = [] as Message[]

export function lastAssistantMessageIsCompleteWithToolCalls({
  messages
}: SendAutomaticallyWhenOptions): boolean {
  let assistantIndex = -1
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'assistant') {
      assistantIndex = i
      break
    }
  }
  if (assistantIndex < 0) return false

  const assistant = messages[assistantIndex]
  const calls = assistant.toolCalls ?? []
  if (!calls.length) return false

  const toolResultIds = new Set(
    messages
      .slice(assistantIndex + 1)
      .filter((message) => message.role === 'tool' && message.toolCallId)
      .map((message) => message.toolCallId)
  )
  return calls.every((call) => Boolean(call.id && toolResultIds.has(call.id)))
}

function latestAssistantToolCalls(messages: Message[]): ToolCall[] {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const calls = messages[i].role === 'assistant' ? messages[i].toolCalls : undefined
    if (calls?.length) return calls
  }
  return []
}

export function isStepCount(count: number): StopWhen {
  return ({ messages }) =>
    messages.filter((message) => message.role === 'assistant' && message.toolCalls?.length)
      .length >= count
}

export const stepCountIs = isStepCount

export function hasToolCall(...toolNames: string[]): StopWhen {
  return ({ toolCalls }) =>
    toolNames.length
      ? toolCalls.some((call) => toolNames.includes(call.function.name))
      : toolCalls.length > 0
}

interface NormalizedChatTools {
  tools?: Tool[]
  toolHandlers?: Record<string, ToolCallHandler>
}

function mergeToolHandlers(
  generatedHandlers?: Record<string, ToolCallHandler>,
  configuredHandlers?: Record<string, ToolCallHandler>
): Record<string, ToolCallHandler> | undefined {
  if (configuredHandlers !== undefined) {
    return {
      ...(generatedHandlers ?? {}),
      ...configuredHandlers
    }
  }
  const merged = {
    ...(generatedHandlers ?? {})
  }
  return Object.keys(merged).length ? merged : undefined
}

function normalizeChatTools(input?: ChatToolsInput): NormalizedChatTools {
  if (!input) return {}
  if (Array.isArray(input)) return { tools: input }

  const tools: Tool[] = []
  const toolHandlers: Record<string, ToolCallHandler> = {}

  for (const [name, definition] of Object.entries(input)) {
    if (isWireTool(definition)) {
      tools.push(definition)
      continue
    }

    const parameters =
      definition.parameters ?? schemaToParameters(definition.inputSchema) ?? emptyObjectSchema()
    tools.push({
      type: 'function',
      function: {
        name,
        ...(definition.description ? { description: definition.description } : {}),
        parameters,
        ...(definition.strict !== undefined ? { strict: definition.strict } : {})
      }
    })

    if (definition.execute) {
      toolHandlers[name] = (args, context) => definition.execute?.(args, context)
    }
  }

  return {
    ...(tools.length ? { tools } : {}),
    ...(Object.keys(toolHandlers).length ? { toolHandlers } : {})
  }
}

function isWireTool(value: Tool | AnyToolDefinition): value is Tool {
  return (
    isRecord(value) &&
    value.type === 'function' &&
    isRecord(value.function) &&
    typeof value.function.name === 'string' &&
    isRecord(value.function.parameters)
  )
}

function schemaToParameters(schema?: ToolInputSchema): Record<string, unknown> | undefined {
  if (!schema) return undefined
  if (isJsonSchemaDefinition(schema)) return schema.schema
  return schema
}

function isJsonSchemaDefinition(value: ToolInputSchema): value is JsonSchemaDefinition {
  return isRecord(value) && value.kind === 'json-schema' && isRecord(value.schema)
}

function emptyObjectSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {},
    additionalProperties: true
  }
}

function serializeCreatedAt(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString()
  if (typeof value === 'string') return value
  return undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === 'system' || value === 'user' || value === 'assistant' || value === 'tool'
}

function deserializeContent(raw: unknown): MessageContent | null {
  if (typeof raw === 'string') return raw
  if (!Array.isArray(raw)) return null

  const parts: ContentPart[] = []
  for (const part of raw) {
    if (!isRecord(part)) return null
    if (part.type === 'text') {
      if (typeof part.text !== 'string') return null
      parts.push({ type: 'text', text: part.text })
      continue
    }
    if (part.type === 'image_url') {
      const image = part.image_url
      if (!isRecord(image) || typeof image.url !== 'string') return null
      if (
        image.detail !== undefined &&
        image.detail !== 'low' &&
        image.detail !== 'high' &&
        image.detail !== 'auto'
      ) {
        return null
      }
      parts.push({
        type: 'image_url',
        image_url: {
          url: image.url,
          ...(image.detail ? { detail: image.detail } : {})
        }
      })
      continue
    }
    return null
  }
  return parts
}

function deserializeToolCalls(raw: unknown): ToolCall[] | null {
  if (!Array.isArray(raw)) return null

  const calls: ToolCall[] = []
  for (const call of raw) {
    if (!isRecord(call) || call.type !== 'function') return null
    const fn = call.function
    if (
      typeof call.id !== 'string' ||
      !isRecord(fn) ||
      typeof fn.name !== 'string' ||
      typeof fn.arguments !== 'string'
    ) {
      return null
    }
    calls.push({
      id: call.id,
      type: 'function',
      function: {
        name: fn.name,
        arguments: fn.arguments
      }
    })
  }
  return calls
}

function deserializeMessageParts(raw: unknown): MessagePart[] | null {
  if (!Array.isArray(raw)) return null

  const parts: MessagePart[] = []
  for (const part of raw) {
    if (!isRecord(part) || typeof part.type !== 'string') return null
    if (part.type === 'text' || part.type === 'reasoning') {
      if (typeof part.text !== 'string') return null
      parts.push({ ...part, type: part.type, text: part.text } as MessagePart)
      continue
    }
    if (part.type === 'source') {
      if (
        part.sourceType !== undefined &&
        part.sourceType !== 'url' &&
        part.sourceType !== 'document'
      ) {
        return null
      }
      parts.push({ ...part, type: 'source' } as MessagePart)
      continue
    }
    if (part.type === 'file') {
      if (typeof part.url !== 'string') return null
      parts.push({ ...part, type: 'file', url: part.url } as MessagePart)
      continue
    }
    if (part.type === 'data' || part.type.startsWith('data-')) {
      parts.push({ ...part, type: part.type } as MessagePart)
      continue
    }
    if (part.type.startsWith('tool-')) {
      if (
        typeof part.toolCallId !== 'string' ||
        typeof part.toolName !== 'string' ||
        (part.state !== 'input-streaming' &&
          part.state !== 'input-available' &&
          part.state !== 'output-available' &&
          part.state !== 'output-error')
      ) {
        return null
      }
      parts.push({ ...part, type: part.type } as MessagePart)
      continue
    }
    return null
  }

  return parts
}

function deserializeCreatedAt(raw: unknown): Date | undefined {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return new Date(raw)
  if (typeof raw !== 'string') return undefined
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function mergeMessageParts(
  existing: MessagePart[] | undefined,
  incoming: MessagePart[]
): MessagePart[] {
  const parts = existing ? existing.map((part) => ({ ...part })) : []
  for (const part of incoming) {
    if (part.type === 'text') {
      const textIndex = findTextPartIndex(parts, part)
      if (textIndex >= 0) {
        const current = parts[textIndex] as Extract<MessagePart, { type: 'text' }>
        parts[textIndex] = { ...current, text: current.text + part.text }
        continue
      }
    }

    const replaceIndex = findReplaceablePartIndex(parts, part)
    if (replaceIndex >= 0) {
      parts[replaceIndex] = { ...parts[replaceIndex], ...part }
      continue
    }
    parts.push({ ...part })
  }
  return parts
}

function findTextPartIndex(parts: MessagePart[], part: Extract<MessagePart, { type: 'text' }>) {
  if (part.id) return parts.findIndex((item) => item.type === 'text' && item.id === part.id)
  const lastIndex = parts.length - 1
  return parts[lastIndex]?.type === 'text' && !parts[lastIndex].id ? lastIndex : -1
}

function findReplaceablePartIndex(parts: MessagePart[], part: MessagePart) {
  if (isToolMessagePart(part)) {
    return parts.findIndex((item) => isToolMessagePart(item) && item.toolCallId === part.toolCallId)
  }
  if ('id' in part && part.id) {
    return parts.findIndex((item) => item.type === part.type && 'id' in item && item.id === part.id)
  }
  return -1
}

function isToolMessagePart(
  part: MessagePart
): part is Extract<MessagePart, { toolCallId: string }> {
  return part.type.startsWith('tool-') && 'toolCallId' in part
}

function streamDataToMessagePart(part: StreamDataPart): MessagePart {
  if (part.type?.startsWith('source-')) {
    const data = isRecord(part.data) ? part.data : {}
    return {
      type: 'source',
      id: part.id,
      sourceType: part.type === 'source-url' ? 'url' : 'document',
      ...(typeof data.url === 'string' ? { url: data.url } : {}),
      ...(typeof data.title === 'string' ? { title: data.title } : {}),
      ...(typeof data.mediaType === 'string' ? { mediaType: data.mediaType } : {}),
      data: part.data
    }
  }

  if (part.type === 'file' && isRecord(part.data) && typeof part.data.url === 'string') {
    return {
      type: 'file',
      id: part.id,
      url: part.data.url,
      ...(typeof part.data.mediaType === 'string' ? { mediaType: part.data.mediaType } : {}),
      ...(typeof part.data.name === 'string' ? { name: part.data.name } : {}),
      data: part.data
    }
  }

  if (part.type?.startsWith('tool-output-') && isRecord(part.data)) {
    const toolCallId = typeof part.data.toolCallId === 'string' ? part.data.toolCallId : part.id
    const toolName = typeof part.data.toolName === 'string' ? part.data.toolName : 'tool'
    return {
      type: `tool-${toolName}`,
      toolCallId,
      toolName,
      state: part.type === 'tool-output-error' ? 'output-error' : 'output-available',
      ...('output' in part.data ? { output: part.data.output } : {}),
      ...(typeof part.data.errorText === 'string' ? { errorText: part.data.errorText } : {})
    }
  }

  const dataType = part.type?.startsWith('data-') ? (part.type as `data-${string}`) : 'data'
  return {
    type: dataType,
    id: part.id,
    data: part.data,
    transient: part.transient
  }
}

function toolCallsToMessageParts(calls: ToolCall[]): MessagePart[] {
  return calls.map((call) => ({
    type: `tool-${call.function.name || 'call'}`,
    toolCallId: call.id,
    toolName: call.function.name || 'call',
    state: 'input-streaming',
    inputText: call.function.arguments
  }))
}

/**
 * Convert chat messages into a JSON-safe persistence payload.
 */
export function serializeMessages(messages: Message[]): SerializedMessage[] {
  return messages.map((message) => {
    const { createdAt, ...rest } = cloneMessage(message) as Message & { createdAt?: unknown }
    const serializedCreatedAt = serializeCreatedAt(createdAt)
    return serializedCreatedAt ? { ...rest, createdAt: serializedCreatedAt } : rest
  })
}

/**
 * Restore and validate messages previously produced by `serializeMessages()`.
 */
export function deserializeMessages(raw: unknown): Message[] | null {
  if (!Array.isArray(raw)) return null

  const messages: Message[] = []
  for (const rawMessage of raw) {
    if (!isRecord(rawMessage)) return null
    const { id, role } = rawMessage
    if (typeof id !== 'string' || !isMessageRole(role)) return null

    const content = deserializeContent(rawMessage.content)
    if (content === null) return null

    const message: Message = { id, role, content }
    if (typeof rawMessage.name === 'string') message.name = rawMessage.name
    if (typeof rawMessage.toolCallId === 'string') message.toolCallId = rawMessage.toolCallId

    if (rawMessage.toolCalls !== undefined) {
      const toolCalls = deserializeToolCalls(rawMessage.toolCalls)
      if (toolCalls === null) return null
      message.toolCalls = toolCalls
    }

    if (rawMessage.parts !== undefined) {
      const parts = deserializeMessageParts(rawMessage.parts)
      if (parts === null) return null
      message.parts = parts
    }

    if (isRecord(rawMessage.metadata)) message.metadata = { ...rawMessage.metadata }

    const createdAt = deserializeCreatedAt(rawMessage.createdAt)
    if (createdAt) message.createdAt = createdAt

    messages.push(message)
  }

  return messages
}

/**
 * Check whether an unknown payload can be restored by `deserializeMessages()`.
 */
export function validateMessages(raw: unknown, options: ValidateMessagesOptions = {}): boolean {
  return safeValidateMessages(raw, options).success
}

/**
 * Restore messages and return either the validated payload or the validation error.
 */
export function safeValidateMessages(
  raw: unknown,
  options: ValidateMessagesOptions = {}
): SafeValidateMessagesResult {
  const messages = deserializeMessages(raw)
  if (!messages) {
    return {
      success: false,
      error: new AiHooksError('Messages could not be deserialized')
    }
  }

  try {
    validateRestoredMessages(messages, options)
    return { success: true, messages }
  } catch (err) {
    return { success: false, error: normalizeValidationError(err) }
  }
}

/**
 * AI SDK-style helper that returns validated UI messages or throws.
 */
export function validateUIMessages(
  raw: unknown,
  options: ValidateUIMessagesOptions = {}
): Message[] {
  const result = safeValidateMessages(raw, options)
  if (!result.success) throw result.error
  return result.messages
}

/**
 * AI SDK-style helper that returns a discriminated result instead of throwing.
 */
export function safeValidateUIMessages(
  raw: unknown,
  options: ValidateUIMessagesOptions = {}
): SafeValidateUIMessagesResult {
  return safeValidateMessages(raw, options)
}

function validateRestoredMessages(messages: Message[], options: ValidateMessagesOptions) {
  messages.forEach((message, messageIndex) => {
    validateRestoredMessageMetadata(message.metadata, options, `messages[${messageIndex}].metadata`)
    message.parts?.forEach((part, partIndex) => {
      if (isMessageDataPart(part)) {
        validateRestoredDataPart(
          part,
          options,
          `messages[${messageIndex}].parts[${partIndex}].data`
        )
      }
    })
  })
}

function isMessageDataPart(
  part: MessagePart
): part is Extract<MessagePart, { type: 'data' | `data-${string}` }> {
  return part.type === 'data' || part.type.startsWith('data-')
}

function validateRestoredMessageMetadata(
  metadata: unknown,
  options: ValidateMessagesOptions,
  path: string
) {
  if (metadata === undefined || !options.messageMetadataSchema) return
  const error =
    typeof options.messageMetadataSchema === 'function'
      ? options.messageMetadataSchema(metadata)
        ? null
        : `${path} did not match validator`
      : validateJsonSchema(metadata, options.messageMetadataSchema, path)
  if (error) throw new AiHooksError(`Message metadata did not match schema: ${error}`)
}

function validateRestoredDataPart(
  part: Extract<MessagePart, { type: 'data' | `data-${string}` }>,
  options: ValidateMessagesOptions,
  path: string
) {
  const schema = options.dataPartSchemas?.[part.type]
  if (!schema) return
  const error =
    typeof schema === 'function'
      ? schema(part.data)
        ? null
        : `${path} did not match validator`
      : validateJsonSchema(part.data, schema, path)
  if (error) throw new AiHooksError(`Stream data part did not match schema: ${error}`)
}

function normalizeValidationError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

function toAiSdkTrigger(trigger: SendChatTrigger): AiSdkSendChatTrigger {
  return trigger === 'regenerate-message' ? 'regenerate-assistant-message' : 'submit-user-message'
}

/**
 * Convert UI chat messages into provider/model-facing messages.
 */
export function convertToModelMessages(
  messages: Message[],
  options: ConvertToModelMessagesOptions = {}
): ModelMessage[] {
  const {
    preserveIds = false,
    preserveCreatedAt = false,
    stripMetadata = false,
    ignoreIncompleteToolCalls = false
  } = options
  let completedToolCallIds: Set<string> | null = null
  if (ignoreIncompleteToolCalls) {
    completedToolCallIds = new Set()
    for (const message of messages) {
      if (message.role === 'tool' && message.toolCallId)
        completedToolCallIds.add(message.toolCallId)
    }
  }
  const toolDefinitions = options.tools && !Array.isArray(options.tools) ? options.tools : null
  const toolCallsById = toolDefinitions ? new Map<string, ToolCall>() : null
  if (toolCallsById) {
    for (const message of messages) {
      if (message.role !== 'assistant') continue
      for (const call of message.toolCalls ?? []) toolCallsById.set(call.id, call)
    }
  }

  return messages.map((message) => {
    const converted = cloneMessage(message) as ModelMessage & { parts?: MessagePart[] }
    const dataParts = convertModelDataParts(message, options)

    delete converted.parts
    if (dataParts.length) {
      converted.content = appendModelContentParts(converted.content, dataParts)
    }
    if (!preserveIds) delete converted.id
    if (!preserveCreatedAt) delete converted.createdAt
    else if (converted.createdAt !== undefined) {
      converted.createdAt = new Date(converted.createdAt.getTime())
    }
    if (completedToolCallIds) {
      const calls = converted.toolCalls?.filter((call) => completedToolCallIds.has(call.id))
      if (calls?.length) converted.toolCalls = calls
      else delete converted.toolCalls
    }
    if (toolDefinitions && toolCallsById && message.role === 'tool' && message.toolCallId) {
      const toolCall = toolCallsById.get(message.toolCallId)
      const definition = toolCall ? toolDefinitions[toolCall.function.name] : undefined
      if (toolCall && definition && !isWireTool(definition) && definition.toModelOutput) {
        let output: unknown = message.content
        if (typeof output === 'string') {
          try {
            output = JSON.parse(output) as unknown
          } catch {
            output = message.content
          }
        }
        const content = definition.toModelOutput(output, { toolCall, message, messages })
        if (content != null) {
          converted.content =
            typeof content === 'string'
              ? content
              : Array.isArray(content)
                ? content.map((part) => ({ ...part }))
                : [{ ...content }]
        }
      }
    }
    if (stripMetadata) delete converted.metadata
    return converted
  })
}

function convertModelDataParts(
  message: Message,
  options: ConvertToModelMessagesOptions
): ContentPart[] {
  if (!options.convertDataPart || !message.parts?.length) return []

  const converted: ContentPart[] = []
  for (const part of message.parts) {
    if (!isMessageDataPart(part)) continue
    const next = options.convertDataPart(part, message)
    if (next == null) continue
    if (typeof next === 'string') {
      if (next) converted.push({ type: 'text', text: next })
      continue
    }
    converted.push(...(Array.isArray(next) ? next : [next]))
  }
  return converted
}

function appendModelContentParts(content: MessageContent, parts: ContentPart[]): ContentPart[] {
  const base: ContentPart[] =
    typeof content === 'string' ? (content ? [{ type: 'text', text: content }] : []) : content
  return [...base.map((part) => ({ ...part })), ...parts.map((part) => ({ ...part }))]
}

function hasContent(content: MessageContent): boolean {
  if (typeof content === 'string') return content.trim().length > 0
  return content.some((part) => {
    if (part.type === 'text') return part.text.trim().length > 0
    return Boolean(part.image_url.url)
  })
}

function isEmptyMessage(message: Message): boolean {
  return !hasContent(message.content) && !message.toolCalls?.length
}

function pruneHistoricalDetails(
  index: number,
  total: number,
  strategy: PruneToolCallsStrategy,
  label: string
): boolean {
  if (strategy === 'none') return false
  if (strategy === 'all') return true
  if (strategy === 'before-last-message') return index < total - 1

  const match = /^before-last-(\d+)-messages$/.exec(strategy)
  if (!match) throw new Error(`Unsupported ${label} pruning strategy: ${strategy}`)
  return index < total - Number(match[1])
}

function isPruneToolCallsRules(
  option: PruneToolCallsOption
): option is readonly PruneToolCallsRule[] {
  return Array.isArray(option)
}

/**
 * Trim chat history before sending it to a provider or proxy.
 */
export function pruneMessages(options: PruneMessagesOptions): Message[] {
  const {
    messages,
    maxMessages,
    keepSystem = true,
    emptyMessages = 'remove',
    toolCalls = 'none',
    reasoning = 'none'
  } = options
  if (maxMessages !== undefined && maxMessages < 0) {
    throw new Error('pruneMessages() maxMessages must be greater than or equal to 0')
  }

  const total = messages.length
  let toolCallStrategy: PruneToolCallsStrategy = 'none'
  let toolCallRules: readonly PruneToolCallsRule[] | null = null
  if (isPruneToolCallsRules(toolCalls)) {
    toolCallRules = toolCalls
  } else {
    toolCallStrategy = toolCalls
  }

  const prunedToolCallIds = new Set<string>()
  messages.forEach((message, index) => {
    message.toolCalls?.forEach((call) => {
      const shouldPrune = toolCallRules
        ? toolCallRules.some(
            (rule) =>
              (!rule.tools?.length || rule.tools.includes(call.function.name)) &&
              pruneHistoricalDetails(index, total, rule.type, 'tool call')
          )
        : pruneHistoricalDetails(index, total, toolCallStrategy, 'tool call')
      if (shouldPrune) prunedToolCallIds.add(call.id)
    })
  })

  let pruned = messages
    .map((message, index) => {
      const next = cloneMessage(message)
      if (pruneHistoricalDetails(index, total, reasoning, 'reasoning') && next.parts?.length) {
        next.parts = next.parts.filter((part) => part.type !== 'reasoning')
        if (!next.parts.length) delete next.parts
      }
      const pruneToolResult =
        !toolCallRules && pruneHistoricalDetails(index, total, toolCallStrategy, 'tool call')
      if (
        next.role === 'tool' &&
        (pruneToolResult ||
          (next.toolCallId !== undefined && prunedToolCallIds.has(next.toolCallId)))
      ) {
        return null
      }
      if (next.toolCalls?.length) {
        next.toolCalls = next.toolCalls.filter((call) => !prunedToolCallIds.has(call.id))
        if (!next.toolCalls.length) delete next.toolCalls
      }
      if (pruneToolResult) {
        if (next.role === 'tool') return null
        delete next.toolCalls
      }
      return next
    })
    .filter((message): message is Message => message !== null)

  if (emptyMessages === 'remove') {
    pruned = pruned.filter((message) => !isEmptyMessage(message))
  }

  if (maxMessages === undefined) return pruned
  const nonSystemTail =
    maxMessages === 0
      ? []
      : pruned.filter((message) => message.role !== 'system').slice(-maxMessages)
  const keep = new Set(nonSystemTail)
  return pruned.filter((message) => (keepSystem && message.role === 'system') || keep.has(message))
}

interface SendChatContext {
  trigger: SendChatTrigger
  messageId?: string
  stepNumber: number
}

interface ChatState<TData = unknown> extends RequestTrace<ChatRequestInfo, ChatResponseInfo> {
  messages: Ref<Message[]>
  input: Ref<string>
  status: Ref<ChatStatus>
  usage: Ref<TokenUsage | null>
  streamData: Ref<StreamDataPart<TData>[]>
  bufferedStreamData: StreamDataPart<TData>[]
  pendingToolCalls: Ref<ToolCall[]>
  pendingToolRequest: Ref<ChatRequest | null>
  pendingToolSendContext: SendChatContext | null
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  abortController: Ref<AbortController | null>
}

const chatStates = new Map<string, ChatState<unknown>>()

function getChatState<TData = unknown>(
  id: string,
  initialMessages: Message[],
  initialInput: string
): ChatState<TData> {
  const existing = chatStates.get(id)
  if (existing) return existing as ChatState<TData>

  const state: ChatState<TData> = {
    messages: ref<Message[]>([...initialMessages]) as Ref<Message[]>,
    input: ref(initialInput),
    status: ref<ChatStatus>('ready'),
    usage: ref<TokenUsage | null>(null),
    streamData: ref<StreamDataPart<TData>[]>([]) as Ref<StreamDataPart<TData>[]>,
    bufferedStreamData: [],
    pendingToolCalls: ref<ToolCall[]>([]) as Ref<ToolCall[]>,
    pendingToolRequest: shallowRef<ChatRequest | null>(null),
    pendingToolSendContext: null,
    isLoading: ref(false),
    error: ref<Error | null>(null),
    ...createRequestTrace<ChatRequestInfo, ChatResponseInfo>(),
    abortController: shallowRef<AbortController | null>(null)
  }
  chatStates.set(id, state as ChatState<unknown>)
  return state
}

export function useChat<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
>(options: UseChatOptions<TData, TMessageMetadata> = {}): UseChatReturn<TData, TMessageMetadata> {
  if (options.chat) return options.chat

  const {
    provider: providedProvider,
    transport,
    api,
    baseURL,
    credentials,
    headers: transportHeaders,
    body: transportBody,
    fetch: transportFetch,
    streamProtocol,
    initialMessages,
    messages: messagesOption,
    initialInput = '',
    defaultRequest = {},
    threadId: defaultThreadId,
    forwardedProps: defaultForwardedProps,
    context: runtimeContext,
    onUpdate,
    onFinish,
    onError,
    persist,
    tools: defaultToolsInput,
    activeTools: defaultActiveTools,
    toolChoice: defaultToolChoice,
    toolHandlers: configuredToolHandlers,
    requiresToolApproval,
    sendAutomaticallyWhen,
    stopWhen,
    maxToolRoundtrips = 1,
    dataPartSchemas,
    messageMetadataSchema,
    onChunk,
    onData,
    onRequest,
    onResponse,
    onToolCall,
    onToolResult
  } = options
  const normalizedDefaultTools = normalizeChatTools(defaultToolsInput)
  const defaultTools = normalizedDefaultTools.tools
  const toolHandlers = mergeToolHandlers(
    normalizedDefaultTools.toolHandlers,
    configuredToolHandlers
  )
  const provider =
    providedProvider ??
    transport ??
    proxyProvider({
      baseURL,
      chatUrl: api ?? '/api/chat',
      credentials,
      headers: transportHeaders,
      body: transportBody,
      fetch: transportFetch
    })
  const requestApi = providedProvider || transport ? undefined : (api ?? '/api/chat')
  const requestCredentials = providedProvider || transport ? undefined : credentials
  const proxyRequestInfo = requestApi ? { api: requestApi, credentials: requestCredentials } : {}
  const nextId = options.generateId ?? createId
  const id = ref(options.id || nextId('chat'))
  const state = getChatState<TData>(
    id.value,
    initialMessages ?? messagesOption ?? empty,
    initialInput
  )
  const {
    messages,
    input,
    status,
    usage,
    streamData,
    pendingToolCalls,
    pendingToolRequest,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    clearTrace,
    abortController
  } = state
  const persistence = persist
    ? usePersist(messages, {
        key: persist.key,
        version: persist.version,
        storage: persist.storage,
        serialize: persist.serialize ?? serializeMessages,
        deserialize: persist.deserialize ?? deserializeMessages,
        onError: (e) => {
          error.value = e
        }
      })
    : null
  validateMessagesMetadata(messages.value)

  function setMessages(next: SetMessagesInput) {
    const resolved = typeof next === 'function' ? next([...messages.value]) : next
    validateMessagesMetadata(resolved)
    messages.value = [...resolved]
    resetTurnState()
    clearPendingToolCalls()
  }
  function setData(next: SetDataInput<TData>) {
    const resolved =
      typeof next === 'function' ? next(streamData.value.map((part) => ({ ...part }))) : next
    resolved.forEach(validateDataPart)
    streamData.value = state.bufferedStreamData = [...resolved]
  }
  function setId(next: string) {
    id.value = next
  }
  function setInput(value: string) {
    input.value = value
  }
  function handleInputChange(event: Event | { target?: { value?: unknown } } | string) {
    if (typeof event === 'string') {
      setInput(event)
      return
    }

    const value = (event.target as { value?: unknown } | null | undefined)?.value
    setInput(value == null ? '' : String(value))
  }
  function resetTurnState() {
    usage.value = null
    streamData.value = []
    state.bufferedStreamData = []
  }
  function clearError() {
    error.value = null
    status.value = 'ready'
  }
  function replaceAssistant(assistant: Message, targetId = assistant.id) {
    const idx = messages.value.findIndex((m) => m.id === targetId)
    if (idx >= 0) {
      messages.value = [
        ...messages.value.slice(0, idx),
        { ...assistant },
        ...messages.value.slice(idx + 1)
      ]
    }
  }
  function clear() {
    abortController.value?.abort()
    abortController.value = null
    messages.value = []
    resetTurnState()
    error.value = null
    clearTrace()
    status.value = 'ready'
    clearPendingToolCalls()
    isLoading.value = false
    input.value = ''
    persistence?.clear()
  }
  function stop() {
    abortController.value?.abort()
    abortController.value = null
    isLoading.value = false
    status.value = 'ready'
  }
  function buildAssistant(): Message {
    return {
      id: nextId('assistant'),
      role: 'assistant' as MessageRole,
      content: '',
      createdAt: new Date()
    }
  }
  function bytesToBase64(bytes: Uint8Array): string {
    const buffer = (
      globalThis as {
        Buffer?: { from(input: Uint8Array): { toString(encoding: 'base64'): string } }
      }
    ).Buffer
    if (buffer) return buffer.from(bytes).toString('base64')

    let binary = ''
    const chunkSize = 0x8000
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
    }
    const btoaFn = (globalThis as { btoa?: (value: string) => string }).btoa
    if (!btoaFn) {
      throw new AiHooksError('Cannot encode image attachment because base64 is unavailable')
    }
    return btoaFn(binary)
  }
  async function imageFileToDataUrl(file: File): Promise<string> {
    const readArrayBuffer = (file as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer
    if (!readArrayBuffer) return readFileAsDataUrl(file)
    const bytes = new Uint8Array(await readArrayBuffer.call(file))
    return `data:${file.type};base64,${bytesToBase64(bytes)}`
  }
  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        reject(new AiHooksError('Cannot read image attachment because FileReader is unavailable'))
        return
      }
      const reader = new FileReader()
      reader.onerror = () =>
        reject(reader.error ?? new AiHooksError('Image attachment read failed'))
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
          return
        }
        reject(new AiHooksError('Image attachment did not produce a data URL'))
      }
      reader.readAsDataURL(file)
    })
  }
  function readFileAsText(file: File): Promise<string> {
    const readText = (file as { text?: () => Promise<string> }).text
    if (readText) return readText.call(file)
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        reject(new AiHooksError('Cannot read text attachment because FileReader is unavailable'))
        return
      }
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error ?? new AiHooksError('Text attachment read failed'))
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
          return
        }
        reject(new AiHooksError('Text attachment did not produce text'))
      }
      reader.readAsText(file)
    })
  }
  function isBrowserFile(attachment: ChatAttachmentInput): attachment is File {
    if (typeof File !== 'undefined' && attachment instanceof File) return true
    return typeof (attachment as File).arrayBuffer === 'function'
  }
  function attachmentName(attachment: ChatFileAttachment): string | undefined {
    return attachment.name
  }
  function textAttachmentPart(name: string | undefined, text: string): ContentPart {
    const label = name ? `File ${name}:\n` : ''
    return { type: 'text', text: `${label}${text}` }
  }
  async function browserFileToContentPart(file: File): Promise<ContentPart> {
    if (file.type.startsWith('image/')) {
      return {
        type: 'image_url',
        image_url: { url: await imageFileToDataUrl(file) }
      }
    }
    if (file.type.startsWith('text/')) {
      return textAttachmentPart(file.name, await readFileAsText(file))
    }
    const label = file.type || file.name || 'unknown'
    throw new AiHooksError(
      `Unsupported attachment type "${label}". Only image/* and text/* files can be converted automatically.`
    )
  }
  function fileObjectToContentPart(file: ChatFileAttachment): ContentPart {
    if (file.type.startsWith('image/') && file.url) {
      return {
        type: 'image_url',
        image_url: { url: file.url }
      }
    }
    if (file.type.startsWith('text/') && file.text !== undefined) {
      return textAttachmentPart(attachmentName(file), file.text)
    }
    const label = file.type || file.name || 'unknown'
    throw new AiHooksError(
      `Unsupported attachment object "${label}". Provide image/* with url or text/* with text.`
    )
  }
  async function attachmentToContentPart(attachment: ChatAttachmentInput): Promise<ContentPart> {
    if (isBrowserFile(attachment)) return browserFileToContentPart(attachment)
    return fileObjectToContentPart(attachment)
  }
  async function attachmentsToContentParts(
    attachments: readonly ChatAttachmentInput[]
  ): Promise<ContentPart[]> {
    return Promise.all(Array.from(attachments).map((file) => attachmentToContentPart(file)))
  }
  function appendContentParts(content: MessageContent, parts: ContentPart[]): MessageContent {
    if (!parts.length) return content
    const baseParts: ContentPart[] =
      typeof content === 'string' ? (content ? [{ type: 'text', text: content }] : []) : content
    return [...baseParts, ...parts]
  }
  function normalizeError(err: unknown): Error {
    return err instanceof Error ? err : new Error(String(err))
  }
  function clonePrepareMessages(
    requestMessages: ChatRequestMessage[],
    fallback: Message[] = []
  ): Message[] {
    const source = requestMessages.every((message) => typeof message.id === 'string')
      ? requestMessages
      : fallback
    return source.map((message) => cloneMessage(message as Message))
  }
  function reportError(err: unknown): Error {
    const e = normalizeError(err)
    error.value = e
    status.value = 'error'
    onError?.(e)
    return e
  }
  function requestInfo(
    kind: ChatRequestLifecycleKind,
    request: ChatRequest | ChatResumeRequest,
    attempt: number,
    context?: SendChatContext
  ): ChatRequestInfo {
    return {
      kind,
      id: request.id ?? id.value,
      providerId: provider.id,
      attempt,
      ...proxyRequestInfo,
      request: cloneRequestSnapshot(request),
      messages:
        kind === 'chat'
          ? (request as ChatRequest).messages.map(cloneMessage)
          : messages.value.map(cloneMessage),
      requestMetadata: request.metadata,
      ...(request.body ? { body: { ...request.body } } : {}),
      ...(request.headers ? { headers: headersToRecord(request.headers) } : {}),
      ...(context?.trigger
        ? { trigger: context.trigger, aiSdkTrigger: toAiSdkTrigger(context.trigger) }
        : {}),
      ...(context?.messageId ? { messageId: context.messageId } : {}),
      ...(context?.stepNumber !== undefined ? { stepNumber: context.stepNumber } : {})
    }
  }
  function reportRequest(info: ChatRequestInfo) {
    state.recordRequest(info)
    onRequest?.(info)
  }
  function reportResponse(
    info: ChatRequestInfo,
    stream: AsyncIterable<ChatChunk> | null | undefined
  ) {
    const response = state.recordResponse({
      ...info,
      hasStream: Boolean(stream)
    })
    onResponse?.(response)
  }
  function finishAssistant(
    assistant: Message,
    isAbort: boolean,
    isError: boolean,
    isDisconnect = false
  ) {
    if (!onFinish) return
    const message = { ...assistant }
    onFinish(message, {
      message,
      messages: messages.value.map((message) => ({ ...message })),
      isAbort,
      isError,
      isDisconnect,
      finishReason: assistant.metadata?.finishReason as ChatChunk['finishReason'] | undefined
    })
  }
  function parseToolArgs(call: ToolCall): unknown {
    const raw = call.function.arguments.trim()
    if (!raw) return {}
    try {
      return JSON.parse(raw) as unknown
    } catch (err) {
      throw new AiHooksError(`Invalid JSON arguments for tool "${call.function.name}"`, {
        cause: err
      })
    }
  }
  function serializeToolResult(result: unknown): string {
    if (typeof result === 'string') return result
    if (result === undefined) return ''
    return JSON.stringify(result)
  }
  function clearPendingToolCalls() {
    pendingToolCalls.value = []
    pendingToolRequest.value = null
    state.pendingToolSendContext = null
  }
  async function shouldSendAutomatically() {
    const predicate = sendAutomaticallyWhen ?? lastAssistantMessageIsCompleteWithToolCalls
    if (!predicate) return false
    return await predicate({ messages: messages.value.map(cloneMessage) })
  }
  async function shouldStopWhen() {
    if (!stopWhen) return false
    const conditions = Array.isArray(stopWhen) ? stopWhen : [stopWhen]
    const clonedMessages = messages.value.map(cloneMessage)
    const toolCalls = latestAssistantToolCalls(clonedMessages)
    for (const condition of conditions) {
      if (await condition({ messages: clonedMessages, toolCalls })) return true
    }
    return false
  }
  function requirePendingToolCall(toolCallId: string): ToolCall {
    const call = pendingToolCalls.value.find((item) => item.id === toolCallId)
    if (!call || !pendingToolRequest.value) {
      throw reportError(new AiHooksError(`No pending tool call found for "${toolCallId}"`))
    }
    return call
  }
  function toolContext(call: ToolCall, args: unknown): ToolCallHandlerContext {
    return {
      toolCall: call,
      messages: [...messages.value],
      args,
      context: runtimeContext
    }
  }
  function toolResultMessage(call: ToolCall, result: unknown): Message {
    return {
      id: nextId('tool'),
      role: 'tool',
      content: serializeToolResult(result),
      toolCallId: call.id,
      createdAt: new Date()
    }
  }
  function reportToolResult(
    call: ToolCall,
    args: unknown,
    result: unknown,
    resultMessage: Message
  ) {
    onToolResult?.(result, {
      toolCall: call,
      messages: [...messages.value],
      args,
      context: runtimeContext,
      resultMessage: { ...resultMessage }
    })
  }
  function processStreamData(
    chunk: ChatChunk,
    scheduleStreamData: () => void
  ): StreamDataPart<TData> | null {
    if (!('data' in chunk)) return null

    const part: StreamDataPart<TData> = {
      id: chunk.dataId || nextId('data'),
      data: chunk.data as TData,
      type: chunk.dataType,
      transient: chunk.transient,
      createdAt: new Date()
    }
    validateDataPart(part)
    onData?.({ ...part })

    if (part.transient) return part
    const idx = state.bufferedStreamData.findIndex((item) => item.id === part.id)
    state.bufferedStreamData =
      idx >= 0
        ? [
            ...state.bufferedStreamData.slice(0, idx),
            part,
            ...state.bufferedStreamData.slice(idx + 1)
          ]
        : [...state.bufferedStreamData, part]
    scheduleStreamData()
    return part
  }
  function validateDataPart(part: StreamDataPart<TData>) {
    const schema = part.type ? dataPartSchemas?.[part.type] : undefined
    if (!schema) return

    const error =
      typeof schema === 'function'
        ? schema(part.data)
          ? null
          : `data.${part.type} did not pass validator`
        : validateJsonSchema(part.data, schema, `data.${part.type}`)
    if (error) {
      throw new AiHooksError(`Stream data part "${part.type}" did not match schema: ${error}`)
    }
  }
  function validateMessageMetadata(metadata: unknown, path = 'message.metadata') {
    if (metadata === undefined || !messageMetadataSchema) return

    const error =
      typeof messageMetadataSchema === 'function'
        ? messageMetadataSchema(metadata)
          ? null
          : `${path} did not pass validator`
        : validateJsonSchema(metadata, messageMetadataSchema, path)
    if (error) throw new AiHooksError(`Message metadata did not match schema: ${error}`)
  }
  function validateMessagesMetadata(nextMessages: readonly Message[]) {
    if (!messageMetadataSchema) return
    nextMessages.forEach((message, index) => {
      validateMessageMetadata(message.metadata, `messages[${index}].metadata`)
    })
  }
  function withMessageMetadata(message: Message, metadata?: TMessageMetadata): Message {
    const nextMetadata =
      metadata === undefined ? message.metadata : { ...(message.metadata ?? {}), ...metadata }
    validateMessageMetadata(nextMetadata)
    return nextMetadata === undefined ? message : { ...message, metadata: nextMetadata }
  }
  async function executeToolCall(
    call: ToolCall,
    args: unknown,
    context: ToolCallHandlerContext,
    notifyCall: boolean
  ): Promise<Message> {
    const handler = toolHandlers?.[call.function.name]
    if (!handler) {
      throw new AiHooksError(`No tool handler registered for "${call.function.name}"`)
    }
    if (notifyCall) onToolCall?.(args, context)
    const result = await handler(args, context)
    const resultMessage = toolResultMessage(call, result)
    reportToolResult(call, args, result, resultMessage)
    return resultMessage
  }
  function awaitManualToolResults(
    calls: ToolCall[],
    request: ChatRequest,
    context: SendChatContext
  ) {
    for (const call of calls) {
      const args = parseToolArgs(call)
      onToolCall?.(args, toolContext(call, args))
    }
    pendingToolCalls.value = [...calls]
    pendingToolRequest.value = { ...request }
    state.pendingToolSendContext = { ...context }
  }
  async function executeReadyToolCalls(calls: ToolCall[], request: ChatRequest): Promise<boolean> {
    const toolMessages: Message[] = []
    const pendingCalls: ToolCall[] = []

    for (const call of calls) {
      const args = parseToolArgs(call)
      const context = toolContext(call, args)
      const needsApproval = (await requiresToolApproval?.(args, context)) ?? false

      if (needsApproval || !toolHandlers) {
        onToolCall?.(args, context)
        pendingCalls.push(call)
        continue
      }

      toolMessages.push(await executeToolCall(call, args, context, true))
    }

    if (toolMessages.length) messages.value = [...messages.value, ...toolMessages]
    if (!pendingCalls.length) return false

    pendingToolCalls.value = [...pendingCalls]
    pendingToolRequest.value = { ...request }
    return true
  }

  function applyChunk(
    assistant: Message,
    chunk: ChatChunk,
    scheduleAssistant: (notifyUpdate: boolean, targetId?: string) => void,
    scheduleStreamData: () => void
  ) {
    let changedAssistant = false
    let notifyUpdate = false
    let targetId: string | undefined
    const incomingParts: MessagePart[] = []
    if (chunk.messageId && chunk.messageId !== assistant.id) {
      targetId = assistant.id
      assistant.id = chunk.messageId
      changedAssistant = true
    }
    if (chunk.content) {
      assistant.content += chunk.content
      incomingParts.push({ type: 'text', text: chunk.content })
      changedAssistant = true
      notifyUpdate = true
    }
    if (chunk.toolCalls?.length) {
      assistant.toolCalls = mergeD(assistant.toolCalls, chunk.toolCalls)
      incomingParts.push(...toolCallsToMessageParts(assistant.toolCalls))
      changedAssistant = true
    }
    if (chunk.parts?.length) {
      incomingParts.push(...chunk.parts)
      changedAssistant = true
      notifyUpdate = true
    }
    if (chunk.finishReason) {
      assistant.metadata = { ...(assistant.metadata ?? {}), finishReason: chunk.finishReason }
      changedAssistant = true
    }
    if (chunk.usage) {
      usage.value = chunk.usage
      assistant.metadata = { ...(assistant.metadata ?? {}), usage: chunk.usage }
      changedAssistant = true
    }
    if (chunk.metadata) {
      validateMessageMetadata(chunk.metadata, 'assistant.metadata')
      assistant.metadata = { ...(assistant.metadata ?? {}), ...chunk.metadata }
      changedAssistant = true
    }
    const streamPart = processStreamData(chunk, scheduleStreamData)
    if (streamPart && !streamPart.transient) {
      incomingParts.push(streamDataToMessagePart(streamPart))
      changedAssistant = true
      notifyUpdate = true
    }
    if (incomingParts.length) {
      assistant.parts = mergeMessageParts(assistant.parts, incomingParts)
    }
    if (changedAssistant) scheduleAssistant(notifyUpdate, targetId)
    onChunk?.(chunk, { ...assistant })
  }
  function resumeAssistant(): Message {
    const last = messages.value[messages.value.length - 1]
    if (last?.role === 'assistant' && typeof last.content === 'string') {
      return { ...last, content: last.content }
    }
    const assistant = buildAssistant()
    messages.value = [...messages.value, { ...assistant }]
    return assistant
  }
  async function runAssistantStream(
    getAssistant: () => Message,
    openStream: (
      signal: AbortSignal,
      attempt: number
    ) => Promise<AsyncIterable<ChatChunk> | null | undefined>
  ): Promise<boolean> {
    const controller = new AbortController()
    let assistant: Message | null = null
    let pendingAssistant: Message | null = null
    let pendingAssistantTargetId: string | null = null
    let pendingUpdate = false
    let pendingStreamData = false
    let retryAttempt = 0
    const maxRetries = getMaxRetries(options)
    const throttler = createStreamUpdateThrottler(getThrottleMs(options), () => {
      if (pendingAssistant) {
        replaceAssistant(pendingAssistant, pendingAssistantTargetId ?? pendingAssistant.id)
        if (pendingUpdate) onUpdate?.({ ...pendingAssistant })
        pendingAssistant = null
        pendingAssistantTargetId = null
        pendingUpdate = false
      }
      if (pendingStreamData) {
        streamData.value = [...state.bufferedStreamData]
        pendingStreamData = false
      }
    })
    const scheduleAssistant = (notifyUpdate: boolean, targetId?: string) => {
      if (!assistant) return
      pendingAssistant = assistant
      pendingAssistantTargetId ??= targetId ?? assistant.id
      pendingUpdate ||= notifyUpdate
      throttler.schedule()
    }
    const scheduleStreamData = () => {
      pendingStreamData = true
      throttler.schedule()
    }
    abortController.value = controller
    isLoading.value = true
    error.value = null
    status.value = 'submitted'
    try {
      while (true) {
        let receivedChunk = false
        try {
          const stream = await openStream(controller.signal, retryAttempt + 1)
          if (!stream) {
            status.value = 'ready'
            return false
          }
          assistant = assistant ?? getAssistant()
          for await (const chunk of stream) {
            if (status.value === 'submitted') status.value = 'streaming'
            receivedChunk = true
            applyChunk(assistant, chunk, scheduleAssistant, scheduleStreamData)
          }
          throttler.flush()
          status.value = 'ready'
          finishAssistant(assistant, controller.signal.aborted, false)
          return !controller.signal.aborted
        } catch (err) {
          const e = normalizeError(err)
          if ((e as { name?: string }).name === 'AbortError' || controller.signal.aborted) {
            throttler.flush()
            status.value = 'ready'
            if (assistant) finishAssistant(assistant, true, false)
            return false
          }
          throttler.flush()
          const context = createRetryContext(e, retryAttempt + 1, maxRetries)
          if (!receivedChunk && (await canRetry(options, context))) {
            retryAttempt += 1
            throttler.cancel()
            await waitForRetry(options, context, controller.signal)
            status.value = 'submitted'
            continue
          }
          if (assistant) finishAssistant(assistant, false, true, true)
          throw reportError(e)
        }
      }
    } finally {
      abortController.value = null
      isLoading.value = false
    }
  }
  function mergeRequestHeaders(
    defaultHeaders?: HeadersInit,
    requestHeaders?: HeadersInit
  ): Record<string, string> | undefined {
    if (!defaultHeaders && !requestHeaders) return undefined
    return mergeHeaders(defaultHeaders, requestHeaders)
  }
  function applyActiveTools(request: ChatRequest): ChatRequest {
    const { activeTools: activeToolNames, ...rest } = request
    if (activeToolNames === undefined) return rest
    const tools = rest.tools?.filter((tool) => activeToolNames.includes(tool.function.name))
    if (!tools?.length) return { ...rest, tools: undefined, toolChoice: undefined }
    const toolChoice =
      typeof rest.toolChoice !== 'object' || activeToolNames.includes(rest.toolChoice.function.name)
        ? rest.toolChoice
        : undefined
    return {
      ...rest,
      tools,
      toolChoice
    }
  }
  function mergePreparedChatRequest(base: ChatRequest, prepared?: Partial<ChatRequest> | void) {
    if (!prepared) return base
    const body = mergeRequestBody(base.body, prepared.body)
    const headers = mergeRequestHeaders(base.headers, prepared.headers)
    return {
      ...base,
      ...prepared,
      ...(body ? { body } : {}),
      ...(headers ? { headers } : {})
    }
  }
  function mergePreparedResumeRequest(
    base: ChatResumeRequest,
    prepared?: Partial<ChatResumeRequest> | void
  ) {
    if (!prepared) return base
    const body = mergeRequestBody(base.body, prepared.body)
    const headers = mergeRequestHeaders(base.headers, prepared.headers)
    return {
      ...base,
      ...prepared,
      ...(body ? { body } : {}),
      ...(headers ? { headers } : {})
    }
  }
  async function prepareChatRequest(
    request: ChatRequest,
    signal: AbortSignal,
    context: SendChatContext
  ): Promise<ChatRequest> {
    const body = mergeRequestBody(defaultRequest.body, request.body)
    const headers = mergeRequestHeaders(defaultRequest.headers, request.headers)
    const forwardedProps = mergeRequestBody(
      mergeRequestBody(defaultForwardedProps, defaultRequest.forwardedProps),
      request.forwardedProps
    )
    const activeTools = request.activeTools ?? defaultRequest.activeTools ?? defaultActiveTools
    const threadId = request.threadId ?? defaultRequest.threadId ?? defaultThreadId
    const base: ChatRequest = {
      ...defaultRequest,
      ...(streamProtocol ? { streamProtocol } : {}),
      ...(defaultTools && !request.tools ? { tools: defaultTools } : {}),
      ...(defaultToolChoice && !request.toolChoice ? { toolChoice: defaultToolChoice } : {}),
      ...request,
      ...(threadId !== undefined ? { threadId } : {}),
      ...(forwardedProps ? { forwardedProps } : {}),
      ...(activeTools !== undefined ? { activeTools } : {}),
      ...(body ? { body } : {}),
      ...(headers ? { headers } : {}),
      id: id.value,
      signal
    }
    const baseMessages = clonePrepareMessages(base.messages, clonePrepareMessages(request.messages))
    const stepPrepared = await options.prepareStep?.({
      id: id.value,
      ...proxyRequestInfo,
      messages: baseMessages,
      requestMetadata: base.metadata,
      body: base.body,
      headers: headersToRecord(base.headers),
      request: { ...base, messages: base.messages.map(cloneMessage) },
      trigger: context.trigger,
      aiSdkTrigger: toAiSdkTrigger(context.trigger),
      messageId: context.messageId,
      stepNumber: context.stepNumber,
      toolCalls: latestAssistantToolCalls(baseMessages).map((call) => ({
        ...call,
        function: { ...call.function }
      }))
    })
    const stepRequest = mergePreparedChatRequest(base, stepPrepared)
    const preparedMessages = clonePrepareMessages(stepRequest.messages, baseMessages)
    const prepared = await options.prepareSendMessagesRequest?.({
      id: id.value,
      ...proxyRequestInfo,
      messages: preparedMessages,
      requestMetadata: stepRequest.metadata,
      body: stepRequest.body,
      headers: headersToRecord(stepRequest.headers),
      request: {
        ...stepRequest,
        messages: stepRequest.messages.map(cloneMessage)
      },
      trigger: context.trigger,
      aiSdkTrigger: toAiSdkTrigger(context.trigger),
      messageId: context.messageId
    })
    return applyActiveTools(mergePreparedChatRequest(stepRequest, prepared))
  }
  async function prepareResumeRequest(
    resumeOptions: ResumeChatOptions,
    signal: AbortSignal
  ): Promise<ChatResumeRequest> {
    const body = mergeRequestBody(defaultRequest.body, resumeOptions.body)
    const headers = mergeRequestHeaders(defaultRequest.headers, resumeOptions.headers)
    const resumeStreamProtocol = resumeOptions.streamProtocol ?? defaultRequest.streamProtocol
    const forwardedProps = mergeRequestBody(
      mergeRequestBody(defaultForwardedProps, defaultRequest.forwardedProps),
      resumeOptions.forwardedProps
    )
    const threadId = resumeOptions.threadId ?? defaultRequest.threadId ?? defaultThreadId
    const base: ChatResumeRequest = {
      id: resumeOptions.id ?? id.value,
      metadata: defaultRequest.metadata,
      ...resumeOptions,
      ...(threadId !== undefined ? { threadId } : {}),
      ...(resumeStreamProtocol ? { streamProtocol: resumeStreamProtocol } : {}),
      ...(forwardedProps ? { forwardedProps } : {}),
      ...(body ? { body } : {}),
      ...(headers ? { headers } : {}),
      signal
    }
    const prepared = await options.prepareReconnectToStreamRequest?.({
      id: base.id,
      ...proxyRequestInfo,
      requestMetadata: base.metadata,
      body: base.body,
      headers: headersToRecord(base.headers),
      request: { ...base }
    })
    return mergePreparedResumeRequest(base, prepared)
  }
  async function streamReply(
    assistant: Message,
    request: ChatRequest,
    context: SendChatContext
  ): Promise<boolean> {
    return runAssistantStream(
      () => assistant,
      async (signal, attempt) => {
        const prepared = await prepareChatRequest(request, signal, context)
        const info = requestInfo('chat', prepared, attempt, context)
        reportRequest(info)
        const stream = await provider.chat(prepared)
        reportResponse(info, stream)
        return stream
      }
    )
  }
  async function resumeStream(options: ResumeChatOptions = {}) {
    const resumeChat = provider.resumeChat
    if (!resumeChat) {
      throw reportError(new AiHooksError(`Provider "${provider.id}" does not support resumeChat()`))
    }
    clearPendingToolCalls()
    resetTurnState()
    await runAssistantStream(resumeAssistant, async (signal, attempt) => {
      const prepared = await prepareResumeRequest(options, signal)
      const info = requestInfo('resume', prepared, attempt)
      reportRequest(info)
      const stream = await resumeChat(prepared)
      reportResponse(info, stream)
      return stream
    })
  }
  async function runAssistantTurn(
    assistant: Message,
    request: ChatRequest,
    remainingToolRoundtrips: number,
    context: SendChatContext
  ) {
    const completed = await streamReply(assistant, request, context)
    if (!completed) return
    const calls = assistant.toolCalls
    if (!calls?.length) return
    if (!toolHandlers && !requiresToolApproval) {
      awaitManualToolResults(calls, request, context)
      return
    }
    if (remainingToolRoundtrips <= 0) {
      throw reportError(new AiHooksError('Maximum tool roundtrips exceeded'))
    }

    isLoading.value = true
    try {
      if (await executeReadyToolCalls(calls, request)) {
        isLoading.value = false
        return
      }
      if (await shouldStopWhen()) {
        isLoading.value = false
        return
      }
      if (!(await shouldSendAutomatically())) {
        isLoading.value = false
        return
      }
    } catch (err) {
      isLoading.value = false
      throw reportError(err)
    }

    const nextAssistant = buildAssistant()
    messages.value = [...messages.value, { ...nextAssistant }]
    await runAssistantTurn(
      nextAssistant,
      {
        ...request,
        messages: messages.value.filter((m) => m.id !== nextAssistant.id)
      },
      remainingToolRoundtrips - 1,
      { ...context, stepNumber: context.stepNumber + 1 }
    )
  }

  function buildAppendMessage(
    content: string | Message,
    messageId?: string,
    attachmentParts: ContentPart[] = [],
    messageMetadata?: TMessageMetadata
  ): Message {
    if (typeof content === 'string') {
      return withMessageMetadata(
        {
          id: messageId || nextId('user'),
          role: 'user',
          content: appendContentParts(content, attachmentParts),
          createdAt: new Date()
        },
        messageMetadata
      )
    }
    return withMessageMetadata(
      {
        ...content,
        id: messageId || content.id || nextId(content.role),
        content: appendContentParts(content.content, attachmentParts)
      },
      messageMetadata
    )
  }
  function isSendChatMessageInput(
    content: unknown
  ): content is SendChatMessageInput<TMessageMetadata> {
    if (
      !isRecord(content) ||
      (typeof content.content !== 'undefined' && isMessageRole(content.role))
    ) {
      return false
    }
    return (
      'text' in content || 'files' in content || 'metadata' in content || 'messageId' in content
    )
  }
  async function append(
    content: string | Message,
    requestOptions: AppendChatOptions<TMessageMetadata> = {}
  ) {
    const { messageId, attachments, messageMetadata, ...chatRequestOptions } = requestOptions
    const attachmentFiles = attachments ? Array.from(attachments) : []
    let attachmentParts: ContentPart[] = []
    try {
      if (attachmentFiles.length) {
        attachmentParts = await attachmentsToContentParts(attachmentFiles)
      }
    } catch (err) {
      throw reportError(err)
    }
    let userMessage: Message
    try {
      userMessage = buildAppendMessage(content, messageId, attachmentParts, messageMetadata)
    } catch (err) {
      throw reportError(err)
    }
    clearPendingToolCalls()
    const assistant = buildAssistant()
    resetTurnState()
    if (messageId) {
      const idx = messages.value.findIndex((message) => message.id === messageId)
      if (idx < 0) {
        throw reportError(new AiHooksError(`No message found for "${messageId}"`))
      }
      messages.value = [...messages.value.slice(0, idx), userMessage, { ...assistant }]
    } else {
      messages.value = [...messages.value, userMessage, { ...assistant }]
    }
    await runAssistantTurn(
      assistant,
      {
        messages: messages.value.filter((m) => m.id !== assistant.id),
        ...chatRequestOptions
      },
      maxToolRoundtrips,
      { trigger: 'submit-message', messageId, stepNumber: 0 }
    )
  }
  async function submitCurrentMessages(requestOptions: AppendChatOptions<TMessageMetadata> = {}) {
    const { messageId, attachments, messageMetadata, ...chatRequestOptions } = requestOptions
    if (messageId || attachments || messageMetadata) {
      throw reportError(
        new AiHooksError(
          'sendMessage() without a message does not support messageId, attachments, or messageMetadata'
        )
      )
    }
    clearPendingToolCalls()
    const assistant = buildAssistant()
    resetTurnState()
    messages.value = [...messages.value, { ...assistant }]
    await runAssistantTurn(
      assistant,
      {
        messages: messages.value.filter((m) => m.id !== assistant.id),
        ...chatRequestOptions
      },
      maxToolRoundtrips,
      { trigger: 'submit-message', stepNumber: 0 }
    )
  }
  async function sendMessage(
    content?: string | Message | SendChatMessageInput<TMessageMetadata>,
    requestOptions: AppendChatOptions<TMessageMetadata> = {}
  ) {
    if (content === undefined) {
      await submitCurrentMessages(requestOptions)
      return
    }
    if (isSendChatMessageInput(content)) {
      const { text = '', files, metadata, messageId } = content
      await append(
        messageId && !requestOptions.messageId
          ? { id: messageId, role: 'user', content: text }
          : text,
        {
          ...requestOptions,
          ...(files !== undefined ? { attachments: files } : {}),
          ...(metadata !== undefined ? { messageMetadata: metadata } : {})
        }
      )
      return
    }
    await append(content, requestOptions)
  }
  async function handleSubmit(
    event?: { preventDefault?: () => void },
    requestOptions: AppendChatOptions<TMessageMetadata> = {}
  ) {
    event?.preventDefault?.()
    const hasAttachments = requestOptions.attachments
      ? Array.from(requestOptions.attachments).length > 0
      : false
    if (!input.value.trim() && !hasAttachments) return

    await append(input.value, requestOptions)
    input.value = ''
  }
  async function continueAfterToolResults(requestOptions: Partial<ChatRequest> = {}) {
    if (pendingToolCalls.value.length) return

    const request = pendingToolRequest.value
    if (!request) return

    const context = state.pendingToolSendContext ?? { trigger: 'submit-message', stepNumber: 0 }
    let shouldContinue = false
    try {
      shouldContinue = !(await shouldStopWhen()) && (await shouldSendAutomatically())
    } catch (err) {
      throw reportError(err)
    }
    pendingToolRequest.value = null
    state.pendingToolSendContext = null
    if (!shouldContinue) return

    const nextAssistant = buildAssistant()
    messages.value = [...messages.value, { ...nextAssistant }]
    await runAssistantTurn(
      nextAssistant,
      {
        ...request,
        ...requestOptions,
        messages: messages.value.filter((m) => m.id !== nextAssistant.id)
      },
      maxToolRoundtrips,
      { ...context, stepNumber: context.stepNumber + 1 }
    )
  }
  async function addToolResult(
    toolCallIdOrOutput: string | AddToolResultOptions,
    resultOrRequestOptions?: unknown | Partial<ChatRequest>,
    requestOptions: Partial<ChatRequest> = {}
  ) {
    const objectOutput = typeof toolCallIdOrOutput === 'string' ? null : toolCallIdOrOutput
    const toolCallId = objectOutput ? objectOutput.toolCallId : (toolCallIdOrOutput as string)
    const result = objectOutput
      ? 'state' in objectOutput
        ? { state: objectOutput.state, errorText: objectOutput.errorText }
        : objectOutput.output
      : resultOrRequestOptions
    const options = objectOutput
      ? ((resultOrRequestOptions as Partial<ChatRequest> | undefined) ?? {})
      : requestOptions
    const call = requirePendingToolCall(toolCallId)
    const args = parseToolArgs(call)
    const resultMessage = toolResultMessage(call, result)
    messages.value = [...messages.value, resultMessage]
    pendingToolCalls.value = pendingToolCalls.value.filter((item) => item.id !== toolCallId)
    reportToolResult(call, args, result, resultMessage)

    await continueAfterToolResults(options)
  }
  async function addToolOutput(
    output: AddToolOutputOptions,
    requestOptions: Partial<ChatRequest> = {}
  ) {
    const result =
      'state' in output ? { state: output.state, errorText: output.errorText } : output.output
    await addToolResult(output.toolCallId, result, requestOptions)
  }
  async function approveToolCall(toolCallId: string, requestOptions: Partial<ChatRequest> = {}) {
    const call = requirePendingToolCall(toolCallId)
    const args = parseToolArgs(call)
    const context = toolContext(call, args)
    let resultMessage: Message
    isLoading.value = true
    try {
      resultMessage = await executeToolCall(call, args, context, false)
    } catch (err) {
      isLoading.value = false
      throw reportError(err)
    }
    isLoading.value = false

    messages.value = [...messages.value, resultMessage]
    pendingToolCalls.value = pendingToolCalls.value.filter((item) => item.id !== toolCallId)
    await continueAfterToolResults(requestOptions)
  }
  async function rejectToolCall(
    toolCallId: string,
    reason?: unknown,
    requestOptions: Partial<ChatRequest> = {}
  ) {
    const result =
      reason === undefined
        ? { approved: false }
        : {
            approved: false,
            reason
          }
    await addToolResult(toolCallId, result, requestOptions)
  }
  async function addToolApprovalResponse(
    response: ToolApprovalResponse,
    requestOptions: Partial<ChatRequest> = {}
  ) {
    if (response.approved) {
      const call = requirePendingToolCall(response.id)
      if (toolHandlers?.[call.function.name]) {
        await approveToolCall(response.id, requestOptions)
        return
      }
      const result = response.reason === undefined ? { approved: true } : response
      await addToolResult(response.id, result, requestOptions)
      return
    }
    await rejectToolCall(response.id, response.reason, requestOptions)
  }
  async function regenerate(options: RegenerateChatOptions = {}) {
    const { messageId, ...requestOptions } = options
    clearPendingToolCalls()
    let assistantIdx = -1
    for (let i = messages.value.length - 1; i >= 0; i -= 1) {
      const message = messages.value[i]
      if (message.role === 'assistant' && (!messageId || message.id === messageId)) {
        assistantIdx = i
        break
      }
    }
    if (assistantIdx < 0) {
      throw new AiHooksError('regenerate() called with no assistant message to re-run')
    }
    const truncated = messages.value.slice(0, assistantIdx)
    const assistant = buildAssistant()
    resetTurnState()
    messages.value = [...truncated, { ...assistant }]
    await runAssistantTurn(
      assistant,
      {
        messages: truncated,
        ...requestOptions
      },
      maxToolRoundtrips,
      { trigger: 'regenerate-message', messageId, stepNumber: 0 }
    )
  }
  if (options.resume) {
    void resumeStream().catch(() => undefined)
  }
  return {
    id,
    messages,
    input,
    status,
    usage,
    data: streamData,
    streamData,
    pendingToolCalls,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    append,
    sendMessage,
    addToolResult,
    addToolOutput,
    addToolApprovalResponse,
    approveToolCall,
    rejectToolCall,
    regenerate,
    resumeStream,
    reload: regenerate,
    stop,
    setId,
    setInput,
    handleInputChange,
    handleSubmit,
    setMessages,
    setData,
    clearError,
    clearTrace,
    clear,
    abortController
  }
}

export class Chat<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> implements UseChatReturn<TData, TMessageMetadata> {
  declare readonly id: UseChatReturn<TData, TMessageMetadata>['id']
  declare readonly messages: UseChatReturn<TData, TMessageMetadata>['messages']
  declare readonly input: UseChatReturn<TData, TMessageMetadata>['input']
  declare readonly status: UseChatReturn<TData, TMessageMetadata>['status']
  declare readonly usage: UseChatReturn<TData, TMessageMetadata>['usage']
  declare readonly data: UseChatReturn<TData, TMessageMetadata>['data']
  declare readonly streamData: UseChatReturn<TData, TMessageMetadata>['streamData']
  declare readonly pendingToolCalls: UseChatReturn<TData, TMessageMetadata>['pendingToolCalls']
  declare readonly isLoading: UseChatReturn<TData, TMessageMetadata>['isLoading']
  declare readonly error: UseChatReturn<TData, TMessageMetadata>['error']
  declare readonly lastRequest: UseChatReturn<TData, TMessageMetadata>['lastRequest']
  declare readonly lastResponse: UseChatReturn<TData, TMessageMetadata>['lastResponse']
  declare readonly append: UseChatReturn<TData, TMessageMetadata>['append']
  declare readonly sendMessage: UseChatReturn<TData, TMessageMetadata>['sendMessage']
  declare readonly addToolResult: UseChatReturn<TData, TMessageMetadata>['addToolResult']
  declare readonly addToolOutput: UseChatReturn<TData, TMessageMetadata>['addToolOutput']
  declare readonly addToolApprovalResponse: UseChatReturn<
    TData,
    TMessageMetadata
  >['addToolApprovalResponse']
  declare readonly approveToolCall: UseChatReturn<TData, TMessageMetadata>['approveToolCall']
  declare readonly rejectToolCall: UseChatReturn<TData, TMessageMetadata>['rejectToolCall']
  declare readonly regenerate: UseChatReturn<TData, TMessageMetadata>['regenerate']
  declare readonly resumeStream: UseChatReturn<TData, TMessageMetadata>['resumeStream']
  declare readonly reload: UseChatReturn<TData, TMessageMetadata>['reload']
  declare readonly stop: UseChatReturn<TData, TMessageMetadata>['stop']
  declare readonly setId: UseChatReturn<TData, TMessageMetadata>['setId']
  declare readonly setInput: UseChatReturn<TData, TMessageMetadata>['setInput']
  declare readonly handleInputChange: UseChatReturn<TData, TMessageMetadata>['handleInputChange']
  declare readonly handleSubmit: UseChatReturn<TData, TMessageMetadata>['handleSubmit']
  declare readonly setMessages: UseChatReturn<TData, TMessageMetadata>['setMessages']
  declare readonly setData: UseChatReturn<TData, TMessageMetadata>['setData']
  declare readonly clearError: UseChatReturn<TData, TMessageMetadata>['clearError']
  declare readonly clearTrace: UseChatReturn<TData, TMessageMetadata>['clearTrace']
  declare readonly clear: UseChatReturn<TData, TMessageMetadata>['clear']
  declare readonly abortController: UseChatReturn<TData, TMessageMetadata>['abortController']

  constructor(options: ChatOptions<TData, TMessageMetadata> = {}) {
    Object.assign(this, useChat(options))
  }
}
