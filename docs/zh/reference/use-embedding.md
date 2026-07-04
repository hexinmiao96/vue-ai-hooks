# useEmbedding

用于生成文本 embedding 的 Vue 3 组合式函数。

公开 TypeScript 类型：`UseEmbeddingOptions`、`UseEmbeddingReturn`、
`EmbeddingRequestInfo`、`EmbeddingResponseInfo`、`RetryOptions` 和 `RetryContext`。

公开 helper：`cosineSimilarity`。

## 用法

```ts
import { cosineSimilarity, useEmbedding, openai } from 'vue-ai-hooks'

const { embed, embeddings, isLoading, error } = useEmbedding({
  provider: openai({ apiKey: '...' })
})

const result = await embed(['hello world', 'goodbye world'])
console.log(result.embeddings) // number[][]
console.log(cosineSimilarity(result.embeddings[0], result.embeddings[1]))
```

如果走应用自己的后端，可以不传 `provider`，直接使用默认 proxy transport：

```ts
const { embed } = useEmbedding({
  api: '/api/embedding',
  headers: { 'X-Session': sessionId },
  body: { tenantId }
})
```

接入表单时，可以绑定 `input` 并通过 `handleSubmit()` 提交：

```ts
const { input, handleInputChange, handleSubmit, embeddings } = useEmbedding({
  provider: openai({ apiKey: '...' }),
  initialInput: 'hello world'
})

await handleSubmit()
console.log(embeddings.value)
```

## 选项

| 名称             | 类型                                                                   | 默认值           | 说明                                           |
| ---------------- | ---------------------------------------------------------------------- | ---------------- | ---------------------------------------------- |
| `provider`       | `ChatProvider`                                                         | proxy            | 要使用的 Provider；省略时使用默认 proxy。      |
| `transport`      | `ChatProvider`                                                         | -                | AI SDK 风格的 `provider` 别名。                |
| `api`            | `string`                                                               | `/api/embedding` | 默认 proxy transport 的 embedding URL。        |
| `baseURL`        | `string`                                                               | -                | 拼接到默认 proxy transport URL 前的 base URL。 |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | -                | 默认 proxy 的静态或动态 headers。              |
| `body`           | `Record<string, unknown> \| () => ...`                                 | -                | 默认 proxy 附加到 JSON body 的字段。           |
| `credentials`    | `RequestCredentials`                                                   | -                | 默认 proxy 的浏览器 credentials 模式。         |
| `fetch`          | `typeof fetch`                                                         | global           | 默认 proxy 的自定义 fetch 实现。               |
| `initialInput`   | `string`                                                               | `''`             | 表单输入的初始文本。                           |
| `defaultRequest` | `Partial<EmbeddingRequest>`                                            | `{}`             | 默认请求选项。                                 |
| `maxRetries`     | `number`                                                               | `0`              | 临时失败时最多重试几次。                       |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`              | 每次重试前等待的毫秒数。                       |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -                | 覆盖默认的错误是否可重试判断。                 |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | -                | 等待并重新发起请求前调用。                     |
| `onRequest`      | `(info: EmbeddingRequestInfo) => void`                                 | -                | Provider 调用前，拿到最终请求。                |
| `onResponse`     | `(info: EmbeddingResponseInfo) => void`                                | -                | Provider 返回 embeddings 后调用。              |
| `onSuccess`      | `(result: EmbeddingResult) => void`                                    | -                | embedding 成功时调用。                         |
| `onError`        | `(e: Error) => void`                                                   | -                | 发生错误时调用。                               |

## 返回值

| 属性                     | 类型                                                                                         | 说明                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `embeddings`             | `Ref<number[][]>`                                                                            | 最近一次生成的 embedding 向量。                                          |
| `input`                  | `Ref<string>`                                                                                | 可绑定到 embedding 表单的文本输入。                                      |
| `status`                 | `Ref<AiRequestStatus>`                                                                       | 请求生命周期：`ready`、`submitted` 或 `error`。                          |
| `isLoading`              | `Ref<boolean>`                                                                               | 请求进行中时为 true。                                                    |
| `error`                  | `Ref<Error \| null>`                                                                         | 最近一次错误。                                                           |
| `result`                 | `Ref<EmbeddingResult \| null>`                                                               | 最近一次完整结果，包括 usage 统计。                                      |
| `lastRequest`            | `Ref<EmbeddingRequestInfo \| null>`                                                          | 最近一次准备完成的 embedding 请求快照。                                  |
| `lastResponse`           | `Ref<EmbeddingResponseInfo \| null>`                                                         | 最近一次 Provider 响应快照，包含完整结果。                               |
| `inspect()`              | `() => RequestInspectionSnapshot<EmbeddingRequestInfo, EmbeddingResponseInfo>`               | 生成可直接用于生产排障的快照：包含 timeline、重试记录与归一化请求/响应。 |
| `embed(input, opts?)`    | `(string \| string[], Partial<EmbeddingRequest>) => Promise<EmbeddingResult>`                | 生成 embeddings。                                                        |
| `stop()`                 | `() => void`                                                                                 | 中止当前请求。                                                           |
| `setInput(value)`        | `(string) => void`                                                                           | 手动替换表单输入。                                                       |
| `handleInputChange(e)`   | `(Event \| { target } \| string) => void`                                                    | 不使用 `v-model` 时接入自定义输入组件。                                  |
| `handleSubmit(e, opts?)` | `({ preventDefault?: () => void }?, Partial<EmbeddingRequest>?) => Promise<EmbeddingResult>` | 提交 `input.value`；成功后清空 input。                                   |
| `clearError()`           | `() => void`                                                                                 | 清空 `error`，并把 `status` 恢复为 `ready`。                             |
| `clearTrace()`           | `() => void`                                                                                 | 清空 `lastRequest` 和 `lastResponse`，不改变向量。                       |
| `clear()`                | `() => void`                                                                                 | 重置 embeddings、result 和 error，也会中止当前请求。                     |
| `abortController`        | `Ref<AbortController \| null>`                                                               | 暴露给高级用法。                                                         |

## 向量相似度

构建语义搜索、聚类、重复内容检测或本地 reranking UI 时，可以使用
`cosineSimilarity(vectorA, vectorB)` 比较两条 embedding 向量：

```ts
import { cosineSimilarity } from 'vue-ai-hooks'

