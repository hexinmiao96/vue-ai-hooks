# useAgentRun

Headless agent run state for app-owned agent runtimes.

It does not render a copilot UI, execute tools, or call a provider for you. Use
it when your backend already exposes an `AgentEvent` stream and the Vue app needs
one state layer for run status, normalized assistant messages, stream data,
interrupts, and resume requests.

Public exports: `useAgentRun`, `AgentRunRequest`, `AgentRunHandler`,
`AgentRunStatus`, `AgentRunFinishInfo`, `StartAgentRunOptions`,
`ResumeAgentRunOptions`, `UseAgentRunOptions`, and `UseAgentRunReturn`.

## Usage

```ts
import { useAgentRun, type AgentEvent } from 'vue-ai-hooks'

async function* runCheckoutAgent(prompt: string, signal: AbortSignal): AsyncGenerator<AgentEvent> {
  yield { type: 'message-delta', delta: 'Checking the order...' }
  yield { type: 'progress', id: 'lookup', label: 'Looking up account' }
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
        { type: 'message-delta', delta: resume.approved ? 'Approved.' : 'Cancelled.' },
        { type: 'finish', finishReason: 'stop' }
      ]
    }

    return runCheckoutAgent(input ?? '', signal)
  }
})

await agent.start('charge the customer')

if (agent.hasInterrupt.value) {
  await agent.resume({ approved: true })
}
```

`messages`, `streamData`, `chunks`, and `usage` are derived with the same
`agentEventToChatChunk()` adapter used by custom providers and proxy routes, so
you can reuse `Message.parts` renderers from `useChat`.

## Options

| Name                | Type                   | Default                | Description                                                                      |
| ------------------- | ---------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| `run`               | `AgentRunHandler`      | required               | App-owned runner. Receives `input`, `resume`, pending `interrupt`, and `signal`. |
| `id`                | `string`               | generated              | Stable composable id.                                                            |
| `generateId`        | `IdGenerator`          | `generateId`           | Overrides generated run, assistant, and data ids.                                |
| `progressDataType`  | `data-${string}`       | `data-agent-progress`  | Data part type for progress events.                                              |
| `interruptDataType` | `data-${string}`       | `data-agent-interrupt` | Data part type for interrupt events.                                             |
| `errorDataType`     | `data-${string}`       | `data-agent-error`     | Data part type for non-throwing agent error events.                              |
| `onEvent`           | `(AgentEvent) => void` | -                      | Called for every raw agent event before conversion.                              |
| `onChunk`           | `(ChatChunk) => void`  | -                      | Called for every normalized chat chunk.                                          |
| `onFinish`          | `(info) => void`       | -                      | Called after a clean stream end with `status: 'completed' \| 'interrupted'`.     |
| `onError`           | `(Error) => void`      | -                      | Called for non-aborted runner errors.                                            |

## Return value

| Property              | Type                                | Description                                                                                    |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `id`                  | `Ref<string>`                       | Composable id.                                                                                 |
| `currentRunId`        | `Ref<string \| null>`               | Last `start()` or `resume()` run id.                                                           |
| `status`              | `Ref<AgentRunStatus>`               | `idle`, `running`, `streaming`, `interrupted`, `completed`, `error`, or `aborted`.             |
| `isLoading`           | `ComputedRef<boolean>`              | `true` while status is `running` or `streaming`.                                               |
| `events`              | `Ref<AgentEvent[]>`                 | Raw events received from the runner.                                                           |
| `chunks`              | `Ref<ChatChunk[]>`                  | Normalized chunks derived from the events.                                                     |
| `messages`            | `Ref<Message[]>`                    | Assistant messages built from text, tool, source, file, and data parts.                        |
| `streamData`          | `Ref<StreamDataPart[]>`             | Non-transient data emitted by progress, interrupt, tool result, source, file, or error events. |
| `usage`               | `Ref<TokenUsage \| null>`           | Latest usage from a finish event.                                                              |
| `error`               | `Ref<Error \| null>`                | Last non-aborted runner error.                                                                 |
| `interrupt`           | `Ref<AgentInterruptEvent \| null>`  | Pending human-in-the-loop interrupt event.                                                     |
| `hasInterrupt`        | `ComputedRef<boolean>`              | `true` when `interrupt` is not null.                                                           |
| `start(input, opts)`  | `(input?, opts?) => Promise<void>`  | Clears previous state and starts a new run.                                                    |
| `resume(value, opts)` | `(resume?, opts?) => Promise<void>` | Sends a response for the pending interrupt and continues the same timeline.                    |
| `stop()`              | `() => void`                        | Aborts the active runner.                                                                      |
| `clear()`             | `() => void`                        | Aborts and resets all local run state.                                                         |

## Interrupt and resume

An `interrupt` event becomes both `interrupt.value` and a `data-agent-interrupt`
part unless it is marked `transient`. If the stream ends while an interrupt is
still pending and no `finish` event arrived, `status` becomes `interrupted`.

```ts
await agent.start('run checkout')

if (agent.status.value === 'interrupted') {
  const request = agent.interrupt.value
  await agent.resume({ approved: request?.name === 'approveCharge' })
}
```

`resume()` passes the previous `interrupt` back into your `run` handler and then
clears `interrupt` before reading the resumed stream. It does not clear
`messages`, `events`, `chunks`, or `streamData`, so the resumed output continues
the same visible timeline.

## When to use it

Use `useAgentRun` when the browser owns the run button and approval UI, but your
backend owns planning, retrieval, tool execution, checkpoints, and durable audit
logs. If you need a provider-compatible chat surface instead, wrap the same
`AgentEvent` stream with `readAgentEventStream()` and pass it to `useChat()`.
