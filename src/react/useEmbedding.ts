import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { proxyProvider, type ProxyProviderConfig } from '../providers/proxy'
import type { ChatProvider } from '../providers/types'
import type { AiRequestStatus, EmbeddingRequest, EmbeddingResult, RetryOptions } from '../types'
import { headersToRecord } from '../utils/headers'
import { createId } from '../utils/id'
import { cloneRequestSnapshot } from '../utils/lifecycle'
import { mergeRequestBody } from '../utils/requestBody'
import {
  canRetry,
  createAbortError,
  createRetryContext,
  getMaxRetries,
  waitForRetry
} from '../utils/retry'
import {
  clearInspectionState,
  inspectRequestTrace,
  recordInspectionStateRetryAttempt,
  type InspectionRetryRecordInput,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'
import type { EmbeddingRequestInfo, EmbeddingResponseInfo } from '../composables/useEmbedding'

export { cosineSimilarity } from '../utils/embedding'

/** Request inspection metadata emitted by the React embedding hook. */
export type ReactEmbeddingRequestInfo = EmbeddingRequestInfo

/** Response inspection metadata emitted by the React embedding hook. */
export type ReactEmbeddingResponseInfo = EmbeddingResponseInfo

/** Configures embedding transport, initial input, retries, and lifecycle callbacks. */
export interface UseReactEmbeddingOptions extends RetryOptions {
  provider?: ChatProvider
  transport?: ChatProvider
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: ProxyProviderConfig['headers']
  body?: ProxyProviderConfig['body']
  fetch?: typeof fetch
  initialInput?: string
  defaultRequest?: Partial<EmbeddingRequest>
  onRequest?: (info: ReactEmbeddingRequestInfo) => void
  onResponse?: (info: ReactEmbeddingResponseInfo) => void
  onSuccess?: (result: EmbeddingResult) => void
  onError?: (error: Error) => void
}

/** Exposes embedding vectors, request state, form bindings, controls, and inspection data. */
export interface UseReactEmbeddingReturn {
  id: string
  embeddings: number[][]
  input: string
  status: AiRequestStatus
  isLoading: boolean
  error: Error | null
  result: EmbeddingResult | null
  lastRequest: ReactEmbeddingRequestInfo | null
  lastResponse: ReactEmbeddingResponseInfo | null
  inspect: () => RequestInspectionSnapshot<ReactEmbeddingRequestInfo, ReactEmbeddingResponseInfo>
  embed: (input: string | string[], options?: Partial<EmbeddingRequest>) => Promise<EmbeddingResult>
  stop: () => void
  setInput: (value: string) => void
  handleInputChange: (
    event:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target?: { value?: unknown } }
      | string
  ) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<EmbeddingRequest>
  ) => Promise<EmbeddingResult>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: AbortController | null
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * Generates embeddings for one or more strings and exposes the result as React state.
 *
 * The hook retains both the provider result and its vector matrix, while `stop` and unmount abort
 * the active request.
 *
 * @returns Embedding state, form helpers, lifecycle controls, and request inspection data.
 */
