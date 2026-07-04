# 竞品基准对齐清单

本页不是排名页，不是“哪家功能更多”。它用于确认 `vue-ai-hooks` 在本项目里要“强于谁、强在何处、哪块先不做”。

## 定位约束

在本仓库里：

- **AI SDK UI** 是直接对标对象，用于 API 形态和迁移路径对照。
- **CopilotKit** 是产品相邻标杆，重点看其 agent UX 与 AG-UI 风格协作模式。
- **LangChain.js** 更偏后端编排，不是前端 composable 的直接竞品。
- **VueUse** 是通用 Vue 工具层，不作为 AI 协议与前端链路的竞品。

## “超越”定义

本项目的超越目标是：

1. Vue 原生组合式开发体验优先，不把应用绑死到完整 AI SDK 前端框架。
2. 生产默认路径安全（proxy、可观测 trace、线程持久化、工具审批）。
3. 在不扩大职责边界的前提下，提供更稳的业务接入速度。
4. 有边界意识：编排、检索、长时规划等在后端框架里完成。

## 与直接对标对象的对照

| 能力                            | AI SDK UI  | CopilotKit | LangChain.js | VueUse | vue-ai-hooks                           |
| ------------------------------- | ---------- | ---------- | ------------ | ------ | -------------------------------------- |
| Vue 优先的组合式 API            | ✅         | ⚪         | ⚪           | ✅     | ✅                                     |
| 流式状态 + 终止/重试            | ✅         | ⚪         | ⚪           | ⚪     | ✅                                     |
| 面向生产的 proxy 默认路径       | ✅         | ✅         | ⚪           | ⚪     | ✅                                     |
| 工具调用 + 审批流程             | ✅         | ✅         | ⚪           | ⚪     | ✅（含本地与线程安全）                 |
| 侧边栏 Thread 级能力            | ⚪         | ✅         | ⚪           | ⚪     | ✅                                     |
| Agent 适配能力                  | ✅（协议） | ✅         | ✅（后端）   | ⚪     | ✅（事件 + run demo + 路由模板）       |
| 能力发现与运行时上下文          | ⚪         | ⚪         | ⚪           | ⚪     | ✅                                     |
| 任务建议 / 快速提示词起点       | ⚪         | ✅         | ⚪           | ✅     | ✅（按 surface 筛选 recipes）          |
| 开箱 copilot 外壳/内置组件      | ✅         | ✅         | ⚪           | ⚪     | ⚪（只提供 starter，shell 由应用拥有） |
| 检索/长链规划/多 agent 后端规划 | ⚪         | ⚪         | ✅           | ⚪     | ⚪（后端边界）                         |

## 下一步优先闭环

1. **可观测化一致性**：确保每个 route 模板和 demo 都提供 trace、`inspect()`、重试和错误重建可复现验证。
2. **路由模板验证深度**：继续围绕可复制模板补框架定向 smoke fixture，同时不把这些框架变成依赖。当前已覆盖
   Nuxt/Nitro、Next.js、Hono、Express、Fastify、Cloudflare、Fetch 和 LangGraph resume 形态。
3. **启动提示铺设深度**：只在 demo 或产品入口确实需要任务起手时，继续补按 surface 筛选的
   prompt-suggestion recipes。

## 30 天验收门禁

竞品相关任务不能只写方向；只有映射到下列表格并通过证明命令，才算闭环。

| 门禁          | 目标                                                                     | 证明命令                                                                                                     |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| COMP-OBS      | route 模板和任务 demo 都暴露安全 trace、timeline、retry 和脱敏 curl 数据 | `pnpm demo-ux:check`、`pnpm completion-object:check`、`pnpm image:check`、`pnpm agent-route-templates:check` |
| COMP-ROUTES   | 可复制后端模板能拒绝错误载荷，并保留 run/trace metadata                  | `pnpm agent-route-templates:check`                                                                           |
| COMP-STARTERS | shell-ready 任务起点保持按 surface 筛选，并且不携带 Provider secret      | `pnpm threaded-chat:check`、`pnpm competitive-benchmark:check`                                               |

## 当前执行进度（快照：2026-07-04）

- 范围内直对标基准分：**8 / 8**
  - ✅ Vue 原生组合式 API
  - ✅ 流式状态 + 终止/重试
  - ✅ 面向生产的 proxy 路径
  - ✅ 工具调用 + 审批流程
  - ✅ Thread 侧边能力
  - ✅ Agent 运行时适配能力
  - ✅ 运行时能力发现
  - ✅ 任务建议 / 快速提示词起点
- 刻意不做：完整 copilot shell 组件属于应用层或 CopilotKit 这类产品层；
  `threaded-chat` 是可复制 starter，不是内置 shell。
- 下 30 天目标：把可观测化覆盖收口到所有 route 模板与 demo 的第一优先级，并补齐可复制后端模板的
  fixture 数量。
- 证据源：
  - `docs/guide/production-readiness-status.md`
  - `CHANGELOG.md` 0.14.x 条目
  - `pnpm production:readiness` 与 `pnpm release:check`

## 与目标的一致性

`vue-ai-hooks` 的目标不是做一套“完整 AI Shell 框架”，而是做一套可直接用于产品的
Vue-first AI 交互层。
我们只在本层内完成“最强”能力，在不该扩展的地方把工作保留给后端框架，这样才是可持续超越。
