# useChatThreads

`useChatThreads` 管理聊天产品里的轻量 thread 索引：创建 thread、切换当前 thread、
重命名、归档、恢复、删除、按最近更新时间排序，以及 Date-safe 持久化。

它不存消息正文。每个 `ChatThread.id` 可以搭配 `useChat({ id, persist })`、你的服务端存储，
或自有 `/api/chat` thread 契约使用。

公开导出：`useChatThreads`、`serializeChatThreads`、`deserializeChatThreads`、
`serializeChatThreadsState`、`deserializeChatThreadsState`、`ChatThread`、
`SerializedChatThread`、`ChatThreadsState`、`SerializedChatThreadsState`、
`CreateChatThreadInput`、`UpdateChatThreadInput`、`ChatThreadsPersistOptions`、
`UseChatThreadsOptions` 和 `UseChatThreadsReturn`。

## 用法

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

thread 索引和消息历史刻意分开。这样 sidebar 保持很小，应用也可以自由选择本地消息持久化、
服务端消息存储，或两者同时使用。

## 选项

| 名称                    | 类型                          | 默认值             | 说明                                                     |
| ----------------------- | ----------------------------- | ------------------ | -------------------------------------------------------- |
| `initialThreads`        | `ChatThread[]`                | `[]`               | storage 恢复前已有的 thread。                            |
| `initialActiveThreadId` | `string \| null`              | `null`             | 初始 active thread id。已归档或不存在的 id 会变 `null`。 |
| `persist`               | `ChatThreadsPersistOptions`   | -                  | 对 thread 索引和 active id 做 Date-safe storage。        |
| `createId`              | `(prefix?: string) => string` | `createId`         | 覆盖 id 生成，适合 SSR、测试或服务端提供 id。            |
| `now`                   | `() => Date`                  | `() => new Date()` | 覆盖当前时间，适合确定性测试。                           |

`ChatThreadsPersistOptions` 支持 `key`、`version`、`storage`、`serialize`、
`deserialize`、`onError`、`onLoadError` 和 `onClearError`，形态与
`UsePersistOptions` 对齐。

## 返回值

| 属性                      | 类型                                                                                    | 说明                                     |
| ------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| `threads`                 | `ComputedRef<ChatThread[]>`                                                             | 全部 thread，按 `updatedAt` 倒序。       |
| `visibleThreads`          | `ComputedRef<ChatThread[]>`                                                             | 未归档 thread。                          |
| `archivedThreads`         | `ComputedRef<ChatThread[]>`                                                             | 已归档 thread。                          |
| `activeThreadId`          | `ComputedRef<string \| null>`                                                           | 当前 active thread id。                  |
| `activeThread`            | `ComputedRef<ChatThread \| null>`                                                       | 当前未归档的 active thread。             |
| `createThread(input?)`    | `(input?: CreateChatThreadInput) => ChatThread`                                         | 创建 thread，默认设为 active。           |
| `setActiveThread(id)`     | `(id: string \| null) => void`                                                          | 激活未归档 thread，或清空 active。       |
| `renameThread(id, title)` | `(id: string, title: string) => ChatThread \| null`                                     | 重命名 thread；空标题会被忽略。          |
| `updateThread(id, input)` | `(id: string, input: UpdateChatThreadInput) => ChatThread \| null`                      | 更新 metadata、preview、标题或归档状态。 |
| `touchThread(id, input?)` | `(id: string, input?: Omit<UpdateChatThreadInput, 'archivedAt'>) => ChatThread \| null` | 更新最近时间和可选预览字段。             |
| `archiveThread(id)`       | `(id: string) => ChatThread \| null`                                                    | 归档 thread，必要时清空 active。         |
| `restoreThread(id)`       | `(id: string) => ChatThread \| null`                                                    | 恢复 thread 并设为 active。              |
| `deleteThread(id)`        | `(id: string) => ChatThread \| null`                                                    | 删除 thread，必要时清空 active。         |
| `clearThreads()`          | `() => void`                                                                            | 清空所有 thread state。                  |
| `clearPersistedThreads()` | `() => void`                                                                            | 只移除持久化 storage 项。                |

## Thread 结构

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

`metadata` 适合存浏览器安全的 sidebar 状态，例如团队、来源或服务端 thread id。
原始 provider trace、密钥和租户策略应保留在后端。

## 持久化 helper

当 thread 索引不存 `localStorage` 时，可以使用 helper：

```ts
const payload = serializeChatThreadsState({
  threads: threads.threads.value,
  activeThreadId: threads.activeThreadId.value
})

await saveThreadIndex(payload)

const restored = deserializeChatThreadsState(await loadThreadIndex())
```

`serializeChatThreads()` 和 `deserializeChatThreads()` 只处理 thread 数组。
state helper 会额外包含 `activeThreadId`。payload 不合法时，反序列化函数返回 `null`。

## 产品接入模式

本地产品可以把 thread 索引和每个 thread 的消息分开存：

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

服务端产品可以把 `thread.id` 作为 `threadId` 发送，消息持久化交给后端。
`useChatThreads` 仍然可以负责浏览器 sidebar state。
