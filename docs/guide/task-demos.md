---
title: Task-oriented demos
description: Choose the right vue-ai-hooks demo by product task before reading the API reference.
---

# Task-oriented demos

Use this guide when you know the product task but do not yet know which example,
route, or composable to open first. Start with the no-key path, confirm the UI
contract, then replace the local route with your app-owned backend.

## Choose by task

| Product task                    | Run first                                       | Read next                                                         | Verify before real providers                              |
| ------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| Vue chat with tool approval     | `pnpm example:chat`                             | `examples/chat/App.vue`                                           | Click **Run approval demo**, approve or reject the tool.  |
| React chat quickstart           | `pnpm example:react-chat`                       | `examples/react-chat/App.tsx` and [React hooks](/reference/react) | Send one prompt, call `stop()`, then inspect trace state. |
| Own `/api/chat` proxy           | `pnpm example:proxy-server` plus proxy chat env | [Proxy recipes](/guide/proxy-recipes)                             | Confirm stream chunks arrive without browser keys.        |
| AI SDK UI stream migration      | POST to `/api/ui-message-stream`                | [AI SDK migration](/guide/ai-sdk-migration)                       | Decode parts with `readUIMessageStream()`.                |
| Production deployment readiness | Run the local proxy and docs build checks       | [Production checklist](/guide/production-checklist)               | Pass the checklist before putting provider keys in prod.  |

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

## AI SDK UI stream migration

Use this when your backend already emits AI SDK UI message stream parts:

```bash
pnpm example:proxy-server
```

POST to `/api/ui-message-stream`, then consume the stream with
`readUIMessageStream()` or the default proxy chat transport. Keep the migration
small: first prove that text, tool-call, and data parts decode correctly, then
move one production route at a time.

## Done criteria

- The no-key demo runs locally.
- The proxy route runs locally without browser provider keys.
- `lastRequest`, `lastResponse`, and `inspectRequestTrace()` show enough state
  for support triage.
- The real upstream path is configured only on the server.
- You have passed the [Production checklist](/guide/production-checklist).
