import { AiHooksError, type AiRequestStatus } from '../types'

export type InspectionStatus = AiRequestStatus | 'idle'

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

export interface InspectRequestTraceOptions<TRequest = unknown, TResponse = unknown> {
  status?: InspectionStatus
  error?: unknown
  lastRequest?: TRequest | null
  lastResponse?: TResponse | null
  now?: Date | string | number
}

export interface RequestInspectionSnapshot<TRequest = unknown, TResponse = unknown> {
  status: InspectionStatus
  request: TRequest | null
  response: TResponse | null
  error: InspectionErrorSummary | null
  providerId?: string
  api?: string
  attempt?: number
  trigger?: string
  aiSdkTrigger?: string
  hasRequest: boolean
  hasResponse: boolean
  hasStream?: boolean
  retryable: boolean
  summary: string
  timestamp: string
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

  return {
    status,
    request,
    response,
    error,
    ...readStringFieldEntry(metadataSources, 'providerId', 'providerId'),
    ...readStringFieldEntry(metadataSources, 'api', 'api'),
    ...readNumberFieldEntry(metadataSources, 'attempt', 'attempt'),
    ...readStringFieldEntry(metadataSources, 'trigger', 'trigger'),
    ...readStringFieldEntry(metadataSources, 'aiSdkTrigger', 'aiSdkTrigger'),
    hasRequest: request !== null,
    hasResponse: response !== null,
    ...(hasStream !== undefined ? { hasStream } : {}),
    retryable,
    summary: createInspectionSummary(status, error, response !== null, request !== null, hasStream),
    timestamp: normalizeTimestamp(options.now)
  }
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