export function useEmbedding(options: UseReactEmbeddingOptions = {}): UseReactEmbeddingReturn {
  const {
    provider: providedProvider,
    transport,
    api,
    baseURL,
    credentials,
    headers: transportHeaders,
    body: transportBody,
    fetch: transportFetch,
    initialInput = '',
    defaultRequest = {},
    onRequest,
    onResponse,
    onSuccess,
    onError
  } = options

  const provider = useMemo(
    () =>
      providedProvider ??
      transport ??
      proxyProvider({
        baseURL,
        embeddingUrl: api ?? '/api/embedding',
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

  const [id] = useState(() => createId('embedding'))
  const [embeddings, setEmbeddings] = useState<number[][]>([])
  const [input, setInputState] = useState(initialInput)
  const [status, setStatus] = useState<AiRequestStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [result, setResult] = useState<EmbeddingResult | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactEmbeddingRequestInfo | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactEmbeddingResponseInfo | null>(null)
  const [inspectionEvents, setInspectionEvents] = useState<InspectionTimelineEventInput[]>([])
  const [inspectionRetries, setInspectionRetries] = useState<InspectionRetryRecordInput[]>([])
  const inspectionRecords = {
    setEvents: setInspectionEvents,
    setRetries: setInspectionRetries
  }
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const inputRef = useRef(input)
  const optionsRef = useRef(options)
  const onRequestRef = useRef(onRequest)
  const onResponseRef = useRef(onResponse)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)

  optionsRef.current = options
  onRequestRef.current = onRequest
  onResponseRef.current = onResponse
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

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
    setEmbeddings([])
    setInput('')
    setResult(null)
    setError(null)
    clearTrace()
  }, [clearTrace, setInput, stop])

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
    (
      inputValue: string | string[],
      request: EmbeddingRequest,
      attempt: number
    ): ReactEmbeddingRequestInfo => ({
      providerId: provider.id,
      attempt,
      input: Array.isArray(inputValue) ? [...inputValue] : inputValue,
      request: cloneRequestSnapshot(request),
      ...(request.body ? { body: { ...request.body } } : {}),
      ...(request.headers ? { headers: headersToRecord(request.headers) } : {})
    }),
    [provider.id]
  )

  const reportRequest = useCallback((info: ReactEmbeddingRequestInfo) => {
    setLastRequest(info)
    setLastResponse(null)
    setInspectionEvents((events) => [
      ...events,
      {
        kind: 'request',
        label: 'request prepared',
        attempt: info.attempt,
        status: 'submitted',
        metadata: { input: info.input }
      }
    ])
    onRequestRef.current?.(info)
  }, [])

  const reportResponse = useCallback((info: ReactEmbeddingRequestInfo, res: EmbeddingResult) => {
    const response = { ...info, result: res }
    setLastResponse(response)
    setInspectionEvents((events) => [
      ...events,
      {
        kind: 'response',
        label: 'response received',
        attempt: info.attempt,
        status: 'ready',
        metadata: { embeddingCount: res.embeddings.length }
      }
    ])
    onResponseRef.current?.(response)
  }, [])

  const embed = useCallback(
    async (inputValue: string | string[], requestOptions: Partial<EmbeddingRequest> = {}) => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setStatus('submitted')
      clearInspectionState(inspectionRecords)

      try {
        let retryAttempt = 0
        const currentOptions = optionsRef.current
        const maxRetries = getMaxRetries(currentOptions)
        while (true) {
          try {
            const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
            const request: EmbeddingRequest = {
              ...defaultRequest,
              ...requestOptions,
              ...(body ? { body } : {}),
              input: inputValue,
              signal: controller.signal
            }
            const info = requestInfo(inputValue, request, retryAttempt + 1)
            reportRequest(info)
            const res = await provider.embedding(request)
            reportResponse(info, res)
            if (controller.signal.aborted) throw createAbortError()
            setEmbeddings(res.embeddings)
            setResult(res)
            setStatus('ready')
            onSuccessRef.current?.(res)
            return res
          } catch (rawError) {
            const nextError = normalizeError(rawError)
            if (nextError.name === 'AbortError' || controller.signal.aborted) {
              setStatus('ready')
              throw nextError
            }
            const context = createRetryContext(nextError, retryAttempt + 1, maxRetries)
            if (await canRetry(currentOptions, context)) {
              recordInspectionStateRetryAttempt(inspectionRecords, nextError, context, {
                retryDelayMs: currentOptions.retryDelayMs,
                status
              })
              retryAttempt += 1
              await waitForRetry(currentOptions, context, controller.signal)
              continue
            }
            setInspectionEvents((events) => [
              ...events,
              {
                kind: 'error',
                label: 'embedding failed',
                attempt: context.attempt,
                status: 'error',
                metadata: { message: nextError.message }
              }
            ])
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
    [defaultRequest, provider, reportRequest, reportResponse, requestInfo, status]
  )

  const handleSubmit = useCallback(
    async (
      event?: { preventDefault?: () => void },
      requestOptions: Partial<EmbeddingRequest> = {}
    ) => {
      event?.preventDefault?.()
      const res = await embed(inputRef.current, requestOptions)
      setInput('')
      return res
    },
    [embed, setInput]
  )

  return {
    id,
    embeddings,
    input,
    status,
    isLoading,
    error,
    result,
    lastRequest,
    lastResponse,
    inspect,
    embed,
    stop,
    setInput,
    handleInputChange,
    handleSubmit,
    clearError,
    clearTrace,
    clear,
    abortController
  }
}
