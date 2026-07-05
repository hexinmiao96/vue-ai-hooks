# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- No unreleased changes pending.

## [1.0.0-rc.1] - 2026-07-05

### Added

- Added a CI-level OSS adoption smoke that packs the current local package,
  installs it into pinned `un-pany/v3-admin-vite`, injects a hidden validation
  route, and verifies external Vue 3 app build plus browser smoke.
- Added bilingual OSS adoption smoke documentation and adoption evidence for the
  `v3-admin-vite` integration.

### Changed

- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.
- CI now runs the OSS adoption smoke once on the primary Node version instead
  of repeating the external app download and browser run across the full Node
  matrix.
- Workflow guardrails now require the OSS adoption smoke job so future CI edits
  cannot silently remove the external integration gate.

### Fixed

- Kept empty Unreleased sections guarded by the existing changelog placeholder
  check while preparing the first release-candidate changelog entry.

## [0.14.3] - 2026-07-04

### Added

- Added competitive readiness checks and documentation that keep task demos,
  production readiness guidance, agent route templates, and example workflows
  aligned with the current public API.
- Added completion, object, embedding, proxy, threaded chat, and route-template
  smoke checks to the local production readiness gate.
- Added regression coverage for changelog validation so stale release-gate
  wording, empty Unreleased sections, and mismatched coverage threshold notes
  keep failing before release.
- Added regression coverage for the shared public export parser used by API docs,
  dist, install, and pack checks.
- Added regression coverage for bundle size validation so raw and gzip budget
  overruns keep failing before release.
- Added regression coverage for the release wrapper so already-published
  versions stop before dependency audit and full local gates.
- Added regression coverage for community health validation so ownership,
  support-route, and security-policy drift keep failing before release.
- Added regression coverage for workflow guardrails so CI frozen-lockfile and
  token-free provenance publishing rules keep failing before release.
- Added regression coverage for API docs validation so public export docs,
  React reference coverage, and allowed entrypoint sources keep failing before
  release.
- Added regression coverage for metadata validation so package version docs,
  production-readiness coverage, and no-runtime-dependency policy drift keep
  failing before release.
- Added regression coverage for docs UX validation so language routing,
  competitive positioning, and examples local-run entrypoints keep failing
  before release.
- Added regression coverage for competitive benchmark validation so shell
  ownership wording, bilingual snapshot dates, and runtime smoke exports keep
  failing before release.
- Added regression coverage for proxy example validation so legacy route
  compatibility and provider trace metadata keep failing before release.
- Added source hygiene coverage for trailing whitespace so Markdown and source
  files cannot reintroduce invisible diff noise before release.
- Added a strict `release:check` wrapper so local `prepublishOnly` rejects
  already-published package versions before npm publish.
- Added child-status preserving failure handling to the local production
  readiness runner.

### Changed

- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.
- Consolidated shared inspection retry bookkeeping across image, video, speech,
  transcription, and rerank composables to reduce repeated bundle code.
- Consolidated shared React inspection retry bookkeeping across chat,
  completion, object, image, and video hooks to reduce repeated bundle code.
- Synchronized contributor bundle-size policy with the root and React budgets
  enforced by `pnpm size:check`.
- Unified production readiness commands behind one Node runner so release-candidate
  gate coverage cannot drift between package scripts.
- Added metadata guards that keep the production readiness runner aligned with
  `pnpm check` and `pnpm examples:build`.
- Expanded dist checks to derive root and React runtime export coverage from
  source entrypoints instead of a hand-maintained partial list.
- Expanded install checks to verify installed ESM and CJS packages expose every
  root and React runtime export from the source entrypoints.
- Expanded pack checks to derive required public source and declaration files
  from the root and React source entrypoints.
- Expanded pack pollution checks to reject credential stores, database dumps,
  local database files, and archive formats before npm packaging.
- Added regression coverage for pack validation so tarball credential pollution
  and broken package README links keep failing before release.
- Strengthened pack checks to reject runtime bundle sourcemaps while still
  allowing declaration maps for TypeScript consumers.
- Strengthened pack checks to require published support and code-of-conduct
  community files in the actual npm tarball.
- Strengthened metadata checks so package file whitelists keep the source and
  declaration-map globs that pack validation relies on.
- Strengthened metadata checks to derive public source and declaration whitelist
  coverage from the root and React source entrypoints.
