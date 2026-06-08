# 快速开始

## 安装

```bash
pnpm add vue-ai-hooks
# 或
npm install vue-ai-hooks
```

`vue-ai-hooks` 需要 Vue 3.4 或更高版本。

## 第一个聊天应用

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
  <p v-if="error">{{ error.message }}</p>
</template>
```

就这些。每条消息都会随着流式响应到达而写入 `messages`，内容会逐词增长。`isLoading` 会在流开始和结束时自动切换。

## 添加持久化

`persist` 选项会自动把 `messages` 保存到 localStorage，并在页面刷新后恢复：

```ts
const { messages, append, clear } = useChat({
  provider: openai({ apiKey: '...' }),
  persist: { key: 'my-app:thread-1' }
})
```

用户刷新页面后，上一次会话会从 `localStorage["my-app:thread-1"]` 恢复。调用 `clear()` 会移除这条记录。如果你改变了 `Message` 的结构，可以提升 `version` 来让旧数据失效。

## 使用不同 Provider

每个 Provider 都实现同一个 `ChatProvider` 接口。要使用非 OpenAI 服务，只需要替换工厂函数：

```ts
import { useChat, anthropic, openaiCompatible } from 'vue-ai-hooks'

// Anthropic Claude
const { messages, append } = useChat({
  provider: anthropic({ apiKey: import.meta.env.VITE_ANTHROPIC_KEY })
})

// 任何 OpenAI-compatible 服务（DeepSeek、Moonshot、智谱、Ollama 的
// OpenAI shim、vLLM 等）
const { messages: messages2, append: append2 } = useChat({
  provider: openaiCompatible({
    apiKey: 'sk-...',
    baseURL: 'https://api.deepseek.com/v1'
  })
})
```

## 下一步

- [Provider](/zh/guide/providers) - 如何添加自己的 Provider
- [useChat 参考](/zh/reference/use-chat) - 完整 API
- [useCompletion 参考](/zh/reference/use-completion)
- [useEmbedding 参考](/zh/reference/use-embedding)
