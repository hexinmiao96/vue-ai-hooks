# vue-ai-hooks

[English](./README.md) | 简体中文

> 用于构建 AI 应用的 Vue 3 组合式函数库。
> 流式优先、多 Provider、完整类型支持。

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/hexinmiao96/vue-ai-hooks/actions/workflows/ci.yml/badge.svg)](https://github.com/hexinmiao96/vue-ai-hooks/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/vue-ai-hooks.svg)](https://www.npmjs.com/package/vue-ai-hooks)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/vue-ai-hooks)](https://bundlephobia.com/package/vue-ai-hooks)
[![Vue 3](https://img.shields.io/badge/vue-3.4+-42b883.svg)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-strict-3178c6.svg)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CONTRIBUTING.md)

`vue-ai-hooks` 把你在 [VueUse](https://vueuse.org) 或 [Axios](https://axios-http.com) 中熟悉的开发体验带到 LLM 应用里。它提供四个组合式函数、可插拔 Provider，并帮你处理 Server-Sent Events 流式响应。支持 OpenAI 以及任何 OpenAI-compatible 服务，例如 DeepSeek、Moonshot、智谱、Ollama 的 OpenAI shim、vLLM、Gemini 的 OpenAI-compatible 端点等。

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, handleSubmit, isLoading, stop } = useChat({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
```

## 为什么需要它

当前 Vue 中的 AI 开发体验仍然比较分散：

| 库                        | 取舍                                                         |
| ------------------------- | ------------------------------------------------------------ |
| **Vercel AI SDK**         | 覆盖面很广的全栈 SDK；API 面比聚焦 Vue composable 的方案更大 |
| **LangChain.js**          | 功能强大但偏重；链式抽象较多，魔法也多                       |
| **直接 fetch + 手写 SSE** | 可行，但每个项目都要重复实现中止、重试和状态管理             |
| **vue-ai-hooks**          | 专注、框架原生，并把繁琐部分处理好                           |

## 特性

- **四个组合式函数，一套心智模型**：`useChat`、`useCompletion`、`useEmbedding`、`useObject`
- **默认支持流式响应**：SSE 解析、AbortController 和响应式状态都已处理好
- **多 Provider**：OpenAI、Gemini、OpenRouter、Anthropic、后端代理、Azure OpenAI、DeepSeek、Moonshot、智谱、Ollama、vLLM，以及任何 OpenAI-compatible API
- **生产代理路径**：`proxyProvider` 调用你的 `/api/ai/*` 端点，让上游 key 留在服务端
- **代理请求控制**：按请求追加应用 body 字段，或改写代理 URL、headers 和 credentials
- **请求 body 扩展**：通过 `body` 透传 Provider 专属 JSON 字段，同时保留 typed options
- **请求准备钩子**：在 chat id、metadata 和消息列表确定后，自定义发送和恢复请求
- **Tool calling helper**：自动执行本地 handler，也支持先审批再执行，或通过 `sendAutomaticallyWhen` 控制工具结果后的续跑
- **活跃工具筛选**：用 `activeTools` 保留一套工具注册表，并按请求只开放选中的工具
- **文件附件**：把浏览器文件或预加载文件对象传给 `append(..., { attachments })`
- **AI SDK 风格别名**：提供 `sendMessage`、`addToolOutput` 和 `addToolApprovalResponse`，方便迁移常见聊天集成
- **可恢复流 hook**：用 `resumeStream()` 和 `resumeUrl` 重新连接代理后端的聊天流
- **结构化消息 parts**：通过 `Message.parts` 渲染 assistant 文本、reasoning、source、file、自定义 data 和 `tool-*` 状态
- **重试控制**：通过 `maxRetries`、`retryDelayMs`、`shouldRetry` 和 `onRetry` 处理临时 Provider 失败
- **流式更新节流**：用 `throttleMs` 降低高频 token 流带来的响应式更新压力
- **自定义 ID**：通过 `generateId` 生成稳定的 chat、completion、message、tool 和 stream data id
- **同 ID 共享状态**：多个 Vue 组件传入同一个 `id` 时，可以复用 chat、completion 和 object 状态
- **消息裁剪**：发送给 Provider 前裁剪长对话历史、reasoning parts 和指定历史工具调用
- **编辑后重发**：用 `append(..., { messageId })` 替换历史消息并重新生成回复
- **一致的状态模型**：核心组合式函数都暴露 `status`、`isLoading`、`error` 和 `clearError()`
- **乐观消息编辑**：`setMessages()` 支持数组或 updater 函数，方便本地更新聊天历史
- **表单辅助**：`useChat` 和 `useCompletion` 提供 `setInput`、`handleInputChange` 和 `handleSubmit`
- **生命周期回调**：观察 chunk、工具调用、delta、部分对象、完成和错误
- **自定义流数据**：在一次聊天轮次里收集 sources、进度、引用和消息 metadata
- **结构化输出**：`useObject` 会发送 JSON Schema response format，流式更新部分对象，并校验最终对象
- **TypeScript 优先**：严格模式、无 `any` 泄漏、完整 IDE 自动补全
- **小而轻**：除 Vue 本身外没有运行时依赖
- **已测试**：Vitest + jsdom，并提供可复制的 fake provider
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

## 运行时要求

- Vue 3.4 或更高版本。
- 客户端使用需要现代浏览器 API：`fetch`、`AbortController`、`ReadableStream`
  和 Server-Sent Events。
- 开发、测试、示例和文档构建需要 Node.js 18.18 或更高版本。

旧浏览器或受限运行时应提供兼容 polyfill，或通过后端/边缘代理调用 Provider API。
服务端渲染注意事项见 [SSR 和 Nuxt 指南](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/guide/ssr.md)。

## 安全说明

浏览器应用里的任何 `VITE_*` key 都会暴露给用户。示例适合本地演示、原型或权限受限的 Provider key；生产环境应通过你自己的后端或边缘代理请求上游服务，并把真实 API key 保留在服务端。

如需报告安全问题，请按照 [`SECURITY.md`](./SECURITY.md) 中的流程处理。

## 快速开始

### 流式聊天

```vue
<script setup lang="ts">
import { useChat, openai } from 'vue-ai-hooks'

const { messages, input, handleSubmit, isLoading, stop, error } = useChat({
  provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
})
</script>

<template>
  <div v-for="m in messages" :key="m.id" :class="m.role">
    {{ m.content }}
  </div>
  <form @submit="handleSubmit">
    <textarea v-model="input" />
    <button :disabled="isLoading || !input.trim()">发送</button>
    <button type="button" :disabled="!isLoading" @click="stop">停止</button>
  </form>
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

### 结构化对象输出

```ts
import { useObject, openai } from 'vue-ai-hooks'

const { object, partialObject, submit } = useObject<{ title: string; priority: 'low' | 'high' }>({
  provider: openai({ apiKey: '...' }),
  schemaName: 'ticket',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'high'] }
    },
    required: ['title', 'priority'],
    additionalProperties: false
  }
})

await submit('从这段消息中提取客服工单。')
console.log(partialObject.value?.title)
console.log(object.value)
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

Gemini 也有内置 helper，会走 Google 的 OpenAI-compatible 端点：

```ts
import { useChat, gemini } from 'vue-ai-hooks'

useChat({
  provider: gemini({
    apiKey: import.meta.env.VITE_GEMINI_API_KEY
  })
})
```

生产环境的浏览器应用建议调用自己的后端或边缘路由：

```ts
import { useChat, proxyProvider } from 'vue-ai-hooks'

useChat({
  provider: proxyProvider({
    chatUrl: '/api/ai/chat',
    headers: () => ({ Authorization: `Bearer ${getSessionToken()}` }),
    credentials: 'include'
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

- [English docs](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/index.md)
- [中文文档](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/index.md)

## API 参考

### `useChat(options)`

用于管理流式聊天会话的响应式组合式函数，返回 `id`、`messages`、`input`、`status`、`usage`、`streamData`、`pendingToolCalls`、`append()`、`sendMessage()`、`handleSubmit()`、`setInput()`、`handleInputChange()`、`addToolResult()`、`addToolOutput()`、`addToolApprovalResponse()`、`approveToolCall()`、`rejectToolCall()`、`regenerate()`、`resumeStream()`、`reload()`、`stop()`、`setId()`、`clearError()`、`clear()` 等状态和操作。`append(..., { messageId })` 可用于编辑已有消息并重新生成后续回复；`sendMessage()` 不传 content 时会提交当前 messages，适合手动工具结果后的继续生成。

`useChat`、`useCompletion` 和 `useObject` 支持 `throttleMs`，可以把高频流式响应合并成较低频的响应式更新；最终状态会在请求 resolve 前强制刷新。`experimental_throttle` 也可作为 AI SDK 风格兼容别名，但新代码建议使用 `throttleMs`。

`useChat` 的 `onFinish` 保持最终助手消息作为第一个参数，同时会传入
`ChatFinishInfo`，包含消息快照、中止/错误/断连标记和 finish reason。

可以在 `defaultRequest` 或单次调用选项中传入 `body`，用于向 OpenAI-compatible、Anthropic
或 proxy 请求透传 Provider 专属 JSON 字段；如果 key 冲突，显式 typed 字段仍然优先。

代理后端需要在最终 chat id、消息列表和 metadata 确定后再补 tenant headers、trace
metadata 或后端专属 body 字段时，可以使用 `prepareSendMessagesRequest` 和
`prepareReconnectToStreamRequest`。

`useChat`、`useCompletion` 和 `useObject` 支持 `generateId`，适合 SSR、持久化、测试快照或后端链路追踪需要稳定 ID 的场景。显式传入的 `id` 和 `messageId` 仍然优先。

多个 `useChat()` 传入同一个 `id` 时，会在组件之间共享聊天状态。某个 id 的第一个实例会写入 `initialMessages` 和 `initialInput`；`messages` 也可作为 AI SDK 风格的 `initialMessages` 别名。`setId()` 只会改变后续 provider request 携带的 id。

长对话只想发送最近上下文、system prompt 和当前工具细节时，可以在
`prepareSendMessagesRequest` 中使用 `pruneMessages()`。

### `useCompletion(options)` / `useEmbedding(options)` / `useObject(options)`

分别用于单次流式补全、embedding 向量生成和结构化 JSON 对象输出，接口形态与 `useChat` 保持一致。

`useChat` 和 `useCompletion` 还提供 `setInput()`、`handleInputChange()` 和 `handleSubmit()`，便于接入简单表单。表单提交成功后会清空 `input`；失败时会保留输入内容。两者都支持 `initialInput`。

`useObject` 支持通过 `id` 在多个组件间共享结构化输出状态，也支持用
`initialValue` 初始化第一份部分对象。

它的 `onFinish` 会保持最终文本作为第一个参数，并通过 `CompletionFinishInfo`
传递原始 prompt 和中止状态。

多个 `useCompletion()` 传入同一个 `id` 时，会在组件之间共享补全状态；不传 `id` 时会创建独立的自动生成状态。

### `usePersist(source, options)`

把任意 Vue `Ref` 持久化到 `localStorage`，支持版本号和自定义序列化。`useChat({ persist })` 内部会使用 Date-safe 的消息序列化；导出的 `serializeMessages()` / `deserializeMessages()` 也可以复用于后端持久化，并保留合法的 `Message.parts` 结构化渲染状态。详见 [usePersist 参考](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/reference/use-persist.md)、[Provider 参考](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/reference/providers.md) 和 [公共类型](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/reference/types.md)。升级兼容性说明见 [API 稳定性指南](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/guide/api-stability.md)。

## 示例

四个可运行示例位于 [`examples/`](https://github.com/hexinmiao96/vue-ai-hooks/tree/main/examples)：

- `examples/chat`：支持 Provider 切换、结构化 `Message.parts` 和本地工具审批演示的流式聊天 UI
- `examples/proxy-server`：本地后端代理模板，覆盖 `/api/ai/*` 契约
- `examples/completion`：单次补全表单
- `examples/embedding`：成对余弦相似度热力图

运行方式：

```bash
pnpm install
cp .env.example .env
pnpm example:chat
```

`examples/chat` 默认使用不需要 key 的 `local-tools` Provider；只有显式选择 Provider
或配置真实 `VITE_OPENAI_KEY` 时才会请求外部模型服务。

要让浏览器聊天示例通过本地代理模板运行：

```bash
pnpm example:proxy-server
# 另开一个终端
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

如果要在不调用真实 Provider 的情况下稳定测试组件和组合式函数，请查看
[测试指南](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/guide/testing.md)。

## 项目状态

这是 **v0.2.1**，是一个可工作的基础版本，但还不是功能完备版本。目前已包含：

- Chat 流式响应、中止、消息历史、完成状态元信息
- 单次补全
- Embedding
- 带最终 schema 校验的结构化对象输出
- OpenAI + OpenAI-compatible Provider
- OpenRouter Provider
- Gemini Provider
- 后端代理 Provider
- Anthropic Claude Provider
- 多模态图片输入
- Date-safe localStorage 持久化
- Tool-calling helper
- 通过 `activeTools` 按请求筛选可用工具
- AI SDK 风格的发送、工具输出和工具审批别名
- 需要审批的本地工具 handler 流程
- AI SDK 风格 `sendAutomaticallyWhen`
- 自定义流数据和 assistant metadata
- Chat status、clearError 和 regenerate 控制
- `setMessages()` 支持函数式 updater
- Completion、Embedding 和结构化输出也提供一致的 status 与 clearError 控制
- 通过 `throttleMs` 控制流式响应式更新频率
- 通过 `generateId` 自定义 chat、completion 和 message id
- Completion 表单输入和提交辅助函数
- 显式 `useCompletion({ id })` 支持共享补全状态
- 面向代理后端应用的 chat id 和请求 metadata 透传
- 面向代理后端应用的 AI SDK UI message stream 兼容
- 面向代理后端应用的可恢复流客户端 hook
- 通过 `append(..., { messageId })` 实现编辑后重发
- 请求级 `body` 扩展，支持 Provider 专属 JSON 选项
- 面向应用后端的 proxy request `body` 和 `prepareRequest` hook
- 面向临时 Provider 失败的可选重试控制
- 覆盖测试、类型检查、构建、包内容、安装 smoke test、示例和文档的质量门禁

下一步计划：

- 用于检查流的 Vue DevTools tab
- 更多 Provider 和生产级增强

## 已知限制

- 浏览器示例会按设计暴露 `VITE_*` 值；生产应用应通过后端或边缘运行时代理
  Provider 请求。
- Tool calling helper 会执行本地 handler，但沙箱隔离和权限确认应由宿主应用负责。
- Provider adapter 覆盖常见 API 形态；Provider 专属重试、限流和可观测性应在需要
  时由宿主应用处理。

## 贡献

欢迎贡献。请查看 [`CONTRIBUTING.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CONTRIBUTING.md) 了解工作流，阅读 [`CODE_OF_CONDUCT.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CODE_OF_CONDUCT.md)，也可以查看 [open bug issues](https://github.com/hexinmiao96/vue-ai-hooks/issues?q=is%3Aissue%20is%3Aopen%20label%3Abug) 中待处理的可复现缺陷。

使用问题、功能想法和支持渠道请查看 [`SUPPORT.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/SUPPORT.md)。

新增 Provider 是最适合作为第一次贡献的方向：只需要一个文件、一个小接口，而且价值很高。参考实现见 [`src/providers/openai.ts`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/src/providers/openai.ts)。

## License

[MIT](./LICENSE)
