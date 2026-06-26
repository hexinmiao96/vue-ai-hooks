<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import DemoBlock from './DemoBlock.vue'

type LocaleKey = 'en' | 'zh'
type DemoHref =
  | '#chat-demo'
  | '#completion-demo'
  | '#embedding-demo'
  | '#object-demo'
  | '#chat-demo-api'
  | '#completion-demo-api'
  | '#embedding-demo-api'
  | '#object-demo-api'
  | '#chat-demo-api-props'
  | '#chat-demo-api-methods'
  | '#completion-demo-api-props'
  | '#completion-demo-api-methods'
  | '#embedding-demo-api-props'
  | '#embedding-demo-api-methods'
  | '#object-demo-api-props'
  | '#object-demo-api-methods'
type NavLink = {
  label: string
  href: DemoHref
}

const props = withDefaults(defineProps<{ locale?: string }>(), {
  locale: 'en'
})

const localeKey = computed<LocaleKey>(() => (props.locale.startsWith('zh') ? 'zh' : 'en'))

const codeSamples = {
  en: {
    chat: `const fileInput = shallowRef<HTMLInputElement | null>(null)
const { messages, input, handleSubmit, pendingToolCalls, approveToolCall } = useChat({
  provider,
  id: 'support-thread-1',
  initialInput: 'Review this release note.',
  persist: {
    key: 'support-thread-1',
    version: 1
  },
  prepareSendMessagesRequest({ request }) {
    return {
      messages: pruneMessages({
        messages: request.messages,
        maxMessages: 12,
        reasoning: 'before-last-message',
        toolCalls: 'before-last-message'
      })
    }
  },
  tools: [chargeCardTool],
  toolHandlers: {
    chargeCard: async (args) => billing.charge(args)
  },
  requiresToolApproval(_args, context) {
    return context.toolCall.function.name === 'chargeCard'
  }
})

const visibleParts = computed(() =>
  messages.value.flatMap((message) => message.parts ?? []).filter((part) => part.type !== 'text')
)

async function send(event?: { preventDefault?: () => void }) {
  const attachments = fileInput.value?.files ?? undefined
  await handleSubmit(event, { attachments })
}

async function approveFirstTool() {
  const [call] = pendingToolCalls.value
  if (call) await approveToolCall(call.id)
}`,
    completion: `const { completion, input: prompt, complete, stop, clear, isLoading } = useCompletion({
  provider,
  defaultRequest: {
    model: 'gpt-4o-mini',
    temperature: 0.6
  }
})

await complete('Write a concise release note for a Vue composable.')`,
    embedding: `const { embed, embeddings, result, stop, clear } = useEmbedding({
  provider,
  onSuccess: (res) => {
    console.log('tokens:', res.usage?.totalTokens)
  }
})

await embed([
  'Streaming chat state for Vue',
  'Semantic search over documents',
  'A recipe for iced coffee'
])`,
    object: `type Ticket = { title: string; priority: 'low' | 'high' }

const { object, partialObject, text, input, submit, stop, clear } = useObject<Ticket>({
  provider,
  id: 'support-ticket-draft',
  initialValue: { priority: 'high' },
  schemaName: 'ticket',
  schema: ticketSchema
})

await submit('Extract a support ticket from the latest customer message.')`
  },
  zh: {
    chat: `const fileInput = shallowRef<HTMLInputElement | null>(null)
const { messages: 消息列表, input: 输入文本, handleSubmit, pendingToolCalls, approveToolCall } = useChat({
  provider,
  id: 'support-thread-1',
  initialInput: '检查这段发布说明。',
  persist: {
    key: 'support-thread-1',
    version: 1
  },
  prepareSendMessagesRequest({ request }) {
    return {
      messages: pruneMessages({
        messages: request.messages,
        maxMessages: 12,
        reasoning: 'before-last-message',
        toolCalls: 'before-last-message'
      })
    }
  },
  tools: [chargeCardTool],
  toolHandlers: {
    chargeCard: async (args) => billing.charge(args)
  },
  requiresToolApproval(_args, context) {
    return context.toolCall.function.name === 'chargeCard'
  }
})

const 可见Parts = computed(() =>
  消息列表.value.flatMap((message) => message.parts ?? []).filter((part) => part.type !== 'text')
)

async function send(event?: { preventDefault?: () => void }) {
  const attachments = fileInput.value?.files ?? undefined
  await handleSubmit(event, { attachments })
}

async function approveFirstTool() {
  const [call] = pendingToolCalls.value
  if (call) await approveToolCall(call.id)
}`,
    completion: `const { completion: 补全结果, input: 输入文本, complete, stop, clear, isLoading } = useCompletion({
  provider,
  defaultRequest: {
    model: 'gpt-4o-mini',
    temperature: 0.6
  }
})

// model 与 temperature 使用项目默认模型策略可按需覆盖
// 给出一段可供发布说明复用的提示词
await complete('为新的 useEmbedding.clear() 接口补充一段发布说明。')`,
    embedding: `const { embed, embeddings: 向量列表, result: 向量结果, stop, clear } = useEmbedding({
  provider,
  onSuccess: (res) => {
    console.log('令牌数:', res.usage?.totalTokens)
  }
})

// 一次性对多段文本做向量化，方便后续相似度对比
await embed([
  'Vue 场景下的流式对话状态',
  '文档语义检索',
  '冰咖啡配方向量化片段'
])`,
    object: `type 工单 = { title: string; priority: 'low' | 'high' }

const { object: 工单对象, partialObject: 部分工单, text: 原始JSON, input: 输入文本, submit, stop, clear } = useObject<工单>({
  provider,
  id: 'support-ticket-draft',
  initialValue: { priority: 'high' },
  schemaName: 'ticket',
  schema: ticketSchema
})

await submit('从最新客户消息中提取支持工单。')`
  }
}

