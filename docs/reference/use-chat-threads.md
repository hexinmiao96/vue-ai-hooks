# useChatThreads

`useChatThreads` manages a lightweight local thread index for chat products:
thread creation, active thread selection, rename, archive, restore, delete,
recent ordering, and Date-safe persistence.

It does not store message bodies. Pair each `ChatThread.id` with `useChat({
id, persist })`, your server storage, or your own `/api/chat` thread contract.

Public exports: `useChatThreads`, `serializeChatThreads`,
`deserializeChatThreads`, `serializeChatThreadsState`,
`deserializeChatThreadsState`, `ChatThread`, `SerializedChatThread`,
`ChatThreadsState`, `SerializedChatThreadsState`, `CreateChatThreadInput`,
`UpdateChatThreadInput`, `ChatThreadsPersistenceErrorInfo`,
`ChatThreadsPersistenceErrorPhase`, `ChatThreadsPersistOptions`,
`UseChatThreadsOptions`, and `UseChatThreadsReturn`.

## Usage

```ts
import { useChat, useChatThreads } from 'vue-ai-hooks'

const threads = useChatThreads({
  persist: { key: 'my-app:threads', version: 1 }
})

const thread = threads.createThread({ title: 'Support case' })

const chat = useChat({
  id: thread.id,
  threadId: thread.id,
  persist: { key: `my-app:messages:${thread.id}`, version: 1 }
})
```

The thread index and the message history are intentionally separate. This keeps
the sidebar small and lets applications choose local message persistence,
server-backed message storage, or both.

## Options

| Name                    | Type                          | Default            | Description                                                      |
| ----------------------- | ----------------------------- | ------------------ | ---------------------------------------------------------------- |
| `initialThreads`        | `ChatThread[]`                | `[]`               | Threads available before storage hydration.                      |
| `initialActiveThreadId` | `string \| null`              | `null`             | Initial active thread id. Archived or missing ids become `null`. |
| `persist`               | `ChatThreadsPersistOptions`   | -                  | Date-safe storage for the thread index and active id.            |
| `createId`              | `(prefix?: string) => string` | `createId`         | Override id generation for SSR, tests, or server-provided ids.   |
| `now`                   | `() => Date`                  | `() => new Date()` | Override time for deterministic tests.                           |

`ChatThreadsPersistOptions` accepts `key`, `version`, `storage`, `serialize`,
`deserialize`, `onError`, `onLoadError`, and `onClearError`, matching the shape
of `UsePersistOptions`.

## Return value

| Property                  | Type                                                                                    | Description                                         |
| ------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `threads`                 | `ComputedRef<ChatThread[]>`                                                             | All threads sorted by `updatedAt` descending.       |
| `visibleThreads`          | `ComputedRef<ChatThread[]>`                                                             | Non-archived threads.                               |
| `archivedThreads`         | `ComputedRef<ChatThread[]>`                                                             | Archived threads.                                   |
| `activeThreadId`          | `ComputedRef<string \| null>`                                                           | Current active thread id.                           |
| `activeThread`            | `ComputedRef<ChatThread \| null>`                                                       | Current non-archived active thread.                 |
| `persistenceError`        | `ComputedRef<ChatThreadsPersistenceErrorInfo \| null>`                                  | Last thread-index storage failure, safe to render.  |
| `createThread(input?)`    | `(input?: CreateChatThreadInput) => ChatThread`                                         | Creates a thread and activates it by default.       |
| `setActiveThread(id)`     | `(id: string \| null) => void`                                                          | Activates a non-archived thread or clears active.   |
| `renameThread(id, title)` | `(id: string, title: string) => ChatThread \| null`                                     | Renames a thread; blank titles are ignored.         |
| `updateThread(id, input)` | `(id: string, input: UpdateChatThreadInput) => ChatThread \| null`                      | Updates metadata, preview, title, or archive state. |
| `touchThread(id, input?)` | `(id: string, input?: Omit<UpdateChatThreadInput, 'archivedAt'>) => ChatThread \| null` | Updates recency and optional preview fields.        |
| `archiveThread(id)`       | `(id: string) => ChatThread \| null`                                                    | Archives a thread and clears active if needed.      |
| `restoreThread(id)`       | `(id: string) => ChatThread \| null`                                                    | Restores a thread and activates it.                 |
| `deleteThread(id)`        | `(id: string) => ChatThread \| null`                                                    | Deletes a thread and clears active if needed.       |
| `clearThreads()`          | `() => void`                                                                            | Removes all thread state.                           |
| `clearPersistedThreads()` | `() => void`                                                                            | Removes only the persisted storage entry.           |
| `clearPersistenceError()` | `() => void`                                                                            | Clears the last thread-index storage error summary. |

`persistenceError` is set when `persist.onLoadError`, `persist.onError`, or
`persist.onClearError` fires. The summary includes `phase`, `key`, optional
`version`, `message`, optional `name`, and `timestamp`; it does not include the
thread payload, message bodies, provider credentials, or raw error causes.

## Thread shape

```ts
interface ChatThread<TMetadata extends Record<string, unknown> = Record<string, unknown>> {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  archivedAt?: Date
  metadata?: TMetadata
  messageCount?: number
  lastMessagePreview?: string
}
```

Use `metadata` for browser-safe sidebar state such as team, source, or server
thread id. Keep raw provider traces, secrets, and tenant policy on your backend.

## Persistence helpers

Use the helpers when the thread index is stored outside `localStorage`:

```ts
const payload = serializeChatThreadsState({
  threads: threads.threads.value,
  activeThreadId: threads.activeThreadId.value
})

await saveThreadIndex(payload)

const restored = deserializeChatThreadsState(await loadThreadIndex())
```

`serializeChatThreads()` and `deserializeChatThreads()` handle just the thread
array. State helpers also include `activeThreadId`. Deserializers return `null`
when the payload is not valid.

## Product pattern

For a local-only product, store the thread index and each thread's messages
separately:

```ts
const threads = useChatThreads({
  persist: { key: 'assistant:threads', version: 1 }
})

function openThread(id: string) {
  threads.setActiveThread(id)
}

function newThread() {
  const thread = threads.createThread({ title: 'New support chat' })
  return useChat({
    id: thread.id,
    persist: { key: `assistant:messages:${thread.id}`, version: 1 }
  })
}
```

For a server-backed product, send `thread.id` as `threadId` and persist messages
through your backend. `useChatThreads` can still own the browser sidebar state.
