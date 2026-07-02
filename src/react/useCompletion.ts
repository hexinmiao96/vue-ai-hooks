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
  CompletionRequest,
  RetryContext,
  IdGenerator,
  RetryOptions,
  StreamThrottleOptions
} from '../types'
import { createId } from '../utils/id'
import { headersToRecord, mergeHeaders } from '../utils/headers'
import { cloneRequestSnapshot } from '../utils/lifecycle'
import { mergeRequestBody } from '../utils/requestBody'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import { createStreamUpdateThrottler, getThrottleMs } from '../utils/throttle'
import {
  inspectRequestTrace,
  type InspectionRetryRecordInput,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'

export type ReactCompletionStatus = AiRequestStatus
export type ReactCompletionStreamProtocol = NonNullable<CompletionRequest['streamProtocol']>

export interface ReactCompletionFinishInfo {
  prompt: string
  completion: string
  isAbort: boolean
}

export interface ReactCompletionRequestInfo {
  id: string
  providerId: string
  attempt: number
  api?: string
  credentials?: RequestCredentials
  prompt: string
  request: CompletionRequest
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface ReactCompletionResponseInfo extends ReactCompletionRequestInfo {
  hasStream: boolean
}

export interface UseReactCompletionOptions extends RetryOptions, StreamThrottleOptions {
  provider?: ChatProvider
  transport?: ChatProvider
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: ProxyProviderConfig['headers']
  body?: ProxyProviderConfig['body']
  fetch?: typeof fetch
  id?: string
  generateId?: IdGenerator
  initialInput?: string
  initialCompletion?: string
  defaultRequest?: Partial<CompletionRequest>
  streamProtocol?: ReactCompletionStreamProtocol
  onUpdate?: (completion: string, delta: string) => void
  onRequest?: (info: ReactCompletionRequestInfo) => void
  onResponse?: (info: ReactCompletionResponseInfo) => void
  onFinish?: (completion: string, info: ReactCompletionFinishInfo) => void
  onError?: (error: Error) => void
}

export interface UseReactCompletionReturn {
  id: string
  completion: string
  input: string
  status: ReactCompletionStatus
  isLoading: boolean
  error: Error | null
  lastRequest: ReactCompletionRequestInfo | null
  lastResponse: ReactCompletionResponseInfo | null
  complete: (prompt?: string, options?: Partial<CompletionRequest>) => Promise<string>
  stop: () => void
  setInput: (value: string) => void
  setCompletion: (value: string) => void
  handleInputChange: (
    event:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target?: { value?: unknown } }
      | string
  ) => void
  handleSubmit: (
    event?: FormEvent<HTMLFormElement> | { preventDefault?: () => void },
    options?: Partial<CompletionRequest>
  ) => Promise<string>
  inspect: () => RequestInspectionSnapshot<ReactCompletionRequestInfo, ReactCompletionResponseInfo>
  clearError: () => void
  clearTrace: () => void
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

export function useCompletion(options: UseReactCompletionOptions = {}): UseReactCompletionReturn {
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
    generateId: generateRuntimeId = createId,
    initialInput = '',
    initialCompletion = '',
    defaultRequest = {},
    streamProtocol,
    onUpdate,
    onRequest,
    onResponse,
    onFinish,
    onError
  } = options

  const provider = useMemo(
    () =>
      providedProvider ??
      transport ??
      proxyProvider({
        baseURL,
        completionUrl: api ?? '/api/completion',
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
  const requestApi = providedProvider || transport ? undefined : (api ?? '/api/completion')
  const requestCredentials = providedProvider || transport ? undefined : credentials
  const proxyRequestInfo = requestApi ? { api: requestApi, credentials: requestCredentials } : {}

  const [id] = useState(() => explicitId || generateRuntimeId('completion'))
  const [completion, setCompletionState] = useState(initialCompletion)
  const [input, setInputState] = useState(initialInput)
  const [status, setStatus] = useState<ReactCompletionStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactCompletionRequestInfo | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactCompletionResponseInfo | null>(null)
  const [inspectionEvents, setInspectionEvents] = useState<InspectionTimelineEventInput[]>([])
  const [inspectionRetries, setInspectionRetries] = useState<InspectionRetryRecordInput[]>([])
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const completionRef = useRef(completion)
  const inputRef = useRef(input)
  const abortControllerRef = useRef<AbortController | null>(null)
  const optionsRef = useRef(options)
  const onUpdateRef = useRef(onUpdate)
  const onRequestRef = useRef(onRequest)
  const onResponseRef = useRef(onResponse)
  const onFinishRef = useRef(onFinish)
  const onErrorRef = useRef(onError)

  optionsRef.current = options
  onUpdateRef.current = onUpdate
  onRequestRef.current = onRequest
  onResponseRef.current = onResponse
  onFinishRef.current = onFinish
  onErrorRef.current = onError

  const setCompletion = useCallback((value: string) => {
    completionRef.current = value
    setCompletionState(value)
  }, [])

  const setInput = useCallback((value: string) => {
    inputRef.current = value
    setInputState(value)
  }, [])

  const clearTrace = useCallback(() => {
    setLastRequest(null)
    setLastResponse(null)
    setInspectionEvents([])
    setInspectionRetries([])
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
    setInspectionEvents((current) => [
      ...current,
      { ...event, timestamp: event.timestamp ?? new Date() }
    ])
  }, [])

  const recordInspectionRetry = useCallback((errorToRecord: unknown, context: RetryContext) => {
    const delayMs =
      typeof optionsRef.current.retryDelayMs === 'function'
        ? optionsRef.current.retryDelayMs(context)
        : (optionsRef.current.retryDelayMs ?? 0)
    setInspectionRetries((current) => [
      ...current,
      {
        attempt: context.attempt,
        maxRetries: context.maxRetries,
        error: errorToRecord,
        delayMs,
        timestamp: new Date()
      }
    ])
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
    setCompletion('')
    setInput('')
    setError(null)
    clearTrace()
  }, [clearTrace, setCompletion, setInput, stop])

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

  const requestInfo = useCallback(
    (prompt: string, request: CompletionRequest, attempt: number): ReactCompletionRequestInfo => ({
      id,
      providerId: provider.id,
      attempt,
      ...proxyRequestInfo,
      prompt,
      request: cloneRequestSnapshot(request),
      ...(request.body ? { body: { ...request.body } } : {}),
      ...(request.headers ? { headers: headersToRecord(request.headers) } : {})
    }),
    [id, provider.id, proxyRequestInfo]
  )

  const reportRequest = useCallback(
    (info: ReactCompletionRequestInfo) => {
      setLastRequest(info)
      setLastResponse(null)
      recordInspectionEvent({
        kind: 'request',
        label: 'request prepared',
        attempt: info.attempt,
        status,
        metadata: { prompt: info.prompt }
      })
      onRequestRef.current?.(info)
    },
    [recordInspectionEvent, status]
  )

  const reportResponse = useCallback(
    (info: ReactCompletionRequestInfo, stream: AsyncIterable<string> | null | undefined) => {
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
    },
    [recordInspectionEvent, status]
  )

  const finishCompletion = useCallback((prompt: string, isAbort: boolean) => {
    onFinishRef.current?.(completionRef.current, {
      prompt,
      completion: completionRef.current,
      isAbort
    })
  }, [])

  const complete = useCallback(
    async (prompt?: string, requestOptions: Partial<CompletionRequest> = {}) => {
      const finalPrompt = prompt ?? inputRef.current
      if (!finalPrompt) {
        throw new Error('complete() requires a prompt (either as argument or via input state)')
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setCompletion('')
      setStatus('submitted')
      setInspectionEvents([])
      setInspectionRetries([])

      try {
        let retryAttempt = 0
        const currentOptions = optionsRef.current
        const maxRetries = getMaxRetries(currentOptions)
        while (true) {
          let receivedDelta = false
          let nextCompletion = ''
          let pendingDelta = ''
          const throttler = createStreamUpdateThrottler(getThrottleMs(currentOptions), () => {
            setCompletion(nextCompletion)
            if (pendingDelta) {
              onUpdateRef.current?.(nextCompletion, pendingDelta)
              pendingDelta = ''
            }
          })

          try {
            const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
            const headers = mergeRequestHeaders(defaultRequest.headers, requestOptions.headers)
            const request: CompletionRequest = {
              ...defaultRequest,
              ...(streamProtocol ? { streamProtocol } : {}),
              ...requestOptions,
              ...(body ? { body } : {}),
              ...(headers ? { headers } : {}),
              prompt: finalPrompt,
              signal: controller.signal,
              stream: true
            }
            const info = requestInfo(finalPrompt, request, retryAttempt + 1)
            reportRequest(info)
            const stream = await provider.completion(request)
            reportResponse(info, stream)
            let streamEventReported = false

            for await (const delta of stream) {
              if (controller.signal.aborted) break
              if (delta) {
                if (!streamEventReported) {
                  streamEventReported = true
                  recordInspectionEvent({
                    kind: 'stream',
                    label: 'stream started',
                    attempt: info.attempt,
                    status,
                    metadata: {
                      streamChunkCount: 0
                    }
                  })
                }
                receivedDelta = true
                nextCompletion += delta
                pendingDelta += delta
                throttler.schedule()
              }
              setStatus((current) => (current === 'submitted' ? 'streaming' : current))
            }

            throttler.flush()
            setStatus('ready')
            finishCompletion(finalPrompt, controller.signal.aborted)
            return completionRef.current
          } catch (rawError) {
            const nextError = normalizeError(rawError)
            if (nextError.name === 'AbortError' || controller.signal.aborted) {
              throttler.flush()
              setStatus('ready')
              finishCompletion(finalPrompt, true)
              return completionRef.current
            }

            throttler.flush()
            const context = createRetryContext(nextError, retryAttempt + 1, maxRetries)
            if (!receivedDelta && (await canRetry(currentOptions, context))) {
              recordInspectionEvent({
                kind: 'retry',
                label: 'retry planned',
                attempt: context.attempt,
                status,
                metadata: {
                  maxRetries: context.maxRetries,
                  hasResponse: false
                }
              })
              recordInspectionRetry(nextError, context)
              retryAttempt += 1
              throttler.cancel()
              await waitForRetry(currentOptions, context, controller.signal)
              continue
            }

            recordInspectionEvent({
              kind: 'error',
              label: 'completion failed',
              attempt: context.attempt,
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
      finishCompletion,
      provider,
      reportRequest,
      reportResponse,
      requestInfo,
      recordInspectionEvent,
      recordInspectionRetry,
      setCompletion,
      streamProtocol
    ]
  )

  const handleSubmit = useCallback(
    async (
      event?: FormEvent<HTMLFormElement> | { preventDefault?: () => void },
      requestOptions: Partial<CompletionRequest> = {}
    ) => {
      event?.preventDefault?.()
      const result = await complete(inputRef.current, requestOptions)
      setInput('')
      return result
    },
    [complete, setInput]
  )

  return {
    id,
    completion,
    input,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    complete,
    stop,
    setInput,
    setCompletion,
    handleInputChange,
    handleSubmit,
    clearError,
    clearTrace,
    clear,
    inspect,
    abortController
  }
}
