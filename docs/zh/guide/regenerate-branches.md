---
title: 重新生成分支配方
description: 在不覆盖审计历史的前提下，为重新生成和消息分支设计生产接入协议。
---

# 重新生成分支配方

当产品需要“重新生成”“从这里分叉”或“对比另一个回答”时，按这份配方接入。`vue-ai-hooks`
负责浏览器侧聊天生命周期；持久分支记录、tenant 权限、乐观并发、审计留存和 provider trace
应由你的后端负责。

核心规则很简单：不要原地修改旧 assistant 消息。每次重新生成都创建一个新的 run，把新
assistant 消息保存到当前 `branchId`，原路径继续保留，方便恢复、对比和审计。

## 数据模型

thread 索引、message body 和 branch metadata 分开存：

| 字段              | 用途                                                     |
| ----------------- | -------------------------------------------------------- |
| `threadId`        | 稳定会话 id，对应 `useChat({ id, threadId })`。          |
| `messageId`       | 单条已存消息的稳定 id。                                  |
| `parentMessageId` | 分支起点，通常是 assistant 回复之前的 user 消息。        |
| `branchId`        | thread 中一条可见路径的稳定 id。                         |
| `sourceMessageId` | 被重新生成或对比的 assistant 消息。                      |
| `runId`           | 单次 provider 尝试的幂等 key。                           |
| `revision`        | branch 或 thread 的乐观并发 token。                      |
| `status`          | `active`、`archived`、`failed` 或应用自定义状态。        |
| `reason`          | 用户可理解的原因，例如 `manual-regenerate` 或 `branch`。 |

消息仍然可以用 `serializeMessages()` 保存，并用 `deserializeMessages()` 恢复。Branch
metadata 是应用数据；如果支持、分析或合规工具需要查询它，建议不要塞进 `Message.metadata`。

## 路由契约

先从一组小的自有后端契约开始：

```txt
GET  /api/chat/threads/:threadId/branches
POST /api/chat/threads/:threadId/branches
POST /api/chat/threads/:threadId/regenerate
PATCH /api/chat/threads/:threadId/branches/:branchId
POST /api/chat
```

`POST /api/chat/threads/:threadId/branches` 从已存消息创建空分支：

```json
{
  "parentMessageId": "msg_user_42",
  "sourceMessageId": "msg_assistant_42",
  "reason": "compare-answer",
  "revision": 7
}
```

返回新的 branch 指针：

```json
{
  "branchId": "branch_9p8",
  "threadId": "thread_support_1",
  "parentMessageId": "msg_user_42",
  "revision": 8,
  "status": "active"
}
```

`POST /api/chat/threads/:threadId/regenerate` 为一次 assistant 重新生成创建或复用 run：

```json
{
  "branchId": "branch_9p8",
  "sourceMessageId": "msg_assistant_42",
  "runId": "run_20260702_001",
  "reason": "manual-regenerate",
  "revision": 8
}
```

后端可以先返回 active branch 指针，再由浏览器调用 `useChat().regenerate()`；也可以把
分支创建和 provider streaming 合并在自己的 `/api/chat` 路由里。

## 浏览器接入

先恢复当前 branch，只在请求 provider 前裁剪上下文，持久化副本保持完整：

```ts
import {
  deserializeMessages,
  inspectRequestTrace,
  pruneMessages,
  serializeMessages,
  useChat
} from 'vue-ai-hooks'

const branch = await loadBranch(threadId, branchId)
const messages = deserializeMessages(branch.messages) ?? []

const chat = useChat({
  id: branch.threadId,
  threadId: branch.threadId,
  initialMessages: messages,
  api: '/api/chat',
  credentials: 'include',
  prepareSendMessagesRequest({ messages, request }) {
    return {
      ...request,
      body: {
        ...request.body,
        threadId: branch.threadId,
        branchId: branch.branchId,
        runId: crypto.randomUUID(),
        revision: branch.revision,
        messages: pruneMessages({
          messages,
          maxMessages: 24,
          keepSystem: true,
          toolCalls: 'before-last-6-messages',
          reasoning: 'before-last-6-messages'
        })
      }
    }
  }
})

async function regenerateAssistant(sourceMessageId: string) {
  const next = await createRegenerateRun({
    threadId: branch.threadId,
    branchId: branch.branchId,
    sourceMessageId,
    reason: 'manual-regenerate',
    revision: branch.revision
  })

  await chat.regenerate({
    messageId: sourceMessageId,
    body: {
      threadId: next.threadId,
      branchId: next.branchId,
      sourceMessageId,
      runId: next.runId,
      revision: next.revision
    }
  })

  await saveBranchMessages(next.branchId, serializeMessages(chat.messages.value))
}

const trace = inspectRequestTrace({
  lastRequest: chat.lastRequest.value,
  lastResponse: chat.lastResponse.value,
  error: chat.error.value,
  status: chat.status.value,
  curl: true
})
```

`regenerate({ messageId })` 会丢弃浏览器当前消息列表中该 assistant 之后的消息，并用它
之前的上下文重新请求 provider。你的后端决定这次结果是更新当前 branch、创建 sibling
branch，还是只作为临时对比 run 存在。

## 后端检查

- 读取任何已存消息前，先校验 session、tenant、thread ownership、branch ownership 和模型权限。
- 对过期 `revision` 返回 `409` 和安全的重试提示。
- 把 `runId` 当作幂等 key。相同 `runId` 的重复请求应返回同一个已存 run，或安全恢复 stream。
- 不要覆盖旧 assistant 消息。新回复应有自己的 `messageId`、`branchId`、`runId`、
  `sourceMessageId` 和时间戳。
- 保存 provider trace id、token usage、finish reason、latency 和脱敏错误分类。不要在
  branch 或 message JSON 里保存 Provider 凭据。
- 只在 stream 完成后持久化最终 messages；失败或中止时，把 run 标记为 `failed` 或
  `aborted`，并留下足够排查的 trace 数据。
- 从数据库、导入任务或旧版本应用恢复 messages 前，先用 `safeValidateMessages()` 校验。

## Restore smoke test

暴露 UI 前先验证：

1. 创建一个 thread，并发送一条 prompt。
2. 用新的 `runId` 重新生成 assistant 消息。
3. 从同一条 user 消息创建 branch，并生成不同回答。
4. 刷新 thread，选择原 branch，确认旧回答仍然存在。
5. 选择新 branch，确认 `branchId`、`revision` 和 `Date` 值能正确恢复。
6. 捕获一份 `inspectRequestTrace()` snapshot，确认包含 `threadId`、`branchId`、`runId`，
   且没有 Provider secret。
7. 使用同一个 `runId` 重复重新生成请求，确认后端返回同一个 run，而不是创建重复
   assistant 消息。

如果这条 smoke test 失败，先把功能留在内部 flag 后面。真实用户开始依赖后，再修复错误的
branch 恢复成本会高很多。