const copy = {
  en: {
    heroKicker: 'Examples',
    heroTitle: 'Polished AI composable demos for real product screens',
    heroIntro:
      'Browse the common use cases the way a component library documents them: focused previews, compact code, clear state, and API notes on one page.',
    primaryAction: 'View composables',
    secondaryAction: 'Read guide',
    secondaryHref: '/guide/getting-started',
    previewLabel: 'Preview',
    panelLabel: 'Demo panel',
    codeLabel: 'Code',
    copyLabel: 'Copy',
    copiedLabel: 'Copied',
    copyFailedLabel: 'Copy failed',
    demoNavLabel: 'Demo shortcuts',
    demoNavTitle: 'Navigation',
    apiNavTitle: 'API',
    anchorLabel: 'Link to this demo',
    status: 'Ready',
    quickChoiceTitle: 'Choose by job',
    quickChoices: [
      { job: 'Chat UI or tool approval', pick: 'useChat' },
      { job: 'One prompt to text', pick: 'useCompletion' },
      { job: 'Similarity search', pick: 'useEmbedding' },
      { job: 'Typed JSON extraction', pick: 'useObject' }
    ],
    heroStats: [
      { label: 'Composables', value: '4' },
      { label: 'Runtime deps', value: '0' },
      { label: 'Typed APIs', value: '100%' }
    ],
    demoLinks: [
      { label: 'Chat', href: '#chat-demo' },
      { label: 'Completion', href: '#completion-demo' },
      { label: 'Embedding', href: '#embedding-demo' },
      { label: 'Object', href: '#object-demo' }
    ],
    apiLinks: [
      { label: 'useChat API', href: '#chat-demo-api' },
      { label: 'useCompletion API', href: '#completion-demo-api' },
      { label: 'useEmbedding API', href: '#embedding-demo-api' },
      { label: 'useObject API', href: '#object-demo-api' }
    ] as NavLink[],
    demosTitle: 'Composables',
    chat: {
      title: 'Streaming chat',
      topbarTitle: 'useChat',
      description:
        'A production chat surface with message history, structured Message.parts, stream controls, and approval-gated tool calls.',
      roleUser: 'user',
      roleAssistant: 'assistant',
      composerLabel: 'chat composer',
      user: 'Review this screenshot and the release note draft.',
      assistant:
        'The screenshot needs a shorter first action, and the draft should lead with the user-visible change.',
      attachment: 'Attached: dashboard.png + release-notes.txt',
      persistence: 'Saved locally: support-thread-1 · Date-safe history',
      parts: [
        'source-url: useChat reference',
        'file: release-notes.txt',
        'tool-chargeCard: input available'
      ],
      actions: ['Stop', 'Reload', 'Clear'],
      tool: 'Approval pending: chargeCard({ amount: 49, currency: "USD" })',
      composer: 'Ask about providers, tool approvals, or persistence',
      apiRef: {
        title: 'useChat API',
        propsTitle: 'Properties',
        methodsTitle: 'Methods',
        propsHeaders: {
          name: 'Name',
          type: 'Type',
          required: 'Required',
          description: 'Description'
        },
        methodsHeaders: {
          name: 'Method',
          description: 'Description'
        },
        props: [
          {
            name: 'provider',
            type: 'Provider',
            required: 'required',
            description: 'Provider adapter used to send chat completions.'
          },
          {
            name: 'options',
            type: 'UseChatOptions',
            required: 'optional',
            description:
              'Optional overrides for defaults such as message history, tools, and approval predicates.'
          },
          {
            name: 'prepareSendMessagesRequest',
            type: 'PrepareSendMessagesRequest',
            required: 'optional',
            description:
              'Customize the resolved send/regenerate request before it reaches a provider.'
          },
          {
            name: 'prepareReconnectToStreamRequest',
            type: 'PrepareReconnectToStreamRequest',
            required: 'optional',
            description:
              'Customize the resolved resume request before reconnecting a backend stream.'
          },
          {
            name: 'persist',
            type: 'ChatPersistOptions',
            required: 'optional',
            description:
              'Save and restore Date-safe message history with localStorage or custom storage.'
          }
        ],
        methods: [
          {
            name: 'handleSubmit',
            type: '(event?, { attachments }?): Promise<void>',
            description: 'Wire a form submit, send current input, and clear it after success.'
          },
          {
            name: 'append',
            type: '(input, { attachments }?): Promise<void>',
            description: 'Append text, optional FileList/File[] attachments, and stream the reply.'
          },
          {
            name: 'reload',
            type: '(): Promise<void>',
            description: 'Re-run the latest request using current state and latest input.'
          },
          {
            name: 'approveToolCall',
            type: '(id: string): Promise<void>',
            description: 'Run an approval-gated local tool handler and continue the conversation.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort all active stream requests for this composable.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Reset chat messages and error state.'
          }
        ]
      }
    },
    completion: {
      title: 'Text completion',
      topbarTitle: 'useCompletion',
      description:
        'A writing assistant pattern for prompts that return one streamed text result with stop and reset controls.',
      promptLabel: 'Prompt',
      prompt: 'Write a release note for the new useEmbedding.clear() API.',
      resultLabel: 'Result',
      output:
        'Added clear() to reset embedding vectors, the last result, and errors while aborting any active request.',
      metric: '42 tokens',
      footerActions: 'complete - stop - clear',
      apiRef: {
        title: 'useCompletion API',
        propsTitle: 'Properties',
        methodsTitle: 'Methods',
        propsHeaders: {
          name: 'Name',
          type: 'Type',
          required: 'Required',
          description: 'Description'
        },
        methodsHeaders: {
          name: 'Method',
          description: 'Description'
        },
        props: [
          {
            name: 'provider',
            type: 'Provider',
            required: 'required',
            description: 'Provider adapter used to complete text prompts.'
          },
          {
            name: 'defaultRequest',
            type: 'CompletionRequest',
            required: 'optional',
            description: 'Default request payload merged into each completion call.'
          }
        ],
        methods: [
          {
            name: 'complete',
            type: '(prompt: string): Promise<void>',
            description: 'Send a prompt and stream a text completion result.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort the in-flight completion request.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Clear completion result, error state, and loading flag.'
          }
        ]
      }
    },
    embedding: {
      title: 'Embedding similarity',
      topbarTitle: 'useEmbedding',
      description:
        'A semantic matching layout that shows batched input, vector state, usage metadata, and a similarity matrix.',
      rows: ['Chat state', 'Semantic search', 'Coffee recipe'],
      usage: '3 inputs - 128 dimensions - 87 tokens',
      apiRef: {
        title: 'useEmbedding API',
        propsTitle: 'Properties',
        methodsTitle: 'Methods',
        propsHeaders: {
          name: 'Name',
          type: 'Type',
          required: 'Required',
          description: 'Description'
        },
        methodsHeaders: {
          name: 'Method',
          description: 'Description'
        },
        props: [
          {
            name: 'provider',
            type: 'Provider',
            required: 'required',
            description: 'Provider adapter used to compute text embeddings.'
          },
          {
            name: 'onSuccess',
            type: '(res: EmbeddingResponse) => void',
            required: 'optional',
            description: 'Callback invoked when the embedding request succeeds.'
          }
        ],
        methods: [
          {
            name: 'embed',
            type: '(inputs: string[]): Promise<void>',
            description: 'Request embeddings for a batch of text inputs.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort the active embedding request.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Clear embeddings, result, and current error.'
          }
        ]
      }
    },
    object: {
      title: 'Structured object output',
      topbarTitle: 'useObject',
      description:
        'A schema-backed extraction flow that streams raw JSON, exposes partial object state, and commits the final typed object after parsing succeeds.',
      schemaLabel: 'JSON Schema',
      schemaRows: ['title: string', 'priority: low | high', 'additionalProperties: false'],
      outputLabel: 'Partial / final object',
      outputRows: ['title: "Password reset blocked"', 'priority: "high"'],
      footer: 'response_format - partial - final - clear',
      apiRef: {
        title: 'useObject API',
        propsTitle: 'Properties',
        methodsTitle: 'Methods',
        propsHeaders: {
          name: 'Name',
          type: 'Type',
          required: 'Required',
          description: 'Description'
        },
        methodsHeaders: {
          name: 'Method',
          description: 'Description'
        },
        props: [
          {
            name: 'provider',
            type: 'Provider',
            required: 'required',
            description: 'Provider adapter used to send structured chat requests.'
          },
          {
            name: 'id',
            type: 'string',
            required: 'optional',
            description: 'Share object state across multiple useObject instances.'
          },
          {
            name: 'initialValue',
            type: 'DeepPartial<T>',
            required: 'optional',
            description: 'Seed the first partial object before streaming starts.'
          },
          {
            name: 'schema',
            type: 'Record<string, unknown>',
            required: 'required',
            description: 'JSON Schema sent as the structured response format.'
          }
        ],
        methods: [
          {
            name: 'submit',
            type: '(prompt: string): Promise<T>',
            description: 'Send a prompt, stream partial JSON state, and parse the final object.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort the in-flight structured output request.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Reset the parsed object, raw text, input, and error state.'
          }
        ]
      }
    },
    apiTitle: 'API surface',
    apiSectionLabel: 'API Reference',
    apiIntro:
      'Each composable keeps the same mental model: source state, async action, loading/error state, and small imperative controls.',
    apiRows: [
      {
        name: 'useChat',
        state: 'messages, messages[].parts, input, isLoading, error',
        actions: 'append, reload, stop, clear',
        fit: 'Conversational UI, attachments, tool calls'
      },
      {
        name: 'useCompletion',
        state: 'completion, input, isLoading, error',
        actions: 'complete, stop, clear',
        fit: 'Prompt-to-text flows and writing tools'
      },
      {
        name: 'useEmbedding',
        state: 'embeddings, result, isLoading, error',
        actions: 'embed, stop, clear',
        fit: 'Search, clustering, similarity scoring'
      },
      {
        name: 'useObject',
        state: 'partialObject, object, text, input, isLoading, error',
        actions: 'submit, stop, clear',
        fit: 'Extraction, classification, JSON form filling'
      }
    ],
    tableLabels: {
      state: 'State',
      actions: 'Actions',
      fit: 'Best for'
    }
  },
  zh: {
    heroKicker: '示例',
    heroTitle: '更接近组件库文档的 AI 组合式函数示例',
    heroIntro:
      '用 Element Plus 那类文档体验来组织示例：预览清晰、代码紧凑、状态明确，常用 API 在同一页能扫完。',
    primaryAction: '查看组合式函数',
    secondaryAction: '阅读指南',
    secondaryHref: '/zh/guide/getting-started',
    previewLabel: '预览',
    panelLabel: '示例面板',
    codeLabel: '代码',
    copyLabel: '复制',
    copiedLabel: '已复制',
    copyFailedLabel: '复制失败',
    demoNavLabel: '示例快捷导航',
    demoNavTitle: '页面导航',
    apiNavTitle: 'API 列表',
    anchorLabel: '跳转到此示例',
    status: '就绪',
    quickChoiceTitle: '按任务选择',
    quickChoices: [
      { job: '聊天界面或工具审批', pick: 'useChat' },
      { job: '一个提示词生成文本', pick: 'useCompletion' },
      { job: '语义相似度检索', pick: 'useEmbedding' },
      { job: '类型化 JSON 抽取', pick: 'useObject' }
    ],
    heroStats: [
      { label: '组合式函数', value: '4' },
      { label: '运行时依赖', value: '0' },
      { label: '类型覆盖', value: '100%' }
    ],
    demoLinks: [
      { label: '对话', href: '#chat-demo' },
      { label: '补全', href: '#completion-demo' },
      { label: '向量检索', href: '#embedding-demo' },
      { label: '结构化对象', href: '#object-demo' }
    ],
    apiLinks: [
      { label: 'useChat 接口', href: '#chat-demo-api' },
      { label: 'useCompletion 接口', href: '#completion-demo-api' },
      { label: 'useEmbedding 接口', href: '#embedding-demo-api' },
      { label: 'useObject 接口', href: '#object-demo-api' }
    ] as NavLink[],
    demosTitle: '组合式函数',
    chat: {
      title: '流式对话',
      topbarTitle: 'useChat（流式对话）',
      description:
        '用于产品聊天界面的完整形态：消息历史、结构化 Message.parts、流控制，以及需要审批的工具调用。',
      roleUser: '用户',
      roleAssistant: '助手',
      composerLabel: '输入区',
      user: '看一下这张截图和发布说明草稿。',
      assistant: '截图里的第一个操作需要更短；草稿开头应先讲用户能看到的变化。',
      attachment: '已附加：dashboard.png + release-notes.txt',
      persistence: '已本地保存：support-thread-1 · Date-safe 历史',
      parts: ['source-url：useChat 参考', 'file：release-notes.txt', 'tool-chargeCard：输入已就绪'],
      actions: ['终止', '重新加载', '清空'],
      tool: '等待审批：chargeCard({ amount: 49, currency: "USD" })',
      composer: '询问模型服务商、工具审批或持久化',
      apiRef: {
        title: 'useChat 接口',
        propsTitle: '参数',
        methodsTitle: '方法',
        propsHeaders: {
          name: '参数名',
          type: '类型',
          required: '必需',
          description: '说明'
        },
        methodsHeaders: {
          name: '方法名',
          description: '说明'
        },
        props: [
          {
            name: 'provider',
            type: 'Provider',
            required: '必填',
            description: '用于发送对话请求的适配器。'
          },
          {
            name: 'options',
            type: 'UseChatOptions',
            required: '可选',
            description: '可选配置，包括历史记录、工具列表和审批判断。'
          },
          {
            name: 'prepareSendMessagesRequest',
            type: 'PrepareSendMessagesRequest',
            required: '可选',
            description: '在 provider 收到请求前，自定义已解析的发送或重新生成请求。'
          },
          {
            name: 'prepareReconnectToStreamRequest',
            type: 'PrepareReconnectToStreamRequest',
            required: '可选',
            description: '恢复后端活动流前，自定义已解析的重连请求。'
          },
          {
            name: 'persist',
            type: 'ChatPersistOptions',
            required: '可选',
            description: '通过 localStorage 或自定义 storage 保存并恢复 Date-safe 消息历史。'
          }
        ],
        methods: [
          {
            name: 'handleSubmit',
            type: '（event?, { attachments }?）：Promise<void>',
            description: '接入表单提交，发送当前输入，并在成功后清空输入。'
          },
          {
            name: 'append',
            type: '（input, { attachments }?）：Promise<void>',
            description: '提交文本和可选 FileList/File[] 附件，并流式接收回复。'
          },
          {
            name: 'reload',
            type: '（）：Promise<void>',
            description: '使用当前状态和输入重新发起最近一次请求。'
          },
          {
            name: 'approveToolCall',
            type: '（id: string）：Promise<void>',
            description: '确认后运行等待审批的本地工具 handler，并继续对话。'
          },
          {
            name: 'stop',
            type: '（）：void',
            description: '中止当前 useChat 的进行中流请求。'
          },
          {
            name: 'clear',
            type: '（）：void',
            description: '清空消息列表并重置错误状态。'
          }
        ]
      }
    },
    completion: {
      title: '文本补全',
      topbarTitle: 'useCompletion（文本补全）',
      description: '适合提示词到单段文本的写作助手模式，展示流式结果、中止和重置控制。',
      promptLabel: '提示词',
      prompt: '为新的 useEmbedding.clear() API 写一段发布说明。',
      resultLabel: '输出结果',
      output: '新增 clear()，可重置向量化结果、最近结果和错误，并中止当前请求。',
      metric: '42 个标记',
      footerActions: '完成 - 停止 - 重置',
      apiRef: {
        title: 'useCompletion 接口',
        propsTitle: '参数',
        methodsTitle: '方法',
        propsHeaders: {
          name: '参数名',
          type: '类型',
          required: '必需',
          description: '说明'
        },
        methodsHeaders: {
          name: '方法名',
          description: '说明'
        },
        props: [
          {
            name: 'provider',
            type: 'Provider',
            required: '必填',
            description: '用于发送补全请求的适配器。'
          },
          {
            name: 'defaultRequest',
            type: 'CompletionRequest',
            required: '可选',
            description: '每次补全调用都会合并的默认请求参数。'
          }
        ],
        methods: [
          {
            name: 'complete',
            type: '（prompt: string）：Promise<void>',
            description: '提交提示词并流式返回文本补全结果。'
          },
          {
            name: 'stop',
            type: '（）：void',
            description: '中止当前进行中的补全请求。'
          },
          {
            name: 'clear',
            type: '（）：void',
            description: '清理补全结果、错误信息和 loading 状态。'
          }
        ]
      }
    },
    embedding: {
      title: '向量相似度',
      topbarTitle: 'useEmbedding（向量检索）',
      description: '面向语义匹配的展示布局，包含批量输入、向量状态、使用量元数据和相似度矩阵。',
      rows: ['对话状态', '语义搜索', '冰咖啡配方'],
      usage: '3 条输入 - 128 维 - 87 个标记',
      apiRef: {
        title: 'useEmbedding 接口',
        propsTitle: '参数',
        methodsTitle: '方法',
        propsHeaders: {
          name: '参数名',
          type: '类型',
          required: '必需',
          description: '说明'
        },
        methodsHeaders: {
          name: '方法名',
          description: '说明'
        },
        props: [
          {
            name: 'provider',
            type: 'Provider',
            required: '必填',
            description: '用于生成文本 embedding 的提供者适配器。'
          },
          {
            name: 'onSuccess',
            type: '(res: EmbeddingResponse) => void',
            required: '可选',
            description: '向量计算成功后触发的回调。'
          }
        ],
        methods: [
          {
            name: 'embed',
            type: '（inputs: string[]): Promise<void>',
            description: '批量发送文本以生成 embedding。'
          },
          {
            name: 'stop',
            type: '（）：void',
            description: '中断当前向量化请求。'
          },
          {
            name: 'clear',
            type: '（）：void',
            description: '清理 embeddings、结果和当前错误状态。'
          }
        ]
      }
    },
    object: {
      title: '结构化对象输出',
      topbarTitle: 'useObject（结构化 JSON）',
      description:
        '面向信息抽取的 schema 约束流程：流式接收原始 JSON，暴露部分对象状态，并在解析成功后提交最终类型化对象。',
      schemaLabel: 'JSON Schema',
      schemaRows: ['title: string', 'priority: low | high', 'additionalProperties: false'],
      outputLabel: '部分 / 最终对象',
      outputRows: ['title: "密码重置受阻"', 'priority: "high"'],
      footer: 'response_format - 部分对象 - 最终对象 - 清空',
      apiRef: {
        title: 'useObject 接口',
        propsTitle: '参数',
        methodsTitle: '方法',
        propsHeaders: {
          name: '参数名',
          type: '类型',
          required: '必需',
          description: '说明'
        },
        methodsHeaders: {
          name: '方法名',
          description: '说明'
        },
        props: [
          {
            name: 'provider',
            type: 'Provider',
            required: '必填',
            description: '用于发送结构化聊天请求的适配器。'
          },
          {
            name: 'id',
            type: 'string',
            required: '可选',
            description: '在多个 useObject 实例间共享对象状态。'
          },
          {
            name: 'initialValue',
            type: 'DeepPartial<T>',
            required: '可选',
            description: '流式开始前用于初始化第一份部分对象。'
          },
          {
            name: 'schema',
            type: 'Record<string, unknown>',
            required: '必填',
            description: '作为结构化 response format 发送的 JSON Schema。'
          }
        ],
        methods: [
          {
            name: 'submit',
            type: '（prompt: string）：Promise<T>',
            description: '提交提示词，流式更新部分 JSON 状态，并解析最终对象。'
          },
          {
            name: 'stop',
            type: '（）：void',
            description: '中止当前结构化输出请求。'
          },
          {
            name: 'clear',
            type: '（）：void',
            description: '重置解析对象、原始文本、输入和错误状态。'
          }
        ]
      }
    },
    apiTitle: 'API 结构',
    apiSectionLabel: 'API 参考',
    apiIntro:
      '四个组合式函数保持同一套心智模型：状态、异步动作、加载中状态和错误状态，以及少量命令式控制。',
    apiRows: [
      {
        name: 'useChat',
        state:
          'messages（消息）、messages[].parts（结构化片段）、input（输入）、isLoading（加载中）、error（错误）',
        actions: 'append 追加, reload 重新加载, stop 停止, clear 清空',
        fit: '对话界面、文件附件、工具调用'
      },
      {
        name: 'useCompletion',
        state: 'completion（补全结果）、input（输入）、isLoading（加载中）、error（错误）',
        actions: 'complete 生成, stop 停止, clear 清空',
        fit: '提示词生成文本、写作工具'
      },
      {
        name: 'useEmbedding',
        state: 'embeddings（向量列表）、result（结果）、isLoading（加载中）、error（错误）',
        actions: 'embed 向量化, stop 停止, clear 清空',
        fit: '搜索、聚类、相似度计算'
      },
      {
        name: 'useObject',
        state:
          'partialObject（部分对象）、object（最终对象）、text（原始文本）、input（输入）、isLoading（加载中）、error（错误）',
        actions: 'submit 提交, stop 停止, clear 清空',
        fit: '信息抽取、分类、JSON 表单填充'
      }
    ],
    tableLabels: {
      state: '状态',
      actions: '操作',
      fit: '适用场景'
    }
  }
}

