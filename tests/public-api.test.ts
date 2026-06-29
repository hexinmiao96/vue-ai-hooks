import { ref, type Ref } from 'vue'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  AiHooksError,
  anthropic,
  deserializeMessages,
  gemini,
  hasToolCall,
  isStepCount,
  lastAssistantMessageIsCompleteWithToolCalls,
  openai,
  openaiCompatible,
  openrouter,
  pruneMessages,
  proxyProvider,
  serializeMessages,
  useChat,
  useCompletion,
  useEmbedding,
  useGeneration,
  useObject,
  usePersist
} from 'vue-ai-hooks'
import type {
  AiRequestStatus,
  AddToolOutputOptions,
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
  ContentPart,
  DataPartSchema,
  DataPartSchemas,
  DataPartValidator,
  DeepPartial,
  EmbeddingRequestInfo,
  EmbeddingRequest,
  EmbeddingResponseInfo,
  EmbeddingResult,
  GeminiConfig,
  GenerateOptions,
  GenerationFetcher,
  GenerationRequestInfo,
  GenerationResponseInfo,
  GenerationRunContext,
  IdGenerator,
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
  RetryContext,
  RetryOptions,
  ResumeChatOptions,
  ResponseFormat,
  SendAutomaticallyWhen,
  SendAutomaticallyWhenOptions,
  SendChatMessageInput,
  SetMessagesInput,
  SendChatTrigger,
  SerializedMessage,
  ChatStatus,
  StopWhen,
  StopWhenOptions,
  StreamDataPart,
  StreamThrottleOptions,
  TextPart,
  TokenUsage,
  Tool,
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
  UseObjectOptions,
  UseObjectReturn,
  UsePersistOptions
} from 'vue-ai-hooks'

const provider: ChatProvider = openaiCompatible({
  apiKey: 'test-key',
  baseURL: 'https://example.test/v1'
})

function assertInvalidPublicApiUsage() {
  // @ts-expect-error provider is required by the public useEmbedding contract.
  useEmbedding({})
  // @ts-expect-error provider and schema are required by the public useObject contract.
  useObject({})
}

