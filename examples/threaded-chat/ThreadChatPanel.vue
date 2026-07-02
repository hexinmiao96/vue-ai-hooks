<script setup lang="ts">
import { computed, watch } from 'vue'
import { DirectChatTransport, useChat } from 'vue-ai-hooks'
import type { ChatChunk, ChatRequest, Message, MessageContent } from 'vue-ai-hooks'

interface ThreadStats {
  threadId: string
  messageCount: number
  lastMessagePreview: string
  updatedAt: Date
}

const props = defineProps<{
  threadId: string
  title: string
}>()

const emit = defineEmits<{
  syncThread: [stats: ThreadStats]
}>()

const MESSAGE_STORAGE_VERSION = 1

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function textFromContent(content: MessageContent): string {
  if (typeof content === 'string') return content
  return content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
}

function latestUserPrompt(request: ChatRequest): string {
  const message = [...request.messages].reverse().find((item) => item.role === 'user')
  return message ? textFromContent(message.content) : ''
}

async function* localThreadStream(request: ChatRequest): AsyncIterable<ChatChunk> {
  const prompt = latestUserPrompt(request).trim() || 'Continue this thread.'
  const threadId = request.threadId ?? request.id ?? 'local-thread'
  const priorMessages = Math.max(0, request.messages.length - 1)
  const reply =
    `Saved this turn on ${threadId}. ` +
    `I see ${priorMessages} earlier messages and will keep this answer scoped to "${prompt}".`

  yield {
    dataId: `${threadId}-checkpoint`,
    dataType: 'thread-checkpoint',
    data: {
      threadId,
      persisted: true,
      messageCount: request.messages.length
    }
  }

  for (const part of reply.match(/.{1,28}/g) ?? [reply]) {
    await sleep(24)
    yield { content: part }
  }

  yield {
    finishReason: 'stop',
    usage: {
      promptTokens: request.messages.length * 11,
      completionTokens: 24,
      totalTokens: request.messages.length * 11 + 24
    }
  }
}

const provider = new DirectChatTransport({
  id: 'thread-local',
  streamProtocol: 'chat-chunk',
  stream: localThreadStream
})

const {
  messages,
  input,
  status,
  isLoading,
  streamData,
  error,
  lastRequest,
  lastResponse,
  append,
  handleSubmit,
  stop,
  clear,
  clearTrace
} = useChat({
  id: props.threadId,
  threadId: props.threadId,
  provider,
  persist: {
    key: `vue-ai-hooks:threaded-chat:messages:${props.threadId}`,
    version: MESSAGE_STORAGE_VERSION
  },
  defaultRequest: {
    forwardedProps: { demo: 'threaded-chat' }
  }
})

const canSend = computed(() => !isLoading.value && input.value.trim().length > 0)
const renderedMessages = computed(() =>
  messages.value.map((message) => ({
    id: message.id,
    role: message.role,
    text: textFromContent(message.content),
    createdAt: message.createdAt ? formatTime(message.createdAt) : ''
  }))
)
const traceRows = computed(() => [
  { label: 'Thread', value: props.threadId },
  { label: 'Provider', value: lastRequest.value?.providerId ?? provider.id },
  { label: 'Status', value: status.value },
  { label: 'Response', value: lastResponse.value ? 'stream captured' : 'idle' }
])
const checkpointText = computed(() => {
  const latest = [...streamData.value].reverse().find((part) => part.type === 'thread-checkpoint')
  return latest ? JSON.stringify(latest.data) : 'No stream data yet'
})

watch(
  messages,
  (items) => {
    const latest = lastPreviewMessage(items)
    emit('syncThread', {
      threadId: props.threadId,
      messageCount: items.filter((message) => message.role !== 'system').length,
      lastMessagePreview: latest ? previewText(latest) : '',
      updatedAt: latest?.createdAt ?? new Date()
    })
  },
  { deep: true, immediate: true }
)

function lastPreviewMessage(items: Message[]) {
  return [...items]
    .reverse()
    .find((message) => message.role === 'user' || message.role === 'assistant')
}

