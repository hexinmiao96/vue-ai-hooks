import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

import CompletionApp from '../examples/completion/App.vue'
import ObjectApp from '../examples/object/App.vue'
import EmbeddingApp from '../examples/embedding/App.vue'

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper.findAll('button').find((item) => item.text().includes(label))
  if (!button) {
    throw new Error(`Button not found: ${label}`)
  }
  return button
}

function createCompletionProvider(text = 'deterministic completion output') {
  const payload =
    typeof text === 'string'
      ? text.includes('Completion result')
        ? text
        : `Completion result for: ${text}`
      : 'Completion result from local mock provider'
  return {
    id: 'mock-openai',
    async completion() {
      return (async function* () {
        for (const chunk of [payload]) {
          yield chunk
        }
      })()
    },
    async chat() {
      return (async function* () {})()
    },
    async embedding() {
      return { embeddings: [], model: 'mock-openai', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

function createObjectProvider() {
  return {
    id: 'mock-object',
    async chat(request: unknown) {
      const prompt = parsePromptFromObjectRequest(request)
      const ticket = {
        title: (typeof prompt === 'string' ? prompt : 'ticket').slice(0, 38),
        priority: /(urgent|blocked|down|error|outage|crash|超时|故障|阻塞)/i.test(prompt || '')
          ? 'high'
          : 'low'
      }

      const chunks = JSON.stringify(ticket)
      return (async function* () {
        const midpoint = Math.ceil(chunks.length / 2)
        yield { content: chunks.slice(0, midpoint) }
        yield { content: chunks.slice(midpoint) }
        yield {
          finishReason: 'stop',
          usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 }
        }
      })()
    },
    async completion() {
      return (async function* () {
        yield ''
      })()
    },
    async embedding() {
      return { embeddings: [], model: 'mock-object', usage: { promptTokens: 0, totalTokens: 0 } }
    }
  }
}

function parsePromptFromObjectRequest(request: unknown) {
  const requestShape = request as { messages?: Array<{ role?: string; content?: unknown }> } | null
  const messages = Array.isArray(requestShape?.messages) ? requestShape.messages : []
  const userMessage = messages.find((message) => message?.role === 'user')
  if (!userMessage) return ''
  if (typeof userMessage.content === 'string') return userMessage.content
  return ''
}

const clipboardWriteText = vi.fn(async () => undefined)
beforeEach(() => {
  clipboardWriteText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: clipboardWriteText },
    configurable: true
  })
})

type MockCompletionProvider = {
  id: string
  completion: (request: {
    prompt: string
  }) => AsyncIterable<unknown> | Promise<AsyncIterable<unknown>>
}

type EmbeddingSnapshot = {
  providerId: string
}

vi.mock('vue-ai-hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-ai-hooks')>()
  return {
    ...actual,
    openai: createCompletionProvider,
    gemini: createCompletionProvider,
    openrouter: createCompletionProvider,
    proxyProvider: createCompletionProvider,
    useCompletion: vi.fn((options: { provider: MockCompletionProvider }) => {
      const completionInput = ref('No key prompt')
      const completionText = ref('')
      const completionStatus = ref('ready')
      const completionIsLoading = ref(false)
      const completionError = ref<Error | null>(null)
      let requestSnapshot: unknown = null
      let responseSnapshot: unknown = null

      return {
        completion: completionText,
        input: completionInput,
        status: completionStatus,
        isLoading: completionIsLoading,
        error: completionError,
        async complete(prompt?: string) {
          const inputValue = typeof prompt === 'string' ? prompt : completionInput.value
          completionIsLoading.value = true
          requestSnapshot = {
            providerId: options.provider.id || 'openai',
            request: { prompt: inputValue }
          }
          const chunks = await options.provider.completion({ prompt: inputValue })
          let result = ''
          for await (const chunk of chunks) {
            result += String(chunk)
          }
          completionText.value = result
          responseSnapshot = {
            providerId: options.provider.id || 'openai',
            response: { providerMetadata: { id: options.provider.id || 'openai' } }
          }
          completionIsLoading.value = false
          completionStatus.value = 'ready'
          return result
        },
        stop: vi.fn(),
        inspect() {
          return {
            summary: completionText.value || 'No completion yet.',
            status: completionStatus.value,
            request: requestSnapshot,
            response: responseSnapshot,
            hasRequest: Boolean(requestSnapshot),
            hasResponse: Boolean(responseSnapshot),
            timeline: [{ at: 'start' }, { at: 'end' }],
            retries: [],
            providerTrace: { provider: options.provider.id || 'openai' },
            curl: 'curl -X POST mock-completion'
          }
        },
        clearTrace() {
          requestSnapshot = null
          responseSnapshot = null
        }
      }
    }),
    useObject: vi.fn(() => {
      const object = ref<{ title: string; priority: string } | null>(null)
      const partialObject = ref<{ title?: string; priority: string }>({ priority: 'low' })
      const text = ref('')
      const input = ref('')
      const status = ref<'ready' | 'submitted' | 'streaming' | 'error'>('ready')
      const isLoading = ref(false)
      const error = ref<Error | null>(null)
      let requestSnapshot: unknown = null
      let responseSnapshot: unknown = null

      return {
        object,
        partialObject,
        text,
        input,
        status,
        isLoading,
        async submit(value?: string) {
          const prompt = value ?? input.value
          isLoading.value = true
          requestSnapshot = {
            providerId: 'mock-object',
            request: { messages: [{ role: 'user', content: prompt }] }
          }
          const provider = createObjectProvider()
          const chunks = await provider.chat({
            messages: [{ role: 'user', content: prompt }]
          } as {
            messages: Array<{ role: string; content: string }>
          })

          let parsed = ''
          for await (const chunk of chunks) {
            if (typeof chunk.content === 'string') parsed += chunk.content
          }
          const parsedTicket = JSON.parse(parsed || '{}') as { title?: string; priority?: string }
          object.value = {
            title: parsedTicket.title || 'local ticket',
            priority: parsedTicket.priority || 'low'
          }
          text.value = parsed
          responseSnapshot = { providerId: 'mock-object', response: {} }
          isLoading.value = false
          return object.value
        },
        stop: vi.fn(),
        clear: vi.fn(() => {
          text.value = ''
          object.value = null
          partialObject.value = { priority: 'low' }
        }),
        error,
        inspect() {
          return {
            summary: object.value ? `Parsed ${object.value.title}` : 'No object yet.',
            status: status.value,
            request: requestSnapshot,
            response: responseSnapshot,
            hasRequest: Boolean(requestSnapshot),
            hasResponse: Boolean(responseSnapshot),
            timeline: [{ at: 'start' }, { at: 'end' }],
            retries: [],
            providerTrace: { route: 'mock-object' },
            curl: 'curl -X POST mock-object'
          }
        },
        clearTrace() {
          requestSnapshot = null
          responseSnapshot = null
        }
      }
    }),
    useEmbedding: vi.fn(() => {
      const isLoading = ref(false)
      const error = ref<Error | null>(null)
      const snapshots = {
        request: null as EmbeddingSnapshot | null,
        response: null as EmbeddingSnapshot | null
      }
      const vectors = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]

      return {
        embed: vi.fn(async () => {
          isLoading.value = true
          error.value = null
          snapshots.request = {
            providerId: 'mock-embedding'
          }
          snapshots.response = snapshots.request
          isLoading.value = false
          return { embeddings: vectors }
        }),
        isLoading,
        error,
        embeddings: ref(vectors),
        clearTrace: vi.fn(() => {
          snapshots.request = null
          snapshots.response = null
        }),
        inspect() {
          return {
            summary: snapshots.request
              ? 'Embedding request complete.'
              : 'No embedding request yet.',
            status: isLoading.value ? 'submitted' : 'ready',
            request: snapshots.request ? { providerId: 'mock-embedding' } : null,
            response: snapshots.response
              ? { providerId: 'mock-embedding', embeddings: vectors }
              : null,
            hasRequest: Boolean(snapshots.request),
            hasResponse: Boolean(snapshots.response),
            timeline: [{ at: 'start' }, { at: 'end' }],
            retries: [],
            providerTrace: { route: 'mock-embedding' },
            curl: 'curl -X POST mock-embedding'
          }
        }
      }
    })
  }
})

