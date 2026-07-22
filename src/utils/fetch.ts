import { AiHooksError } from '../types'

/**
 * Sends a fetch request with timeout and abort propagation, returning only successful responses.
 *
 * Network, abort, and non-success HTTP responses are normalized to `AiHooksError`.
 */
export async function requestJson(
  url: string,
  init: RequestInit & { timeoutMs?: number; fetcher?: typeof fetch } = {}
): Promise<Response> {
  const { timeoutMs, signal: externalSignal, fetcher, ...rest } = init
  const requestFetch =
    fetcher ??
    (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined)
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
      const rawBody = await response.text().catch(() => undefined)
      try {
        body = rawBody ? JSON.parse(rawBody) : undefined
      } catch {
        body = rawBody
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
