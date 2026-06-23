import { ref, type Ref } from 'vue'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  AiHooksError,
  anthropic,
  openai,
  openaiCompatible,
  openrouter,
  useChat,
  useCompletion,
  useEmbedding,
  usePersist
} from 'vue-ai-hooks'
import type {
  AnthropicConfig,
  ChatChunk,
  ChatProvider,
  ChatRequest,
  CompletionRequest,
  ContentPart,
  EmbeddingRequest,
  EmbeddingResult,
  ImageUrlPart,
  Message,
  MessageContent,
  MessageRole,
  OpenAiLikeConfig,
  OpenRouterConfig,
  TextPart,
  Tool,
  ToolCall,
  ToolCallHandler,
  ToolCallHandlerContext,
  UseChatOptions,
  UseChatReturn,
  UseCompletionOptions,
  UseCompletionReturn,
  UseEmbeddingOptions,
  UseEmbeddingReturn,
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
}

describe('public API types', () => {
  it('exports provider factories as ChatProvider-compatible values', () => {
    expectTypeOf(openai({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(openrouter({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf(anthropic({ apiKey: 'test-key' })).toEqualTypeOf<ChatProvider>()
    expectTypeOf<OpenAiLikeConfig>().toMatchTypeOf<{ apiKey: string; baseURL: string }>()
    expectTypeOf<OpenRouterConfig>().toMatchTypeOf<{ apiKey: string; siteUrl?: string }>()
    expectTypeOf<AnthropicConfig>().toMatchTypeOf<{ apiKey: string; maxTokens?: number }>()

    expect(openai({ apiKey: 'test-key' }).id).toBe('openai-compatible')
    expect(openrouter({ apiKey: 'test-key' }).id).toBe('openrouter')
    expect(anthropic({ apiKey: 'test-key' }).id).toBe('anthropic')
  })

  it('keeps composable return types stable for consumers', () => {
    const chat = useChat({ provider } satisfies UseChatOptions)
    const completion = useCompletion({ provider } satisfies UseCompletionOptions)
    const embedding = useEmbedding({ provider } satisfies UseEmbeddingOptions)

    expectTypeOf(chat).toEqualTypeOf<UseChatReturn>()
    expectTypeOf(chat.messages).toEqualTypeOf<Ref<Message[]>>()
    expectTypeOf(chat.append).parameter(0).toEqualTypeOf<string | Message>()
    expectTypeOf(chat.append).parameter(1).toEqualTypeOf<Partial<ChatRequest> | undefined>()

    expectTypeOf(completion).toEqualTypeOf<UseCompletionReturn>()
    expectTypeOf(completion.completion).toEqualTypeOf<Ref<string>>()
    expectTypeOf(completion.complete).returns.toEqualTypeOf<Promise<string>>()
    expectTypeOf(completion.complete)
      .parameter(1)
      .toEqualTypeOf<Partial<CompletionRequest> | undefined>()

    expectTypeOf(embedding).toEqualTypeOf<UseEmbeddingReturn>()
    expectTypeOf(embedding.embeddings).toEqualTypeOf<Ref<number[][]>>()
    expectTypeOf(embedding.embed).returns.toEqualTypeOf<Promise<EmbeddingResult>>()
    expectTypeOf(embedding.embed).parameter(0).toEqualTypeOf<string | string[]>()
    expectTypeOf(embedding.embed)
      .parameter(1)
      .toEqualTypeOf<Partial<EmbeddingRequest> | undefined>()

    expectTypeOf(assertInvalidPublicApiUsage).returns.toEqualTypeOf<void>()
  })

  it('exports request, message, tool, and persistence contracts', () => {
    const role: MessageRole = 'user'
    const text: TextPart = { type: 'text', text: 'hello' }
    const image: ImageUrlPart = {
      type: 'image_url',
      image_url: { url: 'https://example.test/image.png', detail: 'auto' }
    }
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
      toolCalls: [toolCall],
      metadata: { source: 'type-test' }
    }
    const request: ChatRequest = {
      messages: [message],
      tools: [tool],
      toolChoice: { type: 'function', function: { name: 'lookup' } }
    }
    const chunk: ChatChunk = {
      content: 'ok',
      finishReason: 'stop',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }
    }
    const handler: ToolCallHandler = async (args, context) => {
      expectTypeOf(args).toEqualTypeOf<unknown>()
      expectTypeOf(context).toEqualTypeOf<ToolCallHandlerContext>()
      return { ok: true }
    }
    const source = ref<Message[]>([])
    const persistOptions: UsePersistOptions<Message[]> = { key: 'public-api-test' }
    const persisted = usePersist(source, persistOptions)

    expectTypeOf<ContentPart>().toEqualTypeOf<TextPart | ImageUrlPart>()
    expectTypeOf(request.messages).toEqualTypeOf<Message[]>()
    expectTypeOf(chunk).toEqualTypeOf<ChatChunk>()
    expectTypeOf(handler).toEqualTypeOf<ToolCallHandler>()
    expectTypeOf(persisted.clear).toEqualTypeOf<() => void>()
    expect(new AiHooksError('typed')).toBeInstanceOf(Error)
  })
})
