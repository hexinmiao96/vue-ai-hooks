import { ref, shallowRef, type Ref } from 'vue'
import type { ChatProvider } from '../providers/types'
import type { AiRequestStatus, EmbeddingRequest, EmbeddingResult, RetryOptions } from '../types'
import { cloneRequestSnapshot } from '../utils/lifecycle'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import { mergeRequestBody } from '../utils/requestBody'

export interface EmbeddingRequestInfo {
  providerId: string
  attempt: number
  input: string | string[]
  request: EmbeddingRequest
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface EmbeddingResponseInfo extends EmbeddingRequestInfo {
  result: EmbeddingResult
}

export interface UseEmbeddingOptions extends RetryOptions {
  provider: ChatProvider
  defaultRequest?: Partial<EmbeddingRequest>
  onRequest?: (info: EmbeddingRequestInfo) => void
  onResponse?: (info: EmbeddingResponseInfo) => void
  onSuccess?: (result: EmbeddingResult) => void
  onError?: (err: Error) => void
}

export interface UseEmbeddingReturn {
  embeddings: Ref<number[][]>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  result: Ref<EmbeddingResult | null>
  embed: (input: string | string[], options?: Partial<EmbeddingRequest>) => Promise<EmbeddingResult>
  stop: () => void
  clearError: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

/**
 * Vue 3 composable for generating text embeddings.
 *
 * ```ts
 * const { embed, embeddings, isLoading } = useEmbedding({
 *   provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
 * })
 * const { embeddings: vecs } = await embed('hello world')
 * ```
 */
export function useEmbedding(options: UseEmbeddingOptions): UseEmbeddingReturn {
  const { provider, defaultRequest = {}, onRequest, onResponse, onSuccess, onError } = options

  const embeddings = ref<number[][]>([])
  const status = ref<AiRequestStatus>('ready')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const result = shallowRef<EmbeddingResult | null>(null)
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
    result.value = null
    error.value = null
    status.value = 'ready'
  }

  function clearError() {
    error.value = null
    status.value = 'ready'
  }

  function createAbortError(): Error {
    const e = new Error('Embedding request aborted')
    e.name = 'AbortError'
    return e
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
      ...(request.body ? { body: { ...request.body } } : {}),
      ...(request.headers ? { headers: { ...request.headers } } : {})
    }
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
            ...(body ? { body } : {}),
            input,
            signal: controller.signal
          }
          const info = requestInfo(input, request, retryAttempt + 1)
          onRequest?.(info)
          const res = await provider.embedding(request)
          onResponse?.({
            ...info,
            result: res
          })
          if (controller.signal.aborted) {
            throw createAbortError()
          }
          embeddings.value = res.embeddings
          result.value = res
          status.value = 'ready'
          onSuccess?.(res)
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

  return {
    embeddings,
    status,
    isLoading,
    error,
    result,
    embed,
    stop,
    clearError,
    clear,
    abortController
  }
}
