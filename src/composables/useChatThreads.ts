import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { usePersist, type UsePersistOptions } from './usePersist'
import { createId } from '../utils/id'
import type { IdGenerator } from '../types'

type ThreadMetadata = Record<string, unknown>

export interface ChatThread<TMetadata extends ThreadMetadata = ThreadMetadata> {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  archivedAt?: Date
  metadata?: TMetadata
  messageCount?: number
  lastMessagePreview?: string
}

export interface SerializedChatThread<TMetadata extends ThreadMetadata = ThreadMetadata> {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
  metadata?: TMetadata
  messageCount?: number
  lastMessagePreview?: string
}

export interface ChatThreadsState<TMetadata extends ThreadMetadata = ThreadMetadata> {
  threads: ChatThread<TMetadata>[]
  activeThreadId: string | null
}

export interface SerializedChatThreadsState<TMetadata extends ThreadMetadata = ThreadMetadata> {
  threads: SerializedChatThread<TMetadata>[]
  activeThreadId: string | null
}

export interface CreateChatThreadInput<TMetadata extends ThreadMetadata = ThreadMetadata> {
  id?: string
  title?: string
  createdAt?: Date
  updatedAt?: Date
  archivedAt?: Date | null
  metadata?: TMetadata
  messageCount?: number
  lastMessagePreview?: string
  active?: boolean
}

export interface UpdateChatThreadInput<TMetadata extends ThreadMetadata = ThreadMetadata> {
  title?: string
  updatedAt?: Date
  archivedAt?: Date | null
  metadata?: TMetadata | null
  messageCount?: number
  lastMessagePreview?: string | null
}

export interface ChatThreadsPersistOptions<TMetadata extends ThreadMetadata = ThreadMetadata> {
  key: string
  version?: number
  storage?: Storage | null
  serialize?: UsePersistOptions<ChatThreadsState<TMetadata>>['serialize']
  deserialize?: UsePersistOptions<ChatThreadsState<TMetadata>>['deserialize']
  onError?: UsePersistOptions<ChatThreadsState<TMetadata>>['onError']
  onLoadError?: UsePersistOptions<ChatThreadsState<TMetadata>>['onLoadError']
  onClearError?: UsePersistOptions<ChatThreadsState<TMetadata>>['onClearError']
}

export type ChatThreadsPersistenceErrorPhase = 'load' | 'save' | 'clear'

export interface ChatThreadsPersistenceErrorInfo {
  phase: ChatThreadsPersistenceErrorPhase
  key: string
  version?: number
  message: string
  name?: string
  timestamp: Date
}

export interface UseChatThreadsOptions<TMetadata extends ThreadMetadata = ThreadMetadata> {
  initialThreads?: ChatThread<TMetadata>[]
  initialActiveThreadId?: string | null
  persist?: ChatThreadsPersistOptions<TMetadata>
  createId?: IdGenerator
  now?: () => Date
}

export interface UseChatThreadsReturn<TMetadata extends ThreadMetadata = ThreadMetadata> {
  threads: ComputedRef<ChatThread<TMetadata>[]>
  visibleThreads: ComputedRef<ChatThread<TMetadata>[]>
  archivedThreads: ComputedRef<ChatThread<TMetadata>[]>
  activeThreadId: ComputedRef<string | null>
  activeThread: ComputedRef<ChatThread<TMetadata> | null>
  persistenceError: ComputedRef<ChatThreadsPersistenceErrorInfo | null>
  createThread: (input?: CreateChatThreadInput<TMetadata>) => ChatThread<TMetadata>
  setActiveThread: (id: string | null) => void
  renameThread: (id: string, title: string) => ChatThread<TMetadata> | null
  updateThread: (
    id: string,
    input: UpdateChatThreadInput<TMetadata>
  ) => ChatThread<TMetadata> | null
  touchThread: (
    id: string,
    input?: Omit<UpdateChatThreadInput<TMetadata>, 'archivedAt'>
  ) => ChatThread<TMetadata> | null
  archiveThread: (id: string) => ChatThread<TMetadata> | null
  restoreThread: (id: string) => ChatThread<TMetadata> | null
  deleteThread: (id: string) => ChatThread<TMetadata> | null
  clearThreads: () => void
  clearPersistedThreads: () => void
  clearPersistenceError: () => void
}

