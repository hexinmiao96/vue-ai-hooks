# Providers

Provider factories create the `ChatProvider` objects consumed by `useChat`,
`useCompletion`, `useEmbedding`, and `useObject`.

Use the provider guide for integration examples. Use this page when you need the
exact config surface.

Public TypeScript config types: `OpenAiLikeConfig`, `OpenRouterConfig`,
`GeminiConfig`, `FallbackProviderConfig`, `FallbackProviderContext`,
`FallbackProviderKind`, `ProxyProviderConfig`, `ProxyRequestContext`,
`ProxyRequestKind`, `ProxyRequestOverride`, and `AnthropicConfig`.

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

| Member         | Description                                                              |
| -------------- | ------------------------------------------------------------------------ |
| `id`           | Stable provider identifier.                                              |
| `chat()`       | Sends a chat request and returns streamed chat chunks.                   |
| `resumeChat()` | Optional resumable stream entry used by `useChat().resumeStream()`.      |
| `completion()` | Sends a single-shot completion request and returns streamed text chunks. |
| `embedding()`  | Sends an embedding request and returns vectors plus usage metadata.      |

`ChatRequest`, `CompletionRequest`, and `EmbeddingRequest` accept `body` for
provider-specific JSON fields that are not modeled by the typed options. The
provider merges `body` before explicit request fields, so typed fields win if a
key conflicts.

## `fallbackProvider(config)`

Provider-level fallback wrapper for production routing.

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

| Option           | Type                                            | Default      | Description                                               |
| ---------------- | ----------------------------------------------- | ------------ | --------------------------------------------------------- |
| `id`             | `string`                                        | `'fallback'` | Provider id.                                              |
| `providers`      | `readonly ChatProvider[]`                       | required     | Providers tried in order.                                 |
| `shouldFallback` | `(context: FallbackProviderContext) => boolean` | all failures | Return `false` to stop before trying the next provider.   |
| `onFallback`     | `(context: FallbackProviderContext) => void`    | -            | Called after a fallback decision and before the next try. |

`FallbackProviderContext` includes `kind`, `provider`, `providerId`, `index`,
`error`, `nextProvider`, and `nextProviderId`. `FallbackProviderKind` is
`'chat' | 'completion' | 'embedding'`.

For `chat()` and `completion()`, fallback is attempted only if the provider
throws before yielding any stream chunk. Once content has started, the original
error is rethrown so UI output cannot mix providers mid-stream. `embedding()`
falls back on provider rejection. Aborted requests and `AbortError` failures do
not fall back.

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
| `timeoutMs`      | `number`                 | -                           | Request timeout in milliseconds.                     |
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

Streaming and non-streaming chat responses both preserve model tool calls as
`ChatChunk.toolCalls`, so `useChat` can drive the same tool workflow regardless
of transport mode.

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
| `timeoutMs`      | `number`                 | -                              | Request timeout in milliseconds.                                                  |
| `fetch`          | `typeof fetch`           | global `fetch`                 | Custom fetch implementation.                                                      |

The returned provider has `id: 'openrouter'`.

## `gemini(config)`

Gemini wrapper around Google's OpenAI-compatible API.

```ts
import { gemini } from 'vue-ai-hooks'

const provider = gemini({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
  defaultModel: 'gemini-3.5-flash'
})
```

| Option           | Type                     | Default                                                   | Description                                        |
| ---------------- | ------------------------ | --------------------------------------------------------- | -------------------------------------------------- |
| `apiKey`         | `string`                 | required                                                  | Gemini API key. Keep it server-side in production. |
| `baseURL`        | `string`                 | `https://generativelanguage.googleapis.com/v1beta/openai` | Override for proxies or compatible gateways.       |
| `headers`        | `Record<string, string>` | `{}`                                                      | Extra headers sent on every request.               |
| `defaultModel`   | `string`                 | `gemini-3.5-flash`                                        | Model used when a request omits `model`.           |
| `chatPath`       | `string`                 | `/chat/completions`                                       | Chat endpoint path.                                |
| `completionPath` | `string`                 | `/completions`                                            | Completion endpoint path.                          |
| `embeddingPath`  | `string`                 | `/embeddings`                                             | Embeddings endpoint path.                          |
| `timeoutMs`      | `number`                 | -                                                         | Request timeout in milliseconds.                   |
| `fetch`          | `typeof fetch`           | global `fetch`                                            | Custom fetch implementation.                       |

The returned provider has `id: 'gemini'` and supports the same
OpenAI-compatible `response_format` path used by `useObject`.

## `proxyProvider(config)`

App-owned backend or edge proxy provider. Use this when browser code should call
your own `/api/*` routes instead of sending upstream provider keys to the
client.

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

