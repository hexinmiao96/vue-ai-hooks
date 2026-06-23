# Troubleshooting

This page covers the most common integration failures before opening an issue.
If the problem still reproduces, include the details from the final section in
your report.

## Browser API keys are visible

Any `VITE_*` value is bundled into browser code. This is expected behavior in
Vite, not a `vue-ai-hooks` bug.

Use browser keys only for local demos, prototypes, or provider keys that are
restricted by origin, quota, and model scope. Production apps should send model
requests through a backend or edge proxy and keep provider credentials
server-side.

## CORS or provider request fails in the browser

Many AI providers do not allow direct browser requests to their REST APIs. If you
see a CORS error, network failure, or blocked preflight request:

- Move provider calls behind your own backend or edge function.
- Keep the provider key server-side.
- Forward only the request fields your app actually needs.
- Return the provider stream to the browser as Server-Sent Events when streaming
  is required.

## Streaming response does not update

Streaming requires `fetch`, `AbortController`, `ReadableStream`, and
Server-Sent Events support. If the UI waits until the whole response finishes:

- Confirm the provider endpoint actually returns an SSE stream.
- Check that proxies, serverless functions, or CDNs are not buffering the
  response.
- Avoid transforming the stream into JSON before it reaches `vue-ai-hooks`.
- Test with the smallest possible prompt and a known streaming-capable provider.

## `stop()` does not cancel upstream work immediately

`stop()` aborts the client request and updates local reactive state. Some
providers may continue processing briefly after the connection closes. Treat
client abort as a UX and resource-saving hint, not a guaranteed provider-side
rollback.

## Tool calling needs explicit trust boundaries

Tool handlers run in your application. `vue-ai-hooks` does not sandbox tools,
prompt users for permission, or validate side effects for you.

Before exposing tool calling to users:

- Keep handlers small and explicit.
- Validate tool arguments before using them.
- Add permission prompts for actions that mutate data, spend money, or call
  external systems.
- Log tool execution enough to debug failures without leaking secrets.

## Provider errors should stay visible

Provider adapters normalize thrown values into errors, but provider-specific
status codes, rate limits, and retry behavior still belong to your app. Show
useful messages for authentication failures, quota limits, invalid models, and
temporary provider outages.

## Minimal issue details

When opening an issue, include:

- `vue-ai-hooks` version.
- Vue version.
- Node and package manager versions.
- Browser or runtime.
- Provider and model.
- Whether the request is streaming.
- A minimal code sample or reproduction.
- The exact error message or network response.
