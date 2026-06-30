import { spawn } from 'node:child_process'

const port = 18878
const baseURL = `http://127.0.0.1:${port}`
let server

try {
  server = await startProxyServer()
  await checkChatRoute('/api/chat', 'default-chat')
  await checkChatRoute('/api/ai/chat', 'legacy-chat')
  await checkResumeRoute('/api/chat/default-chat/stream')
  await checkResumeRoute('/api/ai/chat/legacy-chat/stream')
  await checkCompletionRoute()
  await checkEmbeddingRoute()
  await checkImageRoute()
  await checkSpeechRoute()
  await checkObjectRoute()
  console.log('Proxy example check passed for default and legacy routes.')
} finally {
  server?.kill()
}

function startProxyServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['examples/proxy-server/server.mjs'], {
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`Proxy example did not start:\n${output}`))
    }, 5000)

    child.stdout.on('data', (chunk) => {
      output += String(chunk)
      if (output.includes(`http://127.0.0.1:${port}`)) {
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

async function postJson(path, body) {
  const response = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  expect(response.ok, `${path} should return HTTP 2xx`)
  return await response.json()
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
