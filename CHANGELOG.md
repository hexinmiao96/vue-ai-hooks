# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-06-30

### Added

- Added a first-class `deepseek()` provider helper with current DeepSeek
  OpenAI-compatible defaults.
- Added English and Chinese v0.2.1-to-v0.3.0 upgrade guides for release
  adoption.
- Added English and Chinese AI SDK migration guides for teams porting existing
  chat surfaces.
- Added English and Chinese library-fit guides comparing `vue-ai-hooks` with
  common alternatives.
- Added `timeoutMs` to OpenAI-compatible, OpenRouter, Gemini, and Anthropic
  provider configs for bounded direct provider requests.
- Added default proxy transports for `useChat`, `useCompletion`, `useEmbedding`,
  and `useObject`, so apps can omit a provider and target app-owned `/api/*`
  routes.
- Added provider request trace refs with `lastRequest`, `lastResponse`, and
  `clearTrace()` across chat, completion, embedding, object, and generation
  composables for UI-visible diagnostics.
- Added `fallbackProvider()` for provider-level chat, completion, and embedding
  failover before a stream starts.
- Added AI SDK-style chat helpers for message submission, stream resume, manual
  tool output, and approval-gated tool calls.
- Added an AI SDK-compatible object signature for `addToolResult()`.
- Added `data` and `setData()` as AI SDK-style custom stream data helpers.
- Added AI SDK-compatible `streamProtocol` support for default proxy
  completions that return plain text streams.
- Added plain text stream support for default proxy chat/object responses.
- Added `ObjectFinishInfo` to `useObject.onFinish` for AI SDK-style final
  object diagnostics without changing the first callback argument.
- Added `HeadersInit` support for default proxy headers and prepared proxy
  request overrides.
- Added `HeadersInit` support for provider config headers and per-request
  headers across chat, completion, embedding, object, and resume requests.
- Added `experimental_useObject` as an AI SDK-compatible alias for `useObject`.
- Added `initialInput`, `setInput()`, `handleInputChange()`, and
  `handleSubmit()` to `useObject` for structured-output forms.
- Added `initialInput`, `input`, `setInput()`, `handleInputChange()`, and
  `handleSubmit()` to `useEmbedding` for embedding forms.
- Added `useImage` for app-owned image generation routes with normalized
  `image`/`images` state, retries, aborts, trace refs, and form helpers.
- Added a runnable no-key `useImage` example with deterministic local SVG output
  and proxy `/api/image` route coverage.
- Added `useSpeech` for app-owned text-to-speech routes with normalized `audio`
  state, retries, aborts, trace refs, and form helpers.
- Added a runnable no-key `useSpeech` example with deterministic local WAV
  output and proxy `/api/speech` route coverage.
- Added `useTranscription` for app-owned audio transcription routes with
  normalized `transcription`/`text` state, retries, aborts, trace refs, and form
  helpers.
- Added a runnable no-key `useTranscription` example with deterministic local
  transcript output and proxy `/api/transcription` route coverage.
- Added `useRerank` for app-owned document reranking routes with normalized
  `originalDocuments`/`rerankedDocuments`/`ranking` state, retries, aborts,
  trace refs, and form helpers.
- Added a runnable no-key `useRerank` example with deterministic local ranking
  output and proxy `/api/rerank` route coverage.
- Added proxy `api` and `credentials` to chat prepare callbacks and request
  traces.
- Added proxy `api` and `credentials` to completion and object request traces.
- Added structured chat message parts, stream data typing, metadata handling, and
  pruning controls for production chat surfaces.
- Added a runnable no-key structured object example and documentation coverage
  for choosing the right demo first.
- Added a proxy example contract check that verifies default `/api/*` routes,
  legacy `/api/ai/*` routes, chat resume, completion, embedding, image, speech,
  transcription, rerank, and object endpoints.

### Changed

- Updated docs, demo pages, and Docs UX checks so default proxy transports, trace
  refs, object demos, and proxy compatibility remain visible.
- `prepublishOnly` now delegates to `release:check`, which runs dependency audit
  before the full local quality gate.
- Coverage thresholds now require at least 98% statements, 90% branches, 96%
  functions, and 98% lines.

### Fixed

- Preserved OpenAI-compatible non-streaming chat `tool_calls` as
  `ChatChunk.toolCalls`, so tool workflows work when a gateway returns a
  single JSON response.

## [0.2.1] - 2026-06-18

### Added

- Added an OpenSSF Scorecard workflow for scheduled supply-chain security
  posture checks, signed published results, and SARIF upload to code scanning,
  with workflow guardrails for permissions, triggers, and pinned actions.
- Added English and Chinese API stability guides defining SemVer-covered public
  exports, breaking changes, internal deep-import boundaries, and provider/model
  behavior limits, with README links and metadata checks.
- Added English and Chinese SSR/Nuxt guides for server-side credential handling,
  client-owned composable state, persistence behavior, streaming proxies, and
  SSR boundary tests, with README links and metadata checks.
- Added English and Chinese testing guides for fake providers, streaming chunks,
  completions, embeddings, provider errors, persistence storage, and avoiding
  live provider calls in unit tests.
