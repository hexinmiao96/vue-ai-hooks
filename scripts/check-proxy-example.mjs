import { spawn } from 'node:child_process'
import { createServer } from 'node:http'

const port = 18878
const upstreamPort = 18879
const upstreamProxyPort = 18880
let baseURL = `http://127.0.0.1:${port}`
let defaultServer
let upstreamServer
let upstreamProxyServer

try {
  defaultServer = await startProxyServer(port)
  await checkChatRoute('/api/chat', 'default-chat')
  await checkChatRoute('/api/ai/chat', 'legacy-chat')
  await checkResumeRoute('/api/chat/default-chat/stream')
  await checkResumeRoute('/api/ai/chat/legacy-chat/stream')
  await checkCompletionRoute()
  await checkEmbeddingRoute()
  await checkImageRoute()
  await checkVideoRoute()
  await checkSpeechRoute()
  await checkTranscriptionRoute()
  await checkRerankRoute()
  await checkObjectRoute()
  await checkUIMessageStreamRoute()
  upstreamServer = await startFakeUpstream()
  baseURL = `http://127.0.0.1:${upstreamProxyPort}`
  upstreamProxyServer = await startProxyServer(upstreamProxyPort, {
    PROXY_UPSTREAM_BASE_URL: `http://127.0.0.1:${upstreamPort}/v1`,
    PROXY_UPSTREAM_API_KEY: 'test-upstream-key',
    PROXY_UPSTREAM_MODEL: 'fake-upstream-model',
    PROXY_UPSTREAM_TIMEOUT_MS: '100',
    PROXY_UPSTREAM_TRACE_HEADER: 'x-request-id'
  })
  await checkUpstreamChatRoute()
  await checkUpstreamCompletionRoute()
  await checkUpstreamEmbeddingRoute()
  await checkUpstreamErrorSanitization()
  await checkUpstreamTimeout()
  console.log('Proxy example check passed for default, legacy, and upstream routes.')
} finally {
  defaultServer?.kill()
  upstreamProxyServer?.kill()
  upstreamServer?.close()
}

function startProxyServer(proxyPort, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['examples/proxy-server/server.mjs'], {
      env: {
        ...process.env,
        PROXY_UPSTREAM_BASE_URL: '',
        PROXY_UPSTREAM_API_KEY: '',
        PROXY_UPSTREAM_MODEL: '',
        PROXY_UPSTREAM_CHAT_PATH: '',
        PROXY_UPSTREAM_COMPLETION_PATH: '',
        PROXY_UPSTREAM_EMBEDDING_PATH: '',
        PROXY_UPSTREAM_TIMEOUT_MS: '',
        PROXY_UPSTREAM_TRACE_HEADER: '',
        ...env,
        PORT: String(proxyPort)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`Proxy example did not start:\n${output}`))
    }, 5000)

    child.stdout.on('data', (chunk) => {
      output += String(chunk)
      if (output.includes(`http://127.0.0.1:${proxyPort}`)) {
        clearTimeout(timeout)
        resolve(child)
      }
    })
    child.stderr.on('data', (chunk) => {
      output += String(chunk)
    })
    child.on('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`Proxy example exited early with code ${code}:\n${output}`))
    })
  })
}

