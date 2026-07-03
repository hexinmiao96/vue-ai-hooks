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

`getToolRenderParts()` derives stable tool renderer rows from `Message.parts`,
assistant `toolCalls`, `role: 'tool'` result messages, and optional pending tool
calls:

```ts
type ToolRenderStatus = 'inProgress' | 'executing' | 'awaitingAction' | 'complete' | 'error'

interface ToolRenderPart {
  key: string
  toolCallId: string
  toolName: string
  state: MessageToolPart['state']
  status: ToolRenderStatus
  pending: boolean
  input?: unknown
  inputText?: string
  output?: unknown
  errorText?: string
  messageId?: string
}

interface GetToolRenderPartsOptions {
  messages: readonly Message[]
  pendingToolCalls?: readonly ToolCall[]
}
```

For AI SDK UI-style end-to-end typing, compose message metadata, custom data
parts, and inferred tools with `UIMessage`:

```ts
type UIDataTypes = Record<string, unknown>
type UITools = Record<string, { input: unknown; output: unknown }>

type UIMessageDataPart<TDataTypes extends UIDataTypes = UIDataTypes> =
  | { type: 'data'; id?: string; data: unknown; transient?: boolean }
  | {
      [TName in keyof TDataTypes & string]: {
        type: `data-${TName}`
        id?: string
        data: TDataTypes[TName]
        transient?: boolean
      }
    }[keyof TDataTypes & string]

type UIMessageToolPart<TTools extends UITools = UITools> = {
  [TName in keyof TTools & string]: {
    type: `tool-${TName}`
    toolCallId: string
    toolName: TName
    state: MessageToolPart['state']
    input?: TTools[TName]['input']
    inputText?: string
    output?: TTools[TName]['output']
    errorText?: string
  }
}[keyof TTools & string]

type UIMessagePart<TDataTypes extends UIDataTypes = UIDataTypes, TTools extends UITools = UITools> =
  | MessageTextPart
  | MessageReasoningPart
  | MessageSourcePart
  | MessageFilePart
  | UIMessageDataPart<TDataTypes>
  | UIMessageToolPart<TTools>

interface UIMessage<
  TMetadata extends Record<string, unknown> | never = Record<string, unknown>,
  TDataTypes extends UIDataTypes = UIDataTypes,
  TTools extends UITools = UITools
> extends Omit<Message, 'metadata' | 'parts'> {
  parts?: UIMessagePart<TDataTypes, TTools>[]
  metadata?: TMetadata
}
```

Pair `UIMessage<Metadata, DataParts, InferUITools<typeof tools>>` with
`dataPartSchemas`, `messageMetadataSchema`, and `defineToolHandlers()` when an
app wants typed render parts without adopting a UI framework.

Use `ToolRenderPart.status === 'awaitingAction'` to render approval buttons or a
manual result form, and use `status === 'complete'` or `'error'` for finished
tool timelines.

`convertToModelMessages(messages, options?)` returns provider/model-facing
messages without UI-only `parts`. It strips `id` and `createdAt` by default, and
can preserve them when the backend needs stable trace fields:

```ts
interface ModelMessage {
  role: MessageRole
  content: MessageContent
  name?: string
  toolCallId?: string
  toolCalls?: ToolCall[]
  metadata?: Record<string, unknown>
  id?: string
  createdAt?: Date
}

interface ConvertToModelMessagesOptions {
  preserveIds?: boolean
  preserveCreatedAt?: boolean
  stripMetadata?: boolean
}

type ChatRequestMessage = Message | ModelMessage
```

`ChatRequestMessage` is the message type accepted by provider and proxy
requests. UI state still uses full `Message[]`, while
`prepareSendMessagesRequest` can return `ModelMessage[]` from
`convertToModelMessages()`.

`append(message, { messageMetadata })` stores metadata on the user message, while
request-level `metadata` stays on `ChatRequest`. `useChat()` can validate message
metadata with a JSON Schema subset or a custom predicate:

