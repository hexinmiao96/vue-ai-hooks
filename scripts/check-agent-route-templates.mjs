import { existsSync, readFileSync } from 'node:fs'

const distEntry = new URL('../dist/index.mjs', import.meta.url)

if (!existsSync(distEntry)) {
  throw new Error(
    'dist/index.mjs is missing. Run `pnpm build` before `pnpm agent-route-templates:check`.'
  )
}

const docs = readFileSync('docs/guide/agent-route-templates.md', 'utf8')
const zhDocs = readFileSync('docs/zh/guide/agent-route-templates.md', 'utf8')
const config = readFileSync('docs/.vitepress/config.ts', 'utf8')
const packageJson = readFileSync('package.json', 'utf8')
const {
  agentEventToUIMessageStreamPart,
  createUIMessageStreamResponse,
  readAgentEventStream,
  readUIMessageStream
} = await import(distEntry.href)

for (const snippet of [
  '# Agent route templates',
  'runProjectedAgentEvents',
  'agentEventToUIMessageStreamPart',
  'createUIMessageStreamResponse',
  'readAgentEventStream',
  'agentRouteErrorResponse',
  "interruptDataType: 'data-agent-interrupt'",
  "'x-agent-run-id'",
  "'x-agent-trace-id'",
  '## Next.js App Router',
  'export async function POST(request: Request)',
  'request.json()',
  "export const runtime = 'nodejs'",
  "export const dynamic = 'force-dynamic'",
  '## Nuxt server route',
  'server/api/chat.post.ts',
  'defineEventHandler',
  'readBody(event)',
  'event.req?.signal',
  '## Hono',
  "import { Hono } from 'hono'",
  "import { streamText } from 'hono/streaming'",
  "app.post('/api/chat'",
  'c.req.json()',
  'c.req.raw.signal',
  '## Web Fetch route',
  'new Response',
  'agentRouteErrorResponse()',
  '## LangGraph interrupt resume',
  "import { Command } from '@langchain/langgraph'",
  'thread_id',
  '[redacted]',
  'Provider keys',
  'executable fixture',
  'pnpm agent-route-templates:check',
  'pnpm agent-bridge:check'
]) {
  expect(docs.includes(snippet), `English route template guide must include: ${snippet}`)
}

for (const snippet of [
  '# Agent 路由模板',
  'runProjectedAgentEvents',
  'agentEventToUIMessageStreamPart',
  'createUIMessageStreamResponse',
  'readAgentEventStream',
  'agentRouteErrorResponse',
  "interruptDataType: 'data-agent-interrupt'",
  "'x-agent-run-id'",
  "'x-agent-trace-id'",
  '## Next.js App Router',
  'export async function POST(request: Request)',
  'request.json()',
  "export const runtime = 'nodejs'",
  "export const dynamic = 'force-dynamic'",
  '## Nuxt server route',
  'server/api/chat.post.ts',
  'defineEventHandler',
  'readBody(event)',
  'event.req?.signal',
  '## Hono',
  "import { Hono } from 'hono'",
  "import { streamText } from 'hono/streaming'",
  "app.post('/api/chat'",
  'c.req.json()',
  'c.req.raw.signal',
  '## Web Fetch route',
  'new Response',
  'agentRouteErrorResponse()',
  '## LangGraph interrupt resume',
  "import { Command } from '@langchain/langgraph'",
  'thread_id',
  '[redacted]',
  'Provider key',
  'executable',
  'fixture smoke',
  'pnpm agent-route-templates:check',
  'pnpm agent-bridge:check'
]) {
  expect(zhDocs.includes(snippet), `Chinese route template guide must include: ${snippet}`)
}

expect(
  config.includes("{ text: 'Agent route templates', link: '/guide/agent-route-templates' }") &&
    config.includes("{ text: 'Agent 路由模板', link: '/zh/guide/agent-route-templates' }"),
  'VitePress sidebars must expose agent route templates in English and Chinese'
)

