import { useCallback, useEffect, useRef, useState } from 'react'
import { mergeDeltas as mergeToolDeltas } from '../composables/_tc_merge'
import {
  inspectRequestTrace,
  type InspectionTimelineEventInput,
  type RequestInspectionSnapshot
} from '../utils/inspection'
import type {
  AgentEvent,
  AgentEventAdapterOptions,
  AgentEventSource,
  AgentInterruptEvent
} from '../utils/agentEvents'
import { agentEventToChatChunk, readAgentEvents } from '../utils/agentEvents'
import { createId } from '../utils/id'
import type {
  ChatChunk,
  IdGenerator,
  Message,
  MessagePart,
  StreamDataPart,
  TokenUsage
} from '../types'

/** Describes one start or resume invocation passed to the application-owned agent runner. */
export interface ReactAgentRunRequest<TInput = unknown, TResume = unknown> {
  id: string
  input?: TInput
  resume?: TResume
  interrupt?: AgentInterruptEvent | null
  signal: AbortSignal
}

/** Produces the event source consumed by `useAgentRun`. */
export type ReactAgentRunHandler<TInput = unknown, TResume = unknown> = (
  request: ReactAgentRunRequest<TInput, TResume>
) => AgentEventSource | Promise<AgentEventSource>

/** Summarizes the completed or interrupted agent run delivered to `onFinish`. */
export interface ReactAgentRunFinishInfo {
  id: string
  status: 'completed' | 'interrupted'
  events: AgentEvent[]
  chunks: ChatChunk[]
  messages: Message[]
  usage: TokenUsage | null
}

