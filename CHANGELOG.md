# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-05

### Added
- Initial release
- `useChat()` composable for streaming multi-turn conversations
- `useCompletion()` composable for single-turn completions
- `useEmbedding()` composable for text embedding generation
- OpenAI provider with full chat/completion/embedding support
- OpenAI-compatible provider (works with DeepSeek, Ollama, vLLM, etc.)
- Server-Sent Events (SSE) streaming parser
- Full TypeScript support with strict mode
- Vue 3.4+ reactivity integration
- SSR-safe composables
- Basic test suite (Vitest + happy-dom)
- Three runnable examples (chat, completion, embedding)
- GitHub Actions CI
