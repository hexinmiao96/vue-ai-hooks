---
title: 任务型 Demo
description: 按产品任务选择应该先跑哪个 vue-ai-hooks 示例，而不是先翻 API。
---

# 任务型 Demo

当你知道产品目标，但还不知道该打开哪个示例、后端路由或组合式函数时，先看这页。推荐顺序是：
先跑不需要 key 的本地路径，确认 UI 契约，再把本地路由替换成自己的后端。

## 按任务选择

| 产品任务               | 先运行                                             | 接着看                                                                               | 接真实 Provider 前先验证                        |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Vue 聊天 + 工具审批    | `pnpm example:chat`                                | `examples/chat/App.vue` 和 [工具审批](/zh/guide/tool-approvals)                      | 点击 **Run approval demo**，审批或拒绝工具      |
| React 聊天最小接入     | `pnpm example:react-chat`                          | `examples/react-chat/App.tsx` 和 [React hooks](/zh/reference/react)                  | 发送一次 prompt，调用 `stop()`，检查 trace 状态 |
| Thread 侧边栏持久化    | `pnpm example:threaded-chat`                       | `examples/threaded-chat/App.vue` 和 [useChatThreads](/zh/reference/use-chat-threads) | 创建、重命名、归档、恢复并重新打开 thread       |
| IndexedDB 本地持久化   | 应用启动时的异步 hydrate 逻辑                        | [服务端存储](/zh/guide/server-storage) 和 `IndexedDB 本地持久化（异步）` 章节      | 刷新前恢复 thread/messages，完成后保存并验证无数据丢失  |
| 服务端聊天历史         | 你的应用后端和数据库                               | [服务端存储](/zh/guide/server-storage)                                               | 恢复 index 和 messages，发送、刷新并验证        |
| 重新生成或分支历史     | 已存 thread 加 `/api/chat`                         | [重新生成分支](/zh/guide/regenerate-branches)                                        | 重新生成时不覆盖原回答                          |
| 自有 `/api/chat` proxy | `pnpm example:proxy-server` 加 proxy chat 环境变量 | [Proxy 配方](/zh/guide/proxy-recipes)                                                | 确认浏览器不带 key 也能收到 stream chunks       |
| Agent 后端桥接         | LangChain、LangGraph 或自研后端 agent              | [后端 Agent 桥接](/zh/guide/agent-bridge) 和 [Agent 事件](/zh/guide/agent-events)    | 转成安全 `ChatChunk` 或 UI stream parts         |
| AI SDK UI stream 迁移  | 向 `/api/ui-message-stream` 发 POST                | [AI SDK 迁移](/zh/guide/ai-sdk-migration)                                            | 用 `readUIMessageStream()` 解码 parts           |
| 生产部署准备           | 跑本地 proxy 和文档构建检查                        | [生产检查清单](/zh/guide/production-checklist)                                       | 进生产前逐项通过 checklist                      |

## Vue 聊天 + 工具审批

```bash
pnpm install
pnpm example:chat
```

打开 Vite 输出的本地地址，点击 **Run approval demo**。没有选择真实 Provider 时，示例会使用
`local-tools` Provider：先流式输出 assistant 回复，在 `chargeCard` 工具调用处暂停，然后根据
`approveToolCall()` 或 `rejectToolCall()` 继续。

如果你要验证消息历史、结构化 `Message.parts`、工具审批、停止按钮和请求检查，这是最应该先跑的产品 demo。

把这个模式用于特权工具前，先补后端审批记录、幂等 `runId`、审批人审计轨迹和窄 renderer
contract。详见 [工具审批](/zh/guide/tool-approvals)。

## React 聊天最小接入

先运行不需要 Provider key 的 React quickstart：

```bash
pnpm example:react-chat
```

打开 Vite 输出的本地地址并发送一次 prompt。这个 demo 使用 `DirectChatTransport`
和确定性的 `react-local` stream，可以在接真实 Provider key 前验证 React state、中止控制、
stream data 和请求 trace 渲染。

源码在 `examples/react-chat/App.tsx`。React 入口是迁移面，不改变项目 Vue-first 的定位，但 React 消费者可以复用同一套 provider 和 proxy 契约：

```tsx
import { useChat } from 'vue-ai-hooks/react'

export function ChatBox() {
  const { messages, input, setInput, handleSubmit, isLoading, stop, error } = useChat({
    api: '/api/chat',
    credentials: 'include'
  })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((message) => (
        <p key={message.id}>{message.content}</p>
      ))}
      <textarea value={input} onChange={(event) => setInput(event.currentTarget.value)} />
      <button disabled={isLoading}>Send</button>
      <button type="button" disabled={!isLoading} onClick={stop}>
        Stop
      </button>
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

React 和 Vue 使用同一个 `/api/chat` 路由。Provider key 仍然留在服务端。

## 自有 `/api/chat` proxy

接真实上游前，先跑确定性的 proxy：

```bash
pnpm example:proxy-server
# 另开一个终端
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

这一步跑通后，再让模板连接 OpenAI-compatible 上游：

