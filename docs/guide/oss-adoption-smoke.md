---
title: OSS adoption smoke
description: CI-level adoption smoke against a pinned external Vue 3 admin project.
---

# OSS adoption smoke

Use this smoke to prove that the package can be installed into a real external
Vue 3 application, not only a purpose-built demo host.

The current target is
[un-pany/v3-admin-vite](https://github.com/un-pany/v3-admin-vite), pinned to
commit `273065d2860a3acc5724cfdbdf36927da1dc9080`. It is a useful adoption
target because it combines Vue 3, Vite, TypeScript, Vue Router, Pinia, Element
Plus, project-level route guards, Vite proxy rules, and a normal admin-app
layout.

## Command

Run the package build first, then run the adoption smoke:

```bash
pnpm build
pnpm oss-adoption:check
```

The script creates a temporary checkout, downloads the pinned upstream archive,
packs the current local `vue-ai-hooks` package, installs that tarball into the
external app, adds a hidden validation route, and runs the app's production
build plus a browser smoke.

Set `OSS_ADOPTION_KEEP_TEMP=true` when debugging the generated host app:

```bash
OSS_ADOPTION_KEEP_TEMP=true pnpm oss-adoption:check
```

## Covered paths

- Installs the current local package tarball into an external app.
- Builds the external Vite app with `vue-tsc` and production Vite output.
- Adds a hidden `/vue-ai-hooks-validation` route behind the app's normal router.
- Runs local no-key chat through `DirectChatTransport`.
- Runs app-owned proxy chat through `/api/validation/chat`.
- Persists and restores `useChatThreads()` state after reload.
- Forces a `502` app proxy failure through `/api/validation/fail`.
- Asserts the failure trace is actionable and does not expose the test session
  token or body secret.

## CI placement

This check is intentionally separate from the main matrix. The CI matrix already
validates library behavior across supported Node versions; the OSS adoption
smoke validates integration with one pinned external app and should run once on
the current primary Node version.

Keep the target pinned. Move the pin only when reviewing a deliberate adoption
target refresh, and record the new run in
[Adoption evidence](/guide/adoption-evidence).

## Failure handling

Treat failures as adoption evidence:

- If the external app cannot be downloaded, retry to separate a network outage
  from a package problem.
- If install fails on pnpm build-script approval, update only the generated
  host app allowlist and record the friction.
- If the app build fails before `vue-ai-hooks` code is reached, confirm whether
  the pinned upstream commit changed or the package manager behavior changed.
- If the browser smoke fails, keep the temp app and inspect the generated route,
  proxy server, and `inspect()` output.
