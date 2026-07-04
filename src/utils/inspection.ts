import { AiHooksError, type AiRequestStatus, type RetryContext, type RetryOptions } from '../types'

export type InspectionStatus =
  AiRequestStatus | 'idle' | 'running' | 'interrupted' | 'completed' | 'aborted'

export type InspectionErrorCategory =
  | 'abort'
  | 'authentication'
  | 'authorization'
  | 'rate-limit'
  | 'timeout'
  | 'network'
  | 'provider'
  | 'validation'
  | 'unknown'

export interface InspectionErrorSummary {
  category: InspectionErrorCategory
  message: string
  name?: string
  status?: number
  retryable: boolean
  hasCause: boolean
}

export type InspectionTimelineEventKind =
  'request' | 'response' | 'stream' | 'retry' | 'error' | 'status'

export interface InspectionTimelineEventInput {
  kind: InspectionTimelineEventKind
  label?: string
  timestamp?: Date | string | number
  attempt?: number
  status?: InspectionStatus
  category?: InspectionErrorCategory
  message?: string
  metadata?: Record<string, unknown>
}

export interface InspectionTimelineEvent extends Omit<InspectionTimelineEventInput, 'timestamp'> {
  timestamp: string
}

export interface InspectionRetryRecordInput {
  attempt: number
  maxRetries?: number
  delayMs?: number
  error: unknown
  timestamp?: Date | string | number
}

export interface InspectionRetryRecord {
  attempt: number
  maxRetries?: number
  delayMs?: number
  error: InspectionErrorSummary
  timestamp: string
}

export interface InspectionProviderTrace {
  providerId?: string
  api?: string
  attempt?: number
  trigger?: string
  aiSdkTrigger?: string
  hasStream?: boolean
  traceId?: string
  requestKeys: string[]
  responseKeys: string[]
}

export interface InspectionCurlOptions {
  command?: string
  api?: string
  method?: string
  headers?: unknown
  body?: unknown
  redactHeaders?: readonly string[]
}

export interface InspectRequestTraceOptions<TRequest = unknown, TResponse = unknown> {
  status?: InspectionStatus
  error?: unknown
  lastRequest?: TRequest | null
  lastResponse?: TResponse | null
  events?: readonly InspectionTimelineEventInput[]
  retries?: readonly InspectionRetryRecordInput[]
  curl?: boolean | InspectionCurlOptions
  now?: Date | string | number
}

export interface RequestInspectionSnapshot<TRequest = unknown, TResponse = unknown> {
  status: InspectionStatus
  request: TRequest | null
  response: TResponse | null
  error: InspectionErrorSummary | null
  traceId?: string
  providerId?: string
  api?: string
  attempt?: number
  trigger?: string
  aiSdkTrigger?: string
  hasRequest: boolean
  hasResponse: boolean
  hasStream?: boolean
  providerTrace: InspectionProviderTrace
  timeline: InspectionTimelineEvent[]
  retries: InspectionRetryRecord[]
  curl: string | null
  retryable: boolean
  summary: string
  timestamp: string
}

interface InspectionRecordRefs {
  events: { value: InspectionTimelineEventInput[] }
  retries: { value: InspectionRetryRecordInput[] }
}

interface InspectionRecordSetters {
  setEvents: (
    updater: (current: InspectionTimelineEventInput[]) => InspectionTimelineEventInput[]
  ) => void
  setRetries: (
    updater: (current: InspectionRetryRecordInput[]) => InspectionRetryRecordInput[]
  ) => void
}

interface InspectionRetryAttemptOptions {
  retryDelayMs?: RetryOptions['retryDelayMs']
  status?: InspectionStatus
  hasResponse?: boolean
}

const DEFAULT_REDACTED_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'openai-api-key',
  'anthropic-api-key',
  'x-goog-api-key'
]
const DEFAULT_REDACTED_FIELDS = [
  ...DEFAULT_REDACTED_HEADERS,
  'accessToken',
  'authToken',
  'bearerToken',
  'clientSecret',
  'credential',
  'credentials',
  'idToken',
  'passphrase',
  'password',
  'privateKey',
  'refreshToken',
  'secret',
  'sessionToken',
  'token',
  'upstreamApiKey'
]

