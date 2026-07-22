import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { requestJson } from '../utils/fetch'
import { mergeHeaders } from '../utils/headers'
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
  recordInspectionStateEvent,
  recordInspectionStateRetryAttempt,
  type InspectionRetryRecordInput,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'
import type {
  AiRequestStatus,
  RetryOptions,
  TranscriptionRequest,
  TranscriptionResult
} from '../types'
import type {
  TranscriptionRequestInfo,
  TranscriptionResponseInfo
} from '../composables/useTranscription'

/** Request inspection metadata emitted by the React transcription hook. */
export type ReactTranscriptionRequestInfo = TranscriptionRequestInfo

/** Response inspection metadata emitted by the React transcription hook. */
export type ReactTranscriptionResponseInfo = TranscriptionResponseInfo

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
type BodySource =
  | Record<string, unknown>
  | ((context: {
      request: TranscriptionRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

/** Configures the transcription endpoint, initial audio input, retries, and callbacks. */
export interface UseReactTranscriptionOptions extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  defaultRequest?: Partial<TranscriptionRequest>
  onRequest?: (info: ReactTranscriptionRequestInfo) => void
  onResponse?: (info: ReactTranscriptionResponseInfo) => void
  onFinish?: (result: TranscriptionResult) => void
  onError?: (err: Error) => void
}

/** Exposes transcribed text, request state, form bindings, controls, and inspection data. */
export interface UseReactTranscriptionReturn {
  input: string
  transcription: string
  text: string
  result: TranscriptionResult | null
  status: AiRequestStatus
  isLoading: boolean
  error: Error | null
  lastRequest: ReactTranscriptionRequestInfo | null
  lastResponse: ReactTranscriptionResponseInfo | null
  inspect: () => RequestInspectionSnapshot<
    ReactTranscriptionRequestInfo,
    ReactTranscriptionResponseInfo
  >
  transcribe: (
    audio?: string,
    options?: Partial<TranscriptionRequest>
  ) => Promise<TranscriptionResult>
  transcribeAudio: (
    audio?: string,
    options?: Partial<TranscriptionRequest>
  ) => Promise<TranscriptionResult>
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
    options?: Partial<TranscriptionRequest>
  ) => Promise<TranscriptionResult>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: AbortController | null
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function mergeRequestHeaders(defaultHeaders?: HeadersInit, requestHeaders?: HeadersInit) {
  if (!defaultHeaders && !requestHeaders) return undefined
  return mergeHeaders(defaultHeaders, requestHeaders)
}

function resolveUrl(baseURL: string, url: string) {
  if (/^https?:\/\//.test(url) || !baseURL) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeTranscriptionResult(raw: unknown): TranscriptionResult {
  if (typeof raw === 'string') return { text: raw }
  if (!isRecord(raw)) return { text: '' }
  const text =
    typeof raw.text === 'string'
      ? raw.text
      : typeof raw.transcription === 'string'
        ? raw.transcription
        : ''
  return { ...raw, text } as TranscriptionResult
}

/**
 * Transcribes audio through an app-owned endpoint and exposes normalized text as React state.
 *
 * String responses and object responses with `text` or `transcription` fields share one result
 * shape.
 *
 * @returns Transcription state, form helpers, lifecycle controls, and request inspection data.
 */
export function useTranscription(
  options: UseReactTranscriptionOptions = {}
): UseReactTranscriptionReturn {
  const {
    api = '/api/transcription',
    baseURL = '',
    credentials,
    fetch: fetcher,
    timeoutMs,
    initialInput = '',
    defaultRequest = {},
    onRequest,
    onResponse,
    onFinish,
    onError
  } = options

  const [input, setInputState] = useState(initialInput)
  const [transcription, setTranscription] = useState('')
  const [result, setResult] = useState<TranscriptionResult | null>(null)
  const [status, setStatus] = useState<AiRequestStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactTranscriptionRequestInfo | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactTranscriptionResponseInfo | null>(null)
  const [inspectionEvents, setInspectionEvents] = useState<InspectionTimelineEventInput[]>([])
  const [inspectionRetries, setInspectionRetries] = useState<InspectionRetryRecordInput[]>([])
  const inspectionRecords = { setEvents: setInspectionEvents, setRetries: setInspectionRetries }
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const inputRef = useRef(input)
  const optionsRef = useRef(options)
  const onRequestRef = useRef(onRequest)
  const onResponseRef = useRef(onResponse)
  const onFinishRef = useRef(onFinish)
  const onErrorRef = useRef(onError)

  optionsRef.current = options
  onRequestRef.current = onRequest
  onResponseRef.current = onResponse
  onFinishRef.current = onFinish
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

  const clear = useCallback(() => {
    stop()
    setInput('')
    setTranscription('')
    setResult(null)
    setError(null)
    clearTrace()
    setStatus('ready')
  }, [clearTrace, setInput, stop])

  useEffect(() => () => stop(), [stop])

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
      request: TranscriptionRequest,
      body: Record<string, unknown>,
      headers: Record<string, string>,
      attempt: number
    ): ReactTranscriptionRequestInfo => ({
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      audio: request.audio,
      request: cloneRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }),
    [api, credentials]
  )

  const reportRequest = useCallback((info: ReactTranscriptionRequestInfo) => {
    setLastRequest(info)
    setLastResponse(null)
    recordInspectionStateEvent(inspectionRecords, {
      kind: 'request',
      label: 'request prepared',
      attempt: info.attempt,
      status: 'submitted',
      metadata: { hasBody: Boolean(Object.keys(info.body ?? {}).length) }
    })
    onRequestRef.current?.(info)
  }, [])

  const reportResponse = useCallback(
    (info: ReactTranscriptionRequestInfo, res: TranscriptionResult) => {
      const response = { ...info, result: res }
      setLastResponse(response)
      recordInspectionStateEvent(inspectionRecords, {
        kind: 'response',
        label: 'response received',
        attempt: info.attempt,
        status: 'ready',
        metadata: { textLength: res.text.length }
      })
      onResponseRef.current?.(response)
      return response
    },
    []
  )

  const transcribeAudio = useCallback(
    async (audio?: string, requestOptions: Partial<TranscriptionRequest> = {}) => {
      const finalAudio = audio ?? inputRef.current
      if (!finalAudio) {
        throw new Error('transcribeAudio() requires audio (either as argument or via input)')
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setTranscription('')
      setResult(null)
      setStatus('submitted')
      clearInspectionState(inspectionRecords)

      try {
        let retryAttempt = 0
        const maxRetries = getMaxRetries(optionsRef.current)
        while (true) {
          try {
            const currentOptions = optionsRef.current
            const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
            const headers = mergeRequestHeaders(
              defaultRequest.headers as HeadersInit | undefined,
              requestOptions.headers
            )
            const request: TranscriptionRequest = {
              ...defaultRequest,
              ...requestOptions,
              ...(body ? { body } : {}),
              ...(headers ? { headers } : {}),
              audio: finalAudio,
              signal: controller.signal
            }
            const configuredHeaders =
              typeof currentOptions.headers === 'function'
                ? await currentOptions.headers()
                : (currentOptions.headers ?? {})
            const wireHeaders = mergeHeaders(
              { 'Content-Type': 'application/json' },
              configuredHeaders,
              request.headers
            )
            const configuredBody =
              typeof currentOptions.body === 'function'
                ? await currentOptions.body({ request })
                : (currentOptions.body ?? {})
            const { signal: _signal, headers: _headers, body: requestBody, ...typedBody } = request
            const wireBody = { ...configuredBody, ...(requestBody ?? {}), ...typedBody }
            const info = requestInfo(request, wireBody, wireHeaders, retryAttempt + 1)
            reportRequest(info)
            const response = await requestJson(resolveUrl(baseURL, api), {
              method: 'POST',
              headers: wireHeaders,
              body: JSON.stringify(wireBody),
              signal: request.signal,
              credentials,
              timeoutMs,
              fetcher
            })
            const res = normalizeTranscriptionResult(await response.json())
            reportResponse(info, res)
            if (controller.signal.aborted) throw createAbortError()
            setTranscription(res.text)
            setResult(res)
            setStatus('ready')
            onFinishRef.current?.(res)
            return res
          } catch (rawError) {
            const nextError = normalizeError(rawError)
            if (nextError.name === 'AbortError' || controller.signal.aborted) {
              setStatus('ready')
              throw nextError
            }
            const context = createRetryContext(nextError, retryAttempt + 1, maxRetries)
            if (await canRetry(optionsRef.current, context)) {
              retryAttempt += 1
              recordInspectionStateRetryAttempt(inspectionRecords, nextError, context, {
                retryDelayMs: optionsRef.current.retryDelayMs,
                status
              })
              await waitForRetry(optionsRef.current, context, controller.signal)
              continue
            }
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
      api,
      baseURL,
      credentials,
      defaultRequest,
      fetcher,
      reportRequest,
      reportResponse,
      requestInfo,
      status,
      timeoutMs
    ]
  )

  const handleSubmit = useCallback(
    async (
      event?: { preventDefault?: () => void },
      requestOptions: Partial<TranscriptionRequest> = {}
    ) => {
      event?.preventDefault?.()
      const res = await transcribeAudio(inputRef.current, requestOptions)
      setInput('')
      return res
    },
    [setInput, transcribeAudio]
  )

  return {
    input,
    transcription,
    text: transcription,
    result,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    inspect,
    transcribe: transcribeAudio,
    transcribeAudio,
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
