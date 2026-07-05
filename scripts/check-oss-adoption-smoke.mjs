import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const tempRoot = mkdtempSync(join(tmpdir(), 'vue-ai-hooks-oss-adoption-'))
const targetCommit = '273065d2860a3acc5724cfdbdf36927da1dc9080'
const archiveUrl = `https://codeload.github.com/un-pany/v3-admin-vite/tar.gz/${targetCommit}`

try {
  expect(existsSync(join(root, 'dist/index.mjs')), 'Run pnpm build before oss-adoption:check')
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const tarball = packCurrentPackage(packageJson.version)
  const targetRoot = prepareTargetApp()

  writeFileSync(
    join(targetRoot, 'pnpm-workspace.yaml'),
    `packages:
  - .

allowBuilds:
  '@parcel/watcher': true
  esbuild: true

minimumReleaseAgeExclude:
  - vue-ai-hooks@${packageJson.version}
`
  )

  run('Install upstream app dependencies', 'pnpm', ['install', '--frozen-lockfile'], {
    cwd: targetRoot
  })
  run('Install local vue-ai-hooks tarball', 'pnpm', ['add', '--save-exact', tarball], {
    cwd: targetRoot
  })
  run('Install smoke browser runner', 'pnpm', ['add', '-D', '--save-exact', 'playwright@1.56.1'], {
    cwd: targetRoot
  })
  run('Install Playwright Chromium', 'pnpm', playwrightInstallArgs(), { cwd: targetRoot })

  patchTargetApp(targetRoot, packageJson.version)

  run('Build v3-admin-vite with local vue-ai-hooks', 'pnpm', ['build'], { cwd: targetRoot })
  run('Run v3-admin-vite adoption smoke', 'pnpm', ['smoke:vue-ai-hooks'], { cwd: targetRoot })

  console.log(`OSS adoption smoke passed for un-pany/v3-admin-vite@${targetCommit}.`)
} finally {
  if (process.env.OSS_ADOPTION_KEEP_TEMP !== 'true') {
    rmSync(tempRoot, { recursive: true, force: true })
  } else {
    console.log(`Kept OSS adoption temp directory: ${tempRoot}`)
  }
}

function packCurrentPackage(version) {
  const output = execFileSync('npm', ['pack', '--json', '--pack-destination', tempRoot], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  })
  const [packed] = JSON.parse(output)
  const tarball = join(tempRoot, packed.filename)
  expect(
    packed.filename === `vue-ai-hooks-${version}.tgz`,
    `Unexpected package tarball: ${packed.filename}`
  )
  return tarball
}

