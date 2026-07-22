import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { AiRequestStatus, IdGenerator, RetryOptions, StreamThrottleOptions } from '../types'
import { createId } from '../utils/id'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import { mergeRequestBody } from '../utils/requestBody'
import { createStreamUpdateThrottler, getThrottleMs } from '../utils/throttle'
import { inspectRequestTrace, type RequestInspectionSnapshot } from '../utils/inspection'
import type {
  GenerateOptions,
  GenerationFetcher,
  GenerationRequestInfo,
  GenerationResponseInfo,
  GenerationRunContext
} from '../composables/useGeneration'

export type {
  GenerateOptions,
  GenerationFetcher,
  GenerationRequestInfo,
  GenerationResponseInfo,
  GenerationRunContext
} from '../composables/useGeneration'

/** Configures a custom generation fetcher, shared state, retries, and progress callbacks. */
export interface UseReactGenerationOptions<
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

/** Exposes typed generation state, accumulated chunks, lifecycle controls, and inspection data. */
export interface UseReactGenerationReturn<
  TInput = string,
  TResult = unknown,
  TProgress = unknown,
  TChunk = unknown
> {
  id: string
  input: TInput | undefined
  result: TResult | null
  progress: TProgress | null
  chunks: TChunk[]
  status: AiRequestStatus
  isLoading: boolean
  error: Error | null
  lastRequest: GenerationRequestInfo<TInput> | null
  lastResponse: GenerationResponseInfo<TInput, TResult> | null
  inspect: () => RequestInspectionSnapshot<
    GenerationRequestInfo<TInput>,
    GenerationResponseInfo<TInput, TResult>
  >
  generate: (input?: TInput, options?: GenerateOptions) => Promise<TResult>
  stop: () => void
  setInput: (value: TInput | undefined) => void
  setResult: (value: TResult | null) => void
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  reset: () => void
  abortController: AbortController | null
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function createAbortError() {
  const error = new Error('Generation request was aborted')
  error.name = 'AbortError'
  return error
}

interface ReactGenerationState<TInput, TResult, TProgress, TChunk> {
  input: TInput | undefined
  result: TResult | null
  progress: TProgress | null
  chunks: TChunk[]
  status: AiRequestStatus
  isLoading: boolean
  error: Error | null
  lastRequest: GenerationRequestInfo<TInput> | null
  lastResponse: GenerationResponseInfo<TInput, TResult> | null
  abortController: AbortController | null
}

interface ReactGenerationStore<TInput, TResult, TProgress, TChunk> {
  initialInput: TInput | undefined
  initialResult: TResult | null
  initialProgress: TProgress | null
  getSnapshot: () => ReactGenerationState<TInput, TResult, TProgress, TChunk>
  subscribe: (listener: () => void) => () => void
  setState: (patch: Partial<ReactGenerationState<TInput, TResult, TProgress, TChunk>>) => void
  retain: () => void
  release: () => number
}

// A stable ID intentionally shares one external store across React component instances.
const generationStores = new Map<
  string,
  ReactGenerationStore<unknown, unknown, unknown, unknown>
>()

function createGenerationStore<TInput, TResult, TProgress, TChunk>(
  initialInput: TInput | undefined,
  initialResult: TResult | null,
  initialProgress: TProgress | null
): ReactGenerationStore<TInput, TResult, TProgress, TChunk> {
  const listeners = new Set<() => void>()
  let retainCount = 0
  let state: ReactGenerationState<TInput, TResult, TProgress, TChunk> = {
    input: initialInput,
    result: initialResult,
    progress: initialProgress,
    chunks: [],
    status: 'ready',
    isLoading: false,
    error: null,
    lastRequest: null,
    lastResponse: null,
    abortController: null
  }

  return {
    initialInput,
    initialResult,
    initialProgress,
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setState(patch) {
      state = { ...state, ...patch }
      listeners.forEach((listener) => listener())
    },
    retain() {
      retainCount += 1
    },
    release() {
      retainCount = Math.max(0, retainCount - 1)
      return retainCount
    }
  }
}

function getGenerationStore<TInput, TResult, TProgress, TChunk>(
  id: string,
  initialInput: TInput | undefined,
  initialResult: TResult | null,
  initialProgress: TProgress | null
): ReactGenerationStore<TInput, TResult, TProgress, TChunk> {
  const existing = generationStores.get(id)
  if (existing) return existing as ReactGenerationStore<TInput, TResult, TProgress, TChunk>

  const store = createGenerationStore<TInput, TResult, TProgress, TChunk>(
    initialInput,
    initialResult,
    initialProgress
  )
  generationStores.set(id, store as ReactGenerationStore<unknown, unknown, unknown, unknown>)
  return store
}

/**
 * Runs an application-defined generation workflow and exposes typed progress as React state.
 *
 * Component instances with the same ID observe one shared store, and retries stop once progress
 * or chunks have been reported to avoid replaying a partially delivered result.
 *
 * @returns Shared generation state, accumulated chunks, lifecycle controls, and inspection data.
 */
export function useGeneration<
  TInput = string,
  TResult = unknown,
  TProgress = unknown,
  TChunk = unknown
>(
  options: UseReactGenerationOptions<TInput, TResult, TProgress, TChunk>
): UseReactGenerationReturn<TInput, TResult, TProgress, TChunk> {
  if (!options.fetcher) throw new Error('useGeneration requires a fetcher option')

  const createRuntimeId = options.generateId ?? createId
  const [id] = useState(() => options.id ?? createRuntimeId('generation'))
  const store = getGenerationStore<TInput, TResult, TProgress, TChunk>(
    id,
    options.initialInput,
    options.initialResult ?? null,
    options.initialProgress ?? null
  )
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  const inputRef = useRef(state.input)
  const abortControllerRef = useRef<AbortController | null>(null)
  const optionsRef = useRef(options)
  const chunksRef = useRef<TChunk[]>([])
  optionsRef.current = options
  inputRef.current = state.input
  chunksRef.current = state.chunks

  const setInput = useCallback((value: TInput | undefined) => {
    inputRef.current = value
    store.setState({ input: value })
  }, [store])

  const setResult = useCallback((value: TResult | null) => {
    store.setState({ result: value })
  }, [store])

  const clearTrace = useCallback(() => {
    store.setState({ lastRequest: null, lastResponse: null })
  }, [store])

  const inspect = useCallback(
    () =>
      inspectRequestTrace({
        status: state.status,
        error: state.error,
        lastRequest: state.lastRequest,
        lastResponse: state.lastResponse,
        curl: true
      }),
    [state.error, state.lastRequest, state.lastResponse, state.status]
  )

  const stop = useCallback(() => {
    const controller = abortControllerRef.current ?? store.getSnapshot().abortController
    controller?.abort()
    abortControllerRef.current = null
    store.setState({
      abortController: null,
      isLoading: false,
      status: 'ready'
    })
  }, [store])

  useEffect(() => {
    store.retain()
    return () => {
      if (store.release() === 0) stop()
    }
  }, [stop, store])

  const clearError = useCallback(() => {
    store.setState({ error: null, status: 'ready' })
  }, [store])

  const clear = useCallback(() => {
    stop()
    inputRef.current = store.initialInput
    chunksRef.current = []
    store.setState({
      input: store.initialInput,
      result: store.initialResult,
      progress: store.initialProgress,
      chunks: [],
      error: null,
      status: 'ready'
    })
    clearTrace()
  }, [clearTrace, stop, store])

  const requestInfo = useCallback(
    (
      runInput: TInput,
      body: Record<string, unknown> | undefined,
      attempt: number
    ): GenerationRequestInfo<TInput> => ({
      id,
      attempt,
      input: runInput,
      ...(body ? { body: { ...body } } : {})
    }),
    [id]
  )

  const generate = useCallback(
    async (...args: [TInput?, GenerateOptions?]) => {
      const [runInput, runOptions = {}] = args
      const finalInput = args.length > 0 ? (runInput as TInput) : inputRef.current
      if (finalInput === undefined) {
        throw new Error('generate() requires input either as an argument or via input state')
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      store.setState({ abortController: controller })
      setInput(finalInput)
      chunksRef.current = []
      store.setState({
        result: optionsRef.current.initialResult ?? null,
        progress: optionsRef.current.initialProgress ?? null,
        chunks: [],
        error: null,
        isLoading: true,
        status: 'submitted'
      })

      try {
        let retryAttempt = 0
        const currentOptions = optionsRef.current
        const maxRetries = getMaxRetries(currentOptions)
        while (true) {
          let receivedUpdate = false
          let nextProgress: TProgress | null = currentOptions.initialProgress ?? null
          let hasPendingProgress = false
          let pendingChunks: TChunk[] = []
          const throttler = createStreamUpdateThrottler(getThrottleMs(currentOptions), () => {
            if (hasPendingProgress) {
              store.setState({ progress: nextProgress })
              if (nextProgress !== null) currentOptions.onProgress?.(nextProgress)
              hasPendingProgress = false
            }
            if (pendingChunks.length) {
              store.setState({ chunks: [...chunksRef.current] })
              for (const chunk of pendingChunks) currentOptions.onChunk?.(chunk)
              pendingChunks = []
            }
          })

          try {
            const body = mergeRequestBody(currentOptions.defaultBody, runOptions.body)
            const info = requestInfo(finalInput, body, retryAttempt + 1)
            const context: GenerationRunContext<TInput, TProgress, TChunk> = {
              ...info,
              signal: controller.signal,
              reportProgress(value) {
                if (controller.signal.aborted) return
                receivedUpdate = true
                store.setState({ status: 'streaming' })
                nextProgress = value
                hasPendingProgress = true
                throttler.schedule()
              },
              reportChunk(chunk) {
                if (controller.signal.aborted) return
                receivedUpdate = true
                store.setState({ status: 'streaming' })
                chunksRef.current = [...chunksRef.current, chunk]
                pendingChunks = [...pendingChunks, chunk]
                throttler.schedule()
              }
            }

            store.setState({ lastRequest: info, lastResponse: null })
            currentOptions.onRequest?.(info)
            const finalResult = await currentOptions.fetcher(finalInput, context)
            if (controller.signal.aborted) throw createAbortError()

            throttler.flush()
            const response = { ...info, result: finalResult }
            store.setState({
              result: finalResult,
              status: 'ready',
              lastResponse: response
            })
            currentOptions.onResponse?.(response)
            currentOptions.onFinish?.(finalResult)
            return finalResult
          } catch (rawError) {
            const nextError = normalizeError(rawError)
            throttler.flush()
            if (nextError.name === 'AbortError' || controller.signal.aborted) {
              store.setState({ error: null, status: 'ready' })
              throw nextError
            }

            const context = createRetryContext(nextError, retryAttempt + 1, maxRetries)
            if (!receivedUpdate && (await canRetry(currentOptions, context))) {
              retryAttempt += 1
              throttler.cancel()
              await waitForRetry(currentOptions, context, controller.signal)
              continue
            }

            store.setState({ status: 'error', error: nextError })
            currentOptions.onError?.(nextError)
            throw nextError
          }
        }
      } finally {
        abortControllerRef.current = null
        store.setState({ abortController: null, isLoading: false })
      }
    },
    [requestInfo, setInput, store]
  )

  return {
    id,
    input: state.input,
    result: state.result,
    progress: state.progress,
    chunks: state.chunks,
    status: state.status,
    isLoading: state.isLoading,
    error: state.error,
    lastRequest: state.lastRequest,
    lastResponse: state.lastResponse,
    inspect,
    generate,
    stop,
    setInput,
    setResult,
    clearError,
    clearTrace,
    clear,
    reset: clear,
    abortController: state.abortController
  }
}
