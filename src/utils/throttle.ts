import type { StreamThrottleOptions } from '../types'

export function getThrottleMs(options: StreamThrottleOptions): number {
  const value = options.throttleMs ?? options.experimental_throttle
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

export function createStreamUpdateThrottler(waitMs: number, flush: () => void) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let pending = false
  let lastFlush = Date.now()

  function clearTimer() {
    if (!timeout) return
    clearTimeout(timeout)
    timeout = null
  }

  function run() {
    clearTimer()
    if (!pending) return
    pending = false
    lastFlush = Date.now()
    flush()
  }

  function schedule() {
    if (waitMs <= 0) {
      pending = true
      run()
      return
    }

    pending = true
    const remaining = waitMs - (Date.now() - lastFlush)
    if (remaining <= 0) {
      run()
      return
    }
    if (!timeout) timeout = setTimeout(run, remaining)
  }

  function flushNow() {
    run()
  }

  function cancel() {
    clearTimer()
    pending = false
  }

  return { schedule, flush: flushNow, cancel }
}
