import { openaiCompatible, type OpenAiLikeConfig } from './openai'
import type { ChatProvider } from './types'

const MOONSHOT_BASE_URL = 'https://api.moonshot.ai/v1'

/** Configuration for Kimi/Moonshot's OpenAI-compatible API. */
export interface MoonshotConfig extends Omit<OpenAiLikeConfig, 'baseURL'> {
  /** Override for proxies or compatible gateways. */
  baseURL?: string
}

/**
 * Build a Kimi/Moonshot provider through its OpenAI-compatible API.
 *
 * Model availability changes by account and provider release, so pass
 * `defaultModel` or per-request `model` explicitly.
 */
export function moonshot(config: MoonshotConfig): ChatProvider {
  return {
    ...openaiCompatible({
      ...config,
      baseURL: config.baseURL ?? MOONSHOT_BASE_URL
    }),
    id: 'moonshot'
  }
}
