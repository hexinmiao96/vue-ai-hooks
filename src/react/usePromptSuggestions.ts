import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  PromptSuggestion,
  PromptSuggestionFilter,
  PromptSuggestionFilterContext,
  PromptSuggestionInput,
  PromptSuggestionLoader
} from '../composables/usePromptSuggestions'
import type { Message } from '../types'

export {
  createPromptSuggestionRecipes,
  promptSuggestionRecipeIds,
  type CreatePromptSuggestionRecipesOptions,
  type PromptSuggestionRecipe,
  type PromptSuggestionRecipeCategory,
  type PromptSuggestionRecipeId,
  type PromptSuggestionRecipeLocale,
  type PromptSuggestionRecipeMetadata,
  type PromptSuggestionRecipeSurface
} from '../composables/usePromptSuggestions'

export interface UsePromptSuggestionsOptions<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  suggestions?: readonly PromptSuggestionInput<TMetadata>[]
  input?: string | null | undefined | (() => string | null | undefined)
  messages?: readonly Message[] | null | undefined | (() => readonly Message[] | null | undefined)
  max?: number | null | undefined | (() => number | null | undefined)
  filter?: PromptSuggestionFilter<TMetadata>
  loader?: PromptSuggestionLoader<TMetadata>
  loadOnInit?: boolean
}

export interface UseReactPromptSuggestionsOptions<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> extends UsePromptSuggestionsOptions<TMetadata> {
  max?: number | null | undefined | (() => number | null | undefined)
}

export interface UsePromptSuggestionsReturn<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  suggestions: PromptSuggestion<TMetadata>[]
  visibleSuggestions: PromptSuggestion<TMetadata>[]
  selectedSuggestion: PromptSuggestion<TMetadata> | null
  isLoading: boolean
  error: Error | null
  reloadSuggestions: () => Promise<PromptSuggestion<TMetadata>[]>
  clearError: () => void
  selectSuggestion: (
    suggestion: string | PromptSuggestion<TMetadata>
  ) => PromptSuggestion<TMetadata> | null
  clearSelection: () => void
}

export type UseReactPromptSuggestionsReturn<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> = UsePromptSuggestionsReturn<TMetadata>

