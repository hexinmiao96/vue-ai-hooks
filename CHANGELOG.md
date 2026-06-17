# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-06-17

### Added

- **Automatic tool execution for `useChat`** — new `toolHandlers` and
  `maxToolRoundtrips` options let local handlers run model-emitted tool calls,
  append `tool` messages, and continue the assistant response automatically.
- Root example scripts: `pnpm example:chat`, `pnpm example:completion`, and
  `pnpm example:embedding`.
- GitHub Actions publishing workflow for npm Trusted Publishing.

### Changed

- README project status and example commands now match the current package
  layout and `0.2.0` feature set.
- Package metadata now declares `sideEffects: false`.

### Fixed

- Build output now preserves generated TypeScript declaration files in `dist/`
  so the published package's `types` entry resolves correctly.
- Example apps now pass the repository lint gate without warnings.

## [0.2.0-alpha.1] - 2026-06-05

### Added

- **Anthropic Claude provider** — full chat and completion support; streaming via
  Anthropic's `content_block_delta` SSE events. `useEmbedding` with this
  provider throws a clear `AiHooksError` (Anthropic has no embeddings API).
- **`usePersist` composable** — wires any ref to localStorage with versioned
  keys, custom serialize/deserialize, and SSR safety.
- **localStorage persistence for `useChat`** — new `persist: { key, version? }`
  option. `clear()` removes the entry.
- **Vision / multimodal input** — `Message.content` now accepts
  `string | ContentPart[]`. The OpenAI provider passes ContentPart through;
  the Anthropic provider converts `image_url` parts to Anthropic's
  `image` content block (with automatic data-URL → base64 conversion).
- **Tool calling foundation** — `tools` and `toolChoice` options on `useChat`.
  Streaming `tool_calls` deltas are accumulated onto the assistant message
  via the internal `mergeDeltas` helper.
- **VitePress documentation site** under `docs/` — landing page, getting
  started, providers guide, and reference docs for every composable. Run
  with `pnpm docs:dev` and build with `pnpm docs:build`.
- More tests (42 total, up from 15)

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
