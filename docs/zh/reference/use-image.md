# useImage

通过应用自有后端路由生成和编辑图片的 Vue 3 组合式函数。

公开 TypeScript 类型：`UseImageOptions`、`UseImageReturn`、
`ImageEditOptions`、`ImageGenerationRequestInfo`、
`ImageGenerationResponseInfo`、`ImageGenerationRequest`、
`ImageGenerationResult`、`ImageOperation`、`ImageEditInput`、
`GeneratedImage`、`RetryOptions` 和 `RetryContext`。

## 用法

```ts
import { useImage } from 'vue-ai-hooks'

const { input, image, images, generateImage, isLoading, error } = useImage({
  api: '/api/image',
  initialInput: '一张极简 Vue 工作区主视觉'
})

await generateImage(input.value, {
  size: '1024x1024',
  providerOptions: { quality: 'high' }
})

console.log(image.value?.url)
console.log(images.value)
```

如果后端接入了图片编辑模型，可以通过 `editImage()` 传入源图 URL、data URL、base64
payload 或归一化图片对象：

```ts
const { editImage } = useImage({ api: '/api/image' })

await editImage('把背景替换成安静办公室', {
  image: { url: 'https://cdn.example.test/source.png', mediaType: 'image/png' },
  mask: 'data:image/png;base64,...',
  model: 'image-edit-model'
})
```

`useImage` 始终调用你的应用后端。模型密钥应留在服务端，然后返回类似
`{ images: [{ url, mediaType }] }`、`{ image: { url } }` 或单个图片对象的 JSON。
编辑请求会携带 `operation: "edit"`，后端可据此分流到具体模型。

接入表单时，可以绑定 `input` 并通过 `handleSubmit()` 提交：

```ts
const { input, handleInputChange, handleSubmit, image } = useImage({
  api: '/api/image'
})

await handleSubmit(undefined, { aspectRatio: '16:9' })
```

## 选项

| 名称             | 类型                                                                   | 默认值       | 说明                                            |
| ---------------- | ---------------------------------------------------------------------- | ------------ | ----------------------------------------------- |
| `api`            | `string`                                                               | `/api/image` | 应用后端的图片生成/编辑 URL。                   |
| `baseURL`        | `string`                                                               | -            | 拼接到相对 `api` 前的 base URL。                |
| `headers`        | `HeadersInit \| () => HeadersInit`                                     | -            | 发送给应用后端的静态或动态 headers。            |
| `body`           | `Record<string, unknown> \| ({ request }) => ...`                      | -            | 合并进每次 proxy 请求 JSON body 的额外字段。    |
| `credentials`    | `RequestCredentials`                                                   | -            | 同源 session cookie 的浏览器 credentials 模式。 |
| `fetch`          | `typeof fetch`                                                         | global       | 测试或非浏览器运行时使用的自定义 fetch。        |
| `timeoutMs`      | `number`                                                               | -            | 超过该毫秒数后中止后端请求。                    |
| `initialInput`   | `string`                                                               | `''`         | 初始表单提示词。                                |
| `defaultRequest` | `Partial<ImageGenerationRequest>`                                      | `{}`         | 默认图片生成或编辑选项。                        |
| `maxRetries`     | `number`                                                               | `0`          | 临时失败时最多重试几次。                        |
| `retryDelayMs`   | `number \| (context: RetryContext) => number`                          | `0`          | 每次重试前等待的毫秒数。                        |
| `shouldRetry`    | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -            | 覆盖默认的错误是否可重试判断。                  |
| `onRetry`        | `(error: Error, context: RetryContext) => void`                        | -            | 等待并重新发起请求前调用。                      |
| `onRequest`      | `(info: ImageGenerationRequestInfo) => void`                           | -            | 后端调用前，拿到最终请求。                      |
| `onResponse`     | `(info: ImageGenerationResponseInfo) => void`                          | -            | 后端返回图片后调用。                            |
| `onFinish`       | `(result: ImageGenerationResult) => void`                              | -            | 图片生成或编辑成功时调用。                      |
| `onError`        | `(e: Error) => void`                                                   | -            | 发生非中止错误时调用。                          |

## 返回值

