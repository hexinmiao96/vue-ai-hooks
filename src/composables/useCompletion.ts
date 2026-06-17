import { ref, shallowRef, type Ref } from 'vue'
import type { ChatProvider } from '../providers/types'
import type { CompletionRequest } from '../types'

export interface UseCompletionOptions {
  provider: ChatProvider
  initialCompletion?: string
  defaultRequest?: Partial<CompletionRequest>
  onFinish?: (completion: string) => void
  onError?: (err: Error) => void
}

export interface UseCompletionReturn {
  completion: Ref<string>
  input: Ref<string>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  complete: (prompt?: string, options?: Partial<CompletionRequest>) => Promise<string>
  stop: () => void
  setCompletion: (value: string) => void
  abortController: Ref<AbortController | null>
}

/**
 * Vue 3 composable for single-shot streaming completions.
 *
 * ```ts
 * const { completion, input, complete } = useCompletion({
 *   provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
 * })
 * ```
 */
export function useCompletion(options: UseCompletionOptions): UseCompletionReturn {
  const { provider, initialCompletion = '', defaultRequest = {}, onFinish, onError } = options

  const completion = ref(initialCompletion)
  const input = ref('')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const abortController = shallowRef<AbortController | null>(null)

  function stop() {
    if (abortController.value) abortController.value.abort()
    abortController.value = null
    isLoading.value = false
  }

  function setCompletion(value: string) {
    completion.value = value
  }

  async function complete(prompt?: string, requestOptions: Partial<CompletionRequest> = {}) {
    const finalPrompt = prompt ?? input.value
    if (!finalPrompt) {
      throw new Error('complete() requires a prompt (either as argument or via input.value)')
    }

    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    completion.value = ''

    try {
      const stream = await provider.completion({
        ...defaultRequest,
        ...requestOptions,
        prompt: finalPrompt,
        signal: controller.signal,
        stream: true
      })
      for await (const delta of stream) {
        if (controller.signal.aborted) break
        completion.value += delta
      }
      onFinish?.(completion.value)
      return completion.value
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      if ((e as { name?: string }).name === 'AbortError' || controller.signal.aborted) {
        onFinish?.(completion.value)
        return completion.value
      }
      error.value = e
      onError?.(e)
      throw e
    } finally {
      abortController.value = null
      isLoading.value = false
    }
  }

  return {
    completion,
    input,
    isLoading,
    error,
    complete,
    stop,
    setCompletion,
    abortController
  }
}
