import { ref, type Ref } from 'vue'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  AiHooksError,
  anthropic,
  deserializeMessages,
  gemini,
  openai,
  openaiCompatible,
  openrouter,
  pruneMessages,
  proxyProvider,
  serializeMessages,
  useChat,
  useCompletion,
  useEmbedding,
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
  ChatResumeRequest,
  CompletionFinishInfo,
  CompletionRequest,
  ContentPart,
  DeepPartial,
  EmbeddingRequest,
  EmbeddingResult,
  GeminiConfig,
  IdGenerator,
  ImageUrlPart,
  Message,
  MessageContent,
  MessageDataPart,
  MessageFilePart,
  MessagePart,
  MessageReasoningPart,
  MessageRole,
  MessageSourcePart,
  MessageTextPart,
  MessageToolPart,
  OpenAiLikeConfig,
  OpenRouterConfig,
  PrepareReconnectToStreamRequest,
  PrepareReconnectToStreamRequestOptions,
  PrepareSendMessagesRequest,
  PrepareSendMessagesRequestOptions,
  PruneMessagesOptions,
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
  SetMessagesInput,
  SendChatTrigger,
  SerializedMessage,
  ChatStatus,
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
  UseObjectOptions,
  UseObjectReturn,
  UsePersistOptions
} from 'vue-ai-hooks'

const provider: ChatProvider = openaiCompatible({
  apiKey: 'test-key',
  baseURL: 'https://example.test/v1'
})

