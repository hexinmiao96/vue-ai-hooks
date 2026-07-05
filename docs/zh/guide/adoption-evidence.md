---
title: 采用证据
description: vue-ai-hooks 准备 1.0 期间记录的宿主应用接入、smoke 结果和摩擦点。
---

# 采用证据

这页用于记录[采用和 1.0 准备](/zh/guide/adoption-readiness)闭环中的真实证据。真实宿主应用跑完
adoption smoke，或暴露可复现阻断问题时，在这里追加一条记录。

GitHub issue 仍然只记录可复现 bug。安装摩擦、耗时、缺少文档等反馈放在这里、discussion 或文档 PR。

## Run 1：干净 Vite 宿主应用

| 字段       | 值                                                 |
| ---------- | -------------------------------------------------- |
| 日期       | 2026-07-05                                         |
| 宿主应用   | `/tmp/vue-ai-hooks-adoption-smoke-0.14.3-20260705` |
| 包版本     | npm registry 上的 `vue-ai-hooks@0.14.3`            |
| 技术栈     | Vue `3.5.22`、Vite `6.4.3`、TypeScript `5.8.3`     |
| Smoke 工具 | Playwright `1.56.1` + Chromium headless            |
| 包管理器   | pnpm `11.7.0`                                      |
| Node       | Node `22.22.1`                                     |
| 结果       | 记录宿主设置摩擦和 smoke 修正后通过                |

### 覆盖路径

- 通过 `DirectChatTransport` 跑通 no-key local chat。
- 通过应用自有 `/api/chat` proxy 返回 SSE `chat-chunk`。
- `useChatThreads()` 使用带版本的 `localStorage` key 完成本地持久化恢复。
- 构造 proxy `500` 失败，并通过 `inspect()` 检查。
- 失败 trace 可诊断，且没有暴露测试用 header/body secret。

### 命令

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm smoke
```

### 证据

- `pnpm list vue-ai-hooks --depth 0` 解析到 `vue-ai-hooks@0.14.3`。
- `pnpm build` 通过 `vue-tsc` 和 Vite production build。
- `pnpm smoke` 启动本地 proxy、Vite 宿主应用和浏览器自动化。
- 浏览器 smoke 输出 `adoption smoke passed for vue-ai-hooks@0.14.3`。

### 发现的摩擦点

- pnpm 会阻止临时宿主应用，直到设置 `allowBuilds.esbuild: true`。这是宿主项目设置摩擦，不是
  `vue-ai-hooks` 包失败。
- 持久线程 key 会带上 `usePersist` 的版本后缀（`adoption-smoke:threads:v1`）。文档和示例应继续明确这个
  versioned key 行为。
- 强制 proxy 失败时，`inspect()` 快照里没有出现原始自定义 proxy header 或 body secret。验收标准应是
  “不泄漏 secret 且 failure summary 可用”，不是“必须出现 `[REDACTED]` 标记”。

## Run 2：Nuxt/Nitro 宿主应用

| 字段       | 值                                                       |
| ---------- | -------------------------------------------------------- |
| 日期       | 2026-07-05                                               |
| 宿主应用   | `/tmp/vue-ai-hooks-adoption-nuxt-smoke-0.14.3-20260705`  |
| 包版本     | npm registry 上的 `vue-ai-hooks@0.14.3`                  |
| 技术栈     | Nuxt `4.4.8`、Nitro `2.13.4`、Vite `7.3.6`、Vue `3.5.39` |
| Smoke 工具 | Playwright `1.56.1` + Chromium headless                  |
| 包管理器   | pnpm `11.7.0`                                            |
| Node       | Node `22.22.1`                                           |
| 结果       | 记录 Nuxt 专属依赖设置和 dev UX 摩擦后通过               |

### 覆盖路径

- 在 Nuxt 4 应用内通过 `DirectChatTransport` 跑通 no-key local chat。
- Nitro `server/api/chat.post.ts` 返回 SSE `chat-chunk`，供
  `proxyProvider({ chatUrl: '/api/chat' })` 调用。
- `useChatThreads()` 在 Nuxt client 中使用带版本的 `localStorage` key 完成本地持久化恢复。
- Nitro `server/api/fail.post.ts` 构造 `500` 失败，并通过 `inspect()` 检查。
- 失败 trace 可诊断，且没有暴露测试用 header/body secret。

### 命令

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm smoke
```