| Option           | Type                                                             | Default                   | Description                                                  |
| ---------------- | ---------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| `id`             | `string`                                                         | `'proxy'`                 | Provider id.                                                 |
| `baseURL`        | `string`                                                         | `''`                      | Optional origin/base path prepended to relative URLs.        |
| `chatUrl`        | `string`                                                         | `/api/ai/chat`            | Backend endpoint for `ChatRequest`.                          |
| `resumeUrl`      | `string \| (id: string) => string`                               | `/api/ai/chat/:id/stream` | Backend endpoint for resumable chat streams.                 |
| `completionUrl`  | `string`                                                         | `/api/ai/completion`      | Backend endpoint for `CompletionRequest`.                    |
| `embeddingUrl`   | `string`                                                         | `/api/ai/embedding`       | Backend endpoint for `EmbeddingRequest`.                     |
| `headers`        | `Record<string, string> \| () => Record<string, string>`         | `{}`                      | Static or dynamic headers sent to your backend.              |
| `body`           | `Record<string, unknown> \| (ctx) => Record<string, unknown>`    | `{}`                      | Extra app-defined JSON fields merged into POST bodies.       |
| `prepareRequest` | `(context: ProxyRequestContext) => ProxyRequestOverride \| void` | -                         | Last-mile hook to adjust URL, headers, body, or credentials. |
| `credentials`    | `RequestCredentials`                                             | -                         | Browser credentials mode, for example `'include'`.           |
| `timeoutMs`      | `number`                                                         | -                         | Request timeout in milliseconds.                             |
| `fetch`          | `typeof fetch`                                                   | global `fetch`            | Custom fetch implementation.                                 |

Protocol:

- `chat()` posts `ChatRequest` JSON to `chatUrl`. The backend may return
  `text/event-stream` SSE where each `data:` payload is a `ChatChunk`, or JSON
  as `ChatChunk`, `ChatChunk[]`, or `{ chunks: ChatChunk[] }`.
  `ChatChunk` payloads may include `metadata`, `data`, `dataId`, `dataType`, and
  `transient` for custom stream data consumed by `useChat().streamData`.
  The SSE stream may also use the AI SDK UI message stream protocol. In that
  mode, `start.messageId` becomes `ChatChunk.messageId`; `start.messageMetadata`,
  `finish.messageMetadata`, and `message-metadata` become `ChatChunk.metadata`;
  `text-delta` parts become `ChatChunk.content`; `finish` parts become
  `finishReason`/`usage`; `reasoning-*` parts become `Message.parts` reasoning
  entries; `data-*`, `source-*`, `file`, and tool-output parts become
  `streamData`; `tool-input-*` parts become streamed `toolCalls`; and `error`
  parts reject the active chat request.
- `resumeChat()` sends a GET request to `resumeUrl`, replacing `:id` or `{id}`
  placeholders with the encoded chat id. Return `204 No Content` when no active
  stream exists, or return the same SSE/JSON chunk shapes as `chat()`.
- `completion()` posts `CompletionRequest` JSON to `completionUrl`. SSE payloads
  may be JSON strings or objects with `text`, `completion`, or `content`.
  Non-SSE JSON may be a string, string array, or `{ chunks: string[] }`.
- `embedding()` posts `EmbeddingRequest` JSON to `embeddingUrl` and expects an
  `EmbeddingResult` JSON response.

Config-level `body` and request-level `request.body` are merged into chat,
completion, and embedding POST bodies before the provider request fields.
`ChatRequest.threadId` and `ChatRequest.forwardedProps` are also copied into
proxy chat POST bodies for agent backends that keep their own thread state.
`prepareRequest` receives `{ kind, url, request, headers, body, credentials }`;
return only the fields you need to override. It also runs for `resumeChat()`,
where there is no body.

`signal` and request-level `headers` are used for the proxy HTTP request and are
not copied into the JSON body. Your backend owns upstream credentials, model
selection, rate limiting, logging, and vendor-specific retries.

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
| `timeoutMs`        | `number`                 | -                            | Request timeout in milliseconds.                  |
| `fetch`            | `typeof fetch`           | global `fetch`               | Custom fetch implementation.                      |

Provider behavior:

- `chat()` uses `/v1/messages`.
- `completion()` is implemented as a single-turn user message because Anthropic
  has no `/v1/completions` endpoint.
- `embedding()` throws `AiHooksError` with `status: 501` because Anthropic has no
  embeddings API.
- `role: 'system'` messages are extracted and joined into Anthropic's top-level
  `system` field.
- `tools`, `toolChoice`, assistant `toolCalls`, and `role: 'tool'` results are
  mapped to Anthropic's Messages API tool format.
