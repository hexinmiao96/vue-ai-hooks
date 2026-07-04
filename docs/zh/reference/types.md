# 公共类型

这些是 `vue-ai-hooks` 导出的、与具体 Provider 无关的请求、响应、消息和错误类型。

## 消息

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

| 类型           | 结构                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| `TextPart`     | `{ type: 'text'; text: string }`                                                        |
| `ImageUrlPart` | `{ type: 'image_url'; image_url: { url: string; detail?: 'low' \| 'high' \| 'auto' } }` |

`ChatAttachmentsInput` 是 `append(message, { attachments })` 接收的文件输入类型。
它支持浏览器 `File`，也支持预加载的 `ChatFileAttachment` 对象。`useChat`
会在发送 Provider 请求前，把支持的文件转换成 `ContentPart[]`。

assistant 消息也可以暴露结构化 UI parts：

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

`Message.parts` 是可选字段，`content` 仍保持向后兼容。它为 Vue UI 提供可以直接渲染的
text、reasoning、source、file、自定义 data 和 `tool-*` 状态，避免从 assistant 文本里再解析结构。

`getToolRenderParts()` 会从 `Message.parts`、assistant `toolCalls`、`role: 'tool'`
结果消息，以及可选 pending tool calls 中推导稳定的工具渲染行：

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

如果需要 AI SDK UI 风格的端到端类型，可以用 `UIMessage` 把 message metadata、自定义
data parts 和推断出的 tools 组合起来：

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

应用需要强类型渲染 parts，但不想接入 UI framework 时，可以把
`UIMessage<Metadata, DataParts, InferUITools<typeof tools>>` 和
`dataPartSchemas`、`messageMetadataSchema`、`defineToolHandlers()` 放在一起使用。

审批按钮或手动结果表单可以渲染 `ToolRenderPart.status === 'awaitingAction'` 的行；
已完成和失败的工具时间线则分别渲染 `status === 'complete'` 或 `'error'`。

`convertToModelMessages(messages, options?)` 返回面向 provider/model 的消息，
不会包含 UI-only 的 `parts`。它默认移除 `id` 和 `createdAt`，如果后端需要稳定链路字段也可以显式保留：

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

`ChatRequestMessage` 是 provider 和 proxy 请求接收的消息类型。UI 状态仍使用完整
`Message[]`，而 `prepareSendMessagesRequest` 可以返回
`convertToModelMessages()` 生成的 `ModelMessage[]`。

`append(message, { messageMetadata })` 会把 metadata 写到用户消息上，请求级
`metadata` 仍然保留在 `ChatRequest`。`useChat()` 可以用 JSON Schema 子集或自定义
predicate 校验消息 metadata：

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

`SerializedMessage` 是 `serializeMessages(messages)` 返回的 JSON-safe 结构：

```ts
type SerializedMessage = Omit<Message, 'createdAt'> & {
  createdAt?: string
}
```

`useChat({ persist })` 接收 `ChatPersistOptions`：

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

默认聊天持久化会使用 `serializeMessages()` 和 `deserializeMessages()`，所以
`createdAt` 经过 JSON 存储后，恢复时仍会是 `Date`。

## 工具

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

`parameters` 是 OpenAI-compatible JSON Schema 对象。`arguments` 是模型返回的原始 JSON 字符串。

AI SDK 风格工具 helper 使用这些公开类型：

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

`jsonSchema(schema)` 会把 JSON Schema 包装给 `tool({ inputSchema })` 和
`useObject({ schema })` 使用。可选的 `validate` 回调可以返回 boolean/type guard
结果，也可以返回 AI SDK 风格的 `{ success, value/error }` 结果。`tool()` 和
`dynamicTool()` 返回的 `ToolDefinition` 会由 `useChat({ tools })` 归一化成
Provider 侧的 `Tool[]`；其中的 `execute` 会注册成本地 handler。tool result
消息需要转换成模型可读文本或 `ContentPart[]` 时，`convertToModelMessages(messages, {
tools })` 会读取 `toModelOutput`。

handler 不写在工具定义里时，可以用 `defineToolHandlers(tools, handlers)`。它在运行时仍返回现有
`Record<string, ToolCallHandler>` 形态，同时用 `ToolHandlersFor<Tools>` 让每个
handler 参数跟对应工具 input 类型保持一致。

工具执行回调使用和 `toolHandlers` 相同的已解析参数快照：

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

