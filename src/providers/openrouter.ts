import type { ChatProvider } from './types'
import { openaiCompatible, type OpenAiLikeConfig } from './openai'
import { mergeHeaders } from '../utils/headers'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

/** Configures OpenRouter and its optional request-attribution headers. */
export interface OpenRouterConfig extends Omit<OpenAiLikeConfig, 'baseURL'> {
  /**
   * Overrides the base URL for proxies or self-hosted OpenRouter-compatible gateways.
   * Defaults to `https://openrouter.ai/api/v1`.
   */
  baseURL?: string
  /**
   * Sets the app URL sent as `HTTP-Referer` for attribution and provider policy checks.
   */
  siteUrl?: string
  /**
   * Sets the app title sent as `X-Title` for attribution and provider policy checks.
   */
  appName?: string
}

/**
 * Creates an OpenRouter provider backed by the OpenAI-compatible transport.
 *
 * Adds `HTTP-Referer` and `X-Title` when their corresponding options are provided.
 */
export function openrouter(config: OpenRouterConfig): ChatProvider {
  const {
    siteUrl,
    appName,
    headers: extraHeaders = {},
    baseURL = OPENROUTER_BASE_URL,
    ...rest
  } = config
  // Attribution headers intentionally override custom headers with the same names.
  const headers = mergeHeaders(
    extraHeaders,
    siteUrl ? { 'HTTP-Referer': siteUrl } : undefined,
    appName ? { 'X-Title': appName } : undefined
  )

  const baseProvider = openaiCompatible({
    ...rest,
    baseURL,
    headers
  })

  return {
    ...baseProvider,
    id: 'openrouter'
  }
}
