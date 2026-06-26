# useGeneration

用于一次性 AI 生成任务的 Provider 无关 Vue 3 组合式函数，例如图片生成、音频任务、摘要，或任何自定义异步模型调用。

公开 TypeScript 类型：`UseGenerationOptions`、`UseGenerationReturn`、
`GenerationFetcher`、`GenerationRunContext`、`GenerationRequestInfo`、
`GenerationResponseInfo`、`GenerateOptions`、`RetryOptions` 和
`RetryContext`。

## 用法

```ts
import { useGeneration } from 'vue-ai-hooks'

const { input, result, progress, chunks, generate, isLoading } = useGeneration<
  string,
  { url: string },
  { percent: number },
  string
>({
  initialInput: '一个极简 Vue 工作台',
  async fetcher(prompt, context) {
    context.reportProgress({ percent: 50 })
    context.reportChunk('queued')

    const response = await fetch('/api/image', {
      method: 'POST',
      signal: context.signal,
      body: JSON.stringify({ prompt })
    })

    return (await response.json()) as { url: string }
  }
})

await generate(input.value)
```

`useGeneration` 不限定 Provider 传输协议。把模型凭据留在服务端，在 `fetcher` 里调用你自己的路由即可。组合式函数负责 Vue 状态、取消信号、首个可见输出前的重试、进度、片段和回调。

## 选项

| 名称                    | 类型                                                                   | 默认值     | 说明                                            |
| ----------------------- | ---------------------------------------------------------------------- | ---------- | ----------------------------------------------- |
| `fetcher`               | `GenerationFetcher<TInput, TResult, TProgress, TChunk>`                | 必填       | 异步生成函数，接收输入和运行上下文。            |
| `id`                    | `string`                                                               | 自动生成   | Generation 状态标识；相同 id 会共享状态。       |
| `generateId`            | `IdGenerator`                                                          | `createId` | 未传 `id` 时用于生成 id。                       |
| `initialInput`          | `TInput`                                                               | -          | 初始输入。                                      |
| `initialResult`         | `TResult \| null`                                                      | `null`     | 初始或重置后的结果。                            |
| `initialProgress`       | `TProgress \| null`                                                    | `null`     | 初始或重置后的进度。                            |
| `defaultBody`           | `Record<string, unknown>`                                              | -          | 与单次调用 `body` 合并的默认 JSON-like 元数据。 |
| `maxRetries`            | `number`                                                               | `0`        | 进度或 chunk 出现前失败时最多重试几次。         |
| `retryDelayMs`          | `number \| (context: RetryContext) => number`                          | `0`        | 每次重试前等待的毫秒数。                        |
| `shouldRetry`           | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -          | 覆盖默认的错误是否可重试判断。                  |
| `onRetry`               | `(error: Error, context: RetryContext) => void`                        | -          | 等待并重新发起请求前调用。                      |
| `throttleMs`            | `number`                                                               | -          | 响应式进度和 chunk 更新之间的最小等待毫秒数。   |
| `experimental_throttle` | `number`                                                               | -          | AI SDK 风格兼容别名，建议用 `throttleMs`。      |
| `onRequest`             | `(info: GenerationRequestInfo<TInput>) => void`                        | -          | `fetcher` 运行前调用。                          |
| `onResponse`            | `(info: GenerationResponseInfo<TInput, TResult>) => void`              | -          | `fetcher` resolve 后调用。                      |
| `onProgress`            | `(progress: TProgress) => void`                                        | -          | `context.reportProgress()` flush 时调用。       |
| `onChunk`               | `(chunk: TChunk) => void`                                              | -          | `context.reportChunk()` flush 时调用。          |
| `onFinish`              | `(result: TResult) => void`                                            | -          | 最终结果写入后调用。                            |
| `onError`               | `(e: Error) => void`                                                   | -          | 非取消错误发生时调用。                          |

## Fetcher 上下文

`GenerationRunContext<TInput, TProgress, TChunk>` 包含：

```ts
interface GenerationRunContext<TInput, TProgress, TChunk> {
  id: string
  attempt: number
  input: TInput
  body?: Record<string, unknown>
  signal: AbortSignal
  reportProgress(progress: TProgress): void
  reportChunk(chunk: TChunk): void
}
```

把 `signal` 传给 `fetch()` 或 SDK 的取消入口。用 `reportProgress()` 上报百分比或任务阶段，用 `reportChunk()` 上报日志、预览 URL 或模型事件。

## 返回值

| 属性                      | 类型                                              | 说明                                                         |
| ------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| `id`                      | `Ref<string>`                                     | 组合式函数创建时选定的 Generation 状态 id。                  |
| `input`                   | `Ref<TInput \| undefined>`                        | 当前输入。                                                   |
| `result`                  | `Ref<TResult \| null>`                            | 最终生成结果。                                               |
| `progress`                | `Ref<TProgress \| null>`                          | fetcher 最近一次上报的进度。                                 |
| `chunks`                  | `Ref<TChunk[]>`                                   | 当前运行中 fetcher 上报的 chunk。                            |
| `status`                  | `Ref<AiRequestStatus>`                            | 请求生命周期：`ready`、`submitted`、`streaming` 或 `error`。 |
| `isLoading`               | `Ref<boolean>`                                    | 生成任务进行中时为 true。                                    |
| `error`                   | `Ref<Error \| null>`                              | 最近一次非取消错误。                                         |
| `generate(input?, opts?)` | `(TInput?, GenerateOptions?) => Promise<TResult>` | 运行 fetcher，并 resolve 最终结果。                          |
| `stop()`                  | `() => void`                                      | 中止当前生成任务。                                           |
| `setInput(value)`         | `(TInput \| undefined) => void`                   | 替换输入值。                                                 |
| `setResult(value)`        | `(TResult \| null) => void`                       | 手动替换结果。                                               |
| `clearError()`            | `() => void`                                      | 清空 `error`，并把 `status` 恢复为 `ready`。                 |
| `clear()`                 | `() => void`                                      | 重置 input、result、progress、chunks、error 和 status。      |
| `reset()`                 | `() => void`                                      | `clear()` 的别名。                                           |
| `abortController`         | `Ref<AbortController \| null>`                    | 暴露给高级集成。                                             |

## 说明

- `defaultBody` 和 `generate(input, { body })` 会在 `fetcher` 运行前合并；key 冲突时单次调用优先。
- `generate()` 不传 input 时会使用 `input.value`。两者都是 `undefined` 时会抛错。
- 多个 `useGeneration()` 传入同一个 `id` 时，会共享 input、result、progress、chunks、status、error、loading 和 abort 状态。
- 每次运行开始时，`result`、`progress` 和 `chunks` 都会重置。
- 开启 `maxRetries` 后，只会在 fetcher 上报 progress 或 chunk 之前重试，避免重复可见输出。
- `stop()` 会中止当前信号；取消不会写入 `error`。
- 设置 `throttleMs` 后，快速的 `reportProgress()` 和 `reportChunk()` 更新会批量刷新。
  `generate()` resolve 或 reject 前一定会刷新最终进度和 chunk。
