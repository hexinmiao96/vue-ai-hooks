import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createPromptSuggestionRecipes, usePromptSuggestions } from '../src/react'
import type { Message } from '../src/types'
import type {
  PromptSuggestion,
  PromptSuggestionInput,
  PromptSuggestionLoaderContext
} from '../src/composables/usePromptSuggestions'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

describe('react usePromptSuggestions', () => {
  it('normalizes string and object suggestions', () => {
    const { result } = renderHook(() =>
      usePromptSuggestions({
        suggestions: [
          'Summarize this thread',
          {
            id: 'risks',
            title: 'Find risks',
            prompt: 'Find the top risks in this conversation.',
            description: 'Useful before handoff'
          },
          '',
          { prompt: '   ' }
        ]
      })
    )

    expect(result.current.suggestions).toEqual([
      {
        id: 'suggestion-1',
        title: 'Summarize this thread',
        prompt: 'Summarize this thread'
      },
      {
        id: 'risks',
        title: 'Find risks',
        prompt: 'Find the top risks in this conversation.',
        description: 'Useful before handoff'
      }
    ])
  })

  it('uses task starter recipes from the React subpath', () => {
    const recipes = createPromptSuggestionRecipes({
      locale: 'zh',
      include: ['find-risks', 'draft-handoff'],
      surfaces: ['thread']
    })

    const { result } = renderHook(() =>
      usePromptSuggestions({
        input: '不明确假设',
        suggestions: recipes
      })
    )

    expect(result.current.visibleSuggestions.map((suggestion) => suggestion.id)).toEqual([
      'find-risks'
    ])
    expect(result.current.suggestions[0].metadata).toMatchObject({
      kind: 'task-starter',
      recipe: 'find-risks',
      category: 'review',
      surfaces: ['chat', 'thread', 'release'],
      locale: 'zh'
    })
  })

  it('filters React subpath recipes by backend surfaces', () => {
    const recipes = createPromptSuggestionRecipes({
      surfaces: ['backend'],
      categories: ['plan', 'debug']
    })

    expect(recipes.map((recipe) => recipe.id)).toEqual([
      'inspect-trace',
      'design-agent-route',
      'triage-provider-error'
    ])
    const routeRecipe = recipes.find((recipe) => recipe.id === 'design-agent-route')
    expect(routeRecipe?.metadata?.surfaces).toEqual(['agent', 'backend'])
  })

  it('filters visible suggestions by input, max, and messages', () => {
    const messages = [{ id: 'm1', role: 'user', content: 'Need release help' }] as Message[]

    const { result, rerender } = renderHook(
      (props: { input: string; messages: Message[]; max: number }) =>
        usePromptSuggestions({
          input: props.input,
          messages: props.messages,
          suggestions: [
            {
              id: 'checkout',
              prompt: 'Run checkout approval demo.',
              metadata: { mode: 'checkout' }
            },
            { id: 'summary', prompt: 'Summarize the thread.', metadata: { mode: 'general' } }
          ],
          filter(suggestion, context) {
            return (
              suggestion.metadata?.mode === 'general' ||
              context.messages.some((message) => String(message.content).includes('checkout'))
            )
          },
          max: props.max
        }),
      { initialProps: { input: '', messages, max: 1 } }
    )

    expect(result.current.visibleSuggestions.map((item) => item.id)).toEqual(['summary'])

    rerender({
      input: '',
      max: 1,
      messages: [{ id: 'm2', role: 'user', content: 'Need summary' }]
    })
    expect(result.current.visibleSuggestions.map((item) => item.id)).toEqual(['summary'])

    rerender({
      input: 'x',
      max: 2,
      messages: [{ id: 'm2', role: 'user', content: 'checkout approval requested' }]
    })
    expect(result.current.visibleSuggestions.map((item) => item.id)).toEqual([
      'checkout',
      'summary'
    ])

    rerender({
      input: 'summary',
      max: 1,
      messages: [{ id: 'm2', role: 'user', content: 'Need summary' }]
    })
    expect(result.current.visibleSuggestions.map((item) => item.id)).toEqual(['summary'])
  })

  it('loads dynamic suggestions with normalized input and messages context', async () => {
    const input = '  risk '
    const messages: Message[] = [{ id: 'm1', role: 'user', content: 'Need release help' }]
    const deferredLoad = deferred<readonly PromptSuggestionInput[]>()
    let context: PromptSuggestionLoaderContext | undefined

    const { result } = renderHook(() =>
      usePromptSuggestions({
        input,
        messages,
        loader(loaderContext) {
          context = loaderContext
          return deferredLoad.promise
        }
      })
    )

    let pending: Promise<PromptSuggestion[]>
    await act(async () => {
      pending = result.current.reloadSuggestions()
    })
    expect(result.current.isLoading).toBe(true)
    expect(context?.input).toBe('risk')
    expect(context?.messages).toEqual(messages)
    expect(context?.signal.aborted).toBe(false)

    const payload = [{ id: 'dynamic-risk', prompt: 'List release risks.' }]
    await act(async () => {
      deferredLoad.resolve(payload)
      await pending!
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.suggestions).toEqual(
      expect.arrayContaining([
        {
          id: 'dynamic-risk',
          title: 'List release risks.',
          prompt: 'List release risks.'
        }
      ])
    )
  })

  it('keeps the latest reload when multiple loads overlap', async () => {
    const loads = [
      deferred<readonly PromptSuggestionInput[]>(),
      deferred<readonly PromptSuggestionInput[]>()
    ]
    const contexts: PromptSuggestionLoaderContext[] = []

    const { result } = renderHook(() =>
      usePromptSuggestions({
        loader(loaderContext) {
          contexts.push(loaderContext)
          return loads[contexts.length - 1].promise
        }
      })
    )

    let firstLoad: Promise<PromptSuggestion[]>
    let secondLoad: Promise<PromptSuggestion[]>

    await act(async () => {
      firstLoad = result.current.reloadSuggestions()
      secondLoad = result.current.reloadSuggestions()
    })

    expect(contexts).toHaveLength(2)
    expect(contexts[0].signal.aborted).toBe(true)
    expect(contexts[1].signal.aborted).toBe(false)

    await act(async () => {
      loads[1].resolve([{ id: 'new', prompt: 'Use the latest prompt.' }])
      await secondLoad
    })

    await act(async () => {
      loads[0].resolve([{ id: 'old', prompt: 'Ignored stale prompt.' }])
      await firstLoad
    })

    expect(result.current.suggestions.map((suggestion) => suggestion.id)).toEqual(['new'])
    expect(result.current.isLoading).toBe(false)
  })

  it('supports function-based options and load-on-init loader behavior', async () => {
    const onLoad = vi.fn((context) => {
      expect(context.messages).toEqual([
        { id: 'm1', role: 'user', content: 'Need release help' } as Message
      ])
      return [{ id: 'dynamic', prompt: `Need ${context.input}` }]
    })
    const staticSuggestions = [{ id: 'static', prompt: 'release plan starter' }]
    const resolveInput = () => ' release plan '
    const resolveMessages = () => [
      { id: 'm1', role: 'user', content: 'Need release help' } as Message
    ]
    const resolveMax = () => 2

    const { result } = renderHook(() =>
      usePromptSuggestions({
        suggestions: staticSuggestions,
        input: resolveInput,
        messages: resolveMessages,
        max: resolveMax,
        loadOnInit: true,
        loader: onLoad
      })
    )

    await waitFor(() => expect(onLoad).toHaveBeenCalled())

    await waitFor(() => expect(onLoad).toHaveBeenCalledTimes(1))
    expect(result.current.visibleSuggestions).toEqual([
      { id: 'static', prompt: 'release plan starter', title: 'release plan starter' },
      { id: 'dynamic', prompt: 'Need release plan', title: 'Need release plan' }
    ])
  })

  it('tracks loader errors and clears them explicitly', async () => {
    const { result } = renderHook(() =>
      usePromptSuggestions({
        loader() {
          throw new Error('suggestion service failed')
        }
      })
    )

    await act(async () => {
      await result.current.reloadSuggestions()
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error?.message).toBe('suggestion service failed')

    act(() => {
      result.current.clearError()
    })
    expect(result.current.error).toBeNull()
  })

  it('normalizes no-loader reloads and non-Error failures', async () => {
    const { result: withLoader } = renderHook(() =>
      usePromptSuggestions({
        suggestions: [{ id: 'base', prompt: 'Base prompt' }],
        loader() {
          throw 'network failed'
        }
      })
    )

    await act(async () => {
      await withLoader.current.reloadSuggestions()
    })
    expect(withLoader.current.error?.message).toBe('network failed')

    const { result: withoutLoader } = renderHook(() =>
      usePromptSuggestions({
        suggestions: [{ id: 'base', prompt: 'Base prompt' }]
      })
    )

    let synced: PromptSuggestion[] = []
    await act(async () => {
      synced = await withoutLoader.current.reloadSuggestions()
    })

    expect(synced).toEqual([
      {
        id: 'base',
        title: 'Base prompt',
        prompt: 'Base prompt'
      }
    ])
  })

  it('selects by id/object and clears selection', () => {
    const { result } = renderHook(() =>
      usePromptSuggestions({
        suggestions: [
          { id: 'one', prompt: 'First prompt' },
          { id: 'two', prompt: 'Second prompt' }
        ]
      })
    )

    act(() => {
      expect(result.current.selectSuggestion('two')?.prompt).toBe('Second prompt')
    })
    expect(result.current.selectedSuggestion?.id).toBe('two')

    act(() => {
      expect(result.current.selectSuggestion(result.current.suggestions[0])?.prompt).toBe(
        'First prompt'
      )
    })
    expect(result.current.selectedSuggestion?.id).toBe('one')

    act(() => {
      expect(result.current.selectSuggestion('missing')).toBeNull()
    })
    expect(result.current.selectedSuggestion).toBeNull()

    act(() => {
      result.current.selectSuggestion('two')
      result.current.clearSelection()
    })
    expect(result.current.selectedSuggestion).toBeNull()
  })

  it('exposes input/max controls from hooks', async () => {
    const messages: Message[] = [{ id: 'm1', role: 'user', content: 'Need one two three' }]
    const { result, rerender } = renderHook(
      (props: { messages: Message[]; max: number }) =>
        usePromptSuggestions({
          messages: props.messages,
          max: props.max,
          suggestions: [
            { id: 'one', prompt: 'One' },
            { id: 'two', prompt: 'Two' },
            { id: 'three', prompt: 'Three' }
          ]
        }),
      { initialProps: { messages, max: 1 } }
    )

    expect(result.current.visibleSuggestions.map((item) => item.id)).toEqual(['one'])

    rerender({ messages, max: 2 })
    expect(result.current.visibleSuggestions.map((item) => item.id)).toEqual(['one', 'two'])
  })
})

function deferred<T>() {
  const context: {
    promise: Promise<T>
    resolve: (value: T) => void
    reject: (reason?: unknown) => void
  } = {
    promise: null as unknown as Promise<T>,
    resolve: () => {},
    reject: () => {}
  }
  const promise = new Promise<T>((resolve, reject) => {
    context.resolve = resolve
    context.reject = reject
  })
  context.promise = promise
  return context
}