/** Captures inspection metadata for an agent start or resume request. */
export interface ReactAgentRunRequestInfo<TInput = unknown, TResume = unknown> {
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

/** Summarizes the latest observable state of an agent event stream. */
export interface ReactAgentRunResponseInfo {
  id: string
  providerId: 'agent-run'
  status: ReactAgentRunStatus
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

/** Request inspection snapshot produced by a React agent run. */
export type ReactAgentRunInspectionSnapshot<
  TInput = unknown,
  TResume = unknown
> = RequestInspectionSnapshot<ReactAgentRunRequestInfo<TInput, TResume>, ReactAgentRunResponseInfo>

/** Lifecycle states exposed by `useAgentRun`. */
export type ReactAgentRunStatus =
  'idle' | 'running' | 'streaming' | 'interrupted' | 'completed' | 'error' | 'aborted'

/** Configures the agent event source, event adaptation, identity, and lifecycle callbacks. */
export interface UseReactAgentRunOptions<
  TInput = unknown,
  TResume = unknown
> extends AgentEventAdapterOptions {
  run: ReactAgentRunHandler<TInput, TResume>
  id?: string
  generateId?: IdGenerator
  onEvent?: (event: AgentEvent) => void
  onChunk?: (chunk: ChatChunk) => void
  onFinish?: (info: ReactAgentRunFinishInfo) => void
  onError?: (error: Error) => void
}

/** Exposes the normalized event stream, derived chat state, interrupts, and run controls. */
export interface UseReactAgentRunReturn<TInput = unknown, TResume = unknown> {
  id: string
  currentRunId: string | null
  status: ReactAgentRunStatus
  isLoading: boolean
  events: AgentEvent[]
  chunks: ChatChunk[]
  messages: Message[]
  streamData: StreamDataPart[]
  usage: TokenUsage | null
  error: Error | null
  lastRequest: ReactAgentRunRequestInfo<TInput, TResume> | null
  lastResponse: ReactAgentRunResponseInfo | null
  interrupt: AgentInterruptEvent | null
  hasInterrupt: boolean
  inspect: () => ReactAgentRunInspectionSnapshot<TInput, TResume>
  clearTrace: () => void
  start: (input?: TInput, options?: StartAgentRunOptions) => Promise<void>
  resume: (response?: TResume, options?: ResumeAgentRunOptions) => Promise<void>
  stop: () => void
  clear: () => void
  abortController: AbortController | null
}

/** Overrides the run ID used for a single start or resume operation. */
export interface StartAgentRunOptions {
  id?: string
}

/** Overrides the run ID used for a single resume operation. */
export type ResumeAgentRunOptions = StartAgentRunOptions

interface RunControls {
  controller: AbortController
  sequence: number
}

interface RunStateRef {
  events: AgentEvent[]
  chunks: ChatChunk[]
  messages: Message[]
  streamData: StreamDataPart[]
  interrupt: AgentInterruptEvent | null
  usage: TokenUsage | null
  assistantId: string | null
}

const initialRunState: RunStateRef = {
  events: [],
  chunks: [],
  messages: [],
  streamData: [],
  interrupt: null,
  usage: null,
  assistantId: null
}

/**
 * Consumes an application-owned agent event stream and exposes normalized React state.
 *
 * Starting a new run aborts the active run. Reusing the current run ID returns the active promise
 * or preserves an already interrupted or completed result instead of replaying side effects.
 *
 * @returns Agent events, derived chat state, interrupt details, lifecycle controls, and inspection
 * data.
 */
export function useAgentRun<TInput = unknown, TResume = unknown>(
  options: UseReactAgentRunOptions<TInput, TResume>
): UseReactAgentRunReturn<TInput, TResume> {
  const {
    run,
    id: explicitId,
    generateId = createId,
    onEvent,
    onChunk,
    onFinish,
    onError,
    ...adapterOptions
  } = options

  const [id] = useState(() => explicitId ?? generateId('agent-run'))
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [status, setStatusState] = useState<ReactAgentRunStatus>('idle')
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [chunks, setChunks] = useState<ChatChunk[]>([])
  const [messages, setMessagesState] = useState<Message[]>([])
  const [streamData, setStreamDataState] = useState<StreamDataPart[]>([])
  const [usage, setUsageState] = useState<TokenUsage | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [lastRequest, setLastRequestState] = useState<ReactAgentRunRequestInfo<
    TInput,
    TResume
  > | null>(null)
  const [lastResponse, setLastResponseState] = useState<ReactAgentRunResponseInfo | null>(null)
  const [interrupt, setInterruptState] = useState<AgentInterruptEvent | null>(null)
  const [abortController, setAbortControllerState] = useState<AbortController | null>(null)

  const statusRef = useRef<ReactAgentRunStatus>('idle')
  const controlsRef = useRef<RunControls | null>(null)
  const sequenceRef = useRef(0)
  const currentRunIdRef = useRef<string | null>(null)
  const activeRunPromiseRef = useRef<Promise<void> | null>(null)
  const stateRef = useRef<RunStateRef>({ ...initialRunState })
  const lastRequestRef = useRef<ReactAgentRunRequestInfo<TInput, TResume> | null>(null)
  const lastResponseRef = useRef<ReactAgentRunResponseInfo | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const onEventRef = useRef(onEvent)
  const onChunkRef = useRef(onChunk)
  const onFinishRef = useRef(onFinish)
  const onErrorRef = useRef(onError)
  const runRef = useRef(run)
  const adapterOptionsRef = useRef(adapterOptions)

  runRef.current = run
  onEventRef.current = onEvent
  onChunkRef.current = onChunk
  onFinishRef.current = onFinish
  onErrorRef.current = onError
  adapterOptionsRef.current = adapterOptions
  statusRef.current = status

  const setStatus = useCallback((next: ReactAgentRunStatus) => {
    statusRef.current = next
    setStatusState(next)
  }, [])

  const setAbortController = useCallback((controller: AbortController | null) => {
    abortControllerRef.current = controller
    setAbortControllerState(controller)
  }, [])

  const setCurrentRunIdValue = useCallback((next: string | null) => {
    currentRunIdRef.current = next
    setCurrentRunId(next)
  }, [])

  const publishEvents = useCallback((next: AgentEvent[]) => {
    stateRef.current.events = next
    setEvents(next)
  }, [])

  const publishChunks = useCallback((next: ChatChunk[]) => {
    stateRef.current.chunks = next
    setChunks(next)
  }, [])

  const publishMessages = useCallback((next: Message[]) => {
    stateRef.current.messages = next
    setMessagesState(next)
  }, [])

  const publishStreamData = useCallback((next: StreamDataPart[]) => {
    stateRef.current.streamData = next
    setStreamDataState(next)
  }, [])

  const publishUsage = useCallback((next: TokenUsage | null) => {
    stateRef.current.usage = next
    setUsageState(next)
  }, [])

  const publishLastRequest = useCallback(
    (next: ReactAgentRunRequestInfo<TInput, TResume> | null) => {
      lastRequestRef.current = next
      setLastRequestState(next)
    },
    []
  )

  const publishLastResponse = useCallback((next: ReactAgentRunResponseInfo | null) => {
    lastResponseRef.current = next
    setLastResponseState(next)
  }, [])

  const recordEvent = useCallback(
    (event: AgentEvent) => {
      onEventRef.current?.(event)
      publishEvents([...stateRef.current.events, event])
    },
    [publishEvents]
  )

  const recordChunk = useCallback(
    (chunk: ChatChunk) => {
      onChunkRef.current?.(chunk)
      publishChunks([...stateRef.current.chunks, chunk])
    },
    [publishChunks]
  )

  const nextAssistant = useCallback(
    (messageId?: string) => {
      const currentAssistantId = stateRef.current.assistantId
      const nextAssistantId = messageId ?? currentAssistantId ?? createId('assistant')
      stateRef.current.assistantId = nextAssistantId

      const currentAssistant = currentAssistantId
        ? stateRef.current.messages.find(
            (message) => message.id === currentAssistantId && message.role === 'assistant'
          )
        : null

      if (currentAssistant && currentAssistantId) {
        return {
          assistant: cloneMessage({ ...currentAssistant, id: nextAssistantId }),
          replaceId: currentAssistantId
        }
      }

      const assistant: Message = {
        id: nextAssistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date()
      }

      publishMessages([...stateRef.current.messages, assistant])
      return {
        assistant: cloneMessage(assistant),
        replaceId: nextAssistantId
      }
    },
    [publishMessages]
  )

  const replaceAssistant = useCallback(
    (assistant: Message, replaceId: string) => {
      const currentMessages = stateRef.current.messages
      const next = currentMessages.some(
        (message) => message.id === replaceId && message.role === 'assistant'
      )
        ? currentMessages.map((message) =>
            message.id === replaceId && message.role === 'assistant'
              ? cloneMessage(assistant)
              : message
          )
        : [...currentMessages, cloneMessage(assistant)]
      publishMessages(next)
    },
    [publishMessages]
  )

  const applyChunk = useCallback(
    (chunk: ChatChunk) => {
      if (chunk.data !== undefined && !chunk.transient) {
        const part: StreamDataPart = {
          id: chunk.dataId ?? createId('data'),
          data: chunk.data,
          ...(chunk.dataType ? { type: chunk.dataType } : {}),
          ...(chunk.transient !== undefined ? { transient: chunk.transient } : {}),
          createdAt: new Date()
        }
        publishStreamData([...stateRef.current.streamData, part])
      }

      if (chunk.usage) {
        publishUsage(chunk.usage)
      }

      if (!hasAssistantDelta(chunk)) return

      const { assistant, replaceId } = nextAssistant(chunk.messageId)

      if (chunk.content) {
        assistant.content = `${assistant.content}${chunk.content}`
      }

      if (chunk.toolCalls?.length) {
        assistant.toolCalls = mergeToolDeltas(assistant.toolCalls, chunk.toolCalls)
      }

      if (chunk.parts?.length) {
        assistant.parts = mergeMessageParts(assistant.parts, chunk.parts)
      }

      if (chunk.finishReason) {
        assistant.metadata = { ...(assistant.metadata ?? {}), finishReason: chunk.finishReason }
      }

      if (chunk.usage) {
        assistant.metadata = { ...(assistant.metadata ?? {}), usage: chunk.usage }
      }

      if (chunk.metadata) {
        assistant.metadata = { ...(assistant.metadata ?? {}), ...chunk.metadata }
      }

      replaceAssistant(assistant, replaceId)
    },
    [nextAssistant, publishStreamData, publishUsage, replaceAssistant]
  )

  const resetRunState = useCallback(() => {
    stateRef.current = { ...initialRunState }
    publishEvents([])
    publishChunks([])
    publishMessages([])
    publishStreamData([])
    publishUsage(null)
    setInterruptState(null)
    setError(null)
  }, [publishChunks, publishEvents, publishMessages, publishStreamData, publishUsage])

  const clearTrace = useCallback(() => {
    publishLastRequest(null)
    publishLastResponse(null)
  }, [publishLastRequest, publishLastResponse])

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    setAbortController(null)
    controlsRef.current = null
    if (statusRef.current === 'running' || statusRef.current === 'streaming') {
      setStatus('aborted')
    }
    setIsLoading(false)
  }, [setAbortController, setStatus])

