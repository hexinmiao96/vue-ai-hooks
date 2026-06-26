# Public types

These are the provider-agnostic request, response, message, and error contracts
exported from `vue-ai-hooks`.

## Messages

```ts
type MessageRole = 'system' | 'user' | 'assistant' | 'tool'
type MessageContent = string | ContentPart[]
type ContentPart = TextPart | ImageUrlPart
type ChatAttachmentInput = File | ChatFileAttachment
type ChatAttachmentsInput = FileList | readonly ChatAttachmentInput[]

interface ChatFileAttachment {
  name?: string
  type: string
  url?: string
  text?: string
}
```

| Type           | Shape                                                                                   |
| -------------- | --------------------------------------------------------------------------------------- |
| `TextPart`     | `{ type: 'text'; text: string }`                                                        |
| `ImageUrlPart` | `{ type: 'image_url'; image_url: { url: string; detail?: 'low' \| 'high' \| 'auto' } }` |

`ChatAttachmentsInput` is the file input accepted by
`append(message, { attachments })`. It supports browser `File` values and
preloaded `ChatFileAttachment` objects. `useChat` converts supported files into
`ContentPart[]` before the provider request is sent.

Assistant messages can also expose structured UI parts:

```ts
type MessagePart =
  | MessageTextPart
  | MessageReasoningPart
  | MessageSourcePart
  | MessageFilePart
  | MessageDataPart
  | MessageToolPart

interface MessageTextPart {
  type: 'text'
  text: string
  id?: string
}

interface MessageReasoningPart {
  type: 'reasoning'
  text: string
  id?: string
}

interface MessageSourcePart {
  type: 'source'
  id?: string
  sourceType?: 'url' | 'document'
  url?: string
  title?: string
  mediaType?: string
  data?: unknown
}

interface MessageFilePart {
  type: 'file'
  id?: string
  url: string
  mediaType?: string
  name?: string
  data?: unknown
}

interface MessageDataPart {
  type: 'data' | `data-${string}`
  id?: string
  data: unknown
  transient?: boolean
}

interface MessageToolPart {
  type: `tool-${string}`
  toolCallId: string
  toolName: string
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
  input?: unknown
  inputText?: string
  output?: unknown
  errorText?: string
}
```

```ts
interface Message {
  id: string
  role: MessageRole
  content: MessageContent
  name?: string
  toolCallId?: string
  toolCalls?: ToolCall[]
  parts?: MessagePart[]
  createdAt?: Date
  metadata?: Record<string, unknown>
}
```

`Message.parts` is optional and keeps `content` backward-compatible. It gives
Vue UIs a render-ready structure for text, reasoning, sources, files, custom
data, and `tool-*` states without parsing the assistant text.

`SerializedMessage` is the JSON-safe shape returned by
`serializeMessages(messages)`:

```ts
type SerializedMessage = Omit<Message, 'createdAt'> & {
  createdAt?: string
}
```

`useChat({ persist })` accepts `ChatPersistOptions`:

```ts
interface ChatPersistOptions {
  key: string
  version?: number
  storage?: Storage | null
  serialize?: (value: Message[]) => unknown
  deserialize?: (raw: unknown) => Message[] | null
}
```

By default, chat persistence uses `serializeMessages()` and
`deserializeMessages()` so `createdAt` survives JSON storage as a `Date` after
hydration.

## Tools

```ts
interface Tool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters: Record<string, unknown>
  }
}

interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}
```

`parameters` is an OpenAI-compatible JSON Schema object. `arguments` is the raw
JSON string emitted by the model.

Tool execution callbacks use the same parsed argument snapshot as
`toolHandlers`:

