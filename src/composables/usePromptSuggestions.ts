import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'
import type { Message } from '../types'

export interface PromptSuggestion<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  id: string
  title: string
  prompt: string
  description?: string
  metadata?: TMetadata
}

export type PromptSuggestionInput<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> =
  | string
  | {
      id?: string
      title?: string
      prompt: string
      description?: string
      metadata?: TMetadata
    }

export interface PromptSuggestionFilterContext<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  input: string
  messages: readonly Message[]
  suggestions: readonly PromptSuggestion<TMetadata>[]
}

export type PromptSuggestionFilter<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> = (
  suggestion: PromptSuggestion<TMetadata>,
  context: PromptSuggestionFilterContext<TMetadata>
) => boolean

export interface PromptSuggestionLoaderContext {
  input: string
  messages: readonly Message[]
  signal: AbortSignal
}

export type PromptSuggestionLoader<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> = (
  context: PromptSuggestionLoaderContext
) =>
  readonly PromptSuggestionInput<TMetadata>[] | Promise<readonly PromptSuggestionInput<TMetadata>[]>

export interface UsePromptSuggestionsOptions<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  suggestions?: MaybeRefOrGetter<readonly PromptSuggestionInput<TMetadata>[]>
  input?: MaybeRefOrGetter<string | null | undefined>
  messages?: MaybeRefOrGetter<readonly Message[] | null | undefined>
  max?: MaybeRefOrGetter<number | null | undefined>
  filter?: PromptSuggestionFilter<TMetadata>
  loader?: PromptSuggestionLoader<TMetadata>
  loadOnInit?: boolean
}

export interface UsePromptSuggestionsReturn<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  suggestions: ComputedRef<PromptSuggestion<TMetadata>[]>
  visibleSuggestions: ComputedRef<PromptSuggestion<TMetadata>[]>
  selectedSuggestion: Ref<PromptSuggestion<TMetadata> | null>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  reloadSuggestions: () => Promise<PromptSuggestion<TMetadata>[]>
  clearError: () => void
  selectSuggestion: (
    suggestion: string | PromptSuggestion<TMetadata>
  ) => PromptSuggestion<TMetadata> | null
  clearSelection: () => void
}

export function usePromptSuggestions<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
>(options: UsePromptSuggestionsOptions<TMetadata> = {}): UsePromptSuggestionsReturn<TMetadata> {
  const selectedSuggestion = shallowRef<PromptSuggestion<TMetadata> | null>(null)
  const loadedSuggestions = shallowRef<readonly PromptSuggestionInput<TMetadata>[]>([])
  const isLoading = shallowRef(false)
  const error = shallowRef<Error | null>(null)
  const activeController = shallowRef<AbortController | null>(null)
  let loadVersion = 0

  const suggestions = computed(() =>
    [...(toValue(options.suggestions) ?? []), ...loadedSuggestions.value]
      .map((suggestion, index) => normalizeSuggestion(suggestion, index))
      .filter((suggestion): suggestion is PromptSuggestion<TMetadata> => Boolean(suggestion))
  )

  const visibleSuggestions = computed(() => {
    const input = resolveInput(options)
    const messages = resolveMessages(options)
    const all = suggestions.value
    const context: PromptSuggestionFilterContext<TMetadata> = {
      input,
      messages,
      suggestions: all
    }
    const filtered = all.filter((suggestion) =>
      options.filter ? options.filter(suggestion, context) : defaultFilter(suggestion, input)
    )
    return filtered.slice(0, resolveMax(toValue(options.max)))
  })

  async function reloadSuggestions(): Promise<PromptSuggestion<TMetadata>[]> {
    const loader = options.loader
    if (!loader) return suggestions.value

    const version = loadVersion + 1
    loadVersion = version
    activeController.value?.abort()

    const controller = new AbortController()
    activeController.value = controller
    isLoading.value = true
    error.value = null

    try {
      const loaded = await loader({
        input: resolveInput(options),
        messages: resolveMessages(options),
        signal: controller.signal
      })
      if (controller.signal.aborted || version !== loadVersion) return suggestions.value
      loadedSuggestions.value = [...loaded]
      return suggestions.value
    } catch (cause) {
      if (!controller.signal.aborted && version === loadVersion) {
        error.value = toError(cause)
      }
      return suggestions.value
    } finally {
      if (version === loadVersion) {
        isLoading.value = false
        activeController.value = null
      }
    }
  }

  function clearError() {
    error.value = null
  }

  function selectSuggestion(
    suggestion: string | PromptSuggestion<TMetadata>
  ): PromptSuggestion<TMetadata> | null {
    const id = typeof suggestion === 'string' ? suggestion : suggestion.id
    const found = suggestions.value.find((item) => item.id === id) ?? null
    selectedSuggestion.value = found
    return found
  }

  function clearSelection() {
    selectedSuggestion.value = null
  }

  if (options.loadOnInit && options.loader) {
    void reloadSuggestions()
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      activeController.value?.abort()
    })
  }

  return {
    suggestions,
    visibleSuggestions,
    selectedSuggestion,
    isLoading,
    error,
    reloadSuggestions,
    clearError,
    selectSuggestion,
    clearSelection
  }
}

function normalizeSuggestion<TMetadata extends Record<string, unknown>>(
  input: PromptSuggestionInput<TMetadata>,
  index: number
): PromptSuggestion<TMetadata> | null {
  if (typeof input === 'string') {
    const prompt = input.trim()
    if (!prompt) return null
    return {
      id: `suggestion-${index + 1}`,
      title: titleFromPrompt(prompt),
      prompt
    }
  }

  const prompt = input.prompt.trim()
  if (!prompt) return null
  const title = input.title?.trim() || titleFromPrompt(prompt)
  const description = input.description?.trim()
  return {
    id: input.id?.trim() || `suggestion-${index + 1}`,
    title,
    prompt,
    ...(description ? { description } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {})
  }
}

function titleFromPrompt(prompt: string): string {
  const firstLine = prompt.split(/\r?\n/, 1)[0]?.trim() || prompt
  return firstLine.length > 64 ? `${firstLine.slice(0, 61)}...` : firstLine
}

function defaultFilter(suggestion: PromptSuggestion, input: string): boolean {
  if (!input) return true
  const query = input.toLocaleLowerCase()
  return [suggestion.title, suggestion.prompt, suggestion.description ?? '']
    .join('\n')
    .toLocaleLowerCase()
    .includes(query)
}

function resolveMax(max: number | null | undefined): number {
  if (max == null) return 6
  if (!Number.isFinite(max)) return max > 0 ? Number.POSITIVE_INFINITY : 0
  return Math.max(0, Math.floor(max))
}

function resolveInput<TMetadata extends Record<string, unknown>>(
  options: UsePromptSuggestionsOptions<TMetadata>
): string {
  return String(toValue(options.input) ?? '').trim()
}

function resolveMessages<TMetadata extends Record<string, unknown>>(
  options: UsePromptSuggestionsOptions<TMetadata>
): Message[] {
  return [...(toValue(options.messages) ?? [])]
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause))
}
