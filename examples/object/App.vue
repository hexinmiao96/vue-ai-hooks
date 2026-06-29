<script setup lang="ts">
import { computed } from 'vue'
import { useObject, gemini, openai, openrouter, proxyProvider } from 'vue-ai-hooks'
import type { ChatChunk, ChatProvider, ChatRequest, MessageContent } from 'vue-ai-hooks'

type ProviderType = 'openai' | 'openrouter' | 'gemini' | 'proxy' | 'local-object'

type Ticket = {
  title: string
  priority: 'low' | 'high'
}

const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    priority: { type: 'string', enum: ['low', 'high'] }
  },
  required: ['title', 'priority'],
  additionalProperties: false
}

const configuredProvider =
  import.meta.env.VITE_EXAMPLE_PROVIDER || import.meta.env.VITE_CHAT_PROVIDER
const openAiKey = (import.meta.env.VITE_OPENAI_KEY || '').trim()
const providerName =
  configuredProvider || (openAiKey && openAiKey !== 'sk-...' ? 'openai' : 'local-object')
const providerType: ProviderType =
  providerName === 'openrouter'
    ? 'openrouter'
    : providerName === 'gemini'
      ? 'gemini'
      : providerName === 'proxy'
        ? 'proxy'
        : providerName === 'local-object'
          ? 'local-object'
          : 'openai'
const proxyCredentials = (import.meta.env.VITE_PROXY_CREDENTIALS || undefined) as
  | RequestCredentials
  | undefined

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function contentText(content: MessageContent) {
  if (typeof content === 'string') return content
  return content
    .map((part) => (part.type === 'text' ? part.text : ''))
    .filter(Boolean)
    .join(' ')
}

function latestUserPrompt(request: ChatRequest) {
  const message = [...request.messages].reverse().find((item) => item.role === 'user')
  return message ? contentText(message.content) : ''
}

function ticketFromPrompt(prompt: string): Ticket {
  const normalized = prompt.replace(/\s+/g, ' ').trim() || 'Customer needs help'
  return {
    title: normalized.length > 52 ? `${normalized.slice(0, 49)}...` : normalized,
    priority: /urgent|blocked|down|无法|紧急|阻塞/i.test(normalized) ? 'high' : 'low'
  }
}

async function* localObjectStream(request: ChatRequest): AsyncIterable<ChatChunk> {
  const text = JSON.stringify(ticketFromPrompt(latestUserPrompt(request)))
  const midpoint = Math.ceil(text.length / 2)
  await sleep(100)
  yield { content: text.slice(0, midpoint) }
  await sleep(100)
  yield { content: text.slice(midpoint) }
  yield {
    finishReason: 'stop',
    usage: { promptTokens: 12, completionTokens: 18, totalTokens: 30 }
  }
}

const localObjectProvider: ChatProvider = {
  id: 'local-object',
  async chat(request) {
    return localObjectStream(request)
  },
  async completion() {
    return (async function* () {
      yield ''
    })()
  },
  async embedding() {
    return { embeddings: [], model: 'local-object', usage: { promptTokens: 0, totalTokens: 0 } }
  }
}

const provider =
  providerType === 'local-object'
    ? localObjectProvider
    : providerType === 'openrouter'
      ? openrouter({
          apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
          defaultModel: import.meta.env.VITE_OPENROUTER_DEFAULT_MODEL || 'openai/gpt-4o-mini',
          siteUrl: import.meta.env.VITE_OPENROUTER_SITE_URL,
          appName: import.meta.env.VITE_OPENROUTER_APP_NAME || 'Vue AI Hooks'
        })
      : providerType === 'gemini'
        ? gemini({
            apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
            defaultModel: import.meta.env.VITE_GEMINI_DEFAULT_MODEL || 'gemini-3.5-flash',
            baseURL: import.meta.env.VITE_GEMINI_BASE_URL
          })
        : providerType === 'proxy'
          ? proxyProvider({
              chatUrl:
                import.meta.env.VITE_PROXY_OBJECT_URL ||
                import.meta.env.VITE_PROXY_CHAT_URL ||
                '/api/ai/object',
              baseURL: import.meta.env.VITE_PROXY_BASE_URL,
              credentials: proxyCredentials,
              headers: import.meta.env.VITE_PROXY_AUTH_TOKEN
                ? { Authorization: `Bearer ${import.meta.env.VITE_PROXY_AUTH_TOKEN}` }
                : undefined
            })
          : openai({
              apiKey: import.meta.env.VITE_OPENAI_KEY || '',
              baseURL: import.meta.env.VITE_OPENAI_BASE_URL
            })