export function clearInspectionRecords(records: InspectionRecordRefs) {
  records.events.value = []
  records.retries.value = []
}

export function clearInspectionState(records: InspectionRecordSetters) {
  records.setEvents(() => [])
  records.setRetries(() => [])
}

export function recordInspectionEvent(
  records: InspectionRecordRefs,
  event: InspectionTimelineEventInput
) {
  records.events.value = [
    ...records.events.value,
    { ...event, timestamp: event.timestamp ?? new Date() }
  ]
}

export function recordInspectionStateEvent(
  records: InspectionRecordSetters,
  event: InspectionTimelineEventInput
) {
  records.setEvents((current) => [
    ...current,
    { ...event, timestamp: event.timestamp ?? new Date() }
  ])
}

export function recordInspectionRetry(
  records: InspectionRecordRefs,
  errorToRecord: unknown,
  context: RetryContext,
  retryDelayMs?: RetryOptions['retryDelayMs']
) {
  const delayMs = typeof retryDelayMs === 'function' ? retryDelayMs(context) : (retryDelayMs ?? 0)
  records.retries.value = [
    ...records.retries.value,
    {
      attempt: context.attempt,
      maxRetries: context.maxRetries,
      error: errorToRecord,
      delayMs,
      timestamp: new Date()
    }
  ]
}

export function recordInspectionStateRetry(
  records: InspectionRecordSetters,
  errorToRecord: unknown,
  context: RetryContext,
  retryDelayMs?: RetryOptions['retryDelayMs']
) {
  const delayMs = typeof retryDelayMs === 'function' ? retryDelayMs(context) : (retryDelayMs ?? 0)
  records.setRetries((current) => [
    ...current,
    {
      attempt: context.attempt,
      maxRetries: context.maxRetries,
      error: errorToRecord,
      delayMs,
      timestamp: new Date()
    }
  ])
}

export function recordInspectionRetryAttempt(
  records: InspectionRecordRefs,
  errorToRecord: unknown,
  context: RetryContext,
  options: InspectionRetryAttemptOptions = {}
) {
  recordInspectionEvent(records, {
    kind: 'retry',
    label: 'retry planned',
    attempt: context.attempt,
    status: options.status,
    metadata: {
      maxRetries: context.maxRetries,
      hasResponse: options.hasResponse ?? false
    }
  })
  recordInspectionRetry(records, errorToRecord, context, options.retryDelayMs)
}

export function recordInspectionStateRetryAttempt(
  records: InspectionRecordSetters,
  errorToRecord: unknown,
  context: RetryContext,
  options: InspectionRetryAttemptOptions = {}
) {
  recordInspectionStateEvent(records, {
    kind: 'retry',
    label: 'retry planned',
    attempt: context.attempt,
    status: options.status,
    metadata: {
      maxRetries: context.maxRetries,
      hasResponse: options.hasResponse ?? false
    }
  })
  recordInspectionStateRetry(records, errorToRecord, context, options.retryDelayMs)
}

export function classifyInspectionError(error: unknown): InspectionErrorSummary | null {
  if (error == null) return null

  const message =
    error instanceof Error ? error.message : (readStringValue(error, 'message') ?? String(error))
  const name = error instanceof Error ? error.name : readStringValue(error, 'name')
  const status = error instanceof AiHooksError ? error.status : readNumberField(error, 'status')
  const hasCause = isRecord(error) && 'cause' in error && error.cause !== undefined
  const category = categorizeInspectionError({ message, name, status })
  const retryable = isRetryableInspectionError(category, status)

  return {
    category,
    message,
    ...(name ? { name } : {}),
    ...(status !== undefined ? { status } : {}),
    retryable,
    hasCause
  }
}

