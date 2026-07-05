---
title: 采用和 1.0 准备
description: 0.14.x 生产强化之后的采用闭环、证据目标和 1.0 退出标准。
---

# 采用和 1.0 准备

生产可用性门禁通过之后，用这页推进下一阶段。目标不是继续堆功能，而是让外部团队能以较低支持成本接入这个库。

## 当前基线

- `0.14.x` 已经有 format、source hygiene、test、coverage、build、package
  install、docs、examples、proxy、image、threaded chat、tool approval、agent
  bridge 和 route templates 门禁。
- 生产文档已经覆盖浏览器边界、自有 `/api/chat` proxy、持久线程存储、重新生成分支、工具审批、调试检查和
  agent-event 投影。
- 下一阶段风险不是缺基础设施，而是首次采用不清晰：新应用能不能一轮完成、卡在哪里、哪些 API 在 `1.0`
  前必须给稳定承诺。

## 采用闭环

至少用三个真实宿主应用跑完这条闭环，再把 API 视为稳定。

1. 从不需要 key 的 demo 开始，记录 time-to-first-chat。
2. 接入自有 `/api/chat` proxy，用 `inspectRequestTrace()` 记录第一次 proxy 失败。
3. 用 `useChatThreads()` 加一条持久线程流程，存储可以选服务端或 IndexedDB。
4. 只有宿主应用已经需要工具、interrupt 或后端 agent event 时，才加入工具审批或 Agent 桥接。
5. GitHub issue 只记录可复现 bug。接入阻力、缺少示例和文档不清晰放到 discussion 或 PR。

每个应用记录这些信号：

| 信号                  | `1.0` 前目标                                    |
| --------------------- | ----------------------------------------------- |
| time-to-first-chat    | 新应用 15 分钟内发出 local 或 proxy chat 消息   |
| proxy setup           | 生产 proxy smoke test 通过，浏览器不保存 key    |
| thread restore        | 刷新后恢复 active thread 和消息                 |
| inspection usefulness | 第一次失败请求带脱敏 trace                      |
| support loop          | 反馈包含复现 demo、版本和 trace                 |
| install confidence    | `pnpm install`、docs build、examples build 通过 |

## 1.0 退出标准

`1.0` 代表采用稳定，不代表功能最多。

- 公共导出有明确稳定级别，不再出现意外 churn。
- breaking change 必须有迁移说明、废弃窗口，或在 changelog 里标记为 `1.0` 前例外。
- 兼容矩阵覆盖 Vue 3、Vite、Nuxt/Nitro、当前 Node LTS 和支持中的 React 迁移入口。
- 每条主推产品路径至少有一个 no-key demo：chat、proxy、threads、inspection、approvals、agent
  bridge、media/object helpers。
- 文档先说明浏览器 secret 边界，再展示 provider 示例。
- 发布候选版本必须通过 `pnpm production:readiness`、`pnpm links:check` 和 `pnpm docs:build`。
- 支持策略清晰：GitHub issue 只放可复现 bug；路线和采用反馈放在 discussion、文档 PR 或
  `ROADMAP.md`。

## 不追这些

- 托管后端服务。
- Provider 计费、额度或账号管理。
- 完整后端 Agent 框架。
- React 对全部 Vue composable 的完全对称。
- 厂商专属观测平台集成。

除非这些事项变成安全组合式契约的必要条件，否则继续归宿主应用负责。
