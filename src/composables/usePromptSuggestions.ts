import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from 'vue'
import type { Message } from '../types'

/** Represents one normalized prompt suggestion rendered to a user. */
export interface PromptSuggestion<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  id: string
  title: string
  prompt: string
  description?: string
  metadata?: TMetadata
}

/** Accepts either prompt text or a partially specified suggestion object. */
export type PromptSuggestionInput<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> =
  | string
  | {
      id?: string
      title?: string
      prompt: string
      description?: string
      metadata?: TMetadata
    }

/** Identifies a locale included in the built-in suggestion recipe catalog. */
export type PromptSuggestionRecipeLocale = 'en' | 'zh'

export type PromptSuggestionRecipeCategory =
  'summarize' | 'review' | 'plan' | 'verify' | 'handoff' | 'debug' | 'approval'

export type PromptSuggestionRecipeSurface =
  'chat' | 'thread' | 'agent' | 'backend' | 'tool-approval' | 'release' | 'media' | 'code'

/** Lists every stable ID in the built-in suggestion recipe catalog. */
export const promptSuggestionRecipeIds = [
  'summarize-thread',
  'find-risks',
  'plan-next-steps',
  'write-test-plan',
  'draft-handoff',
  'inspect-trace',
  'review-code-change',
  'verify-release-gates',
  'design-agent-route',
  'prepare-tool-approval',
  'compare-thread-branches',
  'draft-media-prompt',
  'triage-provider-error'
] as const

export type PromptSuggestionRecipeId = (typeof promptSuggestionRecipeIds)[number]

/** Describes an entry in the built-in recipe catalog. */
export interface PromptSuggestionRecipe {
  id: PromptSuggestionRecipeId
  category: PromptSuggestionRecipeCategory
  surfaces: readonly PromptSuggestionRecipeSurface[]
  title: string
  prompt: string
  description: string
}

/** Identifies the built-in recipe that produced a normalized suggestion. */
export interface PromptSuggestionRecipeMetadata extends Record<string, unknown> {
  kind: 'task-starter'
  recipe: PromptSuggestionRecipeId
  category: PromptSuggestionRecipeCategory
  surfaces: readonly PromptSuggestionRecipeSurface[]
  locale: PromptSuggestionRecipeLocale
}

/** Filters built-in recipes and augments their generated metadata. */
export interface CreatePromptSuggestionRecipesOptions<
  TMetadata extends Record<string, unknown> = Record<string, never>
> {
  locale?: PromptSuggestionRecipeLocale
  include?: readonly PromptSuggestionRecipeId[]
  exclude?: readonly PromptSuggestionRecipeId[]
  categories?: readonly PromptSuggestionRecipeCategory[]
  surfaces?: readonly PromptSuggestionRecipeSurface[]
  metadata?: TMetadata | ((recipe: PromptSuggestionRecipe) => TMetadata)
}

const promptSuggestionRecipeCatalog: Record<
  PromptSuggestionRecipeLocale,
  readonly PromptSuggestionRecipe[]
