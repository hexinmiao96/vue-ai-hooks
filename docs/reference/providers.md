# Providers

Provider factories create the `ChatProvider` objects consumed by `useChat`,
`useCompletion`, and `useEmbedding`.

Use the provider guide for integration examples. Use this page when you need the
exact config surface.

Public TypeScript config types: `OpenAiLikeConfig`, `OpenRouterConfig`, and
`AnthropicConfig`.

## `ChatProvider`

```ts
interface ChatProvider {
  readonly id: string
  chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>
  completion(request: CompletionRequest): Promise<AsyncIterable<string>>
  embedding(request: EmbeddingRequest): Promise<EmbeddingResult>
}
```

| Member         | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `id`           | Stable provider identifier.                                              |
| `chat()`       | Sends a chat request and returns streamed chat chunks.                   |
| `completion()` | Sends a single-shot completion request and returns streamed text chunks. |
| `embedding()`  | Sends an embedding request and returns vectors plus usage metadata.      |

## `openai(config)`

Convenience factory for the official OpenAI-compatible endpoint.

```ts
import { openai } from 'vue-ai-hooks'

const provider = openai({
  apiKey: import.meta.env.VITE_OPENAI_KEY
})
```

| Option           | Type                     | Default                     | Description                                          |
| ---------------- | ------------------------ | --------------------------- | ---------------------------------------------------- |
| `apiKey`         | `string`                 | required                    | Provider API key. Keep it server-side in production. |
| `baseURL`        | `string`                 | `https://api.openai.com/v1` | Override for proxies or gateways.                    |
| `headers`        | `Record<string, string>` | `{}`                        | Extra headers sent on every request.                 |
| `defaultModel`   | `string`                 | `gpt-4o-mini`               | Model used when a request omits `model`.             |
| `chatPath`       | `string`                 | `/chat/completions`         | Chat endpoint path.                                  |
| `completionPath` | `string`                 | `/completions`              | Completion endpoint path.                            |
| `embeddingPath`  | `string`                 | `/embeddings`               | Embeddings endpoint path.                            |
| `fetch`          | `typeof fetch`           | global `fetch`              | Custom fetch implementation.                         |

## `openaiCompatible(config)`

Generic OpenAI REST-compatible provider.

```ts
import { openaiCompatible } from 'vue-ai-hooks'

const provider = openaiCompatible({
  apiKey: 'sk-...',
  baseURL: 'https://api.deepseek.com/v1',
  defaultModel: 'deepseek-chat'
})
```

`openaiCompatible` uses the same options as `openai`, except `baseURL` is
required and no OpenAI default URL is applied.

Use it for DeepSeek, Moonshot, Zhipu, Ollama's OpenAI shim, vLLM, LiteLLM, or
your own OpenAI-compatible gateway.

## `openrouter(config)`

OpenRouter-specific wrapper around `openaiCompatible`.

```ts
import { openrouter } from 'vue-ai-hooks'

const provider = openrouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  defaultModel: 'openai/gpt-4o',
  siteUrl: 'https://your-app.example.com',
  appName: 'My App'
})
```

| Option           | Type                     | Default                        | Description                                                                       |
| ---------------- | ------------------------ | ------------------------------ | --------------------------------------------------------------------------------- |
| `apiKey`         | `string`                 | required                       | OpenRouter API key.                                                               |
| `baseURL`        | `string`                 | `https://openrouter.ai/api/v1` | Override for proxies or compatible gateways.                                      |
| `siteUrl`        | `string`                 | -                              | Sent as `HTTP-Referer`.                                                           |
| `appName`        | `string`                 | -                              | Sent as `X-Title`.                                                                |
| `headers`        | `Record<string, string>` | `{}`                           | Extra headers. `siteUrl` and `appName` override matching OpenRouter header names. |
| `defaultModel`   | `string`                 | -                              | Model used when a request omits `model`.                                          |
| `chatPath`       | `string`                 | `/chat/completions`            | Chat endpoint path.                                                               |
| `completionPath` | `string`                 | `/completions`                 | Completion endpoint path.                                                         |
| `embeddingPath`  | `string`                 | `/embeddings`                  | Embeddings endpoint path.                                                         |
| `fetch`          | `typeof fetch`           | global `fetch`                 | Custom fetch implementation.                                                      |

The returned provider has `id: 'openrouter'`.

## `anthropic(config)`

Anthropic Claude provider.

```ts
import { anthropic } from 'vue-ai-hooks'

const provider = anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_KEY
})
```

| Option             | Type                     | Default                      | Description                                       |
| ------------------ | ------------------------ | ---------------------------- | ------------------------------------------------- |
| `apiKey`           | `string`                 | required                     | Anthropic API key.                                |
| `baseURL`          | `string`                 | `https://api.anthropic.com`  | Override for proxies.                             |
| `defaultModel`     | `string`                 | `claude-3-5-sonnet-20241022` | Model used when a request omits `model`.          |
| `maxTokens`        | `number`                 | `1024`                       | Default `max_tokens`; Anthropic requires a value. |
| `anthropicVersion` | `string`                 | `2023-06-01`                 | Anthropic API version header.                     |
| `headers`          | `Record<string, string>` | `{}`                         | Extra headers sent on every request.              |
| `fetch`            | `typeof fetch`           | global `fetch`               | Custom fetch implementation.                      |

Provider behavior:

- `chat()` uses `/v1/messages`.
- `completion()` is implemented as a single-turn user message because Anthropic
  has no `/v1/completions` endpoint.
- `embedding()` throws `AiHooksError` with `status: 501` because Anthropic has no
  embeddings API.
- `role: 'system'` messages are extracted and joined into Anthropic's top-level
  `system` field.
