# 测试

`vue-ai-hooks` 的设计目标是让大部分应用测试都可以使用 fake provider，而不是
真实模型 API。这样测试更快、更稳定，也不需要网络凭据。

## 使用 fake provider

每个组合式函数都会接收一个 provider 对象。对于 `useChat`，实现
`ChatProvider` 接口，并按组件需要观察的顺序 yield chunk：

```ts
import type { ChatProvider, ChatChunk } from 'vue-ai-hooks'

function fakeChatProvider(chunks: ChatChunk[]): ChatProvider {
  return {
    id: 'fake',
    async chat() {
      return (async function* () {
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    },
    async completion() {
      return (async function* () {
        yield ''
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}
```

用小 chunk 验证流式行为：

```ts
const provider = fakeChatProvider([{ content: '你' }, { content: '好' }])
```

## 不依赖网络测试 completion

`useCompletion` 只需要 provider 提供 `completion()` stream：

```ts
import { useCompletion } from 'vue-ai-hooks'

const provider = {
  async completion() {
    return (async function* () {
      yield '你'
      yield '好'
    })()
  }
}

const { complete, completion } = useCompletion({
  provider: provider as Parameters<typeof useCompletion>[0]['provider']
})

await complete('Say hello')
expect(completion.value).toBe('你好')
```

## 稳定测试 embeddings

Embedding 测试应返回固定向量。不要对真实 Provider 输出做快照：

```ts
import type { ChatProvider } from 'vue-ai-hooks'

const provider: ChatProvider = {
  id: 'fake-embedding',
  async chat() {
    return (async function* () {
      yield {}
    })()
  },
  async completion() {
    return (async function* () {
      yield ''
    })()
  },
  async embedding() {
    return {
      embeddings: [
        [0.1, 0.2, 0.3],
        [0.3, 0.2, 0.1]
      ],
      model: 'fake-embed',
      usage: { promptTokens: 1, totalTokens: 1 }
    }
  }
}
```

## 测试 Provider 错误

测试错误状态时，可以从 fake provider 抛出普通 `Error`：

```ts
const provider = {
  async completion() {
    throw new Error('quota exceeded')
  }
}
```

组件应把 loading 状态、错误 UI 和重试入口展示清楚，让用户可以恢复。

## 使用显式 storage 测试持久化

测试持久化时，传入显式 storage 实现，不要依赖全局 `localStorage`。SSR 或 no-op
测试可以传 `storage: null`。

小型内存 storage 示例见 [`usePersist`](../reference/use-persist.md)。

## 哪些测试不应使用真实 Provider

单元测试应避免真实 Provider 调用。真实 Provider 检查应放到手动、夜间或
integration-only 工作流里，因为它们更慢、更容易波动，而且需要 secret。

单元测试应覆盖：

- 传给 fake provider 的请求 payload。
- 流式 chunk 累积。
- abort 和 retry UI 状态。
- 错误归一化和渲染。
- 持久化序列化和恢复行为。