describe('Demo UI visual guardrails', () => {
  it('verifies Vue completion demo inspect visibility and usable trace copy state', async () => {
    const wrapper = mount(CompletionApp)

    expect(wrapper.find('.output').text()).toContain('No completion yet.')

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Please draft a fallback plan')
    const runButton = findButton(wrapper, 'Complete')
    await runButton.trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.find('.output').text()).toContain('Completion result')
    const preBlocks = wrapper.findAll('pre.raw-output')
    const inspectionPayload = preBlocks.map((block) => block.text()).join('\n')
    expect(inspectionPayload).toContain('"providerId"')
    expect(inspectionPayload).toContain('mock-openai')

    const copyButton = findButton(wrapper, 'Copy curl')
    await copyButton.trigger('click')
    expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    expect(clipboardWriteText).toHaveBeenCalledWith('curl -X POST mock-completion')
  })

  it('verifies Vue object demo shows parsed object fields and trace payload after submit', async () => {
    const wrapper = mount(ObjectApp)

    const prompt = 'urgent: customer account is blocked and cannot reset password'
    const textarea = wrapper.find('textarea')
    await textarea.setValue(prompt)
    const runButton = findButton(wrapper, 'Extract object')
    await runButton.trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).toContain('priority')
    expect(wrapper.text()).toContain('high')

    const summaryPanel = wrapper
      .findAll('section.panel')
      .find((panel) => panel.text().includes('Inspect'))
    expect(summaryPanel?.exists()).toBe(true)

    const preBlocks = wrapper.findAll('pre.raw-output')
    const payload = preBlocks.map((block) => block.text()).join('\n')
    expect(payload).toContain('mock-object')
    expect(payload).toContain('priority')
    expect(payload).toContain('title')

    const copyButton = findButton(wrapper, 'Copy curl')
    await copyButton.trigger('click')
    expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    expect(clipboardWriteText).toHaveBeenCalledWith('curl -X POST mock-object')
  })

  it('verifies Vue embedding demo surfaces inspect payload and trace copy state', async () => {
    const wrapper = mount(EmbeddingApp)

    const runButton = findButton(wrapper, 'Compute embeddings')
    await runButton.trigger('click')
    await flushPromises()
    await nextTick()

    const section = wrapper.find('section[aria-label="request inspection"]')
    expect(section.exists()).toBe(true)

    const preBlocks = section.findAll('pre.raw-output')
    const payload = preBlocks.map((block) => block.text()).join('\n')
    expect(payload).toContain('mock-embedding')

    const copyButton = findButton(wrapper, 'Copy curl')
    expect(copyButton.exists()).toBe(true)
    await copyButton.trigger('click')
    expect(clipboardWriteText).toHaveBeenCalledTimes(1)
    expect(clipboardWriteText).toHaveBeenCalledWith('curl -X POST mock-embedding')
  })
})