> = {
  en: [
    {
      id: 'summarize-thread',
      category: 'summarize',
      surfaces: ['chat', 'thread'],
      title: 'Summarize thread',
      prompt: 'Summarize the current conversation, decisions, and unresolved questions.',
      description: 'Create a short status snapshot before continuing.'
    },
    {
      id: 'find-risks',
      category: 'review',
      surfaces: ['chat', 'thread', 'release'],
      title: 'Find risks',
      prompt: 'Find the top risks, missing checks, and unclear assumptions in this work.',
      description: 'Use before handoff, release, or approval.'
    },
    {
      id: 'plan-next-steps',
      category: 'plan',
      surfaces: ['chat', 'thread', 'agent'],
      title: 'Plan next steps',
      prompt: 'Turn the current context into a short execution plan with validation steps.',
      description: 'Move from discussion to concrete work.'
    },
    {
      id: 'write-test-plan',
      category: 'verify',
      surfaces: ['code', 'release'],
      title: 'Write test plan',
      prompt: 'Write focused test cases for the expected behavior and failure cases.',
      description: 'Convert a requirement into verifiable checks.'
    },
    {
      id: 'draft-handoff',
      category: 'handoff',
      surfaces: ['thread', 'release'],
      title: 'Draft handoff',
      prompt:
        'Write a handoff note with context, completed work, remaining risks, and commands run.',
      description: 'Prepare the next person or session to continue safely.'
    },
    {
      id: 'inspect-trace',
      category: 'debug',
      surfaces: ['chat', 'agent', 'backend'],
      title: 'Inspect trace',
      prompt:
        'Inspect the latest request, response, stream events, and errors before proposing a fix.',
      description: 'Start debugging from observable runtime evidence.'
    },
    {
      id: 'review-code-change',
      category: 'review',
      surfaces: ['code', 'release'],
      title: 'Review code change',
      prompt:
        'Review the current code change for behavioral regressions, missing tests, and API compatibility risks.',
      description: 'Use before merging or publishing a library change.'
    },
    {
      id: 'verify-release-gates',
      category: 'verify',
      surfaces: ['release'],
      title: 'Verify release gates',
      prompt: 'List the release gates to run and what each one proves before publishing.',
      description: 'Keep release readiness tied to concrete commands.'
    },
    {
      id: 'design-agent-route',
      category: 'plan',
      surfaces: ['agent', 'backend'],
      title: 'Design agent route',
      prompt:
        'Design the /api/chat or agent route contract, including request body, stream format, abort handling, and secret boundaries.',
      description: 'Start backend integration from the route contract.'
    },
    {
      id: 'prepare-tool-approval',
      category: 'approval',
      surfaces: ['agent', 'tool-approval'],
      title: 'Prepare tool approval',
      prompt:
        'Draft a durable tool approval flow with approvalId, toolCallId, runId, reviewer decision, and idempotency checks.',
      description: 'Use before exposing privileged tools.'
    },
    {
      id: 'compare-thread-branches',
      category: 'review',
      surfaces: ['thread'],
      title: 'Compare branches',
      prompt:
        'Compare the current answer with an alternate branch and summarize differences, risks, and the next action.',
      description: 'Review regenerate or branch outcomes before choosing one.'
    },
    {
      id: 'draft-media-prompt',
      category: 'plan',
      surfaces: ['media'],
      title: 'Draft media prompt',
      prompt:
        'Rewrite this prompt for image or video generation with subject, style, constraints, and safety limits.',
      description: 'Turn a rough idea into a safer media generation prompt.'
    },
    {
      id: 'triage-provider-error',
      category: 'debug',
      surfaces: ['chat', 'backend'],
      title: 'Triage provider error',
      prompt:
        'Triage the provider error from request trace, status, upstream response, retry state, and user-safe message.',
      description: 'Debug failed provider calls from observable evidence.'
    }
  ],
  zh: [
    {
      id: 'summarize-thread',
      category: 'summarize',
      surfaces: ['chat', 'thread'],
      title: '总结上下文',
      prompt: '总结当前对话里的结论、已完成事项和未解决问题。',
      description: '继续推进前先得到简短状态快照。'
    },
    {
      id: 'find-risks',
      category: 'review',
      surfaces: ['chat', 'thread', 'release'],
      title: '找风险',
      prompt: '找出当前工作的主要风险、缺失检查和不明确假设。',
      description: '适合交接、发布或审批前使用。'
    },
    {
      id: 'plan-next-steps',
      category: 'plan',
      surfaces: ['chat', 'thread', 'agent'],
      title: '规划下一步',
      prompt: '把当前上下文整理成简短执行计划，并列出验证方式。',
      description: '把讨论推进成可执行工作。'
    },
    {
      id: 'write-test-plan',
      category: 'verify',
      surfaces: ['code', 'release'],
      title: '写测试计划',
      prompt: '为预期行为和失败场景写出聚焦的测试用例。',
      description: '把需求转成可验证检查。'
    },
    {
      id: 'draft-handoff',
      category: 'handoff',
      surfaces: ['thread', 'release'],
      title: '写交接说明',
      prompt: '写一段交接说明，包含背景、已完成工作、剩余风险和已运行命令。',
      description: '让下一个人或下一轮会话可以安全接上。'
    },
    {
      id: 'inspect-trace',
      category: 'debug',
      surfaces: ['chat', 'agent', 'backend'],
      title: '检查 trace',
      prompt: '先检查最近一次请求、响应、流事件和错误，再提出修复方案。',
      description: '从可观测运行证据开始排障。'
    },
    {
      id: 'review-code-change',
      category: 'review',
      surfaces: ['code', 'release'],
      title: '审查代码改动',
      prompt: '审查当前代码改动里的行为回归、缺失测试和 API 兼容性风险。',
      description: '合并或发布库改动前使用。'
    },
    {
      id: 'verify-release-gates',
      category: 'verify',
      surfaces: ['release'],
      title: '验证发布门禁',
      prompt: '列出发布前要运行的门禁命令，并说明每条命令证明什么。',
      description: '把发布准备绑定到具体命令。'
    },
    {
      id: 'design-agent-route',
      category: 'plan',
      surfaces: ['agent', 'backend'],
      title: '设计 agent 路由',
      prompt: '设计 /api/chat 或 agent 路由契约，包括请求体、流格式、abort 处理和 secret 边界。',
      description: '从路由契约开始接后端 agent。'
    },
    {
      id: 'prepare-tool-approval',
      category: 'approval',
      surfaces: ['agent', 'tool-approval'],
      title: '准备工具审批',
      prompt: '设计持久工具审批流程，包含 approvalId、toolCallId、runId、审批决策和幂等检查。',
      description: '暴露特权工具前使用。'
    },
    {
      id: 'compare-thread-branches',
      category: 'review',
      surfaces: ['thread'],
      title: '对比分支回答',
      prompt: '对比当前回答和另一个分支，整理差异、风险和下一步动作。',
      description: '选择 regenerate 或 branch 结果前使用。'
    },
    {
      id: 'draft-media-prompt',
      category: 'plan',
      surfaces: ['media'],
      title: '整理媒体提示词',
      prompt: '把这段想法改写成图片或视频生成提示词，包含主体、风格、约束和安全边界。',
      description: '把粗略想法整理成更安全的媒体生成提示词。'
    },
    {
      id: 'triage-provider-error',
      category: 'debug',
      surfaces: ['chat', 'backend'],
      title: '排查 Provider 错误',
      prompt: '根据 request trace、状态、上游响应、重试记录和用户安全提示排查 Provider 错误。',
      description: '从可观测证据排查失败的 Provider 调用。'
    }
  ]
}

