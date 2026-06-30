import { ref, shallowRef, type Ref } from 'vue'
import type {
  AiRequestStatus,
  GeneratedVideo,
  RetryOptions,
  VideoGenerationRequest,
  VideoGenerationResult
} from '../types'
import {
  canRetry,
  createAbortError,
  createRetryContext,
  getMaxRetries,
  waitForRetry
} from '../utils/retry'
import { requestJson } from '../utils/fetch'
import { mergeHeaders } from '../utils/headers'
import { mergeRequestBody } from '../utils/requestBody'
import { cloneRequestSnapshot } from '../utils/lifecycle'
import { createRequestTrace } from '../utils/trace'

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
type BodySource =
  | Record<string, unknown>
  | ((context: {
      request: VideoGenerationRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

export interface VideoGenerationRequestInfo {
  providerId: 'proxy'
  attempt: number
  api: string
  credentials?: RequestCredentials
  prompt: string
  request: VideoGenerationRequest
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface VideoGenerationResponseInfo extends VideoGenerationRequestInfo {
  result: VideoGenerationResult
}

export interface UseVideoOptions extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  defaultRequest?: Partial<VideoGenerationRequest>
  onRequest?: (info: VideoGenerationRequestInfo) => void
  onResponse?: (info: VideoGenerationResponseInfo) => void
  onFinish?: (result: VideoGenerationResult) => void
  onError?: (err: Error) => void
}

export interface UseVideoReturn {
  input: Ref<string>
  video: Ref<GeneratedVideo | null>
  videos: Ref<GeneratedVideo[]>
  result: Ref<VideoGenerationResult | null>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<VideoGenerationRequestInfo | null>
  lastResponse: Ref<VideoGenerationResponseInfo | null>
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
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<VideoGenerationRequest>
  ) => Promise<VideoGenerationResult>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

/**
 * Vue 3 composable for video generation through an app-owned backend.
 */
export function useVideo(options: UseVideoOptions = {}): UseVideoReturn {
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

  const input = ref(initialInput)
  const video = shallowRef<GeneratedVideo | null>(null)
  const videos = shallowRef<GeneratedVideo[]>([])
  const result = shallowRef<VideoGenerationResult | null>(null)
  const status = ref<AiRequestStatus>('ready')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const { lastRequest, lastResponse, clearTrace, recordRequest, recordResponse } =
    createRequestTrace<VideoGenerationRequestInfo, VideoGenerationResponseInfo>()
  const abortController = shallowRef<AbortController | null>(null)

  function stop() {
    abortController.value?.abort()
    abortController.value = null
    isLoading.value = false
    status.value = 'ready'
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

  function clearError() {
    error.value = null
    status.value = 'ready'
  }

  function clear() {
    stop()
    input.value = ''
    video.value = null
    videos.value = []
    result.value = null
    error.value = null
    clearTrace()
    status.value = 'ready'
  }

  async function resolveHeaders(requestHeaders?: HeadersInit) {
    const configured =
      typeof options.headers === 'function' ? await options.headers() : (options.headers ?? {})
    return mergeHeaders({ 'Content-Type': 'application/json' }, configured, requestHeaders)
  }

  async function resolveWireBody(request: VideoGenerationRequest) {
    const configured =
      typeof options.body === 'function' ? await options.body({ request }) : (options.body ?? {})
    const { signal: _signal, headers: _headers, body: requestBody, ...typedBody } = request
    return {
      ...configured,
      ...(requestBody ?? {}),
      ...typedBody
    }
  }

  function requestInfo(
    request: VideoGenerationRequest,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    attempt: number
  ): VideoGenerationRequestInfo {
    return {
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      prompt: request.prompt,
      request: cloneRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }
  }

  function reportRequest(info: VideoGenerationRequestInfo) {
    recordRequest(info)
    onRequest?.(info)
  }

  function reportResponse(info: VideoGenerationRequestInfo, res: VideoGenerationResult) {
    const response = recordResponse({ ...info, result: res })
    onResponse?.(response)
  }

  async function postVideo(request: VideoGenerationRequest, attempt: number) {
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
    const res = normalizeVideoResult(await response.json())
    reportResponse(info, res)
    return res
  }

  async function generateVideo(
    prompt?: string,
    requestOptions: Partial<VideoGenerationRequest> = {}
  ) {
    const finalPrompt = prompt ?? input.value
    if (!finalPrompt) {
      throw new Error('generateVideo() requires a prompt (either as argument or via input.value)')
    }

    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    video.value = null
    videos.value = []
    result.value = null
    status.value = 'submitted'

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        try {
          const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
          const request: VideoGenerationRequest = {
            ...defaultRequest,
            ...requestOptions,
            ...(body ? { body } : {}),
            prompt: finalPrompt,
            signal: controller.signal
          }
          const res = await postVideo(request, retryAttempt + 1)
          if (controller.signal.aborted) {
            throw createAbortError()
          }
          video.value = res.video ?? res.videos[0] ?? null
          videos.value = [...res.videos]
          result.value = res
          status.value = 'ready'
          onFinish?.(res)
          return res
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err))
          if ((e as { name?: string }).name === 'AbortError' || controller.signal.aborted) {
            status.value = 'ready'
            throw e
          }
          const context = createRetryContext(e, retryAttempt + 1, maxRetries)
          if (await canRetry(options, context)) {
            retryAttempt += 1
            await waitForRetry(options, context, controller.signal)
            continue
          }
          status.value = 'error'
          error.value = e
          onError?.(e)
          throw e
        }
      }
    } finally {
      abortController.value = null
      isLoading.value = false
    }
  }

  async function handleSubmit(
    event?: { preventDefault?: () => void },
    requestOptions: Partial<VideoGenerationRequest> = {}
  ) {
    event?.preventDefault?.()
    const res = await generateVideo(input.value, requestOptions)
    input.value = ''
    return res
  }

  return {
    input,
    video,
    videos,
    result,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    generate: generateVideo,
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

function resolveUrl(baseURL: string, url: string) {
  if (/^https?:\/\//.test(url) || !baseURL) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
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
