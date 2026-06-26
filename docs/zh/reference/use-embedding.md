# useEmbedding

用于生成文本 embedding 的 Vue 3 组合式函数。

公开 TypeScript 类型：`UseEmbeddingOptions`、`UseEmbeddingReturn`、
`EmbeddingRequestInfo`、`EmbeddingResponseInfo`、`RetryOptions` 和 `RetryContext`。

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

| 名称             | 类型                                                                   | 默认值 | 说明                              |
| ---------------- | ---------------------------------------------------------------------- | ------ | --------------------------------- |
| `provider`       | `ChatProvider`                                                         | 必填   | 要使用的 Provider。               |
| `defaultRequest` | `Partial<EmbeddingRequest>`                                            | `{}`   | 默认请求选项。                    |
| `maxRetries`     | `number`                                                               | `0`    | 临时失败时最多重试几次。          |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`    | 每次重试前等待的毫秒数。          |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -      | 覆盖默认的错误是否可重试判断。    |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | -      | 等待并重新发起请求前调用。        |
| `onRequest`      | `(info: EmbeddingRequestInfo) => void`                                 | -      | Provider 调用前，拿到最终请求。   |
| `onResponse`     | `(info: EmbeddingResponseInfo) => void`                                | -      | Provider 返回 embeddings 后调用。 |
| `onSuccess`      | `(result: EmbeddingResult) => void`                                    | -      | embedding 成功时调用。            |
| `onError`        | `(e: Error) => void`                                                   | -      | 发生错误时调用。                  |

## 返回值

| 属性                  | 类型                                                                          | 说明                                                 |
| --------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `embeddings`          | `Ref<number[][]>`                                                             | 最近一次生成的 embedding 向量。                      |
| `status`              | `Ref<AiRequestStatus>`                                                        | 请求生命周期：`ready`、`submitted` 或 `error`。      |
| `isLoading`           | `Ref<boolean>`                                                                | 请求进行中时为 true。                                |
| `error`               | `Ref<Error \| null>`                                                          | 最近一次错误。                                       |
| `result`              | `Ref<EmbeddingResult \| null>`                                                | 最近一次完整结果，包括 usage 统计。                  |
| `embed(input, opts?)` | `(string \| string[], Partial<EmbeddingRequest>) => Promise<EmbeddingResult>` | 生成 embeddings。                                    |
| `stop()`              | `() => void`                                                                  | 中止当前请求。                                       |
| `clearError()`        | `() => void`                                                                  | 清空 `error`，并把 `status` 恢复为 `ready`。         |
| `clear()`             | `() => void`                                                                  | 重置 embeddings、result 和 error，也会中止当前请求。 |
| `abortController`     | `Ref<AbortController \| null>`                                                | 暴露给高级用法。                                     |

## 说明

- Anthropic 没有 embeddings API。使用 Anthropic Provider 调用 `useEmbedding` 时，会抛出 `status: 501` 的 `AiHooksError`。
- 输入可以是单个字符串，也可以是字符串数组；字符串数组会在一次请求中批量处理。
- 可以通过 `defaultRequest.body` 或 `embed(input, { body })` 传入 Provider 专属 JSON
  请求字段。如果 key 冲突，`input`、`model`、`user` 这类 typed 字段优先。
- `onRequest(info)` 会在 Provider 执行前收到最终 `EmbeddingRequest`。
  `onResponse(info)` 会在 Provider 返回最终结果后执行。两者都包含从 1 开始的
  `attempt`、Provider id、input、body、headers 和请求快照。
- `maxRetries` 会在提交任何 embedding 结果前重试失败请求。
