---
layout: home

hero:
  name: 'vue-ai-hooks'
  text: 'Vue 3 Composable library for AI applications'
  tagline: 'Streaming-first, multi-provider, fully typed.'
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Examples
      link: /examples/
    - theme: alt
      text: Choose Fit
      link: /guide/choosing
    - theme: alt
      text: View on GitHub
      link: https://github.com/hexinmiao96/vue-ai-hooks

features:
  - title: Seven composables, one mental model
    details: useChat, useCompletion, useEmbedding, useGeneration, useImage, useSpeech, and useObject cover chat, text, vectors, custom generation jobs, app-owned image and speech generation routes, and structured JSON. Pluggable providers let you swap models without rewriting your app.
  - title: Start without an API key
    details: The chat demo includes a deterministic local provider for tool approvals, and the proxy template streams fake chunks locally. Try the UI first, wire real providers later.
  - title: Streaming by default
    details: Server-Sent Events parsing, AbortController, and reactivity are handled for you. Stop a stream, reload a response, or clear history with a single method call.
  - title: Multi-provider
    details: OpenAI, Gemini, OpenRouter, Anthropic, backend proxy, DeepSeek, Moonshot, Zhipu, Ollama, vLLM — any service that follows the OpenAI REST conventions or your own API route.
  - title: Observable lifecycle
    details: onChunk, onToolCall, onToolResult, onUpdate, onPartial, onFinish, and onError cover streaming UI, tracing, analytics, and audit logs without a middleware dependency.
  - title: Custom stream data
    details: Collect sources, progress, citations, and assistant metadata through streamData and onData without coupling your UI to a provider-specific protocol.
  - title: Tool approvals
    details: Let the model request a tool, pause for UI confirmation, then approve a local handler or submit a manual result before the conversation continues.
  - title: Retry controls
    details: Opt into maxRetries, retryDelayMs, shouldRetry, and onRetry for transient provider failures. Streaming calls only retry before the first chunk to avoid duplicated output.
  - title: Consistent statuses
    details: status, isLoading, error, and clearError follow one lifecycle vocabulary across chat, completion, embedding, image generation, speech generation, custom generation, and structured object output.
  - title: TypeScript first
    details: Strict mode, no any leaks, full IDE autocomplete. If you can write the call, you can read the type.
  - title: Tiny
    details: Zero runtime dependencies beyond Vue itself. Tree-shakable ESM and CJS, named exports, no side effects.
  - title: Tested
    details: Vitest + jsdom, with copy-paste fake providers so you can write your own tests in seconds.
---
