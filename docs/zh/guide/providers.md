# Provider

**Provider** 会把框架无关的请求类型转换为某个厂商的真实接口格式。组合式函数不关心你使用哪个 Provider，它们只依赖统一的 `ChatProvider` 接口。

## 内置 Provider

### `openai`

```ts
import { openai } from 'vue-ai-hooks'

openai({
  apiKey: 'sk-...',
  // 可选：
  baseURL: 'https://api.openai.com/v1',  // 默认值
  defaultModel: 'gpt-4o-mini',           // 默认值
  headers: { 'OpenAI-Organization': '...' }
})
```

默认指向 `https://api.openai.com/v1`，当调用方没有指定模型时使用 `gpt-4o-mini`。传入 `baseURL` 可以改为自托管的 OpenAI 网关，例如 vLLM 或 LM Studio。

### `openaiCompatible`

```ts
import { openaiCompatible } from 'vue-ai-hooks'

openaiCompatible({
  apiKey: 'sk-...',
  baseURL: 'https://api.deepseek.com/v1',
  defaultModel: 'deepseek-chat'
})
```

和 `openai` 基本一致，但 `baseURL` 是必填项。适用于任何遵循 OpenAI REST 约定的服务，例如 DeepSeek、Moonshot、智谱、Ollama 的 `/v1` shim、vLLM、LiteLLM 等。

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

`openrouter` 是一个 `openaiCompatible` 的轻量封装，默认基于
`https://openrouter.ai/api/v1`，并自动带上 OpenRouter 常用的
`HTTP-Referer` 与 `X-Title` 请求头。

### `anthropic`

```ts
import { anthropic } from 'vue-ai-hooks'

anthropic({
  apiKey: 'sk-ant-...',
  // 可选：
  baseURL: 'https://api.anthropic.com',  // 默认值
  defaultModel: 'claude-3-5-sonnet-20241022',
  maxTokens: 1024,                        // Anthropic 要求该字段
  anthropicVersion: '2023-06-01'
})
```

注意：

- Anthropic **没有 embeddings API**。如果把这个 Provider 传给 `useEmbedding`，会抛出清晰的 `AiHooksError`。
- Anthropic **没有 `/v1/completions` 端点**。`useCompletion` 会通过一轮用户消息的 chat 请求实现。
- system prompt 是一个**顶层字段**，不属于 `messages[]`。输入里的所有 `role: 'system'` 消息会被提取出来，并用 `\n\n` 拼接。

## 编写自己的 Provider

任何满足 `ChatProvider` 接口的对象都可以作为 Provider：

```ts
interface ChatProvider {
  readonly id: string
  chat(request: ChatRequest): Promise<AsyncIterable<ChatChunk>>
  completion(request: CompletionRequest): Promise<AsyncIterable<string>>
  embedding(request: EmbeddingRequest): Promise<EmbeddingResult>
}
```

大多数遵循 OpenAI REST 规范的服务都可以直接使用 `openaiCompatible`。如果你需要自定义实现，可以在 `src/providers/your.ts` 新增一个文件：

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

然后从 `src/index.ts` 重新导出即可。欢迎提交 PR。
