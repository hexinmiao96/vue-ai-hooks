---
title: Agent 路由模板
description: 把后端 agent runtime 投影成 vue-ai-hooks stream 的可复制路由模板。
---

# Agent 路由模板

当后端已经持有 LangChain、LangGraph、队列 worker、Provider 凭据、vector store 或特权工具时，使用这些模板。
它们保持浏览器契约很小：UI 只接收 `AgentEvent` 投影、`ChatChunk` stream 或 AI SDK UI
message stream parts，不接收原始框架事件。

下面示例不会把 Nuxt、Next.js、Hono、LangChain 或 LangGraph 加进 `vue-ai-hooks` 依赖。
把模板复制到你的应用路由中，再把 `runProjectedAgentEvents()` 绑定到后端 agent。

## 共享投影 helper

这个 helper 只放在服务端。只有这一层可以看到后端框架事件、checkpoint、工具 secret 或
Provider metadata。

```ts
import {
  agentEventToUIMessageStreamPart,
  createUIMessageStreamResponse,
  readAgentEventStream,
  type AgentEvent,
  type UIMessageStreamPart
} from 'vue-ai-hooks'

export interface AgentRouteBody {
  threadId: string
  runId: string
  messages: unknown[]
  traceId?: string
}

interface ProjectedRunInput extends AgentRouteBody {
  signal?: AbortSignal
}

export async function* runProjectedAgentEvents(
  input: ProjectedRunInput
): AsyncGenerator<AgentEvent> {
  const providerMetadata = {
    provider: 'agent-route-template',
    route: 'chat',
    ...(input.traceId ? { traceId: input.traceId } : {})
  }

  yield {
    type: 'progress',
    id: 'agent-route-start',
    label: 'Agent route accepted',
    value: 0.1,
    data: {
      threadId: input.threadId,
      runId: input.runId,
      traceId: input.traceId,
      providerMetadata,
      checkpoint: '[redacted]'
    }
  }

  // 在这里调用 LangChain、LangGraph 或你的 worker，并投影成安全事件。
  yield { type: 'message-delta', messageId: input.runId, delta: 'Agent route ready.' }
  yield {
    type: 'finish',
    finishReason: 'stop',
    metadata: {
      runId: input.runId,
      traceId: input.traceId,
      providerMetadata
    }
  }
}

export async function* toUIMessageParts(
  events: AsyncIterable<AgentEvent>
): AsyncGenerator<UIMessageStreamPart> {
  for await (const event of events) {
    yield agentEventToUIMessageStreamPart(event, {
      interruptDataType: 'data-agent-interrupt'
    })
  }
}

export function uiMessageStreamResponse(body: AgentRouteBody, signal?: AbortSignal) {
  const events = runProjectedAgentEvents({ ...body, signal })
  return createUIMessageStreamResponse({
    stream: toUIMessageParts(events),
    headers: {
      'x-agent-run-id': body.runId,
      ...(body.traceId ? { 'x-agent-trace-id': body.traceId } : {})
    }
  })
}

export function agentRouteErrorResponse(status = 400) {
  return Response.json({ error: 'Agent route failed' }, { status })
}

export async function* chatChunks(body: AgentRouteBody, signal?: AbortSignal) {
  yield* readAgentEventStream({
    events: runProjectedAgentEvents({ ...body, signal }),
    progressDataType: 'data-agent-progress',
    interruptDataType: 'data-agent-interrupt',
    errorDataType: 'data-agent-error'
  })
}

export function assertAgentRouteBody(value: unknown): asserts value is AgentRouteBody {
  if (!value || typeof value !== 'object') throw new Error('invalid body')
  const body = value as Partial<AgentRouteBody>
  if (
    !body.threadId ||
    !body.runId ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0
  ) {
    throw new Error('invalid body')
  }
}
```

## Next.js App Router

放到 `app/api/chat/route.ts` 或专门的 agent route。当前 Route Handler 形态是
`export async function POST(request: Request)`，请求体用 `request.json()` 读取。

```ts
import {
  assertAgentRouteBody,
  uiMessageStreamResponse,
  agentRouteErrorResponse
} from '@/lib/agent-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    assertAgentRouteBody(body)
    return uiMessageStreamResponse(body, request.signal)
  } catch {
    return agentRouteErrorResponse()
  }
}
```

## Nuxt server route

放到 `server/api/chat.post.ts` 或 `server/api/agent/runs.post.ts`。Nuxt/Nitro
server route 导出 `defineEventHandler()`，并用 `readBody(event)` 读取 JSON 请求体。
较新的 H3 runtime 会把 Web `Request` 暴露为 `event.req`；如果目标 runtime 没有 request
`signal`，可以省略它，把 Provider 取消逻辑留在下游路由或 worker。

```ts
import {
  assertAgentRouteBody,
  uiMessageStreamResponse,
  agentRouteErrorResponse
} from '~/server/utils/agent-route'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    assertAgentRouteBody(body)
    return uiMessageStreamResponse(body, event.req?.signal)
  } catch {
    return agentRouteErrorResponse()
  }
})
```

## Hono

后端跑在 Hono 兼容 runtime 时用这个模板。Hono 用 `c.req.json()` 解析 JSON。
你可以直接返回 `createUIMessageStreamResponse()` 生成的 `Response`，也可以用
`streamText()` 做纯文本诊断。

