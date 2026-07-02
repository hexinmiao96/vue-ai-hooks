# Proxy recipes

Production browser apps should call app-owned routes, not upstream model APIs
directly. The browser sends provider-agnostic JSON to your backend, your backend
adds the real provider key, then the browser receives `ChatChunk` SSE,
completion SSE, or embedding JSON.

## No-key local check

Start with the deterministic proxy template before wiring a real provider:

```bash
pnpm example:proxy-server
# in another terminal
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

This mode does not call the network. It covers `/api/chat`, `/api/completion`,
`/api/embedding`, `/api/image`, `/api/video`, `/api/speech`,
`/api/transcription`, `/api/rerank`, `/api/object`, `/api/ui-message-stream`,
and the explicit `/api/ai/*` proxy routes.

## OpenAI-compatible upstream

Set `PROXY_UPSTREAM_BASE_URL` to opt in to upstream forwarding. The template
forwards chat, completion, and embedding requests; media and object demo routes
stay deterministic so local demos remain stable.

```bash
PROXY_UPSTREAM_BASE_URL=https://api.openai.com/v1 \
PROXY_UPSTREAM_API_KEY=$OPENAI_API_KEY \
PROXY_UPSTREAM_MODEL=gpt-4.1-mini \
pnpm example:proxy-server
```

Then run the browser demo against the same app-owned route:

```bash
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

If you want to test explicit `proxyProvider` routes in this same template, use:

```bash
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

The server sends `Authorization: Bearer $PROXY_UPSTREAM_API_KEY` only from the
Node process. Do not put provider keys in `VITE_*` variables.

## Timeout, trace, and safe errors

Production proxy routes need a bounded upstream request and a browser-safe trace
id. The example forwards a generated trace id to the upstream provider, then
returns the same sanitized id in successful metadata and error bodies:

```bash
PROXY_UPSTREAM_TIMEOUT_MS=30000 \
PROXY_UPSTREAM_TRACE_HEADER=x-request-id \
pnpm example:proxy-server
```

When the upstream times out, the template returns HTTP `504` with
`code: "upstream_timeout"`, `retryable: true`, and a `traceId`. When the
upstream returns HTTP `429` or `5xx`, it returns HTTP `502` with
`upstreamStatus`, `retryable`, and `traceId`. It does not echo the raw provider
body, because provider error bodies can contain request metadata, quota policy,
or internal identifiers that should not reach the browser.

## Local Ollama

For Ollama's OpenAI-compatible server, keep the browser pointed at your app
proxy and point the Node process at Ollama:

```bash
ollama serve
ollama pull qwen3:8b
PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1 \
PROXY_UPSTREAM_MODEL=qwen3:8b \
PROXY_UPSTREAM_TIMEOUT_MS=60000 \
PROXY_UPSTREAM_TRACE_HEADER=x-request-id \
pnpm example:proxy-server
```

`PROXY_UPSTREAM_API_KEY` is optional when the local runtime does not require
authorization. Keep the timeout higher for first-token latency on local models,
but still set a bound so hung model workers do not hold browser requests open
forever.

## vLLM gateway

```bash
python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-8B
PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:8000/v1 \
PROXY_UPSTREAM_MODEL=served-model \
PROXY_UPSTREAM_TIMEOUT_MS=60000 \
pnpm example:proxy-server
```

If your vLLM deployment is behind an internal gateway, keep the gateway URL in
`PROXY_UPSTREAM_BASE_URL` and keep the public browser route unchanged.

## Private OpenAI-compatible gateway

Private gateways often use tenant-specific auth, non-standard paths, and
correlation headers. Override those at the Node boundary:

```bash
PROXY_UPSTREAM_BASE_URL=https://llm-gateway.internal/v1 \
PROXY_UPSTREAM_API_KEY=$GATEWAY_TOKEN \
PROXY_UPSTREAM_MODEL=tenant-default-chat \
PROXY_UPSTREAM_TRACE_HEADER=x-correlation-id \
PROXY_UPSTREAM_TIMEOUT_MS=30000 \
pnpm example:proxy-server
```

If the gateway uses non-standard paths, override them:

```bash
PROXY_UPSTREAM_CHAT_PATH=/chat/completions \
PROXY_UPSTREAM_COMPLETION_PATH=/completions \
PROXY_UPSTREAM_EMBEDDING_PATH=/embeddings \
pnpm example:proxy-server
```

The template intentionally does not implement tenant quota, model allow-lists,
or distributed tracing storage. Add those in your server framework before the
forwarding call; the browser should only see provider-agnostic responses and
sanitized trace ids.

## Client wiring

Use the default URLs when the backend accepts `/api/*`:

```ts
useChat({ baseURL: 'http://127.0.0.1:8787' })
useCompletion({ baseURL: 'http://127.0.0.1:8787' })
useEmbedding({ baseURL: 'http://127.0.0.1:8787' })
```

Use `proxyProvider` when your app exposes explicit `/api/ai/*` routes or needs
session headers:

```ts
import { proxyProvider, useChat } from 'vue-ai-hooks'

useChat({
  provider: proxyProvider({
    chatUrl: '/api/ai/chat',
    completionUrl: '/api/ai/completion',
    embeddingUrl: '/api/ai/embedding',
    headers: () => ({ Authorization: `Bearer ${getSessionToken()}` }),
    credentials: 'include'
  })
})
```

## Production checklist

- Keep provider keys in server-only environment variables.
- Validate user session, tenant, quota, and model access before forwarding.
- Bound every upstream request with `PROXY_UPSTREAM_TIMEOUT_MS` or your
  framework's timeout primitive.
- Forward one correlation header with `PROXY_UPSTREAM_TRACE_HEADER`; store the
  full trace in server logs, not in browser state.
- Convert provider `429` and `5xx` responses into sanitized retryable errors.
- Return sanitized provider errors; never echo raw upstream error bodies that may
  contain credentials or internal request metadata.
- Disable buffering on serverless, CDN, and reverse-proxy layers when the client
  needs incremental SSE.
- Forward abort signals to the upstream provider when your runtime supports it.
- Add request tracing at your application boundary, not in browser-visible
  provider credentials.

The template is intentionally small. Copy it into your server framework, add
your own auth/rate-limit layer, and keep the client contract provider-agnostic.
