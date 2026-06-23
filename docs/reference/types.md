# Public types

These are the provider-agnostic request, response, message, and error contracts
exported from `vue-ai-hooks`.

## Messages

```ts
type MessageRole = 'system' | 'user' | 'assistant' | 'tool'
type MessageContent = string | ContentPart[]
type ContentPart = TextPart | ImageUrlPart
```

| Type           | Shape                                                                                   |
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

## Requests

### `ChatRequest`

| Field              | Type                                                                                 | Description                                             |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `messages`         | `Message[]`                                                                          | Conversation history.                                   |
| `model`            | `string`                                                                             | Provider model id.                                      |
| `temperature`      | `number`                                                                             | Sampling temperature.                                   |
| `maxTokens`        | `number`                                                                             | Maximum generated tokens.                               |
| `topP`             | `number`                                                                             | Nucleus sampling value.                                 |
| `frequencyPenalty` | `number`                                                                             | Frequency penalty.                                      |
| `presencePenalty`  | `number`                                                                             | Presence penalty.                                       |
| `stop`             | `string \| string[]`                                                                 | Stop sequence or sequences.                             |
| `tools`            | `Tool[]`                                                                             | Function tools the model may call.                      |
| `toolChoice`       | `'auto' \| 'none' \| 'required' \| { type: 'function'; function: { name: string } }` | Tool choice policy.                                     |
| `user`             | `string`                                                                             | End-user identifier for provider policy/abuse tracking. |
| `stream`           | `boolean`                                                                            | Whether the provider should stream.                     |
| `signal`           | `AbortSignal`                                                                        | Abort signal.                                           |
| `headers`          | `Record<string, string>`                                                             | Per-request headers merged by the provider.             |

### `CompletionRequest`

| Field              | Type                     | Description                                 |
| ------------------ | ------------------------ | ------------------------------------------- |
| `prompt`           | `string`                 | Prompt text.                                |
| `model`            | `string`                 | Provider model id.                          |
| `temperature`      | `number`                 | Sampling temperature.                       |
| `maxTokens`        | `number`                 | Maximum generated tokens.                   |
| `topP`             | `number`                 | Nucleus sampling value.                     |
| `frequencyPenalty` | `number`                 | Frequency penalty.                          |
| `presencePenalty`  | `number`                 | Presence penalty.                           |
| `stop`             | `string \| string[]`     | Stop sequence or sequences.                 |
| `stream`           | `boolean`                | Whether the provider should stream.         |
| `signal`           | `AbortSignal`            | Abort signal.                               |
| `headers`          | `Record<string, string>` | Per-request headers merged by the provider. |

### `EmbeddingRequest`

| Field     | Type                     | Description                                             |
| --------- | ------------------------ | ------------------------------------------------------- |
| `input`   | `string \| string[]`     | Text or batch of texts to embed.                        |
| `model`   | `string`                 | Provider model id.                                      |
| `user`    | `string`                 | End-user identifier for provider policy/abuse tracking. |
| `signal`  | `AbortSignal`            | Abort signal.                                           |
| `headers` | `Record<string, string>` | Per-request headers merged by the provider.             |

## Responses

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