```ts
import { Hono } from 'hono'
import { streamText } from 'hono/streaming'
import {
  assertAgentRouteBody,
  chatChunks,
  uiMessageStreamResponse,
  agentRouteErrorResponse
} from './agent-route'

const app = new Hono()

app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json()
    assertAgentRouteBody(body)
    return uiMessageStreamResponse(body, c.req.raw.signal)
  } catch {
    return agentRouteErrorResponse()
  }
})

app.post('/api/agent/runs/:runId/events.txt', async (c) => {
  try {
    const body = await c.req.json()
    assertAgentRouteBody(body)

    return streamText(c, async (stream) => {
      for await (const chunk of chatChunks(body, c.req.raw.signal)) {
        if (typeof chunk.content === 'string') await stream.write(chunk.content)
      }
    })
  } catch {
    return agentRouteErrorResponse()
  }
})

export default app
```

## Express

用于传统 Express 服务时可用这个模板。请先在中间件完成 body 解析，再按服务端侧安全边界返回 stream。

```ts
import { Readable } from 'node:stream'
import { assertAgentRouteBody, uiMessageStreamResponse } from './agent-route'

app.post('/api/chat', async (req, res) => {
  try {
    assertAgentRouteBody(req.body)
    const response = uiMessageStreamResponse(req.body, req.signal)

    res.status(response.status)
    for (const [name, value] of response.headers.entries()) {
      res.setHeader(name, value)
    }
    if (!response.body) {
      return res.send()
    }

    return Readable.fromWeb(response.body).pipe(res)
  } catch {
    return res.status(400).json({ error: 'Agent route failed' })
  }
})
```

## Fastify

适用于 Fastify 服务。请先在路由或 app 中完成 body 解析，并把路由返回的
`Response` 流映射为 Fastify 可发送流，同时保留 trace 响应头。

```ts
import { Readable } from 'node:stream'
import { assertAgentRouteBody, uiMessageStreamResponse } from './agent-route'

function sendAgentRouteResponse(reply, response) {
  reply.code(response.status)
  for (const [name, value] of response.headers.entries()) {
    reply.header(name, value)
  }

  if (!response.body) {
    return reply.send()
  }

  return reply.send(Readable.fromWeb(response.body))
}

fastify.post('/api/chat', async (req, reply) => {
  try {
    assertAgentRouteBody(req.body)
    return sendAgentRouteResponse(reply, uiMessageStreamResponse(req.body, req.signal))
  } catch {
    return reply.code(400).send({ error: 'Agent route failed' })
  }
})
```

## Cloudflare Workers

Cloudflare Workers 使用 `fetch` 的原生形态。把 body 校验、`stream` 回应和错误返回
放在同一层，异常一律返回 `agentRouteErrorResponse()`，避免把敏感细节返回给前端。

```ts
import {
  assertAgentRouteBody,
  uiMessageStreamResponse,
  agentRouteErrorResponse
} from './agent-route'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const body = await request.json()
      assertAgentRouteBody(body)
      return uiMessageStreamResponse(body, request.signal)
    } catch {
      return agentRouteErrorResponse()
    }
  }
}
```

## Web Fetch route

适用于 Bun、Deno 或其他通用 Fetch API handler 形态。

```ts
import {
  assertAgentRouteBody,
  uiMessageStreamResponse,
  agentRouteErrorResponse
} from './agent-route'

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const body = await request.json()
      assertAgentRouteBody(body)
      return uiMessageStreamResponse(body, request.signal)
    } catch {
      return agentRouteErrorResponse()
    }
  }
}
```

## LangGraph interrupt resume

resume 也使用同一路由族。checkpoint state 和审批记录只保存在服务端；浏览器只提交审批决策。

```ts
import { Command } from '@langchain/langgraph'

app.post('/api/agent/runs/:runId/resume', async (c) => {
  const decision = await c.req.json()
  const approval = await loadApproval(decision.approvalId)

  if (!approval || approval.runId !== c.req.param('runId')) {
    return c.json({ error: 'approval_not_found' }, 404)
  }

  await graph.streamEvents(
    new Command({ resume: { action: decision.approved ? 'approve' : 'reject' } }),
    {
      version: 'v3',
      configurable: { thread_id: approval.threadId }
    }
  )

  return c.json({ ok: true, runId: approval.runId })
})
```

## 检查清单

- Provider key、LangSmith key、vector store 凭据、工具 secret 和 checkpoint state
  只留在服务端。
- `runId`、`threadId` 和 LangGraph `thread_id` 都是幂等指针。
- Interrupt event 使用 `data-agent-interrupt`，并且只携带审批人可看的字段：
  `approvalId`、`toolCallId`、`runId`、`threadId` 和脱敏摘要。
- 路由响应包含 `x-agent-run-id`，有 trace 时也包含 `x-agent-trace-id`。
- `progress` 和 `finish` 事件 payload 应携带安全的可观测字段 `providerMetadata` 与
  `traceId`，用于联动日志与排障。
- 非法请求体，包括缺失 ID 和空 `messages`，必须返回 HTTP 400，`error` 为
  `Agent route failed`，且不泄露密钥或后端 trace 原文。
- 把模板复制进产品路由前，先运行 `pnpm build && pnpm agent-route-templates:check`。
  这条检查包含 Nuxt/Nitro、Next.js、Hono、Express、Fastify、Cloudflare、Fetch
  和 LangGraph resume
  形态的 executable
  fixture smoke，不会把这些框架加成依赖。
- 如果路由还要投影 LangChain 或 LangGraph runtime 事件，再运行 `pnpm agent-bridge:check`。
