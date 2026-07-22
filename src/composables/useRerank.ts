import { ref, shallowRef, type Ref } from 'vue'
import type {
  AiRequestStatus,
  RerankDocument,
  RerankRequest,
  RerankResult,
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
type BodySource<TDocument> =
  | Record<string, unknown>
  | ((context: {
      request: RerankRequest<TDocument>
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

/** Captures the normalized proxy request exposed to lifecycle callbacks and inspection. */
export interface RerankRequestInfo<TDocument = RerankDocument> {
  providerId: 'proxy'
  attempt: number
  api: string
  credentials?: RequestCredentials
  query: string
  documents: TDocument[]
  request: RerankRequest<TDocument>
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

/** Extends the request snapshot with the normalized ranking result. */
export interface RerankResponseInfo<
  TDocument = RerankDocument
> extends RerankRequestInfo<TDocument> {
  result: RerankResult<TDocument>
}

/** Configures the rerank proxy endpoint, request defaults, retries, and lifecycle callbacks. */
export interface UseRerankOptions<TDocument = RerankDocument> extends RetryOptions {
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: HeaderSource
  body?: BodySource<TDocument>
  fetch?: typeof fetch
  timeoutMs?: number
  initialInput?: string
  initialDocuments?: TDocument[]
  defaultRequest?: Partial<RerankRequest<TDocument>>
  onRequest?: (info: RerankRequestInfo<TDocument>) => void
  onResponse?: (info: RerankResponseInfo<TDocument>) => void
  onFinish?: (result: RerankResult<TDocument>) => void
  onError?: (err: Error) => void
}

/** Exposes normalized ranking outputs together with request controls and trace state. */
export interface UseRerankReturn<TDocument = RerankDocument> {
  input: Ref<string>
  query: Ref<string>
  documents: Ref<TDocument[]>
  originalDocuments: Ref<TDocument[]>
  rerankedDocuments: Ref<TDocument[]>
  ranking: Ref<RerankResult<TDocument>['ranking']>
  result: Ref<RerankResult<TDocument> | null>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<RerankRequestInfo<TDocument> | null>
  lastResponse: Ref<RerankResponseInfo<TDocument> | null>
  inspect: () => RequestInspectionSnapshot<
    RerankRequestInfo<TDocument>,
    RerankResponseInfo<TDocument>
  >
  rerank: (
    query?: string,
    documents?: TDocument[],
    options?: Partial<RerankRequest<TDocument>>
  ) => Promise<RerankResult<TDocument>>
  rerankDocuments: (
    query?: string,
    documents?: TDocument[],
    options?: Partial<RerankRequest<TDocument>>
  ) => Promise<RerankResult<TDocument>>
  stop: () => void
  setInput: (value: string) => void
  setQuery: (value: string) => void
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  setDocuments: (value: TDocument[]) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<RerankRequest<TDocument>>
  ) => Promise<RerankResult<TDocument>>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

/**
 * Reranks documents against a query through an app-owned JSON endpoint.
 *
 * The original order remains available in `originalDocuments`, while
 * `rerankedDocuments` and `ranking` expose the normalized response order.
 */
export function useRerank<TDocument = RerankDocument>(
  options: UseRerankOptions<TDocument> = {}
): UseRerankReturn<TDocument> {
  const {
    api = '/api/rerank',
    baseURL = '',
    credentials,
    fetch: fetcher,
    timeoutMs,
    initialInput = '',
    initialDocuments = [],
    defaultRequest = {},
    onRequest,
    onResponse,
    onFinish,
    onError
  } = options

  const input = ref(initialInput)
  const documents = shallowRef<TDocument[]>([...initialDocuments])
  const originalDocuments = shallowRef<TDocument[]>([])
  const rerankedDocuments = shallowRef<TDocument[]>([])
  const ranking = shallowRef<RerankResult<TDocument>['ranking']>([])
  const result = shallowRef<RerankResult<TDocument> | null>(null)
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
  } = createRequestTrace<RerankRequestInfo<TDocument>, RerankResponseInfo<TDocument>>()
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

  function setQuery(value: string) {
    setInput(value)
  }

  function handleInputChange(event: Event | { target?: { value?: unknown } } | string) {
    if (typeof event === 'string') {
      setInput(event)
      return
    }

    const value = (event.target as { value?: unknown } | null | undefined)?.value
    setInput(value == null ? '' : String(value))
  }

  function setDocuments(value: TDocument[]) {
    documents.value = [...value]
  }

  function clearError() {
    error.value = null
    status.value = 'ready'
  }

  function clear() {
    stop()
    input.value = ''
    documents.value = []
    originalDocuments.value = []
    rerankedDocuments.value = []
    ranking.value = []
    result.value = null
    error.value = null
    clearTrace()
    status.value = 'ready'
  }

  function inspect(): RequestInspectionSnapshot<
    RerankRequestInfo<TDocument>,
    RerankResponseInfo<TDocument>
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

  async function resolveWireBody(request: RerankRequest<TDocument>) {
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
    request: RerankRequest<TDocument>,
    body: Record<string, unknown>,
    headers: Record<string, string>,
    attempt: number
  ): RerankRequestInfo<TDocument> {
    return {
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      query: request.query,
      documents: [...request.documents],
      request: cloneRerankRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }
  }

  function reportRequest(info: RerankRequestInfo<TDocument>) {
    recordRequest(info)
    onRequest?.(info)
  }

  function reportResponse(info: RerankRequestInfo<TDocument>, res: RerankResult<TDocument>) {
    const response = recordResponse({ ...info, result: res })
    onResponse?.(response)
  }

  async function postRerank(request: RerankRequest<TDocument>, attempt: number) {
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
    const res = normalizeRerankResult(await response.json(), request.documents)
    reportResponse(info, res)
    return res
  }

  async function rerankDocuments(
    query?: string,
    docs?: TDocument[],
    requestOptions: Partial<RerankRequest<TDocument>> = {}
  ) {
    const finalQuery = query ?? input.value
    const finalDocuments = docs ?? documents.value
    if (!finalQuery) {
      throw new Error('rerankDocuments() requires a query (either as argument or via input.value)')
    }
    if (!finalDocuments.length) {
      throw new Error('rerankDocuments() requires at least one document')
    }

    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    originalDocuments.value = []
    rerankedDocuments.value = []
    ranking.value = []
    result.value = null
    status.value = 'submitted'
    clearInspectionRecords(inspectionRecords)

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        try {
          const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
          const request: RerankRequest<TDocument> = {
            ...defaultRequest,
            ...requestOptions,
            ...(body ? { body } : {}),
            query: finalQuery,
            documents: [...finalDocuments],
            signal: controller.signal
          }
          const res = await postRerank(request, retryAttempt + 1)
          if (controller.signal.aborted) {
            throw createAbortError()
          }
          originalDocuments.value = [...res.originalDocuments]
          rerankedDocuments.value = [...res.rerankedDocuments]
          ranking.value = [...res.ranking]
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
    requestOptions: Partial<RerankRequest<TDocument>> = {}
  ) {
    event?.preventDefault?.()
    const res = await rerankDocuments(input.value, documents.value, requestOptions)
    input.value = ''
    return res
  }

  return {
    input,
    query: input,
    documents,
    originalDocuments,
    rerankedDocuments,
    ranking,
    result,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    inspect,
    rerank: rerankDocuments,
    rerankDocuments,
    stop,
    setInput,
    setQuery,
    handleInputChange,
    setDocuments,
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

function normalizeRerankResult<TDocument>(
  raw: unknown,
  originalDocuments: TDocument[]
): RerankResult<TDocument> {
  if (!isRecord(raw)) {
    const ranking = originalDocuments.map((document, index) => ({ index, score: 0, document }))
    return {
      originalDocuments: [...originalDocuments],
      rerankedDocuments: [...originalDocuments],
      ranking
    }
  }

  const sourceOriginalDocuments = Array.isArray(raw.originalDocuments)
    ? (raw.originalDocuments as TDocument[])
    : originalDocuments
  const sourceRanking = Array.isArray(raw.ranking)
    ? raw.ranking
        .map((item) => normalizeRankingItem(item, sourceOriginalDocuments))
        .filter((item): item is RerankResult<TDocument>['ranking'][number] => item !== null)
    : []
  const rerankedDocuments = Array.isArray(raw.rerankedDocuments)
    ? (raw.rerankedDocuments as TDocument[])
    : sourceRanking.map((item) => item.document)
  const ranking = sourceRanking.length
    ? sourceRanking
    : rerankedDocuments.map((document, rankIndex) => ({
        index: findDocumentIndex(sourceOriginalDocuments, document),
        score: Math.max(0, 1 - rankIndex / Math.max(rerankedDocuments.length, 1)),
        document
      }))

  return {
    ...raw,
    originalDocuments: [...sourceOriginalDocuments],
    rerankedDocuments: [...rerankedDocuments],
    ranking
  } as RerankResult<TDocument>
}

function normalizeRankingItem<TDocument>(
  raw: unknown,
  documents: TDocument[]
): RerankResult<TDocument>['ranking'][number] | null {
  if (!isRecord(raw)) return null
  const index =
    typeof raw.index === 'number'
      ? raw.index
      : typeof raw.originalIndex === 'number'
        ? raw.originalIndex
        : -1
  const score =
    typeof raw.score === 'number'
      ? raw.score
      : typeof raw.relevanceScore === 'number'
        ? raw.relevanceScore
        : 0
  const document =
    raw.document !== undefined
      ? (raw.document as TDocument)
      : index >= 0 && index < documents.length
        ? documents[index]
        : undefined
  if (document === undefined) return null
  return { index, score, document }
}

function cloneRerankRequestSnapshot<TDocument>(
  request: RerankRequest<TDocument>
): RerankRequest<TDocument> {
  return {
    ...cloneRequestSnapshot(request),
    documents: [...request.documents]
  }
}

function findDocumentIndex<TDocument>(documents: TDocument[], document: TDocument) {
  const directIndex = documents.indexOf(document)
  if (directIndex !== -1) return directIndex

  const serialized = stableSerialize(document)
  return documents.findIndex((item) => stableSerialize(item) === serialized)
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
