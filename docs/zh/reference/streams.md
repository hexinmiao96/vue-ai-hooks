# Stream 工具

`vue-ai-hooks` 暴露了一组小型 stream 工具，适合自定义代理路由、测试和高级
transport 场景：即使不使用 `proxyProvider`，也能消费 AI SDK UI message
stream。

公开导出：`parseSSE`、`readUIMessageStream`、`toChatChunks`、
`createUIMessageStreamParser`、`ReadUIMessageStreamOptions` 和
`UIMessageStreamParser`。

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
