# SSR 和 Nuxt

`vue-ai-hooks` 是 Vue 层的代码，不是服务端框架。它可以用于开启 SSR 的应用，
但模型凭据、浏览器专属 API 和流式响应需要明确归属。

## Provider 凭据只放服务端

不要把生产 Provider key 从服务端传进浏览器代码。任何 `VITE_*` 值一旦进入
客户端 bundle，就是公开信息。

SSR 或 Nuxt 应用建议采用这种结构：

- 浏览器组件调用你自己的 API route 或 server handler。
- server handler 注入上游 Provider key。
- 浏览器只接收需要的响应数据或 stream。

`proxyProvider` 就是这种结构下的浏览器侧 Provider：

```ts
import { useChat, proxyProvider } from 'vue-ai-hooks'

const { messages, append } = useChat({
  provider: proxyProvider({
    chatUrl: '/api/ai/chat',
    credentials: 'include'
  })
})
```

Provider 配置细节见 [Provider 指南](./providers.md)。

## 在客户端所属状态中运行组合式函数

`useChat`、`useCompletion`、`useEmbedding` 和 `useObject` 会管理 Vue ref 和用户交互状态。
SSR 应用中，应在按请求或按用户会话创建的组件/组合式函数里使用它们。不要在
模块顶层共享组合式函数状态，否则可能跨用户共享状态。

如果组件依赖浏览器专属 API，应让它只在客户端挂载，或使用框架提供的
client-only 模式保护浏览器代码。

## SSR 中的持久化

`usePersist` 只有在 `window.localStorage` 可用时才会使用它。SSR 期间
`window.localStorage` 不存在；除非你传入显式 `storage` 实现，否则持久化会
退化为 no-op。

服务端渲染场景：

- 不需要持久化时使用 `storage: null`。
- 测试中可传入内存版 `Storage` shim。
- 除非你明确映射到服务端 session store，否则按用户持久化应保留在客户端。

完整选项见 [`usePersist`](../reference/use-persist.md)。

## 通过后端转发流式响应

通过自己的后端或边缘运行时代理 Provider stream 时：

- 如果浏览器需要增量 chunk，应保留 Server-Sent Events framing。
- 尽量关闭 serverless、CDN 或反向代理层的响应缓冲。
- 运行时支持时，把浏览器请求的 abort signal 转发给上游 Provider 请求。
- 针对认证失败、额度不足、模型无效和 Provider 故障返回有用错误。

`examples/proxy-server` 是这些边界的最小 Node 模板。它让 Provider 凭据留在浏览器
契约之外，同时保留客户端需要的 SSE framing。可复制的上游环境变量和生产检查见
[Proxy 配方](./proxy-recipes.md)。

## 测试 SSR 边界

单元测试应使用 fake provider 和显式 storage，而不是调用真实 Provider 或依赖
全局 `localStorage`。fake provider 模式见 [测试指南](./testing.md)。
