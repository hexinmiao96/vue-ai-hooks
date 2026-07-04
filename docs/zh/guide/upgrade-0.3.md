# 升级到 v0.3.0

本页面面向当前使用 `vue-ai-hooks@0.2.1`、准备升级到 v0.3.0 的应用。

## 兼容性

v0.3.0 不会有意移除或重命名 v0.2.1 已文档化的公开导出。已有的 `useChat`、
`useCompletion`、`useEmbedding`、`useObject`、Provider 和 proxy 代码应该可以继续编译。

升级依赖：

```bash
pnpm add vue-ai-hooks@^0.3.0
# 或
npm install vue-ai-hooks@^0.3.0
```

然后运行你项目自己的类型检查和测试。本仓库的发布门禁是：

```bash
pnpm release:check
```

## 变化内容

### 默认 proxy transport

现在可以省略 `provider`，直接调用你自己的后端路由：

```ts
const chat = useChat({ api: '/api/chat', credentials: 'include' })
const completion = useCompletion({ api: '/api/completion' })
const embedding = useEmbedding({ api: '/api/embedding' })
const object = useObject({ api: '/api/object', schema })
```

这是生产浏览器应用的推荐路径，因为上游 Provider key 会留在服务端。

### 请求检查

所有主要组合式函数都暴露 `lastRequest`、`lastResponse` 和 `clearTrace()`，可以不用包一层
Provider 就保留内部请求 trace 状态。调试面板需要脱敏支持输出时，应使用 `inspect()` /
`inspectRequestTrace()`：

```ts
const { lastRequest, lastResponse, clearTrace } = useChat({ api: '/api/chat' })
```

### Provider fallback

需要在流开始前切换备用 Provider 时，可以使用 `fallbackProvider()`：

```ts
const provider = fallbackProvider({
  providers: [
    deepseek({ apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY }),
    openrouter({ apiKey: import.meta.env.VITE_OPENROUTER_API_KEY })
  ]
})
```

一旦某个 Provider 已经产出 stream chunk，就不会再 fallback，避免同一次 UI 响应混入多个 Provider 的内容。

### 直连 Provider 超时

OpenAI-compatible、OpenRouter、Gemini、DeepSeek 和 Anthropic 直连 Provider 都支持
`timeoutMs`：

```ts
const provider = deepseek({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
  timeoutMs: 30_000
})
```

### DeepSeek helper

使用一等公民 DeepSeek helper，不需要再手写通用 OpenAI-compatible 配置：

```ts
const provider = deepseek({
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY
})
```

它默认使用 `https://api.deepseek.com` 和 `deepseek-v4-flash`。

### Chat UX helper

v0.3.0 在已有 Vue 状态模型上增加了 AI SDK 风格 helper：

- `sendMessage()` 用于发送消息。
- `addToolOutput()` 和 `addToolApprovalResponse()` 用于工具结果流程。
- `resumeStream()` 用于可恢复 proxy stream。
- `prepareStep`、`stopWhen`、`sendAutomaticallyWhen` 和工具审批 predicate 用于多步骤聊天循环。
- `messages` 可作为 `initialMessages` 的别名。

### 流数据和消息 parts

Proxy stream 现在可以携带结构化 `Message.parts`、`streamData`、metadata、source/file
parts，以及 AI SDK UI message stream parts。已有的纯文本消息仍然可用。

## 推荐迁移顺序

1. 升级包并运行类型检查。
2. 先保持现有 Provider 调用正常。
3. 将生产浏览器请求迁移到默认 proxy transport 或 `proxyProvider`。
4. 把 `inspect()` / `inspectRequestTrace()` 输出接入内部调试视图。
5. 为直连 Provider 实验加上 `timeoutMs`。
6. 把通用 DeepSeek 配置替换为 `deepseek()`。

## 什么时候暂时停留在 0.2.1

只有当你的发布流程暂时不能接受新的公开导出，或需要先验证后端 proxy 契约时，才建议暂时停留在
0.2.1。验证 proxy 时可以运行本地模板：

```bash
pnpm example:proxy-server
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```