```ts
interface ToolCallHandlerContext {
  toolCall: ToolCall
  messages: Message[]
  args: unknown
  context?: unknown
}

type ToolApprovalPredicate = (
  args: unknown,
  context: ToolCallHandlerContext
) => boolean | Promise<boolean>

type SendAutomaticallyWhen = (options: { messages: Message[] }) => boolean | PromiseLike<boolean>

interface PrepareStepOptions {
  id: string
  messages: Message[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  request: ChatRequest
  trigger: 'submit-message' | 'regenerate-message'
  messageId?: string
  stepNumber: number
  toolCalls: ToolCall[]
}

type PrepareStep = (
  options: PrepareStepOptions
) => Partial<ChatRequest> | void | Promise<Partial<ChatRequest> | void>

interface ToolResultHandlerContext extends ToolCallHandlerContext {
  resultMessage: Message
}
```

`ToolApprovalPredicate` pauses matching local handlers until the UI calls
`approveToolCall()` or `rejectToolCall()`. `messages` is a shallow snapshot of
the current history. `context` is the client-local `useChat({ context })` value
and is not serialized to provider requests. `resultMessage` is the generated
`tool` message that will be appended before the follow-up model call.

`SendAutomaticallyWhen` controls whether completed tool results should trigger
the next provider request. `lastAssistantMessageIsCompleteWithToolCalls` is the
default helper.

`PrepareStep` customizes every assistant step request. `stepNumber` starts at
`0`, and `toolCalls` contains the latest assistant step's tool calls when a
follow-up request is being prepared.

Request lifecycle callbacks expose provider-agnostic snapshots:

```ts
type ChatRequestLifecycleKind = 'chat' | 'resume'

interface ChatRequestInfo {
  kind: ChatRequestLifecycleKind
  id: string
  providerId: string
  attempt: number
  request: ChatRequest | ChatResumeRequest
  messages: Message[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  trigger?: 'submit-message' | 'regenerate-message'
  messageId?: string
  stepNumber?: number
}

interface ChatResponseInfo extends ChatRequestInfo {
  hasStream: boolean
}
```

`onRequest` receives `ChatRequestInfo` after request preparation and before the
provider adapter runs. `onResponse` receives `ChatResponseInfo` after the
adapter returns, with `hasStream` indicating whether a stream was available.

## IDs

```ts
type IdGenerator = (prefix?: string) => string
```

`useChat`, `useCompletion`, and `useObject` accept `generateId` when deterministic
ids are useful for SSR, tests, persistence, or backend trace correlation.
`useCompletion({ id })` also uses the id to share completion state across
components.

## Structured output

```ts
type ResponseFormat =
  | { type: 'json_object' }
  | {
      type: 'json_schema'
      json_schema: {
        name: string
        description?: string
        schema: Record<string, unknown>
        strict?: boolean
      }
    }
```

`useObject` builds this for you. You can also pass `responseFormat` directly in
`ChatRequest` when calling `useChat` or a provider method.

`useObject.partialObject` uses `DeepPartial<T>` while a structured JSON stream is
still incomplete:

```ts
type DeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T
```

## Requests

### `ChatRequest`

| Field              | Type                                                                                 | Description                                              |
| ------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `id`               | `string`                                                                             | Chat/session identifier for provider or proxy layers.    |
| `threadId`         | `string`                                                                             | Backend thread id, separate from client shared state id. |
| `messages`         | `Message[]`                                                                          | Conversation history.                                    |
| `forwardedProps`   | `Record<string, unknown>`                                                            | App props forwarded to proxy/agent backends.             |
| `body`             | `Record<string, unknown>`                                                            | Extra JSON body fields for provider/proxy options.       |
| `model`            | `string`                                                                             | Provider model id.                                       |
| `temperature`      | `number`                                                                             | Sampling temperature.                                    |
| `maxTokens`        | `number`                                                                             | Maximum generated tokens.                                |
| `topP`             | `number`                                                                             | Nucleus sampling value.                                  |
| `frequencyPenalty` | `number`                                                                             | Frequency penalty.                                       |
| `presencePenalty`  | `number`                                                                             | Presence penalty.                                        |
| `stop`             | `string \| string[]`                                                                 | Stop sequence or sequences.                              |
| `tools`            | `Tool[]`                                                                             | Function tools the model may call.                       |
| `activeTools`      | `string[]`                                                                           | Function tool names to keep from the resolved list.      |
| `toolChoice`       | `'auto' \| 'none' \| 'required' \| { type: 'function'; function: { name: string } }` | Tool choice policy.                                      |
| `responseFormat`   | `ResponseFormat`                                                                     | Structured output format for compatible providers.       |
| `metadata`         | `unknown`                                                                            | App-defined request metadata for proxy/backend layers.   |
| `user`             | `string`                                                                             | End-user identifier for provider policy/abuse tracking.  |
| `stream`           | `boolean`                                                                            | Whether the provider should stream.                      |
| `signal`           | `AbortSignal`                                                                        | Abort signal.                                            |
| `headers`          | `Record<string, string>`                                                             | Per-request headers merged by the provider.              |

