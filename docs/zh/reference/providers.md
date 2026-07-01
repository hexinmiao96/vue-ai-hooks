# Provider

Provider 工厂会创建 `useChat`、`useCompletion`、`useEmbedding` 和 `useObject` 使用的
`ChatProvider` 对象。

集成示例请看 Provider 指南；如果需要精确配置项，请看本页。

公开 TypeScript 配置类型：`OpenAiLikeConfig`、`OpenRouterConfig`、
`GeminiConfig`、`DeepSeekConfig`、`FallbackProviderConfig`、`FallbackProviderContext`、
`FallbackProviderKind`、`ProxyProviderConfig`、`DefaultChatTransportOptions`、
`DefaultChatTransportPrepareSendMessagesRequest`、
`DefaultChatTransportPrepareSendMessagesRequestOptions`、
`DefaultChatTransportPrepareReconnectToStreamRequest`、
`DefaultChatTransportPrepareReconnectToStreamRequestOptions`、`ProxyRequestContext`、
`ProxyRequestKind`、`ProxyRequestOverride`、`DirectChatTransportOptions`、
`DirectChatStreamProtocol` 和 `AnthropicConfig`。

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

## `fallbackProvider(config)`

生产路由使用的 Provider 级 fallback 包装器。

```ts
import { fallbackProvider, openai, openrouter } from 'vue-ai-hooks'

const provider = fallbackProvider({
  providers: [
    openai({ apiKey: process.env.OPENAI_API_KEY! }),
    openrouter({ apiKey: process.env.OPENROUTER_API_KEY! })
  ],
  shouldFallback({ error }) {
    return !('status' in error) || Number(error.status) >= 500
  },
  onFallback({ providerId, nextProviderId, error }) {
    console.warn(`Falling back from ${providerId} to ${nextProviderId}`, error)
  }
})
```

| 选项             | 类型                                            | 默认值       | 说明                                           |
| ---------------- | ----------------------------------------------- | ------------ | ---------------------------------------------- |
| `id`             | `string`                                        | `'fallback'` | Provider id。                                  |
| `providers`      | `readonly ChatProvider[]`                       | 必填         | 按顺序尝试的 Provider 列表。                   |
| `shouldFallback` | `(context: FallbackProviderContext) => boolean` | 所有失败     | 返回 `false` 时不再尝试下一个 Provider。       |
| `onFallback`     | `(context: FallbackProviderContext) => void`    | -            | 决定 fallback 后、尝试下一个 Provider 前调用。 |

`FallbackProviderContext` 包含 `kind`、`provider`、`providerId`、`index`、
`error`、`nextProvider` 和 `nextProviderId`。`FallbackProviderKind` 是
`'chat' | 'completion' | 'embedding'`。

对于 `chat()` 和 `completion()`，只有在 Provider 尚未产出任何 stream chunk 前失败时才会
fallback。一旦已经开始输出，就会直接抛出原始错误，避免 UI 在同一条流里混合多个
Provider 的内容。`embedding()` 会在 Provider reject 时 fallback。已中止的请求和
`AbortError` 不会 fallback。

## `openai(config)`

官方 OpenAI-compatible 端点的便捷工厂。

```ts
import { openai } from 'vue-ai-hooks'

const provider = openai({
  apiKey: import.meta.env.VITE_OPENAI_KEY
})
```

| 选项             | 类型           | 默认值                      | 说明                                     |
| ---------------- | -------------- | --------------------------- | ---------------------------------------- |
| `apiKey`         | `string`       | 必填                        | Provider API key。生产环境请放在服务端。 |
| `baseURL`        | `string`       | `https://api.openai.com/v1` | 代理或网关地址。                         |
| `headers`        | `HeadersInit`  | `{}`                        | 每个请求都会带上的额外 headers。         |
| `defaultModel`   | `string`       | `gpt-4o-mini`               | 请求未指定 `model` 时使用的模型。        |
| `chatPath`       | `string`       | `/chat/completions`         | Chat 端点路径。                          |
| `completionPath` | `string`       | `/completions`              | Completion 端点路径。                    |
| `embeddingPath`  | `string`       | `/embeddings`               | Embeddings 端点路径。                    |
| `timeoutMs`      | `number`       | -                           | 请求超时时间，单位毫秒。                 |
| `fetch`          | `typeof fetch` | 全局 `fetch`                | 自定义 fetch 实现。                      |