export function inspectRequestTrace<TRequest = unknown, TResponse = unknown>(
  options: InspectRequestTraceOptions<TRequest, TResponse>
): RequestInspectionSnapshot<TRequest, TResponse> {
  const request = options.lastRequest ?? null
  const response = options.lastResponse ?? null
  const error = classifyInspectionError(options.error)
  const requestRecord = isRecord(request) ? request : undefined
  const responseRecord = isRecord(response) ? response : undefined
  const metadataSources = [requestRecord, responseRecord] as const
  const status =
    options.status ?? (error ? 'error' : response ? 'ready' : request ? 'submitted' : 'idle')
  const hasStream = readBooleanField(response, 'hasStream')
  const retryable = error?.retryable ?? false
  const timestamp = normalizeTimestamp(options.now)
  const retries = normalizeRetryRecords(options.retries, timestamp)
  const providerTrace = createInspectionProviderTrace(metadataSources, hasStream)
  const traceId = readTraceId(metadataSources)
  const curl =
    options.curl === undefined || options.curl === false
      ? null
      : createInspectionCurl(request, options.curl === true ? {} : options.curl)
  const safeRequest = sanitizeInspectionValue(request)
  const safeResponse = sanitizeInspectionValue(response)

  return {
    status,
    request: safeRequest,
    response: safeResponse,
    error,
    ...(traceId !== undefined ? { traceId } : {}),
    ...readStringFieldEntry(metadataSources, 'providerId', 'providerId'),
    ...readStringFieldEntry(metadataSources, 'api', 'api'),
    ...readNumberFieldEntry(metadataSources, 'attempt', 'attempt'),
    ...readStringFieldEntry(metadataSources, 'trigger', 'trigger'),
    ...readStringFieldEntry(metadataSources, 'aiSdkTrigger', 'aiSdkTrigger'),
    hasRequest: request !== null,
    hasResponse: response !== null,
    ...(hasStream !== undefined ? { hasStream } : {}),
    providerTrace,
    timeline: createInspectionTimeline({
      status,
      error,
      request,
      response,
      retries,
      events: options.events,
      timestamp,
      hasStream
    }),
    retries,
    curl,
    retryable,
    summary: createInspectionSummary(status, error, response !== null, request !== null, hasStream),
    timestamp
  }
}

export function createInspectionCurl(
  request: unknown,
  options: InspectionCurlOptions = {}
): string | null {
  const requestRecord = isRecord(request) ? request : undefined
  const api =
    options.api ?? readStringValue(requestRecord, 'api') ?? readStringValue(requestRecord, 'url')
  if (!api) return null

  const method = (
    options.method ??
    readStringValue(requestRecord, 'method') ??
    (options.body !== undefined || requestRecord?.body !== undefined ? 'POST' : 'GET')
  ).toUpperCase()
  const headers = sanitizeHeaders(
    options.headers ?? requestRecord?.headers,
    options.redactHeaders ?? DEFAULT_REDACTED_HEADERS
  )
  const body = sanitizeBodySnapshot(options.body ?? requestRecord?.body)
  const command = options.command ?? 'curl'
  const parts = [`${command} -X ${quoteShell(method)} ${quoteShell(api)}`]

  for (const [name, value] of headers) {
    parts.push(`-H ${quoteShell(`${name}: ${value}`)}`)
  }
  if (body !== undefined) {
    parts.push(`--data-raw ${quoteShell(formatCurlBody(body))}`)
  }

  return parts.map((part, index) => `${index === 0 ? '' : '  '}${part}`).join(' \\\n')
}

