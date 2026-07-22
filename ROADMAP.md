# Roadmap

This roadmap tracks feature direction. GitHub issues are reserved for
reproducible bugs; use discussions, pull requests, or this file for feature
planning.

## Priorities

1. Improve inspection and debugging so production apps can explain request
   failures without exposing provider credentials.
2. Make docs and demos easier to follow by product task, not only by API name.
3. Add provider presets and production proxy recipes for common OpenAI-compatible
   services while keeping browser keys out of production apps.
4. Grow the React entry from chat/completion/object migration hooks toward
   focused parity for the most common remaining hooks.
5. Strengthen tool approval and agent-event adapter patterns without turning the
   package into a full agent framework.
6. Use AI SDK UI as the direct parity target. Track CopilotKit and AG-UI only
   for headless agent UX contracts that fit this package's composable layer.

## Shipped through 1.0

- Vue-first chat, completion, structured output, media, embedding, rerank, and
  provider composables with strict TypeScript contracts.
- Production proxy recipes, resumable chat primitives, thread persistence,
  replay-safe tool approvals, agent event adapters, and safe inspection traces.
- No-key demos, route templates, bilingual documentation, package validation,
  and external Vue application smoke gates.

## Planned Releases

### 1.1 - Durable chat contract

- Distinguish a resumable client disconnect from an explicit request to cancel
  the active upstream run without owning the host application's job system.
- Define `activeStreamId` / `runId` guardrails for expiry, stale cancel requests,
  partial assistant snapshots, and concurrent browser tabs.
- Add a no-key browser fixture and `durable-chat:check` for refresh, reconnect,
  explicit cancel, stream expiry, stale-run races, and duplicate-output prevention.
- Keep public API additions conditional on evidence from at least two host
  adapters; prefer route contracts and recipes when a core abstraction is unnecessary.

### 1.2 - Headless agent protocol projection

- Extend the lightweight event projection with typed state snapshot/delta,
  streamed tool output, reasoning summaries, steering input, and parent/child run
  lifecycle only where those events remain framework-neutral.
- Preserve event ordering, replay safety, redaction, and equivalent Vue/React
  projections through `agent-protocol:check` fixtures.
- Describe compatibility as a tested AG-UI-style subset; do not claim full
  protocol compatibility without upstream conformance evidence.
- Keep generative UI app-owned through typed renderer recipes rather than a
  packaged component shell.

### 1.3 - Adoption proof

- Complete chat, production proxy, persistence, recovery, and inspection in one
  existing business application, not only a temporary or template host.
- Record first-local-message and production-proxy setup checkpoints, with targets
  of 10 and 30 minutes respectively.
- Require a versioned adoption record with commands, timings, friction, failure
  diagnosis, and browser smoke result before making a comparative leadership claim.
- Keep the pinned OSS adoption smoke as a regression gate, not a substitute for
  existing-business adoption evidence.

## Non-goals

- Provider billing, quota policy, and rate limiting.
- Sandboxing privileged tools.
- Long-running agent planning or retrieval pipelines.
- Server-side secret storage.
- Vendor-specific observability backends.
