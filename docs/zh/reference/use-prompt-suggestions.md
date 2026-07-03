# usePromptSuggestions

聊天输入框和任务入口可复用的无 UI prompt suggestion 状态。

它不渲染 UI、不调用 Provider，也不会自动发送消息。可以用它归一化静态、响应式或应用加载的
suggestion，按当前输入过滤，并记录用户选中的 suggestion；之后由你的界面决定：填入
`useChat().input`、调用 `sendMessage()`，还是打开自定义流程。

公开导出：`usePromptSuggestions`、`PromptSuggestion`、`PromptSuggestionInput`、
`PromptSuggestionFilter`、`PromptSuggestionFilterContext`、`PromptSuggestionLoader`、
`PromptSuggestionLoaderContext`、`UsePromptSuggestionsOptions` 和
`UsePromptSuggestionsReturn`。

## 用法

```ts
import { useChat, usePromptSuggestions } from 'vue-ai-hooks'

const chat = useChat({ api: '/api/chat' })
const suggestions = usePromptSuggestions({
  input: chat.input,
  messages: chat.messages,
  suggestions: [
    '总结当前对话',
    {
      id: 'risks',
      title: '找风险',
      prompt: '找出这段对话里的主要风险和缺失检查。',
      description: '交接前使用'
    }
  ]
})

function applySuggestion(id: string) {
  const selected = suggestions.selectSuggestion(id)
  if (selected) chat.setInput(selected.prompt)
}
```

选择后可以填入 `useChat().input`，也可以改成直接触发你自己的任务流程。

## 选项

| 名称          | 类型                                   | 默认值  | 说明                                                                        |
| ------------- | -------------------------------------- | ------- | --------------------------------------------------------------------------- |
| `suggestions` | `MaybeRefOrGetter<PromptSuggestion[]>` | `[]`    | 静态、ref、computed 或 getter-backed suggestions。也可以直接传字符串。      |
| `input`       | `MaybeRefOrGetter<string \| null>`     | `''`    | 当前输入内容，默认过滤器会使用它。                                          |
| `messages`    | `MaybeRefOrGetter<readonly Message[]>` | `[]`    | 可选消息历史，会传给自定义过滤器。                                          |
| `max`         | `MaybeRefOrGetter<number \| null>`     | `6`     | 最多展示多少个 suggestion。传 `Infinity` 表示不限制。                       |
| `filter`      | `PromptSuggestionFilter`               | 文本    | 自定义过滤器。会拿到归一化 suggestion、input、messages 和全部 suggestions。 |
| `loader`      | `PromptSuggestionLoader`               | -       | 可选的应用自有动态加载器。会拿到 input、messages 和 signal。                |
| `loadOnInit`  | `boolean`                              | `false` | 配置 loader 时，立即调用一次 `reloadSuggestions()`。                        |

字符串 suggestion 会变成 `{ id: 'suggestion-N', title, prompt }`。对象 suggestion
会保留 `id`、`title`、`description` 和 `metadata`；空 prompt 会被跳过。

## 返回值

| 属性                     | 类型                                             | 说明                                              |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| `suggestions`            | `ComputedRef<PromptSuggestion[]>`                | 归一化后的静态和已加载 suggestions，尚未过滤。    |
| `visibleSuggestions`     | `ComputedRef<PromptSuggestion[]>`                | 已过滤并限制数量，可直接渲染 chip 或列表。        |
| `selectedSuggestion`     | `Ref<PromptSuggestion \| null>`                  | 最近一次通过 `selectSuggestion()` 选中的项。      |
| `isLoading`              | `Ref<boolean>`                                   | `loader` 正在执行时为 `true`。                    |
| `error`                  | `Ref<Error \| null>`                             | 最近一次非取消加载错误。                          |
| `reloadSuggestions()`    | `() => Promise<PromptSuggestion[]>`              | 取消上一次加载，调用 `loader`，并返回归一化结果。 |
| `clearError()`           | `() => void`                                     | 清空加载错误，不改变已有 suggestions。            |
| `selectSuggestion(item)` | `(id \| suggestion) => PromptSuggestion \| null` | 按 id 或对象选择并返回归一化结果。                |
| `clearSelection()`       | `() => void`                                     | 清空 `selectedSuggestion`。                       |

## 动态加载

```ts
const { visibleSuggestions, isLoading, error, reloadSuggestions, selectSuggestion } =
  usePromptSuggestions({
    input: chat.input,
    messages: chat.messages,
    suggestions: [{ id: 'handoff', prompt: '写一段交接说明。' }],
    async loader({ input, messages, signal }) {
      const response = await fetch('/api/prompt-suggestions', {
        method: 'POST',
        body: JSON.stringify({ input, messages }),
        signal
      })
      return (await response.json()) as PromptSuggestionInput[]
    },
    loadOnInit: true
  })

async function refreshSuggestions() {
  await reloadSuggestions()
}
```

`reloadSuggestions()` 会用 `AbortSignal` 取消上一次仍在进行的加载，避免旧响应覆盖新的
suggestions。

## 自定义过滤

```ts
const { visibleSuggestions } = usePromptSuggestions({
  input: chat.input,
  messages: chat.messages,
  suggestions: [
    { id: 'checkout', prompt: '运行 checkout 审批 demo。' },
    { id: 'handoff', prompt: '写一段交接说明。' }
  ],
  filter(suggestion, context) {
    if (context.input) return suggestion.prompt.toLowerCase().includes(context.input.toLowerCase())
    return context.messages.length === 0 || suggestion.id !== 'handoff'
  }
})
```

如果 suggestion 来自后端或 agent，请把应用自有 loader 或已加载数组传进这个 composable。这样
Vue UI 仍然只有一层小而可预测的状态。
