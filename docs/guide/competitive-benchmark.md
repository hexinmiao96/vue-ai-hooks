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

| Capability                                      | AI SDK UI     | CopilotKit | LangChain.js | VueUse | vue-ai-hooks               |
| ----------------------------------------------- | ------------- | ---------- | ------------ | ------ | -------------------------- |
| Vue-native composition API                      | ✅            | ⚪         | ⚪           | ✅     | ✅                         |
| Streaming states + Abort/Retry                  | ✅            | ⚪         | ⚪           | ⚪     | ✅                         |
| Proxy-first production path                     | ✅            | ✅         | ⚪           | ⚪     | ✅                         |
| Tool calling + approval workflows               | ✅            | ✅         | ⚪           | ⚪     | ✅ (local + thread-safe)   |
| Thread side panel primitives                    | ⚪            | ✅         | ⚪           | ⚪     | ✅                         |
| Agent runtime adapters                          | ✅ (protocol) | ✅         | ✅ (backend) | ⚪     | ✅ (hosted event adapters) |
| Headless agent runtime discovery & capabilities | ⚪            | ⚪         | ⚪           | ⚪     | ✅                         |
| Message/task suggestion starters                | ⚪            | ✅         | ⚪           | ✅     | ✅                         |
| Full copilot shell / built-in widgets           | ⚪            | ✅         | ⚪           | ⚪     | ⚪ (intentional)           |
| Retrieval/long-running planning runtime         | ⚪            | ⚪         | ✅           | ⚪     | ⚪ (app/backend scope)     |

## Competitive gaps to fix next (ordered by product impact)

1. **Agent UX consistency**: continue hardening `useAgentRun`, adapter event
   mapping, and replay safety under interruption/retry.
2. **Prompt startup accelerators**: ship first-class, reusable prompt-suggestion
   recipes for task starters.
3. **Observability parity**: keep `inspectRequestTrace` and stream event contracts first-class
   in all demos so parity work is testable without proprietary backend code.

## Why this is still consistent with the objective

Our objective is not to become a full agent shell. It is to be the strongest
Vue-first, production-usable, headless AI interaction layer for app teams.
That means:

- Win where `vue-ai-hooks` is directly in scope.
- Keep adjacent stack advantages inside other layers when better handled elsewhere.
- Track competitors continuously to avoid drifting out of our lane.

Use this checklist at each roadmap review; any "competitor" task should only be accepted
if it improves one row above without expanding this package into a full backend framework.