const { object, partialObject, text, input, status, isLoading, submit, stop, clear, error } =
  useObject<Ticket>({
    provider,
    schema,
    schemaName: 'support_ticket',
    initialValue: { priority: 'low' }
  })

input.value = 'Urgent: customer cannot reset password and account access is blocked.'

const visibleObject = computed(() => object.value ?? partialObject.value)

async function run() {
  await submit(input.value)
}
</script>

<template>
  <main class="object-demo">
    <header class="header">
      <h1 class="title">vue-ai-hooks · useObject</h1>
      <p class="provider-badge">Provider: {{ providerType }}</p>
    </header>

    <p v-if="error" class="error">
      {{ error.message }}
    </p>

    <label class="field">
      Prompt
      <textarea v-model="input" rows="4" class="textarea" />
    </label>

    <div class="actions">
      <button class="button" :disabled="isLoading" @click="run">Extract object</button>
      <button class="button" :disabled="!isLoading" @click="stop">Stop</button>
      <button class="button" :disabled="isLoading" @click="clear">Clear</button>
    </div>

    <section class="panel">
      <h2 class="section-title">Schema</h2>
      <ul class="schema-list">
        <li class="schema-item">title: string</li>
        <li class="schema-item">priority: low | high</li>
        <li class="schema-item">additionalProperties: false</li>
      </ul>
    </section>

    <section class="panel">
      <h2 class="section-title">Parsed object</h2>
      <dl v-if="visibleObject" class="object-grid">
        <dt class="object-key">title</dt>
        <dd class="object-value">{{ visibleObject.title ?? '...' }}</dd>
        <dt class="object-key">priority</dt>
        <dd class="object-value">{{ visibleObject.priority ?? '...' }}</dd>
      </dl>
      <p v-else class="empty">No object yet.</p>
    </section>

    <section class="panel">
      <h2 class="section-title">Raw JSON stream</h2>
      <pre class="raw-output">{{ text || status }}</pre>
    </section>
  </main>
</template>

<style scoped>
.object-demo {
  max-width: 760px;
  margin: 32px auto;
  font-family: system-ui, sans-serif;
}
.header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.title {
  margin: 0;
  font-size: 18px;
}
.provider-badge {
  margin: 0;
  font-size: 12px;
  color: #334155;
}
.field {
  display: block;
  margin: 16px 0 8px;
}
.textarea {
  width: 100%;
  padding: 8px;
  font: inherit;
}
.actions {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
.button {
  padding: 8px 16px;
}
.panel {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.section-title {
  margin: 0 0 8px;
  font-size: 14px;
}
.schema-list {
  margin: 0;
  padding-left: 20px;
}
.schema-item {
  margin: 4px 0;
}
.object-grid {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px;
  margin: 0;
}
.object-key {
  color: #475569;
}
.object-value {
  margin: 0;
}
.raw-output {
  min-height: 64px;
  margin: 0;
  padding: 10px;
  overflow: auto;
  background: #f8fafc;
  border-radius: 6px;
  white-space: pre-wrap;
}
.empty {
  margin: 0;
  color: #64748b;
}
.error {
  color: #b00020;
}
</style>
