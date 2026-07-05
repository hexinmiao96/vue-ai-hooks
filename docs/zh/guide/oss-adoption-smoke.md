---
title: OSS 接入 smoke
description: 面向固定外部 Vue 3 后台项目的 CI 级接入 smoke。
---

# OSS 接入 smoke

这条 smoke 用来证明包能安装进真实外部 Vue 3 应用，而不是只在专门搭建的 demo host 里通过。

当前目标是
[un-pany/v3-admin-vite](https://github.com/un-pany/v3-admin-vite)，固定在提交
`273065d2860a3acc5724cfdbdf36927da1dc9080`。它适合作为接入目标，因为它同时包含 Vue 3、Vite、TypeScript、Vue
Router、Pinia、Element Plus、项目级路由守卫、Vite proxy 规则和常规后台布局。

## 命令

先构建当前包，再跑接入 smoke：

```bash
pnpm build
pnpm oss-adoption:check
```

脚本会创建临时目录，下载固定的上游 archive，打包当前本地 `vue-ai-hooks`，把 tarball 安装进外部应用，加入隐藏验证路由，然后执行外部应用的 production build 和浏览器 smoke。

调试生成的宿主应用时，可以保留临时目录：

```bash
OSS_ADOPTION_KEEP_TEMP=true pnpm oss-adoption:check
```

## 覆盖路径

- 把当前本地 package tarball 安装到外部应用。
- 用 `vue-tsc` 和 Vite production build 构建外部 Vite 应用。
- 在应用正常 router 后面加入隐藏的 `/vue-ai-hooks-validation` 路由。
- 通过 `DirectChatTransport` 跑通本地 no-key chat。
- 通过 `/api/validation/chat` 跑通应用自有 proxy chat。
- 刷新后恢复 `useChatThreads()` 状态。
- 通过 `/api/validation/fail` 构造 `502` 应用 proxy 失败。
- 断言失败 trace 可诊断，且不暴露测试 session token 或 body secret。

## CI 放置位置

这条检查故意和主矩阵分开。主矩阵已经覆盖库在支持 Node 版本上的行为；OSS 接入 smoke 验证的是固定外部应用集成，只需要在当前主 Node 版本上跑一次。

保持目标提交固定。只有在有意刷新接入目标时才移动 pin，并把新结果记录到[采用证据](/zh/guide/adoption-evidence)。

## 失败处理

把失败当作接入证据处理：

- 外部应用无法下载时，先重试，区分网络波动和包问题。
- install 被 pnpm build-script approval 阻断时，只更新生成宿主应用的 allowlist，并记录摩擦点。
- 应用在触达 `vue-ai-hooks` 代码前构建失败时，确认固定上游提交或包管理器行为是否变化。
- 浏览器 smoke 失败时，保留临时应用，检查生成路由、proxy server 和 `inspect()` 输出。
