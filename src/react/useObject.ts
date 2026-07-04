import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from 'react'
import { proxyProvider, type ProxyProviderConfig } from '../providers/proxy'
import type { ChatProvider } from '../providers/types'
import type {
  AiRequestStatus,
  ChatChunk,
  ChatRequest,
  ChatRequestMessage,
  IdGenerator,
  Message,
  ResponseFormat,
  RetryOptions,
  StreamThrottleOptions
} from '../types'
import { AiHooksError } from '../types'
import { createId } from '../utils/id'
import { cloneMessageSnapshot, cloneRequestSnapshot } from '../utils/lifecycle'
import { headersToRecord, mergeHeaders } from '../utils/headers'
import { mergeRequestBody } from '../utils/requestBody'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import {
  schemaToJsonSchema,
  validateJsonSchema,
  type JsonSchemaDefinition
} from '../utils/jsonSchema'
import { createStreamUpdateThrottler, getThrottleMs } from '../utils/throttle'
import {
  clearInspectionState,
  inspectRequestTrace,
  recordInspectionStateEvent,
  recordInspectionStateRetryAttempt,
  type InspectionRetryRecordInput,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'

export type ReactObjectStatus = AiRequestStatus

export type ReactObjectDeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? ReactObjectDeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: ReactObjectDeepPartial<T[K]> }
      : T

