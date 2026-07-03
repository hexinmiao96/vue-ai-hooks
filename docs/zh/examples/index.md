---
title: 示例
description: 面向对话、工具审批、文本补全、向量嵌入、文档重排、图片生成、视频生成、语音生成、音频转写、后端代理和结构化输出的精致 vue-ai-hooks 示例页。
aside: false
pageClass: demo-page
---

<script setup>
import DemoShowcase from '../../.vitepress/theme/components/DemoShowcase.vue'
</script>

# 示例

这个页面按真实产品场景组织。先看预览理解 UI 形态，需要接入时切到代码；只有查参数或方法时再看 API 表格。

## 先看哪个示例？

| 目标                             | 从这里开始                                                                                                                                                    | 接着看                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 做聊天界面、结构化片段或工具审批 | [流式对话](#chat-demo)                                                                                                                                        | [useChat](/zh/reference/use-chat)                            |
| 增加 thread 侧边栏和本地恢复验证 | `pnpm example:threaded-chat`                                                                                                                                  | [useChatThreads](/zh/reference/use-chat-threads)             |
| 保持无服务端本地历史             | [IndexedDB 本地持久化（异步）](/zh/guide/server-storage#indexeddb-%E6%9C%AC%E5%9C%B0%E6%8C%81%E4%B9%85%E5%8C%96%E9%85%8D%E7%BD%AE%E5%99%A8%E5%BC%82%E6%AD%A5) | [服务端存储](/zh/guide/server-storage)                       |
| 试 React 聊天迁移入口            | `pnpm example:react-chat`                                                                                                                                     | [React hooks](/zh/reference/react)                           |
| 试 React 补全迁移入口            | `pnpm example:react-completion`                                                                                                                               | [React hooks](/zh/reference/react)                           |
| 试 React 结构化输出迁移入口      | `pnpm example:react-object`                                                                                                                                   | [React hooks](/zh/reference/react)                           |
| 测试 AI SDK UI stream 后端路由   | [UI message stream 路由](#stream-demo)                                                                                                                        | [Stream 工具](/zh/reference/streams)                         |
| 一个提示词生成一段文本           | [文本补全](#completion-demo)                                                                                                                                  | [useCompletion](/zh/reference/use-completion)                |
| 做语义相似度比较                 | [向量相似度](#embedding-demo)                                                                                                                                 | [useEmbedding](/zh/reference/use-embedding)                  |
| 运行自定义异步生成任务           | [任务型 Demo](/zh/guide/task-demos)                                                                                                                           | [useGeneration](/zh/reference/use-generation)                |
| 通过应用后端生成或编辑图片       | [图片生成](#image-demo)                                                                                                                                       | [useImage](/zh/reference/use-image)                          |
| 通过应用后端生成视频             | [视频生成](#video-demo)                                                                                                                                       | [useVideo](/zh/reference/use-video)                          |
| 通过应用后端生成语音             | [语音生成](#speech-demo)                                                                                                                                      | [useSpeech](/zh/reference/use-speech)                        |
| 通过应用后端把音频转成文本       | [音频转写](#transcription-demo)                                                                                                                               | [useTranscription](/zh/reference/use-transcription)          |
| 通过应用后端重排搜索结果         | [文档重排](#rerank-demo)                                                                                                                                      | [useRerank](/zh/reference/use-rerank)                        |
| 从提示词抽取类型化 JSON          | [结构化对象输出](#object-demo)                                                                                                                                | [useObject](/zh/reference/use-object)                        |
| 把应用状态暴露给 agent 请求      | `pnpm example:chat`                                                                                                                                           | [useAgentContext](/zh/reference/use-agent-context)           |
| 根据 runtime 能力开关渲染 UI     | [任务型 Demo](/zh/guide/task-demos)                                                                                                                           | [useAgentCapabilities](/zh/reference/use-agent-capabilities) |
| 跟踪无 UI 的自有 agent run       | [Agent 事件](/zh/guide/agent-events)                                                                                                                          | [useAgentRun](/zh/reference/use-agent-run)                   |
| 添加输入区任务入口 chips         | `pnpm example:chat`                                                                                                                                           | [usePromptSuggestions](/zh/reference/use-prompt-suggestions) |

## 5 分钟上手到生产验证路径

1. 运行 `pnpm example:chat`  
   先确认本地流式输出、工具审批链路、`usePromptSuggestions()` Chips 都可用。
2. 启动 `pnpm example:proxy-server`，并用 `VITE_CHAT_PROVIDER=proxy-route` 重跑目标示例。  
   验证 `/api/*` 与 `readUIMessageStream()` 的契约行为。
3. 运行 `pnpm example:threaded-chat`  
   在接真实存储之前，先验证 thread 的创建、归档、恢复是否稳定。

## 常见启动问题

- 没有流式输出：先确认 `pnpm example:chat` 已启动，再看浏览器控制台是否有 SSE 连接错误。
- 工具调用卡住不结束：确认审批/结果返回了 `{ status: 'approved' }` 或 `{ status: 'rejected' }`。
- Thread 状态丢失：确认同一条 thread 复用的是同一个 `id`，本地存储 key 稳定不变。
- 文档迁移看不清：每个演示点都指向对应 API 参考，按“先看 demo，再看 API”切换即可。

## Demo 验收清单

在决定接入路径前，先用这些条目快速验收：

| 方向                   | 30 秒内应看到什么                                                 | 未命中时先查哪里                                                        |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 聊天 + 工具审批        | 能看到 **Run approval demo**、待确认的 `chargeCard`、可中止重试流 | 检查 `pnpm example:chat` 是否在运行，重启示例                           |
| Thread 持久化          | 侧边栏可增删改、归档后列表状态一致                                | 走 `examples/threaded-chat` + `useChatThreads`                          |
| 图片/视频/语音等媒体流 | 本地确定性产物先出现，请求面板可重复发送                          | 检查对应 `examples/image` / `examples/video` / `examples/speech` 路径   |
| Proxy 契约             | `/api/chat`、`/api/ui-message-stream` 成功返回并在 UI 显示 chunks | 先跑 `pnpm example:proxy-server`，再用 `pnpm example:ui-message-stream` |
| 结构化对象抽取         | `local-object` 示例能跑出字段化结果，且可切 `/api/object`         | 查 `examples/object` 与 [useObject](/zh/reference/use-object)           |

## 先跑不需要 key 的 Demo

```bash
pnpm install
pnpm example:chat
```

打开 Vite 输出的本地地址，点击 **Run approval demo**。聊天示例会先使用确定性的
`local-tools` Provider，流式输出回复，在 `chargeCard` 工具调用处暂停，并在审批或拒绝后继续。
先用这条路径确认 UI，再接真实 Provider key 或后端代理。示例还会为 provider request
注册 `useAgentContext()` 状态，输入区也会渲染 `usePromptSuggestions()` chips，可以先验证
任务入口，而不需要接入成品 copilot UI 外壳。

如果要试不需要 key 的 React 聊天流程，运行 `pnpm example:react-chat`。它通过
`vue-ai-hooks/react` 复用同一套 Provider 契约，从确定性的 `DirectChatTransport`
流式输出，并在聊天面板旁展示请求 trace 状态。

如果要试不需要 key 的 React 补全流程，运行 `pnpm example:react-completion`。它复用
`vue-ai-hooks/react` 的 `useCompletion`，默认使用本地流式补全并展示请求 trace 面板。

如果要试不需要 key 的 React 结构化输出流程，运行 `pnpm example:react-object`。它复用
`vue-ai-hooks/react` 的 `useObject`，默认使用本地 schema 驱动 object 流，并展示请求 trace。

如果要试不需要 key 的 threaded chat 流程，运行 `pnpm example:threaded-chat`。它把
`useChatThreads()` 和每个 thread 独立的 `useChat({ persist })` 存储放在一起，你可以先验证
创建、重命名、归档、恢复、删除、刷新和本地历史恢复，再接 server storage adapter。

如要先上线无服务端方案的本地版本，再做服务端接入，可以先看 [IndexedDB 本地持久化（异步）](/zh/guide/server-storage#indexeddb-%E6%9C%AC%E5%9C%B0%E6%8C%81%E4%B9%85%E5%8C%96%E9%85%8D%E7%BD%AE%E5%99%A8%E5%BC%82%E6%AD%A5)。
该方案在启动时异步恢复 thread/index 与 messages，并在明确生命周期动作后回写。

要验证后端契约，运行 `pnpm example:proxy-server`。它同时接受默认的
`/api/chat`、`/api/completion`、`/api/embedding`、`/api/image`、`/api/video`、
`/api/speech`、`/api/rerank`、`/api/transcription`、`/api/object` 和
`/api/ui-message-stream` 路由，以及浏览器示例通过 `proxyProvider` 使用的 `/api/ai/*` 路由。

如果要试不需要 key 的图片生成和编辑流程，运行 `pnpm example:image`。它默认渲染确定性的本地
SVG，并用源图和 mask 跑通 `editImage()`；设置 `VITE_PROXY_BASE_URL` 后会切到 proxy `/api/image`
路由。

如果要试不需要 key 的视频生成流程，运行 `pnpm example:video`。它默认渲染确定性的本地
storyboard；设置 `VITE_PROXY_BASE_URL` 后会切到 proxy `/api/video` 路由。

如果要试不需要 key 的语音生成流程，运行 `pnpm example:speech`。它默认返回确定性的本地
WAV；设置 `VITE_PROXY_BASE_URL` 后会切到 proxy `/api/speech` 路由。

如果要试不需要 key 的音频转写流程，运行 `pnpm example:transcription`。它默认返回确定性的本地转写文本；设置 `VITE_PROXY_BASE_URL` 后会切到 proxy `/api/transcription` 路由。

如果要试不需要 key 的文档重排流程，运行 `pnpm example:rerank`。它默认返回确定性的本地排序；设置 `VITE_PROXY_BASE_URL` 后会切到 proxy `/api/rerank` 路由。

如果要试结构化 JSON 流程，运行 `pnpm example:object`。它默认使用本地
`local-object` Provider，不需要 key；之后也可以用和其它浏览器示例相同的环境变量切到
`proxy` 或真实 Provider。

如果要检查 UI message stream 契约，先在一个终端运行 `pnpm example:proxy-server`，
再在另一个终端运行 `pnpm example:ui-message-stream`。界面会向
`/api/ui-message-stream` 发送请求，使用 `readUIMessageStream()` 解码并展示 chunk
明细和响应元信息。

<DemoShowcase locale="zh" />
