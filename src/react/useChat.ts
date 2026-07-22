import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from 'react'
import { mergeDeltas } from '../composables/_tc_merge'
import { proxyProvider, type ProxyProviderConfig } from '../providers/proxy'
import type { ChatProvider } from '../providers/types'
import type {
  AiRequestStatus,
  ChatChunk,
  ChatRequest,
  ChatRequestMessage,
  ChatResumeRequest,
  ChatStreamProtocol,
  IdGenerator,
  Message,
  MessagePart,
  MessageRole,
  RetryOptions,
  StreamDataPart,
  StreamThrottleOptions,
  TokenUsage
} from '../types'
import { AiHooksError } from '../types'
import { createId } from '../utils/id'
import { cloneMessageSnapshot as cloneMessage, cloneRequestSnapshot } from '../utils/lifecycle'
import { headersToRecord, mergeHeaders } from '../utils/headers'
import { mergeRequestBody } from '../utils/requestBody'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import {
  clearInspectionState,
  inspectRequestTrace,
  recordInspectionStateEvent,
  recordInspectionStateRetryAttempt,
  type InspectionRetryRecordInput,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'

/** Request lifecycle states exposed by `useChat`. */
export type ReactChatStatus = AiRequestStatus

/** Identifies the user action that initiated a chat request. */
export type ReactSendChatTrigger = 'submit-message' | 'regenerate-message'

/** Identifies the equivalent AI SDK chat action. */
export type ReactAiSdkSendChatTrigger = 'submit-user-message' | 'regenerate-assistant-message'

/** Describes the terminal assistant message delivered to finish callbacks. */
export interface ReactChatFinishInfo {
  message: Message
  messages: Message[]
  isAbort: boolean
  isError: boolean
  isDisconnect: boolean
  finishReason?: ChatChunk['finishReason']
}

/** Receives AI SDK-style chat completion details. */
export type ReactAiSdkChatFinishCallback = (info: ReactChatFinishInfo) => void | Promise<void>

/** Receives the final message followed by legacy completion details. */
export type ReactLegacyChatFinishCallback = (
  message: Message,
  info: ReactChatFinishInfo
) => void | Promise<void>

/** Accepts either supported chat finish callback signature. */
export type ReactChatFinishCallback = ReactAiSdkChatFinishCallback | ReactLegacyChatFinishCallback

/** Captures the normalized request passed to the configured chat provider. */
export interface ReactChatRequestInfo {
  kind: 'chat' | 'resume'
  id: string
  providerId: string
  attempt: number
  api?: string
  credentials?: RequestCredentials
  request: ChatRequest | ChatResumeRequest
  runId?: string
  messages: ChatRequestMessage[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  trigger?: ReactSendChatTrigger
  aiSdkTrigger?: ReactAiSdkSendChatTrigger
  messageId?: string
}

/** Captures request metadata after the provider response is available. */
export interface ReactChatResponseInfo extends ReactChatRequestInfo {
  hasStream: boolean
}

/** Applies request and message metadata overrides to one chat submission. */
export interface ReactAppendChatOptions<
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> extends Partial<ChatRequest> {
  messageId?: string
  messageMetadata?: TMessageMetadata
}

/** Represents the object form accepted by `sendMessage`. */
export interface ReactSendChatMessageInput<
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  text?: string
  metadata?: TMessageMetadata
  messageId?: string
}

/** Configures chat transport, initial state, streaming, retries, and lifecycle callbacks. */
export interface UseReactChatOptions<TData = unknown> extends RetryOptions, StreamThrottleOptions {
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
  prepareSendMessagesRequest?: (options: {
    id: string
    api?: string
    credentials?: RequestCredentials
    messages: Message[]
    requestMetadata: unknown
    body?: Record<string, unknown>
    headers?: Record<string, string>
    request: ChatRequest
    trigger: ReactSendChatTrigger
    aiSdkTrigger: ReactAiSdkSendChatTrigger
    messageId?: string
  }) => Partial<ChatRequest> | void | Promise<Partial<ChatRequest> | void>
  prepareReconnectToStreamRequest?: (options: {
    id: string
    api?: string
    credentials?: RequestCredentials
    requestMetadata: unknown
    body?: Record<string, unknown>
    headers?: Record<string, string>
    request: ChatResumeRequest
  }) => Partial<ChatResumeRequest> | void | Promise<Partial<ChatResumeRequest> | void>
  onChunk?: (chunk: ChatChunk, assistant: Message) => void
  onData?: (part: StreamDataPart<TData>) => void
  onRequest?: (info: ReactChatRequestInfo) => void
  onResponse?: (info: ReactChatResponseInfo) => void
  onUpdate?: (message: Message) => void
  onFinish?: ReactChatFinishCallback
  onFinishLegacy?: ReactLegacyChatFinishCallback
  onError?: (error: Error) => void
}

/** Exposes chat state, form bindings, request controls, and inspection data. */
export interface UseReactChatReturn<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  id: string
  messages: Message[]
  input: string
  status: ReactChatStatus
  usage: TokenUsage | null
  data: StreamDataPart<TData>[]
  streamData: StreamDataPart<TData>[]
  isLoading: boolean
  error: Error | null
  lastRequest: ReactChatRequestInfo | null
  lastResponse: ReactChatResponseInfo | null
  append: (
    content: string | Message,
    options?: ReactAppendChatOptions<TMessageMetadata>
  ) => Promise<void>
  sendMessage: (
    content?: string | Message | ReactSendChatMessageInput<TMessageMetadata>,
    options?: ReactAppendChatOptions<TMessageMetadata>
  ) => Promise<void>
  regenerate: (options?: Partial<ChatRequest>) => Promise<void>
  resumeStream: (options?: Partial<ChatResumeRequest>) => Promise<void>
  reload: () => Promise<void>
  stop: () => void
  setId: (value: string) => void
  setInput: (value: string) => void
  handleInputChange: (
    event:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target?: { value?: unknown } }
      | string
  ) => void
  handleSubmit: (
    event?: FormEvent<HTMLFormElement> | { preventDefault?: () => void },
    options?: ReactAppendChatOptions<TMessageMetadata>
  ) => Promise<void>
  setMessages: (messages: Message[] | ((messages: Message[]) => Message[])) => void
  setData: (
    data: StreamDataPart<TData>[] | ((data: StreamDataPart<TData>[]) => StreamDataPart<TData>[])
  ) => void
  clearError: () => void
  clearTrace: () => void
  inspect: () => RequestInspectionSnapshot<ReactChatRequestInfo, ReactChatResponseInfo>
  clear: () => void
  abortController: AbortController | null
}

