---
title: Adoption and 1.0 readiness
description: Adoption loop, evidence targets, and 1.0 exit criteria after the 0.14.x production hardening work.
---

# Adoption and 1.0 readiness

Use this page after the production-readiness gates pass. The goal is to turn the
library from a hardened package into something external teams can adopt with
low support friction.

Record completed host-app runs in
[Adoption evidence](/guide/adoption-evidence). When the target is no longer a
throwaway host app, run the
[Existing app adoption smoke](/guide/existing-app-adoption-smoke) checklist
first.

## Current baseline

- `0.14.x` has release gates for format, source hygiene, tests, coverage, build,
  package install, docs, examples, proxy, image, threaded chat, tool approval,
  agent bridge, and route templates.
- Production docs cover provider-safe browser boundaries, app-owned proxy
  routes, durable thread storage, regenerate branches, tool approvals,
  inspection, and agent-event projection.
- The next risk is not missing infrastructure. The next risk is unclear first
  adoption: what a new app can finish in one sitting, where it gets stuck, and
  which APIs need a stability promise before `1.0`.

## Adoption loop

Run this loop with at least three real host apps before calling the API stable.

1. Start from a no-key demo and record time-to-first-chat.
2. Move the app behind its own `/api/chat` proxy and record the first proxy
   failure with `inspectRequestTrace()`.
3. Add one persisted thread flow with `useChatThreads()` and either server
   storage or IndexedDB.
4. Add one approval or agent bridge flow only when the host app already needs
   tools, interrupts, or backend agent events.
5. File only reproducible bugs in GitHub issues. Put friction notes, missing
   examples, and unclear docs in discussions, pull requests, or the
   [adoption evidence log](/guide/adoption-evidence).

Track these numbers for each app:

| Signal                | Target before `1.0`                                      |
| --------------------- | -------------------------------------------------------- |
| time-to-first-chat    | A new app sends a local or proxy chat message in < 15m   |
| proxy setup           | A production proxy smoke test passes without browser key |
| thread restore        | Reload restores the active thread and messages           |
| inspection usefulness | First failed request has a redacted trace attached       |
| support loop          | Reproductions arrive with demo, version, and trace       |
| install confidence    | `pnpm install`, docs build, and examples build pass      |

## 1.0 exit criteria

`1.0` should mean stable adoption, not maximum feature count.

- Public exports have a documented stability level and no accidental churn.
- Any breaking change has a migration note, deprecation window, or explicit
  pre-`1.0` exception in the changelog.
- The compatibility matrix covers Vue 3, Vite, Nuxt/Nitro, current Node LTS,
  and the supported React migration entry.
- At least one no-key demo covers each promoted product path: chat, proxy,
  threads, inspection, approvals, agent bridge, and media/object helpers.
- The docs explain browser-secret boundaries before showing provider examples.
- `pnpm production:readiness`, `pnpm links:check`, and `pnpm docs:build` pass on
  the release candidate.
- Support policy is clear: GitHub issues are for reproducible bugs; roadmap and
  adoption feedback stay in discussions, docs PRs, or `ROADMAP.md`.

## Do not chase

- A hosted backend service.
- Provider billing, quota, or account management.
- A full backend agent framework.
- React parity for every Vue composable.
- Vendor-specific observability integrations.

Those remain host-application responsibilities unless they become necessary for
safe composable contracts.
