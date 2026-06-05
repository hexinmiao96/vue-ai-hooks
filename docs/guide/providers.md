# Providers

A **provider** translates framework-agnostic request types into a specific vendor's
wire format. The composables don't care which provider you use; they only see the
`ChatProvider` interface.

## Built-in providers

### `openai`

```ts
import { openai } from 'vue-ai-hooks'

openai({
  apiKey: 'sk-...',
  // optional:
  baseURL: 'https://api.openai.com/v1',  // default
  defaultModel: 'gpt-4o-mini',           // default
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

### `anthropic`

```ts
import { anthropic } from 'vue-ai-hooks'

anthropic({
  apiKey: 'sk-ant-...',
  // optional:
  baseURL: 'https://api.anthropic.com',  // default
  defaultModel: 'claude-3-5-sonnet-20241022',
  maxTokens: 1024,                        // Anthropic requires this
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