export function usePromptSuggestions<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
>(
  options: UseReactPromptSuggestionsOptions<TMetadata> = {}
): UseReactPromptSuggestionsReturn<TMetadata> {
  const {
    suggestions: staticSuggestions = [],
    input,
    messages,
    max,
    filter,
    loader,
    loadOnInit = false
  } = options
  const [loadedSuggestions, setLoadedSuggestions] = useState<
    readonly PromptSuggestionInput<TMetadata>[]
  >([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<PromptSuggestion<TMetadata> | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const optionsRef = useRef(options)
  const loadVersionRef = useRef(0)
  const activeControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  optionsRef.current = options
  const currentLoadedSuggestionsRef = useRef<readonly PromptSuggestionInput<TMetadata>[]>([])
  currentLoadedSuggestionsRef.current = loadedSuggestions

  const normalizedInput = resolveInput({ input })
  const normalizedMessages = resolveMessages({ messages })
  const resolvedMax = resolveMax(typeof max === 'function' ? max() : max)

  const suggestions = useMemo(
    () => normalizeSuggestions([...staticSuggestions, ...loadedSuggestions]),
    [loadedSuggestions, staticSuggestions]
  )

  const visibleSuggestions = useMemo(() => {
    const context = {
      input: normalizedInput,
      messages: normalizedMessages,
      suggestions
    }
    const activeFilter = filter ?? ((item) => defaultFilter(item, context))
    return suggestions
      .filter((suggestion) => activeFilter(suggestion, context))
      .slice(0, resolvedMax)
  }, [filter, suggestions, resolvedMax, normalizedInput, normalizedMessages])

  const reloadSuggestions = useCallback(async (): Promise<PromptSuggestion<TMetadata>[]> => {
    if (!loader) {
      return normalizeSuggestions<TMetadata>([
        ...staticSuggestions,
        ...currentLoadedSuggestionsRef.current
      ])
    }

    const version = loadVersionRef.current + 1
    loadVersionRef.current = version
    activeControllerRef.current?.abort()

    const controller = new AbortController()
    activeControllerRef.current = controller
    setIsLoading(true)
    setError(null)
    const currentOptions = optionsRef.current
    const currentStaticSuggestions = resolveStaticSuggestions(currentOptions)

    try {
      const loaded = await loader({
        input: resolveInput(currentOptions),
        messages: resolveMessages(currentOptions),
        signal: controller.signal
      })
      if (controller.signal.aborted || version !== loadVersionRef.current || !mountedRef.current) {
        return normalizeSuggestions<TMetadata>([
          ...currentStaticSuggestions,
          ...currentLoadedSuggestionsRef.current
        ])
      }

      setLoadedSuggestions(loaded)
      return normalizeSuggestions<TMetadata>([...currentStaticSuggestions, ...loaded])
    } catch (cause) {
      if (!controller.signal.aborted && version === loadVersionRef.current) {
        setError(normalizeError(cause))
      }
      return normalizeSuggestions<TMetadata>(
        [...currentStaticSuggestions, ...currentLoadedSuggestionsRef.current],
        0
      )
    } finally {
      if (version === loadVersionRef.current) {
        setIsLoading(false)
        activeControllerRef.current = null
      }
    }
  }, [loader, staticSuggestions])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const selectSuggestion = useCallback(
    (suggestion: string | PromptSuggestion<TMetadata>) => {
      const id = typeof suggestion === 'string' ? suggestion : suggestion.id
      const found = suggestions.find((item) => item.id === id) ?? null
      setSelectedSuggestion(found)
      return found
    },
    [suggestions]
  )

  const clearSelection = useCallback(() => {
    setSelectedSuggestion(null)
  }, [])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      activeControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (loadOnInit && loader) {
      void reloadSuggestions()
    }
  }, [loadOnInit, loader, reloadSuggestions])

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

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

function resolveInput<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
>(options: { input?: UsePromptSuggestionsOptions<TMetadata>['input'] }): string {
  const value = options.input
  return String(typeof value === 'function' ? value() : (value ?? '')).trim()
}

function resolveMessages<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
>(options: { messages?: UsePromptSuggestionsOptions<TMetadata>['messages'] }): Message[] {
  const value = options.messages
  const resolved = typeof value === 'function' ? value() : value
  return [...(resolved ?? [])]
}

function resolveStaticSuggestions<TMetadata extends Record<string, unknown>>(
  options: UsePromptSuggestionsOptions<TMetadata>
): readonly PromptSuggestionInput<TMetadata>[] {
  return [...(options.suggestions ?? [])]
}

function resolveMax(max: number | null | undefined): number {
  if (max == null) return 6
  if (!Number.isFinite(max)) return max > 0 ? Number.POSITIVE_INFINITY : 0
  return Math.max(0, Math.floor(max))
}

function defaultFilter<TMetadata extends Record<string, unknown>>(
  suggestion: PromptSuggestion<TMetadata>,
  context: PromptSuggestionFilterContext<TMetadata>
): boolean {
  if (!context.input) return true
  const query = context.input.toLocaleLowerCase()
  return [suggestion.title, suggestion.prompt, suggestion.description ?? '']
    .join('\n')
    .toLocaleLowerCase()
    .includes(query)
}

function normalizeSuggestions<TMetadata extends Record<string, unknown>>(
  suggestionInputs: readonly PromptSuggestionInput<TMetadata>[],
  startIndex = 0
): PromptSuggestion<TMetadata>[] {
  return suggestionInputs
    .map((suggestion, index) => normalizeSuggestion(suggestion, startIndex + index))
    .filter((suggestion): suggestion is PromptSuggestion<TMetadata> => Boolean(suggestion))
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
