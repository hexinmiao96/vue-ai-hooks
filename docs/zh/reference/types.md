# 公共类型

这些是 `vue-ai-hooks` 导出的、与具体 Provider 无关的请求、响应、消息和错误类型。

## 消息

```ts
type MessageRole = 'system' | 'user' | 'assistant' | 'tool'
type MessageContent = string | ContentPart[]
type ContentPart = TextPart | ImageUrlPart
```

| 类型           | 结构                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| `TextPart`     | `{ type: 'text'; text: string }`                                                        |
| `ImageUrlPart` | `{ type: 'image_url'; image_url: { url: string; detail?: 'low' \| 'high' \| 'auto' } }` |

```ts
interface Message {
  id: string
  role: MessageRole
  content: MessageContent
  name?: string
  toolCallId?: string
  toolCalls?: ToolCall[]
  createdAt?: Date
  metadata?: Record<string, unknown>
}
```

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

## 请求

### `ChatRequest`

| 字段               | 类型                                                                                 | 说明                                     |
| ------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| `messages`         | `Message[]`                                                                          | 对话历史。                               |
| `model`            | `string`                                                                             | Provider 模型 ID。                       |
| `temperature`      | `number`                                                                             | 采样温度。                               |
| `maxTokens`        | `number`                                                                             | 最大生成 token 数。                      |
| `topP`             | `number`                                                                             | nucleus sampling 参数。                  |
| `frequencyPenalty` | `number`                                                                             | frequency penalty。                      |
| `presencePenalty`  | `number`                                                                             | presence penalty。                       |
| `stop`             | `string \| string[]`                                                                 | 停止序列。                               |
| `tools`            | `Tool[]`                                                                             | 模型可调用的函数工具。                   |
| `toolChoice`       | `'auto' \| 'none' \| 'required' \| { type: 'function'; function: { name: string } }` | 工具选择策略。                           |
| `user`             | `string`                                                                             | 用于 Provider 策略或风控的终端用户标识。 |
| `stream`           | `boolean`                                                                            | 是否要求 Provider 流式返回。             |
| `signal`           | `AbortSignal`                                                                        | 中止信号。                               |
| `headers`          | `Record<string, string>`                                                             | Provider 合并的单次请求 headers。        |

### `CompletionRequest`

| 字段               | 类型                     | 说明                              |
| ------------------ | ------------------------ | --------------------------------- |
| `prompt`           | `string`                 | Prompt 文本。                     |
| `model`            | `string`                 | Provider 模型 ID。                |
| `temperature`      | `number`                 | 采样温度。                        |
| `maxTokens`        | `number`                 | 最大生成 token 数。               |
| `topP`             | `number`                 | nucleus sampling 参数。           |
| `frequencyPenalty` | `number`                 | frequency penalty。               |
| `presencePenalty`  | `number`                 | presence penalty。                |
| `stop`             | `string \| string[]`     | 停止序列。                        |
| `stream`           | `boolean`                | 是否要求 Provider 流式返回。      |
| `signal`           | `AbortSignal`            | 中止信号。                        |
| `headers`          | `Record<string, string>` | Provider 合并的单次请求 headers。 |

### `EmbeddingRequest`

| 字段      | 类型                     | 说明                                     |
| --------- | ------------------------ | ---------------------------------------- |
| `input`   | `string \| string[]`     | 要生成 embedding 的文本或文本批次。      |
| `model`   | `string`                 | Provider 模型 ID。                       |
| `user`    | `string`                 | 用于 Provider 策略或风控的终端用户标识。 |
| `signal`  | `AbortSignal`            | 中止信号。                               |
| `headers` | `Record<string, string>` | Provider 合并的单次请求 headers。        |

## 响应

```ts
interface ChatChunk {
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
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
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
