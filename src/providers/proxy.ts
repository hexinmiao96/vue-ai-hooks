import type {
  ChatChunk,
  ChatRequest,
  ChatResumeRequest,
  ChatStreamProtocol,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult
} from '../types'
import { requestJson } from '../utils/fetch'
import { mergeHeaders } from '../utils/headers'
import { parseSSE, readUIMessageStream } from '../utils/stream'
import type { ChatProvider } from './types'

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)

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
  headers?: HeadersInit
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

  async function resolveHeaders(requestHeaders?: HeadersInit) {
    const configured =
      typeof config.headers === 'function' ? await config.headers() : (config.headers ?? {})
    return mergeHeaders({ 'Content-Type': 'application/json' }, configured, requestHeaders)
  }

  async function resolveBody(kind: ProxyRequestKind, request: ProxyRequest) {
    const configured =
      typeof config.body === 'function' ? await config.body({ kind, request }) : (config.body ?? {})
    const {
      signal: _signal,
      headers: _headers,
      activeTools: _activeTools,
      body: requestBody,
      ...body
    } = request as ProxyRequest & { activeTools?: string[]; body?: Record<string, unknown> }
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
      headers: override?.headers ? mergeHeaders(context.headers, override.headers) : context.headers
    }
  }
  async function post(
    kind: 'chat' | 'completion' | 'embedding',
    url: string,
    request: { signal?: AbortSignal; headers?: HeadersInit }
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
    request: { signal?: AbortSignal; headers?: HeadersInit }
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
      return readChatChunks(response, request.signal, request.streamProtocol)
    },

    async resumeChat(request: ChatResumeRequest): Promise<AsyncIterable<ChatChunk> | null> {
      const response = await get('resume', resolveResumeUrl(resumeUrl, request.id), request)
      if (response.status === 204) return null
      return readChatChunks(response, request.signal, request.streamProtocol)
    },

    async completion(request: CompletionRequest): Promise<AsyncIterable<string>> {
      const response = await post('completion', completionUrl, request)

      if (request.streamProtocol === 'text' || isTextResponse(response)) {
        return readTextChunks(response, request.signal)
      }

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

function isTextResponse(response: Response) {
  return response.headers.get('content-type')?.includes('text/plain') ?? false
}

async function readTextChunks(response: Response, signal?: AbortSignal) {
  if (!response.body) {
    const text = await response.text()
    return (async function* () {
      if (!signal?.aborted && text) yield text
    })()
  }

  return (async function* () {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    try {
      while (!signal?.aborted) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        if (text) yield text
      }
      const tail = decoder.decode()
      if (!signal?.aborted && tail) yield tail
    } finally {
      reader.releaseLock()
    }
  })()
}

async function readChatChunks(
  response: Response,
  signal?: AbortSignal,
  streamProtocol?: ChatStreamProtocol
) {
  if (streamProtocol === 'text' || isTextResponse(response)) {
    return (async function* () {
      for await (const content of await readTextChunks(response, signal)) {
        yield { content }
      }
    })()
  }

  if (isEventStream(response)) {
    return readUIMessageStream({ response, signal })
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
