import type {
  ChatChunk,
  ChatRequest,
  ChatResumeRequest,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult
} from '../types'
import { AiHooksError } from '../types'
import { requestJson } from '../utils/fetch'
import { parseSSE } from '../utils/stream'
import type { ChatProvider } from './types'

interface UiStreamState {
  toolIndexes: Map<string, number>
  toolArgumentDeltas: Map<string, string>
  reasoningDeltas: Map<string, string>
}

type HeaderSource =
  | Record<string, string>
  | (() => Record<string, string> | Promise<Record<string, string>>)

type ProxyRequest = ChatRequest | ChatResumeRequest | CompletionRequest | EmbeddingRequest

type BodySource =
  | Record<string, unknown>
  | ((context: {
      kind: ProxyRequestKind
      request: ProxyRequest
    }) => Record<string, unknown> | Promise<Record<string, unknown>>)

export type ProxyRequestKind = 'chat' | 'completion' | 'embedding' | 'resume'

interface BaseProxyRequestContext {
  url: string
  headers: Record<string, string>
  body?: Record<string, unknown>
  credentials?: RequestCredentials
}

export type ProxyRequestContext =
  | (BaseProxyRequestContext & {
      kind: 'chat'
      request: ChatRequest
      body: Record<string, unknown>
    })
  | (BaseProxyRequestContext & {
      kind: 'completion'
      request: CompletionRequest
      body: Record<string, unknown>
    })
  | (BaseProxyRequestContext & {
      kind: 'embedding'
      request: EmbeddingRequest
      body: Record<string, unknown>
    })
  | (BaseProxyRequestContext & {
      kind: 'resume'
      request: ChatResumeRequest
    })

export interface ProxyRequestOverride {
  url?: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  credentials?: RequestCredentials
}

export interface ProxyProviderConfig {
  /** Stable provider id, useful when multiple app backends are wired in tests. */
  id?: string
  /** Optional base URL, e.g. `https://app.example.com`; relative URLs work by default. */
  baseURL?: string
  /** Chat endpoint. Defaults to `/api/ai/chat`. */
  chatUrl?: string
  /** Resume endpoint. Defaults to `/api/ai/chat/:id/stream`. */
  resumeUrl?: string | ((id: string) => string)
  /** Completion endpoint. Defaults to `/api/ai/completion`. */
  completionUrl?: string
  /** Embedding endpoint. Defaults to `/api/ai/embedding`. */
  embeddingUrl?: string
  /** Static or dynamic headers sent to your backend, not to upstream model APIs. */
  headers?: HeaderSource
  /** Extra app-defined JSON body fields merged into proxy POST requests. */
  body?: BodySource
  /** Last-mile hook for app-specific URL, header, body, or credentials changes. */
  prepareRequest?: (
    context: ProxyRequestContext
  ) => ProxyRequestOverride | void | Promise<ProxyRequestOverride | void>
  /** Browser credentials mode for same-origin session cookies. */
  credentials?: RequestCredentials
  /** Request timeout passed to the shared fetch wrapper. */
  timeoutMs?: number
  /** Custom fetch implementation for tests or non-browser runtimes. */
  fetch?: typeof fetch
}

/**
 * Provider for app-owned backend or edge proxy endpoints.
 *
 * The browser sends provider-agnostic request JSON to your backend. Your backend
 * keeps model credentials server-side and returns either SSE chunks or JSON.
 */
