import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { requestJson } from '../utils/fetch'
import { mergeHeaders } from '../utils/headers'
import { createId } from '../utils/id'
import { mergeRequestBody } from '../utils/requestBody'
import { cloneRequestSnapshot } from '../utils/lifecycle'
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
  GeneratedVideo,
  RetryOptions,
  VideoGenerationRequest,
  VideoGenerationResult
} from '../types'
import type {
  VideoGenerationRequestInfo,
  VideoGenerationResponseInfo
} from '../composables/useVideo'

export type ReactVideoGenerationRequestInfo = VideoGenerationRequestInfo
export type ReactVideoGenerationResponseInfo = VideoGenerationResponseInfo

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
type BodySource =
  | Record<string, unknown>
  | ((context: {
      request: VideoGenerationRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

export interface UseReactVideoOptions extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  defaultRequest?: Partial<VideoGenerationRequest>
  onRequest?: (info: ReactVideoGenerationRequestInfo) => void
  onResponse?: (info: ReactVideoGenerationResponseInfo) => void
  onFinish?: (result: VideoGenerationResult) => void
  onError?: (err: Error) => void
}

export interface UseReactVideoReturn {
  id: string
  input: string
  video: GeneratedVideo | null
  videos: GeneratedVideo[]
  result: VideoGenerationResult | null
  status: AiRequestStatus
  isLoading: boolean
  error: Error | null
  lastRequest: ReactVideoGenerationRequestInfo | null
  lastResponse: ReactVideoGenerationResponseInfo | null
  inspect: () => RequestInspectionSnapshot<
    ReactVideoGenerationRequestInfo,
    ReactVideoGenerationResponseInfo
  >
  generate: (
    prompt?: string,
    options?: Partial<VideoGenerationRequest>
  ) => Promise<VideoGenerationResult>
  generateVideo: (
    prompt?: string,
    options?: Partial<VideoGenerationRequest>
  ) => Promise<VideoGenerationResult>
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
    options?: Partial<VideoGenerationRequest>
  ) => Promise<VideoGenerationResult>
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

function isGeneratedVideo(value: unknown): value is GeneratedVideo {
  if (!isRecord(value)) return false
  return (
    typeof value.url === 'string' ||
    typeof value.base64 === 'string' ||
    typeof value.mediaType === 'string' ||
    typeof value.durationInSeconds === 'number'
  )
}

function normalizeVideoResult(raw: unknown): VideoGenerationResult {
  if (typeof raw === 'string') {
    return { video: { url: raw }, videos: [{ url: raw }] }
  }

  if (Array.isArray(raw)) {
    const generated = raw.filter(isGeneratedVideo)
    return { video: generated[0], videos: generated }
  }

  if (!isRecord(raw)) {
    return { videos: [] }
  }

  const videos = Array.isArray(raw.videos) ? raw.videos.filter(isGeneratedVideo) : []
  const video = isGeneratedVideo(raw.video) ? raw.video : videos[0]

  if (video && !videos.length) {
    videos.push(video)
  }

  if (!video && isGeneratedVideo(raw)) {
    videos.push(raw)
    return { video: raw, videos }
  }

  return {
    ...raw,
    ...(video ? { video } : {}),
    videos
  } as VideoGenerationResult
}

export function useVideo(options: UseReactVideoOptions = {}): UseReactVideoReturn {
  const {
    api = '/api/video',
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

  const [id] = useState(() => createId('video'))
  const [input, setInputState] = useState(initialInput)
  const [video, setVideoState] = useState<GeneratedVideo | null>(null)
  const [videos, setVideos] = useState<GeneratedVideo[]>([])
  const [result, setResultState] = useState<VideoGenerationResult | null>(null)
  const [status, setStatus] = useState<AiRequestStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactVideoGenerationRequestInfo | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactVideoGenerationResponseInfo | null>(null)
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

  const setVideo = useCallback((value: GeneratedVideo | null) => {
    setVideoState(value)
  }, [])

  const setVideosState = useCallback((next: GeneratedVideo[]) => {
    setVideos(next)
  }, [])

  const setResult = useCallback((next: VideoGenerationResult | null) => {
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
    setVideo(null)
    setVideosState([])
    setResult(null)
    setError(null)
    clearTrace()
    setStatus('ready')
  }, [clearTrace, setInput, setResult, setVideo, setVideosState, stop])

  useEffect(() => () => stop(), [stop])

  const requestInfo = useCallback(
    (
      request: VideoGenerationRequest,
      body: Record<string, unknown>,
      headers: Record<string, string>,
      attempt: number
    ): ReactVideoGenerationRequestInfo => ({
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      prompt: request.prompt,
      request: cloneRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }),
    [api, credentials]
  )

  const reportRequest = useCallback(
    (info: ReactVideoGenerationRequestInfo) => {
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
    (info: ReactVideoGenerationRequestInfo, response: VideoGenerationResult) => {
      const next = { ...info, result: response }
      setLastResponse(next)
      recordInspectionEvent({
        kind: 'response',
        label: 'response received',
        attempt: info.attempt,
        status,
        metadata: { hasVideos: response.videos.length }
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
    async (request: VideoGenerationRequest) => {
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

  const postVideo = useCallback(
    async (request: VideoGenerationRequest, attempt: number) => {
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
      const responseResult = normalizeVideoResult(await response.json())
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
      resolveHeaders,
      resolveWireBody,
      timeoutMs
    ]
  )

  const generateVideo = useCallback(
    async (prompt?: string, requestOptions: Partial<VideoGenerationRequest> = {}) => {
      const finalPrompt = prompt ?? inputRef.current
      if (!finalPrompt) {
        throw new Error('generateVideo() requires a prompt (either as argument or via input)')
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setVideo(null)
      setVideosState([])
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
            const request: VideoGenerationRequest = {
              ...defaultRequest,
              ...requestOptions,
              ...(body ? { body } : {}),
              ...(headers ? { headers } : {}),
              prompt: finalPrompt,
              signal: controller.signal
            }

            const responseInfo = await postVideo(request, retryAttempt + 1)

            if (controller.signal.aborted) {
              throw createAbortError()
            }

            setVideo(responseInfo.result.video ?? responseInfo.result.videos[0] ?? null)
            setVideosState([...responseInfo.result.videos])
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
    [defaultRequest, postVideo, recordInspectionEvent, setResult, setVideo, setVideosState]
  )

  const generate = useCallback(
    (prompt?: string, requestOptions: Partial<VideoGenerationRequest> = {}) => {
      return generateVideo(prompt, requestOptions)
    },
    [generateVideo]
  )

  const handleSubmit = useCallback(
    async (
      event?: { preventDefault?: () => void },
      requestOptions: Partial<VideoGenerationRequest> = {}
    ) => {
      event?.preventDefault?.()
      const result = await generateVideo(inputRef.current, requestOptions)
      setInput('')
      return result
    },
    [generateVideo, setInput]
  )

  return {
    id,
    input,
    video,
    videos,
    result,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    inspect,
    generate,
    generateVideo,
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
