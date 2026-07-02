# Proxy 配方

生产环境的浏览器应用应调用应用自己的后端路由，而不是直接请求上游模型 API。
浏览器发送框架无关的 JSON 给后端，后端补上真实 Provider key，再把 `ChatChunk`
SSE、补全 SSE 或 embedding JSON 返回给浏览器。

## 不需要 key 的本地检查

接真实 Provider 前，先跑确定性的 proxy 模板：

```bash
pnpm example:proxy-server
# 另开一个终端
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
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
VITE_CHAT_PROVIDER=proxy VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

服务端只会在 Node 进程里发送 `Authorization: Bearer $PROXY_UPSTREAM_API_KEY`。
不要把 Provider key 放进 `VITE_*` 变量。

## 本地 Ollama 或 vLLM

OpenAI-compatible 的本地运行时也使用同一组变量。上游不要求鉴权时，
`PROXY_UPSTREAM_API_KEY` 可以省略。

```bash
PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:11434/v1 \
PROXY_UPSTREAM_MODEL=qwen3:8b \
pnpm example:proxy-server
```

vLLM 网关示例：

```bash
PROXY_UPSTREAM_BASE_URL=http://127.0.0.1:8000/v1 \
PROXY_UPSTREAM_MODEL=served-model \
pnpm example:proxy-server
```

如果网关使用非标准路径，可以覆盖路径：

```bash
PROXY_UPSTREAM_CHAT_PATH=/chat/completions \
PROXY_UPSTREAM_COMPLETION_PATH=/completions \
PROXY_UPSTREAM_EMBEDDING_PATH=/embeddings \
pnpm example:proxy-server
```

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
- 返回脱敏后的 Provider 错误，不要原样回传可能包含凭据或内部 metadata 的上游错误体。
- 客户端需要增量 SSE 时，关闭 serverless、CDN 和反向代理层的响应缓冲。
- 运行时支持时，把浏览器请求的 abort signal 转发给上游 Provider。
- 请求追踪放在应用边界做，不要暴露浏览器可见的 Provider 凭据。

这个模板刻意保持很小。把它复制进你的服务端框架后，补上自己的认证和限流层，
并保持客户端契约与具体 Provider 解耦。