## `openaiCompatible(config)`

通用 OpenAI REST-compatible Provider。

```ts
import { openaiCompatible } from 'vue-ai-hooks'

const provider = openaiCompatible({
  apiKey: 'sk-...',
  baseURL: 'https://gateway.example.com/v1',
  defaultModel: 'custom-chat-model'
})
```

`openaiCompatible` 与 `openai` 的配置基本一致，但 `baseURL` 是必填项，并且不会套用 OpenAI 默认地址。

可用于 DeepSeek、Moonshot、智谱、Ollama 的 OpenAI shim、vLLM、LiteLLM，或你自己的 OpenAI-compatible 网关。

流式和非流式 chat 响应都会把模型工具调用保留为 `ChatChunk.toolCalls`，因此
`useChat` 在不同 transport 模式下可以复用同一套工具流程。

## `deepseek(config)`

基于 DeepSeek OpenAI-compatible API 的封装。

```ts
import { deepseek } from 'vue-ai-hooks'

const provider = deepseek({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
  defaultModel: 'deepseek-v4-flash'
})
```

| 选项             | 类型           | 默认值                     | 说明                                     |
| ---------------- | -------------- | -------------------------- | ---------------------------------------- |
| `apiKey`         | `string`       | 必填                       | DeepSeek API key。生产环境请放在服务端。 |
| `baseURL`        | `string`       | `https://api.deepseek.com` | 代理或兼容网关地址。                     |
| `headers`        | `HeadersInit`  | `{}`                       | 每个请求都会带上的额外 headers。         |
| `defaultModel`   | `string`       | `deepseek-v4-flash`        | 请求未指定 `model` 时使用的模型。        |
| `chatPath`       | `string`       | `/chat/completions`        | Chat 端点路径。                          |
| `completionPath` | `string`       | `/completions`             | Completion 端点路径。                    |
| `embeddingPath`  | `string`       | `/embeddings`              | Embeddings 端点路径。                    |
| `timeoutMs`      | `number`       | -                          | 请求超时时间，单位毫秒。                 |
| `fetch`          | `typeof fetch` | 全局 `fetch`               | 自定义 fetch 实现。                      |

返回的 Provider 使用 `id: 'deepseek'`，并复用同一套 OpenAI-compatible 请求、
流式输出、工具调用和 `response_format` 处理。

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

| 选项             | 类型           | 默认值                         | 说明                                                                |
| ---------------- | -------------- | ------------------------------ | ------------------------------------------------------------------- |
| `apiKey`         | `string`       | 必填                           | OpenRouter API key。                                                |
| `baseURL`        | `string`       | `https://openrouter.ai/api/v1` | 代理或兼容网关地址。                                                |
| `siteUrl`        | `string`       | -                              | 作为 `HTTP-Referer` 发送。                                          |
| `appName`        | `string`       | -                              | 作为 `X-Title` 发送。                                               |
| `headers`        | `HeadersInit`  | `{}`                           | 额外 headers。`siteUrl` 和 `appName` 会覆盖同名 OpenRouter header。 |
| `defaultModel`   | `string`       | -                              | 请求未指定 `model` 时使用的模型。                                   |
| `chatPath`       | `string`       | `/chat/completions`            | Chat 端点路径。                                                     |
| `completionPath` | `string`       | `/completions`                 | Completion 端点路径。                                               |
| `embeddingPath`  | `string`       | `/embeddings`                  | Embeddings 端点路径。                                               |
| `timeoutMs`      | `number`       | -                              | 请求超时时间，单位毫秒。                                            |
| `fetch`          | `typeof fetch` | 全局 `fetch`                   | 自定义 fetch 实现。                                                 |

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

