---
title: Agent route templates
description: Copyable backend route templates for projecting agent runtimes into vue-ai-hooks streams.
---

# Agent route templates

Use these templates when the backend already owns LangChain, LangGraph, queue
workers, provider credentials, vector stores, or privileged tools. They keep the
browser contract small: the UI receives `AgentEvent` projections, `ChatChunk`
streams, or AI SDK UI message stream parts, never raw framework events.

The examples below intentionally do not add Nuxt, Next.js, Hono, LangChain, or
LangGraph as `vue-ai-hooks` dependencies. Copy the template into your app route
and bind `runProjectedAgentEvents()` to your backend agent.

## Shared projection helper

Keep this helper server-side. It is the only layer allowed to see backend
framework events, checkpoints, tool secrets, or provider metadata.

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
  yield {
    type: 'progress',
    id: 'agent-route-start',
    label: 'Agent route accepted',
    value: 0.1,
    data: {
      threadId: input.threadId,
      runId: input.runId,
      traceId: input.traceId,
      checkpoint: '[redacted]'
    }
  }

  // Call LangChain, LangGraph, or your worker here and project each safe event.
  yield { type: 'message-delta', messageId: input.runId, delta: 'Agent route ready.' }
  yield {
    type: 'finish',
    finishReason: 'stop',
    metadata: {
      runId: input.runId,
      traceId: input.traceId
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
  if (!body.threadId || !body.runId || !Array.isArray(body.messages)) {
    throw new Error('invalid body')
  }
}
```

## Next.js App Router

Put this in `app/api/chat/route.ts` or a dedicated agent route. The current
Route Handler shape is `export async function POST(request: Request)` and
`request.json()` for the body.

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

Put this in `server/api/chat.post.ts` or `server/api/agent/runs.post.ts`.
Nuxt/Nitro server routes export `defineEventHandler()` handlers and read JSON
bodies with `readBody(event)`. H3 exposes the Web `Request` as `event.req` in
newer runtimes; when your target does not expose a request `signal`, omit it and
keep provider cancellation in the downstream route or worker.

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

Use this when your backend runs on Hono-compatible runtimes. Hono parses JSON
with `c.req.json()`. You can return the `Response` from
`createUIMessageStreamResponse()` directly, or use `streamText()` for plain text
diagnostics.

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

## Web Fetch route

Use this shape for Cloudflare Workers, Bun, Deno, or any runtime that accepts a
Fetch API handler.

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

Use the same route family for resume. Store checkpoint state and approval
records server-side; the browser submits only the approval decision.

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

## Checklist

- Provider keys, LangSmith keys, vector store credentials, tool secrets, and
  checkpoint state stay server-side.
- `runId`, `threadId`, and LangGraph `thread_id` are idempotency pointers.
- Interrupt events use `data-agent-interrupt` and contain only reviewer-safe
  fields: `approvalId`, `toolCallId`, `runId`, `threadId`, and a redacted
  summary.
- Route responses include `x-agent-run-id` and, when available,
  `x-agent-trace-id`.
- Run `pnpm build && pnpm agent-route-templates:check` before copying these
  templates into a product route. The check includes executable fixture smoke
  coverage for the Nuxt/Nitro, Next.js, Hono, Fetch, and LangGraph resume shapes
  without adding those frameworks as dependencies.
- Invalid request bodies must return `Agent route failed` at HTTP 400 with no
  secrets or provider identifiers.
- Run `pnpm agent-bridge:check` when the route also projects LangChain or
  LangGraph runtime events.
