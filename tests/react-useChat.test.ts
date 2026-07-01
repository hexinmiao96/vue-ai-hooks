import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useChat } from '../src/react'
import type { ChatProvider } from '../src/providers/types'
import type { ChatChunk, ChatRequest } from '../src/types'

const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true

function fakeProvider(chunks: ChatChunk[], requests: ChatRequest[] = []): ChatProvider {
  return {
    id: 'react-fake',
    async chat(request): Promise<AsyncIterable<ChatChunk>> {
      requests.push(request)
      return (async function* () {
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    },
    async completion(): Promise<AsyncIterable<string>> {
      return (async function* () {
        yield ''
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'fake', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

function fakeTurnProvider(
  turns: ChatChunk[][],
  requests: ChatRequest[] = [],
  resumeTurns: ChatChunk[][] = []
): ChatProvider {
  let chatCalls = 0
  let resumeCalls = 0
  return {
    ...fakeProvider([], requests),
    async chat(request): Promise<AsyncIterable<ChatChunk>> {
      requests.push(request)
      const chunks = turns[chatCalls] ?? []
      chatCalls += 1
      return (async function* () {
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    },
    async resumeChat(request): Promise<AsyncIterable<ChatChunk>> {
      const chunks = resumeTurns[resumeCalls] ?? []
      resumeCalls += 1
      return (async function* () {
        if (request.signal?.aborted) return
        for (const chunk of chunks) {
          await Promise.resolve()
          yield chunk
        }
      })()
    }
  }
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('react useChat', () => {
  it('streams assistant content with React state', async () => {
    const requests: ChatRequest[] = []
    const { result } = renderHook(() =>
      useChat({
        provider: fakeProvider(
          [
            { content: 'Hello' },
            { content: ' React', usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 } },
            { finishReason: 'stop' }
          ],
          requests
        ),
        generateId: (prefix = 'id') => `${prefix}_${requests.length}`
      })
    )

    await act(async () => {
      await result.current.append('Hi')
    })

    expect(requests[0].messages.map((message) => message.content)).toEqual(['Hi'])
    expect(result.current.messages.map((message) => message.role)).toEqual(['user', 'assistant'])
    expect(result.current.messages[1].content).toBe('Hello React')
    expect(result.current.messages[1].metadata?.finishReason).toBe('stop')
    expect(result.current.usage).toEqual({ promptTokens: 1, completionTokens: 2, totalTokens: 3 })
    expect(result.current.status).toBe('ready')
    expect(result.current.isLoading).toBe(false)
  })

  it('uses proxy transport when provider is omitted', async () => {
    const fetcher = vi.fn(async () => jsonResponse([{ content: 'proxied' }]))
    const prepareSendMessagesRequest = vi.fn(({ body, headers }) => ({
      body: { ...body, prepared: true },
      headers: { ...headers, 'X-Prepared': 'yes' }
    }))
    const { result } = renderHook(() =>
      useChat({
        api: '/api/react-chat',
        body: { tenantId: 'tenant_1' },
        headers: { 'X-Session': 'session_1' },
        fetch: fetcher as unknown as typeof fetch,
        prepareSendMessagesRequest
      })
    )

    await act(async () => {
      await result.current.sendMessage('Hello')
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/react-chat')
    expect(init.headers).toMatchObject({ 'X-Session': 'session_1', 'X-Prepared': 'yes' })
    expect(JSON.parse(init.body as string)).toMatchObject({
      tenantId: 'tenant_1',
      prepared: true,
      messages: [{ role: 'user', content: 'Hello' }]
    })
    expect(prepareSendMessagesRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        api: '/api/react-chat',
        trigger: 'submit-message',
        aiSdkTrigger: 'submit-user-message'
      })
    )
    expect(result.current.lastRequest).toMatchObject({ api: '/api/react-chat' })
    expect(result.current.lastResponse).toMatchObject({ hasStream: true })
    expect(result.current.messages[1].content).toBe('proxied')
  })

  it('wires React form helpers and clears input after submit', async () => {
    const requests: ChatRequest[] = []
    const { result } = renderHook(() =>
      useChat({
        provider: fakeProvider([{ content: 'done' }], requests)
      })
    )
    const event = { preventDefault: vi.fn(), target: { value: 'Hello form' } }

    act(() => {
      result.current.handleInputChange(event)
    })
    expect(result.current.input).toBe('Hello form')

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: event.preventDefault })
    })

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(result.current.input).toBe('')
    expect(requests[0].messages[0].content).toBe('Hello form')
    expect(result.current.messages[1].content).toBe('done')
  })

  it('clears errors and trace state', async () => {
    const provider: ChatProvider = {
      ...fakeProvider([]),
      async chat() {
        throw new Error('react provider failed')
      }
    }
    const { result } = renderHook(() => useChat({ provider }))
    let thrown: unknown

    await act(async () => {
      try {
        await result.current.append('fail')
      } catch (error) {
        thrown = error
      }
    })

    expect(thrown).toMatchObject({ message: 'react provider failed' })

    await waitFor(() => {
      expect(result.current.error?.message).toBe('react provider failed')
      expect(result.current.lastRequest?.providerId).toBe('react-fake')
    })

    act(() => {
      result.current.clearError()
      result.current.clearTrace()
    })

    await waitFor(() => {
      expect(result.current.error).toBeNull()
      expect(result.current.lastRequest).toBeNull()
      expect(result.current.lastResponse).toBeNull()
      expect(result.current.status).toBe('ready')
    })
  })

  it('handles structured chunks, callbacks, setters, and clear', async () => {
    const chunks: ChatChunk[] = [
      {
        messageId: 'assistant_server',
        content: 'structured',
        parts: [{ type: 'text', id: 'text_1', text: 'structured' }],
        toolCalls: [
          {
            index: 0,
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q"' }
          }
        ],
        dataId: 'source_1',
        dataType: 'source-url',
        data: { url: 'https://example.test', title: 'Example' }
      },
      {
        toolCalls: [{ index: 0, function: { arguments: ':"vue"}' } }],
        metadata: { model: 'test-model' },
        data: { progress: 1 },
        transient: true,
        finishReason: 'tool_calls'
      }
    ]
    const onChunk = vi.fn()
    const onData = vi.fn()
    const onUpdate = vi.fn()
    const onFinish = vi.fn()
    const { result } = renderHook(() =>
      useChat({
        provider: fakeProvider(chunks),
        onChunk,
        onData,
        onUpdate,
        onFinish
      })
    )

    act(() => {
      result.current.setId('react_chat')
      result.current.handleInputChange('typed')
      result.current.setMessages((messages) => [
        ...messages,
        { id: 'sys', role: 'system', content: 'system prompt' }
      ])
      result.current.setData((data) => [...data, { id: 'seed', data: { seeded: true } }])
    })

    await act(async () => {
      await result.current.append({
        id: 'user_custom',
        role: 'user',
        content: [{ type: 'text', text: 'Use structured chunks' }]
      })
    })

    expect(result.current.id).toBe('react_chat')
    expect(result.current.input).toBe('typed')
    expect(result.current.messages[2]).toMatchObject({
      id: 'assistant_server',
      content: 'structured',
      metadata: { model: 'test-model', finishReason: 'tool_calls' }
    })
    expect(result.current.messages[2].parts).toEqual([
      { type: 'text', id: 'text_1', text: 'structured' }
    ])
    expect(result.current.messages[2].toolCalls?.[0].function.arguments).toBe('{"q":"vue"}')
    expect(result.current.streamData.map((part) => part.id)).toEqual(['source_1'])
    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(onData).toHaveBeenCalledTimes(2)
    expect(onUpdate).toHaveBeenCalled()
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'assistant_server' }),
      expect.objectContaining({ isAbort: false, isError: false, finishReason: 'tool_calls' })
    )

    act(() => {
      result.current.clear()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.streamData).toEqual([])
    expect(result.current.input).toBe('')
    expect(result.current.status).toBe('ready')
  })

  it('supports message replacement, object sends, current-message submits, and regenerate', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider(
      [
        [{ content: 'edited reply' }],
        [{ content: 'object reply' }],
        [{ content: 'current reply' }],
        [{ content: 'regenerated reply' }]
      ],
      requests
    )
    const { result } = renderHook(() =>
      useChat({
        provider,
        initialMessages: [{ id: 'u1', role: 'user', content: 'original' }]
      })
    )

    await act(async () => {
      await result.current.append('edited', {
        messageId: 'u1',
        messageMetadata: { source: 'edit' }
      })
    })
    expect(result.current.messages.map((message) => message.content)).toEqual([
      'edited',
      'edited reply'
    ])
    expect(result.current.messages[0].metadata).toEqual({ source: 'edit' })

    await act(async () => {
      await result.current.sendMessage({ text: 'object', metadata: { source: 'object' } })
    })
    expect(requests).toHaveLength(2)
    await waitFor(() => {
      expect(result.current.messages.at(-1)?.content).toBe('object reply')
    })
    expect(requests[1].messages.at(-1)?.content).toBe('object')

    await act(async () => {
      await result.current.sendMessage()
    })
    expect(result.current.messages.at(-1)?.content).toBe('current reply')

    await act(async () => {
      await result.current.regenerate({ temperature: 0.2 })
    })
    expect(requests[3].temperature).toBe(0.2)
    expect(result.current.messages.map((message) => message.content)).toEqual([
      'edited',
      'edited reply',
      'object',
      'regenerated reply'
    ])
  })

  it('supports resumable streams and resume request preparation', async () => {
    const prepareReconnectToStreamRequest = vi.fn(({ headers }) => ({
      headers: { ...headers, 'X-Resume': 'yes' },
      body: { resumed: true }
    }))
    const { result } = renderHook(() =>
      useChat({
        provider: fakeTurnProvider([], [], [[{ content: ' resumed' }]]),
        initialMessages: [
          { id: 'u1', role: 'user', content: 'resume' },
          {
            id: 'a1',
            role: 'assistant',
            content: [{ type: 'text', text: 'partially' }]
          }
        ],
        defaultRequest: {
          body: { base: true },
          headers: { 'X-Base': 'base' }
        },
        prepareReconnectToStreamRequest
      })
    )

    await act(async () => {
      await result.current.resumeStream({ id: 'resume_1', threadId: 'thread_1' })
    })

    expect(prepareReconnectToStreamRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'resume_1',
        body: { base: true },
        headers: { 'X-Base': 'base' }
      })
    )
    expect(result.current.lastRequest).toMatchObject({
      kind: 'resume',
      id: 'resume_1',
      body: { base: true, resumed: true },
      headers: { 'X-Base': 'base', 'X-Resume': 'yes' }
    })
    expect(result.current.messages.at(-1)?.content).toBe('partially resumed')
  })

  it('retries before the first chunk and reports unsupported resume providers', async () => {
    const requests: ChatRequest[] = []
    let calls = 0
    const provider: ChatProvider = {
      ...fakeProvider([], requests),
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        requests.push(request)
        calls += 1
        if (calls === 1) throw new Error('temporary failure')
        return (async function* () {
          yield { content: 'after retry' }
        })()
      }
    }
    const onRetry = vi.fn()
    const { result } = renderHook(() => useChat({ provider, maxRetries: 1, onRetry }))

    await act(async () => {
      await result.current.append('retry')
    })

    expect(onRetry).toHaveBeenCalledOnce()
    expect(requests).toHaveLength(2)
    expect(result.current.messages[1].content).toBe('after retry')

    let thrown: unknown
    await act(async () => {
      try {
        await result.current.resumeStream()
      } catch (error) {
        thrown = error
      }
    })
    expect(thrown).toMatchObject({ message: 'Provider "react-fake" does not support resumeChat()' })
  })

  it('reports empty streams without finishing an assistant message', async () => {
    const provider: ChatProvider = {
      ...fakeProvider([]),
      async chat() {
        return null as unknown as AsyncIterable<ChatChunk>
      }
    }
    const onFinish = vi.fn()
    const { result } = renderHook(() => useChat({ provider, onFinish }))

    await act(async () => {
      await result.current.append('no stream')
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.lastResponse).toMatchObject({ hasStream: false })
    expect(result.current.messages.map((message) => message.content)).toEqual(['no stream', ''])
    expect(onFinish).not.toHaveBeenCalled()
  })

  it('marks stopped streams as aborted before applying the next chunk', async () => {
    const onFinish = vi.fn()
    let resolveOnAbort: (() => void) | undefined
    const provider: ChatProvider = {
      ...fakeProvider([]),
      async chat(request): Promise<AsyncIterable<ChatChunk>> {
        return (async function* () {
          await new Promise<void>((resolve) => {
            resolveOnAbort = resolve
            request.signal?.addEventListener('abort', () => resolve(), { once: true })
          })
          yield { content: 'ignored' }
        })()
      }
    }
    const { result } = renderHook(() => useChat({ provider, onFinish }))
    let appendPromise: Promise<void>

    act(() => {
      appendPromise = result.current.append('stop')
    })
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true)
    })

    act(() => {
      result.current.stop()
    })
    resolveOnAbort?.()
    await act(async () => {
      await appendPromise
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.messages[1].content).toBe('')
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant' }),
      expect.objectContaining({ isAbort: true, isError: false })
    )
  })

  it('handles AbortError streams as aborted finishes', async () => {
    const onFinish = vi.fn()
    const provider: ChatProvider = {
      ...fakeProvider([]),
      async chat(): Promise<AsyncIterable<ChatChunk>> {
        const abortError = Object.assign(new Error('request aborted'), { name: 'AbortError' })
        return {
          [Symbol.asyncIterator]() {
            return {
              async next(): Promise<IteratorResult<ChatChunk>> {
                throw abortError
              }
            }
          }
        }
      }
    }
    const { result } = renderHook(() => useChat({ provider, onFinish }))

    await act(async () => {
      await result.current.append('abort')
    })

    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
    expect(onFinish).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'assistant' }),
      expect.objectContaining({ isAbort: true, isError: false })
    )
  })

  it('covers current-message validation, message ids, and resume without an assistant', async () => {
    const requests: ChatRequest[] = []
    const provider = fakeTurnProvider([[{ content: 'draft reply' }]], requests, [
      [{ content: 'resumed reply' }]
    ])
    const { result } = renderHook(() =>
      useChat({
        provider,
        initialMessages: [{ id: 'u1', role: 'user', content: 'resume base' }]
      })
    )

    let thrown: unknown
    await act(async () => {
      try {
        await result.current.sendMessage(undefined, { messageId: 'invalid' })
      } catch (error) {
        thrown = error
      }
    })
    expect(thrown).toMatchObject({
      message: 'sendMessage() without a message does not support messageId or messageMetadata'
    })

    await act(async () => {
      result.current.clearError()
      await result.current.sendMessage({ text: 'draft', messageId: 'draft_1' })
    })

    expect(requests[0].messages.at(-1)).toMatchObject({ id: 'draft_1', content: 'draft' })
    expect(result.current.messages.at(-2)).toMatchObject({ id: 'draft_1', content: 'draft' })

    act(() => {
      result.current.setMessages([{ id: 'u1', role: 'user', content: 'resume base' }])
    })
    await act(async () => {
      await result.current.resumeStream()
    })

    expect(result.current.messages.map((message) => message.content)).toEqual([
      'resume base',
      'resumed reply'
    ])
  })
})
