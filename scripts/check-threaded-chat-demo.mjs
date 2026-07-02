import { existsSync } from 'node:fs'

const distEntry = new URL('../dist/index.mjs', import.meta.url)

if (!existsSync(distEntry)) {
  throw new Error('dist/index.mjs is missing. Run `pnpm build` before `pnpm threaded-chat:check`.')
}

const {
  deserializeChatThreadsState,
  deserializeMessages,
  serializeChatThreadsState,
  useChat,
  useChatThreads
} = await import(distEntry.href)
const { nextTick } = await import('vue')

const storage = memoryStorage()
const indexKey = 'threaded-chat-smoke:index'
const messageKey = (threadId) => `threaded-chat-smoke:messages:${threadId}`

await checkThreadIndexAndMessages()
console.log('Threaded chat demo check passed.')

async function checkThreadIndexAndMessages() {
  const threads = useChatThreads({
    persist: { key: indexKey, version: 1, storage },
    now: fixedNow('2026-07-02T08:00:00.000Z')
  })
  const supportThread = threads.createThread({
    id: 'thread_support',
    title: ' Support intake ',
    metadata: { channel: 'demo' },
    createdAt: new Date('2026-07-02T08:00:00.000Z'),
    updatedAt: new Date('2026-07-02T08:00:00.000Z')
  })
  const billingThread = threads.createThread({
    id: 'thread_billing',
    title: 'Billing follow-up',
    metadata: { channel: 'demo' },
    createdAt: new Date('2026-07-02T08:05:00.000Z'),
    updatedAt: new Date('2026-07-02T08:05:00.000Z')
  })

  threads.renameThread(supportThread.id, 'Support intake reviewed')
  expect(
    threads.archiveThread(billingThread.id)?.archivedAt instanceof Date,
    'thread archive should record a Date'
  )
  expect(
    threads.activeThreadId.value === null,
    'archiving the active thread should clear active id'
  )
  threads.restoreThread(billingThread.id)
  expect(
    threads.activeThreadId.value === billingThread.id,
    'restoring a thread should make it active'
  )

  const deletedThread = threads.createThread({ id: 'thread_delete_me', title: 'Delete me' })
  expect(
    threads.deleteThread(deletedThread.id)?.id === deletedThread.id,
    'deleteThread should return the removed thread'
  )

  const supportChat = useChat({
    id: supportThread.id,
    provider: createThreadProvider('Support answer ready.'),
    persist: { key: messageKey(supportThread.id), version: 1, storage }
  })
  await supportChat.append('Summarize the support request.')
  await nextTick()

  const billingChat = useChat({
    id: billingThread.id,
    provider: createThreadProvider('Billing answer ready.'),
    persist: { key: messageKey(billingThread.id), version: 1, storage }
  })
  await billingChat.append('Summarize the billing request.')
  await nextTick()

  threads.touchThread(supportThread.id, {
    updatedAt: new Date('2026-07-02T08:10:00.000Z'),
    messageCount: supportChat.messages.value.length,
    lastMessagePreview: String(supportChat.messages.value.at(-1)?.content ?? '')
  })
  threads.touchThread(billingThread.id, {
    updatedAt: new Date('2026-07-02T08:12:00.000Z'),
    messageCount: billingChat.messages.value.length,
    lastMessagePreview: String(billingChat.messages.value.at(-1)?.content ?? '')
  })
  await nextTick()

  const rawIndex = JSON.parse(storage.getItem(`${indexKey}:v1`))
  const serializedIndex = serializeChatThreadsState({
    threads: threads.threads.value,
    activeThreadId: threads.activeThreadId.value
  })
  const restoredIndex = deserializeChatThreadsState(rawIndex)

  expect(
    JSON.stringify(rawIndex) === JSON.stringify(serializedIndex),
    'persisted thread index should match serializeChatThreadsState() output'
  )
  expect(
    restoredIndex?.threads.every((thread) => thread.createdAt instanceof Date),
    'deserializeChatThreadsState() should restore Date values'
  )
  expect(
    restoredIndex?.threads.some(
      (thread) =>
        thread.id === supportThread.id &&
        thread.title === 'Support intake reviewed' &&
        thread.messageCount === 2 &&
        thread.lastMessagePreview === 'Support answer ready.'
    ),
    'thread index should persist renamed title, count, and preview'
  )
  expect(
    !restoredIndex?.threads.some((thread) => thread.id === deletedThread.id),
    'deleted threads should not be restored'
  )

  const restoredThreads = useChatThreads({
    persist: { key: indexKey, version: 1, storage },
    now: fixedNow('2026-07-02T09:00:00.000Z')
  })
  expect(
    restoredThreads.threads.value[0].updatedAt instanceof Date,
    'useChatThreads() should hydrate persisted Date values'
  )
  expect(
    restoredThreads.visibleThreads.value.map((thread) => thread.id).join(',') ===
      'thread_billing,thread_support',
    'restored visible threads should stay sorted by recency'
  )

  const restoredSupportMessages = deserializeMessages(
    JSON.parse(storage.getItem(`${messageKey(supportThread.id)}:v1`))
  )
  const restoredBillingMessages = deserializeMessages(
    JSON.parse(storage.getItem(`${messageKey(billingThread.id)}:v1`))
  )
  expect(
    restoredSupportMessages?.some((message) => message.content === 'Support answer ready.'),
    'support thread messages should persist independently'
  )
  expect(
    restoredBillingMessages?.some((message) => message.content === 'Billing answer ready.'),
    'billing thread messages should persist independently'
  )
  expect(
    JSON.stringify(restoredSupportMessages) !== JSON.stringify(restoredBillingMessages),
    'per-thread message stores should not collapse into one history'
  )
}

function createThreadProvider(responseText) {
  return {
    id: 'threaded-chat-smoke',
    async *chat() {
      yield { content: responseText }
      yield {
        finishReason: 'stop',
        usage: { promptTokens: 8, completionTokens: 4, totalTokens: 12 }
      }
    }
  }
}

function fixedNow(value) {
  return () => new Date(value)
}

function memoryStorage() {
  const data = new Map()
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
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
