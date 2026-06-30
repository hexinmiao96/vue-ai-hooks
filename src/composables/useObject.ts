import { ref, shallowRef, type Ref } from 'vue'
import type { ChatProvider } from '../providers/types'
import { proxyProvider, type ProxyProviderConfig } from '../providers/proxy'
import type {
  AiRequestStatus,
  ChatChunk,
  ChatRequest,
  IdGenerator,
  Message,
  ResponseFormat,
  RetryOptions,
  StreamThrottleOptions
} from '../types'
import { AiHooksError } from '../types'
import { createId } from '../utils/id'
import { cloneMessageSnapshot, cloneRequestSnapshot } from '../utils/lifecycle'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../utils/retry'
import { headersToRecord } from '../utils/headers'
import { mergeRequestBody } from '../utils/requestBody'
import { validateJsonSchema } from '../utils/jsonSchema'
import { createStreamUpdateThrottler, getThrottleMs } from '../utils/throttle'
import { createRequestTrace, type RequestTrace } from '../utils/trace'

export type DeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T

export interface ObjectRequestInfo {
  id: string
  providerId: string
  attempt: number
  api?: string
  credentials?: RequestCredentials
  request: ChatRequest
  messages: Message[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface ObjectResponseInfo extends ObjectRequestInfo {
  hasStream: boolean
}

export interface ObjectFinishInfo<T = unknown> {
  object: T
  text: string
  isAbort: boolean
  error: Error | undefined
}

export interface UseObjectOptions<T = unknown> extends RetryOptions, StreamThrottleOptions {
  provider?: ChatProvider
  transport?: ChatProvider
  api?: string
  baseURL?: string
  credentials?: RequestCredentials
  headers?: ProxyProviderConfig['headers']
  body?: ProxyProviderConfig['body']
  fetch?: typeof fetch
  id?: string
  schema: Record<string, unknown>
  schemaName?: string
  schemaDescription?: string
  strict?: boolean
  initialObject?: T | null
  initialValue?: DeepPartial<T> | null
  initialInput?: string
  defaultRequest?: Partial<ChatRequest>
  generateId?: IdGenerator
  onChunk?: (chunk: ChatChunk, text: string) => void
  onPartial?: (partialObject: DeepPartial<T>, text: string) => void
  onRequest?: (info: ObjectRequestInfo) => void
  onResponse?: (info: ObjectResponseInfo) => void
  onFinish?: (object: T, info: ObjectFinishInfo<T>) => void
  onError?: (err: Error) => void
}

export interface UseObjectReturn<T = unknown> {
  id: Ref<string>
  object: Ref<T | null>
  partialObject: Ref<DeepPartial<T> | null>
  text: Ref<string>
  input: Ref<string>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<ObjectRequestInfo | null>
  lastResponse: Ref<ObjectResponseInfo | null>
  submit: (prompt?: string | Message, options?: Partial<ChatRequest>) => Promise<T>
  stop: () => void
  setInput: (value: string) => void
  handleInputChange: (event: Event | { target?: { value?: unknown } } | string) => void
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: Partial<ChatRequest>
  ) => Promise<T>
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

interface ObjectState<T> extends RequestTrace<ObjectRequestInfo, ObjectResponseInfo> {
  initialObject: T | null
  initialPartialObject: DeepPartial<T> | null
  object: Ref<T | null>
  partialObject: Ref<DeepPartial<T> | null>
  text: Ref<string>
  input: Ref<string>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  abortController: Ref<AbortController | null>
}

const objectStates = new Map<string, ObjectState<unknown>>()

function getObjectState<T>(
  id: string,
  initialObject: T | null,
  initialPartialObject: DeepPartial<T> | null,
  initialInput: string
): ObjectState<T> {
  const existing = objectStates.get(id)
  if (existing) return existing as ObjectState<T>

  const state: ObjectState<T> = {
    initialObject,
    initialPartialObject,
    object: ref(initialObject) as Ref<T | null>,
    partialObject: ref(initialPartialObject) as Ref<DeepPartial<T> | null>,
    text: ref(''),
    input: ref(initialInput),
    status: ref<AiRequestStatus>('ready'),
    isLoading: ref(false),
    error: ref<Error | null>(null),
    ...createRequestTrace<ObjectRequestInfo, ObjectResponseInfo>(),
    abortController: shallowRef<AbortController | null>(null)
  }
  objectStates.set(id, state as ObjectState<unknown>)
  return state
}

/**
 * Vue 3 composable for JSON Schema-backed structured chat output.
 */
export function useObject<T = unknown>(options: UseObjectOptions<T>): UseObjectReturn<T> {
  const {
    provider: providedProvider,
    transport,
    api,
    credentials,
    id: explicitId,
    schema,
    schemaName = 'object',
    schemaDescription,
    strict = true,
    initialObject = null,
    initialValue,
    initialInput = '',
    defaultRequest = {},
    generateId = createId,
    onChunk,
    onPartial,
    onRequest,
    onResponse,
    onFinish,
    onError
  } = options
  const provider =
    providedProvider ??
    transport ??
    proxyProvider({
      ...options,
      id: undefined,
      chatUrl: api ?? '/api/object'
    })
  const requestApi = providedProvider || transport ? undefined : (api ?? '/api/object')
  const requestCredentials = providedProvider || transport ? undefined : credentials
  const proxyRequestInfo = requestApi ? { api: requestApi, credentials: requestCredentials } : {}

  const id = ref(explicitId || generateId('object'))
  const initialPartialObject =
    initialValue === undefined ? (initialObject as DeepPartial<T> | null) : initialValue
  const state = getObjectState(id.value, initialObject, initialPartialObject, initialInput)
  const {
    object,
    partialObject,
    text,
    input,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    clearTrace,
    abortController
  } = state

  function stop() {
    if (abortController.value) abortController.value.abort()
    abortController.value = null
    isLoading.value = false
    status.value = 'ready'
  }

  function clear() {
    stop()
    object.value = state.initialObject
    partialObject.value = state.initialPartialObject
    text.value = ''
    input.value = ''
    error.value = null
    clearTrace()
    status.value = 'ready'
  }

  function clearError() {
    error.value = null
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

  function responseFormat(): ResponseFormat {
    const jsonSchema: ResponseFormat = {
      type: 'json_schema',
      json_schema: {
        name: schemaName,
        schema,
        strict
      }
    }
    if (schemaDescription) {
      jsonSchema.json_schema.description = schemaDescription
    }
    return jsonSchema
  }

  function promptToMessage(prompt: string | Message): Message {
    if (typeof prompt !== 'string') {
      return { ...prompt, id: prompt.id || generateId(prompt.role) }
    }
    return { id: generateId('user'), role: 'user', content: prompt, createdAt: new Date() }
  }

  function parseObject(raw: string): T {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch (err) {
      throw new AiHooksError('Structured output was not valid JSON', { cause: err })
    }
    const validationError = validateJsonSchema(parsed, schema)
    if (validationError) {
      throw new AiHooksError(`Structured output did not match schema: ${validationError}`)
    }
    return parsed as T
  }

  function parsePartialObject(raw: string): DeepPartial<T> | null {
    for (const candidate of [raw.trim(), repairPartialJson(raw)]) {
      if (!candidate) continue
      try {
        const parsed = JSON.parse(candidate) as unknown
        if (typeof parsed === 'object' && parsed !== null) return parsed as DeepPartial<T>
      } catch {
        // Keep the previous partial object until enough JSON has streamed in.
      }
    }
    return null
  }

  function normalizeError(err: unknown): Error {
    return err instanceof Error ? err : new Error(String(err))
  }

  function requestInfo(request: ChatRequest, attempt: number): ObjectRequestInfo {
    return {
      id: request.id ?? id.value,
      providerId: provider.id,
      attempt,
      ...proxyRequestInfo,
      request: cloneRequestSnapshot(request),
      messages: request.messages.map(cloneMessageSnapshot),
      requestMetadata: request.metadata,
      ...(request.body ? { body: { ...request.body } } : {}),
      ...(request.headers ? { headers: headersToRecord(request.headers) } : {})
    }
  }

  function reportRequest(info: ObjectRequestInfo) {
    state.recordRequest(info)
    onRequest?.(info)
  }

  function reportResponse(info: ObjectRequestInfo, stream: AsyncIterable<ChatChunk>) {
    const response = state.recordResponse({
      ...info,
      hasStream: Boolean(stream)
    })
    onResponse?.(response)
  }

  function createAbortError(): Error {
    const e = new Error('Structured output request was aborted')
    e.name = 'AbortError'
    return e
  }

  async function submit(prompt?: string | Message, requestOptions: Partial<ChatRequest> = {}) {
    const finalPrompt = prompt ?? input.value
    const defaultMessages = defaultRequest.messages ?? []
    const requestMessages = requestOptions.messages

    if (!finalPrompt && !requestMessages?.length) {
      throw new Error('submit() requires a prompt, input.value, or request messages')
    }

    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    object.value = state.initialObject
    partialObject.value = state.initialPartialObject
    text.value = ''
    status.value = 'submitted'

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        let receivedChunk = false
        let nextText = ''
        let nextPartialObject = state.initialPartialObject
        let hasPartialObject = state.initialPartialObject !== null
        let pendingPartial = false
        const throttler = createStreamUpdateThrottler(getThrottleMs(options), () => {
          text.value = nextText
          if (hasPartialObject) {
            partialObject.value = nextPartialObject
            if (pendingPartial && nextPartialObject) {
              onPartial?.(nextPartialObject, nextText)
              pendingPartial = false
            }
          }
        })
        try {
          const { messages: _defaultMessages, ...defaultRest } = defaultRequest
          const { messages: _requestMessages, ...requestRest } = requestOptions
          const messages = requestMessages ?? [
            ...defaultMessages,
            promptToMessage(finalPrompt as string | Message)
          ]
          const body = mergeRequestBody(defaultRequest.body, requestOptions.body)
          const request: ChatRequest = {
            ...defaultRest,
            ...requestRest,
            ...(body ? { body } : {}),
            messages,
            responseFormat: responseFormat(),
            signal: controller.signal,
            stream: true
          }
          const info = requestInfo(request, retryAttempt + 1)
          reportRequest(info)
          const stream = await provider.chat(request)
          reportResponse(info, stream)

          for await (const chunk of stream) {
            if (controller.signal.aborted) break
            if (status.value === 'submitted') status.value = 'streaming'
            receivedChunk = true
            if (chunk.content) {
              nextText += chunk.content
              const parsedPartial = parsePartialObject(nextText)
              if (parsedPartial) {
                nextPartialObject = parsedPartial
                hasPartialObject = true
                pendingPartial = true
              }
              throttler.schedule()
            }
            onChunk?.(chunk, nextText)
          }
          throttler.flush()

          if (controller.signal.aborted) {
            throw createAbortError()
          }

          const finalObject = parseObject(nextText)
          object.value = finalObject
          partialObject.value = finalObject as DeepPartial<T>
          text.value = nextText
          status.value = 'ready'
          onFinish?.(finalObject, {
            object: finalObject,
            text: nextText,
            isAbort: false,
            error: undefined
          })
          return finalObject
        } catch (err) {
          const e = normalizeError(err)
          if ((e as { name?: string }).name === 'AbortError' || controller.signal.aborted) {
            throttler.flush()
            status.value = 'error'
            error.value = e
            onError?.(e)
            throw e
          }
          throttler.flush()
          const context = createRetryContext(e, retryAttempt + 1, maxRetries)
          if (!receivedChunk && (await canRetry(options, context))) {
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
    requestOptions: Partial<ChatRequest> = {}
  ) {
    event?.preventDefault?.()
    const result = await submit(input.value, requestOptions)
    input.value = ''
    return result
  }

  return {
    id,
    object,
    partialObject,
    text,
    input,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    submit,
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

function repairPartialJson(raw: string): string | null {
  const trimmed = raw.trim()
  const objectStart = trimmed.indexOf('{')
  const arrayStart = trimmed.indexOf('[')
  const start =
    objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart)
  if (start < 0) return null

  let candidate = trimmed.slice(start)
  const closers: string[] = []
  let inString = false
  let escaped = false

  for (const char of candidate) {
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === '{') {
      closers.push('}')
    } else if (char === '[') {
      closers.push(']')
    } else if (char === '}' || char === ']') {
      const expected = closers.pop()
      if (expected !== char) return null
    }
  }

  if (inString) candidate += '"'

  // Drop an unfinished key or dangling comma before closing containers.
  candidate = candidate
    .replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, '')
    .replace(/((?:[{,]|\[)\s*)"(?:[^"\\]|\\.)*"\s*$/, '$1')
    .replace(/,\s*$/, '')
    .trimEnd()
  if (!candidate) return null

  return `${candidate}${[...closers].reverse().join('')}`
}