export function proxyProvider(config: ProxyProviderConfig = {}): ChatProvider {
  const {
    id = 'proxy',
    baseURL = '',
    chatUrl = '/api/ai/chat',
    resumeUrl = '/api/ai/chat/:id/stream',
    completionUrl = '/api/ai/completion',
    embeddingUrl = '/api/ai/embedding',
    credentials,
    timeoutMs,
    fetch: fetcher
  } = config

  async function resolveHeaders(requestHeaders?: Record<string, string>) {
    const configured =
      typeof config.headers === 'function' ? await config.headers() : (config.headers ?? {})
    return {
      'Content-Type': 'application/json',
      ...configured,
      ...requestHeaders
    }
  }

  async function resolveBody(kind: ProxyRequestKind, request: ProxyRequest) {
    const configured =
      typeof config.body === 'function' ? await config.body({ kind, request }) : (config.body ?? {})
    const {
      signal: _signal,
      headers: _headers,
      body: requestBody,
      ...body
    } = request as ProxyRequest & { body?: Record<string, unknown> }
    return {
      ...configured,
      ...requestBody,
      ...body
    }
  }
  async function prepare(context: ProxyRequestContext): Promise<ProxyRequestContext> {
    const override = await config.prepareRequest?.(context)
    return {
      ...context,
      ...override,
      headers: override?.headers ? { ...context.headers, ...override.headers } : context.headers
    }
  }
  async function post(
    kind: 'chat' | 'completion' | 'embedding',
    url: string,
    request: { signal?: AbortSignal; headers?: Record<string, string> }
  ) {
    const { signal, headers } = request
    const prepared = await prepare({
      kind,
      url,
      request: request as ProxyRequest,
      headers: await resolveHeaders(headers),
      body: await resolveBody(kind, request as ProxyRequest),
      credentials
    } as ProxyRequestContext)
    return requestJson(resolveUrl(baseURL, prepared.url), {
      method: 'POST',
      headers: prepared.headers,
      body: JSON.stringify(prepared.body),
      signal,
      credentials: prepared.credentials,
      timeoutMs,
      fetcher
    })
  }
  async function get(
    kind: 'resume',
    url: string,
    request: { signal?: AbortSignal; headers?: Record<string, string> }
  ) {
    const { signal, headers } = request
    const prepared = await prepare({
      kind,
      url,
      request: request as ProxyRequest,
      headers: await resolveHeaders(headers),
      credentials
    } as ProxyRequestContext)
    return requestJson(resolveUrl(baseURL, prepared.url), {
      method: 'GET',
      headers: prepared.headers,
      signal,
      credentials: prepared.credentials,
      timeoutMs,
      fetcher
    })
  }

  return {
    id,

    async chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>> {
      const response = await post('chat', chatUrl, request)
      return readChatChunks(response, request.signal)
    },

    async resumeChat(request: ChatResumeRequest): Promise<AsyncIterable<ChatChunk> | null> {
      const response = await get('resume', resolveResumeUrl(resumeUrl, request.id), request)
      if (response.status === 204) return null
      return readChatChunks(response, request.signal)
    },

    async completion(request: CompletionRequest): Promise<AsyncIterable<string>> {
      const response = await post('completion', completionUrl, request)

      if (isEventStream(response)) {
        return (async function* () {
          for await (const raw of parseSSE(response, request.signal)) {
            const text = completionText(raw)
            if (text) yield text
          }
        })()
      }

      const data = (await response.json()) as
        | string
        | string[]
        | { text?: string; completion?: string; chunks?: string[] }
      const chunks = completionChunks(data)
      return (async function* () {
        for (const chunk of chunks) if (chunk) yield chunk
      })()
    },

    async embedding(request: EmbeddingRequest): Promise<EmbeddingResult> {
      const response = await post('embedding', embeddingUrl, request)
      return (await response.json()) as EmbeddingResult
    }
  }
}

