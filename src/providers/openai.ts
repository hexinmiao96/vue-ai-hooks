import type { ChatProvider } from './types'
import type {
  ChatChunk,
  ChatRequest,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult,
  Message,
  TokenUsage
} from '../types'
import { parseSSE } from '../utils/stream'
import { requestJson } from '../utils/fetch'

type OpenAiUsage =
  | TokenUsage
  | {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }

function normalizeUsage(usage: OpenAiUsage | undefined): TokenUsage | undefined {
  if (!usage) return undefined
  if ('promptTokens' in usage) return usage
  const promptTokens = usage.prompt_tokens ?? 0
  const completionTokens = usage.completion_tokens ?? 0
  return {
    promptTokens,
    completionTokens,
    totalTokens: usage.total_tokens ?? promptTokens + completionTokens
  }
}

/** Configuration shared by OpenAI-family providers. */
export interface OpenAiLikeConfig {
  apiKey: string
  baseURL: string
  /**
   * Additional headers to send on every request. Use for org-id, project-id,
   * or self-hosted gateways that require custom auth.
   */
  headers?: Record<string, string>
  /** Default model when a request omits one. */
  defaultModel?: string
  /** Path for chat completions endpoint, defaults to '/chat/completions'. */
  chatPath?: string
  /** Path for completions endpoint, defaults to '/completions'. */
  completionPath?: string
  /** Path for embeddings endpoint, defaults to '/embeddings'. */
  embeddingPath?: string
  /**
   * Optional fetcher override. Useful for testing or environments without
   * a global `fetch` (e.g. older Node, polyfills).
   */
  fetch?: typeof fetch
}

/**
 * Build an OpenAI-compatible provider. Works with OpenAI, Azure OpenAI
 * (with the right baseURL), DeepSeek, Moonshot, Zhipu, Ollama (with
 * the OpenAI shim), vLLM, and any other service that follows the
 * OpenAI REST conventions.
 */
