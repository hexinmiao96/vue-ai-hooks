# SSR and Nuxt

`vue-ai-hooks` is framework-level Vue code, not a server framework. It can be
used in SSR-enabled apps, but model credentials, browser-only APIs, and streams
need clear ownership.

## Keep provider credentials server-side

Do not pass production provider keys from server code into browser code. Any
`VITE_*` value is public once it reaches the client bundle.

For SSR or Nuxt apps, prefer this shape:

- Browser components call your own API route or server handler.
- The server handler injects the upstream provider key.
- The browser receives only the response data or stream it needs.

Use the [provider guide](./providers.md) for provider setup details.

## Run composables in client-owned state

`useChat`, `useCompletion`, and `useEmbedding` manage Vue refs and user
interaction state. In SSR apps, create them inside components or composables that
run per request or per user session. Do not share composable state from module
scope across users.

If a component depends on browser-only APIs, mount it on the client or guard the
browser-specific code with your framework's client-only pattern.

## Persistence during SSR

`usePersist` uses `window.localStorage` only when it is available. During SSR,
`window.localStorage` is unavailable and persistence becomes a no-op unless you
pass an explicit `storage` implementation.

For server rendering:

- Use `storage: null` when persistence should be disabled.
- Pass an in-memory `Storage` shim in tests.
- Keep per-user persistence on the client unless you intentionally map it to a
  server-side session store.

See [`usePersist`](../reference/use-persist.md) for the exact options.

## Streaming through a backend

When proxying provider streams through your own backend or edge runtime:

- Preserve Server-Sent Events framing if the browser should receive incremental
  chunks.
- Disable buffering in serverless, CDN, or reverse-proxy layers when possible.
- Forward abort signals from the browser request to the upstream provider request
  when your runtime supports it.
- Return useful error responses for authentication, quota, invalid model, and
  provider outage failures.

## Testing SSR boundaries

Unit tests should use fake providers and explicit storage rather than real
provider calls or global `localStorage`. See the [testing guide](./testing.md)
for fake provider patterns.