function startFakeUpstream() {
  const server = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.headers.authorization !== 'Bearer test-upstream-key') {
      sendFakeJson(response, 401, { error: 'missing test authorization' })
      return
    }

    const body = await readFakeJson(request)
    if (!body.model) {
      sendFakeJson(response, 400, { error: 'missing model' })
      return
    }
    if (!request.headers['x-request-id']) {
      sendFakeJson(response, 400, { error: 'missing trace header' })
      return
    }

    if (request.url === '/v1/chat/completions') {
      sendFakeJson(response, 200, {
        id: 'fake-chat-response',
        model: body.model,
        choices: [
          {
            message: {
              role: 'assistant',
              content: `Upstream chat response: ${latestFakeText(body.messages)}`
            },
            finish_reason: 'stop'
          }
        ],
        usage: { prompt_tokens: 7, completion_tokens: 5, total_tokens: 12 }
      })
      return
    }

    if (request.url === '/v1/completions') {
      if (String(body.prompt || '').includes('timeout')) {
        await sleep(300)
      }
      if (String(body.prompt || '').includes('leak secret')) {
        sendFakeJson(response, 429, {
          error: 'rate limited with secret test-upstream-key in provider body'
        })
        return
      }
      sendFakeJson(response, 200, {
        id: 'fake-completion-response',
        model: body.model,
        choices: [{ text: `Upstream completion: ${body.prompt || 'empty prompt'}` }],
        usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 }
      })
      return
    }

    if (request.url === '/v1/embeddings') {
      const inputs = Array.isArray(body.input) ? body.input : [body.input]
      sendFakeJson(response, 200, {
        model: body.model,
        data: inputs.map((_, index) => ({
          object: 'embedding',
          index,
          embedding: [index + 0.1, index + 0.2, index + 0.3]
        })),
        usage: { prompt_tokens: inputs.length, total_tokens: inputs.length }
      })
      return
    }

    sendFakeJson(response, 404, { error: 'not found' })
  })

  return new Promise((resolve) => {
    server.listen(upstreamPort, '127.0.0.1', () => resolve(server))
  })
}

async function checkChatRoute(path, chatId) {
  const events = await postSse(path, {
    id: chatId,
    messages: [{ role: 'user', content: `hello from ${chatId}` }]
  })
  expect(
    events.some((event) => event.content === `hello from ${chatId}`),
    `${path} should stream the latest user message`
  )
  expect(
    events.some((event) => event.metadata?.chatId === chatId),
    `${path} should include chat metadata`
  )
}

async function checkResumeRoute(path) {
  const events = await getSse(path)
  expect(
    events.some((event) => String(event.content || '').startsWith('Proxy server received')),
    `${path} should replay the stored chat stream`
  )
}

async function checkCompletionRoute() {
  const events = await postSse('/api/completion', { prompt: 'write a status update' })
  expect(
    events.map((event) => event.text || '').join('') ===
      'Completion from proxy: write a status update.',
    '/api/completion should stream text chunks'
  )
}

async function checkEmbeddingRoute() {
  const response = await postJson('/api/embedding', { input: ['alpha', 'beta'] })
  expect(response.embeddings?.length === 2, '/api/embedding should return one vector per input')
  expect(
    response.embeddings?.[0]?.length === 8,
    '/api/embedding should return deterministic vectors'
  )
  expect(response.usage?.totalTokens > 0, '/api/embedding should return usage metadata')
}

async function checkImageRoute() {
  const response = await postJson('/api/image', {
    prompt: 'A Vue composable dashboard hero image',
    model: 'proxy-image-model'
  })
  expect(response.image?.url?.startsWith('data:image/svg+xml'), '/api/image should return an SVG')
  expect(response.images?.length === 1, '/api/image should return one normalized image')
  expect(response.model === 'proxy-image-model', '/api/image should preserve the requested model')

  const legacy = await postJson('/api/ai/image', { prompt: 'legacy image route' })
  expect(
    legacy.image?.metadata?.seed !== undefined,
    '/api/ai/image should return deterministic image metadata'
  )
}

async function checkVideoRoute() {
  const response = await postJson('/api/video', {
    prompt: 'A Vue composable product walkthrough',
    model: 'proxy-video-model',
    duration: 6
  })
  expect(response.video?.url?.startsWith('data:image/svg+xml'), '/api/video should return an SVG')
  expect(response.videos?.length === 1, '/api/video should return one normalized video')
  expect(
    response.video?.durationInSeconds === 6,
    '/api/video should preserve the requested duration'
  )
  expect(response.model === 'proxy-video-model', '/api/video should preserve the requested model')

  const legacy = await postJson('/api/ai/video', { prompt: 'legacy video route' })
  expect(
    legacy.video?.metadata?.seed !== undefined,
    '/api/ai/video should return deterministic video metadata'
  )
}