`ToolApprovalPredicate` 会让匹配到的本地 handler 暂停，直到 UI 调用
`approveToolCall()` 或 `rejectToolCall()`。`messages` 是当前历史的浅拷贝快照。
`context` 是客户端本地的 `useChat({ context })` 值，不会序列化进 provider request。
`resultMessage` 是继续下一轮模型请求前将追加的 `tool` 消息。

`SendAutomaticallyWhen` 用于控制工具结果齐备后是否发起下一轮 provider 请求。
`lastAssistantMessageIsCompleteWithToolCalls` 是默认 helper。

`PrepareStep` 用于自定义每个 assistant 步骤的请求。`stepNumber` 从 `0`
开始；准备工具结果后的续跑请求时，`toolCalls` 会包含最新 assistant 步骤的工具调用。

完成回调暴露 AI SDK UI 风格的对象形态，同时保留旧的双参数回调：

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

请求生命周期回调会暴露与 Provider 无关的请求快照：

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

`onRequest` 会在请求准备完成、Provider adapter 执行前收到 `ChatRequestInfo`。
`onResponse` 会在 adapter 返回后收到 `ChatResponseInfo`，其中 `hasStream`
表示本次是否有可消费的 stream。

## ID

```ts
type IdGenerator = (prefix?: string) => string
```

`useChat`、`useCompletion` 和 `useObject` 都支持 `generateId`，适合 SSR、测试、
持久化或后端链路追踪需要稳定 id 的场景。`useCompletion({ id })` 还会用这个 id
在多个组件之间共享补全状态。

## 结构化输出

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

`useObject` 会自动构造这个格式。你也可以在调用 `useChat` 或 provider 方法时，直接通过
`ChatRequest.responseFormat` 传入。

`useObject.partialObject` 会在结构化 JSON 流尚未完整时使用 `DeepPartial<T>`：

```ts
type DeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? DeepPartial<U>[]
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T
```

## 请求

### `ChatRequest`

| 字段               | 类型                                                                                 | 说明                                             |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| `id`               | `string`                                                                             | Provider 或代理层使用的 chat/session 标识。      |
| `threadId`         | `string`                                                                             | 和客户端共享状态 id 分离的后端 thread id。       |
| `messages`         | `ChatRequestMessage[]`                                                               | Provider/proxy 请求历史。                        |
| `forwardedProps`   | `Record<string, unknown>`                                                            | 转发给 proxy/agent 后端的应用上下文 props。      |
| `body`             | `Record<string, unknown>`                                                            | 额外 JSON body 字段，用于 Provider/代理选项。    |
| `model`            | `string`                                                                             | Provider 模型 ID。                               |
| `temperature`      | `number`                                                                             | 采样温度。                                       |
| `maxTokens`        | `number`                                                                             | 最大生成 token 数。                              |
| `topP`             | `number`                                                                             | nucleus sampling 参数。                          |
| `frequencyPenalty` | `number`                                                                             | frequency penalty。                              |
| `presencePenalty`  | `number`                                                                             | presence penalty。                               |
| `stop`             | `string \| string[]`                                                                 | 停止序列。                                       |
| `tools`            | `Tool[]`                                                                             | 模型可调用的函数工具。                           |
| `activeTools`      | `string[]`                                                                           | 从已解析工具列表中保留的函数工具名。             |
| `toolChoice`       | `'auto' \| 'none' \| 'required' \| { type: 'function'; function: { name: string } }` | 工具选择策略。                                   |
| `responseFormat`   | `ResponseFormat`                                                                     | 兼容 Provider 使用的结构化输出格式。             |
| `metadata`         | `unknown`                                                                            | 应用自定义的请求 metadata，通常给代理/后端使用。 |
| `streamProtocol`   | `'ui-message' \| 'data' \| 'text'`                                                   | proxy 路由使用的 chat stream protocol 提示。     |
| `user`             | `string`                                                                             | 用于 Provider 策略或风控的终端用户标识。         |
| `stream`           | `boolean`                                                                            | 是否要求 Provider 流式返回。                     |
| `signal`           | `AbortSignal`                                                                        | 中止信号。                                       |
| `headers`          | `HeadersInit`                                                                        | Provider 合并的单次请求 headers。                |

### `ChatResumeRequest`

