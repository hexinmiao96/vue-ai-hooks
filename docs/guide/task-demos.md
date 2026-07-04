---
title: Task-oriented demos
description: Choose the right vue-ai-hooks demo by product task before reading the API reference.
---

# Task-oriented demos

Use this guide when you know the product task but do not yet know which example,
route, or composable to open first. Start with the no-key path, confirm the UI
contract, then replace the local route with your app-owned backend.

## Choose by task

| Product task                    | Run first                                                        | Read next                                                                                                                           | Verify before real providers                                                               |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Vue chat with tool approval     | `pnpm example:chat`                                              | `examples/chat/App.vue` and [Tool approvals](/guide/tool-approvals)                                                                 | Click **Run approval demo**, approve or reject the tool.                                   |
| React chat quickstart           | `pnpm example:react-chat`                                        | `examples/react-chat/App.tsx` and [React hooks](/reference/react)                                                                   | Send one prompt, call `stop()`, then inspect trace state.                                  |
| Vue completion quickstart       | `pnpm example:completion`                                        | `examples/completion/App.vue` and [useCompletion](/reference/use-completion)                                                        | Run one completion and verify `status`, `inspect()`, and request/response trace.           |
| Vue embedding quickstart        | `pnpm example:embedding`                                         | `examples/embedding/App.vue` and [useEmbedding](/reference/use-embedding)                                                           | Run one embedding request and verify `status`, `inspect()`, and request/response trace.    |
| React completion quickstart     | `pnpm example:react-completion`                                  | `examples/react-completion/App.tsx` and [React hooks](/reference/react)                                                             | Run one completion and check request trace, then rerun with `VITE_EXAMPLE_PROVIDER=proxy`. |
| React object quickstart         | `pnpm example:react-object`                                      | `examples/react-object/App.tsx` and [React hooks](/reference/react)                                                                 | Run a JSON schema extraction and verify object + trace output.                             |
| Vue object quickstart           | `pnpm example:object`                                            | `examples/object/App.vue` and [useObject](/reference/use-object)                                                                    | Run one structured extraction and verify `object`, `status`, and inspection trace output.  |
| React image quickstart          | `pnpm example:react-image`                                       | `examples/react-image/App.tsx` and [React hooks](/reference/react)                                                                  | Generate and edit an image, then inspect request trace and response JSON.                  |
| React video quickstart          | `pnpm example:react-video`                                       | `examples/react-video/App.tsx` and [React hooks](/reference/react)                                                                  | Generate a storyboard, then inspect request trace and response JSON.                       |
| Thread sidebar persistence      | `pnpm example:threaded-chat`                                     | `examples/threaded-chat/App.vue` and [useChatThreads](/reference/use-chat-threads)                                                  | Create, rename, archive, restore, and reopen a thread.                                     |
| Thread task starters            | `pnpm example:threaded-chat`                                     | `examples/threaded-chat/ThreadChatPanel.vue` and [usePromptSuggestions](/reference/use-prompt-suggestions)                          | Start with reusable thread prompts, then verify trace state before send.                   |
| IndexedDB local persistence     | Your bootstrap hydration logic                                   | [Server storage](/guide/server-storage) and the section `IndexedDB local durability (async)`                                        | Restore from IndexedDB, save on finish actions, refresh, and verify no data loss.          |
| Server-side chat history        | Your app backend and database                                    | [Server storage](/guide/server-storage)                                                                                             | Restore index and messages, send, reload, and verify.                                      |
| Regenerate or branch history    | Your stored thread plus `/api/chat`                              | [Regenerate branches](/guide/regenerate-branches)                                                                                   | Regenerate without overwriting the original answer.                                        |
| Own `/api/chat` proxy           | `pnpm example:proxy-server` plus proxy chat env                  | [Proxy recipes](/guide/proxy-recipes)                                                                                               | Confirm stream chunks and `inspectRequestTrace()` metadata on `/api/chat`.                 |
| Headless agent run approval     | `pnpm example:agent-run`                                         | `examples/agent-run/App.vue` and [useAgentRun](/reference/use-agent-run)                                                            | Pause on `approvePlan`, resume with the same run id, then inspect the event timeline.      |
| Agent backend bridge            | LangChain, LangGraph, or custom backend agent                    | [Agent bridge](/guide/agent-bridge), [Agent route templates](/guide/agent-route-templates), and [Agent events](/guide/agent-events) | Convert safe events to `ChatChunk` or UI stream parts.                                     |
| AI SDK UI stream migration      | `pnpm example:proxy-server` and `pnpm example:ui-message-stream` | [AI SDK migration](/guide/ai-sdk-migration)                                                                                         | Decode parts with `readUIMessageStream()`.                                                 |
| Production deployment readiness | Run the local proxy and docs build checks                        | [Production checklist](/guide/production-checklist)                                                                                 | Pass the checklist before putting provider keys in prod.                                   |

