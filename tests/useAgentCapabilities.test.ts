import { describe, expect, it, vi } from 'vitest'
import {
  extractAgentCapabilities,
  summarizeAgentCapabilities,
  useAgentCapabilities,
  type AgentCapabilities
} from '../src/composables/useAgentCapabilities'

describe('useAgentCapabilities', () => {
  it('loads runtime info capabilities and derives support flags', async () => {
    const capabilities: AgentCapabilities = {
      identity: { name: 'Billing agent', type: 'langgraph', version: '1.0.0' },
      transport: { streaming: true, resumable: true },
      tools: {
        supported: true,
        clientProvided: true,
        parallelCalls: true,
        items: [{ name: 'lookupInvoice', parameters: { type: 'object' } }]
      },
      output: { structuredOutput: true },
      state: { snapshots: true, deltas: true, persistentState: true },
      multiAgent: { subAgents: [{ name: 'collector' }] },
      reasoning: { supported: true },
      multimodal: { input: { image: true }, output: { audio: true } },
      execution: { codeExecution: true },
      humanInTheLoop: { supported: true, approvals: true, interrupts: true },
      custom: { rateLimit: { maxRequestsPerMinute: 60 } }
    }
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ capabilities }), {
          headers: { 'Content-Type': 'application/json' }
        })
    )
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const onSuccess = vi.fn()
    const agent = useAgentCapabilities<AgentCapabilities>({
      baseURL: 'https://agent.example.test',
      headers: () => ({ 'X-Session': 'session_1' }),
      credentials: 'include',
      fetch: fetcher as unknown as typeof fetch,
      onRequest,
      onResponse,
      onSuccess
    })

    await expect(
      agent.loadCapabilities({ headers: { 'X-Request': 'request_1' } })
    ).resolves.toEqual(capabilities)

    expect(fetcher).toHaveBeenCalledWith(
      'https://agent.example.test/api/agent/info',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'X-Session': 'session_1',
          'X-Request': 'request_1'
        }
      })
    )
    expect(agent.status.value).toBe('ready')
    expect(agent.isLoading.value).toBe(false)
    expect(agent.error.value).toBeNull()
    expect(agent.hasCapabilities.value).toBe(true)
    expect(agent.capabilities.value).toEqual(capabilities)
    expect(agent.rawInfo.value).toEqual({ capabilities })
    expect(agent.supports.value).toEqual({
      streaming: true,
      resumable: true,
      toolCalling: true,
      clientProvidedTools: true,
      parallelToolCalls: true,
      structuredOutput: true,
      stateSnapshots: true,
      stateDeltas: true,
      persistentState: true,
      multiAgent: true,
      reasoning: true,
      multimodalInput: true,
      multimodalOutput: true,
      codeExecution: true,
      humanInTheLoop: true,
      approvals: true,
      interrupts: true
    })
    expect(agent.lastRequest.value).toEqual(
      expect.objectContaining({
        providerId: 'agent-capabilities',
        attempt: 1,
        api: '/api/agent/info',
        url: 'https://agent.example.test/api/agent/info',
        method: 'GET',
        credentials: 'include'
      })
    )
    expect(agent.lastResponse.value).toEqual(
      expect.objectContaining({
        capabilities,
        rawInfo: { capabilities }
      })
    )
    expect(agent.inspect()).toEqual(
      expect.objectContaining({ hasRequest: true, hasResponse: true })
    )
    expect(onRequest).toHaveBeenCalledWith(agent.lastRequest.value)
    expect(onResponse).toHaveBeenCalledWith(agent.lastResponse.value)
    expect(onSuccess).toHaveBeenCalledWith(capabilities, { capabilities })
  })

  it('selects a specific agent from multi-agent runtime info', async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            agents: [
              { id: 'default', capabilities: { transport: { streaming: true } } },
              {
                id: 'billing',
                capabilities: {
                  humanInTheLoop: { supported: true, approvals: true },
                  tools: { items: [{ name: 'chargeCard' }] }
                }
              }
            ]
          })
        )
    )
    const agent = useAgentCapabilities<AgentCapabilities>({
      agentId: 'billing',
      fetch: fetcher as unknown as typeof fetch
    })

    await agent.loadCapabilities()

    expect(agent.capabilities.value).toEqual({
      humanInTheLoop: { supported: true, approvals: true },
      tools: { items: [{ name: 'chargeCard' }] }
    })
    expect(agent.supports.value.approvals).toBe(true)
    expect(agent.supports.value.toolCalling).toBe(true)
    expect(agent.lastRequest.value?.agentId).toBe('billing')
  })

  it('supports custom selectors, manual updates, and clearing state', async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ runtime: { features: { stream: true } } }))
    )
    const agent = useAgentCapabilities<AgentCapabilities>({
      fetch: fetcher as unknown as typeof fetch,
      selectCapabilities(raw) {
        const stream = (raw as { runtime?: { features?: { stream?: boolean } } }).runtime?.features
          ?.stream
        return { transport: { streaming: Boolean(stream) } }
      }
    })

    await agent.refreshCapabilities()

    expect(agent.capabilities.value).toEqual({ transport: { streaming: true } })
    expect(agent.supports.value.streaming).toBe(true)

    agent.setCapabilities({ humanInTheLoop: { interrupts: true } })
    expect(agent.supports.value.interrupts).toBe(true)

    agent.clear()
    expect(agent.capabilities.value).toBeNull()
    expect(agent.rawInfo.value).toBeNull()
    expect(agent.lastRequest.value).toBeNull()
    expect(agent.hasCapabilities.value).toBe(false)
  })

  it('retries transient info endpoint failures before surfacing errors', async () => {
    const onRetry = vi.fn()
    const onError = vi.fn()
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'busy' }), { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ capabilities: { tools: { supported: true } } }))
      )
    const agent = useAgentCapabilities({
      maxRetries: 1,
      retryDelayMs: 0,
      onRetry,
      onError,
      fetch: fetcher as unknown as typeof fetch
    })

    await expect(agent.loadCapabilities()).resolves.toEqual({ tools: { supported: true } })

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(onRetry).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
    expect(agent.lastRequest.value?.attempt).toBe(2)
    expect(agent.status.value).toBe('ready')
  })

  it('stores errors after exhausted capability requests', async () => {
    const onError = vi.fn()
    const agent = useAgentCapabilities({
      fetch: vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch,
      onError
    })

    await expect(agent.loadCapabilities()).rejects.toThrow(/404/)

    expect(agent.status.value).toBe('error')
    expect(agent.error.value?.message).toContain('404')
    expect(onError).toHaveBeenCalledWith(agent.error.value)

    agent.clearError()
    expect(agent.status.value).toBe('ready')
    expect(agent.error.value).toBeNull()
  })
})

