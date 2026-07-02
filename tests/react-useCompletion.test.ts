import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCompletion } from '../src/react'
import type { ChatProvider } from '../src/providers/types'
import type { CompletionRequest } from '../src/types'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function completionProvider(
  chunks: string[],
  requests: CompletionRequest[] = [],
  id = 'react-completion-fake'
): ChatProvider {
  return {
    id,
    async chat() {
      return (async function* () {})()
    },
    async completion(request): Promise<AsyncIterable<string>> {
      requests.push(request)
      return (async function* () {
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

function textResponse(text: string): Response {
  return new Response(text, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}

describe('react useCompletion', () => {
  it('streams completion text with React state and lifecycle callbacks', async () => {
    const requests: CompletionRequest[] = []
    const onRequest = vi.fn()
    const onResponse = vi.fn()
    const onUpdate = vi.fn()
    const onFinish = vi.fn()
    const { result } = renderHook(() =>
      useCompletion({
        provider: completionProvider(['Hello', ' React'], requests),
        generateId: (prefix = 'id') => `${prefix}_fixed`,
        onRequest,
        onResponse,
        onUpdate,
        onFinish
      })
    )

    await act(async () => {
      await expect(result.current.complete('Say hello')).resolves.toBe('Hello React')
    })

    expect(result.current.id).toBe('completion_fixed')
    expect(result.current.completion).toBe('Hello React')
    expect(result.current.status).toBe('ready')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(requests[0]).toMatchObject({ prompt: 'Say hello', stream: true })
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'react-completion-fake', prompt: 'Say hello' })
    )
    expect(onResponse).toHaveBeenCalledWith(expect.objectContaining({ hasStream: true }))
    expect(onUpdate).toHaveBeenLastCalledWith('Hello React', ' React')
    expect(onFinish).toHaveBeenCalledWith(
      'Hello React',
      expect.objectContaining({ prompt: 'Say hello', completion: 'Hello React', isAbort: false })
    )
  })

  it('uses proxy transport when provider is omitted', async () => {
    const fetcher = vi.fn(async () => textResponse('proxied completion'))
    const { result } = renderHook(() =>
      useCompletion({
        api: '/api/react-completion',
        streamProtocol: 'text',
        body: { tenantId: 'tenant_1' },
        headers: { 'X-Session': 'session_1' },
        credentials: 'include',
        fetch: fetcher as unknown as typeof fetch
      })
    )

    await act(async () => {
      await expect(result.current.complete('finish this')).resolves.toBe('proxied completion')
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/react-completion')
    expect(init.credentials).toBe('include')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      prompt: 'finish this',
      streamProtocol: 'text',
      stream: true
    })
    expect(result.current.lastRequest).toMatchObject({
      providerId: 'proxy',
      api: '/api/react-completion',
      credentials: 'include',
      prompt: 'finish this'
    })
    expect(result.current.lastResponse).toMatchObject({ hasStream: true })
  })

  it('supports controlled input helpers and clears input after submit', async () => {
    const requests: CompletionRequest[] = []
    const { result } = renderHook(() =>
      useCompletion({
        provider: completionProvider(['submitted'], requests),
        initialInput: 'draft prompt'
      })
    )
    const preventDefault = vi.fn()

    expect(result.current.input).toBe('draft prompt')
    act(() => {
      result.current.setInput('manual prompt')
      result.current.handleInputChange({ target: { value: 'event prompt' } })
    })

    await act(async () => {
      await expect(
        result.current.handleSubmit({ preventDefault }, { model: 'form-model', temperature: 0.2 })
      ).resolves.toBe('submitted')
    })

    expect(preventDefault).toHaveBeenCalledOnce()
    expect(result.current.input).toBe('')
    expect(requests[0]).toMatchObject({
      prompt: 'event prompt',
      model: 'form-model',
      temperature: 0.2,
      stream: true
    })
  })

  it('keeps input when submit fails and supports clear helpers', async () => {
    const provider: ChatProvider = {
      ...completionProvider([]),
      async completion() {
        throw new Error('completion failed')
      }
    }
    const { result } = renderHook(() =>
      useCompletion({ provider, initialInput: 'keep prompt', initialCompletion: 'seed' })
    )
    let thrown: unknown

    await act(async () => {
      try {
        await result.current.handleSubmit()
      } catch (error) {
        thrown = error
      }
    })

    expect(thrown).toMatchObject({ message: 'completion failed' })
    await waitFor(() => {
      expect(result.current.error?.message).toBe('completion failed')
      expect(result.current.status).toBe('error')
    })
    expect(result.current.input).toBe('keep prompt')

    act(() => {
      result.current.clearError()
      result.current.clearTrace()
    })
    expect(result.current.error).toBeNull()
    expect(result.current.lastRequest).toBeNull()

    act(() => {
      result.current.setCompletion('manual')
      result.current.clear()
    })
    expect(result.current.completion).toBe('')
    expect(result.current.input).toBe('')
    expect(result.current.status).toBe('ready')
  })

  it('retries before the first delta', async () => {
    const requests: CompletionRequest[] = []
    let calls = 0
    const provider: ChatProvider = {
      ...completionProvider([], requests),
      async completion(request): Promise<AsyncIterable<string>> {
        requests.push(request)
        calls += 1
        if (calls === 1) throw new Error('temporary failure')
        return (async function* () {
          yield 'after retry'
        })()
      }
    }
    const onRetry = vi.fn()
    const { result } = renderHook(() => useCompletion({ provider, maxRetries: 1, onRetry }))

    await act(async () => {
      await expect(result.current.complete('retry')).resolves.toBe('after retry')
    })

    expect(onRetry).toHaveBeenCalledOnce()
    expect(requests).toHaveLength(2)
    expect(result.current.lastRequest?.attempt).toBe(2)
  })

  it('marks stopped streams as aborted finishes', async () => {
    const onFinish = vi.fn()
    let resolveOnAbort: (() => void) | undefined
    const provider: ChatProvider = {
      ...completionProvider([]),
      async completion(request): Promise<AsyncIterable<string>> {
        return (async function* () {
          await new Promise<void>((resolve) => {
            resolveOnAbort = resolve
            request.signal?.addEventListener('abort', () => resolve(), { once: true })
          })
          yield 'ignored'
        })()
      }
    }
    const { result } = renderHook(() => useCompletion({ provider, onFinish }))
    let pending!: Promise<string>

    act(() => {
      pending = result.current.complete('stop')
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      result.current.stop()
    })
    resolveOnAbort?.()
    await act(async () => {
      await expect(pending).resolves.toBe('')
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.completion).toBe('')
    expect(onFinish).toHaveBeenCalledWith('', expect.objectContaining({ isAbort: true }))
  })
})
