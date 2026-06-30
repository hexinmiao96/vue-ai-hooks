# useRerank

通过应用自有后端路由做文档重排的 Vue 3 组合式函数。

公开 TypeScript 类型：`UseRerankOptions`、`UseRerankReturn`、
`RerankRequestInfo`、`RerankResponseInfo`、`RerankRequest`、`RerankResult`、
`RerankRankingItem`、`RerankDocument`、`RetryOptions` 和 `RetryContext`。

## 用法

```ts
import { useRerank } from 'vue-ai-hooks'

const { input, documents, rerankedDocuments, ranking, rerankDocuments } = useRerank<string>({
  api: '/api/rerank',
  initialInput: 'Vue AI search results',
  initialDocuments: [
    'Streaming chat state for Vue apps',
    'Billing workflow approval',
    'Document reranking for search'
  ]
})

await rerankDocuments(input.value, documents.value, {
  model: 'rerank-model',
  topN: 2
})

console.log(rerankedDocuments.value, ranking.value)
```

`useRerank` 始终调用你的应用后端。模型密钥应留在服务端，然后返回带
`ranking`、`rerankedDocuments` 或二者都有的 JSON。

接入表单时，可以绑定 `input`，设置 `documents`，并通过 `handleSubmit()` 提交：

```ts
const { input, documents, setDocuments, handleSubmit } = useRerank<string>({
  api: '/api/rerank'
})

setDocuments(['First result', 'Second result'])
await handleSubmit(undefined, { topN: 1 })
```

## 选项

| 名称               | 类型                                                                   | 默认值        | 说明                                            |
| ------------------ | ---------------------------------------------------------------------- | ------------- | ----------------------------------------------- |
| `api`              | `string`                                                               | `/api/rerank` | 应用后端的重排 URL。                            |
| `baseURL`          | `string`                                                               | -             | 拼接到相对 `api` 前的 base URL。                |
| `headers`          | `HeadersInit \| () => HeadersInit`                                     | -             | 发送给应用后端的静态或动态 headers。            |
| `body`             | `Record<string, unknown> \| ({ request }) => ...`                      | -             | 合并进每次 proxy 请求 JSON body 的额外字段。    |
| `credentials`      | `RequestCredentials`                                                   | -             | 同源 session cookie 的浏览器 credentials 模式。 |
| `fetch`            | `typeof fetch`                                                         | global        | 测试或非浏览器运行时使用的自定义 fetch。        |
| `timeoutMs`        | `number`                                                               | -             | 超过该毫秒数后中止后端请求。                    |
| `initialInput`     | `string`                                                               | `''`          | 初始查询文本。                                  |
| `initialDocuments` | `TDocument[]`                                                          | `[]`          | 初始待重排文档。                                |
| `defaultRequest`   | `Partial<RerankRequest<TDocument>>`                                    | `{}`          | 默认重排选项。                                  |
| `maxRetries`       | `number`                                                               | `0`           | 临时失败时最多重试几次。                        |
| `retryDelayMs`     | `number \| (context: RetryContext) => number`                          | `0`           | 每次重试前等待的毫秒数。                        |
| `shouldRetry`      | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -             | 覆盖默认的错误是否可重试判断。                  |
| `onRetry`          | `(error: Error, context: RetryContext) => void`                        | -             | 等待并重新发起请求前调用。                      |
| `onRequest`        | `(info: RerankRequestInfo<TDocument>) => void`                         | -             | 后端调用前，拿到最终请求。                      |
| `onResponse`       | `(info: RerankResponseInfo<TDocument>) => void`                        | -             | 后端返回重排数据后调用。                        |
| `onFinish`         | `(result: RerankResult<TDocument>) => void`                            | -             | 重排成功时调用。                                |
| `onError`          | `(e: Error) => void`                                                   | -             | 发生非中止错误时调用。                          |

## 返回值

