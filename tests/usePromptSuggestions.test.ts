import { describe, expect, it } from 'vitest'
import { shallowRef } from 'vue'
import {
  createPromptSuggestionRecipes,
  promptSuggestionRecipeIds,
  usePromptSuggestions
} from '../src/composables/usePromptSuggestions'
import type {
  PromptSuggestionInput,
  PromptSuggestionLoaderContext
} from '../src/composables/usePromptSuggestions'
import type { Message } from '../src/types'

describe('usePromptSuggestions', () => {
  it('normalizes string and object suggestions', () => {
    const { suggestions, visibleSuggestions } = usePromptSuggestions({
      suggestions: [
        'Summarize this thread',
        {
          id: 'risks',
          title: 'Find risks',
          prompt: 'Find the top risks in this conversation.',
          description: 'Useful before handoff',
          metadata: { category: 'review' }
        },
        '',
        { prompt: '   ' }
      ]
    })

    expect(suggestions.value).toEqual([
      {
        id: 'suggestion-1',
        title: 'Summarize this thread',
        prompt: 'Summarize this thread'
      },
      {
        id: 'risks',
        title: 'Find risks',
        prompt: 'Find the top risks in this conversation.',
        description: 'Useful before handoff',
        metadata: { category: 'review' }
      }
    ])
    expect(visibleSuggestions.value).toHaveLength(2)
  })

  it('creates reusable task starter recipes with stable metadata', () => {
    const recipes = createPromptSuggestionRecipes({
      include: ['find-risks', 'write-test-plan', 'inspect-trace'],
      exclude: ['inspect-trace'],
      metadata(recipe) {
        return { source: 'builtin', rank: recipe.id === 'find-risks' ? 1 : 2 }
      }
    })

    expect(promptSuggestionRecipeIds).toContain('inspect-trace')
    expect(recipes.map((recipe) => recipe.id)).toEqual(['find-risks', 'write-test-plan'])
    expect(recipes[0]).toMatchObject({
      id: 'find-risks',
      title: 'Find risks',
      metadata: {
        kind: 'task-starter',
        recipe: 'find-risks',
        category: 'review',
        surfaces: ['chat', 'thread', 'release'],
        locale: 'en',
        source: 'builtin',
        rank: 1
      }
    })

    const { visibleSuggestions } = usePromptSuggestions({
      input: 'test',
      suggestions: recipes
    })
    expect(visibleSuggestions.value.map((suggestion) => suggestion.id)).toEqual(['write-test-plan'])
  })

  it('filters task starter recipes by category and product surface', () => {
    const recipes = createPromptSuggestionRecipes({
      categories: ['verify', 'approval'],
      surfaces: ['release', 'tool-approval']
    })

    expect(recipes.map((recipe) => recipe.id)).toEqual([
      'write-test-plan',
      'verify-release-gates',
      'prepare-tool-approval'
    ])
    expect(recipes.map((recipe) => recipe.metadata?.category)).toEqual([
      'verify',
      'verify',
      'approval'
    ])
    const approvalRecipe = recipes.find((recipe) => recipe.id === 'prepare-tool-approval')
    expect(approvalRecipe?.metadata?.surfaces).toEqual(['agent', 'tool-approval'])
  })

  it('creates localized task starter recipes', () => {
    const recipes = createPromptSuggestionRecipes({
      locale: 'zh',
      include: ['draft-handoff']
    })

    expect(recipes).toEqual([
      {
        id: 'draft-handoff',
        title: '写交接说明',
        prompt: '写一段交接说明，包含背景、已完成工作、剩余风险和已运行命令。',
        description: '让下一个人或下一轮会话可以安全接上。',
        metadata: {
          kind: 'task-starter',
          recipe: 'draft-handoff',
          category: 'handoff',
          surfaces: ['thread', 'release'],
          locale: 'zh'
        }
      }
    ])
  })

  it('filters by composer input and caps visible suggestions', () => {
    const input = shallowRef('risk')
    const max = shallowRef(1)
    const { visibleSuggestions } = usePromptSuggestions({
      input,
      max,
      suggestions: [
        { id: 'risk-1', title: 'Risk review', prompt: 'List deployment risks.' },
        { id: 'risk-2', title: 'Security risk', prompt: 'Find auth risk.' },
        { id: 'summary', title: 'Summary', prompt: 'Summarize the thread.' }
      ]
    })

    expect(visibleSuggestions.value.map((item) => item.id)).toEqual(['risk-1'])

    max.value = 2
    expect(visibleSuggestions.value.map((item) => item.id)).toEqual(['risk-1', 'risk-2'])

    input.value = 'summary'
    expect(visibleSuggestions.value.map((item) => item.id)).toEqual(['summary'])
  })

  it('supports custom filters with message context', () => {
    const messages = shallowRef<Message[]>([
      { id: 'm1', role: 'user', content: 'Need checkout help' }
    ])
    const { visibleSuggestions } = usePromptSuggestions({
      messages,
      suggestions: [
        { id: 'checkout', prompt: 'Run checkout approval demo.', metadata: { mode: 'checkout' } },
        { id: 'general', prompt: 'Summarize this thread.', metadata: { mode: 'general' } }
      ],
      filter(suggestion, context) {
        return (
          suggestion.metadata?.mode === 'general' ||
          context.messages.some((message) => String(message.content).includes('checkout'))
        )
      }
    })

    expect(visibleSuggestions.value.map((item) => item.id)).toEqual(['checkout', 'general'])

    messages.value = [{ id: 'm2', role: 'user', content: 'Need summary' }]
    expect(visibleSuggestions.value.map((item) => item.id)).toEqual(['general'])
  })

  it('returns normalized static suggestions when no loader is configured', async () => {
    const { reloadSuggestions } = usePromptSuggestions({
      suggestions: ['Summarize this thread']
    })

    await expect(reloadSuggestions()).resolves.toEqual([
      {
        id: 'suggestion-1',
        title: 'Summarize this thread',
        prompt: 'Summarize this thread'
      }
    ])
  })

  it('loads dynamic suggestions with input, message, and abort context', async () => {
    const input = shallowRef(' risk ')
    const messages = shallowRef<Message[]>([
      { id: 'm1', role: 'user', content: 'Need release help' }
    ])
    const loaded = deferred<readonly PromptSuggestionInput[]>()
    let context: PromptSuggestionLoaderContext | undefined
    const { visibleSuggestions, isLoading, error, reloadSuggestions } = usePromptSuggestions({
      input,
      messages,
      loader(loaderContext) {
        context = loaderContext
        return loaded.promise
      }
    })

    const result = reloadSuggestions()
    expect(isLoading.value).toBe(true)
    expect(error.value).toBeNull()
    expect(context?.input).toBe('risk')
    expect(context?.messages).toEqual(messages.value)
    expect(context?.signal.aborted).toBe(false)

    loaded.resolve([
      {
        id: 'dynamic-risk',
        title: 'Dynamic risk',
        prompt: 'List release risks.',
        description: 'Loaded from app context'
      }
    ])

    await expect(result).resolves.toEqual([
      {
        id: 'dynamic-risk',
        title: 'Dynamic risk',
        prompt: 'List release risks.',
        description: 'Loaded from app context'
      }
    ])
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(visibleSuggestions.value.map((item) => item.id)).toEqual(['dynamic-risk'])
  })

  it('keeps the latest dynamic suggestion load when reloads overlap', async () => {
    const loads = [
      deferred<readonly PromptSuggestionInput[]>(),
      deferred<readonly PromptSuggestionInput[]>()
    ]
    const contexts: PromptSuggestionLoaderContext[] = []
    const { suggestions, isLoading, reloadSuggestions } = usePromptSuggestions({
      loader(context) {
        contexts.push(context)
        return loads[contexts.length - 1].promise
      }
    })

    const first = reloadSuggestions()
    const second = reloadSuggestions()

    expect(contexts).toHaveLength(2)
    expect(contexts[0].signal.aborted).toBe(true)
    expect(contexts[1].signal.aborted).toBe(false)

    loads[1].resolve([{ id: 'new', prompt: 'Use the newest prompt.' }])
    await second
    expect(isLoading.value).toBe(false)
    expect(suggestions.value.map((item) => item.id)).toEqual(['new'])

    loads[0].resolve([{ id: 'old', prompt: 'This stale prompt should be ignored.' }])
    await first
    expect(suggestions.value.map((item) => item.id)).toEqual(['new'])
  })

  it('exposes loader errors and clears them explicitly', async () => {
    const { error, isLoading, reloadSuggestions, clearError } = usePromptSuggestions({
      loader() {
        throw new Error('suggestion service failed')
      }
    })

    await reloadSuggestions()
    expect(isLoading.value).toBe(false)
    expect(error.value?.message).toBe('suggestion service failed')

    clearError()
    expect(error.value).toBeNull()
  })

  it('selects suggestions by id or object and can clear selection', () => {
    const { suggestions, selectedSuggestion, selectSuggestion, clearSelection } =
      usePromptSuggestions({
        suggestions: [
          { id: 'one', prompt: 'First prompt' },
          { id: 'two', prompt: 'Second prompt' }
        ]
      })

    expect(selectSuggestion('two')?.prompt).toBe('Second prompt')
    expect(selectedSuggestion.value?.id).toBe('two')

    expect(selectSuggestion(suggestions.value[0])?.prompt).toBe('First prompt')
    expect(selectedSuggestion.value?.id).toBe('one')

    expect(selectSuggestion('missing')).toBeNull()
    expect(selectedSuggestion.value).toBeNull()

    selectSuggestion('two')
    clearSelection()
    expect(selectedSuggestion.value).toBeNull()
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
