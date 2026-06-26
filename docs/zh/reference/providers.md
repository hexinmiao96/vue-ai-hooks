# Provider

Provider 工厂会创建 `useChat`、`useCompletion`、`useEmbedding` 和 `useObject` 使用的
`ChatProvider` 对象。

集成示例请看 Provider 指南；如果需要精确配置项，请看本页。

公开 TypeScript 配置类型：`OpenAiLikeConfig`、`OpenRouterConfig`、
`GeminiConfig`、`ProxyProviderConfig`、`ProxyRequestContext`、
`ProxyRequestKind`、`ProxyRequestOverride` 和 `AnthropicConfig`。

## `ChatProvider`

```ts
interface ChatProvider {
  readonly id: string
  chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>
  resumeChat?(request: ChatResumeRequest): Promise<AsyncIterable<ChatChunk> | null>
  completion(request: CompletionRequest): Promise<AsyncIterable<string>>
  embedding(request: EmbeddingRequest): Promise<EmbeddingResult>
}
```

| 成员           | 说明                                                   |
| -------------- | ------------------------------------------------------ |
| `id`           | 稳定的 Provider 标识。                                 |
| `chat()`       | 发送聊天请求，并返回流式聊天片段。                     |
| `resumeChat()` | 可选的恢复流入口，供 `useChat().resumeStream()` 使用。 |
| `completion()` | 发送单次补全请求，并返回流式文本片段。                 |
| `embedding()`  | 发送 embedding 请求，并返回向量和 usage 信息。         |

`ChatRequest`、`CompletionRequest` 和 `EmbeddingRequest` 都支持 `body`，用于传递
typed options 尚未覆盖的 Provider 专属 JSON 字段。Provider 会先合并 `body`，再写入
显式 request 字段；如果 key 冲突，typed 字段优先。

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

## `gemini(config)`

基于 Google OpenAI-compatible API 的 Gemini 封装。

```ts
import { gemini } from 'vue-ai-hooks'

const provider = gemini({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  defaultModel: 'gemini-3.5-flash'
})
```

| 选项             | 类型                     | 默认值                                                    | 说明                                   |
| ---------------- | ------------------------ | --------------------------------------------------------- | -------------------------------------- |
| `apiKey`         | `string`                 | 必填                                                      | Gemini API key。生产环境请放在服务端。 |
| `baseURL`        | `string`                 | `https://generativelanguage.googleapis.com/v1beta/openai` | 代理或兼容网关地址。                   |
| `headers`        | `Record<string, string>` | `{}`                                                      | 每个请求都会带上的额外 headers。       |
| `defaultModel`   | `string`                 | `gemini-3.5-flash`                                        | 请求未指定 `model` 时使用的模型。      |
| `chatPath`       | `string`                 | `/chat/completions`                                       | Chat 端点路径。                        |
| `completionPath` | `string`                 | `/completions`                                            | Completion 端点路径。                  |
| `embeddingPath`  | `string`                 | `/embeddings`                                             | Embeddings 端点路径。                  |
| `fetch`          | `typeof fetch`           | 全局 `fetch`                                              | 自定义 fetch 实现。                    |

返回的 Provider 使用 `id: 'gemini'`，并支持 `useObject` 使用的
OpenAI-compatible `response_format` 路径。

## `proxyProvider(config)`

应用自有后端或边缘代理 Provider。生产环境中，如果浏览器代码不应该直接拿到上游
Provider key，可以用它把请求发到自己的 `/api/*` 路由。

```ts
import { proxyProvider } from 'vue-ai-hooks'

const provider = proxyProvider({
  chatUrl: '/api/ai/chat',
  completionUrl: '/api/ai/completion',
  embeddingUrl: '/api/ai/embedding',
  body: { appVersion: 'web-1.4.0' },
  prepareRequest({ kind, body }) {
    if (kind !== 'chat') return
    return {
      url: '/api/ai/chat-stream',
      body: { ...body, mode: 'stream' }
    }
  },
  headers: () => ({
    Authorization: `Bearer ${getSessionToken()}`
  }),
  credentials: 'include'
})
```

