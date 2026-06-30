import { afterEach, describe, expect, it, vi } from 'vitest'
import { openaiCompatible } from '../src/providers/openai'

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

function sseResponse(events: unknown[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      controller.close()
    }
  })

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' }
  })
}

function abortError(): Error {
  return Object.assign(new Error('Aborted'), { name: 'AbortError' })
}

function pendingFetch() {
  return vi.fn(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal
        if (signal?.aborted) {
          reject(abortError())
          return
        }
        signal?.addEventListener('abort', () => reject(abortError()), { once: true })
      })
  )
}

describe('openaiCompatible provider', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('serializes full chat requests and merges provider/request headers', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        choices: [{ message: { content: 'ok' }, finish_reason: null }],
        usage: { promptTokens: 4, completionTokens: 2, totalTokens: 6 }
      })
    )
    const provider = openaiCompatible({
      apiKey: 'provider-key',
      baseURL: 'https://gateway.example.test/v1/',
      chatPath: 'chat/custom',
      defaultModel: 'default-chat',
      headers: new Headers({ 'X-Provider': 'provider' }),
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.chat({
      messages: [
        {
          id: 'm1',
          role: 'tool',
          content: 'tool result',
          name: 'weather',
          toolCallId: 'call_1',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: { name: 'weather', arguments: '{"city":"gz"}' }
            }
          ]
        }
      ],
      temperature: 0.2,
      maxTokens: 12,
      topP: 0.9,
      frequencyPenalty: 0.1,
      presencePenalty: 0.3,
      stop: ['END'],
      tools: [
        {
          type: 'function',
          function: {
            name: 'weather',
            parameters: { type: 'object' }
          }
        }
      ],
      toolChoice: { type: 'function', function: { name: 'weather' } },
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'weather_report',
          schema: { type: 'object' },
          strict: true
        }
      },
      body: {
        custom_flag: true,
        model: 'body-model-ignored',
        stream: true
      },
      user: 'user-1',
      stream: false,
      headers: [['X-Request', 'request']] as [string, string][]
    })

    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    const body = JSON.parse(init.body as string)

    expect(url).toBe('https://gateway.example.test/v1/chat/custom')
    expect(headers.Authorization).toBe('Bearer provider-key')
    expect(headers['x-provider']).toBe('provider')
    expect(headers['X-Request']).toBe('request')
    expect(body).toMatchObject({
      model: 'default-chat',
      stream: false,
      custom_flag: true,
      temperature: 0.2,
      max_tokens: 12,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.3,
      stop: ['END'],
      user: 'user-1'
    })
    expect(body.messages[0]).toMatchObject({
      role: 'tool',
      content: 'tool result',
      name: 'weather',
      tool_call_id: 'call_1',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'weather', arguments: '{"city":"gz"}' }
        }
      ]
    })
    expect(body.tools[0].function.name).toBe('weather')
    expect(body.tool_choice.function.name).toBe('weather')
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'weather_report',
        schema: { type: 'object' },
        strict: true
      }
    })
    expect(chunks).toEqual([
      {
        content: 'ok',
        finishReason: 'stop',
        usage: { promptTokens: 4, completionTokens: 2, totalTokens: 6 }
      }
    ])
  })

  it('maps streaming chat chunks, tool calls, finish reasons, and usage', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        {},
        {
          choices: [
            {
              delta: {
                content: 'hello',
                tool_calls: [
                  {
                    index: 0,
                    id: 'call_1',
                    type: 'function',
                    function: { name: 'lookup', arguments: '{"q":"vue"}' }
                  }
                ]
              },
              finish_reason: 'tool_calls'
            }
          ],
          usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }
        }
      ])
    )
    const provider = openaiCompatible({
      apiKey: 'k',
      baseURL: 'https://api.example.test',
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.chat({
      messages: [{ id: 'm1', role: 'user', content: 'hi' }]
    })
    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      {
        content: 'hello',
        toolCalls: [
          {
            index: 0,
            id: 'call_1',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q":"vue"}' }
          }
        ],
        finishReason: 'tool_calls',
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 }
      }
    ])
  })

  it('maps non-streaming chat tool calls', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_nonstream',
                  type: 'function',
                  function: { name: 'lookup', arguments: '{"q":"vue"}' }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }
        ],
        usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 }
      })
    )
    const provider = openaiCompatible({
      apiKey: 'k',
      baseURL: 'https://api.example.test',
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.chat({
      messages: [{ id: 'm1', role: 'user', content: 'Use a tool' }],
      stream: false
    })
    const chunks = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual([
      {
        content: undefined,
        toolCalls: [
          {
            index: 0,
            id: 'call_nonstream',
            type: 'function',
            function: { name: 'lookup', arguments: '{"q":"vue"}' }
          }
        ],
        finishReason: 'tool_calls',
        usage: { promptTokens: 2, completionTokens: 1, totalTokens: 3 }
      }
    ])
  })

  it('serializes completion requests and reads non-streaming text', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ choices: [{ text: 'done' }] }))
    const provider = openaiCompatible({
      apiKey: 'k',
      baseURL: 'https://api.example.test/',
      completionPath: 'custom/completions',
      defaultModel: 'default-completion',
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.completion({
      prompt: 'Complete this',
      temperature: 0.4,
      maxTokens: 20,
      topP: 0.8,
      frequencyPenalty: 0.2,
      presencePenalty: 0.5,
      stop: 'END',
      body: {
        custom_option: 'completion-extra',
        prompt: 'ignored body prompt',
        stream: true
      },
      stream: false
    })
    let text = ''
    for await (const chunk of stream) {
      text += chunk
    }

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)

    expect(url).toBe('https://api.example.test/custom/completions')
    expect(body).toMatchObject({
      model: 'default-completion',
      prompt: 'Complete this',
      stream: false,
      custom_option: 'completion-extra',
      temperature: 0.4,
      max_tokens: 20,
      top_p: 0.8,
      frequency_penalty: 0.2,
      presence_penalty: 0.5,
      stop: 'END'
    })
    expect(text).toBe('done')
  })

  it('streams only completion text chunks with content', async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([{ choices: [{}] }, { choices: [{ text: 'a' }] }, { choices: [{ text: 'b' }] }])
    )
    const provider = openaiCompatible({
      apiKey: 'k',
      baseURL: 'https://api.example.test',
      fetch: fetcher as unknown as typeof fetch
    })

    const stream = await provider.completion({ prompt: 'hi' })
    let text = ''
    for await (const chunk of stream) {
      text += chunk
    }

    expect(text).toBe('ab')
  })

  it('maps embedding responses and serializes optional request fields', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({
        data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }],
        model: 'embedding-model',
        usage: { prompt_tokens: 3, total_tokens: 5 }
      })
    )
    const provider = openaiCompatible({
      apiKey: 'k',
      baseURL: 'https://api.example.test/v1/',
      embeddingPath: 'custom/embeddings',
      defaultModel: 'default-embedding',
      fetch: fetcher as unknown as typeof fetch
    })

    const result = await provider.embedding({
      input: ['a', 'b'],
      body: {
        encoding_format: 'float',
        input: 'ignored body input'
      },
      user: 'user-2',
      headers: { 'X-Trace': 'trace-1' }
    })

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    const body = JSON.parse(init.body as string)

    expect(url).toBe('https://api.example.test/v1/custom/embeddings')
    expect(headers['X-Trace']).toBe('trace-1')
    expect(body).toEqual({
      encoding_format: 'float',
      input: ['a', 'b'],
      model: 'default-embedding',
      user: 'user-2'
    })
    expect(result).toEqual({
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4]
      ],
      model: 'embedding-model',
      usage: { promptTokens: 3, totalTokens: 5 }
    })
  })

  it('applies timeoutMs to chat, completion, and embedding requests', async () => {
    vi.useFakeTimers()

    async function expectTimedOut(
      run: (provider: ReturnType<typeof openaiCompatible>) => Promise<unknown>
    ) {
      const fetcher = pendingFetch()
      const provider = openaiCompatible({
        apiKey: 'k',
        baseURL: 'https://api.example.test',
        timeoutMs: 10,
        fetch: fetcher as unknown as typeof fetch
      })

      const request = run(provider)
      const assertion = expect(request).rejects.toMatchObject({
        name: 'AiHooksError',
        message: 'Request aborted'
      })
      await vi.advanceTimersByTimeAsync(10)
      await assertion
      expect(fetcher).toHaveBeenCalledTimes(1)
    }

    await expectTimedOut((provider) =>
      provider.chat({ messages: [{ id: 'm1', role: 'user', content: 'hi' }] })
    )
    await expectTimedOut((provider) => provider.completion({ prompt: 'hi' }))
    await expectTimedOut((provider) => provider.embedding({ input: 'hi' }))
  })
})