| 属性                            | 类型                                                                                                     | 说明                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `input`                         | `Ref<string>`                                                                                            | 可绑定到图片表单的提示词输入。                                     |
| `image`                         | `Ref<GeneratedImage \| null>`                                                                            | 最近一次成功生成的第一张图片。                                     |
| `images`                        | `Ref<GeneratedImage[]>`                                                                                  | 最近一次成功生成的全部图片。                                       |
| `result`                        | `Ref<ImageGenerationResult \| null>`                                                                     | 完整后端结果，包括 warnings 或 provider metadata。                 |
| `status`                        | `Ref<AiRequestStatus>`                                                                                   | 请求生命周期：`ready`、`submitted` 或 `error`。                    |
| `isLoading`                     | `Ref<boolean>`                                                                                           | 请求进行中时为 true。                                              |
| `error`                         | `Ref<Error \| null>`                                                                                     | 最近一次非中止错误。                                               |
| `lastRequest`                   | `Ref<ImageGenerationRequestInfo \| null>`                                                                | 最近一次准备完成的图片请求快照。                                   |
| `lastResponse`                  | `Ref<ImageGenerationResponseInfo \| null>`                                                               | 最近一次后端响应快照，包含归一化后的结果。                         |
| `inspect()`                     | `() => RequestInspectionSnapshot<ImageGenerationRequestInfo, ImageGenerationResponseInfo>`               | 生成可直接用于生产排障的快照：包含 timeline、重试记录与请求/响应。 |
| `generate(prompt?, opts?)`      | `(string?, Partial<ImageGenerationRequest>?) => Promise<ImageGenerationResult>`                          | `generateImage()` 的别名。                                         |
| `generateImage(prompt?, opts?)` | `(string?, Partial<ImageGenerationRequest>?) => Promise<ImageGenerationResult>`                          | 生成图片；省略 prompt 时使用 `input.value`。                       |
| `editImage(prompt, opts)`       | `(string \| undefined, ImageEditOptions) => Promise<ImageGenerationResult>`                              | 通过同一个后端路由编辑源图。                                       |
| `stop()`                        | `() => void`                                                                                             | 中止当前请求。                                                     |
| `setInput(value)`               | `(string) => void`                                                                                       | 手动替换提示词输入。                                               |
| `handleInputChange(e)`          | `(Event \| { target } \| string) => void`                                                                | 不使用 `v-model` 时接入自定义输入组件。                            |
| `handleSubmit(e, opts?)`        | `({ preventDefault?: () => void }?, Partial<ImageGenerationRequest>?) => Promise<ImageGenerationResult>` | 提交 `input.value`；成功后清空 input。                             |
| `clearError()`                  | `() => void`                                                                                             | 清空 `error`，并把 `status` 恢复为 `ready`。                       |
| `clearTrace()`                  | `() => void`                                                                                             | 清空 `lastRequest` 和 `lastResponse`，不改变图片。                 |
| `clear()`                       | `() => void`                                                                                             | 重置 input、图片、result、error、trace 和状态。                    |
| `abortController`               | `Ref<AbortController \| null>`                                                                           | 暴露给高级集成。                                                   |

## 说明

- `defaultRequest.body`、顶层 `body` 和 `generateImage(prompt, { body })` 会在发送
  JSON 前合并；单次调用的 key 冲突时优先。
- 后端请求 JSON 会包含 `prompt`、`operation`、`image`、`mask`、`model`、`n`、
  `size`、`aspectRatio`、`seed`、`providerOptions`、`user` 等 typed 字段。
- `editImage()` 会设置 `operation: "edit"` 并要求提供 `image`；源图可以是 URL、data
  URL、base64 payload 或归一化图片对象。
- `handleSubmit()` 只会在图片生成成功后清空 `input`；后端错误会保留提示词，方便重试。
- `onRequest(info)` 和 `onResponse(info)` 会包含解析后的 `api`、credentials 模式、
  headers、最终 JSON body 和 retry attempt。同一份最新快照也会暴露为 `lastRequest`
  和 `lastResponse`，用于内部 trace 状态。UI 需要展示脱敏诊断信息时，应渲染 `inspect()` 输出。
- `stop()` 会中止当前请求，并且不会把主动中止写入 `error`。