- Linked the testing guide from both READMEs, with metadata checks to keep the
  fake-provider testing entry point visible.
- Updated contributor command descriptions for metadata, community, and API docs
  checks, with metadata checks that keep command coverage descriptions accurate.
- Added dynamic VitePress sidebar coverage checks for every English and Chinese
  guide page so new guide docs cannot be orphaned.
- Added English and Chinese troubleshooting docs covering browser key exposure,
  CORS/proxying, streaming buffering, abort behavior, tool-calling trust
  boundaries, provider errors, and minimal issue details, with VitePress
  navigation and metadata checks.
- Added PR template version-impact and breaking-change migration prompts, with
  community checks that keep pull requests aligned with the versioning policy.
- Added English and Chinese runtime requirements for Vue, browser streaming
  APIs, Node development tooling, and legacy runtime polyfill/proxy guidance,
  with metadata checks to keep compatibility boundaries documented.
- Added a contributor-facing Semantic Versioning policy for patch, minor, and
  major changes, with metadata checks requiring breaking-change disclosure.
- Added English and Chinese known-limitations sections for production proxying,
  tool-calling responsibility, and provider-specific operational concerns, with
  metadata checks so those boundaries stay visible.
- Added GitHub `CODEOWNERS` coverage for repository, source, scripts, docs, and
  examples, with community checks to keep review ownership in place.
- Added CI, npm version, and bundle size badges to both READMEs, with metadata
  checks that keep package status signals visible.
- Aligned the contributing release tag example with the current package version
  and added metadata checks that reject stale release tag examples.
- Documented published ESM/CJS bundle size budgets in the contributing guide and
  added metadata checks so those limits stay visible to contributors.
- Added metadata checks for `.editorconfig` so editor indentation, LF endings,
  UTF-8, final newlines, and Markdown whitespace behavior stay consistent.
- Added GitHub issue contact links for support and security guidance, plus
  community checks that keep issue intake correctly routed.
- Added `SUPPORT.md`, published it with the package, linked it from README and
  contributing docs, and added community checks for support-channel guidance.
- Added npm metadata checks for package description and discoverability keywords,
  and expanded keywords for Vue composable, AI SDK, provider, streaming, and
  TypeScript searches.
- Added a project code of conduct, included it in the package whitelist, and
  added community health checks that keep its reporting and enforcement guidance
  present.
- Linked the code of conduct from contributor-facing README and contributing
  docs, with community health checks to keep those links present.
- Added workflow checks that derive the GitHub Actions pnpm setup version from
  `packageManager` and lock CI and publish Node versions to the supported
  runtime policy.
- Added workflow guardrail checks for CI, CodeQL, and npm publishing.
- Added CI and publish workflow coverage for source hygiene, test hygiene, and
  workflow guardrail checks so hosted gates match the local release gate.
- Added workflow checks that derive required CI and publish `pnpm` commands from
  `package.json` so hosted gates cannot drift from the local `pnpm check` gate.
- Added package metadata and README consistency checks.
- Added package README local-link validation to `pack:check`.
- Added public API documentation coverage checks to local, CI, and publish gates.
- Added explicit `AiHooksError` handling examples to the public type reference.
- Added stricter API documentation checks so English and Chinese reference pages
  must each cover every public export.
- Added public entry checks that reject wildcard exports, internal implementation
  exports, unexpected export sources, and broken `src/index.ts` export paths.
- Added VitePress navigation checks so every English and Chinese public
  reference page remains reachable from the docs sidebar.
- VitePress navigation checks now derive required reference links from the
  English and Chinese reference directories instead of a duplicated hard-coded
  list.
- Added English and Chinese provider and public type reference pages.
- Added dependency security audit checks to CI and publishing.
- Added release metadata checks that prevent accidental runtime, optional, or
  bundled dependencies.
- Added repository secret scanning for likely provider API keys and package
  manager tokens.
- Added Markdown link checks to local, CI, and publish quality gates.
- Added English and Chinese `usePersist` API reference pages.
- Added npm provenance publishing and tighter GitHub Actions permissions.
- Added CodeQL security scanning for JavaScript and TypeScript.
- Added community health checks for issue and pull request templates.
- Added community health checks for `SECURITY.md` reporting, response, support,
  and provider API key safety guidance.
- Added changelog consistency checks for release readiness.
- Added a non-writing Prettier `format:check` gate to local checks, CI, and
  publishing.
- Added bundle size budget checks for published ESM and CJS outputs.
- Added an explicit `./package.json` export and install smoke coverage for
  package metadata consumers.
- Added a single `pnpm check` quality gate covering lint, full type checks,
  coverage, library build, dist entry validation, package contents, install smoke
  tests, API docs, Markdown links, examples, and docs.
- Added public API type contract tests for exported composables, providers,
  request/message/tool types, and persistence types.
- Added OpenAI-compatible provider contract tests for request serialization,
  streaming chunks, completions, embeddings, headers, and custom paths.
- Added Anthropic provider contract tests for non-stream responses, request
  serialization, headers, stop reasons, unsupported embeddings, and image
  fallback behavior.
