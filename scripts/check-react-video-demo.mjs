import { readFileSync } from 'node:fs'

const app = readFileSync('examples/react-video/App.tsx', 'utf8')
const config = readFileSync('examples/react-video/vite.config.ts', 'utf8')
const packageJson = readFileSync('package.json', 'utf8')

for (const snippet of [
  "from 'vue-ai-hooks/react'",
  'createPromptSuggestionRecipes',
  'usePromptSuggestions',
  "surfaces: ['media']",
  'visibleSuggestions',
  'inspectRequestTrace',
  'VITE_EXAMPLE_PROVIDER',
  'VITE_PROXY_BASE_URL',
  'VITE_PROXY_VIDEO_URL',
  "const videoApi = import.meta.env.VITE_PROXY_VIDEO_URL || '/api/video'",
  'localVideoFetch',
  'generateVideo(prompt,',
  'handleSubmit(event)',
  'storyboardDataUrl',
  "mediaType: 'image/svg+xml'",
  "provider: 'react-local-video'",
  'Trace JSON',
  'Copy curl'
]) {
  expect(app.includes(snippet), `React video demo must include: ${snippet}`)
}

for (const snippet of ["find: 'vue-ai-hooks/react'", "find: 'vue-ai-hooks'", 'port: 5187']) {
  expect(config.includes(snippet), `React video Vite config must include: ${snippet}`)
}

for (const snippet of [
  '"example:react-video"',
  '"example:react-video:build"',
  '"react-video:check"'
]) {
  expect(packageJson.includes(snippet), `package scripts must include: ${snippet}`)
}

console.log('React video demo check passed.')

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
