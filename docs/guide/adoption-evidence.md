---
title: Adoption evidence
description: Recorded host-app adoption runs, smoke results, and friction found while preparing vue-ai-hooks for 1.0.
---

# Adoption evidence

Use this page as the evidence log for the
[Adoption and 1.0 readiness](/guide/adoption-readiness) loop. Add a new entry
when a real host app finishes the adoption smoke, or when it exposes a
reproducible blocker.

GitHub issues remain for reproducible bugs. Keep setup friction, timing notes,
and missing-doc feedback here, in discussions, or in docs pull requests.

## Run 1: clean Vite host app

| Field       | Value                                                        |
| ----------- | ------------------------------------------------------------ |
| Date        | 2026-07-05                                                   |
| Host app    | `/tmp/vue-ai-hooks-adoption-smoke-0.14.3-20260705`           |
| Package     | `vue-ai-hooks@0.14.3` from the npm registry                  |
| Stack       | Vue `3.5.22`, Vite `6.4.3`, TypeScript `5.8.3`               |
| Smoke tool  | Playwright `1.56.1` with Chromium headless                   |
| Package mgr | pnpm `11.7.0`                                                |
| Node        | Node `22.22.1`                                               |
| Result      | Passed after documenting host setup friction and smoke fixes |

### Covered paths

- No-key local chat through `DirectChatTransport`.
- App-owned `/api/chat` proxy with an SSE `chat-chunk` response.
- `useChatThreads()` local persistence with versioned `localStorage` key
  restore.
- Forced proxy `500` failure inspected through `inspect()`.
- Failure trace remained useful and did not expose the test header/body secrets.

### Commands

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm smoke
```

### Evidence

- `pnpm list vue-ai-hooks --depth 0` resolved `vue-ai-hooks@0.14.3`.
- `pnpm build` passed `vue-tsc` and Vite production build.
- `pnpm smoke` launched a local proxy, Vite host app, and browser automation.
- Browser smoke ended with `adoption smoke passed for vue-ai-hooks@0.14.3`.

### Friction found

- pnpm blocked the transient host app until `allowBuilds.esbuild: true` was set.
  This is host-project setup friction, not a `vue-ai-hooks` package failure.
- The persisted thread key includes the version suffix from `usePersist`
  (`adoption-smoke:threads:v1`). Docs and examples should continue showing the
  versioned key behavior clearly.
- `inspect()` on the forced proxy failure did not include raw custom proxy
  headers or custom body secrets in the snapshot. The acceptance check should be
  “no secret leakage plus actionable failure summary,” not “must contain a
  `[REDACTED]` marker.”

### Next adoption pass

Run the same smoke against a second host app that uses Nuxt/Nitro or a real app
backend proxy. Record time-to-first-chat, the first proxy failure, and whether
thread restore stays understandable without reading library source.