| 选项             | 类型                                                             | 默认值                    | 说明                                             |
| ---------------- | ---------------------------------------------------------------- | ------------------------- | ------------------------------------------------ |
| `id`             | `string`                                                         | `'proxy'`                 | Provider id。                                    |
| `baseURL`        | `string`                                                         | `''`                      | 可选 origin/base path，会拼到相对 URL 前。       |
| `chatUrl`        | `string`                                                         | `/api/ai/chat`            | 接收 `ChatRequest` 的后端端点。                  |
| `resumeUrl`      | `string \| (id: string) => string`                               | `/api/ai/chat/:id/stream` | 接收恢复聊天流请求的后端端点。                   |
| `completionUrl`  | `string`                                                         | `/api/ai/completion`      | 接收 `CompletionRequest` 的后端端点。            |
| `embeddingUrl`   | `string`                                                         | `/api/ai/embedding`       | 接收 `EmbeddingRequest` 的后端端点。             |
| `headers`        | `Record<string, string> \| () => Record<string, string>`         | `{}`                      | 发给自有后端的静态或动态 headers。               |
| `body`           | `Record<string, unknown> \| (ctx) => Record<string, unknown>`    | `{}`                      | 合并到 POST JSON body 的应用自定义字段。         |
| `prepareRequest` | `(context: ProxyRequestContext) => ProxyRequestOverride \| void` | -                         | 最后一步调整 URL、headers、body 或 credentials。 |
| `credentials`    | `RequestCredentials`                                             | -                         | 浏览器 credentials 模式，例如 `'include'`。      |
| `timeoutMs`      | `number`                                                         | -                         | 请求超时时间，单位毫秒。                         |
| `fetch`          | `typeof fetch`                                                   | 全局 `fetch`              | 自定义 fetch 实现。                              |

协议：

- `chat()` 会把 `ChatRequest` JSON POST 到 `chatUrl`。后端可以返回
  `text/event-stream`，每个 `data:` payload 是一个 `ChatChunk`；也可以返回 JSON：
  `ChatChunk`、`ChatChunk[]` 或 `{ chunks: ChatChunk[] }`。
  `ChatChunk` payload 可以包含 `metadata`、`data`、`dataId`、`dataType` 和
  `transient`，供 `useChat().streamData` 消费自定义流数据。
- SSE 流也可以使用 AI SDK UI message stream 协议。此时 `text-delta` 会转换成
  `ChatChunk.content`，`finish` 会转换成 `finishReason`/`usage`，`data-*`、
  `source-*`、`file` 和 tool-output 片段会进入 `streamData`，`tool-input-*` 会转换成
  流式 `toolCalls`，`error` 片段会让当前聊天请求 reject。
- `resumeChat()` 会对 `resumeUrl` 发起 GET 请求，并把其中的 `:id` 或 `{id}` 占位符替换为编码后的 chat id。没有活动流时返回 `204 No Content`；存在活动流时返回和 `chat()` 相同的 SSE/JSON chunk 结构。
- `completion()` 会把 `CompletionRequest` JSON POST 到 `completionUrl`。SSE
  payload 可以是 JSON 字符串，也可以是包含 `text`、`completion` 或 `content` 的对象。
  非 SSE JSON 可以是字符串、字符串数组或 `{ chunks: string[] }`。
- `embedding()` 会把 `EmbeddingRequest` JSON POST 到 `embeddingUrl`，并期望返回
  `EmbeddingResult` JSON。

config 级 `body` 和请求级 `request.body` 会先合并进 chat、completion 和 embedding 的
POST body，然后再合并 Provider request 字段。`prepareRequest` 会收到
`{ kind, url, request, headers, body, credentials }`；只返回需要覆盖的字段即可。它也会在
`resumeChat()` 中运行，此时没有 body。

`signal` 和单次请求的 `headers` 只用于代理 HTTP 请求，不会复制进 JSON body。上游凭据、模型选择、限流、日志和厂商专属重试都应由你的后端负责。

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
- `tools`、`toolChoice`、assistant `toolCalls` 和 `role: 'tool'` 结果会映射到
  Anthropic Messages API 的工具格式。
