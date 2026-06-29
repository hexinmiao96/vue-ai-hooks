# useCompletion

用于单次流式补全的 Vue 3 组合式函数。

公开 TypeScript 类型：`UseCompletionOptions`、`UseCompletionReturn`、
`CompletionRequestInfo`、`CompletionResponseInfo`、`CompletionFinishInfo`、
`RetryOptions` 和 `RetryContext`。

## 用法

```ts
import { useCompletion, openai } from 'vue-ai-hooks'

const { completion, complete, isLoading, error } = useCompletion({
  provider: openai({ apiKey: '...' })
})

await complete('Write a haiku about TypeScript:')
```

如果走应用自己的后端，可以不传 `provider`，直接使用默认 proxy transport：

```ts
const { complete } = useCompletion({
  api: '/api/completion',
  headers: { 'X-Session': sessionId },
  body: { tenantId }
})
```

## 选项

| 名称                    | 类型                                                                   | 默认值            | 说明                                           |
| ----------------------- | ---------------------------------------------------------------------- | ----------------- | ---------------------------------------------- |
| `provider`              | `ChatProvider`                                                         | proxy             | 要使用的 Provider；省略时使用默认 proxy。      |
| `transport`             | `ChatProvider`                                                         | -                 | AI SDK 风格的 `provider` 别名。                |
| `api`                   | `string`                                                               | `/api/completion` | 默认 proxy transport 的 completion URL。       |
| `baseURL`               | `string`                                                               | -                 | 拼接到默认 proxy transport URL 前的 base URL。 |
| `headers`               | `Record<string, string> \| () => ...`                                  | -                 | 默认 proxy 的静态或动态 headers。              |
| `body`                  | `Record<string, unknown> \| () => ...`                                 | -                 | 默认 proxy 附加到 JSON body 的字段。           |
| `credentials`           | `RequestCredentials`                                                   | -                 | 默认 proxy 的浏览器 credentials 模式。         |
| `fetch`                 | `typeof fetch`                                                         | global            | 默认 proxy 的自定义 fetch 实现。               |
| `id`                    | `string`                                                               | 自动生成          | Completion 状态标识；相同 id 会共享状态。      |
| `generateId`            | `IdGenerator`                                                          | `createId`        | 未传 `id` 时用于生成 id。                      |
| `initialInput`          | `string`                                                               | `''`              | 初始表单 prompt。                              |
| `initialCompletion`     | `string`                                                               | `''`              | 初始补全文本。                                 |
| `defaultRequest`        | `Partial<CompletionRequest>`                                           | `{}`              | 默认请求选项。                                 |
| `maxRetries`            | `number`                                                               | `0`               | 首个 delta 到达前失败时最多重试几次。          |
| `retryDelayMs`          | `number \| (context: RetryContext) => number`                          | `0`               | 每次重试前等待的毫秒数。                       |
| `shouldRetry`           | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -                 | 覆盖默认的错误是否可重试判断。                 |
| `onRetry`               | `(error: Error, context: RetryContext) => void`                        | -                 | 等待并重新发起请求前调用。                     |
| `throttleMs`            | `number`                                                               | -                 | 响应式补全更新之间的最小等待毫秒数。           |
| `experimental_throttle` | `number`                                                               | -                 | AI SDK 风格兼容别名，建议用 `throttleMs`。     |
| `onUpdate`              | `(completion: string, delta: string) => void`                          | -                 | 每个非空流式 delta 追加后调用。                |
| `onRequest`             | `(info: CompletionRequestInfo) => void`                                | -                 | Provider 调用前，拿到最终补全请求。            |
| `onResponse`            | `(info: CompletionResponseInfo) => void`                               | -                 | Provider 返回补全 stream 后调用。              |
| `onFinish`              | `(completion: string, info: CompletionFinishInfo) => void`             | -                 | 补全完成时调用。                               |
| `onError`               | `(e: Error) => void`                                                   | -                 | 发生错误时调用。                               |

## 返回值

