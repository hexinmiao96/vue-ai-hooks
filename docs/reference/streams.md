# Stream utilities

`vue-ai-hooks` exposes small stream helpers for custom proxy routes, tests, and
advanced transports that need to produce or consume AI SDK UI message streams
without using `proxyProvider`.

Public exports: `parseSSE`, `readUIMessageStream`, `toChatChunks`,
`createUIMessageStreamParser`, `createUIMessageStreamResponse`,
`pipeUIMessageStreamToResponse`, `formatSSEData`, `ReadUIMessageStreamOptions`,
`CreateUIMessageStreamResponseOptions`, `PipeUIMessageStreamToResponseOptions`,
`ServerResponseLike`, `UIMessageStreamPart`, `UIMessageStreamSource`, and
`UIMessageStreamParser`.

## `createUIMessageStreamResponse()`

Create a Fetch API `Response` from already-produced AI SDK UI message stream
parts:

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

`CreateUIMessageStreamResponseOptions` accepts:

| Option        | Type                    | Default  | Description                                             |
| ------------- | ----------------------- | -------- | ------------------------------------------------------- |
| `stream`      | `UIMessageStreamSource` | required | Iterable, async iterable, or `ReadableStream` of parts. |
| `status`      | `number`                | `200`    | Response status.                                        |
| `statusText`  | `string`                | -        | Optional response status text.                          |
| `headers`     | `HeadersInit`           | -        | Extra response headers.                                 |
| `includeDone` | `boolean`               | `true`   | Append the `data: [DONE]` sentinel.                     |

The response automatically sets `content-type: text/event-stream; charset=utf-8`,
`cache-control: no-cache`, and `x-vercel-ai-ui-message-stream: v1` unless those
headers are already provided.

## `pipeUIMessageStreamToResponse()`

Pipe the same stream parts to a Node-like HTTP response object:

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

`PipeUIMessageStreamToResponseOptions` extends
`CreateUIMessageStreamResponseOptions` with:

| Option             | Type                                                                     | Description                                    |
| ------------------ | ------------------------------------------------------------------------ | ---------------------------------------------- |
| `response`         | `ServerResponseLike`                                                     | Node-like response with `write()` and `end()`. |
| `consumeSseStream` | `(options: { stream: ReadableStream<string> }) => void \| Promise<void>` | Optional tee for logging or persistence.       |

`ServerResponseLike` intentionally models only the minimal methods needed by
Node-style responses: `write()`, `end()`, optional `setHeader()`,
`writeHead()`, `once('drain')`, `statusCode`, and `statusMessage`.

## `formatSSEData()`

Format one value as an SSE `data:` event:

```ts
import { formatSSEData } from 'vue-ai-hooks'

const line = formatSSEData({ type: 'text-delta', delta: 'Hello' })
```

Pass the string `"[DONE]"` to format the stream terminator. Non-JSON-serializable
values throw before anything is written.

## `readUIMessageStream()`

Read an AI SDK UI message stream `Response` and yield provider-agnostic
`ChatChunk` values:

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

Pass an `AbortSignal` when the caller should be able to cancel the reader:

```ts
const controller = new AbortController()

for await (const chunk of readUIMessageStream({ response, signal: controller.signal })) {
  // Use the normalized ChatChunk values in a custom transport.
}
```

`ReadUIMessageStreamOptions` accepts:

| Option   | Type                    | Default                         | Description                                 |
| -------- | ----------------------- | ------------------------------- | ------------------------------------------- |
| `signal` | `AbortSignal`           | -                               | Cancels the underlying SSE reader.          |
| `parser` | `UIMessageStreamParser` | `createUIMessageStreamParser()` | Reuse a parser across related stream parts. |

## `createUIMessageStreamParser()`

Create a stateful parser for low-level stream part decoding. Use this when your
transport already parses SSE or receives parts from another source:

```ts
import { createUIMessageStreamParser } from 'vue-ai-hooks'

const parser = createUIMessageStreamParser()
const chunks = parts.flatMap((part) => parser.toChatChunks(part))
```

The parser preserves reasoning text, tool-call indexes, and streamed tool
arguments across parts. `UIMessageStreamParser` has one method:

```ts
interface UIMessageStreamParser {
  toChatChunks(raw: Record<string, unknown>): ChatChunk[]
}
```

## `toChatChunks()`

Convert one already-parsed AI SDK UI message stream part into `ChatChunk[]`:

```ts
import { createUIMessageStreamParser, toChatChunks } from 'vue-ai-hooks'

const parser = createUIMessageStreamParser()
const chunks = toChatChunks({ type: 'text-delta', delta: 'Hello' }, parser)
```

For multi-part streams, pass the same parser to every call so tool and reasoning
deltas are accumulated correctly.

## `parseSSE()`

Parse a raw `text/event-stream` response and yield JSON payloads from `data:`
lines:

```ts
import { parseSSE } from 'vue-ai-hooks'

for await (const event of parseSSE(response)) {
  console.log(event)
}
```

The parser stops on `data: [DONE]`, skips malformed JSON lines, supports CRLF
separators, and cancels the reader when the supplied abort signal is already
aborted.
