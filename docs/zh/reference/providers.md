# Provider

Provider 工厂会创建 `useChat`、`useCompletion` 和 `useEmbedding` 使用的
`ChatProvider` 对象。

集成示例请看 Provider 指南；如果需要精确配置项，请看本页。

公开 TypeScript 配置类型：`OpenAiLikeConfig`、`OpenRouterConfig` 和
`AnthropicConfig`。

## `ChatProvider`

```ts
interface ChatProvider {
  readonly id: string
  chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>
  completion(request: CompletionRequest): Promise<AsyncIterable<string>>
  embedding(request: EmbeddingRequest): Promise<EmbeddingResult>
}
```

| 成员           | 说明                                           |
| -------------- | ---------------------------------------------- |
| `id`           | 稳定的 Provider 标识。                         |
| `chat()`       | 发送聊天请求，并返回流式聊天片段。             |
| `completion()` | 发送单次补全请求，并返回流式文本片段。         |
| `embedding()`  | 发送 embedding 请求，并返回向量和 usage 信息。 |

## `openai(config)`

官方 OpenAI-compatible 端点的便捷工厂。

```ts
import { openai } from 'vue-ai-hooks'

const provider = openai({
  apiKey: import.meta.env.VITE_OPENAI_KEY
})
```

| 选项             | 类型                     | 默认值                      | 说明                                     |
| ---------------- | ------------------------ | --------------------------- | ---------------------------------------- |
| `apiKey`         | `string`                 | 必填                        | Provider API key。生产环境请放在服务端。 |
| `baseURL`        | `string`                 | `https://api.openai.com/v1` | 代理或网关地址。                         |
| `headers`        | `Record<string, string>` | `{}`                        | 每个请求都会带上的额外 headers。         |
| `defaultModel`   | `string`                 | `gpt-4o-mini`               | 请求未指定 `model` 时使用的模型。        |
| `chatPath`       | `string`                 | `/chat/completions`         | Chat 端点路径。                          |
| `completionPath` | `string`                 | `/completions`              | Completion 端点路径。                    |
| `embeddingPath`  | `string`                 | `/embeddings`               | Embeddings 端点路径。                    |
| `fetch`          | `typeof fetch`           | 全局 `fetch`                | 自定义 fetch 实现。                      |

## `openaiCompatible(config)`

通用 OpenAI REST-compatible Provider。

```ts
import { openaiCompatible } from 'vue-ai-hooks'

const provider = openaiCompatible({
  apiKey: 'sk-...',
  baseURL: 'https://api.deepseek.com/v1',
  defaultModel: 'deepseek-chat'
})
```

`openaiCompatible` 与 `openai` 的配置基本一致，但 `baseURL` 是必填项，并且不会套用 OpenAI 默认地址。

可用于 DeepSeek、Moonshot、智谱、Ollama 的 OpenAI shim、vLLM、LiteLLM，或你自己的 OpenAI-compatible 网关。

## `openrouter(config)`

基于 `openaiCompatible` 的 OpenRouter 专用封装。

```ts
import { openrouter } from 'vue-ai-hooks'

const provider = openrouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  defaultModel: 'openai/gpt-4o',
  siteUrl: 'https://your-app.example.com',
  appName: 'My App'
})
```

| 选项             | 类型                     | 默认值                         | 说明                                                                |
| ---------------- | ------------------------ | ------------------------------ | ------------------------------------------------------------------- |
| `apiKey`         | `string`                 | 必填                           | OpenRouter API key。                                                |
| `baseURL`        | `string`                 | `https://openrouter.ai/api/v1` | 代理或兼容网关地址。                                                |
| `siteUrl`        | `string`                 | -                              | 作为 `HTTP-Referer` 发送。                                          |
| `appName`        | `string`                 | -                              | 作为 `X-Title` 发送。                                               |
| `headers`        | `Record<string, string>` | `{}`                           | 额外 headers。`siteUrl` 和 `appName` 会覆盖同名 OpenRouter header。 |
| `defaultModel`   | `string`                 | -                              | 请求未指定 `model` 时使用的模型。                                   |
| `chatPath`       | `string`                 | `/chat/completions`            | Chat 端点路径。                                                     |
| `completionPath` | `string`                 | `/completions`                 | Completion 端点路径。                                               |
| `embeddingPath`  | `string`                 | `/embeddings`                  | Embeddings 端点路径。                                               |
| `fetch`          | `typeof fetch`           | 全局 `fetch`                   | 自定义 fetch 实现。                                                 |

返回的 Provider 使用 `id: 'openrouter'`。

## `anthropic(config)`

Anthropic Claude Provider。

```ts
import { anthropic } from 'vue-ai-hooks'

const provider = anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_KEY
})
```

| 选项               | 类型                     | 默认值                       | 说明                                    |
| ------------------ | ------------------------ | ---------------------------- | --------------------------------------- |
| `apiKey`           | `string`                 | 必填                         | Anthropic API key。                     |
| `baseURL`          | `string`                 | `https://api.anthropic.com`  | 代理地址。                              |
| `defaultModel`     | `string`                 | `claude-3-5-sonnet-20241022` | 请求未指定 `model` 时使用的模型。       |
| `maxTokens`        | `number`                 | `1024`                       | 默认 `max_tokens`；Anthropic 要求该值。 |
| `anthropicVersion` | `string`                 | `2023-06-01`                 | Anthropic API version header。          |
| `headers`          | `Record<string, string>` | `{}`                         | 每个请求都会带上的额外 headers。        |
| `fetch`            | `typeof fetch`           | 全局 `fetch`                 | 自定义 fetch 实现。                     |

Provider 行为：

- `chat()` 使用 `/v1/messages`。
- `completion()` 会用单轮用户消息实现，因为 Anthropic 没有 `/v1/completions` 端点。
- `embedding()` 会抛出 `status: 501` 的 `AiHooksError`，因为 Anthropic 没有 embeddings API。
- `role: 'system'` 消息会被提取并拼接到 Anthropic 的顶层 `system` 字段。
