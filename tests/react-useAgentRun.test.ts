import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type ReactAgentRunHandler, useAgentRun } from '../src/react'
import type { AgentEvent } from '../src/utils/agentEvents'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function pause(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('react useAgentRun', () => {
  it('runs app-owned agent events as React state and normalized assistant messages', async () => {
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
    const { result } = renderHook(() =>
      useAgentRun<{ prompt: string }>({
        id: 'agent',
        run,
        onEvent,
        onChunk,
        onFinish
      })
    )

    await act(async () => {
      await result.current.start({ prompt: 'hi' }, { id: 'run_1' })
    })

    expect(run).toHaveBeenCalledWith({
      id: 'run_1',
      input: { prompt: 'hi' },
      resume: undefined,
      interrupt: undefined,
      signal: expect.any(AbortSignal)
    })
    expect(result.current.status).toBe('completed')
    expect(result.current.currentRunId).toBe('run_1')
    expect(result.current.hasInterrupt).toBe(false)
    expect(result.current.events).toHaveLength(7)
    expect(result.current.chunks).toHaveLength(7)
    expect(result.current.streamData).toEqual(
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
    expect(result.current.messages).toEqual([
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
    expect(result.current.messages[0]?.parts).toEqual(
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
    expect(result.current.usage).toEqual({ promptTokens: 2, completionTokens: 3, totalTokens: 5 })
    expect(result.current.lastRequest).toMatchObject({
      id: 'run_1',
      providerId: 'agent-run',
      trigger: 'start',
      attempt: 1,
      hasInput: true,
      hasResume: false,
      hasInterrupt: false,
      input: { prompt: 'hi' }
    })
    expect(result.current.lastResponse).toMatchObject({
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
    const inspection = result.current.inspect()
    expect(inspection).toMatchObject({
      status: 'completed',
      providerId: 'agent-run',
      attempt: 1,
      hasRequest: true,
      hasResponse: true,
      hasStream: true,
      request: expect.objectContaining({ id: 'run_1', trigger: 'start' }),
      response: expect.objectContaining({ id: 'run_1', eventCount: 7 })
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
    act(() => {
      result.current.clearTrace()
    })
    expect(result.current.lastRequest).toBeNull()
    expect(result.current.lastResponse).toBeNull()
    expect(result.current.messages[0]?.content).toBe('Hello world')
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

  it('keeps interrupt state until resume is called', async () => {
    const calls: unknown[] = []
    const onFinish = vi.fn()
    const run: ReactAgentRunHandler<string, { approved: boolean }> = ({
      id,
      input,
      resume,
      interrupt
    }) => {
      calls.push({
        id,
        input,
        resume,
        interrupt
      })

      if (resume) {
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

    const { result } = renderHook(() =>
      useAgentRun<string, { approved: boolean }>({ run, onFinish })
    )

    await act(async () => {
      await result.current.start('start checkout', { id: 'run_start' })
    })

    expect(result.current.status).toBe('interrupted')
    expect(result.current.hasInterrupt).toBe(true)
    expect(result.current.interrupt).toEqual({
      type: 'interrupt',
      id: 'approval_1',
      name: 'approveCharge',
      value: { amount: 49 }
    })
    expect(result.current.streamData).toEqual([
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

    await act(async () => {
      await result.current.resume({ approved: true }, { id: 'run_resume' })
    })

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
    expect(result.current.status).toBe('completed')
    expect(result.current.hasInterrupt).toBe(false)
    expect(result.current.messages[0]).toEqual(
      expect.objectContaining({
        role: 'assistant',
        content: 'Approved.'
      })
    )
    expect(result.current.messages[0]?.parts).toEqual([
      expect.objectContaining({
        type: 'data-agent-interrupt',
        id: 'approval_1',
        data: {
          id: 'approval_1',
          name: 'approveCharge',
          value: { amount: 49 }
        }
      })
    ])
    expect(onFinish).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'run_resume', status: 'completed' })
    )
  })

  it('surfaces non-aborted run errors', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() =>
      useAgentRun({
        run: async () => {
          throw new Error('agent failed')
        },
        onError
      })
    )

    await act(async () => {
      await expect(result.current.start()).rejects.toThrow('agent failed')
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error?.message).toBe('agent failed')
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'agent failed' }))
  })

  it('aborts an in-flight run and allows a clean restart', async () => {
    const run = vi.fn((request: Parameters<ReactAgentRunHandler<string>>[0]) => {
      const key = request.input ?? 'anonymous'
      return (async function* (): AsyncGenerator<AgentEvent> {
        yield {
          type: 'message-delta',
          messageId: `msg_${key}`,
          delta: 'first'
        }
        await pause(40)
        if (request.signal.aborted) return
        yield {
          type: 'message-delta',
          messageId: `msg_${key}`,
          delta: 'second'
        }
        await pause(40)
        if (request.signal.aborted) return
        yield { type: 'finish', finishReason: 'stop' }
      })()
    }) as ReactAgentRunHandler<string>
    const { result } = renderHook(() => useAgentRun({ run }))
    let runPromise: Promise<void>

    act(() => {
      runPromise = result.current.start('first')
    })
    await waitFor(() => {
      expect(result.current.status).toBe('running')
    })

    await pause(10)
    act(() => {
      result.current.stop()
    })
    await act(async () => {
      await runPromise
    })
    await waitFor(() => {
      expect(result.current.status).toBe('aborted')
    })

    expect(result.current.status).toBe('aborted')
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'msg_first',
        role: 'assistant',
        content: 'first'
      })
    ])

    await act(async () => {
      await result.current.start('second')
    })

    expect(run).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('completed')
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'msg_second',
        role: 'assistant',
        content: 'firstsecond',
        metadata: {
          finishReason: 'stop'
        }
      })
    ])
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('reuses in-flight and completed state for duplicate run ids', async () => {
    let releaseRun: () => void = () => {}
    const runReleased = new Promise<void>((resolve) => {
      releaseRun = resolve
    })
    const run = vi.fn<ReactAgentRunHandler<string>>(({ input }) => {
      return (async function* (): AsyncGenerator<AgentEvent> {
        yield {
          type: 'message-delta',
          messageId: 'msg_replay',
          delta: String(input)
        }
        await runReleased
        yield { type: 'finish', finishReason: 'stop' }
      })()
    })
    const { result } = renderHook(() => useAgentRun({ run }))
    let firstRun: Promise<void> = Promise.resolve()
    let duplicateRun: Promise<void> = Promise.resolve()

    act(() => {
      firstRun = result.current.start('first', { id: 'react-run-replay' })
    })
    await waitFor(() => {
      expect(result.current.status).toBe('streaming')
    })

    act(() => {
      duplicateRun = result.current.start('second', { id: 'react-run-replay' })
    })

    expect(run).toHaveBeenCalledTimes(1)
    expect(result.current.currentRunId).toBe('react-run-replay')

    releaseRun()
    await act(async () => {
      await Promise.all([firstRun, duplicateRun])
    })

    expect(result.current.status).toBe('completed')
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'msg_replay',
        role: 'assistant',
        content: 'first',
        metadata: { finishReason: 'stop' }
      })
    ])

    await act(async () => {
      await result.current.start('third', { id: 'react-run-replay' })
    })

    expect(run).toHaveBeenCalledTimes(1)
    expect(result.current.messages[0]?.content).toBe('first')
  })

  it('ignores late events from interrupted prior run when a new run starts', async () => {
    const onEvent = vi.fn()
    const onChunk = vi.fn()
    const run = vi.fn<ReactAgentRunHandler>(({ id }) => {
      return (async function* (): AsyncGenerator<AgentEvent> {
        if (id === 'react-run-slow') {
          await pause(40)
          yield { type: 'message-delta', messageId: 'msg_react-run-slow', delta: 'stale' }
          await pause(40)
          yield { type: 'finish', finishReason: 'stop' }
          return
        }

        yield { type: 'message-delta', messageId: 'msg_react-run-fast', delta: 'fresh' }
        yield { type: 'finish', finishReason: 'stop' }
      })()
    })

    const { result } = renderHook(() => useAgentRun({ run, onEvent, onChunk }))

    let slowRun: Promise<void> = Promise.resolve()
    act(() => {
      slowRun = result.current.start({}, { id: 'react-run-slow' })
    })
    await pause(10)

    await act(async () => {
      await result.current.start({ mode: 'fast' }, { id: 'react-run-fast' })
    })
    await slowRun

    expect(run).toHaveBeenCalledTimes(2)
    expect(onEvent).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(result.current.currentRunId).toBe('react-run-fast')
    expect(result.current.status).toBe('completed')
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        id: 'msg_react-run-fast',
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
    const { result } = renderHook(() => useAgentRun({ run }))

    await act(async () => {
      await result.current.start('checkout')
    })

    expect(result.current.hasInterrupt).toBe(true)
    expect(result.current.currentRunId).toContain('agent-run-')
    expect(result.current.interrupt).toEqual(
      expect.objectContaining({
        type: 'interrupt',
        id: 'approval'
      })
    )

    act(() => {
      result.current.clear()
    })

    expect(result.current.currentRunId).toBeNull()
    expect(result.current.status).toBe('idle')
    expect(result.current.interrupt).toBeNull()
    expect(result.current.hasInterrupt).toBe(false)

    await act(async () => {
      await result.current.start('checkout-2', { id: 'run-clean' })
    })

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
