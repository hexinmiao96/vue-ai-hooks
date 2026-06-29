import { shallowRef, type Ref } from 'vue'
import type { AiRequestStatus, IdGenerator, RetryOptions, StreamThrottleOptions } from '../types'
import { createId } from '../utils/id'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import { mergeRequestBody } from '../utils/requestBody'
import { createStreamUpdateThrottler, getThrottleMs } from '../utils/throttle'
import { createRequestTrace, type RequestTrace } from '../utils/trace'

export interface GenerateOptions {
  body?: Record<string, unknown>
}

export interface GenerationRequestInfo<TInput = unknown> {
  id: string
  attempt: number
  input: TInput
  body?: Record<string, unknown>
}

export interface GenerationResponseInfo<
  TInput = unknown,
  TResult = unknown
> extends GenerationRequestInfo<TInput> {
  result: TResult
}

export interface GenerationRunContext<
  TInput = unknown,
  TProgress = unknown,
  TChunk = unknown
> extends GenerationRequestInfo<TInput> {
  signal: AbortSignal
  reportProgress: (progress: TProgress) => void
  reportChunk: (chunk: TChunk) => void
}

export type GenerationFetcher<
  TInput = unknown,
  TResult = unknown,
  TProgress = unknown,
  TChunk = unknown
> = (
  input: TInput,
  context: GenerationRunContext<TInput, TProgress, TChunk>
) => TResult | Promise<TResult>

export interface UseGenerationOptions<
  TInput = string,
  TResult = unknown,
  TProgress = unknown,
  TChunk = unknown
>
  extends RetryOptions, StreamThrottleOptions {
  fetcher: GenerationFetcher<TInput, TResult, TProgress, TChunk>
  id?: string
  generateId?: IdGenerator
  initialInput?: TInput
  initialResult?: TResult | null
  initialProgress?: TProgress | null
  defaultBody?: Record<string, unknown>
  onRequest?: (info: GenerationRequestInfo<TInput>) => void
  onResponse?: (info: GenerationResponseInfo<TInput, TResult>) => void
  onProgress?: (progress: TProgress) => void
  onChunk?: (chunk: TChunk) => void
  onFinish?: (result: TResult) => void
  onError?: (err: Error) => void
}

export interface UseGenerationReturn<
  TInput = string,
  TResult = unknown,
  TProgress = unknown,
  TChunk = unknown
> {
  id: Ref<string>
  input: Ref<TInput | undefined>
  result: Ref<TResult | null>
  progress: Ref<TProgress | null>
  chunks: Ref<TChunk[]>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<GenerationRequestInfo<TInput> | null>
  lastResponse: Ref<GenerationResponseInfo<TInput, TResult> | null>
  generate: (input?: TInput, options?: GenerateOptions) => Promise<TResult>
  stop: () => void
  setInput: (value: TInput | undefined) => void
  setResult: (value: TResult | null) => void
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  reset: () => void
  abortController: Ref<AbortController | null>
}

interface GenerationState<TInput, TResult, TProgress, TChunk> extends RequestTrace<
  GenerationRequestInfo<TInput>,
  GenerationResponseInfo<TInput, TResult>
> {
  initialInput: TInput | undefined
  initialResult: TResult | null
  initialProgress: TProgress | null
  input: Ref<TInput | undefined>
  result: Ref<TResult | null>
  progress: Ref<TProgress | null>
  chunks: Ref<TChunk[]>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  abortController: Ref<AbortController | null>
}

const generationStates = new Map<string, GenerationState<unknown, unknown, unknown, unknown>>()

function getGenerationState<TInput, TResult, TProgress, TChunk>(
  id: string,
  initialInput: TInput | undefined,
  initialResult: TResult | null,
  initialProgress: TProgress | null
): GenerationState<TInput, TResult, TProgress, TChunk> {
  const existing = generationStates.get(id)
  if (existing) return existing as GenerationState<TInput, TResult, TProgress, TChunk>

  const state: GenerationState<TInput, TResult, TProgress, TChunk> = {
    initialInput,
    initialResult,
    initialProgress,
    input: shallowRef(initialInput) as Ref<TInput | undefined>,
    result: shallowRef(initialResult) as Ref<TResult | null>,
    progress: shallowRef(initialProgress) as Ref<TProgress | null>,
    chunks: shallowRef<TChunk[]>([]) as Ref<TChunk[]>,
    status: shallowRef<AiRequestStatus>('ready') as Ref<AiRequestStatus>,
    isLoading: shallowRef(false),
    error: shallowRef<Error | null>(null),
    ...createRequestTrace<GenerationRequestInfo<TInput>, GenerationResponseInfo<TInput, TResult>>(),
    abortController: shallowRef<AbortController | null>(null)
  }
  generationStates.set(id, state as GenerationState<unknown, unknown, unknown, unknown>)
  return state
}

export function useGeneration<
  TInput = string,
  TResult = unknown,
  TProgress = unknown,
  TChunk = unknown
