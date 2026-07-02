---
title: Production checklist
description: A practical checklist for shipping vue-ai-hooks through app-owned backend routes.
---

# Production checklist

Use this checklist before a browser app sends real user traffic through
`vue-ai-hooks`. The package owns the UI lifecycle and sanitized request
inspection. Your app still owns authentication, quota, provider credentials,
storage, and operations.

## Browser boundary

- Do not put production provider keys in `VITE_*` variables.
- Send browser requests to app-owned routes such as `/api/chat`,
  `/api/completion`, `/api/object`, or `/api/ai/chat`.
- Set `credentials: 'include'` only when your route expects cookies and CSRF
  protections are in place.
- Keep tenant ids, trace ids, and feature flags in app-owned metadata. Do not
  return provider authorization headers to the browser.

## Backend proxy

- Validate session, tenant, model access, and quota before forwarding.
- Read provider keys from server-only environment variables.
- Normalize upstream errors into user-safe messages.
- Forward abort signals to the provider when your runtime supports it.
- Disable buffering in serverless, CDN, and reverse-proxy layers for SSE routes.
- Add provider-specific timeout and retry policy at the backend boundary.
- Follow the [agent bridge recipe](/guide/agent-bridge) when `/api/chat` talks
  to LangChain, LangGraph, or a custom agent service instead of a direct model
  provider.
- Keep agent checkpoints, retrieved documents, vector store credentials,
  LangSmith keys, and privileged tool state on the server.

## Streaming contract

- Verify `/api/chat` returns either `ChatChunk` SSE or AI SDK UI stream parts.
- Verify `/api/completion` returns completion SSE or text chunks.
- Verify `/api/object` can return chat chunks or `text/plain` JSON streams.
- Keep media routes app-owned: `/api/image`, `/api/video`, `/api/speech`,
  `/api/transcription`, and `/api/rerank`.
- Test aborts, disconnects, and retry-before-first-chunk behavior.

## Tools and approvals

- Follow the [tool approval recipe](/guide/tool-approvals) before exposing
  privileged tools for billing, account changes, data access, or infrastructure.
- Store approval records outside message JSON with `approvalId`, `toolCallId`,
  `runId`, reviewer, decision, redacted arguments, trace id, and policy version.
- Treat approve and reject routes as backend-owned operations. The browser can
  render a request, but it must not become the authority for privileged tools.
- Make approval execution idempotent so repeated requests with the same `runId`
  cannot execute a tool twice.
- Reject stale approval `revision` values with `approval_revision_conflict`
  before any tool execution begins.
- Render only whitelisted, redacted fields in approval UI. Never show raw tool
  arguments, provider credentials, stack traces, or upstream error bodies.

## UI state and inspection

- Render `status`, `isLoading`, `error`, and `stop()` states in the UI.
- Keep failed input available so users can edit and retry.
- Add an internal debug panel around `inspectRequestTrace()`.
- Show `summary`, `timeline`, `retries`, `providerTrace`, and redacted `curl`
  only to trusted support or developer surfaces.
- Include `useChat({ persist })` load, save, and clear failures in the same
  timeline before asking users to reset local history.
- Never render raw provider response bodies or authorization headers.

## Persistence and threads

- Use `persist` for local-only chat history.
- If you use IndexedDB instead of server storage in a product stage, keep restore
  asynchronous (before chat UI renders) and persist only on explicit boundaries
  (`onFinish`, rename, archive, delete).
- Use `serializeMessages()` and `deserializeMessages()` for server storage.
- Follow the [server storage recipe](/guide/server-storage) when chats need
  multi-device history, team handoff, or audit retention.
- Follow the [regenerate branches recipe](/guide/regenerate-branches) before
  exposing retry, compare-answer, or branch-from-message UI.
- Validate imported history with `validateMessages()` or
  `safeValidateMessages()` before hydration.
- Version persisted data when changing message shape.
- Decide whether thread rename, archive, delete, and branch/regenerate behavior
  live in your app backend before exposing them in UI. Do not overwrite old
  assistant messages when regenerating.

## Local gates

Run one command before a release candidate:

```bash
pnpm production:readiness
```

If your environment blocks `pnpm` wrapper execution, run:

```bash
pnpm production:readiness:local

# or

node scripts/production-readiness-local.mjs
```

Equivalent long form (full local gate, without security audit):

```bash
pnpm check
pnpm release:cadence
pnpm format:check && pnpm secrets:check && pnpm source:hygiene && pnpm lint && pnpm typecheck:all && pnpm test:hygiene && pnpm test:coverage && pnpm build && pnpm dist:check && pnpm size:check && pnpm pack:check && pnpm install:check && pnpm changelog:check && pnpm metadata:check && pnpm community:check && pnpm workflows:check && pnpm api:check && pnpm docs:ux:check && pnpm proxy:check && pnpm threaded-chat:check && pnpm ui-message-stream:check && pnpm tool-approval:check && pnpm agent-bridge:check && pnpm links:check && pnpm examples:build && pnpm docs:build
```

If you need the strictest publish path, run `pnpm release:check` (adds
`pnpm security:audit` in front).

For proxy changes, also run:

```bash
pnpm example:proxy-server
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

## Production smoke test

1. Run the no-key chat approval demo.
2. Run the deterministic proxy template.
3. Connect one real upstream through server-only env vars.
4. Send a chat request, abort it, then retry.
5. Trigger one provider error and confirm the UI keeps input editable.
6. Capture an `inspectRequestTrace()` snapshot and confirm secrets are absent.
7. Run `pnpm threaded-chat:check` and confirm local thread indexes and
   per-thread message stores restore independently.
8. Reload one server-stored thread and confirm messages restore with `Date`
   values intact.
9. Regenerate one assistant message, branch from the same user turn, reload, and
   confirm both branches restore without duplicate `runId` writes.
10. Send a stale branch `revision` and confirm `branch_revision_conflict`; start
    a second regenerate while one is streaming and confirm `run_in_progress` or
    same-`runId` resume behavior.
11. Approve and reject one privileged tool request, then confirm duplicate
    `runId` submissions do not execute the tool twice and stale approval
    `revision` values return `approval_revision_conflict`.
12. Confirm logs have trace ids but no provider API keys.

## Issue policy

GitHub issues should contain reproducible bugs only. Use pull requests,
discussions, or `ROADMAP.md` for feature planning and production rollout ideas.
