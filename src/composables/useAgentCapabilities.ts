import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  type ComputedRef,
  type Ref
} from 'vue'
import type { AiRequestStatus, RetryOptions, Tool } from '../types'
import { requestJson } from '../utils/fetch'
import { mergeHeaders } from '../utils/headers'
import { inspectRequestTrace, type RequestInspectionSnapshot } from '../utils/inspection'
import {
  canRetry,
  createAbortError,
  createRetryContext,
  getMaxRetries,
  waitForRetry
} from '../utils/retry'
import { createRequestTrace } from '../utils/trace'

type HeaderSource = HeadersInit | (() => HeadersInit | Promise<HeadersInit>)

export interface AgentIdentityCapabilities {
  name?: string
  type?: string
  description?: string
  version?: string
  provider?: string
  documentationUrl?: string
  metadata?: Record<string, unknown>
}

export interface AgentTransportCapabilities {
  streaming?: boolean
  websocket?: boolean
  httpBinary?: boolean
  pushNotifications?: boolean
  resumable?: boolean
}

export type AgentCapabilityTool =
  | Tool
  | {
      name: string
      description?: string
      parameters?: Record<string, unknown>
      [key: string]: unknown
    }

export interface AgentToolsCapabilities {
  supported?: boolean
  items?: AgentCapabilityTool[]
  parallelCalls?: boolean
  clientProvided?: boolean
}

export interface AgentOutputCapabilities {
  structuredOutput?: boolean
  supportedMimeTypes?: string[]
}

export interface AgentStateCapabilities {
  snapshots?: boolean
  deltas?: boolean
  memory?: boolean
  persistentState?: boolean
}

export interface AgentMultiAgentCapabilities {
  supported?: boolean
  delegation?: boolean
  handoffs?: boolean
  subAgents?: Array<{ name: string; description?: string }>
}

export interface AgentReasoningCapabilities {
  supported?: boolean
  streaming?: boolean
  encrypted?: boolean
}

export interface AgentMultimodalInputCapabilities {
  image?: boolean
  audio?: boolean
  video?: boolean
  pdf?: boolean
  file?: boolean
}

export interface AgentMultimodalOutputCapabilities {
  image?: boolean
  audio?: boolean
}

export interface AgentMultimodalCapabilities {
  input?: AgentMultimodalInputCapabilities
  output?: AgentMultimodalOutputCapabilities
}

export interface AgentExecutionCapabilities {
  codeExecution?: boolean
  sandboxed?: boolean
  maxIterations?: number
  maxExecutionTime?: number
}

export interface AgentHumanInTheLoopCapabilities {
  supported?: boolean
  approvals?: boolean
  interventions?: boolean
  feedback?: boolean
  interrupts?: boolean
  approveWithEdits?: boolean
}

export interface AgentCapabilities {
  identity?: AgentIdentityCapabilities
  transport?: AgentTransportCapabilities
  tools?: AgentToolsCapabilities
  output?: AgentOutputCapabilities
  state?: AgentStateCapabilities
  multiAgent?: AgentMultiAgentCapabilities
  reasoning?: AgentReasoningCapabilities
  multimodal?: AgentMultimodalCapabilities
  execution?: AgentExecutionCapabilities
  humanInTheLoop?: AgentHumanInTheLoopCapabilities
  custom?: Record<string, unknown>
}

export interface AgentInfoAgent<TCapabilities extends AgentCapabilities = AgentCapabilities> {
  id?: string
  agentId?: string
  name?: string
  capabilities?: TCapabilities
  [key: string]: unknown
}

export interface AgentInfoResponse<TCapabilities extends AgentCapabilities = AgentCapabilities> {
  id?: string
  agentId?: string
  name?: string
  capabilities?: TCapabilities
  agents?: AgentInfoAgent<TCapabilities>[]
  [key: string]: unknown
}

export interface AgentCapabilitiesSupportSummary {
  streaming: boolean
  resumable: boolean
  toolCalling: boolean
  clientProvidedTools: boolean
  parallelToolCalls: boolean
  structuredOutput: boolean
  stateSnapshots: boolean
  stateDeltas: boolean
  persistentState: boolean
  multiAgent: boolean
  reasoning: boolean
  multimodalInput: boolean
  multimodalOutput: boolean
  codeExecution: boolean
  humanInTheLoop: boolean
  approvals: boolean
  interrupts: boolean
}

