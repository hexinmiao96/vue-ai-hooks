---
title: 服务端存储配方
description: 把 vue-ai-hooks 的 thread 索引和聊天消息保存到自有后端，同时不把 Provider key 放进浏览器。
---

# 服务端存储配方

当 localStorage 不够用时使用这份配方：多设备历史、团队收件箱、审计轨迹、客服队列或合规留存。这个包只负责浏览器状态和 stream 契约；认证、tenant 隔离、数据库写入和配额仍然由你的应用负责。

生产里最稳的形态是拆成两份存储：

- **Thread index**：来自 `useChatThreads()` 的轻量侧边栏记录。
- **Message body**：每个 thread 对应一份来自 `useChat()` 的序列化 `Message[]`。

不要在这两份 payload 里保存 Provider 凭据或原始上游响应。

## 最小路由契约

| 路由                           | 用途                             | Payload helper                                  |
| ------------------------------ | -------------------------------- | ----------------------------------------------- |
| `GET /api/chat/threads`        | 加载侧边栏索引和 active thread。 | 取回后用 `deserializeChatThreadsState()`。      |
| `PUT /api/chat/threads`        | 保存标题、归档和 active 状态。   | 写入前用 `serializeChatThreadsState()`。        |
| `GET /api/chat/threads/:id`    | 加载一个 thread 的消息。         | 取回后用 `deserializeMessages()`。              |
| `PUT /api/chat/threads/:id`    | 保存一个 thread 的消息。         | 写入前用 `serializeMessages()`。                |
| `POST /api/chat`               | 流式返回下一条 assistant 回复。  | 发送 `threadId`，返回 `ChatChunk` 或 UI parts。 |
| `DELETE /api/chat/threads/:id` | 服务端删除或归档 thread。        | mutation 后返回归一化 thread index。            |

用 `PUT` 表达幂等保存。如果多个浏览器标签页可能同时编辑同一个 thread，加上 `If-Match`
或单调递增的 `revision`。

## 客户端适配器契约

Storage adapter 应留在你的应用里，不进入 `vue-ai-hooks` 公共 API。真正需要稳定的是一组
很小的契约：加载/保存 thread index，加载/保存单个 thread 的 messages，并在写入时带上
`revision` / `runId`，让后端可以拒绝过期写入或重复 mutation。

```ts
import type { SerializedChatThreadsState, SerializedMessage } from 'vue-ai-hooks'

interface ChatThreadStorageAdapter {
  loadThreadIndex(): Promise<SerializedChatThreadsState | null>
  saveThreadIndex(
    payload: SerializedChatThreadsState,
    options?: { revision?: string | number }
  ): Promise<{ revision?: string | number }>
  loadThreadMessages(threadId: string): Promise<SerializedMessage[] | null>
  saveThreadMessages(
    threadId: string,
    payload: SerializedMessage[],
    options?: { revision?: string | number; runId?: string }
  ): Promise<{ revision?: string | number }>
  deleteThread(
    threadId: string,
    options?: { revision?: string | number }
  ): Promise<SerializedChatThreadsState | null>
}
```

可复制的 HTTP adapter 可以保持和框架无关：

```ts
import type { SerializedChatThreadsState, SerializedMessage } from 'vue-ai-hooks'

function createHttpThreadStorageAdapter(options: {
  baseUrl?: string
  fetcher?: typeof fetch
}): ChatThreadStorageAdapter {
  const baseUrl = options.baseUrl ?? '/api/chat'
  const fetcher = options.fetcher ?? fetch

  async function json<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(`${baseUrl}${path}`, {
      credentials: 'include',
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers }
    })
    if (!response.ok) throw new Error(`storage_${response.status}`)
    return (await response.json()) as T
  }

  return {
    loadThreadIndex: () => json<SerializedChatThreadsState | null>('/threads'),
    saveThreadIndex: (payload, write) =>
      json<{ revision?: string | number }>('/threads', {
        method: 'PUT',
        headers: write?.revision ? { 'if-match': String(write.revision) } : undefined,
        body: JSON.stringify(payload)
      }),
    loadThreadMessages: (threadId) =>
      json<SerializedMessage[] | null>(`/threads/${encodeURIComponent(threadId)}`),
    saveThreadMessages: (threadId, payload, write) =>
      json<{ revision?: string | number }>(`/threads/${encodeURIComponent(threadId)}`, {
        method: 'PUT',
        headers: {
          ...(write?.revision ? { 'if-match': String(write.revision) } : {}),
          ...(write?.runId ? { 'x-run-id': write.runId } : {})
        },
        body: JSON.stringify(payload)
      }),
    deleteThread: (threadId, write) =>
      json<SerializedChatThreadsState | null>(`/threads/${encodeURIComponent(threadId)}`, {
        method: 'DELETE',
        headers: write?.revision ? { 'if-match': String(write.revision) } : undefined
      })
  }
}
```

