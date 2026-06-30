# Stream utilities

`vue-ai-hooks` exposes small stream helpers for custom proxy routes, tests, and
advanced transports that need to consume AI SDK UI message streams without using
`proxyProvider`.

Public exports: `parseSSE`, `readUIMessageStream`, `toChatChunks`,
`createUIMessageStreamParser`, `ReadUIMessageStreamOptions`, and
`UIMessageStreamParser`.

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
