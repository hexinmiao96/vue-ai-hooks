import { describe, expect, it, vi } from 'vitest'
import { moonshot } from '../src/providers/moonshot'
import { ollama } from '../src/providers/ollama'
import { vllm } from '../src/providers/vllm'
import { zhipu } from '../src/providers/zhipu'
import type { ChatProvider } from '../src/providers/types'

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

async function readSingleChatRequest(provider: ChatProvider) {
  const stream = await provider.chat({
    messages: [{ id: 'u1', role: 'user', content: 'Hello' }],
    stream: false
  })
  for await (const chunk of stream) {
    expect(chunk.content).toBe('ok')
  }
}

describe('OpenAI-compatible provider presets', () => {
  it('uses Moonshot defaults and compatible overrides', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] })
    )
    const provider = moonshot({
      apiKey: 'moonshot-key',
      defaultModel: 'kimi-k2',
      fetch: fetcher as unknown as typeof fetch
    })

    await readSingleChatRequest(provider)

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)

    expect(provider.id).toBe('moonshot')
    expect(url).toBe('https://api.moonshot.ai/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer moonshot-key')
    expect(body.model).toBe('kimi-k2')
  })

  it('selects Zhipu BigModel, Z.ai, and coding endpoints', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] })
    )
    const bigmodel = zhipu({ apiKey: 'zhipu-key', fetch: fetcher as unknown as typeof fetch })
    const zai = zhipu({
      apiKey: 'zhipu-key',
      endpoint: 'z-ai',
      fetch: fetcher as unknown as typeof fetch
    })
    const coding = zhipu({
      apiKey: 'zhipu-key',
      endpoint: 'bigmodel-coding',
      defaultModel: 'glm-4.5',
      fetch: fetcher as unknown as typeof fetch
    })
    const zaiCoding = zhipu({
      apiKey: 'zhipu-key',
      endpoint: 'z-ai-coding',
      fetch: fetcher as unknown as typeof fetch
    })

    await readSingleChatRequest(bigmodel)
    await readSingleChatRequest(zai)
    await readSingleChatRequest(coding)
    await readSingleChatRequest(zaiCoding)

    expect(bigmodel.id).toBe('zhipu')
    expect((fetcher.mock.calls[0] as unknown as [string, RequestInit])[0]).toBe(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions'
    )
    expect((fetcher.mock.calls[1] as unknown as [string, RequestInit])[0]).toBe(
      'https://api.z.ai/api/paas/v4/chat/completions'
    )
    expect((fetcher.mock.calls[2] as unknown as [string, RequestInit])[0]).toBe(
      'https://open.bigmodel.cn/api/coding/paas/v4/chat/completions'
    )
    expect((fetcher.mock.calls[3] as unknown as [string, RequestInit])[0]).toBe(
      'https://api.z.ai/api/coding/paas/v4/chat/completions'
    )
    const [, codingInit] = fetcher.mock.calls[2] as unknown as [string, RequestInit]
    expect(JSON.parse(codingInit.body as string).model).toBe('glm-4.5')
  })

  it('uses Ollama local OpenAI compatibility defaults', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] })
    )
    const provider = ollama({ fetch: fetcher as unknown as typeof fetch })

    const stream = await provider.chat({
      messages: [{ id: 'u1', role: 'user', content: 'Hello' }],
      model: 'qwen3:8b',
      stream: false
    })
    for await (const chunk of stream) {
      expect(chunk.content).toBe('ok')
    }

    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)

    expect(provider.id).toBe('ollama')
    expect(url).toBe('http://localhost:11434/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer ollama')
    expect(body.model).toBe('qwen3:8b')
  })

  it('uses vLLM local OpenAI server defaults and allows gateways', async () => {
    const fetcher = vi.fn(async () =>
      jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] })
    )
    const local = vllm({ fetch: fetcher as unknown as typeof fetch })
    const gateway = vllm({
      apiKey: 'server-token',
      baseURL: 'https://llm.example.test/openai/v1/',
      defaultModel: 'served-model',
      fetch: fetcher as unknown as typeof fetch
    })

    await readSingleChatRequest(local)
    await readSingleChatRequest(gateway)

    const [localUrl, localInit] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    const [gatewayUrl, gatewayInit] = fetcher.mock.calls[1] as unknown as [string, RequestInit]

    expect(local.id).toBe('vllm')
    expect(localUrl).toBe('http://localhost:8000/v1/chat/completions')
    expect((localInit.headers as Record<string, string>).Authorization).toBe('Bearer vllm')
    expect(gatewayUrl).toBe('https://llm.example.test/openai/v1/chat/completions')
    expect((gatewayInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer server-token'
    )
    expect(JSON.parse(gatewayInit.body as string).model).toBe('served-model')
  })
})
