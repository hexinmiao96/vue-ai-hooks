import { ref, shallowRef, type Ref } from 'vue'
import type { ChatProvider } from '../providers/types'
import type { EmbeddingRequest, EmbeddingResult } from '../types'

export interface UseEmbeddingOptions {
  provider: ChatProvider
  defaultRequest?: Partial<EmbeddingRequest>
  onSuccess?: (result: EmbeddingResult) => void
  onError?: (err: Error) => void
}

export interface UseEmbeddingReturn {
  embeddings: Ref<number[][]>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  result: Ref<EmbeddingResult | null>
  embed: (input: string | string[], options?: Partial<EmbeddingRequest>) => Promise<EmbeddingResult>
  abortController: Ref<AbortController | null>
}

/**
 * Vue 3 composable for generating text embeddings.
 *
 * ```ts
 * const { embed, embeddings, isLoading } = useEmbedding({
 *   provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
 * })
 * const { embeddings: vecs } = await embed('hello world')
 * ```
 */
export function useEmbedding(options: UseEmbeddingOptions): UseEmbeddingReturn {
  const { provider, defaultRequest = {}, onSuccess, onError } = options

  const embeddings = ref<number[][]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const result = shallowRef<EmbeddingResult | null>(null)
  const abortController = shallowRef<AbortController | null>(null)

  async function embed(input: string | string[], requestOptions: Partial<EmbeddingRequest> = {}) {
    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null

    try {
      const res = await provider.embedding({
        ...defaultRequest,
        ...requestOptions,
        input,
        signal: controller.signal
      })
      embeddings.value = res.embeddings
      result.value = res
      onSuccess?.(res)
      return res
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      error.value = e
      onError?.(e)
      throw e
    } finally {
      abortController.value = null
      isLoading.value = false
    }
  }

  return {
    embeddings,
    isLoading,
    error,
    result,
    embed,
    abortController
  }
}