const content = computed(() => copy[localeKey.value])
const chatCode = computed(() => codeSamples[localeKey.value].chat)
const completionCode = computed(() => codeSamples[localeKey.value].completion)
const embeddingCode = computed(() => codeSamples[localeKey.value].embedding)
const objectCode = computed(() => codeSamples[localeKey.value].object)
const activeDemoHref = shallowRef<DemoHref>('#chat-demo')
const sectionIds: DemoHref[] = [
  '#chat-demo',
  '#completion-demo',
  '#embedding-demo',
  '#object-demo',
  '#chat-demo-api',
  '#completion-demo-api',
  '#embedding-demo-api',
  '#object-demo-api',
  '#chat-demo-api-props',
  '#chat-demo-api-methods',
  '#completion-demo-api-props',
  '#completion-demo-api-methods',
  '#embedding-demo-api-props',
  '#embedding-demo-api-methods',
  '#object-demo-api-props',
  '#object-demo-api-methods'
]
const sectionTargetIds = sectionIds.map((href) => href.slice(1))

let demoObserver: IntersectionObserver | undefined

function toDemoHref(hash: string): DemoHref | undefined {
  return sectionIds.find((href) => href === hash)
}

function setActiveDemo(href: string) {
  const demoHref = toDemoHref(href)
  if (demoHref) activeDemoHref.value = demoHref
}