/** Supplies current input, messages, and candidates to a suggestion filter. */
export interface PromptSuggestionFilterContext<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  input: string
  messages: readonly Message[]
  suggestions: readonly PromptSuggestion<TMetadata>[]
}

export type PromptSuggestionFilter<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> = (
  suggestion: PromptSuggestion<TMetadata>,
  context: PromptSuggestionFilterContext<TMetadata>
) => boolean

/** Supplies current chat state and cancellation to an asynchronous loader. */
export interface PromptSuggestionLoaderContext {
  input: string
  messages: readonly Message[]
  signal: AbortSignal
}

export type PromptSuggestionLoader<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> = (
  context: PromptSuggestionLoaderContext
) =>
  readonly PromptSuggestionInput<TMetadata>[] | Promise<readonly PromptSuggestionInput<TMetadata>[]>

/** Configures reactive suggestions, filtering, result limits, and optional loading. */
export interface UsePromptSuggestionsOptions<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  suggestions?: MaybeRefOrGetter<readonly PromptSuggestionInput<TMetadata>[]>
  input?: MaybeRefOrGetter<string | null | undefined>
  messages?: MaybeRefOrGetter<readonly Message[] | null | undefined>
  max?: MaybeRefOrGetter<number | null | undefined>
  filter?: PromptSuggestionFilter<TMetadata>
  loader?: PromptSuggestionLoader<TMetadata>
  loadOnInit?: boolean
}