function categorizeInspectionError(options: {
  message: string
  name?: string
  status?: number
}): InspectionErrorCategory {
  const text = `${options.name ?? ''} ${options.message}`.toLowerCase()
  if (options.name === 'AbortError' || text.includes('aborted')) return 'abort'
  if (options.status === 401) return 'authentication'
  if (options.status === 403) return 'authorization'
  if (options.status === 429) return 'rate-limit'
  if (options.status === 408 || text.includes('timeout') || text.includes('timed out')) {
    return 'timeout'
  }
  if (options.status && options.status >= 500) return 'provider'
  if (options.status && [400, 404, 409, 422].includes(options.status)) return 'validation'
  if (text.includes('network') || text.includes('fetch') || text.includes('cors')) return 'network'
  if (text.includes('schema') || text.includes('json') || text.includes('validat')) {
    return 'validation'
  }
  if (options.status) return 'provider'
  return 'unknown'
}

function isRetryableInspectionError(
  category: InspectionErrorCategory,
  status: number | undefined
): boolean {
  if (category === 'abort' || category === 'authentication' || category === 'authorization') {
    return false
  }
  if (status !== undefined) {
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
  }
  return category === 'network' || category === 'timeout' || category === 'provider'
}

function createInspectionSummary(
  status: InspectionStatus,
  error: InspectionErrorSummary | null,
  hasResponse: boolean,
  hasRequest: boolean,
  hasStream: boolean | undefined
): string {
  if (error) return `${error.category}: ${error.message}`
  if (hasResponse)
    return hasStream === false ? 'response received without stream' : 'response received'
  if (hasRequest) return `request ${status}`
  return 'no request recorded'
}

function createInspectionProviderTrace(
  metadataSources: readonly (Record<string, unknown> | undefined)[],
  hasStream: boolean | undefined
): InspectionProviderTrace {
  const requestRecord = metadataSources[0]
  const responseRecord = metadataSources[1]
  const traceId = readTraceId(metadataSources)

  return {
    ...(traceId ? { traceId } : {}),
    ...readStringFieldEntry(metadataSources, 'providerId', 'providerId'),
    ...readStringFieldEntry(metadataSources, 'api', 'api'),
    ...readNumberFieldEntry(metadataSources, 'attempt', 'attempt'),
    ...readStringFieldEntry(metadataSources, 'trigger', 'trigger'),
    ...readStringFieldEntry(metadataSources, 'aiSdkTrigger', 'aiSdkTrigger'),
    ...(hasStream !== undefined ? { hasStream } : {}),
    requestKeys: requestRecord ? Object.keys(requestRecord).sort() : [],
    responseKeys: responseRecord ? Object.keys(responseRecord).sort() : []
  }
}

function createInspectionTimeline(options: {
  status: InspectionStatus
  error: InspectionErrorSummary | null
  request: unknown
  response: unknown
  retries: readonly InspectionRetryRecord[]
  events?: readonly InspectionTimelineEventInput[]
  timestamp: string
  hasStream: boolean | undefined
}): InspectionTimelineEvent[] {
  const events: InspectionTimelineEvent[] = []
  const requestAttempt = readNumberField(options.request, 'attempt')
  const responseAttempt = readNumberField(options.response, 'attempt')

  const hasRequestEvent = (options.events ?? []).some((event) => event.kind === 'request')
  const hasResponseEvent = (options.events ?? []).some((event) => event.kind === 'response')

  if (options.request !== null && !hasRequestEvent) {
    events.push({
      kind: 'request',
      label: 'request prepared',
      timestamp: options.timestamp,
      status: options.status,
      ...(requestAttempt !== undefined ? { attempt: requestAttempt } : {})
    })
  }

  for (const retry of options.retries) {
    events.push({
      kind: 'retry',
      label: `retry attempt ${retry.attempt}`,
      timestamp: retry.timestamp,
      attempt: retry.attempt,
      category: retry.error.category,
      message: retry.error.message,
      ...(retry.delayMs !== undefined ? { metadata: { delayMs: retry.delayMs } } : {})
    })
  }

  if (options.response !== null && !hasResponseEvent) {
    events.push({
      kind: 'response',
      label: options.hasStream === false ? 'response received without stream' : 'response received',
      timestamp: options.timestamp,
      status: options.status,
      ...(responseAttempt !== undefined ? { attempt: responseAttempt } : {})
    })
  }

  for (const event of options.events ?? []) {
    events.push(normalizeTimelineEvent(event, options.timestamp))
  }

  if (options.error) {
    events.push({
      kind: 'error',
      label: options.error.category,
      timestamp: options.timestamp,
      category: options.error.category,
      message: options.error.message
    })
  }

  if (!events.length && options.status !== 'idle') {
    events.push({
      kind: 'status',
      label: `status ${options.status}`,
      timestamp: options.timestamp,
      status: options.status
    })
  }

  return sortTimeline(events)
}

