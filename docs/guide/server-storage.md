---
title: Server storage recipe
description: Store vue-ai-hooks thread indexes and chat messages in your own backend without adding provider keys to the browser.
---

# Server storage recipe

Use this recipe when localStorage is not enough: multi-device history, team
inboxes, audit trails, support queues, or regulated retention. Keep the package
focused on browser state and stream contracts. Your app owns authentication,
tenant isolation, database writes, and quota.

The safest production shape is two stores:

- **Thread index**: small sidebar records from `useChatThreads()`.
- **Message body**: serialized `Message[]` per thread from `useChat()`.

Do not store provider credentials or raw upstream responses in either payload.

## Minimal route contract

| Route                          | Purpose                                   | Payload helper                                     |
| ------------------------------ | ----------------------------------------- | -------------------------------------------------- |
| `GET /api/chat/threads`        | Load the sidebar index and active thread. | `deserializeChatThreadsState()` after fetching.    |
| `PUT /api/chat/threads`        | Save thread title, archive, active state. | `serializeChatThreadsState()` before writing.      |
| `GET /api/chat/threads/:id`    | Load messages for one thread.             | `deserializeMessages()` after fetching.            |
| `PUT /api/chat/threads/:id`    | Save messages for one thread.             | `serializeMessages()` before writing.              |
| `POST /api/chat`               | Stream the next assistant response.       | Send `threadId`; stream `ChatChunk` or UI parts.   |
| `DELETE /api/chat/threads/:id` | Delete or archive a thread server-side.   | Return the normalized thread index after mutation. |

Use `PUT` as an idempotent save. Add `If-Match` or a monotonically increasing
`revision` when multiple browser tabs can edit the same thread.

## IndexedDB local durability adapter (async)

`persist` in the runtime uses the browser `Storage` interface and is synchronous,
so it cannot be pointed directly at native IndexedDB. If you need no-server
durable history (for PWA/offline mode, quick MVP, or demos), keep hydration and
save explicit and async:

```ts
import {
  deserializeChatThreadsState,
  deserializeMessages,
  serializeChatThreadsState,
  serializeMessages,
  useChat,
  useChatThreads,
  type Message,
  type SerializedChatThreadsState,
  type SerializedMessage
} from 'vue-ai-hooks'

type ThreadStoreKey = `thread-messages:${string}`

const DB_NAME = 'assistant-cache-v1'
const VERSION = 1
const STORE_THREADS = 'thread-index'
const STORE_MESSAGES = 'thread-messages'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_THREADS)) db.createObjectStore(STORE_THREADS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) db.createObjectStore(STORE_MESSAGES)
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const request = fn(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
    tx.onabort = () => reject(tx.error)
  })
}

async function loadThreadIndex(): Promise<SerializedChatThreadsState | null> {
  const raw = await withStore<SerializedChatThreadsState | undefined>('thread-index', 'readonly', (store) =>
    store.get('threads')
  )
  return raw ?? null
}

async function loadThreadMessages(threadId: string): Promise<SerializedMessage[] | null> {
  const raw = await withStore<SerializedMessage[] | undefined>('thread-messages', 'readonly', (store) =>
    store.get(`thread-messages:${threadId}` as ThreadStoreKey)
  )
  return raw ?? null
}

async function saveThreadIndex(payload: SerializedChatThreadsState) {
  await withStore('thread-index', 'readwrite', (store) => {
    store.put({ ...payload, id: 'threads' })
  })
}

async function saveThreadMessages(threadId: string, messages: SerializedMessage[]) {
  await withStore('thread-messages', 'readwrite', (store) => {
    store.put(messages, `thread-messages:${threadId}` as ThreadStoreKey)
  })
}

const initialThreadState = deserializeChatThreadsState(await loadThreadIndex()) ?? {
  threads: [],
  activeThreadId: null
}

const threads = useChatThreads({
  initialThreads: initialThreadState.threads,
  initialActiveThreadId: initialThreadState.activeThreadId
})

const thread = threads.activeThread.value ?? threads.createThread({ title: 'New chat' })
const initialMessages = deserializeMessages(await loadThreadMessages(thread.id)) ?? []

const chat = useChat({
  id: thread.id,
  threadId: thread.id,
  initialMessages,
  api: '/api/chat',
  credentials: 'include',
  onFinish: async () => {
    await saveThreadIndex(
      serializeChatThreadsState({
        threads: threads.threads.value,
        activeThreadId: threads.activeThreadId.value
      })
    )
    await saveThreadMessages(thread.id, serializeMessages(chat.messages.value))
  }
})
```

Persist only at explicit boundaries, not on every keystroke:

- `onFinish` for stream completion
- thread rename/archive/delete handlers
- explicit "new thread" action

If save fails, keep a local retry queue in memory and fallback to `localStorage`
only for low-risk metadata so users can still recover in storage-pressure
conditions.

## Browser wiring

Load the server snapshot before mounting the chat surface. In a routed app, this
usually belongs in a route loader, page async setup, or parent component that can
render a loading state.

