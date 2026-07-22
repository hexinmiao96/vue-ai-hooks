import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  type ComputedRef,
  type Ref
} from 'vue'
import { mergeDeltas as mergeToolDeltas } from './_tc_merge'
import {
  inspectRequestTrace,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'
import { createRequestTrace } from '../utils/trace'
import type {
  AgentEvent,
  AgentEventAdapterOptions,
  AgentEventSource,
  AgentInterruptEvent
} from '../utils/agentEvents'
import { agentEventToChatChunk, readAgentEvents } from '../utils/agentEvents'
import {
  generateId,
  type ChatChunk,
  type IdGenerator,
  type Message,
  type MessagePart,
  type StreamDataPart,
  type TokenUsage
} from '../types'

/** Enumerates the observable lifecycle states of an agent run. */
export type AgentRunStatus =
  'idle' | 'running' | 'streaming' | 'interrupted' | 'completed' | 'error' | 'aborted'

/** Supplies start or resume input and a cancellation signal to the run handler. */
export interface AgentRunRequest<TInput = unknown, TResume = unknown> {
  id: string
  input?: TInput
  resume?: TResume
  interrupt?: AgentInterruptEvent | null
  signal: AbortSignal
}

/** Handles a start or resume request and returns an asynchronously consumable event source. */
export type AgentRunHandler<TInput = unknown, TResume = unknown> = (
  request: AgentRunRequest<TInput, TResume>
) => AgentEventSource | Promise<AgentEventSource>

/** Provides copied event, chunk, message, and usage snapshots for a finished run. */
export interface AgentRunFinishInfo {
  id: string
  status: 'completed' | 'interrupted'
  events: AgentEvent[]
  chunks: ChatChunk[]
  messages: Message[]
  usage: TokenUsage | null
}

/** Captures a start or resume attempt for callbacks and inspection. */
export interface AgentRunRequestInfo<TInput = unknown, TResume = unknown> {
  id: string
  providerId: 'agent-run'
  trigger: 'start' | 'resume'
  attempt: number
  hasInput: boolean
  hasResume: boolean
  hasInterrupt: boolean
  input?: TInput
  resume?: TResume
  interrupt?: AgentInterruptEvent | null
}

/** Summarizes the accumulated output and current lifecycle state of an inspected run. */
export interface AgentRunResponseInfo {
  id: string
  providerId: 'agent-run'
  status: AgentRunStatus
  hasStream: boolean
  eventCount: number
  chunkCount: number
  messageCount: number
  streamDataCount: number
  eventTypes: AgentEvent['type'][]
  latestEventType?: AgentEvent['type']
  interrupt?: AgentInterruptEvent | null
  usage: TokenUsage | null
}

export type AgentRunInspectionSnapshot<
  TInput = unknown,
  TResume = unknown
> = RequestInspectionSnapshot<AgentRunRequestInfo<TInput, TResume>, AgentRunResponseInfo>

/** Configures the run handler, event adaptation, ID generation, and lifecycle callbacks. */
export interface UseAgentRunOptions<
  TInput = unknown,
  TResume = unknown
> extends AgentEventAdapterOptions {
  run: AgentRunHandler<TInput, TResume>
  id?: string
  generateId?: IdGenerator
  onEvent?: (event: AgentEvent) => void
  onChunk?: (chunk: ChatChunk) => void
  onFinish?: (info: AgentRunFinishInfo) => void
  onError?: (error: Error) => void
}

/** Allows one start or resume operation to supply a stable run ID. */
export interface StartAgentRunOptions {
  id?: string
}

export type ResumeAgentRunOptions = StartAgentRunOptions

/** Exposes the accumulated event stream, derived chat state, interrupt, and run controls. */
export interface UseAgentRunReturn<TInput = unknown, TResume = unknown> {
  id: Ref<string>
  currentRunId: Ref<string | null>
  status: Ref<AgentRunStatus>
  isLoading: ComputedRef<boolean>
  events: Ref<AgentEvent[]>
  chunks: Ref<ChatChunk[]>
  messages: Ref<Message[]>
  streamData: Ref<StreamDataPart[]>
  usage: Ref<TokenUsage | null>
  error: Ref<Error | null>
  lastRequest: Ref<AgentRunRequestInfo<TInput, TResume> | null>
  lastResponse: Ref<AgentRunResponseInfo | null>
  interrupt: Ref<AgentInterruptEvent | null>
  hasInterrupt: ComputedRef<boolean>
  inspect: () => AgentRunInspectionSnapshot<TInput, TResume>
  clearTrace: () => void
  start: (input?: TInput, options?: StartAgentRunOptions) => Promise<void>
  resume: (response?: TResume, options?: ResumeAgentRunOptions) => Promise<void>
  stop: () => void
  clear: () => void
}

interface RunControls {
  controller: AbortController
  sequence: number
}

/**
 * Consumes an app-owned agent event stream and derives chunks, messages, data,
 * usage, and interrupts as Vue state. `resume()` invokes the handler only while
 * an interrupt is pending. Calling `start()` with the current active,
 * interrupted, or completed run ID reuses that run instead of restarting it.
 */
export function useAgentRun<TInput = unknown, TResume = unknown>(
  options: UseAgentRunOptions<TInput, TResume>
): UseAgentRunReturn<TInput, TResume> {
  const createId = options.generateId ?? generateId
  const id = shallowRef(options.id ?? createId('agent-run'))
  const currentRunId = shallowRef<string | null>(null)
  const status = shallowRef<AgentRunStatus>('idle')
  const events = shallowRef<AgentEvent[]>([])
  const chunks = shallowRef<ChatChunk[]>([])
  const messages = shallowRef<Message[]>([])
  const streamData = shallowRef<StreamDataPart[]>([])
  const usage = shallowRef<TokenUsage | null>(null)
  const error = shallowRef<Error | null>(null)
  const interrupt = shallowRef<AgentInterruptEvent | null>(null)
  const hasInterrupt = computed(() => interrupt.value !== null)
  const isLoading = computed(() => status.value === 'running' || status.value === 'streaming')
  const { lastRequest, lastResponse, clearTrace, recordRequest, recordResponse } =
    createRequestTrace<AgentRunRequestInfo<TInput, TResume>, AgentRunResponseInfo>()

  let controls: RunControls | null = null
  let sequence = 0
  let assistantId: string | null = null
  let activeRunPromise: Promise<void> | null = null

  async function start(input?: TInput, startOptions: StartAgentRunOptions = {}) {
    const runId = startOptions.id ?? createId('agent-run')
    const replay = replayExistingRun(runId)
    if (replay) return replay
    resetRunState()
    const promise = consume({ input, id: runId })
    trackActiveRun(runId, promise)
    await promise
  }

  async function resume(response?: TResume, resumeOptions: ResumeAgentRunOptions = {}) {
    const pendingInterrupt = interrupt.value
    if (!pendingInterrupt) {
      if (resumeOptions.id) await replayExistingRun(resumeOptions.id)
      return
    }
    const runId = resumeOptions.id ?? createId('agent-run')
    interrupt.value = null
    const promise = consume({
      resume: response,
      interrupt: pendingInterrupt,
      id: runId
    })
    trackActiveRun(runId, promise)
    await promise
  }

  function stop() {
    controls?.controller.abort()
    controls = null
    if (status.value === 'running' || status.value === 'streaming') status.value = 'aborted'
  }

  function clear() {
    stop()
    resetRunState()
    clearTrace()
    currentRunId.value = null
    status.value = 'idle'
  }

  function inspect(): AgentRunInspectionSnapshot<TInput, TResume> {
    return inspectRequestTrace({
      status: status.value,
      error: error.value,
      lastRequest: lastRequest.value,
      lastResponse: lastResponse.value,
      events: agentEventsToInspectionTimeline(events.value)
    })
  }

  async function consume(request: {
    id: string
    input?: TInput
    resume?: TResume
    interrupt?: AgentInterruptEvent | null
  }) {
    stop()
    const controller = new AbortController()
    // Sequence ownership prevents a superseded run from mutating the current run's state.
    const runSequence = ++sequence
    controls = { controller, sequence: runSequence }
    currentRunId.value = request.id
    recordRequest(createAgentRunRequestInfo(request, runSequence))
    status.value = 'running'
    error.value = null
    let finished = false

    try {
      const source = await options.run({
        id: request.id,
        input: request.input,
        resume: request.resume,
        interrupt: request.interrupt,
        signal: controller.signal
      })

      for await (const event of readAgentEvents(source, controller.signal)) {
        if (controls?.sequence !== runSequence) return
        if (status.value === 'running') status.value = 'streaming'
        events.value = [...events.value, event]
        options.onEvent?.(event)
        if (event.type === 'interrupt') interrupt.value = event
        if (event.type === 'finish') finished = true

        const chunk = agentEventToChatChunk(event, options)
        chunks.value = [...chunks.value, chunk]
        options.onChunk?.(chunk)
        applyChunk(chunk)
        recordResponse(
          createAgentRunResponseInfo(
            request.id,
            status.value,
            events.value,
            chunks.value,
            messages.value,
            streamData.value,
            interrupt.value,
            usage.value
          )
        )
      }

      if (controls?.sequence !== runSequence) return
      controls = null
      const nextStatus: AgentRunStatus = controller.signal.aborted
        ? 'aborted'
        : interrupt.value && !finished
          ? 'interrupted'
          : 'completed'
      status.value = nextStatus
      recordResponse(
        createAgentRunResponseInfo(
          request.id,
          nextStatus,
          events.value,
          chunks.value,
          messages.value,
          streamData.value,
          interrupt.value,
          usage.value
        )
      )
      if (!controller.signal.aborted) {
        options.onFinish?.({
          id: request.id,
          status: nextStatus === 'interrupted' ? 'interrupted' : 'completed',
          events: events.value.map((event) => ({ ...event })),
          chunks: chunks.value.map(cloneChunk),
          messages: messages.value.map(cloneMessage),
          usage: usage.value ? { ...usage.value } : null
        })
      }
    } catch (err) {
      if (controls?.sequence !== runSequence) return
      controls = null
      if (controller.signal.aborted || isAbortError(err)) {
        status.value = 'aborted'
        return
      }
      const nextError = err instanceof Error ? err : new Error(String(err))
      error.value = nextError
      status.value = 'error'
      recordResponse(
        createAgentRunResponseInfo(
          request.id,
          'error',
          events.value,
          chunks.value,
          messages.value,
          streamData.value,
          interrupt.value,
          usage.value
        )
      )
      options.onError?.(nextError)
      throw nextError
    }
  }

  function replayExistingRun(runId: string): Promise<void> | null {
    if (currentRunId.value !== runId) return null
    if (status.value === 'running' || status.value === 'streaming') {
      return activeRunPromise ?? Promise.resolve()
    }
    if (status.value === 'interrupted' || status.value === 'completed') {
      return Promise.resolve()
    }
    return null
  }

  function trackActiveRun(runId: string, promise: Promise<void>) {
    activeRunPromise = promise
    promise.then(
      () => {
        if (currentRunId.value === runId) activeRunPromise = null
      },
      () => {
        if (currentRunId.value === runId) activeRunPromise = null
      }
    )
  }

  function resetRunState() {
    events.value = []
    chunks.value = []
    messages.value = []
    streamData.value = []
    usage.value = null
    error.value = null
    interrupt.value = null
    assistantId = null
  }

  function applyChunk(chunk: ChatChunk) {
    if (chunk.data !== undefined && !chunk.transient) {
      streamData.value = [
        ...streamData.value,
        {
          id: chunk.dataId ?? createId('data'),
          data: chunk.data,
          ...(chunk.dataType ? { type: chunk.dataType } : {}),
          ...(chunk.transient !== undefined ? { transient: chunk.transient } : {}),
          createdAt: new Date()
        }
      ]
    }

    if (chunk.usage) usage.value = chunk.usage
    if (!hasAssistantDelta(chunk)) return

    const { assistant, replaceId } = nextAssistant(chunk.messageId)
    if (chunk.content) assistant.content += chunk.content
    if (chunk.toolCalls?.length)
      assistant.toolCalls = mergeToolDeltas(assistant.toolCalls, chunk.toolCalls)
    if (chunk.parts?.length) assistant.parts = mergeMessageParts(assistant.parts, chunk.parts)
    if (chunk.finishReason) {
      assistant.metadata = { ...(assistant.metadata ?? {}), finishReason: chunk.finishReason }
    }
    if (chunk.usage) assistant.metadata = { ...(assistant.metadata ?? {}), usage: chunk.usage }
    if (chunk.metadata) assistant.metadata = { ...(assistant.metadata ?? {}), ...chunk.metadata }
    replaceAssistant(assistant, replaceId)
  }

  function nextAssistant(messageId?: string): { assistant: Message; replaceId: string } {
    const currentId = assistantId
    const nextId = messageId ?? currentId ?? createId('assistant')
    assistantId = nextId
    const current = currentId
      ? messages.value.find((message) => message.id === currentId && message.role === 'assistant')
      : null
    if (current && currentId)
      return { assistant: cloneMessage({ ...current, id: nextId }), replaceId: currentId }

    const assistant: Message = {
      id: nextId,
      role: 'assistant',
      content: '',
      createdAt: new Date()
    }
    messages.value = [...messages.value, assistant]
    return { assistant: cloneMessage(assistant), replaceId: nextId }
  }

  function replaceAssistant(assistant: Message, replaceId: string) {
    messages.value = messages.value.map((message) =>
      message.id === replaceId && message.role === 'assistant' ? cloneMessage(assistant) : message
    )
  }

  if (getCurrentScope()) onScopeDispose(stop)

  return {
    id,
    currentRunId,
    status,
    isLoading,
    events,
    chunks,
    messages,
    streamData,
    usage,
    error,
    lastRequest,
    lastResponse,
    interrupt,
    hasInterrupt,
    inspect,
    clearTrace,
    start,
    resume,
    stop,
    clear
  }
}

/** Creates request inspection metadata for a start or resume attempt. */
export function createAgentRunRequestInfo<TInput = unknown, TResume = unknown>(
  request: {
    id: string
    input?: TInput
    resume?: TResume
    interrupt?: AgentInterruptEvent | null
  },
  attempt: number
): AgentRunRequestInfo<TInput, TResume> {
  return {
    id: request.id,
    providerId: 'agent-run',
    trigger: request.interrupt ? 'resume' : 'start',
    attempt,
    hasInput: request.input !== undefined,
    hasResume: request.resume !== undefined,
    hasInterrupt: request.interrupt != null,
    ...(request.input !== undefined ? { input: request.input } : {}),
    ...(request.resume !== undefined ? { resume: request.resume } : {}),
    ...(request.interrupt !== undefined
      ? { interrupt: request.interrupt ? { ...request.interrupt } : null }
      : {})
  }
}

/** Summarizes accumulated run output without retaining mutable array references. */
export function createAgentRunResponseInfo(
  id: string,
  status: AgentRunStatus,
  events: readonly AgentEvent[],
  chunks: readonly ChatChunk[],
  messages: readonly Message[],
  streamData: readonly StreamDataPart[],
  interrupt: AgentInterruptEvent | null,
  usage: TokenUsage | null
): AgentRunResponseInfo {
  const eventTypes = events.map((event) => event.type)
  const latestEventType = eventTypes[eventTypes.length - 1]
  return {
    id,
    providerId: 'agent-run',
    status,
    hasStream: events.length > 0,
    eventCount: events.length,
    chunkCount: chunks.length,
    messageCount: messages.length,
    streamDataCount: streamData.length,
    eventTypes,
    ...(latestEventType ? { latestEventType } : {}),
    ...(interrupt ? { interrupt: { ...interrupt } } : {}),
    usage: usage ? { ...usage } : null
  }
}

/** Converts agent events into the generic inspection timeline representation. */
export function agentEventsToInspectionTimeline(
  events: readonly AgentEvent[]
): InspectionTimelineEventInput[] {
  return events.map((event, index) => ({
    kind: event.type === 'error' ? 'error' : 'stream',
    label: `agent ${event.type}`,
    ...(event.type === 'error' ? { message: event.errorText, category: 'provider' as const } : {}),
    metadata: {
      index,
      type: event.type,
      ...agentEventMetadata(event)
    }
  }))
}

function agentEventMetadata(event: AgentEvent): Record<string, unknown> {
  if ('id' in event && event.id) return { id: event.id, ...agentNamedEventMetadata(event) }
  return agentNamedEventMetadata(event)
}

function agentNamedEventMetadata(event: AgentEvent): Record<string, unknown> {
  if ('name' in event && event.name) return { name: event.name }
  if (event.type === 'finish') return { finishReason: event.finishReason ?? 'stop' }
  return {}
}

function hasAssistantDelta(chunk: ChatChunk): boolean {
  return Boolean(
    chunk.messageId ||
    chunk.content ||
    chunk.toolCalls?.length ||
    chunk.parts?.length ||
    chunk.finishReason ||
    chunk.usage ||
    chunk.metadata
  )
}

function mergeMessageParts(
  existing: MessagePart[] | undefined,
  incoming: MessagePart[]
): MessagePart[] {
  const parts = existing ? existing.map((part) => ({ ...part })) : []
  for (const part of incoming) {
    const index = findReplaceablePartIndex(parts, part)
    if (index >= 0) {
      parts[index] = { ...parts[index], ...part }
      continue
    }
    parts.push({ ...part })
  }
  return parts
}

function findReplaceablePartIndex(parts: MessagePart[], part: MessagePart) {
  if (part.type.startsWith('tool-') && 'toolCallId' in part) {
    return parts.findIndex(
      (item) =>
        item.type.startsWith('tool-') && 'toolCallId' in item && item.toolCallId === part.toolCallId
    )
  }
  if ('id' in part && part.id) {
    return parts.findIndex((item) => item.type === part.type && 'id' in item && item.id === part.id)
  }
  return -1
}

function cloneMessage(message: Message): Message {
  return {
    ...message,
    content: Array.isArray(message.content)
      ? message.content.map((part) =>
          part.type === 'image_url' ? { ...part, image_url: { ...part.image_url } } : { ...part }
        )
      : message.content,
    ...(message.parts ? { parts: message.parts.map((part) => ({ ...part })) } : {}),
    ...(message.toolCalls
      ? {
          toolCalls: message.toolCalls.map((call) => ({
            ...call,
            function: { ...call.function }
          }))
        }
      : {}),
    ...(message.createdAt ? { createdAt: new Date(message.createdAt.getTime()) } : {}),
    ...(message.metadata ? { metadata: { ...message.metadata } } : {})
  }
}

function cloneChunk(chunk: ChatChunk): ChatChunk {
  return {
    ...chunk,
    ...(chunk.parts ? { parts: chunk.parts.map((part) => ({ ...part })) } : {}),
    ...(chunk.toolCalls
      ? {
          toolCalls: chunk.toolCalls.map((call) => ({
            ...call,
            function: call.function ? { ...call.function } : undefined
          }))
        }
      : {}),
    ...(chunk.usage ? { usage: { ...chunk.usage } } : {}),
    ...(chunk.metadata ? { metadata: { ...chunk.metadata } } : {})
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}
