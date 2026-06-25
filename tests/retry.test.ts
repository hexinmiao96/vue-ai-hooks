import { afterEach, describe, expect, it, vi } from 'vitest'
import { canRetry, createRetryContext, getMaxRetries, waitForRetry } from '../src/utils/retry'

const errorWithStatus = (status: number) => Object.assign(new Error(`status ${status}`), { status })

describe('retry helpers', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('normalizes retry counts', () => {
    expect(getMaxRetries({ maxRetries: 2.8 })).toBe(2)
    expect(getMaxRetries({ maxRetries: -1 })).toBe(0)
    expect(getMaxRetries({})).toBe(0)
  })

  it('uses the default retryable error policy', async () => {
    expect(await canRetry({}, createRetryContext(new Error('network'), 1, 1))).toBe(true)
    expect(await canRetry({}, createRetryContext(errorWithStatus(429), 1, 1))).toBe(true)
    expect(await canRetry({}, createRetryContext(errorWithStatus(503), 1, 1))).toBe(true)
    expect(await canRetry({}, createRetryContext(errorWithStatus(400), 1, 1))).toBe(false)
    expect(await canRetry({}, createRetryContext(new Error('too many'), 2, 1))).toBe(false)
  })

  it('lets callers override retry decisions', async () => {
    const shouldRetry = vi.fn(() => false)
    const context = createRetryContext(new Error('temporary'), 1, 2)

    await expect(canRetry({ shouldRetry }, context)).resolves.toBe(false)

    expect(shouldRetry).toHaveBeenCalledWith(context.error, context)
  })

  it('waits with static and dynamic retry delays', async () => {
    vi.useFakeTimers()
    const onRetry = vi.fn()
    const context = createRetryContext(new Error('temporary'), 2, 3)

    const staticWait = waitForRetry({ retryDelayMs: 10, onRetry }, context)
    await vi.advanceTimersByTimeAsync(10)
    await expect(staticWait).resolves.toBeUndefined()

    const dynamicWait = waitForRetry({ retryDelayMs: ({ attempt }) => attempt * 5 }, context)
    await vi.advanceTimersByTimeAsync(10)
    await expect(dynamicWait).resolves.toBeUndefined()
    expect(onRetry).toHaveBeenCalledWith(context.error, context)
  })

  it('rejects retry waits when the signal is aborted', async () => {
    vi.useFakeTimers()
    const alreadyAborted = new AbortController()
    alreadyAborted.abort()

    await expect(
      waitForRetry(
        { retryDelayMs: 10 },
        createRetryContext(new Error('aborted'), 1, 1),
        alreadyAborted.signal
      )
    ).rejects.toMatchObject({ name: 'AbortError' })

    const controller = new AbortController()
    const pending = waitForRetry(
      { retryDelayMs: 10 },
      createRetryContext(new Error('aborted later'), 1, 1),
      controller.signal
    )

    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})
