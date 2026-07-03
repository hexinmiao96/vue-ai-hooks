<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import DemoBlock from './DemoBlock.vue'

type LocaleKey = 'en' | 'zh'
type DemoHref =
  | '#chat-demo'
  | '#stream-demo'
  | '#completion-demo'
  | '#embedding-demo'
  | '#rerank-demo'
  | '#image-demo'
  | '#video-demo'
  | '#speech-demo'
  | '#transcription-demo'
  | '#object-demo'
  | '#chat-demo-api'
  | '#stream-demo-api'
  | '#completion-demo-api'
  | '#embedding-demo-api'
  | '#rerank-demo-api'
  | '#image-demo-api'
  | '#video-demo-api'
  | '#speech-demo-api'
  | '#transcription-demo-api'
  | '#object-demo-api'
  | '#chat-demo-api-props'
  | '#chat-demo-api-methods'
  | '#stream-demo-api-props'
  | '#stream-demo-api-methods'
  | '#completion-demo-api-props'
  | '#completion-demo-api-methods'
  | '#embedding-demo-api-props'
  | '#embedding-demo-api-methods'
  | '#rerank-demo-api-props'
  | '#rerank-demo-api-methods'
  | '#image-demo-api-props'
  | '#image-demo-api-methods'
  | '#video-demo-api-props'
  | '#video-demo-api-methods'
  | '#speech-demo-api-props'
  | '#speech-demo-api-methods'
  | '#transcription-demo-api-props'
  | '#transcription-demo-api-methods'
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
    stream: `import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  readUIMessageStream
} from 'vue-ai-hooks'

export async function POST(request: Request) {
  const { prompt = 'Explain stream helpers.' } = await request.json()
  const stream = createUIMessageStream({
    async execute({ write }) {
      write({ type: 'start', messageId: 'msg_stream_demo' })
      write({ type: 'text-start', id: 'text_1' })
      write({ type: 'text-delta', id: 'text_1', delta: 'Route accepted: ' })
      write({ type: 'text-delta', id: 'text_1', delta: prompt })
      write({ type: 'text-end', id: 'text_1' })
      write({ type: 'finish', finishReason: 'stop' })
    },
    onError: (error) => (error instanceof Error ? error.message : 'Stream failed')
  })

  return createUIMessageStreamResponse({ stream })
}

const response = await fetch('/api/ui-message-stream', {
  method: 'POST',
  body: JSON.stringify({ prompt: 'Ship a Vue stream route.' })
})

for await (const chunk of readUIMessageStream({ response })) {
  console.log(chunk)
}`,
    completion: `const { completion, input: prompt, complete, stop, clear, isLoading } = useCompletion({
  api: '/api/completion',
  defaultRequest: {
    model: 'gpt-4o-mini',
    temperature: 0.6
  }
})

await complete('Write a concise release note for a Vue composable.')`,
    embedding: `const { embed, embeddings, result, stop, clear } = useEmbedding({
  api: '/api/embedding',
  onSuccess: (res) => {
    console.log('tokens:', res.usage?.totalTokens)
  }
})

await embed([
  'Streaming chat state for Vue',
  'Semantic search over documents',
  'A recipe for iced coffee'
])`,
    rerank: `const { input, documents, rerankedDocuments, ranking, handleSubmit, stop, clear } = useRerank<string>({
  api: '/api/rerank',
  initialInput: 'Vue AI search results',
  initialDocuments: [
    'Streaming chat state for Vue apps',
    'Billing workflow approval',
    'Document reranking for search'
  ],
  defaultRequest: {
    model: 'rerank-model',
    topN: 2
  }
})

await handleSubmit()

console.log(rerankedDocuments.value, ranking.value)`,
    image: `const { image, images, input, handleSubmit, stop, clear } = useImage({
  api: '/api/image',
  defaultRequest: {
    model: 'image-model',
    size: '1024x1024',
    aspectRatio: '1:1'
  }
})

input.value = 'A clean Vue composable dashboard hero image'

await handleSubmit()

console.log(image.value?.url, images.value.length)`,
    video: `const { video, videos, input, handleSubmit, stop, clear } = useVideo({
  api: '/api/video',
  defaultRequest: {
    model: 'video-model',
    aspectRatio: '16:9',
    resolution: '1280x720',
    duration: 6
  }
})

input.value = 'A concise Vue product walkthrough video'

await handleSubmit()

console.log(video.value?.url, videos.value.length)`,
    speech: `const { audio, input, handleSubmit, generateSpeech, stop, clear } = useSpeech({
  api: '/api/speech',
  defaultRequest: {
    model: 'speech-model',
    voice: 'alloy',
    outputFormat: 'mp3'
  }
})

input.value = 'Read this release note aloud for the product team.'

await handleSubmit()

console.log(audio.value?.url)`,
    transcription: `const { transcription, input, handleSubmit, transcribeAudio, stop, clear } = useTranscription({
  api: '/api/transcription',
  defaultRequest: {
    model: 'transcription-model',
    language: 'en'
  }
})

input.value = 'data:audio/wav;base64,...'

await handleSubmit()

console.log(transcription.value)`,
    object: `type Ticket = { title: string; priority: 'low' | 'high' }

const { object, partialObject, text, input, submit, stop, clear } = useObject<Ticket>({
  api: '/api/object',
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
    stream: `import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  readUIMessageStream
} from 'vue-ai-hooks'

export async function POST(request: Request) {
  const { prompt = '解释 stream helper。' } = await request.json()
  const stream = createUIMessageStream({
    async execute({ write }) {
      write({ type: 'start', messageId: 'msg_stream_demo' })
      write({ type: 'text-start', id: 'text_1' })
      write({ type: 'text-delta', id: 'text_1', delta: '路由已接收：' })
      write({ type: 'text-delta', id: 'text_1', delta: prompt })
      write({ type: 'text-end', id: 'text_1' })
      write({ type: 'finish', finishReason: 'stop' })
    },
    onError: (error) => (error instanceof Error ? error.message : 'Stream 失败')
  })

  return createUIMessageStreamResponse({ stream })
}

const response = await fetch('/api/ui-message-stream', {
  method: 'POST',
  body: JSON.stringify({ prompt: '发布一个 Vue stream route。' })
})

for await (const chunk of readUIMessageStream({ response })) {
  console.log(chunk)
}`,
    completion: `const { completion: 补全结果, input: 输入文本, complete, stop, clear, isLoading } = useCompletion({
  api: '/api/completion',
  defaultRequest: {
    model: 'gpt-4o-mini',
    temperature: 0.6
  }
})