function normalizeTimelineEvent(
  event: InspectionTimelineEventInput,
  fallbackTimestamp: string
): InspectionTimelineEvent {
  const metadata =
    event.metadata === undefined ? undefined : sanitizeInspectionValue(event.metadata)

  return {
    ...event,
    ...(metadata !== undefined ? { metadata } : {}),
    timestamp: normalizeTimestamp(event.timestamp ?? fallbackTimestamp)
  }
}

function normalizeRetryRecords(
  retries: readonly InspectionRetryRecordInput[] | undefined,
  fallbackTimestamp: string
): InspectionRetryRecord[] {
  return (retries ?? []).map((retry) => {
    const error = isInspectionErrorSummary(retry.error)
      ? retry.error
      : (classifyInspectionError(retry.error) ?? {
          category: 'unknown',
          message: 'Unknown retry error',
          retryable: false,
          hasCause: false
        })
    return {
      attempt: retry.attempt,
      ...(retry.maxRetries !== undefined ? { maxRetries: retry.maxRetries } : {}),
      ...(retry.delayMs !== undefined ? { delayMs: retry.delayMs } : {}),
      error,
      timestamp: normalizeTimestamp(retry.timestamp ?? fallbackTimestamp)
    }
  })
}

function sortTimeline(events: InspectionTimelineEvent[]): InspectionTimelineEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const time = Date.parse(a.event.timestamp) - Date.parse(b.event.timestamp)
      return time || a.index - b.index
    })
    .map(({ event }) => event)
}

function normalizeTimestamp(value: Date | string | number | undefined): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return new Date(value).toISOString()
  if (typeof value === 'number') return new Date(value).toISOString()
  return new Date().toISOString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumberField(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) return undefined
  const field = value[key]
  return typeof field === 'number' ? field : undefined
}

function readBooleanField(value: unknown, key: string): boolean | undefined {
  if (!isRecord(value)) return undefined
  const field = value[key]
  return typeof field === 'boolean' ? field : undefined
}

function readStringValue(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined
  const field = value[key]
  return typeof field === 'string' ? field : undefined
}

function isInspectionErrorSummary(value: unknown): value is InspectionErrorSummary {
  return (
    isRecord(value) &&
    typeof value.category === 'string' &&
    typeof value.message === 'string' &&
    typeof value.retryable === 'boolean' &&
    typeof value.hasCause === 'boolean'
  )
}

function sanitizeHeaders(headers: unknown, redactedHeaders: readonly string[]): [string, string][] {
  return headerEntries(headers).map(([name, value]) => [
    name,
    isSensitiveInspectionKey(name, redactedHeaders) ? '[redacted]' : value
  ])
}

function sanitizeInspectionValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInspectionValue(item)) as T
  }
  if (typeof Headers !== 'undefined' && value instanceof Headers) {
    return new Headers(sanitizeHeaders(value, DEFAULT_REDACTED_HEADERS)) as T
  }
  if (!isPlainRecord(value)) return value

  const sanitized: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(value)) {
    sanitized[key] = isSensitiveInspectionFieldKey(key)
      ? '[redacted]'
      : key.toLowerCase() === 'headers'
        ? sanitizeHeaderSnapshot(field)
        : key.toLowerCase() === 'body'
          ? sanitizeBodySnapshot(field)
          : sanitizeInspectionValue(field)
  }
  return sanitized as T
}

