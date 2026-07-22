import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { requestJson } from '../utils/fetch'
import { mergeHeaders } from '../utils/headers'
import { cloneRequestSnapshot } from '../utils/lifecycle'
import { mergeRequestBody } from '../utils/requestBody'
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
  RerankDocument,
  RerankRequest,
  RerankResult,
  RetryOptions
} from '../types'
import type { RerankRequestInfo, RerankResponseInfo } from '../composables/useRerank'

/** Request inspection metadata emitted by the React reranking hook. */
export type ReactRerankRequestInfo<TDocument = RerankDocument> = RerankRequestInfo<TDocument>

/** Response inspection metadata emitted by the React reranking hook. */
export type ReactRerankResponseInfo<TDocument = RerankDocument> = RerankResponseInfo<TDocument>

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
type BodySource<TDocument> =
  | Record<string, unknown>
  | ((context: {
      request: RerankRequest<TDocument>
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

/** Configures the reranking endpoint, initial documents, retries, and lifecycle callbacks. */
export interface UseReactRerankOptions<TDocument = RerankDocument> extends RetryOptions {
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
  onRequest?: (info: ReactRerankRequestInfo<TDocument>) => void
  onResponse?: (info: ReactRerankResponseInfo<TDocument>) => void
  onFinish?: (result: RerankResult<TDocument>) => void
  onError?: (err: Error) => void
}

/** Exposes source and ranked documents, request controls, form bindings, and inspection data. */
export interface UseReactRerankReturn<TDocument = RerankDocument> {
  input: string
  query: string
  documents: TDocument[]
  originalDocuments: TDocument[]
  rerankedDocuments: TDocument[]
  ranking: RerankResult<TDocument>['ranking']
  result: RerankResult<TDocument> | null
  status: AiRequestStatus
  isLoading: boolean
  error: Error | null
  lastRequest: ReactRerankRequestInfo<TDocument> | null
  lastResponse: ReactRerankResponseInfo<TDocument> | null
  inspect: () => RequestInspectionSnapshot<
    ReactRerankRequestInfo<TDocument>,
    ReactRerankResponseInfo<TDocument>
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
  handleInputChange: (
    event:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | { target?: { value?: unknown } }
      | string
  ) => void
  setDocuments: (value: TDocument[]) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<RerankRequest<TDocument>>
  ) => Promise<RerankResult<TDocument>>
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

function findDocumentIndex<TDocument>(documents: TDocument[], document: TDocument) {
  const directIndex = documents.indexOf(document)
  if (directIndex !== -1) return directIndex
  const serialized = stableSerialize(document)
  return documents.findIndex((item) => stableSerialize(item) === serialized)
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

function cloneRerankRequestSnapshot<TDocument>(
  request: RerankRequest<TDocument>
): RerankRequest<TDocument> {
  return {
    ...cloneRequestSnapshot(request),
    documents: [...request.documents]
  }
}

/**
 * Reranks an application-provided document set against a query through an app-owned endpoint.
 *
 * Response shapes are normalized into stable original-document, ranked-document, and score views.
 *
 * @returns Reranking state, document controls, form helpers, and request inspection data.
 */
export function useRerank<TDocument = RerankDocument>(
  options: UseReactRerankOptions<TDocument> = {}
): UseReactRerankReturn<TDocument> {
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

  const [input, setInputState] = useState(initialInput)
  const [documents, setDocumentsState] = useState<TDocument[]>([...initialDocuments])
  const [originalDocuments, setOriginalDocuments] = useState<TDocument[]>([])
  const [rerankedDocuments, setRerankedDocuments] = useState<TDocument[]>([])
  const [ranking, setRanking] = useState<RerankResult<TDocument>['ranking']>([])
  const [result, setResult] = useState<RerankResult<TDocument> | null>(null)
  const [status, setStatus] = useState<AiRequestStatus>('ready')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequest] = useState<ReactRerankRequestInfo<TDocument> | null>(null)
  const [lastResponse, setLastResponse] = useState<ReactRerankResponseInfo<TDocument> | null>(null)
  const [inspectionEvents, setInspectionEvents] = useState<InspectionTimelineEventInput[]>([])
  const [inspectionRetries, setInspectionRetries] = useState<InspectionRetryRecordInput[]>([])
  const inspectionRecords = { setEvents: setInspectionEvents, setRetries: setInspectionRetries }
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const inputRef = useRef(input)
  const documentsRef = useRef(documents)
  const abortControllerRef = useRef<AbortController | null>(null)
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

  const setDocuments = useCallback((value: TDocument[]) => {
    documentsRef.current = [...value]
    setDocumentsState([...value])
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
    setInput('')
    setDocuments([])
    setOriginalDocuments([])
    setRerankedDocuments([])
    setRanking([])
    setResult(null)
    setError(null)
    clearTrace()
    setStatus('ready')
  }, [clearTrace, setDocuments, setInput, stop])

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

  const requestInfo = useCallback(
    (
      request: RerankRequest<TDocument>,
      body: Record<string, unknown>,
      headers: Record<string, string>,
      attempt: number
    ): ReactRerankRequestInfo<TDocument> => ({
      providerId: 'proxy',
      attempt,
      api,
      credentials,
      query: request.query,
      documents: [...request.documents],
      request: cloneRerankRequestSnapshot(request),
      body: { ...body },
      headers: { ...headers }
    }),
    [api, credentials]
  )

  const reportRequest = useCallback((info: ReactRerankRequestInfo<TDocument>) => {
    setLastRequest(info)
    setLastResponse(null)
    recordInspectionStateEvent(inspectionRecords, {
      kind: 'request',
      label: 'request prepared',
      attempt: info.attempt,
      status: 'submitted',
      metadata: { documentCount: info.documents.length }
    })
    onRequestRef.current?.(info)
  }, [])

  const reportResponse = useCallback(
    (info: ReactRerankRequestInfo<TDocument>, res: RerankResult<TDocument>) => {
      const response = { ...info, result: res }
      setLastResponse(response)
      recordInspectionStateEvent(inspectionRecords, {
        kind: 'response',
        label: 'response received',
        attempt: info.attempt,
        status: 'ready',
        metadata: { rankingCount: res.ranking.length }
      })
      onResponseRef.current?.(response)
      return response
    },
    []
  )

  const rerankDocuments = useCallback(
    async (
      query?: string,
      docs?: TDocument[],
      requestOptions: Partial<RerankRequest<TDocument>> = {}
    ) => {
      const finalQuery = query ?? inputRef.current
      const finalDocuments = docs ?? documentsRef.current
      if (!finalQuery) {
        throw new Error('rerankDocuments() requires a query (either as argument or via input)')
      }
      if (!finalDocuments.length)
        throw new Error('rerankDocuments() requires at least one document')

      const controller = new AbortController()
      abortControllerRef.current = controller
      setAbortController(controller)
      setIsLoading(true)
      setError(null)
      setOriginalDocuments([])
      setRerankedDocuments([])
      setRanking([])
      setResult(null)
      setStatus('submitted')
      clearInspectionState(inspectionRecords)

      try {
        let retryAttempt = 0
        const maxRetries = getMaxRetries(optionsRef.current)
        while (true) {
          try {
            const currentOptions = optionsRef.current
            const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
            const headers = mergeRequestHeaders(
              defaultRequest.headers as HeadersInit | undefined,
              requestOptions.headers
            )
            const request: RerankRequest<TDocument> = {
              ...defaultRequest,
              ...requestOptions,
              ...(body ? { body } : {}),
              ...(headers ? { headers } : {}),
              query: finalQuery,
              documents: [...finalDocuments],
              signal: controller.signal
            }
            const configuredHeaders =
              typeof currentOptions.headers === 'function'
                ? await currentOptions.headers()
                : (currentOptions.headers ?? {})
            const wireHeaders = mergeHeaders(
              { 'Content-Type': 'application/json' },
              configuredHeaders,
              request.headers
            )
            const configuredBody =
              typeof currentOptions.body === 'function'
                ? await currentOptions.body({ request })
                : (currentOptions.body ?? {})
            const { signal: _signal, headers: _headers, body: requestBody, ...typedBody } = request
            const wireBody = { ...configuredBody, ...(requestBody ?? {}), ...typedBody }
            const info = requestInfo(request, wireBody, wireHeaders, retryAttempt + 1)
            reportRequest(info)
            const response = await requestJson(resolveUrl(baseURL, api), {
              method: 'POST',
              headers: wireHeaders,
              body: JSON.stringify(wireBody),
              signal: request.signal,
              credentials,
              timeoutMs,
              fetcher
            })
            const res = normalizeRerankResult(await response.json(), request.documents)
            reportResponse(info, res)
            if (controller.signal.aborted) throw createAbortError()
            setOriginalDocuments([...res.originalDocuments])
            setRerankedDocuments([...res.rerankedDocuments])
            setRanking([...res.ranking])
            setResult(res)
            setStatus('ready')
            onFinishRef.current?.(res)
            return res
          } catch (rawError) {
            const nextError = normalizeError(rawError)
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
      api,
      baseURL,
      credentials,
      defaultRequest,
      fetcher,
      reportRequest,
      reportResponse,
      requestInfo,
      status,
      timeoutMs
    ]
  )

  const handleSubmit = useCallback(
    async (
      event?: { preventDefault?: () => void },
      requestOptions: Partial<RerankRequest<TDocument>> = {}
    ) => {
      event?.preventDefault?.()
      const res = await rerankDocuments(inputRef.current, documentsRef.current, requestOptions)
      setInput('')
      return res
    },
    [rerankDocuments, setInput]
  )

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
    setQuery: setInput,
    handleInputChange,
    setDocuments,
    handleSubmit,
    clearError,
    clearTrace,
    clear,
    abortController
  }
}
