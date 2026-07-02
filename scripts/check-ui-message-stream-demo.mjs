import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const port = 18881
const distEntry = new URL('../dist/index.mjs', import.meta.url)

if (!existsSync(distEntry)) {
  throw new Error(
    'dist/index.mjs is missing. Run `pnpm build` before `pnpm ui-message-stream:check`.'
  )
}

const { readUIMessageStream } = await import(distEntry.href)
let proxyServer

try {
  proxyServer = await startProxyServer(port)
  await checkDecodedUIMessageStream()
  console.log('UI message stream demo check passed.')
} finally {
  proxyServer?.kill()
}

function startProxyServer(proxyPort) {
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

async function checkDecodedUIMessageStream() {
  const messageId = 'msg_ui_stream_smoke'
  const prompt = 'verify AI SDK UI stream migration'
  const response = await fetch(`http://127.0.0.1:${port}/api/ui-message-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: messageId,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  expect(response.ok, '/api/ui-message-stream should return HTTP 2xx')
  expect(
    response.headers.get('content-type')?.includes('text/event-stream'),
    '/api/ui-message-stream should return an SSE response'
  )

  const chunks = []
  for await (const chunk of readUIMessageStream({ response })) {
    chunks.push(chunk)
  }

  const text = chunks
    .map((chunk) => (typeof chunk.content === 'string' ? chunk.content : ''))
    .join('')
  expect(
    text === `UI stream accepted: ${prompt}`,
    'readUIMessageStream() should assemble text-delta chunks from the proxy route'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.messageId === messageId &&
        chunk.metadata?.provider === 'proxy-server-example' &&
        chunk.metadata?.route === 'ui-message-stream'
    ),
    'readUIMessageStream() should preserve start metadata'
  )
  expect(
    chunks.some((chunk) => chunk.dataType === 'data-progress' && chunk.data?.step === 'accepted'),
    'readUIMessageStream() should decode progress data parts'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.dataType === 'source-url' &&
        typeof chunk.data?.url === 'string' &&
        chunk.data.url.includes('docs/reference/streams.md')
    ),
    'readUIMessageStream() should decode source-url data parts'
  )
  expect(
    chunks.some(
      (chunk) =>
        chunk.finishReason === 'stop' &&
        typeof chunk.usage?.totalTokens === 'number' &&
        chunk.usage.totalTokens > 0
    ),
    'readUIMessageStream() should decode finish usage'
  )
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
