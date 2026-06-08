import { AiHooksError } from '../types'

/**
 * Wraps the global fetch (or a user-supplied one) with timeout, AbortSignal,
 * and consistent error shaping. Providers should call this instead of using
 * fetch directly so behavior is uniform.
 */
export async function requestJson(
  url: string,
  init: RequestInit & { timeoutMs?: number; fetcher?: typeof fetch } = {}
): Promise<Response> {
  const { timeoutMs, signal: externalSignal, fetcher, ...rest } = init
  const requestFetch =
    fetcher ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined)
  if (!requestFetch) {
    throw new AiHooksError('No fetch implementation available')
  }

  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onAbort, { once: true })
  }
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  if (timeoutMs && timeoutMs > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  }

  try {
    const response = await requestFetch(url, { ...rest, signal: controller.signal })
    if (!response.ok) {
      let body: unknown
      try {
        body = await response.json()
      } catch {
        body = await response.text().catch(() => undefined)
      }
      throw new AiHooksError(
        `Request failed with status ${response.status} ${response.statusText}`,
        { status: response.status, cause: body }
      )
    }
    return response
  } catch (err) {
    if (err instanceof AiHooksError) throw err
    if ((err as Error)?.name === 'AbortError') {
      throw new AiHooksError('Request aborted', { cause: err })
    }
    throw new AiHooksError('Network error', { cause: err })
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    if (externalSignal) externalSignal.removeEventListener('abort', onAbort)
  }
}