for (const snippet of ['"agent-route-templates:check"', 'pnpm agent-route-templates:check']) {
  expect(packageJson.includes(snippet), `package scripts must include: ${snippet}`)
}

async function checkExecutableRouteFixtures() {
  const body = {
    threadId: 'thread_route_fixture',
    runId: 'run_route_fixture',
    traceId: 'trace_route_fixture',
    messages: [{ role: 'user', content: 'Need route fixture smoke.' }]
  }

  await checkNextRouteFixture(body)
  await checkNuxtRouteFixture(body)
  await checkHonoRouteFixture(body)
  await checkFetchRouteFixture(body)
  await checkLangGraphResumeFixture(body)
}

async function checkNextRouteFixture(body) {
  const response = await nextPost(jsonRequest('/api/chat', body))
  await expectUiStreamResponse(response, body, 'Next.js App Router fixture')

  const invalid = await nextPost(jsonRequest('/api/chat', { runId: body.runId, messages: [] }))
  await expectInvalidRouteBodyErrorResponse(
    invalid,
    'Next.js fixture should reject invalid route body'
  )
}

async function checkNuxtRouteFixture(body) {
  const response = await nuxtPost(createNuxtEvent(jsonRequest('/api/chat', body)))
  await expectUiStreamResponse(response, body, 'Nuxt/Nitro server route fixture')

  const invalid = await nuxtPost(
    createNuxtEvent(jsonRequest('/api/chat', { threadId: body.threadId, messages: [] }))
  )
  await expectInvalidRouteBodyErrorResponse(
    invalid,
    'Nuxt/Nitro fixture should reject invalid route body'
  )
}

async function checkHonoRouteFixture(body) {
  const app = createHonoRouteFixture()
  const response = await app.request('/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' }
  })
  await expectUiStreamResponse(response, body, 'Hono /api/chat fixture')

  const textResponse = await app.request(`/api/agent/runs/${body.runId}/events.txt`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' }
  })
  const text = await textResponse.text()
  expect(text.includes('Agent route ready.'), 'Hono streamText fixture should stream plain text')
  expectNoSecret(text, 'Hono streamText fixture')

  const invalid = await app.request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ runId: body.runId, messages: [] }),
    headers: { 'content-type': 'application/json' }
  })
  await expectInvalidRouteBodyErrorResponse(
    invalid,
    'Hono fixture should reject invalid route body'
  )
}

async function checkFetchRouteFixture(body) {
  const notAllowed = await fetchRouteFixture.fetch(new Request('https://example.test/api/chat'))
  expect(notAllowed.status === 405, 'Fetch route fixture should reject non-POST methods')

  const response = await fetchRouteFixture.fetch(jsonRequest('/api/chat', body))
  await expectUiStreamResponse(response, body, 'Web Fetch route fixture')

  const invalid = await fetchRouteFixture.fetch(
    jsonRequest('/api/chat', { runId: body.runId, messages: [] })
  )
  await expectInvalidRouteBodyErrorResponse(
    invalid,
    'Fetch route fixture should reject invalid route body'
  )
}

async function checkLangGraphResumeFixture(body) {
  const calls = []
  const app = createLangGraphResumeFixture({
    async loadApproval(approvalId) {
      if (approvalId !== 'approval_route_fixture') return null
      return { approvalId, runId: body.runId, threadId: body.threadId }
    },
    graph: {
      async streamEvents(command, options) {
        calls.push({ command, options })
      }
    }
  })

  const response = await app.request(`/api/agent/runs/${body.runId}/resume`, {
    method: 'POST',
    body: JSON.stringify({ approvalId: 'approval_route_fixture', approved: true }),
    headers: { 'content-type': 'application/json' }
  })
  const result = await response.json()

  expect(response.status === 200 && result.ok === true, 'LangGraph resume fixture should approve')
  expect(calls.length === 1, 'LangGraph resume fixture should call graph.streamEvents once')
  expect(
    calls[0]?.command?.resume?.action === 'approve',
    'LangGraph resume fixture should pass Command({ resume }) action'
  )
  expect(
    calls[0]?.options?.version === 'v3' &&
      calls[0]?.options?.configurable?.thread_id === body.threadId,
    'LangGraph resume fixture should preserve durable thread_id'
  )
  expectNoSecret({ result, calls }, 'LangGraph resume fixture')

  const missing = await app.request(`/api/agent/runs/${body.runId}/resume`, {
    method: 'POST',
    body: JSON.stringify({ approvalId: 'missing', approved: true }),
    headers: { 'content-type': 'application/json' }
  })
  expect(missing.status === 404, 'LangGraph resume fixture should reject unknown approvals')
}

