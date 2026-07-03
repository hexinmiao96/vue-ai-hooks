---
title: 后端 Agent 桥接配方
description: 把 LangChain、LangGraph 或自研后端 Agent 接到 vue-ai-hooks，同时保持浏览器包不变成 Agent 框架。
---

# 后端 Agent 桥接配方

当产品已经有，或准备加入后端 agent 服务时，使用这份配方。规划、检索、记忆、持久执行、特权工具和 checkpoint
都留在服务端；`vue-ai-hooks` 只接收浏览器安全投影：文本 delta、progress、tool event、source、file、最终 usage 和安全错误。

这样可以保持本包的定位：前端 composable 和 transport contract。后端可以使用 LangChain、LangGraph、队列 worker 或自研 agent runtime，而不把这些内部实现泄漏到 UI。

## 桥接什么

Context7 查询到的 LangChain.js 和 LangGraph.js 当前文档都把 event streaming 作为新应用推荐形态。
LangChain agent 可以通过 `streamEvents(..., { version: 'v3' })` 暴露 messages、tool calls、state values、final output 和 extensions 等 typed projections。
LangGraph 支持 event streaming，也支持 `messages`、`updates`、`custom`、`tools`、`debug` 等 stream modes；Human-in-the-loop 场景还支持 interrupt/resume。

不要把这些原始事件直接转发给浏览器。先归一化成 `AgentEvent`：

| 后端信号              | 浏览器安全 `AgentEvent`    |
| --------------------- | -------------------------- |
| 模型 token 或消息片段 | `message-delta`            |
| Chain 或 graph 进度   | `progress`                 |
| 工具输入已就绪        | `tool-call`                |
| 工具完成              | `tool-result`              |
| 工具失败              | `tool-error`               |
| 检索 citation         | `source`                   |
| 生成文件              | `file`                     |
| run 完成              | `finish`                   |
| 可恢复 agent 错误     | `error`                    |
| HITL interrupt        | `interrupt` 加持久审批记录 |

interrupt 或 tool call 需要人工决策时，按 [工具审批](/zh/guide/tool-approvals) 接入。底层
adapter API 见 [Agent 事件](/zh/guide/agent-events)。

## 路由契约

先从应用自己的路由开始：

```txt
POST /api/agent/runs
GET  /api/agent/runs/:runId/events
POST /api/agent/runs/:runId/resume
POST /api/chat
```

`POST /api/agent/runs` 创建或恢复一个持久 run：

```json
{
  "threadId": "thread_support_1",
  "branchId": "branch_main",
  "runId": "run_agent_001",
  "messages": [],
  "agent": "support-triage",
  "metadata": {
    "traceId": "trace_abc"
  }
}
```

`GET /api/agent/runs/:runId/events` 可以返回包含 `AgentEvent` JSON 的 Server-Sent Events。如果你的聊天路由已经负责 streaming，`POST /api/chat` 也可以在同一个响应里创建 run 并输出事件。

## LangChain 投影

LangChain import 和工具凭据只放在服务端：

```ts
import { createAgent } from 'langchain'
import type { AgentEvent } from 'vue-ai-hooks'

const agent = createAgent({
  model,
  tools
})

export async function* runLangChainAgent(input: AgentInput): AsyncGenerator<AgentEvent> {
  const stream = await agent.streamEvents(
    { messages: input.messages },
    { version: 'v3', configurable: { thread_id: input.threadId } }
  )

  for await (const message of stream.messages) {
    for await (const delta of message.text) {
      yield { type: 'message-delta', delta }
    }
  }

  for await (const toolCall of stream.toolCalls) {
    yield {
      type: 'tool-call',
      id: toolCall.id,
      name: toolCall.name,
      input: redactToolInput(toolCall.input)
    }
  }

  const output = await stream.output
  yield { type: 'finish', usage: output.usage, metadata: { runId: input.runId } }
}
```

把这段当作投影层，而不是公开依赖契约。如果你的 LangChain 版本输出不同 shape，就在这个后端函数里适配，浏览器面对的 `AgentEvent` 保持稳定。

如果要同时消费 `.messages`、`.toolCalls` 和 `.output` 等多个 typed projection，
也应在后端 route 或 worker 内完成。浏览器不应收到 LangChain stream 对象、原始工具参数、
LangSmith metadata 或 Provider header。先脱敏，再只输出 `AgentEvent`。

## LangGraph 投影

LangGraph 可以输出 SDK chunks 或本地图事件。把不同 modes 归一化到同一套事件词汇：

```ts
import { Client } from '@langchain/langgraph-sdk'
import type { AgentEvent } from 'vue-ai-hooks'

const client = new Client({ apiUrl: process.env.LANGGRAPH_URL })

export async function* runLangGraphAgent(input: AgentInput): AsyncGenerator<AgentEvent> {
  const chunks = client.runs.stream(input.threadId, 'support-agent', {
    input: { messages: input.messages },
    streamMode: ['messages', 'updates', 'tools']
  })

  for await (const chunk of chunks) {
    if (chunk.event === 'messages') {
      yield { type: 'message-delta', delta: readTextDelta(chunk.data) }
    } else if (chunk.event === 'updates') {
      yield {
        type: 'progress',
        id: 'graph-update',
        label: 'Agent state updated',
        data: redactStateUpdate(chunk.data),
        transient: true
      }
    } else if (chunk.event === 'tools') {
      yield normalizeToolEvent(chunk.data)
    }
  }
}
```