interface MutableChatThreadsState<TMetadata extends ThreadMetadata = ThreadMetadata> {
  threads: ChatThread<TMetadata>[]
  activeThreadId: string | null
}

export function useChatThreads<TMetadata extends ThreadMetadata = ThreadMetadata>(
  options: UseChatThreadsOptions<TMetadata> = {}
): UseChatThreadsReturn<TMetadata> {
  const makeId = options.createId ?? createId
  const now = options.now ?? (() => new Date())
  const persistOptions = options.persist
  const lastPersistenceError = ref<ChatThreadsPersistenceErrorInfo | null>(null)
  const state = ref(
    normalizeThreadsState(
      {
        threads: options.initialThreads ?? [],
        activeThreadId: options.initialActiveThreadId ?? null
      },
      now
    )
  ) as Ref<MutableChatThreadsState<TMetadata>>
  const persistence = persistOptions
    ? usePersist(state, {
        key: persistOptions.key,
        version: persistOptions.version,
        storage: persistOptions.storage,
        serialize: persistOptions.serialize ?? serializeChatThreadsState,
        deserialize: persistOptions.deserialize ?? ((raw) => deserializeChatThreadsState(raw)),
        onError: handlePersistenceError('save', persistOptions.onError),
        onLoadError: handlePersistenceError('load', persistOptions.onLoadError),
        onClearError: handlePersistenceError('clear', persistOptions.onClearError)
      })
    : null

  const threads = computed(() => sortedThreads(state.value.threads))
  const visibleThreads = computed(() => threads.value.filter((thread) => !thread.archivedAt))
  const archivedThreads = computed(() => threads.value.filter((thread) => thread.archivedAt))
  const activeThreadId = computed(() => state.value.activeThreadId)
  const activeThread = computed(
    () =>
      state.value.threads.find(
        (thread) => thread.id === state.value.activeThreadId && !thread.archivedAt
      ) ?? null
  )
  const persistenceError = computed(() => lastPersistenceError.value)

  function createThread(input: CreateChatThreadInput<TMetadata> = {}) {
    const timestamp = input.createdAt ?? now()
    const updatedAt = input.updatedAt ?? timestamp
    const thread: ChatThread<TMetadata> = {
      id: input.id ?? makeId('thread'),
      title: normalizeTitle(input.title) ?? 'New chat',
      createdAt: cloneDate(timestamp),
      updatedAt: cloneDate(updatedAt),
      ...(input.archivedAt ? { archivedAt: cloneDate(input.archivedAt) } : {}),
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.messageCount !== undefined ? { messageCount: input.messageCount } : {}),
      ...(input.lastMessagePreview !== undefined
        ? { lastMessagePreview: input.lastMessagePreview }
        : {})
    }
    replaceState({
      threads: [thread, ...state.value.threads.filter((item) => item.id !== thread.id)],
      activeThreadId:
        input.active === false && state.value.activeThreadId === thread.id
          ? null
          : input.active === false || thread.archivedAt
            ? state.value.activeThreadId
            : thread.id
    })
    return thread
  }

  function setActiveThread(id: string | null) {
    if (id === null) {
      replaceState({ ...state.value, activeThreadId: null })
      return
    }
    const thread = state.value.threads.find((item) => item.id === id && !item.archivedAt)
    if (thread) {
      replaceState({ ...state.value, activeThreadId: id })
    }
  }

  function renameThread(id: string, title: string) {
    const normalized = normalizeTitle(title)
    if (!normalized) return null
    return updateThread(id, { title: normalized })
  }

  function updateThread(id: string, input: UpdateChatThreadInput<TMetadata>) {
    const existing = state.value.threads.find((thread) => thread.id === id)
    if (!existing) return null
    const updated: ChatThread<TMetadata> = {
      ...existing,
      updatedAt: cloneDate(input.updatedAt ?? now())
    }
    if (input.title !== undefined) {
      updated.title = normalizeTitle(input.title) ?? existing.title
    }
    if (input.archivedAt === null) {
      delete updated.archivedAt
    } else if (input.archivedAt) {
      updated.archivedAt = cloneDate(input.archivedAt)
    }
    if (input.metadata === null) {
      delete updated.metadata
    } else if (input.metadata) {
      updated.metadata = input.metadata
    }
    if (input.messageCount !== undefined) {
      updated.messageCount = input.messageCount
    }
    if (input.lastMessagePreview === null) {
      delete updated.lastMessagePreview
    } else if (input.lastMessagePreview !== undefined) {
      updated.lastMessagePreview = input.lastMessagePreview
    }
    const threads = state.value.threads.map((thread) => (thread.id === id ? updated : thread))
    const activeId =
      updated.archivedAt && state.value.activeThreadId === id ? null : state.value.activeThreadId
    replaceState({ threads, activeThreadId: activeId })
    return updated
  }

  function touchThread(
    id: string,
    input: Omit<UpdateChatThreadInput<TMetadata>, 'archivedAt'> = {}
  ) {
    return updateThread(id, input)
  }

  function archiveThread(id: string) {
    const existing = state.value.threads.find((thread) => thread.id === id)
    if (!existing || existing.archivedAt) return existing ?? null
    return updateThread(id, { archivedAt: now() })
  }

  function restoreThread(id: string) {
    const restored = updateThread(id, { archivedAt: null })
    if (restored) setActiveThread(id)
    return restored
  }

  function deleteThread(id: string) {
    const existing = state.value.threads.find((thread) => thread.id === id)
    if (!existing) return null
    replaceState({
      threads: state.value.threads.filter((thread) => thread.id !== id),
      activeThreadId: state.value.activeThreadId === id ? null : state.value.activeThreadId
    })
    return existing
  }

  function clearThreads() {
    replaceState({ threads: [], activeThreadId: null })
  }

  function clearPersistedThreads() {
    persistence?.clear()
  }

  function clearPersistenceError() {
    lastPersistenceError.value = null
  }

  function handlePersistenceError(
    phase: ChatThreadsPersistenceErrorPhase,
    handler?: (err: Error) => void
  ) {
    return (error: Error) => {
      if (persistOptions) {
        lastPersistenceError.value = {
          phase,
          key: persistOptions.key,
          ...(persistOptions.version !== undefined ? { version: persistOptions.version } : {}),
          message: error.message,
          ...(error.name ? { name: error.name } : {}),
          timestamp: cloneDate(now())
        }
      }
      handler?.(error)
    }
  }

  function replaceState(next: MutableChatThreadsState<TMetadata>) {
    state.value = normalizeThreadsState(next, now)
  }

  return {
    threads,
    visibleThreads,
    archivedThreads,
    activeThreadId,
    activeThread,
    persistenceError,
    createThread,
    setActiveThread,
    renameThread,
    updateThread,
    touchThread,
    archiveThread,
    restoreThread,
    deleteThread,
    clearThreads,
    clearPersistedThreads,
    clearPersistenceError
  }
}