/** Exposes normalized and visible suggestions together with selection and loading state. */
export interface UsePromptSuggestionsReturn<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
> {
  suggestions: ComputedRef<PromptSuggestion<TMetadata>[]>
  visibleSuggestions: ComputedRef<PromptSuggestion<TMetadata>[]>
  selectedSuggestion: Ref<PromptSuggestion<TMetadata> | null>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  reloadSuggestions: () => Promise<PromptSuggestion<TMetadata>[]>
  clearError: () => void
  selectSuggestion: (
    suggestion: string | PromptSuggestion<TMetadata>
  ) => PromptSuggestion<TMetadata> | null
  clearSelection: () => void
}

/**
 * Creates localized suggestions from the built-in catalog. Include, exclude,
 * category, and surface filters are combined as intersections.
 */
export function createPromptSuggestionRecipes<
  TMetadata extends Record<string, unknown> = Record<string, never>
>(
  options: CreatePromptSuggestionRecipesOptions<TMetadata> = {}
): PromptSuggestion<PromptSuggestionRecipeMetadata & TMetadata>[] {
  const locale = options.locale ?? 'en'
  const include = new Set(options.include ?? promptSuggestionRecipeIds)
  const exclude = new Set(options.exclude ?? [])
  const categories = options.categories ? new Set(options.categories) : null
  const surfaces = options.surfaces ? new Set(options.surfaces) : null

  return promptSuggestionRecipeCatalog[locale]
    .filter(
      (recipe) =>
        include.has(recipe.id) &&
        !exclude.has(recipe.id) &&
        (!categories || categories.has(recipe.category)) &&
        (!surfaces || recipe.surfaces.some((surface) => surfaces.has(surface)))
    )
    .map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      prompt: recipe.prompt,
      description: recipe.description,
      metadata: {
        ...resolveRecipeMetadata(options.metadata, recipe),
        kind: 'task-starter',
        recipe: recipe.id,
        category: recipe.category,
        surfaces: [...recipe.surfaces],
        locale
      }
    }))
}

/**
 * Combines reactive and asynchronously loaded suggestions, normalizes them,
 * and derives a filtered, bounded visible list. A later reload supersedes and
 * aborts any earlier load.
 */
export function usePromptSuggestions<
  TMetadata extends Record<string, unknown> = Record<string, unknown>
