---
title: Production readiness status
description: Current production-readiness coverage, evidence, and remaining release boundaries for vue-ai-hooks.
---

# Production readiness status

Use this page to check whether the current library direction matches the
production-hardening roadmap. It is an evidence map, not a feature wishlist.
GitHub issues remain reserved for reproducible bugs.

## Status matrix

| Area                    | Current status            | Evidence                                                                                                                                                               |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspection              | Ready for app adoption    | `inspect()`, `inspectRequestTrace()`, timeline, retry records, provider trace, redacted curl                                                                           |
| Task demos              | Ready for onboarding      | Vue chat/completion/object/embedding demos, agent run approval, React chat/completion/object/image/video demos, image edit, proxy, AI SDK stream, demo UX smoke checks |
| Provider presets        | Ready behind app proxies  | OpenAI-compatible, DeepSeek, OpenRouter, Gemini, Anthropic, Moonshot, Zhipu, Ollama, vLLM                                                                              |
| React support           | Migration bridge          | `vue-ai-hooks/react` exposes `useChat`, `useCompletion`, `useObject`, `useImage`, `useVideo`, `usePromptSuggestions`, and `useAgentRun`                                |
| Tool approval           | Ready as backend contract | Durable approval record, renderer contract, replayed `runId`, stale `revision` conflicts                                                                               |
| Threads and persistence | Ready as app-owned model  | `useChatThreads`, server storage recipe, IndexedDB recipe, regenerate branch contracts                                                                                 |
| Agent bridge            | Ready as projection layer | `AgentEvent`, LangChain/LangGraph recipes, route templates, interrupt/resume projection guardrails, AI SDK UI stream part conversion                                   |

## Required gates

Run the full local readiness gate before a release candidate:

```bash
pnpm production:readiness
```

If the package manager wrapper is blocked in your environment, run the local
Node entry:

```bash
node scripts/production-readiness-local.mjs
```

The gate covers format, secrets, source hygiene, lint, typecheck, test hygiene,
coverage, build, dist, size, pack, install, changelog, metadata, community
health, workflows, API docs, docs UX, proxy, image edit, demo UX,
competitive benchmark, threaded chat, UI message stream, agent run, tool approval,
agent bridge, agent route templates, markdown links, examples, and docs build.

## Release boundary

The published npm version may lag behind `main` when the daily release cadence
has already been used. In that case, treat `main` as the next release candidate
only after CI, CodeQL, OpenSSF Scorecard, and `pnpm production:readiness` pass.

Check the registry and release window without publishing:

```bash
pnpm release:status
```

Do not publish another npm version on the same Asia/Shanghai calendar day,
except when promoting same-version prerelease evidence such as `1.0.0-rc.2` to
the stable `1.0.0` release. The release cadence check is part of the local, CI,
and publish paths.

## Next adoption pass

After these gates pass, use
[Adoption and 1.0 readiness](/guide/adoption-readiness) to collect real host-app
evidence before declaring the public API stable.

## Remaining non-goals

- Do not store provider keys, vector store credentials, or privileged tool
  secrets in the browser.
- Do not turn this package into a backend agent framework.
- Do not add React hooks only for symmetry; keep React support focused on
  migration confidence.
- Do not track feature planning in GitHub issues. Use `ROADMAP.md`,
  discussions, or pull requests.
