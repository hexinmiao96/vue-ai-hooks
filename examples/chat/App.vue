<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useChat, gemini, openai, openrouter, proxyProvider } from 'vue-ai-hooks'
import type {
  ChatChunk,
  ChatProvider,
  ChatRequest,
  ImageUrlPart,
  MessageContent,
  Tool,
  ToolCall
} from 'vue-ai-hooks'

type ProviderType = 'openai' | 'openrouter' | 'gemini' | 'proxy' | 'local-tools'

type CheckoutArgs = {
  orderId: string
  plan: string
  amount: number
  currency: string
}

/**
 * Runtime provider selection for the chat example:
 * - `VITE_CHAT_PROVIDER=openrouter` selects openrouter.
 * - `VITE_CHAT_PROVIDER=gemini` selects Gemini's OpenAI-compatible endpoint.
 * - `VITE_CHAT_PROVIDER=proxy` selects your app backend proxy.
 * - `VITE_CHAT_PROVIDER=local-tools` runs the tool approval demo without keys.
 * - any other value (or missing value) defaults to openai.
 *
 * - openai: created via `openai` and reads `VITE_OPENAI_KEY` + optional
 *   `VITE_OPENAI_BASE_URL`.
 * - openrouter: created via `openrouter` and reads `VITE_OPENROUTER_*` vars.
 * - gemini: created via `gemini` and reads `VITE_GEMINI_*` vars.
 * - proxy: created via `proxyProvider` and reads `VITE_PROXY_*` vars.
 * - local-tools: deterministic fake provider for testing approval UI locally.
 *
 * Start the demo:
 *   pnpm install
 *   pnpm example:chat
 *   open http://localhost:5174
 */
const providerName = import.meta.env.VITE_CHAT_PROVIDER || import.meta.env.VITE_EXAMPLE_PROVIDER
const providerType: ProviderType =
  providerName === 'openrouter'
    ? 'openrouter'
    : providerName === 'gemini'
      ? 'gemini'
      : providerName === 'proxy'
        ? 'proxy'
        : providerName === 'local-tools'
          ? 'local-tools'
          : 'openai'
const proxyCredentials = (import.meta.env.VITE_PROXY_CREDENTIALS || undefined) as
  | RequestCredentials
  | undefined

const checkoutArgs: CheckoutArgs = {
  orderId: 'ord_demo_1042',
  plan: 'Team plan',
  amount: 49,
  currency: 'USD'
}