```bash
PROXY_UPSTREAM_BASE_URL=https://api.openai.com/v1 \
PROXY_UPSTREAM_API_KEY=$OPENAI_API_KEY \
PROXY_UPSTREAM_MODEL=gpt-4.1-mini \
pnpm example:proxy-server
```

浏览器仍然只请求你的 proxy URL。Node 进程负责加 Provider key，并把响应归一化成浏览器契约。

## Thread 侧边栏持久化

当产品需要保存会话、侧边栏、归档流程或当前 thread 指示时使用。thread 索引和消息正文分开保存：

```bash
pnpm example:threaded-chat
```

```ts
import { useChat, useChatThreads } from 'vue-ai-hooks'

const threads = useChatThreads({
  persist: { key: 'assistant:threads', version: 1 }
})

const thread = threads.createThread({ title: 'Support case' })

const chat = useChat({
  id: thread.id,
  threadId: thread.id,
  persist: { key: `assistant:messages:${thread.id}`, version: 1 }
})
```

先验证 create、rename、archive、restore、delete，再接 server storage adapter。这个可运行 demo 使用确定性的
`DirectChatTransport`、`useChatThreads()` 侧边栏索引，以及当前 thread 独立的
`useChat({ persist })`。详见 [useChatThreads](/zh/reference/use-chat-threads)。

## IndexedDB 本地持久化

服务端未接通时，先用 IndexedDB 做可恢复本地历史，再逐步切到服务端存储。因为
`persist` 只覆盖同步的 `Storage`，所以要显式加一层异步 hydrate/保存逻辑：

1. 启动时从 IndexedDB 恢复 thread index 和 messages。
2. 用恢复到的数据初始化 `initialThreads`、`initialActiveThreadId`、`initialMessages`。
3. 在 `onFinish`、thread 重命名、归档、恢复、删除后再回写 IndexedDB。

这样可以不依赖数据库先跑起生产候选版本，同时保留与服务端方案一致的 thread/message
数据形态，后续切换 `/api/chat` 和持久化端点时兼容性更高。

参考 [IndexedDB 本地持久化（异步）](/zh/guide/server-storage#indexeddb-本地持久化适配器异步)。

## 服务端聊天历史

当会话必须支持多设备、团队交接、审计留存或管理员访问时使用。thread index 和 message body
分别存在后端记录里，然后在挂载 chat 前同时恢复：

```ts
import { deserializeMessages, serializeMessages, useChat } from 'vue-ai-hooks'

const messages = deserializeMessages(await loadThreadMessages(thread.id)) ?? []

const chat = useChat({
  id: thread.id,
  threadId: thread.id,
  initialMessages: messages,
  api: '/api/chat',
  credentials: 'include'
})

await saveThreadMessages(thread.id, serializeMessages(chat.messages.value))
```

接真实 Provider 前，先用 tenant 级 auth 验证 load、send、save、reload、rename、archive
和 delete。详见 [服务端存储](/zh/guide/server-storage)。

## 重新生成或分支历史

服务端存储跑通后，如果用户需要重试 assistant 轮次、对比另一个回答或从某条消息分叉，使用这个方向。旧
assistant 消息不要原地覆盖；每次 provider 尝试创建一个 `runId`，并把新回答保存到选中的
`branchId`：

```ts
await chat.regenerate({
  messageId: 'msg_assistant_42',
  body: {
    threadId,
    branchId,
    sourceMessageId: 'msg_assistant_42',
    runId: crypto.randomUUID(),
    revision
  }
})
```

暴露 UI 前先验证 branch restore、幂等重新生成和安全的请求检查。详见
[重新生成分支](/zh/guide/regenerate-branches)。

## AI SDK UI stream 迁移

当你的后端已经输出 AI SDK UI message stream parts 时，先跑：

```bash
pnpm example:proxy-server
```

向 `/api/ui-message-stream` 发 POST，然后用 `readUIMessageStream()` 或默认 proxy chat transport
消费 stream。迁移要小步做：先证明 text、tool-call 和 data parts 能正确解码，再逐个替换生产路由。

## Agent 后端桥接

当 LangChain、LangGraph 或你自己的后端 agent 已经会输出 progress、工具审批、工具结果、source、file
或最终 usage 事件时，用这个方向。规划、检索、记忆、checkpoint 和特权工具继续留在服务端，
浏览器只接收安全的 `AgentEvent`：

```ts
import { readAgentEventStream } from 'vue-ai-hooks'

yield * readAgentEventStream({ events: runAgent(messages), signal })
```

如果路由应该输出 AI SDK UI message stream，则用 `agentEventToUIMessageStreamPart()`
转换事件，再通过 `createUIMessageStreamResponse()` 返回。详见
[后端 Agent 桥接](/zh/guide/agent-bridge) 的 LangChain/LangGraph 投影边界，以及
[Agent 事件](/zh/guide/agent-events) 的底层 adapter。

## 完成标准

- 不需要 key 的 demo 能本地运行。
- proxy 路由能在浏览器不带 Provider key 的情况下本地运行。
- `lastRequest`、`lastResponse` 和 `inspectRequestTrace()` 足够支持排查。
- 真实上游只在服务端配置。
- 已通过 [生产检查清单](/zh/guide/production-checklist)。
