---
title: Tool approval recipe
description: A production recipe for human approval, durable tool results, and audit-safe tool timelines.
---

# Tool approval recipe

Use this recipe when a model can request tools that affect money, accounts,
customer data, infrastructure, or any workflow that needs human approval.
`vue-ai-hooks` already exposes pending tool calls and approval helpers. Your app
should own the durable approval record, privileged execution, policy checks,
and audit trail.

The production rule is: never let the browser become the authority for a
privileged tool. The browser can render a request and submit a decision, but the
backend must validate tenant access, policy, approval state, and idempotency
before executing or rejecting the tool.

## Approval record

Store approvals outside message JSON so support, audit, and workflow systems can
query them:

| Field          | Purpose                                                       |
| -------------- | ------------------------------------------------------------- |
| `approvalId`   | Stable id for the human decision record.                      |
| `threadId`     | Conversation that produced the tool call.                     |
| `branchId`     | Optional branch path when the chat supports message branches. |
| `messageId`    | Assistant message that contains the tool call.                |
| `toolCallId`   | Model-provided tool call id, matched to `pendingToolCalls`.   |
| `toolName`     | Registered tool name such as `chargeCard` or `createTicket`.  |
| `argsSnapshot` | Redacted copy of arguments shown to the reviewer.             |
| `decision`     | `pending`, `approved`, `rejected`, `expired`, or `cancelled`. |
| `decidedBy`    | User, service account, or policy rule that made the decision. |
| `runId`        | Idempotency key for one execution attempt.                    |
| `revision`     | Optimistic concurrency token for the approval record.         |
| `traceId`      | Support trace id for logs and `inspectRequestTrace()` output. |

Do not store provider credentials or raw secrets in `argsSnapshot`. If a tool
needs a secret, store a reference to a server-side resource and resolve it only
inside the backend executor.

## Route contract

Start with a small backend-owned approval API:

```txt
GET  /api/chat/threads/:threadId/approvals
POST /api/chat/threads/:threadId/approvals
POST /api/chat/approvals/:approvalId/approve
POST /api/chat/approvals/:approvalId/reject
POST /api/chat
```

`POST /api/chat/threads/:threadId/approvals` creates or upserts a pending
approval from the latest assistant tool call:

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

Approve and reject routes should return the tool result payload that the browser
will pass to `addToolApprovalResponse()`, `approveToolCall()`, or
`rejectToolCall()`:

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

The backend may execute the tool immediately after approval, or it can record
the approval decision and let a worker execute the tool. In both cases, return a
stable result or rejection reason to the chat UI.

## Decision contract

Make approve and reject routes idempotent and revision-safe:

| Scenario                         | Response contract                                                            |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Fresh decision accepted          | `200`, `status: "accepted"`, updated `revision`, and safe result or reason.  |
| Same `runId` replayed            | `200`, `status: "replayed"`, same result or reason, and no second execution. |
| Stale `revision` with new run id | `409`, `error: "approval_revision_conflict"`, and `latestRevision`.          |
| Approval already final           | `409`, `error: "approval_already_final"`, current decision, and trace id.    |
| Approval expired or cancelled    | `200`, `status: "expired"` or `"cancelled"`, with a safe rejection reason.   |

For a stale reviewer tab, return a conflict instead of executing the tool:

```json
{
  "error": "approval_revision_conflict",
  "approvalId": "appr_123",
  "latestRevision": 4,
  "traceId": "trace_abc"
}
```

One `runId` should create at most one tool execution. Replayed requests should
return the stored decision payload so the browser can safely retry after a
network failure.

## Renderer contract

Render tool calls from `pendingToolCalls` with a narrow UI contract. Keep the
display data redacted and deterministic:

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

Create view models on the server when possible. If the browser maps a raw tool
call to a view, whitelist fields per `toolName` and never render arbitrary JSON
values directly into a privileged approval panel.

## Browser wiring

For browser-local demos, `approveToolCall()` can run a registered local handler.
For production tools, prefer a backend decision route and then append the
backend result to the chat:

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

Use `sendAutomaticallyWhen: false` if the reviewer should approve several tool
calls first, then call `sendMessage()` after all results are recorded. Use
`stopWhen` when a policy should stop the automatic tool loop after a specific
result.

## Backend checks

- Validate session, tenant, thread, branch, approval ownership, and tool access
  before changing an approval.
- Reject stale `revision` values with `409` and a user-safe retry message.
- Treat `runId` as an idempotency key. A repeated approve request should not
  execute a billing, email, ticket, or infrastructure tool twice.
- Store the full decision record: requester, reviewer, timestamps, redacted
  arguments, result summary, trace id, and policy version.
- Keep privileged tool credentials server-side. The browser should never receive
  provider keys, billing secrets, or infrastructure tokens.
- Normalize tool failures into safe result objects or `tool-error` events. Do
  not render raw stack traces or upstream error bodies to end users.
- Expire old pending approvals and append a rejected tool result when the model
  needs to continue with that state.

## Production smoke test

Before enabling the feature for real tools:

1. Run `pnpm build && pnpm tool-approval:check` to verify the published entry
   can pause, approve, reject, continue, inspect approval metadata, replay the
   same `runId`, and reject stale `revision` values.
2. Run `pnpm example:chat` and click **Run approval demo**.
3. Trigger a pending `chargeCard` request and confirm the UI shows only redacted
   fields.
4. Approve once, reload the thread, and confirm the approval remains approved.
5. Repeat the same approve request with the same `runId` and confirm the tool
   is not executed twice.
6. Reject a second approval and confirm the model receives a tool result with a
   safe reason.
7. Capture `inspectRequestTrace()` and confirm `approvalId`, `toolCallId`,
   `runId`, and `traceId` are present without secrets.
8. Confirm backend logs can answer who approved what, when, in which thread, and
   with which policy version.

Keep the UI behind an internal flag until this smoke test passes against your
real backend route.