  const clear = useCallback(() => {
    stop()
    resetRunState()
    clearTrace()
    setCurrentRunIdValue(null)
    setStatus('idle')
    setIsLoading(false)
  }, [clearTrace, resetRunState, setCurrentRunIdValue, setStatus, stop])

  const inspect = useCallback(
    (): ReactAgentRunInspectionSnapshot<TInput, TResume> =>
      inspectRequestTrace({
        status,
        error,
        lastRequest,
        lastResponse,
        events: reactAgentEventsToInspectionTimeline(events)
      }),
    [error, events, lastRequest, lastResponse, status]
  )

  const consume = useCallback(
    async (request: {
      id: string
      input?: TInput
      resume?: TResume
      interrupt?: AgentInterruptEvent | null
    }) => {
      stop()

      const controller = new AbortController()
      // Sequence checks prevent an obsolete stream from publishing after a newer run starts.
      const runSequence = ++sequenceRef.current
      controlsRef.current = { controller, sequence: runSequence }
      setAbortController(controller)
      setCurrentRunIdValue(request.id)
      publishLastRequest(createReactAgentRunRequestInfo(request, runSequence))
      publishLastResponse(null)
      setStatus('running')
      setIsLoading(true)
      setError(null)
      setInterruptState(null)
      stateRef.current.interrupt = null
      let finished = false

      try {
        const source = await runRef.current({
          id: request.id,
          input: request.input,
          resume: request.resume,
          interrupt: request.interrupt,
          signal: controller.signal
        })

        for await (const event of readAgentEvents(source, controller.signal)) {
          if (controlsRef.current?.sequence !== runSequence) return
          if (statusRef.current === 'running') {
            setStatus('streaming')
          }
          recordEvent(event)
          if (event.type === 'interrupt') {
            stateRef.current.interrupt = event
            setInterruptState(event)
          }
          if (event.type === 'finish') {
            finished = true
          }

          const chunk = agentEventToChatChunk(event, adapterOptionsRef.current)
          recordChunk(chunk)
          applyChunk(chunk)
          publishLastResponse(
            createReactAgentRunResponseInfo(
              request.id,
              statusRef.current,
              stateRef.current.events,
              stateRef.current.chunks,
              stateRef.current.messages,
              stateRef.current.streamData,
              stateRef.current.interrupt,
              stateRef.current.usage
            )
          )
        }

        if (controlsRef.current?.sequence !== runSequence) return

        controlsRef.current = null
        setAbortController(null)
        setIsLoading(false)

        const nextStatus: ReactAgentRunStatus = controller.signal.aborted
          ? 'aborted'
          : stateRef.current.interrupt && !finished
            ? 'interrupted'
            : 'completed'

        setStatus(nextStatus)
        publishLastResponse(
          createReactAgentRunResponseInfo(
            request.id,
            nextStatus,
            stateRef.current.events,
            stateRef.current.chunks,
            stateRef.current.messages,
            stateRef.current.streamData,
            stateRef.current.interrupt,
            stateRef.current.usage
          )
        )

        if (!controller.signal.aborted) {
          onFinishRef.current?.({
            id: request.id,
            status: nextStatus === 'interrupted' ? 'interrupted' : 'completed',
            events: stateRef.current.events.map((item) => ({ ...item })),
            chunks: stateRef.current.chunks.map(cloneChunk),
            messages: stateRef.current.messages.map(cloneMessage),
            usage: stateRef.current.usage ? { ...stateRef.current.usage } : null
          })
        }
      } catch (rawError) {
        if (controlsRef.current?.sequence !== runSequence) return

        controlsRef.current = null
        setAbortController(null)
        setIsLoading(false)

        if (controller.signal.aborted || isAbortError(rawError)) {
          setStatus('aborted')
          return
        }

        const nextError = rawError instanceof Error ? rawError : new Error(String(rawError))
        setError(nextError)
        setStatus('error')
        publishLastResponse(
          createReactAgentRunResponseInfo(
            request.id,
            'error',
            stateRef.current.events,
            stateRef.current.chunks,
            stateRef.current.messages,
            stateRef.current.streamData,
            stateRef.current.interrupt,
            stateRef.current.usage
          )
        )
        onErrorRef.current?.(nextError)
        throw nextError
      }
    },
    [
      applyChunk,
      recordChunk,
      recordEvent,
      runRef,
      setAbortController,
      setCurrentRunIdValue,
      setStatus,
      stop,
      publishLastRequest,
      publishLastResponse
    ]
  )

