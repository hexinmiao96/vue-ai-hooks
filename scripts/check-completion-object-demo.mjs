import { existsSync } from 'node:fs'

const distEntry = new URL('../dist/index.mjs', import.meta.url)

if (!existsSync(distEntry)) {
  throw new Error(
    'dist/index.mjs is missing. Run `pnpm build` before `pnpm completion-object:check`.'
  )
}

const { inspectRequestTrace, useCompletion, useObject, useEmbedding } = await import(distEntry.href)

const completionRequests = []
const objectRequests = []
const embeddingRequests = []

await checkCompletion()
await checkCompletionRetryability()
await checkObject()
await checkObjectRetryability()
await checkEmbedding()
await checkEmbeddingRetryability()

console.log('Completion/Object/Embedding demo check passed.')

async function checkCompletion() {
  const provider = {
    id: 'completion-local-smoke',
    async completion(request) {
      completionRequests.push(request)
      const prompt = request.prompt ? String(request.prompt) : 'complete this request'
      const answer = `Completion result: ${prompt.toLowerCase().replace(/\s+/g, ' ')}. Structured for local smoke check.`
      return toTextStream(answer)
    },
    async chat() {
      return toObjectStream([{ content: 'completion provider only supports completion()' }])
    },
    async embedding() {
      return {
        embeddings: [],
        model: 'completion-local-smoke',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      }
    }
  }

  const completion = useCompletion({
    provider,
    initialInput: 'Generate a short production readiness summary.',
    initialCompletion: '',
    defaultRequest: {
      model: 'completion-smoke-model',
      streamProtocol: 'text',
      api: '/api/completion',
      body: { tenantId: 'completion-tenant' },
      headers: { Authorization: 'Bearer secret-completion', 'x-tenant': 'tenant-1' }
    },
    maxRetries: 0
  })

  await completion.complete()

  const snapshot = completion.inspect()
  expect(completionRequests.length === 1, 'completion smoke should send one request')
  expect(snapshot.hasRequest, 'completion demo should capture request snapshot after complete()')
  expect(snapshot.hasResponse, 'completion demo should capture response snapshot after complete()')
  expect(
    snapshot.request?.providerId === 'completion-local-smoke',
    'completion snapshot should report local provider id'
  )
  expect(
    snapshot.request?.request?.prompt === 'Generate a short production readiness summary.',
    'completion request should include provided prompt'
  )
  expect(
    typeof completion.completion.value === 'string' && completion.completion.value.length > 0,
    'completion should return non-empty text'
  )
  expect(
    completion.completion.value?.includes('Completion result'),
    'completion output should be synthetic'
  )
  expect(
    snapshot.status === 'ready',
    'completion trace should be ready after successful complete()'
  )
  expect(snapshot.request?.attempt === 1, 'completion first request should use attempt 1')
  expect(snapshot.response?.attempt === 1, 'completion response should be from attempt 1')
  expect(
    snapshot.request?.body?.tenantId === 'completion-tenant',
    'completion request should preserve tenant body metadata'
  )
  expect(
    snapshot.request?.headers?.['x-tenant'] === 'tenant-1',
    'completion request should preserve non-sensitive headers'
  )
  const trace = inspectRequestTrace({
    status: snapshot.status,
    error: snapshot.error,
    lastRequest: snapshot.request ?? undefined,
    lastResponse: snapshot.response ?? undefined,
    curl: snapshot.request?.request,
    now: '2026-07-03T09:00:00.000Z'
  })

  expect(
    trace.providerId === 'completion-local-smoke',
    'completion trace should expose provider id'
  )
  expect(
    trace.curl === null || !trace.curl.includes('Bearer secret-completion'),
    'completion curl should redact Authorization value'
  )
  expect(trace.timeline.length >= 1, 'completion trace should include timeline events')
  expect(
    trace.curl === null || typeof trace.curl === 'string',
    'completion trace should expose curl field'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'request'),
    'completion trace should record request timeline'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'response'),
    'completion trace should record response timeline'
  )
}

