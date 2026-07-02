import { openaiCompatible, type OpenAiLikeConfig } from './openai'
import type { ChatProvider } from './types'

const OLLAMA_BASE_URL = 'http://localhost:11434/v1'

/** Configuration for Ollama's local OpenAI-compatible API. */
export interface OllamaConfig extends Omit<OpenAiLikeConfig, 'apiKey' | 'baseURL'> {
  /** Ollama ignores the key, but OpenAI-compatible clients still send one. */
  apiKey?: string
  /** Override when Ollama is exposed on another host, port, or proxy path. */
  baseURL?: string
}

/**
 * Build an Ollama provider through its OpenAI-compatible local API.
 *
 * Pass `defaultModel` or per-request `model` for the model installed on the host.
 */
export function ollama(config: OllamaConfig = {}): ChatProvider {
  return {
    ...openaiCompatible({
      ...config,
      apiKey: config.apiKey ?? 'ollama',
      baseURL: config.baseURL ?? OLLAMA_BASE_URL
    }),
    id: 'ollama'
  }
}
