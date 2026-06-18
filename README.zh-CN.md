# vue-ai-hooks

[English](./README.md) | 简体中文

> 用于构建 AI 应用的 Vue 3 组合式函数库。
> 流式优先、多 Provider、完整类型支持。

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/vue-3.4+-42b883.svg)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6.svg)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

`vue-ai-hooks` 把你在 [VueUse](https://vueuse.org) 或 [Axios](https://axios-http.com) 中熟悉的开发体验带到 LLM 应用里。它提供三个组合式函数、可插拔 Provider，并帮你处理 Server-Sent Events 流式响应。支持 OpenAI 以及任何 OpenAI-compatible 服务，例如 DeepSeek、Moonshot、智谱、Ollama 的 OpenAI shim、vLLM 等。

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, append, isLoading, stop } = useChat({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
```

## 为什么需要它

当前 Vue 中的 AI 开发体验仍然比较分散：

| 库 | 取舍 |
|---|---|
| **Vercel AI SDK** | React 优先；Vue 支持非官方且通常滞后 |
| **LangChain.js** | 功能强大但偏重；链式抽象较多，魔法也多 |
| **直接 fetch + 手写 SSE** | 可行，但每个项目都要重复实现中止、重试和状态管理 |
| **vue-ai-hooks** | 专注、框架原生，并把繁琐部分处理好 |

## 特性

- **三个组合式函数，一套心智模型**：`useChat`、`useCompletion`、`useEmbedding`
- **默认支持流式响应**：SSE 解析、AbortController 和响应式状态都已处理好
- **多 Provider**：OpenAI、Azure OpenAI、DeepSeek、Moonshot、智谱、Ollama、vLLM，以及任何 OpenAI-compatible API
- **Tool calling helper**：注册本地 handler 后，`useChat` 会自动执行工具并继续模型轮次
- **TypeScript 优先**：严格模式、无 `any` 泄漏、完整 IDE 自动补全
- **小而轻**：除 Vue 本身外没有运行时依赖
- **已测试**：Vitest + happy-dom，并提供可复制的 fake provider
- **可 tree-shaking**：ESM 和 CJS、命名导出、无副作用

## 安装

```bash
pnpm add vue-ai-hooks
# 或
npm install vue-ai-hooks
# 或
yarn add vue-ai-hooks
```

Peer dependency：`vue@^3.4.0`。

## 快速开始

### 流式聊天

```vue
<script setup lang="ts">
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, append, isLoading, stop, error } = useChat({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
</script>

<template>
  <div v-for="m in messages" :key="m.id" :class="m.role">
    {{ m.content }}
  </div>
  <textarea v-model="input" />
  <button :disabled="isLoading" @click="append(input); input = ''">Send</button>
  <button :disabled="!isLoading" @click="stop">Stop</button>
</template>
```

### 单次补全

```ts
import { useCompletion, openai } from 'vue-ai-hooks'

const { completion, complete } = useCompletion({
  provider: openai({ apiKey: '...' })
})

await complete('Write a haiku about TypeScript:')
```

### Embeddings

```ts
import { useEmbedding, openai } from 'vue-ai-hooks'

const { embed, embeddings } = useEmbedding({
  provider: openai({ apiKey: '...' })
})

const result = await embed(['hello world', 'goodbye world'])
console.log(result.embeddings) // number[][]
```

## 使用非 OpenAI Provider

每个 Provider 都实现同一个 `ChatProvider` 接口，所以组合式函数不关心另一端具体使用哪个模型：

```ts
import { useChat, openaiCompatible } from 'vue-ai-hooks'

useChat({
  provider: openaiCompatible({
    apiKey: 'sk-...',
    baseURL: 'https://api.deepseek.com/v1'
  })
})
```

如果是 OpenRouter，可以直接使用内置 helper：

```ts
import { useChat, openrouter } from 'vue-ai-hooks'

useChat({
  provider: openrouter({
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
    siteUrl: 'https://your-app.example.com',
    appName: 'My App'
  })
})
```

新增 Provider 只需要实现 `ChatProvider`：

```ts
// src/providers/anthropic.ts
import type { ChatProvider } from 'vue-ai-hooks'
// ... implement chat / completion / embedding
```

然后提交 PR，组合式函数层不需要改动。

## 文档

- [English docs](./docs/index.md)
- [中文文档](./docs/zh/index.md)

## 示例

三个可运行示例位于 [`examples/`](./examples)：

- `examples/chat`：最小流式聊天 UI
- `examples/completion`：单次补全表单
- `examples/embedding`：成对余弦相似度热力图

运行方式：

```bash
pnpm install
cp examples/.env.example .env
pnpm example:chat
```

## 项目状态

这是 **v0.2.0**，是一个可工作的基础版本，但还不是功能完备版本。目前已包含：

- Chat 流式响应、中止、消息历史
- 单次补全
- Embedding
- OpenAI + OpenAI-compatible Provider
- Anthropic Claude Provider
- 多模态图片输入
- localStorage 持久化
- Tool-calling helper
- 测试、CI、示例

下一步计划：

- 用于检查流的 Vue DevTools tab
- 更多 Provider 和生产级增强

## 贡献

欢迎贡献。请查看 [`CONTRIBUTING.md`](./CONTRIBUTING.md) 了解工作流，也可以查看 [open issues](../../issues) 中待处理的事项。

新增 Provider 是最适合作为第一次贡献的方向：只需要一个文件、一个小接口，而且价值很高。参考实现见 [`src/providers/openai.ts`](./src/providers/openai.ts)。

## License

[MIT](./LICENSE)