const score = cosineSimilarity(queryEmbedding, documentEmbedding)
```

两条向量必须非空、长度一致、模长非零，并且只包含有限数字。返回值会被限制在
`[-1, 1]` 的余弦相似度范围内。

## 说明

- Anthropic 没有 embeddings API。使用 Anthropic Provider 调用 `useEmbedding` 时，会抛出 `status: 501` 的 `AiHooksError`。
- 省略 `provider` 和 `transport` 时，`useEmbedding` 会通过内置 proxy transport 调用
  `/api/embedding`。可以用 `api`、`baseURL`、`headers`、`body`、`credentials` 或
  `fetch` 配置这次请求。
- 输入可以是单个字符串，也可以是字符串数组；字符串数组会在一次请求中批量处理。
  表单 helpers 只管理单条文本输入；批量 embedding 仍直接调用 `embed([...])`。
- 可以通过 `defaultRequest.body` 或 `embed(input, { body })` 传入 Provider 专属 JSON
  请求字段。如果 key 冲突，`input`、`model`、`user` 这类 typed 字段优先。
- `handleSubmit()` 只会在 embedding 请求成功后清空 `input`；Provider 错误会保留文本，
  方便重试。
- `onRequest(info)` 会在 Provider 执行前收到最终 `EmbeddingRequest`。
  `onResponse(info)` 会在 Provider 返回最终结果后执行。两者都包含从 1 开始的
  `attempt`、Provider id、input、body、headers 和请求快照。
  同一份最新快照也会暴露为 `lastRequest` 和 `lastResponse`，用于内部 trace 状态。
  UI 需要展示脱敏诊断信息时，应渲染 `inspect()` 输出。
- `maxRetries` 会在提交任何 embedding 结果前重试失败请求。
