import { createHash } from 'node:crypto'
import { createServer } from 'node:http'

const port = Number(process.env.PORT || 8787)
const chatStreams = new Map()
const routes = {
  chat: new Set(['/api/chat', '/api/ai/chat']),
  completion: new Set(['/api/completion', '/api/ai/completion']),
  embedding: new Set(['/api/embedding', '/api/ai/embedding']),
  image: new Set(['/api/image', '/api/ai/image']),
  video: new Set(['/api/video', '/api/ai/video']),
  speech: new Set(['/api/speech', '/api/ai/speech']),
  transcription: new Set(['/api/transcription', '/api/ai/transcription']),
  rerank: new Set(['/api/rerank', '/api/ai/rerank']),
  object: new Set(['/api/object', '/api/ai/object']),
  uiMessageStream: new Set(['/api/ui-message-stream', '/api/ai/ui-message-stream'])
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

    if (request.method === 'POST' && routes.image.has(url.pathname)) {
      await handleImage(request, response)
      return
    }

    if (request.method === 'POST' && routes.video.has(url.pathname)) {
      await handleVideo(request, response)
      return
    }

    if (request.method === 'POST' && routes.speech.has(url.pathname)) {
      await handleSpeech(request, response)
      return
    }

    if (request.method === 'POST' && routes.transcription.has(url.pathname)) {
      await handleTranscription(request, response)
      return
    }

    if (request.method === 'POST' && routes.rerank.has(url.pathname)) {
      await handleRerank(request, response)
      return
    }

    if (request.method === 'POST' && routes.object.has(url.pathname)) {
      await handleObject(request, response)
      return
    }

    if (request.method === 'POST' && routes.uiMessageStream.has(url.pathname)) {
      await handleUIMessageStream(request, response)
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

async function handleImage(request, response) {
  const body = await readJson(request)
  const prompt = typeof body.prompt === 'string' ? body.prompt : 'Vue AI Hooks'
  const image = {
    url: imageSvgDataUrl(prompt),
    mediaType: 'image/svg+xml',
    revisedPrompt: prompt,
    metadata: {
      seed: deterministicSeed(prompt)
    }
  }
  sendJson(response, 200, {
    image,
    images: [image],
    model: body.model || 'proxy-example-image',
    providerMetadata: {
      provider: 'proxy-server-example'
    }
  })
}

async function handleVideo(request, response) {
  const body = await readJson(request)
  const prompt = typeof body.prompt === 'string' ? body.prompt : 'Vue AI Hooks video demo'
  const durationInSeconds = Number(body.duration) > 0 ? Number(body.duration) : 6
  const video = {
    url: videoStoryboardDataUrl(prompt),
    mediaType: 'image/svg+xml',
    durationInSeconds,
    metadata: {
      seed: deterministicSeed(prompt),
      localPreview: 'storyboard'
    }
  }
  sendJson(response, 200, {
    video,
    videos: [video],
    model: body.model || 'proxy-example-video',
    providerMetadata: {
      provider: 'proxy-server-example'
    }
  })
}

async function handleSpeech(request, response) {
  const body = await readJson(request)
  const text = typeof body.text === 'string' ? body.text : 'Vue AI Hooks speech demo'
  const audio = {
    url: silentWavDataUrl(),
    mediaType: 'audio/wav',
    revisedText: text,
    durationInSeconds: 0,
    metadata: {
      seed: deterministicSeed(text)
    }
  }
  sendJson(response, 200, {
    audio,
    model: body.model || 'proxy-example-speech',
    providerMetadata: {
      provider: 'proxy-server-example'
    }
  })
}

async function handleTranscription(request, response) {
  const body = await readJson(request)
  const audio = typeof body.audio === 'string' ? body.audio : ''
  const seed = deterministicSeed(audio || 'transcription')
  sendJson(response, 200, {
    text: `Proxy transcript ${seed}: ${transcriptionLabel(audio)}`,
    language: body.language || 'en',
    durationInSeconds: 0,
    model: body.model || 'proxy-example-transcription',
    providerMetadata: {
      provider: 'proxy-server-example'
    }
  })
}

async function handleRerank(request, response) {
  const body = await readJson(request)
  const query = typeof body.query === 'string' ? body.query : ''
  const documents = Array.isArray(body.documents) ? body.documents : []
  const ranking = documents
    .map((document, index) => ({
      index,
      score: rerankScore(query, document),
      document
    }))
    .sort((a, b) => b.score - a.score)
  const topN = Number.isInteger(body.topN) && body.topN > 0 ? body.topN : ranking.length
  const limitedRanking = ranking.slice(0, topN)
  sendJson(response, 200, {
    originalDocuments: documents,
    rerankedDocuments: limitedRanking.map((item) => item.document),
    ranking: limitedRanking,
    model: body.model || 'proxy-example-rerank',
    providerMetadata: {
      provider: 'proxy-server-example'
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

async function handleUIMessageStream(request, response) {
  const body = await readJson(request)
  const prompt = latestUserText(body.messages) || String(body.prompt || 'Vue AI Hooks stream demo')
  const messageId = typeof body.id === 'string' && body.id ? body.id : `msg_${Date.now()}`
  const text = `UI stream accepted: ${prompt}`
  const firstBreak = Math.max(1, Math.ceil(text.length / 3))
  const secondBreak = Math.max(firstBreak + 1, Math.ceil((text.length * 2) / 3))

  sendSse(response, [
    {
      type: 'start',
      messageId,
      messageMetadata: { provider: 'proxy-server-example', route: 'ui-message-stream' }
    },
    { type: 'text-start', id: 'text_1' },
    { type: 'text-delta', id: 'text_1', delta: text.slice(0, firstBreak) },
    { type: 'data-progress', id: 'progress_1', data: { step: 'accepted', value: 0.33 } },
    { type: 'text-delta', id: 'text_1', delta: text.slice(firstBreak, secondBreak) },
    {
      type: 'source-url',
      sourceId: 'docs_streams',
      url: 'https://github.com/hexinmiao96/vue-ai-hooks/blob/main/docs/reference/streams.md',
      title: 'Stream utilities'
    },
    { type: 'text-delta', id: 'text_1', delta: text.slice(secondBreak) },
    { type: 'text-end', id: 'text_1' },
    {
      type: 'finish',
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

function deterministicSeed(text) {
  return createHash('sha256').update(text).digest().readUInt32BE(0)
}

function imageSvgDataUrl(prompt) {
  const normalized = String(prompt || 'Vue AI Hooks')
    .replace(/\s+/g, ' ')
    .trim()
  const shortPrompt = normalized.length > 82 ? `${normalized.slice(0, 79)}...` : normalized
  const hue = deterministicSeed(normalized) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 78% 48%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 56) % 360} 72% 42%)"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="64" fill="url(#bg)"/>
  <rect x="96" y="122" width="832" height="780" rx="42" fill="rgba(255,255,255,0.88)"/>
  <text x="144" y="228" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="700">Proxy image route</text>
  <text x="144" y="320" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="30">${escapeSvg(shortPrompt)}</text>
  <circle cx="780" cy="690" r="118" fill="hsl(${(hue + 150) % 360} 82% 48%)"/>
  <rect x="144" y="520" width="420" height="34" rx="17" fill="#0f172a"/>
  <rect x="144" y="590" width="560" height="26" rx="13" fill="#475569"/>
  <rect x="144" y="650" width="480" height="26" rx="13" fill="#64748b"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function videoStoryboardDataUrl(prompt) {
  const normalized = String(prompt || 'Vue AI Hooks video demo')
    .replace(/\s+/g, ' ')
    .trim()
  const shortPrompt = normalized.length > 76 ? `${normalized.slice(0, 73)}...` : normalized
  const hue = deterministicSeed(normalized) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <rect width="1280" height="720" rx="36" fill="#0f172a"/>
  <rect x="52" y="52" width="1176" height="616" rx="30" fill="#f8fafc"/>
  <text x="88" y="124" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700">Proxy video route</text>
  <text x="88" y="182" fill="#475569" font-family="Inter, Arial, sans-serif" font-size="24">${escapeSvg(shortPrompt)}</text>
  <g transform="translate(88 248)">
    <rect width="310" height="232" rx="22" fill="hsl(${hue} 76% 45%)"/>
    <rect x="32" y="42" width="182" height="22" rx="11" fill="#ffffff"/>
    <rect x="32" y="92" width="236" height="16" rx="8" fill="rgba(255,255,255,0.72)"/>
    <circle cx="238" cy="164" r="42" fill="hsl(${(hue + 150) % 360} 82% 52%)"/>
  </g>
  <g transform="translate(486 248)">
    <rect width="310" height="232" rx="22" fill="hsl(${(hue + 42) % 360} 72% 45%)"/>
    <path d="M116 68 L226 116 L116 164 Z" fill="#ffffff"/>
    <rect x="42" y="184" width="226" height="14" rx="7" fill="rgba(255,255,255,0.78)"/>
  </g>
  <g transform="translate(884 248)">
    <rect width="310" height="232" rx="22" fill="hsl(${(hue + 92) % 360} 68% 42%)"/>
    <rect x="40" y="54" width="230" height="24" rx="12" fill="#ffffff"/>
    <rect x="40" y="112" width="170" height="18" rx="9" fill="rgba(255,255,255,0.72)"/>
    <rect x="40" y="160" width="210" height="18" rx="9" fill="rgba(255,255,255,0.58)"/>
  </g>
  <rect x="88" y="560" width="820" height="20" rx="10" fill="#cbd5e1"/>
  <rect x="88" y="560" width="420" height="20" rx="10" fill="#0f172a"/>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function silentWavDataUrl() {
  return 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA='
}

function escapeSvg(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function titleFromPrompt(prompt) {
  const normalized = String(prompt || 'Proxy object output')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized
}

function transcriptionLabel(audio) {
  const normalized = String(audio || 'audio')
    .replace(/\s+/g, ' ')
    .trim()
  if (normalized.startsWith('data:audio/')) return 'inline audio payload'
  return normalized.length > 48 ? `${normalized.slice(0, 45)}...` : normalized
}

function rerankScore(query, document) {
  const queryTerms = tokenize(query)
  const documentTerms = new Set(tokenize(documentText(document)))
  const overlap = queryTerms.filter((term) => documentTerms.has(term)).length
  const seed = deterministicSeed(`${query}:${documentText(document)}`) % 100
  return Number((overlap + seed / 1000).toFixed(6))
}

function documentText(document) {
  if (typeof document === 'string') return document
  if (!document || typeof document !== 'object') return ''
  return Object.values(document)
    .map((value) => (typeof value === 'string' ? value : ''))
    .filter(Boolean)
    .join(' ')
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/u)
    .filter(Boolean)
}
