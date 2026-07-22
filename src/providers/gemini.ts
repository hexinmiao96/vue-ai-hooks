import type { ChatProvider } from './types'
import { openaiCompatible, type OpenAiLikeConfig } from './openai'

const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'

/** Configures the Gemini OpenAI-compatible API. */
export interface GeminiConfig extends Omit<OpenAiLikeConfig, 'baseURL'> {
  /** Overrides the base URL for proxies or compatible gateways. */
  baseURL?: string
}

/**
 * Creates a Gemini provider through Google's OpenAI-compatible API.
 *
 * Uses OpenAI-compatible request shapes with Gemini defaults for the base URL and model.
 */
export function gemini(config: GeminiConfig): ChatProvider {
  const { baseURL = GEMINI_OPENAI_BASE_URL, defaultModel = 'gemini-3.5-flash', ...rest } = config
  const baseProvider = openaiCompatible({
    ...rest,
    baseURL,
    defaultModel
  })

  return {
    ...baseProvider,
    id: 'gemini'
  }
}
