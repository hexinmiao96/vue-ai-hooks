import type { ChatProvider } from './types'
import type {
  ChatChunk,
  ChatRequest,
  CompletionRequest,
  EmbeddingRequest,
  EmbeddingResult,
  ChatRequestMessage,
  TokenUsage
} from '../types'
import { parseSSE } from '../utils/stream'
import { requestJson } from '../utils/fetch'
import { mergeHeaders } from '../utils/headers'

type OpenAiUsage =
  | TokenUsage
  | {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }

type OpenAiToolCallDelta = NonNullable<ChatChunk['toolCalls']>[number]

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

function normalizeToolCalls(
  toolCalls: Array<Omit<OpenAiToolCallDelta, 'index'> & { index?: number }> | undefined
): ChatChunk['toolCalls'] | undefined {
  if (!toolCalls?.length) return undefined
  return toolCalls.map((call, index) => ({
    ...call,
    index: call.index ?? index
  }))
}

/** Configures an OpenAI-compatible provider. */
export interface OpenAiLikeConfig {
  /** Provides the API key sent as a bearer token. */
  apiKey: string
  /** Sets the base URL containing any required API version or deployment path. */
  baseURL: string
  /**
   * Adds headers to every request. Use for organization IDs, project IDs,
   * or self-hosted gateways that require custom auth.
   */
  headers?: HeadersInit
  /** Selects the default model when a request omits one. */
  defaultModel?: string
  /** Sets the chat completions path. Defaults to `/chat/completions`. */
  chatPath?: string
  /** Sets the completions path. Defaults to `/completions`. */
  completionPath?: string
  /** Sets the embeddings path. Defaults to `/embeddings`. */
  embeddingPath?: string
  /**
   * Provides a fetch implementation for tests or runtimes without a global `fetch`.
   */
  fetch?: typeof fetch
  /** Sets the request timeout in milliseconds. */
  timeoutMs?: number
}

/**
 * Creates a provider for services that implement OpenAI-compatible chat, completion, and
 * embedding endpoints.
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
    fetch: fetcher,
    timeoutMs
  } = config

  const baseHeaders = mergeHeaders(
    {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    extraHeaders
  )

  const trimTrailingSlashes = (value: string): string => {
    let end = value.length
    while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1
    return value.slice(0, end)
  }

  const joinUrl = (base: string, path: string): string => {
    const b = trimTrailingSlashes(base)
    const p = path.startsWith('/') ? path : `/${path}`
    return `${b}${p}`
  }

  function serializeMessages(messages: ChatRequestMessage[]) {
    return messages.map((m) => {
      // Multimodal content parts already match the OpenAI wire format.
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
        headers: mergeHeaders(baseHeaders, headers),
        body: JSON.stringify(body),
        signal,
        timeoutMs,
        fetcher
      })

      if (!stream) {
        const data = (await response.json()) as {
          choices: Array<{
            message: {
              content: string | null
              tool_calls?: Array<Omit<OpenAiToolCallDelta, 'index'> & { index?: number }>
            }
            finish_reason: string | null
          }>
          usage?: OpenAiUsage
        }
        return (async function* () {
          const choice = data.choices?.[0]
          yield {
            content:
              typeof choice?.message?.content === 'string' ? choice.message.content : undefined,
            toolCalls: normalizeToolCalls(choice?.message?.tool_calls),
            finishReason: (choice?.finish_reason as ChatChunk['finishReason']) ?? 'stop',
            usage: normalizeUsage(data.usage)
          }
        })()
      }

      return (async function* () {
        for await (const raw of parseSSE(response, signal)) {
          const choice = (
            raw as {
              choices?: Array<{
                delta?: {
                  content?: string
                  tool_calls?: Array<Omit<OpenAiToolCallDelta, 'index'> & { index?: number }>
                }
                finish_reason?: ChatChunk['finishReason']
              }>
            }
          ).choices?.[0]
          if (!choice) continue
          const usage = normalizeUsage((raw as { usage?: OpenAiUsage }).usage)
          yield {
            content: choice.delta?.content,
            toolCalls: normalizeToolCalls(choice.delta?.tool_calls),
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
        headers: mergeHeaders(baseHeaders, headers),
        body: JSON.stringify(body),
        signal,
        timeoutMs,
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
        headers: mergeHeaders(baseHeaders, headers),
        body: JSON.stringify(body),
        signal,
        timeoutMs,
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
 * Creates a provider for the canonical OpenAI API with `gpt-4o-mini` as its default model.
 */
export function openai(config: Omit<OpenAiLikeConfig, 'baseURL'> & { baseURL?: string }) {
  return openaiCompatible({
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    ...config
  })
}
