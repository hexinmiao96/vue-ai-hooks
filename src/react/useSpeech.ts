import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { requestJson } from '../utils/fetch'
import { mergeHeaders } from '../utils/headers'
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
  recordInspectionStateEvent,
  recordInspectionStateRetryAttempt,
  type InspectionRetryRecordInput,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'
import type {
  AiRequestStatus,
  GeneratedAudio,
  RetryOptions,
  SpeechGenerationRequest,
  SpeechGenerationResult
} from '../types'
import type {
  SpeechGenerationRequestInfo,
  SpeechGenerationResponseInfo
} from '../composables/useSpeech'

/** Request inspection metadata emitted by the React speech hook. */
export type ReactSpeechGenerationRequestInfo = SpeechGenerationRequestInfo

/** Response inspection metadata emitted by the React speech hook. */
export type ReactSpeechGenerationResponseInfo = SpeechGenerationResponseInfo

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
type BodySource =
  | Record<string, unknown>
  | ((context: {
      request: SpeechGenerationRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

/** Configures the speech endpoint, initial text, retries, and lifecycle callbacks. */
export interface UseReactSpeechOptions extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  defaultRequest?: Partial<SpeechGenerationRequest>
  onRequest?: (info: ReactSpeechGenerationRequestInfo) => void
  onResponse?: (info: ReactSpeechGenerationResponseInfo) => void
  onFinish?: (result: SpeechGenerationResult) => void
  onError?: (err: Error) => void
}

/** Exposes generated audio, request state, form bindings, controls, and inspection data. */
export interface UseReactSpeechReturn {
  id: string
  input: string
  audio: GeneratedAudio | null
  result: SpeechGenerationResult | null
  status: AiRequestStatus
  isLoading: boolean
  error: Error | null
  lastRequest: ReactSpeechGenerationRequestInfo | null
  lastResponse: ReactSpeechGenerationResponseInfo | null
  inspect: () => RequestInspectionSnapshot<
    ReactSpeechGenerationRequestInfo,
    ReactSpeechGenerationResponseInfo
  >
  generate: (
    text?: string,
    options?: Partial<SpeechGenerationRequest>
  ) => Promise<SpeechGenerationResult>
  generateSpeech: (
    text?: string,
    options?: Partial<SpeechGenerationRequest>
  ) => Promise<SpeechGenerationResult>
  speak: (
    text?: string,
    options?: Partial<SpeechGenerationRequest>
  ) => Promise<SpeechGenerationResult>
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
    options?: Partial<SpeechGenerationRequest>
  ) => Promise<SpeechGenerationResult>
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

function isGeneratedAudio(value: unknown): value is GeneratedAudio {
  if (!isRecord(value)) return false
  return (
    typeof value.url === 'string' ||
    typeof value.base64 === 'string' ||
    typeof value.mediaType === 'string' ||
    typeof value.revisedText === 'string'
  )
}

function normalizeSpeechResult(raw: unknown): SpeechGenerationResult {
  if (typeof raw === 'string') {
    return { audio: { url: raw } }
  }

  if (!isRecord(raw)) {
    return {}
  }

  const audio = isGeneratedAudio(raw.audio) ? raw.audio : isGeneratedAudio(raw) ? raw : undefined

  return {
    ...raw,
    ...(audio ? { audio } : {})
  } as SpeechGenerationResult
}

/**
 * Generates speech through an app-owned endpoint and exposes the audio as React state.
 *
 * String and object response variants are normalized into one generated-audio representation.
 *
 * @returns Speech state, form helpers, generation controls, and request inspection data.
 */
export function useSpeech(options: UseReactSpeechOptions = {}): UseReactSpeechReturn {
  const {
    api = '/api/speech',
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

  const [id] = useState(() => createId('speech'))
  const [input, setInputState] = useState(initialInput)
  const [audio, setAudioState] = useState<GeneratedAudio | null>(null)
  const [result, setResultState] = useState<SpeechGenerationResult | null>(null)
  const [status, setStatus] = useState<AiRequestStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactSpeechGenerationRequestInfo | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactSpeechGenerationResponseInfo | null>(null)
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

  const setAudio = useCallback((value: GeneratedAudio | null) => {
    setAudioState(value)
  }, [])

  const setResult = useCallback((next: SpeechGenerationResult | null) => {
    setResultState(next)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setStatus('ready')
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
    setAudio(null)
    setResult(null)
    setError(null)
    clearTrace()
    setStatus('ready')
  }, [clearTrace, setAudio, setInput, setResult, stop])

  useEffect(() => () => stop(), [stop])

  const requestInfo = useCallback(
    (
      request: SpeechGenerationRequest,
      body: Record<string, unknown>,
      headers: Record<string, string>,
      attempt: number
    ): ReactSpeechGenerationRequestInfo => ({
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      text: request.text,
      request: cloneRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }),
    [api, credentials]
  )

  const reportRequest = useCallback(
    (info: ReactSpeechGenerationRequestInfo) => {
      setLastRequest(info)
      setLastResponse(null)
      recordInspectionEvent({
        kind: 'request',
        label: 'request prepared',
        attempt: info.attempt,
        status,
        metadata: {
          hasBody: Boolean(Object.keys(info.body ?? {}).length)
        }
      })
      onRequestRef.current?.(info)
    },
    [recordInspectionEvent, status]
  )

  const reportResponse = useCallback(
    (info: ReactSpeechGenerationRequestInfo, response: SpeechGenerationResult) => {
      const next = { ...info, result: response }
      setLastResponse(next)
      recordInspectionEvent({
        kind: 'response',
        label: 'response received',
        attempt: info.attempt,
        status,
        metadata: { hasAudio: Boolean(response.audio) }
      })
      onResponseRef.current?.(next)
      return next
    },
    [recordInspectionEvent, status]
  )

  const resolveHeaders = useCallback(
    async (requestHeaders?: HeadersInit) => {
      const configured =
        typeof options.headers === 'function' ? await options.headers() : (options.headers ?? {})
      return mergeHeaders({ 'Content-Type': 'application/json' }, configured, requestHeaders)
    },
    [options]
  )

  const resolveWireBody = useCallback(
    async (request: SpeechGenerationRequest) => {
      const configured =
        typeof options.body === 'function' ? await options.body({ request }) : (options.body ?? {})
      const { signal: _signal, headers: _headers, body: requestBody, ...typedBody } = request
      return {
        ...configured,
        ...(requestBody ?? {}),
        ...typedBody
      }
    },
    [options]
  )

  const postSpeech = useCallback(
    async (request: SpeechGenerationRequest, attempt: number) => {
      const headers = await resolveHeaders(request.headers)
      const body = await resolveWireBody(request)
      const info = requestInfo(request, body, headers, attempt)
      reportRequest(info)

      const response = await requestJson(resolveUrl(baseURL, api), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: request.signal,
        credentials,
        timeoutMs,
        fetcher
      })
      const responseResult = normalizeSpeechResult(await response.json())
      const responseInfo = reportResponse(info, responseResult)
      return responseInfo
    },
    [
      api,
      baseURL,
      credentials,
      fetcher,
      reportRequest,
      reportResponse,
      requestInfo,
      resolveHeaders,
      resolveWireBody,
      timeoutMs
    ]
  )

  const generateSpeech = useCallback(
    async (text?: string, requestOptions: Partial<SpeechGenerationRequest> = {}) => {
      const finalText = text ?? inputRef.current
      if (!finalText) {
        throw new Error('generateSpeech() requires text (either as argument or via input)')
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setAudio(null)
      setResult(null)
      setStatus('submitted')
      clearInspectionState(inspectionRecords)

      try {
        let retryAttempt = 0
        const maxRetries = getMaxRetries(optionsRef.current)

        while (true) {
          try {
            const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
            const headers = mergeRequestHeaders(
              defaultRequest.headers as HeadersInit | undefined,
              requestOptions.headers
            )
            const request: SpeechGenerationRequest = {
              ...defaultRequest,
              ...requestOptions,
              ...(body ? { body } : {}),
              ...(headers ? { headers } : {}),
              text: finalText,
              signal: controller.signal
            }

            const responseInfo = await postSpeech(request, retryAttempt + 1)

            if (controller.signal.aborted) {
              throw createAbortError()
            }

            setAudio(responseInfo.result.audio ?? null)
            setResult(responseInfo.result)
            setStatus('ready')
            onFinishRef.current?.(responseInfo.result)
            return responseInfo.result
          } catch (err) {
            const nextError = normalizeError(err)

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
    [defaultRequest, postSpeech, setAudio, setResult]
  )

  const generate = useCallback(
    (text?: string, requestOptions: Partial<SpeechGenerationRequest> = {}) => {
      return generateSpeech(text, requestOptions)
    },
    [generateSpeech]
  )

  const handleSubmit = useCallback(
    async (
      event?: { preventDefault?: () => void },
      requestOptions: Partial<SpeechGenerationRequest> = {}
    ) => {
      event?.preventDefault?.()
      const result = await generateSpeech(inputRef.current, requestOptions)
      setInput('')
      return result
    },
    [generateSpeech, setInput]
  )

  return {
    id,
    input,
    audio,
    result,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    inspect,
    generate,
    generateSpeech,
    speak: generateSpeech,
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
