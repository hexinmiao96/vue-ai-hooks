---
title: 生产可用性状态
description: vue-ai-hooks 当前生产可用性覆盖范围、证据和剩余发布边界。
---

# 生产可用性状态

用这页检查当前库方向是否已经对齐生产强化路线。这里记录证据，不记录愿望清单。GitHub
issue 仍然只记录可复现 bug。

## 状态矩阵

| 方向            | 当前状态           | 证据                                                                                                                                                        |
| --------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 调试检查        | 可接入应用         | `inspect()`、`inspectRequestTrace()`、timeline、retry records、provider trace、脱敏 curl                                                                    |
| 任务型 demo     | 可用于上手         | Vue chat/completion/object/embedding 审批 demo、agent run 审批、React chat/completion/object/image/video demo、图片编辑、proxy、AI SDK stream、Demo UX 回归 |
| Provider preset | 可经应用代理使用   | OpenAI-compatible、DeepSeek、OpenRouter、Gemini、Anthropic、Moonshot、智谱、Ollama、vLLM                                                                    |
| React 支持      | 迁移桥定位         | `vue-ai-hooks/react` 暴露 `useChat`、`useCompletion`、`useObject`、`useImage`、`useVideo`、`usePromptSuggestions` 和 `useAgentRun`                          |
| 工具审批        | 可作为后端契约接入 | 持久审批记录、renderer contract、重放 `runId`、过期 `revision` 冲突                                                                                         |
| 线程和持久化    | 可作为应用自有模型 | `useChatThreads`、服务端存储配方、IndexedDB 配方、重新生成分支契约                                                                                          |
| Agent 桥接      | 可作为投影层接入   | `AgentEvent`、LangChain/LangGraph 配方、路由模板、interrupt/resume 投影守护规则、AI SDK UI stream part 转换                                                 |

## 必跑门禁

发布候选版本前运行完整本地生产门禁：

```bash
pnpm production:readiness
```

如果当前环境无法执行 pnpm wrapper，运行 Node 本地入口：

```bash
node scripts/production-readiness-local.mjs
```

这条门禁覆盖 format、secret、source hygiene、lint、typecheck、test hygiene、coverage、build、dist、size、pack、install、changelog、metadata、community health、workflow、API docs、docs UX、proxy、图片编辑、demo UX、竞品基准、threaded chat、UI message stream、agent run、tool approval、agent bridge、agent route templates、markdown links、examples 和 docs build。

## 发布边界

当当天已经发过 npm 版本时，npm 上的版本可能落后于 `main`。这种情况下，只有 CI、CodeQL、OpenSSF Scorecard 和 `pnpm production:readiness` 都通过后，才把 `main` 当作下一次发布候选。

不发布、不改版本，只检查 registry 和发布窗口：

```bash
pnpm release:status
```

不要在同一个 Asia/Shanghai 自然日再次发布 npm 版本。release cadence 检查已经接入本地、CI 和 publish 路径。

## 剩余非目标

- 不在浏览器保存 Provider key、vector store 凭据或特权工具 secret。
- 不把这个包做成后端 Agent 框架。
- 不为了对称而扩 React hook；React 支持继续围绕迁移信心。
- 不把功能规划放进 GitHub issue；使用 `ROADMAP.md`、discussion 或 PR。
