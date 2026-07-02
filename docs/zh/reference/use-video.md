# useVideo

通过应用自有后端路由生成视频的 Vue 3 组合式函数。

公开 TypeScript 类型：`UseVideoOptions`、`UseVideoReturn`、
`VideoGenerationRequestInfo`、`VideoGenerationResponseInfo`、
`VideoGenerationRequest`、`VideoGenerationResult`、`VideoFrameImage`、
`GeneratedVideo`、`RetryOptions` 和 `RetryContext`。

## 用法

```ts
import { useVideo } from 'vue-ai-hooks'

const { input, video, videos, generateVideo, isLoading, error } = useVideo({
  api: '/api/video',
  initialInput: '为一个 Vue AI 仪表盘生成简短产品演示视频'
})

await generateVideo(input.value, {
  aspectRatio: '16:9',
  resolution: '1280x720',
  duration: 6,
  providerOptions: { quality: 'high' }
})

console.log(video.value?.url)
console.log(videos.value)
```

`useVideo` 始终调用你的应用后端。模型密钥应留在服务端，然后返回类似
`{ videos: [{ url, mediaType }] }`、`{ video: { url } }`、单个视频对象，或字符串 URL
的 JSON。

表单接线时，把 `input` 绑定到输入框，并通过 `handleSubmit()` 提交：

```ts
const { input, handleInputChange, handleSubmit, video } = useVideo({
  api: '/api/video'
})

await handleSubmit(undefined, { aspectRatio: '9:16', duration: 4 })
```

## 选项

| 名称             | 类型                                                                   | 默认值       | 说明                                           |
| ---------------- | ---------------------------------------------------------------------- | ------------ | ---------------------------------------------- |
| `api`            | `string`                                                               | `/api/video` | 应用后端的视频生成 URL。                       |
| `baseURL`        | `string`                                                               | -            | 拼接到相对 `api` 前面的 base URL。             |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | -            | 发送给后端的静态或动态 headers。               |
| `body`           | `Record<string, unknown> \| ({ request }) => ...`                      | -            | 合并到每次 proxy 请求中的额外 JSON body 字段。 |
| `credentials`    | `RequestCredentials`                                                   | -            | 浏览器凭据模式，用于同源 session cookie。      |
| `fetch`          | `typeof fetch`                                                         | global       | 测试或特殊运行时使用的自定义 fetch。           |
| `timeoutMs`      | `number`                                                               | -            | 超过该毫秒数后中止后端请求。                   |
| `initialInput`   | `string`                                                               | `''`         | 初始化表单提示词。                             |
| `defaultRequest` | `Partial<VideoGenerationRequest>`                                      | `{}`         | 默认视频生成选项。                             |
| `maxRetries`     | `number`                                                               | `0`          | 临时失败时的重试次数。                         |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`          | 每次重试前的等待时间。                         |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -            | 覆盖默认可重试错误判断。                       |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | -            | 每次等待并重试前调用。                         |
| `onRequest`      | `(info: VideoGenerationRequestInfo) => void`                           | -            | 后端调用前，拿到最终请求。                     |
| `onResponse`     | `(info: VideoGenerationResponseInfo) => void`                          | -            | 后端返回视频后调用。                           |
| `onFinish`       | `(result: VideoGenerationResult) => void`                              | -            | 视频生成成功时调用。                           |
| `onError`        | `(e: Error) => void`                                                   | -            | 非 abort 错误时调用。                          |

## 返回值

| 属性                            | 类型                                                                                                     | 说明                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `input`                         | `Ref<string>`                                                                                            | 视频表单的提示词绑定。                                             |
| `video`                         | `Ref<GeneratedVideo \| null>`                                                                            | 最近一次成功生成的第一段视频。                                     |
| `videos`                        | `Ref<GeneratedVideo[]>`                                                                                  | 最近一次成功生成的全部视频。                                       |
| `result`                        | `Ref<VideoGenerationResult \| null>`                                                                     | 完整后端结果，包括 warnings 或 provider metadata。                 |
| `status`                        | `Ref<AiRequestStatus>`                                                                                   | 请求生命周期：`ready`、`submitted` 或 `error`。                    |
| `isLoading`                     | `Ref<boolean>`                                                                                           | 请求进行中时为 true。                                              |
| `error`                         | `Ref<Error \| null>`                                                                                     | 最近一次非 abort 错误。                                            |
| `lastRequest`                   | `Ref<VideoGenerationRequestInfo \| null>`                                                                | 最近一次准备完成的视频请求快照。                                   |
| `lastResponse`                  | `Ref<VideoGenerationResponseInfo \| null>`                                                               | 最近一次后端响应快照，包含归一化后的结果。                         |
| `inspect()`                     | `() => RequestInspectionSnapshot<VideoGenerationRequestInfo, VideoGenerationResponseInfo>`               | 生成可直接用于生产排障的快照：包含 timeline、重试记录与请求/响应。 |
| `generate(prompt?, opts?)`      | `(string?, Partial<VideoGenerationRequest>?) => Promise<VideoGenerationResult>`                          | `generateVideo()` 的别名。                                         |
| `generateVideo(prompt?, opts?)` | `(string?, Partial<VideoGenerationRequest>?) => Promise<VideoGenerationResult>`                          | 生成视频；省略 prompt 时使用 `input.value`。                       |
| `stop()`                        | `() => void`                                                                                             | 中止当前请求。                                                     |
| `setInput(value)`               | `(string) => void`                                                                                       | 手动替换提示词输入。                                               |
| `handleInputChange(e)`          | `(Event \| { target } \| string) => void`                                                                | 不使用 `v-model` 时接入自定义输入组件。                            |
| `handleSubmit(e, opts?)`        | `({ preventDefault?: () => void }?, Partial<VideoGenerationRequest>?) => Promise<VideoGenerationResult>` | 提交 `input.value`；成功后清空 input。                             |
| `clearError()`                  | `() => void`                                                                                             | 清空 `error`，并把 `status` 改回 `ready`。                         |
| `clearTrace()`                  | `() => void`                                                                                             | 清空 `lastRequest` 和 `lastResponse`，不改变视频结果。             |
| `clear()`                       | `() => void`                                                                                             | 重置 input、视频、result、error、trace 和 status。                 |
| `abortController`               | `Ref<AbortController \| null>`                                                                           | 暴露给高级集成使用。                                               |

## 说明

- `defaultRequest.body`、顶层 `body` 和 `generateVideo(prompt, { body })` 会在发送
  JSON 给后端前合并。字段冲突时，每次调用传入的键优先。
- 后端请求 JSON 包含 `prompt`、`model`、`n`、`aspectRatio`、`resolution`、`size`、
  `duration`、`fps`、`seed`、`image`、`frameImages`、`inputReferences`、
  `generateAudio`、`providerOptions` 和 `user` 等类型化字段。
- `handleSubmit()` 只会在视频生成成功后清空 `input`。后端错误会保留提示词，方便重试。
- `onRequest(info)` 和 `onResponse(info)` 会包含解析后的 `api`、credentials 模式、
  headers、最终 JSON body 和 retry attempt。同样的最新快照也可通过 `lastRequest` 和
  `lastResponse` 读取。
- `stop()` 会中止当前请求，并且 abort 不会写入 `error`。
