import { ref, shallowRef, type Ref } from 'vue'
import { usePersist } from './usePersist'
import type { ChatProvider } from '../providers/types'
import type { ChatRequest, Message, MessageRole } from '../types'
import { createId } from '../utils/id'
import { AiHooksError } from '../types'

export interface UseChatOptions {
  provider?: ChatProvider
  initialMessages?: Message[]
  defaultRequest?: Partial<ChatRequest>
  id?: string
  /**
   * Persist `messages` to localStorage. On mount, restores from storage if the
   * key exists. On every change, writes back. `clear()` removes the entry.
   */
  persist?: {
    key: string
    version?: number
  }
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
  const { provider: providedProvider, initialMessages = empty, defaultRequest = {}, onUpdate, onFinish, onError, persist } = options

  if (!providedProvider) {
    throw new Error('useChat requires a provider option')
  }
  const provider = providedProvider

  const messages = ref<Message[]>([...initialMessages]) as Ref<Message[]>
  const input = ref('')
  // Wire up persistence AFTER initial state, so a stored value overrides initialMessages
  const persistence = persist ? usePersist(messages, {
    key: persist.key,
    version: persist.version,
    onError: (e) => { error.value = e }
  }) : null
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const abortController = shallowRef<AbortController | null>(null)

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
  async function streamReply(assistant: Message, request: ChatRequest) {
    const controller = new AbortController()
    abortController.value = controller
    isLoading.value = true
    error.value = null
    try {
      const stream = await provider.chat({ ...defaultRequest, ...request, signal: controller.signal })
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
      onFinish?.({ ...assistant })
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      if ((e as { name?: string }).name === 'AbortError' || controller.signal.aborted) {
        onFinish?.({ ...assistant })
        return
      }
      error.value = e
      onError?.(e)
      throw e
    } finally {
      abortController.value = null
      isLoading.value = false
    }
  }
  async function append(content: string | Message, requestOptions: Partial<ChatRequest> = {}) {
    const userMessage: Message =
      typeof content === 'string'
        ? { id: createId('user'), role: 'user', content, createdAt: new Date() }
        : { ...content, id: content.id || createId(content.role) }
    const assistant = buildAssistant()
    messages.value = [...messages.value, userMessage, assistant]
    await streamReply(assistant, {
      messages: messages.value.filter((m) => m.id !== assistant.id).concat(userMessage),
      ...requestOptions
    })
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
    await streamReply(assistant, { messages: truncated })
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
