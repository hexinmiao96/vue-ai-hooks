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
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
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
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

The server sends `Authorization: Bearer $PROXY_UPSTREAM_API_KEY` only from the
Node process. Do not put provider keys in `VITE_*` variables.

## Local Ollama or vLLM

For OpenAI-compatible local runtimes, point the same variables at the local
server. `PROXY_UPSTREAM_API_KEY` is optional when the upstream does not require
authorization.

```bash
PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1 \
PROXY_UPSTREAM_MODEL=qwen3:8b \
pnpm example:proxy-server
```

For a vLLM gateway:

```bash
PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:8000/v1 \
PROXY_UPSTREAM_MODEL=served-model \
pnpm example:proxy-server
```

If your gateway uses non-standard paths, override them:

```bash
PROXY_UPSTREAM_CHAT_PATH=/chat/completions \
PROXY_UPSTREAM_COMPLETION_PATH=/completions \
PROXY_UPSTREAM_EMBEDDING_PATH=/embeddings \
pnpm example:proxy-server
```

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
- Return sanitized provider errors; never echo raw upstream error bodies that may
  contain credentials or internal request metadata.
- Disable buffering on serverless, CDN, and reverse-proxy layers when the client
  needs incremental SSE.
- Forward abort signals to the upstream provider when your runtime supports it.
- Add request tracing at your application boundary, not in browser-visible
  provider credentials.

The template is intentionally small. Copy it into your server framework, add
your own auth/rate-limit layer, and keep the client contract provider-agnostic.