| 选项             | 类型           | 默认值                                                    | 说明                                   |
| ---------------- | -------------- | --------------------------------------------------------- | -------------------------------------- |
| `apiKey`         | `string`       | 必填                                                      | Gemini API key。生产环境请放在服务端。 |
| `baseURL`        | `string`       | `https://generativelanguage.googleapis.com/v1beta/openai` | 代理或兼容网关地址。                   |
| `headers`        | `HeadersInit`  | `{}`                                                      | 每个请求都会带上的额外 headers。       |
| `defaultModel`   | `string`       | `gemini-3.5-flash`                                        | 请求未指定 `model` 时使用的模型。      |
| `chatPath`       | `string`       | `/chat/completions`                                       | Chat 端点路径。                        |
| `completionPath` | `string`       | `/completions`                                            | Completion 端点路径。                  |
| `embeddingPath`  | `string`       | `/embeddings`                                             | Embeddings 端点路径。                  |
| `timeoutMs`      | `number`       | -                                                         | 请求超时时间，单位毫秒。               |
| `fetch`          | `typeof fetch` | 全局 `fetch`                                              | 自定义 fetch 实现。                    |

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
| `headers`        | `HeadersInit \| () => HeadersInit`                               | `{}`                      | 发给自有后端的静态或动态 headers。               |
| `body`           | `Record<string, unknown> \| (ctx) => Record<string, unknown>`    | `{}`                      | 合并到 POST JSON body 的应用自定义字段。         |
| `prepareRequest` | `(context: ProxyRequestContext) => ProxyRequestOverride \| void` | -                         | 最后一步调整 URL、headers、body 或 credentials。 |
| `credentials`    | `RequestCredentials`                                             | -                         | 浏览器 credentials 模式，例如 `'include'`。      |
| `timeoutMs`      | `number`                                                         | -                         | 请求超时时间，单位毫秒。                         |
| `fetch`          | `typeof fetch`                                                   | 全局 `fetch`              | 自定义 fetch 实现。                              |

Proxy 的 `headers` 和 `prepareRequest().headers` 接受任意 `HeadersInit`，
包括普通对象、`Headers` 实例和 `[key, value][]` entries。

协议：

- `chat()` 会把 `ChatRequest` JSON POST 到 `chatUrl`。后端可以返回
  `text/event-stream`，每个 `data:` payload 是一个 `ChatChunk`；也可以返回 JSON：
  `ChatChunk`、`ChatChunk[]` 或 `{ chunks: ChatChunk[] }`。`text/plain` chunks 会映射为
  chat `content`，适合兼容流式返回原始 JSON 文本的 AI SDK object 路由。如果已有 chat
  endpoint 流式返回纯文本但响应头不稳定，可以在 `ChatRequest` 上设置
  `streamProtocol: 'text'`。
  `ChatChunk` payload 可以包含 `metadata`、`data`、`dataId`、`dataType` 和
  `transient`，供 `useChat().streamData` 消费自定义流数据。
- SSE 流也可以使用 AI SDK UI message stream 协议。此时 `text-delta` 会转换成
  `ChatChunk.content`，`start.messageId` 会转换成 `ChatChunk.messageId`，
  `start.messageMetadata`、`finish.messageMetadata` 和 `message-metadata` 会转换成
  `ChatChunk.metadata`，`finish` 会转换成 `finishReason`/`usage`，`reasoning-*`
  会转换成 `Message.parts` reasoning 条目，`data-*`、`source-*`、`file` 和
  tool-output 片段会进入 `streamData`，`tool-input-*` 会转换成流式 `toolCalls`，
  `error` 片段会让当前聊天请求 reject。
