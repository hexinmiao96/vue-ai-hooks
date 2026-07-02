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

## Planned Releases

### Shipped through 0.9.x

- Documented the `lastRequest`, `lastResponse`, and `clearTrace()` inspection
  workflow.
- Added public `inspectRequestTrace()` error classification helpers.
- Added provider presets and proxy recipes for Moonshot, Zhipu, Ollama, vLLM,
  and OpenAI-compatible gateways.
- Expanded the React entry to chat, completion, and object migration hooks.

### 0.10.x

- Upgrade inspection snapshots with request timeline events, retry records,
  compact provider traces, and opt-in redacted curl commands.
- Provide copyable debug-panel, task-demo, and production-checklist recipes that
  applications can adapt to their own design system and rollout process.
- Keep inspection output safe to render in browser UIs by default; applications
  still own tenant data and provider-specific observability.

### 0.11.x

- Shipped in 0.11.0: a runnable no-key React chat quickstart with
  `vue-ai-hooks/react`, `DirectChatTransport`, request trace state, and
  repository build coverage.
- Continue deepening task-oriented demo/docs flows with more runnable screens:
  own `/api/chat` proxy, AI SDK UI stream migration, and production deployment
  walkthroughs.
- Keep demos runnable without provider keys while making each demo explain the
  product job it covers.

### 0.12.x

- Shipped in 0.12.0: proxy-server upstream timeout controls, trace header
  propagation, sanitized retryable error responses, and checks that prevent raw
  upstream error bodies from leaking to browser clients.
- Shipped in 0.12.0: deeper Ollama, vLLM, and private OpenAI-compatible gateway
  recipes that mark rate limits, timeout budgets, and observability as
  host-application responsibilities.
- Continue adding production deployment walkthroughs only where they keep the
  browser contract provider-agnostic.

### 0.13.x

- Shipped in 0.13.0: lightweight `AgentEvent` adapters that convert app-owned
  agent progress, tool, source, file, error, and finish events into `ChatChunk`
  values or AI SDK UI message stream parts.
- Shipped in 0.13.0: English and Chinese agent-event guides for custom
  providers, proxy routes, tool approval timelines, data-part naming, and
  production boundaries.
- Continue adding production agent recipes only where they keep planning,
  retrieval, privileged tools, secrets, and tenant data in the host backend.

### 0.14.x

- Shipped in 0.14.0: `useChatThreads()` for local thread indexes, active thread
  selection, rename, archive, restore, delete, recency updates, and Date-safe
  thread persistence.
- Shipped in 0.14.0: thread serialization helpers for storing sidebar indexes
  outside `localStorage` while keeping message bodies in `useChat({ persist })`
  or server storage.
- Added after 0.14.0: a no-key threaded chat demo that verifies local thread
  indexes, per-thread message persistence, rename, archive, restore, delete,
  trace state, and independent message restore before real providers.
- Added after 0.14.0: an IndexedDB local durability recipe in server storage
  docs for async hydration, explicit save boundaries, and smoother no-server
  migration to backend storage.
- Continue exploring regenerate/branch patterns without embedding a backend
  database abstraction in the package.
- In progress after 0.14.0: production server storage and regenerate/branch
  recipes for tenant-scoped thread indexes, message bodies, restore smoke tests,
  idempotent `runId` handling, and concurrency boundaries.

### Later

- Expand React support toward shared stream helpers only where it improves
  migration confidence.
- Add production agent bridge recipes for services that need LangChain,
  LangGraph, durable approvals, workflow audit trails, human-in-the-loop
  timelines, idempotent tool execution, and safe approval renderer contracts.

## Non-goals

- Provider billing, quota policy, and rate limiting.
- Sandboxing privileged tools.
- Long-running agent planning or retrieval pipelines.
- Server-side secret storage.
- Vendor-specific observability backends.