const chargeCardTool: Tool = {
  type: 'function',
  function: {
    name: 'chargeCard',
    description: 'Charge a saved card after explicit user approval.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        plan: { type: 'string' },
        amount: { type: 'number' },
        currency: { type: 'string' }
      },
      required: ['orderId', 'plan', 'amount', 'currency']
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function safeJson(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function checkoutFromCall(call: ToolCall): CheckoutArgs {
  return {
    ...checkoutArgs,
    ...safeJson(call.function.arguments)
  }
}

async function* localToolStream(request: ChatRequest): AsyncIterable<ChatChunk> {
  const lastTool = [...request.messages].reverse().find((message) => message.role === 'tool')
  await sleep(80)

  if (lastTool) {
    const result = safeJson(String(lastTool.content))
    const text =
      result.approved === false
        ? 'Checkout cancelled. No card was charged, and the order is still pending.'
        : `Approved. Receipt ${result.receiptId} is ready for ${result.currency} ${result.amount}.`

    for (const part of text.match(/.{1,24}/g) ?? [text]) {
      await sleep(30)
      yield { content: part }
    }
    yield {
      finishReason: 'stop',
      usage: { promptTokens: 42, completionTokens: 18, totalTokens: 60 }
    }
    return
  }

  yield { content: 'I can prepare checkout, but charging the card needs approval first.' }
  await sleep(80)
  yield {
    toolCalls: [
      {
        index: 0,
        id: 'call_charge_card',
        type: 'function',
        function: {
          name: 'chargeCard',
          arguments: JSON.stringify(checkoutArgs)
        }
      }
    ]
  }
  yield { finishReason: 'tool_calls' }
}

const localToolProvider: ChatProvider = {
  id: 'local-tools',
  async chat(request) {
    return localToolStream(request)
  },
  async completion() {
    return (async function* () {
      yield ''
    })()
  },
  async embedding() {
    return { embeddings: [], model: 'local-tools', usage: { promptTokens: 0, totalTokens: 0 } }
  }
}
/**
 * Build the concrete provider instance used by this example so the compose logic
 * stays explicit and easy to compare in logs and screenshots.
 */
const provider =
  providerType === 'local-tools'
    ? localToolProvider
    : providerType === 'openrouter'
      ? openrouter({
          // Keep app-scoped identity headers configurable for OpenRouter quotas/rules.
          apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
          defaultModel: import.meta.env.VITE_OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini',
          siteUrl: import.meta.env.VITE_OPENROUTER_SITE_URL,
          appName: import.meta.env.VITE_OPENROUTER_APP_NAME || 'Vue AI Hooks'
        })
      : providerType === 'gemini'
        ? gemini({
            // Gemini uses Google's OpenAI-compatible base by default.
            apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
            defaultModel: import.meta.env.VITE_GEMINI_DEFAULT_MODEL || 'gemini-3.5-flash',
            baseURL: import.meta.env.VITE_GEMINI_BASE_URL
          })
        : providerType === 'proxy'
          ? proxyProvider({
              // Browser requests go to your app backend; upstream keys stay server-side.
              chatUrl: import.meta.env.VITE_PROXY_CHAT_URL || '/api/ai/chat',
              baseURL: import.meta.env.VITE_PROXY_BASE_URL,
              credentials: proxyCredentials,
              headers: import.meta.env.VITE_PROXY_AUTH_TOKEN
                ? { Authorization: `Bearer ${import.meta.env.VITE_PROXY_AUTH_TOKEN}` }
                : undefined
            })
          : openai({
              // Default path is https://api.openai.com/v1 if baseURL is omitted.
              apiKey: import.meta.env.VITE_OPENAI_KEY || '',
              baseURL: import.meta.env.VITE_OPENAI_BASE_URL
            })

const chunkCount = shallowRef(0)
const approvalLog = shallowRef('No approval decision yet.')
const fileInput = shallowRef<HTMLInputElement | null>(null)
const selectedFiles = shallowRef<File[]>([])

// useChat returns both message stream state and imperative controls.
// - messages/input: render + editor binding
// - isLoading: controls request button states
// - handleSubmit/append/stop: form submit, custom send, and cancel lifecycle hooks
// - error: synchronous rendering of transport/composition failures
const {
  messages,
  input,
  isLoading,
  append,
  handleSubmit,
  stop,
  error,
  pendingToolCalls,
  approveToolCall,
  rejectToolCall
} = useChat({
  provider,
  tools: [chargeCardTool],
  toolHandlers: {
    chargeCard(args) {
      const checkout = { ...checkoutArgs, ...(args as Partial<CheckoutArgs>) }
      approvalLog.value = `Approved ${checkout.orderId} for ${checkout.currency} ${checkout.amount}.`
      return {
        charged: true,
        receiptId: 'rcpt_demo_1042',
        ...checkout
      }
    }
  },
  requiresToolApproval(_args, context) {
    return context.toolCall.function.name === 'chargeCard'
  },
  onChunk: () => {
    chunkCount.value += 1
  },
  onError: (e) => console.error('chat error:', e)
})

const pendingApprovals = computed(() =>
  pendingToolCalls.value
    .filter((call) => call.function.name === 'chargeCard')
    .map((call) => ({
      id: call.id,
      name: call.function.name,
      args: checkoutFromCall(call)
    }))
)

const canStartDemo = computed(() => !isLoading.value && pendingApprovals.value.length === 0)
const canSend = computed(
  () => !isLoading.value && (input.value.trim().length > 0 || selectedFiles.value.length > 0)
)

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  selectedFiles.value = Array.from(target.files ?? [])
}

function clearSelectedFiles() {
  selectedFiles.value = []
  if (fileInput.value) fileInput.value.value = ''
}

function messageText(content: MessageContent): string {
  if (typeof content === 'string') return content
  return content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n\n')
}

function messageImages(content: MessageContent): ImageUrlPart[] {
  if (typeof content === 'string') return []
  return content.filter((part): part is ImageUrlPart => part.type === 'image_url')
}

/**
 * Send current input as a new user message when valid and idle.
 *
 * This guard prevents accidental empty submits and duplicate in-flight requests.
 */
async function send(event?: { preventDefault?: () => void }) {
  event?.preventDefault?.()
  // Ignore empty input or duplicate sends while a request is already running.
  if (!canSend.value) return
  chunkCount.value = 0
  await handleSubmit(undefined, {
    attachments: selectedFiles.value.length ? selectedFiles.value : undefined
  })
  clearSelectedFiles()
}

async function startApprovalDemo() {
  if (!canStartDemo.value) return
  chunkCount.value = 0
  approvalLog.value = 'Waiting for checkout approval.'
  input.value = ''
  clearSelectedFiles()
  await append('Run the checkout approval demo.')
}

async function approveCheckout(callId: string) {
  await approveToolCall(callId)
}

async function rejectCheckout(callId: string) {
  approvalLog.value = 'Rejected checkout request.'
  await rejectToolCall(callId, 'User denied checkout')
}
</script>

<template>
  <main class="chat">
    <h1>vue-ai-hooks · useChat</h1>
    <p v-if="error" class="error">
      {{ error.message }}
    </p>
    <p class="provider-badge">Provider: {{ providerType }} · chunks: {{ chunkCount }}</p>
    <button class="demo-trigger" :disabled="!canStartDemo" @click="startApprovalDemo">
      Run approval demo
    </button>

    <section class="messages">
      <article v-for="m in messages" :key="m.id" :class="['message', `role-${m.role}`]">
        <header>{{ m.role }}</header>
        <p v-if="messageText(m.content)" class="message-text">{{ messageText(m.content) }}</p>
        <div v-if="messageImages(m.content).length" class="message-images">
          <img
            v-for="image in messageImages(m.content)"
            :key="image.image_url.url"
            :src="image.image_url.url"
            alt="Attached image preview"
          />
        </div>
        <ul v-if="m.toolCalls?.length" class="tool-call-list" aria-label="tool calls">
          <li v-for="call in m.toolCalls" :key="call.id">requested {{ call.function.name }}</li>
        </ul>
      </article>
    </section>

    <section v-if="pendingApprovals.length" class="approval-panel" aria-live="polite">
      <article v-for="approval in pendingApprovals" :key="approval.id" class="approval-request">
        <div class="approval-heading">
          <span>Approval required</span>
          <strong>{{ approval.name }}</strong>
        </div>
        <dl>
          <div>
            <dt>Order</dt>
            <dd>{{ approval.args.orderId }}</dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>{{ approval.args.plan }}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{{ approval.args.currency }} {{ approval.args.amount }}</dd>
          </div>
        </dl>
        <div class="approval-actions">
          <button class="approve" :disabled="isLoading" @click="approveCheckout(approval.id)">
            Approve
          </button>
          <button class="reject" :disabled="isLoading" @click="rejectCheckout(approval.id)">
            Reject
          </button>
        </div>
      </article>
    </section>

    <p class="approval-log">{{ approvalLog }}</p>

    <form class="composer" @submit="send">
      <textarea
        v-model="input"
        rows="3"
        placeholder="Say something..."
        @keydown.enter.exact.prevent="send()"
      />
      <label class="file-picker">
        <span>Attach image/text</span>
        <input
          ref="fileInput"
          type="file"
          accept="image/*,text/*"
          multiple
          @change="handleFileChange"
        />
      </label>
      <ul v-if="selectedFiles.length" class="selected-files" aria-label="selected files">
        <li v-for="file in selectedFiles" :key="`${file.name}-${file.size}`">
          {{ file.name || file.type || 'attachment' }}
        </li>
      </ul>
      <div class="actions">
        <button :disabled="!canSend">Send</button>
        <button type="button" :disabled="!isLoading" @click="stop">Stop</button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.chat {
  max-width: 760px;
  margin: 32px auto;
  font-family: system-ui, sans-serif;
  color: #172033;
}
h1 {
  font-size: 18px;
}
.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}
.message {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.message header {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}
.message-text {
  white-space: pre-wrap;
}
.message-images {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}
.message-images img {
  max-width: min(100%, 320px);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
}
.role-user {
  background: #f0f7ff;
}
.role-assistant {
  background: #f7f7f7;
}
.role-tool {
  background: #f2fbf6;
}
.tool-call-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  margin: 8px 0 0;
  list-style: none;
}
.tool-call-list li {
  padding: 4px 8px;
  border: 1px solid #f59e0b;
  border-radius: 999px;
  color: #92400e;
  background: #fffbeb;
  font-size: 12px;
}
.approval-panel {
  display: grid;
  gap: 12px;
  margin: 16px 0;
}
.approval-request {
  padding: 14px;
  border: 1px solid #f97316;
  border-radius: 8px;
  background: #fff7ed;
}
.approval-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.approval-heading span {
  color: #9a3412;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.approval-heading strong {
  color: #172033;
}
.approval-request dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 12px;
}
.approval-request dt {
  color: #64748b;
  font-size: 12px;
}
.approval-request dd {
  margin: 3px 0 0;
  font-weight: 700;
}
.approval-actions {
  display: flex;
  gap: 8px;
}
.approval-log {
  min-height: 18px;
  margin: 0 0 12px;
  color: #475569;
  font-size: 13px;
}
.composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
textarea {
  width: 100%;
  padding: 8px;
  font: inherit;
}
.file-picker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #334155;
  font-size: 13px;
}
.file-picker input {
  max-width: 100%;
}
.selected-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}
.selected-files li {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
}
.actions {
  display: flex;
  gap: 8px;
}
button {
  padding: 8px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  color: #172033;
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.demo-trigger {
  margin-bottom: 4px;
  border-color: #2563eb;
  color: #1d4ed8;
}
.approve {
  border-color: #16a34a;
  background: #16a34a;
  color: #ffffff;
}
.reject {
  border-color: #dc2626;
  color: #b91c1c;
}
.error {
  color: #b00020;
}
.provider-badge {
  margin: 0 0 12px;
  font-size: 12px;
  color: #334155;
}
@media (max-width: 640px) {
  .chat {
    margin: 20px 12px;
  }
  .approval-request dl {
    grid-template-columns: 1fr;
  }
}
</style>