export function openaiCompatible(config: OpenAiLikeConfig): ChatProvider {
  const {
    apiKey,
    baseURL,
    headers: extraHeaders = {},
    defaultModel,
    chatPath = '/chat/completions',
    completionPath = '/completions',
    embeddingPath = '/embeddings',
    fetch: fetcher
  } = config

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...extraHeaders
  }

  const joinUrl = (base: string, path: string): string => {
    const b = base.replace(/\/+$/, '')
    const p = path.startsWith('/') ? path : `/${path}`
    return `${b}${p}`
  }

  function serializeMessages(messages: Message[]) {
    return messages.map((m) => {
      // Pass through ContentPart[] as-is; OpenAI's wire format is the same shape.
      const out: Record<string, unknown> = { role: m.role, content: m.content }
      if (m.name) out.name = m.name
      if (m.toolCallId) out.tool_call_id = m.toolCallId
      if (m.toolCalls?.length) out.tool_calls = m.toolCalls
      return out
    })
  }

  return {
    id: 'openai-compatible',

    async chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>> {
      const {
        messages,
        model = defaultModel,
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stop,
        tools,
        toolChoice,
        responseFormat,
        user,
        stream = true,
        signal,
        headers,
        body: extraBody
      } = request

      const body: Record<string, unknown> = {
        ...extraBody,
        model,
        messages: serializeMessages(messages),
        stream
      }
      if (temperature !== undefined) body.temperature = temperature
      if (maxTokens !== undefined) body.max_tokens = maxTokens
      if (topP !== undefined) body.top_p = topP
      if (frequencyPenalty !== undefined) body.frequency_penalty = frequencyPenalty
      if (presencePenalty !== undefined) body.presence_penalty = presencePenalty
      if (stop !== undefined) body.stop = stop
      if (tools) body.tools = tools
      if (toolChoice) body.tool_choice = toolChoice
      if (responseFormat) body.response_format = responseFormat
      if (user) body.user = user

      const response = await requestJson(joinUrl(baseURL, chatPath), {
        method: 'POST',
        headers: { ...baseHeaders, ...headers },
        body: JSON.stringify(body),
        signal,
        fetcher
      })

      if (!stream) {
        // Non-streaming: just yield the whole content in a single chunk.
        const data = (await response.json()) as {
          choices: Array<{ message: { content: string }; finish_reason: string | null }>
          usage?: OpenAiUsage
        }
        return (async function* () {
          yield {
            content: data.choices?.[0]?.message?.content ?? '',
            finishReason: (data.choices?.[0]?.finish_reason as ChatChunk['finishReason']) ?? 'stop',
            usage: normalizeUsage(data.usage)
          }
        })()
      }

      return (async function* () {
        for await (const raw of parseSSE(response, signal)) {
          const choice = (
            raw as {
              choices?: Array<{
                delta?: { content?: string; tool_calls?: ChatChunk['toolCalls'] }
                finish_reason?: ChatChunk['finishReason']
              }>
            }
          ).choices?.[0]
          if (!choice) continue
          const usage = normalizeUsage((raw as { usage?: OpenAiUsage }).usage)
          yield {
            content: choice.delta?.content,
            toolCalls: choice.delta?.tool_calls,
            finishReason: choice.finish_reason ?? undefined,
            usage
          }
        }
      })()
    },

    async completion(request: CompletionRequest): Promise<AsyncIterable<string>> {
      const {
        prompt,
        model = defaultModel,
        temperature,
        maxTokens,
        topP,
        frequencyPenalty,
        presencePenalty,
        stop,
        stream = true,
        signal,
        headers,
        body: extraBody
      } = request

      const body: Record<string, unknown> = { ...extraBody, model, prompt, stream }
      if (temperature !== undefined) body.temperature = temperature
      if (maxTokens !== undefined) body.max_tokens = maxTokens
      if (topP !== undefined) body.top_p = topP
      if (frequencyPenalty !== undefined) body.frequency_penalty = frequencyPenalty
      if (presencePenalty !== undefined) body.presence_penalty = presencePenalty
      if (stop !== undefined) body.stop = stop

      const response = await requestJson(joinUrl(baseURL, completionPath), {
        method: 'POST',
        headers: { ...baseHeaders, ...headers },
        body: JSON.stringify(body),
        signal,
        fetcher
      })

      if (!stream) {
        const data = (await response.json()) as {
          choices: Array<{ text: string }>
        }
        return (async function* () {
          yield data.choices?.[0]?.text ?? ''
        })()
      }

      return (async function* () {
        for await (const raw of parseSSE(response, signal)) {
          const choice = (raw as { choices?: Array<{ text?: string }> }).choices?.[0]
          if (choice?.text) yield choice.text
        }
      })()
    },

    async embedding(request: EmbeddingRequest): Promise<EmbeddingResult> {
      const { input, model = defaultModel, user, signal, headers, body: extraBody } = request

      const body: Record<string, unknown> = { ...extraBody, input }
      if (model) body.model = model
      if (user) body.user = user

      const response = await requestJson(joinUrl(baseURL, embeddingPath), {
        method: 'POST',
        headers: { ...baseHeaders, ...headers },
        body: JSON.stringify(body),
        signal,
        fetcher
      })

      const data = (await response.json()) as {
        data: Array<{ embedding: number[] }>
        model: string
        usage: { prompt_tokens: number; total_tokens: number }
      }
      return {
        embeddings: data.data.map((d) => d.embedding),
        model: data.model,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          totalTokens: data.usage.total_tokens
        }
      }
    }
  }
}

/**
 * Convenience factory for the canonical OpenAI endpoint. Equivalent to
 * `openaiCompatible({ apiKey, baseURL: 'https://api.openai.com/v1', ... })`.
 */
export function openai(config: Omit<OpenAiLikeConfig, 'baseURL'> & { baseURL?: string }) {
  return openaiCompatible({
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    ...config
  })
}