function prepareTargetApp() {
  const archivePath = join(tempRoot, 'v3-admin-vite.tgz')
  run('Download v3-admin-vite archive', 'curl', [
    '-L',
    '--fail',
    '--retry',
    '3',
    '--retry-delay',
    '2',
    '-o',
    archivePath,
    archiveUrl
  ])
  run('Extract v3-admin-vite archive', 'tar', ['-xzf', archivePath, '-C', tempRoot])
  const targetDir = readdirSync(tempRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .find((name) => name.startsWith('v3-admin-vite-'))
  expect(targetDir, 'Unable to find extracted v3-admin-vite directory')
  return join(tempRoot, targetDir)
}

function patchTargetApp(targetRoot, version) {
  const packagePath = join(targetRoot, 'package.json')
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
  packageJson.scripts = {
    ...packageJson.scripts,
    'validation:backend': 'node server.mjs',
    'smoke:vue-ai-hooks': 'node scripts/vue-ai-hooks-smoke.mjs'
  }
  writeJson(packagePath, packageJson)

  replaceInFile(
    join(targetRoot, 'vite.config.ts'),
    `      proxy: {
        "/api/v1": {`,
    `      proxy: {
        "/api/validation": {
          target: "http://127.0.0.1:4174",
          ws: false,
          changeOrigin: true
        },
        "/api/v1": {`
  )

  replaceInFile(
    join(targetRoot, 'src/router/index.ts'),
    `  {
    path: "/login",
    component: () => import("@/pages/login/index.vue"),
    meta: {
      hidden: true
    }
  },`,
    `  {
    path: "/login",
    component: () => import("@/pages/login/index.vue"),
    meta: {
      hidden: true
    }
  },
  {
    path: "/vue-ai-hooks-validation",
    component: () => import("@/pages/vue-ai-hooks-validation/index.vue"),
    name: "VueAiHooksValidation",
    meta: {
      title: "vue-ai-hooks 验证",
      hidden: true
    }
  },`
  )

  replaceInFile(
    join(targetRoot, 'src/router/whitelist.ts'),
    `const whiteListByPath: string[] = ["/login"]`,
    `const whiteListByPath: string[] = ["/login", "/vue-ai-hooks-validation"]`
  )

  run('Create smoke directories', 'mkdir', ['-p', 'src/pages/vue-ai-hooks-validation', 'scripts'], {
    cwd: targetRoot
  })
  writeFileSync(join(targetRoot, 'server.mjs'), serverSource())
  writeFileSync(join(targetRoot, 'scripts/vue-ai-hooks-smoke.mjs'), smokeSource())
  writeFileSync(
    join(targetRoot, 'src/pages/vue-ai-hooks-validation/index.vue'),
    validationPageSource(version)
  )
}

function serverSource() {
  return `import http from "node:http"

const port = Number(process.env.VALIDATION_BACKEND_PORT ?? 4174)

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ""
    req.setEncoding("utf8")
    req.on("data", (chunk) => {
      raw += chunk
    })
    req.on("end", () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on("error", reject)
  })
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json",
    ...headers
  })
  res.end(JSON.stringify(body))
}

function sendSse(res, chunks, headers = {}) {
  res.writeHead(200, {
    "cache-control": "no-cache",
    "connection": "keep-alive",
    "content-type": "text/event-stream",
    ...headers
  })
  for (const chunk of chunks) {
    res.write(\`data: \${JSON.stringify(chunk)}\\n\\n\`)
  }
  res.end()
}

function validateContext(req, body) {
  return (
    req.headers["x-session-token"] === "session-validation-secret"
    && req.headers["x-tenant-id"] === "oss-v3-admin-vite"
    && typeof req.headers["x-run-id"] === "string"
    && body?.validation === true
  )
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true })
    return
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method_not_allowed" })
    return
  }

  const body = await readBody(req)
  const traceId = \`trace-\${Date.now()}\`

  if (!validateContext(req, body)) {
    sendJson(res, 401, { error: "invalid_validation_context", traceId }, { "x-trace-id": traceId })
    return
  }

  if (req.url === "/api/validation/chat") {
    sendSse(
      res,
      [
        {
          metadata: {
            traceId,
            tenantId: req.headers["x-tenant-id"],
            runId: req.headers["x-run-id"]
          }
        },
        { content: "oss-proxy-ok" },
        {
          data: { progress: 1, source: "proxy", traceId },
          dataId: "proxy-progress",
          dataType: "validation-progress"
        },
        { finishReason: "stop", metadata: { traceId } }
      ],
      { "x-trace-id": traceId }
    )
    return
  }

  if (req.url === "/api/validation/fail") {
    sendJson(
      res,
      502,
      {
        error: "validation_proxy_failure",
        traceId,
        message: "Forced validation failure from app-owned proxy"
      },
      { "x-trace-id": traceId }
    )
    return
  }

  sendJson(res, 404, { error: "not_found", traceId }, { "x-trace-id": traceId })
})

server.listen(port, "127.0.0.1", () => {
  console.log(\`validation backend listening on http://127.0.0.1:\${port}\`)
})

process.on("SIGTERM", () => {
  server.close(() => process.exit(0))
})
`
}

function smokeSource() {
  return `import { spawn } from "node:child_process"
import { setTimeout as wait } from "node:timers/promises"
import { chromium } from "playwright"

const frontendUrl = "http://127.0.0.1:3333"
const pageUrl = \`\${frontendUrl}/#/vue-ai-hooks-validation\`
const backendUrl = "http://127.0.0.1:4174/health"
const processes = []
let browser

function start(command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  })
  child.stdout.on("data", chunk => process.stdout.write(chunk))
  child.stderr.on("data", chunk => process.stderr.write(chunk))
  processes.push(child)
  return child
}

async function waitForUrl(url) {
  const started = Date.now()
  while (Date.now() - started < 30000) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Keep polling until both local servers are ready.
    }
    await wait(250)
  }
  throw new Error(\`Timed out waiting for \${url}\`)
}

async function text(page, testId) {
  return (await page.getByTestId(testId).textContent()) ?? ""
}

async function main() {
  start("node", ["server.mjs"])
  start("node", [
    "./node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "3333",
    "--open=false",
    "--clearScreen=false"
  ])
  await waitForUrl(backendUrl)
  await waitForUrl(pageUrl)

  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(pageUrl)

  await page.getByTestId("run-local").click()
  await page.getByText("oss-local-ok").waitFor()

  await page.getByTestId("run-proxy").click()
  await page.getByText("oss-proxy-ok").waitFor()
  const threadId = await text(page, "thread-id")
  const proxyCount = Number(await text(page, "proxy-message-count"))
  if (!threadId || proxyCount < 2) throw new Error("Proxy chat did not persist expected messages")

  await page.reload()
  await page.getByText("oss-proxy-ok").waitFor()
  await page.getByText("Thread restored").waitFor()
  const restoredThreadId = await text(page, "thread-id")
  if (restoredThreadId !== threadId) throw new Error("Thread id changed after reload")

  await page.getByTestId("run-failure").click()
  await page.getByText("Forced failure captured").waitFor()
  await page.getByText("No secret leakage").waitFor()
  const failureTrace = await text(page, "failure-trace")
  if (!failureTrace.includes("502")) throw new Error("Failure trace does not include 502 status")
  if (failureTrace.includes("session-validation-secret") || failureTrace.includes("body-validation-secret")) {
    throw new Error("Failure trace leaked validation secrets")
  }

  await browser.close()
  browser = undefined
  console.log("v3-admin-vite smoke passed for vue-ai-hooks")
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await browser?.close()
    for (const child of processes.reverse()) {
      child.kill("SIGTERM")
    }
    await wait(300)
  })
`
}

function validationPageSource(version) {
  return `<script lang="ts" setup>
import type { ChatRequest, Message } from "vue-ai-hooks"
import { DirectChatTransport, proxyProvider, useChat, useChatThreads } from "vue-ai-hooks"

defineOptions({
  name: "VueAiHooksValidation"
})

const sessionSecret = "session-validation-secret"
const bodySecret = "body-validation-secret"
const tenantId = "oss-v3-admin-vite"
const runId = shallowRef(\`oss-\${Date.now()}\`)
const failureTrace = shallowRef("No forced failure yet.")
const smokeStatus = shallowRef("Ready")

async function* localValidationStream(request: ChatRequest) {
  yield {
    metadata: {
      provider: "oss-local",
      messageCount: request.messages.length
    }
  }
  yield { content: "oss-local-ok" }
  yield {
    data: { progress: 1, source: "local" },
    dataId: "local-progress",
    dataType: "validation-progress"
  }
  yield { finishReason: "stop" }
}

const localProvider = new DirectChatTransport({
  id: "oss-local",
  streamProtocol: "chat-chunk",
  stream: localValidationStream
})

const threads = useChatThreads({
  persist: { key: "v3-admin-vite:vue-ai-hooks:threads", version: 1 }
})
const initialThread = threads.activeThread.value ?? threads.createThread({ title: "OSS adoption smoke" })

const localChat = useChat({
  id: "oss-local-chat",
  provider: localProvider
})

const proxyChat = useChat({
  id: initialThread.id,
  threadId: initialThread.id,
  provider: proxyProvider({
    chatUrl: "/api/validation/chat",
    headers: () => ({
      "x-session-token": sessionSecret,
      "x-tenant-id": tenantId,
      "x-run-id": runId.value
    }),
    body: () => ({
      validation: true,
      bodySecret,
      runId: runId.value
    })
  }),
  persist: {
    key: \`v3-admin-vite:vue-ai-hooks:messages:\${initialThread.id}\`,
    version: 1
  }
})

const failureChat = useChat({
  id: "oss-failure-chat",
  provider: proxyProvider({
    chatUrl: "/api/validation/fail",
    headers: () => ({
      "x-session-token": sessionSecret,
      "x-tenant-id": tenantId,
      "x-run-id": runId.value
    }),
    body: () => ({
      validation: true,
      bodySecret,
      runId: runId.value
    })
  })
})

const activeThreadTitle = computed(() => threads.activeThread.value?.title ?? initialThread.title)
const failureInspection = computed(() => failureChat.inspect())
const proxyInspection = computed(() => proxyChat.inspect())
const proxyMessageCount = computed(() => proxyChat.messages.value.length)
const restoreLabel = computed(() =>
  proxyMessageCount.value > 0 && threads.activeThread.value ? "Thread restored" : "Thread pending"
)
const failureLeakCheck = computed(() => {
  const trace = failureTrace.value
  return !trace.includes(sessionSecret) && !trace.includes(bodySecret) ? "No secret leakage" : "Secret leaked"
})
const proxyTraceId = computed(() => {
  const response = proxyInspection.value.response as { headers?: Record<string, string> } | undefined
  return response?.headers?.["x-trace-id"] ?? response?.headers?.["X-Trace-Id"] ?? "pending"
})

function messageText(message: Message) {
  const content = message.content
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .map((part) => {
      if (typeof part === "string") return part
      if (part && typeof part === "object" && "text" in part) return String(part.text)
      if (part && typeof part === "object" && "content" in part) return String(part.content)
      return ""
    })
    .join("")
}

async function runLocalSmoke() {
  smokeStatus.value = "Running local validation"
  await localChat.append("Run local validation.")
  smokeStatus.value = "Local validation passed"
}

async function runProxySmoke() {
  smokeStatus.value = "Running proxy validation"
  await proxyChat.append("Run proxy validation.")
  threads.touchThread(initialThread.id, {
    lastMessagePreview: "oss-proxy-ok",
    messageCount: proxyChat.messages.value.length,
    metadata: { tenantId, runId: runId.value }
  })
  smokeStatus.value = "Proxy validation passed"
}

async function runFailureSmoke() {
  smokeStatus.value = "Running forced failure validation"
  try {
    await failureChat.append("Force proxy failure.")
  } catch {
    failureTrace.value = JSON.stringify(failureInspection.value, null, 2)
    smokeStatus.value = "Forced failure captured"
  }
}

function resetValidation() {
  localChat.clear()
  proxyChat.clear()
  failureChat.clear()
  failureChat.clearTrace()
  proxyChat.clearTrace()
  failureTrace.value = "No forced failure yet."
  smokeStatus.value = "Ready"
}
</script>

<template>
  <main class="validation-page">
    <section class="header">
      <div>
        <p class="eyebrow">
          vue-ai-hooks@${version}
        </p>
        <h1>OSS adoption smoke</h1>
        <p class="summary">
          v3-admin-vite 接入验证：本地无 Key 对话、应用代理对话、线程持久化和失败链路脱敏。
        </p>
      </div>
      <el-tag type="success" effect="plain" data-testid="status">
        {{ smokeStatus }}
      </el-tag>
    </section>

    <section class="toolbar">
      <el-button data-testid="run-local" type="primary" :loading="localChat.isLoading.value" @click="runLocalSmoke">
        Run local
      </el-button>
      <el-button data-testid="run-proxy" type="success" :loading="proxyChat.isLoading.value" @click="runProxySmoke">
        Run proxy
      </el-button>
      <el-button data-testid="run-failure" type="warning" :loading="failureChat.isLoading.value" @click="runFailureSmoke">
        Run failure
      </el-button>
      <el-button data-testid="reset" @click="resetValidation">
        Reset
      </el-button>
    </section>

    <section class="metrics">
      <el-card shadow="never">
        <template #header>
          Thread
        </template>
        <p data-testid="thread-id">
          {{ initialThread.id }}
        </p>
        <strong data-testid="active-thread-title">{{ activeThreadTitle }}</strong>
      </el-card>
      <el-card shadow="never">
        <template #header>
          Restore
        </template>
        <p data-testid="restore-label">
          {{ restoreLabel }}
        </p>
        <strong data-testid="proxy-message-count">{{ proxyMessageCount }}</strong>
      </el-card>
      <el-card shadow="never">
        <template #header>
          Trace
        </template>
        <p data-testid="proxy-trace-id">
          {{ proxyTraceId }}
        </p>
        <strong data-testid="failure-leak-check">{{ failureLeakCheck }}</strong>
      </el-card>
    </section>

    <section class="panels">
      <el-card header="Local chat" shadow="never">
        <ol data-testid="local-messages" class="messages">
          <li v-for="message in localChat.messages.value" :key="message.id">
            <span>{{ message.role }}</span>
            <p>{{ messageText(message) }}</p>
          </li>
        </ol>
      </el-card>

      <el-card header="Proxy chat" shadow="never">
        <ol data-testid="proxy-messages" class="messages">
          <li v-for="message in proxyChat.messages.value" :key="message.id">
            <span>{{ message.role }}</span>
            <p>{{ messageText(message) }}</p>
          </li>
        </ol>
      </el-card>

      <el-card header="Failure trace" shadow="never">
        <pre data-testid="failure-trace">{{ failureTrace }}</pre>
      </el-card>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.validation-page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fa;
}

.header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--el-color-primary);
  font-size: 13px;
  font-weight: 600;
}

h1 {
  margin: 0 0 8px;
  color: #1f2937;
  font-size: 28px;
  line-height: 1.2;
}

.summary {
  max-width: 760px;
  margin: 0;
  color: #606266;
  line-height: 1.7;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.toolbar .el-button {
  margin-left: 0;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.metrics p {
  margin: 0 0 8px;
  color: #606266;
  word-break: break-all;
}

.panels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.messages {
  min-height: 160px;
  padding-left: 18px;
  margin: 0;
}

.messages li {
  margin-bottom: 12px;
}

.messages span {
  color: #909399;
  font-size: 12px;
}

.messages p {
  margin: 4px 0 0;
  color: #303133;
  word-break: break-word;
}

pre {
  min-height: 160px;
  max-height: 360px;
  padding: 12px;
  margin: 0;
  overflow: auto;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
  background: #f8fafc;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

@media (max-width: 900px) {
  .header {
    display: block;
  }

  .metrics,
  .panels {
    grid-template-columns: 1fr;
  }
}
</style>
`
}

function replaceInFile(path, search, replacement) {
  const before = readFileSync(path, 'utf8')
  expect(before.includes(search), `Unable to patch ${path}`)
  writeFileSync(path, before.replace(search, replacement))
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

function run(label, command, args, options = {}) {
  console.log(`\n> ${label}`)
  execFileSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  })
}

function playwrightInstallArgs() {
  return process.platform === 'linux'
    ? ['exec', 'playwright', 'install', '--with-deps', 'chromium']
    : ['exec', 'playwright', 'install', 'chromium']
}

function expect(condition, message) {
  if (!condition) throw new Error(message)
}
