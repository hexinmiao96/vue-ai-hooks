import { ref, shallowRef, type Ref } from 'vue'
import type { ChatProvider } from '../providers/types'
import type { ChatChunk, ChatRequest, Message, MessageRole, ToolCall } from '../types'
import { createId } from '../utils/id'
import { AiHooksError } from '../types'

/** Options accepted by `useChat`. Either provide `provider` directly, or the OpenAI-compatible shorthand. */
export interface UseChatOptions {
  /** A pre-built provider. Required if you don't pass the OpenAI shorthand. */
  provider?: ChatProvider

  /** Initial messages. */
  initialMessages?: Message[]

  /** Default request options. */
  defaultRequest?: Partial<ChatRequest>

  /** Identifier for the user (passed to providers that support it). */
  id?: string

  /** Called for every streaming chunk update. */
  onUpdate?: (message: Message) => void

  /** Called once the assistant message is finished (success or error). */
  onFinish?: (message: Message) => void

  /** Called on any error. If omitted, errors are stored in `error` ref. */
  onError?: (err: Error) => void
}

export interface UseChatReturn {
  messages: Ref<Message[]>
  input: Ref<string>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  /** Append a new user message (string or pre-built Message) and stream a reply. */
  append: (content: string | Message, options?: Partial<ChatRequest>) => Promise<void>
  /** Re-run the last assistant response with the current messages. */
  reload: () => Promise<void>
  /** Stop the in-flight stream, if any. */
  stop: () => void
  /** Replace the message history. Useful for restoring from storage. */
  setMessages: (messages: Message[]) => void
  /** Clear all messages and reset state. */
  clear: () => void
  /** The current AbortController for the in-flight request, or null. */
  abortController: Ref<AbortController | null>
}

const empty = [] as Message[]

/**
 * Vue 3 composable for streaming chat completions.
 *
 * ```ts
 * import { useChat, openai } from 'vue-ai-hooks'
 *
 * const { messages, input, append, isLoading } = useChat({
 *   provider: openai({ apiKey: import.meta.env.VITE_OPENAI_KEY })
 * })
 * ```
 */
export function useChat(options: UseChatOptions): UseChatReturn {
  const { provider, initialMessages = empty, defaultRequest = {}, id, onUpdate, onFinish, onError } = options

  if (!provider) {
    throw new Error('useChat requires a `provider` option')
  }

  const messages = ref<Message[]>([...initialMessages]) as Ref<Message[]>
  const input = ref('')
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

  function mergeToolCallDelta(
    existing: ToolCall[] | undefined,
    delta: NonNullable<ChatRequest['messages']>[number] extends never ? never : NonNullable<ChatChunkLike>['toolCalls']
  ): ToolCall[] {
    const acc = existing ? [...existing] : []
    for (const d of delta ?? []) {
      const idx = d.index
      if (idx === undefined) continue
      if (!acc[idx]) {
        acc[idx] = {
          id: d.id ?? '',
          type: 'function',
          function: { name: d.function?.name ?? '', arguments: d.function?.arguments ?? '' }
        }
      } else {
        if (d.id) acc[idx].id = d.id
        if (d.function?.name) acc[idx].function.name += d.function.name
        if (d.function?.arguments) acc[idx].function.arguments += d.function.arguments
      }
    }
    return acc
  }

  // Type alias for the tool-call delta inside a chunk — re-exported for the helper.
  type ChatChunkLike = Parameters<typeof provider.chat>[0] extends infer R
    ? R extends { chat: (...args: never[]) => Promise<AsyncIterable<infer C>> }
      ? C
      : never
    : never

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
          // Force reactivity on the same object — replace in array to trigger.
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
          assistant.toolCalls = mergeToolCallDelta(assistant.toolCalls, chunk.toolCalls)
        }
        if (chunk.finishReason) {
          assistant.metadata = { ...(assistant.metadata ?? {}), finishReason: chunk.finishReason }
        }
      }
      onFinish?.({ ...assistant })
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      if ((e as { name?: string }).name === 'AbortError' || controller.signal.aborted) {
        // User-initiated stop. Don't surface as an error.
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
    // Re-run the last assistant response. Find the most recent assistant
    // message and the user message before it.
    const lastAssistantIdx = [...messages.value]
      .map((m, i) => ({ m, i }))
      .reverse()
      .find(({ m }) => m.role === 'assistant')?.i

    if (lastAssistantIdx === undefined) {
      throw new AiHooksError('reload() called with no assistant message to re-run')
    }

    // Trim everything from lastAssistantIdx onward, then build a fresh assistant.
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
