# 快速开始

## 安装

```bash
pnpm add vue-ai-hooks
# 或
npm install vue-ai-hooks
```

`vue-ai-hooks` 需要 Vue 3.4 或更高版本。

## 先选一条路径

| 你想做什么                   | 从这里开始                                         |
| ---------------------------- | -------------------------------------------------- |
| 不配置 Provider key，先看 UI | 跑 [本地工具审批示例](#不需要-api-key-的-demo)     |
| 比较库的适用边界             | 阅读 [选择 vue-ai-hooks](/zh/guide/choosing)       |
| 从 v0.2.1 升级               | 阅读 [v0.3.0 升级指南](/zh/guide/upgrade-0.3)      |
| 迁移 AI SDK UI 应用          | 使用 [AI SDK 迁移指南](/zh/guide/ai-sdk-migration) |
| 验证自己的后端代理契约       | 跑 [proxy 模板](#本地试用后端代理模板)             |
| 在应用里接入聊天             | 复制 [第一个聊天应用](#第一个聊天应用)             |
| 选择模型 Provider            | 跳到 [使用不同 Provider](#使用不同-provider)       |

## 不需要 API key 的 Demo

最快的第一步是本地聊天示例。它使用确定性的 Provider，可以先体验流式 UI 和工具审批，
不用配置真实模型凭证：

```bash
pnpm install
pnpm example:chat
```

打开 Vite 输出的本地地址，然后点击 **Run approval demo**。当没有选择 Provider，且没有真实的
`VITE_OPENAI_KEY` 时，聊天示例会自动回退到 `local-tools`，显示 pending `chargeCard`
工具调用，并在执行 `approveToolCall()` 或 `rejectToolCall()` 后继续对话。

## 接真实 Provider 前的安全说明

浏览器应用中的任何 `VITE_*` key 都是公开的。示例只适合本地演示、原型或权限受限的 Provider key。生产环境应通过你自己的后端或边缘代理发送请求，并把上游 API key 保留在服务端。

## 第一个聊天应用

```vue
<script setup lang="ts">
import { useChat } from 'vue-ai-hooks'

const { messages, input, append, isLoading, stop, error } = useChat({
  api: '/api/chat',
  credentials: 'include'
})
</script>

<template>
  <div v-for="m in messages" :key="m.id" :class="m.role">
    {{ m.content }}
  </div>

  <textarea v-model="input" />
  <button
    :disabled="isLoading"
    @click="
      append(input)
      input = ''
    "
  >
    Send
  </button>
  <button :disabled="!isLoading" @click="stop">Stop</button>
  <p v-if="error">{{ error.message }}</p>
</template>
```

就这些。每条消息都会随着流式响应到达而写入 `messages`，内容会逐词增长。`isLoading` 会在流开始和结束时自动切换。

浏览器会把框架无关的 JSON 发给你自己的 `/api/chat` 路由。上游模型 key 留在该服务端路由中，
然后返回 SSE `ChatChunk` 对象或 AI SDK UI stream parts。

## 添加持久化

`persist` 选项会自动把 `messages` 保存到 localStorage，并在页面刷新后恢复：

```ts
const { messages, append, clear } = useChat({
  provider: openai({ apiKey: '...' }),
  persist: { key: 'my-app:thread-1' }
})
```

用户刷新页面后，上一次会话会从 `localStorage["my-app:thread-1"]` 恢复。调用 `clear()` 会移除这条记录。如果你改变了 `Message` 的结构，可以提升 `version` 来让旧数据失效。

默认聊天持久化会处理 Date：`createdAt` 保存时会变成 ISO 字符串，恢复后仍是 `Date`。
如果要把消息保存到自己的后端，写入前用 `serializeMessages(messages.value)`，读出后先用
`deserializeMessages(raw)`，再调用 `setMessages()`。

## 本地试用后端代理模板

proxy 示例同时支持默认组合式函数端点（`/api/chat`、`/api/completion`、
`/api/embedding`、`/api/image`、`/api/speech`、`/api/transcription`、`/api/rerank`、`/api/object`）和显式
`proxyProvider` 端点（`/api/ai/*`）。它会返回确定性的流式片段、结构化 JSON、图片 data URL、音频 data URL、转写文本、重排文档和 embedding，不需要任何第三方 API key：

```bash
pnpm example:proxy-server
# 另开一个终端
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

也可以把默认 transport 指到同一个本地服务：

```ts
useChat({ baseURL: 'http://127.0.0.1:8787' })
useCompletion({ baseURL: 'http://127.0.0.1:8787' })
useEmbedding({ baseURL: 'http://127.0.0.1:8787' })
useImage({ baseURL: 'http://127.0.0.1:8787' })
useSpeech({ baseURL: 'http://127.0.0.1:8787' })
useTranscription({ baseURL: 'http://127.0.0.1:8787' })
useRerank({ baseURL: 'http://127.0.0.1:8787' })
useObject({ baseURL: 'http://127.0.0.1:8787', schema })
```

这一步跑通后，把模板服务替换成你自己的 `/api/chat`、`/api/completion`、
`/api/embedding`、`/api/image`、`/api/speech`、`/api/transcription`、`/api/rerank` 和 `/api/object` 路由即可。

## 使用不同 Provider

每个 Provider 都实现同一个 `ChatProvider` 接口。要使用非 OpenAI 服务，只需要替换工厂函数：

```ts
import {
  useChat,
  anthropic,
  deepseek,
  gemini,
  openaiCompatible,
  openrouter,
  proxyProvider
} from 'vue-ai-hooks'

// Anthropic Claude
const { messages, append } = useChat({
  provider: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY })
})

// DeepSeek 直连
const { messages: messages2, append: append2 } = useChat({
  provider: deepseek({ apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY })
})

// OpenRouter 直连
const { messages: messages3, append: append3 } = useChat({
  provider: openrouter({ apiKey: import.meta.env.VITE_OPENROUTER_API_KEY })
})

// 通过 Google OpenAI-compatible 端点使用 Gemini
const { messages: messages4, append: append4 } = useChat({
  provider: gemini({ apiKey: import.meta.env.VITE_GEMINI_API_KEY })
})

// 其他 OpenAI-compatible 服务（Moonshot、智谱、Ollama、vLLM 等）
const { messages: messages5, append: append5 } = useChat({
  provider: openaiCompatible({
    apiKey: 'sk-...',
    baseURL: 'https://gateway.example.com/v1'
  })
})

// 生产环境浏览器应用通过自己的后端或边缘路由调用
const { messages: messages6, append: append6 } = useChat({
  provider: proxyProvider({
    chatUrl: '/api/ai/chat',
    headers: () => ({ Authorization: `Bearer ${getSessionToken()}` }),
    credentials: 'include'
  })
})
```

## 下一步

- [示例](/zh/examples/) - 按产品任务选择合适的组合式函数
- [Provider](/zh/guide/providers) - 如何添加自己的 Provider
- [useChat 参考](/zh/reference/use-chat) - 完整 API
- [useCompletion 参考](/zh/reference/use-completion)
- [useEmbedding 参考](/zh/reference/use-embedding)
- [useImage 参考](/zh/reference/use-image)
- [useSpeech 参考](/zh/reference/use-speech)
- [useTranscription 参考](/zh/reference/use-transcription)
- [useRerank 参考](/zh/reference/use-rerank)
- [useObject 参考](/zh/reference/use-object)
