---
title: Existing app adoption smoke
description: Field checklist for running vue-ai-hooks adoption smoke inside a real business application.
---

# Existing app adoption smoke

Use this checklist after the throwaway host-app runs in
[Adoption evidence](/guide/adoption-evidence). The goal is to prove that
`vue-ai-hooks` still feels understandable inside an application that already has
auth, tenant routing, backend proxy rules, build constraints, and product UI.

## Success criteria

- No provider API key or provider secret is stored in browser code.
- A developer sends the first local or proxy chat message in less than 15
  minutes from a clean branch.
- The app-owned proxy receives app session context, tenant context, and a run
  id without changing the library.
- A forced backend failure is visible through `inspect()` or
  `inspectRequestTrace()` and does not expose the session token, provider key,
  or business body secrets.
- Reload restores the active thread and visible message state without reading
  library source.
- The result is appended to [Adoption evidence](/guide/adoption-evidence) with
  commands, timings, and friction.

## Pick the target app

Choose an existing app only when all of these are true:

- The app is Vue 3, Nuxt, or has a Vue 3 surface where a temporary route can be
  added.
- The app can run locally with its normal package manager and build command.
- A backend route can safely proxy a test request without real user data.
- The branch can be discarded or the smoke page can stay behind a development
  flag.

Do not run this smoke in a production checkout or with production secrets. Use
a temporary branch, a test account, and a test tenant.

## Record the baseline

Capture these facts before editing:

| Field       | What to record                                       |
| ----------- | ---------------------------------------------------- |
| Host app    | Local path, repo, branch, and dirty worktree state   |
| Package     | Installed `vue-ai-hooks` version and source          |
| Stack       | Vue/Nuxt/Vite versions and backend runtime           |
| Package mgr | pnpm, npm, or yarn version and install command       |
| Commands    | Install, typecheck, build, dev, and smoke commands   |
| Timebox     | Start time and time-to-first-chat                    |
| Proxy       | Route path, auth context, tenant context, failure id |
| Threads     | Storage key, active-thread restore result            |

## Add a temporary smoke surface

Prefer a small development-only route or debug panel. Keep the composable state
minimal and let the app backend own auth, provider credentials, tenant policy,
trace ids, and upstream error shaping.

```vue
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { proxyProvider, useChat, useChatThreads } from 'vue-ai-hooks'

const tenantId = 'adoption-smoke'
const runId = shallowRef(`adoption-${Date.now()}`)
const threads = useChatThreads({
  persist: { key: 'adoption-smoke:threads', version: 1 }
})

const activeThread = threads.activeThread.value ?? threads.createThread({ title: 'Adoption smoke' })

const { append, inspect, isLoading, messages } = useChat({
  id: activeThread.id,
  threadId: activeThread.id,
  provider: proxyProvider({
    chatUrl: '/api/adoption-smoke/chat',
    headers: () => ({
      'x-tenant-id': tenantId,
      'x-run-id': runId.value
    }),
    body: () => ({
      adoptionSmoke: true,
      tenantId,
      runId: runId.value
    })
  }),
  persist: { key: `adoption-smoke:messages:${activeThread.id}`, version: 1 }
})

const inspection = computed(() => inspect())

async function runSmoke() {
  await append('Reply with adoption-smoke-ok.')
  threads.touchThread(activeThread.id, {
    lastMessagePreview: 'adoption-smoke-ok',
    messageCount: messages.value.length
  })
}
</script>

<template>
  <section>
    <button :disabled="isLoading" @click="runSmoke">Run adoption smoke</button>
    <pre data-testid="adoption-inspection">{{ inspection }}</pre>
  </section>
</template>
```

If the app already has a chat view, wire the smoke into that existing view
instead of adding another screen. Keep the acceptance check the same.

## Backend proxy contract

The backend route should prove that the library can sit behind normal business
controls:

1. Validate the app session or test token.
2. Validate tenant and run-id headers.
3. Add the provider key only on the server.
4. Forward a streaming response that the app already supports, or return a
   simple SSE `chat-chunk` stream for the smoke.
5. Add one deterministic failure mode, such as `?forceFailure=502`, so the
   browser can capture a redacted trace.

Keep raw provider errors, request bodies with secrets, and business policy
details on the server. The browser should only receive the shaped error summary
that product support can safely attach to a bug report.

## Browser smoke

Use the app's existing browser test runner when it has one. Otherwise run a
short Playwright smoke:

1. Open the temporary smoke route.
2. Trigger the smoke message.
3. Assert the assistant reply includes `adoption-smoke-ok`.
4. Reload and assert the active thread and message count are still visible.
5. Trigger the deterministic proxy failure.
6. Assert the inspection output includes the failure status and trace id.
7. Assert the inspection output does not include the test session token,
   provider key, or body secret.

## Evidence template

Append a result to [Adoption evidence](/guide/adoption-evidence) when the smoke
passes or reveals a reproducible blocker:

````md
## Run N: existing business app - <app name>

| Field       | Value                                    |
| ----------- | ---------------------------------------- |
| Date        | YYYY-MM-DD                               |
| Host app    | <repo/path/branch>                       |
| Package     | vue-ai-hooks@<version>                   |
| Stack       | Vue/Nuxt/Vite/backend versions           |
| Smoke tool  | Playwright, Cypress, or manual script    |
| Package mgr | pnpm/npm/yarn <version>                  |
| Node        | Node <version>                           |
| Result      | Passed, blocked, or passed with friction |

### Covered paths

- No browser provider key.
- App-owned proxy path.
- Thread restore path.
- Forced failure trace path.

### Commands

```bash
<install command>
<build command>
<smoke command>
```

### Evidence

- time-to-first-chat: <duration>
- First real proxy failure: <status/summary>
- Thread restore: <result>

### Friction found

- <setup, docs, type, proxy, or runtime friction>
````
