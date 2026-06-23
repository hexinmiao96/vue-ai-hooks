# useChat

用于流式聊天补全的核心组合式函数。

公开 TypeScript 类型：`UseChatOptions`、`UseChatReturn`、`ToolCallHandler` 和
`ToolCallHandlerContext`。

## 用法

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, append, isLoading, stop } = useChat({
  provider: openai({ apiKey: '...' })
})
```

## 选项

| 名称                | 类型                                        | 默认值 | 说明                                                      |
| ------------------- | ------------------------------------------- | ------ | --------------------------------------------------------- |
| `provider`          | `ChatProvider`                              | 必填   | 要使用的 Provider。                                       |
| `initialMessages`   | `Message[]`                                 | `[]`   | 初始消息历史。                                            |
| `defaultRequest`    | `Partial<ChatRequest>`                      | `{}`   | 合并到每次聊天请求中的默认选项。                          |
| `tools`             | `Tool[]`                                    | -      | 默认工具列表。可以在调用 `append()` 时传入 `tools` 覆盖。 |
| `toolChoice`        | `'auto' \| 'none' \| 'required' \| { ... }` | -      | 默认工具选择策略。                                        |
| `toolHandlers`      | `Record<string, ToolCallHandler>`           | -      | 用于自动执行工具调用的本地 handler。                      |
| `maxToolRoundtrips` | `number`                                    | `1`    | 用户消息之后最多自动执行几轮工具调用。                    |
| `persist`           | `{ key: string; version?: number }`         | -      | 自动保存到 localStorage。                                 |
| `onUpdate`          | `(m: Message) => void`                      | -      | 每次流式片段更新时调用。                                  |
| `onFinish`          | `(m: Message) => void`                      | -      | 助手消息完成时调用一次。                                  |
| `onError`           | `(e: Error) => void`                        | -      | 发生错误时调用；未传入时会写入 `error` ref。              |

## 返回值

| 属性                     | 类型                                                         | 说明                                                 |
| ------------------------ | ------------------------------------------------------------ | ---------------------------------------------------- |
| `messages`               | `Ref<Message[]>`                                             | 完整消息历史，包括 user、assistant、system 和 tool。 |
| `input`                  | `Ref<string>`                                                | 可绑定到输入框；不会自动清空。                       |
| `isLoading`              | `Ref<boolean>`                                               | 流式请求进行中时为 true。                            |
| `error`                  | `Ref<Error \| null>`                                         | 最近一次错误；下次 `append` 时清空。                 |
| `append(content, opts?)` | `(string \| Message, Partial<ChatRequest>) => Promise<void>` | 发送消息并流式接收回复。                             |
| `reload()`               | `() => Promise<void>`                                        | 重新运行上一轮助手回复。                             |
| `stop()`                 | `() => void`                                                 | 中止当前流式请求。                                   |
| `setMessages(messages)`  | `(Message[]) => void`                                        | 替换消息历史，例如从外部恢复。                       |
| `clear()`                | `() => void`                                                 | 重置为空状态。启用 `persist` 时也会移除存储项。      |
| `abortController`        | `Ref<AbortController \| null>`                               | 暴露给高级用法。                                     |

## Tool calling

传入 `tools` 后，模型可以选择调用函数，而不是只返回文本。如果同时传入 `toolHandlers`，`useChat` 会解析参数、执行匹配的本地 handler、追加 `tool` 消息，并自动继续下一轮模型请求：

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

库会把流式返回的 `tool_calls` delta 累积成 assistant 消息上的最终 `toolCalls[]`。如果模型调用了未注册的工具，或者 handler 抛错，`append()` 会 reject，并写入 `error.value`。

## 视觉输入

多模态内容可以以 `ContentPart` 数组的形式传入：

```ts
await append({
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image_url', image_url: { url: 'https://example.com/x.png' } }
  ]
})
```

对于 `data:` URL（base64），Anthropic Provider 会自动转换为正确的接口格式。OpenAI Provider 会直接透传。
