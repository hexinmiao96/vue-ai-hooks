---
title: 任务型 Demo
description: 按产品任务选择应该先跑哪个 vue-ai-hooks 示例，而不是先翻 API。
---

# 任务型 Demo

当你知道产品目标，但还不知道该打开哪个示例、后端路由或组合式函数时，先看这页。推荐顺序是：
先跑不需要 key 的本地路径，确认 UI 契约，再把本地路由替换成自己的后端。

## 按任务选择

| 产品任务               | 先运行                                                         | 接着看                                                                                                                               | 接真实 Provider 前先验证                                              |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Vue 聊天 + 工具审批    | `pnpm example:chat`                                            | `examples/chat/App.vue` 和 [工具审批](/zh/guide/tool-approvals)                                                                      | 点击 **Run approval demo**，审批或拒绝工具                            |
| React 聊天最小接入     | `pnpm example:react-chat`                                      | `examples/react-chat/App.tsx` 和 [React hooks](/zh/reference/react)                                                                  | 发送一次 prompt，调用 `stop()`，检查 trace 状态                       |
| Vue 文本补全接入       | `pnpm example:completion`                                      | `examples/completion/App.vue` 和 [useCompletion](/zh/reference/use-completion)                                                       | 跑一次补全，确认 `status`、`inspect()`、请求/响应 trace。             |
| Vue Embedding 快速上手 | `pnpm example:embedding`                                       | `examples/embedding/App.vue` 和 [useEmbedding](/zh/reference/use-embedding)                                                          | 跑一次向量化请求，确认 `status`、`inspect()` 和 trace。               |
| React 文本补全接入     | `pnpm example:react-completion`                                | `examples/react-completion/App.tsx` 和 [React hooks](/zh/reference/react)                                                            | 跑一次补全后检查 trace，再用 `VITE_EXAMPLE_PROVIDER=proxy` 验证代理   |
| Vue 结构化输出接入     | `pnpm example:object`                                          | `examples/object/App.vue` 和 [useObject](/zh/reference/use-object)                                                                   | 跑一次结构化提取，确认解析结果、`status` 与检查面板输出。             |
| React 结构化输出接入   | `pnpm example:react-object`                                    | `examples/react-object/App.tsx` 和 [React hooks](/zh/reference/react)                                                                | 跑一次结构化提取并检查 object 与 trace 输出                           |
| React 图片生成         | `pnpm example:react-image`                                     | `examples/react-image/App.tsx` 和 [React hooks](/zh/reference/react)                                                                 | 生成或编辑图片，再检查请求 trace 和响应 JSON                          |
| React 视频生成         | `pnpm example:react-video`                                     | `examples/react-video/App.tsx` 和 [React hooks](/zh/reference/react)                                                                 | 生成 storyboard，再检查请求 trace 和响应 JSON                         |
| Thread 侧边栏持久化    | `pnpm example:threaded-chat`                                   | `examples/threaded-chat/App.vue` 和 [useChatThreads](/zh/reference/use-chat-threads)                                                 | 创建、重命名、归档、恢复并重新打开 thread                             |
| Thread 任务启动器      | `pnpm example:threaded-chat`                                   | `examples/threaded-chat/ThreadChatPanel.vue` 和 [usePromptSuggestions](/zh/reference/use-prompt-suggestions)                         | 用可复用启动提示词开启线程开场，再确认 trace 后发送。                 |
| IndexedDB 本地持久化   | 应用启动时的异步 hydrate 逻辑                                  | [服务端存储](/zh/guide/server-storage) 和 `IndexedDB 本地持久化（异步）` 章节                                                        | 刷新前恢复 thread/messages，完成后保存并验证无数据丢失                |
| 服务端聊天历史         | 你的应用后端和数据库                                           | [服务端存储](/zh/guide/server-storage)                                                                                               | 恢复 index 和 messages，发送、刷新并验证                              |
| 重新生成或分支历史     | 已存 thread 加 `/api/chat`                                     | [重新生成分支](/zh/guide/regenerate-branches)                                                                                        | 重新生成时不覆盖原回答                                                |
| 自有 `/api/chat` proxy | `pnpm example:proxy-server` 加 proxy chat 环境变量             | [Proxy 配方](/zh/guide/proxy-recipes)                                                                                                | 确认 stream chunks 与 `inspectRequestTrace()` 的 `/api/chat` 元数据。 |
| 无 UI Agent run 审批   | `pnpm example:agent-run`                                       | `examples/agent-run/App.vue` 和 [useAgentRun](/zh/reference/use-agent-run)                                                           | 在 `approvePlan` 暂停，用同 run id resume，再检查事件 timeline。      |
| Agent 后端桥接         | LangChain、LangGraph 或自研后端 agent                          | [后端 Agent 桥接](/zh/guide/agent-bridge)、[Agent 路由模板](/zh/guide/agent-route-templates) 和 [Agent 事件](/zh/guide/agent-events) | 转成安全 `ChatChunk` 或 UI stream parts                               |
| AI SDK UI stream 迁移  | `pnpm example:proxy-server` + `pnpm example:ui-message-stream` | [AI SDK 迁移](/zh/guide/ai-sdk-migration)                                                                                            | 用 `readUIMessageStream()` 解码 parts                                 |
| 生产部署准备           | 跑本地 proxy 和文档构建检查                                    | [生产检查清单](/zh/guide/production-checklist)                                                                                       | 进生产前逐项通过 checklist                                            |

