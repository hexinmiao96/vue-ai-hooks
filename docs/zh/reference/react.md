# React hooks

`vue-ai-hooks/react` 是可选 React 入口。目前它提供 React 版 `useChat`、
`useCompletion`、`useImage`、`useVideo`、`useObject`、`usePromptSuggestions` 与 `useAgentRun`，用于流式 React UI，并复用根入口里的
Provider、Proxy transport、请求追踪与 stream 格式。

只有使用这个子路径时，消费侧应用才需要安装 React：

```bash
pnpm add vue-ai-hooks react
```

如果要在仓库里直接运行不需要 Provider key 的 quickstart：

```bash
pnpm example:react-chat
pnpm example:react-image
pnpm example:react-video
```

```tsx
import { useChat, useCompletion, useImage, useObject, useVideo } from 'vue-ai-hooks/react'
```

demo 源码在 `examples/react-chat/App.tsx`。它使用 `DirectChatTransport`
和确定性的本地 stream，然后渲染 `lastRequest`、`lastResponse`、usage 和自定义
stream data，方便你在接真实 `/api/chat` 路由前检查 React 请求生命周期。

`examples/react-image/App.tsx` 和 `examples/react-video/App.tsx` 提供不需要 key 的媒体
quickstart：默认返回确定性本地预览，展示请求 trace，并复用同一个
`VITE_EXAMPLE_PROVIDER=proxy` 开关切到应用自有 `/api/image` 和 `/api/video` 路由。

```tsx
import { useChat, useCompletion, useAgentRun } from 'vue-ai-hooks/react'
import { openai } from 'vue-ai-hooks'

export function ChatPanel() {
  const { messages, input, handleInputChange, handleSubmit, status, error, stop } = useChat({
    provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
  })

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((message) => (
        <p key={message.id}>{typeof message.content === 'string' ? message.content : ''}</p>
      ))}
      <textarea value={input} onChange={handleInputChange} />
      <button disabled={status !== 'ready' || !input.trim()}>发送</button>
      <button type="button" disabled={status === 'ready'} onClick={stop}>
        停止
      </button>
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

单次文本补全可以使用：

```tsx
import { useCompletion } from 'vue-ai-hooks/react'
import { openai } from 'vue-ai-hooks'

