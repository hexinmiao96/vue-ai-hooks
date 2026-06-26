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

工具执行回调使用和 `toolHandlers` 相同的已解析参数快照：

```ts
interface ToolCallHandlerContext {
  toolCall: ToolCall
  messages: Message[]
  args: unknown
}

type ToolApprovalPredicate = (
  args: unknown,
  context: ToolCallHandlerContext
) => boolean | Promise<boolean>

type SendAutomaticallyWhen = (options: { messages: Message[] }) => boolean | PromiseLike<boolean>

interface ToolResultHandlerContext extends ToolCallHandlerContext {
  resultMessage: Message
}
```

`ToolApprovalPredicate` 会让匹配到的本地 handler 暂停，直到 UI 调用
`approveToolCall()` 或 `rejectToolCall()`。`messages` 是当前历史的浅拷贝快照。
`resultMessage` 是继续下一轮模型请求前将追加的 `tool` 消息。

`SendAutomaticallyWhen` 用于控制工具结果齐备后是否发起下一轮 provider 请求。
`lastAssistantMessageIsCompleteWithToolCalls` 是默认 helper。

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
| `messages`         | `Message[]`                                                                          | 对话历史。                                       |
| `body`             | `Record<string, unknown>`                                                            | 额外 JSON body 字段，用于 Provider/代理选项。    |
| `model`            | `string`                                                                             | Provider 模型 ID。                               |
| `temperature`      | `number`                                                                             | 采样温度。                                       |
| `maxTokens`        | `number`                                                                             | 最大生成 token 数。                              |
| `topP`             | `number`                                                                             | nucleus sampling 参数。                          |
| `frequencyPenalty` | `number`                                                                             | frequency penalty。                              |
| `presencePenalty`  | `number`                                                                             | presence penalty。                               |
| `stop`             | `string \| string[]`                                                                 | 停止序列。                                       |
| `tools`            | `Tool[]`                                                                             | 模型可调用的函数工具。                           |
| `toolChoice`       | `'auto' \| 'none' \| 'required' \| { type: 'function'; function: { name: string } }` | 工具选择策略。                                   |
| `responseFormat`   | `ResponseFormat`                                                                     | 兼容 Provider 使用的结构化输出格式。             |
| `metadata`         | `unknown`                                                                            | 应用自定义的请求 metadata，通常给代理/后端使用。 |
| `user`             | `string`                                                                             | 用于 Provider 策略或风控的终端用户标识。         |
| `stream`           | `boolean`                                                                            | 是否要求 Provider 流式返回。                     |
| `signal`           | `AbortSignal`                                                                        | 中止信号。                                       |
| `headers`          | `Record<string, string>`                                                             | Provider 合并的单次请求 headers。                |

### `ChatResumeRequest`

| 字段       | 类型                      | 说明                                             |
| ---------- | ------------------------- | ------------------------------------------------ |
| `id`       | `string`                  | 恢复端点使用的 chat/session 标识。               |
| `body`     | `Record<string, unknown>` | 额外 JSON body 字段，用于 Provider/代理选项。    |
| `metadata` | `unknown`                 | 应用自定义的请求 metadata，通常给代理/后端使用。 |
| `signal`   | `AbortSignal`             | 中止信号。                                       |
| `headers`  | `Record<string, string>`  | Provider 合并的单次请求 headers。                |

### `CompletionRequest`

| 字段               | 类型                      | 说明                                          |
| ------------------ | ------------------------- | --------------------------------------------- |
| `prompt`           | `string`                  | Prompt 文本。                                 |
| `body`             | `Record<string, unknown>` | 额外 JSON body 字段，用于 Provider/代理选项。 |
| `model`            | `string`                  | Provider 模型 ID。                            |
| `temperature`      | `number`                  | 采样温度。                                    |
| `maxTokens`        | `number`                  | 最大生成 token 数。                           |
| `topP`             | `number`                  | nucleus sampling 参数。                       |
| `frequencyPenalty` | `number`                  | frequency penalty。                           |
| `presencePenalty`  | `number`                  | presence penalty。                            |
| `stop`             | `string \| string[]`      | 停止序列。                                    |
| `stream`           | `boolean`                 | 是否要求 Provider 流式返回。                  |
| `signal`           | `AbortSignal`             | 中止信号。                                    |
| `headers`          | `Record<string, string>`  | Provider 合并的单次请求 headers。             |

### `EmbeddingRequest`

| 字段      | 类型                      | 说明                                          |
| --------- | ------------------------- | --------------------------------------------- |
| `input`   | `string \| string[]`      | 要生成 embedding 的文本或文本批次。           |
| `body`    | `Record<string, unknown>` | 额外 JSON body 字段，用于 Provider/代理选项。 |
| `model`   | `string`                  | Provider 模型 ID。                            |
| `user`    | `string`                  | 用于 Provider 策略或风控的终端用户标识。      |
| `signal`  | `AbortSignal`             | 中止信号。                                    |
| `headers` | `Record<string, string>`  | Provider 合并的单次请求 headers。             |

`body` 会先合并进 Provider/代理的 JSON 请求体，然后再写入 typed request 字段。
如果 key 冲突，`messages`、`prompt`、`input`、`model`、`stream` 这类显式字段优先。

## 响应

```ts
type AiRequestStatus = 'ready' | 'submitted' | 'streaming' | 'error'

interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

interface StreamDataPart {
  id: string
  data: unknown
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

`ChatChunk.messageId` 会替换当前 assistant 消息的 id。后端或 AI SDK UI message
stream 在文本 delta 到达前下发服务端权威 message id 时，可以用它保持持久化和续跑的一致性。
`ChatChunk.metadata` 会合并到当前 assistant 消息的 metadata。`proxyProvider`
会把 AI SDK UI stream 的 `messageMetadata` 归一化到这个字段。`ChatChunk.data`
会通过 `useChat().streamData` 和 `onData` 暴露；使用稳定的 `dataId` 可以替换之前的片段，设置
`transient: true` 则只触发 `onData`、不写入 `streamData`。
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

## 重试选项

`UseChatOptions`、`UseCompletionOptions`、`UseEmbeddingOptions` 和
`UseObjectOptions` 都包含以下重试控制：

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
```

`UseChatOptions.generateId` 使用该类型覆盖自动生成的 chat、message、tool result
和 stream data id。`UseObjectOptions.generateId` 会用于从字符串 prompt 创建的
message。调用方显式提供的 id 会被保留。

## 聊天历史更新

```ts
type SetMessagesInput = Message[] | ((messages: Message[]) => Message[])
```

`useChat().setMessages()` 使用这个类型来支持本地历史替换或乐观更新。

## 消息裁剪

```ts
type PruneToolCallsStrategy =
  | 'none'
  | 'all'
  | 'before-last-message'
  | `before-last-${number}-messages`

type PruneReasoningStrategy = PruneToolCallsStrategy

interface PruneMessagesOptions {
  messages: Message[]
  maxMessages?: number
  keepSystem?: boolean
  emptyMessages?: 'keep' | 'remove'
  toolCalls?: PruneToolCallsStrategy
  reasoning?: PruneReasoningStrategy
}
```

`pruneMessages()` 使用 `PruneMessagesOptions` 在 provider request 前裁剪长历史，
包括历史 reasoning parts 和工具细节。
