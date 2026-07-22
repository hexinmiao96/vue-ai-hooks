# 竞品基准 v2

本页不按功能数量排名，而是定义可量化结果，用于证明 `vue-ai-hooks` 在哪里更强、哪里应保持克制。

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

## 结果基准

功能覆盖只作为支撑证据，不再作为分数。只有相关结果在可重复 fixture 或现有宿主应用中被测量，竞品任务才算完成。

| 维度     | 当前基线                                                  | 下一目标                                                                      | 必需证据                                                    |
| -------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 开发体验 | no-key starter 和文档化的 15 分钟首次聊天目标             | 10 分钟内发出第一条本地消息，30 分钟内完成生产 proxy 接入                     | 记录安装、首次消息和 proxy 检查点的干净宿主计时结果         |
| 耐久性   | `resumeStream()`、线程持久化、run id 重放安全和客户端中止 | 刷新或断网恢复不重复输出；显式取消只终止一次当前上游 run                      | 覆盖刷新、重连、过期、旧取消和双标签页的浏览器 smoke        |
| Agent UX | 消息、进度、工具、文件、来源、interrupt 和 finish 事件    | 类型化 state snapshot/delta、工具输出流、steering、reasoning summary 和子 run | 覆盖顺序、重放、脱敏以及 Vue/React 投影一致性的事件 fixture |
| 可观测性 | 安全 trace、timeline、重试、Provider metadata 和脱敏 curl | 仅凭一份安全 inspection snapshot 定位首次 proxy 失败                          | 故障 fixture 和宿主应用诊断记录                             |
| 采用     | 干净 Vite、Nuxt、业务 proxy 和固定 OSS smoke 证据         | 一个现有业务应用完成 chat、proxy、持久化、恢复和 inspection                   | 包含命令、耗时、摩擦点和结果的版本化宿主记录                |

## 交付门禁

竞品相关任务不能只写方向；只有映射到下列表格并通过证明命令，才算闭环。

| 门禁          | 目标                                                                     | 证明命令                                                                                                     |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| COMP-DX       | 干净宿主计时检查点证明首次消息与 proxy 接入目标                          | `pnpm oss-adoption:check`、`pnpm competitive-benchmark:check`                                                |
| COMP-DURABLE  | 刷新、重连、过期、显式取消和旧 run 竞态可以重复验证                      | 计划在 1.1 提供：`pnpm durable-chat:check`                                                                   |
| COMP-AGENT    | Headless agent 事件保持顺序、重放安全、脱敏和框架投影                    | 计划在 1.2 提供：`pnpm agent-protocol:check`                                                                 |
| COMP-OBS      | route 模板和任务 demo 都暴露安全 trace、timeline、retry 和脱敏 curl 数据 | `pnpm demo-ux:check`、`pnpm completion-object:check`、`pnpm image:check`、`pnpm agent-route-templates:check` |
| COMP-ADOPTION | 现有业务应用完成生产路径，且浏览器不保存 Provider secret                 | `pnpm oss-adoption:check` 加 `docs/zh/guide/adoption-evidence.md` 中的版本化记录                             |

## P0 基线（快照：2026-07-22）

- 原有 **8 / 8** 功能覆盖清单保留在上方，但不再作为竞品分数。
- 开发体验和采用已经有可重复 smoke 基础设施，但目标耗时尚未全部形成实测证据。
- Durable chat 已有客户端 resume 原语，但还没有 `COMP-DURABLE` 要求的显式取消、过期、旧 run 和多标签页 fixture。
- Agent adapter 尚未覆盖完整的 `COMP-AGENT` 事件集合。
- 刻意不做：完整 copilot shell 组件属于应用层或 CopilotKit 这类产品层；
  `threaded-chat` 是可复制 starter，不是内置 shell。
- 下一里程碑：1.1 先交付 `COMP-DURABLE`，再扩大公共 AgentEvent 表面。

## 与目标的一致性

`vue-ai-hooks` 的目标不是做一套“完整 AI Shell 框架”，而是做一套可直接用于产品的
Vue-first AI 交互层。
我们只在本层内完成“最强”能力，在不该扩展的地方把工作保留给后端框架，这样才是可持续超越。