| 字段             | 类型                               | 说明                                             |
| ---------------- | ---------------------------------- | ------------------------------------------------ |
| `id`             | `string`                           | 恢复端点使用的 chat/session 标识。               |
| `threadId`       | `string`                           | 和客户端共享状态 id 分离的后端 thread id。       |
| `forwardedProps` | `Record<string, unknown>`          | 转发给 proxy/agent 后端的应用上下文 props。      |
| `body`           | `Record<string, unknown>`          | 额外 JSON body 字段，用于 Provider/代理选项。    |
| `metadata`       | `unknown`                          | 应用自定义的请求 metadata，通常给代理/后端使用。 |
| `streamProtocol` | `'ui-message' \| 'data' \| 'text'` | 应用自有恢复流路由使用的协议提示。               |
| `signal`         | `AbortSignal`                      | 中止信号。                                       |
| `headers`        | `HeadersInit`                      | Provider 合并的单次请求 headers。                |

### `CompletionRequest`

| 字段               | 类型                      | 说明                                               |
| ------------------ | ------------------------- | -------------------------------------------------- |
| `prompt`           | `string`                  | Prompt 文本。                                      |
| `body`             | `Record<string, unknown>` | 额外 JSON body 字段，用于 Provider/代理选项。      |
| `streamProtocol`   | `'text' \| 'data'`        | proxy 路由使用的 completion stream protocol 提示。 |
| `model`            | `string`                  | Provider 模型 ID。                                 |
| `temperature`      | `number`                  | 采样温度。                                         |
| `maxTokens`        | `number`                  | 最大生成 token 数。                                |
| `topP`             | `number`                  | nucleus sampling 参数。                            |
| `frequencyPenalty` | `number`                  | frequency penalty。                                |
| `presencePenalty`  | `number`                  | presence penalty。                                 |
| `stop`             | `string \| string[]`      | 停止序列。                                         |
| `stream`           | `boolean`                 | 是否要求 Provider 流式返回。                       |
| `signal`           | `AbortSignal`             | 中止信号。                                         |
| `headers`          | `HeadersInit`             | Provider 合并的单次请求 headers。                  |

### `EmbeddingRequest`

| 字段      | 类型                      | 说明                                          |
| --------- | ------------------------- | --------------------------------------------- |
| `input`   | `string \| string[]`      | 要生成 embedding 的文本或文本批次。           |
| `body`    | `Record<string, unknown>` | 额外 JSON body 字段，用于 Provider/代理选项。 |
| `model`   | `string`                  | Provider 模型 ID。                            |
| `user`    | `string`                  | 用于 Provider 策略或风控的终端用户标识。      |
| `signal`  | `AbortSignal`             | 中止信号。                                    |
| `headers` | `HeadersInit`             | Provider 合并的单次请求 headers。             |

### `VideoGenerationRequest`

| 字段              | 类型                      | 说明                                         |
| ----------------- | ------------------------- | -------------------------------------------- |
| `prompt`          | `string`                  | 视频生成提示词。                             |
| `body`            | `Record<string, unknown>` | 传给应用自有后端选项的额外 JSON body 字段。  |
| `model`           | `string`                  | 后端使用的视频模型 id。                      |
| `n`               | `number`                  | 要生成的视频数量。                           |
| `aspectRatio`     | `string`                  | 宽高比提示，例如 `16:9` 或 `9:16`。          |
| `resolution`      | `string`                  | 分辨率提示，例如 `1280x720`。                |
| `size`            | `string`                  | provider 使用 size 命名时的后端特定别名。    |
| `duration`        | `number`                  | 请求的视频时长，单位秒。                     |
| `fps`             | `number`                  | 请求的每秒帧数。                             |
| `seed`            | `number`                  | provider 支持时的确定性生成 seed。           |
| `image`           | `string`                  | 可选起始图像 URL、data URL 或 base64。       |
| `frameImages`     | `VideoFrameImage[]`       | 带角色的图像输入，例如首帧或尾帧。           |
| `inputReferences` | `string[]`                | 支持参考图的 provider 使用的参考图像。       |
| `generateAudio`   | `boolean`                 | provider 支持时是否同时生成音频。            |
| `providerOptions` | `Record<string, unknown>` | 透传给后端的 provider 特定选项。             |
| `user`            | `string`                  | 传给 provider 用于策略或风控的终端用户标识。 |
| `signal`          | `AbortSignal`             | 中止信号。                                   |
| `headers`         | `HeadersInit`             | 合并到后端请求中的单次请求 headers。         |

```ts
interface VideoFrameImage {
  image: string
  frameType: string
}
```

### `SpeechGenerationRequest`