export function serializeChatThreads<TMetadata extends ThreadMetadata = ThreadMetadata>(
  threads: ChatThread<TMetadata>[]
): SerializedChatThread<TMetadata>[] {
  return threads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    ...(thread.archivedAt ? { archivedAt: thread.archivedAt.toISOString() } : {}),
    ...(thread.metadata ? { metadata: thread.metadata } : {}),
    ...(thread.messageCount !== undefined ? { messageCount: thread.messageCount } : {}),
    ...(thread.lastMessagePreview !== undefined
      ? { lastMessagePreview: thread.lastMessagePreview }
      : {})
  }))
}

export function deserializeChatThreads<TMetadata extends ThreadMetadata = ThreadMetadata>(
  raw: unknown
): ChatThread<TMetadata>[] | null {
  if (!Array.isArray(raw)) return null
  const threads: ChatThread<TMetadata>[] = []
  for (const item of raw) {
    const thread = deserializeChatThread<TMetadata>(item)
    if (!thread) return null
    threads.push(thread)
  }
  return threads
}

export function serializeChatThreadsState<TMetadata extends ThreadMetadata = ThreadMetadata>(
  state: ChatThreadsState<TMetadata>
): SerializedChatThreadsState<TMetadata> {
  return {
    threads: serializeChatThreads(state.threads),
    activeThreadId: state.activeThreadId
  }
}

