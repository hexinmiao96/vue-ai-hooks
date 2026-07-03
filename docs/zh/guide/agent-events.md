---
title: Agent 事件适配
description: 把应用自有 agent 事件归一成 ChatChunk stream 或 AI SDK UI message stream parts。
---

# Agent 事件适配

当你的后端 agent 已经会产出 progress、工具审批、工具结果、来源、文件和最终 usage
这类产品事件时，用这页。这个 adapter 刻意保持很小：它不做规划、检索、工具沙箱或
thread 存储，只把你的 agent 事件转换成 `useChat`、自定义 transport 和 proxy 路由已经能消费的 stream 契约。

如果要接 LangChain、LangGraph 或自研后端 agent runtime，先看
[后端 Agent 桥接配方](/zh/guide/agent-bridge)，再用本页确认底层 adapter API。

## 事件契约

先让服务端输出一个窄的事件流：

```ts
import type { AgentEvent } from 'vue-ai-hooks'

async function* runAgent(): AsyncGenerator<AgentEvent> {
  yield { type: 'message-delta', delta: '我来检查。' }
  yield { type: 'progress', id: 'search', label: '搜索文档', value: 0.5 }
  yield { type: 'tool-call', id: 'call_1', name: 'lookupOrder', input: { orderId: 'A-42' } }
  yield { type: 'tool-result', id: 'call_1', name: 'lookupOrder', output: { status: 'paid' } }
  yield { type: 'interrupt', id: 'approval_1', name: 'approveRefund', value: { amount: 49 } }
  yield { type: 'source', id: 'source_1', url: 'https://example.test/orders/A-42' }
  yield { type: 'finish', usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 } }
}
```

常用事件类型：

| 事件            | 含义                            | 输出形态                             |
| --------------- | ------------------------------- | ------------------------------------ |
| `message-delta` | assistant 文本 delta            | `ChatChunk.content` / `text-delta`   |
| `progress`      | 非模型 progress 或 timeline     | `data-agent-progress`                |
| `tool-call`     | 工具输入已就绪，可渲染或审批    | `toolCalls` / `tool-input-available` |
| `tool-result`   | 工具成功完成                    | `tool-output-available`              |
| `tool-error`    | 工具失败，但 stream 可继续      | `tool-output-error`                  |
| `interrupt`     | 人在回路 resume 点              | `data-agent-interrupt`               |
| `source`        | URL 引用或外部来源              | `source-url`                         |
| `file`          | 生成或附加的文件                | `file`                               |
| `finish`        | 最终原因、usage 和可选 metadata | `finish`                             |
| `error`         | 不抛出的 agent 错误数据         | `data-agent-error`                   |

## 自定义 Provider

把应用自有 agent 事件流直接转换成 `ChatChunk`：

```ts
import { readAgentEventStream, type ChatProvider } from 'vue-ai-hooks'

export const agentProvider: ChatProvider = {
  id: 'my-agent',
  async *chat(request) {
    yield* readAgentEventStream({
      events: runAgent(request.messages),
      signal: request.signal
    })
  }
}
```

只需要在自定义 transport 或测试里适配单个事件时，使用
`agentEventToChatChunk(event)`；后端已经暴露 iterable、async iterable 或
`ReadableStream<AgentEvent>` 时，使用 `readAgentEventStream()`。

`useChat({ provider: agentProvider })` 会收到正常的文本 delta、工具调用、结构化
`Message.parts`、stream data、usage 和 metadata。Vue 应用可以复用本地 chat demo
里的工具审批、来源和文件渲染方式。React 应用也能通过 `vue-ai-hooks/react` 复用同一个 provider。

## Proxy 路由

如果你的路由要暴露 AI SDK UI message stream parts，则把每个事件转换成 part，
再复用现有 response helper：

```ts
import {
  agentEventToUIMessageStreamPart,
  createUIMessageStreamResponse,
  type AgentEvent
} from 'vue-ai-hooks'

export async function POST() {
  return createUIMessageStreamResponse({
    stream: agentEventsToParts(runAgent())
  })
}

async function* agentEventsToParts(events: AsyncIterable<AgentEvent>) {
  for await (const event of events) {
    yield agentEventToUIMessageStreamPart(event)
  }
}
```

浏览器可以通过 `proxyProvider`、`DefaultChatTransport` 或 `readUIMessageStream()`
消费这个路由。当你的后端已经接近 AI SDK UI message stream 协议，或者想用
proxy 示例里的 `/api/ui-message-stream` 工具检查路由时，这个方式更合适。

## 工具审批

`tool-call` 会同时映射成 streamed `toolCalls` delta 和 `tool-*` message part。
如果应用需要人工审批，审批结果仍由你的后端或 UI 状态保存，然后继续发出：

```ts
yield { type: 'tool-result', id: 'call_1', name: 'chargeCard', output: { approved: true } }
```

或：

```ts
yield { type: 'tool-error', id: 'call_1', name: 'chargeCard', errorText: 'User rejected' }
```

adapter 不执行工具，也不提供沙箱。它只保留足够的 id、名称、输入、输出和错误文本，
让 `useChat` 和渲染器能展示稳定 timeline。持久人工审批、审批人审计轨迹、幂等执行和安全
renderer contract 见 [工具审批配方](/zh/guide/tool-approvals)。

## Interrupt 和 Data part 命名

interrupt、progress 和不抛出的 agent 错误默认使用安全名称：

```ts
readAgentEventStream({
  events,
  progressDataType: 'data-agent-progress',
  interruptDataType: 'data-agent-interrupt',
  errorDataType: 'data-agent-error'
})
```

如果你的应用已有 data-part 分类，可以覆盖：

```ts
readAgentEventStream({
  events,
  progressDataType: 'data-workflow-progress',
  interruptDataType: 'data-workflow-interrupt',
  errorDataType: 'data-workflow-error'
})
```

progress、interrupt 或 error 事件带上 `transient: true` 时，UI 会收到 `onData`，
但不会把该 part 存进消息 timeline。浏览器负责 run 按钮和审批 UI 时，见
[useAgentRun](/zh/reference/use-agent-run)。

## 生产注意事项

- Provider key 和高权限工具凭据只放服务端。
- 把 `AgentEvent` 当成浏览器安全投影，不要当成原始后端 trace。
- 完整 trace、审批、重试和租户数据应存入你的应用后端。
- progress、source、file 和 tool 事件尽量使用稳定 `id`，这样 UI part 可以替换旧条目，而不是无限增长。
- adapter 只放在边界层。如果产品需要 agent 框架，规划和检索交给 LangChain、LangGraph 或你的自研服务。
