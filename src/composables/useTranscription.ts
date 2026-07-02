import { ref, shallowRef, type Ref } from 'vue'
import type {
  AiRequestStatus,
  RetryOptions,
  TranscriptionRequest,
  TranscriptionResult
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
import { inspectRequestTrace, type RequestInspectionSnapshot } from '../utils/inspection'
import { createRequestTrace } from '../utils/trace'

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
type BodySource =
  | Record<string, unknown>
  | ((context: {
      request: TranscriptionRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

export interface TranscriptionRequestInfo {
  providerId: 'proxy'
  attempt: number
  api: string
  credentials?: RequestCredentials
  audio: string
  request: TranscriptionRequest
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface TranscriptionResponseInfo extends TranscriptionRequestInfo {
  result: TranscriptionResult
}

export interface UseTranscriptionOptions extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  defaultRequest?: Partial<TranscriptionRequest>
  onRequest?: (info: TranscriptionRequestInfo) => void
  onResponse?: (info: TranscriptionResponseInfo) => void
  onFinish?: (result: TranscriptionResult) => void
  onError?: (err: Error) => void
}

export interface UseTranscriptionReturn {
  input: Ref<string>
  transcription: Ref<string>
  text: Ref<string>
  result: Ref<TranscriptionResult | null>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<TranscriptionRequestInfo | null>
  lastResponse: Ref<TranscriptionResponseInfo | null>
  inspect: () => RequestInspectionSnapshot<TranscriptionRequestInfo, TranscriptionResponseInfo>
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
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<TranscriptionRequest>
  ) => Promise<TranscriptionResult>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

/**
 * Vue 3 composable for audio transcription through an app-owned backend.
 */
export function useTranscription(options: UseTranscriptionOptions = {}): UseTranscriptionReturn {
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

  const input = ref(initialInput)
  const transcription = ref('')
  const result = shallowRef<TranscriptionResult | null>(null)
  const status = ref<AiRequestStatus>('ready')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const { lastRequest, lastResponse, clearTrace, recordRequest, recordResponse } =
    createRequestTrace<TranscriptionRequestInfo, TranscriptionResponseInfo>()
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
    transcription.value = ''
    result.value = null
    error.value = null
    clearTrace()
    status.value = 'ready'
  }

  function inspect(): RequestInspectionSnapshot<
    TranscriptionRequestInfo,
    TranscriptionResponseInfo
  > {
    return inspectRequestTrace({
      status: status.value,
      error: error.value,
      lastRequest: lastRequest.value,
      lastResponse: lastResponse.value,
      curl: true
    })
  }

  async function resolveHeaders(requestHeaders?: HeadersInit) {
    const configured =
      typeof options.headers === 'function' ? await options.headers() : (options.headers ?? {})
    return mergeHeaders({ 'Content-Type': 'application/json' }, configured, requestHeaders)
  }

  async function resolveWireBody(request: TranscriptionRequest) {
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
    request: TranscriptionRequest,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    attempt: number
  ): TranscriptionRequestInfo {
    return {
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      audio: request.audio,
      request: cloneRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }
  }

  function reportRequest(info: TranscriptionRequestInfo) {
    recordRequest(info)
    onRequest?.(info)
  }

  function reportResponse(info: TranscriptionRequestInfo, res: TranscriptionResult) {
    const response = recordResponse({ ...info, result: res })
    onResponse?.(response)
  }

  async function postTranscription(request: TranscriptionRequest, attempt: number) {
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
    const res = normalizeTranscriptionResult(await response.json())
    reportResponse(info, res)
    return res
  }

  async function transcribeAudio(
    audio?: string,
    requestOptions: Partial<TranscriptionRequest> = {}
  ) {
    const finalAudio = audio ?? input.value
    if (!finalAudio) {
      throw new Error('transcribeAudio() requires audio (either as argument or via input.value)')
    }

    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    transcription.value = ''
    result.value = null
    status.value = 'submitted'

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        try {
          const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
          const request: TranscriptionRequest = {
            ...defaultRequest,
            ...requestOptions,
            ...(body ? { body } : {}),
            audio: finalAudio,
            signal: controller.signal
          }
          const res = await postTranscription(request, retryAttempt + 1)
          if (controller.signal.aborted) {
            throw createAbortError()
          }
          transcription.value = res.text
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
    requestOptions: Partial<TranscriptionRequest> = {}
  ) {
    event?.preventDefault?.()
    const res = await transcribeAudio(input.value, requestOptions)
    input.value = ''
    return res
  }

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

function resolveUrl(baseURL: string, url: string) {
  if (/^https?:\/\//.test(url) || !baseURL) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

function normalizeTranscriptionResult(raw: unknown): TranscriptionResult {
  if (typeof raw === 'string') {
    return { text: raw }
  }

  if (!isRecord(raw)) {
    return { text: '' }
  }

  const text =
    typeof raw.text === 'string'
      ? raw.text
      : typeof raw.transcription === 'string'
        ? raw.transcription
        : ''

  return {
    ...raw,
    text
  } as TranscriptionResult
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