  const replayExistingRun = useCallback((runId: string): Promise<void> | null => {
    if (currentRunIdRef.current !== runId) return null
    if (statusRef.current === 'running' || statusRef.current === 'streaming') {
      return activeRunPromiseRef.current ?? Promise.resolve()
    }
    if (statusRef.current === 'interrupted' || statusRef.current === 'completed') {
      return Promise.resolve()
    }
    return null
  }, [])

  const trackActiveRun = useCallback((runId: string, promise: Promise<void>) => {
    activeRunPromiseRef.current = promise
    promise.then(
      () => {
        if (currentRunIdRef.current === runId) activeRunPromiseRef.current = null
      },
      () => {
        if (currentRunIdRef.current === runId) activeRunPromiseRef.current = null
      }
    )
  }, [])

  const start = useCallback(
    (input?: TInput, startOptions: StartAgentRunOptions = {}) => {
      const runId = startOptions.id ?? generateId('agent-run')
      const replay = replayExistingRun(runId)
      if (replay) return replay
      resetRunState()
      const promise = consume({
        input,
        id: runId
      })
      trackActiveRun(runId, promise)
      return promise
    },
    [consume, generateId, replayExistingRun, resetRunState, trackActiveRun]
  )

  const resume = useCallback(
    (response?: TResume, resumeOptions: ResumeAgentRunOptions = {}) => {
      const pendingInterrupt = stateRef.current.interrupt
      if (!pendingInterrupt) {
        return resumeOptions.id
          ? (replayExistingRun(resumeOptions.id) ?? Promise.resolve())
          : Promise.resolve()
      }
      const runId = resumeOptions.id ?? generateId('agent-run')
      setInterruptState(null)
      stateRef.current.interrupt = null
      const promise = consume({
        resume: response,
        interrupt: pendingInterrupt,
        id: runId
      })
      trackActiveRun(runId, promise)
      return promise
    },
    [consume, generateId, replayExistingRun, trackActiveRun]
  )

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

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
    hasInterrupt: interrupt !== null,
    inspect,
    clearTrace,
    start,
    resume,
    stop,
    clear,
    abortController
  }
}

