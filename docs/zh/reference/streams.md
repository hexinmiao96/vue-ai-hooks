# Stream 工具

`vue-ai-hooks` 暴露了一组小型 stream 工具，适合自定义代理路由、测试和高级
transport 场景：即使不使用 `proxyProvider`，也能产出或消费 AI SDK UI message
stream。

公开导出：`parseSSE`、`readUIMessageStream`、`toChatChunks`、
`createUIMessageStreamParser`、`createUIMessageStreamResponse`、
`pipeUIMessageStreamToResponse`、`formatSSEData`、`ReadUIMessageStreamOptions`、
`CreateUIMessageStreamResponseOptions`、`PipeUIMessageStreamToResponseOptions`、
`ServerResponseLike`、`UIMessageStreamPart`、`UIMessageStreamSource` 和
`UIMessageStreamParser`。

## `createUIMessageStreamResponse()`

从已经产出的 AI SDK UI message stream parts 创建 Fetch API `Response`：

```ts
import { createUIMessageStreamResponse } from 'vue-ai-hooks'

export async function POST() {
  return createUIMessageStreamResponse({
    stream: [
      { type: 'text-delta', delta: 'Hello' },
      { type: 'finish', finishReason: 'stop' }
    ]
  })
}
```

`CreateUIMessageStreamResponseOptions` 支持：

| 选项          | 类型                    | 默认值   | 说明                                                    |
| ------------- | ----------------------- | -------- | ------------------------------------------------------- |
| `stream`      | `UIMessageStreamSource` | required | parts 的 iterable、async iterable 或 `ReadableStream`。 |
| `status`      | `number`                | `200`    | Response 状态码。                                       |
| `statusText`  | `string`                | -        | 可选状态文本。                                          |
| `headers`     | `HeadersInit`           | -        | 额外响应头。                                            |
| `includeDone` | `boolean`               | `true`   | 追加 `data: [DONE]` 结束标记。                          |

该 response 会自动设置 `content-type: text/event-stream; charset=utf-8`、
`cache-control: no-cache` 和 `x-vercel-ai-ui-message-stream: v1`，除非你已经传入这些
headers。

## `pipeUIMessageStreamToResponse()`

把同样的 stream parts 写入 Node-like HTTP response 对象：

```ts
import { pipeUIMessageStreamToResponse } from 'vue-ai-hooks'

await pipeUIMessageStreamToResponse({
  response: nodeResponse,
  stream: async function* () {
    yield { type: 'text-delta', delta: 'Hello' }
    yield { type: 'finish', finishReason: 'stop' }
  }
})
```

`PipeUIMessageStreamToResponseOptions` 在 `CreateUIMessageStreamResponseOptions`
基础上增加：

| 选项               | 类型                                                                     | 说明                                              |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------- |
| `response`         | `ServerResponseLike`                                                     | 带有 `write()` 和 `end()` 的 Node-like response。 |
| `consumeSseStream` | `(options: { stream: ReadableStream<string> }) => void \| Promise<void>` | 可选 tee，用于日志或持久化。                      |

`ServerResponseLike` 只描述 Node 风格响应需要的最小方法：`write()`、`end()`，以及可选的
`setHeader()`、`writeHead()`、`once('drain')`、`statusCode` 和 `statusMessage`。

## `formatSSEData()`

把一个值格式化为 SSE `data:` 事件：

```ts
import { formatSSEData } from 'vue-ai-hooks'

const line = formatSSEData({ type: 'text-delta', delta: 'Hello' })
```

传入字符串 `"[DONE]"` 可格式化 stream 结束标记。无法 JSON 序列化的值会在写入前抛错。

## `readUIMessageStream()`

读取 AI SDK UI message stream `Response`，并产出 provider 无关的
`ChatChunk`：

```ts
import { readUIMessageStream } from 'vue-ai-hooks'

const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages })
})

for await (const chunk of readUIMessageStream({ response })) {
  console.log(chunk.content, chunk.toolCalls, chunk.parts)
}
```

需要取消读取时传入 `AbortSignal`：

```ts
const controller = new AbortController()

for await (const chunk of readUIMessageStream({ response, signal: controller.signal })) {
  // 在自定义 transport 中使用归一化后的 ChatChunk。
}
```

`ReadUIMessageStreamOptions` 支持：

| 选项     | 类型                    | 默认值                          | 说明                              |
| -------- | ----------------------- | ------------------------------- | --------------------------------- |
| `signal` | `AbortSignal`           | -                               | 取消底层 SSE reader。             |
| `parser` | `UIMessageStreamParser` | `createUIMessageStreamParser()` | 复用同一个多 part stream 解析器。 |

## `createUIMessageStreamParser()`

创建有状态 parser，用于低层 stream part 解码。当你的 transport 已经解析了 SSE，
或从其他来源拿到 parts 时使用：

```ts
import { createUIMessageStreamParser } from 'vue-ai-hooks'

const parser = createUIMessageStreamParser()
const chunks = parts.flatMap((part) => parser.toChatChunks(part))
```

parser 会在多个 parts 之间保留 reasoning 文本、tool-call index 和 streamed tool
arguments。`UIMessageStreamParser` 只有一个方法：

```ts
interface UIMessageStreamParser {
  toChatChunks(raw: Record<string, unknown>): ChatChunk[]
}
```

## `toChatChunks()`

把一个已经解析好的 AI SDK UI message stream part 转成 `ChatChunk[]`：

```ts
import { createUIMessageStreamParser, toChatChunks } from 'vue-ai-hooks'

const parser = createUIMessageStreamParser()
const chunks = toChatChunks({ type: 'text-delta', delta: 'Hello' }, parser)
```

多 part stream 中要把同一个 parser 传给每一次调用，才能正确累计 tool 和
reasoning delta。

## `parseSSE()`

解析原始 `text/event-stream` response，并产出 `data:` 行里的 JSON payload：

```ts
import { parseSSE } from 'vue-ai-hooks'

for await (const event of parseSSE(response)) {
  console.log(event)
}
```

该 parser 会在 `data: [DONE]` 停止，跳过格式错误的 JSON 行，支持 CRLF 分隔符；
如果传入的 abort signal 已经取消，也会取消 reader。
