import { mergeDeltas as mergeD } from './_tc_merge'

import { ref, shallowRef, type Ref } from 'vue'
import { usePersist, type UsePersistOptions } from './usePersist'
import type { ChatProvider } from '../providers/types'
import type {
  ChatChunk,
  ChatRequest,
  ChatResumeRequest,
  AiRequestStatus,
  ChatAttachmentInput,
  ChatAttachmentsInput,
  ChatFileAttachment,
  Message,
  MessageContent,
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
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import { mergeRequestBody } from '../utils/requestBody'
import { createStreamUpdateThrottler, getThrottleMs } from '../utils/throttle'

export interface ToolCallHandlerContext {
  toolCall: ToolCall
  messages: Message[]
  args: unknown
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

export interface ChatFinishInfo {
  message: Message
  messages: Message[]
  isAbort: boolean
  isError: boolean
  finishReason?: ChatChunk['finishReason']
}

export type ChatStatus = AiRequestStatus

export interface RegenerateChatOptions extends Partial<ChatRequest> {
  messageId?: string
}

export interface ResumeChatOptions extends Partial<ChatResumeRequest> {}

export interface AppendChatOptions extends Partial<ChatRequest> {
  messageId?: string
  attachments?: ChatAttachmentsInput
}

export type SendChatTrigger = 'submit-message' | 'regenerate-message'

export interface PrepareSendMessagesRequestOptions {
  id: string
  messages: Message[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  request: ChatRequest
  trigger: SendChatTrigger
  messageId?: string
}

export type PrepareSendMessagesRequest = (
  options: PrepareSendMessagesRequestOptions
) => Partial<ChatRequest> | void | Promise<Partial<ChatRequest> | void>

export interface PrepareReconnectToStreamRequestOptions {
  id: string
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

export interface ToolApprovalResponse {
  id: string
  approved: boolean
  reason?: unknown
}

export type SetMessagesInput = Message[] | ((messages: Message[]) => Message[])

export type PruneToolCallsStrategy =
  | 'none'
  | 'all'
  | 'before-last-message'
  | `before-last-${number}-messages`

export interface PruneMessagesOptions {
  messages: Message[]
  maxMessages?: number
  keepSystem?: boolean
  emptyMessages?: 'keep' | 'remove'
  toolCalls?: PruneToolCallsStrategy
}

export type SerializedMessage = Omit<Message, 'createdAt'> & { createdAt?: string }

export interface ChatPersistOptions {
  key: string
  version?: number
  storage?: Storage | null
  serialize?: UsePersistOptions<Message[]>['serialize']
  deserialize?: UsePersistOptions<Message[]>['deserialize']
}

export interface UseChatOptions extends RetryOptions, StreamThrottleOptions {
  provider: ChatProvider
  initialMessages?: Message[]
  initialInput?: string
  defaultRequest?: Partial<ChatRequest>
  id?: string
  generateId?: IdGenerator
  resume?: boolean
  prepareSendMessagesRequest?: PrepareSendMessagesRequest
  prepareReconnectToStreamRequest?: PrepareReconnectToStreamRequest
  persist?: ChatPersistOptions
  tools?: Tool[]
  toolChoice?: ChatRequest['toolChoice']
  toolHandlers?: Record<string, ToolCallHandler>
  requiresToolApproval?: ToolApprovalPredicate
  maxToolRoundtrips?: number
  onChunk?: (chunk: ChatChunk, assistant: Message) => void
  onData?: (part: StreamDataPart) => void
  onToolCall?: (args: unknown, context: ToolCallHandlerContext) => void
  onToolResult?: (result: unknown, context: ToolResultHandlerContext) => void
  onUpdate?: (m: Message) => void
  onFinish?: (m: Message, info: ChatFinishInfo) => void
  onError?: (e: Error) => void
}

export interface UseChatReturn {
  id: Ref<string>
  messages: Ref<Message[]>
  input: Ref<string>
  status: Ref<ChatStatus>
  usage: Ref<TokenUsage | null>
  streamData: Ref<StreamDataPart[]>
  pendingToolCalls: Ref<ToolCall[]>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  append: (c: string | Message, o?: AppendChatOptions) => Promise<void>
  sendMessage: (c: string | Message, o?: AppendChatOptions) => Promise<void>
  addToolResult: (toolCallId: string, result: unknown, o?: Partial<ChatRequest>) => Promise<void>
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
    options?: AppendChatOptions
  ) => Promise<void>
  setMessages: (m: SetMessagesInput) => void
  clearError: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

const empty = [] as Message[]

function cloneMessage(message: Message): Message {
  return {
    ...message,
    content: Array.isArray(message.content)
      ? message.content.map((part) =>
          part.type === 'image_url' ? { ...part, image_url: { ...part.image_url } } : { ...part }
        )
      : message.content,
    ...(message.toolCalls
      ? {
          toolCalls: message.toolCalls.map((call) => ({
            ...call,
            function: { ...call.function }
          }))
        }
      : {}),
    ...(message.metadata ? { metadata: { ...message.metadata } } : {})
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

function deserializeCreatedAt(raw: unknown): Date | undefined {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return new Date(raw)
  if (typeof raw !== 'string') return undefined
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? undefined : date
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

    if (isRecord(rawMessage.metadata)) message.metadata = { ...rawMessage.metadata }

    const createdAt = deserializeCreatedAt(rawMessage.createdAt)
    if (createdAt) message.createdAt = createdAt

    messages.push(message)
  }

  return messages
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

function pruneToolDetails(index: number, total: number, strategy: PruneToolCallsStrategy): boolean {
  if (strategy === 'none') return false
  if (strategy === 'all') return true
  if (strategy === 'before-last-message') return index < total - 1

  const match = /^before-last-(\d+)-messages$/.exec(strategy)
  if (!match) throw new Error(`Unsupported tool call pruning strategy: ${strategy}`)
  return index < total - Number(match[1])
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
    toolCalls = 'none'
  } = options
  if (maxMessages !== undefined && maxMessages < 0) {
    throw new Error('pruneMessages() maxMessages must be greater than or equal to 0')
  }

  const total = messages.length
  let pruned = messages
    .map((message, index) => {
      const next = cloneMessage(message)
      if (!pruneToolDetails(index, total, toolCalls)) return next
      if (next.role === 'tool') return null
      delete next.toolCalls
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
}

interface ChatState {
  messages: Ref<Message[]>
  input: Ref<string>
  status: Ref<ChatStatus>
  usage: Ref<TokenUsage | null>
  streamData: Ref<StreamDataPart[]>
  bufferedStreamData: StreamDataPart[]
  pendingToolCalls: Ref<ToolCall[]>
  pendingToolRequest: Ref<ChatRequest | null>
  pendingToolSendContext: SendChatContext | null
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  abortController: Ref<AbortController | null>
}

const chatStates = new Map<string, ChatState>()

function getChatState(id: string, initialMessages: Message[], initialInput: string): ChatState {
  const existing = chatStates.get(id)
  if (existing) return existing

  const state: ChatState = {
    messages: ref<Message[]>([...initialMessages]) as Ref<Message[]>,
    input: ref(initialInput),
    status: ref<ChatStatus>('ready'),
    usage: ref<TokenUsage | null>(null),
    streamData: ref<StreamDataPart[]>([]) as Ref<StreamDataPart[]>,
    bufferedStreamData: [],
    pendingToolCalls: ref<ToolCall[]>([]) as Ref<ToolCall[]>,
    pendingToolRequest: shallowRef<ChatRequest | null>(null),
    pendingToolSendContext: null,
    isLoading: ref(false),
    error: ref<Error | null>(null),
    abortController: shallowRef<AbortController | null>(null)
  }
  chatStates.set(id, state)
  return state
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const {
    provider: providedProvider,
    initialMessages = empty,
    initialInput = '',
    defaultRequest = {},
    onUpdate,
    onFinish,
    onError,
    persist,
    tools: defaultTools,
    toolChoice: defaultToolChoice,
    toolHandlers,
    requiresToolApproval,
    maxToolRoundtrips = 1,
    onChunk,
    onData,
    onToolCall,
    onToolResult
  } = options
  if (!providedProvider) throw new Error('useChat requires a provider option')
  const provider = providedProvider
  const nextId = options.generateId ?? createId
  const id = ref(options.id || nextId('chat'))
  const state = getChatState(id.value, initialMessages, initialInput)
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

  function setMessages(next: SetMessagesInput) {
    const resolved = typeof next === 'function' ? next([...messages.value]) : next
    messages.value = [...resolved]
    resetTurnState()
    clearPendingToolCalls()
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
  function replaceAssistant(assistant: Message) {
    const idx = messages.value.findIndex((m) => m.id === assistant.id)
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
  function reportError(err: unknown): Error {
    const e = normalizeError(err)
    error.value = e
    status.value = 'error'
    onError?.(e)
    return e
  }
  function finishAssistant(assistant: Message, isAbort: boolean, isError: boolean) {
    if (!onFinish) return
    const message = { ...assistant }
    onFinish(message, {
      message,
      messages: messages.value.map((message) => ({ ...message })),
      isAbort,
      isError,
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
      args
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
      resultMessage: { ...resultMessage }
    })
  }
  function processStreamData(chunk: ChatChunk, scheduleStreamData: () => void) {
    if (!('data' in chunk)) return

    const part: StreamDataPart = {
      id: chunk.dataId || nextId('data'),
      data: chunk.data,
      type: chunk.dataType,
      transient: chunk.transient,
      createdAt: new Date()
    }
    onData?.({ ...part })

    if (part.transient) return
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
    scheduleAssistant: (notifyUpdate: boolean) => void,
    scheduleStreamData: () => void
  ) {
    let changedAssistant = false
    let notifyUpdate = false
    if (chunk.content) {
      assistant.content += chunk.content
      changedAssistant = true
      notifyUpdate = true
    }
    if (chunk.toolCalls?.length) {
      assistant.toolCalls = mergeD(assistant.toolCalls, chunk.toolCalls)
      changedAssistant = true
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
      assistant.metadata = { ...(assistant.metadata ?? {}), ...chunk.metadata }
      changedAssistant = true
    }
    if (changedAssistant) scheduleAssistant(notifyUpdate)
    processStreamData(chunk, scheduleStreamData)
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
    openStream: (signal: AbortSignal) => Promise<AsyncIterable<ChatChunk> | null | undefined>
  ): Promise<boolean> {
    const controller = new AbortController()
    let assistant: Message | null = null
    let pendingAssistant: Message | null = null
    let pendingUpdate = false
    let pendingStreamData = false
    let retryAttempt = 0
    const maxRetries = getMaxRetries(options)
    const throttler = createStreamUpdateThrottler(getThrottleMs(options), () => {
      if (pendingAssistant) {
        replaceAssistant(pendingAssistant)
        if (pendingUpdate) onUpdate?.({ ...pendingAssistant })
        pendingAssistant = null
        pendingUpdate = false
      }
      if (pendingStreamData) {
        streamData.value = [...state.bufferedStreamData]
        pendingStreamData = false
      }
    })
    const scheduleAssistant = (notifyUpdate: boolean) => {
      if (!assistant) return
      pendingAssistant = assistant
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
          const stream = await openStream(controller.signal)
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
          if (assistant) finishAssistant(assistant, false, true)
          throw reportError(e)
        }
      }
    } finally {
      abortController.value = null
      isLoading.value = false
    }
  }
  function mergeRequestHeaders(
    defaultHeaders?: Record<string, string>,
    requestHeaders?: Record<string, string>
  ): Record<string, string> | undefined {
    if (!defaultHeaders && !requestHeaders) return undefined
    return {
      ...(defaultHeaders ?? {}),
      ...(requestHeaders ?? {})
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
    const base: ChatRequest = {
      ...defaultRequest,
      ...(defaultTools && !request.tools ? { tools: defaultTools } : {}),
      ...(defaultToolChoice && !request.toolChoice ? { toolChoice: defaultToolChoice } : {}),
      ...request,
      ...(body ? { body } : {}),
      ...(headers ? { headers } : {}),
      id: id.value,
      signal
    }
    const prepared = await options.prepareSendMessagesRequest?.({
      id: id.value,
      messages: base.messages.map((message) => ({ ...message })),
      requestMetadata: base.metadata,
      body: base.body,
      headers: base.headers,
      request: { ...base, messages: base.messages.map((message) => ({ ...message })) },
      trigger: context.trigger,
      messageId: context.messageId
    })
    return mergePreparedChatRequest(base, prepared)
  }
  async function prepareResumeRequest(
    resumeOptions: ResumeChatOptions,
    signal: AbortSignal
  ): Promise<ChatResumeRequest> {
    const body = mergeRequestBody(defaultRequest.body, resumeOptions.body)
    const headers = mergeRequestHeaders(defaultRequest.headers, resumeOptions.headers)
    const base: ChatResumeRequest = {
      id: resumeOptions.id ?? id.value,
      metadata: defaultRequest.metadata,
      ...resumeOptions,
      ...(body ? { body } : {}),
      ...(headers ? { headers } : {}),
      signal
    }
    const prepared = await options.prepareReconnectToStreamRequest?.({
      id: base.id,
      requestMetadata: base.metadata,
      body: base.body,
      headers: base.headers,
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
      async (signal) => provider.chat(await prepareChatRequest(request, signal, context))
    )
  }
  async function resumeStream(options: ResumeChatOptions = {}) {
    const resumeChat = provider.resumeChat
    if (!resumeChat) {
      throw reportError(new AiHooksError(`Provider "${provider.id}" does not support resumeChat()`))
    }
    clearPendingToolCalls()
    resetTurnState()
    await runAssistantStream(resumeAssistant, async (signal) =>
      resumeChat(await prepareResumeRequest(options, signal))
    )
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
      context
    )
  }

  function buildAppendMessage(
    content: string | Message,
    messageId?: string,
    attachmentParts: ContentPart[] = []
  ): Message {
    if (typeof content === 'string') {
      return {
        id: messageId || nextId('user'),
        role: 'user',
        content: appendContentParts(content, attachmentParts),
        createdAt: new Date()
      }
    }
    return {
      ...content,
      id: messageId || content.id || nextId(content.role),
      content: appendContentParts(content.content, attachmentParts)
    }
  }
  async function append(content: string | Message, requestOptions: AppendChatOptions = {}) {
    const { messageId, attachments, ...chatRequestOptions } = requestOptions
    const attachmentFiles = attachments ? Array.from(attachments) : []
    let attachmentParts: ContentPart[] = []
    try {
      if (attachmentFiles.length) {
        attachmentParts = await attachmentsToContentParts(attachmentFiles)
      }
    } catch (err) {
      throw reportError(err)
    }
    const userMessage = buildAppendMessage(content, messageId, attachmentParts)
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
      { trigger: 'submit-message', messageId }
    )
  }
  async function handleSubmit(
    event?: { preventDefault?: () => void },
    requestOptions: AppendChatOptions = {}
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
    const context = state.pendingToolSendContext ?? { trigger: 'submit-message' }
    pendingToolRequest.value = null
    state.pendingToolSendContext = null
    if (!request) return

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
      context
    )
  }
  async function addToolResult(
    toolCallId: string,
    result: unknown,
    requestOptions: Partial<ChatRequest> = {}
  ) {
    const call = requirePendingToolCall(toolCallId)
    const args = parseToolArgs(call)
    const resultMessage = toolResultMessage(call, result)
    messages.value = [...messages.value, resultMessage]
    pendingToolCalls.value = pendingToolCalls.value.filter((item) => item.id !== toolCallId)
    reportToolResult(call, args, result, resultMessage)

    await continueAfterToolResults(requestOptions)
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
      await approveToolCall(response.id, requestOptions)
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
      { trigger: 'regenerate-message', messageId }
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
    streamData,
    pendingToolCalls,
    isLoading,
    error,
    append,
    sendMessage: append,
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
    clearError,
    clear,
    abortController
  }
}
