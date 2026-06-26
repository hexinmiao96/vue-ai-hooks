# useObject

用于结构化 JSON 输出的组合式函数，适合提示词最终应返回一个可解析对象的场景。

公开 TypeScript 类型：`UseObjectOptions`、`UseObjectReturn`、`DeepPartial`、
`ObjectRequestInfo`、`ObjectResponseInfo`、`ResponseFormat`、`IdGenerator`、
`RetryOptions` 和 `RetryContext`。

## 用法

```ts
import { useObject, openai } from 'vue-ai-hooks'

type Ticket = {
  title: string
  priority: 'low' | 'high'
}

const { object, partialObject, text, input, submit, isLoading, error } = useObject<Ticket>({
  provider: openai({ apiKey: '...' }),
  schemaName: 'ticket',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      priority: { type: 'string', enum: ['low', 'high'] }
    },
    required: ['title', 'priority'],
    additionalProperties: false
  }
})

await submit('把这段客户反馈整理成工单。')
console.log(partialObject.value?.title)
console.log(object.value?.priority)
```

`text` 保存流式返回的原始 JSON 文本。`partialObject` 会在当前流可以修复成合法 JSON 时更新为
`DeepPartial<T>`。只有最终文本成功解析后，`object` 才会被赋值。

## 选项

| 名称                    | 类型                                                                   | 默认值     | 说明                                                        |
| ----------------------- | ---------------------------------------------------------------------- | ---------- | ----------------------------------------------------------- |
| `provider`              | `ChatProvider`                                                         | 必填       | 用于发送结构化聊天请求的 Provider。                         |
| `id`                    | `string`                                                               | 自动生成   | Object 状态 id；相同 id 会在多个实例间共享状态。            |
| `schema`                | `Record<string, unknown>`                                              | 必填       | 通过 `responseFormat` 发送的 JSON Schema。                  |
| `schemaName`            | `string`                                                               | `'object'` | Provider 侧 JSON Schema 的名称。                            |
| `schemaDescription`     | `string`                                                               | -          | 可选的 schema 描述。                                        |
| `strict`                | `boolean`                                                              | `true`     | 支持该能力的 Provider 会使用 strict 模式。                  |
| `initialObject`         | `T \| null`                                                            | `null`     | submit 前和 `clear()` 后使用的对象值。                      |
| `initialValue`          | `DeepPartial<T> \| null`                                               | -          | AI SDK 风格的初始部分对象值。                               |
| `defaultRequest`        | `Partial<ChatRequest>`                                                 | `{}`       | 每次 submit 都会合并的默认请求参数。                        |
| `generateId`            | `IdGenerator`                                                          | `createId` | 覆盖自动生成 object 和 prompt message id 的逻辑。           |
| `maxRetries`            | `number`                                                               | `0`        | 首个 stream chunk 到达前失败时最多重试几次。                |
| `retryDelayMs`          | `number \| (context: RetryContext) => number`                          | `0`        | 每次重试前等待的毫秒数。                                    |
| `shouldRetry`           | `(error: Error, context: RetryContext) => boolean \| Promise<boolean>` | -          | 覆盖默认的错误是否可重试判断。                              |
| `onRetry`               | `(error: Error, context: RetryContext) => void`                        | -          | 等待并重新发起请求前调用。                                  |
| `throttleMs`            | `number`                                                               | -          | 响应式 `text` 和 `partialObject` 更新之间的最小等待毫秒数。 |
| `experimental_throttle` | `number`                                                               | -          | AI SDK 风格兼容别名，建议用 `throttleMs`。                  |
| `onChunk`               | `(chunk: ChatChunk, text: string) => void`                             | -          | 每个流式 chat chunk 应用后调用。                            |
| `onPartial`             | `(partialObject: DeepPartial<T>, text: string) => void`                | -          | 当前 JSON 流可以解析为部分对象时调用。                      |
| `onRequest`             | `(info: ObjectRequestInfo) => void`                                    | -          | Provider 调用前，拿到最终结构化 chat 请求。                 |
| `onResponse`            | `(info: ObjectResponseInfo) => void`                                   | -          | Provider 返回结构化 chat stream 后调用。                    |
| `onFinish`              | `(object: T) => void`                                                  | -          | 最终 JSON 成功解析后调用。                                  |
| `onError`               | `(err: Error) => void`                                                 | -          | Provider 错误或 JSON 解析失败时调用。                       |