export function deserializeChatThreadsState<TMetadata extends ThreadMetadata = ThreadMetadata>(
  raw: unknown
): ChatThreadsState<TMetadata> | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const threads = deserializeChatThreads<TMetadata>(record.threads)
  if (!threads) return null
  return normalizeThreadsState(
    {
      threads,
      activeThreadId: typeof record.activeThreadId === 'string' ? record.activeThreadId : null
    },
    () => new Date()
  )
}

function normalizeThreadsState<TMetadata extends ThreadMetadata>(
  state: ChatThreadsState<TMetadata>,
  now: () => Date
): MutableChatThreadsState<TMetadata> {
  const seen = new Set<string>()
  const fallbackDate = now()
  const threads = state.threads
    .map((thread) => normalizeThread(thread, fallbackDate))
    .filter((thread): thread is ChatThread<TMetadata> => {
      if (!thread || seen.has(thread.id)) return false
      seen.add(thread.id)
      return true
    })
  const activeThread = threads.find(
    (thread) => thread.id === state.activeThreadId && !thread.archivedAt
  )
  return {
    threads,
    activeThreadId: activeThread ? activeThread.id : null
  }
}

function normalizeThread<TMetadata extends ThreadMetadata>(
  thread: ChatThread<TMetadata>,
  fallbackDate: Date
): ChatThread<TMetadata> | null {
  if (!thread || typeof thread.id !== 'string' || !thread.id) return null
  const createdAt = validDate(thread.createdAt) ?? fallbackDate
  const updatedAt = validDate(thread.updatedAt) ?? createdAt
  const archivedAt = validDate(thread.archivedAt)
  return {
    id: thread.id,
    title: normalizeTitle(thread.title) ?? 'Untitled chat',
    createdAt: cloneDate(createdAt),
    updatedAt: cloneDate(updatedAt),
    ...(archivedAt ? { archivedAt: cloneDate(archivedAt) } : {}),
    ...(thread.metadata ? { metadata: thread.metadata } : {}),
    ...(thread.messageCount !== undefined ? { messageCount: thread.messageCount } : {}),
    ...(thread.lastMessagePreview !== undefined
      ? { lastMessagePreview: thread.lastMessagePreview }
      : {})
  }
}

function deserializeChatThread<TMetadata extends ThreadMetadata>(
  raw: unknown
): ChatThread<TMetadata> | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.id !== 'string' || !record.id || typeof record.title !== 'string') return null
  const createdAt = parseDate(record.createdAt)
  const updatedAt = parseDate(record.updatedAt)
  if (!createdAt || !updatedAt) return null
  const archivedAt = parseDate(record.archivedAt)
  return {
    id: record.id,
    title: record.title,
    createdAt,
    updatedAt,
    ...(archivedAt ? { archivedAt } : {}),
    ...(isRecord(record.metadata) ? { metadata: record.metadata as TMetadata } : {}),
    ...(typeof record.messageCount === 'number' && Number.isFinite(record.messageCount)
      ? { messageCount: record.messageCount }
      : {}),
    ...(typeof record.lastMessagePreview === 'string'
      ? { lastMessagePreview: record.lastMessagePreview }
      : {})
  }
}

function sortedThreads<TMetadata extends ThreadMetadata>(
  threads: ChatThread<TMetadata>[]
): ChatThread<TMetadata>[] {
  return [...threads].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

function normalizeTitle(title: string | undefined): string | null {
  const trimmed = title?.trim()
  return trimmed ? trimmed : null
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime())
}

function validDate(value: unknown): Date | null {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value : null
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