## Vue 聊天 + 工具审批

```bash
pnpm install
pnpm example:chat
```

打开 Vite 输出的本地地址，点击 **Run approval demo**。没有选择真实 Provider 时，示例会使用
`local-tools` Provider：先流式输出 assistant 回复，在 `chargeCard` 工具调用处暂停，然后根据
`approveToolCall()` 或 `rejectToolCall()` 继续。

不打开浏览器也可以跑发布 smoke check：先构建包，再校验工具审批 approve/reject 路径：

```bash
pnpm build
pnpm tool-approval:check
```

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

要验证与 Vue 一致的 `/api/chat` 代理路径，运行：

```bash
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-chat
```

这样可以在不泄露 Provider key 的前提下，对比两个示例的 trace 字段。

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

## React 文本补全

先运行不需要 Provider key 的 React 补全示例：

```bash
pnpm example:react-completion
```

打开 Vite 输出的本地地址，发送一次 prompt 或点击样例按钮。该示例使用确定性的本地流，
用于验证接入代理前的 `useCompletion` 生命周期、`status`、`inspect()` 和请求 trace 输出。

要验证与 Vue 一致的 `/api/completion` 代理路径，运行：

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-completion
```

代理模式下请将请求发往 `/api/completion`（`proxy-provider`）。本地环境变量可继续沿用既有
`VITE_PROXY_*` 约定。

## Vue 文本补全

先运行不需要 key 的 Vue 补全示例：

```bash
pnpm example:completion
```

打开 Vite 输出的本地地址，发送一次 prompt。该示例在未设置真实 provider 时使用本地确定性流，可用于先验 `useCompletion` 的
`status`、`inspect()` 与 trace 渲染，再切换到真实路由。

要与 Vue 端的代理路径一致验证，运行：

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:completion
```

代理模式下该示例会请求 `/api/completion`（`proxy-provider`）。

## Vue Embedding 快速上手

先运行不需要 key 的 embedding 示例：

```bash
pnpm example:embedding
```

打开 Vite 地址并提交一次向量化输入。默认示例使用本地 provider，返回向量结果和相似度计算，同时保留
与其他 demo 一致的 `status`、`inspect()` 与请求 trace 面板。

要验证自有后端路径，运行：

```bash
VITE_EXAMPLE_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:embedding
```

代理模式下该示例会请求 `/api/embedding`。

## React 结构化对象

先运行不需要 key 的 React 结构化输出示例：

```bash
pnpm example:react-object
```

打开 Vite 输出的本地地址并提交提示词。页面会同时显示解析后的对象结果和原始流文本，便于确认 schema
提取行为，再接真实后端。

要用应用后端验证，运行：

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-object
```

代理模式下该 demo 会请求 `/api/object`。

## Vue 结构化对象

先运行不需要 key 的 Vue 结构化示例：

```bash
pnpm example:object
```

打开 Vite 地址并提交提示词。页面同时展示解析后的对象字段、原始流文本和 `inspect()` 面板，便于在接入真实
proxy 前确认 schema 解析与 trace 形态一致。

要验证 app-owned 后端路径，运行：

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:object
```

代理模式下该示例会请求 `/api/object`。

## React 图片生成

先运行不需要 key 的 React 图片示例：

```bash
pnpm example:react-image
```

打开 Vite 地址并选择 Generate 或 Edit 模式。Generate 模式会返回确定性本地 SVG；
Edit 模式会携带 source 与 mask 请求，方便你在接入真实后端前验收 `useImage` 的请求参数。
starter 区来自 `createPromptSuggestionRecipes({ surfaces: ['media'] })` 和
`usePromptSuggestions`，因此接真实 provider 路由前也能复用同一组媒体提示词起点。

要用应用后端验证，运行：

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-image
```

该示例会在代理模式下请求 `/api/image`。

## React 视频生成

先运行不需要 key 的 React 视频示例：

```bash
pnpm example:react-video
```

打开 Vite 地址并提交提示词或点击样例。该示例会返回确定性本地 storyboard，并展示
`useVideo` 的请求 trace 状态。
starter 区同样使用 `createPromptSuggestionRecipes({ surfaces: ['media'] })`
和 `usePromptSuggestions`，让图片与视频的提示词起手方式保持一致。

要用应用后端验证，运行：

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-video
```

该示例会在代理模式下请求 `/api/video`。

## 自有 `/api/chat` proxy

接真实上游前，先跑确定性的 proxy：