| 属性                                    | 类型                                                                                                         | 说明                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `input`                                 | `Ref<string>`                                                                                                | 可绑定到表单的查询文本。                               |
| `query`                                 | `Ref<string>`                                                                                                | `input` 的别名。                                       |
| `documents`                             | `Ref<TDocument[]>`                                                                                           | 当前会发送给后端的待重排文档。                         |
| `originalDocuments`                     | `Ref<TDocument[]>`                                                                                           | 最近一次成功重排前的原始文档。                         |
| `rerankedDocuments`                     | `Ref<TDocument[]>`                                                                                           | 最近一次成功重排后的文档顺序。                         |
| `ranking`                               | `Ref<RerankRankingItem<TDocument>[]>`                                                                        | 包含 `index`、`score` 和 `document` 的排序行。         |
| `result`                                | `Ref<RerankResult<TDocument> \| null>`                                                                       | 完整后端结果，包括 provider metadata。                 |
| `status`                                | `Ref<AiRequestStatus>`                                                                                       | 请求生命周期：`ready`、`submitted` 或 `error`。        |
| `isLoading`                             | `Ref<boolean>`                                                                                               | 请求进行中时为 true。                                  |
| `error`                                 | `Ref<Error \| null>`                                                                                         | 最近一次非中止错误。                                   |
| `lastRequest`                           | `Ref<RerankRequestInfo<TDocument> \| null>`                                                                  | 最近一次准备完成的重排请求快照。                       |
| `lastResponse`                          | `Ref<RerankResponseInfo<TDocument> \| null>`                                                                 | 最近一次后端响应快照。                                 |
| `rerank(query?, docs?, opts?)`          | `(string?, TDocument[]?, Partial<RerankRequest<TDocument>>?) => Promise<RerankResult<TDocument>>`            | `rerankDocuments()` 的别名。                           |
| `rerankDocuments(query?, docs?, opts?)` | `(string?, TDocument[]?, Partial<RerankRequest<TDocument>>?) => Promise<RerankResult<TDocument>>`            | 重排文档；省略参数时使用当前 refs。                    |
| `stop()`                                | `() => void`                                                                                                 | 中止当前请求。                                         |
| `setInput(value)`                       | `(string) => void`                                                                                           | 手动替换查询文本。                                     |
| `setQuery(value)`                       | `(string) => void`                                                                                           | `setInput()` 的别名。                                  |
| `handleInputChange(e)`                  | `(Event \| { target } \| string) => void`                                                                    | 不使用 `v-model` 时接入自定义输入组件。                |
| `setDocuments(value)`                   | `(TDocument[]) => void`                                                                                      | 替换待重排文档数组。                                   |
| `handleSubmit(e, opts?)`                | `({ preventDefault?: () => void }?, Partial<RerankRequest<TDocument>>?) => Promise<RerankResult<TDocument>>` | 提交 refs；成功后清空查询。                            |
| `clearError()`                          | `() => void`                                                                                                 | 清空 `error`，并把 `status` 恢复为 `ready`。           |
| `clearTrace()`                          | `() => void`                                                                                                 | 清空 `lastRequest` 和 `lastResponse`，不改变结果。     |
| `clear()`                               | `() => void`                                                                                                 | 重置查询、文档、ranking、result、error、trace 和状态。 |
| `abortController`                       | `Ref<AbortController \| null>`                                                                               | 暴露给高级集成。                                       |

## 说明

- `defaultRequest.body`、顶层 `body` 和 `rerankDocuments(query, docs, { body })`
  会在发送 JSON 前合并；单次调用的 key 冲突时优先。
- 后端请求 JSON 会包含 `query`、`documents`、`model`、`topN`、
  `providerOptions`、`user` 等 typed 字段。
- `handleSubmit()` 只会在重排成功后清空 `input`；后端错误会保留查询和文档，方便重试。
- `onRequest(info)` 和 `onResponse(info)` 会包含解析后的 `api`、credentials 模式、
  headers、最终 JSON body 和 retry attempt。同一份最新快照也会暴露为
  `lastRequest` 和 `lastResponse`。
