import { ref, shallowRef, type Ref } from 'vue'
import type { ChatProvider } from '../providers/types'
import { proxyProvider, type ProxyProviderConfig } from '../providers/proxy'
import type { AiRequestStatus, EmbeddingRequest, EmbeddingResult, RetryOptions } from '../types'
import { cloneRequestSnapshot } from '../utils/lifecycle'
import {
  canRetry,
  createAbortError,
  createRetryContext,
  getMaxRetries,
  waitForRetry
} from '../utils/retry'
import { headersToRecord } from '../utils/headers'
import { mergeRequestBody } from '../utils/requestBody'
import { inspectRequestTrace, type RequestInspectionSnapshot } from '../utils/inspection'
import { createRequestTrace } from '../utils/trace'

export { cosineSimilarity } from '../utils/embedding'

/** Captures the normalized embedding request exposed to lifecycle callbacks and inspection. */
export interface EmbeddingRequestInfo {
  providerId: string
  attempt: number
  input: string | string[]
  request: EmbeddingRequest
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

/** Extends the request snapshot with the normalized embedding result. */
export interface EmbeddingResponseInfo extends EmbeddingRequestInfo {
  result: EmbeddingResult
}

/** Configures the embedding transport, request defaults, retries, and lifecycle callbacks. */
export interface UseEmbeddingOptions extends RetryOptions {
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
  onRequest?: (info: EmbeddingRequestInfo) => void
  onResponse?: (info: EmbeddingResponseInfo) => void
  onSuccess?: (result: EmbeddingResult) => void
  onError?: (err: Error) => void
}

/** Exposes the latest embedding vectors together with request controls and trace state. */
export interface UseEmbeddingReturn {
  embeddings: Ref<number[][]>
  input: Ref<string>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  result: Ref<EmbeddingResult | null>
  lastRequest: Ref<EmbeddingRequestInfo | null>
  lastResponse: Ref<EmbeddingResponseInfo | null>
  inspect: () => RequestInspectionSnapshot<EmbeddingRequestInfo, EmbeddingResponseInfo>
  embed: (input: string | string[], options?: Partial<EmbeddingRequest>) => Promise<EmbeddingResult>
  stop: () => void
  setInput: (value: string) => void
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<EmbeddingRequest>
  ) => Promise<EmbeddingResult>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

/**
 * Generates embeddings for one string or a batch of strings.
 *
 * The `embeddings` ref contains only the normalized vectors, while `result`
 * retains the complete provider response. `embed()` resolves with that result.
 *
 * ```ts
 * const { embed, embeddings, isLoading } = useEmbedding({
 *   provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
 * })
 * const { embeddings: vecs } = await embed('hello world')
 * ```
 */
export function useEmbedding(options: UseEmbeddingOptions = {}): UseEmbeddingReturn {
  const {
    initialInput = '',
    defaultRequest = {},
    onRequest,
    onResponse,
    onSuccess,
    onError
  } = options
  const provider =
    options.provider ??
    options.transport ??
    proxyProvider({
      ...options,
      embeddingUrl: options.api ?? '/api/embedding'
    })

  const embeddings = ref<number[][]>([])
  const input = ref(initialInput)
  const status = ref<AiRequestStatus>('ready')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const result = shallowRef<EmbeddingResult | null>(null)
  const trace = createRequestTrace<EmbeddingRequestInfo, EmbeddingResponseInfo>()
  const { lastRequest, lastResponse, clearTrace } = trace
  const abortController = shallowRef<AbortController | null>(null)

  function stop() {
    if (abortController.value) abortController.value.abort()
    abortController.value = null
    isLoading.value = false
    status.value = 'ready'
  }

  function clear() {
    stop()
    embeddings.value = []
    input.value = ''
    result.value = null
    error.value = null
    clearTrace()
  }

  function inspect(): RequestInspectionSnapshot<EmbeddingRequestInfo, EmbeddingResponseInfo> {
    return inspectRequestTrace({
      status: status.value,
      error: error.value,
      lastRequest: lastRequest.value,
      lastResponse: lastResponse.value,
      curl: true
    })
  }

  function clearError() {
    error.value = null
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

  function requestInfo(
    input: string | string[],
    request: EmbeddingRequest,
    attempt: number
  ): EmbeddingRequestInfo {
    return {
      providerId: provider.id,
      attempt,
      input: Array.isArray(input) ? [...input] : input,
      request: cloneRequestSnapshot(request),
      ...(request.body && { body: { ...request.body } }),
      ...(request.headers && { headers: headersToRecord(request.headers) })
    }
  }

  function reportRequest(info: EmbeddingRequestInfo) {
    trace.recordRequest(info)
    onRequest?.(info)
  }

  function reportResponse(info: EmbeddingRequestInfo, res: EmbeddingResult) {
    const response = trace.recordResponse({
      ...info,
      result: res
    })
    onResponse?.(response)
  }

  async function embed(input: string | string[], requestOptions: Partial<EmbeddingRequest> = {}) {
    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    status.value = 'submitted'

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        try {
          const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
          const request: EmbeddingRequest = {
            ...defaultRequest,
            ...requestOptions,
            ...(body && { body }),
            input,
            signal: controller.signal
          }
          const info = requestInfo(input, request, retryAttempt + 1)
          reportRequest(info)
          const res = await provider.embedding(request)
          reportResponse(info, res)
          if (controller.signal.aborted) {
            throw createAbortError()
          }
          embeddings.value = res.embeddings
          result.value = res
          status.value = 'ready'
          onSuccess && onSuccess(res)
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
          onError && onError(e)
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
    requestOptions: Partial<EmbeddingRequest> = {}
  ) {
    event?.preventDefault?.()
    const res = await embed(input.value, requestOptions)
    input.value = ''
    return res
  }

  return {
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
