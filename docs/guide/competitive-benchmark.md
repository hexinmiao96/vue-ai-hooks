# Competitive benchmark checkpoint

This page is not a ranking scoreboard. It records where `vue-ai-hooks` should be
strictly stronger for this project and where it should stay intentionally smaller.

## Positioning contract

For this repository:

- **AI SDK UI** is the direct parity target for API-shape comparison and migration.
- **CopilotKit** is the adjacent product to watch for UX patterns and AG-UI-style agent flows.
- **LangChain.js** is mostly a backend orchestration layer, not a direct frontend competitor.
- **VueUse** is a general Vue utility benchmark, not an AI protocol baseline.

## What "catch up" means here

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

## Competitive gaps to fix next (ordered by product impact)

1. **Observability parity**: keep `inspectRequestTrace`, `inspect()`, and stream event
   contracts first-class in every route template and demo so parity work is testable without proprietary backend code.
2. **Route template validation depth**: keep expanding framework-specific smoke
   fixtures around copyable templates without adding those frameworks as dependencies.
   Current coverage includes Nuxt/Nitro, Next.js, Hono, Express, Fastify, Cloudflare, Fetch, and LangGraph resume shapes.
3. **Prompt startup rollout depth**: continue adding surface-filtered prompt-suggestion
   recipes only where a demo or product surface has a real task-starting need.

## 30-day acceptance gates

Do not close a competitor task unless it maps to one of these gates and its proof command passes.

| Gate          | Target                                                                                    | Proof command                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| COMP-OBS      | Route templates and task demos expose safe trace, timeline, retry, and redacted curl data | `pnpm demo-ux:check`, `pnpm completion-object:check`, `pnpm image:check`, `pnpm agent-route-templates:check` |
| COMP-ROUTES   | Copyable backend templates reject bad payloads and preserve run/trace metadata            | `pnpm agent-route-templates:check`                                                                           |
| COMP-STARTERS | Shell-ready task starters stay surface-filtered and free of provider secrets              | `pnpm threaded-chat:check`, `pnpm competitive-benchmark:check`                                               |

## Current execution score (snapshot: 2026-07-04)

- In-scope direct benchmark score: **8 / 8** (AI SDK UI migration parity,
  observable contracts, and shell-ready starter coverage).
  - ✅ Vue-native composition API
  - ✅ Streaming + abort/retry
  - ✅ Proxy-first production path
  - ✅ Tool calling + approval workflows
  - ✅ Thread-side primitives
  - ✅ Agent runtime adapters
  - ✅ Runtime capability discovery
  - ✅ Message/task suggestion starters
- Deliberate non-goal: full copilot shell widgets stay in the app or in products
  such as CopilotKit; `threaded-chat` is a copyable starter, not a packaged shell.
- Next 30-day target: close the observability gap in all route templates and
  demos, then expand route template fixtures for copy-safe backend integration.
- Evidence source:
  - `docs/guide/production-readiness-status.md`
  - `CHANGELOG.md` entries in 0.14.x
  - `pnpm production:readiness` and `pnpm release:check`

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
