import type { ChatProvider } from './types'
import type {
  ChatChunk,
  ChatRequest,
  CompletionRequest,
  ContentPart,
  EmbeddingRequest,
  EmbeddingResult,
  Message,
  MessageContent,
  TokenUsage,
  Tool,
  ToolCall
} from '../types'
import { parseSSE } from '../utils/stream'
import { requestJson } from '../utils/fetch'
import { AiHooksError } from '../types'
import { mergeHeaders } from '../utils/headers'

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
  headers?: HeadersInit
  /** Custom fetch implementation. */
  fetch?: typeof fetch
  /** Request timeout in milliseconds. */
  timeoutMs?: number
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

function mapUsage(
  usage: { input_tokens?: number; output_tokens?: number } | undefined,
  fallbackInputTokens = 0
): TokenUsage | undefined {
  if (!usage) return undefined
  const promptTokens = usage.input_tokens ?? fallbackInputTokens
  const completionTokens = usage.output_tokens ?? 0
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
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
    fetch: fetcher,
    timeoutMs
  } = config

  const baseHeaders = mergeHeaders(
    {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': anthropicVersion
    },
    extraHeaders
  )

  const joinUrl = (path: string): string => {
    const b = baseURL.replace(/\/+$/, '')
    const p = path.startsWith('/') ? path : `/${path}`
    return `${b}${p}`
  }

  function toAnthropicContent(content: MessageContent): string | Array<Record<string, unknown>> {
    if (typeof content === 'string') return content
    return content.map((p) => toAnthropicPart(p))
  }

  function toAnthropicBlocks(content: MessageContent): Array<Record<string, unknown>> {
    if (typeof content === 'string') {
      return content ? [{ type: 'text', text: content }] : []
    }
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

  function parseToolInput(call: ToolCall): unknown {
    const raw = call.function.arguments.trim()
    if (!raw) return {}
    try {
      return JSON.parse(raw) as unknown
    } catch (err) {
      throw new AiHooksError(`Invalid JSON arguments for Anthropic tool "${call.function.name}"`, {
        cause: err
      })
    }
  }

  function toAssistantContent(message: Message): string | Array<Record<string, unknown>> {
    if (!message.toolCalls?.length) return toAnthropicContent(message.content)
    return [
      ...toAnthropicBlocks(message.content),
      ...message.toolCalls.map((call) => ({
        type: 'tool_use',
        id: call.id,
        name: call.function.name,
        input: parseToolInput(call)
      }))
    ]
  }

  function toToolResultContent(message: Message): Array<Record<string, unknown>> {
    return [
      {
        type: 'tool_result',
        tool_use_id: message.toolCallId,
        content:
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
      }
    ]
  }

  function toAnthropicTools(tools: Tool[]): Array<Record<string, unknown>> {
    return tools.map((tool) => {
      const out: Record<string, unknown> = {
        name: tool.function.name,
        input_schema: tool.function.parameters
      }
      if (tool.function.description) out.description = tool.function.description
      return out
    })
  }

  function toAnthropicToolChoice(
    toolChoice: NonNullable<ChatRequest['toolChoice']>
  ): Record<string, unknown> {
    if (toolChoice === 'required') return { type: 'any' }
    if (toolChoice === 'auto' || toolChoice === 'none') return { type: toolChoice }
    return { type: 'tool', name: toolChoice.function.name }
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
        others.push({
          role: m.role,
          content: m.role === 'assistant' ? toAssistantContent(m) : toAnthropicContent(m.content)
        })
      } else if (m.role === 'tool' && m.toolCallId) {
        others.push({ role: 'user', content: toToolResultContent(m) })
      }
    }
    return {
      system: systemParts.length ? systemParts.join('\n\n') : undefined,
      messages: others
    }
  }

  function buildBody(request: ChatRequest): Record<string, unknown> {
    const { system, messages } = splitMessages(request.messages)
    const body: Record<string, unknown> = {
      ...request.body,
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
    if (request.tools?.length) body.tools = toAnthropicTools(request.tools)
    if (request.toolChoice) body.tool_choice = toAnthropicToolChoice(request.toolChoice)
    return body
  }

  async function chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>> {
    const body = buildBody({ ...request, stream: request.stream ?? true })
    const response = await requestJson(joinUrl('/v1/messages'), {
      method: 'POST',
      headers: mergeHeaders(baseHeaders, request.headers),
      body: JSON.stringify(body),
      signal: request.signal,
      timeoutMs,
      fetcher
    })

    if (request.stream === false) {
      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>
        stop_reason: string | null
        usage?: { input_tokens: number; output_tokens: number }
      }
      return (async function* () {
        const text = data.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join('')
        const toolCalls = data.content
          .filter((b) => b.type === 'tool_use')
          .map((b, index) => ({
            index,
            id: b.id,
            type: 'function' as const,
            function: {
              name: b.name,
              arguments: JSON.stringify(b.input ?? {})
            }
          }))
        yield {
          content: text,
          toolCalls: toolCalls.length ? toolCalls : undefined,
          finishReason: mapStopReason(data.stop_reason),
          usage: mapUsage(data.usage)
        }
      })()
    }

    return (async function* () {
      const toolBlocks = new Map<number, { id?: string; name?: string }>()
      let inputTokens = 0
      for await (const raw of parseSSE(response, request.signal)) {
        const type = (raw as { type?: string }).type
        if (type === 'message_start') {
          const usage = mapUsage(
            (raw as { message?: { usage?: { input_tokens?: number; output_tokens?: number } } })
              .message?.usage
          )
          if (usage) {
            inputTokens = usage.promptTokens
            yield { usage }
          }
        } else if (type === 'content_block_start') {
          const event = raw as {
            index?: number
            content_block?: { type?: string; id?: string; name?: string }
          }
          if (event.content_block?.type === 'tool_use' && event.index !== undefined) {
            toolBlocks.set(event.index, {
              id: event.content_block.id,
              name: event.content_block.name
            })
            yield {
              toolCalls: [
                {
                  index: event.index,
                  id: event.content_block.id,
                  type: 'function',
                  function: { name: event.content_block.name, arguments: '' }
                }
              ]
            }
          }
        } else if (type === 'content_block_delta') {
          const event = raw as {
            index?: number
            delta?: { type?: string; text?: string; partial_json?: string }
          }
          const delta = event.delta
          if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
            yield { content: delta.text }
          } else if (
            delta?.type === 'input_json_delta' &&
            typeof delta.partial_json === 'string' &&
            event.index !== undefined
          ) {
            const block = toolBlocks.get(event.index)
            yield {
              toolCalls: [
                {
                  index: event.index,
                  id: block?.id,
                  type: 'function',
                  function: { name: block?.name, arguments: delta.partial_json }
                }
              ]
            }
          }
        } else if (type === 'message_delta') {
          const event = raw as {
            delta?: { stop_reason?: string }
            usage?: { input_tokens?: number; output_tokens?: number }
          }
          const stopReason = event.delta?.stop_reason
          const usage = mapUsage(event.usage, inputTokens)
          if (stopReason || usage) {
            yield { finishReason: stopReason ? mapStopReason(stopReason) : undefined, usage }
          }
        } else if (type === 'error') {
          const err = (raw as { error?: { type?: string; message?: string } }).error
          throw new AiHooksError(
            `Anthropic API error: ${err?.type ?? 'unknown'}: ${err?.message ?? 'unknown'}`,
            { cause: raw }
          )
        }
        // Ignore: content_block_stop, message_stop, ping
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
