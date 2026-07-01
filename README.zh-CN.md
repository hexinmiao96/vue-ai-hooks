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

`vue-ai-hooks` 把你在 [VueUse](https://vueuse.org) 或 [Axios](https://axios-http.com) 中熟悉的开发体验带到 LLM 应用里。它提供十个组合式函数、可插拔 Provider，并帮你处理 Server-Sent Events 流式响应。支持 OpenAI 以及任何 OpenAI-compatible 服务，例如 DeepSeek、Moonshot、智谱、Ollama 的 OpenAI shim、vLLM、Gemini 的 OpenAI-compatible 端点等。

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

- **十个组合式函数，一套心智模型**：`useChat`、`useCompletion`、`useEmbedding`、
  `useGeneration`、`useImage`、`useVideo`、`useSpeech`、`useTranscription`、
  `useRerank` 和 `useObject`。
- **流式优先的 Vue 状态**：内置 SSE 解析、AbortController、节流、重试、生命周期回调、
  同 id 共享状态，以及统一的 `status`/`error` 控制。
- **Provider 和代理覆盖**：OpenAI、Gemini、OpenRouter、Anthropic、后端代理、Azure OpenAI、
  DeepSeek、Moonshot、智谱、Ollama、vLLM，以及 OpenAI-compatible API。
- **生产聊天工作流**：服务端代理路径、可恢复流、thread 上下文、请求准备钩子、自定义
  body、metadata 和请求追踪。
- **AI SDK 风格 UI helper**：`sendMessage`、工具输出/审批别名、文件附件、结构化
  `Message.parts`、自定义流数据、消息裁剪、`DefaultChatTransport`、
  `DirectChatTransport`，以及可复用的 UI stream 解码工具。
- **工具调用控制**：`tool()` / `dynamicTool()` helper、本地 handler、审批 gate、活跃工具筛选、停止条件和逐步骤请求准备。
- **类型化输出和生成**：JSON Schema 结构化输出、embedding 向量、自有后端图片、视频、语音、转写和重排路由、
  自定义生成任务、稳定 id 和 Date-safe 持久化 helper。
- **库级质量**：严格 TypeScript、除 Vue 外无运行时依赖、可 tree-shaking 的 ESM/CJS 构建、
  Vitest 覆盖。

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
import { cosineSimilarity, useEmbedding, openai } from 'vue-ai-hooks'

const { embed, embeddings } = useEmbedding({
  provider: openai({ apiKey: '...' })
})

const result = await embed(['hello world', 'goodbye world'])
console.log(result.embeddings) // number[][]
console.log(cosineSimilarity(result.embeddings[0], result.embeddings[1]))
```

### 图片生成

```ts
import { useImage } from 'vue-ai-hooks'

const { image, generateImage } = useImage({
  api: '/api/image'
})

await generateImage('一张 Vue 工作台主视觉图', {
  size: '1024x1024'
})
console.log(image.value?.url)
```

### 视频生成

```ts
import { useVideo } from 'vue-ai-hooks'

const { video, generateVideo } = useVideo({
  api: '/api/video'
})

await generateVideo('一段简短的 Vue 产品演示视频', {
  aspectRatio: '16:9',
  resolution: '1280x720',
  duration: 6
})
console.log(video.value?.url)
```

### 语音生成

```ts
import { useSpeech } from 'vue-ai-hooks'

const { audio, generateSpeech } = useSpeech({
  api: '/api/speech'
})

await generateSpeech('朗读这段发布说明。', {
  voice: 'alloy',
  outputFormat: 'mp3'
})
console.log(audio.value?.url)
```

### 音频转写

```ts
import { useTranscription } from 'vue-ai-hooks'

const { transcription, transcribeAudio } = useTranscription({
  api: '/api/transcription'
})

await transcribeAudio('data:audio/wav;base64,...', {
  language: 'en'
})
console.log(transcription.value)
```

### 文档重排

```ts
import { useRerank } from 'vue-ai-hooks'

const { rerankedDocuments, rerankDocuments } = useRerank<string>({
  api: '/api/rerank'
})

await rerankDocuments('Vue AI search', [
  'Streaming chat state for Vue apps',
  'Document reranking for search',
  'Text-to-speech release notes'
])

console.log(rerankedDocuments.value)
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

### 自定义生成任务

```ts
import { useGeneration } from 'vue-ai-hooks'

const { result, progress, generate } = useGeneration<string, { url: string }, number>({
  async fetcher(prompt, context) {
    context.reportProgress(50)
    const response = await fetch('/api/image', {
      method: 'POST',
      signal: context.signal,
      body: JSON.stringify({ prompt })
    })
    return (await response.json()) as { url: string }
  }
})

await generate('一张 Vue 工作台主视觉图')
console.log(progress.value, result.value?.url)
```

## 使用非 OpenAI Provider

每个 Provider 都实现同一个 `ChatProvider` 接口，所以组合式函数不关心另一端具体使用哪个模型：

```ts
import { useChat, deepseek } from 'vue-ai-hooks'

useChat({
  provider: deepseek({
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY
  })
})
```

其他 OpenAI-compatible 网关仍可以直接使用 `openaiCompatible`。

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

用于管理流式聊天会话的响应式组合式函数，返回 `id`、`messages`、`input`、`status`、`usage`、`data`、`streamData`、`pendingToolCalls`、`lastRequest`、`lastResponse`、`append()`、`sendMessage()`、`handleSubmit()`、`setInput()`、`handleInputChange()`、`setData()`、`addToolResult()`、`addToolOutput()`、`addToolApprovalResponse()`、`approveToolCall()`、`rejectToolCall()`、`regenerate()`、`resumeStream()`、`reload()`、`stop()`、`setId()`、`clearError()`、`clearTrace()`、`clear()` 等状态和操作。`data` 是 `streamData` 的 AI SDK 风格别名；`append(..., { messageId })` 可用于编辑已有消息并重新生成后续回复；`sendMessage()` 不传 content 时会提交当前 messages，适合手动工具结果后的继续生成；`addToolResult()` 同时支持 `(toolCallId, result)` 和 AI SDK 风格的 `{ toolCallId, output }` 对象签名。

`useChat`、`useCompletion` 和 `useObject` 支持 `throttleMs`，可以把高频流式响应合并成较低频的响应式更新；最终状态会在请求 resolve 前强制刷新。`experimental_throttle` 也可作为 AI SDK 风格兼容别名，但新代码建议使用 `throttleMs`。
应用自己的 proxy 路由返回纯文本补全流时，可以使用
`useCompletion({ streamProtocol: 'text' })`。已有 chat endpoint 返回原始文本流时，
可以使用 `useChat({ streamProtocol: 'text' })`。

`useChat` 的 `onFinish` 保持最终助手消息作为第一个参数，同时会传入
`ChatFinishInfo`，包含消息快照、中止/错误/断连标记和 finish reason。

可以在 `defaultRequest` 或单次调用选项中传入 `body`，用于向 OpenAI-compatible、Anthropic
或 proxy 请求透传 Provider 专属 JSON 字段；如果 key 冲突，显式 typed 字段仍然优先。

代理后端需要在最终 chat id、消息列表、proxy `api`、credentials 和 metadata 确定后再补
tenant headers、trace metadata 或后端专属 body 字段时，可以使用 `prepareSendMessagesRequest` 和
`prepareReconnectToStreamRequest`。
自动工具循环需要按 assistant 步骤调整请求时，可以使用 `prepareStep`，例如工具结果回来后收窄
`activeTools`。
迁移 AI SDK 风格工具循环限制时，可以把 `stepCountIs()` 或 `hasToolCall()` 传给
`stopWhen`，底层 Vue 状态模型不需要改变。
agent 后端需要服务端 thread 标识和应用上下文时，可以使用 `threadId` 和
`forwardedProps`，不用改变客户端共享 chat id。
浏览器本地工具 handler 需要 store、服务实例或 session 状态时，可以使用 `context`，
这些数据不会被序列化。
如果希望按 AI SDK 风格在 `useChat({ tools })` 中定义工具，可以使用 `tool()`、
`dynamicTool()` 和 `jsonSchema()`；Provider 请求仍会收到归一化后的 OpenAI-compatible
`Tool[]`。

`useChat`、`useCompletion`、`useEmbedding`、`useImage`、`useVideo`、`useSpeech`、
`useTranscription`、`useRerank` 和 `useObject` 可设置 `maxRetries`，在临时 Provider 或后端失败时重试。流式调用只会在首个 chunk 到达前重试，
因此不会复制已有的部分文本。

`useChat`、`useCompletion`、`useGeneration` 和 `useObject` 支持 `generateId`，适合 SSR、持久化、测试快照或后端链路追踪需要稳定 ID 的场景。AI SDK 风格的随机 ID 可以直接使用 `createIdGenerator()`。显式传入的 `id` 和 `messageId` 仍然优先。

多个 `useChat()` 传入同一个 `id` 时，会在组件之间共享聊天状态。某个 id 的第一个实例会写入 `initialMessages` 和 `initialInput`；`messages` 也可作为 AI SDK 风格的 `initialMessages` 别名。`setId()` 只会改变后续 provider request 携带的 id。

长对话只想发送最近上下文、system prompt 和当前工具细节时，可以在
`prepareSendMessagesRequest` 中使用 `pruneMessages()`。裁剪之后还可以使用
`convertToModelMessages()` 把历史转换成不包含 UI-only `Message.parts` 的模型请求消息；
某些自定义 `data-*` parts 需要变成模型可读上下文时可以传 `convertDataPart`。
`ChatRequest.messages` 可直接接收这些 `ChatRequestMessage[]` payload。

自有后端路由需要逐步产出 AI SDK UI message stream parts 时，可以使用
`createUIMessageStream()`；需要发出这些 parts 时，可以使用
`createUIMessageStreamResponse()` 或 `pipeUIMessageStreamToResponse()`。进程内 agent、demo
或测试工具不想经过 HTTP proxy 时，可以使用 `DirectChatTransport` 消费这些 stream。
`DirectChatTransport({ onError })` 可以先清洗本地 agent 失败，再让它进入 UI message stream。
底层自定义 transport 仍可直接使用 `readUIMessageStream()`。已经自行解析 SSE 或只需要处理单个 part 时，也可以使用
`createUIMessageStreamParser()`、`toChatChunks()`、`formatSSEData()` 和 `parseSSE()`。

### `useCompletion(options)` / `useEmbedding(options)` / `useGeneration(options)` / `useImage(options)` / `useVideo(options)` / `useSpeech(options)` / `useTranscription(options)` / `useRerank(options)` / `useObject(options)`

分别用于单次流式补全、embedding 向量生成、自定义生成任务、自有后端图片生成路由、自有后端视频生成路由、自有后端语音生成路由、自有后端音频转写路由、自有后端文档重排路由和结构化 JSON 对象输出，接口形态与 `useChat` 保持一致。

这些组合式函数也会暴露 `lastRequest`、`lastResponse` 和 `clearTrace()`，方便在界面上直接渲染最近一次 Provider 请求/响应快照，而不必把 lifecycle callback 手动同步到本地状态。默认 proxy trace 会包含解析后的 proxy `api` 和浏览器 credentials 模式。

`useImage` 面向你自己的 `/api/image` 路由，提供 `image`、`images`、`result`、
`generateImage()`、生命周期 trace refs、中止、重试和表单 helpers，同时把 Provider 凭据保留在服务端。

`useVideo` 面向你自己的 `/api/video` 路由，提供 `video`、`videos`、`result`、
`generateVideo()`、生命周期 trace refs、中止、重试和表单 helpers，同时把视频模型凭据保留在服务端。

`useSpeech` 面向你自己的 `/api/speech` 路由，提供 `audio`、`result`、
`generateSpeech()`、`speak()`、生命周期 trace refs、中止、重试和表单 helpers，同时把文字转语音凭据保留在服务端。

`useTranscription` 面向你自己的 `/api/transcription` 路由，提供 `transcription`、
`text`、`result`、`transcribeAudio()`、生命周期 trace refs、中止、重试和表单 helpers，同时把音频转写凭据保留在服务端。

`useRerank` 面向你自己的 `/api/rerank` 路由，提供 `documents`、`ranking`、
`rerankedDocuments`、`rerankDocuments()`、生命周期 trace refs、中止、重试和表单 helpers，同时把重排凭据保留在服务端。

`useChat`、`useCompletion`、`useEmbedding`、`useImage`、`useVideo`、`useSpeech`、`useTranscription`、`useRerank` 和
`useObject` 还提供 `setInput()`、`handleInputChange()` 和 `handleSubmit()`，便于接入简单表单。表单提交成功后会清空
`input`；失败时会保留输入内容。十者都支持 `initialInput`。

`useGeneration` 接收自定义 `fetcher`，并提供 typed `result`、`progress`、`chunks`、
`stop()`、`reset()`、生命周期回调，以及首个可见输出前的重试。

`useObject` 支持通过 `id` 在多个组件间共享结构化输出状态，也支持用
`initialValue` 初始化第一份部分对象。默认 proxy object 路由既可以返回 chat chunks，
也可以直接返回 `text/plain` JSON 文本流。
`experimental_useObject` 也会作为 AI SDK 兼容别名导出，指向同一个组合式函数。
它的 `onFinish` 会保持最终解析对象作为第一个参数，并通过 `ObjectFinishInfo`
传递最终对象、原始 JSON 文本、中止状态和错误字段。

`useCompletion` 的 `onFinish` 会保持最终文本作为第一个参数，并通过 `CompletionFinishInfo`
传递原始 prompt 和中止状态。

多个 `useCompletion()` 传入同一个 `id` 时，会在组件之间共享补全状态；不传 `id` 时会创建独立的自动生成状态。

### `usePersist(source, options)`

把任意 Vue `Ref` 持久化到 `localStorage`，支持版本号和自定义序列化。`useChat({ persist })` 内部会使用 Date-safe 的消息序列化；导出的 `serializeMessages()` / `deserializeMessages()` / `validateMessages()` / `safeValidateMessages()` / `validateUIMessages()` 也可以复用于后端持久化，并校验合法的 `Message.parts`、metadata schema 和自定义 data part schema。详见 [usePersist 参考](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/reference/use-persist.md)、[Provider 参考](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/reference/providers.md) 和 [公共类型](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/reference/types.md)。选型边界见 [选择 vue-ai-hooks](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/guide/choosing.md)。升级兼容性说明见 [API 稳定性指南](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/guide/api-stability.md)。如果你来自 `0.2.1`，请看 [v0.3.0 升级指南](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/guide/upgrade-0.3.md)。如果你正在迁移 AI SDK UI 界面，请看 [AI SDK 迁移指南](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/guide/ai-sdk-migration.md)。

## 示例

十个可运行示例位于 [`examples/`](https://github.com/hexinmiao96/vue-ai-hooks/tree/main/examples)：

- `examples/chat`：支持 Provider 切换、结构化 `Message.parts` 和本地工具审批演示的流式聊天 UI
- `examples/proxy-server`：本地后端代理模板，覆盖默认 `/api/*` 路由、显式 `/api/ai/*` 契约和 UI message stream 路由
- `examples/completion`：单次补全表单
- `examples/embedding`：成对余弦相似度热力图
- `examples/image`：不需要 key 的图片生成表单，默认返回确定性的本地 SVG
- `examples/video`：不需要 key 的视频生成表单，默认返回确定性的本地 storyboard
- `examples/speech`：不需要 key 的语音生成表单，默认返回确定性的本地 WAV
- `examples/transcription`：不需要 key 的音频转写表单，默认返回确定性的本地转写文本
- `examples/rerank`：不需要 key 的文档重排表单，默认返回确定性的本地排序
- `examples/object`：不需要 key 的结构化 JSON 抽取示例，内置本地 object Provider

运行方式：

```bash
pnpm install
cp .env.example .env
pnpm example:chat
```

`examples/chat` 默认使用由 `DirectChatTransport` 驱动、不需要 key 的 `local-tools` Provider；
只有显式选择 Provider 或配置真实 `VITE_OPENAI_KEY` 时才会请求外部模型服务。

要让浏览器聊天示例通过本地代理模板运行：

```bash
pnpm example:proxy-server
# 另开一个终端
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

同一个代理模板也支持 `useChat({ baseURL })`、`useCompletion({ baseURL })`、
`useEmbedding({ baseURL })`、`useImage({ baseURL })`、`useVideo({ baseURL })`、`useSpeech({ baseURL })` 和
`useTranscription({ baseURL })`、`useRerank({ baseURL })` 和 `useObject({ baseURL, schema })`
默认路径：`/api/chat`、`/api/completion`、`/api/embedding`、`/api/image`、
`/api/video`、`/api/speech`、`/api/transcription`、`/api/rerank`、`/api/object`。它还提供
`/api/ui-message-stream`，用于配合 `readUIMessageStream()` 检查 AI SDK UI message stream parts。Provider、proxy
和单次请求 headers 都接受 `HeadersInit`，普通对象、`Headers` 实例和
`[key, value][]` entries 都能使用。

如果要在不调用真实 Provider 的情况下稳定测试组件和组合式函数，请查看
[测试指南](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/zh/guide/testing.md)。

## 项目状态

这是 **v0.3.0**，是一个可工作的基础版本，但还不是功能完备版本。核心能力已覆盖主要
composable、Provider/proxy 适配、工具流、持久化、重试、流数据、metadata、共享状态和
质量门禁。下一步重点是更清晰的调试检查、更多 Provider 覆盖和生产级增强。

## 已知限制

- 浏览器示例会按设计暴露 `VITE_*` 值；生产应用应通过后端或边缘运行时代理
  Provider 请求。
- Tool calling helper 会执行本地 handler，但沙箱隔离和权限确认应由宿主应用负责。
- Provider adapter 覆盖常见 API 形态；Provider 专属重试、限流和可观测性应在需要
  时由宿主应用处理。

## 贡献

欢迎贡献。请查看 [`CONTRIBUTING.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CONTRIBUTING.md) 了解工作流，阅读 [`CODE_OF_CONDUCT.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/CODE_OF_CONDUCT.md)，也可以查看 [open bug issues](https://github.com/hexinmiao96/vue-ai-hooks/issues?q=is%3Aissue%20is%3Aopen%20label%3Abug) 中待处理的可复现缺陷。

使用问题、功能想法和支持渠道请查看 [`SUPPORT.md`](https://github.com/hexinmiao96/vue-ai-hooks/blob/main/SUPPORT.md)。

## License

[MIT](./LICENSE)
