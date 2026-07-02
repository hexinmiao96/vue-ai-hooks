import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  deserializeChatThreads,
  deserializeChatThreadsState,
  serializeChatThreads,
  serializeChatThreadsState,
  useChatThreads
} from '../src/composables/useChatThreads'
import type { ChatThread } from '../src/composables/useChatThreads'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key) {
      return data.get(key) ?? null
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null
    },
    removeItem(key) {
      data.delete(key)
    },
    setItem(key, value) {
      data.set(key, value)
    }
  } as Storage
}

const date = (value: string) => new Date(value)

describe('useChatThreads', () => {
  it('creates threads, activates the newest thread, and exposes sorted visible threads', () => {
    let index = 0
    const times = [date('2026-01-01T00:00:00.000Z'), date('2026-01-02T00:00:00.000Z')]
    const threads = useChatThreads({
      createId: () => `thread_${++index}`,
      now: () => times[index - 1] ?? times[0]
    })

    const first = threads.createThread({ title: ' First thread ' })
    const second = threads.createThread({ title: 'Second thread' })

    expect(first).toMatchObject({ id: 'thread_1', title: 'First thread' })
    expect(second).toMatchObject({ id: 'thread_2', title: 'Second thread' })
    expect(threads.activeThreadId.value).toBe('thread_2')
    expect(threads.activeThread.value?.title).toBe('Second thread')
    expect(threads.visibleThreads.value.map((thread) => thread.id)).toEqual([
      'thread_2',
      'thread_1'
    ])
    expect(threads.archivedThreads.value).toEqual([])
  })

  it('updates thread metadata, preview fields, title, and updated date', () => {
    const threads = useChatThreads<{ owner: string }>({
      createId: () => 'thread_1',
      now: () => date('2026-01-01T00:00:00.000Z')
    })
    threads.createThread({ title: 'Draft', metadata: { owner: 'support' } })

    const updated = threads.updateThread('thread_1', {
      title: 'Resolved',
      updatedAt: date('2026-01-02T00:00:00.000Z'),
      metadata: { owner: 'billing' },
      messageCount: 3,
      lastMessagePreview: 'All set'
    })

    expect(updated).toMatchObject({
      title: 'Resolved',
      metadata: { owner: 'billing' },
      messageCount: 3,
      lastMessagePreview: 'All set'
    })
    expect(updated?.updatedAt.toISOString()).toBe('2026-01-02T00:00:00.000Z')

    const touched = threads.touchThread('thread_1', {
      metadata: null,
      lastMessagePreview: null
    })

    expect(touched?.metadata).toBeUndefined()
    expect(touched?.lastMessagePreview).toBeUndefined()
    expect(threads.renameThread('thread_1', '   ')).toBeNull()
    expect(threads.updateThread('missing', { title: 'Missing' })).toBeNull()
  })

  it('archives, restores, deletes, and clears threads', () => {
    let timestamp = 0
    const threads = useChatThreads({
      createId: (prefix) => `${prefix}_${++timestamp}`,
      now: () => new Date(Date.UTC(2026, 0, timestamp + 1))
    })
    const first = threads.createThread({ title: 'First' })
    const second = threads.createThread({ title: 'Second' })

    const archived = threads.archiveThread(second.id)
    expect(archived?.archivedAt).toBeInstanceOf(Date)
    expect(threads.activeThreadId.value).toBeNull()
    expect(threads.visibleThreads.value.map((thread) => thread.id)).toEqual([first.id])
    expect(threads.archivedThreads.value.map((thread) => thread.id)).toEqual([second.id])
    expect(threads.archiveThread('missing')).toBeNull()

    const restored = threads.restoreThread(second.id)
    expect(restored?.archivedAt).toBeUndefined()
    expect(threads.activeThreadId.value).toBe(second.id)

    const deleted = threads.deleteThread(second.id)
    expect(deleted?.id).toBe(second.id)
    expect(threads.activeThreadId.value).toBeNull()
    expect(threads.deleteThread('missing')).toBeNull()

    threads.clearThreads()
    expect(threads.threads.value).toEqual([])
    expect(threads.activeThreadId.value).toBeNull()
  })

  it('does not activate archived or explicitly inactive created threads', () => {
    const threads = useChatThreads({
      createId: () => 'thread_1',
      now: () => date('2026-01-01T00:00:00.000Z')
    })

    threads.createThread({ title: 'Inactive', active: false })
    expect(threads.activeThreadId.value).toBeNull()

    threads.createThread({
      id: 'thread_2',
      title: 'Archived',
      archivedAt: date('2026-01-02T00:00:00.000Z')
    })
    expect(threads.activeThreadId.value).toBeNull()
    threads.setActiveThread('thread_2')
    expect(threads.activeThreadId.value).toBeNull()
    threads.setActiveThread(null)
    expect(threads.activeThreadId.value).toBeNull()
  })

  it('serializes and deserializes Date-safe thread lists and state', () => {
    const source: ChatThread<{ team: string }>[] = [
      {
        id: 'thread_1',
        title: 'Support',
        createdAt: date('2026-01-01T00:00:00.000Z'),
        updatedAt: date('2026-01-02T00:00:00.000Z'),
        archivedAt: date('2026-01-03T00:00:00.000Z'),
        metadata: { team: 'support' },
        messageCount: 2,
        lastMessagePreview: 'Done'
      }
    ]

    const serialized = serializeChatThreads(source)
    expect(serialized).toEqual([
      {
        id: 'thread_1',
        title: 'Support',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        archivedAt: '2026-01-03T00:00:00.000Z',
        metadata: { team: 'support' },
        messageCount: 2,
        lastMessagePreview: 'Done'
      }
    ])
    expect(deserializeChatThreads(serialized)?.[0].createdAt).toBeInstanceOf(Date)

    const state = serializeChatThreadsState({ threads: source, activeThreadId: 'thread_1' })
    expect(deserializeChatThreadsState(state)?.activeThreadId).toBeNull()
    expect(deserializeChatThreads('bad')).toBeNull()
    expect(deserializeChatThreads([{ id: 'bad' }])).toBeNull()
    expect(deserializeChatThreadsState({ threads: 'bad' })).toBeNull()
  })

  it('keeps explicitly empty message previews during normalization and serialization', () => {
    const threads = useChatThreads({
      initialThreads: [
        {
          id: 'thread_1',
          title: 'Empty preview',
          createdAt: date('2026-01-01T00:00:00.000Z'),
          updatedAt: date('2026-01-01T00:00:00.000Z'),
          lastMessagePreview: ''
        }
      ],
      now: () => date('2026-01-02T00:00:00.000Z')
    })

    expect(threads.threads.value[0]).toHaveProperty('lastMessagePreview', '')
    expect(serializeChatThreads(threads.threads.value)[0]).toHaveProperty('lastMessagePreview', '')
  })

  it('persists thread state and clears persisted storage', async () => {
    const storage = memoryStorage()
    storage.setItem(
      'threads:v1',
      JSON.stringify({
        activeThreadId: 'thread_1',
        threads: [
          {
            id: 'thread_1',
            title: 'Saved',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z'
          }
        ]
      })
    )
    const threads = useChatThreads({
      persist: { key: 'threads', version: 1, storage },
      now: () => date('2026-01-03T00:00:00.000Z')
    })

    expect(threads.activeThread.value?.title).toBe('Saved')
    threads.renameThread('thread_1', 'Renamed')
    await nextTick()

    expect(JSON.parse(storage.getItem('threads:v1') as string)).toMatchObject({
      activeThreadId: 'thread_1',
      threads: [{ id: 'thread_1', title: 'Renamed' }]
    })

    threads.clearPersistedThreads()
    expect(storage.getItem('threads:v1')).toBeNull()
  })

  it('forwards persistence load, save, and clear errors', async () => {
    const loadErrors: Error[] = []
    const saveErrors: Error[] = []
    const clearErrors: Error[] = []
    const badLoadStorage = memoryStorage()
    badLoadStorage.setItem('threads:v1', 'not-json')

    const loadedThreads = useChatThreads({
      now: () => date('2026-01-04T00:00:00.000Z'),
      persist: {
        key: 'threads',
        version: 1,
        storage: badLoadStorage,
        onLoadError: (error) => loadErrors.push(error)
      }
    })

    expect(loadErrors).toHaveLength(1)
    expect(loadedThreads.persistenceError.value).toMatchObject({
      phase: 'load',
      key: 'threads',
      version: 1,
      message: expect.any(String),
      name: 'SyntaxError',
      timestamp: date('2026-01-04T00:00:00.000Z')
    })

    const failingStorage: Storage = {
      ...memoryStorage(),
      setItem() {
        throw new Error('quota')
      },
      removeItem() {
        throw 'remove failed'
      }
    } as Storage
    const threads = useChatThreads({
      now: () => date('2026-01-05T00:00:00.000Z'),
      persist: {
        key: 'threads',
        version: 1,
        storage: failingStorage,
        onError: (error) => saveErrors.push(error),
        onClearError: (error) => clearErrors.push(error)
      }
    })

    threads.createThread({ title: 'Support' })
    await nextTick()

    expect(saveErrors[0]?.message).toBe('quota')
    expect(threads.persistenceError.value).toMatchObject({
      phase: 'save',
      key: 'threads',
      version: 1,
      message: 'quota',
      name: 'Error',
      timestamp: date('2026-01-05T00:00:00.000Z')
    })

    threads.clearPersistenceError()
    expect(threads.persistenceError.value).toBeNull()

    threads.clearPersistedThreads()

    expect(clearErrors[0]?.message).toBe('remove failed')
    expect(threads.persistenceError.value).toMatchObject({
      phase: 'clear',
      key: 'threads',
      version: 1,
      message: 'remove failed',
      name: 'Error',
      timestamp: date('2026-01-05T00:00:00.000Z')
    })
  })

  it('normalizes duplicate and invalid initial threads', () => {
    const threads = useChatThreads({
      initialActiveThreadId: 'thread_1',
      initialThreads: [
        {
          id: 'thread_1',
          title: '',
          createdAt: date('2026-01-01T00:00:00.000Z'),
          updatedAt: date('2026-01-01T00:00:00.000Z')
        },
        {
          id: 'thread_1',
          title: 'Duplicate',
          createdAt: date('2026-01-02T00:00:00.000Z'),
          updatedAt: date('2026-01-02T00:00:00.000Z')
        }
      ],
      now: () => date('2026-01-03T00:00:00.000Z')
    })

    expect(threads.threads.value).toHaveLength(1)
    expect(threads.threads.value[0].title).toBe('Untitled chat')
    expect(threads.activeThreadId.value).toBe('thread_1')
  })
})
