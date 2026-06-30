import { AiHooksError } from '../types'
import type { ChatProvider } from './types'

export type FallbackProviderKind = 'chat' | 'completion' | 'embedding'

export interface FallbackProviderContext {
  kind: FallbackProviderKind
  provider: ChatProvider
  providerId: string
  index: number
  error: Error
  nextProvider?: ChatProvider
  nextProviderId?: string
}

export interface FallbackProviderConfig {
  id?: string
  providers: readonly ChatProvider[]
  shouldFallback?: (context: FallbackProviderContext) => boolean | Promise<boolean>
  onFallback?: (context: FallbackProviderContext) => void | Promise<void>
}

export function fallbackProvider(config: FallbackProviderConfig): ChatProvider {
  const { id = 'fallback', providers, shouldFallback, onFallback } = config
  if (!providers.length) {
    throw new AiHooksError('fallbackProvider requires at least one provider')
  }

  async function canUseFallback(
    kind: FallbackProviderKind,
    index: number,
    error: Error,
    signal: AbortSignal | undefined
  ) {
    const provider = providers[index]
    const nextProvider = providers[index + 1]
    if (!nextProvider || signal?.aborted || error.name === 'AbortError') return false

    const context: FallbackProviderContext = {
      kind,
      provider,
      providerId: provider.id,
      index,
      error,
      nextProvider,
      nextProviderId: nextProvider.id
    }

    if (shouldFallback && !(await shouldFallback(context))) return false

    await onFallback?.(context)
    return true
  }

  function streamWithFallback<TChunk>(
    kind: FallbackProviderKind,
    signal: AbortSignal | undefined,
    run: (provider: ChatProvider) => Promise<AsyncIterable<TChunk> | Iterable<TChunk>>
  ): AsyncIterable<TChunk> {
    return (async function* () {
      for (let index = 0; index < providers.length; index += 1) {
        let yielded = false

        try {
          const stream = await run(providers[index])
          for await (const chunk of stream) {
            yielded = true
            yield chunk
          }
          return
        } catch (err) {
          const error = toError(err)
          if (yielded || !(await canUseFallback(kind, index, error, signal))) throw error
        }
      }
    })()
  }

  return {
    id,
    async chat(request) {
      return streamWithFallback('chat', request.signal, (provider) => provider.chat(request))
    },
    async completion(request) {
      return streamWithFallback('completion', request.signal, (provider) =>
        provider.completion(request)
      )
    },
    async embedding(request) {
      for await (const result of streamWithFallback(
        'embedding',
        request.signal,
        async (provider) => [await provider.embedding(request)]
      )) {
        return result
      }

      throw new AiHooksError('fallbackProvider could not select a provider')
    }
  }
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}
