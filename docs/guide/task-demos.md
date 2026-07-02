---
title: Task-oriented demos
description: Choose the right vue-ai-hooks demo by product task before reading the API reference.
---

# Task-oriented demos

Use this guide when you know the product task but do not yet know which example,
route, or composable to open first. Start with the no-key path, confirm the UI
contract, then replace the local route with your app-owned backend.

## Choose by task

| Product task                    | Run first                                       | Read next                                                                          | Verify before real providers                              |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Vue chat with tool approval     | `pnpm example:chat`                             | `examples/chat/App.vue` and [Tool approvals](/guide/tool-approvals)                | Click **Run approval demo**, approve or reject the tool.  |
| React chat quickstart           | `pnpm example:react-chat`                       | `examples/react-chat/App.tsx` and [React hooks](/reference/react)                  | Send one prompt, call `stop()`, then inspect trace state. |
| Thread sidebar persistence      | `pnpm example:threaded-chat`                    | `examples/threaded-chat/App.vue` and [useChatThreads](/reference/use-chat-threads) | Create, rename, archive, restore, and reopen a thread.    |
| IndexedDB local persistence    | Your bootstrap hydration logic                    | [Server storage](/guide/server-storage) and the section `IndexedDB local durability (async)` | Restore from IndexedDB, save on finish actions, refresh, and verify no data loss. |
| Server-side chat history        | Your app backend and database                   | [Server storage](/guide/server-storage)                                            | Restore index and messages, send, reload, and verify.     |
| Regenerate or branch history    | Your stored thread plus `/api/chat`             | [Regenerate branches](/guide/regenerate-branches)                                  | Regenerate without overwriting the original answer.       |
| Own `/api/chat` proxy           | `pnpm example:proxy-server` plus proxy chat env | [Proxy recipes](/guide/proxy-recipes)                                              | Confirm stream chunks arrive without browser keys.        |
| Agent backend bridge            | LangChain, LangGraph, or custom backend agent   | [Agent bridge](/guide/agent-bridge) and [Agent events](/guide/agent-events)        | Convert safe events to `ChatChunk` or UI stream parts.    |
| AI SDK UI stream migration      | POST to `/api/ui-message-stream`                | [AI SDK migration](/guide/ai-sdk-migration)                                        | Decode parts with `readUIMessageStream()`.                |
| Production deployment readiness | Run the local proxy and docs build checks       | [Production checklist](/guide/production-checklist)                                | Pass the checklist before putting provider keys in prod.  |

## Vue chat with tool approval

```bash
pnpm install
pnpm example:chat
```

Open the Vite URL and click **Run approval demo**. The example uses the
`local-tools` provider when no real provider is selected. It streams an
assistant reply, pauses on a `chargeCard` tool call, then continues after
`approveToolCall()` or `rejectToolCall()`.

Use this as the first product demo when you need message history, structured
`Message.parts`, approval-gated tools, abort controls, and request inspection in
one place.

Before using the pattern for privileged tools, add a backend approval record,
idempotent `runId`, reviewer audit trail, and a narrow renderer contract. See
[Tool approvals](/guide/tool-approvals).

## React chat quickstart

Run the React quickstart without provider keys:

```bash
pnpm example:react-chat
```

Open the Vite URL and send a prompt. The demo uses `DirectChatTransport` with a
deterministic `react-local` stream, so you can verify React state, abort
controls, stream data, and request trace rendering before adding provider keys.

The source lives in `examples/react-chat/App.tsx`. The React entry is a
migration surface. It does not replace the Vue-first positioning, but it lets
React consumers reuse the same provider and proxy contracts:

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

Use the same `/api/chat` route you use for Vue. Keep provider keys on the server.

## Own `/api/chat` proxy

Run the deterministic proxy before connecting a real upstream:

```bash
pnpm example:proxy-server
# in another terminal
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

When that works, connect the template to an OpenAI-compatible upstream:

```bash
PROXY_UPSTREAM_BASE_URL=https://api.openai.com/v1 \
PROXY_UPSTREAM_API_KEY=$OPENAI_API_KEY \
PROXY_UPSTREAM_MODEL=gpt-4.1-mini \
pnpm example:proxy-server
```

The browser still talks to your app-owned proxy URL. The Node process adds the
provider key and normalizes the response back to the browser contract.

## Thread sidebar persistence

Use this when the product needs saved conversations, a sidebar, archive flows,
or a current thread indicator. Keep the thread index separate from message
bodies:

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

Verify create, rename, archive, restore, and delete before adding a server
storage adapter. The runnable demo uses a deterministic `DirectChatTransport`,
`useChatThreads()` for the sidebar index, and one keyed `useChat({ persist })`
instance per active thread. See [useChatThreads](/reference/use-chat-threads).

## IndexedDB local persistence

If backend rollout is not ready yet, use IndexedDB for durable local recovery and
then switch to server storage later. `persist` stays localStorage-only, so run an
explicit async hydration and save layer:

1. On app load, read thread index and messages from IndexedDB.
2. Pass restored data as `initialThreads`, `initialActiveThreadId`, and
   `initialMessages`.
3. On `onFinish`, thread rename, archive, restore, and delete, write snapshot rows
   back to IndexedDB.

This keeps your first production candidate testable without a database while still
preparing the same thread/message shape used by the server-storage recipe.

See [IndexedDB local durability (async)](/guide/server-storage#indexeddb-local-durability-async).

## Server-side chat history

Use this when conversations must survive device changes, team handoff, audit
retention, or admin access. Keep the thread index and message bodies in separate
backend records, then hydrate both before mounting chat:

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

Verify load, send, save, reload, rename, archive, and delete with tenant-scoped
auth before connecting a real provider. See [Server storage](/guide/server-storage).

## Regenerate or branch history

Use this after server storage is in place and users need to retry an assistant
turn, compare another answer, or branch from a message. Keep the old assistant
message immutable, create a `runId` for each provider attempt, and store the new
answer on the selected `branchId`:

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

Verify branch restore, idempotent regenerate, and safe request inspection before
enabling the UI. See [Regenerate branches](/guide/regenerate-branches).

## AI SDK UI stream migration

Use this when your backend already emits AI SDK UI message stream parts:

```bash
pnpm example:proxy-server
```

POST to `/api/ui-message-stream`, then consume the stream with
`readUIMessageStream()` or the default proxy chat transport. Keep the migration
small: first prove that text, tool-call, and data parts decode correctly, then
move one production route at a time.

## Agent backend bridge

Use this when LangChain, LangGraph, or your own backend agent emits progress,
tool approval, tool result, source, file, or final usage events. Keep planning,
retrieval, memory, checkpoints, and privileged tools on the server, then expose
only browser-safe `AgentEvent` values:

```ts
import { readAgentEventStream } from 'vue-ai-hooks'

yield * readAgentEventStream({ events: runAgent(messages), signal })
```

If the route should speak AI SDK UI message stream instead, convert events with
`agentEventToUIMessageStreamPart()` and return them through
`createUIMessageStreamResponse()`. See [Agent bridge](/guide/agent-bridge) for
LangChain/LangGraph projection boundaries and [Agent events](/guide/agent-events)
for the low-level adapter.

## Done criteria

- The no-key demo runs locally.
- The proxy route runs locally without browser provider keys.
- `lastRequest`, `lastResponse`, and `inspectRequestTrace()` show enough state
  for support triage.
- The real upstream path is configured only on the server.
- You have passed the [Production checklist](/guide/production-checklist).
