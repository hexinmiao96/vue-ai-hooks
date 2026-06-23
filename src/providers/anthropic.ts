import type { ChatProvider } from './types'
import type {
  ChatChunk,
  ChatRequest,
  CompletionRequest,
  ContentPart,
  EmbeddingRequest,
  EmbeddingResult,
  Message,
  MessageContent
} from '../types'
import { parseSSE } from '../utils/stream'
import { requestJson } from '../utils/fetch'
import { AiHooksError } from '../types'

/** Configuration for the Anthropic provider. */
export interface AnthropicConfig {
  /** Your Anthropic API key. */
  apiKey: string
  /** Base URL. Defaults to https://api.anthropic.com */
  baseURL?: string
  /** Default model when a request omits one. Defaults to claude-3-5-sonnet. */
  defaultModel?: string
  /** Default max_tokens. Anthropic requires this. Defaults to 1024. */
  maxTokens?: number
  /** Anthropic API version header. Defaults to 2023-06-01. */
  anthropicVersion?: string
  /** Additional headers. */
  headers?: Record<string, string>
  /** Custom fetch implementation. */
  fetch?: typeof fetch
}

/** Map Anthropic's stop_reason to our finishReason. */
function mapStopReason(reason: string | null | undefined): ChatChunk['finishReason'] {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'stop'
    case 'max_tokens':
      return 'length'
    case 'tool_use':
      return 'tool_calls'
    default:
      return 'stop'
  }
}

/**
 * Build an Anthropic Claude provider. Compatible with the Claude 3 / 3.5 / 4
 * family on the official API and on proxies that follow the same wire format.
 *
 * ```ts
 * import { useChat, anthropic } from 'vue-ai-hooks'
 *
 * const { messages, append } = useChat({
 *   provider: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY })
 * })
 * ```
 *
 * Notes:
 * - Anthropic has no embeddings API. Calling `useEmbedding` with this provider
 *   throws a clear `AiHooksError`.
 * - Anthropic has no `/v1/completions` endpoint. `useCompletion` is implemented
 *   as a single-turn chat with a user message.
 * - The system prompt is a top-level field, not part of `messages[]`. The
 *   adapter extracts any `role: 'system'` messages and joins them.
 */
export function anthropic(config: AnthropicConfig): ChatProvider {
  const {
    apiKey,
    baseURL = 'https://api.anthropic.com',
    defaultModel = 'claude-3-5-sonnet-20241022',
    maxTokens: defaultMaxTokens = 1024,
    anthropicVersion = '2023-06-01',
    headers: extraHeaders = {},
    fetch: fetcher
  } = config

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': anthropicVersion,
    ...extraHeaders
  }

  const joinUrl = (path: string): string => {
    const b = baseURL.replace(/\/+$/, '')
    const p = path.startsWith('/') ? path : `/${path}`
    return `${b}${p}`
  }

  function toAnthropicContent(content: MessageContent): string | Array<Record<string, unknown>> {
    if (typeof content === 'string') return content
    return content.map((p) => toAnthropicPart(p))
  }

  function toAnthropicPart(part: ContentPart): Record<string, unknown> {
    if (part.type === 'text') {
      return { type: 'text', text: part.text }
    }
    // ImageUrlPart
    const url = part.image_url.url
    if (url.startsWith('data:')) {
      // data:<mediatype>;base64,<data>
      const match = url.match(/^data:([^;]+);base64,(.*)$/s)
      if (match) {
        return {
          type: 'image',
          source: { type: 'base64', media_type: match[1], data: match[2] }
        }
      }
    }
    return { type: 'image', source: { type: 'url', url } }
  }

  function splitMessages(messages: Message[]): {
    system?: string
    messages: Array<{ role: 'user' | 'assistant'; content: string | unknown[] }>
  } {
    const systemParts: string[] = []
    const others: Array<{ role: 'user' | 'assistant'; content: string | unknown[] }> = []
    for (const m of messages) {
      if (m.role === 'system') {
        if (typeof m.content === 'string' && m.content) {
          systemParts.push(m.content)
        }
      } else if (m.role === 'user' || m.role === 'assistant') {
        others.push({ role: m.role, content: toAnthropicContent(m.content) })
      }
      // 'tool' role is not part of Anthropic's API; skip silently for now.
    }
    return {
      system: systemParts.length ? systemParts.join('\n\n') : undefined,
      messages: others
    }
  }

  function buildBody(request: ChatRequest): Record<string, unknown> {
    const { system, messages } = splitMessages(request.messages)
    const body: Record<string, unknown> = {
      model: request.model ?? defaultModel,
      messages,
      max_tokens: request.maxTokens ?? defaultMaxTokens,
      stream: request.stream ?? true
    }
    if (system) body.system = system
    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.topP !== undefined) body.top_p = request.topP
    if (request.stop !== undefined) {
      body.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop]
    }
    if (request.user) body.metadata = { user_id: request.user }
    return body
  }

  async function chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>> {
    const body = buildBody({ ...request, stream: request.stream ?? true })
    const response = await requestJson(joinUrl('/v1/messages'), {
      method: 'POST',
      headers: { ...baseHeaders, ...request.headers },
      body: JSON.stringify(body),
      signal: request.signal,
      fetcher
    })

    if (request.stream === false) {
      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string }>
        stop_reason: string | null
        usage?: { input_tokens: number; output_tokens: number }
      }
      return (async function* () {
        const textBlock = data.content.find((b) => b.type === 'text')
        yield {
          content: textBlock?.text ?? '',
          finishReason: mapStopReason(data.stop_reason),
          usage: data.usage
            ? {
                promptTokens: data.usage.input_tokens,
                completionTokens: data.usage.output_tokens,
                totalTokens: data.usage.input_tokens + data.usage.output_tokens
              }
            : undefined
        }
      })()
    }

    return (async function* () {
      for await (const raw of parseSSE(response, request.signal)) {
        const type = (raw as { type?: string }).type
        if (type === 'content_block_delta') {
          const delta = (raw as { delta?: { type?: string; text?: string } }).delta
          if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
            yield { content: delta.text }
          }
        } else if (type === 'message_delta') {
          const stopReason = (raw as { delta?: { stop_reason?: string } }).delta?.stop_reason
          if (stopReason) {
            yield { finishReason: mapStopReason(stopReason) }
          }
        } else if (type === 'error') {
          const err = (raw as { error?: { type?: string; message?: string } }).error
          throw new AiHooksError(
            `Anthropic API error: ${err?.type ?? 'unknown'}: ${err?.message ?? 'unknown'}`,
            { cause: raw }
          )
        }
        // Ignore: message_start, content_block_start, content_block_stop, message_stop, ping
      }
    })()
  }

  async function completion(request: CompletionRequest): Promise<AsyncIterable<string>> {
    return async function* (this: ChatProvider) {
      const stream = await this.chat({
        ...request,
        messages: [{ id: 'prompt', role: 'user', content: request.prompt }]
      } as ChatRequest)
      for await (const chunk of stream) {
        if (chunk.content) yield chunk.content
      }
    }.call(providerObject)
  }

  async function embedding(): Promise<EmbeddingResult> {
    throw new AiHooksError('Anthropic has no embedding API', { status: 501 })
  }

  const providerObject: ChatProvider = {
    id: 'anthropic',
    chat,
    completion,
    embedding: embedding as (request: EmbeddingRequest) => Promise<EmbeddingResult>
  }

  return providerObject
}