## 返回值

| 属性              | 类型                                                      | 说明                                                         |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| `id`              | `Ref<string>`                                             | 组合式函数创建时选定的 Object 状态 id。                      |
| `object`          | `Ref<T \| null>`                                          | 最近一次成功 submit 得到的最终解析对象。                     |
| `partialObject`   | `Ref<DeepPartial<T> \| null>`                             | JSON 流式返回过程中的最佳努力部分对象。                      |
| `text`            | `Ref<string>`                                             | 原始流式 JSON 文本。                                         |
| `input`           | `Ref<string>`                                             | 可绑定到表单的提示词输入。                                   |
| `status`          | `Ref<AiRequestStatus>`                                    | 请求生命周期：`ready`、`submitted`、`streaming` 或 `error`。 |
| `isLoading`       | `Ref<boolean>`                                            | 请求进行中时为 true。                                        |
| `error`           | `Ref<Error \| null>`                                      | 最近一次 Provider 或解析错误。                               |
| `submit(prompt?)` | `(string \| Message, Partial<ChatRequest>) => Promise<T>` | 发送提示词并解析最终 JSON 对象。                             |
| `stop()`          | `() => void`                                              | 中止当前请求。                                               |
| `clearError()`    | `() => void`                                              | 清空 `error`，并把 `status` 恢复为 `ready`。                 |
| `clear()`         | `() => void`                                              | 重置对象状态、`text`、`input` 和 `error`。                   |
| `abortController` | `Ref<AbortController \| null>`                            | 暴露给高级用法。                                             |

## Provider 支持

`useObject` 会通过 `ChatRequest.responseFormat` 发送 JSON Schema response
format。`openai`、`openaiCompatible`、`openrouter` 和 `gemini` 会把它序列化为
OpenAI-compatible 的 `response_format`；`proxyProvider` 会把它原样转发给你的后端。

不强制结构化输出的 Provider 仍然可能在提示词约束下返回合法 JSON。客户端会对最终解析后的 JSON 校验常见 schema 关键字：`type`、`required`、`enum`、`properties`、`items` 和 `additionalProperties`。如果返回内容不是合法 JSON，或最终对象不符合 schema，`submit()` 会以 `AiHooksError` reject。

开启 `maxRetries` 后，`useObject` 只会在首个 chunk 到达前的 Provider 失败上重试。
最终 JSON 无法解析或不符合 schema 时不会自动重试，因为这已经是该请求的模型输出。

可以通过 `defaultRequest.body` 或 `submit(prompt, { body })` 传入 Provider 专属 JSON
请求字段。如果 key 冲突，`messages`、`responseFormat`、`stream` 这类 typed 字段优先。

设置 `throttleMs` 后，快速 JSON 流中的响应式 `text`、`partialObject` 和
`onPartial` 会批量刷新。`onChunk` 仍会收到每个原始流事件，`submit()` resolve
前一定会刷新最终解析对象。

`onRequest(info)` 会在 messages 和 `responseFormat` 都解析完成后，收到最终结构化
`ChatRequest`。`onResponse(info)` 会在 Provider 返回 stream 后执行。两者都包含从
1 开始的 `attempt`、Provider id、request metadata、body、headers 和消息快照。

传入 `generateId` 可以让 `submit('...')` 自动创建的 prompt message 使用稳定 ID。
未传 `id` 时，它也会生成 object 状态 id。如果调用 `submit(message)` 时已经提供
`Message.id`，该显式 ID 会被保留。

多个 `useObject()` 传入同一个 `id` 时，会共享 `object`、`partialObject`、`text`、
`input`、`status`、`error`、loading 和 abort 状态。某个 id 的第一次实例化会写入
`initialObject` 和 `initialValue`。