## Vue chat with tool approval

```bash
pnpm install
pnpm example:chat
```

Open the Vite URL and click **Run approval demo**. The example uses the
`local-tools` provider when no real provider is selected. It streams an
assistant reply, pauses on a `chargeCard` tool call, then continues after
`approveToolCall()` or `rejectToolCall()`.

For a release smoke check without opening the browser, build the package and
run the tool approval verifier:

```bash
pnpm build
pnpm tool-approval:check
```

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

To validate the same `/api/chat` bridge as Vue, run:

```bash
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-chat
```

This keeps provider keys on the server while the same trace fields are emitted.

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

## React completion quickstart

Run no-key completion:

```bash
pnpm example:react-completion
```

Open the Vite URL and send a completion request or click a sample prompt. This
demo uses a deterministic local completion stream so you can verify the same
`useCompletion` request lifecycle, `status`, `inspect()`, and request/response trace
rendering that a proxy-backed route will surface.

To validate with the app-owned backend route, run:

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-completion
```

The React completion example sends provider requests to `/api/completion` when the
proxy path is enabled.

## Vue completion quickstart

Run no-key completion:

```bash
pnpm example:completion
```

Open the Vite URL and send a completion request. The Vue example uses a local
`local-openai`-style provider until you set a real provider, so you can verify
`useCompletion` lifecycle and inspection panels before wiring keys.

To validate with your app-owned backend route, run:

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:completion
```

The Vue completion example sends provider requests to `/api/completion` in proxy mode.

## Vue embedding quickstart

Run no-key embedding:

```bash
pnpm example:embedding
```

Open the Vite URL and run one embedding batch. The page uses a local provider by
default, which renders vector output and pairwise cosine similarity while keeping the
same request and trace controls as other demos.

To validate with your app-owned backend route, run:

```bash
VITE_EXAMPLE_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:embedding
```

The Vue embedding example sends provider requests to `/api/embedding` in proxy mode.

## React structured output quickstart

Run no-key structured output extraction:

```bash
pnpm example:react-object
```

Open the Vite URL and submit a support prompt. The UI shows parsed `object`
fields and stream text so you can verify schema extraction before wiring real data.

To validate against the app-owned backend route, run:

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-object
```

The React object example sends provider requests to `/api/object` in proxy mode.

## Vue object quickstart

Run no-key structured extraction:

```bash
pnpm example:object
```

Open the Vite URL and submit a support prompt. The page now renders the parsed
object fields plus raw stream text and `inspect()` output, so you can confirm
schema parsing and trace shape before switching to a proxy-backed route.

To validate the app-owned backend route, run:

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:object
```

The Vue object example sends provider requests to `/api/object` in proxy mode.

## React image quickstart

Run no-key image generation and editing:

```bash
pnpm example:react-image
```

Open the Vite URL and choose Generate or Edit mode. Generate mode returns a local deterministic SVG-style image.
Edit mode sends both source image and mask fields and shows edited output.
The starter grid comes from `createPromptSuggestionRecipes({ surfaces: ['media'] })`
and `usePromptSuggestions`, so the same media prompt starters work before you
wire a real provider route.

To validate the app-owned `/api/image` route, run:

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-image
```

The React image example sends `/api/image` requests when proxy mode is enabled.

## React video quickstart

Run no-key video generation:

```bash
pnpm example:react-video
```

Open the Vite URL and submit a prompt or click a sample. The demo returns a
deterministic storyboard preview and renders request trace state for `useVideo`.
Its starter grid also uses `createPromptSuggestionRecipes({ surfaces: ['media'] })`
with `usePromptSuggestions`, keeping image and video prompt bootstrapping aligned.

To validate the app-owned `/api/video` route, run:

```bash
VITE_EXAMPLE_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:react-video
```

The React video example sends `/api/video` requests when proxy mode is enabled.

## Own `/api/chat` proxy

Run the deterministic proxy before connecting a real upstream:

```bash
pnpm example:proxy-server
# in another terminal
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