在明确生命周期边界调用这个 adapter。请求签名、tenant 校验、加密、留存策略和数据库专属重试
应保留在服务端。

## IndexedDB 本地持久化适配器（异步）

`persist` 的运行时实现使用的是浏览器 `Storage` 接口，属于同步接口，不能直接接原生
IndexedDB。若你的场景是不接服务端、但需要离线或 PWA 持久化，可改为“显式异步存取”：

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
      if (!db.objectStoreNames.contains(STORE_THREADS))
        db.createObjectStore(STORE_THREADS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) db.createObjectStore(STORE_MESSAGES)
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
) {
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
  const raw = await withStore<SerializedChatThreadsState | undefined>(
    'thread-index',
    'readonly',
    (store) => store.get('threads')
  )
  return raw ?? null
}

async function loadThreadMessages(threadId: string): Promise<SerializedMessage[] | null> {
  const raw = await withStore<SerializedMessage[] | undefined>(
    'thread-messages',
    'readonly',
    (store) => store.get(`thread-messages:${threadId}` as ThreadStoreKey)
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

仅在生命周期边界入库，避免每次输入都刷盘：

- `onFinish`（stream 完成）
- thread rename/archive/delete 操作
- 新建/切换 thread 时手动触发存储

如遇写入失败，建议把失败写入队列，次次启动时重试；遇到配额异常可以降级到仅保留
低风险 metadata 的本地兜底（如 thread 标题和 activeId），保证页面仍可用。

## 浏览器接线

在挂载聊天界面前先加载服务端快照。在路由型应用里，这通常放在 route loader、页面 async
setup，或能渲染 loading 状态的父组件里。

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

在重命名、归档、删除、重新生成或发送完成这类明确用户动作后保存。高频聊天可以 debounce
保存，或只在 assistant 消息完成后持久化。

## 后端校验

写入前至少校验三件事：

- 用户可以访问这个 tenant 和 thread。
- payload 符合 `vue-ai-hooks` 的结构。
- 本次写入基于预期的 revision。

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

把 `requireSession`、`assertTenantAccess`、`assertThreadAccess`、`saveThreadIndex`
和 `saveMessages` 换成你的框架和数据库代码。这些函数必须只在服务端运行。

## Chat 路由耦合

`useChat({ threadId })` 会把后端 thread id 带到 chat 和 resume 请求里。用它把下一条
assistant 回复写回同一条服务端记录：

```ts
const chat = useChat({
  id: thread.id,
  threadId: thread.id,
  api: '/api/chat',
  credentials: 'include'
})
```

chat 路由应该：

1. 校验 session 和 tenant。
2. 读取 `threadId` 对应的历史消息。
3. 追加请求里的用户消息。
4. 流式返回 Provider 响应。
5. stream 完成后保存最终归一化 messages。
6. 只保存脱敏 trace id，不保存 Provider 凭据。

如果你的运行时不能可靠地在 stream 完成后持久化，先在流式响应前保存用户消息，再用后台任务按
`threadId` 和 trace id 对齐 assistant 消息。

## 生产检查

- thread id 要不可猜，或至少按 tenant 强隔离。
- `createdAt` 和 `updatedAt` 可以用数据库 timestamp，但消息 payload 继续用
  `serializeMessages()` 保持 Date-safe。
- 拒绝不能通过 `deserializeMessages()` 或 `deserializeChatThreadsState()` 的 payload。
- 仅本地场景下，用 IndexedDB 时把恢复逻辑放在异步 hydration 阶段，写库操作放在
  stream 完成、rename、archive、delete 这类明确边界。
- 重命名、归档、删除和重新生成要有乐观并发控制。
- 不保存原始 Provider 错误、API key、请求 header 或完整 curl 输出。
- 跑一次 restore smoke test：加载 index、加载 messages、调用 `setMessages()`、发送 prompt、
  刷新页面并确认会话恢复。

更完整的浏览器、proxy、调试检查和 rollout 项见 [生产检查清单](/zh/guide/production-checklist)。
