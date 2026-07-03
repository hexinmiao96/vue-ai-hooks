# useAgentRun

面向应用自有 agent runtime 的无 UI agent run 状态。

它不渲染 copilot UI、不执行工具，也不会替你调用 Provider。当后端已经能输出
`AgentEvent` stream，而 Vue 应用需要一层状态来管理 run status、归一后的 assistant
messages、stream data、interrupt 和 resume 请求时使用它。

公开导出：`useAgentRun`、`AgentRunRequest`、`AgentRunRequestInfo`、
`AgentRunResponseInfo`、`AgentRunInspectionSnapshot`、`AgentRunHandler`、
`AgentRunStatus`、`AgentRunFinishInfo`、`StartAgentRunOptions`、
`ResumeAgentRunOptions`、`UseAgentRunOptions` 和 `UseAgentRunReturn`。

## 用法

```ts
import { useAgentRun, type AgentEvent } from 'vue-ai-hooks'

async function* runCheckoutAgent(prompt: string, signal: AbortSignal): AsyncGenerator<AgentEvent> {
  yield { type: 'message-delta', delta: '正在检查订单...' }
  yield { type: 'progress', id: 'lookup', label: '查询账户' }
  yield {
    type: 'interrupt',
    id: 'approval_1',
    name: 'approveCharge',
    value: { amount: 49 }
  }
}

const agent = useAgentRun<string, { approved: boolean }>({
  async run({ input, resume, interrupt, signal }) {
    if (resume && interrupt?.name === 'approveCharge') {
      return [
        { type: 'message-delta', delta: resume.approved ? '已批准。' : '已取消。' },
        { type: 'finish', finishReason: 'stop' }
      ]
    }

    return runCheckoutAgent(input ?? '', signal)
  }
})

await agent.start('向客户扣款')

if (agent.hasInterrupt.value) {
  await agent.resume({ approved: true })
}
```

`messages`、`streamData`、`chunks` 和 `usage` 都通过和自定义 Provider、proxy 路由相同的
`agentEventToChatChunk()` adapter 推导，因此可以复用 `useChat` 的 `Message.parts`
渲染器。

## 选项

| 名称                | 类型                   | 默认值                 | 说明                                                                         |
| ------------------- | ---------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| `run`               | `AgentRunHandler`      | 必填                   | 应用自有 runner。会收到 `input`、`resume`、pending `interrupt` 和 `signal`。 |
| `id`                | `string`               | 自动生成               | composable 的稳定 id。                                                       |
| `generateId`        | `IdGenerator`          | `generateId`           | 覆盖 run、assistant 和 data id 生成方式。                                    |
| `progressDataType`  | `data-${string}`       | `data-agent-progress`  | progress 事件的 data part 类型。                                             |
| `interruptDataType` | `data-${string}`       | `data-agent-interrupt` | interrupt 事件的 data part 类型。                                            |
| `errorDataType`     | `data-${string}`       | `data-agent-error`     | 不抛出 agent error 事件的 data part 类型。                                   |
| `onEvent`           | `(AgentEvent) => void` | -                      | 每个原始 agent event 转换前调用。                                            |
| `onChunk`           | `(ChatChunk) => void`  | -                      | 每个归一后的 chat chunk 调用。                                               |
| `onFinish`          | `(info) => void`       | -                      | stream 正常结束后调用，`status` 为 `'completed' \| 'interrupted'`。          |
| `onError`           | `(Error) => void`      | -                      | 非 abort runner 错误时调用。                                                 |

## 返回值

