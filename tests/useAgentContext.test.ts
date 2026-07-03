import { describe, expect, it } from 'vitest'
import { computed, effectScope, shallowRef } from 'vue'
import {
  createAgentContextMessage,
  formatAgentContexts,
  useAgentContext,
  useAgentContextRegistry,
  withAgentContextMessage
} from '../src/composables/useAgentContext'

describe('useAgentContextRegistry', () => {
  it('tracks reactive context entries and formats them for model context', () => {
    const selectedCategory = shallowRef('electronics')
    const registry = useAgentContextRegistry()
    registry.register({
      id: 'filters',
      description: computed(() => `Selected category ${selectedCategory.value}`),
      value: () => ({ category: selectedCategory.value, maxPrice: 500 })
    })

    expect(registry.contexts.value).toEqual([
      {
        id: 'filters',
        description: 'Selected category electronics',
        value: { category: 'electronics', maxPrice: 500 }
      }
    ])
    expect(registry.toText()).toBe(
      'Application context\n- Selected category electronics: {"category":"electronics","maxPrice":500}'
    )

    selectedCategory.value = 'books'
    expect(registry.contexts.value[0]).toMatchObject({
      description: 'Selected category books',
      value: { category: 'books', maxPrice: 500 }
    })
  })

  it('removes scoped contexts on cleanup and supports manual unregister', () => {
    const registry = useAgentContextRegistry()
    const scope = effectScope()
    scope.run(() => {
      useAgentContext(registry, {
        description: 'Scoped route',
        value: 'orders'
      })
    })
    const unregister = registry.register({
      description: 'Manual context',
      value: { tenant: 'acme' }
    })

    expect(registry.contexts.value.map((context) => context.description)).toEqual([
      'Scoped route',
      'Manual context'
    ])

    scope.stop()
    expect(registry.contexts.value.map((context) => context.description)).toEqual([
      'Manual context'
    ])

    unregister()
    expect(registry.contexts.value).toEqual([])
  })

  it('skips disabled, empty, undefined, and non-serializable contexts', () => {
    const registry = useAgentContextRegistry()
    const circular: Record<string, unknown> = {}
    circular.self = circular

    registry.register({ description: 'Hidden', value: 'secret', enabled: false })
    registry.register({ description: '', value: 'missing description' })
    registry.register({ description: 'Undefined', value: undefined })
    registry.register({ description: 'Circular', value: circular as never })
    registry.register({ description: 'Valid null', value: null })

    expect(registry.contexts.value).toEqual([
      {
        id: 'agent-context-5',
        description: 'Valid null',
        value: null
      }
    ])
  })

  it('creates system messages and inserts them after leading system messages', () => {
    const contexts = [
      {
        id: 'workspace',
        description: 'Workspace',
        value: 'support'
      }
    ]

    expect(formatAgentContexts(contexts, { title: 'Runtime context' })).toBe(
      'Runtime context\n- Workspace: support'
    )
    expect(createAgentContextMessage(contexts, { id: 'ctx' })).toMatchObject({
      id: 'ctx',
      role: 'system',
      content: 'Application context\n- Workspace: support'
    })
    expect(
      withAgentContextMessage(
        [
          { id: 's1', role: 'system', content: 'Be brief.' },
          { id: 'u1', role: 'user', content: 'Hello' }
        ],
        contexts,
        { id: 'ctx' }
      ).map((message) => message.id)
    ).toEqual(['s1', 'ctx', 'u1'])
  })
})
