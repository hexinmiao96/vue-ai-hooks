import { openaiCompatible, type OpenAiLikeConfig } from './openai'
import type { ChatProvider } from './types'

/** Configures the DeepSeek OpenAI-compatible API. */
export interface DeepSeekConfig extends Omit<OpenAiLikeConfig, 'baseURL'> {
  /** Overrides the base URL for proxies or compatible gateways. */
  baseURL?: string
}

/**
 * Creates a DeepSeek provider through its OpenAI-compatible API.
 *
 * Uses OpenAI-compatible request shapes with DeepSeek defaults for the base URL and model.
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