```ts
interface SendChatMessageInput<TMetadata extends Record<string, unknown>> {
  text?: string
  files?: ChatAttachmentsInput
  metadata?: TMetadata
  messageId?: string
}

type MessageMetadataValidator<TMetadata extends Record<string, unknown>> = (
  metadata: unknown
) => metadata is TMetadata

type MessageMetadataSchema<TMetadata extends Record<string, unknown>> =
  Record<string, unknown> | MessageMetadataValidator<TMetadata>
```

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
  onError?: (err: Error) => void
  onLoadError?: (err: Error) => void
  onClearError?: (err: Error) => void
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
    strict?: boolean
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

AI SDK-style tool helpers use these public types:

```ts
interface JsonSchemaDefinition<TInput = unknown> {
  readonly kind: 'json-schema'
  readonly schema: Record<string, unknown>
  readonly validate?: (
    value: unknown
  ) => boolean | { success: true; value: TInput } | { success: false; error: Error }
}

type ToolInputSchema<TInput = unknown> = Record<string, unknown> | JsonSchemaDefinition<TInput>

type ToolExecute<TInput = unknown, TOutput = unknown> = (
  args: TInput,
  context: ToolCallHandlerContext
) => TOutput | Promise<TOutput>

interface ToolModelOutputContext {
  toolCall: ToolCall
  message: Message
  messages: Message[]
}

type ToolModelOutput = string | ContentPart | ContentPart[] | null | undefined

interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  description?: string
  inputSchema?: ToolInputSchema<TInput>
  parameters?: Record<string, unknown>
  execute?: ToolExecute<TInput, TOutput>
  toModelOutput?: (output: TOutput, context: ToolModelOutputContext) => ToolModelOutput
  strict?: boolean
  dynamic?: boolean
}

type AnyToolDefinition = ToolDefinition<unknown, unknown>
type ToolSet = Record<string, Tool | AnyToolDefinition>
type ChatToolsInput = Tool[] | ToolSet

type InferToolInput<TTool> =
  TTool extends ToolDefinition<infer TInput, infer _TOutput> ? TInput : unknown
type InferToolOutput<TTool> =
  TTool extends ToolDefinition<infer _TInput, infer TOutput> ? Awaited<TOutput> : unknown
type InferUITools<TTools extends ToolSet> = {
  [K in keyof TTools]: {
    input: InferToolInput<TTools[K]>
    output: InferToolOutput<TTools[K]>
  }
}
type ToolHandlerFor<TTool> = (
  args: InferToolInput<TTool>,
  context: ToolCallHandlerContext
) => InferToolOutput<TTool> | Promise<InferToolOutput<TTool>>
type ToolHandlersFor<TTools extends ToolSet> = {
  [K in keyof TTools]?: ToolHandlerFor<TTools[K]>
}
```

`jsonSchema(schema)` wraps a JSON Schema for `tool({ inputSchema })` and
`useObject({ schema })`. Its optional `validate` callback accepts either a
boolean/type-guard result or the AI SDK-style `{ success, value/error }` result.
`tool()` and `dynamicTool()` return `ToolDefinition` values that
`useChat({ tools })` normalizes into provider-facing `Tool[]`; `execute`
functions are registered as local handlers. `toModelOutput` is read by
`convertToModelMessages(messages, { tools })` when tool result messages need
model-facing text or `ContentPart[]` content.

Use `defineToolHandlers(tools, handlers)` when handlers are declared outside the
tool definitions. It returns the existing `Record<string, ToolCallHandler>`
runtime shape while `ToolHandlersFor<Tools>` keeps each handler argument aligned
with its tool input type.

Tool execution callbacks use the same parsed argument snapshot as
`toolHandlers`:

```ts
interface ToolCallHandlerContext {
  toolCall: ToolCall
  messages: Message[]
  args: unknown
  context?: unknown
}

interface UIToolCall {
  toolCallId: string
  toolName: string
  input: unknown
  dynamic: boolean
}

interface ToolCallCallbackOptions {
  toolCall: UIToolCall
  messages: Message[]
  args: unknown
  context?: unknown
}

type AiSdkToolCallCallback = (options: ToolCallCallbackOptions) => void | Promise<void>
type LegacyToolCallCallback = (
  args: unknown,
  context: ToolCallHandlerContext
) => void | Promise<void>
type ToolCallCallback = AiSdkToolCallCallback | LegacyToolCallCallback

type ToolApprovalPredicate = (
  args: unknown,
  context: ToolCallHandlerContext
) => boolean | Promise<boolean>

type SendAutomaticallyWhen = (options: { messages: Message[] }) => boolean | PromiseLike<boolean>

type AiSdkSendChatTrigger = 'submit-user-message' | 'regenerate-assistant-message'

interface PrepareStepOptions {
  id: string
  messages: Message[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  request: ChatRequest
  trigger: 'submit-message' | 'regenerate-message'
  aiSdkTrigger?: AiSdkSendChatTrigger
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

Finish callbacks expose the same object shape as AI SDK UI while keeping the
legacy two-argument callback available:

```ts
interface ChatFinishInfo {
  message: Message
  messages: Message[]
  isAbort: boolean
  isError: boolean
  isDisconnect: boolean
  finishReason?: ChatChunk['finishReason']
}

