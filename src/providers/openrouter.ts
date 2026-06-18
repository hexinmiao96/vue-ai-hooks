import type { ChatProvider } from './types'
import { openaiCompatible, type OpenAiLikeConfig } from './openai'

// OpenRouter's documented public API root for OpenAI-compatible requests.
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

/**
 * Configuration for OpenRouter provider. In addition to standard OpenAI-style
 * fields, OpenRouter commonly requires these optional headers.
 * In practice it is used as a thin, opinionated wrapper around `openaiCompatible`.
 */
export interface OpenRouterConfig extends OpenAiLikeConfig {
  /**
   * Optional app site URL for provider analytics/restrictions.
   * Sent as `HTTP-Referer`.
   * Leave empty when routing through generic key-based auth only.
   */
  siteUrl?: string
  /**
   * Optional app title for provider analytics/restrictions.
   * Sent as `X-Title`.
   * Use a stable app name for dashboards and provider policy attribution.
   */
  appName?: string
}

/**
 * Build an OpenRouter provider.
 *
 * OpenRouter exposes an OpenAI-compatible API with a few extra headers:
 * `HTTP-Referer` and `X-Title`.
 *
 * @param config OpenRouter/OpenAI-compatible settings.
 * @returns A ChatProvider with OpenRouter base URL and provider id.
 */
export function openrouter(config: OpenRouterConfig): ChatProvider {
  // Keep generic OpenAI-compatible options intact and peel out OpenRouter-only
  // settings for later header composition.
  const { siteUrl, appName, headers: extraHeaders = {}, ...rest } = config
  // Build the final request headers in one place so callers get a predictable
  // composition model:
  // - base custom headers are preserved,
  // - OpenRouter-specific headers are injected only when configured,
  // - and OpenRouter headers override same-name custom headers to ensure expected
  //   request attribution on provider endpoints.
  const headers = {
    ...extraHeaders,
    ...(siteUrl ? { 'HTTP-Referer': siteUrl } : {}),
    ...(appName ? { 'X-Title': appName } : {})
  }

  // Reuse the mature OpenAI-compatible transport/path handling to avoid
  // duplicating request-shape logic. Only endpoint/base URL and identity
  // headers are specialized here.
  const baseProvider = openaiCompatible({
    ...rest,
    baseURL: OPENROUTER_BASE_URL,
    headers
  })

  // Keep provider id explicit so consumers can distinguish telemetry or behavior
  // branches that depend on source provider.
  return {
    ...baseProvider,
    id: 'openrouter'
  }
}
