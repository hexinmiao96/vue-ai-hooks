---
title: 已有业务应用接入 smoke
description: 在真实业务应用里运行 vue-ai-hooks 接入 smoke 的现场检查清单。
---

# 已有业务应用接入 smoke

在[采用证据](/zh/guide/adoption-evidence)里的临时宿主应用验证完成后，用这份清单推进真实业务应用验证。目标是证明
`vue-ai-hooks` 放进已有 auth、tenant 路由、后端 proxy、构建约束和产品 UI 的应用后，仍然容易理解和接入。

## 成功标准

- 浏览器代码里没有 provider API key 或 provider secret。
- 从干净分支开始，开发者 15 分钟内发出第一条 local 或 proxy chat 消息。
- 应用自有 proxy 能收到应用 session 上下文、tenant 上下文和 run id，不需要改库。
- 构造后端失败后，可以通过 `inspect()` 或 `inspectRequestTrace()` 看到诊断信息，且不暴露 session token、provider
  key 或业务 body secret。
- 刷新后能恢复 active thread 和可见消息状态，不需要阅读库源码。
- 结果追加到[采用证据](/zh/guide/adoption-evidence)，包含命令、耗时和摩擦点。

## 选择目标应用

只有同时满足这些条件时，才选择已有应用：

- 应用是 Vue 3、Nuxt，或有一个可临时加路由的 Vue 3 页面。
- 应用可以用正常包管理器和构建命令在本地跑起来。
- 后端 route 能安全代理一次测试请求，不触碰真实用户数据。
- 分支可以丢弃，或 smoke 页面可以保留在 development flag 后面。

不要在生产 checkout 或生产 secret 下运行这条 smoke。使用临时分支、测试账号和测试 tenant。

## 记录基线

修改前先记录这些信息：

| 字段     | 记录内容                                        |
| -------- | ----------------------------------------------- |
| 宿主应用 | 本地路径、repo、branch 和 dirty worktree 状态   |
| 包版本   | 安装的 `vue-ai-hooks` 版本和来源                |
| 技术栈   | Vue/Nuxt/Vite 版本和后端运行时                  |
| 包管理器 | pnpm、npm 或 yarn 版本和 install 命令           |
| 命令     | install、typecheck、build、dev 和 smoke 命令    |
| 时间盒   | 开始时间和 time-to-first-chat                   |
| Proxy    | route path、auth 上下文、tenant 上下文、失败 id |
| Threads  | storage key、active-thread restore 结果         |

## 增加临时 smoke 页面

优先放在 development-only 路由或 debug panel 里。组合式状态保持最小，auth、provider credentials、tenant policy、trace
id 和上游错误整形都继续由应用后端负责。

```vue
<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { proxyProvider, useChat, useChatThreads } from 'vue-ai-hooks'

const tenantId = 'adoption-smoke'
const runId = shallowRef(`adoption-${Date.now()}`)
const threads = useChatThreads({
  persist: { key: 'adoption-smoke:threads', version: 1 }
})

const activeThread = threads.activeThread.value ?? threads.createThread({ title: 'Adoption smoke' })

const { append, inspect, isLoading, messages } = useChat({
  id: activeThread.id,
  threadId: activeThread.id,
  provider: proxyProvider({
    chatUrl: '/api/adoption-smoke/chat',
    headers: () => ({
      'x-tenant-id': tenantId,
      'x-run-id': runId.value
    }),
    body: () => ({
      adoptionSmoke: true,
      tenantId,
      runId: runId.value
    })
  }),
  persist: { key: `adoption-smoke:messages:${activeThread.id}`, version: 1 }
})

const inspection = computed(() => inspect())

async function runSmoke() {
  await append('Reply with adoption-smoke-ok.')
  threads.touchThread(activeThread.id, {
    lastMessagePreview: 'adoption-smoke-ok',
    messageCount: messages.value.length
  })
}
</script>

<template>
  <section>
    <button :disabled="isLoading" @click="runSmoke">Run adoption smoke</button>
    <pre data-testid="adoption-inspection">{{ inspection }}</pre>
  </section>
</template>
```

如果应用已经有 chat 页面，就把 smoke 接到已有页面里，不要额外加屏幕；验收点保持一致。

## 后端 proxy 契约

后端 route 需要证明这个库能放在正常业务控制之后：

1. 校验应用 session 或测试 token。
2. 校验 tenant 和 run-id header。
3. 只在服务端注入 provider key。
4. 转发应用已经支持的 streaming response，或为 smoke 返回简单的 SSE `chat-chunk` stream。
5. 加一个确定性失败模式，例如 `?forceFailure=502`，让浏览器能捕获脱敏 trace。

原始 provider 错误、包含 secret 的 request body、业务策略细节都留在服务端。浏览器只接收产品支持可以安全附到 bug
报告里的错误摘要。

## 浏览器 smoke

应用已有浏览器测试工具时优先复用；否则跑一条短 Playwright smoke：

1. 打开临时 smoke 路由。
2. 触发 smoke 消息。
3. 断言 assistant 回复包含 `adoption-smoke-ok`。
4. 刷新并断言 active thread 和 message count 仍可见。
5. 触发确定性 proxy 失败。
6. 断言 inspection 输出包含失败状态和 trace id。
7. 断言 inspection 输出不包含测试 session token、provider key 或 body secret。

## 证据模板

smoke 通过或暴露可复现阻断后，把结果追加到[采用证据](/zh/guide/adoption-evidence)：

````md
## Run N：已有业务应用 - <应用名>

| 字段       | 值                                   |
| ---------- | ------------------------------------ |
| 日期       | YYYY-MM-DD                           |
| 宿主应用   | <repo/path/branch>                   |
| 包版本     | vue-ai-hooks@<version>               |
| 技术栈     | Vue/Nuxt/Vite/backend versions       |
| Smoke 工具 | Playwright、Cypress 或 manual script |
| 包管理器   | pnpm/npm/yarn <version>              |
| Node       | Node <version>                       |
| 结果       | 通过、阻断，或带摩擦通过             |

### 覆盖路径

- 浏览器没有 provider key。
- 应用自有 proxy 路径。
- Thread restore 路径。
- 构造失败 trace 路径。

### 命令

```bash
<install command>
<build command>
<smoke command>
```

### 证据

- time-to-first-chat: <duration>
- 第一次真实 proxy 失败: <status/summary>
- Thread restore: <result>

### 发现的摩擦点

- <setup、docs、type、proxy 或 runtime 摩擦>
````