### `ChatResumeRequest`

| Field            | Type                      | Description                                              |
| ---------------- | ------------------------- | -------------------------------------------------------- |
| `id`             | `string`                  | Chat/session identifier used by the resume endpoint.     |
| `threadId`       | `string`                  | Backend thread id, separate from client shared state id. |
| `forwardedProps` | `Record<string, unknown>` | App props forwarded to proxy/agent backends.             |
| `body`           | `Record<string, unknown>` | Extra JSON body fields for provider/proxy options.       |
| `metadata`       | `unknown`                 | App-defined request metadata for proxy/backend layers.   |
| `signal`         | `AbortSignal`             | Abort signal.                                            |
| `headers`        | `Record<string, string>`  | Per-request headers merged by the provider.              |

### `CompletionRequest`

| Field              | Type                      | Description                                        |
| ------------------ | ------------------------- | -------------------------------------------------- |
| `prompt`           | `string`                  | Prompt text.                                       |
| `body`             | `Record<string, unknown>` | Extra JSON body fields for provider/proxy options. |
| `model`            | `string`                  | Provider model id.                                 |
| `temperature`      | `number`                  | Sampling temperature.                              |
| `maxTokens`        | `number`                  | Maximum generated tokens.                          |
| `topP`             | `number`                  | Nucleus sampling value.                            |
| `frequencyPenalty` | `number`                  | Frequency penalty.                                 |
| `presencePenalty`  | `number`                  | Presence penalty.                                  |
| `stop`             | `string \| string[]`      | Stop sequence or sequences.                        |
| `stream`           | `boolean`                 | Whether the provider should stream.                |
| `signal`           | `AbortSignal`             | Abort signal.                                      |
| `headers`          | `Record<string, string>`  | Per-request headers merged by the provider.        |

### `EmbeddingRequest`

| Field     | Type                      | Description                                             |
| --------- | ------------------------- | ------------------------------------------------------- |
| `input`   | `string \| string[]`      | Text or batch of texts to embed.                        |
| `body`    | `Record<string, unknown>` | Extra JSON body fields for provider/proxy options.      |
| `model`   | `string`                  | Provider model id.                                      |
| `user`    | `string`                  | End-user identifier for provider policy/abuse tracking. |
| `signal`  | `AbortSignal`             | Abort signal.                                           |
| `headers` | `Record<string, string>`  | Per-request headers merged by the provider.             |

`body` is merged into provider/proxy JSON request bodies before the typed
request fields. If keys conflict, explicit typed fields such as `messages`,
`prompt`, `input`, `model`, and `stream` win.

## Responses

```ts
type AiRequestStatus = 'ready' | 'submitted' | 'streaming' | 'error'

interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

interface StreamDataPart<TData = unknown> {
  id: string
  data: TData
  type?: string
  transient?: boolean
  createdAt?: Date
}

interface ChatChunk {
  messageId?: string
  content?: string
  toolCalls?: Array<{
    index: number
    id?: string
    type?: 'function'
    function?: {
      name?: string
      arguments?: string
    }
  }>
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null
  usage?: TokenUsage
  metadata?: Record<string, unknown>
  data?: unknown
  parts?: MessagePart[]
  dataId?: string
  dataType?: string
  transient?: boolean
}

interface EmbeddingResult {
  embeddings: number[][]
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
}
```

