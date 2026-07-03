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

const { useImage } = await import(distEntry.href)
const requests = []

const image = useImage({
  fetch: localImageFetch,
  defaultRequest: {
    model: 'local-svg-demo',
    size: '1024x1024'
  }
})

await image.generateImage('no-key generated image')
expect(requests.length === 1, 'generateImage() should send one request')
expect(!('operation' in requests[0]), 'generateImage() should keep generation body compatible')
expect(image.lastRequest.value?.operation === 'generate', 'generate trace should mark operation')
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
expect(requests.length === 2, 'editImage() should send one additional request')
expect(requests[1].operation === 'edit', 'editImage() should send operation="edit"')
expect(requests[1].workflow === 'image-edit-demo', 'editImage() should merge per-call body')
expect(
  typeof requests[1].image === 'object' && requests[1].mask === 'data:image/svg+xml,mask',
  'editImage() should send source image and mask'
)
expect(image.lastRequest.value?.operation === 'edit', 'edit trace should mark operation')
expect(
  image.lastResponse.value?.result.providerMetadata?.operation === 'edit',
  'edit response should keep operation metadata'
)

console.log('Image demo check passed.')

async function localImageFetch(_url, init) {
  const body = parseRequestBody(init?.body)
  requests.push(body)
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
