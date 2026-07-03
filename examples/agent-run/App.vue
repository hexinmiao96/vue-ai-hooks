<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { createPromptSuggestionRecipes, useAgentRun, usePromptSuggestions } from 'vue-ai-hooks'
import type { AgentEvent, AgentRunRequest } from 'vue-ai-hooks'

type AgentPriority = 'normal' | 'urgent'

interface AgentInput {
  prompt: string
  priority: AgentPriority
}

interface AgentResume {
  approved: boolean
  note?: string
}

interface RunLog {
  id: string
  label: string
  detail: string
}

const prompt = shallowRef('Draft a safe rollout plan for the billing assistant.')
const priority = shallowRef<AgentPriority>('normal')
const approvalNote = shallowRef('Approved for the internal demo environment.')
const notice = shallowRef('')
const logs = shallowRef<RunLog[]>([])

let logSequence = 0

const agentStarterSuggestions = createPromptSuggestionRecipes({
  surfaces: ['agent', 'tool-approval'],
  include: ['plan-next-steps', 'design-agent-route', 'prepare-tool-approval', 'inspect-trace'],
  metadata: { surface: 'agent-run-demo' }
})

const runId = computed(() => `agent-demo:${slugify(prompt.value) || 'default'}`)

const agent = useAgentRun<AgentInput, AgentResume>({
  id: 'agent-run-demo',
  run: runLocalAgent,
  progressDataType: 'data-agent-progress',
  interruptDataType: 'data-agent-interrupt',
  onEvent(event) {
    logs.value = [
      ...logs.value,
      {
        id: `event-${++logSequence}`,
        label: event.type,
        detail: summarizeEvent(event)
      }
    ]
  }
})

const { visibleSuggestions: visibleAgentStarters, selectSuggestion: selectAgentStarter } =
  usePromptSuggestions({
    suggestions: agentStarterSuggestions,
    input: prompt,
    max: 4,
    filter: showAllSuggestions
  })

const canStart = computed(() => prompt.value.trim().length > 0 && !agent.isLoading.value)
const canResume = computed(() => agent.hasInterrupt.value && !agent.isLoading.value)
const isLoading = computed(() => agent.isLoading.value)
const hasInterrupt = computed(() => agent.hasInterrupt.value)
const currentRunLabel = computed(() => agent.currentRunId.value ?? runId.value)
const statusLabel = computed(() => agent.status.value)
const eventCount = computed(() => agent.events.value.length)
const streamDataCount = computed(() => agent.streamData.value.length)
const errorMessage = computed(() => agent.error.value?.message ?? '')
const interruptJson = computed(() => formatJson(agent.interrupt.value ?? { status: 'none' }))
const inspectionJson = computed(() => formatJson(agent.inspect()))
const requestJson = computed(() => formatJson(agent.lastRequest.value ?? { status: 'none' }))
const responseJson = computed(() => formatJson(agent.lastResponse.value ?? { status: 'none' }))
const streamDataJson = computed(() => formatJson(agent.streamData.value))
const messages = computed(() =>
  agent.messages.value.map((message) => ({
    id: message.id,
    role: message.role,
    content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content)
  }))
)

async function startRun(event?: Event) {
  event?.preventDefault()
  const nextPrompt = prompt.value.trim()
  if (!nextPrompt) {
    notice.value = 'Enter a prompt before starting the agent.'
    return
  }

  notice.value = ''
  logs.value = []
  logSequence = 0
  await agent.start({ prompt: nextPrompt, priority: priority.value }, { id: runId.value })
}

async function startDuplicateRun() {
  const id = agent.currentRunId.value ?? runId.value
  notice.value = `Replay requested for ${id}; useAgentRun should reuse the active, interrupted, or completed state.`
  await agent.start({ prompt: prompt.value.trim(), priority: priority.value }, { id })
}

async function approveRun() {
  notice.value = ''
  await agent.resume(
    {
      approved: true,
      note: approvalNote.value.trim() || undefined
    },
    { id: currentRunLabel.value }
  )
}

async function rejectRun() {
  notice.value = ''
  await agent.resume(
    {
      approved: false,
      note: approvalNote.value.trim() || undefined
    },
    { id: currentRunLabel.value }
  )
}