async function checkCompletionRetryability() {
  let attempts = 0

  const provider = {
    id: 'completion-local-smoke-retry',
    async completion(request) {
      attempts += 1
      const body = String(request.prompt ?? '')
      if (attempts === 1) {
        const error = new Error('temporary completion outage')
        Object.assign(error, { status: 429 })
        throw error
      }
      return toTextStream(`Recovered after retry for: ${body}`)
    },
    async chat() {
      return toObjectStream([{ content: 'completion provider only supports completion()' }])
    },
    async embedding() {
      return {
        embeddings: [],
        model: 'completion-local-smoke-retry',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      }
    }
  }

  const completion = useCompletion({
    provider,
    defaultRequest: {
      model: 'completion-smoke-model',
      streamProtocol: 'text',
      api: '/api/completion',
      body: { tenantId: 'completion-retry-tenant' }
    },
    maxRetries: 1
  })

  await completion.complete('Please include retryable strategy.')

  const snapshot = completion.inspect()
  expect(
    snapshot.hasRequest,
    'retryable completion should capture request snapshot after recoverable errors'
  )
  expect(
    snapshot.hasResponse,
    'retryable completion should capture response snapshot after recovery'
  )
  expect(attempts === 2, 'completion provider should receive exactly two attempts')
  expect(
    snapshot.request?.attempt === 2,
    'completion request snapshot should indicate second attempt'
  )
  expect(
    snapshot.response?.attempt === 2,
    'completion response snapshot should indicate second attempt'
  )
  expect(
    snapshot.status === 'ready',
    'completion trace should be ready after successful retry recovery'
  )
  expect(
    snapshot.retries.length === 1,
    'completion retryable failure should record exactly one retry'
  )
  expect(
    snapshot.retries[0]?.error?.status === 429,
    'completion retry metadata should preserve upstream status'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'retry'),
    'completion trace should include retry timeline event'
  )
}

async function checkObject() {
  const provider = {
    id: 'object-local-smoke',
    async chat(request) {
      objectRequests.push(request)
      const prompt = extractPromptFromRequest(request)
      const payload = {
        title: toTitle(prompt),
        priority: /urgent|blocked|down|error|alert|outage|crash|超时|故障|阻塞/i.test(prompt)
          ? 'high'
          : 'low'
      }
      return toTextChunks(JSON.stringify(payload))
    },
    async completion() {
      return toTextStream('')
    },
    async embedding() {
      return {
        embeddings: [],
        model: 'object-local-smoke',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      }
    }
  }

  const object = useObject({
    provider,
    schemaName: 'task_snapshot',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'high'] }
      },
      required: ['title', 'priority'],
      additionalProperties: false
    },
    initialValue: { title: 'Local', priority: 'low' },
    defaultRequest: {
      api: '/api/object',
      headers: { Authorization: 'Bearer secret-object', 'x-object': 'v1' },
      body: { tenant: 'object-tenant' }
    },
    initialInput: 'urgent: customer cannot access account'
  })

  const result = await object.submit()

  const snapshot = object.inspect()
  expect(objectRequests.length === 1, 'object smoke should send one request')
  expect(snapshot.hasRequest, 'object demo should capture request snapshot after submit()')
  expect(snapshot.hasResponse, 'object demo should capture response snapshot after submit()')
  expect(
    snapshot.request?.providerId === 'object-local-smoke',
    'object snapshot should report local provider id'
  )
  expect(
    snapshot.request?.request?.responseFormat?.json_schema?.name === 'task_snapshot',
    'object request should set schema name in responseFormat'
  )
  expect(Array.isArray(snapshot.request?.messages), 'object request should preserve messages')

  expect(
    typeof result?.title === 'string' && typeof result?.priority === 'string',
    'submit should resolve a parsed object'
  )
  expect(typeof object.object.value === 'object', 'object ref should be set after submit')
  expect(typeof object.object.value?.priority === 'string', 'parsed object should include priority')

  const trace = inspectRequestTrace({
    status: snapshot.status,
    error: snapshot.error,
    lastRequest: snapshot.request ?? undefined,
    lastResponse: snapshot.response ?? undefined,
    curl: snapshot.request?.request,
    now: '2026-07-03T09:00:10.000Z'
  })

  expect(trace.providerId === 'object-local-smoke', 'object trace should expose provider id')
  expect(trace.timeline.length >= 1, 'object trace should include timeline events')
  expect(
    trace.curl === null || !trace.curl.includes('Bearer secret-object'),
    'object curl should redact Authorization value'
  )
  expect(
    trace.curl === null || typeof trace.curl === 'string',
    'object trace should expose curl field'
  )
  expect(snapshot.status === 'ready', 'object trace should be ready after successful submit()')
  expect(snapshot.request?.attempt === 1, 'object first request should use attempt 1')
  expect(snapshot.response?.attempt === 1, 'object response should be from attempt 1')
  expect(
    snapshot.request?.request?.responseFormat?.json_schema?.name === 'task_snapshot',
    'object request should set schema name in responseFormat'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'request'),
    'object trace should record request timeline'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'response'),
    'object trace should record response timeline'
  )
}

