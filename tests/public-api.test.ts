import { ref, type Ref } from 'vue'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  AiHooksError,
  anthropic,
  deepseek,
  deserializeMessages,
  dynamicTool,
  fallbackProvider,
  gemini,
  hasToolCall,
  experimental_useObject,
  isStepCount,
  jsonSchema,
  lastAssistantMessageIsCompleteWithToolCalls,
  openai,
  openaiCompatible,
  openrouter,
  pruneMessages,
  proxyProvider,
  serializeMessages,
  tool,
  useChat,
  useCompletion,
  useEmbedding,
  useGeneration,
  useImage,
  useObject,
  useRerank,
  useSpeech,
  useTranscription,
  usePersist
} from 'vue-ai-hooks'
import type {
  AiRequestStatus,
  AddToolOutputOptions,
  AddToolResultOptions,
  AppendChatOptions,
  AnthropicConfig,
  ChatFinishInfo,
  ChatChunk,
  ChatAttachmentInput,
  ChatAttachmentsInput,
  ChatFileAttachment,
  ChatProvider,
  ChatPersistOptions,
  ChatRequest,
  ChatRequestInfo,
  ChatRequestLifecycleKind,
  ChatResumeRequest,
  ChatResponseInfo,
  CompletionFinishInfo,
  CompletionRequest,
  CompletionRequestInfo,
  CompletionResponseInfo,
  CompletionStreamProtocol,
  ContentPart,
  DataPartSchema,
  DataPartSchemas,
  DataPartValidator,
  DeepPartial,
  DeepSeekConfig,
  EmbeddingRequestInfo,
  EmbeddingRequest,
  EmbeddingResponseInfo,
  EmbeddingResult,
  FallbackProviderConfig,
  FallbackProviderContext,
  FallbackProviderKind,
  GeminiConfig,
  GenerateOptions,
  GenerationFetcher,
  GenerationRequestInfo,
  GenerationResponseInfo,
  GenerationRunContext,
  IdGenerator,
  GeneratedAudio,
  GeneratedImage,
  ImageGenerationRequest,
  ImageGenerationRequestInfo,
  ImageGenerationResponseInfo,
  ImageGenerationResult,
  ImageUrlPart,
  Message,
  MessageContent,
  MessageDataPart,
  MessageFilePart,
  MessageMetadataSchema,
  MessageMetadataValidator,
  MessagePart,
  MessageReasoningPart,
  MessageRole,
  MessageSourcePart,
  MessageTextPart,
  MessageToolPart,
  OpenAiLikeConfig,
  OpenRouterConfig,
  ObjectFinishInfo,
  ObjectRequestInfo,
  ObjectResponseInfo,
  PrepareReconnectToStreamRequest,
  PrepareReconnectToStreamRequestOptions,
  PrepareSendMessagesRequest,
  PrepareSendMessagesRequestOptions,
  PrepareStep,
  PrepareStepOptions,
  PruneMessagesOptions,
  PruneReasoningStrategy,
  PruneToolCallsOption,
  PruneToolCallsRule,
  PruneToolCallsStrategy,
  ProxyRequestContext,
  ProxyRequestKind,
  ProxyRequestOverride,
  ProxyProviderConfig,
  RegenerateChatOptions,
  RerankDocument,
  RerankRankingItem,
  RerankRequest,
  RerankRequestInfo,
  RerankResponseInfo,
  RerankResult,
  RetryContext,
  RetryOptions,
  ResumeChatOptions,
  ResponseFormat,
  SendAutomaticallyWhen,
  SendAutomaticallyWhenOptions,
  SendChatMessageInput,
  SetDataInput,
  SetMessagesInput,
  SendChatTrigger,
  SerializedMessage,
  SpeechGenerationRequest,
  SpeechGenerationRequestInfo,
  SpeechGenerationResponseInfo,
  SpeechGenerationResult,
  TranscriptionRequest,
  TranscriptionRequestInfo,
  TranscriptionResponseInfo,
  TranscriptionResult,
  TranscriptionSegment,
  ChatStatus,
  ChatToolsInput,
  StopWhen,
  StopWhenOptions,
  StreamDataPart,
  StreamThrottleOptions,
  TextPart,
  TokenUsage,
  Tool,
  AnyToolDefinition,
  JsonSchemaDefinition,
  ToolDefinition,
  ToolExecute,
  ToolInputSchema,
  ToolSet,
  ToolApprovalResponse,
  ToolApprovalPredicate,
  ToolCall,
  ToolCallHandler,
  ToolCallHandlerContext,
  ToolResultHandlerContext,
  UseChatOptions,
  UseChatReturn,
  UseCompletionOptions,
  UseCompletionReturn,
  UseEmbeddingOptions,
  UseEmbeddingReturn,
  UseGenerationOptions,
  UseGenerationReturn,
  UseImageOptions,
  UseImageReturn,
  UseObjectOptions,
  UseObjectReturn,
  UseRerankOptions,
  UseRerankReturn,
  UseSpeechOptions,
  UseSpeechReturn,
  UseTranscriptionOptions,
  UseTranscriptionReturn,
  UsePersistOptions
} from 'vue-ai-hooks'

const provider: ChatProvider = openaiCompatible({
  apiKey: 'test-key',
  baseURL: 'https://example.test/v1'
})

function assertInvalidPublicApiUsage() {
  // @ts-expect-error schema is required by the public useObject contract.
  useObject({})
  // @ts-expect-error schema is required by the AI SDK-compatible object alias too.
  experimental_useObject({})
}

