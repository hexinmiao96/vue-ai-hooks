# useCompletion

用于单次流式补全的 Vue 3 组合式函数。

公开 TypeScript 类型：`UseCompletionOptions` 和 `UseCompletionReturn`。

## 用法

```ts
import { useCompletion, openai } from 'vue-ai-hooks'

const { completion, complete, isLoading, error } = useCompletion({
  provider: openai({ apiKey: '...' })
})

await complete('Write a haiku about TypeScript:')
```

## 选项

| 名称                | 类型                           | 默认值 | 说明                |
| ------------------- | ------------------------------ | ------ | ------------------- |
| `provider`          | `ChatProvider`                 | 必填   | 要使用的 Provider。 |
| `initialCompletion` | `string`                       | `''`   | 初始补全文本。      |
| `defaultRequest`    | `Partial<CompletionRequest>`   | `{}`   | 默认请求选项。      |
| `onFinish`          | `(completion: string) => void` | -      | 补全完成时调用。    |
| `onError`           | `(e: Error) => void`           | -      | 发生错误时调用。    |

## 返回值

| 属性                       | 类型                                                       | 说明                                                      |
| -------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `completion`               | `Ref<string>`                                              | 当前补全文本，会在流式响应中持续增长。                    |
| `input`                    | `Ref<string>`                                              | prompt；如果没有直接传给 `complete()`，可以使用这里的值。 |
| `isLoading`                | `Ref<boolean>`                                             | 流式请求进行中时为 true。                                 |
| `error`                    | `Ref<Error \| null>`                                       | 最近一次错误。                                            |
| `complete(prompt?, opts?)` | `(string?, Partial<CompletionRequest>) => Promise<string>` | 运行一次补全，并 resolve 最终字符串。                     |
| `stop()`                   | `() => void`                                               | 中止当前流式请求。                                        |
| `setCompletion(value)`     | `(string) => void`                                         | 替换补全文本，例如重置时使用。                            |
| `abortController`          | `Ref<AbortController \| null>`                             | 暴露给高级用法。                                          |

## 说明

- Anthropic 没有 `/v1/completions` 端点。使用 Anthropic Provider 时，`useCompletion` 会通过 `/v1/messages` 以单轮聊天形式实现。
- 每次调用 `complete()` 开始时，`completion` 都会重置为 `''`。
