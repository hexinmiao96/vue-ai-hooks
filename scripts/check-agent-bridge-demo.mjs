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
const langChainEvents = createLangChainProjectionEvents(run)
const langGraphEvents = createLangGraphProjectionEvents(run)

await checkChatChunkBridge(events)
await checkUIMessageStreamBridge(events)
await checkLangChainProjection(langChainEvents)
await checkLangGraphProjection(langGraphEvents)
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

async function checkLangChainProjection(eventsToRead) {
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
      'LangChain typed projection ready.',
    'LangChain projection should preserve typed message deltas'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.toolCalls?.[0]?.function.name === 'lookupAccount' &&
        chunk.toolCalls[0].function.arguments.includes('[redacted]')
    ),
    'LangChain projection should expose redacted tool input'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.finishReason === 'stop' &&
        chunk.metadata?.backend === 'langchain' &&
        chunk.metadata?.runId === run.runId
    ),
    'LangChain projection should finish with stable run metadata'
  )
  expectNoSecret(chunks, 'LangChain projection')
}

async function checkLangGraphProjection(eventsToRead) {
  const chunks = []
  for await (const chunk of readAgentEventStream({
    events: asyncEvents(eventsToRead),
    progressDataType: 'data-agent-progress',
    interruptDataType: 'data-agent-interrupt',
    errorDataType: 'data-agent-error'
  })) {
    chunks.push(chunk)
  }

  expect(
    chunks.some(
      (chunk) =>
        chunk.dataType === 'data-agent-progress' && chunk.data?.data?.checkpoint === '[redacted]'
    ),
    'LangGraph projection should redact checkpoint state in progress data'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.dataType === 'data-agent-interrupt' &&
        chunk.data?.value?.approvalId === 'approval_graph_1' &&
        chunk.data.value.threadId === run.threadId
    ),
    'LangGraph projection should expose safe interrupt data for approval UI'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.dataType === 'tool-output-available' &&
        chunk.data?.toolName === 'sendEmail' &&
        chunk.data?.output?.status === 'queued'
    ),
    'LangGraph projection should resume and expose a safe tool result'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.finishReason === 'stop' &&
        chunk.metadata?.backend === 'langgraph' &&
        chunk.metadata?.threadId === run.threadId
    ),
    'LangGraph projection should finish with durable thread metadata'
  )
  expectNoSecret(chunks, 'LangGraph projection')
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

function createLangChainProjectionEvents(runInfo) {
  const langsmithKey = 'langsmith-secret'
  const accountToken = 'customer-token-secret'
  void langsmithKey
  void accountToken

  return [
    {
      type: 'progress',
      id: 'langchain-stream-events',
      label: 'LangChain streamEvents v3 started',
      value: 0.15,
      data: {
        threadId: runInfo.threadId,
        projection: 'messages/toolCalls/output',
        traceId: runInfo.traceId
      }
    },
    {
      type: 'message-delta',
      messageId: 'msg_langchain_1',
      delta: 'LangChain typed projection ready.'
    },
    {
      type: 'tool-call',
      id: 'call_langchain_lookup',
      name: 'lookupAccount',
      input: {
        accountId: 'acct_123',
        token: '[redacted]',
        fields: ['tier', 'status']
      }
    },
    {
      type: 'tool-result',
      id: 'call_langchain_lookup',
      name: 'lookupAccount',
      output: {
        tier: 'enterprise',
        status: 'active'
      }
    },
    {
      type: 'finish',
      finishReason: 'stop',
      usage: {
        promptTokens: 18,
        completionTokens: 12,
        totalTokens: 30
      },
      metadata: {
        backend: 'langchain',
        runId: runInfo.runId,
        traceId: runInfo.traceId
      }
    }
  ]
}

function createLangGraphProjectionEvents(runInfo) {
  const checkpointState = 'raw-checkpoint-secret'
  const emailBody = 'sensitive customer email body'
  void checkpointState
  void emailBody

  return [
    {
      type: 'progress',
      id: 'langgraph-update',
      label: 'LangGraph state update',
      value: 0.35,
      data: {
        node: 'review',
        mode: 'updates',
        checkpoint: '[redacted]',
        threadId: runInfo.threadId
      },
      transient: true
    },
    {
      type: 'tool-call',
      id: 'call_graph_email',
      name: 'sendEmail',
      input: {
        to: 'customer@example.com',
        subject: 'Follow-up',
        bodyPreview: 'Follow-up about your support case...',
        body: '[redacted]'
      }
    },
    {
      type: 'interrupt',
      id: 'interrupt_graph_email',
      name: 'approveTool',
      value: {
        approvalId: 'approval_graph_1',
        threadId: runInfo.threadId,
        runId: runInfo.runId,
        toolCallId: 'call_graph_email',
        action: 'sendEmail',
        summary: 'Review redacted email before sending'
      }
    },
    {
      type: 'tool-result',
      id: 'call_graph_email',
      name: 'sendEmail',
      output: {
        status: 'queued',
        messageId: 'email_queued_1'
      }
    },
    {
      type: 'finish',
      finishReason: 'stop',
      usage: {
        promptTokens: 20,
        completionTokens: 16,
        totalTokens: 36
      },
      metadata: {
        backend: 'langgraph',
        threadId: runInfo.threadId,
        runId: runInfo.runId,
        resumed: true
      }
    }
  ]
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
  expect(!text.includes('customer-token-secret'), `${label} should not expose account tokens`)
  expect(!text.includes('raw-checkpoint-secret'), `${label} should not expose checkpoint state`)
  expect(!text.includes('sensitive customer email body'), `${label} should not expose tool bodies`)
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
