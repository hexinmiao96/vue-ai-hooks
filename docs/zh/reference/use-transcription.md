# useTranscription

通过应用自有后端路由做音频转文字的 Vue 3 组合式函数。

公开 TypeScript 类型：`UseTranscriptionOptions`、`UseTranscriptionReturn`、
`TranscriptionRequestInfo`、`TranscriptionResponseInfo`、
`TranscriptionRequest`、`TranscriptionResult`、`TranscriptionSegment`、
`RetryOptions` 和 `RetryContext`。

## 用法

```ts
import { useTranscription } from 'vue-ai-hooks'

const { input, transcription, transcribeAudio, isLoading, error } = useTranscription({
  api: '/api/transcription',
  initialInput: 'data:audio/wav;base64,...'
})

await transcribeAudio(input.value, {
  language: 'en',
  timestampGranularities: ['segment']
})

console.log(transcription.value)
```

`useTranscription` 始终调用你的应用后端。模型密钥应留在服务端，然后返回类似
`{ text }`、字符串转写文本，或带 `transcription` 字符串字段的对象。

接入表单时，可以绑定 `input` 并通过 `handleSubmit()` 提交：

```ts
const { input, handleInputChange, handleSubmit, text } = useTranscription({
  api: '/api/transcription'
})

await handleSubmit(undefined, { language: 'en' })
```

## 选项

| 名称             | 类型                                                                   | 默认值               | 说明                                            |
| ---------------- | ---------------------------------------------------------------------- | -------------------- | ----------------------------------------------- |
| `api`            | `string`                                                               | `/api/transcription` | 应用后端的转写 URL。                            |
| `baseURL`        | `string`                                                               | -                    | 拼接到相对 `api` 前的 base URL。                |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | -                    | 发送给应用后端的静态或动态 headers。            |
| `body`           | `Record<string, unknown> \| ({ request }) => ...`                      | -                    | 合并进每次 proxy 请求 JSON body 的额外字段。    |
| `credentials`    | `RequestCredentials`                                                   | -                    | 同源 session cookie 的浏览器 credentials 模式。 |
| `fetch`          | `typeof fetch`                                                         | global               | 测试或非浏览器运行时使用的自定义 fetch。        |
| `timeoutMs`      | `number`                                                               | -                    | 超过该毫秒数后中止后端请求。                    |
| `initialInput`   | `string`                                                               | `''`                 | 初始音频 URL、data URL 或 base64 文本。         |
| `defaultRequest` | `Partial<TranscriptionRequest>`                                        | `{}`                 | 默认转写选项。                                  |
| `maxRetries`     | `number`                                                               | `0`                  | 临时失败时最多重试几次。                        |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`                  | 每次重试前等待的毫秒数。                        |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -                    | 覆盖默认的错误是否可重试判断。                  |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | -                    | 等待并重新发起请求前调用。                      |
| `onRequest`      | `(info: TranscriptionRequestInfo) => void`                             | -                    | 后端调用前，拿到最终请求。                      |
| `onResponse`     | `(info: TranscriptionResponseInfo) => void`                            | -                    | 后端返回转写文本后调用。                        |
| `onFinish`       | `(result: TranscriptionResult) => void`                                | -                    | 转写成功时调用。                                |
| `onError`        | `(e: Error) => void`                                                   | -                    | 发生非中止错误时调用。                          |

## 返回值

| 属性                             | 类型                                                                                                 | 说明                                                               |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `input`                          | `Ref<string>`                                                                                        | 可绑定到表单的音频 URL、data URL 或 base64 文本。                  |
| `transcription`                  | `Ref<string>`                                                                                        | 最近一次成功转写的文本。                                           |
| `text`                           | `Ref<string>`                                                                                        | `transcription` 的别名。                                           |
| `result`                         | `Ref<TranscriptionResult \| null>`                                                                   | 完整后端结果，包括 segments 或 provider metadata。                 |
| `status`                         | `Ref<AiRequestStatus>`                                                                               | 请求生命周期：`ready`、`submitted` 或 `error`。                    |
| `isLoading`                      | `Ref<boolean>`                                                                                       | 请求进行中时为 true。                                              |
| `error`                          | `Ref<Error \| null>`                                                                                 | 最近一次非中止错误。                                               |
| `lastRequest`                    | `Ref<TranscriptionRequestInfo \| null>`                                                              | 最近一次准备完成的转写请求快照。                                   |
| `lastResponse`                   | `Ref<TranscriptionResponseInfo \| null>`                                                             | 最近一次后端响应快照，包含归一化后的结果。                         |
| `inspect()`                      | `() => RequestInspectionSnapshot<TranscriptionRequestInfo, TranscriptionResponseInfo>`               | 生成可直接用于生产排障的快照：包含 timeline、重试记录与请求/响应。 |
| `transcribe(audio?, opts?)`      | `(string?, Partial<TranscriptionRequest>?) => Promise<TranscriptionResult>`                          | `transcribeAudio()` 的别名。                                       |
| `transcribeAudio(audio?, opts?)` | `(string?, Partial<TranscriptionRequest>?) => Promise<TranscriptionResult>`                          | 转写音频；省略 audio 时使用 `input.value`。                        |
| `stop()`                         | `() => void`                                                                                         | 中止当前请求。                                                     |
| `setInput(value)`                | `(string) => void`                                                                                   | 手动替换音频输入。                                                 |
| `handleInputChange(e)`           | `(Event \| { target } \| string) => void`                                                            | 不使用 `v-model` 时接入自定义输入组件。                            |
| `handleSubmit(e, opts?)`         | `({ preventDefault?: () => void }?, Partial<TranscriptionRequest>?) => Promise<TranscriptionResult>` | 提交 `input.value`；成功后清空 input。                             |
| `clearError()`                   | `() => void`                                                                                         | 清空 `error`，并把 `status` 恢复为 `ready`。                       |
| `clearTrace()`                   | `() => void`                                                                                         | 清空 `lastRequest` 和 `lastResponse`，不改变文本。                 |
| `clear()`                        | `() => void`                                                                                         | 重置 input、转写文本、result、error、trace 和状态。                |
| `abortController`                | `Ref<AbortController \| null>`                                                                       | 暴露给高级集成。                                                   |

## 说明

- `defaultRequest.body`、顶层 `body` 和 `transcribeAudio(audio, { body })` 会在发送
  JSON 前合并；单次调用的 key 冲突时优先。
- 后端请求 JSON 会包含 `audio`、`model`、`language`、`prompt`、`temperature`、
  `timestampGranularities`、`providerOptions`、`user` 等 typed 字段。
- `handleSubmit()` 只会在转写成功后清空 `input`；后端错误会保留音频输入，方便重试。
- `onRequest(info)` 和 `onResponse(info)` 会包含解析后的 `api`、credentials 模式、
  headers、最终 JSON body 和 retry attempt。同一份最新快照也会暴露为
  `lastRequest` 和 `lastResponse`。
- `stop()` 会中止当前请求，并且不会把主动中止写入 `error`。
