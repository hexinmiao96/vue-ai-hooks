import { existsSync } from 'node:fs'

const distEntry = new URL('../dist/index.mjs', import.meta.url)

if (!existsSync(distEntry)) {
  throw new Error('dist/index.mjs is missing. Run `pnpm build` before `pnpm tool-approval:check`.')
}

const { useChat } = await import(distEntry.href)

await checkApprovedToolDecision()
await checkRejectedToolDecision()

console.log('Tool approval demo check passed.')

async function checkApprovedToolDecision() {
  const requests = []
  const chat = useChat({
    id: 'tool-approval-smoke-approved',
    provider: createApprovalProvider(requests, 'Approved through backend decision.'),
    defaultRequest: {
      headers: { Authorization: 'Bearer approval-secret' }
    }
  })

  await chat.append('Charge the saved card.')

  expect(requests.length === 1, 'approval flow should make one provider request before approval')
  expect(
    chat.pendingToolCalls.value.map((call) => call.id).join(',') === 'call_charge_1',
    'approval flow should expose the pending chargeCard call'
  )
  expect(
    chat.messages.value.map((message) => message.role).join(',') === 'user,assistant',
    'approval flow should pause before adding a tool result'
  )

  await chat.addToolApprovalResponse(
    {
      id: 'call_charge_1',
      approved: true,
      reason: 'reviewer approved'
    },
    {
      body: {
        approvalId: 'appr_smoke_1',
        toolCallId: 'call_charge_1',
        runId: 'approval_run_smoke_1',
        revision: 4,
        traceId: 'trace_approval_smoke_1'
      },
      headers: { Authorization: 'Bearer approval-secret' }
    }
  )

  const snapshot = chat.inspect()
  const curl = snapshot.curl ?? ''
  expect(chat.pendingToolCalls.value.length === 0, 'approved call should clear pendingToolCalls')
  expect(requests.length === 2, 'approved call should continue the chat with a tool result')
  expect(
    requests[1].body?.approvalId === 'appr_smoke_1' &&
      requests[1].body?.runId === 'approval_run_smoke_1' &&
      requests[1].body?.traceId === 'trace_approval_smoke_1',
    'approved continuation should forward durable approval metadata'
  )
  expect(
    requests[1].messages.map((message) => message.role).join(',') === 'user,assistant,tool',
    'approved continuation should send user, assistant, and tool messages'
  )
  expect(
    String(chat.messages.value.at(-1)?.content || '').includes(
      'Approved through backend decision.'
    ),
    'approved continuation should append the assistant response'
  )
  expect(
    snapshot.traceId === 'trace_approval_smoke_1' &&
      snapshot.providerTrace.traceId === 'trace_approval_smoke_1',
    'inspect() should expose the approval trace id'
  )
  expect(!curl.includes('approval-secret'), 'inspect curl should not expose provider secrets')
}

async function checkRejectedToolDecision() {
  const requests = []
  const chat = useChat({
    id: 'tool-approval-smoke-rejected',
    provider: createApprovalProvider(requests, 'Charge cancelled safely.')
  })

  await chat.append('Charge the saved card.')
  expect(
    chat.pendingToolCalls.value.map((call) => call.id).join(',') === 'call_charge_1',
    'rejection flow should expose the pending chargeCard call'
  )

  await chat.rejectToolCall('call_charge_1', 'Reviewer rejected', {
    body: {
      approvalId: 'appr_smoke_2',
      toolCallId: 'call_charge_1',
      runId: 'approval_run_smoke_2',
      revision: 2,
      traceId: 'trace_approval_smoke_2'
    }
  })

  const toolMessage = chat.messages.value.find((message) => message.role === 'tool')
  expect(chat.pendingToolCalls.value.length === 0, 'rejected call should clear pendingToolCalls')
  expect(requests.length === 2, 'rejected call should continue the chat with a safe tool result')
  expect(
    String(toolMessage?.content || '').includes('"approved":false') &&
      String(toolMessage?.content || '').includes('Reviewer rejected'),
    'rejected call should append a safe rejected tool result'
  )
  expect(
    requests[1].body?.runId === 'approval_run_smoke_2' &&
      chat.inspect().traceId === 'trace_approval_smoke_2',
    'rejected continuation should keep run and trace metadata inspectable'
  )
  expect(
    String(chat.messages.value.at(-1)?.content || '').includes('Charge cancelled safely.'),
    'rejected continuation should append the cancellation response'
  )
}

function createApprovalProvider(requests, responseText) {
  return {
    id: 'tool-approval-smoke',
    async chat(request) {
      requests.push(request)
      return approvalTurn(request, responseText)
    },
    async completion() {
      return emptyAsyncIterable()
    },
    async embedding() {
      return {
        embeddings: [],
        model: 'tool-approval-smoke',
        usage: { promptTokens: 0, totalTokens: 0 }
      }
    }
  }
}

async function* approvalTurn(request, responseText) {
  const latestToolMessage = [...request.messages]
    .reverse()
    .find((message) => message.role === 'tool')

  if (latestToolMessage) {
    yield {
      content: responseText,
      dataId: 'approval-result',
      dataType: 'tool-output-available',
      data: {
        toolCallId: latestToolMessage.toolCallId,
        toolName: 'chargeCard',
        output: latestToolMessage.content
      }
    }
    yield {
      finishReason: 'stop',
      usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 }
    }
    return
  }

  yield { content: 'Charging a saved card requires reviewer approval first.' }
  yield {
    toolCalls: [
      {
        index: 0,
        id: 'call_charge_1',
        type: 'function',
        function: {
          name: 'chargeCard',
          arguments: JSON.stringify({
            orderId: 'order_smoke_1',
            amount: 49,
            currency: 'USD'
          })
        }
      }
    ]
  }
  yield { finishReason: 'tool_calls' }
}

async function* emptyAsyncIterable() {}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
