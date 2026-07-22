import type { RetryContext, RetryOptions } from '../types'

/** Normalizes the configured retry count to a non-negative integer. */
export function getMaxRetries(options: RetryOptions) {
  return Math.max(0, Math.floor(options.maxRetries ?? 0))
}

/** Creates the context passed to retry policy and lifecycle callbacks. */
export function createRetryContext(
  error: Error,
  attempt: number,
  maxRetries: number
): RetryContext {
  return { attempt, maxRetries, error }
}

/** Returns whether the current failure may consume the configured retry attempt. */
export async function canRetry(options: RetryOptions, context: RetryContext) {
  if (context.attempt > context.maxRetries) return false
  if (options.shouldRetry) return await options.shouldRetry(context.error, context)
  return isDefaultRetryable(context.error)
}

/** Runs the retry callback and waits for the configured delay, respecting abort signals. */
export async function waitForRetry(
  options: RetryOptions,
  context: RetryContext,
  signal?: AbortSignal
) {
  options.onRetry?.(context.error, context)
  const delayMs = resolveRetryDelayMs(options, context)
  if (delayMs <= 0) return

  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError())
      return
    }

    const timeout = setTimeout(resolve, delayMs)
    const onAbort = () => {
      clearTimeout(timeout)
      reject(createAbortError())
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function resolveRetryDelayMs(options: RetryOptions, context: RetryContext) {
  const value =
    typeof options.retryDelayMs === 'function'
      ? options.retryDelayMs(context)
      : (options.retryDelayMs ?? 0)
  return Math.max(0, value)
}

function isDefaultRetryable(error: Error) {
  const status = (error as { status?: unknown }).status
  if (typeof status !== 'number') return true
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

/** Creates an `AbortError` used when a retry wait is cancelled. */
export function createAbortError() {
  const error = new Error('Request aborted')
  error.name = 'AbortError'
  return error
}
