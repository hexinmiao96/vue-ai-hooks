import { ref, shallowRef, type Ref } from 'vue'
import type {
  AiRequestStatus,
  GeneratedAudio,
  RetryOptions,
  SpeechGenerationRequest,
  SpeechGenerationResult
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
import {
  clearInspectionRecords,
  inspectRequestTrace,
  recordInspectionRetryAttempt,
  type InspectionRetryRecordInput,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'
import { createRequestTrace } from '../utils/trace'

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
type BodySource =
  | Record<string, unknown>
  | ((context: {
      request: SpeechGenerationRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

/** Captures the normalized proxy request exposed to lifecycle callbacks and inspection. */
export interface SpeechGenerationRequestInfo {
  providerId: 'proxy'
  attempt: number
  api: string
  credentials?: RequestCredentials
  text: string
  request: SpeechGenerationRequest
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

/** Extends the request snapshot with the normalized speech result. */
export interface SpeechGenerationResponseInfo extends SpeechGenerationRequestInfo {
  result: SpeechGenerationResult
}

/** Configures the speech proxy endpoint, request defaults, retries, and lifecycle callbacks. */
export interface UseSpeechOptions extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  defaultRequest?: Partial<SpeechGenerationRequest>
  onRequest?: (info: SpeechGenerationRequestInfo) => void
  onResponse?: (info: SpeechGenerationResponseInfo) => void
  onFinish?: (result: SpeechGenerationResult) => void
  onError?: (err: Error) => void
}

/** Exposes the latest normalized audio result together with request controls and trace state. */
export interface UseSpeechReturn {
  input: Ref<string>
  audio: Ref<GeneratedAudio | null>
  result: Ref<SpeechGenerationResult | null>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<SpeechGenerationRequestInfo | null>
  lastResponse: Ref<SpeechGenerationResponseInfo | null>
  inspect: () => RequestInspectionSnapshot<
    SpeechGenerationRequestInfo,
    SpeechGenerationResponseInfo
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
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<SpeechGenerationRequest>
  ) => Promise<SpeechGenerationResult>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

/**
 * Generates speech through an app-owned JSON endpoint.
 *
 * `generate`, `generateSpeech`, and `speak` are aliases that resolve with the
 * complete normalized result; `audio` contains its primary audio output.
 */
export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
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

  const input = ref(initialInput)
  const audio = shallowRef<GeneratedAudio | null>(null)
  const result = shallowRef<SpeechGenerationResult | null>(null)
  const status = ref<AiRequestStatus>('ready')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const inspectionEvents = ref<InspectionTimelineEventInput[]>([])
  const inspectionRetries = ref<InspectionRetryRecordInput[]>([])
  const inspectionRecords = { events: inspectionEvents, retries: inspectionRetries }
  const {
    lastRequest,
    lastResponse,
    clearTrace: clearRequestTrace,
    recordRequest,
    recordResponse
  } = createRequestTrace<SpeechGenerationRequestInfo, SpeechGenerationResponseInfo>()
  const abortController = shallowRef<AbortController | null>(null)

  function clearTrace() {
    clearRequestTrace()
    clearInspectionRecords(inspectionRecords)
  }

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
    audio.value = null
    result.value = null
    error.value = null
    clearTrace()
    status.value = 'ready'
  }

  function inspect(): RequestInspectionSnapshot<
    SpeechGenerationRequestInfo,
    SpeechGenerationResponseInfo
  > {
    return inspectRequestTrace({
      status: status.value,
      error: error.value,
      lastRequest: lastRequest.value,
      lastResponse: lastResponse.value,
      events: inspectionEvents.value,
      retries: inspectionRetries.value,
      curl: true
    })
  }

  async function resolveHeaders(requestHeaders?: HeadersInit) {
    const configured =
      typeof options.headers === 'function' ? await options.headers() : (options.headers ?? {})
    return mergeHeaders({ 'Content-Type': 'application/json' }, configured, requestHeaders)
  }

  async function resolveWireBody(request: SpeechGenerationRequest) {
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
    request: SpeechGenerationRequest,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    attempt: number
  ): SpeechGenerationRequestInfo {
    return {
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      text: request.text,
      request: cloneRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }
  }

  function reportRequest(info: SpeechGenerationRequestInfo) {
    recordRequest(info)
    onRequest?.(info)
  }

  function reportResponse(info: SpeechGenerationRequestInfo, res: SpeechGenerationResult) {
    const response = recordResponse({ ...info, result: res })
    onResponse?.(response)
  }

  async function postSpeech(request: SpeechGenerationRequest, attempt: number) {
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
    const res = normalizeSpeechResult(await response.json())
    reportResponse(info, res)
    return res
  }

  async function generateSpeech(
    text?: string,
    requestOptions: Partial<SpeechGenerationRequest> = {}
  ) {
    const finalText = text ?? input.value
    if (!finalText) {
      throw new Error('generateSpeech() requires text (either as argument or via input.value)')
    }

    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    audio.value = null
    result.value = null
    status.value = 'submitted'
    clearInspectionRecords(inspectionRecords)

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        try {
          const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
          const request: SpeechGenerationRequest = {
            ...defaultRequest,
            ...requestOptions,
            ...(body ? { body } : {}),
            text: finalText,
            signal: controller.signal
          }
          const res = await postSpeech(request, retryAttempt + 1)
          if (controller.signal.aborted) {
            throw createAbortError()
          }
          audio.value = res.audio ?? null
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
            recordInspectionRetryAttempt(inspectionRecords, e, context, {
              retryDelayMs: options.retryDelayMs,
              status: status.value
            })
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
    requestOptions: Partial<SpeechGenerationRequest> = {}
  ) {
    event?.preventDefault?.()
    const res = await generateSpeech(input.value, requestOptions)
    input.value = ''
    return res
  }

  return {
    input,
    audio,
    result,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    inspect,
    generate: generateSpeech,
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

function resolveUrl(baseURL: string, url: string) {
  if (/^https?:\/\//.test(url) || !baseURL) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
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