- `resumeChat()` 会对 `resumeUrl` 发起 GET 请求，并把其中的 `:id` 或 `{id}` 占位符替换为编码后的 chat id。没有活动流时返回 `204 No Content`；存在活动流时返回和 `chat()` 相同的 SSE/JSON/text chunk 结构。
- `completion()` 会把 `CompletionRequest` JSON POST 到 `completionUrl`。SSE
  payload 可以是 JSON 字符串，也可以是包含 `text`、`completion` 或 `content` 的对象。
  `streamProtocol: 'text'` 和 `text/plain` 响应会按纯文本流读取，以兼容 AI SDK completion 路由。
  非 SSE JSON 可以是字符串、字符串数组或 `{ chunks: string[] }`。
- `embedding()` 会把 `EmbeddingRequest` JSON POST 到 `embeddingUrl`，并期望返回
  `EmbeddingResult` JSON。

config 级 `body` 和请求级 `request.body` 会先合并进 chat、completion 和 embedding 的
POST body，然后再合并 Provider request 字段。`ChatRequest.threadId` 和
`ChatRequest.forwardedProps` 也会复制进 proxy chat POST body，方便 agent 后端维护自己的线程状态。`prepareRequest` 会收到
`{ kind, url, request, headers, body, credentials }`；只返回需要覆盖的字段即可。它也会在
`resumeChat()` 中运行，此时没有 body。

`signal` 和单次请求的 `headers` 只用于代理 HTTP 请求，不会复制进 JSON body。上游凭据、模型选择、限流、日志和厂商专属重试都应由你的后端负责。

## `DefaultChatTransport`

AI SDK 风格的 `proxyProvider()` class wrapper。迁移已有
`transport: new DefaultChatTransport(...)` 的 chat UI 时可以直接使用它；如果更偏好
Provider 工厂，也可以继续直接使用 `proxyProvider()`。它的 `api` 默认值是
`/api/chat`，默认恢复流 URL 是 `${api}/:id/stream`。

```ts
import { DefaultChatTransport, useChat } from 'vue-ai-hooks'

const chat = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    credentials: 'include',
    headers: () => ({ Authorization: `Bearer ${getSessionToken()}` }),
    body: () => ({ tenantId: getTenantId() }),
    prepareSendMessagesRequest({ body, messages, requestMetadata }) {
      return {
        headers: { 'X-Message-Count': String(messages.length) },
        body: { ...body, trace: requestMetadata }
      }
    }
  })
})
```

`DefaultChatTransportOptions` 扩展自 `ProxyProviderConfig`，并额外支持：

