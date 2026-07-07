import { ref, type ComputedRef, type Ref } from 'vue'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  AiHooksError,
  agentEventToChatChunk,
  agentEventToUIMessageStreamPart,
  anthropic,
  Chat,
  classifyInspectionError,
  convertToModelMessages,
  cosineSimilarity,
  createPromptSuggestionRecipes,
  defineToolHandlers,
  createAgentContextMessage,
  createIdGenerator,
  createInspectionCurl,
  createUIMessageStream,
  createUIMessageStreamParser,
  createUIMessageStreamResponse,
  deepseek,
  DefaultChatTransport,
  deserializeMessages,
  DirectChatTransport,
  dynamicTool,
  extractAgentCapabilities,
  fallbackProvider,
  formatSSEData,
  gemini,
  generateId,
  getToolRenderParts,
  hasToolCall,
  experimental_useObject,
  inspectRequestTrace,
  isStepCount,
  jsonSchema,
  lastAssistantMessageIsCompleteWithToolCalls,
  moonshot,
  ollama,
  openai,
  openaiCompatible,
  openrouter,
  parseSSE,
  pipeUIMessageStreamToResponse,
  pruneMessages,
  proxyProvider,
  readAgentEvents,
  readAgentEventStream,
  readUIMessageStream,
  safeValidateMessages,
  safeValidateUIMessages,
  serializeMessages,
  stepCountIs,
  tool,
  toChatChunks,
  validateMessages,
  validateUIMessages,
  vllm,
  formatAgentContexts,
  resolveAgentContexts,
  summarizeAgentCapabilities,
  useAgentCapabilities,
  useAgentContext,
  useAgentContextRegistry,
  useAgentRun,
  useChat,
  useChatThreads,
  usePromptSuggestions,
  useCompletion,
  useEmbedding,
  useGeneration,
  useImage,
  useObject,
  useRerank,
  useSpeech,
  useVideo,
  useTranscription,
  usePersist,
  withAgentContextMessage,
  promptSuggestionRecipeIds,
  serializeChatThreads,
  serializeChatThreadsState,
  deserializeChatThreads,
  deserializeChatThreadsState,
  zhipu
} from 'vue-ai-hooks'
import {
  createPromptSuggestionRecipes as createReactPromptSuggestionRecipes,
  useChat as useReactChat,
  useCompletion as useReactCompletion,
  useEmbedding as useReactEmbedding,
  useImage as useReactImage,
  useObject as useReactObject,
  usePromptSuggestions as useReactPromptSuggestions,
  useAgentRun as useReactAgentRun,
  useSpeech as useReactSpeech,
  useVideo as useReactVideo
} from 'vue-ai-hooks/react'
import type {
  AgentEvent,
  AgentEventAdapterOptions,
  AgentEventSource,
  AgentCapabilities,
  AgentCapabilitiesRequestInfo,
  AgentCapabilitiesResponseInfo,
  AgentCapabilitiesSupportSummary,
  AgentCapabilityTool,
  AgentExecutionCapabilities,
  AgentHumanInTheLoopCapabilities,
  AgentIdentityCapabilities,
  AgentInfoAgent,
  AgentInfoResponse,
  AgentMultiAgentCapabilities,
  AgentMultimodalCapabilities,
  AgentMultimodalInputCapabilities,
  AgentMultimodalOutputCapabilities,
  AgentOutputCapabilities,
  AgentReasoningCapabilities,
  AgentStateCapabilities,
  AgentToolsCapabilities,
  AgentTransportCapabilities,
  AgentInterruptEvent,
  AgentRunFinishInfo,
  AgentRunHandler,
  AgentRunInspectionSnapshot,
  AgentRunRequest,
  AgentRunRequestInfo,
  AgentRunResponseInfo,
  AgentRunStatus,
  AgentContextInput,
  AgentContextMessageOptions,
  AgentContextRegistry,
  AgentContextSerializable,
  AgentContextSnapshot,
  AgentContextSource,
  AiRequestStatus,
  AiSdkSendChatTrigger,
  AddToolOutputOptions,
  AddToolResultOptions,
  AppendChatOptions,
  AiSdkChatFinishCallback,
  AnthropicConfig,
  ChatFinishCallback,
  ChatFinishInfo,
  ChatOptions,
  ChatChunk,
  ChatAttachmentInput,
  ChatAttachmentsInput,
  ChatFileAttachment,
  ChatProvider,
  ChatPersistOptions,
  ChatRequest,
  ChatRequestMessage,
  ChatRequestInfo,
  ChatRequestLifecycleKind,
  ChatResumeRequest,
  ChatResponseInfo,
  ChatStreamProtocol,
  ChatThread,
  ChatThreadsPersistenceErrorInfo,
  ChatThreadsPersistenceErrorPhase,
  ChatThreadsPersistOptions,
  ChatThreadsState,
  CompletionFinishInfo,
  CompletionRequest,
  CompletionRequestInfo,
  CompletionResponseInfo,
  CompletionStreamProtocol,
  ContentPart,
  ConvertToModelMessagesOptions,
  CreateIdGeneratorOptions,
  CreateChatThreadInput,
  DataPartSchema,
  DataPartSchemas,
  DataPartValidator,
  DeepPartial,
  DeepSeekConfig,
  DirectChatStreamProtocol,
  DirectChatTransportOptions,
  DefaultChatTransportOptions,
  DefaultChatTransportPrepareReconnectToStreamRequest,
  DefaultChatTransportPrepareSendMessagesRequest,
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
  GetToolRenderPartsOptions,
  IdGenerator,
  GeneratedAudio,
  GeneratedImage,
  ImageEditInput,
  ImageEditOptions,
  GeneratedVideo,
  ImageGenerationRequest,
  ImageGenerationRequestInfo,
  ImageGenerationResponseInfo,
  ImageGenerationResult,
  ImageOperation,
  ImageUrlPart,
  InferToolInput,
  InferToolOutput,
  InferUITools,
  InspectionCurlOptions,
  InspectionErrorCategory,
  InspectionErrorSummary,
  InspectionProviderTrace,
  InspectionRetryRecord,
  InspectionRetryRecordInput,
  InspectionStatus,
  InspectionTimelineEvent,
  InspectionTimelineEventInput,
  InspectionTimelineEventKind,
  InspectRequestTraceOptions,
  Message,
  MessageContent,
  MessageDataPart,
  MessageFilePart,
  MessageMetadataSchema,
  MessageMetadataValidator,
  ModelMessage,
  MessagePart,
  MessageReasoningPart,
  MessageRole,
  MessageSourcePart,
  MessageTextPart,
  MessageToolPart,
  UIDataTypes,
  UIMessage,
  UIMessageDataPart,
  UIMessagePart,
  UIMessageToolPart,
  UITools,
  MoonshotConfig,
  OllamaConfig,
  OpenAiLikeConfig,
  OpenRouterConfig,
  AiSdkObjectFinishCallback,
  LegacyObjectFinishCallback,
  ObjectFinishCallback,
  ObjectFinishCallbackOptions,
  ObjectFinishInfo,
  ObjectRequestInfo,
  ObjectResponseInfo,
  PrepareReconnectToStreamRequest,
  PrepareReconnectToStreamRequestOptions,
  PrepareSendMessagesRequest,
  PrepareSendMessagesRequestOptions,
  PrepareStep,
  PrepareStepOptions,
  PromptSuggestion,
  CreatePromptSuggestionRecipesOptions,
  PromptSuggestionFilter,
  PromptSuggestionFilterContext,
  PromptSuggestionInput,
  PromptSuggestionLoader,
  PromptSuggestionLoaderContext,
  PromptSuggestionRecipe,
  PromptSuggestionRecipeCategory,
  PromptSuggestionRecipeId,
  PromptSuggestionRecipeLocale,
  PromptSuggestionRecipeMetadata,
  PromptSuggestionRecipeSurface,
  PruneMessagesOptions,
  PruneReasoningStrategy,
  PruneToolCallsOption,
  PruneToolCallsRule,
  PruneToolCallsStrategy,
  ProxyRequestContext,
  ProxyRequestKind,
  ProxyRequestOverride,
  ProxyProviderConfig,
  CreateUIMessageStreamOptions,
  CreateUIMessageStreamResponseOptions,
  PipeUIMessageStreamToResponseOptions,
  ReadAgentEventStreamOptions,
  LoadAgentCapabilitiesOptions,
  ResumeAgentRunOptions,
  RegenerateChatOptions,
  ReadUIMessageStreamOptions,
  RerankDocument,
  RerankRankingItem,
  RerankRequest,
  RerankRequestInfo,
  RerankResponseInfo,
  RerankResult,
  RequestInspectionSnapshot,
  RetryContext,
  RetryOptions,
  ResumeChatOptions,
  ResponseFormat,
  SendAutomaticallyWhen,
  SendAutomaticallyWhenOptions,
  SendChatMessageInput,
  SetDataInput,
  SetMessagesInput,
  SafeValidateMessagesResult,
  SafeValidateUIMessagesResult,
  SendChatTrigger,
  SerializedMessage,
  SerializedChatThread,
  SerializedChatThreadsState,
  SpeechGenerationRequest,
  SpeechGenerationRequestInfo,
  SpeechGenerationResponseInfo,
  SpeechGenerationResult,
  VideoFrameImage,
  VideoGenerationRequest,
  VideoGenerationRequestInfo,
  VideoGenerationResponseInfo,
  VideoGenerationResult,
  VllmConfig,
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
  ToolHandlerFor,
  ToolHandlersFor,
  ToolInputSchema,
  ToolModelOutput,
  ToolModelOutputContext,
  ToolRenderPart,
  ToolRenderStatus,
  ToolSet,
  ToolApprovalResponse,
  ToolApprovalPredicate,
  ToolCall,
  LegacyChatFinishCallback,
  AiSdkToolCallCallback,
  LegacyToolCallCallback,
  ToolCallCallback,
  ToolCallCallbackOptions,
  ToolCallHandler,
  ToolCallHandlerContext,
  ToolResultHandlerContext,
  UIToolCall,
  ZhipuConfig,
  ZhipuEndpoint,
  ServerResponseLike,
  UIMessageStreamPart,
  UIMessageStreamParser,
  UIMessageStreamSource,
  UIMessageStreamWriter,
  UseChatOptions,
  UseChatThreadsOptions,
  UseChatThreadsReturn,
  UseChatReturn,
  UseAgentCapabilitiesOptions,
  UseAgentCapabilitiesReturn,
  StartAgentRunOptions,
  UseAgentRunOptions,
  UseAgentRunReturn,
  UsePromptSuggestionsOptions,
  UsePromptSuggestionsReturn,
  ValidateMessagesOptions,
  ValidateUIMessagesOptions,
  UpdateChatThreadInput,
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
  UseVideoOptions,
  UseVideoReturn,
  UseTranscriptionOptions,
  UseTranscriptionReturn,
  UsePersistOptions
} from 'vue-ai-hooks'
import type {
  ReactAiSdkChatFinishCallback,
  ReactLegacyChatFinishCallback,
  ReactLegacyObjectFinishCallback,
  UseReactChatOptions,
  UseReactChatReturn,
  UseReactCompletionOptions,
  UseReactCompletionReturn,
  ReactChatFinishCallback,
  ReactAiSdkCompletionFinishCallback,
  ReactLegacyCompletionFinishCallback,
  ReactCompletionFinishInfo,
  ReactCompletionRequestInfo,
  ReactCompletionResponseInfo,
  ReactEmbeddingRequestInfo,
  ReactEmbeddingResponseInfo,
  ReactAgentRunFinishInfo,
  ReactAgentRunInspectionSnapshot,
  ReactAgentRunRequest,
  ReactAgentRunRequestInfo,
  ReactAgentRunResponseInfo,
  ReactAgentRunStatus,
  ReactImageGenerationRequestInfo,
  ReactImageGenerationResponseInfo,
  ReactObjectFinishCallback,
  UseReactObjectOptions,
  UseReactObjectReturn,
  ReactObjectDeepPartial,
  ReactObjectFinishInfo,
  ReactObjectRequestInfo,
  ReactObjectResponseInfo,
  ReactImageEditOptions,
  UseReactEmbeddingOptions,
  UseReactEmbeddingReturn,
  UseReactImageOptions,
  UseReactImageReturn,
  UseReactAgentRunOptions,
  UseReactAgentRunReturn,
  UseReactPromptSuggestionsOptions,
  UseReactPromptSuggestionsReturn,
  ReactVideoGenerationRequestInfo,
  ReactVideoGenerationResponseInfo,
  ReactSpeechGenerationRequestInfo,
  ReactSpeechGenerationResponseInfo,
  UseReactVideoOptions,
  UseReactVideoReturn,
  UseReactSpeechOptions,
  UseReactSpeechReturn
} from 'vue-ai-hooks/react'

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
  it('exports the React subpath without changing the Vue root entry', () => {
    const reactOptions: UseReactChatOptions = { provider }
    const reactCompletionOptions: UseReactCompletionOptions = { provider }
    const reactEmbeddingOptions: UseReactEmbeddingOptions = { provider }
    const answerSchema = jsonSchema<{ answer: string }>({
      type: 'object',
      properties: { answer: { type: 'string' } }
    })
    const reactObjectOptions: UseReactObjectOptions<{ answer: string }> = {
      provider,
      schema: answerSchema
    }
    const reactImageOptions: UseReactImageOptions = {
      api: '/api/react-image'
    }
    const reactVideoOptions: UseReactVideoOptions = {
      api: '/api/react-video'
    }
    const reactSpeechOptions: UseReactSpeechOptions = {
      api: '/api/react-speech'
    }
    const reactPromptSuggestionOptions: UseReactPromptSuggestionsOptions = {
      suggestions: ['Summarize this thread'],
      input: 'ask',
      max: 3,
      filter(suggestion, context) {
        return suggestion.prompt.includes(context.input)
      }
    }
    const reactAgentEvent: AgentEvent = { type: 'finish', finishReason: 'stop' }
    const reactAgentRunOptions: UseReactAgentRunOptions<string, { approved: boolean }> = {
      run(request) {
        expectTypeOf(request).toEqualTypeOf<ReactAgentRunRequest<string, { approved: boolean }>>()
        return [reactAgentEvent]
      },
      onFinish(info) {
        expectTypeOf(info).toEqualTypeOf<ReactAgentRunFinishInfo>()
      }
    }

    expect(typeof useReactChat).toBe('function')
    expect(typeof useReactCompletion).toBe('function')
    expect(typeof useReactEmbedding).toBe('function')
    expect(typeof useReactObject).toBe('function')
    expect(typeof useReactImage).toBe('function')
    expect(typeof useReactPromptSuggestions).toBe('function')
    expect(typeof useReactAgentRun).toBe('function')
    expect(typeof useReactVideo).toBe('function')
    expect(typeof useReactSpeech).toBe('function')
    expect(typeof createReactPromptSuggestionRecipes).toBe('function')
    expectTypeOf(reactOptions).toMatchTypeOf<UseReactChatOptions>()
    expectTypeOf<
      NonNullable<UseReactChatOptions['onFinish']>
    >().toEqualTypeOf<ReactChatFinishCallback>()
    expectTypeOf<ReactChatFinishCallback>().toMatchTypeOf<
      ReactAiSdkChatFinishCallback | ReactLegacyChatFinishCallback
    >()
    expectTypeOf<
      NonNullable<UseReactChatOptions['onFinishLegacy']>
    >().toEqualTypeOf<ReactLegacyChatFinishCallback>()
    expectTypeOf<UseReactChatReturn>().toMatchTypeOf<{
      messages: Message[]
      input: string
      append: (content: string | Message) => Promise<void>
    }>()
    expectTypeOf(reactCompletionOptions).toMatchTypeOf<UseReactCompletionOptions>()
    expectTypeOf<
      NonNullable<UseReactCompletionOptions['onFinish']>
    >().toEqualTypeOf<ReactAiSdkCompletionFinishCallback>()
    expectTypeOf<
      NonNullable<UseReactCompletionOptions['onFinishLegacy']>
    >().toEqualTypeOf<ReactLegacyCompletionFinishCallback>()
    expectTypeOf<ReactCompletionFinishInfo>().toMatchTypeOf<CompletionFinishInfo>()
    expectTypeOf<ReturnType<typeof useReactCompletion>>().toEqualTypeOf<UseReactCompletionReturn>()
    expectTypeOf<UseReactCompletionReturn>().toMatchTypeOf<{
      completion: string
      input: string
      complete: (prompt?: string, options?: Partial<CompletionRequest>) => Promise<string>
    }>()
    expectTypeOf<
      UseReactCompletionReturn['lastRequest']
    >().toEqualTypeOf<ReactCompletionRequestInfo | null>()
    expectTypeOf<
      UseReactCompletionReturn['lastResponse']
    >().toEqualTypeOf<ReactCompletionResponseInfo | null>()
    expectTypeOf(reactEmbeddingOptions).toMatchTypeOf<UseReactEmbeddingOptions>()
    expectTypeOf<ReturnType<typeof useReactEmbedding>>().toEqualTypeOf<UseReactEmbeddingReturn>()
    expectTypeOf<UseReactEmbeddingReturn>().toMatchTypeOf<{
      embeddings: number[][]
      input: string
      embed: (
        input: string | string[],
        options?: Partial<EmbeddingRequest>
      ) => Promise<EmbeddingResult>
    }>()
    expectTypeOf<
      UseReactEmbeddingReturn['lastRequest']
    >().toEqualTypeOf<ReactEmbeddingRequestInfo | null>()
    expectTypeOf<
      UseReactEmbeddingReturn['lastResponse']
    >().toEqualTypeOf<ReactEmbeddingResponseInfo | null>()
    expectTypeOf<ReactObjectFinishInfo<{ answer: string }>>().toMatchTypeOf<{
      object: { answer: string }
      text: string
      isAbort: boolean
      error: Error | undefined
    }>()
    expectTypeOf<
      NonNullable<UseReactObjectOptions<{ answer: string }>['onFinish']>
    >().toEqualTypeOf<ReactObjectFinishCallback<{ answer: string }>>()
    expectTypeOf<
      NonNullable<UseReactObjectOptions<{ answer: string }>['onFinishLegacy']>
    >().toEqualTypeOf<ReactLegacyObjectFinishCallback<{ answer: string }>>()
    expectTypeOf(reactObjectOptions).toMatchTypeOf<UseReactObjectOptions<{ answer: string }>>()
    expectTypeOf<ReturnType<typeof useReactObject<{ answer: string }>>>().toEqualTypeOf<
      UseReactObjectReturn<{ answer: string }>
    >()
    expectTypeOf<UseReactObjectReturn<{ answer: string }>>().toMatchTypeOf<{
      object: { answer: string } | null
      partialObject: ReactObjectDeepPartial<{ answer: string }> | null
      submit: (
        prompt?: string | Message,
        options?: Partial<ChatRequest>
      ) => Promise<{
        answer: string
      }>
    }>()
    expectTypeOf<
      UseReactObjectReturn<{ answer: string }>['lastRequest']
    >().toEqualTypeOf<ReactObjectRequestInfo | null>()
    expectTypeOf<
      UseReactObjectReturn<{ answer: string }>['lastResponse']
    >().toEqualTypeOf<ReactObjectResponseInfo | null>()
    expectTypeOf(reactImageOptions).toMatchTypeOf<UseReactImageOptions>()
    expectTypeOf<UseReactImageReturn>().toMatchTypeOf<{
      image: GeneratedImage | null
      images: GeneratedImage[]
      generate: (
        prompt?: string,
        options?: Partial<ImageGenerationRequest>
      ) => Promise<ImageGenerationResult>
      generateImage: (
        prompt?: string,
        options?: Partial<ImageGenerationRequest>
      ) => Promise<ImageGenerationResult>
      editImage: (
        prompt: string | undefined,
        options: ReactImageEditOptions
      ) => Promise<ImageGenerationResult>
    }>()
    expectTypeOf<
      UseReactImageReturn['lastRequest']
    >().toEqualTypeOf<ReactImageGenerationRequestInfo | null>()
    expectTypeOf<
      UseReactImageReturn['lastResponse']
    >().toEqualTypeOf<ReactImageGenerationResponseInfo | null>()
    expectTypeOf(reactVideoOptions).toMatchTypeOf<UseReactVideoOptions>()
    expectTypeOf<ReturnType<typeof useReactVideo>>().toEqualTypeOf<UseReactVideoReturn>()
    expectTypeOf<UseReactVideoReturn>().toMatchTypeOf<{
      video: GeneratedVideo | null
      videos: GeneratedVideo[]
      generate: (
        prompt?: string,
        options?: Partial<VideoGenerationRequest>
      ) => Promise<VideoGenerationResult>
      generateVideo: (
        prompt?: string,
        options?: Partial<VideoGenerationRequest>
      ) => Promise<VideoGenerationResult>
    }>()
    expectTypeOf<
      UseReactVideoReturn['lastRequest']
    >().toEqualTypeOf<ReactVideoGenerationRequestInfo | null>()
    expectTypeOf<
      UseReactVideoReturn['lastResponse']
    >().toEqualTypeOf<ReactVideoGenerationResponseInfo | null>()
    expectTypeOf(reactSpeechOptions).toMatchTypeOf<UseReactSpeechOptions>()
    expectTypeOf<ReturnType<typeof useReactSpeech>>().toEqualTypeOf<UseReactSpeechReturn>()
    expectTypeOf<UseReactSpeechReturn>().toMatchTypeOf<{
      audio: GeneratedAudio | null
      generate: (
        text?: string,
        options?: Partial<SpeechGenerationRequest>
      ) => Promise<SpeechGenerationResult>
      generateSpeech: (
        text?: string,
        options?: Partial<SpeechGenerationRequest>
      ) => Promise<SpeechGenerationResult>
      speak: (
        text?: string,
        options?: Partial<SpeechGenerationRequest>
      ) => Promise<SpeechGenerationResult>
    }>()
    expectTypeOf<
      UseReactSpeechReturn['lastRequest']
    >().toEqualTypeOf<ReactSpeechGenerationRequestInfo | null>()
    expectTypeOf<
      UseReactSpeechReturn['lastResponse']
    >().toEqualTypeOf<ReactSpeechGenerationResponseInfo | null>()
    expectTypeOf(reactPromptSuggestionOptions).toMatchTypeOf<UseReactPromptSuggestionsOptions>()
    expectTypeOf(createReactPromptSuggestionRecipes({ include: ['find-risks'] })).toMatchTypeOf<
      PromptSuggestion[]
    >()
    expectTypeOf<
      ReturnType<typeof useReactPromptSuggestions>
    >().toMatchTypeOf<UseReactPromptSuggestionsReturn>()
    expectTypeOf<UseReactPromptSuggestionsReturn>().toMatchTypeOf<{
      suggestions: PromptSuggestion[]
      visibleSuggestions: PromptSuggestion[]
      selectedSuggestion: PromptSuggestion | null
      isLoading: boolean
      error: Error | null
      reloadSuggestions: () => Promise<PromptSuggestion[]>
      selectSuggestion: (suggestion: string | PromptSuggestion) => PromptSuggestion | null
      clearSelection: () => void
    }>()
    expectTypeOf<ReactAgentRunStatus>().toEqualTypeOf<
      'idle' | 'running' | 'streaming' | 'interrupted' | 'completed' | 'error' | 'aborted'
    >()
    expectTypeOf(reactAgentRunOptions).toEqualTypeOf<
      UseReactAgentRunOptions<string, { approved: boolean }>
    >()
    expectTypeOf<
      ReturnType<typeof useReactAgentRun<string, { approved: boolean }>>
    >().toEqualTypeOf<UseReactAgentRunReturn<string, { approved: boolean }>>()
    expectTypeOf<UseReactAgentRunReturn<string, { approved: boolean }>>().toMatchTypeOf<{
      lastRequest: ReactAgentRunRequestInfo<string, { approved: boolean }> | null
      lastResponse: ReactAgentRunResponseInfo | null
      inspect: () => ReactAgentRunInspectionSnapshot<string, { approved: boolean }>
      clearTrace: () => void
    }>()
  })

  it('exports provider factories as ChatProvider-compatible values', () => {
    expectTypeOf(openai({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(openrouter({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(moonshot({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(zhipu({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(ollama()).toEqualTypeOf<ChatProvider>()
    expectTypeOf(vllm()).toEqualTypeOf<ChatProvider>()
    expectTypeOf(gemini({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(deepseek({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(proxyProvider()).toEqualTypeOf<ChatProvider>()
    expectTypeOf(new DefaultChatTransport()).toMatchTypeOf<ChatProvider>()
    expectTypeOf(new DirectChatTransport({ stream: () => [] })).toMatchTypeOf<ChatProvider>()
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
    expectTypeOf<MoonshotConfig>().toMatchTypeOf<{
      apiKey: string
      baseURL?: string
      timeoutMs?: number
    }>()
    expectTypeOf<ZhipuConfig>().toMatchTypeOf<{
      apiKey: string
      endpoint?: ZhipuEndpoint
      baseURL?: string
      timeoutMs?: number
    }>()
    expectTypeOf<ZhipuEndpoint>().toEqualTypeOf<
      'bigmodel' | 'z-ai' | 'bigmodel-coding' | 'z-ai-coding'
    >()
    expectTypeOf<OllamaConfig>().toMatchTypeOf<{
      apiKey?: string
      baseURL?: string
      timeoutMs?: number
    }>()
    expectTypeOf<VllmConfig>().toMatchTypeOf<{
      apiKey?: string
      baseURL?: string
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
    expectTypeOf<DefaultChatTransportOptions>().toMatchTypeOf<ProxyProviderConfig>()
    expectTypeOf<DefaultChatTransportOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<DefaultChatTransportOptions['prepareSendMessagesRequest']>().toEqualTypeOf<
      DefaultChatTransportPrepareSendMessagesRequest | undefined
    >()
    expectTypeOf<DefaultChatTransportOptions['prepareReconnectToStreamRequest']>().toEqualTypeOf<
      DefaultChatTransportPrepareReconnectToStreamRequest | undefined
    >()
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
    const directConfig: DirectChatTransportOptions = {
      id: 'local-agent',
      streamProtocol: 'ui-message',
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<unknown>()
        return 'hidden local agent error'
      },
      stream(request) {
        expectTypeOf(request).toEqualTypeOf<ChatRequest>()
        return []
      },
      resumeStream(request) {
        expectTypeOf(request).toEqualTypeOf<ChatResumeRequest>()
        return null
      }
    }
    expectTypeOf<DirectChatStreamProtocol>().toEqualTypeOf<'ui-message' | 'chat-chunk'>()
    expectTypeOf<DirectChatTransportOptions['onError']>().toEqualTypeOf<
      CreateUIMessageStreamOptions['onError']
    >()
    expectTypeOf(directConfig).toEqualTypeOf<DirectChatTransportOptions>()
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
    expectTypeOf(createUIMessageStreamParser).returns.toEqualTypeOf<UIMessageStreamParser>()
    expectTypeOf<UIMessageStreamParser['toChatChunks']>()
      .parameter(0)
      .toEqualTypeOf<Record<string, unknown>>()
    expectTypeOf<UIMessageStreamParser['toChatChunks']>().returns.toEqualTypeOf<ChatChunk[]>()
    expectTypeOf<UIMessageStreamPart>().toEqualTypeOf<Record<string, unknown>>()
    expectTypeOf<UIMessageStreamSource>().toEqualTypeOf<
      | Iterable<UIMessageStreamPart>
      | AsyncIterable<UIMessageStreamPart>
      | ReadableStream<UIMessageStreamPart>
    >()
    const agentEvent: AgentEvent = {
      type: 'tool-call',
      id: 'call_1',
      name: 'lookup',
      input: { q: 'vue' }
    }
    const agentInterrupt: AgentInterruptEvent = {
      type: 'interrupt',
      id: 'approval_1',
      name: 'approveCharge',
      value: { amount: 49 }
    }
    const agentOptions: AgentEventAdapterOptions = {
      progressDataType: 'data-agent-progress',
      interruptDataType: 'data-agent-interrupt'
    }
    const agentSource: AgentEventSource = [agentEvent]
    const readAgentOptions: ReadAgentEventStreamOptions = { events: agentSource, ...agentOptions }
    const agentCapabilities: AgentCapabilities = {
      identity: { name: 'Docs agent', type: 'langgraph' },
      transport: { streaming: true, resumable: true },
      tools: { supported: true, clientProvided: true, items: [{ name: 'lookup' }] },
      output: { structuredOutput: true },
      state: { snapshots: true, deltas: true },
      multiAgent: { supported: true, subAgents: [{ name: 'planner' }] },
      reasoning: { supported: true },
      multimodal: { input: { image: true }, output: { audio: true } },
      execution: { codeExecution: true },
      humanInTheLoop: { supported: true, approvals: true, interrupts: true },
      custom: { rateLimit: { maxRequestsPerMinute: 60 } }
    }
    const agentCapabilitiesOptions: UseAgentCapabilitiesOptions = {
      initialCapabilities: agentCapabilities,
      loadOnInit: false
    }
    const agentCapabilitiesState = useAgentCapabilities(agentCapabilitiesOptions)
    const agentRunHandler: AgentRunHandler<string, { approved: boolean }> = (request) => {
      expectTypeOf(request).toEqualTypeOf<AgentRunRequest<string, { approved: boolean }>>()
      return [agentEvent]
    }
    const agentRunOptions: UseAgentRunOptions<string, { approved: boolean }> = {
      run: agentRunHandler,
      onFinish(info) {
        expectTypeOf(info).toEqualTypeOf<AgentRunFinishInfo>()
      }
    }
    const agentRun = useAgentRun(agentRunOptions)
    expectTypeOf(agentEvent).toMatchTypeOf<AgentEvent>()
    expectTypeOf(agentInterrupt).toEqualTypeOf<AgentInterruptEvent>()
    expectTypeOf(agentOptions).toEqualTypeOf<AgentEventAdapterOptions>()
    expectTypeOf(agentSource).toMatchTypeOf<AgentEventSource>()
    expectTypeOf(readAgentOptions).toEqualTypeOf<ReadAgentEventStreamOptions>()
    expectTypeOf(agentCapabilities).toEqualTypeOf<AgentCapabilities>()
    expectTypeOf<AgentIdentityCapabilities>().toMatchTypeOf<AgentCapabilities['identity']>()
    expectTypeOf<AgentTransportCapabilities>().toMatchTypeOf<AgentCapabilities['transport']>()
    expectTypeOf<AgentCapabilityTool>().toMatchTypeOf<
      | Tool
      | {
          name: string
          description?: string
          parameters?: Record<string, unknown>
        }
    >()
    expectTypeOf<AgentToolsCapabilities>().toMatchTypeOf<AgentCapabilities['tools']>()
    expectTypeOf<AgentOutputCapabilities>().toMatchTypeOf<AgentCapabilities['output']>()
    expectTypeOf<AgentStateCapabilities>().toMatchTypeOf<AgentCapabilities['state']>()
    expectTypeOf<AgentMultiAgentCapabilities>().toMatchTypeOf<AgentCapabilities['multiAgent']>()
    expectTypeOf<AgentReasoningCapabilities>().toMatchTypeOf<AgentCapabilities['reasoning']>()
    expectTypeOf<AgentMultimodalInputCapabilities>().toMatchTypeOf<{
      image?: boolean
      audio?: boolean
      video?: boolean
      pdf?: boolean
      file?: boolean
    }>()
    expectTypeOf<AgentMultimodalOutputCapabilities>().toMatchTypeOf<{
      image?: boolean
      audio?: boolean
    }>()
    expectTypeOf<AgentMultimodalCapabilities>().toMatchTypeOf<AgentCapabilities['multimodal']>()
    expectTypeOf<AgentExecutionCapabilities>().toMatchTypeOf<AgentCapabilities['execution']>()
    expectTypeOf<AgentHumanInTheLoopCapabilities>().toMatchTypeOf<
      AgentCapabilities['humanInTheLoop']
    >()
    expectTypeOf<AgentInfoAgent>().toMatchTypeOf<{
      id?: string
      capabilities?: AgentCapabilities
    }>()
    expectTypeOf<AgentInfoResponse>().toMatchTypeOf<{
      capabilities?: AgentCapabilities
      agents?: AgentInfoAgent[]
    }>()
    expectTypeOf<AgentCapabilitiesSupportSummary>().toMatchTypeOf<{
      streaming: boolean
      toolCalling: boolean
      humanInTheLoop: boolean
      interrupts: boolean
    }>()
    expectTypeOf<LoadAgentCapabilitiesOptions>().toMatchTypeOf<{
      api?: string
      agentId?: string
      signal?: AbortSignal
    }>()
    expectTypeOf<AgentCapabilitiesRequestInfo>().toMatchTypeOf<{
      providerId: 'agent-capabilities'
      method: 'GET'
      attempt: number
      api: string
    }>()
    expectTypeOf<AgentCapabilitiesResponseInfo>().toMatchTypeOf<
      AgentCapabilitiesRequestInfo & {
        capabilities: AgentCapabilities | null
        rawInfo: unknown
      }
    >()
    expectTypeOf(agentCapabilitiesOptions).toEqualTypeOf<UseAgentCapabilitiesOptions>()
    expectTypeOf(agentCapabilitiesState).toEqualTypeOf<UseAgentCapabilitiesReturn>()
    expectTypeOf(agentCapabilitiesState.capabilities).toEqualTypeOf<Ref<AgentCapabilities | null>>()
    expectTypeOf(agentCapabilitiesState.supports).toEqualTypeOf<
      ComputedRef<AgentCapabilitiesSupportSummary>
    >()
    expectTypeOf(agentCapabilitiesState.loadCapabilities)
      .parameter(0)
      .toEqualTypeOf<LoadAgentCapabilitiesOptions | undefined>()
    expectTypeOf(agentCapabilitiesState.loadCapabilities).returns.toEqualTypeOf<
      Promise<AgentCapabilities | null>
    >()
    expectTypeOf(summarizeAgentCapabilities)
      .parameter(0)
      .toEqualTypeOf<AgentCapabilities | null | undefined>()
    expectTypeOf(
      summarizeAgentCapabilities
    ).returns.toEqualTypeOf<AgentCapabilitiesSupportSummary>()
    expectTypeOf(extractAgentCapabilities).parameter(0).toEqualTypeOf<unknown>()
    expectTypeOf(extractAgentCapabilities).parameter(1).toEqualTypeOf<string | undefined>()
    expectTypeOf(extractAgentCapabilities).returns.toEqualTypeOf<AgentCapabilities | null>()
    expectTypeOf<AgentRunStatus>().toEqualTypeOf<
      'idle' | 'running' | 'streaming' | 'interrupted' | 'completed' | 'error' | 'aborted'
    >()
    expectTypeOf<StartAgentRunOptions>().toEqualTypeOf<{ id?: string }>()
    expectTypeOf<ResumeAgentRunOptions>().toEqualTypeOf<StartAgentRunOptions>()
    expectTypeOf(agentRunHandler).toEqualTypeOf<AgentRunHandler<string, { approved: boolean }>>()
    expectTypeOf(agentRunOptions).toEqualTypeOf<UseAgentRunOptions<string, { approved: boolean }>>()
    expectTypeOf(agentRun).toEqualTypeOf<UseAgentRunReturn<string, { approved: boolean }>>()
    expectTypeOf(agentRun.interrupt).toEqualTypeOf<Ref<AgentInterruptEvent | null>>()
    expectTypeOf(agentRun.lastRequest).toEqualTypeOf<
      Ref<AgentRunRequestInfo<string, { approved: boolean }> | null>
    >()
    expectTypeOf(agentRun.lastResponse).toEqualTypeOf<Ref<AgentRunResponseInfo | null>>()
    expectTypeOf(agentRun.inspect).toEqualTypeOf<
      () => AgentRunInspectionSnapshot<string, { approved: boolean }>
    >()
    expectTypeOf(agentRun.clearTrace).toEqualTypeOf<() => void>()
    expectTypeOf<AgentRunRequestInfo<string, { approved: boolean }>>().toMatchTypeOf<{
      id: string
      providerId: 'agent-run'
      trigger: 'start' | 'resume'
      attempt: number
    }>()
    expectTypeOf<AgentRunResponseInfo>().toMatchTypeOf<{
      id: string
      providerId: 'agent-run'
      status: AgentRunStatus
      eventCount: number
      eventTypes: AgentEvent['type'][]
    }>()
    expectTypeOf(agentEventToChatChunk).parameter(0).toEqualTypeOf<AgentEvent>()
    expectTypeOf(agentEventToChatChunk)
      .parameter(1)
      .toEqualTypeOf<AgentEventAdapterOptions | undefined>()
    expectTypeOf(agentEventToChatChunk).returns.toEqualTypeOf<ChatChunk>()
    expectTypeOf(agentEventToUIMessageStreamPart).parameter(0).toEqualTypeOf<AgentEvent>()
    expectTypeOf(agentEventToUIMessageStreamPart)
      .parameter(1)
      .toEqualTypeOf<AgentEventAdapterOptions | undefined>()
    expectTypeOf(agentEventToUIMessageStreamPart).returns.toEqualTypeOf<UIMessageStreamPart>()
    expectTypeOf(readAgentEvents).parameter(0).toEqualTypeOf<AgentEventSource>()
    expectTypeOf(readAgentEvents).parameter(1).toEqualTypeOf<AbortSignal | undefined>()
    expectTypeOf(readAgentEvents).returns.toEqualTypeOf<AsyncGenerator<AgentEvent>>()
    expectTypeOf(readAgentEventStream).parameter(0).toEqualTypeOf<ReadAgentEventStreamOptions>()
    expectTypeOf(readAgentEventStream).returns.toEqualTypeOf<AsyncGenerator<ChatChunk>>()
    expectTypeOf(createUIMessageStream).parameter(0).toEqualTypeOf<CreateUIMessageStreamOptions>()
    expectTypeOf(createUIMessageStream).returns.toEqualTypeOf<ReadableStream<UIMessageStreamPart>>()
    expectTypeOf<CreateUIMessageStreamOptions['execute']>().toEqualTypeOf<
      (writer: UIMessageStreamWriter) => void | Promise<void>
    >()
    expectTypeOf<CreateUIMessageStreamOptions['onError']>().toEqualTypeOf<
      ((error: unknown) => UIMessageStreamPart | string | null | undefined) | undefined
    >()
    expectTypeOf<CreateUIMessageStreamOptions['signal']>().toEqualTypeOf<AbortSignal | undefined>()
    expectTypeOf<UIMessageStreamWriter['write']>().toEqualTypeOf<
      (part: UIMessageStreamPart) => void
    >()
    expectTypeOf<UIMessageStreamWriter['merge']>().toEqualTypeOf<
      (stream: UIMessageStreamSource) => Promise<void>
    >()
    expectTypeOf<UIMessageStreamWriter['error']>().toEqualTypeOf<(error: unknown) => void>()
    expectTypeOf(toChatChunks).parameter(0).toEqualTypeOf<Record<string, unknown>>()
    expectTypeOf(toChatChunks).parameter(1).toEqualTypeOf<UIMessageStreamParser | undefined>()
    expectTypeOf(toChatChunks).returns.toEqualTypeOf<ChatChunk[]>()
    expectTypeOf(readUIMessageStream)
      .parameter(0)
      .toEqualTypeOf<ReadUIMessageStreamOptions & { response: Response }>()
    expectTypeOf(readUIMessageStream).returns.toEqualTypeOf<AsyncGenerator<ChatChunk>>()
    expectTypeOf(createUIMessageStreamResponse)
      .parameter(0)
      .toEqualTypeOf<CreateUIMessageStreamResponseOptions>()
    expectTypeOf(createUIMessageStreamResponse).returns.toEqualTypeOf<Response>()
    expectTypeOf(pipeUIMessageStreamToResponse)
      .parameter(0)
      .toEqualTypeOf<PipeUIMessageStreamToResponseOptions>()
    expectTypeOf(pipeUIMessageStreamToResponse).returns.toEqualTypeOf<Promise<void>>()
    expectTypeOf(formatSSEData).parameter(0).toEqualTypeOf<unknown>()
    expectTypeOf(formatSSEData).returns.toEqualTypeOf<string>()
    expectTypeOf(validateMessages).parameter(0).toEqualTypeOf<unknown>()
    expectTypeOf(validateMessages).parameter(1).toEqualTypeOf<ValidateMessagesOptions | undefined>()
    expectTypeOf(validateMessages).returns.toEqualTypeOf<boolean>()
    expectTypeOf(safeValidateMessages).returns.toEqualTypeOf<SafeValidateMessagesResult>()
    expectTypeOf(validateUIMessages).returns.toEqualTypeOf<Message[]>()
    expectTypeOf(safeValidateUIMessages).returns.toEqualTypeOf<SafeValidateUIMessagesResult>()
    expectTypeOf<ValidateUIMessagesOptions>().toMatchTypeOf<
      ValidateMessagesOptions & {
        messages?: unknown
        metadataSchema?: MessageMetadataSchema
        dataSchemas?: DataPartSchemas
        tools?: ToolSet
      }
    >()
    expectTypeOf<CreateUIMessageStreamResponseOptions>().toMatchTypeOf<{
      stream: UIMessageStreamSource
      status?: number
      headers?: HeadersInit
    }>()
    expectTypeOf<PipeUIMessageStreamToResponseOptions>().toMatchTypeOf<{
      response: ServerResponseLike
      consumeSseStream?: (options: { stream: ReadableStream<string> }) => void | Promise<void>
    }>()
    expectTypeOf<ServerResponseLike['write']>().toEqualTypeOf<(chunk: string) => boolean | void>()
    expectTypeOf(parseSSE).parameter(0).toEqualTypeOf<Response>()
    expectTypeOf(parseSSE).parameter(1).toEqualTypeOf<AbortSignal | undefined>()
    expectTypeOf(parseSSE).returns.toEqualTypeOf<AsyncGenerator<Record<string, unknown>>>()
    expectTypeOf(classifyInspectionError).parameter(0).toEqualTypeOf<unknown>()
    expectTypeOf(classifyInspectionError).returns.toEqualTypeOf<InspectionErrorSummary | null>()
    expectTypeOf(createInspectionCurl).parameter(0).toEqualTypeOf<unknown>()
    expectTypeOf(createInspectionCurl)
      .parameter(1)
      .toEqualTypeOf<InspectionCurlOptions | undefined>()
    expectTypeOf(createInspectionCurl).returns.toEqualTypeOf<string | null>()
    expectTypeOf(inspectRequestTrace)
      .parameter(0)
      .toEqualTypeOf<InspectRequestTraceOptions<unknown, unknown>>()
    expectTypeOf(inspectRequestTrace).returns.toEqualTypeOf<
      RequestInspectionSnapshot<unknown, unknown>
    >()
    expectTypeOf<InspectionStatus>().toEqualTypeOf<
      AiRequestStatus | 'idle' | 'running' | 'interrupted' | 'completed' | 'aborted'
    >()
    expectTypeOf<InspectionErrorCategory>().toEqualTypeOf<
      | 'abort'
      | 'authentication'
      | 'authorization'
      | 'rate-limit'
      | 'timeout'
      | 'network'
      | 'provider'
      | 'validation'
      | 'unknown'
    >()
    expectTypeOf<InspectionErrorSummary>().toMatchTypeOf<{
      category: InspectionErrorCategory
      message: string
      retryable: boolean
      hasCause: boolean
      status?: number
    }>()
    expectTypeOf<InspectionTimelineEventKind>().toEqualTypeOf<
      'request' | 'response' | 'stream' | 'retry' | 'error' | 'status'
    >()
    expectTypeOf<InspectionTimelineEventInput>().toMatchTypeOf<{
      kind: InspectionTimelineEventKind
      timestamp?: Date | string | number
      attempt?: number
      metadata?: Record<string, unknown>
    }>()
    expectTypeOf<InspectionTimelineEvent>().toMatchTypeOf<{
      kind: InspectionTimelineEventKind
      timestamp: string
    }>()
    expectTypeOf<InspectionRetryRecordInput>().toMatchTypeOf<{
      attempt: number
      error: unknown
      maxRetries?: number
      delayMs?: number
    }>()
    expectTypeOf<InspectionRetryRecord>().toMatchTypeOf<{
      attempt: number
      error: InspectionErrorSummary
      timestamp: string
    }>()
    expectTypeOf<InspectionProviderTrace>().toMatchTypeOf<{
      requestKeys: string[]
      responseKeys: string[]
      providerId?: string
      api?: string
      hasStream?: boolean
    }>()
    expectTypeOf<InspectionCurlOptions>().toMatchTypeOf<{
      api?: string
      method?: string
      headers?: unknown
      body?: unknown
      redactHeaders?: readonly string[]
    }>()

    expect(openai({ apiKey: 'test-key' }).id).toBe('openai-compatible')
    expect(openrouter({ apiKey: 'test-key' }).id).toBe('openrouter')
    expect(moonshot({ apiKey: 'test-key' }).id).toBe('moonshot')
    expect(zhipu({ apiKey: 'test-key' }).id).toBe('zhipu')
    expect(ollama().id).toBe('ollama')
    expect(vllm().id).toBe('vllm')
    expect(gemini({ apiKey: 'test-key' }).id).toBe('gemini')
    expect(deepseek({ apiKey: 'test-key' }).id).toBe('deepseek')
    expect(proxyProvider().id).toBe('proxy')
    expect(new DefaultChatTransport().id).toBe('proxy')
    expect(new DirectChatTransport({ stream: () => [] }).id).toBe('direct')
    expect(anthropic({ apiKey: 'test-key' }).id).toBe('anthropic')
    expect(fallbackProvider({ providers: [provider] }).id).toBe('fallback')
  })

  it('keeps composable return types stable for consumers', () => {
    const chat = useChat({ provider } satisfies UseChatOptions)
    const defaultTransportChat = useChat({} satisfies UseChatOptions)
    const apiChat = useChat({ api: '/api/chat' } satisfies UseChatOptions)
    const chatInstance = new Chat({ provider } satisfies ChatOptions)
    const instanceChat = useChat({ chat: chatInstance, provider } satisfies UseChatOptions)
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
    const videoGeneration = useVideo({
      api: '/api/video'
    } satisfies UseVideoOptions)
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
      schema: jsonSchema<{ answer: string }>({ type: 'object' })
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
    const promptSuggestions = usePromptSuggestions<Record<string, unknown>>({
      input: chat.input,
      messages: chat.messages,
      suggestions: [
        'Summarize this thread',
        {
          id: 'risks',
          title: 'Find risks',
          prompt: 'Find the top risks.',
          metadata: { category: 'review' }
        }
      ],
      loader(context) {
        expectTypeOf(context).toEqualTypeOf<PromptSuggestionLoaderContext>()
        return [{ id: 'dynamic', prompt: `Use context: ${context.input}` }]
      },
      loadOnInit: false
    } satisfies UsePromptSuggestionsOptions<Record<string, unknown>>)
    const promptSuggestionRecipes = createPromptSuggestionRecipes({
      include: ['find-risks', 'draft-handoff'],
      surfaces: ['thread'],
      metadata: { source: 'public-api' }
    } satisfies CreatePromptSuggestionRecipesOptions<{ source: string }>)
    const promptSuggestionRecipe: PromptSuggestionRecipe = {
      id: 'find-risks',
      category: 'review',
      surfaces: ['chat', 'thread', 'release'],
      title: 'Find risks',
      prompt: 'Find risks.',
      description: 'Review before release.'
    }
    const promptSuggestionRecipeLocale: PromptSuggestionRecipeLocale = 'en'
    const promptSuggestionRecipeCategory: PromptSuggestionRecipeCategory = 'review'
    const promptSuggestionRecipeId: PromptSuggestionRecipeId = 'find-risks'
    const promptSuggestionRecipeSurface: PromptSuggestionRecipeSurface = 'thread'
    const agentContextRegistry = useAgentContextRegistry()
    const unregisterAgentContext = useAgentContext(agentContextRegistry, {
      description: 'Current route',
      value: '/tickets'
    } satisfies AgentContextInput)
    const agentContextSnapshots = agentContextRegistry.contexts.value
    const agentContextMessage = createAgentContextMessage(agentContextSnapshots)
    const agentContextMessages = withAgentContextMessage(
      [{ id: 'u1', role: 'user', content: 'Hello' }],
      agentContextSnapshots
    )
    const agentContextText = formatAgentContexts(agentContextSnapshots)
    const resolvedAgentContexts = resolveAgentContexts(agentContextRegistry)
    const serializableAgentContext: AgentContextSerializable = {
      route: '/tickets',
      flags: [true, null]
    }
    const renderToolCall: ToolCall = {
      id: 'call_render',
      type: 'function',
      function: { name: 'lookup', arguments: '{}' }
    }
    const toolRenderRows = getToolRenderParts({
      messages: [
        {
          id: 'a1',
          role: 'assistant',
          content: '',
          toolCalls: [renderToolCall]
        }
      ],
      pendingToolCalls: [renderToolCall]
    } satisfies GetToolRenderPartsOptions)

    expectTypeOf(chat).toEqualTypeOf<UseChatReturn>()
    expectTypeOf(defaultTransportChat).toEqualTypeOf<UseChatReturn>()
    expectTypeOf(apiChat).toEqualTypeOf<UseChatReturn>()
    expect(instanceChat).toBe(chatInstance)
    expectTypeOf(chatInstance).toMatchTypeOf<UseChatReturn>()
    expectTypeOf(instanceChat).toEqualTypeOf<UseChatReturn>()
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
    expectTypeOf(chat.inspect).toEqualTypeOf<
      () => RequestInspectionSnapshot<ChatRequestInfo, ChatResponseInfo>
    >()
    expectTypeOf(chat.lastRequest).toEqualTypeOf<Ref<ChatRequestInfo | null>>()
    expectTypeOf(chat.lastResponse).toEqualTypeOf<Ref<ChatResponseInfo | null>>()
    expectTypeOf(promptSuggestions).toEqualTypeOf<UsePromptSuggestionsReturn>()
    expectTypeOf(promptSuggestions.suggestions.value).toEqualTypeOf<PromptSuggestion[]>()
    expectTypeOf(promptSuggestions.visibleSuggestions.value).toEqualTypeOf<PromptSuggestion[]>()
    expectTypeOf(promptSuggestions.selectedSuggestion).toEqualTypeOf<Ref<PromptSuggestion | null>>()
    expectTypeOf(promptSuggestions.isLoading).toEqualTypeOf<Ref<boolean>>()
    expectTypeOf(promptSuggestions.error).toEqualTypeOf<Ref<Error | null>>()
    expectTypeOf(promptSuggestions.reloadSuggestions).toEqualTypeOf<
      () => Promise<PromptSuggestion[]>
    >()
    expectTypeOf(promptSuggestions.clearError).toEqualTypeOf<() => void>()
    expectTypeOf(promptSuggestions.selectSuggestion)
      .parameter(0)
      .toEqualTypeOf<string | PromptSuggestion>()
    expectTypeOf(
      promptSuggestions.selectSuggestion
    ).returns.toEqualTypeOf<PromptSuggestion | null>()
    expectTypeOf(promptSuggestions.clearSelection).toEqualTypeOf<() => void>()
    expectTypeOf<PromptSuggestionInput>().toMatchTypeOf<
      string | { prompt: string; title?: string; metadata?: Record<string, unknown> }
    >()
    expectTypeOf<PromptSuggestionFilter>().toEqualTypeOf<
      (suggestion: PromptSuggestion, context: PromptSuggestionFilterContext) => boolean
    >()
    expectTypeOf<PromptSuggestionFilterContext>().toMatchTypeOf<{
      input: string
      messages: readonly Message[]
      suggestions: readonly PromptSuggestion[]
    }>()
    expectTypeOf<PromptSuggestionLoader>().toEqualTypeOf<
      (
        context: PromptSuggestionLoaderContext
      ) => readonly PromptSuggestionInput[] | Promise<readonly PromptSuggestionInput[]>
    >()
    expectTypeOf<PromptSuggestionLoaderContext>().toMatchTypeOf<{
      input: string
      messages: readonly Message[]
      signal: AbortSignal
    }>()
    expect(promptSuggestionRecipeIds).toContain('find-risks')
    expect(promptSuggestionRecipes[0]?.metadata).toMatchObject({
      kind: 'task-starter',
      recipe: 'find-risks',
      category: 'review',
      surfaces: ['chat', 'thread', 'release'],
      locale: 'en',
      source: 'public-api'
    })
    expectTypeOf(promptSuggestionRecipes).toEqualTypeOf<
      PromptSuggestion<PromptSuggestionRecipeMetadata & { source: string }>[]
    >()
    expectTypeOf(promptSuggestionRecipe).toEqualTypeOf<PromptSuggestionRecipe>()
    expect(promptSuggestionRecipeLocale).toBe('en')
    expect(promptSuggestionRecipeCategory).toBe('review')
    expect(promptSuggestionRecipeId).toBe('find-risks')
    expect(promptSuggestionRecipeSurface).toBe('thread')
    expectTypeOf(agentContextRegistry).toEqualTypeOf<AgentContextRegistry>()
    expectTypeOf(unregisterAgentContext).toEqualTypeOf<() => void>()
    expectTypeOf(agentContextSnapshots).toEqualTypeOf<AgentContextSnapshot[]>()
    expectTypeOf(agentContextMessage).toEqualTypeOf<Message | null>()
    expectTypeOf(agentContextMessages).toEqualTypeOf<ChatRequestMessage[]>()
    expectTypeOf(agentContextText).toEqualTypeOf<string>()
    expectTypeOf(resolvedAgentContexts).toEqualTypeOf<AgentContextSnapshot[]>()
    expectTypeOf(serializableAgentContext).toMatchTypeOf<AgentContextSerializable>()
    expectTypeOf(completion).toEqualTypeOf<UseCompletionReturn>()
    expectTypeOf(defaultTransportCompletion).toEqualTypeOf<UseCompletionReturn>()
    expectTypeOf(completionApi).toEqualTypeOf<UseCompletionReturn>()
    expectTypeOf<UseChatOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseChatOptions['chat']>().toEqualTypeOf<Chat | undefined>()
    expectTypeOf<ChatOptions>().toEqualTypeOf<Omit<UseChatOptions, 'chat'>>()
    expectTypeOf<UseChatOptions['provider']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseChatOptions['transport']>().toEqualTypeOf<ChatProvider | undefined>()
    expectTypeOf<UseChatOptions['agentContext']>().toEqualTypeOf<
      AgentContextSource | false | undefined
    >()
    expectTypeOf<UseChatOptions['agentContextMessage']>().toEqualTypeOf<
      AgentContextMessageOptions | undefined
    >()
    expectTypeOf<UseChatOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseChatOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseChatOptions['credentials']>().toEqualTypeOf<RequestCredentials | undefined>()
    expectTypeOf<UseChatOptions['headers']>().toEqualTypeOf<
      ProxyProviderConfig['headers'] | undefined
    >()
    expectTypeOf<UseChatOptions['body']>().toEqualTypeOf<ProxyProviderConfig['body'] | undefined>()
    expectTypeOf<UseChatOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseChatOptions['streamProtocol']>().toEqualTypeOf<ChatStreamProtocol | undefined>()
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
    expectTypeOf(cosineSimilarity).parameter(0).toEqualTypeOf<readonly number[]>()
    expectTypeOf(cosineSimilarity).parameter(1).toEqualTypeOf<readonly number[]>()
    expectTypeOf(cosineSimilarity).returns.toEqualTypeOf<number>()
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
    expectTypeOf<UseVideoOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseVideoOptions['api']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseVideoOptions['baseURL']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseVideoOptions['credentials']>().toEqualTypeOf<RequestCredentials | undefined>()
    expectTypeOf<UseVideoOptions['headers']>().toMatchTypeOf<
      HeadersInit | (() => HeadersInit | Promise<HeadersInit>) | undefined
    >()
    expectTypeOf<UseVideoOptions['fetch']>().toEqualTypeOf<typeof fetch | undefined>()
    expectTypeOf<UseVideoOptions['timeoutMs']>().toEqualTypeOf<number | undefined>()
    expectTypeOf<UseVideoOptions['initialInput']>().toEqualTypeOf<string | undefined>()
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
    expectTypeOf<UseChatOptions['onToolCall']>().toEqualTypeOf<ToolCallCallback | undefined>()
    expectTypeOf<ToolCallCallback>().toMatchTypeOf<AiSdkToolCallCallback | LegacyToolCallCallback>()
    expectTypeOf<ToolCallCallbackOptions>().toMatchTypeOf<{
      toolCall: UIToolCall
      messages: Message[]
      args: unknown
      context?: unknown
    }>()
    expectTypeOf<UIToolCall>().toMatchTypeOf<{
      toolCallId: string
      toolName: string
      input: unknown
      dynamic: boolean
    }>()
    expectTypeOf<ChatRequestLifecycleKind>().toEqualTypeOf<'chat' | 'resume'>()
    expectTypeOf<AiSdkSendChatTrigger>().toEqualTypeOf<
      'submit-user-message' | 'regenerate-assistant-message'
    >()
    expectTypeOf<ChatRequestInfo>().toMatchTypeOf<{
      kind: ChatRequestLifecycleKind
      request: ChatRequest | ChatResumeRequest
      attempt: number
      providerId: string
      api?: string
      credentials?: RequestCredentials
      aiSdkTrigger?: AiSdkSendChatTrigger
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
    const uiValidationOptions: ValidateUIMessagesOptions<{ progress: number }, { source: string }> =
      {
        messages: [],
        metadataSchema: { type: 'object' },
        dataSchemas: { 'data-progress': { type: 'object' } },
        tools: {}
      }
    expectTypeOf(uiValidationOptions.messages).toEqualTypeOf<unknown>()
    expectTypeOf(uiValidationOptions.metadataSchema).toEqualTypeOf<
      MessageMetadataSchema<{ source: string }> | undefined
    >()
    expectTypeOf(uiValidationOptions.dataSchemas).toEqualTypeOf<
      DataPartSchemas<{ progress: number }> | undefined
    >()
    expectTypeOf(uiValidationOptions.tools).toEqualTypeOf<ToolSet | undefined>()
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
    expectTypeOf(getToolRenderParts).parameter(0).toEqualTypeOf<GetToolRenderPartsOptions>()
    expectTypeOf(getToolRenderParts).returns.toEqualTypeOf<ToolRenderPart[]>()
    expectTypeOf(toolRenderRows).toEqualTypeOf<ToolRenderPart[]>()
    expectTypeOf<ToolRenderStatus>().toEqualTypeOf<
      'inProgress' | 'executing' | 'awaitingAction' | 'complete' | 'error'
    >()
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
    expectTypeOf<CreateIdGeneratorOptions>().toMatchTypeOf<{
      prefix?: string
      separator?: string
      size?: number
      alphabet?: string
    }>()
    expectTypeOf(createIdGenerator)
      .parameter(0)
      .toEqualTypeOf<CreateIdGeneratorOptions | undefined>()
    expectTypeOf(createIdGenerator).returns.toEqualTypeOf<IdGenerator>()
    expectTypeOf(generateId).toEqualTypeOf<IdGenerator>()

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
      ((prompt: string, completion: string, info?: CompletionFinishInfo) => void) | undefined
    >()
    expectTypeOf<UseCompletionOptions['onFinishLegacy']>().toEqualTypeOf<
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
    expectTypeOf<ChatStreamProtocol>().toEqualTypeOf<'ui-message' | 'data' | 'text'>()
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
    expectTypeOf(imageGeneration.editImage).returns.toEqualTypeOf<Promise<ImageGenerationResult>>()
    expectTypeOf(imageGeneration.editImage).parameter(0).toEqualTypeOf<string | undefined>()
    expectTypeOf(imageGeneration.editImage).parameter(1).toEqualTypeOf<ImageEditOptions>()
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
      operation?: ImageOperation
      image?: ImageEditInput | ImageEditInput[]
      mask?: ImageEditInput
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
      operation: ImageOperation
      prompt: string
      request: ImageGenerationRequest
    }>()
    expectTypeOf<ImageEditOptions>().toMatchTypeOf<{
      image: ImageEditInput | ImageEditInput[]
      mask?: ImageEditInput
      model?: string
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

    expectTypeOf(videoGeneration).toEqualTypeOf<UseVideoReturn>()
    expectTypeOf(videoGeneration.input).toEqualTypeOf<Ref<string>>()
    expectTypeOf(videoGeneration.video).toEqualTypeOf<Ref<GeneratedVideo | null>>()
    expectTypeOf(videoGeneration.videos).toEqualTypeOf<Ref<GeneratedVideo[]>>()
    expectTypeOf(videoGeneration.result).toEqualTypeOf<Ref<VideoGenerationResult | null>>()
    expectTypeOf(videoGeneration.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(videoGeneration.generate).returns.toEqualTypeOf<Promise<VideoGenerationResult>>()
    expectTypeOf(videoGeneration.generate)
      .parameter(1)
      .toEqualTypeOf<Partial<VideoGenerationRequest> | undefined>()
    expectTypeOf(videoGeneration.generateVideo).returns.toEqualTypeOf<
      Promise<VideoGenerationResult>
    >()
    expectTypeOf(videoGeneration.setInput).toEqualTypeOf<(value: string) => void>()
    expectTypeOf(videoGeneration.handleInputChange)
      .parameter(0)
      .toEqualTypeOf<Event | { target?: { value?: unknown } } | string>()
    expectTypeOf(videoGeneration.handleSubmit).returns.toEqualTypeOf<
      Promise<VideoGenerationResult>
    >()
    expectTypeOf(videoGeneration.handleSubmit)
      .parameter(1)
      .toEqualTypeOf<Partial<VideoGenerationRequest> | undefined>()
    expectTypeOf(videoGeneration.lastRequest).toEqualTypeOf<
      Ref<VideoGenerationRequestInfo | null>
    >()
    expectTypeOf(videoGeneration.lastResponse).toEqualTypeOf<
      Ref<VideoGenerationResponseInfo | null>
    >()
    expectTypeOf<VideoFrameImage>().toMatchTypeOf<{
      image: string
      frameType: string
    }>()
    expectTypeOf<VideoGenerationRequest>().toMatchTypeOf<{
      prompt: string
      body?: Record<string, unknown>
      model?: string
      n?: number
      aspectRatio?: string
      resolution?: string
      duration?: number
      fps?: number
      frameImages?: VideoFrameImage[]
      inputReferences?: string[]
      generateAudio?: boolean
      providerOptions?: Record<string, unknown>
      headers?: HeadersInit
    }>()
    expectTypeOf<VideoGenerationResult>().toMatchTypeOf<{
      video?: GeneratedVideo
      videos: GeneratedVideo[]
      model?: string
    }>()
    expectTypeOf<VideoGenerationRequestInfo>().toMatchTypeOf<{
      providerId: 'proxy'
      attempt: number
      api: string
      prompt: string
      request: VideoGenerationRequest
    }>()
    expectTypeOf<VideoGenerationResponseInfo>().toMatchTypeOf<
      VideoGenerationRequestInfo & { result: VideoGenerationResult }
    >()
    expectTypeOf<UseVideoOptions['onRequest']>().toEqualTypeOf<
      ((info: VideoGenerationRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseVideoOptions['onResponse']>().toEqualTypeOf<
      ((info: VideoGenerationResponseInfo) => void) | undefined
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
      id: string
      providerId: string
      attempt: number
      api?: string
      credentials?: RequestCredentials
      request: ChatRequest
      messages: ChatRequestMessage[]
      requestMetadata: unknown
      body?: Record<string, unknown>
      headers?: Record<string, string>
    }>()
    expectTypeOf<ObjectResponseInfo>().toMatchTypeOf<ObjectRequestInfo & { hasStream: boolean }>()
    expectTypeOf<ObjectFinishInfo<{ answer: string }>>().toEqualTypeOf<{
      object: { answer: string }
      text: string
      isAbort: boolean
      error: Error | undefined
    }>()
    expectTypeOf<ObjectFinishCallbackOptions<{ answer: string }>>().toEqualTypeOf<{
      object: { answer: string } | undefined
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
      ObjectFinishCallback<{ answer: string }> | undefined
    >()
    expectTypeOf<ObjectFinishCallback<{ answer: string }>>().toMatchTypeOf<
      AiSdkObjectFinishCallback<{ answer: string }> | LegacyObjectFinishCallback<{ answer: string }>
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
      },
      toModelOutput(output, context) {
        expectTypeOf(output).toEqualTypeOf<{ answer: string }>()
        expectTypeOf(context).toEqualTypeOf<ToolModelOutputContext>()
        return { type: 'text', text: output.answer }
      }
    })
    const runtimeTool = dynamicTool({
      parameters: { type: 'object' }
    })
    const typedToolSet = {
      lookup: lookupTool,
      runtime: runtimeTool,
      wire: wireTool
    }
    const toolSet: ToolSet = typedToolSet
    const chatTools: ChatToolsInput = toolSet
    const wireTools: ChatToolsInput = [wireTool]
    type TypedToolSet = typeof typedToolSet
    expectTypeOf<InferToolInput<typeof lookupTool>>().toEqualTypeOf<{ q: string }>()
    expectTypeOf<InferToolOutput<typeof lookupTool>>().toEqualTypeOf<{ answer: string }>()
    expectTypeOf<InferUITools<TypedToolSet>['lookup']>().toEqualTypeOf<{
      input: { q: string }
      output: { answer: string }
    }>()
    expectTypeOf<InferUITools<TypedToolSet>['runtime']>().toEqualTypeOf<{
      input: unknown
      output: unknown
    }>()
    expectTypeOf<InferUITools<TypedToolSet>['wire']>().toEqualTypeOf<{
      input: unknown
      output: unknown
    }>()
    type AppDataParts = { progress: { step: number; label?: string } }
    type AppTools = InferUITools<TypedToolSet>
    type AppUIMessage = UIMessage<{ source: string }, AppDataParts, AppTools>
    const uiDataTypes: UIDataTypes = { progress: { step: 1 } }
    const uiTools: UITools = {
      lookup: { input: { q: 'vue' }, output: { answer: 'ok' } }
    }
    const uiDataPart: UIMessageDataPart<AppDataParts> = {
      type: 'data-progress',
      id: 'progress_1',
      data: { step: 1, label: 'Searching' }
    }
    const uiToolPart: UIMessageToolPart<AppTools> = {
      type: 'tool-lookup',
      toolCallId: 'call_1',
      toolName: 'lookup',
      state: 'output-available',
      input: { q: 'vue' },
      output: { answer: 'ok' }
    }
    const uiMessagePart: UIMessagePart<AppDataParts, AppTools> = uiToolPart
    const uiMessage: AppUIMessage = {
      id: 'msg_ui',
      role: 'assistant',
      content: '',
      metadata: { source: 'tool-test' },
      parts: [messageTextPart, uiDataPart, uiMessagePart]
    }
    expectTypeOf(uiDataPart.data.step).toEqualTypeOf<number>()
    expectTypeOf(uiToolPart.input).toEqualTypeOf<{ q: string } | undefined>()
    expectTypeOf(uiToolPart.output).toEqualTypeOf<{ answer: string } | undefined>()
    expectTypeOf(uiMessage.metadata).toEqualTypeOf<{ source: string } | undefined>()
    expectTypeOf(uiMessage.parts).toEqualTypeOf<
      UIMessagePart<AppDataParts, AppTools>[] | undefined
    >()
    const schemaContract: JsonSchemaDefinition<{ q: string }> = schema
    const lookupToolContract: ToolDefinition<{ q: string }, { answer: string }> = lookupTool
    const runtimeToolContract: ToolDefinition<unknown, unknown> = runtimeTool
    const schemaInput: ToolInputSchema<{ q: string }> = schema
    const executeContract: ToolExecute<{ q: string }, { answer: string }> | undefined =
      lookupTool.execute
    const handlerContract: ToolHandlerFor<typeof lookupTool> = (input, context) => {
      expectTypeOf(input).toEqualTypeOf<{ q: string }>()
      expectTypeOf(context).toEqualTypeOf<ToolCallHandlerContext>()
      return { answer: input.q }
    }
    const handlersContract: ToolHandlersFor<TypedToolSet> = {
      lookup(input, context) {
        expectTypeOf(input).toEqualTypeOf<{ q: string }>()
        expectTypeOf(context).toEqualTypeOf<ToolCallHandlerContext>()
        return { answer: input.q }
      },
      runtime(input) {
        expectTypeOf(input).toEqualTypeOf<unknown>()
        return input
      }
    }
    const typedToolHandlers = defineToolHandlers(typedToolSet, handlersContract)
    expectTypeOf(typedToolHandlers).toEqualTypeOf<Record<string, ToolCallHandler>>()
    const modelOutput: ToolModelOutput = { type: 'text', text: 'ok' }
    const anyToolDefinition: AnyToolDefinition = lookupTool
    void [
      schemaContract,
      lookupToolContract,
      runtimeToolContract,
      schemaInput,
      executeContract,
      handlerContract,
      handlersContract,
      typedToolHandlers,
      uiDataTypes,
      uiTools,
      uiDataPart,
      uiToolPart,
      uiMessagePart,
      uiMessage,
      modelOutput,
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
    const aiSdkTrigger: AiSdkSendChatTrigger = 'submit-user-message'
    const prepareSendOptions: PrepareSendMessagesRequestOptions = {
      id: 'chat_1',
      messages: [message],
      requestMetadata: { traceId: 'trace_1' },
      body: { tenantId: 'tenant_1' },
      headers: { 'X-Trace': 'trace_1' },
      request,
      trigger: sendTrigger,
      aiSdkTrigger,
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
    const prepareModelMessages: PrepareSendMessagesRequest = ({ messages }) => ({
      messages: convertToModelMessages(messages)
    })
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
    const chatThread: ChatThread<{ owner: string }> = {
      id: 'thread_1',
      title: 'Support',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      metadata: { owner: 'support' },
      messageCount: 1,
      lastMessagePreview: 'Hello'
    }
    const serializedChatThread: SerializedChatThread<{ owner: string }> = {
      id: 'thread_1',
      title: 'Support',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      metadata: { owner: 'support' },
      messageCount: 1,
      lastMessagePreview: 'Hello'
    }
    const chatThreadsState: ChatThreadsState<{ owner: string }> = {
      threads: [chatThread],
      activeThreadId: 'thread_1'
    }
    const serializedChatThreadsState: SerializedChatThreadsState<{ owner: string }> = {
      threads: [serializedChatThread],
      activeThreadId: 'thread_1'
    }
    const createThreadInput: CreateChatThreadInput<{ owner: string }> = {
      title: 'Support',
      metadata: { owner: 'support' }
    }
    const updateThreadInput: UpdateChatThreadInput<{ owner: string }> = {
      metadata: null,
      lastMessagePreview: null
    }
    const chatThreadsErrorPhase: ChatThreadsPersistenceErrorPhase = 'save'
    const chatThreadsPersistenceError: ChatThreadsPersistenceErrorInfo = {
      phase: chatThreadsErrorPhase,
      key: 'threads',
      version: 1,
      message: 'quota',
      name: 'Error',
      timestamp: new Date()
    }
    expectTypeOf(chatThreadsPersistenceError).toEqualTypeOf<ChatThreadsPersistenceErrorInfo>()
    const chatThreadsPersist: ChatThreadsPersistOptions<{ owner: string }> = {
      key: 'threads',
      storage: null,
      onLoadError(error) {
        expectTypeOf(error).toEqualTypeOf<Error>()
      },
      onClearError(error) {
        expectTypeOf(error).toEqualTypeOf<Error>()
      }
    }
    const chatThreadsOptions: UseChatThreadsOptions<{ owner: string }> = {
      initialThreads: [chatThread],
      initialActiveThreadId: 'thread_1',
      persist: chatThreadsPersist
    }
    const chatThreads = useChatThreads(chatThreadsOptions)
    expectTypeOf(
      chatThreads.persistenceError.value
    ).toEqualTypeOf<ChatThreadsPersistenceErrorInfo | null>()
    chatThreads.clearPersistenceError()
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
    const aiSdkChatFinishCallback: AiSdkChatFinishCallback = (info) => {
      expectTypeOf(info).toEqualTypeOf<ChatFinishInfo>()
      expectTypeOf(info.message).toEqualTypeOf<Message>()
      expectTypeOf(info.messages).toEqualTypeOf<Message[]>()
      expectTypeOf(info.isAbort).toEqualTypeOf<boolean>()
    }
    const legacyChatFinishCallback: LegacyChatFinishCallback = (finishedMessage, info) => {
      expectTypeOf(finishedMessage).toEqualTypeOf<Message>()
      expectTypeOf(info).toEqualTypeOf<ChatFinishInfo>()
    }
    const handler: ToolCallHandler = async (args, context) => {
      expectTypeOf(args).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<ToolCallHandlerContext>()
      expectTypeOf(context.context).toEqualTypeOf<unknown>()
      return { ok: true }
    }
    const aiSdkToolCallCallback: AiSdkToolCallCallback = async ({ toolCall, messages, args }) => {
      expectTypeOf(toolCall).toEqualTypeOf<UIToolCall>()
      expectTypeOf(toolCall.toolCallId).toEqualTypeOf<string>()
      expectTypeOf(toolCall.toolName).toEqualTypeOf<string>()
      expectTypeOf(toolCall.input).toEqualTypeOf<unknown>()
      expectTypeOf(messages).toEqualTypeOf<Message[]>()
      expectTypeOf(args).toEqualTypeOf<unknown>()
    }
    const legacyToolCallCallback: LegacyToolCallCallback = (args, context) => {
      expectTypeOf(args).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<ToolCallHandlerContext>()
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
      return hasToolCall('lookup')(stopOptions) || stepCountIs(2)(stopOptions)
    }
    const options: UseChatOptions = {
      provider,
      onToolCall: aiSdkToolCallCallback,
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
    const persistOptions: UsePersistOptions<Message[]> = {
      key: 'public-api-test',
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<Error>()
      },
      onLoadError(error) {
        expectTypeOf(error).toEqualTypeOf<Error>()
      },
      onClearError(error) {
        expectTypeOf(error).toEqualTypeOf<Error>()
      }
    }
    const persisted = usePersist(source, persistOptions)
    const serializedMessages = serializeMessages([message])
    const restoredMessages = deserializeMessages(serializedMessages)
    const messagesAreValid = validateMessages(serializedMessages)
    const modelMessages = convertToModelMessages([message])
    const modelRequest: ChatRequest = {
      messages: modelMessages
    }
    const modelMessagesWithOptions = convertToModelMessages([message], {
      preserveIds: true,
      preserveCreatedAt: true,
      stripMetadata: true
    })
    const convertOptions: ConvertToModelMessagesOptions = {
      preserveIds: true,
      ignoreIncompleteToolCalls: true,
      tools: toolSet,
      convertDataPart(part, sourceMessage) {
        expectTypeOf(part).toEqualTypeOf<MessageDataPart>()
        expectTypeOf(sourceMessage).toEqualTypeOf<Message>()
        return { type: 'text', text: part.type }
      }
    }
    const chatPersistOptions: ChatPersistOptions = {
      key: 'public-chat-test',
      storage: null,
      serialize: serializeMessages,
      deserialize: deserializeMessages,
      onError(error) {
        expectTypeOf(error).toEqualTypeOf<Error>()
      },
      onLoadError(error) {
        expectTypeOf(error).toEqualTypeOf<Error>()
      },
      onClearError(error) {
        expectTypeOf(error).toEqualTypeOf<Error>()
      }
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
    expectTypeOf<ChatRequestMessage>().toEqualTypeOf<Message | ModelMessage>()
    expectTypeOf<ChatRequest['messages']>().toEqualTypeOf<ChatRequestMessage[]>()
    expectTypeOf(validateMessages).parameter(0).toEqualTypeOf<unknown>()
    expectTypeOf(validateMessages).returns.toEqualTypeOf<boolean>()
    expectTypeOf(request.messages).toEqualTypeOf<ChatRequestMessage[]>()
    expectTypeOf(modelRequest.messages).toEqualTypeOf<ChatRequestMessage[]>()
    expectTypeOf<PrepareSendMessagesRequestOptions['messages']>().toEqualTypeOf<Message[]>()
    expectTypeOf<ModelMessage>().toEqualTypeOf<{
      role: MessageRole
      content: MessageContent
      name?: string
      toolCallId?: string
      toolCalls?: ToolCall[]
      metadata?: Record<string, unknown>
      id?: string
      createdAt?: Date
    }>()
    expectTypeOf(convertToModelMessages).parameter(0).toEqualTypeOf<Message[]>()
    expectTypeOf(convertToModelMessages)
      .parameter(1)
      .toEqualTypeOf<ConvertToModelMessagesOptions | undefined>()
    expectTypeOf(convertToModelMessages).returns.toEqualTypeOf<ModelMessage[]>()
    expectTypeOf(modelMessages).toEqualTypeOf<ModelMessage[]>()
    expectTypeOf(modelMessagesWithOptions).toEqualTypeOf<ModelMessage[]>()
    expectTypeOf(convertOptions).toEqualTypeOf<ConvertToModelMessagesOptions>()
    expectTypeOf(convertOptions.ignoreIncompleteToolCalls).toEqualTypeOf<boolean | undefined>()
    expectTypeOf(convertOptions.tools).toEqualTypeOf<ToolSet | undefined>()
    expectTypeOf(message.parts).toEqualTypeOf<MessagePart[] | undefined>()
    expectTypeOf(request.threadId).toEqualTypeOf<string | undefined>()
    expectTypeOf(request.forwardedProps).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(request.body).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(request.headers).toEqualTypeOf<HeadersInit | undefined>()
    expectTypeOf(request.metadata).toEqualTypeOf<unknown>()
    expectTypeOf(request.streamProtocol).toEqualTypeOf<ChatStreamProtocol | undefined>()
    expectTypeOf(resumeRequest.threadId).toEqualTypeOf<string | undefined>()
    expectTypeOf(resumeRequest.forwardedProps).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(resumeRequest.body).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(resumeRequest.headers).toEqualTypeOf<HeadersInit | undefined>()
    expectTypeOf(resumeRequest.streamProtocol).toEqualTypeOf<ChatStreamProtocol | undefined>()
    expectTypeOf(prepareSendOptions.trigger).toEqualTypeOf<SendChatTrigger>()
    expectTypeOf(prepareSendOptions.aiSdkTrigger).toEqualTypeOf<AiSdkSendChatTrigger | undefined>()
    expectTypeOf(prepareStepOptions.stepNumber).toEqualTypeOf<number>()
    expectTypeOf(prepareStepOptions.toolCalls).toEqualTypeOf<ToolCall[]>()
    expectTypeOf(prepareReconnectOptions.request).toEqualTypeOf<ChatResumeRequest>()
    expectTypeOf(prepareSend).returns.toEqualTypeOf<
      void | Partial<ChatRequest> | Promise<void | Partial<ChatRequest>>
    >()
    expectTypeOf(prepareModelMessages).toEqualTypeOf<PrepareSendMessagesRequest>()
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
    expectTypeOf(chatThread).toEqualTypeOf<ChatThread<{ owner: string }>>()
    expectTypeOf(serializedChatThread).toEqualTypeOf<SerializedChatThread<{ owner: string }>>()
    expectTypeOf(chatThreadsState).toEqualTypeOf<ChatThreadsState<{ owner: string }>>()
    expectTypeOf(serializedChatThreadsState).toEqualTypeOf<
      SerializedChatThreadsState<{ owner: string }>
    >()
    expectTypeOf(createThreadInput).toEqualTypeOf<CreateChatThreadInput<{ owner: string }>>()
    expectTypeOf(updateThreadInput).toEqualTypeOf<UpdateChatThreadInput<{ owner: string }>>()
    expectTypeOf(chatThreadsPersist).toEqualTypeOf<ChatThreadsPersistOptions<{ owner: string }>>()
    expectTypeOf(chatThreadsOptions).toEqualTypeOf<UseChatThreadsOptions<{ owner: string }>>()
    expectTypeOf(chatThreads).toEqualTypeOf<UseChatThreadsReturn<{ owner: string }>>()
    expectTypeOf(useChatThreads).parameter(0).toEqualTypeOf<UseChatThreadsOptions | undefined>()
    expectTypeOf(serializeChatThreads).parameter(0).toEqualTypeOf<ChatThread[]>()
    expectTypeOf(serializeChatThreads).returns.toEqualTypeOf<SerializedChatThread[]>()
    expectTypeOf(deserializeChatThreads).parameter(0).toEqualTypeOf<unknown>()
    expectTypeOf(deserializeChatThreads).returns.toEqualTypeOf<ChatThread[] | null>()
    expectTypeOf(serializeChatThreadsState).parameter(0).toEqualTypeOf<ChatThreadsState>()
    expectTypeOf(serializeChatThreadsState).returns.toEqualTypeOf<SerializedChatThreadsState>()
    expectTypeOf(deserializeChatThreadsState).parameter(0).toEqualTypeOf<unknown>()
    expectTypeOf(deserializeChatThreadsState).returns.toEqualTypeOf<ChatThreadsState | null>()
    expectTypeOf(chunk).toEqualTypeOf<ChatChunk>()
    expectTypeOf(messagesAreValid).toEqualTypeOf<boolean>()
    expectTypeOf(finishInfo).toEqualTypeOf<ChatFinishInfo>()
    expectTypeOf<UseChatOptions['onFinish']>().toEqualTypeOf<ChatFinishCallback | undefined>()
    expectTypeOf<ChatFinishCallback>().toMatchTypeOf<
      AiSdkChatFinishCallback | LegacyChatFinishCallback
    >()
    expectTypeOf<ChatFinishInfo>().toMatchTypeOf<{
      message: Message
      messages: Message[]
      isAbort: boolean
      isError: boolean
      isDisconnect: boolean
      finishReason?: ChatChunk['finishReason']
    }>()
    expectTypeOf(aiSdkChatFinishCallback).toEqualTypeOf<AiSdkChatFinishCallback>()
    expectTypeOf(legacyChatFinishCallback).toEqualTypeOf<LegacyChatFinishCallback>()
    expectTypeOf(handler).toEqualTypeOf<ToolCallHandler>()
    expectTypeOf(aiSdkToolCallCallback).toEqualTypeOf<AiSdkToolCallCallback>()
    expectTypeOf(legacyToolCallCallback).toEqualTypeOf<LegacyToolCallCallback>()
    expectTypeOf(options.onToolCall).toEqualTypeOf<ToolCallCallback | undefined>()
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
    expectTypeOf(stepCountIs).toEqualTypeOf<typeof isStepCount>()
    expectTypeOf(stepCountIs).returns.toEqualTypeOf<StopWhen>()
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