async function checkSpeechRoute() {
  const response = await postJson('/api/speech', {
    text: 'Read the status update',
    model: 'proxy-speech-model'
  })
  expect(response.audio?.url?.startsWith('data:audio/wav'), '/api/speech should return a WAV')
  expect(response.audio?.revisedText === 'Read the status update', '/api/speech should echo text')
  expect(response.model === 'proxy-speech-model', '/api/speech should preserve the requested model')

  const legacy = await postJson('/api/ai/speech', { text: 'legacy speech route' })
  expect(
    legacy.audio?.metadata?.seed !== undefined,
    '/api/ai/speech should return deterministic audio metadata'
  )
}

async function checkTranscriptionRoute() {
  const response = await postJson('/api/transcription', {
    audio: 'data:audio/wav;base64,UklGRg==',
    language: 'en',
    model: 'proxy-transcription-model'
  })
  expect(
    response.text?.includes('inline audio payload'),
    '/api/transcription should return transcript text'
  )
  expect(response.language === 'en', '/api/transcription should preserve the requested language')
  expect(
    response.model === 'proxy-transcription-model',
    '/api/transcription should preserve the requested model'
  )

  const legacy = await postJson('/api/ai/transcription', { audio: 'legacy-audio-url' })
  expect(
    legacy.text?.includes('legacy-audio-url'),
    '/api/ai/transcription should return deterministic transcript text'
  )
}

async function checkRerankRoute() {
  const response = await postJson('/api/rerank', {
    query: 'Vue document ranking',
    documents: ['Billing workflow', 'Vue document ranking with composables', 'Audio output'],
    model: 'proxy-rerank-model',
    topN: 2
  })
  expect(response.ranking?.length === 2, '/api/rerank should respect topN')
  expect(
    response.rerankedDocuments?.[0] === 'Vue document ranking with composables',
    '/api/rerank should rank the most relevant document first'
  )
  expect(response.model === 'proxy-rerank-model', '/api/rerank should preserve the requested model')

  const legacy = await postJson('/api/ai/rerank', {
    query: 'legacy route',
    documents: ['legacy route document', 'unrelated']
  })
  expect(
    legacy.rerankedDocuments?.[0] === 'legacy route document',
    '/api/ai/rerank should return deterministic reranked documents'
  )
}

async function checkObjectRoute() {
  const events = await postSse('/api/object', {
    messages: [{ role: 'user', content: 'urgent account access blocked' }]
  })
  const text = events.map((event) => event.content || '').join('')
  const object = JSON.parse(text)
  expect(object.priority === 'high', '/api/object should stream a high-priority object')
  expect(
    object.title.includes('urgent account'),
    '/api/object should derive a title from the prompt'
  )
}

async function checkUIMessageStreamRoute() {
  const events = await postSse('/api/ui-message-stream', {
    id: 'msg_docs_demo',
    messages: [{ role: 'user', content: 'show stream helpers' }]
  })
  expect(
    events.some((event) => event.type === 'start' && event.messageId === 'msg_docs_demo'),
    '/api/ui-message-stream should emit a start part with messageId'
  )
  expect(
    events
      .filter((event) => event.type === 'text-delta')
      .map((event) => event.delta || '')
      .join('')
      .includes('show stream helpers'),
    '/api/ui-message-stream should stream text-delta parts'
  )
  expect(
    events.some((event) => event.type === 'source-url' && event.sourceId === 'docs_streams'),
    '/api/ui-message-stream should emit source-url metadata'
  )
  expect(
    events.some((event) => event.type === 'finish' && event.finishReason === 'stop'),
    '/api/ui-message-stream should emit a finish part'
  )

  const legacy = await postSse('/api/ai/ui-message-stream', { prompt: 'legacy stream route' })
  expect(
    legacy.some((event) => event.type === 'data-progress'),
    '/api/ai/ui-message-stream should emit progress data parts'
  )
}