function resolveUrl(baseURL: string, url: string) {
  if (/^https?:\/\//.test(url) || !baseURL) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

function resolveResumeUrl(source: string | ((id: string) => string), id: string) {
  const url = typeof source === 'function' ? source(id) : source
  return url.replace(/:id\b/g, encodeURIComponent(id)).replace(/\{id\}/g, encodeURIComponent(id))
}

function isEventStream(response: Response) {
  return response.headers.get('content-type')?.includes('text/event-stream') ?? false
}

async function readChatChunks(response: Response, signal?: AbortSignal) {
  if (isEventStream(response)) {
    return (async function* () {
      const uiState: UiStreamState = {
        toolIndexes: new Map(),
        toolArgumentDeltas: new Map(),
        reasoningDeltas: new Map()
      }
      for await (const raw of parseSSE(response, signal)) {
        const chunks = toChatChunks(raw, uiState)
        for (const chunk of chunks) yield chunk
      }
    })()
  }

  const data = (await response.json()) as ChatChunk | ChatChunk[] | { chunks?: ChatChunk[] }
  const chunks = chatChunks(data)
  return (async function* () {
    for (const chunk of chunks) yield chunk
  })()
}

function chatChunks(value: ChatChunk | ChatChunk[] | { chunks?: ChatChunk[] }): ChatChunk[] {
  if (Array.isArray(value)) return value
  return 'chunks' in value && Array.isArray(value.chunks) ? value.chunks : [value as ChatChunk]
}

function completionChunks(value: string | string[] | { chunks?: string[] }) {
  if (Array.isArray(value)) return value
  return typeof value === 'object' && Array.isArray(value.chunks)
    ? value.chunks
    : [completionText(value)]
}

function completionText(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return undefined
  const item = value as { text?: unknown; completion?: unknown; content?: unknown }
  if (typeof item.text === 'string') return item.text
  if (typeof item.completion === 'string') return item.completion
  return typeof item.content === 'string' ? item.content : undefined
}

function toChatChunks(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  if (!isUiMessageStreamPart(raw)) return [raw as ChatChunk]

  const type = raw.type
  if (type === 'text-delta') {
    const delta = typeof raw.delta === 'string' ? raw.delta : ''
    return delta ? [{ content: delta }] : []
  }

  if (type === 'reasoning-start') {
    const id = typeof raw.id === 'string' ? raw.id : undefined
    if (id) state.reasoningDeltas.set(id, '')
    return []
  }

  if (type === 'reasoning-delta') {
    return reasoningDeltaChunk(raw, state)
  }

  if (type === 'reasoning-end') {
    const id = typeof raw.id === 'string' ? raw.id : undefined
    if (id) state.reasoningDeltas.delete(id)
    return []
  }

  if (type === 'finish') {
    return [
      {
        ...(typeof raw.finishReason === 'string'
          ? { finishReason: raw.finishReason as ChatChunk['finishReason'] }
          : {}),
        ...normalizeUsage(raw.totalUsage ?? raw.usage)
      }
    ]
  }

  if (type === 'error') {
    throw new AiHooksError(uiErrorMessage(raw), { cause: raw })
  }

  if (type === 'tool-input-start') {
    return toolInputStartChunk(raw, state)
  }

  if (type === 'tool-input-delta') {
    return toolInputDeltaChunk(raw, state)
  }

  if (type === 'tool-input-available') {
    return toolInputAvailableChunk(raw, state)
  }

  if (
    type === 'tool-output-available' ||
    type === 'tool-output-error' ||
    type === 'source-url' ||
    type === 'source-document' ||
    type === 'file' ||
    type.startsWith('data-')
  ) {
    return [uiDataChunk(raw)]
  }

  if (type === 'start' || type === 'start-step' || type === 'finish-step') {
    return raw.messageId || raw.id ? [{ metadata: { ...raw } }] : []
  }

  return []
}

function isUiMessageStreamPart(raw: Record<string, unknown>): raw is Record<string, unknown> & {
  type: string
} {
  return typeof raw.type === 'string'
}

function normalizeUsage(raw: unknown): Pick<ChatChunk, 'usage'> {
  if (!raw || typeof raw !== 'object') return {}
  const usage = raw as Record<string, unknown>
  const promptTokens = numberValue(usage.promptTokens ?? usage.inputTokens)
  const completionTokens = numberValue(usage.completionTokens ?? usage.outputTokens)
  const totalTokens = numberValue(usage.totalTokens)
  if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) {
    return {}
  }
  return {
    usage: {
      promptTokens: promptTokens ?? 0,
      completionTokens: completionTokens ?? 0,
      totalTokens: totalTokens ?? (promptTokens ?? 0) + (completionTokens ?? 0)
    }
  }
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function uiErrorMessage(raw: Record<string, unknown>) {
  if (typeof raw.errorText === 'string') return raw.errorText
  if (typeof raw.message === 'string') return raw.message
  if (typeof raw.error === 'string') return raw.error
  return 'AI SDK UI message stream returned an error part'
}

function toolIndex(id: string, state: UiStreamState) {
  const existing = state.toolIndexes.get(id)
  if (existing !== undefined) return existing
  const next = state.toolIndexes.size
  state.toolIndexes.set(id, next)
  return next
}

function toolInputStartChunk(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  const id = typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined
  const name = typeof raw.toolName === 'string' ? raw.toolName : undefined
  if (!id || !name) return []
  state.toolArgumentDeltas.set(id, '')
  return [
    {
      toolCalls: [
        {
          index: toolIndex(id, state),
          id,
          type: 'function',
          function: { name, arguments: '' }
        }
      ]
    }
  ]
}

function reasoningDeltaChunk(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  const id = typeof raw.id === 'string' ? raw.id : undefined
  const delta = typeof raw.delta === 'string' ? raw.delta : undefined
  if (!id || !delta) return []
  const text = `${state.reasoningDeltas.get(id) ?? ''}${delta}`
  state.reasoningDeltas.set(id, text)
  return [{ parts: [{ type: 'reasoning', id, text }] }]
}

function toolInputDeltaChunk(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  const id = typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined
  const delta = typeof raw.inputTextDelta === 'string' ? raw.inputTextDelta : undefined
  if (!id || !delta) return []
  state.toolArgumentDeltas.set(id, `${state.toolArgumentDeltas.get(id) ?? ''}${delta}`)
  return [
    {
      toolCalls: [
        {
          index: toolIndex(id, state),
          id,
          type: 'function',
          function: { arguments: delta }
        }
      ]
    }
  ]
}

function toolInputAvailableChunk(raw: Record<string, unknown>, state: UiStreamState): ChatChunk[] {
  const id = typeof raw.toolCallId === 'string' ? raw.toolCallId : undefined
  const name = typeof raw.toolName === 'string' ? raw.toolName : undefined
  if (!id || !name) return []

  const hasDelta = Boolean(state.toolArgumentDeltas.get(id))
  const input = hasDelta ? '' : stringifyToolInput(raw.input)
  return [
    {
      toolCalls: [
        {
          index: toolIndex(id, state),
          id,
          type: 'function',
          function: { name, arguments: input }
        }
      ]
    }
  ]
}

function stringifyToolInput(value: unknown) {
  if (value === undefined) return ''
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function uiDataChunk(raw: Record<string, unknown>): ChatChunk {
  const type = raw.type as string
  const data = type.startsWith('data-')
    ? raw.data
    : Object.fromEntries(Object.entries(raw).filter(([key]) => key !== 'type'))
  return {
    data,
    dataType: type,
    ...(typeof raw.id === 'string' ? { dataId: raw.id } : {}),
    ...(typeof raw.sourceId === 'string' ? { dataId: raw.sourceId } : {}),
    ...(typeof raw.toolCallId === 'string' ? { dataId: raw.toolCallId } : {}),
    ...(typeof raw.transient === 'boolean' ? { transient: raw.transient } : {})
  }
}
