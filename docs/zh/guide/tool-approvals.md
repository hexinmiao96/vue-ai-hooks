---
title: 工具审批配方
description: 面向人工审批、持久工具结果和可审计工具时间线的生产接入配方。
---

# 工具审批配方

当模型可以请求会影响金额、账号、客户数据、基础设施或其他需要人工确认的流程时，使用这份配方。
`vue-ai-hooks` 已经暴露 pending tool calls 和审批 helper；持久审批记录、特权执行、策略校验和审计轨迹应由你的应用负责。

生产规则是：不要让浏览器成为特权工具的权威执行方。浏览器可以渲染请求并提交决策，但后端必须在执行或拒绝工具前校验 tenant 权限、策略、审批状态和幂等性。

## 审批记录

审批记录不要只放在 message JSON 里，否则支持、审计和工作流系统很难查询：

| 字段           | 用途                                                          |
| -------------- | ------------------------------------------------------------- |
| `approvalId`   | 人工决策记录的稳定 id。                                       |
| `threadId`     | 产生工具调用的会话。                                          |
| `branchId`     | 支持消息分支时的可选 branch path。                            |
| `messageId`    | 包含工具调用的 assistant 消息。                               |
| `toolCallId`   | 模型产生的工具调用 id，对应 `pendingToolCalls`。              |
| `toolName`     | 注册工具名，例如 `chargeCard` 或 `createTicket`。             |
| `argsSnapshot` | 展示给审批人的脱敏参数快照。                                  |
| `decision`     | `pending`、`approved`、`rejected`、`expired` 或 `cancelled`。 |
| `decidedBy`    | 做出决策的用户、服务账号或策略规则。                          |
| `runId`        | 单次执行尝试的幂等 key。                                      |
| `revision`     | 审批记录的乐观并发 token。                                    |
| `traceId`      | 支持日志和 `inspectRequestTrace()` 输出里的排查 trace id。    |

不要在 `argsSnapshot` 里保存 Provider 凭据或原始 secret。如果工具需要 secret，只保存服务端资源引用，并只在后端 executor 内解析。

## 路由契约

先从一组后端持有的审批 API 开始：

```txt
GET  /api/chat/threads/:threadId/approvals
POST /api/chat/threads/:threadId/approvals
POST /api/chat/approvals/:approvalId/approve
POST /api/chat/approvals/:approvalId/reject
POST /api/chat
```

`POST /api/chat/threads/:threadId/approvals` 根据最新 assistant tool call 创建或 upsert
pending approval：

```json
{
  "branchId": "branch_main",
  "messageId": "msg_assistant_42",
  "toolCallId": "call_charge_1",
  "toolName": "chargeCard",
  "argsSnapshot": {
    "orderId": "order_123",
    "amount": 49,
    "currency": "USD"
  },
  "runId": "approval_run_001",
  "revision": 3
}
```

approve 和 reject 路由应返回浏览器要传给 `addToolApprovalResponse()`、`approveToolCall()`
或 `rejectToolCall()` 的工具结果 payload：

```json
{
  "approvalId": "appr_123",
  "toolCallId": "call_charge_1",
  "approved": true,
  "result": {
    "status": "approved",
    "receiptId": "receipt_987"
  },
  "revision": 4,
  "traceId": "trace_abc"
}
```

后端可以在审批通过后立即执行工具，也可以先记录审批决策，再交给 worker 执行。两种方式都要向聊天 UI 返回稳定的结果或拒绝原因。

## Renderer contract

用很窄的 UI contract 渲染 `pendingToolCalls`。展示数据要脱敏且可预测：

```ts
type ToolApprovalView = {
  approvalId: string
  toolCallId: string
  toolName: string
  title: string
  fields: Array<{ label: string; value: string }>
  risk: 'low' | 'medium' | 'high'
  decision: 'pending' | 'approved' | 'rejected'
  traceId?: string
}
```

尽量在服务端生成 view model。如果浏览器要把原始 tool call 映射成 view，也要按 `toolName`
白名单字段，不要把任意 JSON 值直接渲染进特权审批面板。

## 浏览器接入

本地 demo 可以用 `approveToolCall()` 运行注册的本地 handler。生产工具建议先走后端决策路由，再把后端结果追加回聊天：

```ts
import { inspectRequestTrace, useChat } from 'vue-ai-hooks'

const chat = useChat({
  api: '/api/chat',
  credentials: 'include',
  requiresToolApproval(_args, context) {
    return context.toolCall.function.name === 'chargeCard'
  }
})

async function approve(approvalId: string, toolCallId: string) {
  const decision = await approveToolOnServer(approvalId)

  await chat.addToolApprovalResponse(
    {
      id: toolCallId,
      approved: true,
      result: decision.result
    },
    {
      body: {
        approvalId,
        runId: decision.runId,
        revision: decision.revision,
        traceId: decision.traceId
      }
    }
  )
}

async function reject(approvalId: string, toolCallId: string, reason: string) {
  const decision = await rejectToolOnServer(approvalId, reason)

  await chat.addToolApprovalResponse(
    {
      id: toolCallId,
      approved: false,
      reason: decision.reason
    },
    {
      body: {
        approvalId,
        runId: decision.runId,
        revision: decision.revision,
        traceId: decision.traceId
      }
    }
  )
}

const trace = inspectRequestTrace({
  lastRequest: chat.lastRequest.value,
  lastResponse: chat.lastResponse.value,
  error: chat.error.value,
  status: chat.status.value,
  curl: true
})
```

如果审批人需要先处理多条工具调用，再统一继续对话，可以设置 `sendAutomaticallyWhen: false`，
等所有结果写入后调用 `sendMessage()`。如果某个策略命中后应停止自动工具循环，用 `stopWhen`。

## 后端检查

- 修改审批前先校验 session、tenant、thread、branch、approval ownership 和工具权限。
- 对过期 `revision` 返回 `409` 和安全的重试提示。
- 把 `runId` 当作幂等 key。重复 approve 请求不能让扣款、发邮件、建工单或基础设施工具执行两次。
- 保存完整决策记录：请求人、审批人、时间戳、脱敏参数、结果摘要、trace id 和策略版本。
- 特权工具凭据只留在服务端。浏览器不应收到 Provider key、支付 secret 或基础设施 token。
- 工具失败要归一化成安全的结果对象或 `tool-error` event。不要把原始 stack trace 或上游错误体渲染给终端用户。
- 过期 pending approval 要自动失效，并在模型需要继续时追加一个 rejected tool result。

## Production smoke test

开放真实工具前先验证：

1. 运行 `pnpm example:chat`，点击 **Run approval demo**。
2. 触发 pending `chargeCard` 请求，确认 UI 只展示脱敏字段。
3. 审批通过一次，刷新 thread，确认审批状态仍为 approved。
4. 用同一个 `runId` 重复 approve 请求，确认工具没有执行两次。
5. 拒绝第二个审批，确认模型收到带安全原因的 tool result。
6. 捕获 `inspectRequestTrace()`，确认包含 `approvalId`、`toolCallId`、`runId` 和
   `traceId`，且没有 secret。
7. 确认后端日志可以回答谁在何时、哪个 thread、用哪个策略版本批准了什么。

这条 smoke test 在真实后端路由上通过前，把 UI 留在内部 flag 后面。
