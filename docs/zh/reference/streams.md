# Stream 工具

`vue-ai-hooks` 暴露了一组小型 stream 工具，适合自定义代理路由、测试和高级
transport 场景：即使不使用 `proxyProvider`，也能产出或消费 AI SDK UI message
stream。

公开导出：`parseSSE`、`readUIMessageStream`、`toChatChunks`、
`createUIMessageStream`、`createUIMessageStreamParser`、`createUIMessageStreamResponse`、
`pipeUIMessageStreamToResponse`、`formatSSEData`、`ReadUIMessageStreamOptions`、
`CreateUIMessageStreamOptions`、`CreateUIMessageStreamResponseOptions`、
`PipeUIMessageStreamToResponseOptions`、`ServerResponseLike`、
`UIMessageStreamPart`、`UIMessageStreamSource`、`UIMessageStreamWriter` 和
`UIMessageStreamParser`。Agent adapter 导出：
`agentEventToChatChunk`、`agentEventToUIMessageStreamPart`、
`readAgentEvents`、`readAgentEventStream`、`AgentEvent`、`AgentInterruptEvent`、
`AgentEventAdapterOptions`、`AgentEventSource` 和 `ReadAgentEventStreamOptions`。

如果想做不需要 key 的可运行契约检查，先启动 `pnpm example:proxy-server`，再向
`/api/ui-message-stream` 发 POST 请求。该路由会输出 AI SDK UI message stream parts，
可以用 `readUIMessageStream()` 检查。

## Agent 事件适配

当后端 agent 输出的是产品级事件，而 UI 仍希望消费标准 `ChatChunk` 或 AI SDK UI
message stream 契约时，使用 agent event adapters：

```ts
import {
  agentEventToUIMessageStreamPart,
  createUIMessageStreamResponse,
  readAgentEvents,
  readAgentEventStream,
  type AgentEvent
} from 'vue-ai-hooks'

async function* runAgent(): AsyncGenerator<AgentEvent> {
  yield { type: 'message-delta', delta: '正在检查...' }
  yield { type: 'progress', id: 'lookup', label: '查询账户' }
  yield { type: 'tool-call', id: 'call_1', name: 'lookupAccount', input: { id: 'acct_1' } }
  yield { type: 'tool-result', id: 'call_1', name: 'lookupAccount', output: { status: 'active' } }
  yield { type: 'interrupt', id: 'approval_1', name: 'approveCharge' }
  yield { type: 'finish', finishReason: 'stop' }
}

for await (const chunk of readAgentEventStream({ events: runAgent() })) {
  console.log(chunk)
}

for await (const event of readAgentEvents(runAgent())) {
  console.log(event.type)
}

export function POST() {
  return createUIMessageStreamResponse({
    stream: toParts(runAgent())
  })
}

async function* toParts(events: AsyncIterable<AgentEvent>) {
  for await (const event of events) {
    yield agentEventToUIMessageStreamPart(event)
  }
}
```

`agentEventToChatChunk(event, options?)` 把单个 `AgentEvent` 转成 `ChatChunk`。
`readAgentEvents(events, signal?)` 会读取原始 `AgentEvent`，不做转换。
`readAgentEventStream({ events, signal, ...options })` 接受 `AgentEventSource`：
iterable、async iterable 或 `ReadableStream<AgentEvent>`。
`agentEventToUIMessageStreamPart(event, options?)` 把单个事件转成
`UIMessageStreamPart`，适合 proxy 路由。

`AgentEventAdapterOptions` 支持：

| 选项                | 类型             | 默认值                 | 说明                         |
| ------------------- | ---------------- | ---------------------- | ---------------------------- |
| `progressDataType`  | `data-${string}` | `data-agent-progress`  | progress 事件的 data part。  |
| `interruptDataType` | `data-${string}` | `data-agent-interrupt` | interrupt 事件的 data part。 |
| `errorDataType`     | `data-${string}` | `data-agent-error`     | 不抛出错误事件的 data part。 |

任务级说明见 [Agent 事件](/zh/guide/agent-events)。

## `createUIMessageStream()`

用命令式 writer 创建 `ReadableStream<UIMessageStreamPart>`。当后端路由需要逐步写入
parts、合并另一个 part stream，或在交给 response helper 前统一错误格式时使用：

```ts
import { createUIMessageStream, createUIMessageStreamResponse } from 'vue-ai-hooks'

export async function POST() {
  const stream = createUIMessageStream({
    async execute({ write, merge }) {
      write({ type: 'start', messageId: 'msg_1' })
      write({ type: 'text-delta', delta: 'Hello' })
      await merge([{ type: 'finish', finishReason: 'stop' }])
    },
    onError(error) {
      return error instanceof Error ? error.message : 'Stream failed'
    }
  })

  return createUIMessageStreamResponse({ stream })
}
```

`CreateUIMessageStreamOptions` 支持：

| 选项      | 类型                                                                     | 说明                           |
| --------- | ------------------------------------------------------------------------ | ------------------------------ |
| `execute` | `(writer: UIMessageStreamWriter) => void \| Promise<void>`               | 写入或合并 stream parts。      |
| `onError` | `(error: unknown) => UIMessageStreamPart \| string \| null \| undefined` | 可选的异常到 error part 映射。 |
| `signal`  | `AbortSignal`                                                            | abort 时提前关闭 stream。      |

`UIMessageStreamWriter` 暴露 `write(part)`、`merge(stream)` 和 `error(error)`。
`onError` 返回字符串时会写入 `{ type: 'error', errorText: string }`；返回 `null`
或 `undefined` 会抑制 error part。

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
