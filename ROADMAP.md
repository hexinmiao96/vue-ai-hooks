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
4. Grow the React entry from a chat migration bridge toward focused parity for
   completion, object output, and shared stream helpers.
5. Strengthen tool approval and agent-event adapter patterns without turning the
   package into a full agent framework.

## Planned Releases

### 0.5.x

- Document the current `lastRequest`, `lastResponse`, and `clearTrace()`
  inspection workflow.
- Add copyable troubleshooting recipes for proxy routes, stream buffering,
  provider failures, and tool approval failures.
- Keep examples runnable without provider keys and make each demo explain the
  product job it covers.

### 0.6.x

- Add a first-class inspection surface for request timeline events, retry
  attempts, response metadata, stream chunks, and sanitized error categories.
- Provide a small debug-panel recipe that applications can copy into their own
  design system.
- Keep all inspection output safe to show in a browser UI by default.

### 0.7.x

- Expand provider presets and proxy recipes for common OpenAI-compatible
  providers such as Moonshot, Zhipu, Ollama, vLLM, and private gateways.
- Document provider-specific rate-limit, timeout, and observability boundaries
  as host-application responsibilities.

### 0.8.x

- Expand React support beyond the existing chat and completion hooks toward
  object output and shared stream helpers.
- Add agent-event adapter recipes for services that emit tool approval,
  progress, and human-in-the-loop events.

## Non-goals

- Provider billing, quota policy, and rate limiting.
- Sandboxing privileged tools.
- Long-running agent planning or retrieval pipelines.
- Server-side secret storage.
- Vendor-specific observability backends.
