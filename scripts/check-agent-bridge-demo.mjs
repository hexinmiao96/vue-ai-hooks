import { existsSync } from 'node:fs'

const distEntry = new URL('../dist/index.mjs', import.meta.url)

if (!existsSync(distEntry)) {
  throw new Error('dist/index.mjs is missing. Run `pnpm build` before `pnpm agent-bridge:check`.')
}

const {
  agentEventToUIMessageStreamPart,
  createUIMessageStreamResponse,
  inspectRequestTrace,
  readAgentEventStream,
  readUIMessageStream
} = await import(distEntry.href)

const run = {
  threadId: 'thread_support_1',
  branchId: 'branch_main',
  runId: 'run_agent_smoke_1',
  traceId: 'trace_agent_smoke_1'
}
const events = createBrowserSafeAgentEvents(run)

await checkChatChunkBridge(events)
await checkUIMessageStreamBridge(events)
checkInspectableRunMetadata(run)

console.log('Agent bridge demo check passed.')

async function checkChatChunkBridge(eventsToRead) {
  const chunks = []
  for await (const chunk of readAgentEventStream({
    events: asyncEvents(eventsToRead),
    progressDataType: 'data-agent-progress',
    errorDataType: 'data-agent-error'
  })) {
    chunks.push(chunk)
  }

  expect(
    chunks.map((chunk) => (typeof chunk.content === 'string' ? chunk.content : '')).join('') ===
      'Agent accepted the run. Lookup complete.',
    'readAgentEventStream() should assemble message deltas'
  )
  expect(
    chunks.some((chunk) => chunk.dataType === 'data-agent-progress' && chunk.data?.id === 'step_1'),
    'readAgentEventStream() should expose progress data parts'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.dataType === 'source-url' &&
        typeof chunk.data?.url === 'string' &&
        chunk.data.url.includes('docs/guide/agent-bridge.md')
    ),
    'readAgentEventStream() should expose retrieval sources'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.toolCalls?.[0]?.id === 'call_lookup_1' &&
        chunk.toolCalls[0].function.name === 'lookupTicket'
    ),
    'readAgentEventStream() should expose safe tool-call input'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.dataType === 'tool-output-available' && chunk.data?.toolCallId === 'call_lookup_1'
    ),
    'readAgentEventStream() should expose safe tool result data'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.finishReason === 'stop' &&
        chunk.metadata?.runId === run.runId &&
        chunk.usage?.totalTokens === 30
    ),
    'readAgentEventStream() should expose finish usage and run metadata'
  )
  expectNoSecret(chunks, 'chat chunk bridge')
}

async function checkUIMessageStreamBridge(eventsToRead) {
  const response = createUIMessageStreamResponse({
    stream: eventsToRead.map((event) => agentEventToUIMessageStreamPart(event))
  })
  const chunks = []

  for await (const chunk of readUIMessageStream({ response })) {
    chunks.push(chunk)
  }

  expect(
    chunks.map((chunk) => (typeof chunk.content === 'string' ? chunk.content : '')).join('') ===
      'Agent accepted the run. Lookup complete.',
    'agentEventToUIMessageStreamPart() should preserve text through readUIMessageStream()'
  )
  expect(
    chunks.some((chunk) => chunk.dataType === 'source-url' && chunk.data?.title === 'Agent bridge'),
    'UI message stream bridge should expose source-url chunks'
  )
  expect(
    chunks.some((chunk) => chunk.dataType === 'tool-output-available'),
    'UI message stream bridge should expose tool output chunks'
  )
  expect(
    chunks.some((chunk) => chunk.finishReason === 'stop' && chunk.usage?.totalTokens === 30),
    'UI message stream bridge should preserve finish usage'
  )
  expectNoSecret(chunks, 'UI message stream bridge')
}

function checkInspectableRunMetadata(runInfo) {
  const snapshot = inspectRequestTrace({
    status: 'ready',
    lastRequest: {
      providerId: 'agent-bridge-smoke',
      api: '/api/chat',
      attempt: 1,
      body: {
        branchId: runInfo.branchId,
        runId: runInfo.runId,
        traceId: runInfo.traceId
      },
      headers: {
        Authorization: 'Bearer langsmith-secret'
      }
    },
    lastResponse: {
      providerId: 'agent-bridge-smoke',
      api: '/api/chat',
      attempt: 1,
      hasStream: true
    },
    curl: true,
    now: '2026-07-02T00:00:00.000Z'
  })

  expect(snapshot.traceId === runInfo.traceId, 'inspectRequestTrace() should expose agent trace id')
  expect(
    snapshot.providerTrace.traceId === runInfo.traceId,
    'provider trace should include trace id'
  )
  expect(
    snapshot.curl?.toLowerCase().includes('authorization: [redacted]'),
    'inspect curl should redact backend credentials'
  )
  expectNoSecret(
    {
      traceId: snapshot.traceId,
      providerTrace: snapshot.providerTrace,
      curl: snapshot.curl
    },
    'inspection support output'
  )
}

function createBrowserSafeAgentEvents(runInfo) {
  const backendSecret = 'langsmith-secret'
  const vectorStoreKey = 'vector-secret'
  void backendSecret
  void vectorStoreKey

  return [
    {
      type: 'progress',
      id: 'step_1',
      label: 'Agent run started',
      value: 0.2,
      data: {
        threadId: runInfo.threadId,
        branchId: runInfo.branchId,
        runId: runInfo.runId,
        traceId: runInfo.traceId
      }
    },
    { type: 'message-delta', messageId: 'msg_agent_1', delta: 'Agent accepted the run. ' },
    {
      type: 'source',
      id: 'source_agent_bridge',
      url: 'https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/guide/agent-bridge.md',
      title: 'Agent bridge'
    },
    {
      type: 'tool-call',
      id: 'call_lookup_1',
      name: 'lookupTicket',
      input: {
        ticketId: 'ticket_123',
        fields: ['status', 'priority']
      }
    },
    {
      type: 'tool-result',
      id: 'call_lookup_1',
      name: 'lookupTicket',
      output: {
        status: 'open',
        priority: 'high'
      }
    },
    { type: 'message-delta', messageId: 'msg_agent_1', delta: 'Lookup complete.' },
    {
      type: 'finish',
      finishReason: 'stop',
      usage: {
        promptTokens: 12,
        completionTokens: 18,
        totalTokens: 30
      },
      metadata: {
        runId: runInfo.runId,
        traceId: runInfo.traceId
      }
    }
  ]
}

async function* asyncEvents(eventsToRead) {
  for (const event of eventsToRead) yield event
}

function expectNoSecret(value, label) {
  const text = JSON.stringify(value)
  expect(!text.includes('langsmith-secret'), `${label} should not expose LangSmith credentials`)
  expect(!text.includes('vector-secret'), `${label} should not expose vector store credentials`)
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
