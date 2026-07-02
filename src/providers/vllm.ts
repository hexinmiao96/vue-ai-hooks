import { openaiCompatible, type OpenAiLikeConfig } from './openai'
import type { ChatProvider } from './types'

const VLLM_BASE_URL = 'http://localhost:8000/v1'

/** Configuration for vLLM's OpenAI-compatible server. */
export interface VllmConfig extends Omit<OpenAiLikeConfig, 'apiKey' | 'baseURL'> {
  /** API key configured on the vLLM server, if any. */
  apiKey?: string
  /** Override when vLLM is exposed on another host, port, or proxy path. */
  baseURL?: string
}

/**
 * Build a vLLM provider through its OpenAI-compatible server.
 *
 * Pass `defaultModel` or per-request `model` for the model served by the host.
 */
export function vllm(config: VllmConfig = {}): ChatProvider {
  return {
    ...openaiCompatible({
      ...config,
      apiKey: config.apiKey ?? 'vllm',
      baseURL: config.baseURL ?? VLLM_BASE_URL
    }),
    id: 'vllm'
  }
}
