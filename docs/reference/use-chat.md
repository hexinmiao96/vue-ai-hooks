# useChat

The core composable for streaming chat completions.

Public TypeScript types: `UseChatOptions`, `UseChatReturn`,
`AppendChatOptions`, `AddToolOutputOptions`, `ToolApprovalResponse`,
`ChatFinishInfo`, `ChatStatus`, `RegenerateChatOptions`, `ResumeChatOptions`,
`PrepareSendMessagesRequest`, `PrepareSendMessagesRequestOptions`,
`PrepareReconnectToStreamRequest`, `PrepareReconnectToStreamRequestOptions`,
`SendChatTrigger`, `SetMessagesInput`, `PruneMessagesOptions`,
`PruneToolCallsStrategy`, `PruneToolCallsRule`, `PruneToolCallsOption`,
`ChatPersistOptions`, `SerializedMessage`,
`StreamDataPart`, `IdGenerator`, `ChatAttachmentInput`, `ChatAttachmentsInput`,
`MessagePart`, `MessageTextPart`, `MessageReasoningPart`, `MessageSourcePart`,
`MessageFilePart`, `MessageDataPart`, `MessageToolPart`, `ToolApprovalPredicate`,
`ToolCallHandler`, `ToolCallHandlerContext`, `ToolResultHandlerContext`,
`SendAutomaticallyWhen`, `SendAutomaticallyWhenOptions`, `RetryOptions`, and
`RetryContext`.

Public helpers: `pruneMessages`, `serializeMessages`, `deserializeMessages`,
and `lastAssistantMessageIsCompleteWithToolCalls`.

## Usage

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, handleSubmit, isLoading, stop } = useChat({
  provider: openai({ apiKey: '...' })
})
```

Use `input` with a Vue form for the common composer flow:

```vue
<template>
  <form @submit="handleSubmit">
    <textarea v-model="input" />
    <button :disabled="isLoading || !input.trim()">Send</button>
    <button type="button" :disabled="!isLoading" @click="stop">Stop</button>
  </form>
</template>
```

## Options

| Name                              | Type                                                                   | Default    | Description                                                            |
| --------------------------------- | ---------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `provider`                        | `ChatProvider`                                                         | required   | The provider to use.                                                   |
| `id`                              | `string`                                                               | generated  | Stable chat id sent with provider requests.                            |
| `generateId`                      | `IdGenerator`                                                          | `createId` | Override automatic chat, message, tool, and stream data id generation. |
| `initialMessages`                 | `Message[]`                                                            | `[]`       | Seed the message history.                                              |
| `messages`                        | `Message[]`                                                            | `[]`       | AI SDK-style alias for `initialMessages`; `initialMessages` wins.      |
| `initialInput`                    | `string`                                                               | `''`       | Seed the composer input for the first instance of an id.               |
| `defaultRequest`                  | `Partial<ChatRequest>`                                                 | `{}`       | Default options merged into every chat request.                        |
| `resume`                          | `boolean`                                                              | `false`    | Automatically try `resumeStream()` when the composable is created.     |
| `prepareSendMessagesRequest`      | `PrepareSendMessagesRequest`                                           | —          | Customize the final provider request before send/regenerate calls.     |
| `prepareReconnectToStreamRequest` | `PrepareReconnectToStreamRequest`                                      | —          | Customize the final resume request before `resumeStream()` reconnects. |
| `tools`                           | `Tool[]`                                                               | —          | Default tool list. Override per-call by passing `tools` to `append()`. |
| `toolChoice`                      | `'auto' \| 'none' \| 'required' \| { ... }`                            | —          | Default tool choice.                                                   |
| `toolHandlers`                    | `Record<string, ToolCallHandler>`                                      | —          | Local handlers for automatic tool execution.                           |
| `requiresToolApproval`            | `ToolApprovalPredicate`                                                | —          | Return true to pause a tool call for UI approval before execution.     |
| `sendAutomaticallyWhen`           | `SendAutomaticallyWhen \| false`                                       | helper     | Decide whether completed tool results should trigger the next request. |
| `maxToolRoundtrips`               | `number`                                                               | `1`        | Maximum automatic tool-call rounds after a user message.               |
| `persist`                         | `ChatPersistOptions`                                                   | —          | Auto-save Date-safe messages to localStorage or a custom `Storage`.    |
| `maxRetries`                      | `number`                                                               | `0`        | Retry attempts for failures before the first stream chunk.             |
| `retryDelayMs`                    | `number \| (context: RetryContext) => number`                          | `0`        | Delay before each retry.                                               |
| `shouldRetry`                     | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | —          | Override the default retryable error decision.                         |
| `onRetry`                         | `(error: Error, context: RetryContext) => void`                        | —          | Called before a retry attempt waits and re-runs.                       |
| `throttleMs`                      | `number`                                                               | —          | Minimum wait in ms between reactive message and `streamData` updates.  |
| `experimental_throttle`           | `number`                                                               | —          | AI SDK-compatible alias. Prefer `throttleMs` in new code.              |
| `onChunk`                         | `(chunk: ChatChunk, assistant: Message) => void`                       | —          | Called after each raw chat chunk is applied to the assistant message.  |
| `onData`                          | `(part: StreamDataPart) => void`                                       | —          | Called for custom stream data parts, including transient parts.        |
| `onToolCall`                      | `(args: unknown, context: ToolCallHandlerContext) => void`             | —          | Called before a registered local tool handler runs.                    |
| `onToolResult`                    | `(result: unknown, context: ToolResultHandlerContext) => void`         | —          | Called after a local tool handler returns a `tool` message.            |
| `onUpdate`                        | `(m: Message) => void`                                                 | —          | Called for every streamed chunk update.                                |
| `onFinish`                        | `(m: Message, info: ChatFinishInfo) => void`                           | —          | Called once the assistant message is finished.                         |
| `onError`                         | `(e: Error) => void`                                                   | —          | Called on any error; falls back to `error` ref.                        |

## File attachments

`append()` accepts browser files in its second argument:

```vue
<script setup lang="ts">
import { shallowRef } from 'vue'
import { useChat } from 'vue-ai-hooks'