export interface ReactObjectRequestInfo {
  id: string
  providerId: string
  attempt: number
  api?: string
  credentials?: RequestCredentials
  request: ChatRequest
  messages: ChatRequestMessage[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface ReactObjectResponseInfo extends ReactObjectRequestInfo {
  hasStream: boolean
}

export interface ReactObjectFinishInfo<T = unknown> {
  object: T
  text: string
  isAbort: boolean
  error: Error | undefined
}

export interface ReactObjectFinishCallbackOptions<T = unknown> {
  object: T | undefined
  text: string
  isAbort: boolean
  error: Error | undefined
}

export type ReactAiSdkObjectFinishCallback<T = unknown> = (
  options: ReactObjectFinishCallbackOptions<T>
) => void | Promise<void>

export type ReactLegacyObjectFinishCallback<T = unknown> = (
  object: T,
  info: ReactObjectFinishInfo<T>
) => void | Promise<void>

export type ReactObjectFinishCallback<T = unknown> =
  ReactAiSdkObjectFinishCallback<T> | ReactLegacyObjectFinishCallback<T>

export interface UseReactObjectOptions<T = unknown> extends RetryOptions, StreamThrottleOptions {
  provider?: ChatProvider
  transport?: ChatProvider
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: ProxyProviderConfig['headers']
  body?: ProxyProviderConfig['body']
  fetch?: typeof fetch
  id?: string
  schema: Record<string, unknown> | JsonSchemaDefinition<T>
  schemaName?: string
  schemaDescription?: string
  strict?: boolean
  initialObject?: T | null
  initialValue?: ReactObjectDeepPartial<T> | null
  initialInput?: string
  defaultRequest?: Partial<ChatRequest>
  generateId?: IdGenerator
  onChunk?: (chunk: ChatChunk, text: string) => void
  onPartial?: (partialObject: ReactObjectDeepPartial<T>, text: string) => void
  onRequest?: (info: ReactObjectRequestInfo) => void
  onResponse?: (info: ReactObjectResponseInfo) => void
  onFinish?: ReactObjectFinishCallback<T>
  onFinishLegacy?: ReactLegacyObjectFinishCallback<T>
  onError?: (error: Error) => void
}

export interface UseReactObjectReturn<T = unknown> {
  id: string
  object: T | null
  partialObject: ReactObjectDeepPartial<T> | null
  text: string
  input: string
  status: ReactObjectStatus
  isLoading: boolean
  error: Error | null
  lastRequest: ReactObjectRequestInfo | null
  lastResponse: ReactObjectResponseInfo | null
  submit: (prompt?: string | Message, options?: Partial<ChatRequest>) => Promise<T>
  stop: () => void
  setInput: (value: string) => void
  setObject: (value: T | null) => void
  setPartialObject: (value: ReactObjectDeepPartial<T> | null) => void
  handleInputChange: (
    event:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target?: { value?: unknown } }
      | string
  ) => void
  handleSubmit: (
    event?: FormEvent<HTMLFormElement> | { preventDefault?: () => void },
    options?: Partial<ChatRequest>
  ) => Promise<T>
  clearError: () => void
  clearTrace: () => void
  inspect: () => RequestInspectionSnapshot<ReactObjectRequestInfo, ReactObjectResponseInfo>
  clear: () => void
  abortController: AbortController | null
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function mergeRequestHeaders(
  defaultHeaders?: HeadersInit,
  requestHeaders?: HeadersInit
): Record<string, string> | undefined {
  if (!defaultHeaders && !requestHeaders) return undefined
  return mergeHeaders(defaultHeaders, requestHeaders)
}

function createAbortError(): Error {
  const error = new Error('Structured output request was aborted')
  error.name = 'AbortError'
  return error
}

export function useObject<T = unknown>(options: UseReactObjectOptions<T>): UseReactObjectReturn<T> {
  const {
    provider: providedProvider,
    transport,
    api,
    baseURL,
    credentials,
    headers: transportHeaders,
    body: transportBody,
    fetch: transportFetch,
    id: explicitId,
    schema,
    schemaName = 'object',
    schemaDescription,
    strict = true,
    initialObject = null,
    initialValue,
    initialInput = '',
    defaultRequest = {},
    generateId: generateRuntimeId = createId,
    onChunk,
    onPartial,
    onRequest,
    onResponse,
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
        chatUrl: api ?? '/api/object',
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
  const requestApi = providedProvider || transport ? undefined : (api ?? '/api/object')
  const requestCredentials = providedProvider || transport ? undefined : credentials
  const proxyRequestInfo = useMemo(
    () => (requestApi ? { api: requestApi, credentials: requestCredentials } : {}),
    [requestApi, requestCredentials]
  )
  const outputSchema = useMemo(() => schemaToJsonSchema(schema), [schema])

  const initialPartialObject =
    initialValue === undefined ? (initialObject as ReactObjectDeepPartial<T> | null) : initialValue

  const [id] = useState(() => explicitId || generateRuntimeId('object'))
  const [object, setObjectState] = useState<T | null>(initialObject)
  const [partialObject, setPartialObjectState] = useState<ReactObjectDeepPartial<T> | null>(
    initialPartialObject
  )
  const [text, setTextState] = useState('')
  const [input, setInputState] = useState(initialInput)
  const [status, setStatus] = useState<ReactObjectStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactObjectRequestInfo | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactObjectResponseInfo | null>(null)
  const [inspectionEvents, setInspectionEvents] = useState<InspectionTimelineEventInput[]>([])
  const [inspectionRetries, setInspectionRetries] = useState<InspectionRetryRecordInput[]>([])
  const inspectionRecords = {
    setEvents: setInspectionEvents,
    setRetries: setInspectionRetries
  }
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const inputRef = useRef(input)
  const initialObjectRef = useRef(initialObject)
  const initialPartialObjectRef = useRef(initialPartialObject)
  const abortControllerRef = useRef<AbortController | null>(null)
  const optionsRef = useRef(options)
  const onChunkRef = useRef(onChunk)
  const onPartialRef = useRef(onPartial)
  const onRequestRef = useRef(onRequest)
  const onResponseRef = useRef(onResponse)
  const onFinishRef = useRef(onFinish)
  const onFinishLegacyRef = useRef(onFinishLegacy)
  const onErrorRef = useRef(onError)

  optionsRef.current = options
  onChunkRef.current = onChunk
  onPartialRef.current = onPartial
  onRequestRef.current = onRequest
  onResponseRef.current = onResponse
  onFinishRef.current = onFinish
  onFinishLegacyRef.current = onFinishLegacy
  onErrorRef.current = onError

  const setObject = useCallback((value: T | null) => {
    setObjectState(value)
  }, [])

  const setPartialObject = useCallback((value: ReactObjectDeepPartial<T> | null) => {
    setPartialObjectState(value)
  }, [])

  const setText = useCallback((value: string) => {
    setTextState(value)
  }, [])

  const setInput = useCallback((value: string) => {
    inputRef.current = value
    setInputState(value)
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

  const clear = useCallback(() => {
    stop()
    setObject(initialObjectRef.current)
    setPartialObject(initialPartialObjectRef.current)
    setText('')
    setInput('')
    setError(null)
    clearTrace()
  }, [clearTrace, setInput, setObject, setPartialObject, setText, stop])

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

  const responseFormat = useCallback((): ResponseFormat => {
    const format: ResponseFormat = {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        schema: outputSchema,
        strict
      }
    }
    if (schemaDescription) {
      format.json_schema.description = schemaDescription
    }
    return format
  }, [outputSchema, schemaDescription, schemaName, strict])

  const promptToMessage = useCallback(
    (prompt: string | Message): Message => {
      if (typeof prompt !== 'string') {
        return { ...prompt, id: prompt.id || generateRuntimeId(prompt.role) }
      }
      return { id: generateRuntimeId('user'), role: 'user', content: prompt, createdAt: new Date() }
    },
    [generateRuntimeId]
  )

  const parseObject = useCallback(
    (raw: string): T => {
      let parsed: unknown
      try {
        parsed = JSON.parse(raw) as unknown
      } catch (cause) {
        throw new AiHooksError('Structured output was not valid JSON', { cause })
      }
      const validationError = validateJsonSchema(parsed, schema)
      if (validationError) {
        throw new AiHooksError(`Structured output did not match schema: ${validationError}`)
      }
      return parsed as T
    },
    [schema]
  )

  const parsePartialObject = useCallback((raw: string): ReactObjectDeepPartial<T> | null => {
    for (const candidate of [raw.trim(), repairPartialJson(raw)]) {
      if (!candidate) continue
      try {
        const parsed = JSON.parse(candidate) as unknown
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as ReactObjectDeepPartial<T>
        }
      } catch {
        // Keep the previous partial object until enough JSON has streamed in.
      }
    }
    return null
  }, [])

  const requestInfo = useCallback(
    (request: ChatRequest, attempt: number): ReactObjectRequestInfo => ({
      id: request.id ?? id,
      providerId: provider.id,
      attempt,
      ...proxyRequestInfo,
      request: cloneRequestSnapshot(request),
      messages: request.messages.map(cloneMessageSnapshot),
      requestMetadata: request.metadata,
      ...(request.body ? { body: { ...request.body } } : {}),
      ...(request.headers ? { headers: headersToRecord(request.headers) } : {})
    }),
    [id, provider.id, proxyRequestInfo]
  )

  const reportRequest = useCallback(
    (info: ReactObjectRequestInfo) => {
      setLastRequest(info)
      setLastResponse(null)
      recordInspectionEvent({
        kind: 'request',
        label: 'request prepared',
        attempt: info.attempt,
        status,
        metadata: {
          body: info.body,
          headers: info.headers,
          hasMessages: info.messages.length > 0
        }
      })
      onRequestRef.current?.(info)
    },
    [recordInspectionEvent, status]
  )

  const reportResponse = useCallback(
    (info: ReactObjectRequestInfo, stream: AsyncIterable<ChatChunk> | null | undefined) => {
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

  const submit = useCallback(
    async (prompt?: string | Message, requestOptions: Partial<ChatRequest> = {}) => {
      const finalPrompt = prompt ?? inputRef.current
      const defaultMessages = defaultRequest.messages ?? []
      const requestMessages = requestOptions.messages

      if (!finalPrompt && !requestMessages?.length) {
        throw new Error('submit() requires a prompt, input state, or request messages')
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setObject(initialObjectRef.current)
      setPartialObject(initialPartialObjectRef.current)
      setText('')
      setStatus('submitted')
      clearInspectionState(inspectionRecords)

      try {
        let retryAttempt = 0
        const currentOptions = optionsRef.current
        const maxRetries = getMaxRetries(currentOptions)
        while (true) {
          let receivedChunk = false
          let nextText = ''
          let nextPartialObject = initialPartialObjectRef.current
          let hasPartialObject = initialPartialObjectRef.current !== null
          let pendingPartial = false
          const throttler = createStreamUpdateThrottler(getThrottleMs(currentOptions), () => {
            setText(nextText)
            if (hasPartialObject) {
              setPartialObject(nextPartialObject)
              if (pendingPartial && nextPartialObject) {
                onPartialRef.current?.(nextPartialObject, nextText)
                pendingPartial = false
              }
            }
          })

          try {
            const { messages: _defaultMessages, ...defaultRest } = defaultRequest
            const { messages: _requestMessages, ...requestRest } = requestOptions
            const messages = requestMessages ?? [
              ...defaultMessages,
              promptToMessage(finalPrompt as string | Message)
            ]
            const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
            const headers = mergeRequestHeaders(defaultRequest.headers, requestOptions.headers)
            const chatRequest: ChatRequest = {
              ...defaultRest,
              ...requestRest,
              ...(body ? { body } : {}),
              ...(headers ? { headers } : {}),
              messages,
              responseFormat: responseFormat(),
              signal: controller.signal,
              stream: true
            }
            const requestPayload = requestInfo(chatRequest, retryAttempt + 1)
            reportRequest(requestPayload)
            const stream = await provider.chat(chatRequest)
            reportResponse(requestPayload, stream)

            for await (const chunk of stream) {
              if (controller.signal.aborted) break
              if (!receivedChunk) {
                recordInspectionEvent({
                  kind: 'stream',
                  label: 'stream started',
                  attempt: retryAttempt + 1,
                  status,
                  metadata: {
                    hasStream: true
                  }
                })
              }
              receivedChunk = true
              setStatus((current) => (current === 'submitted' ? 'streaming' : current))
              if (chunk.content) {
                nextText += chunk.content
                const parsedPartial = parsePartialObject(nextText)
                if (parsedPartial) {
                  nextPartialObject = parsedPartial
                  hasPartialObject = true
                  pendingPartial = true
                }
                throttler.schedule()
              }
              onChunkRef.current?.(chunk, nextText)
            }
            throttler.flush()

            if (controller.signal.aborted) {
              throw createAbortError()
            }

            let finalObject: T
            try {
              finalObject = parseObject(nextText)
            } catch (rawError) {
              const parseError = normalizeError(rawError)
              const finishInfo = {
                object: undefined as T | undefined,
                text: nextText,
                isAbort: false,
                error: parseError
              }
              const onFinish = onFinishRef.current
              if (onFinish && onFinish.length <= 1) {
                void (onFinish as ReactAiSdkObjectFinishCallback<T>)(finishInfo)
              }
              throw parseError
            }
            setObject(finalObject)
            setPartialObject(finalObject as ReactObjectDeepPartial<T>)
            setText(nextText)
            setStatus('ready')
            const finishInfo = {
              object: finalObject,
              text: nextText,
              isAbort: false,
              error: undefined
            }
            const onFinish = onFinishRef.current
            if (!onFinish) {
              onFinishLegacyRef.current?.(finalObject, finishInfo)
            } else {
              if (onFinish.length <= 1) {
                void (onFinish as ReactAiSdkObjectFinishCallback<T>)(finishInfo)
              } else {
                void (onFinish as ReactLegacyObjectFinishCallback<T>)(
                  finalObject,
                  finishInfo as ReactObjectFinishInfo<T>
                )
              }
              onFinishLegacyRef.current?.(finalObject, finishInfo)
            }
            return finalObject
          } catch (rawError) {
            const nextError = normalizeError(rawError)
            if (nextError.name === 'AbortError' || controller.signal.aborted) {
              throttler.flush()
              setStatus('error')
              setError(nextError)
              onErrorRef.current?.(nextError)
              throw nextError
            }

            throttler.flush()
            const context = createRetryContext(nextError, retryAttempt + 1, maxRetries)
            if (!receivedChunk && (await canRetry(currentOptions, context))) {
              recordInspectionStateRetryAttempt(inspectionRecords, nextError, context, {
                retryDelayMs: optionsRef.current.retryDelayMs,
                status
              })
              retryAttempt += 1
              throttler.cancel()
              await waitForRetry(currentOptions, context, controller.signal)
              continue
            }

            recordInspectionEvent({
              kind: 'error',
              label: 'structured output failed',
              attempt: retryAttempt + 1,
              status: 'error',
              metadata: {
                message: nextError.message
              }
            })
            setStatus('error')
            setError(nextError)
            onErrorRef.current?.(nextError)
            throw nextError
          }
        }
      } finally {
        abortControllerRef.current = null
        setAbortController(null)
        setIsLoading(false)
      }
    },
    [
      defaultRequest,
      parseObject,
      parsePartialObject,
      promptToMessage,
      provider,
      recordInspectionEvent,
      reportRequest,
      reportResponse,
      requestInfo,
      responseFormat,
      setObject,
      setPartialObject,
      setText
    ]
  )

  const handleSubmit = useCallback(
    async (
      event?: FormEvent<HTMLFormElement> | { preventDefault?: () => void },
      requestOptions: Partial<ChatRequest> = {}
    ) => {
      event?.preventDefault?.()
      const result = await submit(inputRef.current, requestOptions)
      setInput('')
      return result
    },
    [setInput, submit]
  )

  return {
    id,
    object,
    partialObject,
    text,
    input,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    submit,
    stop,
    setInput,
    setObject,
    setPartialObject,
    handleInputChange,
    handleSubmit,
    clearError,
    clearTrace,
    inspect,
    clear,
    abortController
  }
}

function repairPartialJson(raw: string): string | null {
  const trimmed = raw.trim()
  const objectStart = trimmed.indexOf('{')
  const arrayStart = trimmed.indexOf('[')
  const start =
    objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart)
  if (start < 0) return null

  let candidate = trimmed.slice(start)
  const closers: string[] = []
  let inString = false
  let escaped = false

  for (const char of candidate) {
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{') {
      closers.push('}')
    } else if (char === '[') {
      closers.push(']')
    } else if (char === '}' || char === ']') {
      const expected = closers.pop()
      if (expected !== char) return null
    }
  }

  if (inString) candidate += '"'

  candidate = candidate
    .replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, '')
    .replace(/((?:[{,]|\[)\s*)"(?:[^"\\]|\\.)*"\s*$/, '$1')
    .replace(/,\s*$/, '')
    .trimEnd()
  if (!candidate) return null

  return `${candidate}${[...closers].reverse().join('')}`
}