async function expectUiStreamResponse(response, body, label) {
  expect(response.status === 200, `${label} should return 200`)
  expect(response.headers.get('x-agent-run-id') === body.runId, `${label} should expose run id`)
  expect(
    response.headers.get('x-agent-trace-id') === body.traceId,
    `${label} should expose trace id`
  )

  const chunks = []
  for await (const chunk of readUIMessageStream({ response })) {
    chunks.push(chunk)
  }

  expect(
    chunks.map((chunk) => (typeof chunk.content === 'string' ? chunk.content : '')).join('') ===
      'Agent route ready.',
    `${label} should decode message deltas`
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.dataType === 'data-agent-progress' && chunk.data?.data?.checkpoint === '[redacted]'
    ),
    `${label} should expose redacted progress data`
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.finishReason === 'stop' &&
        chunk.metadata?.runId === body.runId &&
        chunk.metadata?.traceId === body.traceId
    ),
    `${label} should expose finish metadata`
  )
  expectNoSecret(chunks, label)
}

async function nextPost(request) {
  try {
    const body = await request.json()
    assertAgentRouteBody(body)
    return uiMessageStreamResponse(body, request.signal)
  } catch {
    return agentRouteErrorResponse()
  }
}

async function nuxtPost(event) {
  try {
    const body = await readBody(event)
    assertAgentRouteBody(body)
    return uiMessageStreamResponse(body, event.req?.signal)
  } catch {
    return agentRouteErrorResponse()
  }
}

const fetchRouteFixture = {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const body = await request.json()
      assertAgentRouteBody(body)
      return uiMessageStreamResponse(body, request.signal)
    } catch {
      return agentRouteErrorResponse()
    }
  }
}

function createNuxtEvent(request) {
  return { req: request }
}

function readBody(event) {
  return event.req.json()
}

function createHonoRouteFixture() {
  const app = createHonoLikeApp()

  app.post('/api/chat', async (c) => {
    try {
      const body = await c.req.json()
      assertAgentRouteBody(body)
      return uiMessageStreamResponse(body, c.req.raw.signal)
    } catch {
      return c.json({ error: 'Agent route failed' }, 400)
    }
  })

  app.post('/api/agent/runs/:runId/events.txt', async (c) => {
    try {
      const body = await c.req.json()
      assertAgentRouteBody(body)

      return streamText(c, async (stream) => {
        for await (const chunk of chatChunks(body, c.req.raw.signal)) {
          if (typeof chunk.content === 'string') await stream.write(chunk.content)
        }
      })
    } catch {
      return c.json({ error: 'Agent route failed' }, 400)
    }
  })

  return app
}

async function expectInvalidRouteBodyErrorResponse(response, label) {
  const payload = await response.json().catch(() => null)
  expect(response.status === 400, `${label}`)
  expect(
    payload && typeof payload === 'object' && payload.error === 'Agent route failed',
    `${label} should return canonical error payload`
  )
  expectNoSecret(payload, `${label} should not expose secrets in error body`)
}

function agentRouteErrorResponse(status = 400) {
  return Response.json({ error: 'Agent route failed' }, { status })
}