describe('agent capability helpers', () => {
  it('extracts direct, nested, and matching capabilities', () => {
    expect(extractAgentCapabilities({ transport: { streaming: true } })).toEqual({
      transport: { streaming: true }
    })
    expect(extractAgentCapabilities({ capabilities: { tools: { supported: true } } })).toEqual({
      tools: { supported: true }
    })
    expect(
      extractAgentCapabilities(
        {
          agents: [
            { id: 'a', capabilities: { tools: { supported: false } } },
            { name: 'b', capabilities: { tools: { supported: true } } }
          ]
        },
        'b'
      )
    ).toEqual({ tools: { supported: true } })
    expect(extractAgentCapabilities({ hello: 'world' })).toBeNull()
  })

  it('summarizes missing capabilities as unsupported', () => {
    expect(summarizeAgentCapabilities(null)).toEqual({
      streaming: false,
      resumable: false,
      toolCalling: false,
      clientProvidedTools: false,
      parallelToolCalls: false,
      structuredOutput: false,
      stateSnapshots: false,
      stateDeltas: false,
      persistentState: false,
      multiAgent: false,
      reasoning: false,
      multimodalInput: false,
      multimodalOutput: false,
      codeExecution: false,
      humanInTheLoop: false,
      approvals: false,
      interrupts: false
    })
  })
})
