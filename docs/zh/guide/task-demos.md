---
title: 任务型 Demo
description: 按产品任务选择应该先跑哪个 vue-ai-hooks 示例，而不是先翻 API。
---

# 任务型 Demo

当你知道产品目标，但还不知道该打开哪个示例、后端路由或组合式函数时，先看这页。推荐顺序是：
先跑不需要 key 的本地路径，确认 UI 契约，再把本地路由替换成自己的后端。

## 按任务选择

| 产品任务               | 先运行                                             | 接着看                                                              | 接真实 Provider 前先验证                        |
| ---------------------- | -------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------- |
| Vue 聊天 + 工具审批    | `pnpm example:chat`                                | `examples/chat/App.vue`                                             | 点击 **Run approval demo**，审批或拒绝工具      |
| React 聊天最小接入     | `pnpm example:react-chat`                          | `examples/react-chat/App.tsx` 和 [React hooks](/zh/reference/react) | 发送一次 prompt，调用 `stop()`，检查 trace 状态 |
| 自有 `/api/chat` proxy | `pnpm example:proxy-server` 加 proxy chat 环境变量 | [Proxy 配方](/zh/guide/proxy-recipes)                               | 确认浏览器不带 key 也能收到 stream chunks       |
| Agent 服务 stream 适配 | 你的后端 agent event stream                        | [Agent 事件](/zh/guide/agent-events)                                | 转成 `ChatChunk` 或 UI stream parts             |
| AI SDK UI stream 迁移  | 向 `/api/ui-message-stream` 发 POST                | [AI SDK 迁移](/zh/guide/ai-sdk-migration)                           | 用 `readUIMessageStream()` 解码 parts           |
| 生产部署准备           | 跑本地 proxy 和文档构建检查                        | [生产检查清单](/zh/guide/production-checklist)                      | 进生产前逐项通过 checklist                      |

## Vue 聊天 + 工具审批

```bash
pnpm install
pnpm example:chat
```

打开 Vite 输出的本地地址，点击 **Run approval demo**。没有选择真实 Provider 时，示例会使用
`local-tools` Provider：先流式输出 assistant 回复，在 `chargeCard` 工具调用处暂停，然后根据
`approveToolCall()` 或 `rejectToolCall()` 继续。

如果你要验证消息历史、结构化 `Message.parts`、工具审批、停止按钮和请求检查，这是最应该先跑的产品 demo。

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

## AI SDK UI stream 迁移

当你的后端已经输出 AI SDK UI message stream parts 时，先跑：

```bash
pnpm example:proxy-server
```

向 `/api/ui-message-stream` 发 POST，然后用 `readUIMessageStream()` 或默认 proxy chat transport
消费 stream。迁移要小步做：先证明 text、tool-call 和 data parts 能正确解码，再逐个替换生产路由。

## Agent 服务 stream 适配

当你自己的后端已经会输出 progress、工具审批、工具结果、source、file 或最终 usage
事件时，用这个方向。Agent 服务继续留在服务端，浏览器只接收安全的 `AgentEvent`：

```ts
import { readAgentEventStream } from 'vue-ai-hooks'

yield * readAgentEventStream({ events: runAgent(messages), signal })
```

如果路由应该输出 AI SDK UI message stream，则用 `agentEventToUIMessageStreamPart()`
转换事件，再通过 `createUIMessageStreamResponse()` 返回。详见
[Agent 事件](/zh/guide/agent-events)。

## 完成标准

- 不需要 key 的 demo 能本地运行。
- proxy 路由能在浏览器不带 Provider key 的情况下本地运行。
- `lastRequest`、`lastResponse` 和 `inspectRequestTrace()` 足够支持排查。
- 真实上游只在服务端配置。
- 已通过 [生产检查清单](/zh/guide/production-checklist)。