function assertInvalidPublicApiUsage() {
  // @ts-expect-error provider is required by the public useChat contract.
  useChat({})
  // @ts-expect-error provider is required by the public useCompletion contract.
  useCompletion({})
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
    const completion = useCompletion({ provider } satisfies UseCompletionOptions)
    const embedding = useEmbedding({ provider } satisfies UseEmbeddingOptions)
    const structured = useObject<{ answer: string }>({
      provider,
      schema: { type: 'object' }
    } satisfies UseObjectOptions<{ answer: string }>)

    expectTypeOf(chat).toEqualTypeOf<UseChatReturn>()
    expectTypeOf(chat.id).toEqualTypeOf<Ref<string>>()
    expectTypeOf(chat.messages).toEqualTypeOf<Ref<Message[]>>()
    expectTypeOf(chat.status).toEqualTypeOf<Ref<ChatStatus>>()
    expectTypeOf<ChatStatus>().toEqualTypeOf<AiRequestStatus>()
    expectTypeOf(chat.usage).toEqualTypeOf<Ref<TokenUsage | null>>()
    expectTypeOf(chat.streamData).toEqualTypeOf<Ref<StreamDataPart[]>>()
    expectTypeOf(chat.pendingToolCalls).toEqualTypeOf<Ref<ToolCall[]>>()
    expectTypeOf(chat.append).parameter(0).toEqualTypeOf<string | Message>()
    expectTypeOf(chat.append).parameter(1).toEqualTypeOf<AppendChatOptions | undefined>()
    expectTypeOf(chat.sendMessage).parameter(0).toEqualTypeOf<string | Message>()
    expectTypeOf(chat.sendMessage).parameter(1).toEqualTypeOf<AppendChatOptions | undefined>()
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
    expectTypeOf<UseChatOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseCompletionOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseEmbeddingOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseObjectOptions>().toMatchTypeOf<RetryOptions>()
    expectTypeOf<UseChatOptions>().toMatchTypeOf<StreamThrottleOptions>()
    expectTypeOf<UseCompletionOptions>().toMatchTypeOf<StreamThrottleOptions>()
    expectTypeOf<UseObjectOptions>().toMatchTypeOf<StreamThrottleOptions>()
    expectTypeOf<RetryContext>().toMatchTypeOf<{ attempt: number; maxRetries: number }>()
    expectTypeOf<StreamThrottleOptions>().toMatchTypeOf<{
      throttleMs?: number
      experimental_throttle?: number
    }>()
    expectTypeOf<UseChatOptions['generateId']>().toEqualTypeOf<IdGenerator | undefined>()
    expectTypeOf<UseChatOptions['initialInput']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UseChatOptions['prepareSendMessagesRequest']>().toEqualTypeOf<
      PrepareSendMessagesRequest | undefined
    >()
    expectTypeOf<UseChatOptions['prepareReconnectToStreamRequest']>().toEqualTypeOf<
      PrepareReconnectToStreamRequest | undefined
    >()
    expectTypeOf(pruneMessages).parameter(0).toEqualTypeOf<PruneMessagesOptions>()
    expectTypeOf(pruneMessages).returns.toEqualTypeOf<Message[]>()
    expectTypeOf<PruneToolCallsStrategy>().toEqualTypeOf<
      'none' | 'all' | 'before-last-message' | `before-last-${number}-messages`
    >()
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

    expectTypeOf(embedding).toEqualTypeOf<UseEmbeddingReturn>()
    expectTypeOf(embedding.embeddings).toEqualTypeOf<Ref<number[][]>>()
    expectTypeOf(embedding.status).toEqualTypeOf<Ref<AiRequestStatus>>()
    expectTypeOf(embedding.clearError).toEqualTypeOf<() => void>()
    expectTypeOf(embedding.embed).returns.toEqualTypeOf<Promise<EmbeddingResult>>()
    expectTypeOf(embedding.embed).parameter(0).toEqualTypeOf<string | string[]>()
    expectTypeOf(embedding.embed)
      .parameter(1)
      .toEqualTypeOf<Partial<EmbeddingRequest> | undefined>()

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
      messages: [message],
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
      body: { resumeReason: 'manual' },
      metadata: { traceId: 'resume_1' },
      headers: { 'X-Trace': 'resume_1' }
    }
    const responseFormat: ResponseFormat = { type: 'json_object' }
    const appendOptions: AppendChatOptions = {
      messageId: 'msg_1',
      temperature: 0.2,
      attachments: [attachment, fileAttachment]
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
      finishReason: 'stop'
    }
    const handler: ToolCallHandler = async (args, context) => {
      expectTypeOf(args).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<ToolCallHandlerContext>()
      return { ok: true }
    }
    const requiresToolApproval: ToolApprovalPredicate = (args, context) => {
      expectTypeOf(args).toEqualTypeOf<unknown>()
      expectTypeOf(context.toolCall).toEqualTypeOf<ToolCall>()
      return context.toolCall.function.name === 'lookup'
    }
    const options: UseChatOptions = {
      provider,
      requiresToolApproval
    }
    const resultContext: ToolResultHandlerContext = {
      args: { q: 'vue' },
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
    expectTypeOf(request.body).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(request.metadata).toEqualTypeOf<unknown>()
    expectTypeOf(resumeRequest.body).toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(prepareSendOptions.trigger).toEqualTypeOf<SendChatTrigger>()
    expectTypeOf(prepareReconnectOptions.request).toEqualTypeOf<ChatResumeRequest>()
    expectTypeOf(prepareSend).returns.toEqualTypeOf<
      void | Partial<ChatRequest> | Promise<void | Partial<ChatRequest>>
    >()
    expectTypeOf(prepareReconnect).returns.toEqualTypeOf<
      void | Partial<ChatResumeRequest> | Promise<void | Partial<ChatResumeRequest>>
    >()
    expectTypeOf<CompletionRequest['body']>().toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf<EmbeddingRequest['body']>().toEqualTypeOf<Record<string, unknown> | undefined>()
    expectTypeOf(appendOptions).toEqualTypeOf<AppendChatOptions>()
    expectTypeOf(appendOptions.attachments).toEqualTypeOf<ChatAttachmentsInput | undefined>()
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
      finishReason?: ChatChunk['finishReason']
    }>()
    expectTypeOf(handler).toEqualTypeOf<ToolCallHandler>()
    expectTypeOf(options.requiresToolApproval).toEqualTypeOf<ToolApprovalPredicate | undefined>()
    expectTypeOf(resultContext).toEqualTypeOf<ToolResultHandlerContext>()
    expectTypeOf(persisted.clear).toEqualTypeOf<() => void>()
    expectTypeOf(serializedMessages).toEqualTypeOf<SerializedMessage[]>()
    expectTypeOf(restoredMessages).toEqualTypeOf<Message[] | null>()
    expectTypeOf(chatPersistOptions).toEqualTypeOf<ChatPersistOptions>()
    expectTypeOf<UseChatOptions['persist']>().toEqualTypeOf<ChatPersistOptions | undefined>()
    expect(new AiHooksError('typed')).toBeInstanceOf(Error)
  })
})
