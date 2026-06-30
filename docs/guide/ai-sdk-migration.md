# AI SDK migration

This guide is for teams that know Vercel AI SDK UI APIs and want a smaller
Vue-first composable surface. Use it alongside the
[AI SDK `useChat` reference](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
when porting code.

## Mental model

`vue-ai-hooks` keeps the same high-level pieces familiar from AI SDK UI:

- A chat transport/provider.
- Reactive messages and status.
- Message submission helpers.
- Tool result and approval helpers.
- Stream data and metadata.
- Resume support for backend-owned streams.

The main difference is packaging: this library keeps those ideas inside Vue
refs and provider objects instead of a full-stack framework integration layer.

## Quick mapping

| AI SDK UI concept                                | vue-ai-hooks equivalent                                              |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `useChat()`                                      | `useChat()`                                                          |
| `transport`                                      | `transport` or `provider`                                            |
| `DefaultChatTransport`                           | Omit `provider` and use `api`, `baseURL`, `headers`, `body`          |
| `messages` initial option                        | `messages` or `initialMessages`                                      |
| Input state managed by app                       | `input`, `setInput()`, `handleInputChange()` are included            |
| `sendMessage()`                                  | `sendMessage()`                                                      |
| `stop()`                                         | `stop()`                                                             |
| `resumeStream()`                                 | `resumeStream()` with a provider that supports `resumeChat`          |
| `addToolOutput()` / deprecated `addToolResult()` | `addToolOutput()` or `addToolResult({ toolCallId, output })`         |
| `addToolApprovalResponse()`                      | `addToolApprovalResponse()`, `approveToolCall()`, `rejectToolCall()` |
| `stopWhen`                                       | `stopWhen`                                                           |
| `experimental_throttle`                          | `experimental_throttle` or preferred `throttleMs`                    |
| Custom stream data                               | `streamData`, `onData`, and `ChatChunk.data`                         |
| UI message stream protocol                       | Supported by `proxyProvider` / default proxy transport               |

## Transport

AI SDK examples often construct a `DefaultChatTransport`. In `vue-ai-hooks`, the
default path is already a proxy transport:

```ts
import { useChat } from 'vue-ai-hooks'

const chat = useChat({
  api: '/api/chat',
  credentials: 'include',
  headers: () => ({ Authorization: `Bearer ${sessionToken}` }),
  body: () => ({ tenantId })
})
```

Use `provider` or `transport` when you want a direct model adapter:

```ts
const chat = useChat({
  transport: deepseek({
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
    timeoutMs: 30_000
  })
})
```

`transport` is accepted as an AI SDK-style alias. New code can use either
`provider` or `transport`; prefer one naming style in a codebase.

## Input handling

AI SDK v5 expects the application to manage input state. `vue-ai-hooks` keeps
input helpers in the composable for Vue ergonomics:

```vue
<script setup lang="ts">
import { useChat } from 'vue-ai-hooks'

const { input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat'
})
</script>

<template>
  <form @submit="handleSubmit">
    <textarea :value="input" @input="handleInputChange" />
    <button :disabled="isLoading">Send</button>
  </form>
</template>
```

If you already own input state, call `sendMessage()`:

```ts
await chat.sendMessage(draft.value, {
  metadata: { source: 'composer' }
})
```

## Messages

Use `messages` as an AI SDK-style alias for initial chat history:

```ts
useChat({
  id: 'support-thread',
  messages: restoredMessages
})
```

`initialMessages` is also supported and wins when both are provided. The returned
`messages` ref remains the source of truth for rendering.

## Tools

Local tool handlers are passed through `toolHandlers`:

```ts
const chat = useChat({
  api: '/api/chat',
  tools: [chargeCardTool],
  toolHandlers: {
    async chargeCard(args) {
      return await billing.charge(args)
    }
  }
})
```

For user approval flows, keep handlers out of the config and respond manually:

```ts
await chat.addToolApprovalResponse({
  id: pendingToolCall.id,
  approved: true
})
```

`approveToolCall()` and `rejectToolCall()` are Vue-friendly wrappers around the
same flow.

## Multi-step loops

Use `stopWhen`, `sendAutomaticallyWhen`, and `prepareStep` to control automatic
tool loops:

```ts
const chat = useChat({
  api: '/api/chat',
  stopWhen: isStepCount(4),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  prepareStep({ stepNumber, request }) {
    return {
      body: {
        ...request.body,
        stepNumber
      }
    }
  }
})
```

## Stream data and UI message streams

If your backend already emits AI SDK UI message stream parts, the default proxy
transport can consume them. Text deltas update the assistant message, finish
parts update finish/usage state, and data/source/file/tool-output parts are
available through `streamData` and `Message.parts`.

For app-specific data, type the stream data generic:

```ts
const { streamData } = useChat<{ progress: number; label?: string }>({
  api: '/api/chat'
})
```

## Request inspection

AI SDK migrations often need request visibility while changing transports. Use
the built-in trace refs:

```ts
const { lastRequest, lastResponse, clearTrace } = useChat({ api: '/api/chat' })
```

These refs show the final provider/proxy request after defaults, per-call
options, body, headers, and retry attempt values are resolved.

## Migration checklist

1. Replace imports from AI SDK UI with `vue-ai-hooks`.
2. Map `DefaultChatTransport` options to `api`, `baseURL`, `headers`, `body`,
   `credentials`, and `fetch`.
3. Keep existing initial messages by passing `messages` or `initialMessages`.
4. Replace model-specific direct calls with `openai`, `deepseek`, `openrouter`,
   `gemini`, `anthropic`, or `openaiCompatible`.
5. Move tool result code to `addToolOutput()`, `addToolResult({ toolCallId, output })`, or
   `addToolApprovalResponse()`.
6. Add `lastRequest` and `lastResponse` to your debug view before swapping
   production traffic.
7. Run `pnpm release:check` or your app's equivalent gate before shipping.
