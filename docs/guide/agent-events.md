---
title: Agent event adapters
description: Normalize app-owned agent events into ChatChunk streams or AI SDK UI message stream parts.
---

# Agent event adapters

Use this guide when your backend agent already emits product-level events such
as progress, tool approval, tool results, sources, files, and final usage. The
adapter is intentionally small: it does not plan, retrieve, sandbox tools, or
store threads. It only converts your agent events into the stream contracts that
`useChat`, custom transports, and proxy routes already understand.

If you need to connect LangChain, LangGraph, or a custom backend agent runtime,
start with the [Agent bridge recipe](/guide/agent-bridge), then use this page
for the low-level adapter API.

## Event contract

Start with a narrow event stream from your server:

```ts
import type { AgentEvent } from 'vue-ai-hooks'

async function* runAgent(): AsyncGenerator<AgentEvent> {
  yield { type: 'message-delta', delta: 'I will check that.' }
  yield { type: 'progress', id: 'search', label: 'Searching docs', value: 0.5 }
  yield { type: 'tool-call', id: 'call_1', name: 'lookupOrder', input: { orderId: 'A-42' } }
  yield { type: 'tool-result', id: 'call_1', name: 'lookupOrder', output: { status: 'paid' } }
  yield { type: 'source', id: 'source_1', url: 'https://example.test/orders/A-42' }
  yield { type: 'finish', usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 } }
}
```

The common event types are:

| Event           | Meaning                                       | Output shape                         |
| --------------- | --------------------------------------------- | ------------------------------------ |
| `message-delta` | Assistant text delta                          | `ChatChunk.content` / `text-delta`   |
| `progress`      | Non-model progress or timeline state          | `data-agent-progress`                |
| `tool-call`     | Tool input is ready for rendering or approval | `toolCalls` / `tool-input-available` |
| `tool-result`   | Tool completed successfully                   | `tool-output-available`              |
| `tool-error`    | Tool failed but the stream can continue       | `tool-output-error`                  |
| `source`        | URL citation or external reference            | `source-url`                         |
| `file`          | Generated or attached file                    | `file`                               |
| `finish`        | Final reason, usage, and optional metadata    | `finish`                             |
| `error`         | Non-throwing agent error data for the UI      | `data-agent-error`                   |

## Custom provider

Convert an app-owned agent event stream directly into `ChatChunk` values:

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

Use `agentEventToChatChunk(event)` when you only need to adapt one event in a
custom transport or test fixture. Use `readAgentEventStream()` when the backend
already exposes an iterable, async iterable, or `ReadableStream<AgentEvent>`.

`useChat({ provider: agentProvider })` then receives normal content deltas,
tool calls, structured `Message.parts`, stream data, usage, and metadata. Vue
apps can render the same tool approval and source/file UI used by the local
chat demo. React apps can reuse the same provider through `vue-ai-hooks/react`.

## Proxy route

If your route should expose AI SDK UI message stream parts instead, convert each
event to a part and reuse the existing response helper:

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

The browser can consume that route through `proxyProvider`,
`DefaultChatTransport`, or `readUIMessageStream()`. This is useful when your
backend already speaks the AI SDK UI message stream protocol, or when you want
to test the route with the same `/api/ui-message-stream` tooling used by the
proxy example.

## Tool approval

`tool-call` maps to both a streamed `toolCalls` delta and a `tool-*` message
part. If your app requires human approval, keep the approval decision in your
own backend or UI state, then emit either:

```ts
yield { type: 'tool-result', id: 'call_1', name: 'chargeCard', output: { approved: true } }
```

or:

```ts
yield { type: 'tool-error', id: 'call_1', name: 'chargeCard', errorText: 'User rejected' }
```

The adapter does not execute or sandbox tools. It only preserves enough ids,
names, inputs, outputs, and error text for `useChat` and renderers to show a
stable timeline. For durable human approval, reviewer audit trails, idempotent
execution, and safe renderer contracts, use the
[tool approval recipe](/guide/tool-approvals).

## Data part names

Progress and non-throwing agent error data use safe defaults:

```ts
readAgentEventStream({
  events,
  progressDataType: 'data-agent-progress',
  errorDataType: 'data-agent-error'
})
```

Override those names if your application already has a data-part taxonomy:

```ts
readAgentEventStream({
  events,
  progressDataType: 'data-workflow-progress',
  errorDataType: 'data-workflow-error'
})
```

Use `transient: true` on progress or error events when the UI should receive
`onData` without storing the part in the message timeline.

## Production notes

- Keep provider keys and privileged tool credentials on the server.
- Treat `AgentEvent` as a browser-safe projection, not as a raw backend trace.
- Store full traces, approvals, retries, and tenant data in your app backend.
- Prefer stable `id` values for progress, source, file, and tool events so UI
  parts can replace older entries instead of growing unbounded timelines.
- Keep this adapter at the boundary. Use LangChain, LangGraph, or your own
  service for planning and retrieval if your product needs an agent framework.