interface SendContext {
  trigger: ReactSendChatTrigger
  messageId?: string
}

function toAiSdkTrigger(trigger: ReactSendChatTrigger): ReactAiSdkSendChatTrigger {
  return trigger === 'regenerate-message' ? 'regenerate-assistant-message' : 'submit-user-message'
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === 'system' || value === 'user' || value === 'assistant' || value === 'tool'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cloneMessages(messages: readonly Message[]): Message[] {
  return messages.map((message) => cloneMessage(message))
}

function mergeMessageParts(
  current: MessagePart[] | undefined,
  incoming: MessagePart[] | undefined
): MessagePart[] | undefined {
  if (!incoming?.length) return current ? current.map((part) => ({ ...part })) : undefined
  return [...(current ?? []).map((part) => ({ ...part })), ...incoming.map((part) => ({ ...part }))]
}

function messageContentText(content: Message['content']): string {
  if (typeof content === 'string') return content
  return content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

function mergeRequestHeaders(
  defaultHeaders?: HeadersInit,
  requestHeaders?: HeadersInit
): Record<string, string> | undefined {
  if (!defaultHeaders && !requestHeaders) return undefined
  return mergeHeaders(defaultHeaders, requestHeaders)
}

function isSendChatMessageInput<TMessageMetadata extends Record<string, unknown>>(
  value: unknown
): value is ReactSendChatMessageInput<TMessageMetadata> {
  if (!isRecord(value) || (isMessageRole(value.role) && 'content' in value)) return false
  return 'text' in value || 'metadata' in value || 'messageId' in value
}

/**
 * Manages a streaming chat conversation as React state.
 *
 * Streamed deltas are merged into the active assistant message, while `stop` and unmount abort
 * in-flight work.
 *
 * @returns Conversation state, form helpers, lifecycle controls, and request inspection data.
 */
export function useChat<
  TData = unknown,
  TMessageMetadata extends Record<string, unknown> = Record<string, unknown>
>(options: UseReactChatOptions<TData> = {}): UseReactChatReturn<TData, TMessageMetadata> {
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
    generateId: generateRuntimeId = createId,
    onChunk,
    onData,
    onRequest,
    onResponse,
    onUpdate,
    onFinish,
    onFinishLegacy,
    onError
  } = options

  const provider = useMemo(
    () =>
      providedProvider ??
      transport ??
      proxyProvider({
        baseURL,
        chatUrl: api ?? '/api/chat',
        credentials,
        headers: transportHeaders,
        body: transportBody,
        fetch: transportFetch
      }),
    [
      api,
      baseURL,
      credentials,
      providedProvider,
      transport,
      transportBody,
      transportFetch,
      transportHeaders
    ]
  )
  const requestApi = providedProvider || transport ? undefined : (api ?? '/api/chat')
  const requestCredentials = providedProvider || transport ? undefined : credentials
  const proxyRequestInfo = requestApi ? { api: requestApi, credentials: requestCredentials } : {}

  const [id, setIdState] = useState(() => options.id || generateRuntimeId('chat'))
  const [messages, setMessagesState] = useState<Message[]>(() =>
    cloneMessages(initialMessages ?? messagesOption ?? [])
  )
  const [input, setInputState] = useState(initialInput)
  const [status, setStatus] = useState<ReactChatStatus>('ready')
  const [usage, setUsage] = useState<TokenUsage | null>(null)
  const [streamData, setStreamDataState] = useState<StreamDataPart<TData>[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactChatRequestInfo | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactChatResponseInfo | null>(null)
  const [inspectionEvents, setInspectionEvents] = useState<InspectionTimelineEventInput[]>([])
  const [inspectionRetries, setInspectionRetries] = useState<InspectionRetryRecordInput[]>([])
  const inspectionRecords = {
    setEvents: setInspectionEvents,
    setRetries: setInspectionRetries
  }
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const idRef = useRef(id)
  const messagesRef = useRef(messages)
  const inputRef = useRef(input)
  const streamDataRef = useRef(streamData)
  const abortControllerRef = useRef<AbortController | null>(null)

  const onChunkRef = useRef(onChunk)
  const onDataRef = useRef(onData)
  const onRequestRef = useRef(onRequest)
  const onResponseRef = useRef(onResponse)
  const onUpdateRef = useRef(onUpdate)
  const onFinishRef = useRef(onFinish)
  const onFinishLegacyRef = useRef(onFinishLegacy)
  const onErrorRef = useRef(onError)
  const optionsRef = useRef(options)

  optionsRef.current = options
  onChunkRef.current = onChunk
  onDataRef.current = onData
  onRequestRef.current = onRequest
  onResponseRef.current = onResponse
  onUpdateRef.current = onUpdate
  onFinishRef.current = onFinish
  onFinishLegacyRef.current = onFinishLegacy
  onErrorRef.current = onError

  const publishMessages = useCallback((nextMessages: Message[]) => {
    const cloned = cloneMessages(nextMessages)
    messagesRef.current = cloned
    setMessagesState(cloned)
  }, [])

  const updateMessages = useCallback(
    (updater: (current: Message[]) => Message[]) => {
      publishMessages(updater(cloneMessages(messagesRef.current)))
    },
    [publishMessages]
  )

  const publishStreamData = useCallback((nextData: StreamDataPart<TData>[]) => {
    streamDataRef.current = nextData.map((part) => ({ ...part }))
    setStreamDataState(streamDataRef.current)
  }, [])

  const reportError = useCallback((rawError: unknown): Error => {
    const nextError = normalizeError(rawError)
    setError(nextError)
    setStatus('error')
    onErrorRef.current?.(nextError)
    return nextError
  }, [])

  const clearTrace = useCallback(() => {
    setLastRequest(null)
    setLastResponse(null)
    clearInspectionState(inspectionRecords)
  }, [])

  const inspect = useCallback(
    () =>
      inspectRequestTrace({
        status,
        error,
        lastRequest,
        lastResponse,
        events: inspectionEvents,
        retries: inspectionRetries,
        curl: true
      }),
    [error, inspectionEvents, inspectionRetries, lastRequest, lastResponse, status]
  )

  const recordInspectionEvent = useCallback((event: InspectionTimelineEventInput) => {
    recordInspectionStateEvent(inspectionRecords, event)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setStatus('ready')
  }, [])

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setAbortController(null)
    setIsLoading(false)
    setStatus('ready')
  }, [])

  useEffect(() => () => stop(), [stop])

  const setId = useCallback((value: string) => {
    idRef.current = value
    setIdState(value)
  }, [])

  const setInput = useCallback((value: string) => {
    inputRef.current = value
    setInputState(value)
  }, [])

  const setMessages = useCallback(
    (next: Message[] | ((messages: Message[]) => Message[])) => {
      const resolved = typeof next === 'function' ? next(cloneMessages(messagesRef.current)) : next
      publishMessages(resolved)
    },
    [publishMessages]
  )

  const setData = useCallback(
    (
      next: StreamDataPart<TData>[] | ((data: StreamDataPart<TData>[]) => StreamDataPart<TData>[])
    ) => {
      const resolved =
        typeof next === 'function' ? next(streamDataRef.current.map((part) => ({ ...part }))) : next
      publishStreamData(resolved)
    },
    [publishStreamData]
  )

  const clear = useCallback(() => {
    stop()
    publishMessages([])
    publishStreamData([])
    setUsage(null)
    setError(null)
    clearTrace()
    setInput('')
  }, [clearTrace, publishMessages, publishStreamData, setInput, stop])

  const handleInputChange = useCallback(
    (
      event:
        | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | { target?: { value?: unknown } }
        | string
    ) => {
      if (typeof event === 'string') {
        setInput(event)
        return
      }
      const value = event.target?.value
      setInput(value == null ? '' : String(value))
    },
    [setInput]
  )

  const buildAssistant = useCallback(
    (): Message => ({
      id: generateRuntimeId('assistant'),
      role: 'assistant',
      content: '',
      createdAt: new Date()
    }),
    [generateRuntimeId]
  )
  function withRunId<T extends ChatRequest>(request: T): T {
    return (request.runId ? request : { ...request, runId: createId('run') }) as T
  }

  const buildUserMessage = useCallback(
    (
      content: string | Message,
      messageId?: string,
      messageMetadata?: TMessageMetadata
    ): Message => {
      if (typeof content !== 'string') {
        return {
          ...content,
          id: messageId || content.id || generateRuntimeId(content.role),
          ...(messageMetadata ? { metadata: messageMetadata } : {})
        }
      }
      return {
        id: messageId || generateRuntimeId('user'),
        role: 'user',
        content,
        createdAt: new Date(),
        ...(messageMetadata ? { metadata: messageMetadata } : {})
      }
    },
    [generateRuntimeId]
  )

  const requestInfo = useCallback(
    (
      kind: ReactChatRequestInfo['kind'],
      request: ChatRequest | ChatResumeRequest,
      attempt: number,
      context?: SendContext
    ): ReactChatRequestInfo => ({
      kind,
      id: request.id ?? idRef.current,
      providerId: provider.id,
      attempt,
      ...proxyRequestInfo,
      request: cloneRequestSnapshot(request),
      messages:
        kind === 'chat'
          ? (request as ChatRequest).messages.map(cloneMessage)
          : messagesRef.current.map(cloneMessage),
      requestMetadata: request.metadata,
      ...(request.runId ? { runId: request.runId } : {}),
      ...(request.body ? { body: { ...request.body } } : {}),
      ...(request.headers ? { headers: headersToRecord(request.headers) } : {}),
      ...(context?.trigger
        ? { trigger: context.trigger, aiSdkTrigger: toAiSdkTrigger(context.trigger) }
        : {}),
      ...(context?.messageId ? { messageId: context.messageId } : {})
    }),
    [provider.id, proxyRequestInfo]
  )

  const reportRequest = useCallback(
    (info: ReactChatRequestInfo) => {
      setLastRequest(info)
      setLastResponse(null)
      recordInspectionEvent({
        kind: 'request',
        label: 'request prepared',
        attempt: info.attempt,
        status,
        metadata: {
          kind: info.kind,
          trigger: info.trigger,
          aiSdkTrigger: info.aiSdkTrigger
        }
      })
      onRequestRef.current?.(info)
    },
    [recordInspectionEvent, status]
  )

  const reportResponse = useCallback(
    (info: ReactChatRequestInfo, stream: AsyncIterable<ChatChunk> | null | undefined) => {
      const response = { ...info, hasStream: Boolean(stream) }
      setLastResponse(response)
      recordInspectionEvent({
        kind: 'response',
        label: stream ? 'response received' : 'response received without stream',
        attempt: info.attempt,
        status,
        metadata: {
          hasStream: Boolean(stream)
        }
      })
      onResponseRef.current?.(response)
      return response
    },
    [recordInspectionEvent, status]
  )

  const finishAssistant = useCallback(
    (assistant: Message, isAbort: boolean, isError: boolean, isDisconnect = false) => {
      const message = cloneMessage(assistant)
      const info = {
        message,
        messages: cloneMessages(messagesRef.current),
        isAbort,
        isError,
        isDisconnect,
        finishReason: message.metadata?.finishReason as ChatChunk['finishReason'] | undefined
      }
      const onFinish = onFinishRef.current
      if (!onFinish) {
        onFinishLegacyRef.current?.(message, info)
        return
      }
      if (onFinish.length <= 1) {
        void (onFinish as ReactAiSdkChatFinishCallback)(info)
      } else {
        void (onFinish as ReactLegacyChatFinishCallback)(message, info)
      }
      onFinishLegacyRef.current?.(message, info)
    },
    [messagesRef]
  )

  const replaceAssistant = useCallback(
    (assistant: Message, targetId = assistant.id) => {
      updateMessages((current) => {
        const index = current.findIndex((message) => message.id === targetId)
        if (index < 0) return current
        return [...current.slice(0, index), cloneMessage(assistant), ...current.slice(index + 1)]
      })
      onUpdateRef.current?.(cloneMessage(assistant))
    },
    [updateMessages]
  )

  const applyChunk = useCallback(
    (assistant: Message, chunk: ChatChunk) => {
      let changed = false
      const targetId = assistant.id
      if (chunk.messageId && chunk.messageId !== assistant.id) {
        assistant.id = chunk.messageId
        changed = true
      }
      if (chunk.content) {
        assistant.content = `${messageContentText(assistant.content)}${chunk.content}`
        changed = true
      }
      if (chunk.parts?.length) {
        assistant.parts = mergeMessageParts(assistant.parts, chunk.parts)
        changed = true
      }
      if (chunk.toolCalls?.length) {
        assistant.toolCalls = mergeDeltas(assistant.toolCalls, chunk.toolCalls)
        changed = true
      }
      if (chunk.usage) {
        setUsage(chunk.usage)
      }
      if (chunk.finishReason !== undefined) {
        assistant.metadata = { ...(assistant.metadata ?? {}), finishReason: chunk.finishReason }
        changed = true
      }
      if (chunk.metadata) {
        assistant.metadata = { ...(assistant.metadata ?? {}), ...chunk.metadata }
        changed = true
      }
      if ('data' in chunk && chunk.data !== undefined) {
        const part: StreamDataPart<TData> = {
          id: chunk.dataId ?? generateRuntimeId('data'),
          data: chunk.data as TData,
          ...(chunk.dataType ? { type: chunk.dataType } : {}),
          ...(chunk.transient ? { transient: true } : {}),
          createdAt: new Date()
        }
        onDataRef.current?.(part)
        if (!part.transient) {
          publishStreamData([...streamDataRef.current, part])
        }
      }
      if (changed) {
        replaceAssistant(assistant, targetId)
      }
      onChunkRef.current?.(chunk, cloneMessage(assistant))
    },
    [generateRuntimeId, publishStreamData, replaceAssistant]
  )

  const prepareChatRequest = useCallback(
    async (
      request: ChatRequest,
      signal: AbortSignal,
      context: SendContext
    ): Promise<ChatRequest> => {
      const currentOptions = optionsRef.current
      const body = mergeRequestBody(defaultRequest.body, request.body)
      const headers = mergeRequestHeaders(defaultRequest.headers, request.headers)
      const forwardedProps = mergeRequestBody(
        mergeRequestBody(defaultForwardedProps, defaultRequest.forwardedProps),
        request.forwardedProps
      )
      const threadId = request.threadId ?? defaultRequest.threadId ?? defaultThreadId
      const base: ChatRequest = {
        ...defaultRequest,
        ...(streamProtocol ? { streamProtocol } : {}),
        ...request,
        ...(threadId !== undefined ? { threadId } : {}),
        ...(forwardedProps ? { forwardedProps } : {}),
        ...(runtimeContext !== undefined ? { metadata: runtimeContext } : {}),
        ...(body ? { body } : {}),
        ...(headers ? { headers } : {}),
        id: idRef.current,
        signal
      }
      const prepared = await currentOptions.prepareSendMessagesRequest?.({
        id: idRef.current,
        ...proxyRequestInfo,
        messages: base.messages.map((message) => cloneMessage(message as Message)),
        requestMetadata: base.metadata,
        body: base.body,
        headers: headersToRecord(base.headers),
        request: {
          ...base,
          messages: base.messages.map(cloneMessage)
        },
        trigger: context.trigger,
        aiSdkTrigger: toAiSdkTrigger(context.trigger),
        messageId: context.messageId
      })
      if (!prepared) return base
      const preparedBody = mergeRequestBody(base.body, prepared.body)
      const preparedHeaders = mergeRequestHeaders(base.headers, prepared.headers)
      return {
        ...base,
        ...prepared,
        ...(preparedBody ? { body: preparedBody } : {}),
        ...(preparedHeaders ? { headers: preparedHeaders } : {})
      }
    },
    [
      defaultForwardedProps,
      defaultRequest,
      defaultThreadId,
      proxyRequestInfo,
      runtimeContext,
      streamProtocol
    ]
  )

  const prepareResumeRequest = useCallback(
    async (resumeOptions: Partial<ChatResumeRequest>, signal: AbortSignal) => {
      const currentOptions = optionsRef.current
      const body = mergeRequestBody(defaultRequest.body, resumeOptions.body)
      const headers = mergeRequestHeaders(defaultRequest.headers, resumeOptions.headers)
      const threadId = resumeOptions.threadId ?? defaultRequest.threadId ?? defaultThreadId
      const base: ChatResumeRequest = {
        id: resumeOptions.id ?? idRef.current,
        metadata: defaultRequest.metadata,
        ...resumeOptions,
        ...(threadId !== undefined ? { threadId } : {}),
        ...(streamProtocol ? { streamProtocol } : {}),
        ...(body ? { body } : {}),
        ...(headers ? { headers } : {}),
        signal
      }
      const prepared = await currentOptions.prepareReconnectToStreamRequest?.({
        id: base.id,
        ...proxyRequestInfo,
        requestMetadata: base.metadata,
        body: base.body,
        headers: headersToRecord(base.headers),
        request: { ...base }
      })
      if (!prepared) return base
      const preparedBody = mergeRequestBody(base.body, prepared.body)
      const preparedHeaders = mergeRequestHeaders(base.headers, prepared.headers)
      return {
        ...base,
        ...prepared,
        ...(preparedBody ? { body: preparedBody } : {}),
        ...(preparedHeaders ? { headers: preparedHeaders } : {})
      }
    },
    [defaultRequest, defaultThreadId, proxyRequestInfo, streamProtocol]
  )

  const runStream = useCallback(
    async (
      assistant: Message,
      openStream: (
        signal: AbortSignal,
        attempt: number
      ) => Promise<AsyncIterable<ChatChunk> | null | undefined>
    ): Promise<boolean> => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setStatus('submitted')
      clearInspectionState(inspectionRecords)
      let retryAttempt = 0
      const maxRetries = getMaxRetries(optionsRef.current)

      try {
        while (true) {
          let receivedChunk = false
          let streamEventReported = false
          try {
            const attempt = retryAttempt + 1
            const stream = await openStream(controller.signal, attempt)
            if (!stream) {
              setStatus('ready')
              return false
            }
            for await (const chunk of stream) {
              if (controller.signal.aborted) {
                setStatus('ready')
                finishAssistant(assistant, true, false)
                return false
              }
              setStatus('streaming')
              if (!streamEventReported) {
                streamEventReported = true
                recordInspectionEvent({
                  kind: 'stream',
                  label: 'stream started',
                  attempt,
                  status,
                  metadata: {
                    streamChunkCount: 1
                  }
                })
              }
              receivedChunk = true
              applyChunk(assistant, chunk)
            }
            setStatus('ready')
            finishAssistant(assistant, controller.signal.aborted, false)
            return !controller.signal.aborted
          } catch (streamError) {
            const nextError = normalizeError(streamError)
            if (controller.signal.aborted || nextError.name === 'AbortError') {
              setStatus('ready')
              finishAssistant(assistant, true, false)
              return false
            }
            const retryContext = createRetryContext(nextError, retryAttempt + 1, maxRetries)
            if (!receivedChunk && (await canRetry(optionsRef.current, retryContext))) {
              recordInspectionStateRetryAttempt(inspectionRecords, nextError, retryContext, {
                retryDelayMs: optionsRef.current.retryDelayMs,
                status
              })
              retryAttempt += 1
              await waitForRetry(optionsRef.current, retryContext, controller.signal)
              setStatus('submitted')
              continue
            }
            recordInspectionEvent({
              kind: 'error',
              label: 'chat stream failed',
              attempt: retryContext.attempt,
              status: 'error',
              metadata: {
                message: nextError.message
              }
            })
            finishAssistant(assistant, false, true, true)
            throw reportError(nextError)
          }
        }
      } finally {
        abortControllerRef.current = null
        setAbortController(null)
        setIsLoading(false)
      }
    },
    [applyChunk, finishAssistant, recordInspectionEvent, reportError, status]
  )

  const streamReply = useCallback(
    async (assistant: Message, request: ChatRequest, context: SendContext) => {
      return runStream(assistant, async (signal, attempt) => {
        const prepared = await prepareChatRequest(request, signal, context)
        const info = requestInfo('chat', prepared, attempt, context)
        reportRequest(info)
        const stream = await provider.chat(prepared)
        reportResponse(info, stream)
        return stream
      })
    },
    [prepareChatRequest, provider, reportRequest, reportResponse, requestInfo, runStream]
  )

  const append = useCallback(
    async (
      content: string | Message,
      appendOptions: ReactAppendChatOptions<TMessageMetadata> = {}
    ) => {
      const { messageId, messageMetadata, ...chatRequestOptions } = appendOptions
      const userMessage = buildUserMessage(content, messageId, messageMetadata)
      const assistant = buildAssistant()
      setUsage(null)
      publishStreamData([])

      let nextMessages: Message[]
      if (messageId) {
        const index = messagesRef.current.findIndex((message) => message.id === messageId)
        if (index < 0) throw reportError(new AiHooksError(`No message found for "${messageId}"`))
        nextMessages = [
          ...messagesRef.current.slice(0, index),
          userMessage,
          cloneMessage(assistant)
        ]
      } else {
        nextMessages = [...messagesRef.current, userMessage, cloneMessage(assistant)]
      }
      publishMessages(nextMessages)

      await streamReply(
        assistant,
        withRunId({
          messages: nextMessages.filter((message) => message.id !== assistant.id),
          ...chatRequestOptions
        }),
        { trigger: 'submit-message', messageId }
      )
    },
    [buildAssistant, buildUserMessage, publishMessages, publishStreamData, reportError, streamReply]
  )

  const submitCurrentMessages = useCallback(
    async (requestOptions: ReactAppendChatOptions<TMessageMetadata> = {}) => {
      const { messageId, messageMetadata, ...chatRequestOptions } = requestOptions
      if (messageId || messageMetadata) {
        throw reportError(
          new AiHooksError(
            'sendMessage() without a message does not support messageId or messageMetadata'
          )
        )
      }
      const assistant = buildAssistant()
      setUsage(null)
      publishStreamData([])
      const nextMessages = [...messagesRef.current, cloneMessage(assistant)]
      publishMessages(nextMessages)
      await streamReply(
        assistant,
        withRunId({
          messages: nextMessages.filter((message) => message.id !== assistant.id),
          ...chatRequestOptions
        }),
        { trigger: 'submit-message' }
      )
    },
    [buildAssistant, publishMessages, publishStreamData, reportError, streamReply]
  )

  const sendMessage = useCallback(
    async (
      content?: string | Message | ReactSendChatMessageInput<TMessageMetadata>,
      requestOptions: ReactAppendChatOptions<TMessageMetadata> = {}
    ) => {
      if (content === undefined) {
        await submitCurrentMessages(requestOptions)
        return
      }
      if (isSendChatMessageInput<TMessageMetadata>(content)) {
        await append(
          content.messageId && !requestOptions.messageId
            ? { id: content.messageId, role: 'user', content: content.text ?? '' }
            : (content.text ?? ''),
          {
            ...requestOptions,
            ...(content.metadata !== undefined ? { messageMetadata: content.metadata } : {})
          }
        )
        return
      }
      await append(content, requestOptions)
    },
    [append, submitCurrentMessages]
  )

  const regenerate = useCallback(
    async (requestOptions: Partial<ChatRequest> = {}) => {
      const lastUserIndex = [...messagesRef.current]
        .reverse()
        .findIndex((message) => message.role === 'user')
      if (lastUserIndex < 0) return
      const userIndex = messagesRef.current.length - 1 - lastUserIndex
      const baseMessages = messagesRef.current.slice(0, userIndex + 1)
      const assistant = buildAssistant()
      const nextMessages = [...baseMessages, cloneMessage(assistant)]
      setUsage(null)
      publishStreamData([])
      publishMessages(nextMessages)
      await streamReply(
        assistant,
        withRunId({
          messages: baseMessages,
          ...requestOptions
        }),
        { trigger: 'regenerate-message' }
      )
    },
    [buildAssistant, publishMessages, publishStreamData, streamReply]
  )

  const resumeStream = useCallback(
    async (resumeOptions: Partial<ChatResumeRequest> = {}) => {
      const resumeChat = provider.resumeChat
      if (!resumeChat) {
        throw reportError(
          new AiHooksError(`Provider "${provider.id}" does not support resumeChat()`)
        )
      }
      const last = messagesRef.current[messagesRef.current.length - 1]
      const assistant =
        last?.role === 'assistant'
          ? { ...last, content: messageContentText(last.content) }
          : buildAssistant()
      if (last?.role !== 'assistant') {
        publishMessages([...messagesRef.current, cloneMessage(assistant)])
      }
      setUsage(null)
      publishStreamData([])
      await runStream(assistant, async (signal, attempt) => {
        const prepared = await prepareResumeRequest(resumeOptions, signal)
        const info = requestInfo('resume', prepared, attempt)
        reportRequest(info)
        const stream = await resumeChat(prepared)
        reportResponse(info, stream)
        return stream
      })
    },
    [
      buildAssistant,
      prepareResumeRequest,
      provider,
      publishMessages,
      publishStreamData,
      reportError,
      reportRequest,
      reportResponse,
      requestInfo,
      runStream
    ]
  )

  const reload = useCallback(() => regenerate(), [regenerate])

  const handleSubmit = useCallback(
    async (
      event?: FormEvent<HTMLFormElement> | { preventDefault?: () => void },
      requestOptions: ReactAppendChatOptions<TMessageMetadata> = {}
    ) => {
      event?.preventDefault?.()
      if (!inputRef.current.trim()) return
      await append(inputRef.current, requestOptions)
      setInput('')
    },
    [append, setInput]
  )

  return {
    id,
    messages,
    input,
    status,
    usage,
    data: streamData,
    streamData,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    append,
    sendMessage,
    regenerate,
    resumeStream,
    reload,
    stop,
    setId,
    setInput,
    handleInputChange,
    handleSubmit,
    setMessages,
    setData,
    clearError,
    clearTrace,
    inspect,
    clear,
    abortController
  }
}
