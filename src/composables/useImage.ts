import { ref, shallowRef, type Ref } from 'vue'
import type {
  AiRequestStatus,
  GeneratedImage,
  ImageEditInput,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageOperation,
  RetryOptions
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
      request: ImageGenerationRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

/** Captures the normalized proxy request exposed to lifecycle callbacks and inspection. */
export interface ImageGenerationRequestInfo {
  providerId: 'proxy'
  attempt: number
  api: string
  credentials?: RequestCredentials
  operation: ImageOperation
  prompt: string
  request: ImageGenerationRequest
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

/** Extends the request snapshot with the normalized image result. */
export interface ImageGenerationResponseInfo extends ImageGenerationRequestInfo {
  result: ImageGenerationResult
}

/** Configures the image proxy endpoint, request defaults, retries, and lifecycle callbacks. */
export interface UseImageOptions extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  defaultRequest?: Partial<ImageGenerationRequest>
  onRequest?: (info: ImageGenerationRequestInfo) => void
  onResponse?: (info: ImageGenerationResponseInfo) => void
  onFinish?: (result: ImageGenerationResult) => void
  onError?: (err: Error) => void
}

/** Supplies the required source image or images for an edit operation. */
export interface ImageEditOptions extends Omit<
  Partial<ImageGenerationRequest>,
  'prompt' | 'operation' | 'image'
> {
  image: ImageEditInput | ImageEditInput[]
}

/** Exposes the latest normalized image result together with request controls and trace state. */
export interface UseImageReturn {
  input: Ref<string>
  image: Ref<GeneratedImage | null>
  images: Ref<GeneratedImage[]>
  result: Ref<ImageGenerationResult | null>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<ImageGenerationRequestInfo | null>
  lastResponse: Ref<ImageGenerationResponseInfo | null>
  inspect: () => RequestInspectionSnapshot<ImageGenerationRequestInfo, ImageGenerationResponseInfo>
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
    options: ImageEditOptions
  ) => Promise<ImageGenerationResult>
  stop: () => void
  setInput: (value: string) => void
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<ImageGenerationRequest>
  ) => Promise<ImageGenerationResult>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

/**
 * Generates or edits images through an app-owned JSON endpoint.
 *
 * `image` contains the first normalized output, while `images` contains every
 * output. Generation methods resolve with the complete normalized result.
 */
export function useImage(options: UseImageOptions = {}): UseImageReturn {
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

  const input = ref(initialInput)
  const image = shallowRef<GeneratedImage | null>(null)
  const images = shallowRef<GeneratedImage[]>([])
  const result = shallowRef<ImageGenerationResult | null>(null)
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
  } = createRequestTrace<ImageGenerationRequestInfo, ImageGenerationResponseInfo>()
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
    image.value = null
    images.value = []
    result.value = null
    error.value = null
    clearTrace()
    status.value = 'ready'
  }

  function inspect(): RequestInspectionSnapshot<
    ImageGenerationRequestInfo,
    ImageGenerationResponseInfo
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

  async function resolveWireBody(request: ImageGenerationRequest) {
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
    request: ImageGenerationRequest,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    attempt: number
  ): ImageGenerationRequestInfo {
    return {
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      operation: request.operation ?? 'generate',
      prompt: request.prompt,
      request: cloneRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }
  }

  function reportRequest(info: ImageGenerationRequestInfo) {
    recordRequest(info)
    onRequest?.(info)
  }

  function reportResponse(info: ImageGenerationRequestInfo, res: ImageGenerationResult) {
    const response = recordResponse({ ...info, result: res })
    onResponse?.(response)
  }

  async function postImage(request: ImageGenerationRequest, attempt: number) {
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
    const res = normalizeImageResult(await response.json())
    reportResponse(info, res)
    return res
  }

  async function runImageRequest(
    operation: ImageOperation,
    prompt?: string,
    requestOptions: Partial<ImageGenerationRequest> = {}
  ) {
    const finalPrompt = prompt ?? input.value
    if (!finalPrompt) {
      throw new Error(`${operation === 'edit' ? 'editImage' : 'generateImage'}() requires a prompt`)
    }
    if (operation === 'edit' && !hasImageEditInput(requestOptions.image)) {
      throw new Error(
        'editImage() requires an image URL, data URL, base64 payload, or image object'
      )
    }

    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    image.value = null
    images.value = []
    result.value = null
    status.value = 'submitted'
    clearInspectionRecords(inspectionRecords)

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        try {
          const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
          const request: ImageGenerationRequest = {
            ...defaultRequest,
            ...requestOptions,
            ...(body ? { body } : {}),
            prompt: finalPrompt,
            ...(operation === 'edit' ? { operation } : {}),
            signal: controller.signal
          }
          const res = await postImage(request, retryAttempt + 1)
          if (controller.signal.aborted) {
            throw createAbortError()
          }
          image.value = res.image ?? res.images[0] ?? null
          images.value = [...res.images]
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

  async function generateImage(
    prompt?: string,
    requestOptions: Partial<ImageGenerationRequest> = {}
  ) {
    return runImageRequest('generate', prompt, requestOptions)
  }

  async function editImage(prompt: string | undefined, requestOptions: ImageEditOptions) {
    return runImageRequest('edit', prompt, requestOptions)
  }

  async function handleSubmit(
    event?: { preventDefault?: () => void },
    requestOptions: Partial<ImageGenerationRequest> = {}
  ) {
    event?.preventDefault?.()
    const res = await generateImage(input.value, requestOptions)
    input.value = ''
    return res
  }

  return {
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
    generate: generateImage,
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

function resolveUrl(baseURL: string, url: string) {
  if (/^https?:\/\//.test(url) || !baseURL) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

function normalizeImageResult(raw: unknown): ImageGenerationResult {
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

function hasImageEditInput(value: unknown): value is ImageEditInput | ImageEditInput[] {
  if (Array.isArray(value)) return value.some(hasImageEditInput)
  if (typeof value === 'string') return value.trim().length > 0
  if (!isRecord(value)) return false
  return typeof value.url === 'string' || typeof value.base64 === 'string'
}