type AiSdkChatFinishCallback = (options: ChatFinishInfo) => void | Promise<void>
type LegacyChatFinishCallback = (message: Message, info: ChatFinishInfo) => void | Promise<void>
type ChatFinishCallback = AiSdkChatFinishCallback | LegacyChatFinishCallback
```

Request lifecycle callbacks expose provider-agnostic snapshots:

```ts
type ChatRequestLifecycleKind = 'chat' | 'resume'

interface ChatRequestInfo {
  kind: ChatRequestLifecycleKind
  id: string
  providerId: string
  attempt: number
  request: ChatRequest | ChatResumeRequest
  messages: ChatRequestMessage[]
  requestMetadata: unknown
  body?: Record<string, unknown>
  headers?: Record<string, string>
  trigger?: 'submit-message' | 'regenerate-message'
  aiSdkTrigger?: AiSdkSendChatTrigger
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
| `messages`         | `ChatRequestMessage[]`                                                               | Provider/proxy request history.                          |
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
| `streamProtocol`   | `'ui-message' \| 'data' \| 'text'`                                                   | Chat stream protocol hint for proxy routes.              |
| `user`             | `string`                                                                             | End-user identifier for provider policy/abuse tracking.  |
| `stream`           | `boolean`                                                                            | Whether the provider should stream.                      |
| `signal`           | `AbortSignal`                                                                        | Abort signal.                                            |
| `headers`          | `HeadersInit`                                                                        | Per-request headers merged by the provider.              |

### `ChatResumeRequest`

| Field            | Type                               | Description                                              |
| ---------------- | ---------------------------------- | -------------------------------------------------------- |
| `id`             | `string`                           | Chat/session identifier used by the resume endpoint.     |
| `threadId`       | `string`                           | Backend thread id, separate from client shared state id. |
| `forwardedProps` | `Record<string, unknown>`          | App props forwarded to proxy/agent backends.             |
| `body`           | `Record<string, unknown>`          | Extra JSON body fields for provider/proxy options.       |
| `metadata`       | `unknown`                          | App-defined request metadata for proxy/backend layers.   |
| `streamProtocol` | `'ui-message' \| 'data' \| 'text'` | Stream protocol hint for app-owned resume routes.        |
| `signal`         | `AbortSignal`                      | Abort signal.                                            |
| `headers`        | `HeadersInit`                      | Per-request headers merged by the provider.              |

### `CompletionRequest`

| Field              | Type                      | Description                                        |
| ------------------ | ------------------------- | -------------------------------------------------- |
| `prompt`           | `string`                  | Prompt text.                                       |
| `body`             | `Record<string, unknown>` | Extra JSON body fields for provider/proxy options. |
| `streamProtocol`   | `'text' \| 'data'`        | Completion stream protocol hint for proxy routes.  |
| `model`            | `string`                  | Provider model id.                                 |
| `temperature`      | `number`                  | Sampling temperature.                              |
| `maxTokens`        | `number`                  | Maximum generated tokens.                          |
| `topP`             | `number`                  | Nucleus sampling value.                            |
| `frequencyPenalty` | `number`                  | Frequency penalty.                                 |
| `presencePenalty`  | `number`                  | Presence penalty.                                  |
| `stop`             | `string \| string[]`      | Stop sequence or sequences.                        |
| `stream`           | `boolean`                 | Whether the provider should stream.                |
| `signal`           | `AbortSignal`             | Abort signal.                                      |
| `headers`          | `HeadersInit`             | Per-request headers merged by the provider.        |

### `EmbeddingRequest`

| Field     | Type                      | Description                                             |
| --------- | ------------------------- | ------------------------------------------------------- |
| `input`   | `string \| string[]`      | Text or batch of texts to embed.                        |
| `body`    | `Record<string, unknown>` | Extra JSON body fields for provider/proxy options.      |
| `model`   | `string`                  | Provider model id.                                      |
| `user`    | `string`                  | End-user identifier for provider policy/abuse tracking. |
| `signal`  | `AbortSignal`             | Abort signal.                                           |
| `headers` | `HeadersInit`             | Per-request headers merged by the provider.             |

### `VideoGenerationRequest`

| Field             | Type                      | Description                                             |
| ----------------- | ------------------------- | ------------------------------------------------------- |
| `prompt`          | `string`                  | Prompt text for the generated video.                    |
| `body`            | `Record<string, unknown>` | Extra JSON body fields for app-owned backend options.   |
| `model`           | `string`                  | Video model id used by your backend.                    |
| `n`               | `number`                  | Number of videos to generate.                           |
| `aspectRatio`     | `string`                  | Aspect ratio hint such as `16:9` or `9:16`.             |
| `resolution`      | `string`                  | Resolution hint such as `1280x720`.                     |
| `size`            | `string`                  | Backend-specific size alias when a provider uses it.    |
| `duration`        | `number`                  | Requested video duration in seconds.                    |
| `fps`             | `number`                  | Requested frames per second.                            |
| `seed`            | `number`                  | Deterministic generation seed when supported.           |
| `image`           | `string`                  | Optional start image URL, data URL, or base64 payload.  |
| `frameImages`     | `VideoFrameImage[]`       | Role-tagged image inputs such as first or last frame.   |
| `inputReferences` | `string[]`                | Reference images used by providers that support them.   |
| `generateAudio`   | `boolean`                 | Whether the model should generate audio when supported. |
| `providerOptions` | `Record<string, unknown>` | Provider-specific options passed through your backend.  |
| `user`            | `string`                  | End-user identifier for provider policy/abuse tracking. |
| `signal`          | `AbortSignal`             | Abort signal.                                           |
| `headers`         | `HeadersInit`             | Per-request headers merged into the backend request.    |

```ts
interface VideoFrameImage {
  image: string
  frameType: string
}
```

### `SpeechGenerationRequest`

| Field             | Type                      | Description                                             |
| ----------------- | ------------------------- | ------------------------------------------------------- |
| `text`            | `string`                  | Text to turn into speech.                               |
| `body`            | `Record<string, unknown>` | Extra JSON body fields for app-owned backend options.   |
| `model`           | `string`                  | Speech model id used by your backend.                   |
| `voice`           | `string`                  | Voice or speaker id used by your backend/provider.      |
| `outputFormat`    | `string`                  | Audio format hint such as `mp3`, `wav`, or `ogg`.       |
| `instructions`    | `string`                  | Provider-specific speaking style or instruction text.   |
| `speed`           | `number`                  | Speaking speed when supported by the provider.          |
| `language`        | `string`                  | Language hint when supported by the provider.           |
| `providerOptions` | `Record<string, unknown>` | Provider-specific options passed through your backend.  |
| `user`            | `string`                  | End-user identifier for provider policy/abuse tracking. |
| `signal`          | `AbortSignal`             | Abort signal.                                           |
| `headers`         | `HeadersInit`             | Per-request headers merged into the backend request.    |

### `TranscriptionRequest`

| Field                    | Type                         | Description                                              |
| ------------------------ | ---------------------------- | -------------------------------------------------------- |
| `audio`                  | `string`                     | Audio URL, data URL, or base64 payload for your backend. |
| `body`                   | `Record<string, unknown>`    | Extra JSON body fields for app-owned backend options.    |
| `model`                  | `string`                     | Transcription model id used by your backend.             |
| `language`               | `string`                     | Language hint when supported by the provider.            |
| `prompt`                 | `string`                     | Optional prompt or vocabulary hint.                      |
| `temperature`            | `number`                     | Sampling temperature when supported by the provider.     |
| `timestampGranularities` | `Array<'word' \| 'segment'>` | Timestamp granularity hints.                             |
| `providerOptions`        | `Record<string, unknown>`    | Provider-specific options passed through your backend.   |
| `user`                   | `string`                     | End-user identifier for provider policy/abuse tracking.  |
| `signal`                 | `AbortSignal`                | Abort signal.                                            |
| `headers`                | `HeadersInit`                | Per-request headers merged into the backend request.     |

### `RerankRequest`

| Field             | Type                      | Description                                             |
| ----------------- | ------------------------- | ------------------------------------------------------- |
| `query`           | `string`                  | Search query or user intent used for ranking.           |
| `documents`       | `TDocument[]`             | Candidate documents to rerank.                          |
| `body`            | `Record<string, unknown>` | Extra JSON body fields for app-owned backend options.   |
| `model`           | `string`                  | Rerank model id used by your backend.                   |
| `topN`            | `number`                  | Maximum number of ranked documents to return.           |
| `providerOptions` | `Record<string, unknown>` | Provider-specific options passed through your backend.  |
| `user`            | `string`                  | End-user identifier for provider policy/abuse tracking. |
| `signal`          | `AbortSignal`             | Abort signal.                                           |
| `headers`         | `HeadersInit`             | Per-request headers merged into the backend request.    |

`body` is merged into provider/proxy JSON request bodies before the typed
request fields. If keys conflict, explicit typed fields such as `messages`,
`prompt`, `input`, `text`, `audio`, `frameImages`, `query`, `documents`,
`model`, and `stream` win.

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

interface GeneratedAudio {
  url?: string
  base64?: string
  mediaType?: string
  revisedText?: string
  durationInSeconds?: number
  metadata?: Record<string, unknown>
}

interface SpeechGenerationResult {
  audio?: GeneratedAudio
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

interface GeneratedVideo {
  url?: string
  base64?: string
  uint8Array?: Uint8Array
  mediaType?: string
  durationInSeconds?: number
  metadata?: Record<string, unknown>
}

interface VideoGenerationResult {
  video?: GeneratedVideo
  videos: GeneratedVideo[]
  model?: string
  warnings?: unknown[]
  responses?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

interface TranscriptionSegment {
  text: string
  start?: number
  end?: number
}

interface TranscriptionResult {
  text: string
  segments?: TranscriptionSegment[]
  language?: string
  durationInSeconds?: number
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}

type RerankDocument = string | Record<string, unknown>

interface RerankRankingItem<TDocument = RerankDocument> {
  index: number
  score: number
  document: TDocument
}

interface RerankResult<TDocument = RerankDocument> {
  originalDocuments: TDocument[]
  rerankedDocuments: TDocument[]
  ranking: Array<RerankRankingItem<TDocument>>
  model?: string
  warnings?: unknown[]
  providerMetadata?: Record<string, unknown>
  response?: unknown
}
```

`ChatChunk.messageId` replaces the id of the current assistant message. This is
useful when a backend or AI SDK UI message stream sends a server-authoritative
message id before the text deltas arrive.
`ChatChunk.metadata` is merged into the current assistant message metadata. AI
SDK UI stream `messageMetadata` values are normalized into this field by
`proxyProvider`.
`ChatChunk.data` is exposed through `useChat().streamData` and `onData`; pass
`useChat<TData>()` to type those custom stream data values, and pass
`dataPartSchemas` to validate them by `dataType` before UI callbacks run. Use a
stable `dataId` to replace an earlier part, and set `transient: true` for parts
that should only trigger `onData`.
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

## Inspection helpers

`classifyInspectionError(error)` turns unknown thrown values into a render-safe
`InspectionErrorSummary`:

```ts
type InspectionErrorCategory =
  | 'abort'
  | 'authentication'
  | 'authorization'
  | 'rate-limit'
  | 'timeout'
  | 'network'
  | 'provider'
  | 'validation'
  | 'unknown'

interface InspectionErrorSummary {
  category: InspectionErrorCategory
  message: string
  name?: string
  status?: number
  retryable: boolean
  hasCause: boolean
}
```

The raw `cause` is intentionally not copied into the summary. Use `hasCause` to
show that deeper diagnostics exist without rendering provider response bodies or
tenant data in a browser panel.

`inspectRequestTrace(options)` combines existing `lastRequest`, `lastResponse`,
`status`, and `error` values into one `RequestInspectionSnapshot`:

```ts
type InspectionStatus = AiRequestStatus | 'idle'

interface InspectRequestTraceOptions<TRequest = unknown, TResponse = unknown> {
  status?: InspectionStatus
  error?: unknown
  lastRequest?: TRequest | null
  lastResponse?: TResponse | null
  events?: readonly InspectionTimelineEventInput[]
  retries?: readonly InspectionRetryRecordInput[]
  curl?: boolean | InspectionCurlOptions
  now?: Date | string | number
}

type InspectionTimelineEventKind = 'request' | 'response' | 'stream' | 'retry' | 'error' | 'status'

interface InspectionTimelineEventInput {
  kind: InspectionTimelineEventKind
  label?: string
  timestamp?: Date | string | number
  attempt?: number
  status?: InspectionStatus
  category?: InspectionErrorCategory
  message?: string
  metadata?: Record<string, unknown>
}

interface InspectionRetryRecordInput {
  attempt: number
  maxRetries?: number
  delayMs?: number
  error: unknown
  timestamp?: Date | string | number
}

interface InspectionTimelineEvent extends Omit<InspectionTimelineEventInput, 'timestamp'> {
  timestamp: string
}

interface InspectionRetryRecord {
  attempt: number
  maxRetries?: number
  delayMs?: number
  error: InspectionErrorSummary
  timestamp: string
}

interface InspectionProviderTrace {
  providerId?: string
  api?: string
  attempt?: number
  trigger?: string
  aiSdkTrigger?: string
  hasStream?: boolean
  traceId?: string
  requestKeys: string[]
  responseKeys: string[]
}

interface InspectionCurlOptions {
  command?: string
  api?: string
  method?: string
  headers?: unknown
  body?: unknown
  redactHeaders?: readonly string[]
}

interface RequestInspectionSnapshot<TRequest = unknown, TResponse = unknown> {
  status: InspectionStatus
  request: TRequest | null
  response: TResponse | null
  error: InspectionErrorSummary | null
  traceId?: string
  providerId?: string
  api?: string
  attempt?: number
  trigger?: string
  aiSdkTrigger?: string
  hasRequest: boolean
  hasResponse: boolean
  hasStream?: boolean
  providerTrace: InspectionProviderTrace
  timeline: InspectionTimelineEvent[]
  retries: InspectionRetryRecord[]
  curl: string | null
  retryable: boolean
  summary: string
  timestamp: string
}
```

```ts
import { inspectRequestTrace } from 'vue-ai-hooks'

const snapshot = inspectRequestTrace({
  status: chat.status.value,
  error: chat.error.value,
  lastRequest: chat.lastRequest.value,
  lastResponse: chat.lastResponse.value
})
```

Set `curl: true` to include a copyable request command with sensitive headers
redacted. `createInspectionCurl(request, options?)` is also exported for
standalone panels that only need the curl command.

## Retry options

`UseChatOptions`, `UseCompletionOptions`, `UseEmbeddingOptions`,
`UseRerankOptions`, and `UseObjectOptions` all include these retry controls:

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

interface CreateIdGeneratorOptions {
  prefix?: string
  separator?: string
  size?: number
  alphabet?: string
}
```

`UseChatOptions.generateId` uses this type to override generated chat, message,
tool result, and stream data ids. `UseObjectOptions.generateId` uses it for
prompt messages created from string prompts. Explicit ids supplied by the caller
are preserved.

`generateId(prefix?)` is the default dependency-free generator. It creates a
16-character random suffix and adds the runtime prefix when one is supplied:

```ts
import { createIdGenerator, generateId } from 'vue-ai-hooks'

generateId('user') // user-...

const createTraceId = createIdGenerator({
  prefix: 'trace',
  size: 24
})

createTraceId() // trace-...
```

`createIdGenerator(options?)` accepts `prefix`, `separator`, `size`, and
`alphabet`. A configured `prefix` is fixed for that generator; otherwise the
runtime prefix passed by composables is used.

## Chat history updates

```ts
type SetMessagesInput = Message[] | ((messages: Message[]) => Message[])
```

`useChat().setMessages()` accepts this type for local history replacement or
optimistic updates.

## Message pruning

```ts
type PruneToolCallsStrategy =
  'none' | 'all' | 'before-last-message' | `before-last-${number}-messages`

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