export interface AgentCapabilitiesRequestInfo {
  providerId: 'agent-capabilities'
  attempt: number
  api: string
  url: string
  method: 'GET'
  agentId?: string
  headers?: Record<string, string>
  credentials?: RequestCredentials
}

export interface AgentCapabilitiesResponseInfo<
  TCapabilities extends AgentCapabilities = AgentCapabilities
> extends AgentCapabilitiesRequestInfo {
  capabilities: TCapabilities | null
  rawInfo: unknown
}

export interface LoadAgentCapabilitiesOptions {
  api?: string
  baseURL?: string
  agentId?: string
  headers?: HeaderSource
  credentials?: RequestCredentials
  signal?: AbortSignal
}

export interface UseAgentCapabilitiesOptions<
  TCapabilities extends AgentCapabilities = AgentCapabilities
> extends RetryOptions {
  api?: string
  baseURL?: string
  agentId?: string
  headers?: HeaderSource
  credentials?: RequestCredentials
  timeoutMs?: number
  fetch?: typeof fetch
  initialCapabilities?: TCapabilities | null
  loadOnInit?: boolean
  selectCapabilities?: (
    rawInfo: unknown,
    context: { agentId?: string }
  ) => TCapabilities | null | undefined
  onRequest?: (info: AgentCapabilitiesRequestInfo) => void
  onResponse?: (info: AgentCapabilitiesResponseInfo<TCapabilities>) => void
  onSuccess?: (capabilities: TCapabilities | null, rawInfo: unknown) => void
  onError?: (error: Error) => void
}

export interface UseAgentCapabilitiesReturn<
  TCapabilities extends AgentCapabilities = AgentCapabilities
> {
  capabilities: Ref<TCapabilities | null>
  rawInfo: Ref<unknown | null>
  supports: ComputedRef<AgentCapabilitiesSupportSummary>
  hasCapabilities: ComputedRef<boolean>
  status: Ref<AiRequestStatus>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  lastRequest: Ref<AgentCapabilitiesRequestInfo | null>
  lastResponse: Ref<AgentCapabilitiesResponseInfo<TCapabilities> | null>
  inspect: () => RequestInspectionSnapshot<
    AgentCapabilitiesRequestInfo,
    AgentCapabilitiesResponseInfo<TCapabilities>
  >
  loadCapabilities: (options?: LoadAgentCapabilitiesOptions) => Promise<TCapabilities | null>
  refreshCapabilities: (options?: LoadAgentCapabilitiesOptions) => Promise<TCapabilities | null>
  setCapabilities: (value: TCapabilities | null) => void
  stop: () => void
  clearError: () => void
  clearTrace: () => void
  clear: () => void
  abortController: Ref<AbortController | null>
}

const defaultApi = '/api/agent/info'

