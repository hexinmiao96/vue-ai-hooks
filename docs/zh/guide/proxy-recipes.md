# Proxy 配方

生产环境的浏览器应用应调用应用自己的后端路由，而不是直接请求上游模型 API。
浏览器发送框架无关的 JSON 给后端，后端补上真实 Provider key，再把 `ChatChunk`
SSE、补全 SSE 或 embedding JSON 返回给浏览器。

## 不需要 key 的本地检查

接真实 Provider 前，先跑确定性的 proxy 模板：

```bash
pnpm example:proxy-server
# 另开一个终端
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

这个模式不会请求外网。它覆盖 `/api/chat`、`/api/completion`、`/api/embedding`、
`/api/image`、`/api/video`、`/api/speech`、`/api/transcription`、`/api/rerank`、
`/api/object`、`/api/ui-message-stream`，以及显式 `/api/ai/*` proxy 路由。

## OpenAI-compatible 上游

设置 `PROXY_UPSTREAM_BASE_URL` 后才会启用上游转发。模板会转发 chat、completion
和 embedding 请求；图片、视频、语音、转写、重排和 object demo 路由仍保持本地确定性，
方便本地 demo 稳定复现。

```bash
PROXY_UPSTREAM_BASE_URL=https://api.openai.com/v1 \
PROXY_UPSTREAM_API_KEY=$OPENAI_API_KEY \
PROXY_UPSTREAM_MODEL=gpt-4.1-mini \
pnpm example:proxy-server
```

然后让浏览器 demo 调用同一个应用自有路由：

```bash
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

如果你要测试该模板里的显式 `proxyProvider` 路由，改为：

```bash
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

服务端只会在 Node 进程里发送 `Authorization: Bearer $PROXY_UPSTREAM_API_KEY`。
不要把 Provider key 放进 `VITE_*` 变量。

## 超时、trace 和安全错误

生产 proxy 路由需要给上游请求设置上限，并返回浏览器安全的 trace id。示例会把生成的
trace id 转发给上游 Provider，并在成功 metadata 和错误响应里返回同一个脱敏 id：

```bash
PROXY_UPSTREAM_TIMEOUT_MS=30000 \
PROXY_UPSTREAM_TRACE_HEADER=x-request-id \
pnpm example:proxy-server
```

上游超时时，模板返回 HTTP `504`，并带上 `code: "upstream_timeout"`、
`retryable: true` 和 `traceId`。上游返回 HTTP `429` 或 `5xx` 时，模板返回 HTTP
`502`，并带上 `upstreamStatus`、`retryable` 和 `traceId`。模板不会原样回传 Provider
错误体，因为 Provider 错误体可能包含请求 metadata、额度策略或内部标识，不应暴露给浏览器。

## 本地 Ollama

Ollama 的 OpenAI-compatible server 也走同一套代理方式：浏览器仍请求你的应用 proxy，
Node 进程转发到 Ollama。

```bash
ollama serve
ollama pull qwen3:8b
PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1 \
PROXY_UPSTREAM_MODEL=qwen3:8b \
PROXY_UPSTREAM_TIMEOUT_MS=60000 \
PROXY_UPSTREAM_TRACE_HEADER=x-request-id \
pnpm example:proxy-server
```

本地运行时不要求鉴权时，`PROXY_UPSTREAM_API_KEY` 可以省略。本地模型首 token
延迟通常更高，可以把 timeout 设得更长，但仍应设置上限，避免模型 worker 卡住后长期占用浏览器请求。

## vLLM 网关

```bash
python -m vllm.entrypoints.openai.api_server --model Qwen/Qwen3-8B
PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:8000/v1 \
PROXY_UPSTREAM_MODEL=served-model \
PROXY_UPSTREAM_TIMEOUT_MS=60000 \
pnpm example:proxy-server
```

如果 vLLM 部署在内部网关后面，只需要把 `PROXY_UPSTREAM_BASE_URL` 指向该网关，
浏览器公开路由仍保持不变。

## 私有 OpenAI-compatible 网关

私有网关常见需求包括租户鉴权、非标准路径和 correlation header。把这些都放在 Node 边界配置：

```bash
PROXY_UPSTREAM_BASE_URL=https://llm-gateway.internal/v1 \
PROXY_UPSTREAM_API_KEY=$GATEWAY_TOKEN \
PROXY_UPSTREAM_MODEL=tenant-default-chat \
PROXY_UPSTREAM_TRACE_HEADER=x-correlation-id \
PROXY_UPSTREAM_TIMEOUT_MS=30000 \
pnpm example:proxy-server
```

如果网关使用非标准路径，可以覆盖：

```bash
PROXY_UPSTREAM_CHAT_PATH=/chat/completions \
PROXY_UPSTREAM_COMPLETION_PATH=/completions \
PROXY_UPSTREAM_EMBEDDING_PATH=/embeddings \
pnpm example:proxy-server
```

模板刻意不实现租户额度、模型 allow-list 或分布式 trace 存储。这些应在你的服务端框架里、
转发调用之前完成；浏览器只应看到 Provider 无关的响应和脱敏 trace id。

## 客户端接入

后端接受 `/api/*` 默认路径时，可以直接配置 `baseURL`：

```ts
useChat({ baseURL: 'http://127.0.0.1:8787' })
useCompletion({ baseURL: 'http://127.0.0.1:8787' })
useEmbedding({ baseURL: 'http://127.0.0.1:8787' })
```

如果应用暴露显式 `/api/ai/*` 路由，或需要会话 headers，使用 `proxyProvider`：

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

## 生产检查清单

- Provider key 只放在服务端环境变量里。
- 转发前校验用户会话、租户、额度和模型访问权限。
- 用 `PROXY_UPSTREAM_TIMEOUT_MS` 或框架自己的 timeout primitive 限制每次上游请求。
- 通过 `PROXY_UPSTREAM_TRACE_HEADER` 转发一个 correlation header；完整 trace 存服务端日志，不放进浏览器状态。
- 把 Provider `429` 和 `5xx` 响应转换成脱敏的 retryable 错误。
- 返回脱敏后的 Provider 错误，不要原样回传可能包含凭据或内部 metadata 的上游错误体。
- 客户端需要增量 SSE 时，关闭 serverless、CDN 和反向代理层的响应缓冲。
- 运行时支持时，把浏览器请求的 abort signal 转发给上游 Provider。
- 请求追踪放在应用边界做，不要暴露浏览器可见的 Provider 凭据。

这个模板刻意保持很小。把它复制进你的服务端框架后，补上自己的认证和限流层，
并保持客户端契约与具体 Provider 解耦。