```bash
pnpm example:proxy-server
# 另开一个终端
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

`proxy-route` 模式让浏览器直接打到默认 `useChat` 约定的 `/api/chat`，这样可以先在本地验证
生产前端要保持的契约形态：浏览器不携带 key，`inspectRequestTrace()` 能直接看到路由级 trace。

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
pnpm build
pnpm threaded-chat:check
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

先验证 create、rename、archive、restore、delete 和 smoke check，再接 server storage
adapter。这个可运行 demo 使用确定性的 `DirectChatTransport`、`useChatThreads()`
侧边栏索引，以及当前 thread 独立的 `useChat({ persist })`。当 thread 索引无法
从 storage 加载、保存或清除时，demo 也会渲染 `persistenceError`。详见
[useChatThreads](/zh/reference/use-chat-threads)。

## Thread 任务启动器

同样跑 `pnpm example:threaded-chat`，在首屏空态使用建议起点快速填充 composer 输入框：

```bash
pnpm example:threaded-chat
```

在 `examples/threaded-chat/ThreadChatPanel.vue` 中，起点提示来自
`createPromptSuggestionRecipes({ surfaces: ['thread'] })`，再交给 `usePromptSuggestions` 并带入当前
`messages`，因此可以复用共享 task-starter recipes，同时仍按消息上下文和当前输入过滤。点击提示词会把内容写入输入框，便于用户在发送前再次修改。这样避免一上来就输入空白起手。

该示例同时保留线程 trace 面板，可用于确认 `Status/Timeline/Provider` 等可观测字段在
每次 starter 触发后是否正常更新。面板还会展示 `inspect()` 快照与 `request/response` JSON，
便于对接真实 `/api/chat` 前先确认 trace 形态是否完整。

## IndexedDB 本地持久化

服务端未接通时，先用 IndexedDB 做可恢复本地历史，再逐步切到服务端存储。因为
`persist` 只覆盖同步的 `Storage`，所以要显式加一层异步 hydrate/保存逻辑：

1. 启动时从 IndexedDB 恢复 thread index 和 messages。
2. 用恢复到的数据初始化 `initialThreads`、`initialActiveThreadId`、`initialMessages`。
3. 在 `onFinish`、thread 重命名、归档、恢复、删除后再回写 IndexedDB。

这样可以不依赖数据库先跑起生产候选版本，同时保留与服务端方案一致的 thread/message
数据形态，后续切换 `/api/chat` 和持久化端点时兼容性更高。

参考 [IndexedDB 本地持久化（异步）](/zh/guide/server-storage#indexeddb-本地持久化适配器-异步)。

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
pnpm example:ui-message-stream
```

本地运行的 demo 会用 `messages` 请求体调用 `/api/ui-message-stream`，再用
`readUIMessageStream()` 按 chunk 逐项解码。迁移要小步做：先证明 text、tool-call 和
data parts 能正确解码，再逐个替换生产路由。

不打开浏览器也可以跑发布 smoke check：先构建包，再校验真实 proxy 响应能被解码：

```bash
pnpm build
pnpm ui-message-stream:check
```

## 无 UI Agent run 审批

接真实后端 agent 前，先跑浏览器 demo：

```bash
pnpm example:agent-run
```

打开 Vite 地址，启动 run，点击 **Replay same id**，再审批或拒绝 `approvePlan`
interrupt。这个 demo 使用确定性的本地 `AgentEvent` 流，可以在不配置 Provider key
的情况下验证 `useAgentRun()` 状态、同 `runId` 重放安全、`resume()`、`inspect()` 和
`clearTrace()`。
提示词 starter 使用 `createPromptSuggestionRecipes({ surfaces: ['agent', 'tool-approval'] })`，
让 agent 规划和特权工具审批入口复用同一套 starter recipe surface。

不打开浏览器也可以跑发布 smoke check：先构建包，再跑校验：

```bash
pnpm build
pnpm agent-run:check
```

## Agent 后端桥接

当 LangChain、LangGraph 或你自己的后端 agent 已经会输出 progress、工具审批、工具结果、source、file
或最终 usage 事件时，用这个方向。规划、检索、记忆、checkpoint 和特权工具继续留在服务端，
浏览器只接收安全的 `AgentEvent`：

```ts
import { readAgentEventStream } from 'vue-ai-hooks'

yield * readAgentEventStream({ events: runAgent(messages), signal })
```

不打开浏览器也可以跑发布 smoke check：先构建包，再校验 AgentEvent 到 ChatChunk
和 UI message stream 的桥接：

```bash
pnpm build
pnpm agent-bridge:check
pnpm agent-route-templates:check
```

如果路由应该输出 AI SDK UI message stream，则用 `agentEventToUIMessageStreamPart()`
转换事件，再通过 `createUIMessageStreamResponse()` 返回。详见
[后端 Agent 桥接](/zh/guide/agent-bridge) 的 LangChain/LangGraph 投影边界，
[Agent 路由模板](/zh/guide/agent-route-templates) 的 Nuxt/Nitro、Next.js、Hono、Express、Fastify 和 Fetch
可复制路由形态，以及 [Agent 事件](/zh/guide/agent-events) 的底层 adapter。

## 完成标准

- 不需要 key 的 demo 能本地运行。
- proxy 路由能在浏览器不带 Provider key 的情况下本地运行。
- `lastRequest`、`lastResponse` 和 `inspectRequestTrace()` 足够支持排查。
- 真实上游只在服务端配置。
- 已通过 [生产检查清单](/zh/guide/production-checklist)。