- Shared entrypoint export and source parsing across API docs, dist, install,
  and pack checks so public-surface gates use the same source-derived export
  model.
- Expanded API docs checks and React reference docs to cover every
  `vue-ai-hooks/react` export.
- Strengthened API entrypoint checks so `vue-ai-hooks/react` can only re-export
  from approved public React sources.
- Expanded example inspection panels and proxy example coverage so request
  lifecycle traces, retries, provider metadata, and backend boundaries are
  visible in runnable demos.
- Strengthened source hygiene checks to block browser-facing console output and
  to verify `.gitignore` / `.sembleignore` continue excluding dependencies,
  build outputs, logs, environment files, local data, database dumps, credential
  stores, and archives.
- Added regression coverage for the source hygiene ignore audit so `.gitignore`
  and `.sembleignore` cannot silently drop generated-output or credential
  exclusions.
- Hardened Semble local-cache ignore rules so semantic retrieval indexes source
  content instead of generated output or local machine state.
- Corrected competitive benchmark wording so full copilot shell widgets remain
  an explicit app/product-layer non-goal instead of a `vue-ai-hooks` claim.
- Expanded source hygiene checks to include root release metadata and GitHub
  workflow files when scanning for merge conflict markers.
- Added tag-scoped concurrency to the npm publish workflow so duplicate tag runs
  cannot publish the same package version in parallel.
- Disabled persisted checkout credentials in CI, CodeQL, and npm publish
  workflows to reduce unnecessary token exposure during release gates.
- Expanded secret scanning to catch generic provider key, auth token, secret, and
  proxy upstream env assignments instead of only a small provider allowlist.
- Updated secret scanning to follow Git ignore rules, so ignored local `.env`
  files do not block the gate while tracked and unignored candidate files are
  still scanned.
- Strengthened Markdown link checks to reject unsafe protocols and local links
  that escape the repository, including same-prefix sibling paths.
- Expanded Markdown link checks to validate local anchors, including headings
  and VitePress component-provided ids, and corrected stale provider and
  IndexedDB documentation anchors.
- Expanded Markdown link checks to validate local image targets and reject
  unsafe image protocols before docs changes can ship.
- Expanded source hygiene scanning to include TSX and JSX browser-facing source
  files, so React examples cannot bypass console/debugger/suppression checks.
- Expanded secret scanning to include TSX and JSX files, so React examples
  cannot bypass committed provider key and token checks.
- Expanded source hygiene and secret scanning to include MTS, CTS, and CJS files
  so alternate module-format sources cannot bypass local quality gates.
- Expanded Prettier format gates to include JSX, MTS, CTS, and CJS files so
  formatting coverage matches the source hygiene and secret scanning scope.
- Expanded ESLint coverage to include repository quality gate scripts, with
  shared JS/MJS globals for Node and Web API-based checks.
- Expanded ESLint coverage to include root config files so package, build, test,
  and lint configuration changes stay inside the local quality gate.
- Expanded ESLint TypeScript and script globs to include MTS, CTS, JSX, and CJS
  sources so lint coverage stays aligned with format, hygiene, and secret gates.
- Expanded Prettier, source hygiene, and secret scanning to include HTML files
  so runnable example entrypoints cannot bypass local quality gates.
- Expanded ESLint coverage to include the VitePress docs config and theme
  components, and fixed existing theme lint warnings.
- Expanded source hygiene scanning to include VitePress config and theme source
  while continuing to ignore generated VitePress cache and build output.
- Expanded source hygiene suppression checks to reject broad TypeScript, lint,
  formatter, and coverage suppressions in VitePress source.
- Aligned `production:readiness` direct Prettier and ESLint targets with the full
  local quality gate so release-candidate checks cannot drift to a narrower
  source scope.
- Strengthened workflow guardrail checks so CI and npm publish workflows must
  keep the dependency security audit step.
- Strengthened workflow guardrail checks so CI and npm publish workflows must
  install dependencies with `pnpm install --frozen-lockfile`.
- Strengthened workflow guardrail checks so npm publishing keeps the npm registry
  URL and current npm CLI setup required for provenance publishing.
- Strengthened workflow guardrail checks so Dependabot keeps root npm and GitHub
  Actions dependency updates enabled.
- Expanded Vitest and TypeScript test coverage to include `.test.tsx` files so
  React-facing TSX specs cannot bypass the standard test gate.
- Added regression coverage for the test hygiene script so focused, skipped, and
  todo test markers must keep failing the local gate.
