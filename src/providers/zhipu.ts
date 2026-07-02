import { openaiCompatible, type OpenAiLikeConfig } from './openai'
import type { ChatProvider } from './types'

export type ZhipuEndpoint = 'bigmodel' | 'z-ai' | 'bigmodel-coding' | 'z-ai-coding'

const ZHIPU_BASE_URLS: Record<ZhipuEndpoint, string> = {
  bigmodel: 'https://open.bigmodel.cn/api/paas/v4',
  'z-ai': 'https://api.z.ai/api/paas/v4',
  'bigmodel-coding': 'https://open.bigmodel.cn/api/coding/paas/v4',
  'z-ai-coding': 'https://api.z.ai/api/coding/paas/v4'
}

/** Configuration for Zhipu/BigModel/Z.ai OpenAI-compatible APIs. */
export interface ZhipuConfig extends Omit<OpenAiLikeConfig, 'baseURL'> {
  /** Override for proxies, private gateways, or provider-specific account URLs. */
  baseURL?: string
  /**
   * Built-in endpoint preset.
   * `bigmodel` is the China general API, `z-ai` is the global general API, and
   * `*-coding` targets GLM Coding Plan endpoints.
   */
  endpoint?: ZhipuEndpoint
}

/**
 * Build a Zhipu/BigModel/Z.ai provider through its OpenAI-compatible API.
 *
 * Model availability depends on account type, quota package, and endpoint family,
 * so pass `defaultModel` or per-request `model` explicitly.
 */
export function zhipu(config: ZhipuConfig): ChatProvider {
  return {
    ...openaiCompatible({
      ...config,
      baseURL: config.baseURL ?? ZHIPU_BASE_URLS[config.endpoint ?? 'bigmodel']
    }),
    id: 'zhipu'
  }
}
