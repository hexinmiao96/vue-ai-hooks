# 升级到 v0.4.0

本页面面向当前使用 `vue-ai-hooks@0.3.x`、准备升级到 v0.4.0 的应用。

## 兼容性

v0.4.0 不会有意移除或重命名 v0.3.x 已文档化的公开导出。已有的聊天、补全、向量、
图片、语音、转写、重排、结构化对象、Provider 和 proxy 代码应该可以继续编译。

升级依赖：

```bash
pnpm add vue-ai-hooks@^0.4.0
# 或
npm install vue-ai-hooks@^0.4.0
```

然后运行你项目自己的类型检查和测试。本仓库的发布门禁是：

```bash
pnpm release:check
```

## 变化内容

### Chat 实例

当多个组件需要共享同一个会话控制器时，可以创建可复用的 `Chat` 实例：

```ts
import { Chat, useChat } from 'vue-ai-hooks'

export const supportChat = new Chat({
  id: 'support-thread',
  api: '/api/chat',
  credentials: 'include'
})

export function useSupportChat() {
  return useChat({ chat: supportChat })
}
```

传入 `chat` 后，`useChat()` 会直接返回这个实例，并忽略本次调用里的其它选项。Provider、
transport、持久化、回调和 id 配置应放在 `new Chat(...)` 这一步。

### 视频生成

`useVideo` 提供和图片、语音、转写、重排、结构化对象一致的应用自有后端路由模式：

```ts
const { video, videos, input, handleSubmit, stop, clear, lastRequest } = useVideo({
  api: '/api/video',
  defaultRequest: {
    model: 'video-model',
    aspectRatio: '16:9',
    resolution: '1280x720',
    duration: 6
  }
})
```

可以直接运行不需要 key 的示例：

```bash
pnpm example:video
```

它默认渲染确定性的本地 storyboard；配置 `VITE_PROXY_BASE_URL` 后会切到你的 proxy 路由。

### UI message stream 工具

v0.4.0 暴露了 Fetch 兼容的 AI SDK UI message stream 路由工具：

```ts
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  readUIMessageStream
} from 'vue-ai-hooks'
```

当后端需要输出 UI stream parts，而 Vue 组件仍希望消费归一化 chat chunks 时，可以使用这些
工具。可运行的 proxy 路由位于 `/api/ui-message-stream`：

```bash
pnpm example:proxy-server
```

### Transport 迁移

`DefaultChatTransport` 和 `DirectChatTransport` 覆盖常见 AI SDK 迁移路径：

- 浏览器需要调用自己的 `/api/chat` 路由时，使用 `DefaultChatTransport`。
- 测试、不需要 key 的 demo 或本地 agent 需要跳过 HTTP 时，使用 `DirectChatTransport`。
- 需要在错误进入 UI 状态前清洗本地 UI-message stream 错误时，使用
  `DirectChatTransport({ onError })`。

### Model message 转换

`convertToModelMessages()` 对生产聊天历史有更细的控制：

- `convertDataPart` 可以把自定义 `data-*` UI parts 转成模型可见内容。
- `ignoreIncompleteToolCalls` 会跳过尚无结果的 pending 或审批中工具调用。
- Tool 定义可以提供 `toModelOutput`，在把已保存工具结果发回模型前做转换。
- `stepCountIs()` 作为 `isStepCount()` 的 AI SDK 兼容别名导出。

### 持久化消息校验

从后端或外部存储恢复聊天历史前，可以先使用 `validateMessages()`、
`safeValidateMessages()`、`validateUIMessages()` 和 `safeValidateUIMessages()`。当持久化消息
包含结构化 parts、metadata 或自定义 data schema 时，这些校验会更有价值。

## 推荐迁移顺序

1. 升级依赖并运行类型检查。
2. 先保持已有 v0.3.x 聊天和 Provider 路径正常。
3. 只有在多个组件确实需要共享同一个控制器时，再迁移到 `new Chat(...)`。
4. 只有应用自有视频后端路由需要接入时，再加入 `useVideo`；真实 Provider key 仍留在服务端。
5. 先用本地 `/api/ui-message-stream` 验证后端 stream 契约，再替换成生产路由。
6. 如果你会持久化工具调用或自定义 `data-*` parts，检查 `convertToModelMessages()` 选项。
7. 发布应用或继续发包前运行 `pnpm release:check`。

## 什么时候暂时停留在 0.3.x

只有当你的应用还不能验证共享 `Chat` 实例用法，或后端 stream 格式暂时无法接入 UI message
stream parts 时，才建议暂时停留在 0.3.x。即使没有 Provider 凭证，也可以先验证新契约：

```bash
pnpm example:chat
pnpm example:video
pnpm example:proxy-server
```