interrupt/resume 场景里，把 interrupt payload 存在后端，创建审批记录；只有审批路由校验通过后，才 resume graph。不要把原始 checkpoint state 发给浏览器。

本地 LangGraph runtime 应使用 checkpointer 编译 graph，并用同一个 thread id resume。
`Command` 和 checkpoint state 只留在服务端；UI 只看到审批摘要：

```ts
import { Command } from '@langchain/langgraph'
import type { AgentEvent } from 'vue-ai-hooks'

export async function* resumeLangGraphRun(input: ResumeInput): AsyncGenerator<AgentEvent> {
  const config = { configurable: { thread_id: input.threadId } }

  yield {
    type: 'interrupt',
    id: input.approvalId,
    name: 'approveTool',
    value: {
      approvalId: input.approvalId,
      runId: input.runId,
      threadId: input.threadId,
      toolCallId: input.toolCallId,
      summary: input.summary
    }
  }

  if (!input.approved) return

  const stream = await graph.streamEvents(
    new Command({ resume: { action: 'approve', approvalId: input.approvalId } }),
    { version: 'v3', ...config }
  )

  for await (const message of stream.messages) {
    for await (const delta of message.text) {
      yield { type: 'message-delta', delta }
    }
  }

  yield { type: 'finish', metadata: { runId: input.runId, threadId: input.threadId } }
}
```

这与浏览器里的 `useAgentRun().resume()` 语义一致，但持久 checkpoint 和
`Command({ resume })` 执行仍由后端控制。

## 投影守护规则

每个后端 adapter 都按这组契约投影：

- `data-agent-interrupt` 只携带审批人可看的字段，例如 `approvalId`、`toolCallId`、
  `runId`、`threadId` 和脱敏摘要。
- 创建事件前，把原始 checkpoint state、vector matches、工具正文、access token、
  LangSmith/Provider metadata 替换成 `"[redacted]"`。
- 把 `runId` 和 LangGraph `thread_id` 当作持久指针。浏览器重试应重连或 resume，
  不能启动第二个 graph。
- 大型检索 payload 优先变成 `source` 或 `file` 引用。`progress.data` 要足够小，
  能安全渲染和记录日志。
- 用 `pnpm agent-bridge:check` 验证投影；它会模拟 LangChain typed projections、
  LangGraph interrupt/resume、脱敏，以及 `ChatChunk` 和 AI SDK UI stream 两条输出。

## vue-ai-hooks 路由

把 `AgentEvent` 转成 `ChatChunk`：

```ts
import { readAgentEventStream } from 'vue-ai-hooks'

export async function* chat(request: ChatRequest) {
  yield* readAgentEventStream({
    events: runLangGraphAgent({
      threadId: request.threadId,
      branchId: request.body?.branchId,
      runId: request.body?.runId,
      messages: request.messages
    }),
    signal: request.signal
  })
}
```

也可以返回 AI SDK UI message stream parts：

```ts
import {
  agentEventToUIMessageStreamPart,
  createUIMessageStreamResponse,
  type AgentEvent
} from 'vue-ai-hooks'

export function agentEventsResponse(events: AsyncIterable<AgentEvent>) {
  return createUIMessageStreamResponse({
    stream: toParts(events)
  })
}

async function* toParts(events: AsyncIterable<AgentEvent>) {
  for await (const event of events) {
    yield agentEventToUIMessageStreamPart(event)
  }
}
```

Vue 应用继续使用 `useChat({ api: '/api/chat' })` 或 proxy provider。React 消费者也可以通过
`vue-ai-hooks/react` 复用同一路由。

## 后端检查

- 开始 run 前校验 session、tenant、thread、branch、agent id、模型和工具权限。
- 把 `runId` 当作幂等 key。重连或浏览器重试不能创建重复 agent run 或重复工具执行。
- 创建 `AgentEvent` 前，先脱敏 graph state、检索文档、工具输入、工具输出和错误对象。
- LangChain、LangGraph、vector store、tool 和 LangSmith 凭据只留在服务端。
- 原始 trace、checkpoint 和审批记录存在后端。UI 只接收稳定 `traceId` 和浏览器安全摘要。
- 限制 event 大小和速率。大型检索内容应变成 `source` 或 `file` 引用，而不是巨大的
  `progress.data`。
- 运行时支持时转发 abort signal，并把 run 标记为 `aborted` 或 `failed`，附带安全原因。

## Smoke test

开放桥接前先验证：

1. 运行 `pnpm build && pnpm agent-bridge:check`，确认发布入口可以把安全
   `AgentEvent` 转成 `ChatChunk` 和 AI SDK UI stream parts。
2. 启动不需要 key 的本地 agent run，并流出一条 `message-delta`。
3. 输出一个 retrieval `source`，确认浏览器只看到安全 metadata。
4. 输出一个 `tool-call`，通过后端审批，再返回 `tool-result`。
5. 触发一次 graph interrupt，持久化审批记录，resume 后确认最终 `finish` 到达。
6. 使用同一个 `runId` 重复请求，确认后端返回或恢复同一个 run，而不是创建重复 run。
7. 中途断开 stream，重连 `/api/agent/runs/:runId/events`，确认 UI 能从已存状态恢复。
8. 捕获 `inspectRequestTrace()`，确认包含 `threadId`、`branchId`、`runId` 和 `traceId`，
   且没有 Provider、LangSmith、vector store 或工具凭据。