function syncActiveDemoFromHash() {
  if (typeof window === 'undefined') return
  setActiveDemo(window.location.hash)
}

onMounted(() => {
  syncActiveDemoFromHash()
  window.addEventListener('hashchange', syncActiveDemoFromHash)

  if (!('IntersectionObserver' in window)) return

  demoObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0]
      if (visibleEntry instanceof IntersectionObserverEntry) {
        setActiveDemo(`#${visibleEntry.target.id}`)
      }
    },
    {
      rootMargin: '-120px 0px -55% 0px',
      threshold: [0, 0.25, 0.5, 1]
    }
  )

  sectionTargetIds.forEach((id) => {
    const node = document.getElementById(id)
    if (node) demoObserver?.observe(node)
  })
})

onUnmounted(() => {
  window.removeEventListener('hashchange', syncActiveDemoFromHash)
  demoObserver?.disconnect()
})
</script>

<template>
  <main class="demo-showcase" :lang="localeKey === 'zh' ? 'zh-CN' : 'en'">
    <section class="showcase-hero">
      <div class="showcase-hero__copy">
        <p class="showcase-hero__kicker">
          {{ content.heroKicker }}
        </p>
        <h1 class="showcase-hero__title">
          {{ content.heroTitle }}
        </h1>
        <p class="showcase-hero__intro">
          {{ content.heroIntro }}
        </p>
        <div class="showcase-hero__actions">
          <a class="showcase-link is-primary" href="#composable-demos">
            {{ content.primaryAction }}
          </a>
          <a class="showcase-link" :href="content.secondaryHref">
            {{ content.secondaryAction }}
          </a>
        </div>
      </div>

      <div class="showcase-brief">
        <div class="showcase-brief__topline">
          <span class="showcase-brief__dot" />
          <span>{{ content.status }}</span>
        </div>
        <dl class="showcase-brief__stats">
          <div v-for="item in content.heroStats" :key="item.label" class="showcase-brief__stat">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
        <div class="showcase-brief__choices">
          <span class="showcase-brief__choice-title">{{ content.quickChoiceTitle }}</span>
          <a
            v-for="choice in content.quickChoices"
            :key="choice.pick"
            class="showcase-brief__choice"
            :href="`#${choice.pick.replace('use', '').toLowerCase()}-demo`"
          >
            <span>{{ choice.job }}</span>
            <strong>{{ choice.pick }}</strong>
          </a>
        </div>
      </div>
    </section>

    <div class="showcase-layout">
      <nav class="showcase-nav" :aria-label="content.demoNavLabel">
        <div class="showcase-nav__group">
          <span class="showcase-nav__title">{{ content.demoNavTitle }}</span>
          <a
            v-for="link in content.demoLinks"
            :key="link.href"
            :href="link.href"
            :class="{ 'is-active': activeDemoHref === link.href }"
            :aria-current="activeDemoHref === link.href ? 'true' : undefined"
            @click="setActiveDemo(link.href)"
          >
            {{ link.label }}
          </a>
        </div>
        <div class="showcase-nav__group">
          <span class="showcase-nav__title">{{ content.apiNavTitle }}</span>
          <a
            v-for="link in content.apiLinks"
            :key="link.href"
            :href="link.href"
            :class="{ 'is-active': activeDemoHref === link.href }"
            :aria-current="activeDemoHref === link.href ? 'true' : undefined"
            @click="setActiveDemo(link.href)"
          >
            {{ link.label }}
          </a>
        </div>
      </nav>
      <section id="composable-demos" class="demo-stack" :aria-label="content.demosTitle">
        <DemoBlock
          id="chat-demo"
          api-title-id="chat-demo-api"
          api-props-section-id="chat-demo-api-props"
          api-methods-section-id="chat-demo-api-methods"
          :title="content.chat.title"
          :description="content.chat.description"
          :code="chatCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.chat.apiRef"
        >
          <div class="chat-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark" />
              <span>{{ content.chat.topbarTitle }}</span>
            </div>
            <div class="chat-preview__body">
              <article class="chat-message is-user">
                <span class="chat-message__role">{{ content.chat.roleUser }}</span>
                <p>{{ content.chat.user }}</p>
              </article>
              <div class="attachment-strip">
                <span>{{ content.chat.attachment }}</span>
              </div>
              <div class="attachment-strip">
                <span>{{ content.chat.persistence }}</span>
              </div>
              <article class="chat-message is-assistant">
                <span class="chat-message__role">{{ content.chat.roleAssistant }}</span>
                <p>{{ content.chat.assistant }}</p>
              </article>
              <ul class="message-part-strip" aria-label="Message.parts preview">
                <li v-for="part in content.chat.parts" :key="part">
                  {{ part }}
                </li>
              </ul>
              <div class="tool-call">
                <span class="tool-call__status" />
                <span>{{ content.chat.tool }}</span>
              </div>
            </div>
            <footer class="chat-composer">
              <span>{{ content.chat.composerLabel }}：{{ content.chat.composer }}</span>
              <span class="command-row">
                <span v-for="action in content.chat.actions" :key="action">
                  {{ action }}
                </span>
              </span>
            </footer>
          </div>
        </DemoBlock>

        <DemoBlock
          id="completion-demo"
          api-title-id="completion-demo-api"
          api-props-section-id="completion-demo-api-props"
          api-methods-section-id="completion-demo-api-methods"
          :title="content.completion.title"
          :description="content.completion.description"
          :code="completionCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.completion.apiRef"
        >
          <div class="completion-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-amber" />
              <span>{{ content.completion.topbarTitle }}</span>
            </div>
            <div class="completion-editor">
              <span class="field-label">{{ content.completion.promptLabel }}</span>
              <p>{{ content.completion.prompt }}</p>
            </div>
            <article class="completion-output">
              <span class="field-label">{{ content.completion.resultLabel }}</span>
              <p>{{ content.completion.output }}</p>
              <div class="completion-output__meter">
                <span />
              </div>
            </article>
            <footer class="preview-footer">
              <span>{{ content.completion.metric }}</span>
              <span>{{ content.completion.footerActions }}</span>
            </footer>
          </div>
        </DemoBlock>

        <DemoBlock
          id="embedding-demo"
          api-title-id="embedding-demo-api"
          api-props-section-id="embedding-demo-api-props"
          api-methods-section-id="embedding-demo-api-methods"
          :title="content.embedding.title"
          :description="content.embedding.description"
          :code="embeddingCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.embedding.apiRef"
        >
          <div class="embedding-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-green" />
              <span>{{ content.embedding.topbarTitle }}</span>
            </div>
            <div class="embedding-list">
              <div v-for="row in content.embedding.rows" :key="row" class="embedding-row">
                <span>{{ row }}</span>
                <span class="vector-bars">
                  <i class="is-wide" />
                  <i />
                  <i class="is-mid" />
                  <i class="is-short" />
                </span>
              </div>
            </div>
            <table class="similarity-table">
              <thead>
                <tr>
                  <th />
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>A</th>
                  <td>1.00</td>
                  <td>0.86</td>
                  <td>0.18</td>
                </tr>
                <tr>
                  <th>B</th>
                  <td>0.86</td>
                  <td>1.00</td>
                  <td>0.22</td>
                </tr>
                <tr>
                  <th>C</th>
                  <td>0.18</td>
                  <td>0.22</td>
                  <td>1.00</td>
                </tr>
              </tbody>
            </table>
            <footer class="preview-footer">
              <span>{{ content.embedding.usage }}</span>
            </footer>
          </div>
        </DemoBlock>

        <DemoBlock
          id="object-demo"
          api-title-id="object-demo-api"
          api-props-section-id="object-demo-api-props"
          api-methods-section-id="object-demo-api-methods"
          :title="content.object.title"
          :description="content.object.description"
          :code="objectCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.object.apiRef"
        >
          <div class="structured-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-indigo" />
              <span>{{ content.object.topbarTitle }}</span>
            </div>
            <div class="structured-grid">
              <article class="structured-panel">
                <span class="field-label">{{ content.object.schemaLabel }}</span>
                <ul>
                  <li v-for="row in content.object.schemaRows" :key="row">
                    {{ row }}
                  </li>
                </ul>
              </article>
              <article class="structured-panel is-output">
                <span class="field-label">{{ content.object.outputLabel }}</span>
                <ul>
                  <li v-for="row in content.object.outputRows" :key="row">
                    {{ row }}
                  </li>
                </ul>
              </article>
            </div>
            <footer class="preview-footer">
              <span>{{ content.object.footer }}</span>
            </footer>
          </div>
        </DemoBlock>
      </section>
    </div>

    <section class="api-section">
      <div class="api-section__header">
        <h2>{{ content.apiTitle }}</h2>
        <p>{{ content.apiIntro }}</p>
      </div>
      <div class="api-grid">
        <article v-for="row in content.apiRows" :key="row.name" class="api-card">
          <h3>{{ row.name }}</h3>
          <dl>
            <div>
              <dt>{{ content.tableLabels.state }}</dt>
              <dd>{{ row.state }}</dd>
            </div>
            <div>
              <dt>{{ content.tableLabels.actions }}</dt>
              <dd>{{ row.actions }}</dd>
            </div>
            <div>
              <dt>{{ content.tableLabels.fit }}</dt>
              <dd>{{ row.fit }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.demo-showcase {
  --demo-ink: oklch(24% 0.035 250);
  --demo-muted: oklch(48% 0.04 250);
  --demo-soft: oklch(96% 0.018 245);
  --demo-surface: oklch(100% 0.005 245);
  --demo-subtle: oklch(97.5% 0.015 245);
  --demo-canvas: oklch(98.5% 0.012 245);
  --demo-border: oklch(89% 0.025 245);
  --demo-grid: oklch(89% 0.025 245 / 44%);
  --demo-brand: oklch(56% 0.17 248);
  --demo-brand-soft: oklch(94% 0.05 248);
  --demo-green: oklch(58% 0.13 154);
  --demo-amber: oklch(70% 0.14 72);
  --demo-focus: oklch(60% 0.16 248);
  --demo-code-bg: oklch(22% 0.04 252);
  --demo-code: oklch(91% 0.02 245);
  display: grid;
  gap: 40px;
  color: var(--demo-ink);
  letter-spacing: 0;
}

:global(.dark) .demo-showcase {
  --demo-ink: oklch(93% 0.018 245);
  --demo-muted: oklch(72% 0.025 245);
  --demo-soft: oklch(20% 0.035 250);
  --demo-surface: oklch(17% 0.032 252);
  --demo-subtle: oklch(21% 0.035 252);
  --demo-canvas: oklch(15.5% 0.03 252);
  --demo-border: oklch(31% 0.04 252);
  --demo-grid: oklch(31% 0.04 252 / 46%);
  --demo-brand-soft: oklch(25% 0.07 248);
  --demo-code-bg: oklch(13% 0.035 252);
  --demo-code: oklch(91% 0.02 245);
}

.showcase-hero {
  display: grid;
  gap: 28px;
  padding: 32px 0 16px;
}

.showcase-hero__copy {
  display: grid;
  gap: 18px;
  max-width: 760px;
}

.showcase-hero__kicker {
  margin: 0;
  color: var(--demo-brand);
  font-size: 0.8125rem;
  font-weight: 760;
  line-height: 1.2;
  letter-spacing: 0;
}

.showcase-hero__title {
  margin: 0;
  color: var(--demo-ink);
  font-size: 3rem;
  font-weight: 760;
  line-height: 1.05;
  letter-spacing: 0;
}

.showcase-hero__intro {
  margin: 0;
  max-width: 66ch;
  color: var(--demo-muted);
  font-size: 1.0625rem;
  line-height: 1.75;
  letter-spacing: 0;
}

.showcase-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.showcase-link {
  display: inline-flex;
  align-items: center;
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  color: var(--demo-ink);
  font-size: 0.9375rem;
  font-weight: 700;
  text-decoration: none;
}

.showcase-link:hover {
  border-color: var(--demo-brand);
  color: var(--demo-brand);
}

.showcase-link:focus-visible {
  outline: 2px solid var(--demo-focus);
  outline-offset: 3px;
}

.showcase-link.is-primary {
  border-color: var(--demo-brand);
  background: var(--demo-brand);
  color: oklch(99% 0.008 245);
}

.showcase-brief {
  align-self: end;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.showcase-brief__topline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--demo-border);
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.showcase-brief__dot {
  width: 8px;
  height: 8px;
  border-radius: 8px;
  background: var(--demo-green);
}

.showcase-brief__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}