// model 与 temperature 使用项目默认模型策略可按需覆盖
// 给出一段可供发布说明复用的提示词
await complete('为新的 useEmbedding.clear() 接口补充一段发布说明。')`,
    embedding: `const { embed, embeddings: 向量列表, result: 向量结果, stop, clear } = useEmbedding({
  api: '/api/embedding',
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
    rerank: `const { input: 查询, documents: 文档列表, rerankedDocuments: 重排文档, ranking: 排名, handleSubmit, stop, clear } = useRerank<string>({
  api: '/api/rerank',
  initialInput: 'Vue AI 搜索结果',
  initialDocuments: [
    'Vue 应用的流式对话状态',
    '账单审批流程',
    '面向搜索的文档重排'
  ],
  defaultRequest: {
    model: 'rerank-model',
    topN: 2
  }
})

await handleSubmit()

console.log(重排文档.value, 排名.value)`,
    image: `const { image: 图片, images: 图片列表, input: 输入文本, handleSubmit, stop, clear } = useImage({
  api: '/api/image',
  defaultRequest: {
    model: 'image-model',
    size: '1024x1024',
    aspectRatio: '1:1'
  }
})

输入文本.value = '一个干净的 Vue 组合式函数仪表盘头图'

await handleSubmit()

console.log(图片.value?.url, 图片列表.value.length)`,
    video: `const { video: 视频, videos: 视频列表, input: 输入文本, handleSubmit, stop, clear } = useVideo({
  api: '/api/video',
  defaultRequest: {
    model: 'video-model',
    aspectRatio: '16:9',
    resolution: '1280x720',
    duration: 6
  }
})

输入文本.value = '一段简短的 Vue 产品演示视频'

await handleSubmit()

console.log(视频.value?.url, 视频列表.value.length)`,
    speech: `const { audio: 音频, input: 输入文本, handleSubmit, generateSpeech, stop, clear } = useSpeech({
  api: '/api/speech',
  defaultRequest: {
    model: 'speech-model',
    voice: 'alloy',
    outputFormat: 'mp3'
  }
})

输入文本.value = '为产品团队朗读这段发布说明。'

await handleSubmit()

console.log(音频.value?.url)`,
    transcription: `const { transcription: 转写文本, input: 输入文本, handleSubmit, transcribeAudio, stop, clear } = useTranscription({
  api: '/api/transcription',
  defaultRequest: {
    model: 'transcription-model',
    language: 'zh'
  }
})

输入文本.value = 'data:audio/wav;base64,...'

await handleSubmit()

console.log(转写文本.value)`,
    object: `type 工单 = { title: string; priority: 'low' | 'high' }

const { object: 工单对象, partialObject: 部分工单, text: 原始JSON, input: 输入文本, submit, stop, clear } = useObject<工单>({
  api: '/api/object',
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
      { job: 'Thread sidebar and local restore', pick: 'useChatThreads' },
      { job: 'One prompt to text', pick: 'useCompletion' },
      { job: 'Custom generation job', pick: 'useGeneration' },
      { job: 'Similarity search', pick: 'useEmbedding' },
      { job: 'Document reranking', pick: 'useRerank' },
      { job: 'Image generation', pick: 'useImage' },
      { job: 'Video generation', pick: 'useVideo' },
      { job: 'Speech generation', pick: 'useSpeech' },
      { job: 'Audio transcription', pick: 'useTranscription' },
      { job: 'Typed JSON extraction', pick: 'useObject' },
      { job: 'Runtime app context', pick: 'useAgentContext' },
      { job: 'Runtime capability flags', pick: 'useAgentCapabilities' },
      { job: 'Headless agent run state', pick: 'useAgentRun' },
      { job: 'Composer task starters', pick: 'usePromptSuggestions' }
    ],
    heroStats: [
      { label: 'Runnable examples', value: '15' },
      { label: 'Demo panels', value: '10' },
      { label: 'Runtime deps', value: '0' }
    ],
    demoLinks: [
      { label: 'Chat', href: '#chat-demo' },
      { label: 'Streams', href: '#stream-demo' },
      { label: 'Completion', href: '#completion-demo' },
      { label: 'Embedding', href: '#embedding-demo' },
      { label: 'Rerank', href: '#rerank-demo' },
      { label: 'Image', href: '#image-demo' },
      { label: 'Video', href: '#video-demo' },
      { label: 'Speech', href: '#speech-demo' },
      { label: 'Transcription', href: '#transcription-demo' },
      { label: 'Object', href: '#object-demo' }
    ],
    apiLinks: [
      { label: 'useChat API', href: '#chat-demo-api' },
      { label: 'Stream API', href: '#stream-demo-api' },
      { label: 'useCompletion API', href: '#completion-demo-api' },
      { label: 'useEmbedding API', href: '#embedding-demo-api' },
      { label: 'useRerank API', href: '#rerank-demo-api' },
      { label: 'useImage API', href: '#image-demo-api' },
      { label: 'useVideo API', href: '#video-demo-api' },
      { label: 'useSpeech API', href: '#speech-demo-api' },
      { label: 'useTranscription API', href: '#transcription-demo-api' },
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
            required: 'optional',
            description: 'Provider adapter. Omit it to use the default proxy transport.'
          },
          {
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Chat endpoint for the default proxy transport.'
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
    stream: {
      title: 'UI message stream route',
      topbarTitle: 'Stream utilities',
      description:
        'A backend route pattern for producing AI SDK UI message stream parts, then decoding them into provider-agnostic chat chunks.',
      requestLabel: 'Request',
      request: 'POST /api/ui-message-stream',
      eventsLabel: 'Stream parts',
      events: [
        'start: msg_stream_demo',
        'text-delta: Route accepted',
        'data-progress: accepted',
        'source-url: Stream utilities',
        'finish: stop'
      ],
      footer: 'createUIMessageStream - response - readUIMessageStream',
      apiRef: {
        title: 'Stream utilities API',
        propsTitle: 'Functions',
        methodsTitle: 'Types',
        propsHeaders: {
          name: 'Name',
          type: 'Signature',
          required: 'Export',
          description: 'Description'
        },
        methodsHeaders: {
          name: 'Type',
          description: 'Description'
        },
        props: [
          {
            name: 'createUIMessageStream',
            type: '(options) => ReadableStream',
            required: 'public',
            description: 'Create UI message stream parts from a writer callback.'
          },
          {
            name: 'createUIMessageStreamResponse',
            type: '({ stream }) => Response',
            required: 'public',
            description: 'Return stream parts as Server-Sent Events from Fetch-compatible routes.'
          },
          {
            name: 'pipeUIMessageStreamToResponse',
            type: '({ stream, response }) => Promise<void>',
            required: 'public',
            description: 'Pipe stream parts into Node-style response objects.'
          },
          {
            name: 'readUIMessageStream',
            type: '({ response }) => AsyncGenerator<ChatChunk>',
            required: 'public',
            description: 'Decode AI SDK UI stream parts into ChatChunk values.'
          }
        ],
        methods: [
          {
            name: 'CreateUIMessageStreamOptions',
            type: 'execute, onError, signal',
            description: 'Options accepted by createUIMessageStream().'
          },
          {
            name: 'UIMessageStreamWriter',
            type: 'write, merge, error',
            description: 'Writer passed to the execute callback for app-owned routes.'
          },
          {
            name: 'UIMessageStreamSource',
            type: 'Iterable | AsyncIterable | ReadableStream',
            description: 'Input accepted by response, pipe, and merge helpers.'
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
            required: 'optional',
            description: 'Provider adapter. Omit it to use the default proxy transport.'
          },
          {
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Completion endpoint for the default proxy transport.'
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
            required: 'optional',
            description: 'Provider adapter. Omit it to use the default proxy transport.'
          },
          {
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Embedding endpoint for the default proxy transport.'
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
    rerank: {
      title: 'Document reranking',
      topbarTitle: 'useRerank',
      description:
        'A search-quality route pattern for sending query and candidate documents to an app-owned rerank backend.',
      queryLabel: 'Query',
      query: 'Vue AI search results',
      documentsLabel: 'Candidates',
      rows: [
        'Streaming chat state for Vue apps',
        'Document reranking for search',
        'Billing workflow approval'
      ],
      resultLabel: 'Ranking',
      badge: 'topN 2 - normalized ranking - trace ready',
      footer: 'rerankDocuments - stop - clear',
      apiRef: {
        title: 'useRerank API',
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
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Rerank endpoint for the default app-owned backend route.'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: 'optional',
            description: 'Backend origin for local proxy or deployed server routes.'
          },
          {
            name: 'initialDocuments',
            type: 'TDocument[]',
            required: 'optional',
            description: 'Seed the candidate documents before the first rerank request.'
          },
          {
            name: 'defaultRequest',
            type: 'RerankRequest',
            required: 'optional',
            description: 'Default model, topN, and provider options merged into each request.'
          }
        ],
        methods: [
          {
            name: 'rerankDocuments',
            type: '(query?, docs?, opts?): Promise<RerankResult>',
            description: 'Send a query and candidates, then resolve normalized ranking results.'
          },
          {
            name: 'handleSubmit',
            type: '(event?): Promise<RerankResult>',
            description: 'Wire a rerank form submit and clear query only after success.'
          },
          {
            name: 'setDocuments',
            type: '(docs: TDocument[]): void',
            description: 'Replace the candidate document array for the next request.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort the active rerank request.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Clear query, documents, ranking, result, trace, and current error.'
          }
        ]
      }
    },
    image: {
      title: 'Image generation',
      topbarTitle: 'useImage',
      description:
        'A backend-owned image route pattern with prompt input, generated image refs, trace visibility, and stop/reset controls.',
      promptLabel: 'Prompt',
      prompt: 'A clean Vue composable dashboard hero image',
      resultLabel: 'Generated image',
      badge: '1 image - SVG fallback - trace ready',
      footer: 'generateImage - stop - clear',
      apiRef: {
        title: 'useImage API',
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
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Image endpoint for the default app-owned backend route.'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: 'optional',
            description: 'Backend origin for local proxy or deployed server routes.'
          },
          {
            name: 'defaultRequest',
            type: 'ImageGenerationRequest',
            required: 'optional',
            description: 'Default model, size, and provider options merged into each request.'
          },
          {
            name: 'onFinish',
            type: '(result: ImageGenerationResult) => void',
            required: 'optional',
            description: 'Callback invoked after the backend returns normalized images.'
          }
        ],
        methods: [
          {
            name: 'generateImage',
            type: '(prompt?: string): Promise<ImageGenerationResult>',
            description: 'Send a prompt and resolve with normalized image results.'
          },
          {
            name: 'handleSubmit',
            type: '(event?): Promise<ImageGenerationResult>',
            description: 'Wire an image form submit and clear input only after success.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort the active image request.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Clear images, result, trace, input, and current error.'
          }
        ]
      }
    },
    video: {
      title: 'Video generation',
      topbarTitle: 'useVideo',
      description:
        'A backend-owned video route pattern with prompt input, generated video refs, trace visibility, and stop/reset controls.',
      promptLabel: 'Prompt',
      prompt: 'A concise Vue product walkthrough video',
      resultLabel: 'Generated video',
      badge: '1 video - storyboard fallback - trace ready',
      footer: 'generateVideo - stop - clear',
      apiRef: {
        title: 'useVideo API',
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
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Video endpoint for the default app-owned backend route.'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: 'optional',
            description: 'Backend origin for local proxy or deployed server routes.'
          },
          {
            name: 'defaultRequest',
            type: 'VideoGenerationRequest',
            required: 'optional',
            description:
              'Default model, resolution, duration, and provider options merged into each request.'
          },
          {
            name: 'onFinish',
            type: '(result: VideoGenerationResult) => void',
            required: 'optional',
            description: 'Callback invoked after the backend returns normalized videos.'
          }
        ],
        methods: [
          {
            name: 'generateVideo',
            type: '(prompt?: string): Promise<VideoGenerationResult>',
            description: 'Send a prompt and resolve with normalized video results.'
          },
          {
            name: 'handleSubmit',
            type: '(event?): Promise<VideoGenerationResult>',
            description: 'Wire a video form submit and clear input only after success.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort the active video request.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Clear videos, result, trace, input, and current error.'
          }
        ]
      }
    },
    speech: {
      title: 'Speech generation',
      topbarTitle: 'useSpeech',
      description:
        'A backend-owned text-to-speech route pattern with text input, generated audio refs, trace visibility, and stop/reset controls.',
      textLabel: 'Text',
      text: 'Read this release note aloud for the product team.',
      resultLabel: 'Generated audio',
      badge: '1 audio - WAV fallback - trace ready',
      footer: 'generateSpeech - speak - stop - clear',
      apiRef: {
        title: 'useSpeech API',
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
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Speech endpoint for the default app-owned backend route.'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: 'optional',
            description: 'Backend origin for local proxy or deployed server routes.'
          },
          {
            name: 'defaultRequest',
            type: 'SpeechGenerationRequest',
            required: 'optional',
            description:
              'Default model, voice, format, and provider options merged into each request.'
          },
          {
            name: 'onFinish',
            type: '(result: SpeechGenerationResult) => void',
            required: 'optional',
            description: 'Callback invoked after the backend returns normalized audio.'
          }
        ],
        methods: [
          {
            name: 'generateSpeech',
            type: '(text?: string): Promise<SpeechGenerationResult>',
            description: 'Send text and resolve with normalized audio results.'
          },
          {
            name: 'speak',
            type: '(text?: string): Promise<SpeechGenerationResult>',
            description: 'Alias for generateSpeech() when UI copy favors speech wording.'
          },
          {
            name: 'handleSubmit',
            type: '(event?): Promise<SpeechGenerationResult>',
            description: 'Wire a speech form submit and clear input only after success.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort the active speech request.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Clear audio, result, trace, input, and current error.'
          }
        ]
      }
    },
    transcription: {
      title: 'Audio transcription',
      topbarTitle: 'useTranscription',
      description:
        'A backend-owned transcription route pattern with audio input, transcript refs, trace visibility, and stop/reset controls.',
      audioLabel: 'Audio input',
      audio: 'data:audio/wav;base64,...',
      resultLabel: 'Transcript',
      transcript: 'Local transcript for inline audio payload.',
      badge: 'text - language - trace ready',
      footer: 'transcribeAudio - stop - clear',
      apiRef: {
        title: 'useTranscription API',
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
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Transcription endpoint for the default app-owned backend route.'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: 'optional',
            description: 'Backend origin for local proxy or deployed server routes.'
          },
          {
            name: 'defaultRequest',
            type: 'TranscriptionRequest',
            required: 'optional',
            description:
              'Default model, language, prompt, and provider options merged into each request.'
          },
          {
            name: 'onFinish',
            type: '(result: TranscriptionResult) => void',
            required: 'optional',
            description: 'Callback invoked after the backend returns normalized transcript text.'
          }
        ],
        methods: [
          {
            name: 'transcribeAudio',
            type: '(audio?: string): Promise<TranscriptionResult>',
            description: 'Send audio input and resolve with normalized transcript results.'
          },
          {
            name: 'handleSubmit',
            type: '(event?): Promise<TranscriptionResult>',
            description: 'Wire a transcription form submit and clear input only after success.'
          },
          {
            name: 'stop',
            type: '(): void',
            description: 'Abort the active transcription request.'
          },
          {
            name: 'clear',
            type: '(): void',
            description: 'Clear transcript, result, trace, input, and current error.'
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
            required: 'optional',
            description: 'Provider adapter. Omit it to use the default proxy transport.'
          },
          {
            name: 'api',
            type: 'string',
            required: 'optional',
            description: 'Structured output endpoint for the default proxy transport.'
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
        name: 'useGeneration',
        state: 'result, progress, chunks, isLoading, error',
        actions: 'generate, stop, reset',
        fit: 'Custom app-owned async generation jobs'
      },
      {
        name: 'useRerank',
        state: 'documents, rerankedDocuments, ranking, result, isLoading, error',
        actions: 'rerankDocuments, handleSubmit, setDocuments, stop, clear',
        fit: 'Search-result reranking through app-owned backend routes'
      },
      {
        name: 'useImage',
        state: 'image, images, input, result, isLoading, error',
        actions: 'generateImage, handleSubmit, stop, clear',
        fit: 'Image tools through app-owned backend routes'
      },
      {
        name: 'useVideo',
        state: 'video, videos, input, result, isLoading, error',
        actions: 'generateVideo, handleSubmit, stop, clear',
        fit: 'Video tools through app-owned backend routes'
      },
      {
        name: 'useSpeech',
        state: 'audio, input, result, isLoading, error',
        actions: 'generateSpeech, speak, handleSubmit, stop, clear',
        fit: 'Text-to-speech tools through app-owned backend routes'
      },
      {
        name: 'useTranscription',
        state: 'transcription, text, input, result, isLoading, error',
        actions: 'transcribeAudio, handleSubmit, stop, clear',
        fit: 'Audio-to-text tools through app-owned backend routes'
      },
      {
        name: 'useObject',
        state: 'partialObject, object, text, input, isLoading, error',
        actions: 'submit, stop, clear',
        fit: 'Extraction, classification, JSON form filling'
      },
      {
        name: 'useChatThreads',
        state: 'threads, activeThread, activeThreadId, persistenceError',
        actions: 'createThread, renameThread, archiveThread, restoreThread, deleteThread',
        fit: 'Thread sidebars, local indexes, and restore checks'
      },
      {
        name: 'useAgentContext',
        state: 'snapshot, version, updatedAt',
        actions: 'set, patch, reset, subscribe',
        fit: 'Expose reactive app state to provider or agent requests'
      },
      {
        name: 'useAgentCapabilities',
        state: 'capabilities, supports, isLoading, error',
        actions: 'refresh, clearError',
        fit: 'Adaptive UI for runtime-declared agent capabilities'
      },
      {
        name: 'useAgentRun',
        state: 'status, messages, streamData, pendingInterrupts, error',
        actions: 'start, resume, stop, reset',
        fit: 'Headless app-owned agent event streams'
      },
      {
        name: 'usePromptSuggestions',
        state: 'suggestions, isLoading, error',
        actions: 'load, select, clearError',
        fit: 'Composer chips and task starters without a copilot shell'
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
      { job: 'Thread 侧边栏和本地恢复', pick: 'useChatThreads' },
      { job: '一个提示词生成文本', pick: 'useCompletion' },
      { job: '自定义生成任务', pick: 'useGeneration' },
      { job: '语义相似度检索', pick: 'useEmbedding' },
      { job: '文档重排', pick: 'useRerank' },
      { job: '图片生成', pick: 'useImage' },
      { job: '视频生成', pick: 'useVideo' },
      { job: '语音生成', pick: 'useSpeech' },
      { job: '音频转写', pick: 'useTranscription' },
      { job: '类型化 JSON 抽取', pick: 'useObject' },
      { job: '运行时应用上下文', pick: 'useAgentContext' },
      { job: '运行时能力开关', pick: 'useAgentCapabilities' },
      { job: '无 UI Agent run 状态', pick: 'useAgentRun' },
      { job: '输入区任务入口', pick: 'usePromptSuggestions' }
    ],
    heroStats: [
      { label: '可运行示例', value: '15' },
      { label: '展示面板', value: '10' },
      { label: '运行时依赖', value: '0' }
    ],
    demoLinks: [
      { label: '对话', href: '#chat-demo' },
      { label: 'Stream', href: '#stream-demo' },
      { label: '补全', href: '#completion-demo' },
      { label: '向量检索', href: '#embedding-demo' },
      { label: '重排', href: '#rerank-demo' },
      { label: '图片', href: '#image-demo' },
      { label: '视频', href: '#video-demo' },
      { label: '语音', href: '#speech-demo' },
      { label: '转写', href: '#transcription-demo' },
      { label: '结构化对象', href: '#object-demo' }
    ],
    apiLinks: [
      { label: 'useChat 接口', href: '#chat-demo-api' },
      { label: 'Stream 接口', href: '#stream-demo-api' },
      { label: 'useCompletion 接口', href: '#completion-demo-api' },
      { label: 'useEmbedding 接口', href: '#embedding-demo-api' },
      { label: 'useRerank 接口', href: '#rerank-demo-api' },
      { label: 'useImage 接口', href: '#image-demo-api' },
      { label: 'useVideo 接口', href: '#video-demo-api' },
      { label: 'useSpeech 接口', href: '#speech-demo-api' },
      { label: 'useTranscription 接口', href: '#transcription-demo-api' },
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
            required: '可选',
            description: 'Provider 适配器；省略时使用默认 proxy transport。'
          },
          {
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认 proxy transport 的对话端点。'
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
    stream: {
      title: 'UI message stream 路由',
      topbarTitle: 'Stream 工具',
      description:
        '面向自有后端的 stream 路由模式：逐步产出 AI SDK UI message stream parts，再解码为框架无关的 ChatChunk。',
      requestLabel: '请求',
      request: 'POST /api/ui-message-stream',
      eventsLabel: 'Stream 片段',
      events: [
        'start：msg_stream_demo',
        'text-delta：路由已接收',
        'data-progress：accepted',
        'source-url：Stream 工具',
        'finish：stop'
      ],
      footer: 'createUIMessageStream - response - readUIMessageStream',
      apiRef: {
        title: 'Stream 工具接口',
        propsTitle: '函数',
        methodsTitle: '类型',
        propsHeaders: {
          name: '名称',
          type: '签名',
          required: '导出',
          description: '说明'
        },
        methodsHeaders: {
          name: '类型',
          description: '说明'
        },
        props: [
          {
            name: 'createUIMessageStream',
            type: '(options) => ReadableStream',
            required: '公开',
            description: '通过 writer 回调创建 UI message stream parts。'
          },
          {
            name: 'createUIMessageStreamResponse',
            type: '({ stream }) => Response',
            required: '公开',
            description: '在 Fetch 兼容路由里以 SSE 返回 stream parts。'
          },
          {
            name: 'pipeUIMessageStreamToResponse',
            type: '({ stream, response }) => Promise<void>',
            required: '公开',
            description: '把 stream parts 写入 Node 风格 response。'
          },
          {
            name: 'readUIMessageStream',
            type: '({ response }) => AsyncGenerator<ChatChunk>',
            required: '公开',
            description: '把 AI SDK UI stream parts 解码成 ChatChunk。'
          }
        ],
        methods: [
          {
            name: 'CreateUIMessageStreamOptions',
            type: 'execute, onError, signal',
            description: 'createUIMessageStream() 接收的选项。'
          },
          {
            name: 'UIMessageStreamWriter',
            type: 'write, merge, error',
            description: '传给 execute 回调的 writer，用于自有后端路由。'
          },
          {
            name: 'UIMessageStreamSource',
            type: 'Iterable | AsyncIterable | ReadableStream',
            description: 'response、pipe 和 merge helper 可接收的输入。'
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
            required: '可选',
            description: 'Provider 适配器；省略时使用默认 proxy transport。'
          },
          {
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认 proxy transport 的补全端点。'
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
            required: '可选',
            description: 'Provider 适配器；省略时使用默认 proxy transport。'
          },
          {
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认 proxy transport 的 embedding 端点。'
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
    rerank: {
      title: '文档重排',
      topbarTitle: 'useRerank（文档重排）',
      description:
        '面向搜索质量优化的自有后端路由模式：把查询和候选文档发给重排服务，再渲染归一化后的排序结果。',
      queryLabel: '查询',
      query: 'Vue AI 搜索结果',
      documentsLabel: '候选文档',
      rows: ['Vue 应用的流式对话状态', '面向搜索的文档重排', '账单审批流程'],
      resultLabel: '排序结果',
      badge: 'topN 2 - 归一化排名 - trace 已就绪',
      footer: 'rerankDocuments - 停止 - 清空',
      apiRef: {
        title: 'useRerank 接口',
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
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认自有后端路由的文档重排端点。'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: '可选',
            description: '本地 proxy 或已部署服务端路由的后端地址。'
          },
          {
            name: 'initialDocuments',
            type: 'TDocument[]',
            required: '可选',
            description: '首次重排请求前的候选文档初始值。'
          },
          {
            name: 'defaultRequest',
            type: 'RerankRequest',
            required: '可选',
            description: '每次请求都会合并的默认模型、topN 和 provider 选项。'
          }
        ],
        methods: [
          {
            name: 'rerankDocuments',
            type: '（query?, docs?, opts?）：Promise<RerankResult>',
            description: '提交查询和候选文档，并返回归一化后的排序结果。'
          },
          {
            name: 'handleSubmit',
            type: '（event?）：Promise<RerankResult>',
            description: '接入重排表单提交，并且只在成功后清空查询。'
          },
          {
            name: 'setDocuments',
            type: '（docs: TDocument[]）：void',
            description: '替换下一次请求使用的候选文档数组。'
          },
          {
            name: 'stop',
            type: '（）：void',
            description: '中断当前文档重排请求。'
          },
          {
            name: 'clear',
            type: '（）：void',
            description: '清理查询、文档、ranking、result、trace 和当前错误。'
          }
        ]
      }
    },
    image: {
      title: '图片生成',
      topbarTitle: 'useImage（图片生成）',
      description:
        '面向自有后端图片路由的表单模式：提示词输入、生成图片 refs、请求 trace，以及停止和清空控制。',
      promptLabel: '提示词',
      prompt: '一个干净的 Vue 组合式函数仪表盘头图',
      resultLabel: '生成图片',
      badge: '1 张图片 - SVG fallback - trace 已就绪',
      footer: 'generateImage - 停止 - 清空',
      apiRef: {
        title: 'useImage 接口',
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
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认自有后端路由的图片生成端点。'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: '可选',
            description: '本地 proxy 或已部署服务端路由的后端地址。'
          },
          {
            name: 'defaultRequest',
            type: 'ImageGenerationRequest',
            required: '可选',
            description: '每次请求都会合并的默认模型、尺寸和 provider 选项。'
          },
          {
            name: 'onFinish',
            type: '(result: ImageGenerationResult) => void',
            required: '可选',
            description: '后端返回并归一化图片结果后触发。'
          }
        ],
        methods: [
          {
            name: 'generateImage',
            type: '（prompt?: string）：Promise<ImageGenerationResult>',
            description: '提交提示词并返回归一化后的图片结果。'
          },
          {
            name: 'handleSubmit',
            type: '（event?）：Promise<ImageGenerationResult>',
            description: '接入图片表单提交，并且只在成功后清空输入。'
          },
          {
            name: 'stop',
            type: '（）：void',
            description: '中断当前图片生成请求。'
          },
          {
            name: 'clear',
            type: '（）：void',
            description: '清理图片、结果、trace、输入和当前错误。'
          }
        ]
      }
    },
    video: {
      title: '视频生成',
      topbarTitle: 'useVideo（视频生成）',
      description:
        '面向自有后端视频路由的表单模式：提示词输入、生成视频 refs、请求 trace，以及停止和清空控制。',
      promptLabel: '提示词',
      prompt: '一段简短的 Vue 产品演示视频',
      resultLabel: '生成视频',
      badge: '1 段视频 - storyboard fallback - trace 已就绪',
      footer: 'generateVideo - stop - clear',
      apiRef: {
        title: 'useVideo 接口',
        propsTitle: '参数',
        methodsTitle: '方法',
        propsHeaders: {
          name: '名称',
          type: '类型',
          required: '必填',
          description: '说明'
        },
        methodsHeaders: {
          name: '方法',
          description: '说明'
        },
        props: [
          {
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认自有后端路由的视频生成端点。'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: '可选',
            description: '本地代理或已部署后端的 origin。'
          },
          {
            name: 'defaultRequest',
            type: 'VideoGenerationRequest',
            required: '可选',
            description: '合并到每次请求中的默认模型、分辨率、时长和 provider 选项。'
          },
          {
            name: 'onFinish',
            type: '(result: VideoGenerationResult) => void',
            required: '可选',
            description: '后端返回并归一化视频结果后触发。'
          }
        ],
        methods: [
          {
            name: 'generateVideo',
            type: '(prompt?: string): Promise<VideoGenerationResult>',
            description: '提交提示词并返回归一化后的视频结果。'
          },
          {
            name: 'handleSubmit',
            type: '(event?): Promise<VideoGenerationResult>',
            description: '接入视频表单提交，并且只在成功后清空输入。'
          },
          {
            name: 'stop',
            type: '(): void',
            description: '中断当前视频生成请求。'
          },
          {
            name: 'clear',
            type: '(): void',
            description: '清理视频、结果、trace、输入和当前错误。'
          }
        ]
      }
    },
    speech: {
      title: '语音生成',
      topbarTitle: 'useSpeech（语音生成）',
      description:
        '面向自有后端文字转语音路由的表单模式：文本输入、生成音频 refs、请求 trace，以及停止和清空控制。',
      textLabel: '文本',
      text: '为产品团队朗读这段发布说明。',
      resultLabel: '生成音频',
      badge: '1 段音频 - WAV fallback - trace 已就绪',
      footer: 'generateSpeech - speak - 停止 - 清空',
      apiRef: {
        title: 'useSpeech 接口',
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
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认自有后端路由的语音生成端点。'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: '可选',
            description: '本地 proxy 或已部署服务端路由的后端地址。'
          },
          {
            name: 'defaultRequest',
            type: 'SpeechGenerationRequest',
            required: '可选',
            description: '每次请求都会合并的默认模型、音色、格式和 provider 选项。'
          },
          {
            name: 'onFinish',
            type: '(result: SpeechGenerationResult) => void',
            required: '可选',
            description: '后端返回并归一化音频结果后触发。'
          }
        ],
        methods: [
          {
            name: 'generateSpeech',
            type: '（text?: string）：Promise<SpeechGenerationResult>',
            description: '提交文本并返回归一化后的音频结果。'
          },
          {
            name: 'speak',
            type: '（text?: string）：Promise<SpeechGenerationResult>',
            description: '当界面文案更偏语音时可使用的 generateSpeech() 别名。'
          },
          {
            name: 'handleSubmit',
            type: '（event?）：Promise<SpeechGenerationResult>',
            description: '接入语音表单提交，并且只在成功后清空输入。'
          },
          {
            name: 'stop',
            type: '（）：void',
            description: '中断当前语音生成请求。'
          },
          {
            name: 'clear',
            type: '（）：void',
            description: '清理音频、结果、trace、输入和当前错误。'
          }
        ]
      }
    },
    transcription: {
      title: '音频转写',
      topbarTitle: 'useTranscription（音频转写）',
      description:
        '面向自有后端音频转写路由的表单模式：音频输入、转写文本 refs、请求 trace，以及停止和清空控制。',
      audioLabel: '音频输入',
      audio: 'data:audio/wav;base64,...',
      resultLabel: '转写文本',
      transcript: 'inline audio payload 的本地转写结果。',
      badge: '文本 - 语言 - trace 已就绪',
      footer: 'transcribeAudio - 停止 - 清空',
      apiRef: {
        title: 'useTranscription 接口',
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
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认自有后端路由的音频转写端点。'
          },
          {
            name: 'baseURL',
            type: 'string',
            required: '可选',
            description: '本地 proxy 或已部署服务端路由的后端地址。'
          },
          {
            name: 'defaultRequest',
            type: 'TranscriptionRequest',
            required: '可选',
            description: '每次请求都会合并的默认模型、语言、提示词和 provider 选项。'
          },
          {
            name: 'onFinish',
            type: '(result: TranscriptionResult) => void',
            required: '可选',
            description: '后端返回并归一化转写文本后触发。'
          }
        ],
        methods: [
          {
            name: 'transcribeAudio',
            type: '（audio?: string）：Promise<TranscriptionResult>',
            description: '提交音频输入并返回归一化后的转写结果。'
          },
          {
            name: 'handleSubmit',
            type: '（event?）：Promise<TranscriptionResult>',
            description: '接入转写表单提交，并且只在成功后清空输入。'
          },
          {
            name: 'stop',
            type: '（）：void',
            description: '中断当前音频转写请求。'
          },
          {
            name: 'clear',
            type: '（）：void',
            description: '清理转写文本、结果、trace、输入和当前错误。'
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
            required: '可选',
            description: 'Provider 适配器；省略时使用默认 proxy transport。'
          },
          {
            name: 'api',
            type: 'string',
            required: '可选',
            description: '默认 proxy transport 的结构化输出端点。'
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
      '这些组合式函数保持同一套心智模型：状态、异步动作、加载中状态和错误状态，以及少量命令式控制。',
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
        name: 'useGeneration',
        state:
          'result（结果）、progress（进度）、chunks（片段）、isLoading（加载中）、error（错误）',
        actions: 'generate 生成, stop 停止, reset 重置',
        fit: '自有后端的异步生成任务'
      },
      {
        name: 'useRerank',
        state:
          'documents（文档）、rerankedDocuments（重排文档）、ranking（排序）、result（结果）、isLoading（加载中）、error（错误）',
        actions:
          'rerankDocuments 重排, handleSubmit 表单提交, setDocuments 设置文档, stop 停止, clear 清空',
        fit: '通过自有后端路由优化搜索结果排序'
      },
      {
        name: 'useImage',
        state:
          'image（当前图片）、images（图片列表）、input（输入）、result（结果）、isLoading（加载中）、error（错误）',
        actions: 'generateImage 生成图片, handleSubmit 表单提交, stop 停止, clear 清空',
        fit: '通过自有后端路由构建图片工具'
      },
      {
        name: 'useVideo',
        state:
          'video（当前视频）、videos（视频列表）、input（输入）、result（结果）、isLoading（加载中）、error（错误）',
        actions: 'generateVideo 生成视频, handleSubmit 表单提交, stop 停止, clear 清空',
        fit: '通过自有后端路由构建视频工具'
      },
      {
        name: 'useSpeech',
        state:
          'audio（当前音频）、input（输入）、result（结果）、isLoading（加载中）、error（错误）',
        actions:
          'generateSpeech 生成语音, speak 别名, handleSubmit 表单提交, stop 停止, clear 清空',
        fit: '通过自有后端路由构建文字转语音工具'
      },
      {
        name: 'useTranscription',
        state:
          'transcription（转写文本）、text（别名）、input（输入）、result（结果）、isLoading（加载中）、error（错误）',
        actions: 'transcribeAudio 转写, handleSubmit 表单提交, stop 停止, clear 清空',
        fit: '通过自有后端路由构建音频转文字工具'
      },
      {
        name: 'useObject',
        state:
          'partialObject（部分对象）、object（最终对象）、text（原始文本）、input（输入）、isLoading（加载中）、error（错误）',
        actions: 'submit 提交, stop 停止, clear 清空',
        fit: '信息抽取、分类、JSON 表单填充'
      },
      {
        name: 'useChatThreads',
        state: 'threads（线程）、activeThread（当前线程）、activeThreadId、persistenceError',
        actions:
          'createThread 创建, renameThread 重命名, archiveThread 归档, restoreThread 恢复, deleteThread 删除',
        fit: 'Thread 侧边栏、本地索引和恢复验证'
      },
      {
        name: 'useAgentContext',
        state: 'snapshot（快照）、version（版本）、updatedAt（更新时间）',
        actions: 'set 设置, patch 合并, reset 重置, subscribe 订阅',
        fit: '把响应式应用状态暴露给 provider 或 agent 请求'
      },
      {
        name: 'useAgentCapabilities',
        state: 'capabilities（能力）、supports（支持矩阵）、isLoading（加载中）、error（错误）',
        actions: 'refresh 刷新, clearError 清错',
        fit: '根据运行时声明能力自适应 UI'
      },
      {
        name: 'useAgentRun',
        state:
          'status（状态）、messages（消息）、streamData（流数据）、pendingInterrupts（待处理打断）、error（错误）',
        actions: 'start 启动, resume 继续, stop 停止, reset 重置',
        fit: '无 UI 的自有 agent event stream 状态'
      },
      {
        name: 'usePromptSuggestions',
        state: 'suggestions（建议）、isLoading（加载中）、error（错误）',
        actions: 'load 加载, select 选择, clearError 清错',
        fit: '输入区 chips 和任务入口，不接管 copilot 外壳'
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
const streamCode = computed(() => codeSamples[localeKey.value].stream)
const completionCode = computed(() => codeSamples[localeKey.value].completion)
const embeddingCode = computed(() => codeSamples[localeKey.value].embedding)
const rerankCode = computed(() => codeSamples[localeKey.value].rerank)
const imageCode = computed(() => codeSamples[localeKey.value].image)
const videoCode = computed(() => codeSamples[localeKey.value].video)
const speechCode = computed(() => codeSamples[localeKey.value].speech)
const transcriptionCode = computed(() => codeSamples[localeKey.value].transcription)
const objectCode = computed(() => codeSamples[localeKey.value].object)
const activeDemoHref = shallowRef<DemoHref>('#chat-demo')

const quickChoiceHrefByLocale = {
  en: {
    useChat: '#chat-demo',
    useChatThreads: '/reference/use-chat-threads',
    useCompletion: '#completion-demo',
    useGeneration: '/reference/use-generation',
    useEmbedding: '#embedding-demo',
    useRerank: '#rerank-demo',
    useImage: '#image-demo',
    useVideo: '#video-demo',
    useSpeech: '#speech-demo',
    useTranscription: '#transcription-demo',
    useObject: '#object-demo',
    useAgentContext: '/reference/use-agent-context',
    useAgentCapabilities: '/reference/use-agent-capabilities',
    useAgentRun: '/reference/use-agent-run',
    usePromptSuggestions: '/reference/use-prompt-suggestions'
  },
  zh: {
    useChat: '#chat-demo',
    useChatThreads: '/zh/reference/use-chat-threads',
    useCompletion: '#completion-demo',
    useGeneration: '/zh/reference/use-generation',
    useEmbedding: '#embedding-demo',
    useRerank: '#rerank-demo',
    useImage: '#image-demo',
    useVideo: '#video-demo',
    useSpeech: '#speech-demo',
    useTranscription: '#transcription-demo',
    useObject: '#object-demo',
    useAgentContext: '/zh/reference/use-agent-context',
    useAgentCapabilities: '/zh/reference/use-agent-capabilities',
    useAgentRun: '/zh/reference/use-agent-run',
    usePromptSuggestions: '/zh/reference/use-prompt-suggestions'
  }
} satisfies Record<LocaleKey, Record<string, string>>

function getQuickChoiceHref(pick: string) {
  return quickChoiceHrefByLocale[localeKey.value][pick] ?? '#composable-demos'
}

const sectionIds: DemoHref[] = [
  '#chat-demo',
  '#stream-demo',
  '#completion-demo',
  '#embedding-demo',
  '#rerank-demo',
  '#image-demo',
  '#video-demo',
  '#speech-demo',
  '#transcription-demo',
  '#object-demo',
  '#chat-demo-api',
  '#stream-demo-api',
  '#completion-demo-api',
  '#embedding-demo-api',
  '#rerank-demo-api',
  '#image-demo-api',
  '#video-demo-api',
  '#speech-demo-api',
  '#transcription-demo-api',
  '#object-demo-api',
  '#chat-demo-api-props',
  '#chat-demo-api-methods',
  '#stream-demo-api-props',
  '#stream-demo-api-methods',
  '#completion-demo-api-props',
  '#completion-demo-api-methods',
  '#embedding-demo-api-props',
  '#embedding-demo-api-methods',
  '#rerank-demo-api-props',
  '#rerank-demo-api-methods',
  '#image-demo-api-props',
  '#image-demo-api-methods',
  '#video-demo-api-props',
  '#video-demo-api-methods',
  '#speech-demo-api-props',
  '#speech-demo-api-methods',
  '#transcription-demo-api-props',
  '#transcription-demo-api-methods',
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
            :href="getQuickChoiceHref(choice.pick)"
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
          id="stream-demo"
          api-title-id="stream-demo-api"
          api-props-section-id="stream-demo-api-props"
          api-methods-section-id="stream-demo-api-methods"
          :title="content.stream.title"
          :description="content.stream.description"
          :code="streamCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.stream.apiRef"
        >
          <div class="stream-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-cyan" />
              <span>{{ content.stream.topbarTitle }}</span>
            </div>
            <div class="stream-preview__grid">
              <article class="stream-route">
                <span class="field-label">{{ content.stream.requestLabel }}</span>
                <p>{{ content.stream.request }}</p>
              </article>
              <article class="stream-events">
                <span class="field-label">{{ content.stream.eventsLabel }}</span>
                <ul>
                  <li v-for="event in content.stream.events" :key="event">
                    {{ event }}
                  </li>
                </ul>
              </article>
            </div>
            <footer class="preview-footer">
              <span>{{ content.stream.footer }}</span>
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
          id="rerank-demo"
          api-title-id="rerank-demo-api"
          api-props-section-id="rerank-demo-api-props"
          api-methods-section-id="rerank-demo-api-methods"
          :title="content.rerank.title"
          :description="content.rerank.description"
          :code="rerankCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.rerank.apiRef"
        >
          <div class="embedding-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-green" />
              <span>{{ content.rerank.topbarTitle }}</span>
            </div>
            <div class="completion-editor">
              <span class="field-label">{{ content.rerank.queryLabel }}</span>
              <p>{{ content.rerank.query }}</p>
            </div>
            <div class="embedding-list">
              <span class="field-label">{{ content.rerank.documentsLabel }}</span>
              <div v-for="(row, index) in content.rerank.rows" :key="row" class="embedding-row">
                <span>{{ index + 1 }}. {{ row }}</span>
                <span class="vector-bars">
                  <i class="is-wide" />
                  <i />
                  <i class="is-mid" />
                  <i class="is-short" />
                </span>
              </div>
            </div>
            <footer class="preview-footer">
              <span>{{ content.rerank.badge }}</span>
              <span>{{ content.rerank.footer }}</span>
            </footer>
          </div>
        </DemoBlock>

        <DemoBlock
          id="image-demo"
          api-title-id="image-demo-api"
          api-props-section-id="image-demo-api-props"
          api-methods-section-id="image-demo-api-methods"
          :title="content.image.title"
          :description="content.image.description"
          :code="imageCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.image.apiRef"
        >
          <div class="image-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-cyan" />
              <span>{{ content.image.topbarTitle }}</span>
            </div>
            <div class="image-preview__grid">
              <article class="image-prompt">
                <span class="field-label">{{ content.image.promptLabel }}</span>
                <p>{{ content.image.prompt }}</p>
                <span class="image-badge">{{ content.image.badge }}</span>
              </article>
              <article class="image-card">
                <span class="field-label">{{ content.image.resultLabel }}</span>
                <div class="image-card__art">
                  <span />
                </div>
              </article>
            </div>
            <footer class="preview-footer">
              <span>{{ content.image.footer }}</span>
            </footer>
          </div>
        </DemoBlock>

        <DemoBlock
          id="video-demo"
          api-title-id="video-demo-api"
          api-props-section-id="video-demo-api-props"
          api-methods-section-id="video-demo-api-methods"
          :title="content.video.title"
          :description="content.video.description"
          :code="videoCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.video.apiRef"
        >
          <div class="image-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-violet" />
              <span>{{ content.video.topbarTitle }}</span>
            </div>
            <div class="image-preview__grid">
              <article class="image-prompt">
                <span class="field-label">{{ content.video.promptLabel }}</span>
                <p>{{ content.video.prompt }}</p>
                <span class="image-badge">{{ content.video.badge }}</span>
              </article>
              <article class="image-card">
                <span class="field-label">{{ content.video.resultLabel }}</span>
                <div class="image-card__art">
                  <span />
                </div>
              </article>
            </div>
            <footer class="preview-footer">
              <span>{{ content.video.footer }}</span>
            </footer>
          </div>
        </DemoBlock>

        <DemoBlock
          id="speech-demo"
          api-title-id="speech-demo-api"
          api-props-section-id="speech-demo-api-props"
          api-methods-section-id="speech-demo-api-methods"
          :title="content.speech.title"
          :description="content.speech.description"
          :code="speechCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.speech.apiRef"
        >
          <div class="speech-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-violet" />
              <span>{{ content.speech.topbarTitle }}</span>
            </div>
            <div class="speech-preview__grid">
              <article class="speech-prompt">
                <span class="field-label">{{ content.speech.textLabel }}</span>
                <p>{{ content.speech.text }}</p>
                <span class="image-badge">{{ content.speech.badge }}</span>
              </article>
              <article class="speech-card">
                <span class="field-label">{{ content.speech.resultLabel }}</span>
                <div class="speech-wave" aria-hidden="true">
                  <span
                    v-for="index in 18"
                    :key="index"
                    :style="{ height: `${12 + (index % 6) * 6}px` }"
                  />
                </div>
                <div class="speech-player">
                  <span />
                  <i />
                </div>
              </article>
            </div>
            <footer class="preview-footer">
              <span>{{ content.speech.footer }}</span>
            </footer>
          </div>
        </DemoBlock>

        <DemoBlock
          id="transcription-demo"
          api-title-id="transcription-demo-api"
          api-props-section-id="transcription-demo-api-props"
          api-methods-section-id="transcription-demo-api-methods"
          :title="content.transcription.title"
          :description="content.transcription.description"
          :code="transcriptionCode"
          :anchor-label="content.anchorLabel"
          :panel-label="content.panelLabel"
          :preview-label="content.previewLabel"
          :code-label="content.codeLabel"
          :copy-label="content.copyLabel"
          :copied-label="content.copiedLabel"
          :copy-failed-label="content.copyFailedLabel"
          :api-aria-label="content.apiSectionLabel"
          :api-ref="content.transcription.apiRef"
        >
          <div class="transcription-preview">
            <div class="preview-topbar">
              <span class="preview-topbar__mark is-slate" />
              <span>{{ content.transcription.topbarTitle }}</span>
            </div>
            <div class="transcription-preview__grid">
              <article class="transcription-input">
                <span class="field-label">{{ content.transcription.audioLabel }}</span>
                <p>{{ content.transcription.audio }}</p>
                <span class="image-badge">{{ content.transcription.badge }}</span>
              </article>
              <article class="transcription-card">
                <span class="field-label">{{ content.transcription.resultLabel }}</span>
                <p>{{ content.transcription.transcript }}</p>
              </article>
            </div>
            <footer class="preview-footer">
              <span>{{ content.transcription.footer }}</span>
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
.stream-preview,
.embedding-preview,
.image-preview,
.speech-preview,
.transcription-preview,
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

.preview-topbar__mark.is-cyan {
  background: oklch(62% 0.14 205);
}

.preview-topbar__mark.is-violet {
  background: oklch(58% 0.16 305);
}

.preview-topbar__mark.is-indigo {
  background: var(--demo-brand);
}

.preview-topbar__mark.is-slate {
  background: var(--demo-muted);
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
.stream-route p,
.completion-editor p,
.completion-output p,
.speech-prompt p,
.transcription-input p,
.transcription-card p {
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
.stream-route,
.stream-events,
.embedding-list,
.image-prompt,
.image-card,
.speech-prompt,
.speech-card,
.transcription-input,
.transcription-card,
.structured-panel,
.similarity-table {
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.completion-editor,
.completion-output,
.stream-route,
.stream-events,
.image-prompt,
.image-card,
.speech-prompt,
.speech-card,
.transcription-input,
.transcription-card,
.structured-panel {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.image-preview__grid,
.stream-preview__grid,
.transcription-preview__grid {
  display: grid;
  gap: 12px;
}

.stream-events ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.stream-events li {
  min-width: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--demo-subtle);
  color: var(--demo-ink);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.image-prompt p,
.speech-prompt p,
.transcription-input p,
.transcription-card p {
  margin: 0;
  color: var(--demo-ink);
  font-size: 0.9375rem;
  line-height: 1.65;
}

.transcription-card {
  background: var(--demo-brand-soft);
}

.image-badge {
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  align-items: center;
  padding: 4px 9px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  color: var(--demo-muted);
  font-size: 0.75rem;
  font-weight: 760;
}

.image-card__art {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1;
  border-radius: 8px;
  background:
    linear-gradient(135deg, oklch(58% 0.16 205), oklch(62% 0.16 150)), var(--demo-brand-soft);
}

.image-card__art::before {
  position: absolute;
  inset: 14%;
  border-radius: 8px;
  background: oklch(100% 0.005 245 / 82%);
  content: '';
}

.image-card__art::after {
  position: absolute;
  right: 14%;
  bottom: 13%;
  width: 34%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--demo-amber);
  content: '';
}

.image-card__art span {
  position: absolute;
  left: 18%;
  top: 24%;
  z-index: 1;
  width: 48%;
  height: 12px;
  border-radius: 8px;
  background: var(--demo-ink);
  box-shadow:
    0 42px 0 var(--demo-muted),
    0 82px 0 var(--demo-border);
}

.speech-preview__grid {
  display: grid;
  gap: 12px;
}

.speech-wave {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 82px;
  padding: 16px;
  border-radius: 8px;
  background: var(--demo-subtle);
}

.speech-wave span {
  width: 8px;
  border-radius: 999px;
  background: oklch(58% 0.16 305);
}

.speech-player {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--demo-border);
  border-radius: 8px;
  background: var(--demo-surface);
}

.speech-player span {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--demo-brand);
}

.speech-player i {
  display: block;
  height: 6px;
  border-radius: 6px;
  background: var(--demo-border);
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

  .image-preview__grid {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  }

  .stream-preview__grid {
    grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  }

  .speech-preview__grid {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  }

  .transcription-preview__grid {
    grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
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
