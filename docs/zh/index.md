---
layout: home

hero:
  name: 'vue-ai-hooks'
  text: '面向 AI 应用的 Vue 3 组合式函数库'
  tagline: '流式优先、多 Provider、完整类型支持。'
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 示例
      link: /zh/examples/
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/hexinmiao96/vue-ai-hooks

features:
  - title: 四个组合式函数，一套心智模型
    details: useChat、useCompletion、useEmbedding 和 useObject 覆盖对话、文本、向量和结构化 JSON。可插拔 Provider 让你切换模型时不需要重写应用。
  - title: 可以先不配置 API key
    details: 聊天示例内置确定性的本地 Provider，可直接体验工具审批；proxy 模板也能在本地返回模拟流式片段。先跑通 UI，再接真实模型。
  - title: 默认支持流式响应
    details: Server-Sent Events 解析、AbortController 和 Vue 响应式状态都已经处理好。停止流、重新生成回复或清空历史都只需要调用一个方法。
  - title: 多 Provider
    details: OpenAI、Gemini、OpenRouter、Anthropic、后端代理、DeepSeek、Moonshot、智谱、Ollama、vLLM，以及任何遵循 OpenAI REST 约定的服务或你自己的 API 路由。
  - title: 可观测生命周期
    details: onChunk、onToolCall、onToolResult、onUpdate、onPartial、onFinish 和 onError 覆盖流式 UI、链路追踪、分析埋点和审计日志，不需要额外中间件依赖。
  - title: 自定义流数据
    details: 通过 streamData 和 onData 收集 sources、进度、引用和 assistant metadata，不需要让 UI 绑定具体 Provider 协议。
  - title: 工具审批
    details: 让模型请求工具后暂停，等待 UI 确认，再审批执行本地 handler 或提交手动结果；所有结果就绪后自动继续对话。
  - title: 重试控制
    details: 通过 maxRetries、retryDelayMs、shouldRetry 和 onRetry 显式处理临时 Provider 失败。流式请求只会在首个 chunk 前重试，避免重复输出。
  - title: 一致的状态模型
    details: status、isLoading、error 和 clearError 在聊天、补全、向量与结构化对象输出中使用同一套生命周期语义。
  - title: TypeScript 优先
    details: 严格模式、无 any 泄漏、完整 IDE 自动补全。能写出来的调用，也能读懂它的类型。
  - title: 小而轻
    details: 除 Vue 本身外没有运行时依赖。支持 tree-shaking、ESM 和 CJS、命名导出，无副作用。
  - title: 已测试
    details: 使用 Vitest + jsdom，并提供可复制的 fake provider，方便你快速编写自己的测试。
---
