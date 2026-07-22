# Competitive benchmark v2

This page is not a feature-count ranking. It defines measurable outcomes that show
where `vue-ai-hooks` should be stronger and where it should stay intentionally smaller.

## Positioning contract

For this repository:

- **AI SDK UI** is the direct parity target for API-shape comparison and migration.
- **CopilotKit** is the adjacent product to watch for UX patterns and AG-UI-style agent flows.
- **LangChain.js** is mostly a backend orchestration layer, not a direct frontend competitor.
- **VueUse** is a general Vue utility benchmark, not an AI protocol baseline.

## What "winning" means here

Winning this benchmark means:

1. Vue-first composable ergonomics without forcing full app-level AI SDK decisions.
2. Production-safe defaults (`proxy`, inspectable traces, thread persistence, approvals).
3. Better compatibility for existing Vue apps with a smaller API surface than full
   front-end shells.
4. Explicit boundaries: keep orchestration/retrieval/plans in backend frameworks where
   they already belong.

## Current checkpoint against direct alternatives

| Capability                                      | AI SDK UI     | CopilotKit | LangChain.js | VueUse | vue-ai-hooks                             |
| ----------------------------------------------- | ------------- | ---------- | ------------ | ------ | ---------------------------------------- |
| Vue-native composition API                      | ✅            | ⚪         | ⚪           | ✅     | ✅                                       |
| Streaming states + Abort/Retry                  | ✅            | ⚪         | ⚪           | ⚪     | ✅                                       |
| Proxy-first production path                     | ✅            | ✅         | ⚪           | ⚪     | ✅                                       |
| Tool calling + approval workflows               | ✅            | ✅         | ⚪           | ⚪     | ✅ (local + thread-safe)                 |
| Thread side panel primitives                    | ⚪            | ✅         | ⚪           | ⚪     | ✅                                       |
| Agent runtime adapters                          | ✅ (protocol) | ✅         | ✅ (backend) | ⚪     | ✅ (events + run demo + route templates) |
| Headless agent runtime discovery & capabilities | ⚪            | ⚪         | ⚪           | ⚪     | ✅                                       |
| Message/task suggestion starters                | ⚪            | ✅         | ⚪           | ✅     | ✅ (surface-filtered recipes)            |
| Full copilot shell / built-in widgets           | ✅            | ✅         | ⚪           | ⚪     | ⚪ (starter only; shell stays app-owned) |
| Retrieval/long-running planning runtime         | ⚪            | ⚪         | ✅           | ⚪     | ⚪ (app/backend scope)                   |

## Outcome benchmark

Feature coverage is supporting evidence, not the score. A competitive claim is complete only
when the relevant outcome below is measured in a repeatable fixture or an existing host app.

| Dimension     | Current baseline                                                                 | Next target                                                                                             | Required evidence                                                        |
| ------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| DX            | No-key starters and a documented 15-minute first-chat target                     | First local message within 10 minutes and production proxy setup within 30 minutes                      | Timed clean-host run with install, first message, and proxy checkpoints  |
| Durability    | `resumeStream()`, thread persistence, replay-safe run ids, and client-side abort | Refresh/network recovery without duplicate output; explicit cancel stops the active upstream run once   | Browser smoke for refresh, reconnect, stale cancel, expiry, and two tabs |
| Agent UX      | Messages, progress, tools, files, sources, interrupts, and finish events         | Typed state snapshot/delta, streamed tool output, steering, reasoning summary, and child-run projection | Event fixtures for ordering, replay, redaction, and Vue/React parity     |
| Observability | Safe trace, timeline, retries, provider metadata, and redacted curl              | First failed proxy request diagnosable from one safe inspection snapshot                                | Failure fixture plus a host-app diagnosis record                         |
| Adoption      | Clean Vite, Nuxt, business-proxy, and pinned OSS smoke evidence                  | One existing business application completes chat, proxy, persistence, recovery, and inspection          | Versioned host record with commands, timings, friction, and result       |

## Delivery gates

Do not close a competitor task unless it maps to one of these gates and its proof command passes.

| Gate          | Target                                                                                             | Proof command                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| COMP-DX       | Timed clean-host checkpoints prove first-message and proxy setup targets                           | `pnpm oss-adoption:check`, `pnpm competitive-benchmark:check`                                                |
| COMP-DURABLE  | Refresh, reconnect, expiry, explicit cancel, and stale-run races are reproducible                  | Planned for 1.1: `pnpm durable-chat:check`                                                                   |
| COMP-AGENT    | Headless agent events preserve ordering, replay safety, redaction, and framework projection        | Planned for 1.2: `pnpm agent-protocol:check`                                                                 |
| COMP-OBS      | Route templates and task demos expose safe trace, timeline, retry, and redacted curl data          | `pnpm demo-ux:check`, `pnpm completion-object:check`, `pnpm image:check`, `pnpm agent-route-templates:check` |
| COMP-ADOPTION | An existing business app completes the production path without storing provider secrets in browser | `pnpm oss-adoption:check` plus a versioned record in `docs/guide/adoption-evidence.md`                       |

## P0 baseline (snapshot: 2026-07-22)

- The former **8 / 8** coverage inventory is retained above, but it is no longer
  presented as a competitive score.
- DX and adoption have repeatable smoke infrastructure, but not all target timings
  have measured evidence.
- Durable chat has client resume primitives, but not the full explicit-cancel,
  expiry, stale-run, and multi-tab fixture required by `COMP-DURABLE`.
- Agent adapters do not yet cover the complete `COMP-AGENT` event set.
- Deliberate non-goal: full copilot shell widgets stay in the app or in products
  such as CopilotKit; `threaded-chat` is a copyable starter, not a packaged shell.
- Next milestone: deliver `COMP-DURABLE` in 1.1 before widening the public agent event surface.

## Why this is still consistent with the objective

Our objective is to be the strongest Vue-first, production-usable, headless AI
interaction layer for app teams, with a shell-ready starter path that keeps
runtime boundaries explicit.
That means:

- Win where `vue-ai-hooks` is directly in scope.
- Keep adjacent stack advantages inside other layers when better handled elsewhere.
- Track competitors continuously to avoid drifting out of our lane.

Use this checklist at each roadmap review; any "competitor" task should only be accepted
if it improves one row above without expanding this package into a full backend framework.