function sanitizeBodySnapshot(body: unknown): unknown {
  if (typeof body !== 'string') return sanitizeInspectionValue(body)

  const trimmed = body.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return body

  try {
    return JSON.stringify(sanitizeInspectionValue(JSON.parse(body)))
  } catch {
    return body
  }
}

function sanitizeHeaderSnapshot(headers: unknown): unknown {
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return new Headers(sanitizeHeaders(headers, DEFAULT_REDACTED_HEADERS))
  }
  if (Array.isArray(headers)) {
    return sanitizeHeaders(headers, DEFAULT_REDACTED_HEADERS)
  }
  if (isRecord(headers)) {
    return Object.fromEntries(sanitizeHeaders(headers, DEFAULT_REDACTED_HEADERS))
  }
  return headers
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isSensitiveInspectionKey(
  key: string,
  redactedHeaders: readonly string[] = DEFAULT_REDACTED_HEADERS
): boolean {
  const normalized = normalizeInspectionKey(key)
  return redactedHeaders.some((header) => normalizeInspectionKey(header) === normalized)
}

function isSensitiveInspectionFieldKey(key: string): boolean {
  const normalized = normalizeInspectionKey(key)
  return (
    DEFAULT_REDACTED_FIELDS.some((field) => normalizeInspectionKey(field) === normalized) ||
    ['apikey', 'token', 'secret', 'privatekey'].some((suffix) => normalized.endsWith(suffix))
  )
}

function normalizeInspectionKey(key: string): string {
  return key.replace(/[-_\s]/g, '').toLowerCase()
}

function headerEntries(headers: unknown): [string, string][] {
  if (!headers) return []
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return [...headers.entries()]
  }
  if (Array.isArray(headers)) {
    return headers.flatMap((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return []
      const [name, value] = entry
      return typeof name === 'string' ? [[name, String(value)] as [string, string]] : []
    })
  }
  if (!isRecord(headers)) return []
  return Object.entries(headers).flatMap(([name, value]) =>
    value === undefined ? [] : ([[name, String(value)]] as [string, string][])
  )
}

function formatCurlBody(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body)
}

function quoteShell(value: string): string {
  return `'${value.split("'").join("'\"'\"'")}'`
}

function readStringFieldEntry(
  values: readonly (Record<string, unknown> | undefined)[],
  sourceKey: string,
  targetKey: string
): Record<string, string> {
  const field = readFirstField(values, sourceKey, 'string')
  return typeof field === 'string' ? { [targetKey]: field } : {}
}

function readNumberFieldEntry(
  values: readonly (Record<string, unknown> | undefined)[],
  sourceKey: string,
  targetKey: string
): Record<string, number> {
  const field = readFirstField(values, sourceKey, 'number')
  return typeof field === 'number' ? { [targetKey]: field } : {}
}

function readFirstField(
  values: readonly (Record<string, unknown> | undefined)[],
  key: string,
  type: 'number' | 'string'
): number | string | undefined {
  for (const value of values) {
    const field = value?.[key]
    if (type === 'string' && typeof field === 'string') return field
    if (type === 'number' && typeof field === 'number') return field
  }
  return undefined
}

function readTraceId(values: readonly (Record<string, unknown> | undefined)[]): string | undefined {
  for (const value of values) {
    const directTraceId = readStringValue(value, 'traceId')
    if (directTraceId) return directTraceId

    const metadata = value?.metadata
    if (isRecord(metadata)) {
      const metadataTraceId = readStringValue(metadata, 'traceId')
      if (metadataTraceId) return metadataTraceId
    }

    const requestMetadata = value?.requestMetadata
    if (isRecord(requestMetadata)) {
      const requestMetadataTraceId = readStringValue(requestMetadata, 'traceId')
      if (requestMetadataTraceId) return requestMetadataTraceId
    }

    const body = value?.body
    if (isRecord(body)) {
      const bodyTraceId = readStringValue(body, 'traceId')
      if (bodyTraceId) return bodyTraceId
    }
  }

  return undefined
}