function clearTrace() {
  agent.clearTrace()
  notice.value = 'Trace cleared while the visible agent state remains available.'
}

function clearAll() {
  agent.clear()
  logs.value = []
  logSequence = 0
  notice.value = ''
}

function applyAgentStarter(id: string) {
  const selected = selectAgentStarter(id)
  if (selected) prompt.value = selected.prompt
}

async function* runLocalAgent(
  request: AgentRunRequest<AgentInput, AgentResume>
): AsyncGenerator<AgentEvent> {
  if (request.resume && request.interrupt?.name === 'approvePlan') {
    yield {
      type: 'progress',
      id: 'approval-result',
      label: request.resume.approved ? 'Approval accepted' : 'Approval rejected',
      value: 0.7,
      data: {
        runId: request.id,
        note: request.resume.note ?? 'No reviewer note'
      }
    }
    await waitFor(180, request.signal)

    if (request.resume.approved) {
      yield {
        type: 'message-delta',
        messageId: 'agent-response',
        delta: 'Approval received. I will keep the rollout behind a feature flag, '
      }
      yield {
        type: 'tool-call',
        id: 'call-rollout-ticket',
        name: 'createRolloutTicket',
        input: {
          runId: request.id,
          environment: 'internal-demo',
          reviewerNote: request.resume.note ?? 'approved'
        }
      }
      await waitFor(180, request.signal)
      yield {
        type: 'tool-result',
        id: 'call-rollout-ticket',
        name: 'createRolloutTicket',
        output: {
          ticket: 'DEMO-417',
          status: 'queued'
        }
      }
      yield {
        type: 'message-delta',
        messageId: 'agent-response',
        delta: 'create DEMO-417, and publish the inspection trace for support.'
      }
    } else {
      yield {
        type: 'message-delta',
        messageId: 'agent-response',
        delta: 'Approval was rejected. I stopped before creating any rollout ticket.'
      }
    }

    yield {
      type: 'finish',
      finishReason: 'stop',
      usage: { promptTokens: 28, completionTokens: 34, totalTokens: 62 },
      metadata: {
        runId: request.id,
        provider: 'local-agent-demo'
      }
    }
    return
  }

  const input = request.input ?? {
    prompt: 'Review an internal rollout.',
    priority: 'normal' satisfies AgentPriority
  }

  yield {
    type: 'progress',
    id: 'accept',
    label: 'Run accepted',
    value: 0.15,
    data: {
      runId: request.id,
      priority: input.priority
    }
  }
  await waitFor(180, request.signal)
  yield {
    type: 'message-delta',
    messageId: 'agent-response',
    delta: `I prepared a guarded plan for "${input.prompt}". `
  }
  yield {
    type: 'source',
    id: 'source-agent-run',
    url: 'https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/use-agent-run.md',
    title: 'useAgentRun reference'
  }
  await waitFor(180, request.signal)
  yield {
    type: 'tool-call',
    id: 'call-policy',
    name: 'lookupPolicy',
    input: {
      topic: input.prompt,
      priority: input.priority
    }
  }
  yield {
    type: 'tool-result',
    id: 'call-policy',
    name: 'lookupPolicy',
    output: {
      allowed: true,
      requiredApproval: true,
      policy: 'internal-demo-only'
    }
  }
  yield {
    type: 'progress',
    id: 'approval',
    label: 'Waiting for approval',
    value: 0.55,
    data: {
      runId: request.id,
      reason: 'The next step creates a rollout ticket.'
    }
  }
  await waitFor(120, request.signal)
  yield {
    type: 'interrupt',
    id: 'approval-plan',
    name: 'approvePlan',
    value: {
      runId: request.id,
      summary: 'Create one internal rollout ticket after policy lookup.',
      risk: input.priority === 'urgent' ? 'high' : 'medium',
      requiredAction: 'Approve or reject before the agent continues.'
    }
  }
}