- Added direct `requestJson` tests for success, HTTP JSON/text errors, network
  errors, aborts, timeouts, and missing fetch support.
- Added `dist:check` and `pack:check` release guards for built ESM/CJS entries,
  declaration exports, and npm package contents.
- Added `dist:check` verification that Vue stays externalized in both ESM and
  CJS builds instead of being bundled into the library.
- Added npm packed and unpacked package size budgets to `pack:check`.
- Added an install smoke test that packs the package, installs it into a
  temporary consumer project, and verifies ESM, CJS, and TypeScript imports by
  package name.
- Added build checks for all example apps.
- Added browser API key safety guidance to README, docs, and `.env.example`.
- Added a security policy with private vulnerability reporting guidance.
- Added Dependabot maintenance for npm dependencies and GitHub Actions.
- Added workflow checks that keep Dependabot enabled for npm and GitHub Actions
  with weekly grouped updates and bounded open PRs.
- Added a test hygiene check that rejects focused, skipped, or todo Vitest
  markers before coverage runs.
- Added a source hygiene check that rejects merge conflict markers, `debugger`,
  and runtime `console.*` output in published source files.
- Added metadata checks for ESLint parser, recommended rule presets, generated
  directory ignores, and console/no-undef/no-unused-vars rule posture.
- Added metadata checks for the Vite library build contract, including Vue
  plugin setup, library entry, ESM/CJS formats, sourcemaps, stable filenames,
  and Vue peer externalization.
- Added metadata checks for the Prettier style contract so semicolons, quotes,
  trailing commas, width, indentation, arrow parens, and line endings cannot
  drift silently.
- Added stricter npm package pollution checks for editor folders, generated
  output, logs, environment files, package tarballs, backups, and private key
  material.
- Added metadata checks for the exact npm package file whitelist, pnpm lockfile
  format, Vite override consistency, and absence of alternate package manager
  lockfiles or `.npmignore`.
- Added metadata checks that lock down strict TypeScript options, declaration map
  output, local package path mapping, build-only declaration emit, and full
  repository type-check coverage.
- Added metadata checks for `.gitignore` and `.prettierignore` so generated
  output, dependency folders, coverage, docs caches, logs, and local env files
  stay excluded.
- Added license metadata checks so the MIT package declaration, author, and
  `LICENSE` file cannot drift apart.
- Added `.env.example` metadata checks for placeholder provider keys, default
  OpenAI-compatible base URL, and browser key safety guidance.
- Added `.env.example` coverage for OpenRouter example variables and metadata
  checks that every `VITE_*` variable used by examples is documented.

### Changed

- CI and publish jobs now use bounded timeouts, and CI now runs every supported
  Node version before failing the matrix.
- The bug report template now requires a minimal reproduction link, deterministic
  reproduction steps, package manager, bundler/framework, and OS details.
- `prepublishOnly` now delegates to `release:check`, which runs dependency audit
  before the full local quality gate.
- Coverage thresholds now require at least 98% statements, 90% branches, 96%
  functions, and 98% lines after expanding composable, provider, and utility
  boundary coverage.
- Changelog checks now derive the required coverage threshold wording from
  `vitest.config.ts` so release notes cannot drift from the enforced gate.
- `pnpm lint` now fails on warnings, while Vue template formatting rules that
  conflict with Prettier are disabled.
- Publish workflow now relies only on npm Trusted Publishing/OIDC and no longer
  supports long-lived `NPM_TOKEN` fallback credentials.
- Publish workflow is now tag-only and cannot be manually dispatched from a
  branch.
- CI and CodeQL workflows now cancel stale in-progress runs for the same ref.
- Published package now includes `src/` so declaration maps resolve to real
  source files.
- Package metadata now declares `publishConfig.access: public`.
- The install smoke test now verifies a temporary Vite/browser consumer build.
- `typecheck:all` now includes root Vite/Vitest and VitePress config files.
- Sync README and contributing docs with the current public API and example
  environment file path.
- Migrated ESLint to v9 flat config and tightened the Node engine floor to
  18.18.
- Upgraded Vite and Vitest, and switched tests from happy-dom to jsdom to clear
  dependency audit findings while keeping Node 18 support.
- CI now runs coverage, docs, dist, package, install, and example checks across
  Node 18, 20, 22, and 24.
- The package manager is now pinned to pnpm 8.15.9 across `package.json`, CI,
  and publishing so the lockfile stays reproducible.
- The contribution guide now documents the supported Node range and release
  checklist.
- The PR template now asks contributors to run `pnpm check` locally and review
  security impact for provider/auth/example changes.
- The npm publish workflow now runs security audit, coverage, dist/package,
  install, API docs, Markdown links, examples, and docs checks before publishing.
- The published package now includes `CHANGELOG.md`.
- The published package now includes `SECURITY.md`.
- `UseChatOptions.provider` is now required in TypeScript, matching runtime
  behavior.

### Fixed

- Generate and verify published JavaScript source maps correctly.
- Correct the README example environment copy command.
- Non-JSON HTTP error responses now preserve the response text in
  `AiHooksError.cause` instead of losing the body after a failed JSON parse.

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
