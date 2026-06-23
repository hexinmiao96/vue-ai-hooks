import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const workflows = {
  ci: readFileSync('.github/workflows/ci.yml', 'utf8'),
  publish: readFileSync('.github/workflows/publish.yml', 'utf8'),
  codeql: readFileSync('.github/workflows/codeql.yml', 'utf8'),
  scorecard: readFileSync('.github/workflows/scorecard.yml', 'utf8'),
  dependabot: readFileSync('.github/dependabot.yml', 'utf8')
}
const failures = []
const localCheckCommands = extractPnpmCommands(packageJson.scripts?.check ?? '')
const pnpmVersion = packageJson.packageManager?.match(/^pnpm@(.+)$/)?.[1]
const minimumNodeMajor = packageJson.engines?.node.match(/^>=(\d+)\./)?.[1]
const supportedNodeVersions = ['18.x', '20.x', '22.x', '24.x']
const publishNodeVersion = supportedNodeVersions.at(-1)?.replace('.x', '')

expect(pnpmVersion, 'packageManager must pin a pnpm version')
expect(
  supportedNodeVersions[0] === `${minimumNodeMajor}.x`,
  'Supported Node matrix must start at the package engines.node minimum major'
)
expect(workflows.ci.includes('uses: actions/setup-node@v4'), 'CI workflow must set up Node')
expect(
  hasYamlValue(workflows.ci, 'node-version', `[${supportedNodeVersions.join(', ')}]`),
  'CI workflow must test the supported Node version matrix'
)
expect(hasYamlValue(workflows.ci, 'cache', 'pnpm'), 'CI workflow must cache pnpm dependencies')
expect(workflows.ci.includes('uses: pnpm/action-setup@v4'), 'CI workflow must set up pnpm')
expect(
  hasYamlValue(workflows.ci, 'version', pnpmVersion),
  'CI workflow pnpm version must match packageManager'
)
expect(
  workflows.ci.includes('permissions:\n  contents: read'),
  'CI workflow must use read-only contents permission'
)
expect(workflows.ci.includes('concurrency:'), 'CI workflow must define concurrency')
expect(
  workflows.ci.includes('cancel-in-progress: true'),
  'CI workflow must cancel stale in-progress runs'
)
expect(workflows.ci.includes('timeout-minutes: 30'), 'CI job must define a bounded timeout')
expect(
  workflows.ci.includes('fail-fast: false'),
  'CI matrix must run every supported Node version before failing'
)
for (const command of localCheckCommands) {
  expect(workflows.ci.includes(command), `CI workflow must include local check command: ${command}`)
}
expect(workflows.ci.includes('pnpm format:check'), 'CI workflow must verify formatting')
expect(workflows.ci.includes('pnpm secrets:check'), 'CI workflow must scan for committed secrets')
expect(
  workflows.ci.includes('pnpm source:hygiene'),
  'CI workflow must scan for source hygiene issues'
)
expect(workflows.ci.includes('pnpm size:check'), 'CI workflow must verify bundle size budgets')
expect(
  workflows.ci.includes('pnpm test:hygiene'),
  'CI workflow must reject focused, skipped, or todo tests'
)
expect(
  workflows.ci.includes('pnpm changelog:check'),
  'CI workflow must verify changelog release readiness'
)
expect(
  workflows.ci.includes('pnpm community:check'),
  'CI workflow must verify community health templates'
)
expect(workflows.ci.includes('pnpm workflows:check'), 'CI workflow must verify workflow guardrails')

expect(
  workflows.publish.includes("tags:\n      - 'v*'"),
  'Publish workflow must trigger on v* tags'
)
expect(
  !workflows.publish.includes('workflow_dispatch:'),
  'Publish workflow must not allow manual publish dispatch'
)
expect(
  workflows.publish.includes('uses: actions/setup-node@v4'),
  'Publish workflow must set up Node'
)
expect(
  hasYamlValue(workflows.publish, 'node-version', publishNodeVersion),
  'Publish workflow must use the newest supported Node version'
)
expect(
  workflows.publish.includes('uses: pnpm/action-setup@v4'),
  'Publish workflow must set up pnpm'
)
expect(
  hasYamlValue(workflows.publish, 'version', pnpmVersion),
  'Publish workflow pnpm version must match packageManager'
)
expect(
  workflows.publish.includes("if: github.ref_type == 'tag'"),
  'Publish job must be guarded to tag refs'
)
expect(
  workflows.publish.includes('timeout-minutes: 30'),
  'Publish job must define a bounded timeout'
)
for (const command of localCheckCommands) {
  expect(
    workflows.publish.includes(command),
    `Publish workflow must include local check command: ${command}`
  )
}
expect(workflows.publish.includes('pnpm format:check'), 'Publish workflow must verify formatting')
expect(
  workflows.publish.includes('pnpm secrets:check'),
  'Publish workflow must scan for committed secrets'
)
expect(
  workflows.publish.includes('pnpm source:hygiene'),
  'Publish workflow must scan for source hygiene issues'
)
expect(
  workflows.publish.includes('pnpm size:check'),
  'Publish workflow must verify bundle size budgets'
)
expect(
  workflows.publish.includes('pnpm test:hygiene'),
  'Publish workflow must reject focused, skipped, or todo tests'
)
expect(
  workflows.publish.includes('pnpm changelog:check'),
  'Publish workflow must verify changelog release readiness'
)
expect(
  workflows.publish.includes('pnpm community:check'),
  'Publish workflow must verify community health templates'
)
expect(
  workflows.publish.includes('pnpm workflows:check'),
  'Publish workflow must verify workflow guardrails'
)
expect(
  workflows.publish.includes('id-token: write'),
  'Publish workflow must allow OIDC id-token for npm provenance'
)
expect(
  workflows.publish.includes('npm publish --access public --provenance'),
  'Publish command must use public provenance publishing'
)
expect(
  workflows.publish.includes('test "v${version}" = "$GITHUB_REF_NAME"'),
  'Publish workflow must verify tag matches package version'
)
expect(
  !workflows.publish.includes('NPM_TOKEN'),
  'Publish workflow must not use long-lived NPM_TOKEN secrets'
)
expect(!workflows.publish.includes('_authToken'), 'Publish workflow must not write npm auth tokens')
expect(
  !workflows.publish.includes('//registry.npmjs.org/'),
  'Publish workflow must not configure registry token auth'
)

