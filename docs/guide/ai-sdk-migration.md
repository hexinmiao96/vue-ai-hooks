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

| AI SDK UI concept                                | vue-ai-hooks equivalent                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `useChat()`                                      | `useChat()`                                                             |
| `transport`                                      | `transport` or `provider`                                               |
| `DefaultChatTransport`                           | Omit `provider` and use `api`, `baseURL`, `headers`, `body`             |
| `messages` initial option                        | `messages` or `initialMessages`                                         |
| `convertToModelMessages()`                       | `convertToModelMessages()` for stripping UI-only message fields         |
| Input state managed by app                       | `input`, `setInput()`, `handleInputChange()` are included               |
| `sendMessage()`                                  | `sendMessage()`                                                         |
| `stop()`                                         | `stop()`                                                                |
| `resumeStream()`                                 | `resumeStream()` with a provider that supports `resumeChat`             |
| `addToolOutput()` / deprecated `addToolResult()` | `addToolOutput()` or `addToolResult({ toolCallId, output })`            |
| `addToolApprovalResponse()`                      | `addToolApprovalResponse()`, `approveToolCall()`, `rejectToolCall()`    |
| `tool()` / `dynamicTool()`                       | `tool()`, `dynamicTool()`, and `jsonSchema()` with `useChat({ tools })` |
| `stopWhen`                                       | `stopWhen`                                                              |
| `experimental_throttle`                          | `experimental_throttle` or preferred `throttleMs`                       |
| Custom stream data                               | `data`, `streamData`, `setData()`, `onData`, and `ChatChunk.data`       |
| `experimental_useObject()`                       | `experimental_useObject()` alias or preferred `useObject()`             |
| AI SDK Core image generation                     | `useImage()` calling your app-owned `/api/image` route                  |
| AI SDK Core speech generation                    | `useSpeech()` calling your app-owned `/api/speech` route                |
| AI SDK Core transcription                        | `useTranscription()` calling your app-owned `/api/transcription` route  |
| AI SDK Core reranking                            | `useRerank()` calling your app-owned `/api/rerank` route                |
| UI message stream protocol                       | Supported by `proxyProvider` / default proxy transport                  |

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

When a backend route or provider call needs model-facing history instead of UI
rendering state, use `convertToModelMessages(messages)`. It removes `parts`,
`id`, and `createdAt` by default, while preserving content and tool call fields:

```ts
import { convertToModelMessages } from 'vue-ai-hooks'

const modelMessages = convertToModelMessages(chat.messages.value)
```

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

AI SDK-style tool definitions can keep `execute` next to the schema:

```ts
const chat = useChat({
  api: '/api/chat',
  tools: {
    chargeCard: tool({
      description: 'Charge a saved card',
      inputSchema: jsonSchema({
        type: 'object',
        required: ['amount'],
        properties: { amount: { type: 'number' } }
      }),
      async execute(args) {
        return await billing.charge(args)
      }
    })
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

## Structured objects

AI SDK names its structured output hook `experimental_useObject()`. This
library exports the same name as a compatibility alias, so existing migrations
can keep that import while new Vue code can use the shorter `useObject()` name:

```ts
import { experimental_useObject as useObject } from 'vue-ai-hooks'
```

For Vue object forms, `useObject()` also exposes `input`, `setInput()`,
`handleInputChange()`, and `handleSubmit()`. `handleSubmit()` clears `input`
after a successful structured response and keeps it when the provider or parser
fails.

## Request inspection

AI SDK migrations often need request visibility while changing transports. Use
the built-in trace refs:

```ts
const { lastRequest, lastResponse, clearTrace } = useChat({ api: '/api/chat' })
```

The same trace refs are available on `useCompletion()` and `useObject()`. They
show the final provider/proxy request after defaults, per-call options, proxy
`api`, credentials, body, headers, and retry attempt values are resolved.
`prepareSendMessagesRequest`, `prepareStep`, and
`prepareReconnectToStreamRequest` receive the same `api` and `credentials`
fields for default chat proxy transports.

## Migration checklist

1. Replace imports from AI SDK UI with `vue-ai-hooks`.
2. Map `DefaultChatTransport` options to `api`, `baseURL`, `headers`, `body`,
   `credentials`, and `fetch`.
3. Map completion `streamProtocol: 'text'` when your existing route returns a
   plain text stream.
4. Keep `experimental_useObject` imports as-is or rename them to `useObject`
   after the migration.
5. Let `useObject` proxy routes return `text/plain` JSON streams when you are
   porting an existing AI SDK object endpoint.
6. Map image generation calls to `useImage({ api: '/api/image' })` and keep
   image model credentials server-side.
7. Map speech generation calls to `useSpeech({ api: '/api/speech' })` and keep
   text-to-speech credentials server-side.
8. Map transcription calls to `useTranscription({ api: '/api/transcription' })`
   and keep transcription credentials server-side.
9. Map reranking calls to `useRerank({ api: '/api/rerank' })` and keep rerank
   model credentials server-side.
10. Keep existing initial messages by passing `messages` or `initialMessages`.
11. Replace model-specific direct calls with `openai`, `deepseek`, `openrouter`,
    `gemini`, `anthropic`, or `openaiCompatible`.
12. Move custom data state to `data` / `setData()` when your UI needs AI SDK-style names.
13. Move AI SDK `tool()` definitions directly into `useChat({ tools })`, or keep
    existing wire-format `Tool[]` plus `toolHandlers`.
14. Move tool result code to `addToolOutput()`, `addToolResult({ toolCallId, output })`, or
    `addToolApprovalResponse()`.
15. Add `lastRequest` and `lastResponse` to your debug view before swapping
    production traffic.
16. Run `pnpm release:check` or your app's equivalent gate before shipping.