function createLangGraphResumeFixture({ loadApproval, graph }) {
  const app = createHonoLikeApp()

  app.post('/api/agent/runs/:runId/resume', async (c) => {
    const decision = await c.req.json()
    const approval = await loadApproval(decision.approvalId)

    if (!approval || approval.runId !== c.req.param('runId')) {
      return c.json({ error: 'approval_not_found' }, 404)
    }

    await graph.streamEvents(
      createLangGraphCommand({ resume: { action: decision.approved ? 'approve' : 'reject' } }),
      {
        version: 'v3',
        configurable: { thread_id: approval.threadId }
      }
    )

    return c.json({ ok: true, runId: approval.runId })
  })

  return app
}

function createLangGraphCommand(payload) {
  return payload
}

async function* runProjectedAgentEvents(input) {
  yield {
    type: 'progress',
    id: 'agent-route-start',
    label: 'Agent route accepted',
    value: 0.1,
    data: {
      threadId: input.threadId,
      runId: input.runId,
      traceId: input.traceId,
      checkpoint: '[redacted]'
    }
  }

  yield { type: 'message-delta', messageId: input.runId, delta: 'Agent route ready.' }
  yield {
    type: 'finish',
    finishReason: 'stop',
    metadata: {
      runId: input.runId,
      traceId: input.traceId
    }
  }
}

async function* toUIMessageParts(events) {
  for await (const event of events) {
    yield agentEventToUIMessageStreamPart(event, {
      interruptDataType: 'data-agent-interrupt'
    })
  }
}

function uiMessageStreamResponse(body, signal) {
  const events = runProjectedAgentEvents({ ...body, signal })
  return createUIMessageStreamResponse({
    stream: toUIMessageParts(events),
    headers: {
      'x-agent-run-id': body.runId,
      ...(body.traceId ? { 'x-agent-trace-id': body.traceId } : {})
    }
  })
}

async function* chatChunks(body, signal) {
  yield* readAgentEventStream({
    events: runProjectedAgentEvents({ ...body, signal }),
    progressDataType: 'data-agent-progress',
    interruptDataType: 'data-agent-interrupt',
    errorDataType: 'data-agent-error'
  })
}

function assertAgentRouteBody(value) {
  if (!value || typeof value !== 'object') throw new Error('invalid body')
  if (!value.threadId || !value.runId || !Array.isArray(value.messages)) {
    throw new Error('invalid body')
  }
}

function createHonoLikeApp() {
  const routes = []

  return {
    post(path, handler) {
      routes.push({ method: 'POST', path, handler })
    },
    async request(path, init = {}) {
      const request = new Request(`https://example.test${path}`, init)
      const match = routes
        .map((route) => ({ route, params: matchPath(route.path, path) }))
        .find((item) => item.params)
      if (!match || match.route.method !== request.method) {
        return new Response('Not found', { status: 404 })
      }
      return match.route.handler(createContext(request, match.params))
    }
  }
}

function createContext(request, params) {
  return {
    req: {
      raw: request,
      json: () => request.json(),
      param: (name) => params[name]
    },
    json(value, status = 200) {
      return Response.json(value, { status })
    }
  }
}

function matchPath(pattern, actual) {
  const patternParts = pattern.split('/').filter(Boolean)
  const actualParts = actual.split('/').filter(Boolean)
  if (patternParts.length !== actualParts.length) return null

  const params = {}
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index]
    const actualPart = actualParts[index]
    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = actualPart
      continue
    }
    if (patternPart !== actualPart) return null
  }
  return params
}

function streamText(_context, executor) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      await executor({
        async write(chunk) {
          controller.enqueue(encoder.encode(chunk))
        }
      })
      controller.close()
    }
  })
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8' } })
}

function jsonRequest(path, body) {
  return new Request(`https://example.test${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' }
  })
}

function expectNoSecret(value, label) {
  const serialized = JSON.stringify(value)
  for (const forbidden of ['secret', 'sk-', 'provider-key', 'checkpoint_state']) {
    expect(!serialized.includes(forbidden), `${label} should not expose ${forbidden}`)
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

await checkExecutableRouteFixtures()

console.log('Agent route templates check passed.')