| 字段              | 类型                      | 说明                                        |
| ----------------- | ------------------------- | ------------------------------------------- |
| `text`            | `string`                  | 要转成语音的文本。                          |
| `body`            | `Record<string, unknown>` | 应用自有后端选项使用的额外 JSON body 字段。 |
| `model`           | `string`                  | 你的后端使用的语音模型 ID。                 |
| `voice`           | `string`                  | 后端或 Provider 使用的音色或说话人 ID。     |
| `outputFormat`    | `string`                  | `mp3`、`wav` 或 `ogg` 这类音频格式提示。    |
| `instructions`    | `string`                  | Provider 专属朗读风格或指令文本。           |
| `speed`           | `number`                  | Provider 支持时的语速。                     |
| `language`        | `string`                  | Provider 支持时的语言提示。                 |
| `providerOptions` | `Record<string, unknown>` | 透传给后端的 Provider 专属选项。            |
| `user`            | `string`                  | 用于 Provider 策略或风控的终端用户标识。    |
| `signal`          | `AbortSignal`             | 中止信号。                                  |
| `headers`         | `HeadersInit`             | 合并进后端请求的单次 headers。              |

### `TranscriptionRequest`

| 字段                     | 类型                         | 说明                                           |
| ------------------------ | ---------------------------- | ---------------------------------------------- |
| `audio`                  | `string`                     | 你的后端可理解的音频 URL、data URL 或 base64。 |
| `body`                   | `Record<string, unknown>`    | 应用自有后端选项使用的额外 JSON body 字段。    |
| `model`                  | `string`                     | 你的后端使用的转写模型 ID。                    |
| `language`               | `string`                     | Provider 支持时的语言提示。                    |
| `prompt`                 | `string`                     | 可选的提示词或专有词汇提示。                   |
| `temperature`            | `number`                     | Provider 支持时的采样温度。                    |
| `timestampGranularities` | `Array<'word' \| 'segment'>` | 时间戳粒度提示。                               |
| `providerOptions`        | `Record<string, unknown>`    | 透传给后端的 Provider 专属选项。               |
| `user`                   | `string`                     | 用于 Provider 策略或风控的终端用户标识。       |
| `signal`                 | `AbortSignal`                | 中止信号。                                     |
| `headers`                | `HeadersInit`                | 合并进后端请求的单次 headers。                 |

### `RerankRequest`

| 字段              | 类型                      | 说明                                        |
| ----------------- | ------------------------- | ------------------------------------------- |
| `query`           | `string`                  | 用于排序的搜索查询或用户意图。              |
| `documents`       | `TDocument[]`             | 待重排的候选文档。                          |
| `body`            | `Record<string, unknown>` | 应用自有后端选项使用的额外 JSON body 字段。 |
| `model`           | `string`                  | 你的后端使用的重排模型 ID。                 |
| `topN`            | `number`                  | 最多返回多少条已排序文档。                  |
| `providerOptions` | `Record<string, unknown>` | 透传给后端的 Provider 专属选项。            |
| `user`            | `string`                  | 用于 Provider 策略或风控的终端用户标识。    |
| `signal`          | `AbortSignal`             | 中止信号。                                  |
| `headers`         | `HeadersInit`             | 合并进后端请求的单次 headers。              |

`body` 会先合并进 Provider/代理的 JSON 请求体，然后再写入 typed request 字段。
如果 key 冲突，`messages`、`prompt`、`input`、`text`、`audio`、`frameImages`、
`query`、`documents`、`model`、`stream` 这类显式字段优先。

## 响应

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

`ChatChunk.messageId` 会替换当前 assistant 消息的 id。后端或 AI SDK UI message
stream 在文本 delta 到达前下发服务端权威 message id 时，可以用它保持持久化和续跑的一致性。
`ChatChunk.metadata` 会合并到当前 assistant 消息的 metadata。`proxyProvider`
会把 AI SDK UI stream 的 `messageMetadata` 归一化到这个字段。`ChatChunk.data`
会通过 `useChat().streamData` 和 `onData` 暴露；传入 `useChat<TData>()` 可以给这些
自定义流数据加类型，也可以传入 `dataPartSchemas` 按 `dataType` 在 UI 回调前校验。
使用稳定的 `dataId` 可以替换之前的片段，设置 `transient: true` 则只触发 `onData`、
不写入 `streamData`。
`ChatChunk.parts` 会合并进 assistant 的 `Message.parts`，并和文本 delta、自定义 data
parts、累积后的工具调用状态一起维护。

## `AiHooksError`