.showcase-brief__stat {
  display: grid;
  gap: 6px;
  padding: 16px;
}

.showcase-brief__stat + .showcase-brief__stat {
  border-left: 1px solid var(--demo-border);
}

.showcase-brief__stat dt {
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.showcase-brief__stat dd {
  margin: 0;
  color: var(--demo-ink);
  font-size: 1.35rem;
  font-weight: 780;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.showcase-brief__choices {
  display: grid;
  gap: 8px;
  padding: 14px 16px 16px;
  border-top: 1px solid var(--demo-border);
}

.showcase-brief__choice-title {
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 760;
  line-height: 1.2;
}

.showcase-brief__choice {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  color: var(--demo-ink);
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.35;
  text-decoration: none;
}

.showcase-brief__choice:hover {
  border-color: var(--demo-brand);
  background: var(--demo-subtle);
}

.showcase-brief__choice:focus-visible {
  outline: 2px solid var(--demo-focus);
  outline-offset: 2px;
}

.showcase-brief__choice span {
  min-width: 0;
}

.showcase-brief__choice strong {
  color: var(--demo-brand);
  font-size: 0.75rem;
  font-weight: 780;
  white-space: nowrap;
}

.showcase-nav {
  display: grid;
  gap: 10px;
  overflow-x: auto;
  width: 100%;
  padding: 8px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.showcase-nav__group {
  display: grid;
  gap: 6px;
}

.showcase-nav__group + .showcase-nav__group {
  border-top: 1px dashed var(--demo-border);
  padding-top: 8px;
}

.showcase-nav__title {
  padding: 4px 8px 6px;
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 760;
}

.showcase-nav__group .showcase-nav__title {
  margin-bottom: 4px;
  padding: 2px 0 0;
}

.showcase-nav a {
  display: inline-flex;
  align-items: center;
  align-self: stretch;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  color: var(--demo-muted);
  font-size: 0.875rem;
  font-weight: 760;
  text-decoration: none;
}

.showcase-nav a:hover {
  color: var(--demo-brand);
  background: var(--demo-subtle);
}

.showcase-nav a.is-active {
  background: var(--demo-brand-soft);
  color: var(--demo-brand);
}

.showcase-nav a:focus-visible {
  outline: 2px solid var(--demo-focus);
  outline-offset: 2px;
}

.showcase-layout {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
}

.demo-stack {
  display: grid;
  gap: 24px;
}

.chat-preview,
.completion-preview,
.embedding-preview,
.structured-preview {
  display: grid;
  gap: 18px;
  max-width: 760px;
  margin: 0 auto;
}

.preview-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.preview-topbar__mark {
  width: 9px;
  height: 9px;
  border-radius: 8px;
  background: var(--demo-brand);
}

.preview-topbar__mark.is-amber {
  background: var(--demo-amber);
}

.preview-topbar__mark.is-green {
  background: var(--demo-green);
}

.preview-topbar__mark.is-indigo {
  background: var(--demo-brand);
}

.chat-preview__body {
  display: grid;
  gap: 12px;
}

.chat-message {
  display: grid;
  gap: 6px;
  width: min(100%, 620px);
  padding: 14px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.chat-message.is-user {
  justify-self: end;
  max-width: 520px;
  border-color: var(--demo-brand-soft);
  background: var(--demo-brand-soft);
}

.chat-message p,
.completion-editor p,
.completion-output p {
  margin: 0;
  color: var(--demo-ink);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.chat-message__role,
.field-label {
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 760;
  line-height: 1.2;
}

.attachment-strip {
  justify-self: end;
  width: min(100%, 520px);
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 700;
}

.attachment-strip span {
  display: inline-flex;
  max-width: 100%;
  min-height: 30px;
  align-items: center;
  padding: 6px 10px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.message-part-strip {
  display: grid;
  gap: 8px;
  width: min(100%, 560px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.message-part-strip li {
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-subtle);
  color: var(--demo-ink);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.tool-call {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(100%, 540px);
  padding: 11px 12px;
  border: 1px dashed var(--demo-border);
  border-radius: 8px;
  background: var(--demo-subtle);
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 650;
}

.tool-call__status {
  width: 8px;
  height: 8px;
  border-radius: 8px;
  background: var(--demo-green);
}

.chat-composer {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
  color: var(--demo-muted);
  font-size: 0.875rem;
}

.command-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.command-row span {
  min-height: 30px;
  padding: 6px 10px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  color: var(--demo-ink);
  font-size: 0.8125rem;
  font-weight: 700;
}

.completion-editor,
.completion-output,
.embedding-list,
.structured-panel,
.similarity-table {
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.completion-editor,
.completion-output,
.structured-panel {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.structured-grid {
  display: grid;
  gap: 12px;
}

.structured-panel ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.structured-panel li {
  overflow-wrap: anywhere;
  color: var(--demo-ink);
  font-size: 0.875rem;
  line-height: 1.55;
}

.structured-panel.is-output {
  background: var(--demo-brand-soft);
}

.completion-output__meter {
  overflow: hidden;
  height: 6px;
  border-radius: 6px;
  background: var(--demo-soft);
}

.completion-output__meter span {
  display: block;
  width: 68%;
  height: 100%;
  border-radius: inherit;
  background: var(--demo-amber);
}

.preview-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  color: var(--demo-muted);
  font-size: 0.8125rem;
  font-weight: 650;
}

.embedding-list {
  display: grid;
  overflow: hidden;
}

.embedding-row {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(140px, 220px);
  gap: 14px;
  align-items: center;
  padding: 14px;
  color: var(--demo-ink);
  font-size: 0.875rem;
  font-weight: 650;
}

.embedding-row + .embedding-row {
  border-top: 1px solid var(--demo-border);
}

.vector-bars {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  align-items: end;
  height: 42px;
}

.vector-bars i {
  display: block;
  height: 70%;
  border-radius: 6px 6px 2px 2px;
  background: var(--demo-brand);
}

.vector-bars i.is-wide {
  height: 100%;
  background: var(--demo-green);
}

.vector-bars i.is-mid {
  height: 54%;
  background: var(--demo-amber);
}

.vector-bars i.is-short {
  height: 34%;
  background: var(--demo-muted);
}

.similarity-table {
  display: table;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  table-layout: fixed;
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.similarity-table th,
.similarity-table td {
  padding: 12px;
  border-bottom: 1px solid var(--demo-border);
  color: var(--demo-ink);
  text-align: right;
}

.similarity-table tr:last-child th,
.similarity-table tr:last-child td {
  border-bottom: 0;
}

.similarity-table th {
  color: var(--demo-muted);
  font-weight: 760;
}

.api-section {
  display: grid;
  gap: 18px;
  padding-bottom: 24px;
}

.api-section__header {
  display: grid;
  gap: 8px;
}

.api-section__header h2 {
  margin: 0;
  color: var(--demo-ink);
  font-size: 1.75rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.api-section__header p {
  margin: 0;
  max-width: 70ch;
  color: var(--demo-muted);
  font-size: 0.9375rem;
  line-height: 1.7;
}

.api-grid {
  display: grid;
  gap: 14px;
}

.api-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.api-card h3 {
  margin: 0;
  color: var(--demo-brand);
  font-size: 1rem;
  line-height: 1.3;
  letter-spacing: 0;
}

.api-card dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.api-card dl div {
  display: grid;
  gap: 4px;
}

.api-card dt {
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 760;
}

.api-card dd {
  margin: 0;
  color: var(--demo-ink);
  font-size: 0.875rem;
  line-height: 1.55;
}

@media (max-width: 640px) {
  .showcase-hero__title {
    font-size: 2.25rem;
  }

  .showcase-brief__stats {
    grid-template-columns: 1fr;
  }

  .showcase-brief__stat + .showcase-brief__stat {
    border-top: 1px solid var(--demo-border);
    border-left: 0;
  }

  .embedding-row {
    grid-template-columns: 1fr;
  }
}

@media (pointer: coarse) {
  .showcase-nav a {
    min-height: 44px;
  }
}

@media (min-width: 768px) {
  .showcase-hero {
    grid-template-columns: minmax(0, 1fr) 360px;
    align-items: end;
    padding-top: 48px;
  }

  .chat-composer {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .structured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .api-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .showcase-layout {
    grid-template-columns: 220px minmax(0, 1fr);
    align-items: start;
  }

  .showcase-nav {
    position: sticky;
    top: 82px;
    align-self: start;
  }

  .showcase-nav a {
    width: 100%;
    box-sizing: border-box;
  }

  .showcase-nav {
    width: 220px;
  }
}
</style>