function previewText(message: Message) {
  const text = textFromContent(message.content).replace(/\s+/g, ' ').trim()
  return text.length > 96 ? `${text.slice(0, 93)}...` : text
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

async function send(event?: { preventDefault?: () => void }) {
  event?.preventDefault?.()
  if (!canSend.value) return
  await handleSubmit(undefined, {
    metadata: {
      source: 'threaded-chat-demo'
    }
  })
}

async function ask(prompt: string) {
  if (isLoading.value) return
  input.value = ''
  await append(prompt, {
    metadata: {
      source: 'threaded-chat-demo'
    }
  })
}

function clearThreadMessages() {
  clear()
  clearTrace()
}
</script>

<template>
  <article class="chat-panel">
    <header class="panel-header">
      <div>
        <p class="eyebrow">Thread messages</p>
        <h2 class="panel-title">{{ title }}</h2>
      </div>
      <button class="ghost-button" type="button" :disabled="isLoading" @click="clearThreadMessages">
        Clear messages
      </button>
    </header>

    <dl class="trace-panel" aria-label="request trace">
      <div v-for="row in traceRows" :key="row.label" class="trace-item">
        <dt class="trace-label">{{ row.label }}</dt>
        <dd class="trace-value">{{ row.value }}</dd>
      </div>
    </dl>

    <section class="message-list" aria-live="polite">
      <div v-if="renderedMessages.length === 0" class="empty-state">
        <strong>Start a durable thread.</strong>
        <span>
          Create a message, switch threads, refresh, and the restored history stays scoped.
        </span>
        <div class="suggestions">
          <button
            type="button"
            class="suggestion-button"
            @click="ask('Summarize this support case.')"
          >
            Summarize support case
          </button>
          <button type="button" class="suggestion-button" @click="ask('Draft the next reply.')">
            Draft next reply
          </button>
        </div>
      </div>

      <article
        v-for="message in renderedMessages"
        :key="message.id"
        :class="['message', `role-${message.role}`]"
      >
        <header class="message-header">
          <span class="message-role">{{ message.role }}</span>
          <time v-if="message.createdAt" class="message-time">{{ message.createdAt }}</time>
        </header>
        <p class="message-text">{{ message.text || '(empty message)' }}</p>
      </article>
    </section>

    <p v-if="error" class="error-message">{{ error.message }}</p>

    <form class="composer" @submit="send">
      <label class="field-label" for="thread-message">Message</label>
      <textarea
        id="thread-message"
        v-model="input"
        rows="3"
        placeholder="Ask something that should stay in this thread..."
        @keydown.enter.exact.prevent="send()"
      />
      <div class="composer-footer">
        <p class="checkpoint">{{ checkpointText }}</p>
        <div class="composer-actions">
          <button class="primary-button" type="submit" :disabled="!canSend">Send</button>
          <button class="ghost-button" type="button" :disabled="!isLoading" @click="stop">
            Stop
          </button>
        </div>
      </div>
    </form>
  </article>
</template>

<style scoped>
.chat-panel {
  display: grid;
  grid-template-rows: auto auto minmax(260px, 1fr) auto auto;
  min-height: calc(100vh - 118px);
  min-width: 0;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.panel-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 18px;
  border-bottom: 1px solid #e4e9f2;
}

.eyebrow {
  margin: 0 0 3px;
  color: #526070;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.panel-title {
  margin: 0;
  font-size: 20px;
  letter-spacing: 0;
}

.trace-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 18px;
  margin: 0;
  border-bottom: 1px solid #e4e9f2;
}

.trace-item {
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #f8fafc;
}

.trace-label {
  color: #526070;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.trace-value {
  margin: 3px 0 0;
  overflow-wrap: anywhere;
  color: #172033;
  font-size: 13px;
  font-weight: 700;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 18px;
  overflow: auto;
  background: #fbfcff;
}

.empty-state {
  display: grid;
  gap: 8px;
  max-width: 560px;
  padding: 18px;
  border: 1px dashed #9fb0c5;
  border-radius: 8px;
  color: #334155;
  background: #ffffff;
}

.empty-state strong {
  color: #172033;
  font-size: 18px;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.suggestion-button {
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  color: #1d4ed8;
  background: #eff6ff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.message {
  max-width: min(720px, 86%);
  padding: 10px 12px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  background: #ffffff;
}

.role-user {
  align-self: flex-end;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.role-assistant {
  align-self: flex-start;
  border-color: #d8dee9;
  background: #ffffff;
}

.message-header {
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 4px;
}

.message-role,
.message-time {
  color: #526070;
  font-size: 12px;
}

.message-role {
  font-weight: 700;
  text-transform: uppercase;
}

.message-text {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.error-message {
  margin: 0;
  padding: 10px 18px;
  color: #9f1239;
  border-top: 1px solid #fecdd3;
  background: #fff1f2;
}

.composer {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-top: 1px solid #e4e9f2;
}

.field-label {
  color: #526070;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.composer textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #c8d1df;
  border-radius: 8px;
  color: #172033;
  font: inherit;
  resize: vertical;
}

.composer textarea:focus {
  border-color: #2563eb;
  outline: 3px solid #bfdbfe;
}

.composer-footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.checkpoint {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #526070;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.primary-button,
.ghost-button {
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 8px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  color: #ffffff;
  background: #2563eb;
}

.primary-button:disabled,
.ghost-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.ghost-button {
  color: #334155;
  border-color: #c8d1df;
  background: #ffffff;
}

@media (max-width: 720px) {
  .chat-panel {
    min-height: auto;
  }

  .panel-header,
  .composer-footer {
    grid-template-columns: 1fr;
  }

  .trace-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .message {
    max-width: 100%;
  }

  .composer-actions {
    justify-content: flex-start;
  }
}
</style>