| 属性                  | 类型                                | 说明                                                                                  |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| `id`                  | `Ref<string>`                       | composable id。                                                                       |
| `currentRunId`        | `Ref<string \| null>`               | 最近一次 `start()` 或 `resume()` 的 run id。                                          |
| `status`              | `Ref<AgentRunStatus>`               | `idle`、`running`、`streaming`、`interrupted`、`completed`、`error` 或 `aborted`。    |
| `isLoading`           | `ComputedRef<boolean>`              | status 为 `running` 或 `streaming` 时是 `true`。                                      |
| `events`              | `Ref<AgentEvent[]>`                 | runner 返回的原始事件。                                                               |
| `chunks`              | `Ref<ChatChunk[]>`                  | 由事件推导出的归一化 chunks。                                                         |
| `messages`            | `Ref<Message[]>`                    | 由文本、工具、source、file 和 data parts 组成的 assistant messages。                  |
| `streamData`          | `Ref<StreamDataPart[]>`             | progress、interrupt、tool result、source、file 或 error 事件产生的非 transient data。 |
| `usage`               | `Ref<TokenUsage \| null>`           | finish 事件里的最新 usage。                                                           |
| `error`               | `Ref<Error \| null>`                | 最近一次非 abort runner 错误。                                                        |
| `lastRequest`         | `Ref<AgentRunRequestInfo \| null>`  | 最近一次 start/resume 请求快照，用于本地 trace 检查。                                 |
| `lastResponse`        | `Ref<AgentRunResponseInfo \| null>` | 最近一次事件/chunk/message 计数快照，用于本地 trace 检查。                            |
| `interrupt`           | `Ref<AgentInterruptEvent \| null>`  | 待处理的人在回路 interrupt 事件。                                                     |
| `hasInterrupt`        | `ComputedRef<boolean>`              | `interrupt` 不为 null 时是 `true`。                                                   |
| `inspect()`           | `() => AgentRunInspectionSnapshot`  | 生成包含请求、响应、事件 timeline、interrupt、usage 和错误的排障快照。                |
| `clearTrace()`        | `() => void`                        | 清空 `lastRequest` 与 `lastResponse`，不改变当前 run 输出。                           |
| `start(input, opts)`  | `(input?, opts?) => Promise<void>`  | 清空旧状态并启动新 run。                                                              |
| `resume(value, opts)` | `(resume?, opts?) => Promise<void>` | 对 pending interrupt 发送响应，并在同一条 timeline 里继续。                           |
| `stop()`              | `() => void`                        | abort 当前 runner。                                                                   |
| `clear()`             | `() => void`                        | abort 并重置所有本地 run 状态。                                                       |

## Interrupt 和 resume

`interrupt` 事件会同时写入 `interrupt.value` 和 `data-agent-interrupt` part，除非事件带有
`transient`。如果 stream 结束时还有 pending interrupt，并且没有收到 `finish` 事件，
`status` 会变成 `interrupted`。

```ts
await agent.start('运行 checkout')

if (agent.status.value === 'interrupted') {
  const request = agent.interrupt.value
  await agent.resume({ approved: request?.name === 'approveCharge' })
}
```

`resume()` 会把上一次的 `interrupt` 传回你的 `run` handler，并在读取续跑 stream 前清空
`interrupt`。它不会清空 `messages`、`events`、`chunks` 或 `streamData`，所以续跑输出会继续追加到同一条可见 timeline。

## 检查快照

`inspect()` 会返回 `AgentRunInspectionSnapshot`，内容来自 `lastRequest`、
`lastResponse`、原始 `AgentEvent` timeline、当前 `status` 和最近一次 runner `error`。它复用
chat、媒体和 capability hooks 的 `inspectRequestTrace()` 快照形态，但不会假装浏览器内部存在
Provider 请求。

```ts
const snapshot = agent.inspect()

console.log(snapshot.status)
console.log(snapshot.request?.trigger)
console.log(snapshot.response?.eventTypes)
```

`lastRequest` 会记录稳定 run id、触发方式（`start` 或 `resume`）、attempt、是否有
input/resume，以及 pending interrupt 摘要。`lastResponse` 会记录 event、chunk、message、
stream data 数量、最新事件类型、usage、interrupt 和最终 agent run 状态。需要隐藏调试信息但保留当前 run 输出时，调用 `clearTrace()`。

## Run id 重放安全

当按钮点击、网络重试或页面恢复可能重放同一个前端动作时，给 `opts.id` 传稳定值：

```ts
const runId = `checkout:${approvalId}`

await agent.start('向客户扣款', { id: runId })
await agent.start('向客户扣款', { id: runId }) // 复用进行中或已完成的本地状态
```

如果相同 run id 已经是 `running` 或 `streaming`，`start()` 会返回当前进行中的 promise，
而不会再次调用 `run`。如果相同 run id 已经是 `completed` 或 `interrupted`，`start()`
会直接 resolve，不清空本地状态，也不再次调用 `run`。`error` 和 `aborted` 状态仍可用同一
id 重试。后端持久化、幂等和审计记录仍然属于你的应用自有 agent runtime。

## 适用场景

当浏览器负责 run 按钮和审批 UI，而后端负责规划、检索、工具执行、checkpoint 和持久审计日志时，
使用 `useAgentRun`。如果你需要的是 Provider-compatible 的 chat 表面，可以用
`readAgentEventStream()` 包装同一条 `AgentEvent` stream，再传给 `useChat()`。