- Expanded test hygiene checks to reject Vitest `skipIf` conditional skip
  markers.
- Expanded test hygiene checks to reject Vitest expected-failing test markers.

### Fixed

- Fixed Express agent route templates and executable fixtures so copied routes
  pipe `Readable.fromWeb(response.body)` through the real response stream.
- Updated Fastify and Express route fixture checks to exercise the documented
  response adapter paths instead of bypassing them with raw `Response` returns.

### Security

- Redacted sensitive headers from `inspectRequestTrace()` request, response, and
  timeline metadata snapshots while preserving non-sensitive header visibility
  for debugging.
- Redacted direct header-like secret fields such as `apiKey` and `Authorization`
  from inspection snapshots and generated curl bodies, including nested request
  bodies and event metadata.
- Redacted common credential fields such as `accessToken`, `clientSecret`,
  `password`, and `privateKey` from inspection snapshots and generated curl
  bodies without mutating the original request metadata.
- Redacted credential fields inside JSON-string request bodies before building
  inspection snapshots and generated curl commands.
- Clarified inspection, reference, and migration docs so support panels use
  redacted `inspection.*` snapshots instead of raw `lastRequest` /
  `lastResponse` trace refs.

## [0.14.2] - 2026-07-03

### Changed

- Updated publish tooling compatibility for this release by aligning workflow
  pnpm setup and package metadata checks to pnpm 11.7.0, matching
  `pnpm-lock.yaml` format `9.0`.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.14.1] - 2026-07-03

### Changed

- Added a daily release cadence gate so npm publishes are limited to one new
  version per Asia/Shanghai calendar day.
- Added `release:status`.
- Added production server storage recipes for tenant-scoped thread indexes,
  message bodies, restore smoke tests, and backend validation boundaries.
- Added an app-owned `ChatThreadStorageAdapter` contract and HTTP adapter recipe
  for production thread/message persistence.
- Added regenerate/branch production recipes for stored threads, idempotent
  `runId` handling, branch restore smoke tests, and audit-safe retries.
- Added regenerate/branch conflict contracts for stale `revision`,
  `branch_revision_conflict`, `run_in_progress`, and replayed `runId` handling.
- Added durable tool approval recipes for backend-owned approval records,
  idempotent execution, safe renderers, and human-in-the-loop audit trails.
- Tightened tool approval checks for replayed `runId`, stale `revision`, and
  `approval_revision_conflict`.
- Added backend agent bridge recipes for LangChain, LangGraph, and custom agent
  services that project browser-safe `AgentEvent` streams.
- Added a no-key threaded chat demo that pairs `useChatThreads()` with
  per-thread `useChat({ persist })` message storage.
- Added a threaded chat smoke check for published bundle thread indexes,
  per-thread message persistence, Date-safe restore, and archive/delete flows.
- Tightened the publish workflow release cadence check so already-published
  package versions fail before `npm publish`, while local readiness checks stay
  repeatable after a release.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Updated GitHub workflows to pnpm 11 to match `pnpm-lock.yaml` format
  version `9.0` used in this release.
- Updated GitHub Actions setup actions to Node 24-backed versions to avoid
  runner deprecation warnings in CI and release jobs.
- Added opt-in persistence load and clear error callbacks.
- Recorded chat persistence failures in `inspect().timeline`.
- Added `useChatThreads().persistenceError` for thread-index storage failures.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.14.0] - 2026-07-02

### Added

- Added `useChatThreads()` for local thread indexes with active thread
  selection, rename, archive, restore, delete, recency updates, and Date-safe
  persistence.
- Added `serializeChatThreads()`, `deserializeChatThreads()`,
  `serializeChatThreadsState()`, and `deserializeChatThreadsState()` for
  storing thread indexes outside `localStorage`.
- Added English and Chinese `useChatThreads` reference docs and navigation.

### Changed

- Expanded public API, dist, docs UX, and package checks for the new thread
  persistence exports.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.13.0] - 2026-07-02

### Added

- Added lightweight `AgentEvent` adapters for app-owned agent services:
  `agentEventToChatChunk()`, `agentEventToUIMessageStreamPart()`, and
  `readAgentEventStream()`.
- Added English and Chinese agent-event guides that show custom provider and
  proxy-route wiring for progress, tool, source, file, error, and finish events.

### Changed

