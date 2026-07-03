import { existsSync, readFileSync } from 'node:fs'

const app = readFileSync('examples/agent-run/App.vue', 'utf8')
const config = readFileSync('examples/agent-run/vite.config.ts', 'utf8')
const packageJson = readFileSync('package.json', 'utf8')
const distEntry = new URL('../dist/index.mjs', import.meta.url)

for (const snippet of [
  "from 'vue-ai-hooks'",
  'useAgentRun',
  'createPromptSuggestionRecipes',
  'usePromptSuggestions',
  "surfaces: ['agent', 'tool-approval']",
  'visibleAgentStarters',
  'runLocalAgent',
  "type: 'interrupt'",
  "name: 'approvePlan'",
  'agent.resume(',
  'agent.inspect()',
  'agent.clearTrace()',
  'startDuplicateRun',
  'Replay same id',
  'Inspection snapshot',
  'data-agent-interrupt'
]) {
  expect(app.includes(snippet), `Agent run demo must include: ${snippet}`)
}

for (const snippet of ["'vue-ai-hooks': resolve", 'port: 5188']) {
  expect(config.includes(snippet), `Agent run Vite config must include: ${snippet}`)
}

for (const snippet of [
  '"example:agent-run"',
  '"example:agent-run:build"',
  '"agent-run:check"',
  'pnpm example:agent-run:build',
  'pnpm agent-run:check'
]) {
  expect(packageJson.includes(snippet), `package scripts must include: ${snippet}`)
}

if (!existsSync(distEntry)) {
  throw new Error('dist/index.mjs is missing. Run `pnpm build` before `pnpm agent-run:check`.')
}

const { useAgentRun } = await import(distEntry.href)
const agent = useAgentRun({
  run: localAgentRun,
  interruptDataType: 'data-agent-interrupt'
})

await agent.start({ prompt: 'ship local agent demo' }, { id: 'agent-run-smoke' })
expect(agent.status.value === 'interrupted', 'useAgentRun() should pause on interrupt events')
expect(agent.interrupt.value?.name === 'approvePlan', 'interrupt metadata should be retained')
expect(
  agent.lastResponse.value?.latestEventType === 'interrupt',
  'lastResponse should track interrupt'
)

const eventCount = agent.events.value.length
await agent.start({ prompt: 'ship local agent demo' }, { id: 'agent-run-smoke' })
expect(
  agent.events.value.length === eventCount,
  'same interrupted run id should replay existing state instead of re-running'
)

await agent.resume({ approved: true }, { id: 'agent-run-smoke' })
expect(agent.status.value === 'completed', 'resume() should complete the interrupted run')
expect(
  agent.messages.value.some((message) => String(message.content).includes('approved')),
  'resume() should append assistant text'
)
expect(agent.lastRequest.value?.trigger === 'resume', 'lastRequest should record resume trigger')
expect(
  agent.inspect().timeline.some((item) => item.label === 'agent interrupt'),
  'inspect() should expose the raw AgentEvent timeline'
)

agent.clearTrace()
expect(agent.lastRequest.value === null, 'clearTrace() should clear lastRequest')
expect(agent.lastResponse.value === null, 'clearTrace() should clear lastResponse')

console.log('Agent run demo check passed.')

async function* localAgentRun(request) {
  if (request.resume && request.interrupt?.name === 'approvePlan') {
    yield {
      type: 'message-delta',
      messageId: 'agent-run-smoke-message',
      delta: 'approved resume path completed'
    }
    yield {
      type: 'finish',
      finishReason: 'stop',
      usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 },
      metadata: { runId: request.id }
    }
    return
  }

  yield { type: 'message-delta', messageId: 'agent-run-smoke-message', delta: request.input.prompt }
  yield {
    type: 'interrupt',
    id: 'approval-plan',
    name: 'approvePlan',
    value: { runId: request.id }
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
