import { readFileSync } from 'node:fs'

const files = {
  bug: readFileSync('.github/ISSUE_TEMPLATE/bug_report.md', 'utf8'),
  feature: readFileSync('.github/ISSUE_TEMPLATE/feature_request.md', 'utf8'),
  config: readFileSync('.github/ISSUE_TEMPLATE/config.yml', 'utf8'),
  codeOwners: readFileSync('.github/CODEOWNERS', 'utf8'),
  pr: readFileSync('.github/PULL_REQUEST_TEMPLATE.md', 'utf8'),
  security: readFileSync('SECURITY.md', 'utf8'),
  support: readFileSync('SUPPORT.md', 'utf8'),
  codeOfConduct: readFileSync('CODE_OF_CONDUCT.md', 'utf8'),
  contributing: readFileSync('CONTRIBUTING.md', 'utf8'),
  readme: readFileSync('README.md', 'utf8'),
  zhReadme: readFileSync('README.zh-CN.md', 'utf8')
}
const failures = []

// Community files are contributor-facing quality gates; keep the required fields explicit.
expect(
  files.config.includes('blank_issues_enabled: false'),
  'Issue template config must disable blank issues'
)
expect(
  files.config.includes('/discussions'),
  'Issue template config must route general questions to Discussions'
)
expect(files.config.includes('/SUPPORT.md'), 'Issue template config must link to SUPPORT.md')
expect(files.config.includes('/SECURITY.md'), 'Issue template config must link to SECURITY.md')
expect(
  files.config.includes('provider setup help'),
  'Issue template config must route provider setup help to support guidance'
)
expect(
  files.config.includes('Private reporting process'),
  'Issue template config must route vulnerabilities to security guidance'
)

for (const rule of [
  '* @hexinmiao96',
  '.github/ @hexinmiao96',
  'src/ @hexinmiao96',
  'scripts/ @hexinmiao96',
  'docs/ @hexinmiao96',
  'examples/ @hexinmiao96'
]) {
  expect(files.codeOwners.includes(rule), `CODEOWNERS must include ${rule}`)
}

for (const section of [
  '## What happened',
  '## Minimal reproduction',
  '## Steps to reproduce',
  '## Expected behavior',
  '## Actual behavior',
  '## Environment'
]) {
  expect(files.bug.includes(section), `Bug report template must include ${section}`)
}

for (const field of [
  'vue-ai-hooks version:',
  'Vue version:',
  'Node version:',
  'Package manager and version:',
  'Bundler / framework:',
  'Provider (OpenAI / DeepSeek / custom):',
  'Browser / runtime (if relevant):',
  'OS:'
]) {
  expect(files.bug.includes(field), `Bug report template must request ${field}`)
}

for (const section of [
  '## Problem',
  '## Proposed solution',
  '## Alternatives considered',
  '## Examples',
  '## Priority'
]) {
  expect(files.feature.includes(section), `Feature request template must include ${section}`)
}

for (const item of [
  '## What does this change?',
  '## Related issue',
  '## Type of change',
  '## Version impact',
  'Patch',
  'Minor',
  'Major / breaking change',
  'No package version impact',
  'Migration notes required for breaking changes',
  '## How was it tested?',
  'Ran `pnpm check` locally',
  'I added a CHANGELOG entry if user-facing',
  'I confirmed the version impact matches `CONTRIBUTING.md`',
  'I documented migration notes for breaking changes',
  'I updated the README if the public API changed',
  'I reviewed security impact if this touches providers, fetch, auth, or examples',
  'No new runtime dependencies added (or justified in PR description)'
]) {
  expect(files.pr.includes(item), `Pull request template must include ${item}`)
}

for (const section of [
  '## Supported Versions',
  '## Reporting a Vulnerability',
  '## API Key Safety'
]) {
  expect(files.security.includes(section), `SECURITY.md must include ${section}`)
}

for (const requiredText of [
  'latest published minor version',
  'Please do not open a public issue for suspected vulnerabilities.',
  'GitHub private vulnerability reporting',
  'initial response within 7 days',
  'production applications should send model requests through a backend or edge proxy'
]) {
  expect(
    normalizeWhitespace(files.security).includes(requiredText),
    `SECURITY.md must include: ${requiredText}`
  )
}

for (const section of [
  '## Questions and usage help',
  '## Bugs',
  '## Feature requests',
  '## Security'
]) {
  expect(files.support.includes(section), `SUPPORT.md must include ${section}`)
}

for (const requiredText of [
  'GitHub Discussion',
  '`vue-ai-hooks` version',
  'Provider or custom provider adapter',
  'Use the bug report template for reproducible defects',
  'Follow [`SECURITY.md`](./SECURITY.md) instead'
]) {
  expect(
    normalizeWhitespace(files.support).includes(requiredText),
    `SUPPORT.md must include: ${requiredText}`
  )
}

for (const section of ['## Our Standards', '## Scope', '## Reporting', '## Enforcement']) {
  expect(files.codeOfConduct.includes(section), `CODE_OF_CONDUCT.md must include ${section}`)
}

for (const requiredText of [
  'focused on improving `vue-ai-hooks`',
  'Report conduct concerns to the maintainer listed in `package.json`',
  'follow `SECURITY.md` instead of opening a public issue',
  'Maintainers may edit or remove harmful content'
]) {
  expect(
    normalizeWhitespace(files.codeOfConduct).includes(requiredText),
    `CODE_OF_CONDUCT.md must include: ${requiredText}`
  )
}

expect(
  files.contributing.includes('[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)'),
  'CONTRIBUTING.md must link to CODE_OF_CONDUCT.md'
)
expect(files.readme.includes('/CODE_OF_CONDUCT.md'), 'README.md must link to CODE_OF_CONDUCT.md')
expect(
  files.zhReadme.includes('/CODE_OF_CONDUCT.md'),
  'README.zh-CN.md must link to CODE_OF_CONDUCT.md'
)
expect(files.readme.includes('/SUPPORT.md'), 'README.md must link to SUPPORT.md')
expect(files.zhReadme.includes('/SUPPORT.md'), 'README.zh-CN.md must link to SUPPORT.md')

if (failures.length) {
  console.error(`Community health check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(
  'Community health check passed for code ownership, issue, pull request, support, security policy, and code of conduct files.'
)

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}