async function checkObjectRetryability() {
  let attempts = 0
  const provider = {
    id: 'object-local-smoke-retry',
    async chat(request) {
      attempts += 1
      if (attempts === 1) {
        const error = new Error('temporary structured output outage')
        Object.assign(error, { status: 503 })
        throw error
      }

      const prompt = extractPromptFromRequest(request)
      const payload = {
        title: toTitle(prompt),
        priority: /urgent|blocked|down|error|alert|outage|crash|超时|故障|阻塞/i.test(prompt)
          ? 'high'
          : 'low'
      }
      return toTextChunks(JSON.stringify(payload))
    },
    async completion() {
      return toTextStream('')
    },
    async embedding() {
      return {
        embeddings: [],
        model: 'object-local-smoke-retry',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      }
    }
  }

  const object = useObject({
    provider,
    schemaName: 'task_snapshot',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'high'] }
      },
      required: ['title', 'priority'],
      additionalProperties: false
    },
    initialValue: { title: 'Local', priority: 'low' },
    defaultRequest: {
      api: '/api/object',
      headers: { Authorization: 'Bearer secret-object-retry' },
      body: { tenant: 'object-tenant-retry' }
    },
    maxRetries: 1
  })

  const result = await object.submit('retry: service degraded and downstream endpoint returned 503')

  expect(typeof result?.title === 'string', 'object retry submit should resolve a parsed object')
  expect(attempts === 2, 'object provider should receive exactly two attempts')

  const snapshot = object.inspect()
  expect(snapshot.hasRequest, 'object retry should capture request snapshot after recovery')
  expect(snapshot.hasResponse, 'object retry should capture response snapshot after recovery')
  expect(snapshot.request?.attempt === 2, 'object request snapshot should show recovered attempt')
  expect(snapshot.response?.attempt === 2, 'object response snapshot should show recovered attempt')
  expect(
    snapshot.status === 'ready',
    'object trace should be ready after successful retry recovery'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'request'),
    'object trace should record request timeline'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'response'),
    'object trace should record response timeline'
  )
}

async function checkEmbedding() {
  const provider = {
    id: 'embedding-local-smoke',
    async chat() {
      return toObjectStream([
        { content: 'embedding provider does not support chat() in this smoke check' }
      ])
    },
    async completion() {
      return toTextStream('embedding provider does not support completion() in this smoke check')
    },
    async embedding(request) {
      embeddingRequests.push(request)
      const input = Array.isArray(request.input) ? request.input : [request.input]
      return {
        embeddings: input.map((_, index) => [index + 0.1, index + 0.2, index + 0.3]),
        model: 'embedding-local-smoke',
        usage: { promptTokens: 4, completionTokens: 0, totalTokens: 4 }
      }
    }
  }

  const embedding = useEmbedding({
    provider,
    maxRetries: 0,
    defaultRequest: {
      model: 'text-embedding-3-small',
      api: '/api/embedding',
      body: { tenant: 'embedding-tenant' },
      headers: { Authorization: 'Bearer secret-embedding', 'x-tenant': 'tenant-embed' }
    },
    initialInput: 'alpha'
  })

  const result = await embedding.embed(['alpha', 'beta', 'gamma'])
  const snapshot = embedding.inspect()

  expect(embeddingRequests.length === 1, 'embedding smoke should send one request')
  expect(snapshot.hasRequest, 'embedding demo should capture request snapshot after embed()')
  expect(snapshot.hasResponse, 'embedding demo should capture response snapshot after embed()')
  expect(
    snapshot.request?.providerId === 'embedding-local-smoke',
    'embedding snapshot should report local provider id'
  )
  expect(
    Array.isArray(snapshot.request?.input) && snapshot.request.input.length === 3,
    'embedding request should expose input array'
  )
  expect(Array.isArray(result.embeddings), 'embedding call should return vector arrays')
  expect(result.embeddings.length === 3, 'embedding result should return one vector per input')
  expect(
    embedding.embeddings.value?.length === 3 &&
      embedding.embeddings.value.every((vector) => vector.length === 3),
    'embedding state should contain all vectors'
  )
  expect(snapshot.status === 'ready', 'embedding trace should be ready after successful embed()')
  expect(
    snapshot.request?.body?.tenant === 'embedding-tenant',
    'embedding request should preserve tenant metadata'
  )
  expect(
    snapshot.request?.headers?.['x-tenant'] === 'tenant-embed',
    'embedding request should preserve non-sensitive headers'
  )

  const trace = inspectRequestTrace({
    status: snapshot.status,
    error: snapshot.error,
    lastRequest: snapshot.request ?? undefined,
    lastResponse: snapshot.response ?? undefined,
    curl: snapshot.request?.request,
    now: '2026-07-03T09:00:20.000Z'
  })

  expect(trace.providerId === 'embedding-local-smoke', 'embedding trace should expose provider id')
  expect(
    trace.curl === null || !trace.curl.includes('Bearer secret-embedding'),
    'embedding curl should redact Authorization value'
  )
  expect(trace.timeline.length >= 1, 'embedding trace should include timeline events')
  expect(
    trace.curl === null || typeof trace.curl === 'string',
    'embedding trace should expose curl field'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'request'),
    'embedding trace should record request timeline'
  )
  expect(
    snapshot.timeline.some((entry) => entry.kind === 'response'),
    'embedding trace should record response timeline'
  )
}