function createReactAgentRunRequestInfo<TInput = unknown, TResume = unknown>(
  request: {
    id: string
    input?: TInput
    resume?: TResume
    interrupt?: AgentInterruptEvent | null
  },
  attempt: number
): ReactAgentRunRequestInfo<TInput, TResume> {
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

function createReactAgentRunResponseInfo(
  id: string,
  status: ReactAgentRunStatus,
  events: readonly AgentEvent[],
  chunks: readonly ChatChunk[],
  messages: readonly Message[],
  streamData: readonly StreamDataPart[],
  interrupt: AgentInterruptEvent | null,
  usage: TokenUsage | null
): ReactAgentRunResponseInfo {
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

function reactAgentEventsToInspectionTimeline(
  events: readonly AgentEvent[]
): InspectionTimelineEventInput[] {
  return events.map((event, index) => ({
    kind: event.type === 'error' ? 'error' : 'stream',
    label: `agent ${event.type}`,
    ...(event.type === 'error' ? { message: event.errorText, category: 'provider' as const } : {}),
    metadata: {
      index,
      type: event.type,
      ...reactAgentEventMetadata(event)
    }
  }))
}

function reactAgentEventMetadata(event: AgentEvent): Record<string, unknown> {
  if ('id' in event && event.id) return { id: event.id, ...reactAgentNamedEventMetadata(event) }
  return reactAgentNamedEventMetadata(event)
}

function reactAgentNamedEventMetadata(event: AgentEvent): Record<string, unknown> {
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