export function useAgentCapabilities<TCapabilities extends AgentCapabilities = AgentCapabilities>(
  options: UseAgentCapabilitiesOptions<TCapabilities> = {}
): UseAgentCapabilitiesReturn<TCapabilities> {
  const capabilities = shallowRef<TCapabilities | null>(
    options.initialCapabilities ?? null
  ) as Ref<TCapabilities | null>
  const rawInfo = shallowRef<unknown | null>(null)
  const status = shallowRef<AiRequestStatus>('ready')
  const isLoading = shallowRef(false)
  const error = shallowRef<Error | null>(null)
  const abortController = shallowRef<AbortController | null>(null)
  const trace = createRequestTrace<
    AgentCapabilitiesRequestInfo,
    AgentCapabilitiesResponseInfo<TCapabilities>
  >()
  const { lastRequest, lastResponse, clearTrace } = trace
  const supports = computed(() => summarizeAgentCapabilities(capabilities.value))
  const hasCapabilities = computed(() => capabilities.value !== null)

  async function loadCapabilities(loadOptions: LoadAgentCapabilitiesOptions = {}) {
    stop()
    const controller = new AbortController()
    const unbindExternalAbort = bindExternalAbort(controller, loadOptions.signal)
    abortController.value = controller
    isLoading.value = true
    status.value = 'submitted'
    error.value = null

    try {
      let retryAttempt = 0
      const maxRetries = getMaxRetries(options)
      while (true) {
        const request = await createRequestInfo(retryAttempt + 1, loadOptions)
        try {
          trace.recordRequest(request)
          options.onRequest?.(request)

          const response = await requestJson(request.url, {
            method: 'GET',
            headers: request.headers,
            credentials: request.credentials,
            signal: controller.signal,
            timeoutMs: options.timeoutMs,
            fetcher: options.fetch
          })
          const raw = await readResponseJson(response)
          const nextCapabilities = resolveCapabilities(raw, request.agentId)
          rawInfo.value = raw
          capabilities.value = cloneJsonish(nextCapabilities)
          const responseInfo = trace.recordResponse({
            ...request,
            capabilities: cloneJsonish(nextCapabilities),
            rawInfo: cloneJsonish(raw)
          })
          status.value = 'ready'
          options.onResponse?.(responseInfo)
          options.onSuccess?.(capabilities.value, rawInfo.value)
          return capabilities.value
        } catch (err) {
          const nextError = normalizeError(err)
          if (controller.signal.aborted || nextError.name === 'AbortError') {
            status.value = 'ready'
            throw nextError
          }
          const context = createRetryContext(nextError, retryAttempt + 1, maxRetries)
          if (await canRetry(options, context)) {
            retryAttempt += 1
            await waitForRetry(options, context, controller.signal)
            continue
          }
          status.value = 'error'
          error.value = nextError
          options.onError?.(nextError)
          throw nextError
        }
      }
    } finally {
      unbindExternalAbort()
      if (abortController.value === controller) abortController.value = null
      isLoading.value = false
    }
  }

  function refreshCapabilities(loadOptions: LoadAgentCapabilitiesOptions = {}) {
    return loadCapabilities(loadOptions)
  }

  function setCapabilities(value: TCapabilities | null) {
    capabilities.value = cloneJsonish(value)
  }

  function stop() {
    abortController.value?.abort()
    abortController.value = null
    isLoading.value = false
    if (status.value === 'submitted' || status.value === 'streaming') status.value = 'ready'
  }

  function clearError() {
    error.value = null
    status.value = 'ready'
  }

  function clear() {
    stop()
    capabilities.value = options.initialCapabilities ?? null
    rawInfo.value = null
    error.value = null
    clearTrace()
    status.value = 'ready'
  }

  function inspect(): RequestInspectionSnapshot<
    AgentCapabilitiesRequestInfo,
    AgentCapabilitiesResponseInfo<TCapabilities>
  > {
    return inspectRequestTrace({
      status: status.value,
      error: error.value,
      lastRequest: lastRequest.value,
      lastResponse: lastResponse.value,
      curl: true
    })
  }

  async function createRequestInfo(
    attempt: number,
    loadOptions: LoadAgentCapabilitiesOptions
  ): Promise<AgentCapabilitiesRequestInfo> {
    const api = loadOptions.api ?? options.api ?? defaultApi
    const baseURL = loadOptions.baseURL ?? options.baseURL ?? ''
    const headers = mergeHeaders(
      { Accept: 'application/json' },
      await resolveHeaders(options.headers),
      await resolveHeaders(loadOptions.headers)
    )
    const credentials = loadOptions.credentials ?? options.credentials
    const agentId = loadOptions.agentId ?? options.agentId

    return {
      providerId: 'agent-capabilities',
      attempt,
      api,
      url: resolveUrl(baseURL, api),
      method: 'GET',
      ...(agentId ? { agentId } : {}),
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(credentials ? { credentials } : {})
    }
  }

  function resolveCapabilities(raw: unknown, agentId?: string): TCapabilities | null {
    const selected = options.selectCapabilities?.(raw, { agentId })
    if (selected !== undefined) return selected
    return extractAgentCapabilities<TCapabilities>(raw, agentId)
  }

  if (options.loadOnInit) {
    void loadCapabilities().catch(() => undefined)
  }

  if (getCurrentScope()) onScopeDispose(stop)

  return {
    capabilities,
    rawInfo,
    supports,
    hasCapabilities,
    status,
    isLoading,
    error,
    lastRequest,
    lastResponse,
    inspect,
    loadCapabilities,
    refreshCapabilities,
    setCapabilities,
    stop,
    clearError,
    clearTrace,
    clear,
    abortController
  }
}

