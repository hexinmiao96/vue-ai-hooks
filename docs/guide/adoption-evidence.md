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

## Run 2: Nuxt/Nitro host app

| Field       | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| Date        | 2026-07-05                                                         |
| Host app    | `/tmp/vue-ai-hooks-adoption-nuxt-smoke-0.14.3-20260705`            |
| Package     | `vue-ai-hooks@0.14.3` from the npm registry                        |
| Stack       | Nuxt `4.4.8`, Nitro `2.13.4`, Vite `7.3.6`, Vue `3.5.39`           |
| Smoke tool  | Playwright `1.56.1` with Chromium headless                         |
| Package mgr | pnpm `11.7.0`                                                      |
| Node        | Node `22.22.1`                                                     |
| Result      | Passed after documenting Nuxt-specific dependency setup and dev UX |

### Covered paths

- No-key local chat through `DirectChatTransport` inside a Nuxt 4 app.
- Nitro `server/api/chat.post.ts` route returning an SSE `chat-chunk` response
  to `proxyProvider({ chatUrl: '/api/chat' })`.
- `useChatThreads()` local persistence with versioned `localStorage` key
  restore in the Nuxt client.
- Nitro `server/api/fail.post.ts` forced `500` failure inspected through
  `inspect()`.
- Failure trace remained useful and did not expose the test header/body secrets.

### Commands

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm smoke
```

### Evidence

- `pnpm list vue-ai-hooks nuxt vue vue-router playwright --depth 0` resolved
  `vue-ai-hooks@0.14.3`, Nuxt `4.4.8`, Vue `3.5.39`, Vue Router `5.1.0`, and
  Playwright `1.56.1`.
- `pnpm build` passed Nuxt production build with Nitro `node-server` output.
- `pnpm smoke` launched Nuxt dev server and browser automation.
- Browser smoke ended with `nuxt adoption smoke passed for vue-ai-hooks@0.14.3`.

### Friction found

- pnpm blocked the transient Nuxt host app until `allowBuilds.esbuild: true` and
  `allowBuilds['@parcel/watcher']: true` were set. This is host-project setup
  friction.
- Nuxt dev initially discovered `vue-ai-hooks` at runtime and refreshed before
  the first click. Adding `vite.optimizeDeps.include: ['vue-ai-hooks']` made the
  browser smoke stable.
- The Nuxt/Nitro route shape stayed straightforward: `.post.ts` API route,
  `readBody(event)`, and an SSE `Response`.

## Run 3: business backend proxy host app

| Field       | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Date        | 2026-07-05                                                             |
| Host app    | `/tmp/vue-ai-hooks-adoption-business-proxy-smoke-0.14.3-20260705`      |
| Package     | `vue-ai-hooks@0.14.3` from the npm registry                            |
| Stack       | Vue `3.5.22`, Vite `6.4.3`, TypeScript `5.8.3`, Node HTTP business API |
| Smoke tool  | Playwright `1.56.1` with Chromium headless                             |
| Package mgr | pnpm `11.7.0`                                                          |
| Node        | Node `22.22.1`                                                         |
| Result      | Passed without new package-level friction                              |

### Covered paths

- App-owned business backend proxy at `/api/business/chat`.
- `proxyProvider()` with app session header, `x-tenant-id`, `x-run-id`, and a
  business context body.
- Backend audit route validating session token, tenant, and run id contract.
- `useChatThreads()` local persistence with versioned `localStorage` key
  restore.
- Forced business proxy `502` failure inspected through `inspect()`.
- Failure trace remained useful and did not expose the test session/body
  secrets.

### Commands

```bash
pnpm install
pnpm build
pnpm smoke
```

### Evidence

- `pnpm list vue-ai-hooks vue vite @vitejs/plugin-vue playwright --depth 0`
  resolved `vue-ai-hooks@0.14.3`, Vue `3.5.22`, Vite `6.4.3`,
  `@vitejs/plugin-vue@5.2.4`, and Playwright `1.56.1`.
- `pnpm build` passed `vue-tsc` and Vite production build.
- `pnpm smoke` launched the business proxy, Vite host app, and browser
  automation.
- Browser smoke ended with
  `business proxy adoption smoke passed for vue-ai-hooks@0.14.3`.

### Friction found

- No new `vue-ai-hooks` package friction appeared after the host workspace
  predeclared `allowBuilds.esbuild: true`.
- The business proxy integration stayed app-owned: session validation, tenant
  routing, run-id idempotency hints, trace ids, and upstream error shaping lived
  in the backend.
- The forced `502` failure produced an actionable trace summary without exposing
  the test session token or body secret.

### Next adoption pass

Run the same smoke inside an existing business application instead of a throwaway
host. Record time-to-first-chat, the first real proxy failure, and whether thread
restore stays understandable without reading library source.
