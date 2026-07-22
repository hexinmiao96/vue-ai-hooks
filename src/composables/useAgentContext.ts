import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter
} from 'vue'
import type { ChatRequestMessage, Message } from '../types'

/** Restricts agent context values to JSON-compatible primitives, arrays, and records. */
export type AgentContextSerializable =
  | string
  | number
  | boolean
  | null
  | readonly AgentContextSerializable[]
  | { readonly [key: string]: AgentContextSerializable | undefined }

/** Describes a reactive context entry; disabled or unresolved entries are omitted. */
export interface AgentContextInput<
  TValue extends AgentContextSerializable = AgentContextSerializable
> {
  id?: string
  description: MaybeRefOrGetter<string | null | undefined>
  value: MaybeRefOrGetter<TValue | null | undefined>
  enabled?: MaybeRefOrGetter<boolean | null | undefined>
}

/** Represents a resolved, detached context entry ready for model input. */
export interface AgentContextSnapshot<
  TValue extends AgentContextSerializable = AgentContextSerializable
> {
  id: string
  description: string
  value: TValue | null
}

/** Configures the synthetic system message used to carry application context. */
export interface AgentContextMessageOptions {
  id?: string
  title?: string
  createdAt?: Date
}

/** Registers reactive context entries and converts their current snapshots for chat requests. */
export interface AgentContextRegistry {
  contexts: ComputedRef<AgentContextSnapshot[]>
  register: <TValue extends AgentContextSerializable>(
    input: AgentContextInput<TValue>
  ) => () => void
  toJSON: () => AgentContextSnapshot[]
  toText: (options?: Pick<AgentContextMessageOptions, 'title'>) => string
  toSystemMessage: (options?: AgentContextMessageOptions) => Message | null
  withContextMessage: (
    messages: readonly ChatRequestMessage[],
    options?: AgentContextMessageOptions
  ) => ChatRequestMessage[]
  clear: () => void
}

/** Accepts either a registry or a reactive collection of resolved snapshots. */
export type AgentContextSource =
  AgentContextRegistry | MaybeRefOrGetter<readonly AgentContextSnapshot[] | null | undefined>

interface RegisteredAgentContext {
  key: string
  input: AgentContextInput
}

/** Creates an isolated registry whose computed snapshots track every registered input. */
export function useAgentContextRegistry(): AgentContextRegistry {
  const entries = shallowRef<RegisteredAgentContext[]>([])
  let nextId = 0

  const contexts = computed(() =>
    entries.value.flatMap((entry) => {
      const snapshot = resolveAgentContext(entry)
      return snapshot ? [snapshot] : []
    })
  )

  function register<TValue extends AgentContextSerializable>(
    input: AgentContextInput<TValue>
  ): () => void {
    const key = input.id?.trim() || `agent-context-${++nextId}`
    entries.value = [...entries.value, { key, input: input as AgentContextInput }]

    let active = true
    return () => {
      if (!active) return
      active = false
      entries.value = entries.value.filter((entry) => entry.key !== key)
    }
  }

  function toJSON() {
    return contexts.value.map((context) => ({
      id: context.id,
      description: context.description,
      value: cloneSerializable(context.value) ?? null
    }))
  }

  function toText(options: Pick<AgentContextMessageOptions, 'title'> = {}) {
    return formatAgentContexts(contexts.value, options)
  }

  function toSystemMessage(options: AgentContextMessageOptions = {}) {
    return createAgentContextMessage(contexts.value, options)
  }

  function withContextMessage(
    messages: readonly ChatRequestMessage[],
    options: AgentContextMessageOptions = {}
  ) {
    return withAgentContextMessage(messages, contexts.value, options)
  }

  function clear() {
    entries.value = []
  }

  return {
    contexts,
    register,
    toJSON,
    toText,
    toSystemMessage,
    withContextMessage,
    clear
  }
}