>(options: UsePromptSuggestionsOptions<TMetadata> = {}): UsePromptSuggestionsReturn<TMetadata> {
  const selectedSuggestion = shallowRef<PromptSuggestion<TMetadata> | null>(null)
  const loadedSuggestions = shallowRef<readonly PromptSuggestionInput<TMetadata>[]>([])
  const isLoading = shallowRef(false)
  const error = shallowRef<Error | null>(null)
  const activeController = shallowRef<AbortController | null>(null)
  let loadVersion = 0

  const suggestions = computed(() =>
    [...(toValue(options.suggestions) ?? []), ...loadedSuggestions.value]
      .map((suggestion, index) => normalizeSuggestion(suggestion, index))
      .filter((suggestion): suggestion is PromptSuggestion<TMetadata> => Boolean(suggestion))
  )

  const visibleSuggestions = computed(() => {
    const input = resolveInput(options)
    const messages = resolveMessages(options)
    const all = suggestions.value
    const context: PromptSuggestionFilterContext<TMetadata> = {
      input,
      messages,
      suggestions: all
    }
    const filtered = all.filter((suggestion) =>
      options.filter ? options.filter(suggestion, context) : defaultFilter(suggestion, input)
    )
    return filtered.slice(0, resolveMax(toValue(options.max)))
  })

  async function reloadSuggestions(): Promise<PromptSuggestion<TMetadata>[]> {
    const loader = options.loader
    if (!loader) return suggestions.value

    // Only the newest load may publish results, even if an older loader ignores cancellation.
    const version = loadVersion + 1
    loadVersion = version
    activeController.value?.abort()

    const controller = new AbortController()
    activeController.value = controller
    isLoading.value = true
    error.value = null

    try {
      const loaded = await loader({
        input: resolveInput(options),
        messages: resolveMessages(options),
        signal: controller.signal
      })
      if (controller.signal.aborted || version !== loadVersion) return suggestions.value
      loadedSuggestions.value = [...loaded]
      return suggestions.value
    } catch (cause) {
      if (!controller.signal.aborted && version === loadVersion) {
        error.value = toError(cause)
      }
      return suggestions.value
    } finally {
      if (version === loadVersion) {
        isLoading.value = false
        activeController.value = null
      }
    }
  }

  function clearError() {
    error.value = null
  }

  function selectSuggestion(
    suggestion: string | PromptSuggestion<TMetadata>
  ): PromptSuggestion<TMetadata> | null {
    const id = typeof suggestion === 'string' ? suggestion : suggestion.id
    const found = suggestions.value.find((item) => item.id === id) ?? null
    selectedSuggestion.value = found
    return found
  }

  function clearSelection() {
    selectedSuggestion.value = null
  }

  if (options.loadOnInit && options.loader) {
    void reloadSuggestions()
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      activeController.value?.abort()
    })
  }

  return {
    suggestions,
    visibleSuggestions,
    selectedSuggestion,
    isLoading,
    error,
    reloadSuggestions,
    clearError,
    selectSuggestion,
    clearSelection
  }
}

function normalizeSuggestion<TMetadata extends Record<string, unknown>>(
  input: PromptSuggestionInput<TMetadata>,
  index: number
): PromptSuggestion<TMetadata> | null {
  if (typeof input === 'string') {
    const prompt = input.trim()
    if (!prompt) return null
    return {
      id: `suggestion-${index + 1}`,
      title: titleFromPrompt(prompt),
      prompt
    }
  }

  const prompt = input.prompt.trim()
  if (!prompt) return null
  const title = input.title?.trim() || titleFromPrompt(prompt)
  const description = input.description?.trim()
  return {
    id: input.id?.trim() || `suggestion-${index + 1}`,
    title,
    prompt,
    ...(description ? { description } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {})
  }
}

function titleFromPrompt(prompt: string): string {
  const firstLine = prompt.split(/\r?\n/, 1)[0]?.trim() || prompt
  return firstLine.length > 64 ? `${firstLine.slice(0, 61)}...` : firstLine
}

function defaultFilter(suggestion: PromptSuggestion, input: string): boolean {
  if (!input) return true
  const query = input.toLocaleLowerCase()
  return [suggestion.title, suggestion.prompt, suggestion.description ?? '']
    .join('\n')
    .toLocaleLowerCase()
    .includes(query)
}

function resolveMax(max: number | null | undefined): number {
  if (max == null) return 6
  if (!Number.isFinite(max)) return max > 0 ? Number.POSITIVE_INFINITY : 0
  return Math.max(0, Math.floor(max))
}

function resolveInput<TMetadata extends Record<string, unknown>>(
  options: UsePromptSuggestionsOptions<TMetadata>
): string {
  return String(toValue(options.input) ?? '').trim()
}

function resolveMessages<TMetadata extends Record<string, unknown>>(
  options: UsePromptSuggestionsOptions<TMetadata>
): Message[] {
  return [...(toValue(options.messages) ?? [])]
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause))
}

function resolveRecipeMetadata<TMetadata extends Record<string, unknown>>(
  metadata: CreatePromptSuggestionRecipesOptions<TMetadata>['metadata'],
  recipe: PromptSuggestionRecipe
): TMetadata {
  if (!metadata) return {} as TMetadata
  return typeof metadata === 'function' ? metadata(recipe) : metadata
}