export function CompletionBox() {
  const { completion, input, handleInputChange, handleSubmit, isLoading, error } = useCompletion({
    provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
  })

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={input} onChange={handleInputChange} />
      <button disabled={isLoading || !input.trim()}>补全</button>
      {completion ? <output>{completion}</output> : null}
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

JSON Schema 结构化输出可以使用：

```tsx
import { useObject } from 'vue-ai-hooks/react'
import { jsonSchema, openai } from 'vue-ai-hooks'

interface Ticket {
  title: string
  priority: 'low' | 'high'
}

export function ObjectBox() {
  const { object, partialObject, input, handleInputChange, handleSubmit, isLoading, error } =
    useObject<Ticket>({
      provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY }),
      schemaName: 'ticket',
      schema: jsonSchema<Ticket>({
        type: 'object',
        properties: {
          title: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'high'] }
        },
        required: ['title', 'priority']
      })
    })

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={input} onChange={handleInputChange} />
      <button disabled={isLoading || !input.trim()}>提取</button>
      <output>{object ? object.title : partialObject?.title}</output>
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

任务提示词（提示词卡片）可以这样接：

```tsx
import { createPromptSuggestionRecipes, usePromptSuggestions } from 'vue-ai-hooks/react'

const starterRecipes = createPromptSuggestionRecipes({
  locale: 'zh',
  surfaces: ['chat', 'backend'],
  include: ['summarize-thread', 'find-risks', 'design-agent-route', 'triage-provider-error']
})

export function PromptChips() {
  const { visibleSuggestions, reloadSuggestions, selectSuggestion, clearSelection, error } =
    usePromptSuggestions({
      suggestions: starterRecipes,
      input: '',
      max: 4
    })

  return (
    <aside>
      {error ? <p>{error.message}</p> : null}
      {visibleSuggestions.map((suggestion) => (
        <button key={suggestion.id} type="button" onClick={() => void selectSuggestion(suggestion)}>
          {suggestion.title}
        </button>
      ))}
      <button onClick={() => void reloadSuggestions()} type="button">
        重新加载
      </button>
      <button onClick={clearSelection} type="button">
        清空选择
      </button>
    </aside>
  )
}
```

图片生成可以这样使用：

```tsx
import { useImage } from 'vue-ai-hooks/react'

export function ImageBox() {
  const { image, input, handleInputChange, handleSubmit, status, error } = useImage({
    defaultRequest: { model: 'stable-diffusion-3' }
  })

  return (
    <form onSubmit={handleSubmit}>
      <input value={input} onChange={handleInputChange} />
      <button disabled={status !== 'ready' || !input.trim()}>生成</button>
      {image ? <img src={image.url} alt="" /> : null}
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

视频生成可以这样使用：

```tsx
import { useVideo } from 'vue-ai-hooks/react'

export function VideoBox() {
  const { video, input, handleInputChange, handleSubmit, status, error } = useVideo({
    defaultRequest: { model: 'video-model' }
  })

  return (
    <form onSubmit={handleSubmit}>
      <input value={input} onChange={handleInputChange} />
      <button disabled={status !== 'ready' || !input.trim()}>生成</button>
      {video ? <a href={video.url}>打开视频</a> : null}
      {error ? <p>{error.message}</p> : null}
    </form>
  )
}
```

## API

```ts
import {
  useChat,
  useCompletion,
  useImage,
  useObject,
  createPromptSuggestionRecipes,
  usePromptSuggestions,
  useVideo,
  useAgentRun
} from 'vue-ai-hooks/react'
```

React 专属导出类型按 hook 面向集中列出，方便 API 搜索和迁移核对：

- Chat：`ReactAppendChatOptions`、`ReactAiSdkChatFinishCallback`、
  `ReactChatFinishCallback`、`ReactChatFinishInfo`、`ReactChatRequestInfo`、
  `ReactChatResponseInfo`、`ReactChatStatus`、`ReactLegacyChatFinishCallback`、
  `ReactSendChatMessageInput`、`UseReactChatOptions`、`UseReactChatReturn`。
- Completion：`ReactAiSdkCompletionFinishCallback`、
  `ReactCompletionFinishInfo`、`ReactCompletionRequestInfo`、
  `ReactCompletionResponseInfo`、`ReactCompletionStatus`、
  `ReactCompletionStreamProtocol`、`ReactLegacyCompletionFinishCallback`、
  `UseReactCompletionOptions`、`UseReactCompletionReturn`。
- Object：`ReactAiSdkObjectFinishCallback`、`ReactLegacyObjectFinishCallback`、
  `ReactObjectDeepPartial`、`ReactObjectFinishCallback`、
  `ReactObjectFinishCallbackOptions`、`ReactObjectFinishInfo`、
  `ReactObjectRequestInfo`、`ReactObjectResponseInfo`、`ReactObjectStatus`、
  `UseReactObjectOptions`、`UseReactObjectReturn`。
- 媒体和 Agent：`ReactImageEditOptions`、
  `ReactImageGenerationRequestInfo`、`ReactImageGenerationResponseInfo`、
  `ReactVideoGenerationRequestInfo`、`ReactVideoGenerationResponseInfo`、
  `ReactAgentRunFinishInfo`、`ReactAgentRunHandler`、
  `ReactAgentRunInspectionSnapshot`、`ReactAgentRunRequest`、
  `ReactAgentRunRequestInfo`、`ReactAgentRunResponseInfo`、
  `ReactAgentRunStatus`、`UseReactImageOptions`、`UseReactImageReturn`、
  `UseReactVideoOptions`、`UseReactVideoReturn`、`UseReactAgentRunOptions`、
  `UseReactAgentRunReturn`。
- Prompt suggestions：`CreatePromptSuggestionRecipesOptions`、
  `PromptSuggestionRecipe`、`PromptSuggestionRecipeCategory`、
  `PromptSuggestionRecipeId`、`PromptSuggestionRecipeLocale`、
  `PromptSuggestionRecipeMetadata`、`PromptSuggestionRecipeSurface`、
  `UseReactPromptSuggestionsOptions`、`UseReactPromptSuggestionsReturn`。

`useChat(options)` 接收 `UseReactChatOptions`：

| 选项                                                                                                | 说明                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `provider` / `transport`                                                                            | `ChatProvider`，可以是 `openai()`、`openrouter()`、`proxyProvider()` 或 `DefaultChatTransport`。 |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`                                         | 没有传 provider 时使用的 proxy transport 配置。                                                  |
| `initialMessages`, `messages`, `initialInput`                                                       | 初始 React 状态。                                                                                |
| `defaultRequest`, `threadId`, `forwardedProps`, `context`                                           | 合并到 provider 请求里的默认值。                                                                 |
| `generateId`                                                                                        | 自定义 chat、user、assistant 和 data id 生成器。                                                 |
| `prepareSendMessagesRequest`                                                                        | chat 请求发出前的最终准备钩子。                                                                  |
| `prepareReconnectToStreamRequest`                                                                   | 恢复流请求发出前的最终准备钩子。                                                                 |
| `onChunk`, `onData`, `onRequest`, `onResponse`, `onUpdate`, `onFinish`, `onFinishLegacy`, `onError` | 生命周期回调。                                                                                   |

`UseReactChatReturn` 暴露普通 React state 和操作：

| 返回值                                                                                   | 说明                                                       |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `id`, `messages`, `input`, `status`, `usage`, `data`, `streamData`, `isLoading`, `error` | 当前聊天状态。                                             |
| `lastRequest`, `lastResponse`                                                            | 最近一次请求和响应追踪快照。                               |
| `append(content, options?)`                                                              | 添加或替换用户消息，并流式生成助手回复。                   |
| `sendMessage(content?, options?)`                                                        | AI SDK 风格发送 helper；不传 content 时提交当前 messages。 |
| `regenerate(options?)`, `reload()`                                                       | 从最近一个用户回合重新生成。                               |
| `resumeStream(options?)`                                                                 | 对实现了 `resumeChat()` 的 provider 恢复流。               |
| `stop()`                                                                                 | 中止当前流。                                               |
| `setInput(value)`, `handleInputChange(event)`, `handleSubmit(event, options?)`           | 受控 React 输入框和表单 helper。                           |
| `setMessages(next)`, `setData(next)`                                                     | 替换或函数式更新 messages 和 stream data。                 |
| `clearError()`, `clearTrace()`, `clear()`                                                | 重置错误、请求追踪或完整聊天状态。                         |

`useCompletion(options)` 接收 `UseReactCompletionOptions`：

| 选项                                                                           | 说明                                                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `provider` / `transport`                                                       | `ChatProvider`，可以是 `openai()`、Provider preset 或 `proxyProvider()`。 |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`                    | 没有传 provider 时使用的 proxy transport 配置。                           |
| `initialInput`, `initialCompletion`                                            | 初始 React 状态。                                                         |
| `defaultRequest`, `streamProtocol`                                             | 合并到每次 `CompletionRequest` 的默认值。                                 |
| `id`, `generateId`                                                             | 请求 trace 使用的稳定 id 和自定义 id 生成器。                             |
| `onUpdate`, `onRequest`, `onResponse`, `onFinish`, `onFinishLegacy`, `onError` | 流式文本、trace、完成和 Provider 错误的生命周期回调。                     |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`                         | 重试控制；只有首个文本 delta 到达前的失败会重试。                         |
| `throttleMs`, `experimental_throttle`                                          | 快速流式响应期间 React state 更新的最小间隔。                             |

`UseReactCompletionReturn` 暴露普通 React state 和操作：

| 返回值                                                      | 说明                                            |
| ----------------------------------------------------------- | ----------------------------------------------- |
| `id`, `completion`, `input`, `status`, `isLoading`, `error` | 当前补全状态。                                  |
| `lastRequest`, `lastResponse`                               | 最近一次请求和响应追踪快照。                    |
| `complete(prompt?, options?)`                               | 执行补全，resolve 最终文本。                    |
| `stop()`                                                    | 中止当前流。                                    |
| `setInput(value)`, `setCompletion(value)`                   | 受控输入和补全文本 setter。                     |
| `handleInputChange(event)`, `handleSubmit(event, options?)` | 受控 React 输入框和表单 helper。                |
| `clearError()`, `clearTrace()`, `clear()`                   | 重置错误、trace 或完整补全状态。                |
| `abortController`                                           | 当前 `AbortController`，没有流进行时为 `null`。 |

`onFinish(prompt, completion, info?)` 使用 AI SDK 顺序；兼容旧签名 `onFinishLegacy(completion, info)`。

- `stop()` 会在补全流未结束时触发 `onFinish(prompt, '', { isAbort: true })`，并且不会触发 `onError`。

`useChat` 的 `onFinish({ message, messages, isAbort, isError, isDisconnect, finishReason })`
使用 AI SDK 风格，新代码优先使用该回调；`onFinishLegacy(message, info)` 保留旧签名兼容。

`useImage(options)` 接收 `UseReactImageOptions`：

| 选项                                                        | 说明                                              |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch` | 请求 `/api/image` 时使用的 proxy transport 配置。 |
| `initialInput`, `defaultRequest`, `timeoutMs`               | 写入默认请求参数、初始输入与超时。                |
| `onRequest`, `onResponse`, `onFinish`, `onError`            | 请求生命周期回调。                                |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`      | 图片请求重试策略（非流式场景）。                  |

`UseReactImageReturn` 暴露常规 React state 和操作：

| 返回值                                                                         | 说明                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------- |
| `id`, `input`, `status`, `isLoading`, `error`, `image`, `images`, `result`     | 当前图片生成状态。                       |
| `lastRequest`, `lastResponse`                                                  | 最近一次请求与响应追踪快照。             |
| `inspect()`                                                                    | 生成带 timeline/retry 的调试快照。       |
| `generate(prompt?, options?)`, `generateImage(prompt?, options?)`              | 从行内文本或 form 发起生成请求。         |
| `editImage(prompt?, options)`                                                  | 使用 `image` 发起编辑请求，支持 `mask`。 |
| `stop()`                                                                       | 中止进行中的请求。                       |
| `setInput(value)`, `handleInputChange(event)`, `handleSubmit(event, options?)` | 受控表单输入与提交 helper。              |
| `clearError()`, `clearTrace()`, `clear()`                                      | 重置错误、追踪或全部图片状态。           |

`useVideo(options)` 接收 `UseReactVideoOptions`：

| 选项                                                        | 说明                                              |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch` | 请求 `/api/video` 时使用的 proxy transport 配置。 |
| `initialInput`, `defaultRequest`, `timeoutMs`               | 写入默认请求参数、初始输入与超时。                |
| `onRequest`, `onResponse`, `onFinish`, `onError`            | 请求生命周期回调。                                |
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry`      | 视频请求重试策略（非流式场景）。                  |

`UseReactVideoReturn` 暴露常规 React state 和操作：

| 返回值                                                                         | 说明                               |
| ------------------------------------------------------------------------------ | ---------------------------------- |
| `id`, `input`, `status`, `isLoading`, `error`, `video`, `videos`, `result`     | 当前视频生成状态。                 |
| `lastRequest`, `lastResponse`                                                  | 最近一次请求与响应追踪快照。       |
| `inspect()`                                                                    | 生成带 timeline/retry 的调试快照。 |
| `generate(prompt?, options?)`, `generateVideo(prompt?, options?)`              | 从行内文本或 form 发起视频请求。   |
| `stop()`                                                                       | 中止进行中的请求。                 |
| `setInput(value)`, `handleInputChange(event)`, `handleSubmit(event, options?)` | 受控表单输入与提交 helper。        |
| `clearError()`, `clearTrace()`, `clear()`                                      | 重置错误、追踪或全部视频状态。     |

`usePromptSuggestions(options)` 接收 `UseReactPromptSuggestionsOptions`：

React 子入口也导出 `createPromptSuggestionRecipes()`，用于生成带稳定
`PromptSuggestionRecipeMetadata` 的共享任务启动器，并可按 chat、backend、agent、
release、media、thread、code 和 tool-approval 等 `surfaces` 选择入口。

| 选项          | 说明                                 |
| ------------- | ------------------------------------ |
| `suggestions` | 基础提示词列表，可用字符串或对象。   |
| `input`       | 输入框文本，参与文本过滤。           |
| `messages`    | 当前消息上下文，供自定义过滤器判断。 |
| `max`         | 可见提示词最大数量。                 |
| `filter`      | 自定义筛选回调。                     |
| `loader`      | 可选异步加载器。                     |
| `loadOnInit`  | 是否在挂载时触发一次加载。           |

`UseReactPromptSuggestionsReturn` 暴露：

| 返回值                               | 说明                       |
| ------------------------------------ | -------------------------- |
| `suggestions`                        | 全量归一化列表。           |
| `visibleSuggestions`                 | 过滤后的可见列表。         |
| `selectedSuggestion`                 | 当前选中项。               |
| `isLoading`                          | 是否正在加载动态提示词。   |
| `error`                              | 上次加载错误。             |
| `reloadSuggestions`, `clearError`    | 重载动态提示词、清空错误。 |
| `selectSuggestion`, `clearSelection` | 按 id/对象选中与清空选择。 |

`useAgentRun(options)` 接收 `UseReactAgentRunOptions<T, R>`：

| 选项                                        | 说明                                                             |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `run`                                       | 用于消费应用侧 agent 事件流的处理函数，返回 `AgentEventSource`。 |
| `id`, `generateId`                          | 运行时 id 与自定义 id 生成器。                                   |
| `progressDataType`, `interruptDataType`     | 自定义 `progress`、`interrupt` 对应的 stream data 类型名。       |
| `onEvent`, `onChunk`, `onFinish`, `onError` | 事件流与生命周期回调。                                           |

`UseReactAgentRunReturn<T, R>` 暴露常规 React state 和操作：

| 返回值                                                            | 说明                                                                  |
| ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| `id`, `currentRunId`, `status`, `isLoading`, `error`, `interrupt` | 当前运行状态与最新中断快照。                                          |
| `events`, `chunks`, `messages`, `streamData`, `usage`             | 与 message/chunk 格式对齐的标准化输出。                               |
| `lastRequest`, `lastResponse`                                     | 最近一次 agent start/resume 请求和事件计数响应快照。                  |
| `inspect()`                                                       | 生成包含事件 timeline、interrupt、usage 和错误的 agent run 排障快照。 |
| `hasInterrupt`                                                    | 当前是否处于 `interrupt` 等待态。                                     |
| `start(input?, options?)`, `resume(response?, options?)`          | 发起或继续 run；重复的 active/completed `options.id` 会复用本地状态。 |
| `stop()`, `clearTrace()`, `clear()`                               | 中止进行中的请求、隐藏 trace 快照或重置到空闲状态。                   |
| `abortController`                                                 | 当前 `AbortController`，空闲时为 `null`。                             |

`useObject(options)` 接收 `UseReactObjectOptions<T>`：

| 选项                                                                                       | 说明                                                                      |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `provider` / `transport`                                                                   | `ChatProvider`，可以是 `openai()`、Provider preset 或 `proxyProvider()`。 |
| `api`, `baseURL`, `headers`, `body`, `credentials`, `fetch`                                | 没有传 provider 时使用的 proxy transport 配置；默认 `/api/object`。       |
| `schema`, `schemaName`, `schemaDescription`, `strict`                                      | 每次 `ChatRequest` 携带的原始 JSON Schema 或 `jsonSchema()` 包装对象。    |
| `initialInput`, `initialObject`, `initialValue`                                            | 初始 React 状态；`initialValue` 会填充 `partialObject`。                  |
| `defaultRequest`, `id`, `generateId`                                                       | 合并到请求里的默认值，以及 trace 快照使用的稳定 id。                      |
| `onChunk`, `onPartial`, `onRequest`, `onResponse`, `onFinish`, `onFinishLegacy`, `onError` | 流式 chunk、已解析 partial、trace 和最终对象生命周期回调。                |

`useObject` 的 `onFinish({ object, text, isAbort, error })` 为 AI SDK 风格；`onFinishLegacy(object, info)` 保留旧签名兼容。结构化输出解析/校验失败时也会回调 `onFinish`，此时 `object` 为 `undefined` 且 `error` 为对应异常。
| `maxRetries`, `retryDelayMs`, `shouldRetry`, `onRetry` | 重试控制；只有首个 chunk 到达前的失败会重试。 |
| `throttleMs`, `experimental_throttle` | 快速流式响应期间 React state 更新的最小间隔。 |

`UseReactObjectReturn<T>` 暴露普通 React state 和操作：

| 返回值                                                           | 说明                                        |
| ---------------------------------------------------------------- | ------------------------------------------- |
| `id`, `object`, `partialObject`, `text`, `input`                 | 当前结构化输出状态和原始 JSON 文本。        |
| `status`, `isLoading`, `error`, `abortController`                | 请求生命周期状态。                          |
| `lastRequest`, `lastResponse`                                    | 最近一次请求和响应追踪快照。                |
| `submit(prompt?, options?)`                                      | 执行结构化请求，resolve 最终解析对象。      |
| `stop()`                                                         | 中止当前流；被中止的 object 请求会 reject。 |
| `setInput(value)`, `setObject(value)`, `setPartialObject(value)` | 受控状态 setter。                           |
| `handleInputChange(event)`, `handleSubmit(event, options?)`      | 受控 React 输入框和表单 helper。            |
| `clearError()`, `clearTrace()`, `clear()`                        | 重置错误、trace 或完整 object 状态。        |

React 入口不会导出 Vue-only composables。Vue API 从根包导入，React hooks 从
`vue-ai-hooks/react` 导入。
