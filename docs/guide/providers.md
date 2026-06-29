# Providers

A **provider** translates framework-agnostic request types into a specific vendor's
wire format. The composables don't care which provider you use; they only see the
`ChatProvider` interface.

::: warning Keep API keys server-side in production
Provider `apiKey` values are secrets. If you pass them from `import.meta.env` in
a browser app, users can see them. For production, route requests through your
own backend or edge proxy and inject provider credentials there.
:::

## Built-in providers

### `openai`

```ts
import { openai } from 'vue-ai-hooks'

openai({
  apiKey: 'sk-...',
  // optional:
  baseURL: 'https://api.openai.com/v1', // default
  defaultModel: 'gpt-4o-mini', // default
  headers: { 'OpenAI-Organization': '...' }
})
```

Targets `https://api.openai.com/v1` by default and uses `gpt-4o-mini` when the
caller doesn't specify a model. Pass `baseURL` to point at a self-hosted OpenAI
gateway (vLLM, LM Studio, etc.).

### `openaiCompatible`

```ts
import { openaiCompatible } from 'vue-ai-hooks'

openaiCompatible({
  apiKey: 'sk-...',
  baseURL: 'https://api.deepseek.com/v1',
  defaultModel: 'deepseek-chat'
})
```

Identical to `openai` but takes a `baseURL` as a required argument. Works with any
service that follows the OpenAI REST conventions — DeepSeek, Moonshot, Zhipu,
Ollama's `/v1` shim, vLLM, LiteLLM, etc.

### `openrouter`

```ts
import { openrouter } from 'vue-ai-hooks'

openrouter({
  apiKey: 'sk-or-v1-...',
  defaultModel: 'openai/gpt-4o',
  siteUrl: 'https://your-app.example.com',
  appName: 'My App'
})
```

`openrouter` is a small convenience wrapper around `openaiCompatible` using
`https://openrouter.ai/api/v1` by default and the headers (`HTTP-Referer`,
`X-Title`) that OpenRouter commonly uses.

### `gemini`

```ts
import { gemini } from 'vue-ai-hooks'

gemini({
  apiKey: 'AIza...',
  // optional:
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  defaultModel: 'gemini-3.5-flash'
})
```

`gemini` is a thin wrapper around `openaiCompatible` for Google's
OpenAI-compatible endpoint. It keeps the same chat, completion, embedding, tool
calling, and structured output request shape as the OpenAI-compatible provider.

### `proxyProvider`

```ts
import { proxyProvider } from 'vue-ai-hooks'

proxyProvider({
  chatUrl: '/api/ai/chat',
  completionUrl: '/api/ai/completion',
  embeddingUrl: '/api/ai/embedding',
  headers: () => ({ Authorization: `Bearer ${getSessionToken()}` }),
  credentials: 'include'
})
```

Use `proxyProvider` for production browser apps. The browser sends
provider-agnostic `ChatRequest`, `CompletionRequest`, and `EmbeddingRequest`
JSON to your backend. Your backend keeps upstream provider credentials
server-side, chooses the model/provider, and returns either SSE chunks or JSON.

This is the recommended shape when you need app sessions, rate limits, audit
logs, model routing, or per-user authorization before an upstream model call.

The repo includes a runnable backend template for this contract:

```bash
pnpm example:proxy-server
# in another terminal
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

The same template also supports the default composable URLs
(`/api/chat`, `/api/completion`, `/api/embedding`, and `/api/object`). Use those
when you omit `provider` and configure `api` or `baseURL` directly on
`useChat`, `useCompletion`, `useEmbedding`, or `useObject`.

`proxyProvider` can consume either this project's `ChatChunk` SSE payloads or AI
SDK UI message streams from an existing backend. That makes migration simpler
when your server already returns `text-delta`, `finish`, `data-*`, `source-*`,
`message-metadata`, or `tool-input-*` stream parts.

### `anthropic`

```ts
import { anthropic } from 'vue-ai-hooks'

anthropic({
  apiKey: 'sk-ant-...',
  // optional:
  baseURL: 'https://api.anthropic.com', // default
  defaultModel: 'claude-3-5-sonnet-20241022',
  maxTokens: 1024, // Anthropic requires this
  anthropicVersion: '2023-06-01'
})
```

Notes:

- Anthropic has **no embeddings API**. Calling `useEmbedding` with this provider
  throws a clear `AiHooksError`.
- Anthropic has **no `/v1/completions` endpoint**. `useCompletion` is implemented
  as a single-turn chat with a user message.
- The system prompt is a **top-level field**, not part of `messages[]`. Any
  `role: 'system'` messages in the input are extracted and joined with `\n\n`.
- Tool definitions and tool result messages are mapped to Anthropic's Messages
  API format, so `useChat` tool handlers can continue the round-trip.

## Writing your own provider

A provider is anything that satisfies the `ChatProvider` interface:

```ts
interface ChatProvider {
  readonly id: string
  chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>
  completion(request: CompletionRequest): Promise<AsyncIterable<string>>
  embedding(request: EmbeddingRequest): Promise<EmbeddingResult>
}
```

Most vendors that follow the OpenAI REST spec can use `openaiCompatible`
directly. If you need something custom, drop a file at `src/providers/your.ts`:

```ts
// src/providers/your.ts
import type { ChatProvider } from './types'
import type { ChatChunk, ChatRequest, ... } from '../types'

export function your(config: YourConfig): ChatProvider {
  return {
    id: 'your',
    async chat(request) {
      // ...
      return (async function* () {
        yield { content: '...' }
      })()
    },
    async completion(request) { /* ... */ },
    async embedding(request) { /* ... */ }
  }
}
```

Then re-export from `src/index.ts`. PRs welcome.
