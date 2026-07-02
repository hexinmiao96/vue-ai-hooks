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

- Deepen task-oriented demo/docs flows with more runnable screens: React chat
  quickstart, own `/api/chat` proxy, AI SDK UI stream migration, and production
  deployment walkthroughs.
- Keep demos runnable without provider keys while making each demo explain the
  product job it covers.

### 0.12.x

- Add provider recipe depth for local model proxy patterns such as Ollama/vLLM
  and private OpenAI-compatible gateways.
- Document provider-specific rate-limit, timeout, and observability boundaries
  as host-application responsibilities.

### Later

- Expand React support toward shared stream helpers only where it improves
  migration confidence.
- Add agent-event adapter recipes for services that emit tool approval,
  progress, and human-in-the-loop events.

## Non-goals

- Provider billing, quota policy, and rate limiting.
- Sandboxing privileged tools.
- Long-running agent planning or retrieval pipelines.
- Server-side secret storage.
- Vendor-specific observability backends.
