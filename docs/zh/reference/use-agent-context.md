# useAgentContextRegistry

面向聊天和 agent 请求的无 UI、Vue 作用域应用上下文。

它不创建 Copilot UI、不调用 Provider，也不要求全局 Provider。可以用它从组件树收集响应式应用状态，
序列化成稳定的 system message，然后传给 `useChat()` 或你自己的 agent/proxy 层。

公开导出：`useAgentContextRegistry`、`useAgentContext`、`formatAgentContexts`、
`createAgentContextMessage`、`withAgentContextMessage`、`resolveAgentContexts`、
`AgentContextInput`、`AgentContextSnapshot`、`AgentContextRegistry`、
`AgentContextMessageOptions`、`AgentContextSerializable` 和 `AgentContextSource`。

## 配合 useChat 使用

```ts
import { useAgentContext, useAgentContextRegistry, useChat } from 'vue-ai-hooks'

const agentContext = useAgentContextRegistry()

useAgentContext(agentContext, {
  description: '当前 dashboard 过滤条件',
  value: () => ({
    status: selectedStatus.value,
    owner: selectedOwner.value
  })
})

const chat = useChat({
  api: '/api/chat',
  agentContext,
  agentContextMessage: {
    title: 'Runtime context'
  }
})
```

准备 chat 请求时，`useChat()` 会在已有的开头 system messages 后插入一条 system message：

```txt
Runtime context
- 当前 dashboard 过滤条件: {"status":"open","owner":"me"}
```

这条 context message 只进入 Provider 请求，不会追加到可见的 `messages` 历史里。

## 注册上下文

```ts
const unregister = useAgentContext(agentContext, {
  id: 'route',
  description: computed(() => `Route ${route.name}`),
  value: () => ({
    path: route.fullPath,
    selectedId: selectedTicketId.value
  }),
  enabled: () => Boolean(selectedTicketId.value)
})
```

`useAgentContext()` 会返回 `unregister()`。如果它在 Vue effect scope 或组件 setup 中调用，
作用域清理时也会自动 unregister。

## Registry API

| 属性或方法                     | 类型                                             | 说明                                           |
| ------------------------------ | ------------------------------------------------ | ---------------------------------------------- |
| `contexts`                     | `ComputedRef<AgentContextSnapshot[]>`            | 当前可序列化的上下文快照。                     |
| `register(input)`              | `(AgentContextInput) => () => void`              | 注册一条上下文，并返回 unregister。            |
| `toJSON()`                     | `() => AgentContextSnapshot[]`                   | 克隆快照，用于 request body 或日志。           |
| `toText(opts?)`                | `() => string`                                   | 格式化成模型可读文本。                         |
| `toSystemMessage(opts?)`       | `() => Message \| null`                          | 生成 `system` message；没有上下文时返回 null。 |
| `withContextMessage(messages)` | `(ChatRequestMessage[]) => ChatRequestMessage[]` | 把 context message 插入请求消息快照。          |
| `clear()`                      | `() => void`                                     | 移除所有已注册上下文。                         |

## 选项

### AgentContextInput

| 名称          | 类型                                            | 默认值 | 说明                                           |
| ------------- | ----------------------------------------------- | ------ | ---------------------------------------------- |
| `id`          | `string`                                        | 自动   | 这条上下文的稳定 id。                          |
| `description` | `MaybeRefOrGetter<string \| null \| undefined>` | -      | 给模型看的可读标签。                           |
| `value`       | `MaybeRefOrGetter<AgentContextSerializable>`    | -      | 可序列化值。ref、computed 和 getter 都会更新。 |
| `enabled`     | `MaybeRefOrGetter<boolean \| null>`             | `true` | 设为 false 时暂时省略该项，但不注销注册。      |

### AgentContextMessageOptions

| 名称        | 类型     | 默认值                  | 说明                                  |
| ----------- | -------- | ----------------------- | ------------------------------------- |
| `id`        | `string` | `'agent-context'`       | message id，用于避免重复 context 行。 |
| `title`     | `string` | `'Application context'` | 生成文本的第一行。                    |
| `createdAt` | `Date`   | `new Date()`            | 复制到 system message 的时间戳。      |

## 手动组装请求

也可以不使用 `useChat({ agentContext })`，而是直接调用 helper：

```ts
const body = {
  tenantId,
  context: agentContext.toJSON()
}

const messages = agentContext.withContextMessage(chat.messages.value)
```

如果后端希望在 `body` 中接收结构化上下文，而不是 system message，就使用这种方式。
