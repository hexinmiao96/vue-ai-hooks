import { createHash } from 'node:crypto'
import { createServer } from 'node:http'

const port = Number(process.env.PORT || 8787)
const chatStreams = new Map()
const routes = {
  chat: new Set(['/api/chat', '/api/ai/chat']),
  completion: new Set(['/api/completion', '/api/ai/completion']),
  embedding: new Set(['/api/embedding', '/api/ai/embedding']),
  object: new Set(['/api/object', '/api/ai/object'])
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  setCors(request, response)

  if (request.method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  try {
    if (request.method === 'POST' && routes.chat.has(url.pathname)) {
      await handleChat(request, response)
      return
    }

    const resumeMatch = url.pathname.match(/^\/api(?:\/ai)?\/chat\/([^/]+)\/stream$/)
    if (request.method === 'GET' && resumeMatch) {
      handleResume(response, decodeURIComponent(resumeMatch[1]))
      return
    }

    if (request.method === 'POST' && routes.completion.has(url.pathname)) {
      await handleCompletion(request, response)
      return
    }

    if (request.method === 'POST' && routes.embedding.has(url.pathname)) {
      await handleEmbedding(request, response)
      return
    }

    if (request.method === 'POST' && routes.object.has(url.pathname)) {
      await handleObject(request, response)
      return
    }

    sendJson(response, 404, { error: 'Not found' })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Proxy server error'
    })
  }
})

server.listen(port, () => {
  console.log(`vue-ai-hooks proxy example listening on http://127.0.0.1:${port}`)
})

async function handleChat(request, response) {
  const body = await readJson(request)
  const chatId = typeof body.id === 'string' && body.id ? body.id : `chat_${Date.now()}`
  const userText = latestUserText(body.messages)
  const chunks = [
    {
      dataId: 'proxy-status',
      dataType: 'progress',
      transient: true,
      data: { step: 'accepted', chatId }
    },
    { content: 'Proxy server received: ' },
    { content: userText || 'empty prompt' },
    {
      finishReason: 'stop',
      usage: estimateChatUsage(body.messages, userText),
      metadata: { chatId, provider: 'proxy-server-example' }
    }
  ]

  chatStreams.set(chatId, chunks)
  sendSse(response, chunks)
}

function handleResume(response, chatId) {
  const chunks = chatStreams.get(chatId)
  if (!chunks) {
    response.writeHead(204)
    response.end()
    return
  }
  sendSse(response, chunks)
}

async function handleCompletion(request, response) {
  const body = await readJson(request)
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  sendSse(response, [
    { text: 'Completion from proxy: ' },
    { text: prompt || 'empty prompt' },
    { text: '.' }
  ])
}

async function handleEmbedding(request, response) {
  const body = await readJson(request)
  const inputs = Array.isArray(body.input) ? body.input : [body.input]
  const texts = inputs.map((input) => (typeof input === 'string' ? input : ''))
  const embeddings = texts.map((text) => deterministicVector(text))
  sendJson(response, 200, {
    embeddings,
    model: body.model || 'proxy-example-embedding',
    usage: {
      promptTokens: texts.reduce((total, text) => total + estimateTokens(text), 0),
      totalTokens: texts.reduce((total, text) => total + estimateTokens(text), 0)
    }
  })
}

async function handleObject(request, response) {
  const body = await readJson(request)
  const prompt = latestUserText(body.messages)
  const object = {
    title: titleFromPrompt(prompt),
    priority: prompt.toLowerCase().includes('urgent') ? 'high' : 'low'
  }
  const text = JSON.stringify(object)
  sendSse(response, [
    { content: text.slice(0, Math.ceil(text.length / 2)) },
    { content: text.slice(Math.ceil(text.length / 2)) },
    {
      finishReason: 'stop',
      usage: {
        promptTokens: estimateTokens(prompt),
        completionTokens: estimateTokens(text),
        totalTokens: estimateTokens(prompt) + estimateTokens(text)
      }
    }
  ])
}

function setCors(request, response) {
  response.setHeader('Access-Control-Allow-Origin', request.headers.origin || '*')
  response.setHeader('Access-Control-Allow-Credentials', 'true')
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader(
    'Access-Control-Allow-Headers',
    request.headers['access-control-request-headers'] || 'content-type,authorization'
  )
}

async function readJson(request) {
  let raw = ''
  for await (const chunk of request) raw += chunk
  return raw ? JSON.parse(raw) : {}
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8'
  })
  response.end(JSON.stringify(data))
}

function sendSse(response, chunks) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  })
  for (const chunk of chunks) response.write(`data: ${JSON.stringify(chunk)}\n\n`)
  response.end('data: [DONE]\n\n')
}

function latestUserText(messages) {
  if (!Array.isArray(messages)) return ''
  const message = [...messages].reverse().find((item) => item?.role === 'user')
  return contentText(message?.content)
}

function contentText(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => (part?.type === 'text' && typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join(' ')
}

function estimateChatUsage(messages, latestText) {
  const promptText = Array.isArray(messages)
    ? messages.map((message) => contentText(message?.content)).join(' ')
    : ''
  const promptTokens = estimateTokens(promptText)
  const completionTokens = estimateTokens(`Proxy server received: ${latestText}`)
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens
  }
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil(String(text || '').length / 4))
}

function deterministicVector(text) {
  const hash = createHash('sha256').update(text).digest()
  return Array.from({ length: 8 }, (_, index) => Number((hash[index] / 255).toFixed(6)))
}

function titleFromPrompt(prompt) {
  const normalized = String(prompt || 'Proxy object output')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized
}
