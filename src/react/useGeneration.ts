import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [input, setInputState] = useState<TInput | undefined>(options.initialInput)
  const [result, setResultState] = useState<TResult | null>(options.initialResult ?? null)
  const [progress, setProgress] = useState<TProgress | null>(options.initialProgress ?? null)
  const [chunks, setChunks] = useState<TChunk[]>([])
  const [status, setStatus] = useState<AiRequestStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<GenerationRequestInfo<TInput> | null>(null)
  const [lastResponse, setLastResponse] = useState<GenerationResponseInfo<TInput, TResult> | null>(
    null
  )
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const inputRef = useRef(input)
  const abortControllerRef = useRef<AbortController | null>(null)
  const optionsRef = useRef(options)
  const chunksRef = useRef<TChunk[]>([])
  optionsRef.current = options
  inputRef.current = input

  const setInput = useCallback((value: TInput | undefined) => {
    inputRef.current = value
    setInputState(value)
  }, [])

  const setResult = useCallback((value: TResult | null) => {
    setResultState(value)
  }, [])

  const clearTrace = useCallback(() => {
    setLastRequest(null)
    setLastResponse(null)
  }, [])

  const inspect = useCallback(
    () =>
      inspectRequestTrace({
        status,
        error,
        lastRequest,
        lastResponse,
        curl: true
      }),
    [error, lastRequest, lastResponse, status]
  )

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setAbortController(null)
    setIsLoading(false)
    setStatus('ready')
  }, [])

  useEffect(() => () => stop(), [stop])

  const clearError = useCallback(() => {
    setError(null)
    setStatus('ready')
  }, [])

  const clear = useCallback(() => {
    stop()
    setInput(optionsRef.current.initialInput)
    setResultState(optionsRef.current.initialResult ?? null)
    setProgress(optionsRef.current.initialProgress ?? null)
    chunksRef.current = []
    setChunks([])
    setError(null)
    clearTrace()
    setStatus('ready')
  }, [clearTrace, setInput, stop])

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
      setAbortController(controller)
      setInput(finalInput)
      setResultState(optionsRef.current.initialResult ?? null)
      setProgress(optionsRef.current.initialProgress ?? null)
      chunksRef.current = []
      setChunks([])
      setError(null)
      setIsLoading(true)
      setStatus('submitted')

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
              setProgress(nextProgress)
              if (nextProgress !== null) currentOptions.onProgress?.(nextProgress)
              hasPendingProgress = false
            }
            if (pendingChunks.length) {
              setChunks([...chunksRef.current])
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
                setStatus('streaming')
                nextProgress = value
                hasPendingProgress = true
                throttler.schedule()
              },
              reportChunk(chunk) {
                if (controller.signal.aborted) return
                receivedUpdate = true
                setStatus('streaming')
                chunksRef.current = [...chunksRef.current, chunk]
                pendingChunks = [...pendingChunks, chunk]
                throttler.schedule()
              }
            }

            setLastRequest(info)
            setLastResponse(null)
            currentOptions.onRequest?.(info)
            const finalResult = await currentOptions.fetcher(finalInput, context)
            if (controller.signal.aborted) throw createAbortError()

            throttler.flush()
            setResultState(finalResult)
            setStatus('ready')
            const response = { ...info, result: finalResult }
            setLastResponse(response)
            currentOptions.onResponse?.(response)
            currentOptions.onFinish?.(finalResult)
            return finalResult
          } catch (rawError) {
            const nextError = normalizeError(rawError)
            throttler.flush()
            if (nextError.name === 'AbortError' || controller.signal.aborted) {
              setError(null)
              setStatus('ready')
              throw nextError
            }

            const context = createRetryContext(nextError, retryAttempt + 1, maxRetries)
            if (!receivedUpdate && (await canRetry(currentOptions, context))) {
              retryAttempt += 1
              throttler.cancel()
              await waitForRetry(currentOptions, context, controller.signal)
              continue
            }

            setStatus('error')
            setError(nextError)
            currentOptions.onError?.(nextError)
            throw nextError
          }
        }
      } finally {
        abortControllerRef.current = null
        setAbortController(null)
        setIsLoading(false)
      }
    },
    [requestInfo, setInput]
  )

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
    inspect,
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