expect(
  workflows.codeql.includes('security-events: write'),
  'CodeQL workflow must allow security-events write'
)
expect(workflows.codeql.includes('github/codeql-action/init@v4'), 'CodeQL init action must use v4')
expect(
  workflows.codeql.includes('github/codeql-action/analyze@v4'),
  'CodeQL analyze action must use v4'
)
expect(
  workflows.codeql.includes('build-mode: none'),
  'CodeQL workflow must use build-mode none for JS/TS'
)
expect(workflows.codeql.includes('concurrency:'), 'CodeQL workflow must define concurrency')
expect(workflows.codeql.includes('timeout-minutes: 15'), 'CodeQL job must define a bounded timeout')
expect(
  workflows.codeql.includes('fail-fast: false'),
  'CodeQL matrix must run every configured analysis before failing'
)

expect(
  workflows.scorecard.includes('name: OpenSSF Scorecard'),
  'Scorecard workflow must be named OpenSSF Scorecard'
)
expect(
  workflows.scorecard.includes('push:\n    branches: [main]'),
  'Scorecard workflow must run on pushes to main'
)
expect(workflows.scorecard.includes('schedule:'), 'Scorecard workflow must run on a schedule')
expect(
  !workflows.scorecard.includes('pull_request:'),
  'Scorecard workflow must not run on pull requests from forks'
)
expect(
  workflows.scorecard.includes('permissions:\n  contents: read'),
  'Scorecard workflow must keep top-level permissions read-only'
)
expect(workflows.scorecard.includes('concurrency:'), 'Scorecard workflow must define concurrency')
expect(
  workflows.scorecard.includes('cancel-in-progress: true'),
  'Scorecard workflow must cancel stale in-progress runs'
)
expect(
  workflows.scorecard.includes('timeout-minutes: 15'),
  'Scorecard job must define a bounded timeout'
)
for (const permission of [
  'security-events: write',
  'id-token: write',
  'contents: read',
  'issues: read',
  'pull-requests: read',
  'checks: read'
]) {
  expect(workflows.scorecard.includes(permission), `Scorecard workflow must include ${permission}`)
}
expect(
  workflows.scorecard.includes('uses: actions/checkout@v4'),
  'Scorecard workflow must use actions/checkout@v4'
)
expect(
  workflows.scorecard.includes('persist-credentials: false'),
  'Scorecard workflow must not persist checkout credentials'
)
expect(
  workflows.scorecard.includes('uses: ossf/scorecard-action@v2.4.3'),
  'Scorecard workflow must pin the OpenSSF Scorecard action'
)
expect(
  workflows.scorecard.includes('results_file: results.sarif'),
  'Scorecard workflow must write SARIF results'
)
expect(
  workflows.scorecard.includes('results_format: sarif'),
  'Scorecard workflow must use SARIF results format'
)
expect(
  workflows.scorecard.includes('publish_results: true'),
  'Scorecard workflow must publish signed Scorecard results'
)
expect(
  workflows.scorecard.includes('uses: github/codeql-action/upload-sarif@v4'),
  'Scorecard workflow must upload SARIF to code scanning'
)
expect(
  workflows.scorecard.includes('sarif_file: results.sarif'),
  'Scorecard workflow must upload the Scorecard SARIF file'
)

expect(workflows.dependabot.includes('version: 2'), 'Dependabot config must use version 2')
expect(
  workflows.dependabot.includes('package-ecosystem: npm'),
  'Dependabot must maintain npm dependencies'
)
expect(
  workflows.dependabot.includes('package-ecosystem: github-actions'),
  'Dependabot must maintain GitHub Actions'
)
expect(
  workflows.dependabot.match(/interval: weekly/g)?.length === 2,
  'Dependabot updates must run weekly for npm and GitHub Actions'
)
expect(
  workflows.dependabot.match(/open-pull-requests-limit: 5/g)?.length === 2,
  'Dependabot must limit open PRs for npm and GitHub Actions'
)
expect(
  workflows.dependabot.includes('npm-minor-and-patch:') &&
    workflows.dependabot.includes('update-types:') &&
    workflows.dependabot.includes('- minor') &&
    workflows.dependabot.includes('- patch'),
  'Dependabot must group npm minor and patch updates'
)
expect(
  workflows.dependabot.includes('github-actions:') &&
    workflows.dependabot.includes('patterns:') &&
    workflows.dependabot.includes("- '*'"),
  'Dependabot must group GitHub Actions updates'
)

if (failures.length) {
  console.error(`Workflow check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log('Workflow check passed for CI, publish, CodeQL, Scorecard, and Dependabot.')

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}

function extractPnpmCommands(script) {
  return script
    .split('&&')
    .map((part) => part.trim())
    .filter((part) => part.startsWith('pnpm '))
}

function hasYamlValue(workflow, key, value) {
  if (!value) {
    return false
  }

  return new RegExp(
    `(^|\\n)\\s*${escapeRegExp(key)}:\\s*['"]?${escapeRegExp(String(value))}['"]?(\\s|\\n|$)`
  ).test(workflow)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