const fileInput = shallowRef<HTMLInputElement | null>(null)
const { input, handleSubmit } = useChat({ provider })

async function send(event?: { preventDefault?: () => void }) {
  await handleSubmit(event, {
    attachments: fileInput.value?.files ?? undefined
  })
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <form @submit="send">
    <input ref="fileInput" type="file" multiple />
    <textarea v-model="input" />
    <button>Send</button>
  </form>
</template>
```

`attachments` can be a `FileList` from `<input type="file">`, a `File[]`, or
preloaded file objects:

```ts
await append('Review uploaded assets.', {
  attachments: [
    { name: 'screenshot.png', type: 'image/png', url: uploadedImageUrl },
    { name: 'notes.txt', type: 'text/plain', text: alreadyReadText }
  ]
})
```

`image/*` browser files are converted to `image_url` data URLs. `image/*`
objects use their `url` directly, which is useful after uploading files to your
own storage. `text/*` files are converted to extra text parts; text objects must
provide `text`. `useChat` does not fetch remote text URLs for you. Unsupported
file types reject the `append()` call and write the error to `error.value`.

## Message persistence

`useChat({ persist })` uses `serializeMessages()` and `deserializeMessages()` by
default. `createdAt: Date` is saved as an ISO string and restored as a `Date`
when the chat is hydrated:

```ts
const { messages, append, clear } = useChat({
  provider,
  id: 'support-thread-1',
  persist: {
    key: 'support-thread-1',
    version: 1
  }
})
```

Invalid stored payloads are ignored instead of being written into `messages`.
`clear()` also removes the persisted entry.

Use the helpers directly when your app saves chats to a database or your own
backend:

```ts
const payload = serializeMessages(messages.value)
await saveChat('support-thread-1', payload)

const restored = deserializeMessages(await loadChat('support-thread-1'))
if (restored) setMessages(restored)
```

Override `storage`, `serialize`, or `deserialize` only when you need a custom
envelope or a non-localStorage target:

```ts
const chat = useChat({
  provider,
  persist: {
    key: 'support-thread-1',
    storage: sessionStorage,
    serialize: (messages) => ({
      savedAt: new Date().toISOString(),
      messages: serializeMessages(messages)
    }),
    deserialize: (raw) =>
      raw && typeof raw === 'object' && 'messages' in raw ? deserializeMessages(raw.messages) : null
  }
})
```

## Structured message parts

Assistant messages keep `content` for backward-compatible text rendering and can
also include `Message.parts` for richer UIs. During streaming, `useChat` appends
text parts, converts source/file/custom data chunks into `source`, `file`, and
`data-*` parts, and mirrors accumulated tool calls as `tool-*` parts:

```vue
<template>
  <article v-for="message in messages" :key="message.id">
    <template v-for="part in message.parts ?? []" :key="part.id ?? part.type">
      <p v-if="part.type === 'text'">{{ part.text }}</p>
      <a v-else-if="part.type === 'source'" :href="part.url">{{ part.title ?? part.url }}</a>
      <code v-else-if="part.type.startsWith('tool-')">{{ part.state }}</code>
    </template>
  </article>
</template>
```

`serializeMessages()` and `deserializeMessages()` preserve valid
`Message.parts`, so persisted chats can restore the same structured rendering
state.

## Return value

| Property                        | Type                                                                   | Description                                                            |
| ------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `id`                            | `Ref<string>`                                                          | Stable chat id used in provider requests.                              |
| `messages`                      | `Ref<Message[]>`                                                       | Full message history (user, assistant, system, tool).                  |
| `input`                         | `Ref<string>`                                                          | Bound to your composer; `handleSubmit()` clears it after success.      |
| `status`                        | `Ref<ChatStatus>`                                                      | Request lifecycle: `ready`, `submitted`, `streaming`, or `error`.      |
| `usage`                         | `Ref<TokenUsage \| null>`                                              | Latest normalized token usage from provider chunks.                    |
| `streamData`                    | `Ref<StreamDataPart[]>`                                                | Custom stream data collected during the current assistant turn.        |
| `pendingToolCalls`              | `Ref<ToolCall[]>`                                                      | Tool calls waiting for manual results.                                 |
| `isLoading`                     | `Ref<boolean>`                                                         | True while a stream is in flight.                                      |
| `error`                         | `Ref<Error \| null>`                                                   | Last error, cleared on next `append`.                                  |
| `append(content, opts?)`        | `(string \| Message, AppendChatOptions) => Promise<void>`              | Send or replace a message and stream the reply.                        |
| `sendMessage(content?, opts?)`  | `(string \| Message \| undefined, AppendChatOptions) => Promise<void>` | AI SDK-style send helper; omit content to submit the current messages. |
| `addToolResult(id, res)`        | `(string, unknown, Partial<ChatRequest>) => Promise<void>`             | Append a manual tool result and continue after all results are ready.  |
| `addToolOutput(output)`         | `(AddToolOutputOptions, Partial<ChatRequest>) => Promise<void>`        | AI SDK-style alias for manual tool output.                             |
| `addToolApprovalResponse(resp)` | `(ToolApprovalResponse, Partial<ChatRequest>) => Promise<void>`        | AI SDK-style approval/denial response helper.                          |
| `approveToolCall(id)`           | `(string, Partial<ChatRequest>) => Promise<void>`                      | Run an approval-gated local handler and continue when ready.           |
| `rejectToolCall(id)`            | `(string, unknown, Partial<ChatRequest>) => Promise<void>`             | Append a rejected tool result and continue when ready.                 |
| `regenerate(opts?)`             | `(RegenerateChatOptions) => Promise<void>`                             | Regenerate the last assistant turn or a specific assistant message.    |
| `resumeStream(opts?)`           | `(ResumeChatOptions) => Promise<void>`                                 | Resume an active backend stream when the provider supports it.         |
| `reload()`                      | `() => Promise<void>`                                                  | Re-run the last assistant turn.                                        |
| `stop()`                        | `() => void`                                                           | Abort the in-flight stream.                                            |
| `setId(id)`                     | `(string) => void`                                                     | Replace the chat id used for future provider requests.                 |
| `setInput(value)`               | `(string) => void`                                                     | Replace composer input manually.                                       |
| `handleInputChange(event)`      | `(Event \| { target } \| string) => void`                              | Wire custom inputs without `v-model`.                                  |
| `handleSubmit(event, opts?)`    | `(Event?, AppendChatOptions?) => Promise<void>`                        | Wire form submits; ignores empty text without attachments.             |
| `setMessages(messages)`         | `(SetMessagesInput) => void`                                           | Replace history or update it with a function.                          |
| `clearError()`                  | `() => void`                                                           | Clear `error` and move `status` back to `ready`.                       |
| `clear()`                       | `() => void`                                                           | Reset to empty state. With `persist`, also removes the storage entry.  |
| `abortController`               | `Ref<AbortController \| null>`                                         | Exposed for advanced use cases.                                        |

## Retry behavior

`maxRetries` defaults to `0`, so existing calls keep one provider attempt. When
enabled, `useChat` retries provider failures only until the first stream chunk is
received. After any content, tool call, metadata, or custom data chunk arrives,
errors are surfaced through `error` and `onError` instead of retrying and
duplicating output.

The default retry decision retries network-like errors and HTTP `408`, `409`,
`425`, `429`, or `5xx` `AiHooksError.status` values. Return `false` from
`shouldRetry` to stop retrying a specific failure.

## Stream throttling

Set `throttleMs` to batch reactive `messages` and `streamData` updates while a
fast stream is active:

```ts
const { append, messages } = useChat({
  provider,
  throttleMs: 50
})
```

`onChunk` and `onData` still receive every raw stream event. `onUpdate` follows
the throttled assistant message flush. The final assistant message and stream
data are always flushed before `append()`, `regenerate()`, or `resumeStream()`
resolves.

## Lifecycle callbacks

`onFinish(message, info)` receives the final assistant message and a snapshot
with `info.message`, `info.messages`, `info.isAbort`, `info.isError`,
`info.isDisconnect`, and `info.finishReason`. If a stream fails after the
assistant message has started, `onFinish` runs with `isError: true` and
`isDisconnect: true` before `onError`.

## Custom ids

Pass `generateId` when generated ids must be deterministic or come from your
app's own id service:

```ts
const { id, append } = useChat({
  provider,
  generateId: (prefix = 'msg') => `${prefix}_${crypto.randomUUID()}`
})
```

`generateId` is used for the chat id when `id` is not provided, user messages
created from strings, assistant messages, local tool result messages, and custom
stream data that does not include `dataId`. Explicit message `id`, `messageId`,
and chunk `dataId` values are preserved.

## Request body extensions

Use `defaultRequest.body` or per-call options like `append(message, { body })`
and `regenerate({ body })` to send provider-specific JSON fields that are not in
the typed request options:

```ts
await append('Use provider-specific options.', {
  body: {
    reasoning_effort: 'low',
    cache_control: { type: 'ephemeral' }
  }
})
```

`body` is merged before explicit fields such as `messages`, `model`, and
`stream`, so typed request options win if a key conflicts.

## Message pruning

Use `pruneMessages()` when a long chat should send only useful context to a
provider or proxy. It can keep system messages, keep the latest N non-system
messages, remove empty messages, trim historical reasoning parts, and trim
historical tool calls/results:

```ts
import { pruneMessages, useChat } from 'vue-ai-hooks'

const { append } = useChat({
  provider,
  prepareSendMessagesRequest({ request }) {
    return {
      messages: pruneMessages({
        messages: request.messages,
        maxMessages: 12,
        reasoning: 'before-last-message',
        toolCalls: [{ type: 'before-last-message', tools: ['searchDocs', 'lookupAccount'] }]
      })
    }
  }
})

await append('Use the latest relevant context.')
```

| Option          | Type                                                                 | Default    | Description                                                     |
| --------------- | -------------------------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| `messages`      | `Message[]`                                                          | required   | History to prune. The original array and messages are cloned.   |
| `maxMessages`   | `number`                                                             | -          | Keep the latest N non-system messages.                          |
| `keepSystem`    | `boolean`                                                            | `true`     | Preserve system messages even when `maxMessages` trims history. |
| `emptyMessages` | `'keep' \| 'remove'`                                                 | `'remove'` | Drop messages with no text/image content or tool calls.         |
| `reasoning`     | `'none' \| 'all' \| 'before-last-message' \| before-last-N-messages` | `'none'`   | Remove historical `reasoning` message parts.                    |
| `toolCalls`     | strategy or `{ type, tools? }[]`                                     | `'none'`   | Remove historical assistant tool calls and matching tool rows.  |

`toolCalls` can use the same string strategies as `reasoning`, or an array of
rules when only selected tools should be pruned. Each rule accepts `type: 'all' |
'before-last-message' | before-last-N-messages` and optional `tools: string[]`.
Omitting `tools` applies that rule to every tool call.

## Request preparation hooks

Use `prepareSendMessagesRequest` when your backend needs last-mile request
customization that depends on the current chat id, trigger, metadata, headers,
or resolved message list:

```ts
const { append, regenerate } = useChat({
  provider,
  id: 'thread_1',
  defaultRequest: {
    body: { tenantId: 'acme' },
    headers: { 'X-App': 'support-console' }
  },
  prepareSendMessagesRequest({ id, trigger, body, headers }) {
    return {
      headers: { ...headers, 'X-Chat-Id': id },
      body: { ...body, trigger }
    }
  }
})

await append('Summarize the latest ticket.')
await regenerate({ messageId: 'msg_assistant_1' })
```

The hook receives `PrepareSendMessagesRequestOptions`: `id`, `messages`,
`requestMetadata`, `body`, `headers`, the full `request`, `trigger`
(`'submit-message'` or `'regenerate-message'`), and optional `messageId`.
Return `Partial<ChatRequest>` to override request fields. Returned `body` and
`headers` are merged over the already resolved request so existing defaults are
not dropped accidentally.

Use `prepareReconnectToStreamRequest` for resumable proxy streams:

```ts
const { resumeStream } = useChat({
  provider,
  id: 'thread_1',
  prepareReconnectToStreamRequest({ id, headers }) {
    return {
      headers: { ...headers, 'X-Resume-Thread': id }
    }
  }
})

await resumeStream({ body: { reason: 'manual-retry' } })
```

The reconnect hook receives `PrepareReconnectToStreamRequestOptions`: `id`,
`requestMetadata`, `body`, `headers`, and the full `ChatResumeRequest`.

## Local message updates

`setMessages()` accepts either a full message array or a function that receives a
snapshot of the current messages:

```ts
setMessages((messages) => [...messages, { id: 'note_1', role: 'assistant', content: 'Local note' }])
```

Use this for optimistic edits, external restore flows, or local-only system
messages. Calling `setMessages()` also clears turn-scoped state such as
`streamData` and pending tool calls.

## Tool calling

When you pass `tools`, the model can choose to call a function instead of replying
with text. If you also pass `toolHandlers`, `useChat` parses the arguments,
executes the matching local handler, appends the `tool` message, and continues
the conversation automatically:

```ts
const { messages, append } = useChat({
  provider: openai({ apiKey: '...' }),
  tools: [
    {
      type: 'function',
      function: {
        name: 'getWeather',
        description: 'Get the weather in a city',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city']
        }
      }
    }
  ],
  toolHandlers: {
    async getWeather(args) {
      const { city } = args as { city: string }
      return { city, temp: 22, conditions: 'sunny' }
    }
  },
  onToolCall(args, context) {
    console.debug('tool call', context.toolCall.function.name, args)
  },
  onToolResult(result, context) {
    console.debug('tool result', context.resultMessage.toolCallId, result)
  }
})

await append("What's the weather in Tokyo?")

console.log(messages.value.map((m) => m.role))
// ['user', 'assistant', 'tool', 'assistant']
```

The library handles the streaming accumulation of `tool_calls` deltas into the
final `toolCalls[]` on the assistant message. OpenAI-compatible providers use
the OpenAI wire format; the Anthropic provider maps the same public `Tool` and
`tool` messages into Anthropic's Messages API format. If a model calls a tool
that has no registered handler, or a handler throws, `append()` rejects and
`error.value` is set.

For tools that need user interaction, omit `toolHandlers`. `useChat` exposes the
calls in `pendingToolCalls`; call `addToolResult()` once your UI has approval or
a browser-side result. If the model requested multiple tools, the conversation
continues only after every pending call has a result:

```ts
const { pendingToolCalls, addToolResult, append } = useChat({
  provider: openai({ apiKey: '...' }),
  tools: [confirmPurchaseTool]
})

await append('Buy the pro plan.')

const [call] = pendingToolCalls.value
await addToolResult(call.id, { approved: true })
```

`addToolOutput({ toolCallId, output })` is available as an AI SDK-style alias.
For failed browser-side tool work, pass
`{ toolCallId, state: 'output-error', errorText }`.

By default, `useChat` continues automatically when the latest assistant tool
calls all have matching `tool` result messages. Pass
`sendAutomaticallyWhen: false` to turn that off, or pass a predicate such as
`lastAssistantMessageIsCompleteWithToolCalls` to keep AI SDK-style
configuration explicit:

```ts
import { lastAssistantMessageIsCompleteWithToolCalls, useChat } from 'vue-ai-hooks'

const chat = useChat({
  provider,
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls
})
```

When automatic continuation is disabled, call `sendMessage()` without content
after `addToolResult()` or `addToolOutput()` to submit the current messages and
let the model continue from the tool result.

When a registered local handler should still wait for user approval, provide
`requiresToolApproval`. Matching calls are exposed through `pendingToolCalls`
without running the handler. Call `approveToolCall()` to run the handler after
confirmation, or `rejectToolCall()` to send a rejected result back to the model:

```ts
const { pendingToolCalls, approveToolCall, rejectToolCall, append } = useChat({
  provider: openai({ apiKey: '...' }),
  tools: [chargeCardTool],
  toolHandlers: {
    async chargeCard(args) {
      return await billing.charge(args)
    }
  },
  requiresToolApproval(_args, context) {
    return context.toolCall.function.name === 'chargeCard'
  }
})

await append('Charge my card.')

const [call] = pendingToolCalls.value
await approveToolCall(call.id)
// or: await rejectToolCall(call.id, 'User denied')
```

`addToolApprovalResponse({ id, approved, reason })` is the AI SDK-style alias
for the same approval flow.

## Status and regeneration

Use `status` when your UI needs to distinguish a submitted request from an
actively streaming response. `clearError()` only clears the error state; it does
not modify messages.

```ts
const { append, regenerate, status, clearError } = useChat({ provider })

await append('Explain the plan.')

if (status.value === 'error') {
  clearError()
}

await regenerate()
```

Pass `messageId` to `regenerate()` to re-run a specific assistant turn. Later
messages are dropped so the provider receives the same prior context that led to
that assistant message.

Pass `messageId` to `append()` to replace an existing message, drop later
history, and stream a new assistant reply from the edited context. This is useful
for "edit and resend" chat UIs.

```ts
await append('Explain it with a shorter example.', {
  messageId: 'msg_user_1',
  temperature: 0.2
})
```

## Chat identity and request metadata

`useChat({ id })` keeps a reactive chat id, includes it in every provider
request, and shares in-memory chat state with other `useChat()` instances that
were created with the same id. The first instance for an id seeds
`initialMessages` and `initialInput`; `messages` is accepted as an AI SDK-style
alias for `initialMessages`. Later instances reuse the same `messages`, `input`,
`status`, loading, error, usage, stream data, and pending tool-call refs.

Use `setId()` when your app needs future provider requests to use a different
backend thread id. It does not rebind the current refs to another shared-state
entry. Per-request `metadata` is also passed through `ChatRequest`; direct
provider adapters ignore it unless their upstream API supports it, while
`proxyProvider` sends it to your backend JSON body.

```ts
const mainChat = useChat({
  provider,
  id: 'thread_1',
  initialMessages: restoredMessages,
  initialInput: draftText
})

const sidebarChat = useChat({
  provider,
  id: 'thread_1',
  defaultRequest: { metadata: { source: 'support-inbox' } }
})

mainChat.setInput('Continue this thread.')
await sidebarChat.handleSubmit(undefined, { metadata: { traceId: 'req_1' } })

mainChat.setId('backend-thread-2')
```

## Resumable streams

`resumeStream()` reconnects to an active backend stream for the current chat id.
This requires a provider with `resumeChat()` support. `proxyProvider` implements
that optional provider method with a GET request to its `resumeUrl`; direct
provider adapters do not resume streams on their own.

```ts
const { resumeStream, status } = useChat({
  provider: proxyProvider({
    chatUrl: '/api/chat',
    resumeUrl: '/api/chat/:id/stream'
  }),
  id: 'thread_1',
  initialMessages: restoredMessages,
  resume: true
})

await resumeStream({ metadata: { reason: 'manual-retry' } })

console.log(status.value)
```

If the backend returns `204 No Content`, no assistant message is added and the
status returns to `ready`. If a stream exists, chunks are applied to the latest
assistant message when it is last in the history, or to a new assistant message
otherwise. Backend storage, active stream tracking, and stream expiration remain
owned by your app.

## Custom stream data and metadata

Providers and proxy endpoints can yield `ChatChunk` objects with `metadata` and
custom `data`. Metadata is merged into the current assistant message. Data parts
are exposed through `streamData` and `onData`:

```ts
const { messages, streamData } = useChat({
  provider,
  onData(part) {
    console.debug(part.type, part.data)
  }
})

// Example provider chunk:
// { dataId: 'doc-1', dataType: 'source', data: { title: 'Vue docs' } }
```

When `proxyProvider` consumes an AI SDK UI message stream, `start.messageMetadata`,
`finish.messageMetadata`, and `message-metadata` parts are normalized into the
same assistant `metadata` field.

When a later chunk uses the same `dataId`, it replaces the earlier stored part.
Set `transient: true` for progress ticks or debug events that should call
`onData` without being stored in `streamData` or `Message.parts`.

## Vision input

Pass multimodal content as an array of `ContentPart`:

```ts
await append({
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image_url', image_url: { url: 'https://example.com/x.png' } }
  ]
})
```

For `data:` URLs (base64), the Anthropic provider automatically converts them
to the right wire format. The OpenAI provider passes them through.