>(
  options: UseGenerationOptions<TInput, TResult, TProgress, TChunk>
): UseGenerationReturn<TInput, TResult, TProgress, TChunk> {
  const {
    fetcher,
    id: explicitId,
    generateId = createId,
    initialInput,
    initialResult = null,
    initialProgress = null,
    defaultBody,
    onRequest,
    onResponse,
    onProgress,
    onChunk,
    onFinish,
    onError
  } = options

  if (!fetcher) throw new Error('useGeneration requires a fetcher option')

  const id = shallowRef(explicitId || generateId('generation')) as Ref<string>
  const state = getGenerationState<TInput, TResult, TProgress, TChunk>(
    id.value,
    initialInput,
    initialResult,
    initialProgress
  )
  const {
    input,
    result,
    progress,
    chunks,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    clearTrace,
    abortController
  } = state

  function stop() {
    abortController.value?.abort()
    abortController.value = null
    isLoading.value = false
    status.value = 'ready'
  }

  function setInput(value: TInput | undefined) {
    input.value = value
  }

  function setResult(value: TResult | null) {
    result.value = value
  }

  function clearError() {
    error.value = null
    status.value = 'ready'
  }

  function clear() {
    stop()
    input.value = state.initialInput
    result.value = state.initialResult
    progress.value = state.initialProgress
    chunks.value = []
    error.value = null
    clearTrace()
    status.value = 'ready'
  }

  function requestInfo(
    runInput: TInput,
    body: Record<string, unknown> | undefined,
    attempt: number
  ): GenerationRequestInfo<TInput> {
    return {
      id: id.value,
      attempt,
      input: runInput,
      ...(body ? { body: { ...body } } : {})
    }
  }

  function reportRequest(info: GenerationRequestInfo<TInput>) {
    state.recordRequest(info)
    onRequest?.(info)
  }

  function reportResponse(info: GenerationRequestInfo<TInput>, finalResult: TResult) {
    const response = state.recordResponse({ ...info, result: finalResult })
    onResponse?.(response)
  }

  async function generate(runInput?: TInput, runOptions: GenerateOptions = {}) {
    const finalInput = arguments.length > 0 ? (runInput as TInput) : input.value
    if (finalInput === undefined) {
      throw new Error('generate() requires input either as an argument or via input.value')
    }

    const controller = new AbortController()
    abortController.value = controller
    input.value = finalInput
    result.value = state.initialResult
    progress.value = state.initialProgress
    chunks.value = []
    error.value = null
    isLoading.value = true
    status.value = 'submitted'

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        let receivedUpdate = false
        let nextProgress = state.initialProgress
        let hasPendingProgress = false
        let nextChunks: TChunk[] = []
        let pendingChunks: TChunk[] = []
        const throttler = createStreamUpdateThrottler(getThrottleMs(options), () => {
          if (hasPendingProgress) {
            progress.value = nextProgress
            if (nextProgress !== null) onProgress?.(nextProgress)
            hasPendingProgress = false
          }
          if (pendingChunks.length) {
            chunks.value = [...nextChunks]
            for (const chunk of pendingChunks) onChunk?.(chunk)
            pendingChunks = []
          }
        })

        try {
          const body = mergeRequestBody(defaultBody, runOptions.body)
          const info = requestInfo(finalInput, body, retryAttempt + 1)
          const context: GenerationRunContext<TInput, TProgress, TChunk> = {
            ...info,
            signal: controller.signal,
            reportProgress(value) {
              if (controller.signal.aborted) return
              receivedUpdate = true
              status.value = 'streaming'
              nextProgress = value
              hasPendingProgress = true
              throttler.schedule()
            },
            reportChunk(chunk) {
              if (controller.signal.aborted) return
              receivedUpdate = true
              status.value = 'streaming'
              nextChunks = [...nextChunks, chunk]
              pendingChunks = [...pendingChunks, chunk]
              throttler.schedule()
            }
          }

          reportRequest(info)
          const finalResult = await fetcher(finalInput, context)
          if (controller.signal.aborted) throw createAbortError()

          throttler.flush()
          result.value = finalResult
          status.value = 'ready'
          reportResponse(info, finalResult)
          onFinish?.(finalResult)
          return finalResult
        } catch (err) {
          const e = normalizeError(err)
          throttler.flush()
          if (e.name === 'AbortError' || controller.signal.aborted) {
            error.value = null
            status.value = 'ready'
            throw e
          }

          const context = createRetryContext(e, retryAttempt + 1, maxRetries)
          if (!receivedUpdate && (await canRetry(options, context))) {
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

  return {
    id,
    input,
    result,
    progress,
    chunks,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    generate,
    stop,
    setInput,
    setResult,
    clearError,
    clearTrace,
    clear,
    reset: clear,
    abortController
  }
}

function normalizeError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

function createAbortError() {
  const error = new Error('Generation request was aborted')
  error.name = 'AbortError'
  return error
}
