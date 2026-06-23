# useChat

The core composable for streaming chat completions.

Public TypeScript types: `UseChatOptions`, `UseChatReturn`,
`ToolCallHandler`, and `ToolCallHandlerContext`.

## Usage

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, append, isLoading, stop } = useChat({
  provider: openai({ apiKey: '...' })
})
```

## Options

| Name                | Type                                        | Default  | Description                                                            |
| ------------------- | ------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `provider`          | `ChatProvider`                              | required | The provider to use.                                                   |
| `initialMessages`   | `Message[]`                                 | `[]`     | Seed the message history.                                              |
| `defaultRequest`    | `Partial<ChatRequest>`                      | `{}`     | Default options merged into every chat request.                        |
| `tools`             | `Tool[]`                                    | —        | Default tool list. Override per-call by passing `tools` to `append()`. |
| `toolChoice`        | `'auto' \| 'none' \| 'required' \| { ... }` | —        | Default tool choice.                                                   |
| `toolHandlers`      | `Record<string, ToolCallHandler>`           | —        | Local handlers for automatic tool execution.                           |
| `maxToolRoundtrips` | `number`                                    | `1`      | Maximum automatic tool-call rounds after a user message.               |
| `persist`           | `{ key: string; version?: number }`         | —        | Auto-save to localStorage.                                             |
| `onUpdate`          | `(m: Message) => void`                      | —        | Called for every streamed chunk update.                                |
| `onFinish`          | `(m: Message) => void`                      | —        | Called once the assistant message is finished.                         |
| `onError`           | `(e: Error) => void`                        | —        | Called on any error; falls back to `error` ref.                        |

## Return value

| Property                 | Type                                                         | Description                                                           |
| ------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `messages`               | `Ref<Message[]>`                                             | Full message history (user, assistant, system, tool).                 |
| `input`                  | `Ref<string>`                                                | Bound to your composer; not auto-cleared.                             |
| `isLoading`              | `Ref<boolean>`                                               | True while a stream is in flight.                                     |
| `error`                  | `Ref<Error \| null>`                                         | Last error, cleared on next `append`.                                 |
| `append(content, opts?)` | `(string \| Message, Partial<ChatRequest>) => Promise<void>` | Send a message and stream the reply.                                  |
| `reload()`               | `() => Promise<void>`                                        | Re-run the last assistant turn.                                       |
| `stop()`                 | `() => void`                                                 | Abort the in-flight stream.                                           |
| `setMessages(messages)`  | `(Message[]) => void`                                        | Replace history (e.g. on restore).                                    |
| `clear()`                | `() => void`                                                 | Reset to empty state. With `persist`, also removes the storage entry. |
| `abortController`        | `Ref<AbortController \| null>`                               | Exposed for advanced use cases.                                       |

## Tool calling

When you pass `tools`, the model can choose to call a function instead of replying
with text. If you also pass `toolHandlers`, `useChat` parses the arguments,
executes the matching local handler, appends the `tool` message, and continues
the conversation automatically:

```ts
const { messages, append } = useChat({
  provider: openai({ apiKey: '...' }),
  tools: [
    {
      type: 'function',
      function: {
        name: 'getWeather',
        description: 'Get the weather in a city',
        parameters: {
          type: 'object',
          properties: { city: { type: 'string' } },
          required: ['city']
        }
      }
    }
  ],
  toolHandlers: {
    async getWeather(args) {
      const { city } = args as { city: string }
      return { city, temp: 22, conditions: 'sunny' }
    }
  }
})

await append("What's the weather in Tokyo?")

console.log(messages.value.map((m) => m.role))
// ['user', 'assistant', 'tool', 'assistant']
```

The library handles the streaming accumulation of `tool_calls` deltas into the
final `toolCalls[]` on the assistant message. If a model calls a tool that has no
registered handler, or a handler throws, `append()` rejects and `error.value` is
set.

## Vision input

Pass multimodal content as an array of `ContentPart`:

```ts
await append({
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image_url', image_url: { url: 'https://example.com/x.png' } }
  ]
})
```

For `data:` URLs (base64), the Anthropic provider automatically converts them
to the right wire format. The OpenAI provider passes them through.
