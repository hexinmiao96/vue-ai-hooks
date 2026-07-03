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
    expect(agent.lastRequest.value).toMatchObject({
      id: 'run_1',
      providerId: 'agent-run',
      trigger: 'start',
      attempt: 1,
      hasInput: true,
      hasResume: false,
      hasInterrupt: false,
      input: { prompt: 'hi' }
    })
    expect(agent.lastResponse.value).toMatchObject({
      id: 'run_1',
      providerId: 'agent-run',
      status: 'completed',
      hasStream: true,
      eventCount: 7,
      chunkCount: 7,
      messageCount: 1,
      latestEventType: 'finish',
      usage: { promptTokens: 2, completionTokens: 3, totalTokens: 5 }
    })
    const inspection = agent.inspect()
    expect(inspection).toMatchObject({
      status: 'completed',
      providerId: 'agent-run',
      attempt: 1,
      hasRequest: true,
      hasResponse: true,
      hasStream: true,
      request: expect.objectContaining({ id: 'run_1', trigger: 'start' }),
      response: expect.objectContaining({ id: 'run_1', eventCount: 7 }),
      providerTrace: expect.objectContaining({
        providerId: 'agent-run',
        requestKeys: expect.arrayContaining(['id', 'trigger', 'attempt']),
        responseKeys: expect.arrayContaining(['eventCount', 'eventTypes', 'status'])
      })
    })
    expect(inspection.timeline.filter((event) => event.kind === 'stream')).toHaveLength(7)
    expect(inspection.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'stream',
          label: 'agent tool-call',
          metadata: expect.objectContaining({ id: 'call_1', name: 'lookup' })
        })
      ])
    )
    agent.clearTrace()
    expect(agent.lastRequest.value).toBeNull()
    expect(agent.lastResponse.value).toBeNull()
    expect(agent.messages.value[0]?.content).toBe('Hello world')
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

  it('reuses in-flight and completed state for duplicate run ids', async () => {
    let releaseRun: () => void = () => {}
    const runReleased = new Promise<void>((resolve) => {
      releaseRun = resolve
    })
    const run = vi.fn<AgentRunHandler<string>>(({ input }) => {
      return (async function* () {
        yield {
          type: 'message-delta',
          messageId: 'msg_replay',
          delta: String(input)
        }
        await runReleased
        yield { type: 'finish', finishReason: 'stop' }
      })()
    })
    const agent = useAgentRun({ run })

    const firstRun = agent.start('first', { id: 'run-replay' })
    await pause(10)
    const duplicateRun = agent.start('second', { id: 'run-replay' })

    expect(run).toHaveBeenCalledTimes(1)
    expect(agent.currentRunId.value).toBe('run-replay')

    releaseRun()
    await Promise.all([firstRun, duplicateRun])

    expect(agent.status.value).toBe('completed')
    expect(agent.messages.value).toEqual([
      expect.objectContaining({
        id: 'msg_replay',
        role: 'assistant',
        content: 'first',
        metadata: { finishReason: 'stop' }
      })
    ])

    await agent.start('third', { id: 'run-replay' })

    expect(run).toHaveBeenCalledTimes(1)
    expect(agent.messages.value[0]?.content).toBe('first')
  })

  it('ignores late events from interrupted prior run when a new run starts', async () => {
    const onEvent = vi.fn()
    const onChunk = vi.fn()
    const run: AgentRunHandler = vi.fn(({ id }: { id: string }) => {
      const source: AsyncGenerator<AgentEvent> = (async function* () {
        if (id === 'run-slow') {
          await pause(40)
          yield {
            type: 'message-delta',
            messageId: 'msg_run-slow',
            delta: 'stale'
          }
          await pause(40)
          yield { type: 'finish', finishReason: 'stop' }
          return
        }

        yield { type: 'message-delta', messageId: 'msg_run-fast', delta: 'fresh' }
        yield { type: 'finish', finishReason: 'stop' }
      })()
      return source
    })

    const agent = useAgentRun({ run, onEvent, onChunk })

    const slowRun = agent.start({}, { id: 'run-slow' })
    await pause(10)

    const fastRun = agent.start({ mode: 'fast' }, { id: 'run-fast' })
    await Promise.all([slowRun, fastRun])

    expect(run).toHaveBeenCalledTimes(2)
    expect(onEvent).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(agent.currentRunId.value).toBe('run-fast')
    expect(agent.status.value).toBe('completed')
    expect(agent.messages.value).toEqual([
      expect.objectContaining({
        id: 'msg_run-fast',
        role: 'assistant',
        content: 'fresh',
        metadata: expect.objectContaining({
          finishReason: 'stop'
        })
      })
    ])
  })

  it('clears interrupt state on clear() before starting a new run', async () => {
    const run = vi.fn(() =>
      Promise.resolve([
        {
          type: 'interrupt',
          id: 'approval',
          name: 'approval',
          value: { requiresApproval: true }
        } satisfies AgentEvent
      ])
    )
    const agent = useAgentRun({ run })

    await agent.start('checkout')
    expect(agent.hasInterrupt.value).toBe(true)
    expect(agent.currentRunId.value).toContain('agent-run-')
    expect(agent.interrupt.value).toEqual(
      expect.objectContaining({
        type: 'interrupt',
        id: 'approval'
      })
    )

    agent.clear()
    expect(agent.currentRunId.value).toBeNull()
    expect(agent.status.value).toBe('idle')
    expect(agent.interrupt.value).toBeNull()
    expect(agent.hasInterrupt.value).toBe(false)

    await agent.start('checkout-2', { id: 'run-clean' })

    expect(run).toHaveBeenCalledTimes(2)
    expect(run).toHaveBeenLastCalledWith({
      id: 'run-clean',
      input: 'checkout-2',
      resume: undefined,
      interrupt: undefined,
      signal: expect.any(AbortSignal)
    })
  })
})
