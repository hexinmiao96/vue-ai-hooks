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
  GeneratedImage,
  ImageEditInput,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageOperation,
  RetryOptions
} from '../types'
import type {
  ImageGenerationRequestInfo,
  ImageGenerationResponseInfo
} from '../composables/useImage'

export type ReactImageGenerationRequestInfo = ImageGenerationRequestInfo
export type ReactImageGenerationResponseInfo = ImageGenerationResponseInfo

export interface ReactImageEditOptions extends Omit<
  Partial<ImageGenerationRequest>,
  'prompt' | 'operation' | 'signal' | 'image' | 'mask'
> {
  image: ImageEditInput | ImageEditInput[]
  mask?: ImageEditInput
}

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
type BodySource =
  | Record<string, unknown>
  | ((context: {
      request: ImageGenerationRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

export interface UseReactImageOptions extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  defaultRequest?: Partial<ImageGenerationRequest>
  onRequest?: (info: ReactImageGenerationRequestInfo) => void
  onResponse?: (info: ReactImageGenerationResponseInfo) => void
  onFinish?: (result: ImageGenerationResult) => void
  onError?: (err: Error) => void
}

export interface UseReactImageReturn {
  id: string
  input: string
  image: GeneratedImage | null
  images: GeneratedImage[]
  result: ImageGenerationResult | null
  status: AiRequestStatus
  isLoading: boolean
  error: Error | null
  lastRequest: ReactImageGenerationRequestInfo | null
  lastResponse: ReactImageGenerationResponseInfo | null
  inspect: () => RequestInspectionSnapshot<
    ReactImageGenerationRequestInfo,
    ReactImageGenerationResponseInfo
  >
  generate: (
    prompt?: string,
    options?: Partial<ImageGenerationRequest>
  ) => Promise<ImageGenerationResult>
  generateImage: (
    prompt?: string,
    options?: Partial<ImageGenerationRequest>
  ) => Promise<ImageGenerationResult>
  editImage: (
    prompt: string | undefined,
    options: ReactImageEditOptions
  ) => Promise<ImageGenerationResult>
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
    options?: Partial<ImageGenerationRequest>
  ) => Promise<ImageGenerationResult>
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

function isGeneratedImage(value: unknown): value is GeneratedImage {
  if (!isRecord(value)) return false
  return (
    typeof value.url === 'string' ||
    typeof value.base64 === 'string' ||
    typeof value.mediaType === 'string' ||
    typeof value.revisedPrompt === 'string'
  )
}

function normalizeImageResult(raw: unknown): ImageGenerationResult {
  if (typeof raw === 'string') {
    return { image: { url: raw }, images: [{ url: raw }] }
  }

  if (Array.isArray(raw)) {
    const generated = raw.filter(isGeneratedImage)
    return { image: generated[0], images: generated }
  }

  if (!isRecord(raw)) {
    return { images: [] }
  }

  const images = Array.isArray(raw.images) ? raw.images.filter(isGeneratedImage) : []
  const image = isGeneratedImage(raw.image) ? raw.image : images[0]

  if (image && !images.length) {
    images.push(image)
  }

  if (!image && isGeneratedImage(raw)) {
    images.push(raw)
    return { image: raw, images }
  }

  return {
    ...raw,
    ...(image ? { image } : {}),
    images
  } as ImageGenerationResult
}

function hasImageEditInput(value: unknown): value is ImageEditInput | ImageEditInput[] {
  if (Array.isArray(value)) return value.some(hasImageEditInput)
  if (typeof value === 'string') return value.trim().length > 0
  if (!isRecord(value)) return false
  return typeof value.url === 'string' || typeof value.base64 === 'string'
}

export function useImage(options: UseReactImageOptions = {}): UseReactImageReturn {
  const {
    api = '/api/image',
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

  const [id] = useState(() => createId('image'))
  const [input, setInputState] = useState(initialInput)
  const [image, setImageState] = useState<GeneratedImage | null>(null)
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [result, setResultState] = useState<ImageGenerationResult | null>(null)
  const [status, setStatus] = useState<AiRequestStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactImageGenerationRequestInfo | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactImageGenerationResponseInfo | null>(null)
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

  const setImage = useCallback((value: GeneratedImage | null) => {
    setImageState(value)
  }, [])

  const setImagesState = useCallback((next: GeneratedImage[]) => {
    setImages(next)
  }, [])

  const setResult = useCallback((next: ImageGenerationResult | null) => {
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
    setImage(null)
    setImagesState([])
    setResult(null)
    setError(null)
    clearTrace()
    setStatus('ready')
  }, [clearTrace, setImage, setImagesState, setInput, setResult, stop])

  useEffect(() => () => stop(), [stop])

  const requestInfo = useCallback(
    (
      request: ImageGenerationRequest,
      body: Record<string, unknown>,
      headers: Record<string, string>,
      attempt: number
    ): ReactImageGenerationRequestInfo => ({
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      operation: request.operation ?? 'generate',
      prompt: request.prompt,
      request: cloneRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }),
    [api, credentials]
  )

  const reportRequest = useCallback(
    (info: ReactImageGenerationRequestInfo) => {
      setLastRequest(info)
      setLastResponse(null)
      recordInspectionEvent({
        kind: 'request',
        label: 'request prepared',
        attempt: info.attempt,
        status,
        metadata: {
          operation: info.operation,
          hasBody: Boolean(Object.keys(info.body ?? {}).length)
        }
      })
      onRequestRef.current?.(info)
    },
    [recordInspectionEvent, status]
  )

  const reportResponse = useCallback(
    (info: ReactImageGenerationRequestInfo, response: ImageGenerationResult) => {
      const next = { ...info, result: response }
      setLastResponse(next)
      recordInspectionEvent({
        kind: 'response',
        label: 'response received',
        attempt: info.attempt,
        status,
        metadata: { hasImages: response.images.length }
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
    async (request: ImageGenerationRequest) => {
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

  const postImage = useCallback(
    async (request: ImageGenerationRequest, attempt: number) => {
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
      const responseResult = normalizeImageResult(await response.json())
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

  const runImageRequest = useCallback(
    async (
      operation: ImageOperation,
      prompt?: string,
      requestOptions: Partial<ImageGenerationRequest> = {}
    ) => {
      const finalPrompt = prompt ?? inputRef.current
      if (!finalPrompt) {
        throw new Error(
          `${operation === 'edit' ? 'editImage' : 'generateImage'}() requires a prompt`
        )
      }

      if (operation === 'edit' && !hasImageEditInput(requestOptions.image)) {
        throw new Error(
          'editImage() requires an image URL, data URL, base64 payload, or image object'
        )
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setImage(null)
      setImagesState([])
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
            const request: ImageGenerationRequest = {
              ...defaultRequest,
              ...requestOptions,
              ...(body ? { body } : {}),
              ...(headers ? { headers } : {}),
              prompt: finalPrompt,
              ...(operation === 'edit' ? { operation, ...requestOptions } : {}),
              signal: controller.signal
            }

            const responseInfo = await postImage(request, retryAttempt + 1)

            if (controller.signal.aborted) {
              throw createAbortError()
            }

            setImage(responseInfo.result.image ?? responseInfo.result.images[0] ?? null)
            setImagesState([...responseInfo.result.images])
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
    [
      defaultRequest,
      postImage,
      recordInspectionEvent,
      setImage,
      setImagesState,
      setResult,
      setStatus
    ]
  )

  const generateImage = useCallback(
    (prompt?: string, requestOptions: Partial<ImageGenerationRequest> = {}) => {
      return runImageRequest('generate', prompt, requestOptions)
    },
    [runImageRequest]
  )

  const generate = useCallback(
    (prompt?: string, requestOptions: Partial<ImageGenerationRequest> = {}) => {
      return runImageRequest('generate', prompt, requestOptions)
    },
    [runImageRequest]
  )

  const editImage = useCallback(
    (prompt: string | undefined, requestOptions: ReactImageEditOptions) => {
      return runImageRequest('edit', prompt, requestOptions)
    },
    [runImageRequest]
  )

  const handleSubmit = useCallback(
    async (
      event?: { preventDefault?: () => void },
      requestOptions: Partial<ImageGenerationRequest> = {}
    ) => {
      event?.preventDefault?.()
      const result = await generateImage(inputRef.current, requestOptions)
      setInput('')
      return result
    },
    [generateImage, setInput]
  )

  return {
    id,
    input,
    image,
    images,
    result,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    inspect,
    generate,
    generateImage,
    editImage,
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
