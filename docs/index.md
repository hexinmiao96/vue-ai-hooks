---
layout: home

hero:
  name: "vue-ai-hooks"
  text: "Vue 3 Composable library for AI applications"
  tagline: "Streaming-first, multi-provider, fully typed."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/hexinmiao96/vue-ai-hooks

features:
  - title: Three composables, one mental model
    details: useChat, useCompletion, and useEmbedding cover the most common LLM use cases. Pluggable providers let you swap models without rewriting your app.
  - title: Streaming by default
    details: Server-Sent Events parsing, AbortController, and reactivity are handled for you. Stop a stream, reload a response, or clear history with a single method call.
  - title: Multi-provider
    details: OpenAI, Anthropic, DeepSeek, Moonshot, Zhipu, Ollama, vLLM — any service that follows the OpenAI REST conventions. Add a new provider in a single file.
  - title: TypeScript first
    details: Strict mode, no any leaks, full IDE autocomplete. If you can write the call, you can read the type.
  - title: Tiny
    details: Zero runtime dependencies beyond Vue itself. Tree-shakable ESM and CJS, named exports, no side effects.
  - title: Tested
    details: Vitest + happy-dom, with copy-paste fake providers so you can write your own tests in seconds.
---