/**
 * Registers a context entry and automatically unregisters it when the current
 * Vue effect scope is disposed. The returned function also permits early cleanup.
 */
export function useAgentContext<TValue extends AgentContextSerializable>(
  registry: AgentContextRegistry,
  input: AgentContextInput<TValue>
): () => void {
  const unregister = registry.register(input)
  if (getCurrentScope()) onScopeDispose(unregister)
  return unregister
}

/** Resolves the current snapshots from a registry or reactive snapshot source. */
export function resolveAgentContexts(source?: AgentContextSource | false): AgentContextSnapshot[] {
  if (!source) return []
  if (isAgentContextRegistry(source)) return source.contexts.value
  return [...(toValue(source) ?? [])]
}

/** Formats snapshots as a titled, line-oriented block for model consumption. */
export function formatAgentContexts(
  contexts: readonly AgentContextSnapshot[],
  options: Pick<AgentContextMessageOptions, 'title'> = {}
): string {
  if (!contexts.length) return ''
  const title = normalizeDescription(options.title ?? 'Application context')
  const lines = contexts.map(
    (context) => `- ${context.description}: ${formatAgentContextValue(context.value)}`
  )
  return [title, ...lines].join('\n')
}

/** Creates a system message for the snapshots, or returns `null` when none are present. */
export function createAgentContextMessage(
  contexts: readonly AgentContextSnapshot[],
  options: AgentContextMessageOptions = {}
): Message | null {
  const content = formatAgentContexts(contexts, options)
  if (!content) return null
  return {
    id: options.id?.trim() || 'agent-context',
    role: 'system',
    content,
    createdAt: options.createdAt ? new Date(options.createdAt.getTime()) : new Date()
  }
}

/**
 * Returns cloned request messages with one current context message inserted
 * after the leading system-message block. A prior context message with the same
 * ID is replaced.
 */
export function withAgentContextMessage(
  messages: readonly ChatRequestMessage[],
  contexts: readonly AgentContextSnapshot[],
  options: AgentContextMessageOptions = {}
): ChatRequestMessage[] {
  const contextMessage = createAgentContextMessage(contexts, options)
  if (!contextMessage) return messages.map(cloneRequestMessage)

  const contextId = contextMessage.id
  const withoutPriorContext = messages
    .filter((message) => message.id !== contextId)
    .map(cloneRequestMessage)
  let insertAt = 0
  while (withoutPriorContext[insertAt]?.role === 'system') insertAt += 1

  return [
    ...withoutPriorContext.slice(0, insertAt),
    contextMessage,
    ...withoutPriorContext.slice(insertAt)
  ]
}

function resolveAgentContext(entry: RegisteredAgentContext): AgentContextSnapshot | null {
  if (toValue(entry.input.enabled) === false) return null

  const description = normalizeDescription(toValue(entry.input.description))
  if (!description) return null

  const rawValue = toValue(entry.input.value)
  if (rawValue === undefined) return null
  const value = cloneSerializable(rawValue)
  if (value === undefined) return null

  return {
    id: entry.key,
    description,
    value
  }
}

function isAgentContextRegistry(value: AgentContextSource): value is AgentContextRegistry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'contexts' in value &&
    'register' in value &&
    'withContextMessage' in value
  )
}

function normalizeDescription(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cloneSerializable<TValue extends AgentContextSerializable | null>(
  value: TValue
): TValue | undefined {
  // Invalid or cyclic context must be omitted instead of breaking the reactive registry.
  try {
    const json = JSON.stringify(value)
    return json === undefined ? undefined : (JSON.parse(json) as TValue)
  } catch {
    return undefined
  }
}

function formatAgentContextValue(value: AgentContextSerializable | null): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function cloneRequestMessage(message: ChatRequestMessage): ChatRequestMessage {
  return {
    ...message,
    ...(message.createdAt instanceof Date
      ? { createdAt: new Date(message.createdAt.getTime()) }
      : {})
  }
}