```ts
class AiHooksError extends Error {
  readonly cause?: unknown
  readonly status?: number
}
```

当 Provider 或组合式函数能附带有用的 HTTP status 或上游响应体时，会使用 `AiHooksError`。可用时，原始上游响应会存放在 `cause`。

需要读取传输层细节时，用普通的 `instanceof` 判断：

```ts
import { AiHooksError } from 'vue-ai-hooks'

try {
  // 调用 append()、complete()、embed() 或 provider 方法
} catch (error) {
  if (error instanceof AiHooksError) {
    console.error(error.status)
    console.error(error.cause)
  }

  throw error
}
```

`status` 适合用于 HTTP 相关的重试或用户提示决策。`cause` 只建议用于诊断，因为
Provider 可能会把原始上游响应体放在这里。

## 调试检查 helper

`classifyInspectionError(error)` 会把未知抛出值转换成适合界面渲染的
`InspectionErrorSummary`：

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

原始 `cause` 不会被复制进 summary。可以用 `hasCause` 告诉调试面板存在更深层诊断信息，
但不要在浏览器里直接渲染 Provider 响应体或租户数据。

`inspectRequestTrace(options)` 会把现有的 `lastRequest`、`lastResponse`、`status`
和 `error` 合成一个 `RequestInspectionSnapshot`：

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

返回 snapshot 前，`request`、`response` 和 timeline `metadata` 都会经过调试脱敏复制。
敏感 header 以及 `apiKey`、`accessToken`、`clientSecret`、`password`、`privateKey`、
`sessionToken` 等常见凭据字段会替换成 `"[redacted]"`，不会修改原始请求 metadata。

设置 `curl: true` 后，snapshot 会带一个敏感 header 和凭据形态 body 字段已脱敏的可复制请求命令。
`redactHeaders` 可以自定义 curl 命令里的 header 脱敏名单；snapshot 本身仍会应用内置的凭据字段脱敏。
如果调试面板只需要 curl 命令，也可以直接使用导出的 `createInspectionCurl(request, options?)`。

## 重试选项

`UseChatOptions`、`UseCompletionOptions`、`UseEmbeddingOptions`、
`UseRerankOptions` 和 `UseObjectOptions` 都包含以下重试控制：

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

`attempt` 从 1 开始，表示初始 Provider 调用之后的第几次重试。`maxRetries`
默认是 `0`。没有自定义 `shouldRetry` 时，类似网络错误的异常，以及 HTTP
`408`、`409`、`425`、`429` 和 `5xx` 状态会被视为可重试。

## 流式更新节流选项

`UseChatOptions`、`UseCompletionOptions` 和 `UseObjectOptions` 也包含流式更新节流控制：

```ts
interface StreamThrottleOptions {
  throttleMs?: number
  experimental_throttle?: number
}
```

`throttleMs` 会在高频流式响应中批量刷新响应式 ref。请求 Promise resolve
前一定会刷新最终状态。`experimental_throttle` 是 AI SDK 风格兼容别名，新代码
建议使用 `throttleMs`。

## ID 生成

```ts
type IdGenerator = (prefix?: string) => string

interface CreateIdGeneratorOptions {
  prefix?: string
  separator?: string
  size?: number
  alphabet?: string
}
```

`UseChatOptions.generateId` 使用该类型覆盖自动生成的 chat、message、tool result
和 stream data id。`UseObjectOptions.generateId` 会用于从字符串 prompt 创建的
message。调用方显式提供的 id 会被保留。

`generateId(prefix?)` 是默认的无依赖生成器。它会生成 16 位随机后缀，并在传入
runtime prefix 时添加前缀：

```ts
import { createIdGenerator, generateId } from 'vue-ai-hooks'

generateId('user') // user-...

const createTraceId = createIdGenerator({
  prefix: 'trace',
  size: 24
})

createTraceId() // trace-...
```

`createIdGenerator(options?)` 支持 `prefix`、`separator`、`size` 和 `alphabet`。
配置了 `prefix` 时，该生成器会固定使用这个前缀；否则会使用 composable 传入的
runtime prefix。

## 聊天历史更新

```ts
type SetMessagesInput = Message[] | ((messages: Message[]) => Message[])
```

`useChat().setMessages()` 使用这个类型来支持本地历史替换或乐观更新。

## 消息裁剪

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

`pruneMessages()` 使用 `PruneMessagesOptions` 在 provider request 前裁剪长历史，
包括历史 reasoning parts，以及全局或指定工具的细节。
