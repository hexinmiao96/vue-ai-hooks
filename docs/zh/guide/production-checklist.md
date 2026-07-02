---
title: 生产检查清单
description: 使用 vue-ai-hooks 通过自有后端路由上线前应逐项确认的生产检查清单。
---

# 生产检查清单

浏览器应用要把真实用户流量接入 `vue-ai-hooks` 前，先按这份清单确认边界。这个包负责
UI 请求生命周期和安全的请求检查；认证、配额、Provider 凭据、存储和运维仍然由你的应用负责。

## 浏览器边界

- 不要把生产 Provider key 放进 `VITE_*` 变量。
- 浏览器请求应发给自有路由，例如 `/api/chat`、`/api/completion`、`/api/object`
  或 `/api/ai/chat`。
- 只有路由确实需要 cookie 且已有 CSRF 防护时，才设置 `credentials: 'include'`。
- tenant id、trace id 和 feature flag 可以放在应用自己的 metadata 中。不要把 Provider
  authorization header 返回给浏览器。

## 后端代理

- 转发前校验 session、tenant、模型权限和配额。
- Provider key 只从服务端环境变量读取。
- 上游错误要归一化成用户安全的提示。
- 运行时支持时，把 abort signal 转发给 Provider。
- SSE 路由要关闭 serverless、CDN 和反向代理层的 buffering。
- Provider 专属 timeout 和 retry 策略放在后端边界处理。
- 当 `/api/chat` 连接的是 LangChain、LangGraph 或自研 agent 服务，而不是直连模型
  Provider 时，按 [后端 Agent 桥接配方](/zh/guide/agent-bridge) 接入。
- agent checkpoint、检索文档、vector store 凭据、LangSmith key 和特权工具状态只留在服务端。

## 流式契约

- 确认 `/api/chat` 返回 `ChatChunk` SSE 或 AI SDK UI stream parts。
- 确认 `/api/completion` 返回 completion SSE 或文本 chunks。
- 确认 `/api/object` 可以返回 chat chunks 或 `text/plain` JSON stream。
- 媒体和检索相关路由也应由应用持有：`/api/image`、`/api/video`、`/api/speech`、
  `/api/transcription` 和 `/api/rerank`。
- 测试 abort、断连，以及首个 chunk 到达前的 retry 行为。

## 工具和审批

- 暴露扣款、账号变更、数据访问或基础设施类特权工具前，先按
  [工具审批配方](/zh/guide/tool-approvals) 接入。
- 审批记录不要只放在 message JSON 里；至少保存 `approvalId`、`toolCallId`、`runId`、
  审批人、决策、脱敏参数、trace id 和策略版本。
- approve 和 reject 路由应由后端持有。浏览器可以渲染请求，但不能成为特权工具的权威执行方。
- 工具执行要幂等；相同 `runId` 的重复请求不能执行两次。
- 审批 UI 只渲染白名单脱敏字段。不要展示原始工具参数、Provider 凭据、stack trace 或上游错误体。

## UI 状态和检查

- UI 要渲染 `status`、`isLoading`、`error` 和 `stop()` 状态。
- 失败后保留输入，方便用户编辑后重试。
- 内部调试面板使用 `inspectRequestTrace()`。
- `summary`、`timeline`、`retries`、`providerTrace` 和脱敏 `curl` 只展示在可信的支持或开发界面。
- 把 `useChat({ persist })` 的读取、保存和清理失败也放进同一个 timeline，再考虑让用户重置本地历史。
- 不要渲染原始 Provider 响应体或 authorization header。

## 持久化和线程

- 只需要本地历史时使用 `persist`。
- 如果阶段性只走本地版本，使用 IndexedDB 时要异步恢复（在 chat UI 渲染前）并只在明确的生命周期边界（`onFinish`、rename、archive、delete）写库。
- 服务端存储使用 `serializeMessages()` 和 `deserializeMessages()`。
- 需要多设备历史、团队交接或审计留存时，按 [服务端存储配方](/zh/guide/server-storage) 接入。
- 暴露重试、对比回答或从消息分叉 UI 前，先按
  [重新生成分支配方](/zh/guide/regenerate-branches) 接入。
- hydrate 外部历史前，用 `validateMessages()` 或 `safeValidateMessages()` 校验。
- 消息结构发生变化时提升持久化版本。
- 线程重命名、归档、删除和分支重新生成行为，应先确定由应用后端负责，再暴露到 UI。
  重新生成时不要覆盖旧 assistant 消息。

## 本地门禁

发布候选版本前统一执行一条命令：

```bash
pnpm production:readiness
```

如果 pnpm 执行器受限（如出现 `ERR_PNPM_IGNORED_BUILDS`），可以改为：

```bash
pnpm production:readiness:local

# 或直接执行

node scripts/production-readiness-local.mjs
```

等价完整入口：

```bash
pnpm check
pnpm release:cadence
pnpm format:check && pnpm secrets:check && pnpm source:hygiene && pnpm lint && pnpm typecheck:all && pnpm test:hygiene && pnpm test:coverage && pnpm build && pnpm dist:check && pnpm size:check && pnpm pack:check && pnpm install:check && pnpm changelog:check && pnpm metadata:check && pnpm community:check && pnpm workflows:check && pnpm api:check && pnpm docs:ux:check && pnpm proxy:check && pnpm threaded-chat:check && pnpm ui-message-stream:check && pnpm tool-approval:check && pnpm agent-bridge:check && pnpm links:check && pnpm examples:build && pnpm docs:build
```

如果你要做最严格发布路径，运行 `pnpm release:check`（会先执行 `pnpm security:audit`）。

涉及 proxy 改动时，还要运行：

```bash
pnpm example:proxy-server
VITE_CHAT_PROVIDER=proxy-route VITE_PROXY_BASE_URL=http://127.0.0.1:8787 pnpm example:chat
```

## 生产 smoke test

1. 跑不需要 key 的聊天工具审批 demo。
2. 跑确定性的 proxy 模板。
3. 通过服务端环境变量连接一个真实上游。
4. 发送一次聊天请求，中止它，然后重试。
5. 触发一次 Provider 错误，确认 UI 保留可编辑输入。
6. 捕获一份 `inspectRequestTrace()` snapshot，确认没有 secret。
7. 运行 `pnpm threaded-chat:check`，确认本地 thread index 和每个 thread 的 message
   storage 可以独立恢复。
8. 刷新一个服务端存储的 thread，确认 messages 恢复后仍保留 `Date` 值。
9. 重新生成一条 assistant 消息，从同一条 user 消息创建 branch，刷新后确认两个分支都能恢复，
   且没有重复写入相同 `runId`。
10. 分别审批通过和拒绝一个特权工具请求，确认重复提交相同 `runId` 不会执行两次。
11. 确认日志里有 trace id，但没有 Provider API key。

## Issue 规则

GitHub issue 只记录可复现 bug。功能规划和生产 rollout 想法放到 pull request、discussion
或 `ROADMAP.md`。