`ChatChunk.messageId` replaces the id of the current assistant message. This is
useful when a backend or AI SDK UI message stream sends a server-authoritative
message id before the text deltas arrive.
`ChatChunk.metadata` is merged into the current assistant message metadata. AI
SDK UI stream `messageMetadata` values are normalized into this field by
`proxyProvider`.
`ChatChunk.data` is exposed through `useChat().streamData` and `onData`; pass
`useChat<TData>()` to type those custom stream data values. Use a stable
`dataId` to replace an earlier part, and set `transient: true` for parts that
should only trigger `onData`.
`ChatChunk.parts` is merged into the assistant `Message.parts` array, alongside
text deltas, custom data parts, and accumulated tool call states.

## `AiHooksError`

```ts
class AiHooksError extends Error {
  readonly cause?: unknown
  readonly status?: number
}
```

Providers and composables use `AiHooksError` when they can attach a useful HTTP
status or upstream response body. The original upstream body is stored in
`cause` when available.

Handle it with a normal `instanceof` check when you need transport details:

```ts
import { AiHooksError } from 'vue-ai-hooks'

try {
  // call append(), complete(), embed(), or a provider method
} catch (error) {
  if (error instanceof AiHooksError) {
    console.error(error.status)
    console.error(error.cause)
  }

  throw error
}
```

Use `status` for HTTP-aware retry or user messaging decisions. Use `cause` only
for diagnostics because providers may store raw upstream response bodies there.

## Retry options

`UseChatOptions`, `UseCompletionOptions`, `UseEmbeddingOptions`, and
`UseObjectOptions` all include these retry controls:

```ts
interface RetryContext {
  attempt: number
  maxRetries: number
  error: Error
}

interface RetryOptions {
  maxRetries?: number
  retryDelayMs?: number | ((context: RetryContext) => number)
  shouldRetry?: (error: Error, context: RetryContext) => boolean | Promise<boolean>
  onRetry?: (error: Error, context: RetryContext) => void
}
```

`attempt` is 1-based and counts retry attempts after the initial provider call.
`maxRetries` defaults to `0`. Without a custom `shouldRetry`, network-like
errors and HTTP `408`, `409`, `425`, `429`, and `5xx` statuses are retryable.

## Stream throttle options

`UseChatOptions`, `UseCompletionOptions`, and `UseObjectOptions` also include
stream update throttling controls:

```ts
interface StreamThrottleOptions {
  throttleMs?: number
  experimental_throttle?: number
}
```

`throttleMs` batches reactive stream ref updates during fast streams. The final
state is always flushed before the request promise resolves.
`experimental_throttle` is an AI SDK-compatible alias; prefer `throttleMs` in
new code.

## ID generation

```ts
type IdGenerator = (prefix?: string) => string
```

`UseChatOptions.generateId` uses this type to override generated chat, message,
tool result, and stream data ids. `UseObjectOptions.generateId` uses it for
prompt messages created from string prompts. Explicit ids supplied by the caller
are preserved.

## Chat history updates

```ts
type SetMessagesInput = Message[] | ((messages: Message[]) => Message[])
```

`useChat().setMessages()` accepts this type for local history replacement or
optimistic updates.

## Message pruning

```ts
type PruneToolCallsStrategy =
  | 'none'
  | 'all'
  | 'before-last-message'
  | `before-last-${number}-messages`

interface PruneToolCallsRule {
  type: Exclude<PruneToolCallsStrategy, 'none'>
  tools?: readonly string[]
}

type PruneToolCallsOption = PruneToolCallsStrategy | readonly PruneToolCallsRule[]

type PruneReasoningStrategy = PruneToolCallsStrategy

interface PruneMessagesOptions {
  messages: Message[]
  maxMessages?: number
  keepSystem?: boolean
  emptyMessages?: 'keep' | 'remove'
  toolCalls?: PruneToolCallsOption
  reasoning?: PruneReasoningStrategy
}
```

`pruneMessages()` accepts `PruneMessagesOptions` to trim long histories before
provider requests, including historical reasoning parts and selected or global
tool details.
