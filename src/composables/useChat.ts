import { mergeDeltas as mergeD } from './_tc_merge'

import { ref, shallowRef, type Ref } from 'vue'
import { usePersist } from './usePersist'
import type { ChatProvider } from '../providers/types'
import type { ChatRequest, Message, MessageRole, Tool, ToolCall } from '../types'
import { createId } from '../utils/id'
import { AiHooksError } from '../types'

export interface ToolCallHandlerContext {
  toolCall: ToolCall
  messages: Message[]
}

export type ToolCallHandler = (
  args: unknown,
  context: ToolCallHandlerContext
) => unknown | Promise<unknown>

export interface UseChatOptions {
  provider?: ChatProvider
  initialMessages?: Message[]
  defaultRequest?: Partial<ChatRequest>
  id?: string
  persist?: { key: string; version?: number }
  tools?: Tool[]
  toolChoice?: ChatRequest['toolChoice']
  toolHandlers?: Record<string, ToolCallHandler>
  maxToolRoundtrips?: number
  onUpdate?: (m: Message) => void
  onFinish?: (m: Message) => void
  onError?: (e: Error) => void
}

export interface UseChatReturn {
  messages: Ref<Message[]>
  input: Ref<string>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  append: (c: string | Message, o?: Partial<ChatRequest>) => Promise<void>
  reload: () => Promise<void>
  stop: () => void
  setMessages: (m: Message[]) => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

const empty = [] as Message[]

export function useChat(options: UseChatOptions): UseChatReturn {
  const {
    provider: providedProvider,
    initialMessages = empty,
    defaultRequest = {},
    onUpdate,
    onFinish,
    onError,
    persist,
    tools: defaultTools,
    toolChoice: defaultToolChoice,
    toolHandlers,
    maxToolRoundtrips = 1
  } = options
  if (!providedProvider) throw new Error('useChat requires a provider option')
  const provider = providedProvider
  const messages = ref<Message[]>([...initialMessages]) as Ref<Message[]>
  const input = ref('')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const abortController = shallowRef<AbortController | null>(null)
  const persistence = persist
    ? usePersist(messages, {
        key: persist.key,
        version: persist.version,
        onError: (e) => {
          error.value = e
        }
      })
    : null

  function setMessages(next: Message[]) {
    messages.value = [...next]
  }
  function clear() {
    if (abortController.value) abortController.value.abort()
    abortController.value = null
    messages.value = []
    error.value = null
    isLoading.value = false
    input.value = ''
    persistence?.clear()
  }
  function stop() {
    if (abortController.value) abortController.value.abort()
    abortController.value = null
    isLoading.value = false
  }
  function buildAssistant(): Message {
    return {
      id: createId('assistant'),
      role: 'assistant' as MessageRole,
      content: '',
      createdAt: new Date()
    }
  }
  function normalizeError(err: unknown): Error {
    return err instanceof Error ? err : new Error(String(err))
  }
  function reportError(err: unknown): Error {
    const e = normalizeError(err)
    error.value = e
    onError?.(e)
    return e
  }
  function parseToolArgs(call: ToolCall): unknown {
    const raw = call.function.arguments.trim()
    if (!raw) return {}
    try {
      return JSON.parse(raw) as unknown
    } catch (err) {
      throw new AiHooksError(`Invalid JSON arguments for tool "${call.function.name}"`, {
        cause: err
      })
    }
  }
  function serializeToolResult(result: unknown): string {
    if (typeof result === 'string') return result
    if (result === undefined) return ''
    return JSON.stringify(result)
  }
  async function executeToolCalls(calls: ToolCall[]): Promise<Message[]> {
    const toolMessages: Message[] = []
    for (const call of calls) {
      const handler = toolHandlers?.[call.function.name]
      if (!handler) {
        throw new AiHooksError(`No tool handler registered for "${call.function.name}"`)
      }
      const result = await handler(parseToolArgs(call), {
        toolCall: call,
        messages: [...messages.value]
      })
      toolMessages.push({
        id: createId('tool'),
        role: 'tool',
        content: serializeToolResult(result),
        toolCallId: call.id,
        createdAt: new Date()
      })
    }
    return toolMessages
  }

  async function streamReply(assistant: Message, request: ChatRequest): Promise<boolean> {
    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    try {
      const mergedRequest: ChatRequest = {
        ...defaultRequest,
        ...(defaultTools && !request.tools ? { tools: defaultTools } : {}),
        ...(defaultToolChoice && !request.toolChoice ? { toolChoice: defaultToolChoice } : {}),
        ...request,
        signal: controller.signal
      }
      const stream = await provider.chat(mergedRequest)
      for await (const chunk of stream) {
        if (chunk.content) {
          assistant.content += chunk.content
          const idx = messages.value.findIndex((m) => m.id === assistant.id)
          if (idx >= 0) {
            messages.value = [
              ...messages.value.slice(0, idx),
              { ...assistant },
              ...messages.value.slice(idx + 1)
            ]
          }
          onUpdate?.({ ...assistant })
        }
        if (chunk.toolCalls?.length) {
          assistant.toolCalls = mergeD(assistant.toolCalls, chunk.toolCalls)
          const tIdx = messages.value.findIndex((m) => m.id === assistant.id)
          if (tIdx >= 0) {
            messages.value = [
              ...messages.value.slice(0, tIdx),
              { ...assistant },
              ...messages.value.slice(tIdx + 1)
            ]
          }
        }
        if (chunk.finishReason) {
          assistant.metadata = { ...(assistant.metadata ?? {}), finishReason: chunk.finishReason }
          const idx2 = messages.value.findIndex((m) => m.id === assistant.id)
          if (idx2 >= 0) {
            messages.value = [
              ...messages.value.slice(0, idx2),
              { ...assistant },
              ...messages.value.slice(idx2 + 1)
            ]
          }
        }
      }
      if (controller.signal.aborted) {
        onFinish?.({ ...assistant })
        return false
      }
      onFinish?.({ ...assistant })
      return true
    } catch (err) {
      const e = normalizeError(err)
      if ((e as { name?: string }).name === 'AbortError' || controller.signal.aborted) {
        onFinish?.({ ...assistant })
        return false
      }
      error.value = e
      onError?.(e)
      throw e
    } finally {
      abortController.value = null
      isLoading.value = false
    }
  }
  async function runAssistantTurn(
    assistant: Message,
    request: ChatRequest,
    remainingToolRoundtrips: number
  ) {
    const completed = await streamReply(assistant, request)
    if (!completed) return
    const calls = assistant.toolCalls
    if (!toolHandlers || !calls?.length) return
    if (remainingToolRoundtrips <= 0) {
      throw reportError(new AiHooksError('Maximum tool roundtrips exceeded'))
    }

    isLoading.value = true
    let toolMessages: Message[]
    try {
      toolMessages = await executeToolCalls(calls)
    } catch (err) {
      isLoading.value = false
      throw reportError(err)
    }

    const nextAssistant = buildAssistant()
    messages.value = [...messages.value, ...toolMessages, nextAssistant]
    await runAssistantTurn(
      nextAssistant,
      {
        ...request,
        messages: messages.value.filter((m) => m.id !== nextAssistant.id)
      },
      remainingToolRoundtrips - 1
    )
  }

  async function append(content: string | Message, requestOptions: Partial<ChatRequest> = {}) {
    const userMessage: Message =
      typeof content === 'string'
        ? { id: createId('user'), role: 'user', content, createdAt: new Date() }
        : { ...content, id: content.id || createId(content.role) }
    const assistant = buildAssistant()
    messages.value = [...messages.value, userMessage, assistant]
    await runAssistantTurn(
      assistant,
      {
        messages: messages.value.filter((m) => m.id !== assistant.id),
        ...requestOptions
      },
      maxToolRoundtrips
    )
  }
  async function reload() {
    const lastAssistantIdx = [...messages.value]
      .map((m, i) => ({ m, i }))
      .reverse()
      .find(({ m }) => m.role === 'assistant')?.i
    if (lastAssistantIdx === undefined) {
      throw new AiHooksError('reload() called with no assistant message to re-run')
    }
    const truncated = messages.value.slice(0, lastAssistantIdx)
    const assistant = buildAssistant()
    messages.value = [...truncated, assistant]
    await runAssistantTurn(assistant, { messages: truncated }, maxToolRoundtrips)
  }
  return {
    messages,
    input,
    isLoading,
    error,
    append,
    reload,
    stop,
    setMessages,
    clear,
    abortController
  }
}