export function summarizeAgentCapabilities(
  capabilities: AgentCapabilities | null | undefined
): AgentCapabilitiesSupportSummary {
  return {
    streaming: Boolean(capabilities?.transport?.streaming),
    resumable: Boolean(capabilities?.transport?.resumable),
    toolCalling: Boolean(capabilities?.tools?.supported || capabilities?.tools?.items?.length),
    clientProvidedTools: Boolean(capabilities?.tools?.clientProvided),
    parallelToolCalls: Boolean(capabilities?.tools?.parallelCalls),
    structuredOutput: Boolean(capabilities?.output?.structuredOutput),
    stateSnapshots: Boolean(capabilities?.state?.snapshots),
    stateDeltas: Boolean(capabilities?.state?.deltas),
    persistentState: Boolean(capabilities?.state?.persistentState),
    multiAgent: Boolean(
      capabilities?.multiAgent?.supported || capabilities?.multiAgent?.subAgents?.length
    ),
    reasoning: Boolean(capabilities?.reasoning?.supported),
    multimodalInput: Boolean(
      capabilities?.multimodal?.input &&
      Object.values(capabilities.multimodal.input).some((value) => value === true)
    ),
    multimodalOutput: Boolean(
      capabilities?.multimodal?.output &&
      Object.values(capabilities.multimodal.output).some((value) => value === true)
    ),
    codeExecution: Boolean(capabilities?.execution?.codeExecution),
    humanInTheLoop: Boolean(capabilities?.humanInTheLoop?.supported),
    approvals: Boolean(capabilities?.humanInTheLoop?.approvals),
    interrupts: Boolean(capabilities?.humanInTheLoop?.interrupts)
  }
}

export function extractAgentCapabilities<
  TCapabilities extends AgentCapabilities = AgentCapabilities
>(rawInfo: unknown, agentId?: string): TCapabilities | null {
  if (!isRecord(rawInfo)) return null

  if (isRecord(rawInfo.capabilities)) return cloneJsonish(rawInfo.capabilities) as TCapabilities

  const agents = Array.isArray(rawInfo.agents) ? rawInfo.agents : []
  const matchedAgent = agentId
    ? agents.find((agent) => agentMatches(agent, agentId))
    : agents.find((agent) => isRecord(agent) && isRecord(agent.capabilities))
  if (isRecord(matchedAgent) && isRecord(matchedAgent.capabilities)) {
    return cloneJsonish(matchedAgent.capabilities) as TCapabilities
  }

  return looksLikeCapabilities(rawInfo) ? (cloneJsonish(rawInfo) as TCapabilities) : null
}

function bindExternalAbort(controller: AbortController, signal: AbortSignal | undefined) {
  if (!signal) return () => undefined
  if (signal.aborted) {
    controller.abort()
    return () => undefined
  }
  const onAbort = () => controller.abort()
  signal.addEventListener('abort', onAbort, { once: true })
  return () => signal.removeEventListener('abort', onAbort)
}

async function resolveHeaders(source: HeaderSource | undefined) {
  return typeof source === 'function' ? await source() : source
}

async function readResponseJson(response: Response) {
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function resolveUrl(baseURL: string, url: string) {
  if (!baseURL || /^https?:\/\//i.test(url)) return url
  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'Request aborted' && error.name !== 'AbortError') {
      return createAbortError()
    }
    return error
  }
  return new Error(String(error))
}

function agentMatches(agent: unknown, agentId: string) {
  if (!isRecord(agent)) return false
  return agent.id === agentId || agent.agentId === agentId || agent.name === agentId
}

function looksLikeCapabilities(value: Record<string, unknown>) {
  return [
    'identity',
    'transport',
    'tools',
    'output',
    'state',
    'multiAgent',
    'reasoning',
    'multimodal',
    'execution',
    'humanInTheLoop',
    'custom'
  ].some((key) => key in value)
}

function cloneJsonish<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => cloneJsonish(item)) as T
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, cloneJsonish(entry)])
  ) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