| 选项                              | 类型                                 | 默认值      | 说明                                                     |
| --------------------------------- | ------------------------------------ | ----------- | -------------------------------------------------------- |
| `api`                             | `string`                             | `/api/chat` | AI SDK 兼容的 chat endpoint 别名。                       |
| `prepareSendMessagesRequest`      | `(options) => ProxyRequestOverride`  | -           | 调整最终 chat 请求的 URL、headers、body 或 credentials。 |
| `prepareReconnectToStreamRequest` | `(options) => ProxyRequestOverride`  | -           | 调整最终恢复流请求的 URL、headers 或 credentials。       |
| 其他 `ProxyProviderConfig` 选项   | 见 [`proxyProvider`](#proxyprovider) | -           | `baseURL`、`chatUrl`、`resumeUrl`、`headers` 等。        |

`chatUrl` 仍然兼容已有 `proxyProvider()` 风格配置。如果同时设置 `api` 和
`chatUrl`，以 `chatUrl` 为准。底层 `prepareRequest` 也仍然可用，并且会在
transport 级 prepare hook 之后运行。

## `DirectChatTransport`

用于本地 agent、demo、测试和已经自行完成模型调用的 edge runtime 的进程内聊天
transport。它实现 `ChatProvider`，因此可以传给 `provider`，也可以传给 AI SDK 风格的
`transport` 选项。

```ts
import { DirectChatTransport, useChat } from 'vue-ai-hooks'

const chat = useChat({
  transport: new DirectChatTransport({
    async *stream() {
      yield { type: 'text-delta', id: 'text_1', delta: '你好' }
      yield { type: 'finish', finishReason: 'stop' }
    }
  })
})
```

| 选项             | 类型                                | 默认值         | 说明                                               |
| ---------------- | ----------------------------------- | -------------- | -------------------------------------------------- |
| `id`             | `string`                            | `'direct'`     | 请求追踪中展示的 Provider id。                     |
| `stream`         | `(request) => stream`               | 必填           | 聊天处理函数，默认返回 AI SDK UI message parts。   |
| `resumeStream`   | `(request) => stream`               | -              | 可选恢复流处理函数，供 `resumeStream()` 使用。     |
| `onError`        | `(error) => part \| string \| null` | -              | UI message stream 错误进入 UI 前的清洗/映射函数。  |
| `streamProtocol` | `DirectChatStreamProtocol`          | `'ui-message'` | handler 已返回 `ChatChunk` 时使用 `'chat-chunk'`。 |

`DirectChatStreamProtocol` 是 `'ui-message' | 'chat-chunk'`。

默认 `ui-message` 协议接受和 `createUIMessageStreamResponse()` 相同的
`UIMessageStreamSource`。`onError` 使用和 `createUIMessageStream({ onError })`
相同的契约，因此本地 agent 失败可以先清洗或抑制，再变成 UI message stream error
part。如果本地 handler 已经直接产出框架无关的 `ChatChunk`，使用
`streamProtocol: 'chat-chunk'`：

```ts
const localTools = new DirectChatTransport({
  id: 'local-tools',
  streamProtocol: 'chat-chunk',
  async *stream(request) {
    yield { metadata: { messageCount: request.messages.length } }
    yield { content: '工具结果已接收。' }
    yield { finishReason: 'stop' }
  }
})
```

`resumeStream` 没有活动流时返回 `null`。`completion()` 和 `embedding()` 会抛出
`AiHooksError`；如果同一入口还需要这些能力，请使用 `proxyProvider()` 或模型 Provider。

## `anthropic(config)`

Anthropic Claude Provider。

```ts
import { anthropic } from 'vue-ai-hooks'

const provider = anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_KEY
})
```

| 选项               | 类型           | 默认值                       | 说明                                    |
| ------------------ | -------------- | ---------------------------- | --------------------------------------- |
| `apiKey`           | `string`       | 必填                         | Anthropic API key。                     |
| `baseURL`          | `string`       | `https://api.anthropic.com`  | 代理地址。                              |
| `defaultModel`     | `string`       | `claude-3-5-sonnet-20241022` | 请求未指定 `model` 时使用的模型。       |
| `maxTokens`        | `number`       | `1024`                       | 默认 `max_tokens`；Anthropic 要求该值。 |
| `anthropicVersion` | `string`       | `2023-06-01`                 | Anthropic API version header。          |
| `headers`          | `HeadersInit`  | `{}`                         | 每个请求都会带上的额外 headers。        |
| `timeoutMs`        | `number`       | -                            | 请求超时时间，单位毫秒。                |
| `fetch`            | `typeof fetch` | 全局 `fetch`                 | 自定义 fetch 实现。                     |

Provider 行为：

- `chat()` 使用 `/v1/messages`。
- `completion()` 会用单轮用户消息实现，因为 Anthropic 没有 `/v1/completions` 端点。
- `embedding()` 会抛出 `status: 501` 的 `AiHooksError`，因为 Anthropic 没有 embeddings API。
- `role: 'system'` 消息会被提取并拼接到 Anthropic 的顶层 `system` 字段。
- `tools`、`toolChoice`、assistant `toolCalls` 和 `role: 'tool'` 结果会映射到
  Anthropic Messages API 的工具格式。
