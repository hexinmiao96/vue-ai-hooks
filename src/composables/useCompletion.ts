import { ref, shallowRef, type Ref } from 'vue'
import type { ChatProvider } from '../providers/types'
import type {
  AiRequestStatus,
  CompletionRequest,
  IdGenerator,
  RetryOptions,
  StreamThrottleOptions
} from '../types'
import { createId } from '../utils/id'
import { cloneRequestSnapshot } from '../utils/lifecycle'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import { mergeRequestBody } from '../utils/requestBody'
import { createStreamUpdateThrottler, getThrottleMs } from '../utils/throttle'

export interface CompletionFinishInfo {
  prompt: string
  completion: string
  isAbort: boolean
}

export interface CompletionRequestInfo {
  id: string
  providerId: string
  attempt: number
  prompt: string
  request: CompletionRequest
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface CompletionResponseInfo extends CompletionRequestInfo {
  hasStream: boolean
}

export interface UseCompletionOptions extends RetryOptions, StreamThrottleOptions {
  provider: ChatProvider
  id?: string
  generateId?: IdGenerator
  initialInput?: string
  initialCompletion?: string
  defaultRequest?: Partial<CompletionRequest>
  onUpdate?: (completion: string, delta: string) => void
  onRequest?: (info: CompletionRequestInfo) => void
  onResponse?: (info: CompletionResponseInfo) => void
  onFinish?: (completion: string, info: CompletionFinishInfo) => void
  onError?: (err: Error) => void
}

export interface UseCompletionReturn {
  id: Ref<string>
  completion: Ref<string>
  input: Ref<string>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  complete: (prompt?: string, options?: Partial<CompletionRequest>) => Promise<string>
  stop: () => void
  setInput: (value: string) => void
  setCompletion: (value: string) => void
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<CompletionRequest>
  ) => Promise<string>
  clearError: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

interface CompletionState {
  completion: Ref<string>
  input: Ref<string>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  abortController: Ref<AbortController | null>
}

const completionStates = new Map<string, CompletionState>()

function getCompletionState(
  id: string,
  initialInput: string,
  initialCompletion: string
): CompletionState {
  const existing = completionStates.get(id)
  if (existing) return existing

  const state = {
    completion: ref(initialCompletion),
    input: ref(initialInput),
    status: ref<AiRequestStatus>('ready'),
    isLoading: ref(false),
    error: ref<Error | null>(null),
    abortController: shallowRef<AbortController | null>(null)
  }
  completionStates.set(id, state)
  return state
}

/**
 * Vue 3 composable for single-shot streaming completions.
 *
 * ```ts
 * const { completion, input, complete } = useCompletion({
 *   provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
 * })
 * ```
 */
export function useCompletion(options: UseCompletionOptions): UseCompletionReturn {
  const {
    provider,
    id: explicitId,
    generateId = createId,
    initialInput = '',
    initialCompletion = '',
    defaultRequest = {},
    onUpdate,
    onRequest,
    onResponse,
    onFinish,
    onError
  } = options

  const id = ref(explicitId || generateId('completion'))
  const { completion, input, status, isLoading, error, abortController } = getCompletionState(
    id.value,
    initialInput,
    initialCompletion
  )

  function stop() {
    if (abortController.value) abortController.value.abort()
    abortController.value = null
    isLoading.value = false
    status.value = 'ready'
  }

  function setCompletion(value: string) {
    completion.value = value
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

  function clear() {
    stop()
    completion.value = ''
    input.value = ''
    error.value = null
  }

  function clearError() {
    error.value = null
    status.value = 'ready'
  }

  function finishCompletion(prompt: string, isAbort: boolean) {
    if (!onFinish) return
    onFinish(completion.value, { prompt, completion: completion.value, isAbort })
  }

  function requestInfo(
    prompt: string,
    request: CompletionRequest,
    attempt: number
  ): CompletionRequestInfo {
    return {
      id: id.value,
      providerId: provider.id,
      attempt,
      prompt,
      request: cloneRequestSnapshot(request),
      ...(request.body ? { body: { ...request.body } } : {}),
      ...(request.headers ? { headers: { ...request.headers } } : {})
    }
  }

  async function complete(prompt?: string, requestOptions: Partial<CompletionRequest> = {}) {
    const finalPrompt = prompt ?? input.value
    if (!finalPrompt) {
      throw new Error('complete() requires a prompt (either as argument or via input.value)')
    }

    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    completion.value = ''
    status.value = 'submitted'

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        let receivedDelta = false
        let nextCompletion = ''
        let pendingDelta = ''
        const throttler = createStreamUpdateThrottler(getThrottleMs(options), () => {
          completion.value = nextCompletion
          if (pendingDelta) {
            onUpdate?.(nextCompletion, pendingDelta)
            pendingDelta = ''
          }
        })
        try {
          const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
          const request: CompletionRequest = {
            ...defaultRequest,
            ...requestOptions,
            ...(body ? { body } : {}),
            prompt: finalPrompt,
            signal: controller.signal,
            stream: true
          }
          const info = requestInfo(finalPrompt, request, retryAttempt + 1)
          onRequest?.(info)
          const stream = await provider.completion(request)
          onResponse?.({
            ...info,
            hasStream: Boolean(stream)
          })
          for await (const delta of stream) {
            if (controller.signal.aborted) break
            if (status.value === 'submitted') status.value = 'streaming'
            receivedDelta = true
            nextCompletion += delta
            if (delta) {
              pendingDelta += delta
              throttler.schedule()
            }
          }
          throttler.flush()
          status.value = 'ready'
          finishCompletion(finalPrompt, controller.signal.aborted)
          return completion.value
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err))
          if ((e as { name?: string }).name === 'AbortError' || controller.signal.aborted) {
            throttler.flush()
            status.value = 'ready'
            finishCompletion(finalPrompt, true)
            return completion.value
          }
          throttler.flush()
          const context = createRetryContext(e, retryAttempt + 1, maxRetries)
          if (!receivedDelta && (await canRetry(options, context))) {
            retryAttempt += 1
            throttler.cancel()
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
    requestOptions: Partial<CompletionRequest> = {}
  ) {
    event?.preventDefault?.()
    const result = await complete(input.value, requestOptions)
    input.value = ''
    return result
  }

  return {
    id,
    completion,
    input,
    status,
    isLoading,
    error,
    complete,
    stop,
    setInput,
    setCompletion,
    handleInputChange,
    handleSubmit,
    clearError,
    clear,
    abortController
  }
}
