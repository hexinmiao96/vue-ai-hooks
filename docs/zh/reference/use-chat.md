# useChat

用于流式聊天补全的核心组合式函数。

## 用法

```ts
import { useChat, openai } from 'vue-ai-hooks'

const { messages, append, isLoading, stop } = useChat({
  provider: openai({ apiKey: '...' })
})
```

## 选项

| 名称 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `provider` | `ChatProvider` | 必填 | 要使用的 Provider。 |
| `initialMessages` | `Message[]` | `[]` | 初始消息历史。 |
| `defaultRequest` | `Partial<ChatRequest>` | `{}` | 合并到每次聊天请求中的默认选项。 |
| `tools` | `Tool[]` | - | 默认工具列表。可以在调用 `append()` 时传入 `tools` 覆盖。 |
| `toolChoice` | `'auto' \| 'none' \| 'required' \| { ... }` | - | 默认工具选择策略。 |
| `persist` | `{ key: string; version?: number }` | - | 自动保存到 localStorage。 |
| `onUpdate` | `(m: Message) => void` | - | 每次流式片段更新时调用。 |
| `onFinish` | `(m: Message) => void` | - | 助手消息完成时调用一次。 |
| `onError` | `(e: Error) => void` | - | 发生错误时调用；未传入时会写入 `error` ref。 |

## 返回值

| 属性 | 类型 | 说明 |
|---|---|---|
| `messages` | `Ref<Message[]>` | 完整消息历史，包括 user、assistant、system 和 tool。 |
| `input` | `Ref<string>` | 可绑定到输入框；不会自动清空。 |
| `isLoading` | `Ref<boolean>` | 流式请求进行中时为 true。 |
| `error` | `Ref<Error \| null>` | 最近一次错误；下次 `append` 时清空。 |
| `append(content, opts?)` | `(string \| Message, Partial<ChatRequest>) => Promise<void>` | 发送消息并流式接收回复。 |
| `reload()` | `() => Promise<void>` | 重新运行上一轮助手回复。 |
| `stop()` | `() => void` | 中止当前流式请求。 |
| `setMessages(messages)` | `(Message[]) => void` | 替换消息历史，例如从外部恢复。 |
| `clear()` | `() => void` | 重置为空状态。启用 `persist` 时也会移除存储项。 |
| `abortController` | `Ref<AbortController \| null>` | 暴露给高级用法。 |

## Tool calling

传入 `tools` 后，模型可以选择调用函数，而不是只返回文本。函数调用结果会以 `toolCalls` 的形式出现在 assistant 消息上：

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
  ]
})

await append("What's the weather in Tokyo?")

const last = messages.value.at(-1)
if (last?.role === 'assistant' && last.toolCalls?.length) {
  for (const call of last.toolCalls) {
    if (call.function.name === 'getWeather') {
      const args = JSON.parse(call.function.arguments)
      // ... execute the function ...
      // then send a tool result back:
      await append({
        id: `tool-${call.id}`,
        role: 'tool',
        content: JSON.stringify({ temp: 22, conditions: 'sunny' }),
        toolCallId: call.id
      })
    }
  }
}
```

库会把流式返回的 `tool_calls` delta 累积成 assistant 消息上的最终 `toolCalls[]`。

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