Use `proxy-route` when you want the browser-side call to hit `/api/chat` directly
through the default proxy transport. This keeps the no-key contract identical to
your production route shape and makes `inspectRequestTrace()` show the proxy route
metadata directly.

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

Verify create, rename, archive, restore, delete, and the smoke check before
adding a server storage adapter. The runnable demo uses a deterministic
`DirectChatTransport`, `useChatThreads()` for the sidebar index, and one keyed
`useChat({ persist })` instance per active thread. It also renders
`persistenceError` when the thread index cannot load, save, or clear from
storage. See
[useChatThreads](/reference/use-chat-threads).

## Thread task starters

Run the same threaded chat demo and use built-in starter chips to bootstrap the
first prompt in a durable thread:

```bash
pnpm example:threaded-chat
```

In `examples/threaded-chat/ThreadChatPanel.vue`, the starter prompts come from
`createPromptSuggestionRecipes({ surfaces: ['thread'] })` and flow through
`usePromptSuggestions` with thread `messages` context, so the chip set uses
shared task-starter recipes while still filtering with message context and
current input. Clicking a chip updates `input` (without auto-sending), then you
can refine and submit.

The same trace panel still reports request state and now also reflects timeline
depth for thread turns. It also prints a full inspection payload (`inspect()`) and
quick request/response JSON snapshots so a teammate can validate trace shape before wiring a real `/api/chat` backend.

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

See [IndexedDB local durability (async)](/guide/server-storage#indexeddb-local-durability-adapter-async).

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
pnpm example:ui-message-stream
```

The demo starts `/api/ui-message-stream` with a `messages` payload, then streams and decodes
the response with `readUIMessageStream()`. Keep migration small: first prove that text,
tool-call, and data parts decode correctly, then move one production route at a time.

For a release smoke check without opening the browser, build the package and run
the decoded-route verifier:

```bash
pnpm build
pnpm ui-message-stream:check
```

## Headless agent run approval

Run the browser demo before wiring a real backend agent:

```bash
pnpm example:agent-run
```

Open the Vite URL, start the run, click **Replay same id**, then approve or
reject the `approvePlan` interrupt. The demo uses a deterministic local
`AgentEvent` stream, so you can verify `useAgentRun()` state, same-`runId`
replay safety, `resume()`, `inspect()`, and `clearTrace()` without provider keys.
The prompt starters use
`createPromptSuggestionRecipes({ surfaces: ['agent', 'tool-approval'] })`, so
agent planning and privileged-tool approval prompts share the same starter recipe
surface as the rest of the docs.

For a release smoke check without opening the browser, build the package and run
the verifier:

```bash
pnpm build
pnpm agent-run:check
```

## Agent backend bridge

Use this when LangChain, LangGraph, or your own backend agent emits progress,
tool approval, tool result, source, file, or final usage events. Keep planning,
retrieval, memory, checkpoints, and privileged tools on the server, then expose
only browser-safe `AgentEvent` values:

```ts
import { readAgentEventStream } from 'vue-ai-hooks'

yield * readAgentEventStream({ events: runAgent(messages), signal })
```

For a release smoke check without opening the browser, build the package and run
the bridge verifier:

```bash
pnpm build
pnpm agent-bridge:check
pnpm agent-route-templates:check
```

If the route should speak AI SDK UI message stream instead, convert events with
`agentEventToUIMessageStreamPart()` and return them through
`createUIMessageStreamResponse()`. See [Agent bridge](/guide/agent-bridge) for
LangChain/LangGraph projection boundaries,
[Agent route templates](/guide/agent-route-templates) for copyable Nuxt/Nitro,
Next.js, Hono, Express, Fastify, and Fetch route shapes, and [Agent events](/guide/agent-events)
for the low-level adapter.

## Done criteria

- The no-key demo runs locally.
- The proxy route runs locally without browser provider keys.
- `lastRequest`, `lastResponse`, and `inspectRequestTrace()` show enough state
  for support triage.
- The real upstream path is configured only on the server.
- You have passed the [Production checklist](/guide/production-checklist).