async function checkEmbeddingRetryability() {
  let attempts = 0
  const provider = {
    id: 'embedding-local-smoke-retry',
    async chat() {
      return toObjectStream([
        { content: 'embedding provider does not support chat() in this smoke check' }
      ])
    },
    async completion() {
      return toTextStream('embedding provider does not support completion() in this smoke check')
    },
    async embedding(request) {
      attempts += 1
      if (attempts === 1) {
        const error = new Error('embedding temp failure')
        Object.assign(error, { status: 503 })
        throw error
      }

      const input = Array.isArray(request.input) ? request.input : [request.input]
      return {
        embeddings: input.map((_, index) => [index + 0.3, index + 0.4]),
        model: 'embedding-local-smoke-retry',
        usage: { promptTokens: 6, completionTokens: 0, totalTokens: 6 }
      }
    }
  }

  const embedding = useEmbedding({
    provider,
    maxRetries: 1,
    defaultRequest: {
      model: 'text-embedding-3-small',
      api: '/api/embedding',
      body: { tenant: 'embedding-retry-tenant' }
    }
  })

  const result = await embedding.embed('retryable embedding input')
  const snapshot = embedding.inspect()

  expect(attempts === 2, 'embedding provider should receive exactly two attempts')
  expect(Array.isArray(result.embeddings), 'embedding retry should resolve vector arrays')
  expect(
    snapshot.status === 'ready',
    'embedding trace should be ready after successful retry recovery'
  )
  expect(snapshot.request?.attempt === 2, 'embedding request should show recovered attempt 2')
  expect(snapshot.response?.attempt === 2, 'embedding response should show recovered attempt 2')
}

async function* toTextStream(text) {
  const textValue = String(text)
  const chunkSize = Math.max(4, Math.ceil(textValue.length / 3))
  for (let offset = 0; offset < textValue.length; offset += chunkSize) {
    yield textValue.slice(offset, offset + chunkSize)
  }
}

async function* toTextChunks(fullText) {
  const textValue = String(fullText)
  const midpoint = Math.ceil(textValue.length / 2)
  yield { content: textValue.slice(0, midpoint) }
  yield { content: textValue.slice(midpoint) }
  yield { finishReason: 'stop' }
}

async function* toObjectStream(chunks) {
  for (const chunk of chunks) {
    yield chunk
  }
}

function extractPromptFromRequest(request) {
  const messages = Array.isArray(request?.messages) ? request.messages : []
  const userMessage = messages.find((message) => message?.role === 'user')
  if (!userMessage) return 'object request'
  if (typeof userMessage.content === 'string') return userMessage.content
  if (Array.isArray(userMessage.content)) {
    return userMessage.content
      .filter((part) => part?.type === 'text')
      .map((part) => String(part.text ?? ''))
      .filter(Boolean)
      .join(' ')
      .trim()
  }
  return 'object request'
}

function toTitle(value) {
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  return normalized.length > 62 ? `${normalized.slice(0, 59)}...` : normalized
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
