# Provider

**Provider** 会把框架无关的请求类型转换为某个厂商的真实接口格式。组合式函数不关心你使用哪个 Provider，它们只依赖统一的 `ChatProvider` 接口。

::: warning 生产环境请把 API key 放在服务端
Provider 的 `apiKey` 是密钥。如果在浏览器应用中通过 `import.meta.env` 传入，用户可以看到它。生产环境应通过你的后端或边缘代理转发请求，并在那里注入上游服务凭据。
:::

## 内置 Provider

### `openai`

```ts
import { openai } from 'vue-ai-hooks'

openai({
  apiKey: 'sk-...',
  // 可选：
  baseURL: 'https://api.openai.com/v1', // 默认值
  defaultModel: 'gpt-4o-mini', // 默认值
  headers: { 'OpenAI-Organization': '...' }
})
```

默认指向 `https://api.openai.com/v1`，当调用方没有指定模型时使用 `gpt-4o-mini`。传入 `baseURL` 可以改为自托管的 OpenAI 网关，例如 vLLM 或 LM Studio。

### `openaiCompatible`

```ts
import { openaiCompatible } from 'vue-ai-hooks'

openaiCompatible({
  apiKey: 'sk-...',
  baseURL: 'https://gateway.example.com/v1',
  defaultModel: 'custom-chat-model'
})
```

和 `openai` 基本一致，但 `baseURL` 是必填项。适用于任何遵循 OpenAI REST 约定的服务，例如 DeepSeek、Moonshot、智谱、Ollama 的 `/v1` shim、vLLM、LiteLLM 等。

### `moonshot`

```ts
import { moonshot } from 'vue-ai-hooks'

moonshot({
  apiKey: 'sk-...',
  defaultModel: 'kimi-k2'
})
```

`moonshot` 默认指向 Kimi/Moonshot 的 OpenAI-compatible API：
`https://api.moonshot.ai/v1`。它不会内置默认模型，因为模型权限可能因账号而异；请传入
`defaultModel`，或在单次请求中传 `model`。

### `zhipu`

```ts
import { zhipu } from 'vue-ai-hooks'

zhipu({
  apiKey: '...',
  endpoint: 'bigmodel',
  defaultModel: 'glm-4.5'
})
```

`zhipu` 覆盖 BigModel 和 Z.ai 的 OpenAI-compatible 端点。`endpoint: 'bigmodel'`
指向 `https://open.bigmodel.cn/api/paas/v4`，`endpoint: 'z-ai'` 指向
`https://api.z.ai/api/paas/v4`，`*-coding` 变体用于 GLM Coding Plan 路由。私有网关仍可通过
`baseURL` 覆盖。

### `ollama`

```ts
import { ollama } from 'vue-ai-hooks'

ollama({
  defaultModel: 'qwen3:8b'
})
```

`ollama` 默认调用本地 OpenAI compatibility server：`http://localhost:11434/v1`。
OpenAI-compatible 协议仍会发送 API key，因此 helper 会提供一个无害的默认值 `ollama`。

### `vllm`

```ts
import { vllm } from 'vue-ai-hooks'

vllm({
  defaultModel: 'served-model'
})
```

`vllm` 默认调用本地 OpenAI-compatible server：`http://localhost:8000/v1`。如果 vLLM
在网关之后，或服务端启用了鉴权，可以覆盖 `baseURL` 和 `apiKey`。

### `deepseek`

```ts
import { deepseek } from 'vue-ai-hooks'

deepseek({
  apiKey: 'sk-...',
  // 可选：
  baseURL: 'https://api.deepseek.com',
  defaultModel: 'deepseek-v4-flash'
})
```

`deepseek` 是针对 DeepSeek OpenAI-compatible 端点的轻量封装。它默认使用当前
DeepSeek API root 和默认聊天模型，同时沿用通用 OpenAI-compatible Provider 的
request body、流式输出、工具调用和超时行为。

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

### `gemini`

```ts
import { gemini } from 'vue-ai-hooks'

gemini({
  apiKey: 'AIza...',
  // 可选：
  baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  defaultModel: 'gemini-3.5-flash'
})
```

`gemini` 是针对 Google OpenAI-compatible 端点的轻量封装。它沿用
`openaiCompatible` 的聊天、补全、embedding、工具调用和结构化输出请求格式。

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

生产环境的浏览器应用建议使用 `proxyProvider`。浏览器会把框架无关的
`ChatRequest`、`CompletionRequest` 和 `EmbeddingRequest` JSON 发给你的后端；
后端保留上游 Provider 凭据，选择模型/Provider，并返回 SSE 片段或 JSON。

当你需要应用会话、限流、审计日志、模型路由或按用户鉴权后再调用上游模型时，
这是推荐形态。

仓库里包含一个实现该契约的可运行后端模板：

```bash
pnpm example:proxy-server
# 另开一个终端
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

如果你想在这个模板里先验收默认的 `/api/*` transport 契约，改成：

```bash
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

OpenAI-compatible 网关、Ollama、vLLM、自定义端点路径和生产检查清单等可复制配置，
见 [Proxy 配方](./proxy-recipes.md)。

同一个模板也支持默认组合式函数 URL（`/api/chat`、`/api/completion`、
`/api/embedding`、`/api/image`、`/api/video`、`/api/speech`、`/api/transcription`、`/api/rerank` 和 `/api/object`）。当你省略
`provider`，直接在 `useChat`、`useCompletion`、`useEmbedding`、`useImage`、
`useVideo`、`useSpeech`、`useTranscription`、`useRerank` 或 `useObject` 上配置 `api` / `baseURL` 时，用这些路径。它还提供
`/api/ui-message-stream`，可作为不需要 key 的 AI SDK UI message stream 契约检查路由。

`proxyProvider` 既能消费本项目的 `ChatChunk` SSE payload，也能直接消费已有后端返回的
AI SDK UI message stream。如果你的服务端已经输出 `text-delta`、`finish`、`data-*`、
`source-*`、`message-metadata` 或 `tool-input-*` 片段，迁移时不需要先改成自定义流协议。

### `anthropic`

```ts
import { anthropic } from 'vue-ai-hooks'

anthropic({
  apiKey: 'sk-ant-...',
  // 可选：
  baseURL: 'https://api.anthropic.com', // 默认值
  defaultModel: 'claude-3-5-sonnet-20241022',
  maxTokens: 1024, // Anthropic 要求该字段
  anthropicVersion: '2023-06-01'
})
```

注意：

- Anthropic **没有 embeddings API**。如果把这个 Provider 传给 `useEmbedding`，会抛出清晰的 `AiHooksError`。
- Anthropic **没有 `/v1/completions` 端点**。`useCompletion` 会通过一轮用户消息的 chat 请求实现。
- system prompt 是一个**顶层字段**，不属于 `messages[]`。输入里的所有 `role: 'system'` 消息会被提取出来，并用 `\n\n` 拼接。
- 工具定义和工具结果消息会映射到 Anthropic Messages API 格式，因此 `useChat`
  的工具 handler 可以继续完成模型轮次。

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
