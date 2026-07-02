---
title: Agent bridge recipe
description: Connect LangChain, LangGraph, or custom backend agents to vue-ai-hooks without turning the browser package into an agent framework.
---

# Agent bridge recipe

Use this recipe when your product already has, or plans to add, a backend agent
service. Keep planning, retrieval, memory, durable execution, privileged tools,
and checkpoints on the server. `vue-ai-hooks` should receive a browser-safe
projection: text deltas, progress, tool events, sources, files, final usage, and
safe errors.

This keeps the package focused on frontend composables and transport contracts.
Your backend can use LangChain, LangGraph, a queue worker, or a custom agent
runtime without leaking those internals into the UI.

## What to bridge

Context7 documentation for LangChain.js and LangGraph.js currently points to
event streaming as the preferred shape for new apps. LangChain agents expose
typed projections such as messages, tool calls, state values, final output, and
extensions from `streamEvents(..., { version: 'v3' })`. LangGraph supports
event streaming and stream modes such as `messages`, `updates`, `custom`,
`tools`, and `debug`; it also supports interrupt/resume workflows for
human-in-the-loop runs.

Do not forward those raw events directly to the browser. Normalize them into
`AgentEvent` values:

| Backend signal              | Browser-safe `AgentEvent`              |
| --------------------------- | -------------------------------------- |
| Model token or message part | `message-delta`                        |
| Chain or graph progress     | `progress`                             |
| Tool input is ready         | `tool-call`                            |
| Tool completed              | `tool-result`                          |
| Tool failed                 | `tool-error`                           |
| Retrieval citation          | `source`                               |
| Generated file              | `file`                                 |
| Run completed               | `finish`                               |
| Recoverable agent error     | `error`                                |
| HITL interrupt              | `progress` plus a durable approval row |

Use [Tool approvals](/guide/tool-approvals) when an interrupt or tool call needs
a human decision. Use [Agent events](/guide/agent-events) for the low-level
adapter API.

## Route contract

Start with app-owned routes:

```txt
POST /api/agent/runs
GET  /api/agent/runs/:runId/events
POST /api/agent/runs/:runId/resume
POST /api/chat
```

`POST /api/agent/runs` creates or resumes a durable run:

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

`GET /api/agent/runs/:runId/events` can return Server-Sent Events containing
`AgentEvent` JSON. If your chat route already streams, `POST /api/chat` can
create the run and stream events in one response.

## LangChain projection

Keep LangChain imports and tool credentials server-side:

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

Treat this as a projection layer, not a public dependency contract. If your
LangChain version emits different shapes, adapt those shapes in this backend
function and keep the browser-facing `AgentEvent` stable.

## LangGraph projection

LangGraph can stream SDK chunks or local graph events. Normalize modes into the
same event vocabulary:

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

For interrupt/resume flows, store the interrupt payload in your backend, create
an approval row, and resume the graph only after the approval route validates the
reviewer decision. Do not send raw checkpoint state to the browser.

## vue-ai-hooks route

Return `AgentEvent` as `ChatChunk` values:

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

Or return AI SDK UI message stream parts:

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

The Vue app still uses `useChat({ api: '/api/chat' })` or a proxy provider. React
consumers can use the same route through `vue-ai-hooks/react`.

## Backend checks

- Validate session, tenant, thread, branch, agent id, and model/tool access
  before starting a run.
- Treat `runId` as an idempotency key. A reconnect or browser retry should not
  create duplicate agent runs or tool executions.
- Redact graph state, retrieved documents, tool inputs, tool outputs, and error
  objects before creating `AgentEvent` values.
- Keep LangChain, LangGraph, vector store, tool, and LangSmith credentials on
  the server.
- Store raw traces, checkpoints, and approval records in your backend. Send only
  a stable `traceId` and browser-safe summaries to the UI.
- Cap event size and rate. Large retrieval payloads should become `source` or
  `file` references, not giant `progress.data` blobs.
- Forward abort signals where your runtime supports it, and mark the run
  `aborted` or `failed` with a safe reason.

## Smoke test

Before exposing the bridge:

1. Run `pnpm build && pnpm agent-bridge:check` to verify the published entry can
   convert safe `AgentEvent` values to `ChatChunk` and AI SDK UI stream parts.
2. Start a no-key local agent run and stream one `message-delta`.
3. Emit one retrieval `source` and confirm the browser sees only safe metadata.
4. Emit one `tool-call`, approve it through your backend, and return a
   `tool-result`.
5. Trigger one graph interrupt, persist the approval row, resume it, and confirm
   the final `finish` event arrives.
6. Repeat the same `runId` request and confirm the backend returns or resumes
   the same run instead of creating duplicates.
7. Disconnect mid-stream, reconnect to `/api/agent/runs/:runId/events`, and
   confirm the UI can recover from stored state.
8. Capture `inspectRequestTrace()` and confirm `threadId`, `branchId`, `runId`,
   and `traceId` are present without provider, LangSmith, vector store, or tool
   credentials.
