# useEmbedding

用于生成文本 embedding 的 Vue 3 组合式函数。

## 用法

```ts
import { useEmbedding, openai } from 'vue-ai-hooks'

const { embed, embeddings, isLoading, error } = useEmbedding({
  provider: openai({ apiKey: '...' })
})

const result = await embed(['hello world', 'goodbye world'])
console.log(result.embeddings) // number[][]
```

## 选项

| 名称 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `provider` | `ChatProvider` | 必填 | 要使用的 Provider。 |
| `defaultRequest` | `Partial<EmbeddingRequest>` | `{}` | 默认请求选项。 |
| `onSuccess` | `(result: EmbeddingResult) => void` | - | embedding 成功时调用。 |
| `onError` | `(e: Error) => void` | - | 发生错误时调用。 |

## 返回值

| 属性 | 类型 | 说明 |
|---|---|---|
| `embeddings` | `Ref<number[][]>` | 最近一次生成的 embedding 向量。 |
| `isLoading` | `Ref<boolean>` | 请求进行中时为 true。 |
| `error` | `Ref<Error \| null>` | 最近一次错误。 |
| `result` | `Ref<EmbeddingResult \| null>` | 最近一次完整结果，包括 usage 统计。 |
| `embed(input, opts?)` | `(string \| string[], Partial<EmbeddingRequest>) => Promise<EmbeddingResult>` | 生成 embeddings。 |
| `abortController` | `Ref<AbortController \| null>` | 暴露给高级用法。 |

## 说明

- Anthropic 没有 embeddings API。使用 Anthropic Provider 调用 `useEmbedding` 时，会抛出 `status: 501` 的 `AiHooksError`。
- 输入可以是单个字符串，也可以是字符串数组；字符串数组会在一次请求中批量处理。