describe('public API types', () => {
  it('exports provider factories as ChatProvider-compatible values', () => {
    expectTypeOf(openai({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(openrouter({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(gemini({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(deepseek({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(proxyProvider()).toEqualTypeOf<ChatProvider>()
    expectTypeOf(anthropic({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(fallbackProvider({ providers: [provider] })).toEqualTypeOf<ChatProvider>()
    expectTypeOf<OpenAiLikeConfig>().toMatchTypeOf<{
      apiKey: string
      baseURL: string
      timeoutMs?: number
    }>()
    expectTypeOf<OpenAiLikeConfig['headers']>().toEqualTypeOf<HeadersInit | undefined>()
    expectTypeOf<OpenRouterConfig>().toMatchTypeOf<{
      apiKey: string
      siteUrl?: string
      timeoutMs?: number
    }>()
    expectTypeOf<GeminiConfig>().toMatchTypeOf<{
      apiKey: string
      baseURL?: string
      timeoutMs?: number
    }>()
    expectTypeOf<DeepSeekConfig>().toMatchTypeOf<{
      apiKey: string
      baseURL?: string
      timeoutMs?: number
    }>()
    expectTypeOf<ProxyProviderConfig['chatUrl']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<ProxyProviderConfig['credentials']>().toEqualTypeOf<
      RequestCredentials | undefined
    >()
    expectTypeOf<ProxyProviderConfig['headers']>().toEqualTypeOf<
      HeadersInit | (() => HeadersInit | Promise<HeadersInit>) | undefined
    >()
    const proxyConfig: ProxyProviderConfig = {
      headers: new Headers({ 'X-Client': 'browser' }),
      body: ({ kind }) => ({ kind }),
      prepareRequest(context) {
        if (context.kind === 'resume') {
          expectTypeOf(context.request.id).toEqualTypeOf<string>()
        }
        return { headers: [['X-Test', context.kind]] }
      }
    }
    expectTypeOf<ProxyProviderConfig['prepareRequest']>().toMatchTypeOf<
      | ((
          context: ProxyRequestContext
        ) => ProxyRequestOverride | void | Promise<ProxyRequestOverride | void>)
      | undefined
    >()
    expectTypeOf<ProxyRequestOverride['headers']>().toEqualTypeOf<HeadersInit | undefined>()
    expectTypeOf<ProxyRequestKind>().toEqualTypeOf<'chat' | 'completion' | 'embedding' | 'resume'>()
    expectTypeOf(proxyConfig).toEqualTypeOf<ProxyProviderConfig>()
    expectTypeOf<AnthropicConfig>().toMatchTypeOf<{
      apiKey: string
      maxTokens?: number
      timeoutMs?: number
    }>()
    expectTypeOf<AnthropicConfig['headers']>().toEqualTypeOf<HeadersInit | undefined>()
    const fallbackConfig: FallbackProviderConfig = {
      providers: [provider],
      shouldFallback(context) {
        expectTypeOf(context).toEqualTypeOf<FallbackProviderContext>()
        return context.kind === 'chat'
      },
      onFallback(context) {
        expectTypeOf(context.nextProviderId).toEqualTypeOf<string | undefined>()
      }
    }
    expectTypeOf<FallbackProviderKind>().toEqualTypeOf<'chat' | 'completion' | 'embedding'>()
    expectTypeOf(fallbackConfig).toEqualTypeOf<FallbackProviderConfig>()

    expect(openai({ apiKey: 'test-key' }).id).toBe('openai-compatible')
    expect(openrouter({ apiKey: 'test-key' }).id).toBe('openrouter')
    expect(gemini({ apiKey: 'test-key' }).id).toBe('gemini')
    expect(deepseek({ apiKey: 'test-key' }).id).toBe('deepseek')
    expect(proxyProvider().id).toBe('proxy')
    expect(anthropic({ apiKey: 'test-key' }).id).toBe('anthropic')
    expect(fallbackProvider({ providers: [provider] }).id).toBe('fallback')
  })

  it('keeps composable return types stable for consumers', () => {
    const chat = useChat({ provider } satisfies UseChatOptions)
    const defaultTransportChat = useChat({} satisfies UseChatOptions)
    const apiChat = useChat({ api: '/api/chat' } satisfies UseChatOptions)
    const typedChat = useChat<{ progress: number; label?: string }>({
      provider,
      onData(part) {
        expectTypeOf(part).toEqualTypeOf<StreamDataPart<{ progress: number; label?: string }>>()
        expectTypeOf(part.data.progress).toEqualTypeOf<number>()
        expectTypeOf(part.data.label).toEqualTypeOf<string | undefined>()
      }
    } satisfies UseChatOptions<{ progress: number; label?: string }>)
    const metadataChat = useChat<unknown, { source: string; intent?: string }>({
      provider,
      messageMetadataSchema: {
        type: 'object',
        properties: {
          source: { type: 'string' }
        }
      }
    } satisfies UseChatOptions<unknown, { source: string; intent?: string }>)
    const completion = useCompletion({ provider } satisfies UseCompletionOptions)
    const defaultTransportCompletion = useCompletion({} satisfies UseCompletionOptions)
    const completionApi = useCompletion({
      api: '/api/completion'
    } satisfies UseCompletionOptions)
    const embedding = useEmbedding({ provider } satisfies UseEmbeddingOptions)
    const defaultTransportEmbedding = useEmbedding({} satisfies UseEmbeddingOptions)
    const embeddingApi = useEmbedding({
      api: '/api/embedding'
    } satisfies UseEmbeddingOptions)
    const generation = useGeneration<string, { url: string }, { percent: number }, string>({
      fetcher: async (input, context) => {
        expectTypeOf(input).toEqualTypeOf<string>()
        expectTypeOf(context).toEqualTypeOf<
          GenerationRunContext<string, { percent: number }, string>
        >()
        context.reportProgress({ percent: 100 })
        context.reportChunk('done')
        return { url: input }
      }
    } satisfies UseGenerationOptions<string, { url: string }, { percent: number }, string>)
    const imageGeneration = useImage({
      api: '/api/image'
    } satisfies UseImageOptions)
    const speechGeneration = useSpeech({
      api: '/api/speech'
    } satisfies UseSpeechOptions)
    const transcriptionGeneration = useTranscription({
      api: '/api/transcription'
    } satisfies UseTranscriptionOptions)
    const reranking = useRerank<string>({
      api: '/api/rerank'
    } satisfies UseRerankOptions<string>)
    const structured = useObject<{ answer: string }>({
      provider,
      schema: { type: 'object' }
    } satisfies UseObjectOptions<{ answer: string }>)
    const experimentalStructured = experimental_useObject<{ answer: string }>({
      provider,
      schema: { type: 'object' }
    } satisfies UseObjectOptions<{ answer: string }>)
    const defaultTransportObject = useObject<{ answer: string }>({
      schema: { type: 'object' }
    } satisfies UseObjectOptions<{ answer: string }>)
    const objectApi = useObject<{ answer: string }>({
      api: '/api/object',
      schema: { type: 'object' }
    } satisfies UseObjectOptions<{ answer: string }>)

    expectTypeOf(chat).toEqualTypeOf<UseChatReturn>()
    expectTypeOf(defaultTransportChat).toEqualTypeOf<UseChatReturn>()
    expectTypeOf(apiChat).toEqualTypeOf<UseChatReturn>()
    expectTypeOf(chat.id).toEqualTypeOf<Ref<string>>()
    expectTypeOf(chat.messages).toEqualTypeOf<Ref<Message[]>>()
    expectTypeOf(chat.status).toEqualTypeOf<Ref<ChatStatus>>()
    expectTypeOf<ChatStatus>().toEqualTypeOf<AiRequestStatus>()
    expectTypeOf(chat.usage).toEqualTypeOf<Ref<TokenUsage | null>>()
    expectTypeOf(chat.data).toEqualTypeOf<Ref<StreamDataPart[]>>()
    expectTypeOf(chat.streamData).toEqualTypeOf<Ref<StreamDataPart[]>>()
    expectTypeOf(typedChat).toEqualTypeOf<UseChatReturn<{ progress: number; label?: string }>>()
    expectTypeOf(typedChat.data).toEqualTypeOf<
      Ref<StreamDataPart<{ progress: number; label?: string }>[]>
    >()
    expectTypeOf(typedChat.streamData).toEqualTypeOf<
      Ref<StreamDataPart<{ progress: number; label?: string }>[]>
    >()
    expectTypeOf(metadataChat).toEqualTypeOf<
      UseChatReturn<unknown, { source: string; intent?: string }>
    >()
    expectTypeOf(chat.pendingToolCalls).toEqualTypeOf<Ref<ToolCall[]>>()
    expectTypeOf(chat.append).parameter(0).toEqualTypeOf<string | Message>()
    expectTypeOf(chat.append).parameter(1).toEqualTypeOf<AppendChatOptions | undefined>()
    expectTypeOf(metadataChat.append)
      .parameter(1)
      .toEqualTypeOf<AppendChatOptions<{ source: string; intent?: string }> | undefined>()
    expectTypeOf(chat.sendMessage)
      .parameter(0)
      .toEqualTypeOf<string | Message | SendChatMessageInput | undefined>()
    expectTypeOf(chat.sendMessage).parameter(1).toEqualTypeOf<AppendChatOptions | undefined>()
    expectTypeOf(metadataChat.sendMessage)
      .parameter(0)
      .toEqualTypeOf<
        string | Message | SendChatMessageInput<{ source: string; intent?: string }> | undefined
      >()
    const legacyAddToolResult: (
      toolCallId: string,
      result: unknown,
      options?: Partial<ChatRequest>
    ) => Promise<void> = chat.addToolResult
    const objectAddToolResult: (
      output: AddToolResultOptions,
      options?: Partial<ChatRequest>
    ) => Promise<void> = chat.addToolResult
    expectTypeOf<AddToolResultOptions>().toEqualTypeOf<AddToolOutputOptions>()
    void legacyAddToolResult
    void objectAddToolResult
    expectTypeOf(chat.addToolOutput).parameter(0).toEqualTypeOf<AddToolOutputOptions>()
    expectTypeOf(chat.addToolOutput).parameter(1).toEqualTypeOf<Partial<ChatRequest> | undefined>()
    expectTypeOf(chat.addToolApprovalResponse).parameter(0).toEqualTypeOf<ToolApprovalResponse>()
    expectTypeOf(chat.addToolApprovalResponse)
      .parameter(1)
      .toEqualTypeOf<Partial<ChatRequest> | undefined>()
    expectTypeOf(chat.approveToolCall).parameter(0).toEqualTypeOf<string>()
    expectTypeOf(chat.approveToolCall)
      .parameter(1)
      .toEqualTypeOf<Partial<ChatRequest> | undefined>()
    expectTypeOf(chat.rejectToolCall).parameter(0).toEqualTypeOf<string>()
    expectTypeOf(chat.rejectToolCall).parameter(1).toEqualTypeOf<unknown>()
    expectTypeOf(chat.rejectToolCall).parameter(2).toEqualTypeOf<Partial<ChatRequest> | undefined>()
    expectTypeOf(chat.regenerate).parameter(0).toEqualTypeOf<RegenerateChatOptions | undefined>()
    expectTypeOf(chat.resumeStream).parameter(0).toEqualTypeOf<ResumeChatOptions | undefined>()
    expectTypeOf(chat.setId).parameter(0).toEqualTypeOf<string>()
    expectTypeOf(chat.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(chat.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(chat.handleSubmit).returns.toEqualTypeOf<Promise<void>>()
    expectTypeOf(chat.handleSubmit)
      .parameter(0)
      .toEqualTypeOf<{ preventDefault?: () => void } | undefined>()
    expectTypeOf(chat.handleSubmit).parameter(1).toEqualTypeOf<AppendChatOptions | undefined>()
    expectTypeOf(chat.setMessages).parameter(0).toEqualTypeOf<SetMessagesInput>()
    expectTypeOf(typedChat.setData)
      .parameter(0)
      .toEqualTypeOf<SetDataInput<{ progress: number; label?: string }>>()
    expectTypeOf(chat.clearError).toEqualTypeOf<() => void>()
    expectTypeOf(chat.clearTrace).toEqualTypeOf<() => void>()
    expectTypeOf(chat.lastRequest).toEqualTypeOf<Ref<ChatRequestInfo | null>>()
    expectTypeOf(chat.lastResponse).toEqualTypeOf<Ref<ChatResponseInfo | null>>()
    expectTypeOf(completion).toEqualTypeOf<UseCompletionReturn>()
    expectTypeOf(defaultTransportCompletion).toEqualTypeOf<UseCompletionReturn>()
    expectTypeOf(completionApi).toEqualTypeOf<UseCompletionReturn>()
    expectTypeOf<UseChatOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseChatOptions['provider']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseChatOptions['transport']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseChatOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseChatOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseChatOptions['credentials']>().toEqualTypeOf<RequestCredentials | undefined>()
    expectTypeOf<UseChatOptions['headers']>().toEqualTypeOf<
      ProxyProviderConfig['headers'] | undefined
    >()
    expectTypeOf<UseChatOptions['body']>().toEqualTypeOf<ProxyProviderConfig['body'] | undefined>()
    expectTypeOf<UseChatOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseChatOptions['tools']>().toEqualTypeOf<ChatToolsInput | undefined>()
    expectTypeOf<UseChatOptions['activeTools']>().toEqualTypeOf<string[] | undefined>()
    expectTypeOf<ChatRequest['tools']>().toEqualTypeOf<Tool[] | undefined>()
    expectTypeOf<ChatRequest['activeTools']>().toEqualTypeOf<string[] | undefined>()
    expectTypeOf<UseChatOptions['stopWhen']>().toEqualTypeOf<
      StopWhen | readonly StopWhen[] | undefined
    >()
    expectTypeOf<UseCompletionOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseCompletionOptions['provider']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseCompletionOptions['transport']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseCompletionOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseCompletionOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseCompletionOptions['credentials']>().toEqualTypeOf<
      RequestCredentials | undefined
    >()
    expectTypeOf<UseCompletionOptions['headers']>().toEqualTypeOf<
      ProxyProviderConfig['headers'] | undefined
    >()
    expectTypeOf<UseCompletionOptions['body']>().toEqualTypeOf<
      ProxyProviderConfig['body'] | undefined
    >()
    expectTypeOf<UseCompletionOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseCompletionOptions['streamProtocol']>().toEqualTypeOf<
      CompletionStreamProtocol | undefined
    >()
    expectTypeOf<UseEmbeddingOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseEmbeddingOptions['provider']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseEmbeddingOptions['transport']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseEmbeddingOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseEmbeddingOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseEmbeddingOptions['credentials']>().toEqualTypeOf<
      RequestCredentials | undefined
    >()
    expectTypeOf<UseEmbeddingOptions['headers']>().toEqualTypeOf<
      ProxyProviderConfig['headers'] | undefined
    >()
    expectTypeOf<UseEmbeddingOptions['body']>().toEqualTypeOf<
      ProxyProviderConfig['body'] | undefined
    >()
    expectTypeOf<UseEmbeddingOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseEmbeddingOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseGenerationOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseImageOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseImageOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseImageOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseImageOptions['credentials']>().toEqualTypeOf<RequestCredentials | undefined>()
    expectTypeOf<UseImageOptions['headers']>().toMatchTypeOf<
      HeadersInit | (() => HeadersInit | Promise<HeadersInit>) | undefined
    >()
    expectTypeOf<UseImageOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseImageOptions['timeoutMs']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<UseImageOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseSpeechOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseSpeechOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseSpeechOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseSpeechOptions['credentials']>().toEqualTypeOf<RequestCredentials | undefined>()
    expectTypeOf<UseSpeechOptions['headers']>().toMatchTypeOf<
      HeadersInit | (() => HeadersInit | Promise<HeadersInit>) | undefined
    >()
    expectTypeOf<UseSpeechOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseSpeechOptions['timeoutMs']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<UseSpeechOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseTranscriptionOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseTranscriptionOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseTranscriptionOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseTranscriptionOptions['credentials']>().toEqualTypeOf<
      RequestCredentials | undefined
    >()
    expectTypeOf<UseTranscriptionOptions['headers']>().toMatchTypeOf<
      HeadersInit | (() => HeadersInit | Promise<HeadersInit>) | undefined
    >()
    expectTypeOf<UseTranscriptionOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseTranscriptionOptions['timeoutMs']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<UseTranscriptionOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseRerankOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseRerankOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseRerankOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseRerankOptions['credentials']>().toEqualTypeOf<RequestCredentials | undefined>()
    expectTypeOf<UseRerankOptions['headers']>().toMatchTypeOf<
      HeadersInit | (() => HeadersInit | Promise<HeadersInit>) | undefined
    >()
    expectTypeOf<UseRerankOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseRerankOptions['timeoutMs']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<UseRerankOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseRerankOptions<string>['initialDocuments']>().toEqualTypeOf<
      string[] | undefined
    >()
    expectTypeOf<UseObjectOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseObjectOptions['provider']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseObjectOptions['transport']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseObjectOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseObjectOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseObjectOptions['credentials']>().toEqualTypeOf<RequestCredentials | undefined>()
    expectTypeOf<UseObjectOptions['headers']>().toEqualTypeOf<
      ProxyProviderConfig['headers'] | undefined
    >()
    expectTypeOf<UseObjectOptions['body']>().toEqualTypeOf<
      ProxyProviderConfig['body'] | undefined
    >()
    expectTypeOf<UseObjectOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseChatOptions>().toMatchTypeOf<StreamThrottleOptions>()
    expectTypeOf<UseCompletionOptions>().toMatchTypeOf<StreamThrottleOptions>()
    expectTypeOf<UseGenerationOptions>().toMatchTypeOf<StreamThrottleOptions>()
    expectTypeOf<UseObjectOptions>().toMatchTypeOf<StreamThrottleOptions>()
    expectTypeOf<RetryContext>().toMatchTypeOf<{ attempt: number; maxRetries: number }>()
    expectTypeOf<StreamThrottleOptions>().toMatchTypeOf<{
      throttleMs?: number
      experimental_throttle?: number
    }>()
    expectTypeOf<UseChatOptions['generateId']>().toEqualTypeOf<IdGenerator | undefined>()
    expectTypeOf<UseChatOptions['messages']>().toEqualTypeOf<Message[] | undefined>()
    expectTypeOf<UseChatOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseChatOptions['threadId']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseChatOptions['forwardedProps']>().toEqualTypeOf<
      Record<string, unknown> | undefined
    >()
    expectTypeOf<UseChatOptions['context']>().toEqualTypeOf<unknown>()
    expectTypeOf<UseChatOptions['prepareSendMessagesRequest']>().toEqualTypeOf<
      PrepareSendMessagesRequest | undefined
    >()
    expectTypeOf<UseChatOptions['prepareStep']>().toEqualTypeOf<PrepareStep | undefined>()
    expectTypeOf<UseChatOptions['prepareReconnectToStreamRequest']>().toEqualTypeOf<
      PrepareReconnectToStreamRequest | undefined
    >()
    expectTypeOf<ChatRequestLifecycleKind>().toEqualTypeOf<'chat' | 'resume'>()
    expectTypeOf<ChatRequestInfo>().toMatchTypeOf<{
      kind: ChatRequestLifecycleKind
      request: ChatRequest | ChatResumeRequest
      attempt: number
      providerId: string
      api?: string
      credentials?: RequestCredentials
    }>()
    expectTypeOf<ChatResponseInfo>().toMatchTypeOf<ChatRequestInfo & { hasStream: boolean }>()
    expectTypeOf<PrepareSendMessagesRequestOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<PrepareSendMessagesRequestOptions['credentials']>().toEqualTypeOf<
      RequestCredentials | undefined
    >()
    expectTypeOf<PrepareStepOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<PrepareStepOptions['credentials']>().toEqualTypeOf<
      RequestCredentials | undefined
    >()
    expectTypeOf<PrepareReconnectToStreamRequestOptions['api']>().toEqualTypeOf<
      string | undefined
    >()
    expectTypeOf<PrepareReconnectToStreamRequestOptions['credentials']>().toEqualTypeOf<
      RequestCredentials | undefined
    >()
    expectTypeOf<UseChatOptions['onRequest']>().toEqualTypeOf<
      ((info: ChatRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseChatOptions['onResponse']>().toEqualTypeOf<
      ((info: ChatResponseInfo) => void) | undefined
    >()
    expectTypeOf<UseChatOptions<{ progress: number }>['onData']>().toEqualTypeOf<
      ((part: StreamDataPart<{ progress: number }>) => void) | undefined
    >()
    expectTypeOf<UseChatOptions<{ progress: number }>['dataPartSchemas']>().toEqualTypeOf<
      DataPartSchemas<{ progress: number }> | undefined
    >()
    expectTypeOf<DataPartValidator<{ progress: number }>>().toEqualTypeOf<
      (data: unknown) => data is { progress: number }
    >()
    expectTypeOf<DataPartSchema<{ progress: number }>>().toEqualTypeOf<
      Record<string, unknown> | DataPartValidator<{ progress: number }>
    >()
    expectTypeOf<DataPartSchemas<{ progress: number }>>().toEqualTypeOf<
      Record<string, DataPartSchema<{ progress: number }>>
    >()
    expectTypeOf<
      UseChatOptions<unknown, { source: string }>['messageMetadataSchema']
    >().toEqualTypeOf<MessageMetadataSchema<{ source: string }> | undefined>()
    expectTypeOf<MessageMetadataValidator<{ source: string }>>().toEqualTypeOf<
      (metadata: unknown) => metadata is { source: string }
    >()
    expectTypeOf<MessageMetadataSchema<{ source: string }>>().toEqualTypeOf<
      Record<string, unknown> | MessageMetadataValidator<{ source: string }>
    >()
    expectTypeOf(pruneMessages).parameter(0).toEqualTypeOf<PruneMessagesOptions>()
    expectTypeOf(pruneMessages).returns.toEqualTypeOf<Message[]>()
    expectTypeOf<PruneToolCallsStrategy>().toEqualTypeOf<
      'none' | 'all' | 'before-last-message' | `before-last-${number}-messages`
    >()
    expectTypeOf<PruneToolCallsRule>().toEqualTypeOf<{
      type: 'all' | 'before-last-message' | `before-last-${number}-messages`
      tools?: readonly string[]
    }>()
    expectTypeOf<PruneToolCallsOption>().toEqualTypeOf<
      PruneToolCallsStrategy | readonly PruneToolCallsRule[]
    >()
    expectTypeOf<PruneReasoningStrategy>().toEqualTypeOf<PruneToolCallsStrategy>()
    expectTypeOf<UseCompletionOptions['id']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseCompletionOptions['generateId']>().toEqualTypeOf<IdGenerator | undefined>()
    expectTypeOf<UseObjectOptions['id']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseObjectOptions['generateId']>().toEqualTypeOf<IdGenerator | undefined>()
    expectTypeOf<UseObjectOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseObjectOptions<{ answer: string }>['initialValue']>().toEqualTypeOf<
      DeepPartial<{ answer: string }> | null | undefined
    >()
    expectTypeOf<IdGenerator>().returns.toEqualTypeOf<string>()
    expectTypeOf<IdGenerator>().parameter(0).toEqualTypeOf<string | undefined>()

    expectTypeOf(completion).toEqualTypeOf<UseCompletionReturn>()
    expectTypeOf(completion.id).toEqualTypeOf<Ref<string>>()
    expectTypeOf(completion.completion).toEqualTypeOf<Ref<string>>()
    expectTypeOf(completion.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(completion.clearError).toEqualTypeOf<() => void>()
    expectTypeOf(completion.clearTrace).toEqualTypeOf<() => void>()
    expectTypeOf(completion.lastRequest).toEqualTypeOf<Ref<CompletionRequestInfo | null>>()
    expectTypeOf(completion.lastResponse).toEqualTypeOf<Ref<CompletionResponseInfo | null>>()
    expectTypeOf(completion.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(completion.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(completion.handleSubmit).returns.toEqualTypeOf<Promise<string>>()
    expectTypeOf(completion.handleSubmit)
      .parameter(1)
      .toEqualTypeOf<Partial<CompletionRequest> | undefined>()
    expectTypeOf<UseCompletionOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf(completion.complete).returns.toEqualTypeOf<Promise<string>>()
    expectTypeOf(completion.complete)
      .parameter(1)
      .toEqualTypeOf<Partial<CompletionRequest> | undefined>()
    expectTypeOf<UseCompletionOptions['onFinish']>().toEqualTypeOf<
      ((completion: string, info: CompletionFinishInfo) => void) | undefined
    >()
    expectTypeOf<CompletionFinishInfo>().toEqualTypeOf<{
      prompt: string
      completion: string
      isAbort: boolean
    }>()
    expectTypeOf<CompletionRequestInfo>().toMatchTypeOf<{
      providerId: string
      attempt: number
      api?: string
      credentials?: RequestCredentials
      prompt: string
      request: CompletionRequest
    }>()
    expectTypeOf<CompletionResponseInfo>().toMatchTypeOf<
      CompletionRequestInfo & { hasStream: boolean }
    >()
    expectTypeOf<CompletionStreamProtocol>().toEqualTypeOf<'text' | 'data'>()
    expectTypeOf<UseCompletionOptions['onRequest']>().toEqualTypeOf<
      ((info: CompletionRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseCompletionOptions['onResponse']>().toEqualTypeOf<
      ((info: CompletionResponseInfo) => void) | undefined
    >()

    expectTypeOf(generation).toEqualTypeOf<
      UseGenerationReturn<string, { url: string }, { percent: number }, string>
    >()
    expectTypeOf(generation.id).toEqualTypeOf<Ref<string>>()
    expectTypeOf(generation.input).toEqualTypeOf<Ref<string | undefined>>()
    expectTypeOf(generation.result).toEqualTypeOf<Ref<{ url: string } | null>>()
    expectTypeOf(generation.progress).toEqualTypeOf<Ref<{ percent: number } | null>>()
    expectTypeOf(generation.chunks).toEqualTypeOf<Ref<string[]>>()
    expectTypeOf(generation.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(generation.clearTrace).toEqualTypeOf<() => void>()
    expectTypeOf(generation.lastRequest).toEqualTypeOf<Ref<GenerationRequestInfo<string> | null>>()
    expectTypeOf(generation.lastResponse).toEqualTypeOf<
      Ref<GenerationResponseInfo<string, { url: string }> | null>
    >()
    expectTypeOf(generation.generate).returns.toEqualTypeOf<Promise<{ url: string }>>()
    expectTypeOf(generation.generate).parameter(0).toEqualTypeOf<string | undefined>()
    expectTypeOf(generation.generate).parameter(1).toEqualTypeOf<GenerateOptions | undefined>()
    expectTypeOf(generation.setInput).toEqualTypeOf<(value: string | undefined) => void>()
    expectTypeOf(generation.setResult).toEqualTypeOf<(value: { url: string } | null) => void>()
    expectTypeOf(generation.clear).toEqualTypeOf<() => void>()
    expectTypeOf(generation.reset).toEqualTypeOf<() => void>()
    expectTypeOf<GenerationFetcher<string, { url: string }, { percent: number }, string>>()
      .parameter(0)
      .toEqualTypeOf<string>()
    expectTypeOf<GenerationFetcher<string, { url: string }, { percent: number }, string>>()
      .parameter(1)
      .toEqualTypeOf<GenerationRunContext<string, { percent: number }, string>>()
    expectTypeOf<GenerationRequestInfo<string>>().toMatchTypeOf<{
      id: string
      attempt: number
      input: string
    }>()
    expectTypeOf<GenerationResponseInfo<string, { url: string }>>().toMatchTypeOf<
      GenerationRequestInfo<string> & { result: { url: string } }
    >()
    expectTypeOf<UseGenerationOptions<string, { url: string }>['onRequest']>().toEqualTypeOf<
      ((info: GenerationRequestInfo<string>) => void) | undefined
    >()
    expectTypeOf<UseGenerationOptions<string, { url: string }>['onResponse']>().toEqualTypeOf<
      ((info: GenerationResponseInfo<string, { url: string }>) => void) | undefined
    >()

    expectTypeOf(imageGeneration).toEqualTypeOf<UseImageReturn>()
    expectTypeOf(imageGeneration.input).toEqualTypeOf<Ref<string>>()
    expectTypeOf(imageGeneration.image).toEqualTypeOf<Ref<GeneratedImage | null>>()
    expectTypeOf(imageGeneration.images).toEqualTypeOf<Ref<GeneratedImage[]>>()
    expectTypeOf(imageGeneration.result).toEqualTypeOf<Ref<ImageGenerationResult | null>>()
    expectTypeOf(imageGeneration.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(imageGeneration.generate).returns.toEqualTypeOf<Promise<ImageGenerationResult>>()
    expectTypeOf(imageGeneration.generate)
      .parameter(1)
      .toEqualTypeOf<Partial<ImageGenerationRequest> | undefined>()
    expectTypeOf(imageGeneration.generateImage).returns.toEqualTypeOf<
      Promise<ImageGenerationResult>
    >()
    expectTypeOf(imageGeneration.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(imageGeneration.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(imageGeneration.handleSubmit).returns.toEqualTypeOf<
      Promise<ImageGenerationResult>
    >()
    expectTypeOf(imageGeneration.handleSubmit)
      .parameter(1)
      .toEqualTypeOf<Partial<ImageGenerationRequest> | undefined>()
    expectTypeOf(imageGeneration.lastRequest).toEqualTypeOf<
      Ref<ImageGenerationRequestInfo | null>
    >()
    expectTypeOf(imageGeneration.lastResponse).toEqualTypeOf<
      Ref<ImageGenerationResponseInfo | null>
    >()
    expectTypeOf<ImageGenerationRequest>().toMatchTypeOf<{
      prompt: string
      body?: Record<string, unknown>
      model?: string
      n?: number
      size?: string
      aspectRatio?: string
      seed?: number
      providerOptions?: Record<string, unknown>
      headers?: HeadersInit
    }>()
    expectTypeOf<ImageGenerationResult>().toMatchTypeOf<{
      image?: GeneratedImage
      images: GeneratedImage[]
      model?: string
    }>()
    expectTypeOf<ImageGenerationRequestInfo>().toMatchTypeOf<{
      providerId: 'proxy'
      attempt: number
      api: string
      prompt: string
      request: ImageGenerationRequest
    }>()
    expectTypeOf<ImageGenerationResponseInfo>().toMatchTypeOf<
      ImageGenerationRequestInfo & { result: ImageGenerationResult }
    >()
    expectTypeOf<UseImageOptions['onRequest']>().toEqualTypeOf<
      ((info: ImageGenerationRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseImageOptions['onResponse']>().toEqualTypeOf<
      ((info: ImageGenerationResponseInfo) => void) | undefined
    >()

    expectTypeOf(speechGeneration).toEqualTypeOf<UseSpeechReturn>()
    expectTypeOf(speechGeneration.input).toEqualTypeOf<Ref<string>>()
    expectTypeOf(speechGeneration.audio).toEqualTypeOf<Ref<GeneratedAudio | null>>()
    expectTypeOf(speechGeneration.result).toEqualTypeOf<Ref<SpeechGenerationResult | null>>()
    expectTypeOf(speechGeneration.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(speechGeneration.generate).returns.toEqualTypeOf<Promise<SpeechGenerationResult>>()
    expectTypeOf(speechGeneration.generate)
      .parameter(1)
      .toEqualTypeOf<Partial<SpeechGenerationRequest> | undefined>()
    expectTypeOf(speechGeneration.generateSpeech).returns.toEqualTypeOf<
      Promise<SpeechGenerationResult>
    >()
    expectTypeOf(speechGeneration.speak).toEqualTypeOf<typeof speechGeneration.generateSpeech>()
    expectTypeOf(speechGeneration.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(speechGeneration.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(speechGeneration.handleSubmit).returns.toEqualTypeOf<
      Promise<SpeechGenerationResult>
    >()
    expectTypeOf(speechGeneration.handleSubmit)
      .parameter(1)
      .toEqualTypeOf<Partial<SpeechGenerationRequest> | undefined>()
    expectTypeOf(speechGeneration.lastRequest).toEqualTypeOf<
      Ref<SpeechGenerationRequestInfo | null>
    >()
    expectTypeOf(speechGeneration.lastResponse).toEqualTypeOf<
      Ref<SpeechGenerationResponseInfo | null>
    >()
    expectTypeOf<SpeechGenerationRequest>().toMatchTypeOf<{
      text: string
      body?: Record<string, unknown>
      model?: string
      voice?: string
      outputFormat?: string
      instructions?: string
      speed?: number
      language?: string
      providerOptions?: Record<string, unknown>
      headers?: HeadersInit
    }>()
    expectTypeOf<SpeechGenerationResult>().toMatchTypeOf<{
      audio?: GeneratedAudio
      model?: string
    }>()
    expectTypeOf<SpeechGenerationRequestInfo>().toMatchTypeOf<{
      providerId: 'proxy'
      attempt: number
      api: string
      text: string
      request: SpeechGenerationRequest
    }>()
    expectTypeOf<SpeechGenerationResponseInfo>().toMatchTypeOf<
      SpeechGenerationRequestInfo & { result: SpeechGenerationResult }
    >()
    expectTypeOf<UseSpeechOptions['onRequest']>().toEqualTypeOf<
      ((info: SpeechGenerationRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseSpeechOptions['onResponse']>().toEqualTypeOf<
      ((info: SpeechGenerationResponseInfo) => void) | undefined
    >()

    expectTypeOf(transcriptionGeneration).toEqualTypeOf<UseTranscriptionReturn>()
    expectTypeOf(transcriptionGeneration.input).toEqualTypeOf<Ref<string>>()
    expectTypeOf(transcriptionGeneration.transcription).toEqualTypeOf<Ref<string>>()
    expectTypeOf(transcriptionGeneration.text).toEqualTypeOf<Ref<string>>()
    expectTypeOf(transcriptionGeneration.result).toEqualTypeOf<Ref<TranscriptionResult | null>>()
    expectTypeOf(transcriptionGeneration.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(transcriptionGeneration.transcribe).returns.toEqualTypeOf<
      Promise<TranscriptionResult>
    >()
    expectTypeOf(transcriptionGeneration.transcribe)
      .parameter(1)
      .toEqualTypeOf<Partial<TranscriptionRequest> | undefined>()
    expectTypeOf(transcriptionGeneration.transcribeAudio).toEqualTypeOf<
      typeof transcriptionGeneration.transcribe
    >()
    expectTypeOf(transcriptionGeneration.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(transcriptionGeneration.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(transcriptionGeneration.handleSubmit).returns.toEqualTypeOf<
      Promise<TranscriptionResult>
    >()
    expectTypeOf(transcriptionGeneration.handleSubmit)
      .parameter(1)
      .toEqualTypeOf<Partial<TranscriptionRequest> | undefined>()
    expectTypeOf(transcriptionGeneration.lastRequest).toEqualTypeOf<
      Ref<TranscriptionRequestInfo | null>
    >()
    expectTypeOf(transcriptionGeneration.lastResponse).toEqualTypeOf<
      Ref<TranscriptionResponseInfo | null>
    >()
    expectTypeOf<TranscriptionSegment>().toMatchTypeOf<{
      text: string
      start?: number
      end?: number
    }>()
    expectTypeOf<TranscriptionRequest>().toMatchTypeOf<{
      audio: string
      body?: Record<string, unknown>
      model?: string
      language?: string
      prompt?: string
      temperature?: number
      timestampGranularities?: Array<'word' | 'segment'>
      providerOptions?: Record<string, unknown>
      headers?: HeadersInit
    }>()
    expectTypeOf<TranscriptionResult>().toMatchTypeOf<{
      text: string
      segments?: TranscriptionSegment[]
      model?: string
    }>()
    expectTypeOf<TranscriptionRequestInfo>().toMatchTypeOf<{
      providerId: 'proxy'
      attempt: number
      api: string
      audio: string
      request: TranscriptionRequest
    }>()
    expectTypeOf<TranscriptionResponseInfo>().toMatchTypeOf<
      TranscriptionRequestInfo & { result: TranscriptionResult }
    >()
    expectTypeOf<UseTranscriptionOptions['onRequest']>().toEqualTypeOf<
      ((info: TranscriptionRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseTranscriptionOptions['onResponse']>().toEqualTypeOf<
      ((info: TranscriptionResponseInfo) => void) | undefined
    >()

    expectTypeOf(reranking).toEqualTypeOf<UseRerankReturn<string>>()
    expectTypeOf(reranking.input).toEqualTypeOf<Ref<string>>()
    expectTypeOf(reranking.query).toEqualTypeOf<Ref<string>>()
    expectTypeOf(reranking.documents).toEqualTypeOf<Ref<string[]>>()
    expectTypeOf(reranking.originalDocuments).toEqualTypeOf<Ref<string[]>>()
    expectTypeOf(reranking.rerankedDocuments).toEqualTypeOf<Ref<string[]>>()
    expectTypeOf(reranking.ranking).toEqualTypeOf<Ref<RerankRankingItem<string>[]>>()
    expectTypeOf(reranking.result).toEqualTypeOf<Ref<RerankResult<string> | null>>()
    expectTypeOf(reranking.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(reranking.rerank).returns.toEqualTypeOf<Promise<RerankResult<string>>>()
    expectTypeOf(reranking.rerank).parameter(0).toEqualTypeOf<string | undefined>()
    expectTypeOf(reranking.rerank).parameter(1).toEqualTypeOf<string[] | undefined>()
    expectTypeOf(reranking.rerank)
      .parameter(2)
      .toEqualTypeOf<Partial<RerankRequest<string>> | undefined>()
    expectTypeOf(reranking.rerankDocuments).toEqualTypeOf<typeof reranking.rerank>()
    expectTypeOf(reranking.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(reranking.setQuery).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(reranking.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(reranking.setDocuments).toEqualTypeOf<(value: string[]) => void>()
    expectTypeOf(reranking.handleSubmit).returns.toEqualTypeOf<Promise<RerankResult<string>>>()
    expectTypeOf(reranking.handleSubmit)
      .parameter(1)
      .toEqualTypeOf<Partial<RerankRequest<string>> | undefined>()
    expectTypeOf(reranking.lastRequest).toEqualTypeOf<Ref<RerankRequestInfo<string> | null>>()
    expectTypeOf(reranking.lastResponse).toEqualTypeOf<Ref<RerankResponseInfo<string> | null>>()
    expectTypeOf<RerankDocument>().toEqualTypeOf<string | Record<string, unknown>>()
    expectTypeOf<RerankRankingItem<string>>().toMatchTypeOf<{
      index: number
      score: number
      document: string
    }>()
    expectTypeOf<RerankRequest<string>>().toMatchTypeOf<{
      query: string
      documents: string[]
      body?: Record<string, unknown>
      model?: string
      topN?: number
      providerOptions?: Record<string, unknown>
      headers?: HeadersInit
    }>()
    expectTypeOf<RerankResult<string>>().toMatchTypeOf<{
      originalDocuments: string[]
      rerankedDocuments: string[]
      ranking: RerankRankingItem<string>[]
      model?: string
    }>()
    expectTypeOf<RerankRequestInfo<string>>().toMatchTypeOf<{
      providerId: 'proxy'
      attempt: number
      api: string
      query: string
      documents: string[]
      request: RerankRequest<string>
    }>()
    expectTypeOf<RerankResponseInfo<string>>().toMatchTypeOf<
      RerankRequestInfo<string> & { result: RerankResult<string> }
    >()
    expectTypeOf<UseRerankOptions<string>['onRequest']>().toEqualTypeOf<
      ((info: RerankRequestInfo<string>) => void) | undefined
    >()
    expectTypeOf<UseRerankOptions<string>['onResponse']>().toEqualTypeOf<
      ((info: RerankResponseInfo<string>) => void) | undefined
    >()

    expectTypeOf(embedding).toEqualTypeOf<UseEmbeddingReturn>()
    expectTypeOf(defaultTransportEmbedding).toEqualTypeOf<UseEmbeddingReturn>()
    expectTypeOf(embeddingApi).toEqualTypeOf<UseEmbeddingReturn>()
    expectTypeOf(embedding.embeddings).toEqualTypeOf<Ref<number[][]>>()
    expectTypeOf(embedding.input).toEqualTypeOf<Ref<string>>()
    expectTypeOf(embedding.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(embedding.clearError).toEqualTypeOf<() => void>()
    expectTypeOf(embedding.clearTrace).toEqualTypeOf<() => void>()
    expectTypeOf(embedding.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(embedding.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(embedding.handleSubmit).returns.toEqualTypeOf<Promise<EmbeddingResult>>()
    expectTypeOf(embedding.handleSubmit)
      .parameter(1)
      .toEqualTypeOf<Partial<EmbeddingRequest> | undefined>()
    expectTypeOf(embedding.lastRequest).toEqualTypeOf<Ref<EmbeddingRequestInfo | null>>()
    expectTypeOf(embedding.lastResponse).toEqualTypeOf<Ref<EmbeddingResponseInfo | null>>()
    expectTypeOf(embedding.embed).returns.toEqualTypeOf<Promise<EmbeddingResult>>()
    expectTypeOf(embedding.embed).parameter(0).toEqualTypeOf<string | string[]>()
    expectTypeOf(embedding.embed)
      .parameter(1)
      .toEqualTypeOf<Partial<EmbeddingRequest> | undefined>()
    expectTypeOf<EmbeddingRequestInfo>().toMatchTypeOf<{
      providerId: string
      attempt: number
      input: string | string[]
      request: EmbeddingRequest
    }>()
    expectTypeOf<EmbeddingResponseInfo>().toMatchTypeOf<
      EmbeddingRequestInfo & { result: EmbeddingResult }
    >()
    expectTypeOf<UseEmbeddingOptions['onRequest']>().toEqualTypeOf<
      ((info: EmbeddingRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseEmbeddingOptions['onResponse']>().toEqualTypeOf<
      ((info: EmbeddingResponseInfo) => void) | undefined
    >()

    expectTypeOf(structured).toEqualTypeOf<UseObjectReturn<{ answer: string }>>()
    expectTypeOf(experimental_useObject).toEqualTypeOf<typeof useObject>()
    expectTypeOf(experimentalStructured).toEqualTypeOf<UseObjectReturn<{ answer: string }>>()
    expectTypeOf(defaultTransportObject).toEqualTypeOf<UseObjectReturn<{ answer: string }>>()
    expectTypeOf(objectApi).toEqualTypeOf<UseObjectReturn<{ answer: string }>>()
    expectTypeOf(structured.id).toEqualTypeOf<Ref<string>>()
    expectTypeOf(structured.object).toEqualTypeOf<Ref<{ answer: string } | null>>()
    expectTypeOf(structured.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(structured.clearError).toEqualTypeOf<() => void>()
    expectTypeOf(structured.clearTrace).toEqualTypeOf<() => void>()
    expectTypeOf(structured.lastRequest).toEqualTypeOf<Ref<ObjectRequestInfo | null>>()
    expectTypeOf(structured.lastResponse).toEqualTypeOf<Ref<ObjectResponseInfo | null>>()
    expectTypeOf(structured.partialObject).toEqualTypeOf<
      Ref<DeepPartial<{ answer: string }> | null>
    >()
    expectTypeOf(structured.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(structured.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(structured.handleSubmit).returns.toEqualTypeOf<Promise<{ answer: string }>>()
    expectTypeOf(structured.handleSubmit)
      .parameter(0)
      .toEqualTypeOf<{ preventDefault?: () => void } | undefined>()
    expectTypeOf(structured.handleSubmit)
      .parameter(1)
      .toEqualTypeOf<Partial<ChatRequest> | undefined>()
    expectTypeOf(structured.submit).returns.toEqualTypeOf<Promise<{ answer: string }>>()
    expectTypeOf(structured.submit).parameter(1).toEqualTypeOf<Partial<ChatRequest> | undefined>()
    expectTypeOf<ObjectRequestInfo>().toMatchTypeOf<{
      providerId: string
      attempt: number
      api?: string
      credentials?: RequestCredentials
      request: ChatRequest
      messages: Message[]
    }>()
    expectTypeOf<ObjectResponseInfo>().toMatchTypeOf<ObjectRequestInfo & { hasStream: boolean }>()
    expectTypeOf<ObjectFinishInfo<{ answer: string }>>().toEqualTypeOf<{
      object: { answer: string }
      text: string
      isAbort: boolean
      error: Error | undefined
    }>()
    expectTypeOf<UseObjectOptions['onRequest']>().toEqualTypeOf<
      ((info: ObjectRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseObjectOptions['onResponse']>().toEqualTypeOf<
      ((info: ObjectResponseInfo) => void) | undefined
    >()
    expectTypeOf<UseObjectOptions<{ answer: string }>['onFinish']>().toEqualTypeOf<
      ((object: { answer: string }, info: ObjectFinishInfo<{ answer: string }>) => void) | undefined
    >()

    expectTypeOf(assertInvalidPublicApiUsage).returns.toEqualTypeOf<void>()
  })

  it('exports request, message, tool, and persistence contracts', () => {
    const role: MessageRole = 'user'
    const attachment: ChatAttachmentInput = new File(['note'], 'note.txt', { type: 'text/plain' })
    const fileAttachment: ChatFileAttachment = {
      name: 'uploaded.png',
      type: 'image/png',
      url: 'https://example.test/uploaded.png'
    }
    const text: TextPart = { type: 'text', text: 'hello' }
    const image: ImageUrlPart = {
      type: 'image_url',
      image_url: { url: 'https://example.test/image.png', detail: 'auto' }
    }
    const messageTextPart: MessageTextPart = { type: 'text', text: 'hello' }
    const messageReasoningPart: MessageReasoningPart = { type: 'reasoning', text: 'thinking' }
    const messageSourcePart: MessageSourcePart = {
      type: 'source',
      id: 'source_1',
      sourceType: 'url',
      url: 'https://example.test/source'
    }
    const messageFilePart: MessageFilePart = {
      type: 'file',
      id: 'file_1',
      url: 'https://example.test/file.txt',
      mediaType: 'text/plain'
    }
    const messageDataPart: MessageDataPart = {
      type: 'data-progress',
      id: 'progress_1',
      data: { step: 1 }
    }
    const messageToolPart: MessageToolPart = {
      type: 'tool-lookup',
      toolCallId: 'call_1',
      toolName: 'lookup',
      state: 'input-available',
      input: { q: 'vue' }
    }
    const messageParts: MessagePart[] = [
      messageTextPart,
      messageReasoningPart,
      messageSourcePart,
      messageFilePart,
      messageDataPart,
      messageToolPart
    ]
    const content: MessageContent = [text, image]
    const wireTool: Tool = {
      type: 'function',
      function: {
        name: 'lookup',
        parameters: { type: 'object' },
        strict: true
      }
    }
    const schema = jsonSchema<{ q: string }>({
      type: 'object',
      required: ['q'],
      properties: { q: { type: 'string' } }
    })
    const lookupTool = tool<{ q: string }, { answer: string }>({
      description: 'Lookup docs',
      inputSchema: schema,
      execute(input) {
        expectTypeOf(input).toEqualTypeOf<{ q: string }>()
        return { answer: input.q }
      }
    })
    const runtimeTool = dynamicTool({
      parameters: { type: 'object' }
    })
    const toolSet: ToolSet = {
      lookup: lookupTool,
      runtime: runtimeTool,
      wire: wireTool
    }
    const chatTools: ChatToolsInput = toolSet
    const wireTools: ChatToolsInput = [wireTool]
    const schemaContract: JsonSchemaDefinition<{ q: string }> = schema
    const lookupToolContract: ToolDefinition<{ q: string }, { answer: string }> = lookupTool
    const runtimeToolContract: ToolDefinition<unknown, unknown> = runtimeTool
    const schemaInput: ToolInputSchema<{ q: string }> = schema
    const executeContract: ToolExecute<{ q: string }, { answer: string }> | undefined =
      lookupTool.execute
    const anyToolDefinition: AnyToolDefinition = lookupTool
    void [
      schemaContract,
      lookupToolContract,
      runtimeToolContract,
      schemaInput,
      executeContract,
      anyToolDefinition,
      chatTools,
      wireTools
    ]
    const toolCall: ToolCall = {
      id: 'call_1',
      type: 'function',
      function: { name: 'lookup', arguments: '{"q":"vue"}' }
    }
    const message: Message = {
      id: 'msg_1',
      role,
      content,
      parts: messageParts,
      toolCalls: [toolCall],
      metadata: { source: 'type-test' }
    }
    const request: ChatRequest = {
      id: 'chat_1',
      threadId: 'thread_1',
      messages: [message],
      forwardedProps: { locale: 'en-US' },
      body: { providerOption: true },
      headers: new Headers({ 'X-Trace': 'trace_1' }),
      metadata: { traceId: 'trace_1' },
      tools: [wireTool],
      toolChoice: { type: 'function', function: { name: 'lookup' } },
      responseFormat: {
        type: 'json_schema',
        json_schema: {
          name: 'lookup_result',
          schema: { type: 'object' },
          strict: true
        }
      }
    }
    const resumeRequest: ChatResumeRequest = {
      id: 'chat_1',
      threadId: 'thread_1',
      forwardedProps: { locale: 'en-US' },
      body: { resumeReason: 'manual' },
      metadata: { traceId: 'resume_1' },
      headers: [['X-Trace', 'resume_1']] as [string, string][]
    }
    const responseFormat: ResponseFormat = { type: 'json_object' }
    const appendOptions: AppendChatOptions = {
      messageId: 'msg_1',
      temperature: 0.2,
      attachments: [attachment, fileAttachment],
      messageMetadata: { source: 'public-api-test' }
    }
    const sendMessageInput: SendChatMessageInput<{ source: string }> = {
      text: 'hello',
      files: [fileAttachment],
      metadata: { source: 'composer' },
      messageId: 'msg_1'
    }
    const status: ChatStatus = 'ready'
    const regenerateOptions: RegenerateChatOptions = { messageId: 'msg_1', temperature: 0.2 }
    const resumeOptions: ResumeChatOptions = { metadata: { reason: 'reload' } }
    const sendTrigger: SendChatTrigger = 'submit-message'
    const prepareSendOptions: PrepareSendMessagesRequestOptions = {
      id: 'chat_1',
      messages: [message],
      requestMetadata: { traceId: 'trace_1' },
      body: { tenantId: 'tenant_1' },
      headers: { 'X-Trace': 'trace_1' },
      request,
      trigger: sendTrigger,
      messageId: 'msg_1'
    }
    const prepareStepOptions: PrepareStepOptions = {
      ...prepareSendOptions,
      stepNumber: 1,
      toolCalls: [toolCall]
    }
    const prepareReconnectOptions: PrepareReconnectToStreamRequestOptions = {
      id: 'chat_1',
      requestMetadata: { traceId: 'resume_1' },
      body: { resumeReason: 'manual' },
      headers: { 'X-Trace': 'resume_1' },
      request: resumeRequest
    }
    const prepareSend: PrepareSendMessagesRequest = (options) => {
      expectTypeOf(options).toEqualTypeOf<PrepareSendMessagesRequestOptions>()
      return { body: options.body }
    }
    const prepareStep: PrepareStep = (options) => {
      expectTypeOf(options).toEqualTypeOf<PrepareStepOptions>()
      return { body: { ...options.body, stepNumber: options.stepNumber } }
    }
    const prepareReconnect: PrepareReconnectToStreamRequest = (options) => {
      expectTypeOf(options).toEqualTypeOf<PrepareReconnectToStreamRequestOptions>()
      return { body: options.body }
    }
    const usage: TokenUsage = { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
    const dataPart: StreamDataPart = {
      id: 'source-1',
      type: 'source',
      data: { title: 'docs' }
    }
    const chunk: ChatChunk = {
      messageId: 'msg_server_1',
      content: 'ok',
      finishReason: 'stop',
      usage,
      metadata: { model: 'test-model' },
      dataId: 'source-1',
      dataType: 'source',
      data: dataPart.data,
      parts: messageParts
    }
    const finishInfo: ChatFinishInfo = {
      message,
      messages: [message],
      isAbort: false,
      isError: false,
      isDisconnect: false,
      finishReason: 'stop'
    }
    const handler: ToolCallHandler = async (args, context) => {
      expectTypeOf(args).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<ToolCallHandlerContext>()
      expectTypeOf(context.context).toEqualTypeOf<unknown>()
      return { ok: true }
    }
    const requiresToolApproval: ToolApprovalPredicate = (args, context) => {
      expectTypeOf(args).toEqualTypeOf<unknown>()
      expectTypeOf(context.toolCall).toEqualTypeOf<ToolCall>()
      return context.toolCall.function.name === 'lookup'
    }
    const sendAutomaticallyWhen: SendAutomaticallyWhen = (sendOptions) => {
      expectTypeOf(sendOptions).toEqualTypeOf<SendAutomaticallyWhenOptions>()
      return lastAssistantMessageIsCompleteWithToolCalls(sendOptions)
    }
    const stopWhen: StopWhen = (stopOptions) => {
      expectTypeOf(stopOptions).toEqualTypeOf<StopWhenOptions>()
      return hasToolCall('lookup')(stopOptions) || isStepCount(2)(stopOptions)
    }
    const options: UseChatOptions = {
      provider,
      requiresToolApproval,
      sendAutomaticallyWhen,
      stopWhen
    }
    const resultContext: ToolResultHandlerContext = {
      args: { q: 'vue' },
      context: { userId: 'user_1' },
      toolCall,
      messages: [message],
      resultMessage: {
        id: 'tool_1',
        role: 'tool',
        content: '{"ok":true}',
        toolCallId: 'call_1'
      }
    }
    const source = ref<Message[]>([])
    const persistOptions: UsePersistOptions<Message[]> = { key: 'public-api-test' }
    const persisted = usePersist(source, persistOptions)
    const serializedMessages = serializeMessages([message])
    const restoredMessages = deserializeMessages(serializedMessages)
    const chatPersistOptions: ChatPersistOptions = {
      key: 'public-chat-test',
      storage: null,
      serialize: serializeMessages,
      deserialize: deserializeMessages
    }

    expectTypeOf<ContentPart>().toEqualTypeOf<TextPart | ImageUrlPart>()
    expectTypeOf<MessagePart>().toEqualTypeOf<
      | MessageTextPart
      | MessageReasoningPart
      | MessageSourcePart
      | MessageFilePart
      | MessageDataPart
      | MessageToolPart
    >()
    expectTypeOf<ChatFileAttachment>().toEqualTypeOf<{
      name?: string
      type: string
      url?: string
      text?: string
    }>()
    expectTypeOf<ChatAttachmentInput>().toEqualTypeOf<File | ChatFileAttachment>()
    expectTypeOf<ChatAttachmentsInput>().toEqualTypeOf<FileList | readonly ChatAttachmentInput[]>()
    expectTypeOf(request.messages).toEqualTypeOf<Message[]>()
    expectTypeOf(request.messages[0].parts).toEqualTypeOf<MessagePart[] | undefined>()
    expectTypeOf(request.threadId).toEqualTypeOf<string | undefined>()
    expectTypeOf(request.forwardedProps).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(request.body).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(request.headers).toEqualTypeOf<HeadersInit | undefined>()
    expectTypeOf(request.metadata).toEqualTypeOf<unknown>()
    expectTypeOf(resumeRequest.threadId).toEqualTypeOf<string | undefined>()
    expectTypeOf(resumeRequest.forwardedProps).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(resumeRequest.body).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(resumeRequest.headers).toEqualTypeOf<HeadersInit | undefined>()
    expectTypeOf(prepareSendOptions.trigger).toEqualTypeOf<SendChatTrigger>()
    expectTypeOf(prepareStepOptions.stepNumber).toEqualTypeOf<number>()
    expectTypeOf(prepareStepOptions.toolCalls).toEqualTypeOf<ToolCall[]>()
    expectTypeOf(prepareReconnectOptions.request).toEqualTypeOf<ChatResumeRequest>()
    expectTypeOf(prepareSend).returns.toEqualTypeOf<
      void | Partial<ChatRequest> | Promise<void | Partial<ChatRequest>>
    >()
    expectTypeOf(prepareStep).returns.toEqualTypeOf<
      void | Partial<ChatRequest> | Promise<void | Partial<ChatRequest>>
    >()
    expectTypeOf(prepareReconnect).returns.toEqualTypeOf<
      void | Partial<ChatResumeRequest> | Promise<void | Partial<ChatResumeRequest>>
    >()
    expectTypeOf<CompletionRequest['body']>().toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf<CompletionRequest['headers']>().toEqualTypeOf<HeadersInit | undefined>()
    expectTypeOf<CompletionRequest['streamProtocol']>().toEqualTypeOf<
      CompletionStreamProtocol | undefined
    >()
    expectTypeOf<EmbeddingRequest['body']>().toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf<EmbeddingRequest['headers']>().toEqualTypeOf<HeadersInit | undefined>()
    expectTypeOf(appendOptions).toEqualTypeOf<AppendChatOptions>()
    expectTypeOf(appendOptions.attachments).toEqualTypeOf<ChatAttachmentsInput | undefined>()
    expectTypeOf(appendOptions.messageMetadata).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(sendMessageInput).toEqualTypeOf<SendChatMessageInput<{ source: string }>>()
    expectTypeOf(sendMessageInput.files).toEqualTypeOf<ChatAttachmentsInput | undefined>()
    expectTypeOf(sendMessageInput.metadata).toEqualTypeOf<{ source: string } | undefined>()
    expectTypeOf(resumeRequest).toEqualTypeOf<ChatResumeRequest>()
    expectTypeOf(resumeOptions).toEqualTypeOf<ResumeChatOptions>()
    expectTypeOf(responseFormat).toMatchTypeOf<ResponseFormat>()
    expectTypeOf<ChatStatus>().toEqualTypeOf<'ready' | 'submitted' | 'streaming' | 'error'>()
    expectTypeOf(status).toMatchTypeOf<ChatStatus>()
    expectTypeOf(regenerateOptions).toEqualTypeOf<RegenerateChatOptions>()
    expectTypeOf(dataPart).toEqualTypeOf<StreamDataPart>()
    expectTypeOf(chunk).toEqualTypeOf<ChatChunk>()
    expectTypeOf(finishInfo).toEqualTypeOf<ChatFinishInfo>()
    expectTypeOf<UseChatOptions['onFinish']>().toEqualTypeOf<
      ((m: Message, info: ChatFinishInfo) => void) | undefined
    >()
    expectTypeOf<ChatFinishInfo>().toMatchTypeOf<{
      message: Message
      messages: Message[]
      isAbort: boolean
      isError: boolean
      isDisconnect: boolean
      finishReason?: ChatChunk['finishReason']
    }>()
    expectTypeOf(handler).toEqualTypeOf<ToolCallHandler>()
    expectTypeOf(options.requiresToolApproval).toEqualTypeOf<ToolApprovalPredicate | undefined>()
    expectTypeOf(options.sendAutomaticallyWhen).toEqualTypeOf<
      SendAutomaticallyWhen | false | undefined
    >()
    expectTypeOf(options.stopWhen).toEqualTypeOf<StopWhen | readonly StopWhen[] | undefined>()
    expectTypeOf(prepareStep).toEqualTypeOf<PrepareStep>()
    expectTypeOf(sendAutomaticallyWhen).toEqualTypeOf<SendAutomaticallyWhen>()
    expectTypeOf(stopWhen).toEqualTypeOf<StopWhen>()
    expectTypeOf(isStepCount).parameter(0).toEqualTypeOf<number>()
    expectTypeOf(isStepCount).returns.toEqualTypeOf<StopWhen>()
    expectTypeOf(hasToolCall).toEqualTypeOf<(...toolNames: string[]) => StopWhen>()
    expectTypeOf(hasToolCall).returns.toEqualTypeOf<StopWhen>()
    expectTypeOf(lastAssistantMessageIsCompleteWithToolCalls).toMatchTypeOf<SendAutomaticallyWhen>()
    expectTypeOf(resultContext).toEqualTypeOf<ToolResultHandlerContext>()
    expectTypeOf(persisted.clear).toEqualTypeOf<() => void>()
    expectTypeOf(serializedMessages).toEqualTypeOf<SerializedMessage[]>()
    expectTypeOf(restoredMessages).toEqualTypeOf<Message[] | null>()
    expectTypeOf(chatPersistOptions).toEqualTypeOf<ChatPersistOptions>()
    expectTypeOf<UseChatOptions['persist']>().toEqualTypeOf<ChatPersistOptions | undefined>()
    expect(new AiHooksError('typed')).toBeInstanceOf(Error)
  })
})