```ts
import {
  deserializeChatThreadsState,
  deserializeMessages,
  serializeChatThreadsState,
  serializeMessages,
  useChat,
  useChatThreads,
  type Message,
  type SerializedChatThreadsState,
  type SerializedMessage
} from 'vue-ai-hooks'

async function loadThreadIndex() {
  const response = await fetch('/api/chat/threads', { credentials: 'include' })
  if (!response.ok) throw new Error('Could not load threads')
  const raw: unknown = await response.json()
  return deserializeChatThreadsState(raw) ?? { threads: [], activeThreadId: null }
}

async function loadThreadMessages(threadId: string): Promise<Message[]> {
  const response = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}`, {
    credentials: 'include'
  })
  if (response.status === 404) return []
  if (!response.ok) throw new Error('Could not load messages')
  return deserializeMessages(await response.json()) ?? []
}

async function saveThreadIndex(payload: SerializedChatThreadsState) {
  await fetch('/api/chat/threads', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

async function saveThreadMessages(threadId: string, payload: SerializedMessage[]) {
  await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

const initialThreadState = await loadThreadIndex()
const threads = useChatThreads({
  initialThreads: initialThreadState.threads,
  initialActiveThreadId: initialThreadState.activeThreadId
})

const thread = threads.activeThread.value ?? threads.createThread({ title: 'New chat' })
const initialMessages = await loadThreadMessages(thread.id)

const chat = useChat({
  id: thread.id,
  threadId: thread.id,
  initialMessages,
  api: '/api/chat',
  credentials: 'include'
})

async function saveCurrentThread() {
  await Promise.all([
    saveThreadIndex(
      serializeChatThreadsState({
        threads: threads.threads.value,
        activeThreadId: threads.activeThreadId.value
      })
    ),
    saveThreadMessages(thread.id, serializeMessages(chat.messages.value))
  ])
}
```

Save after explicit user actions such as rename, archive, delete, regenerate, or
send completion. For high-traffic chats, debounce saves or persist only after
the assistant message is complete.

## Backend validation

Your route should validate three things before writing:

- The user can access the tenant and thread.
- The payload shape is valid for `vue-ai-hooks`.
- The write is based on the expected revision.

```ts
import {
  deserializeChatThreadsState,
  deserializeMessages,
  safeValidateMessages,
  serializeChatThreadsState,
  serializeMessages
} from 'vue-ai-hooks'

export async function saveThreadsRoute(request: Request) {
  const session = await requireSession(request)
  const raw: unknown = await request.json()
  const restored = deserializeChatThreadsState(raw)

  if (!restored) {
    return Response.json({ error: 'invalid_thread_index' }, { status: 400 })
  }

  await assertTenantAccess(session, request)
  await saveThreadIndex(session.tenantId, serializeChatThreadsState(restored))
  return Response.json({ ok: true })
}

export async function saveMessagesRoute(request: Request, threadId: string) {
  const session = await requireSession(request)
  const raw: unknown = await request.json()
  const restored = deserializeMessages(raw)

  if (!restored) {
    return Response.json({ error: 'invalid_messages' }, { status: 400 })
  }

  const checked = safeValidateMessages(raw, {
    messageMetadataSchema: {
      type: 'object',
      additionalProperties: true
    }
  })

  if (!checked.success) {
    return Response.json({ error: 'invalid_message_schema' }, { status: 400 })
  }

  await assertThreadAccess(session, threadId)
  await saveMessages(session.tenantId, threadId, serializeMessages(checked.messages))
  return Response.json({ ok: true })
}
```

Replace `requireSession`, `assertTenantAccess`, `assertThreadAccess`,
`saveThreadIndex`, and `saveMessages` with your framework and database code.
Keep those functions server-only.

## Chat route coupling

`useChat({ threadId })` sends the backend thread id with chat and resume
requests. Use it to attach the next assistant response to the same server row:

```ts
const chat = useChat({
  id: thread.id,
  threadId: thread.id,
  api: '/api/chat',
  credentials: 'include'
})
```

The chat route should:

1. Validate the session and tenant.
2. Load the existing messages for `threadId`.
3. Append the user message from the request.
4. Stream the provider response.
5. Persist the final normalized messages after the stream completes.
6. Store a redacted request trace id, not provider credentials.

If persistence after stream completion is not reliable in your runtime, persist
the user message before streaming and reconcile the assistant message in a
background job keyed by `threadId` and trace id.

## Production checklist

- Keep thread ids unguessable or scoped by tenant.
- Store `createdAt` and `updatedAt` as database timestamps, but keep serialized
  message payloads Date-safe with `serializeMessages()`.
- Reject payloads that fail `deserializeMessages()` or
  `deserializeChatThreadsState()`.
- Use optimistic concurrency for rename, archive, delete, and regenerate.
- For no-server durability, keep IndexedDB hydration async and save only on
  explicit lifecycle boundaries (finish, rename, archive, delete).
- Do not save raw provider errors, API keys, request headers, or full curl
  output.
- Run one restore smoke test: load index, load messages, call `setMessages()`,
  send a prompt, reload, and verify the restored conversation.

See the [production checklist](/guide/production-checklist) for the wider
browser, proxy, inspection, and rollout checks.