async function checkUpstreamChatRoute() {
  const events = await postSse('/api/chat', {
    id: 'upstream-chat',
    model: 'request-chat-model',
    messages: [{ role: 'user', content: 'hello upstream' }]
  })
  expect(
    events.some((event) => event.content === 'Upstream chat response: hello upstream'),
    '/api/chat should normalize OpenAI-compatible chat responses'
  )
  expect(
    events.some(
      (event) =>
        event.metadata?.provider === 'openai-compatible' &&
        event.metadata?.upstreamModel === 'request-chat-model' &&
        event.metadata?.upstreamTraceHeader === 'x-request-id' &&
        String(event.metadata?.proxyTraceId || '').startsWith('proxy-')
    ),
    '/api/chat should include sanitized upstream trace metadata'
  )

  const replay = await getSse('/api/chat/upstream-chat/stream')
  expect(
    replay.some((event) => event.content === 'Upstream chat response: hello upstream'),
    '/api/chat/:id/stream should replay upstream chat responses'
  )
}

async function checkUpstreamCompletionRoute() {
  const events = await postSse('/api/completion', { prompt: 'write release notes' })
  expect(
    events.map((event) => event.text || '').join('') === 'Upstream completion: write release notes',
    '/api/completion should normalize OpenAI-compatible completion responses'
  )
}

async function checkUpstreamEmbeddingRoute() {
  const response = await postJson('/api/embedding', { input: ['alpha', 'beta'] })
  expect(response.model === 'fake-upstream-model', '/api/embedding should use the env model')
  expect(response.embeddings?.length === 2, '/api/embedding should normalize upstream vectors')
  expect(response.embeddings?.[1]?.[0] === 1.1, '/api/embedding should preserve vector values')
  expect(response.usage?.totalTokens === 2, '/api/embedding should normalize upstream usage')
  expect(
    String(response.providerMetadata?.proxyTraceId || '').startsWith('proxy-'),
    '/api/embedding should include sanitized proxy trace metadata'
  )
}

async function checkUpstreamErrorSanitization() {
  const { status, body } = await postJsonWithStatus('/api/completion', {
    prompt: 'leak secret from upstream'
  })
  const serialized = JSON.stringify(body)
  expect(status === 502, '/api/completion should map upstream HTTP errors to a 502')
  expect(body.upstreamStatus === 429, '/api/completion should expose sanitized upstream status')
  expect(body.retryable === true, '/api/completion should mark 429 upstream errors retryable')
  expect(
    body.code === 'upstream_http_error',
    '/api/completion should classify upstream HTTP errors'
  )
  expect(String(body.traceId || '').startsWith('proxy-'), '/api/completion should return trace id')
  expect(
    !serialized.includes('test-upstream-key'),
    '/api/completion should not leak raw upstream error bodies'
  )
}

async function checkUpstreamTimeout() {
  const { status, body } = await postJsonWithStatus('/api/completion', {
    prompt: 'timeout upstream request'
  })
  expect(status === 504, '/api/completion should return 504 for upstream timeouts')
  expect(body.code === 'upstream_timeout', '/api/completion should classify upstream timeouts')
  expect(body.retryable === true, '/api/completion should mark timeouts retryable')
  expect(String(body.traceId || '').startsWith('proxy-'), '/api/completion should trace timeouts')
}

async function postJson(path, body) {
  const response = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  expect(response.ok, `${path} should return HTTP 2xx`)
  return await response.json()
}

async function postJsonWithStatus(path, body) {
  const response = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return { status: response.status, body: await response.json() }
}

async function postSse(path, body) {
  const response = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  expect(response.ok, `${path} should return HTTP 2xx`)
  return parseSse(await response.text())
}

async function getSse(path) {
  const response = await fetch(`${baseURL}${path}`)
  expect(response.ok, `${path} should return HTTP 2xx`)
  return parseSse(await response.text())
}

function parseSse(text) {
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6).trim())
    .filter((line) => line && line !== '[DONE]')
    .map((line) => JSON.parse(line))
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}

async function readFakeJson(request) {
  let raw = ''
  for await (const chunk of request) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

function sendFakeJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(data))
}

function latestFakeText(messages) {
  if (!Array.isArray(messages)) return ''
  const message = [...messages].reverse().find((item) => item?.role === 'user')
  return typeof message?.content === 'string' ? message.content : ''
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