- Expanded stream reference docs, task-oriented demo docs, README files, public
  API checks, and dist checks so agent-event adapters are documented and
  verified as public API.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.12.0] - 2026-07-02

### Added

- Added upstream proxy timeout and trace-header controls to
  `examples/proxy-server` through `PROXY_UPSTREAM_TIMEOUT_MS` and
  `PROXY_UPSTREAM_TRACE_HEADER`.
- Added sanitized upstream error responses with `code`, `traceId`,
  `upstreamStatus`, and `retryable` fields for OpenAI-compatible proxy routes.

### Changed

- Expanded proxy example checks to cover upstream trace propagation, timeout
  handling, retryable HTTP errors, and raw provider error redaction.
- Deepened English and Chinese proxy recipes for Ollama, vLLM, private
  OpenAI-compatible gateways, timeout, rate-limit, and observability boundaries.
- Updated README, environment examples, roadmap, and docs UX checks so the
  production proxy recipe is visible from npm and docs.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.11.0] - 2026-07-02

### Added

- Added a runnable no-key React chat quickstart at `examples/react-chat`,
  powered by `vue-ai-hooks/react` and `DirectChatTransport`, with streaming
  messages, abort controls, usage, stream data, and request trace state.

### Changed

- Added `pnpm example:react-chat` and `pnpm example:react-chat:build` to the
  local example workflow and full `examples:build` gate.
- Updated English and Chinese README, getting-started docs, example pages,
  task-oriented demo guides, React reference docs, roadmap, and docs UX checks
  so the React quickstart is discoverable as a real runnable demo.
- Repository lint, typecheck, and format scripts now include TSX example files.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.10.1] - 2026-07-02

### Added

- Added English and Chinese task-oriented demo guides that map product jobs to
  the Vue tool approval demo, React chat quickstart, app-owned `/api/chat`
  proxy, AI SDK UI stream migration path, and production readiness flow.
- Added English and Chinese production checklists covering browser boundaries,
  backend proxy responsibilities, streaming contracts, inspection, persistence,
  local gates, smoke tests, and the bug-only GitHub issue policy.

### Changed

- Linked the new task demo and production checklist pages from VitePress
  navigation, getting-started docs, README files, and docs UX checks.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.10.0] - 2026-07-02

### Added

- Expanded inspection helpers with `createInspectionCurl()`, timeline events,
  retry records, compact provider traces, opt-in redacted curl output, public
  types, tests, and English/Chinese docs.

### Changed

- Updated the roadmap and README project status so the production-hardening plan
  starts from the current `0.10.x` line instead of older already-shipped
  milestones.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.9.0] - 2026-07-02

### Added

- Added React `useObject` support through `vue-ai-hooks/react`, including JSON
  Schema response formats, partial object state, request traces, proxy fallback,
  retry-before-first-chunk behavior, form helpers, tests, and English/Chinese
  reference docs.

### Changed

- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.8.0] - 2026-07-02

### Added

- Added React `useCompletion` support through `vue-ai-hooks/react`, including
  provider/proxy streaming, request traces, retry-before-first-delta behavior,
  form helpers, tests, and English/Chinese reference docs.

### Changed

- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.7.1] - 2026-07-02

### Added

- Added opt-in OpenAI-compatible upstream forwarding to
  `examples/proxy-server` for chat, completion, and embedding routes while
  keeping no-key local demo behavior as the default.
- Added English and Chinese proxy recipe guides covering OpenAI-compatible
  gateways, Ollama, vLLM, custom endpoint paths, and production proxy checks.

### Changed

- Updated README, getting-started, Provider, SSR, VitePress navigation, docs UX
  checks, and proxy checks so production proxy onboarding stays visible and
  verified.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.7.0] - 2026-07-02

### Added

- Added first-class OpenAI-compatible provider presets for Kimi/Moonshot,
  Zhipu/BigModel/Z.ai, local Ollama, and vLLM, including public config types,
  dist checks, public API tests, and English/Chinese provider docs.
- Added docs UX guardrails so README, getting-started, and provider reference
  pages keep the provider preset onboarding path visible.

### Fixed

- Replaced regex-based trailing-slash trimming in `openaiCompatible` URL joining
  with a bounded character loop, resolving the CodeQL polynomial-regex alert
  surfaced by the new provider presets.

### Changed

- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.6.0] - 2026-07-02

### Added

