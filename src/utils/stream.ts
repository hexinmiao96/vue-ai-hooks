/**
 * Server-Sent Events (SSE) parser.
 *
 * Yields the parsed JSON payload of each `data: ...` line. Stops on
 * the canonical `[DONE]` sentinel. Skips malformed lines silently
 * (we surface errors through the chunk type, not exceptions).
 */
export async function* parseSSE(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<Record<string, unknown>> {
  if (!response.body) {
    throw new Error('Response has no body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel()
        return
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      let sepIndex: number
      // SSE events are separated by a blank line (\n\n).
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)

        for (const line of rawEvent.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') return
          if (!data) continue
          try {
            yield JSON.parse(data)
          } catch {
            // Skip malformed line. Provider can put garbage in the stream
            // (e.g. comment lines, retries); we don't want to crash the hook.
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
