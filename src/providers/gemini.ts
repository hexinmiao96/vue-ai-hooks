import type { ChatProvider } from './types'
import { openaiCompatible, type OpenAiLikeConfig } from './openai'

const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai'

/** Configuration for Gemini's OpenAI-compatible API surface. */
export interface GeminiConfig extends Omit<OpenAiLikeConfig, 'baseURL'> {
  /** Override for proxies or compatible gateways. */
  baseURL?: string
}

/**
 * Build a Gemini provider through Google's OpenAI-compatible API.
 *
 * Gemini keeps the OpenAI chat/completions/embeddings shape at a different base
 * URL, so this wrapper only supplies provider defaults and leaves transport
 * behavior to `openaiCompatible`.
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