describe('public API types', () => {
  it('exports provider factories as ChatProvider-compatible values', () => {
    expectTypeOf(openai({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(openrouter({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(gemini({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(proxyProvider()).toEqualTypeOf<ChatProvider>()
    expectTypeOf(anthropic({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf<OpenAiLikeConfig>().toMatchTypeOf<{ apiKey: string; baseURL: string }>()
    expectTypeOf<OpenRouterConfig>().toMatchTypeOf<{ apiKey: string; siteUrl?: string }>()
    expectTypeOf<GeminiConfig>().toMatchTypeOf<{ apiKey: string; baseURL?: string }>()
    expectTypeOf<ProxyProviderConfig['chatUrl']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<ProxyProviderConfig['credentials']>().toEqualTypeOf<
      RequestCredentials | undefined
    >()
    const proxyConfig: ProxyProviderConfig = {
      body: ({ kind }) => ({ kind }),
      prepareRequest(context) {
        if (context.kind === 'resume') {
          expectTypeOf(context.request.id).toEqualTypeOf<string>()
        }
        return { headers: { 'X-Test': context.kind } }
      }
    }
    expectTypeOf<ProxyProviderConfig['prepareRequest']>().toMatchTypeOf<
      | ((
          context: ProxyRequestContext
        ) => ProxyRequestOverride | void | Promise<ProxyRequestOverride | void>)
      | undefined
    >()
    expectTypeOf<ProxyRequestKind>().toEqualTypeOf<'chat' | 'completion' | 'embedding' | 'resume'>()
    expectTypeOf(proxyConfig).toEqualTypeOf<ProxyProviderConfig>()
    expectTypeOf<AnthropicConfig>().toMatchTypeOf<{ apiKey: string; maxTokens?: number }>()

    expect(openai({ apiKey: 'test-key' }).id).toBe('openai-compatible')
    expect(openrouter({ apiKey: 'test-key' }).id).toBe('openrouter')
    expect(gemini({ apiKey: 'test-key' }).id).toBe('gemini')
    expect(proxyProvider().id).toBe('proxy')
    expect(anthropic({ apiKey: 'test-key' }).id).toBe('anthropic')
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
    const structured = useObject<{ answer: string }>({
      provider,
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
    expectTypeOf(chat.streamData).toEqualTypeOf<Ref<StreamDataPart[]>>()
    expectTypeOf(typedChat).toEqualTypeOf<UseChatReturn<{ progress: number; label?: string }>>()
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
    expectTypeOf(chat.addToolResult).parameter(0).toEqualTypeOf<string>()
    expectTypeOf(chat.addToolResult).parameter(1).toEqualTypeOf<unknown>()
    expectTypeOf(chat.addToolResult).parameter(2).toEqualTypeOf<Partial<ChatRequest> | undefined>()
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
    expectTypeOf(chat.clearError).toEqualTypeOf<() => void>()
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
    expectTypeOf<UseChatOptions['activeTools']>().toEqualTypeOf<string[] | undefined>()
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
    expectTypeOf<UseEmbeddingOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseGenerationOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseObjectOptions>().toMatchTypeOf<RetryOptions>()
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
    }>()
    expectTypeOf<ChatResponseInfo>().toMatchTypeOf<ChatRequestInfo & { hasStream: boolean }>()
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
      prompt: string
      request: CompletionRequest
    }>()
    expectTypeOf<CompletionResponseInfo>().toMatchTypeOf<
      CompletionRequestInfo & { hasStream: boolean }
    >()
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

    expectTypeOf(embedding).toEqualTypeOf<UseEmbeddingReturn>()
    expectTypeOf(embedding.embeddings).toEqualTypeOf<Ref<number[][]>>()
    expectTypeOf(embedding.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(embedding.clearError).toEqualTypeOf<() => void>()
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
    expectTypeOf(structured.id).toEqualTypeOf<Ref<string>>()
    expectTypeOf(structured.object).toEqualTypeOf<Ref<{ answer: string } | null>>()
    expectTypeOf(structured.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(structured.clearError).toEqualTypeOf<() => void>()
    expectTypeOf(structured.partialObject).toEqualTypeOf<
      Ref<DeepPartial<{ answer: string }> | null>
    >()
    expectTypeOf(structured.submit).returns.toEqualTypeOf<Promise<{ answer: string }>>()
    expectTypeOf(structured.submit).parameter(1).toEqualTypeOf<Partial<ChatRequest> | undefined>()
    expectTypeOf<ObjectRequestInfo>().toMatchTypeOf<{
      providerId: string
      attempt: number
      request: ChatRequest
      messages: Message[]
    }>()
    expectTypeOf<ObjectResponseInfo>().toMatchTypeOf<ObjectRequestInfo & { hasStream: boolean }>()
    expectTypeOf<UseObjectOptions['onRequest']>().toEqualTypeOf<
      ((info: ObjectRequestInfo) => void) | undefined
    >()
    expectTypeOf<UseObjectOptions['onResponse']>().toEqualTypeOf<
      ((info: ObjectResponseInfo) => void) | undefined
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
    const tool: Tool = {
      type: 'function',
      function: {
        name: 'lookup',
        parameters: { type: 'object' }
      }
    }
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
      metadata: { traceId: 'trace_1' },
      tools: [tool],
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
      headers: { 'X-Trace': 'resume_1' }
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
    expectTypeOf(request.metadata).toEqualTypeOf<unknown>()
    expectTypeOf(resumeRequest.threadId).toEqualTypeOf<string | undefined>()
    expectTypeOf(resumeRequest.forwardedProps).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(resumeRequest.body).toEqualTypeOf<Record<string, unknown> | undefined>()
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
    expectTypeOf<EmbeddingRequest['body']>().toEqualTypeOf<Record<string, unknown> | undefined>()
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
