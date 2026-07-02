---
title: Regenerate branches recipe
description: A production recipe for retrying assistant turns and branching chat history without overwriting audit history.
---

# Regenerate branches recipe

Use this recipe when a product needs "try again", "branch from here", or
"compare another answer" on top of stored chat threads. `vue-ai-hooks` owns the
browser chat lifecycle. Your backend should own durable branch records, tenant
authorization, optimistic concurrency, audit retention, and provider traces.

The core rule is simple: do not mutate an old assistant message in place. Create
a new run, store the generated assistant message on the active `branchId`, and
keep the original path available for restore or audit.

## Data model

Keep thread indexes, message bodies, and branch metadata separate:

| Field             | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `threadId`        | Stable conversation id used by `useChat({ id, threadId })`.     |
| `messageId`       | Stable id for one stored message.                               |
| `parentMessageId` | Message where a branch starts, usually the user turn before AI. |
| `branchId`        | Stable id for one visible path through the thread.              |
| `sourceMessageId` | Assistant message being regenerated or compared.                |
| `runId`           | Idempotency key for one provider attempt.                       |
| `revision`        | Optimistic concurrency token for the branch or thread.          |
| `status`          | `active`, `archived`, `failed`, or an app-specific state.       |
| `reason`          | User-visible reason such as `manual-regenerate` or `branch`.    |

Messages can still be stored with `serializeMessages()` and restored with
`deserializeMessages()`. Branch metadata is app data; keep it outside
`Message.metadata` if support, analytics, or compliance tools need to query it.

## Route contract

Start with a small app-owned contract:

```txt
GET  /api/chat/threads/:threadId/branches
POST /api/chat/threads/:threadId/branches
POST /api/chat/threads/:threadId/regenerate
PATCH /api/chat/threads/:threadId/branches/:branchId
POST /api/chat
```

`POST /api/chat/threads/:threadId/branches` creates an empty branch from a
stored message:

```json
{
  "parentMessageId": "msg_user_42",
  "sourceMessageId": "msg_assistant_42",
  "reason": "compare-answer",
  "revision": 7
}
```

Return the new branch pointer:

```json
{
  "branchId": "branch_9p8",
  "threadId": "thread_support_1",
  "parentMessageId": "msg_user_42",
  "revision": 8,
  "status": "active"
}
```

`POST /api/chat/threads/:threadId/regenerate` creates or reuses a run for an
assistant turn:

```json
{
  "branchId": "branch_9p8",
  "sourceMessageId": "msg_assistant_42",
  "runId": "run_20260702_001",
  "reason": "manual-regenerate",
  "revision": 8
}
```

The backend should return the active branch pointer before the browser calls
`useChat().regenerate()`, or it can combine branch creation and provider
streaming behind your `/api/chat` route.

## Browser wiring

Hydrate the selected branch, prune only for the provider request, and keep the
stored copy complete:

```ts
import {
  deserializeMessages,
  inspectRequestTrace,
  pruneMessages,
  serializeMessages,
  useChat
} from 'vue-ai-hooks'

const branch = await loadBranch(threadId, branchId)
const messages = deserializeMessages(branch.messages) ?? []

const chat = useChat({
  id: branch.threadId,
  threadId: branch.threadId,
  initialMessages: messages,
  api: '/api/chat',
  credentials: 'include',
  prepareSendMessagesRequest({ messages, request }) {
    return {
      ...request,
      body: {
        ...request.body,
        threadId: branch.threadId,
        branchId: branch.branchId,
        runId: crypto.randomUUID(),
        revision: branch.revision,
        messages: pruneMessages({
          messages,
          maxMessages: 24,
          keepSystem: true,
          toolCalls: 'before-last-6-messages',
          reasoning: 'before-last-6-messages'
        })
      }
    }
  }
})

async function regenerateAssistant(sourceMessageId: string) {
  const next = await createRegenerateRun({
    threadId: branch.threadId,
    branchId: branch.branchId,
    sourceMessageId,
    reason: 'manual-regenerate',
    revision: branch.revision
  })

  await chat.regenerate({
    messageId: sourceMessageId,
    body: {
      threadId: next.threadId,
      branchId: next.branchId,
      sourceMessageId,
      runId: next.runId,
      revision: next.revision
    }
  })

  await saveBranchMessages(next.branchId, serializeMessages(chat.messages.value))
}

const trace = inspectRequestTrace({
  lastRequest: chat.lastRequest.value,
  lastResponse: chat.lastResponse.value,
  error: chat.error.value,
  status: chat.status.value,
  curl: true
})
```

`regenerate({ messageId })` drops later browser messages and asks the provider to
generate from the context before that assistant turn. Your backend decides
whether that result updates the current branch, creates a sibling branch, or
stays in a temporary comparison run.

## Backend checks

- Validate session, tenant, thread ownership, branch ownership, and model access
  before reading any stored messages.
- Reject stale `revision` values with `409` and a safe retry message.
- Treat `runId` as an idempotent key. Repeated requests with the same `runId`
  should return the same stored run or safely resume the stream.
- Never overwrite the old assistant message. Store a new assistant message with
  its own `messageId`, `branchId`, `runId`, `sourceMessageId`, and timestamps.
- Store provider trace ids, token usage, finish reason, latency, and sanitized
  error category. Do not store provider credentials in branch or message JSON.
- Persist final messages only after the stream finishes, or mark the run as
  `failed` or `aborted` with enough trace data to support triage.
- Use `safeValidateMessages()` before hydrating messages that came from a
  database, import job, or older app version.

## Restore smoke test

Before exposing the UI:

1. Create a thread and send one prompt.
2. Regenerate the assistant message with a new `runId`.
3. Branch from the same user message and generate a different answer.
4. Reload the thread, select the original branch, and confirm the old answer is
   still present.
5. Select the new branch and confirm `branchId`, `revision`, and `Date` values
   restore correctly.
6. Capture an `inspectRequestTrace()` snapshot and confirm it includes
   `threadId`, `branchId`, `runId`, and no provider secrets.
7. Repeat the regenerate request with the same `runId` and confirm the backend
   returns the same run instead of creating duplicate assistant messages.

If this smoke test fails, keep the feature behind an internal flag. Broken
branch restore is harder to repair after real users start depending on it.