- Added public `classifyInspectionError()` and `inspectRequestTrace()` helpers
  for render-safe request inspection snapshots that combine status, error,
  `lastRequest`, and `lastResponse` into one support-friendly shape.
- Added English and Chinese inspection helper docs, reference type docs, roadmap
  docs, public API checks, dist checks, and docs UX guardrails for the new
  inspection surface.

### Changed

- README roadmap links now use GitHub URLs so npm package README links stay
  valid without widening the published package file list.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.5.0] - 2026-07-01

### Added

- Added optional React chat support via `vue-ai-hooks/react`, including a React
  `useChat` hook, subpath package exports, docs, tests, and install checks while
  keeping the Vue root entry unchanged.

### Changed

- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.4.1] - 2026-07-01

### Changed

- Published the v0.4 upgrade guide, current-release README links, and
  docs UX guardrails so npm consumers see the same onboarding path as the
  repository docs.
- Clarified competitive positioning against AI SDK UI, CopilotKit,
  LangChain.js, and VueUse in the English and Chinese choosing guides.
- Release notes keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

## [0.4.0] - 2026-07-01

### Added

- Added a `Chat` instance class and `useChat({ chat })` support so Vue apps can
  share an AI SDK-style chat object across components while reusing the existing
  streaming, tool, persistence, and resume behavior.
- Added `useVideo` for app-owned video generation routes with normalized
  `video`/`videos` state, retries, aborts, trace refs, and form helpers.
- Added a runnable no-key `useVideo` example with deterministic local storyboard
  output and proxy `/api/video` route coverage.
- Added public AI SDK UI message stream utilities for custom transports:
  `createUIMessageStream`, `readUIMessageStream`,
  `createUIMessageStreamParser`, `toChatChunks`,
  `createUIMessageStreamResponse`, `pipeUIMessageStreamToResponse`,
  `formatSSEData`, and `parseSSE`.
- Added a no-key `/api/ui-message-stream` proxy-server route, docs example, and
  DemoShowcase block for exercising AI SDK UI message stream parts end to end.
- Added `DirectChatTransport` for in-process chat agents, no-key demos, tests,
  and AI SDK UI message stream handlers that do not need an HTTP proxy.
- Added `DirectChatTransport` `onError` support for sanitizing local UI-message
  stream failures.
- Added `DefaultChatTransport` as an AI SDK-style proxy transport class for
  lower-friction chat migrations.
- Added `DefaultChatTransport` `api` defaults and transport-level prepare hooks
  for closer AI SDK `DefaultChatTransport` migration compatibility.
- Added AI SDK-style `aiSdkTrigger` request metadata for chat send/regenerate
  preparation and lifecycle callbacks.
- Added `validateMessages()` for boolean validation of persisted or imported
  chat message payloads before hydration.
- Added `safeValidateMessages()`, `validateUIMessages()`, and
  `safeValidateUIMessages()` for schema-aware persisted chat validation.
- Added chat `streamProtocol: 'text'` support for app-owned proxy chat and
  resume endpoints that stream raw text.
- Added `convertToModelMessages({ convertDataPart })` for opt-in conversion of
  custom `data-*` UI parts into model-facing content.
- Added `convertToModelMessages({ ignoreIncompleteToolCalls })` for skipping
  pending or approval-gated tool calls that do not yet have tool results.
- Added `ToolDefinition.toModelOutput` and `convertToModelMessages({ tools })`
  for model-facing conversion of stored tool result messages.
- Added `stepCountIs()` as an AI SDK-compatible alias for `isStepCount()` tool
  loop stopping conditions.

### Changed

- Release notes now keep the active publishing contract visible:
  `prepublishOnly` now delegates to `release:check`.
- Coverage thresholds remain at least 98% statements, 90% branches, 96%
  functions, and 98% lines for this release.

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
- Added AI SDK-style `tool()`, `dynamicTool()`, and `jsonSchema()` helpers so
  `useChat({ tools })` can accept object-mapped tool definitions with co-located
  `execute` handlers.
- Added `convertToModelMessages()` for turning UI chat history into
  model-facing messages without render-only `Message.parts`.
- Added `ChatRequestMessage` and widened `ChatRequest.messages` so request
  preparers can return `ModelMessage[]` directly.
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
- Added `cosineSimilarity()` for comparing embedding vectors in semantic search
  and local reranking UIs.
- Added `generateId()` and `createIdGenerator()` for AI SDK-style ID generation
  and composable `generateId` overrides.
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
