import { openaiCompatible, type OpenAiLikeConfig } from './openai'
import type { ChatProvider } from './types'

/** Configuration for DeepSeek's OpenAI-compatible API surface. */
export interface DeepSeekConfig extends Omit<OpenAiLikeConfig, 'baseURL'> {
  /** Override for proxies or compatible gateways. */
  baseURL?: string
}

/**
 * Build a DeepSeek provider through its OpenAI-compatible API.
 *
 * DeepSeek uses the same chat/completions/embeddings request shape as
 * `openaiCompatible`, with provider-specific defaults for the base URL and model.
 */
export function deepseek(config: DeepSeekConfig): ChatProvider {
  return {
    ...openaiCompatible({
      ...config,
      baseURL: config.baseURL ?? 'https://api.deepseek.com',
      defaultModel: config.defaultModel ?? 'deepseek-v4-flash'
    }),
    id: 'deepseek'
  }
}
