import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { usePersist } from '../src/composables/usePersist'

/** In-memory shim that matches the Storage interface. */
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear() { data.clear() },
    getItem(k) { return data.get(k) ?? null },
    key(i) { return Array.from(data.keys())[i] ?? null },
    removeItem(k) { data.delete(k) },
    setItem(k, v) { data.set(k, v) }
  } as Storage
}

describe('usePersist', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('hydrates from storage on creation', () => {
    const storage = memoryStorage()
    storage.setItem('my-key:v1', JSON.stringify(['a', 'b', 'c']))
    const source = ref<string[]>([])
    usePersist(source, { key: 'my-key', version: 1, storage })
    expect(source.value).toEqual(['a', 'b', 'c'])
  })

  it('writes to storage on change', async () => {
    const storage = memoryStorage()
    const source = ref<string[]>(['x'])
    usePersist(source, { key: 'my-key', storage })
    source.value = ['x', 'y']
    await nextTick()
    expect(JSON.parse(storage.getItem('my-key') as string)).toEqual(['x', 'y'])
  })

  it('uses versioned key when version is provided', () => {
    const storage = memoryStorage()
    storage.setItem('my-key:v2', JSON.stringify(['v2']))
    const source = ref<string[]>([])
    usePersist(source, { key: 'my-key', version: 2, storage })
    expect(source.value).toEqual(['v2'])
  })

  it('ignores old version when version changes', () => {
    const storage = memoryStorage()
    storage.setItem('my-key:v1', JSON.stringify(['old']))
    const source = ref<string[]>([])
    usePersist(source, { key: 'my-key', version: 2, storage })
    expect(source.value).toEqual([])
  })

  it('clear() removes the storage entry', async () => {
    const storage = memoryStorage()
    const source = ref<string[]>(['x'])
    const { clear } = usePersist(source, { key: 'my-key', storage })
    source.value = ['x', 'y']
    await nextTick()
    clear()
    expect(storage.getItem('my-key')).toBeNull()
  })

  it('reports save errors via onError', async () => {
    const failingStorage: Storage = {
      ...memoryStorage(),
      setItem() { throw new Error('quota') }
    } as Storage
    const errors: Error[] = []
    const source = ref<string[]>(['x'])
    usePersist(source, { key: 'k', storage: failingStorage, onError: (e) => errors.push(e) })
    source.value = ['x', 'y']
    await nextTick()
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('quota')
  })

  it('silently ignores load errors (does not throw)', () => {
    const badStorage: Storage = {
      ...memoryStorage(),
      getItem() { return 'not-json' }
    } as Storage
    const source = ref<string[]>(['fallback'])
    // Should not throw
    usePersist(source, { key: 'k', storage: badStorage })
    expect(source.value).toEqual(['fallback'])
  })

  it('works without storage (SSR / no window)', () => {
    const source = ref<string[]>(['a'])
    const { clear } = usePersist(source, { key: 'k', storage: null })
    source.value = ['b']
    // No throw, clear() is a no-op
    expect(() => clear()).not.toThrow()
  })
})