### 证据

- `pnpm list vue-ai-hooks nuxt vue vue-router playwright --depth 0` 解析到
  `vue-ai-hooks@0.14.3`、Nuxt `4.4.8`、Vue `3.5.39`、Vue Router `5.1.0` 和
  Playwright `1.56.1`。
- `pnpm build` 通过 Nuxt production build，并生成 Nitro `node-server` 输出。
- `pnpm smoke` 启动 Nuxt dev server 和浏览器自动化。
- 浏览器 smoke 输出 `nuxt adoption smoke passed for vue-ai-hooks@0.14.3`。

### 发现的摩擦点

- pnpm 会阻止临时 Nuxt 宿主应用，直到设置 `allowBuilds.esbuild: true` 和
  `allowBuilds['@parcel/watcher']: true`。这是宿主项目设置摩擦。
- Nuxt dev 最初在运行期才发现 `vue-ai-hooks`，第一次点击前发生刷新。加入
  `vite.optimizeDeps.include: ['vue-ai-hooks']` 后，浏览器 smoke 稳定通过。
- Nuxt/Nitro 路由形态保持简单：`.post.ts` API route、`readBody(event)` 和 SSE
  `Response`。

## Run 3：业务后端 proxy 宿主应用

| 字段       | 值                                                                     |
| ---------- | ---------------------------------------------------------------------- |
| 日期       | 2026-07-05                                                             |
| 宿主应用   | `/tmp/vue-ai-hooks-adoption-business-proxy-smoke-0.14.3-20260705`      |
| 包版本     | npm registry 上的 `vue-ai-hooks@0.14.3`                                |
| 技术栈     | Vue `3.5.22`、Vite `6.4.3`、TypeScript `5.8.3`、Node HTTP business API |
| Smoke 工具 | Playwright `1.56.1` + Chromium headless                                |
| 包管理器   | pnpm `11.7.0`                                                          |
| Node       | Node `22.22.1`                                                         |
| 结果       | 未发现新的包级接入摩擦                                                 |

### 覆盖路径

- 应用自有业务后端 proxy：`/api/business/chat`。
- `proxyProvider()` 携带应用 session header、`x-tenant-id`、`x-run-id` 和业务上下文 body。
- 后端 audit route 校验 session token、tenant 和 run id 契约。
- `useChatThreads()` 使用带版本的 `localStorage` key 完成本地持久化恢复。
- 构造业务 proxy `502` 失败，并通过 `inspect()` 检查。
- 失败 trace 可诊断，且没有暴露测试用 session/body secret。

### 命令

```bash
pnpm install
pnpm build
pnpm smoke
```

### 证据

- `pnpm list vue-ai-hooks vue vite @vitejs/plugin-vue playwright --depth 0` 解析到
  `vue-ai-hooks@0.14.3`、Vue `3.5.22`、Vite `6.4.3`、`@vitejs/plugin-vue@5.2.4` 和
  Playwright `1.56.1`。
- `pnpm build` 通过 `vue-tsc` 和 Vite production build。
- `pnpm smoke` 启动业务 proxy、Vite 宿主应用和浏览器自动化。
- 浏览器 smoke 输出 `business proxy adoption smoke passed for vue-ai-hooks@0.14.3`。

### 发现的摩擦点

- 宿主 workspace 预先声明 `allowBuilds.esbuild: true` 后，没有出现新的 `vue-ai-hooks` 包级摩擦。
- 业务 proxy 集成保持由应用负责：session 校验、tenant 路由、run-id 幂等提示、trace id 和上游错误整形都在后端。
- 强制 `502` 失败能产生可用 trace summary，且没有暴露测试 session token 或 body secret。

### 下一轮采用验证

把同一条 smoke 放进已有业务应用，而不是临时宿主。先按[已有业务应用接入
smoke](/zh/guide/existing-app-adoption-smoke)清单执行，再记录 time-to-first-chat、第一次真实 proxy 失败，以及不读库源码时
thread restore 是否仍容易理解。
