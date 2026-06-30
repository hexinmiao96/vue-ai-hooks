# 选择 vue-ai-hooks

当你需要判断 `vue-ai-hooks` 是否适合某个 Vue AI 功能时，可以先看本页。这里比较的是产品适配度，不是给库排名。

## 简短结论

当你需要这些能力时，选择 `vue-ai-hooks`：

- 以 Vue 3 refs 和 composables 作为主要 API。
- 一个包里覆盖流式聊天、补全、embedding、结构化对象和自定义生成任务。
- 生产浏览器应用默认走自有 proxy 路由，避免暴露上游 key。
- 本地 demo、原型或受限 key 场景可以直连 Provider helper。
- 不引入完整 agent 框架，也能获得工具调用、工具审批、stream data、重试、持久化和请求检查。

如果你需要 React-first 的全栈 SDK、纯服务端 Provider SDK，或多 agent 编排框架，可以选择其他层。

## 决策表

| 你的任务是                                         | 从这里开始                                |
| -------------------------------------------------- | ----------------------------------------- |
| 构建 Vue 流式聊天 UI                               | `useChat`                                 |
| 调用自己的后端或边缘路由                           | 默认 proxy transport 或 `proxyProvider`   |
| 迁移已有 AI SDK UI 界面                            | [AI SDK 迁移](/zh/guide/ai-sdk-migration) |
| 在流开始前做 Provider failover                     | `fallbackProvider`                        |
| 不配置 Provider key，先跑本地工具审批 UX           | `examples/chat`                           |
| 构建 agent graph、retriever 或长时间运行的计划流程 | 在模型后面使用 workflow 或 agent 框架     |
| 和 React-first AI SDK UI 应用共享大量代码          | AI SDK UI 可能更适合作为主层              |

## 和常见替代方案对比

### Vercel AI SDK

[AI SDK](https://ai-sdk.dev/docs) 是覆盖面很广的全栈 SDK，提供 UI message stream
协议、transport、模型 adapter、工具调用和框架集成。

`vue-ai-hooks` 更窄：它专注 Vue composables、自有 proxy 路由、Provider adapter 和类型化
refs。它接受 AI SDK 风格概念，例如 `transport`、`messages`、`sendMessage()`、
`addToolOutput()`、`addToolApprovalResponse()`、`stopWhen`、`experimental_throttle`
和 UI message stream parts，方便团队逐步迁移。

如果你的主应用已经走 AI SDK 支持的框架路径，或希望它的全栈模型生态作为中心，可以选择 AI
SDK。如果你的中心是 Vue 状态和小 API 面，选择 `vue-ai-hooks`。

### LangChain.js

[LangChain.js](https://js.langchain.com/docs/) 适合 chain、agent、retriever、memory、
模型抽象和工具编排。

`vue-ai-hooks` 不是 agent 框架。它负责浏览器/应用 composable 层：渲染流、请求生命周期、
Provider/proxy transport、本地工具审批和 UI 诊断。需要编排时，可以在 API 路由背后使用
LangChain 或类似后端框架，然后把 `ChatChunk` 或 AI SDK UI stream parts 返回给
`vue-ai-hooks`。

### 手写 fetch 和 SSE 解析

手写 `fetch` 加 SSE 解析可以撑住一个 demo。等你需要 abort、重试、状态、stream
throttling、工具调用、usage、metadata、fallback、持久化、结构化对象输出和测试 fake 时，维护成本会快速上升。

`vue-ai-hooks` 把这些关注点收进一个可复用 Vue 层，同时仍然允许你完全拥有后端协议。

### VueUse

[VueUse](https://vueuse.org/) 是通用 Vue 工具集合。它可以和本库互补，但不提供 LLM
Provider adapter、AI stream 解析、工具调用或模型请求序列化。

通用浏览器和响应式工具用 VueUse；AI 请求生命周期用 `vue-ai-hooks`。

## 架构适配

推荐的生产路径：

```mermaid
flowchart LR
  UI["Vue component"] --> Hook["vue-ai-hooks composable"]
  Hook --> Proxy["app backend / edge route"]
  Proxy --> Provider["model provider or agent service"]
```

这样 Provider 凭据留在服务端，应用后端负责限流、租户策略、日志和 Provider 专属重试。

直连 Provider 适合本地 demo、内部工具和受限 key：

```ts
const chat = useChat({
  provider: deepseek({
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
    timeoutMs: 30_000
  })
})
```

## 本包刻意不负责什么

- Provider 账单、配额策略和限流。
- 会执行高权限动作的工具沙箱。
- 长时间运行的 agent planning 或 retrieval pipeline。
- 服务端密钥存储。
- 厂商专属可观测性后端。

这些应该放在你的应用后端或 agent 服务里。`vue-ai-hooks` 给 Vue 界面提供调用它们的稳定契约。