function waitFor(ms: number, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))

  return new Promise<void>((resolve, reject) => {
    const timer = globalThis.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        globalThis.clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

function summarizeEvent(event: AgentEvent): string {
  if (event.type === 'message-delta') return event.delta
  if (event.type === 'progress') return `${event.label ?? 'Progress'} (${event.value ?? 0})`
  if (event.type === 'tool-call') return `${event.name} input ready`
  if (event.type === 'tool-result') return `${event.name} output available`
  if (event.type === 'interrupt') return `${event.name} requires a decision`
  if (event.type === 'source') return event.title ?? event.url
  if (event.type === 'finish') return `finish: ${event.finishReason ?? 'stop'}`
  if (event.type === 'error') return event.errorText
  if (event.type === 'tool-error') return event.errorText
  return 'agent event'
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function showAllSuggestions() {
  return true
}
</script>

<template>
  <main class="agent-run-demo">
    <header class="demo-header">
      <p class="eyebrow">No-key local agent run</p>
      <h1>useAgentRun approval and inspection demo</h1>
      <p class="lede">
        Run a deterministic agent event stream, pause on a human approval interrupt, resume with the
        same run id, and inspect the request trace without connecting a provider.
      </p>
    </header>

    <section class="workspace">
      <form class="panel command-panel" @submit="startRun">
        <div class="starter-grid" aria-label="Agent prompt starters">
          <button
            v-for="suggestion in visibleAgentStarters"
            :key="suggestion.id"
            class="starter-button"
            type="button"
            :disabled="isLoading"
            @click="applyAgentStarter(suggestion.id)"
          >
            <span>{{ suggestion.title }}</span>
            <small v-if="suggestion.description">{{ suggestion.description }}</small>
          </button>
        </div>

        <label class="field">
          Prompt
          <textarea
            v-model="prompt"
            rows="4"
            placeholder="Describe what the local agent should plan"
          />
        </label>

        <fieldset class="priority-group">
          <legend>Priority</legend>
          <label>
            <input v-model="priority" type="radio" value="normal" />
            Normal
          </label>
          <label>
            <input v-model="priority" type="radio" value="urgent" />
            Urgent
          </label>
        </fieldset>

        <label class="field">
          Approval note
          <input v-model="approvalNote" type="text" />
        </label>

        <div class="actions">
          <button type="submit" :disabled="!canStart">
            {{ isLoading ? 'Running' : 'Start run' }}
          </button>
          <button type="button" :disabled="isLoading" @click="startDuplicateRun">
            Replay same id
          </button>
          <button type="button" :disabled="!canResume" @click="approveRun">Approve</button>
          <button type="button" :disabled="!canResume" @click="rejectRun">Reject</button>
          <button type="button" :disabled="!isLoading" @click="agent.stop()">Stop</button>
          <button type="button" @click="clearTrace">Clear trace</button>
          <button type="button" @click="clearAll">Clear all</button>
        </div>
      </form>

      <section class="panel status-panel">
        <h2>Run state</h2>
        <dl class="status-grid">
          <div>
            <dt>Status</dt>
            <dd>{{ statusLabel }}</dd>
          </div>
          <div>
            <dt>Run id</dt>
            <dd>{{ currentRunLabel }}</dd>
          </div>
          <div>
            <dt>Events</dt>
            <dd>{{ eventCount }}</dd>
          </div>
          <div>
            <dt>Stream data</dt>
            <dd>{{ streamDataCount }}</dd>
          </div>
        </dl>

        <p v-if="notice" class="notice">{{ notice }}</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <section v-if="hasInterrupt" class="interrupt-panel">
          <h3>Pending interrupt</h3>
          <pre>{{ interruptJson }}</pre>
        </section>
      </section>
    </section>

    <section class="results-grid">
      <section class="panel">
        <h2>Assistant message</h2>
        <ol class="message-list">
          <li v-for="message in messages" :key="message.id">
            <strong>{{ message.role }}</strong>
            <p>{{ message.content || 'Waiting for text delta.' }}</p>
          </li>
          <li v-if="messages.length === 0">Start the run to collect assistant output.</li>
        </ol>
      </section>

      <section class="panel">
        <h2>Event log</h2>
        <ol class="event-list">
          <li v-for="item in logs" :key="item.id">
            <span>{{ item.label }}</span>
            <p>{{ item.detail }}</p>
          </li>
          <li v-if="logs.length === 0">No events yet.</li>
        </ol>
      </section>
    </section>

    <section class="trace-grid">
      <section class="panel">
        <h2>Last request</h2>
        <pre>{{ requestJson }}</pre>
      </section>
      <section class="panel">
        <h2>Last response</h2>
        <pre>{{ responseJson }}</pre>
      </section>
      <section class="panel">
        <h2>Stream data</h2>
        <pre>{{ streamDataJson }}</pre>
      </section>
      <section class="panel">
        <h2>Inspection snapshot</h2>
        <pre>{{ inspectionJson }}</pre>
      </section>
    </section>
  </main>
</template>

<style scoped>
.agent-run-demo {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 16px 40px;
  color: #162033;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.demo-header {
  margin-bottom: 18px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #256d85;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1 {
  max-width: 820px;
  margin-bottom: 8px;
  font-size: 34px;
  line-height: 1.14;
  letter-spacing: 0;
}

h2 {
  margin-bottom: 12px;
  font-size: 18px;
  letter-spacing: 0;
}

h3 {
  margin-bottom: 8px;
  font-size: 15px;
  letter-spacing: 0;
}

.lede {
  max-width: 760px;
  color: #526175;
  line-height: 1.6;
}

.workspace,
.results-grid,
.trace-grid {
  display: grid;
  gap: 14px;
}

.workspace {
  grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
  align-items: start;
}

.results-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.trace-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.panel {
  border: 1px solid #d7dde7;
  border-radius: 8px;
  background: #ffffff;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(22, 32, 51, 0.06);
}

.command-panel {
  display: grid;
  gap: 12px;
}

.starter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.starter-button {
  display: grid;
  gap: 5px;
  align-content: start;
  min-height: 72px;
  text-align: left;
}

.starter-button span {
  color: #162033;
}

.starter-button small {
  color: #526175;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.field {
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

textarea,
input[type='text'] {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #c9d3df;
  border-radius: 6px;
  padding: 10px 11px;
  color: #162033;
  font: inherit;
  font-weight: 500;
}

textarea {
  min-height: 112px;
  resize: vertical;
}

.priority-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  border: 1px solid #d7dde7;
  border-radius: 8px;
  padding: 10px 12px 12px;
}

.priority-group legend {
  padding: 0 4px;
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.priority-group label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  min-height: 36px;
  border: 1px solid #aab7c7;
  border-radius: 6px;
  background: #f7fafc;
  color: #162033;
  padding: 7px 12px;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.actions button:first-child {
  border-color: #1f7a8c;
  background: #1f7a8c;
  color: #ffffff;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.status-grid div {
  min-width: 0;
  border: 1px solid #e1e7ef;
  border-radius: 6px;
  padding: 10px;
  background: #f8fafc;
}

.status-grid dt {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.status-grid dd {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  font-weight: 800;
}

.notice,
.error {
  margin: 12px 0 0;
  border-radius: 6px;
  padding: 9px 10px;
  font-size: 14px;
  line-height: 1.45;
}

.notice {
  background: #eef7f9;
  color: #175c6a;
}

.error {
  background: #fff1f2;
  color: #b42335;
}

.interrupt-panel {
  margin-top: 12px;
  border-top: 1px solid #e1e7ef;
  padding-top: 12px;
}

.message-list,
.event-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 20px;
}

.message-list li,
.event-list li {
  min-width: 0;
}

.message-list p,
.event-list p {
  margin: 4px 0 0;
  color: #44546a;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.event-list span {
  display: inline-flex;
  border-radius: 6px;
  background: #edf2f7;
  padding: 3px 7px;
  color: #1f3349;
  font-size: 12px;
  font-weight: 800;
}

pre {
  max-height: 320px;
  margin: 0;
  overflow: auto;
  border-radius: 6px;
  background: #101827;
  color: #dbeafe;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 820px) {
  .workspace,
  .results-grid,
  .trace-grid {
    grid-template-columns: 1fr;
  }

  h1 {
    font-size: 28px;
  }
}
</style>