| 属性                          | 类型                                                                                 | 说明                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `id`                          | `Ref<string>`                                                                        | 组合式函数创建时选定的 Completion 状态 id。                          |
| `completion`                  | `Ref<string>`                                                                        | 当前补全文本，会在流式响应中持续增长。                               |
| `input`                       | `Ref<string>`                                                                        | prompt；如果没有直接传给 `complete()`，可以使用这里的值。            |
| `status`                      | `Ref<AiRequestStatus>`                                                               | 请求生命周期：`ready`、`submitted`、`streaming` 或 `error`。         |
| `isLoading`                   | `Ref<boolean>`                                                                       | 流式请求进行中时为 true。                                            |
| `error`                       | `Ref<Error \| null>`                                                                 | 最近一次错误。                                                       |
| `lastRequest`                 | `Ref<CompletionRequestInfo \| null>`                                                 | 最近一次准备完成的补全请求快照。                                     |
| `lastResponse`                | `Ref<CompletionResponseInfo \| null>`                                                | 最近一次 Provider 响应快照，包含 stream 是否已打开。                 |
| `complete(prompt?, opts?)`    | `(string?, Partial<CompletionRequest>) => Promise<string>`                           | 运行一次补全，并 resolve 最终字符串。                                |
| `stop()`                      | `() => void`                                                                         | 中止当前流式请求。                                                   |
| `setInput(value)`             | `(string) => void`                                                                   | 替换输入 prompt。                                                    |
| `handleInputChange(event)`    | `(Event \| { target?: { value?: unknown } } \| string) => void`                      | 从原生输入事件或字符串更新 `input`。                                 |
| `handleSubmit(event?, opts?)` | `({ preventDefault?: () => void }?, Partial<CompletionRequest>?) => Promise<string>` | 阻止默认表单提交，运行 `complete(input.value)`，成功后清空 `input`。 |
| `setCompletion(value)`        | `(string) => void`                                                                   | 替换补全文本，例如重置时使用。                                       |
| `clearError()`                | `() => void`                                                                         | 清空 `error`，并把 `status` 恢复为 `ready`。                         |
| `clearTrace()`                | `() => void`                                                                         | 清空 `lastRequest` 和 `lastResponse`，不改变补全文本。               |
| `abortController`             | `Ref<AbortController \| null>`                                                       | 暴露给高级用法。                                                     |

## 说明

- Anthropic 没有 `/v1/completions` 端点。使用 Anthropic Provider 时，`useCompletion` 会通过 `/v1/messages` 以单轮聊天形式实现。
- 省略 `provider` 和 `transport` 时，`useCompletion` 会通过内置 proxy transport 调用
  `/api/completion`。可以用 `api`、`baseURL`、`headers`、`body`、`credentials` 或
  `fetch` 配置这次请求。
- 多个 `useCompletion()` 传入同一个 `id` 时，会共享 `input`、`completion`、`status`、`error`、loading 和 abort 状态。某个 id 的第一次实例化会写入 `initialInput` 和 `initialCompletion`。
- 不传 `id` 时，每个实例会创建独立的自动生成状态。
- 每次调用 `complete()` 开始时，`completion` 都会重置为 `''`。
- 可以通过 `defaultRequest.body` 或 `complete(prompt, { body })` 传入 Provider 专属
  JSON 请求字段。如果 key 冲突，`prompt`、`model`、`stream` 这类 typed 字段优先。
- `handleSubmit()` 只会在补全成功后清空 `input`；Provider 错误会保留 prompt 供重试。
- `onFinish(completion, info)` 保持最终补全文本作为第一个参数，同时通过
  `info.prompt`、`info.completion` 和 `info.isAbort` 传递完成元信息。
- `onRequest(info)` 会在 Provider 执行前收到最终 `CompletionRequest`。
  `onResponse(info)` 会在 Provider 返回 stream 后执行。两者都包含从 1 开始的
  `attempt`、Provider id、prompt、body、headers 和请求快照。
  同一份最新快照也会暴露为 `lastRequest` 和 `lastResponse`，方便界面渲染诊断信息。
- 开启 `maxRetries` 后，流式补全只会在首个 delta 到达前失败时重试。
- 设置 `throttleMs` 后，快速流式响应中的 `completion` 和 `onUpdate` 会批量刷新。
  `complete()` resolve 前一定会刷新最终补全文本。
