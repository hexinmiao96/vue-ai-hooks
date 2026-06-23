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
  - title: 三个组合式函数，一套心智模型
    details: useChat、useCompletion 和 useEmbedding 覆盖最常见的 LLM 使用场景。可插拔 Provider 让你切换模型时不需要重写应用。
  - title: 默认支持流式响应
    details: Server-Sent Events 解析、AbortController 和 Vue 响应式状态都已经处理好。停止流、重新生成回复或清空历史都只需要调用一个方法。
  - title: 多 Provider
    details: OpenAI、Anthropic、DeepSeek、Moonshot、智谱、Ollama、vLLM，以及任何遵循 OpenAI REST 约定的服务。新增 Provider 只需要一个文件。
  - title: TypeScript 优先
    details: 严格模式、无 any 泄漏、完整 IDE 自动补全。能写出来的调用，也能读懂它的类型。
  - title: 小而轻
    details: 除 Vue 本身外没有运行时依赖。支持 tree-shaking、ESM 和 CJS、命名导出，无副作用。
  - title: 已测试
    details: 使用 Vitest + jsdom，并提供可复制的 fake provider，方便你快速编写自己的测试。
---
