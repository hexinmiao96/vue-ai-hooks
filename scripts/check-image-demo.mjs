import { existsSync, readFileSync } from 'node:fs'

const distEntry = new URL('../dist/index.mjs', import.meta.url)
const app = readFileSync('examples/image/App.vue', 'utf8')

for (const snippet of [
  'createPromptSuggestionRecipes',
  'usePromptSuggestions',
  "surfaces: ['media']",
  'visibleImageStarters',
  'applyImageStarter',
  'Image prompt starters'
]) {
  expect(app.includes(snippet), `Image demo must include: ${snippet}`)
}

if (!existsSync(distEntry)) {
  throw new Error('dist/index.mjs is missing. Run `pnpm build` before `pnpm image:check`.')
}

const { inspectRequestTrace, useImage } = await import(distEntry.href)
const requests = []

const image = useImage({
  fetch: localImageFetch,
  defaultRequest: {
    model: 'local-svg-demo',
    size: '1024x1024',
    headers: { Authorization: 'Bearer secret-image', 'x-image-demo': 'generate' }
  },
  maxRetries: 1
})

await image.generateImage('no-key generated image')
const generateSnapshot = image.inspect()
expect(requests.length === 1, 'generateImage() should send one request')
expect(!('operation' in requests[0]), 'generateImage() should keep generation body compatible')
expect(image.lastRequest.value?.operation === 'generate', 'generate trace should mark operation')
expect(generateSnapshot.hasRequest, 'generate image snapshot should include request')
expect(generateSnapshot.hasResponse, 'generate image snapshot should include response')
expect(
  generateSnapshot.request?.providerId === 'proxy',
  'generate snapshot should report proxy provider id'
)
const generateTrace = inspectRequestTrace({
  lastRequest: generateSnapshot.request ?? undefined,
  lastResponse: generateSnapshot.response ?? undefined,
  now: '2026-07-02T09:00:00.000Z'
})
expect(generateTrace.providerId === 'proxy', 'generate image trace should expose proxy provider id')
expect(
  generateTrace.curl === null || typeof generateTrace.curl === 'string',
  'generate image trace should expose curl field'
)
expect(
  generateTrace.curl === null || !generateTrace.curl.includes('Bearer secret-image'),
  'generate image curl should redact Authorization value'
)
expect(
  generateTrace.request?.headers?.Authorization === '[redacted]',
  'generate image inspect snapshot should redact Authorization value'
)
expect(
  generateSnapshot.request?.headers?.['x-image-demo'] === 'generate',
  'generate image snapshot should preserve non-sensitive headers'
)
expect(generateTrace.timeline.length >= 1, 'generate image trace should expose timeline events')
expect(
  typeof generateTrace.providerTrace?.api === 'string',
  'generate image trace should expose provider API path'
)
expect(
  image.image.value?.url?.startsWith('data:image/svg+xml'),
  'generateImage() should store a local SVG result'
)

await image.editImage('no-key edited image', {
  image: { url: 'data:image/svg+xml,source', mediaType: 'image/svg+xml' },
  mask: 'data:image/svg+xml,mask',
  model: 'local-image-edit-demo',
  body: { workflow: 'image-edit-demo' }
})
const editSnapshot = image.inspect()
expect(requests.length === 2, 'editImage() should send one additional request')
expect(requests[1].operation === 'edit', 'editImage() should send operation="edit"')
expect(requests[1].workflow === 'image-edit-demo', 'editImage() should merge per-call body')
expect(
  typeof requests[1].image === 'object' && requests[1].mask === 'data:image/svg+xml,mask',
  'editImage() should send source image and mask'
)
expect(image.lastRequest.value?.operation === 'edit', 'edit trace should mark operation')
expect(editSnapshot.hasRequest, 'edit image snapshot should include request')
expect(editSnapshot.hasResponse, 'edit image snapshot should include response')
expect(
  editSnapshot.request?.providerId === 'proxy',
  'edit snapshot should report proxy provider id'
)
const editTrace = inspectRequestTrace({
  lastRequest: editSnapshot.request ?? undefined,
  lastResponse: editSnapshot.response ?? undefined,
  now: '2026-07-02T09:00:10.000Z'
})
expect(editTrace.providerId === 'proxy', 'edit image trace should expose proxy provider id')
expect(
  editTrace.curl === null || typeof editTrace.curl === 'string',
  'edit image trace should expose curl field'
)
expect(
  editTrace.curl === null || !editTrace.curl.includes('Bearer secret-image'),
  'edit image curl should redact Authorization value'
)
expect(editTrace.timeline.length >= 1, 'edit image trace should expose timeline events')
expect(
  image.lastResponse.value?.result.providerMetadata?.operation === 'edit',
  'edit response should keep operation metadata'
)

await image.generateImage('retry generated image', {
  body: { failOnce: true, retryId: 'image-retry-smoke' }
})
const retrySnapshot = image.inspect()
expect(requests.length === 4, 'retry image generation should send two attempts')
expect(
  retrySnapshot.hasRequest && retrySnapshot.hasResponse,
  'retry image snapshot should capture request and response after recovery'
)
expect(
  retrySnapshot.request?.attempt === 2,
  'retry image request snapshot should record the second attempt'
)
expect(
  retrySnapshot.response?.attempt === 2,
  'retry image response snapshot should record the second attempt'
)
expect(retrySnapshot.retries.length === 1, 'retry image trace should record exactly one retry')
expect(
  retrySnapshot.timeline.some((entry) => entry.kind === 'retry'),
  'retry image trace should include a retry timeline event'
)
const retryTrace = inspectRequestTrace({
  status: retrySnapshot.status,
  error: retrySnapshot.error,
  lastRequest: retrySnapshot.request ?? undefined,
  lastResponse: retrySnapshot.response ?? undefined,
  curl: true,
  now: '2026-07-02T09:00:20.000Z'
})
expect(retryTrace.status === 'ready', 'retry image trace should recover to ready')
expect(
  retryTrace.curl === null || !retryTrace.curl.includes('Bearer secret-image'),
  'retry image curl should redact Authorization value'
)

console.log('Image demo check passed.')

async function localImageFetch(_url, init) {
  const body = parseRequestBody(init?.body)
  requests.push(body)
  if (
    body.failOnce &&
    body.retryId &&
    requests.filter((item) => item.retryId === body.retryId).length === 1
  ) {
    return new Response(JSON.stringify({ error: 'temporary image outage' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    })
  }
  const operation = body.operation === 'edit' ? 'edit' : 'generate'
  const prompt = typeof body.prompt === 'string' ? body.prompt : 'Vue AI Hooks'
  const url = svgDataUrl(`${operation}: ${prompt}`)
  return new Response(
    JSON.stringify({
      image: {
        url,
        mediaType: 'image/svg+xml',
        revisedPrompt: prompt
      },
      images: [
        {
          url,
          mediaType: 'image/svg+xml',
          revisedPrompt: prompt
        }
      ],
      model: body.model || 'local-svg-demo',
      providerMetadata: { operation, provider: 'local-demo' }
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

function parseRequestBody(body) {
  if (typeof body !== 'string') return {}
  try {
    const parsed = JSON.parse(body)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function svgDataUrl(label) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><text x="4" y="32">${escapeSvg(
      label
    )}</text></svg>`
  )}`
}

function escapeSvg(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
