import { describe, expect, it, vi } from 'vitest'
import { useAgentRun, type AgentRunHandler } from '../src/composables/useAgentRun'
import type { AgentEvent } from '../src/utils/agentEvents'

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('useAgentRun', () => {
  it('runs app-owned agent events as Vue state and normalized assistant messages', async () => {
    const onEvent = vi.fn()
    const onChunk = vi.fn()
    const onFinish = vi.fn()
    const run = vi.fn(
      () =>
        [
          { type: 'message-delta', messageId: 'msg_1', delta: 'Hello ' },
          { type: 'message-delta', messageId: 'msg_1', delta: 'world' },
          { type: 'progress', id: 'step_1', label: 'Searching', value: 0.5 },
          { type: 'tool-call', id: 'call_1', name: 'lookup', input: { q: 'vue' } },
          { type: 'tool-result', id: 'call_1', name: 'lookup', output: { ok: true } },
          { type: 'source', id: 'source_1', url: 'https://example.test/docs', title: 'Docs' },
          {
            type: 'finish',
            usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
            metadata: { model: 'agent-test' }
          }
        ] satisfies AgentEvent[]
    )
    const agent = useAgentRun<{ prompt: string }>({
      id: 'agent',
      run,
      onEvent,
      onChunk,
      onFinish
    })

    await agent.start({ prompt: 'hi' }, { id: 'run_1' })

    expect(run).toHaveBeenCalledWith({
      id: 'run_1',
      input: { prompt: 'hi' },
      resume: undefined,
      interrupt: undefined,
      signal: expect.any(AbortSignal)
    })
    expect(agent.status.value).toBe('completed')
    expect(agent.currentRunId.value).toBe('run_1')
    expect(agent.hasInterrupt.value).toBe(false)
    expect(agent.events.value).toHaveLength(7)
    expect(agent.chunks.value).toHaveLength(7)
    expect(agent.streamData.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'step_1',
          type: 'data-agent-progress',
          data: { id: 'step_1', label: 'Searching', value: 0.5 }
        }),
        expect.objectContaining({
          id: 'call_1',
          type: 'tool-output-available',
          data: { toolCallId: 'call_1', toolName: 'lookup', output: { ok: true } }
        })
      ])
    )
    expect(agent.messages.value).toEqual([
      expect.objectContaining({
        id: 'msg_1',
        role: 'assistant',
        content: 'Hello world',
        toolCalls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q":"vue"}' }
          }
        ],
        metadata: {
          finishReason: 'stop',
          usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 },
          model: 'agent-test'
        }
      })
    ])
    expect(agent.messages.value[0]?.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'data-agent-progress', id: 'step_1' }),
        expect.objectContaining({
          type: 'tool-lookup',
          toolCallId: 'call_1',
          state: 'output-available',
          output: { ok: true }
        }),
        expect.objectContaining({
          type: 'source',
          id: 'source_1',
          url: 'https://example.test/docs'
        })
      ])
    )
    expect(agent.usage.value).toEqual({ promptTokens: 2, completionTokens: 3, totalTokens: 5 })
    expect(onEvent).toHaveBeenCalledTimes(7)
    expect(onChunk).toHaveBeenCalledTimes(7)
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'run_1',
        status: 'completed',
        usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 }
      })
    )
  })

  it('keeps interrupt state until the caller resumes the agent run', async () => {
    const calls: unknown[] = []
    const onFinish = vi.fn()
    const run: AgentRunHandler<string, { approved: boolean }> = (request) => {
      calls.push({
        id: request.id,
        input: request.input,
        resume: request.resume,
        interrupt: request.interrupt
      })
      if (request.resume) {
        return [
          { type: 'message-delta', delta: 'Approved.' },
          { type: 'finish', finishReason: 'stop' }
        ] satisfies AgentEvent[]
      }
      return [
        {
          type: 'interrupt',
          id: 'approval_1',
          name: 'approveCharge',
          value: { amount: 49 }
        }
      ] satisfies AgentEvent[]
    }
    const agent = useAgentRun<string, { approved: boolean }>({ run, onFinish })

    await agent.start('start checkout', { id: 'run_start' })

    expect(agent.status.value).toBe('interrupted')
    expect(agent.hasInterrupt.value).toBe(true)
    expect(agent.interrupt.value).toEqual({
      type: 'interrupt',
      id: 'approval_1',
      name: 'approveCharge',
      value: { amount: 49 }
    })
    expect(agent.streamData.value).toEqual([
      expect.objectContaining({
        id: 'approval_1',
        type: 'data-agent-interrupt',
        data: {
          id: 'approval_1',
          name: 'approveCharge',
          value: { amount: 49 }
        }
      })
    ])
    expect(onFinish).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'run_start', status: 'interrupted' })
    )

    await agent.resume({ approved: true }, { id: 'run_resume' })

    expect(calls).toEqual([
      {
        id: 'run_start',
        input: 'start checkout',
        resume: undefined,
        interrupt: undefined
      },
      {
        id: 'run_resume',
        input: undefined,
        resume: { approved: true },
        interrupt: {
          type: 'interrupt',
          id: 'approval_1',
          name: 'approveCharge',
          value: { amount: 49 }
        }
      }
    ])
    expect(agent.status.value).toBe('completed')
    expect(agent.hasInterrupt.value).toBe(false)
    expect(agent.messages.value[0]).toEqual(
      expect.objectContaining({
        role: 'assistant',
        content: 'Approved.'
      })
    )
    expect(agent.messages.value[0]?.parts).toEqual([
      {
        type: 'data-agent-interrupt',
        id: 'approval_1',
        data: {
          id: 'approval_1',
          name: 'approveCharge',
          value: { amount: 49 }
        }
      }
    ])
    expect(onFinish).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'run_resume', status: 'completed' })
    )
  })

  it('surfaces non-aborted agent runner errors', async () => {
    const onError = vi.fn()
    const agent = useAgentRun({
      run: async () => {
        throw new Error('agent failed')
      },
      onError
    })

    await expect(agent.start()).rejects.toThrow('agent failed')

    expect(agent.status.value).toBe('error')
    expect(agent.error.value?.message).toBe('agent failed')
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'agent failed' }))
  })

  it('aborts an in-flight run and allows a clean restart', async () => {
    const run = vi.fn<AgentRunHandler<string>>(({ input, signal }) => {
      const key = input ?? 'anonymous'
      return (async function* () {
        yield {
          type: 'message-delta',
          messageId: `msg_${key}`,
          delta: 'first'
        }
        await pause(40)
        if (signal.aborted) return
        yield {
          type: 'message-delta',
          messageId: `msg_${key}`,
          delta: 'second'
        }
        await pause(40)
        if (signal.aborted) return
        yield { type: 'finish', finishReason: 'stop' }
      })()
    })
    const agent = useAgentRun({ run })

    const firstRun = agent.start('first')
    await pause(10)
    agent.stop()
    await firstRun

    expect(agent.status.value).toBe('aborted')
    expect(agent.messages.value).toEqual([
      expect.objectContaining({
        id: 'msg_first',
        role: 'assistant',
        content: 'first'
      })
    ])

    await agent.start('second')
    expect(run).toHaveBeenCalledTimes(2)
    expect(agent.status.value).toBe('completed')
    expect(agent.messages.value).toEqual([
      expect.objectContaining({
        id: 'msg_second',
        role: 'assistant',
        content: 'firstsecond',
        metadata: {
          finishReason: 'stop'
        }
      })
    ])
  })
})
